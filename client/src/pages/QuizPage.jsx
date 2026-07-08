// client/src/pages/QuizPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import styles from './QuizPage.module.css';
import { toast, Toaster } from 'react-hot-toast'; 
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { 
  FaStar, FaFire, FaChevronRight, FaArrowLeft,
  FaCalculator, FaFlask, FaEarthAsia, FaLanguage,      
  FaSpinner, FaFont, FaLock 
} from 'react-icons/fa6';

const QuizPage = () => {
  const { currentUser } = useAuth();
  const { mapelId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // --- STATE DATA FIREBASE & KUIS ---
  const [allQuizzes, setAllQuizzes] = useState([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Nilai default 0 (Berarti belum ada paket yang selesai, hanya paket 1 yang terbuka)
  const [completedOrder, setCompletedOrder] = useState(0);
  
  const toggleFullscreen = (enter) => {
    const elem = document.documentElement;
    if (enter) {
      if (elem.requestFullscreen) elem.requestFullscreen();
    } else {
      if (document.fullscreenElement) document.exitFullscreen();
    }
  };

  const handleGoBack = () => {
    toggleFullscreen(false);
    navigate(`/quiz`);
  };

  // FETCH DATA KUIS & KUNCIAN PROGRESS USER
  useEffect(() => {
    const fetchQuizzesAndProgress = async () => {
      try {
        setLoading(true);

        let currentCompleted = 0; // Default 0 jika user baru / belum ada progress
        
        // Ambil data dari: userProgress/[uid] -> [mapelId] -> orderq
        if (currentUser?.uid && mapelId) {
          const progressRef = doc(db, 'userProgress', currentUser.uid);
          const progressSnap = await getDoc(progressRef);
          
          if (progressSnap.exists()) {
            const dataProgress = progressSnap.data();
            if (dataProgress[mapelId] && dataProgress[mapelId].orderq !== undefined) {
              currentCompleted = Number(dataProgress[mapelId].orderq || 0);
            }
          }
        }
        setCompletedOrder(currentCompleted);

        // Ambil paket kuis dari dailyPaths
        const querySnapshot = await getDocs(collection(db, 'dailyPaths'));
        const quizList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAllQuizzes(quizList);

      } catch (err) {
        console.error("Error fetching quizzes and progress:", err);
        toast.error("Gagal memuat data kuis.");
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzesAndProgress();
  }, [mapelId, currentUser]);
  
  useEffect(() => {
    if (location.state?.errorMsg) {
      // Munculkan toast setelah halaman list benar-benar siap mrender
      toast.error(location.state.errorMsg);
      
      // Bersihkan state di URL biar kalau di-refresh, toast-nya gak muncul lagi
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const getQuizCount = (id) => allQuizzes.filter(quiz => quiz.mapel === id).length;

  const subjectsData = [
    { id: 'mtk', name: 'Matematika', icon: <FaCalculator />, totalQuizzes: getQuizCount('mtk'), color: '#ef4444' },
    { id: 'ipa', name: 'Ilmu Pengetahuan Alam', icon: <FaFlask />, totalQuizzes: getQuizCount('ipa'), color: '#10b981' },
    { id: 'ips', name: 'Ilmu Pengetahuan Sosial', icon: <FaEarthAsia />, totalQuizzes: getQuizCount('ips'), color: '#f59e0b' },
    { id: 'inggris', name: 'Bahasa Inggris', icon: <FaLanguage />, totalQuizzes: getQuizCount('inggris'), color: '#3b82f6' },
    { id: 'indonesia', name: 'Bahasa Indonesia', icon: <FaFont />, totalQuizzes: getQuizCount('indonesia'), color: '#8b5cf6' }
  ];

  useEffect(() => {
    if (mapelId && allQuizzes.length > 0) {
      const matches = allQuizzes
        .filter(quiz => quiz.mapel === mapelId)
        .sort((a, b) => Number(a.themeNumber || 0) - Number(b.themeNumber || 0));
      
      setFilteredQuizzes(matches);
    }
  }, [mapelId, allQuizzes]);

  const handleSelectSubject = (subject) => {
    navigate(`/quiz/list/${subject.id}`);
  };

  // 🔒 LINK BYPASS PROTECTION FUNCTION
  const handleStartQuiz = (quizData, targetIndex) => {
    if (targetIndex > completedOrder) {
      toast.error("🔒 Kuis ini masih terkunci! Selesaikan kuis bab sebelumnya.");
      return;
    }
    navigate(`/quiz/list/${mapelId}/${quizData.id}`);
  };

  const isListMode = Boolean(mapelId);
  const activeSubjectData = isListMode ? subjectsData.find(s => s.id === mapelId) : null;

  return (
    <div className={`${styles.quizWrapperPage} ${mapelId ? styles.fullscreenOverlayMode : ''}`}>
      {/* 🌟 SUDAH DIPERBAIKI: Menggunakan toastOptions dengan duration otomatis 3 detik */}
      <Toaster 
        position="top-center" 
        reverseOrder={false} 
        toastOptions={{
          duration: 3000,
        }}
      />

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

      <div className={styles.quizMainContentScrollable}>
        {loading ? (
          <div className={styles.loadingStateArea}>
            <FaSpinner className={styles.spinnerLoadingIcon} />
            <p>Menghubungkan ke pusat paket soal...</p>
          </div>
        ) : (
          <>
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

            {isListMode && activeSubjectData && (
              <div className={styles.levelOneContainer}>
                <div className={styles.headerNavLevelOne}>
                  <button className={styles.backLevelBtn} onClick={handleGoBack}>
                    <FaArrowLeft /> Kembali
                  </button>
                  <div className={styles.subjectIndicatorBadge}>
                    {activeSubjectData.icon} <span>{activeSubjectData.name}</span>
                  </div>
                </div>

                <div className={styles.quizListWrapper}>
                  {filteredQuizzes.length > 0 ? (
                    filteredQuizzes.map((quiz, idx) => {
                      const currentQuizIndex = idx;
                      const isLocked = currentQuizIndex > completedOrder;

                      return (
                        <div 
                          key={quiz.id}
                          className={`${styles.chapterQuizItemRow} ${isLocked ? styles.quizItemRowLocked : ''}`}
                          onClick={() => {
                            if (isLocked) {
                              toast.error("Quiz terkunci, silahkan selesaikan quiz sebelumnya!");
                            } else {
                              handleStartQuiz(quiz, currentQuizIndex);
                            }
                          }}
                          style={isLocked ? { opacity: 0.55, cursor: 'not-allowed' } : {}}
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
                            {isLocked ? (
                              <FaLock style={{ color: '#94a3b8', fontSize: '0.85rem' }} />
                            ) : (
                              <FaChevronRight className={styles.arrowGoQuiz} />
                            )}
                          </div>
                        </div>
                      );
                    })
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
