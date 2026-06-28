// client/src/pages/ForumPage.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SubNavForum from '../components/SubNavForum'; 
import styles from './ForumPage.module.css';
import { db } from '../config/firebaseConfig';
import { collection, getDocs, query, where, doc, getDoc, setDoc, updateDoc, increment, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import html2canvas from 'html2canvas';

import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// IMPORT UTAMA DARI STRUKTUR LAMA KAMU
import ChapterList from '../components/ui/ChapterList';
import PdfMateriReader from '../components/ui/PdfMateriReader';
import LatihanSoalSection from '../components/ui/LatihanSoalSection';
import ChatDashboardSection from '../components/ui/ChatDashboardSection';
import Spinner from '../components/ui/Spinner'; // Pastikan Spinner di-import agar tidak crash!

import { 
  FaPaperPlane, 
  FaChevronRight,
  FaBookOpen,
  FaLightbulb,
  FaGraduationCap,
  FaArrowLeft,
  FaCalculator,    
  FaFlask,         
  FaEarthAsia,     
  FaLanguage,      
  FaFont,
  FaTriangleExclamation
} from 'react-icons/fa6';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const ForumPage = () => {
  const { currentUser } = useAuth();
  const { subjectId, chapterId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('materi');
  const [fullscreenLevel, setFullscreenLevel] = useState(0);
  const [isExitingSafely, setIsExitingSafely] = useState(false);

  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [activeMateriSubTab, setActiveMateriSubTab] = useState('pdf'); 
  const [currentLatihanIdx, setCurrentLatihanIdx] = useState(0); 
  const [isUjianStarted, setIsUjianStarted] = useState(false);
  const [ujianTimer, setUjianTimer] = useState(600); 
  const [selectedUjianAns, setSelectedUjianAns] = useState({}); 
  const [showUjianResultModal, setShowUjianResultModal] = useState(false);
  const [ujianScore, setUjianScore] = useState(0);
  const [isLulusUjian, setIsLulusUjian] = useState(false);
  const ujianCardRef = useRef(null); 
  
  const [maxCompletedOrder, setMaxCompletedOrder] = useState(0);
  const [hasCompletedThisChapterBefore, setHasCompletedThisChapterBefore] = useState(false);

  // STATE MANAGEMENT TIMER PDF
  const [pdfPage, setPdfPage] = useState(1);
  const [numPages, setNumPages] = useState(null); 
  const [pageTimers, setPageTimers] = useState({}); 
  const [unlockedPages, setUnlockedPages] = useState({}); 
  const [canNextPdf, setCanNextPdf] = useState(false);

  const [selectedLatihanAns, setSelectedLatihanAns] = useState({});
  const [showPembahasan, setShowPembahasan] = useState({});

  const [chapters, setChapters] = useState([]); 
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // State Manajemen Chat Global Realtime
  const [chatMessages, setChatMessages] = useState([]);
  const [inputChat, setInputChat] = useState('');
  const chatEndRef = useRef(null);

  const [allChapters, setAllChapters] = useState([]);
  const [globalLoading, setGlobalLoading] = useState(true); // Mencegah bypass kedip layar
  
  const getChapterCount = (subId) => {
    return allChapters.filter(ch => ch.subjectId === subId).length;
  };

  const subjectsData = [
    { id: 'mtk', name: 'Matematika', icon: <FaCalculator />, totalChapters: getChapterCount('mtk') },
    { id: 'ipa', name: 'Ilmu Pengetahuan Alam', icon: <FaFlask />, totalChapters: getChapterCount('ipa') },
    { id: 'ips', name: 'Ilmu Pengetahuan Sosial', icon: <FaEarthAsia />, totalChapters: getChapterCount('ips') },
    { id: 'inggris', name: 'Bahasa Inggris', icon: <FaLanguage />, totalChapters: getChapterCount('inggris') },
    { id: 'indonesia', name: 'Bahasa Indonesia', icon: <FaFont />, totalChapters: getChapterCount('indonesia') }
  ];

  // Efek status online global
  useEffect(() => {
    if (!currentUser?.uid) return;
    const userDocRef = doc(db, 'users', currentUser.uid);
    updateDoc(userDocRef, {
      isOnline: true,
      lastActive: serverTimestamp()
    }).catch((err) => console.error("Gagal update status online global:", err));

    return () => {
      updateDoc(userDocRef, {
        isOnline: false,
        lastActive: serverTimestamp()
      }).catch((err) => console.error("Gagal update status offline global:", err));
    };
  }, [currentUser?.uid]);

  // Load awal data seluruh bab dari Firestore
  useEffect(() => {
    const fetchAllChaptersForCount = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'chapters'));
        const chapterList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllChapters(chapterList);
      } catch (error) {
        console.error("Gagal menarik data bab untuk dihitung:", error);
      } finally {
        setGlobalLoading(false);
      }
    };
    fetchAllChaptersForCount();
  }, []);

  // VALIDASI UTAMA KEAMANAN TEMBAK URL BYPASS BAB
  useEffect(() => {
    if (globalLoading || allChapters.length === 0) return;

    // Kasus 1: Jika tidak ada subjectId di URL (Akses /forum utama)
    if (!subjectId) {
      setSelectedSubject(null);
      setSelectedChapter(null);
      setFullscreenLevel(0);
      return;
    }

    // Cari kesesuaian data mapel berdasarkan URL
    const foundSubject = subjectsData.find(sub => sub.id === subjectId);
    if (!foundSubject) {
      toast.error("Mata pelajaran tidak ditemukan");
      navigate('/forum');
      return;
    }

    setSelectedSubject(foundSubject);

    // Kasus 2: Jika ada subjectId tapi TIDAK ADA chapterId (Akses /forum/list/mtk)
    if (!chapterId) {
      setSelectedChapter(null);
      setFullscreenLevel(1); 
      
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        document.exitFullscreen().catch((err) => console.log(err));
      }
      return;
    }

    // Kasus 3: Jika ada subjectId DAN ada chapterId (User nembak rute spesifik)
    const foundChapter = allChapters.find(ch => ch.id === chapterId);
    
    if (foundChapter) {
      const targetOrder = Number(foundChapter.order || 0);
      
      // SISTEM VALIDASI KEAMANAN URL BYPASS
      // Jika order bab yang dibuka lebih tinggi dari progres maksimal + 1 bab yang diunlock (jika bab 1 siap, maka bab 2 unlock (maxCompletedOrder + 1))
      if (maxCompletedOrder > 0 && targetOrder > (maxCompletedOrder + 1)) {
        toast.error("Eitss Gak Bisa ya! Selesaikan bab sebelumnya dulu!");
        navigate(`/forum/list/${subjectId}`); // Kick kembali ke daftar bab
        return;
      }

      setSelectedChapter(foundChapter);
      setFullscreenLevel(2); 
    } else {
      toast.error("Bab materi tidak ditemukan");
      navigate(`/forum/list/${subjectId}`);
    }
  }, [subjectId, chapterId, allChapters, maxCompletedOrder, globalLoading]); 

  // Ambil data progres belajar pengguna secara realtime / berkala
  useEffect(() => {
    const fetchUserProgress = async () => {
      if (!currentUser?.uid || !selectedSubject) return;
      try {
        const progressRef = doc(db, "userProgress", currentUser.uid);
        const progressSnap = await getDoc(progressRef);
        if (progressSnap.exists()) {
          const data = progressSnap.data();
          const mapelProgress = data[selectedSubject.id];
          if (mapelProgress && mapelProgress.order !== undefined) {
            setMaxCompletedOrder(Number(mapelProgress.order));
          } else {
            setMaxCompletedOrder(0);
          }
        } else {
          setMaxCompletedOrder(0);
        }
      } catch (err) {
        console.error("Gagal mengambil progres belajar:", err);
      }
    };
    fetchUserProgress();
  }, [currentUser, selectedSubject]);

  // Tarik daftar bab berdasarkan mapel aktif
  useEffect(() => {
    const fetchChaptersFromFirestore = async (subId) => {
      setLoadingChapters(true);
      try {
        const q = query(collection(db, 'chapters'), where('subjectId', '==', subId));
        const querySnapshot = await getDocs(q);
        const fetchedChapters = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        fetchedChapters.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
        setChapters(fetchedChapters);
      } catch (error) {
        console.error("Error loading chapters:", error);
      } finally {
        setLoadingChapters(false);
      }
    };

    if (selectedSubject) {
      fetchChaptersFromFirestore(selectedSubject.id);
    }
  }, [selectedSubject]);

  useEffect(() => {
    if (selectedChapter) {
      const currentOrder = Number(selectedChapter.order || 0);
      setHasCompletedThisChapterBefore(currentOrder <= maxCompletedOrder);
    }
  }, [selectedChapter, maxCompletedOrder]);

  // Listener Chat Realtime
  useEffect(() => {
    if (activeTab !== 'chat') return;
    const chatQuery = query(collection(db, 'global_chats'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(chatQuery, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChatMessages(messages);
    }, (error) => {
      console.error("Error listen chat:", error);
    });
    return () => unsubscribe();
  }, [activeTab]);

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!inputChat.trim()) return;
    if (!currentUser?.uid) {
      toast.error("Kamu harus login terlebih dahulu untuk mengirim pesan!");
      return;
    }
    try {
      const msgData = {
        text: inputChat.trim(),
        uid: currentUser.uid,                         
        username: currentUser?.username || 'user',
        displayName: currentUser?.displayName || 'Siswa',
        photoURL: currentUser?.photoURL || '',        
        activeBorder: currentUser?.activeBorder || 'borderNormal', 
        createdAt: serverTimestamp()                   
      };
      setInputChat(''); 
      await addDoc(collection(db, 'global_chats'), msgData);
    } catch (err) {
      console.error("Error sending chat:", err);
    }
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  // Menyembunyikan Navbar Utama & Footer layout bawaan saat full screen pembelajaran
  useEffect(() => {
    const mainNavbar = document.querySelector('header');
    const bottomNav = document.querySelector('footer');
    if (fullscreenLevel >= 1) {
      if (mainNavbar) mainNavbar.style.display = 'none';
      if (bottomNav) bottomNav.style.display = 'none';
    } else {
      if (mainNavbar) mainNavbar.style.display = '';
      if (bottomNav) bottomNav.style.display = '';
    }
    return () => {
      if (mainNavbar) mainNavbar.style.display = '';
      if (bottomNav) bottomNav.style.display = '';
    };
  }, [fullscreenLevel]);

  // Mengatur Timer Kuncian Halaman Pembaca PDF Modul Bacaan
  useEffect(() => {
    if (activeTab === 'materi' && selectedChapter && activeMateriSubTab === 'pdf') {
      if (hasCompletedThisChapterBefore) {
        setCanNextPdf(true);
        if (pageTimers[pdfPage] !== 0) {
          setPageTimers(prev => ({ ...prev, [pdfPage]: 0 }));
        }
        return;
      }
      if (pageTimers[pdfPage] === undefined) {
        setPageTimers(prev => ({ ...prev, [pdfPage]: 10 }));
        setCanNextPdf(false);
        return;
      }
      if (unlockedPages[pdfPage]) {
        setCanNextPdf(true);
        return;
      }
      if (pageTimers[pdfPage] > 0) {
        setCanNextPdf(false);
        const interval = setInterval(() => {
          setPageTimers(prev => {
            const currentSeconds = prev[pdfPage];
            if (currentSeconds <= 1) {
              clearInterval(interval);
              setUnlockedPages(unlocked => ({ ...unlocked, [pdfPage]: true }));
              setCanNextPdf(true);
              return { ...prev, [pdfPage]: 0 };
            }
            return { ...prev, [pdfPage]: currentSeconds - 1 };
          });
        }, 1000);
        return () => clearInterval(interval);
      } else {
        setCanNextPdf(true);
      }
    }
  }, [pdfPage, selectedChapter, activeMateriSubTab, activeTab, pageTimers, unlockedPages, hasCompletedThisChapterBefore]);

  // Deteksi Perubahan Kunci Fullscreen Esc Perangkat
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement && fullscreenLevel === 2) {
        if (isExitingSafely) {
          setIsExitingSafely(false); 
          return;
        }
        setShowExitModal(true);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [fullscreenLevel, isExitingSafely]);

  // Efek Timer Hitung Mundur Lembaran Ujian
  useEffect(() => {
    let interval;
    if (activeMateriSubTab === 'ulangan' && isUjianStarted && ujianTimer > 0 && !showUjianResultModal) {
      interval = setInterval(() => {
        setUjianTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            handleFinishUjian(true); 
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isUjianStarted, ujianTimer, activeMateriSubTab, showUjianResultModal]);
  
  const formatUjianTime = (seconds) => {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

  const handleFinishUjian = async (isTimeUp = false) => {
    const soalList = selectedChapter.miniUlangan || [];
    if (soalList.length === 0) return;

    let benar = 0;
    soalList.forEach((soal, idx) => {
      const qId = soal.id || idx;
      if (selectedUjianAns[qId] === soal.answer) benar++;
    });

    const finalScore = Math.round((benar / soalList.length) * 100);
    setUjianScore(finalScore);
    const lulus = finalScore >= 75; 
    setIsLulusUjian(lulus);

    if (isTimeUp) toast.error("Waktu ujian habis! Jawaban kamu otomatis dikirim.");

    if (lulus && currentUser?.uid && selectedSubject) {
      const currentOrder = Number(selectedChapter.order || 0);
      const userRef = doc(db, "users", currentUser.uid);
      const progressRef = doc(db, "userProgress", currentUser.uid);

      try {
        if (!hasCompletedThisChapterBefore) {
          if (currentOrder > maxCompletedOrder) {
            await updateDoc(progressRef, {
              [`${selectedSubject.id}.order`]: currentOrder,
              [`${selectedSubject.id}.time`]: serverTimestamp()
            }).catch(async (err) => {
              if (err.code === 'not-found') {
                await setDoc(progressRef, {
                  [selectedSubject.id]: { order: currentOrder, time: serverTimestamp() }
                }, { merge: true });
              } else {
                throw err;
              }
            });
            setMaxCompletedOrder(currentOrder);
          }
          await updateDoc(userRef, { koin: increment(5), exp: increment(20) });
          toast.success("Selamat! Bab diselesaikan dan Hadiah Utama diklaim!");
        } else {
          await updateDoc(userRef, { exp: increment(4) });
          toast.success("Review Selesai! Kamu mendapatkan tambahan bonus +4 EXP");
        }
      } catch (err) {
        console.error("Gagal mengupdate reward ke database:", err);
      }
    }
    setShowUjianResultModal(true);
  };

  const handleShareHasilUjian = async () => {
    if (!ujianCardRef.current) return;
    try {
      toast.loading("Menyiapkan lembar juara untuk dibagikan...", { id: 'share-load' });
      const canvas = await html2canvas(ujianCardRef.current, { useCORS: true, backgroundColor: "#1e293b" });
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error("Gagal memproses gambar share.", { id: 'share-load' });
          return;
        }
        const fileData = new File([blob], `Hasil_Ujian_${selectedChapter.order}.png`, { type: "image/png" });
        const captionText = `*Selangkah lebih dekat jadi juara!*\nPaham materinya, Menang Olimpiade-nya.\n\nYang mau nyusul dapet medali, mending latihan juga di https://qp.tun.asia`;

        if (navigator.canShare && navigator.canShare({ files: [fileData] })) {
          try {
            await navigator.share({ files: [fileData], title: 'Hasil Mini Ulangan Quizpride', text: captionText });
            toast.success("Berhasil di bagikan!", { id: 'share-load' });
          } catch (shareErr) {
            toast.dismiss('share-load');
          }
        } else {
          try {
            await navigator.share({ title: 'Hasil Mini Ulangan Quizpride', text: captionText });
            toast.success("Berhasil membagikan teks caption!", { id: 'share-load' });
          } catch (txtErr) {
            const imageUri = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = imageUri;
            link.download = `Hasil_Ujian_${selectedChapter.order}.png`;
            link.click();
            toast.success("Gambar berhasil di-download!", { id: 'share-load' });
          }
        }
      }, "image/png");
    } catch (err) {
      toast.error("Gagal memproses share sistem.", { id: 'share-load' });
    }
  };

  const handleBackFromChapter = () => { setShowExitModal(true); };
  
  const confirmExitChapter = () => {
    setShowExitModal(false);
    navigate(`/forum/list/${subjectId}`);
  };

  const handleBackFromSubject = () => { navigate('/forum'); };
  const handleSelectSubject = (sub) => { navigate(`/forum/list/${sub.id}`); };

  const handleSelectChapter = (ch) => {
    setPdfPage(1);
    setNumPages(null);
    setPageTimers({ 1: 10 });
    setUnlockedPages({});
    setActiveMateriSubTab('pdf');
    setSelectedLatihanAns({});
    setShowPembahasan({});
    setCurrentLatihanIdx(0);

    navigate(`/forum/list/${subjectId}/${ch.id}`);

    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen().catch((err) => console.log(err));
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => { setNumPages(numPages); };

  const handleLatihanAnswer = (qId, option, correct) => {
    setSelectedLatihanAns(prev => ({ ...prev, [qId]: option }));
    setShowPembahasan(prev => ({ ...prev, [qId]: true }));
    if(option === correct) toast.success("Jawaban Benar!");
    else toast.error("Coba baca pembahasannya yuk!");
  };

  if (globalLoading) {
    return <Spinner />;
  }

  return (
    <div className={`${styles.forumWrapperPage} ${fullscreenLevel >= 1 ? styles.fullscreenOverlayMode : ''}`}>
      {fullscreenLevel === 0 && (
        <div style={{ width: '100%', flexShrink: 0 }}>
          <SubNavForum activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      )}

      {fullscreenLevel === 1 && selectedSubject && (
        <ChapterList 
          selectedSubject={selectedSubject}
          handleBackFromSubject={handleBackFromSubject}
          loadingChapters={loadingChapters}
          chapters={chapters}
          maxCompletedOrder={maxCompletedOrder}
          handleSelectChapter={handleSelectChapter}
        />
      )}

      {fullscreenLevel !== 1 && (
        <div className={styles.hubContentPanel}>
          {activeTab === 'materi' && (
            <div className={styles.materiInnerLayout}>
              {fullscreenLevel === 0 && !selectedSubject && (
                <div className={styles.selectionStandardGrid}>
                  <h3 className={styles.sectionHeaderTitle}>Mata Pelajaran Materi</h3>
                  <div className={styles.subjectBoxRow}>
                    {subjectsData.map(sub => (
                      <div key={sub.id} className={styles.subjectCardRow} onClick={() => handleSelectSubject(sub)}>
                        <span className={styles.subjectIconBox}>{sub.icon}</span>
                        <div className={styles.subMetaData}>
                          <h4>{sub.name}</h4>
                          <p>{sub.totalChapters} materi</p>
                        </div>
                        <FaChevronRight className={styles.arrowChevronRight} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {fullscreenLevel === 2 && selectedChapter && (
                <div className={styles.chapterReaderFullscreenView}>
                  <div className={styles.chapterReaderHeader}>
                    <button onClick={handleBackFromChapter} className={styles.readerExitBtn}><FaArrowLeft /> Keluar</button>
                    <div className={styles.readerHeaderTitles}>
                      <span>
                        {selectedSubject?.name.includes("Alam") ? "IPA" : 
                         selectedSubject?.name.includes("Sosial") ? "IPS" : 
                         selectedSubject?.name} • Bab {selectedChapter.order}
                      </span>
                      <h4>{selectedChapter.title}</h4>
                    </div>
                  </div>

                  {(() => {
                    let customProgress = 0;
                    if (activeMateriSubTab === 'pdf' && numPages) {
                      customProgress = Math.round((pdfPage / numPages) * 20);
                    } else if (activeMateriSubTab === 'latihan') {
                      const totalSoal = selectedChapter.latihanSoal?.length || 1;
                      const soalTerjawab = Object.keys(selectedLatihanAns).length;
                      customProgress = 20 + Math.round((soalTerjawab / totalSoal) * 20);
                    } else if (activeMateriSubTab === 'ulangan') {
                      customProgress = 60;
                    }

                    const percentageWidth = (customProgress / 60) * 100;
                    if (customProgress === 20 && activeMateriSubTab === 'pdf' && unlockedPages[numPages]) {
                      setTimeout(() => setActiveMateriSubTab('latihan'), 600);
                    }
                    
                    return (
                      <div className={styles.timelineContainer}>
                        <div className={styles.timelineTrack}>
                          <div className={styles.timelineFillActive} style={{ width: `${percentageWidth}%` }}></div>
                          <div className={`${styles.checkpointNode} ${customProgress >= 20 ? styles.nodeActive : styles.nodeDisabled}`} style={{ left: '33.33%' }}>
                            <div className={styles.nodeIconBox}><FaBookOpen /></div>
                            <span className={styles.nodeLabel}>Materi</span>
                          </div>
                          <div className={`${styles.checkpointNode} ${customProgress >= 40 ? styles.nodeActive : customProgress >= 20 ? styles.nodeUnlockedButNotDone : styles.nodeDisabled}`} style={{ left: '66.66%' }}>
                            <div className={styles.nodeIconBox}><FaLightbulb /></div>
                            <span className={styles.nodeLabel}>Latihan</span>
                          </div>
                          <div className={`${styles.checkpointNode} ${customProgress >= 60 ? styles.nodeActive : customProgress >= 40 ? styles.nodeUnlockedButNotDone : styles.nodeDisabled}`} style={{ left: '100%', transform: 'translate(-100%, -50%)' }}>
                            <div className={styles.nodeIconBox}><FaGraduationCap /></div>
                            <span className={styles.nodeLabel}>Ulangan</span>
                          </div>
                        </div>
                        <div className={styles.timelineStatusText}>Progres Belajar: <strong>{customProgress}</strong> / 60</div>
                      </div>
                    );
                  })()}

                  <div className={styles.readerScrollableCoreBody}>
                    {activeMateriSubTab === 'pdf' && (
                      <PdfMateriReader 
                        pdfUrl={selectedChapter.pdfUrl}
                        pdfPage={pdfPage}
                        numPages={numPages}
                        onDocumentLoadSuccess={onDocumentLoadSuccess}
                        pageTimers={pageTimers}
                        unlockedPages={unlockedPages}
                        canNextPdf={canNextPdf}
                        setPdfPage={setPdfPage}
                        setActiveMateriSubTab={setActiveMateriSubTab}
                      />
                    )}

                    {(activeMateriSubTab === 'latihan' || activeMateriSubTab === 'ulangan') && (
                      <LatihanSoalSection 
                        setIsExitingSafely={setIsExitingSafely}
                        activeMateriSubTab={activeMateriSubTab}
                        setActiveMateriSubTab={setActiveMateriSubTab}
                        latihanSoal={selectedChapter.latihanSoal}
                        currentLatihanIdx={currentLatihanIdx}
                        setCurrentLatihanIdx={setCurrentLatihanIdx}
                        selectedLatihanAns={selectedLatihanAns}
                        showPembahasan={showPembahasan}
                        handleLatihanAnswer={handleLatihanAnswer}
                        selectedChapter={selectedChapter}
                        isUjianStarted={isUjianStarted}
                        setIsUjianStarted={setIsUjianStarted}
                        ujianTimer={ujianTimer}
                        formatUjianTime={formatUjianTime}
                        selectedUjianAns={selectedUjianAns}
                        setSelectedUjianAns={setSelectedUjianAns}
                        handleFinishUjian={handleFinishUjian}
                        showUjianResultModal={showUjianResultModal}
                        ujianCardRef={ujianCardRef}
                        isLulusUjian={isLulusUjian}
                        ujianScore={ujianScore}
                        hasCompletedThisChapterBefore={hasCompletedThisChapterBefore}
                        handleShareHasilUjian={handleShareHasilUjian}
                        chapters={chapters}
                        maxCompletedOrder={maxCompletedOrder}
                        handleSelectChapter={handleSelectChapter}
                        setSelectedChapter={setSelectedChapter}
                        setPageTimers={setPageTimers}
                        setUnlockedPages={setUnlockedPages}
                        setNumPages={setNumPages}
                        setFullscreenLevel={setFullscreenLevel}
                        setShowUjianResultModal={setShowUjianResultModal}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'chat' && (
            <ChatDashboardSection 
              currentUser={currentUser}
              chatMessages={chatMessages}
              inputChat={inputChat}
              setInputChat={setInputChat}
              chatEndRef={chatEndRef}
              handleSendChat={handleSendChat}
              handleExitChatMode={() => {
                setActiveTab('materi');
                setFullscreenLevel(0);
              }}
            />
          )}
        </div>
      )}

      {showExitModal && (
        <div className={styles.modalOverlay} onClick={() => setShowExitModal(false)}>
          <div className={styles.modalContentBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalIconWarning}><FaTriangleExclamation /></div>
            <h3>Yakin Ingin Keluar?</h3>
            <p>Progres kuncian halaman materi kamu akan disetel ulang jika keluar sekarang.</p>
            <div className={styles.modalActionsRow}>
              <button 
                className={styles.modalCancelBtn} 
                onClick={() => {
                  setShowExitModal(false);
                  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                    const element = document.documentElement;
                    if (element.requestFullscreen) element.requestFullscreen().catch(() => {});
                  }
                }}
              >
                Lanjut Belajar
              </button>
              <button className={styles.modalConfirmBtn} onClick={confirmExitChapter}>Ya, Keluar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForumPage;
