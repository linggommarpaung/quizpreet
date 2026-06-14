// client/src/pages/ForumPage.jsx

import React, { useState, useEffect, useRef } from 'react';
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

// IMPORT SUB-KOMKOMPONEN UI YANG BARU
import ChapterList from '../components/ui/ChapterList';
import PdfMateriReader from '../components/ui/PdfMateriReader';
import LatihanSoalSection from '../components/ui/LatihanSoalSection';
import MiniUlanganSection from '../components/ui/MiniUlanganSection';
import ChatDashboardSection from '../components/ui/ChatDashboardSection';

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
  const [activeTab, setActiveTab] = useState('materi');
  const [fullscreenLevel, setFullscreenLevel] = useState(0);

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

  const [subjectCounts, setSubjectCounts] = useState(() => {
    const savedCounts = localStorage.getItem('forum_subject_counts');
    return savedCounts ? JSON.parse(savedCounts) : { mtk: 0, ipa: 0, ips: 0, inggris: 0, indonesia: 0 };
  });

  const subjectsData = [
    { id: 'mtk', name: 'Matematika', icon: <FaCalculator />, totalChapters: subjectCounts.mtk },
    { id: 'ipa', name: 'Ilmu Pengetahuan Alam', icon: <FaFlask />, totalChapters: subjectCounts.ipa },
    { id: 'ips', name: 'Ilmu Pengetahuan Sosial', icon: <FaEarthAsia />, totalChapters: subjectCounts.ips },
    { id: 'inggris', name: 'Bahasa Inggris', icon: <FaLanguage />, totalChapters: subjectCounts.inggris },
    { id: 'indonesia', name: 'Bahasa Indonesia', icon: <FaFont />, totalChapters: subjectCounts.indonesia }
  ];

  // =======================================================================
  // 🟢 GLOBAL PRESENCE FIRESTORE REALTIME (TANPA SOCKET)
  // =======================================================================
  useEffect(() => {
    if (!currentUser?.uid) return;

    const userDocRef = doc(db, 'users', currentUser.uid);

    // Otomatis tandai online ketika masuk halaman forum
    updateDoc(userDocRef, {
      isOnline: true,
      lastActive: serverTimestamp()
    }).catch((err) => console.error("Gagal update status online global:", err));

    // Cleanup function: Ketika ganti halaman / logout set offline
    return () => {
      updateDoc(userDocRef, {
        isOnline: false,
        lastActive: serverTimestamp()
      }).catch((err) => console.error("Gagal update status offline global:", err));
    };
  }, [currentUser?.uid]);

  // Listen data chat global secara realtime dari Firestore
  useEffect(() => {
    if (activeTab !== 'chat') return;

    const chatQuery = query(
      collection(db, 'global_chats'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(chatQuery, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChatMessages(messages);
    }, (error) => {
      console.error("Error listen chat:", error);
      toast.error("Gagal memuat obrolan realtime");
    });

    return () => unsubscribe();
  }, [activeTab]);

  // Fungsi Kirim Chat Global ke Firestore
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
      toast.error("Gagal mengirim pesan");
    }
  };

  // Sync cache data jumlah bab dari Firestore/LocalStorage
  useEffect(() => {
    const syncForumCache = async () => {
      try {
        const metaQ = query(collection(db, 'metadata'), where('__name__', '==', 'forum_version'));
        const metaSnap = await getDocs(metaQ);
        
        let serverVersion = 0;
        if (!metaSnap.empty) {
          serverVersion = metaSnap.docs[0].data().version || 0;
        }

        const localVersion = parseInt(localStorage.getItem('forum_data_version') || '-1');

        if (serverVersion > localVersion || localVersion === -1) {
          const chaptersSnapshot = await getDocs(collection(db, 'chapters'));
          const counts = { mtk: 0, ipa: 0, ips: 0, inggris: 0, indonesia: 0 };
          
          chaptersSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.subjectId && counts[data.subjectId] !== undefined) {
              counts[data.subjectId] += 1;
            }
          });

          setSubjectCounts(counts);
          localStorage.setItem('forum_subject_counts', JSON.stringify(counts));
          localStorage.setItem('forum_data_version', serverVersion.toString());
        }
      } catch (error) {
        console.error("Gagal sinkronisasi cache forum:", error);
      }
    };
    syncForumCache();
  }, []);

  // Auto-scroll ke bawah saat chat baru masuk atau saat berpindah ke tab chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  const fetchChaptersFromFirestore = async (subjectId) => {
    setLoadingChapters(true);
    try {
      const q = query(collection(db, 'chapters'), where('subjectId', '==', subjectId));
      const querySnapshot = await getDocs(q);
      
      const fetchedChapters = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      fetchedChapters.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
      setChapters(fetchedChapters);
    } catch (error) {
      console.error("Error loading chapters:", error);
      toast.error("Gagal mengambil data bab.");
    } finally {
      setLoadingChapters(false);
    }
  };

  useEffect(() => {
  const fetchUserProgress = async () => {
    if (!currentUser?.uid || !selectedSubject) return;
    try {
      const progressRef = doc(db, "userProgress", currentUser.uid);
      const progressSnap = await getDoc(progressRef);
      
      if (progressSnap.exists()) {
        const data = progressSnap.data();
        // Ambil mapel aktif, lalu ambil property 'order' di dalamnya
        const mapelProgress = data[selectedSubject.id];
        
        if (mapelProgress && mapelProgress.order !== undefined) {
          setMaxCompletedOrder(Number(mapelProgress.order));
        } else {
          setMaxCompletedOrder(0); // Mapel ini belum pernah diselesaikan bab manapun
        }
      } else {
        setMaxCompletedOrder(0); // Dokumen progress belum ada sama sekali
      }
    } catch (err) {
      console.error("Gagal mengambil progres belajar:", err);
    }
  };

  fetchUserProgress();
}, [currentUser, selectedSubject, activeMateriSubTab]);

  useEffect(() => {
    if (selectedChapter) {
      const currentOrder = Number(selectedChapter.order || 0);
      setHasCompletedThisChapterBefore(currentOrder <= maxCompletedOrder);
    }
  }, [selectedChapter, maxCompletedOrder]);

  useEffect(() => {
    if (selectedSubject) {
      fetchChaptersFromFirestore(selectedSubject.id);
    }
  }, [selectedSubject]);

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

  useEffect(() => {
    const handleBeforePopState = () => {
      if (fullscreenLevel === 2) {
        window.history.pushState(null, null, window.location.pathname);
        setShowExitModal(true);
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement && fullscreenLevel === 2) {
        setShowExitModal(true);
      }
    };

    if (fullscreenLevel === 2) {
      window.history.pushState(null, null, window.location.pathname);
      window.addEventListener('popstate', handleBeforePopState);
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    }

    return () => {
      window.removeEventListener('popstate', handleBeforePopState);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [fullscreenLevel]);
  
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
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFinishUjian = async (isTimeUp = false) => {
  const soalList = selectedChapter.miniUlangan || [];
  if (soalList.length === 0) return;

  let benar = 0;
  soalList.forEach((soal, idx) => {
    const qId = soal.id || idx;
    if (selectedUjianAns[qId] === soal.answer) {
      benar++;
    }
  });

  const finalScore = Math.round((benar / soalList.length) * 100);
  setUjianScore(finalScore);
  
  const lulus = finalScore >= 75; 
  setIsLulusUjian(lulus);

  if (isTimeUp) {
    toast.error("Waktu ujian habis! Jawaban kamu otomatis dikirim.");
  }

  if (lulus && currentUser?.uid && selectedSubject) {
    const currentOrder = Number(selectedChapter.order || 0);
    const userRef = doc(db, "users", currentUser.uid);
    const progressRef = doc(db, "userProgress", currentUser.uid);

    try {
      if (!hasCompletedThisChapterBefore) {
        if (currentOrder > maxCompletedOrder) {
          // Ganti setDoc menjadi updateDoc dengan Dot Notation
          // Struktur target: userProgress/{uid} -> { [mapelId]: { order: X, time: Y } }
          await updateDoc(progressRef, {
            [`${selectedSubject.id}.order`]: currentOrder,
            [`${selectedSubject.id}.time`]: serverTimestamp()
          }).catch(async (err) => {
            // Jaga-jaga jika dokumen userProgress/{uid} belum pernah dibuat sama sekali
            if (err.code === 'not-found') {
              await setDoc(progressRef, {
                [selectedSubject.id]: {
                  order: currentOrder,
                  time: serverTimestamp()
                }
              }, { merge: true });
            } else {
              throw err;
            }
          });

          setMaxCompletedOrder(currentOrder);
        }

        await updateDoc(userRef, {
          koin: increment(5),
          exp: increment(20)
        });
        
        toast.success("Selamat! Bab diselesaikan dan Hadiah Utama diklaim!");
      } else {
        await updateDoc(userRef, {
          exp: increment(4) 
        });
        toast.success("Review Selesai! Kamu mendapatkan tambahan bonus +4 EXP");
      }
    } catch (err) {
      console.error("Gagal mengupdate reward ke database:", err);
      toast.error("Gagal memperbarui progres kuncian.");
    }
  }

  setShowUjianResultModal(true);
};

  const handleShareHasilUjian = async () => {
    if (!ujianCardRef.current) return;
    try {
      toast.loading("Menyiapkan lembar juara untuk dibagikan...", { id: 'share-load' });
      const canvas = await html2canvas(ujianCardRef.current, {
        useCORS: true,
        backgroundColor: "#1e293b" 
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error("Gagal memproses gambar share.", { id: 'share-load' });
          return;
        }

        const fileData = new File([blob], `Hasil_Ujian_${selectedChapter.order}.png`, { type: "image/png" });
        const captionText = `*Selangkah lebih dekat jadi juara!*\nPaham materinya, Menang Olimpiade-nya.\n\nYang mau nyusul dapet medali, mending latihan juga di https://qp.tun.asia`;

        if (navigator.canShare && navigator.canShare({ files: [fileData] })) {
          try {
            await navigator.share({
              files: [fileData],
              title: 'Hasil Mini Ulangan Quizpreet',
              text: captionText
            });
            toast.success("Berhasil di bagikan!", { id: 'share-load' });
          } catch (shareErr) {
            console.log("Share dibatalkan atau terkendala:", shareErr);
            toast.dismiss('share-load');
          }
        } else {
          try {
            await navigator.share({
              title: 'Hasil Mini Ulangan Quizpreet',
              text: captionText
            });
            toast.success("Berhasil membagikan teks caption!", { id: 'share-load' });
          } catch (txtErr) {
            const imageUri = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = imageUri;
            link.download = `Hasil_Ujian_${selectedChapter.order}.png`;
            link.click();
            toast.success("Gawai tidak mendukung share langsung. Gambar berhasil di-download!", { id: 'share-load' });
          }
        }
      }, "image/png");

    } catch (err) {
      console.error(err);
      toast.error("Gagal memproses share sistem.", { id: 'share-load' });
    }
  };

  const handleBackFromChapter = () => { setShowExitModal(true); };
  
  const confirmExitChapter = () => {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => console.log(err));
      }
    }
    setShowExitModal(false);
    setSelectedChapter(null);
    setPageTimers({});
    setUnlockedPages({});
    setNumPages(null);
    setFullscreenLevel(1); 
    window.history.go(-1); 
  };

  const handleBackFromSubject = () => {
    setSelectedSubject(null);
    setSelectedChapter(null);
    setChapters([]);
    setFullscreenLevel(0); 
  };

  const handleSelectSubject = (sub) => {
    setSelectedSubject(sub);
    setFullscreenLevel(1);
  };

  const handleSelectChapter = (ch) => {
    setSelectedChapter(ch);
    setPdfPage(1);
    setNumPages(null);
    setPageTimers({ 1: 10 });
    setUnlockedPages({});
    setActiveMateriSubTab('pdf');
    setSelectedLatihanAns({});
    setShowPembahasan({});
    setFullscreenLevel(2);
    setCurrentLatihanIdx(0);

    window.history.pushState(null, null, window.location.pathname);

    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen().catch((err) => console.log(err));
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const handleLatihanAnswer = (qId, option, correct) => {
    setSelectedLatihanAns(prev => ({ ...prev, [qId]: option }));
    setShowPembahasan(prev => ({ ...prev, [qId]: true }));
    if(option === correct) toast.success("Jawaban Benar!");
    else toast.error("Coba baca pembahasannya yuk!");
  };

  return (
    <div className={`${styles.forumWrapperPage} ${fullscreenLevel >= 1 ? styles.fullscreenOverlayMode : ''}`}>
      
      {/* LEVEL 0: TABS PLATFORM */}
      {fullscreenLevel === 0 && (
        <div style={{ width: '100%', flexShrink: 0 }}>
          <SubNavForum activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      )}

      {/* LEVEL 1: DAFTAR BAB */}
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

      {/* PANEL LEVEL 0 & LEVEL 2 */}
      {fullscreenLevel !== 1 && (
        <div className={styles.hubContentPanel}>
          
          {/* TAB MATERI */}
          {activeTab === 'materi' && (
            <div className={styles.materiInnerLayout}>
              
              {/* LEVEL 0: DAFTAR MATA PELAJARAN */}
              {fullscreenLevel === 0 && !selectedSubject && (
                <div className={styles.selectionStandardGrid}>
                  <h3 className={styles.sectionHeaderTitle}>Mata Pelajaran Utama</h3>
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

              {/* LEVEL 2: IMMERSIVE LEARNING AREA */}
              {fullscreenLevel === 2 && selectedChapter && (
                <div className={styles.chapterReaderFullscreenView}>
                  <div className={styles.chapterReaderHeader}>
                    <button onClick={handleBackFromChapter} className={styles.readerExitBtn}><FaArrowLeft /> Keluar Bab</button>
                    <div className={styles.readerHeaderTitles}>
                      <span>
                        {selectedSubject?.name.includes("Alam") ? "IPA" : 
                         selectedSubject?.name.includes("Sosial") ? "IPS" : 
                         selectedSubject?.name} • Bab {selectedChapter.order}
                      </span>
                      <h4>{selectedChapter.title}</h4>
                    </div>
                  </div>

                  {/* TIMELINE PROGRESS BAR */}
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
                        <div className={styles.timelineStatusText}>
                          Progres Belajar: <strong>{customProgress}</strong> / 60
                        </div>
                      </div>
                    );
                  })()}

                  <div className={styles.readerScrollableCoreBody}>
                    
                    {/* SUB-TAB 1: PDF MATERIAL */}
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

                    {/* SUB-TAB 2: LATIHAN SOAL */}
                    {activeMateriSubTab === 'latihan' && (
                      <LatihanSoalSection 
                        latihanSoal={selectedChapter.latihanSoal}
                        currentLatihanIdx={currentLatihanIdx}
                        setCurrentLatihanIdx={setCurrentLatihanIdx}
                        selectedLatihanAns={selectedLatihanAns}
                        showPembahasan={showPembahasan}
                        handleLatihanAnswer={handleLatihanAnswer}
                        setActiveMateriSubTab={setActiveMateriSubTab}
                      />
                    )}

                    {/* SUB-TAB 3: MINI ULANGAN */}
                    {activeMateriSubTab === 'ulangan' && (
                      <MiniUlanganSection 
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

          {/* TAB CHAT GLOBAL */}
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

      {/* CONFIRM EXIT MODAL */}
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
                    if (element.requestFullscreen) {
                      element.requestFullscreen().catch((err) => console.log(err));
                    }
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
