// client/src/pages/QuizPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './QuizPage.module.css';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { 
  FaStar, FaFire, FaChevronRight, FaArrowLeft,
  FaCalculator, FaFlask, FaEarthAsia, FaLanguage,      
  FaSpinner, FaFont
} from 'react-icons/fa6';

const QuizPage = () => {
  const { currentUser } = useAuth();
  const { mapelId } = useParams();
  const navigate = useNavigate();

  // --- STATE DATA FIREBASE & KUIS ---
  const [allQuizzes, setAllQuizzes] = useState([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const toggleFullscreen = (enter) => {
    const elem = document.documentElement;
    if (enter) {
      if (elem.requestFullscreen) elem.requestFullscreen();
    } else {
      if (document.fullscreenElement) document.exitFullscreen();
    }
  };


  // Fungsi navigasi kembali
  const handleGoBack = () => {
    toggleFullscreen(false); // Matikan dulu sebelum pindah
    navigate(`/quiz`);
  };

  // FETCH DATA
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

  // FUNGSI MENGHITUNG JUMLAH KUIS
  const getQuizCount = (id) => allQuizzes.filter(quiz => quiz.mapel === id).length;

  const subjectsData = [
    { id: 'mtk', name: 'Matematika', icon: <FaCalculator />, totalQuizzes: getQuizCount('mtk'), color: '#ef4444' },
    { id: 'ipa', name: 'Ilmu Pengetahuan Alam', icon: <FaFlask />, totalQuizzes: getQuizCount('ipa'), color: '#10b981' },
    { id: 'ips', name: 'Ilmu Pengetahuan Sosial', icon: <FaEarthAsia />, totalQuizzes: getQuizCount('ips'), color: '#f59e0b' },
    { id: 'inggris', name: 'Bahasa Inggris', icon: <FaLanguage />, totalQuizzes: getQuizCount('inggris'), color: '#3b82f6' },
    { id: 'indonesia', name: 'Bahasa Indonesia', icon: <FaFont />, totalQuizzes: getQuizCount('indonesia'), color: '#8b5cf6' }
  ];

  // EFFECT UNTUK MENANGANI ROUTING URL /page/list/:mapelId
  useEffect(() => {
    if (mapelId && allQuizzes.length > 0) {
      const matches = allQuizzes
        .filter(quiz => quiz.mapel === mapelId)
        .sort((a, b) => Number(a.themeNumber || 0) - Number(b.themeNumber || 0));
      setFilteredQuizzes(matches);
    }
  }, [mapelId, allQuizzes]);

  const handleSelectSubject = (subject) => {
    // Navigasi ke URL baru sesuai permintaanmu
    navigate(`/quiz/list/${subject.id}`);
  };

  const handleStartQuiz = (quizData) => {
    navigate(`/quiz/list/${mapelId}/${quizData.id}`);
  };


  // Cek apakah sedang di mode List (ada mapelId di URL)
  const isListMode = Boolean(mapelId);
  const activeSubjectData = isListMode ? subjectsData.find(s => s.id === mapelId) : null;

  return (
    <div className={`${styles.quizWrapperPage} ${mapelId ? styles.fullscreenOverlayMode : ''}`}>
      
      {/* 👑 PANEL STATS & POINTS (Hanya tampil di halaman depan) */}
      {!isListMode && (
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
          <h3 className={styles.sectionHeaderTitle}>Mata Pelajaran Quiz</h3>
        </div>
      )}

      {/* 🧩 KONTEN UTAMA SCROLLABLE */}
      <div className={styles.quizMainContentScrollable}>
        {loading ? (
          <div className={styles.loadingStateArea}>
            <FaSpinner className={styles.spinnerLoadingIcon} />
            <p>Menghubungkan ke pusat paket soal...</p>
          </div>
        ) : (
          <>
            {/* LEVEL 0: PILIH MATA PELAJARAN (Tampil jika rute tidak ada mapelId) */}
            {!isListMode && (
              <div className={styles.selectionStandardGrid}>
                <div className={styles.subjectBoxRow}>
                  {subjectsData.map(sub => (
                    <div key={sub.id} className={styles.subjectCardRow} onClick={() => handleSelectSubject(sub)}>
                      <span className={styles.subjectIconBox}>{sub.icon}</span>
                      <div className={styles.subMetaData}>
                        <h4>{sub.name}</h4>
                        <p>{sub.totalQuizzes} paket kuis</p>
                      </div>
                      <FaChevronRight className={styles.arrowChevronRight} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LEVEL 1: LIST PAKET SOAL (Tampil jika rute ada mapelId) */}
            {isListMode && activeSubjectData && (
              <div className={styles.levelOneContainer}>
                <div className={styles.headerNavLevelOne}>
                  <button className={styles.backLevelBtn} onClick={() => navigate(`/quiz`)}>
                    <FaArrowLeft /> Kembali
                  </button>
                  <div className={styles.subjectIndicatorBadge}>
                    {activeSubjectData.icon} <span>{activeSubjectData.name}</span>
                  </div>
                </div>

                <div className={styles.quizListWrapper}>
                  {filteredQuizzes.length > 0 ? (
                    filteredQuizzes.map((quiz, idx) => (
                      <div 
                        key={quiz.id}
                        className={styles.chapterQuizItemRow}
                        onClick={() => handleStartQuiz(quiz)}
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
                      <p>Belum ada paket kuis tersedia untuk mata pelajaran ini.</p>
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
