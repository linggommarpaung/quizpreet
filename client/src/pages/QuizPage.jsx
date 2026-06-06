// client/src/pages/QuizPage.jsx

import React, { useState, useEffect } from 'react';
import styles from './QuizPage.module.css';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { 
  FaStar, 
  FaFire, 
  FaChevronRight,
  FaLock,
  FaCircleCheck,
  FaArrowLeft,
  FaCalculator,    
  FaFlask,         
  FaEarthAsia,     
  FaLanguage,      
  FaBook,
  FaSpinner
} from 'react-icons/fa6';

const QuizPage = () => {
  const { currentUser } = useAuth();
  
  // --- STATE LEVEL TAMPILAN (0 = Pilih Mapel, 1 = Pilih Paket Quiz dari dailyPaths) ---
  const [fullscreenLevel, setFullscreenLevel] = useState(0);
  const [selectedSubject, setSelectedSubject] = useState(null);

  // --- STATE DATA FIREBASE & KUIS ---
  const [allQuizzes, setAllQuizzes] = useState([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- DATA MATA PELAJARAN (Ikon disamakan dengan Forum & Manajemen) ---
  const subjectsData = [
    { id: 'mtk', name: 'Matematika', icon: <FaCalculator />, color: '#ef4444', desc: 'Uji kemampuan aljabar & hitungan' },
    { id: 'ipa', name: 'Sains (IPA)', icon: <FaFlask />, color: '#10b981', desc: 'Uji pemahaman fisika & biologi' },
    { id: 'ips', name: 'IPS', icon: <FaEarthAsia />, color: '#f59e0b', desc: 'Uji wawasan sejarah & geografi' },
    { id: 'bing', name: 'Bahasa Inggris', icon: <FaLanguage />, color: '#3b82f6', desc: 'Uji tenses & reading skill' },
    { id: 'indonesia', name: 'Bahasa Indonesia', icon: <FaBook />, color: '#8b5cf6', desc: 'Uji tata bahasa & ejaan baku' }
  ];

  // Fetch seluruh paket kuis dari dailyPaths saat komponen di-load
  useEffect(() => {
  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'dailyPaths'));
      const quizList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllQuizzes(quizList);
    } catch (err) {
      console.error("Error fetching quizzes:", err);
      toast.error("Gagal memuat data paket kuis.");
    } finally {
      setLoading(false);
    }
  };

  fetchQuizzes();
}, []);

  // Filter kuis berdasarkan mapel saat user memilih salah satu mapel
  const handleSelectSubject = (subject) => {
  setSelectedSubject(subject);
  
  // PENGECEKAN UTAMA: Menyaring berdasarkan field 'mapelId' dari data dailyPaths
  const matches = allQuizzes.filter(quiz => {
    // Pastikan mapelId di dokumen database sama dengan id mapel yang diklik (contoh: 'mtk')
    return quiz.mapelId === subject.id;
  })
  .sort((a, b) => {
    // Mengurutkan berdasarkan nomor tema/bab kuis
    return Number(a.themeNumber || 0) - Number(b.themeNumber || 0);
  });
    
  setFilteredQuizzes(matches);
  setFullscreenLevel(1); // Masuk ke layer list kuis
};

  const handleStartQuiz = (quizTitle) => {
    toast.success(`Memulai ${quizTitle}!`);
    // Integrasikan aksi pemicu pengerjaan kuis/modal kuis kamu di sini
  };

  return (
    <div className={styles.quizWrapperPage}>
      
      {/* 👑 PANEL STATS & POINTS (DIAM DI ATAS, TIDAK IKUT SCROLL) */}
      <div className={styles.premiumHeaderSummary}>
        <div className={styles.xpBalanceBlock}>
          <div className={styles.xpDisplayRow}>
            <div className={styles.statBoxItem}>
              <FaStar className={styles.starIconScore} />
              <div className={styles.statBoxMeta}>
                <span className={styles.xpLabelTitle}>Poin XP</span>
                <h5>{currentUser?.xp || 0} XP</h5>
              </div>
            </div>
            
            <div className={styles.dividerLine} />

            <div className={styles.statBoxItem}>
              <FaFire className={styles.fireIconStreak} />
              <div className={styles.statBoxMeta}>
                <span className={styles.xpLabelTitle}>Streak</span>
                <h5>3 Hari</h5>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🧩 KONTEN UTAMA DENGAN LAYER LEVEL (DIV SEPARASI YANG BISA DI-SCROLL) */}
      <div className={styles.quizMainContentScrollable}>
        
        {loading ? (
          <div className={styles.loadingStateArea}>
            <FaSpinner className={styles.spinnerLoadingIcon} />
            <p>Menghubungkan ke pusat paket soal...</p>
          </div>
        ) : (
          <>
            {/* ================= LEVEL 0: PILIH MATA PELAJARAN ================= */}
            {fullscreenLevel === 0 && (
              <div className={styles.levelZeroContainer}>
                <div className={styles.sectionTitleArea}>
                  <h4>Pilih Tantangan Kuis</h4>
                  <p>Asah kemampuan belajarmu dengan paket latihan soal pilihan ganda.</p>
                </div>

                <div className={styles.mapelGridContainer}>
                  {subjectsData.map((mapel) => (
                    <div 
                      key={mapel.id} 
                      className={styles.mapelCardItem}
                      onClick={() => handleSelectSubject(mapel)}
                    >
                      <div 
                        className={styles.iconCircleBox}
                        style={{ backgroundColor: `${mapel.color}12`, color: mapel.color }}
                      >
                        {mapel.icon}
                      </div>
                      <div className={styles.mapelMetaDetails}>
                        <h3>{mapel.name}</h3>
                        <p>{mapel.desc}</p>
                      </div>
                      <div className={styles.arrowChevronGo}>
                        <FaChevronRight />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ================= LEVEL 1: LIST PAKET SOAL (DAILY PATHS) ================= */}
            {fullscreenLevel === 1 && selectedSubject && (
              <div className={styles.levelOneContainer}>
                <div className={styles.headerNavLevelOne}>
                  <button 
                    className={styles.backLevelBtn} 
                    onClick={() => setFullscreenLevel(0)}
                  >
                    <FaArrowLeft /> Kembali
                  </button>
                  <div className={styles.subjectIndicatorBadge} style={{ color: selectedSubject.color }}>
                    {selectedSubject.icon} <span>{selectedSubject.name}</span>
                  </div>
                </div>

                <div className={styles.quizListWrapper}>
                  {filteredQuizzes.length > 0 ? (
                    filteredQuizzes.map((quiz, idx) => (
                      <div 
                        key={quiz.id}
                        className={styles.chapterQuizItemRow}
                        onClick={() => handleStartQuiz(`Kuis Bab ${quiz.themeNumber || idx + 1}: ${quiz.theme}`)}
                      >
                        <div className={styles.quizLeftMetaBox}>
                          <div className={styles.quizNumberIndicator}>
                            Q{quiz.themeNumber || idx + 1}
                          </div>
                          <div className={styles.quizTitleMetaTxt}>
                            <h5>{quiz.theme}</h5>
                            <span className={styles.quizTargetSub}>Total: {quiz.units?.length || 0} Soal</span>
                          </div>
                        </div>

                        <div className={styles.quizRightActionZone}>
                          <FaChevronRight className={styles.arrowGoQuiz} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.emptyStateContainer}>
                      <p>Belum ada paket kuis dailyPaths tersedia untuk mata pelajaran ini.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
};

export default QuizPage;
