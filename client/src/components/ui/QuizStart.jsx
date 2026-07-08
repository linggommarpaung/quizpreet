// client/src/components/ui/QuizStart.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, increment, collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast'; // 🌟 Digunakan untuk toast.dismiss()
import styles from './QuizStart.module.css';
import { FaClock, FaSpinner, FaTriangleExclamation, FaArrowLeft, FaCircleQuestion } from 'react-icons/fa6';
import QuizCompletionModal from './QuizCompletionModal';

const QuizStart = () => {
  const { currentUser } = useAuth();
  const { mapelId, quizId } = useParams(); // 👑 Tetap menggunakan parameter asli kamu
  const navigate = useNavigate();

  const [quizData, setQuizData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // LOGIKA PENGACAKAN & ALUR SOAL
  const [shuffledUnits, setShuffledUnits] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  
  // STATE MODAL ANTREAN SISA CUSTOM
  const [showQueueModal, setShowQueueModal] = useState(false);
  
  // ANTREAN SOAL YANG DILEWATI
  const [skippedQuestions, setSkippedQuestions] = useState([]);
  const [isReviewingSkipped, setIsReviewingSkipped] = useState(false);

  const [finalScore, setFinalScore] = useState(0);
  const [rewards, setRewards] = useState({ exp: 0, coins: 0 });

  // Fisher-Yates Shuffle untuk mengacak soal
  const shuffleArray = (array) => {
    let arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Helper untuk mengubah string format "10:00" atau "HH:MM:SS" menjadi detik
  const parseTimeLimitToSeconds = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return 600; 
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) return (parts[0] * 60) + parts[1]; 
    if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2]; 
    return 600;
  };


  useEffect(() => {
    const fetchQuizAndVerifyBypass = async () => {
      try {
        setLoading(true);

        let completedOrder = 0;
        if (currentUser?.uid && mapelId) {
          const progressRef = doc(db, 'userProgress', currentUser.uid);
          const progressSnap = await getDoc(progressRef);
          
          if (progressSnap.exists()) {
            const dataProgress = progressSnap.data();
            if (dataProgress[mapelId] && dataProgress[mapelId].orderq !== undefined) {
              completedOrder = Number(dataProgress[mapelId].orderq || 0);
            }
          }
        }

        const querySnapshot = await getDocs(collection(db, 'dailyPaths'));
        const allQuizzesList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const sortedQuizzes = allQuizzesList
          .filter(quiz => quiz.mapel === mapelId)
          .sort((a, b) => Number(a.themeNumber || 0) - Number(b.themeNumber || 0));

        const currentQuizData = sortedQuizzes.find(q => q.id === quizId);
        const currentQuizIndex = sortedQuizzes.findIndex(q => q.id === quizId);

        if (!currentQuizData || currentQuizIndex === -1) {
  navigate(`/quiz/list/${mapelId}`, { state: { errorMsg: "Data kuis tidak ditemukan!" } });
  return;
}
        if (currentQuizIndex > completedOrder) {
  navigate(`/quiz/list/${mapelId}`, { state: { errorMsg: "🔒 Kuis ini masih terkunci! Selesaikan kuis bab sebelumnya." } });
  return;
}

        setQuizData(currentQuizData);
        if (currentQuizData.units && currentQuizData.units.length > 0) {
          setShuffledUnits(shuffleArray(currentQuizData.units));
        }
        setTimeLeft(parseTimeLimitToSeconds(currentQuizData.timeLimit));

      } catch (error) {
        console.error("Gagal memverifikasi proteksi kuis:", error);
        toast.error("Gagal memuat kuis.");
        navigate(`/quiz/list/${mapelId}`);
      } finally {
        setLoading(false);
      }
    };

    if (quizId && mapelId) {
      fetchQuizAndVerifyBypass();
    }
  }, [quizId, mapelId, currentUser, navigate]);

  // FULLSCREEN & BACK BUTTON PROTECTION
  useEffect(() => {
    if (loading || !quizData || isFinished) return;

    const enterFullscreen = async () => {
      try {
        const elem = document.documentElement;
        if (elem.requestFullscreen) await elem.requestFullscreen();
      } catch (err) {
        console.log("Auto-fullscreen diblokir browser, abaikan.");
      }
    };
    enterFullscreen();

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !isFinished) {
        setIsPaused(true);
        setShowExitModal(true);
      }
    };

    const handlePopState = () => {
      if (!isFinished) {
        window.history.pushState(null, null, window.location.pathname);
        setIsPaused(true);
        setShowExitModal(true);
      }
    };

    window.history.pushState(null, null, window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [isFinished, loading, quizData]);

  // COUNTDOWN TIMER
  useEffect(() => {
    if (loading || !quizData || isFinished || isPaused) return;
    
    if (timeLeft <= 0) {
      handleFinish();
      return;
    }
    const timerId = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timerId);
  }, [timeLeft, isFinished, loading, quizData, isPaused]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const totalQuestions = shuffledUnits.length;
  const currentQuestion = shuffledUnits[currentIdx];
  const answeredCount = Object.keys(answers).length;

  const handleSelectOption = (optIndex) => {
    setAnswers(prev => ({ ...prev, [currentIdx]: optIndex }));
  };

  const handleJawabClick = () => {
    if (answers[currentIdx] === undefined) {
      toast.error("Pilih jawaban kamu terlebih dahulu! Atau klik Lewati.");
      return;
    }
    moveToNextStep();
  };

  const handleLewatiClick = () => {
    if (isReviewingSkipped) {
      setAnswers(prev => ({ ...prev, [currentIdx]: -1 })); 
      moveToNextStep();
      return;
    }

    if (!skippedQuestions.includes(currentIdx)) {
      setSkippedQuestions(prev => [...prev, currentIdx]);
    }
    moveToNextStep();
  };

  const moveToNextStep = () => {
    if (!isReviewingSkipped) {
      if (currentIdx < totalQuestions - 1) {
        setCurrentIdx(prev => prev + 1);
      } else {
        checkAntreanSisa();
      }
    } else {
      const sisaAntrean = [...skippedQuestions];
      sisaAntrean.shift(); 
      setSkippedQuestions(sisaAntrean);

      if (sisaAntrean.length > 0) {
        setCurrentIdx(sisaAntrean[0]);
      } else {
        handleFinish();
      }
    }
  };

  const checkAntreanSisa = () => {
    if (skippedQuestions.length > 0) {
      setIsPaused(true);
      setShowQueueModal(true); 
    } else {
      handleFinish();
    }
  };

  const handleAcceptReview = () => {
    setShowQueueModal(false);
    setIsPaused(false);
    setIsReviewingSkipped(true);
    setCurrentIdx(skippedQuestions[0]);
  };

  const handleRejectReview = () => {
    setShowQueueModal(false);
    setIsPaused(false);
    const updatedAnswers = { ...answers };
    skippedQuestions.forEach(idx => {
      if (updatedAnswers[idx] === undefined) updatedAnswers[idx] = -1;
    });
    setAnswers(updatedAnswers);
    
    setTimeout(() => {
      handleFinishDirectly(updatedAnswers);
    }, 10);
  };

  const handleFinishDirectly = async (finalAnswers) => {
    let score = 0;
    shuffledUnits.forEach((u, idx) => {
      if (finalAnswers[idx] === u.correctAnswer) score++;
    });
    
    const calcScore = Math.round((score / totalQuestions) * 100);
    setFinalScore(calcScore);

    const earnedExp = Math.round(calcScore * 0.5);
    const earnedCoins = calcScore >= 80 ? 10 : (calcScore >= 50 ? 5 : 2);
    setRewards({ exp: earnedExp, coins: earnedCoins });

    setIsFinished(true);
    setIsPaused(true);

    if (currentUser?.uid) {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          exp: increment(earnedExp),
          koin: increment(earnedCoins)
        });
      } catch (err) {
        console.error("Gagal menyimpan progress ujian:", err);
      }
    }
  };

  const handleFinish = async () => {
    let score = 0;
    shuffledUnits.forEach((u, idx) => {
      if (answers[idx] === u.correctAnswer) score++;
    });
    
    const calcScore = Math.round((score / totalQuestions) * 100);
    setFinalScore(calcScore);

    const earnedExp = Math.round(calcScore * 0.5);
    const earnedCoins = calcScore >= 80 ? 10 : (calcScore >= 50 ? 5 : 2);
    setRewards({ exp: earnedExp, coins: earnedCoins });

    setIsFinished(true);
    setIsPaused(true);

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    if (currentUser?.uid) {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          exp: increment(earnedExp),
          koin: increment(earnedCoins)
        });
      } catch (err) {
        console.error("Gagal menyimpan progress ujian:", err);
      }
    }
  };

  const confirmExitQuiz = () => {
    navigate(`/quiz/list/${mapelId}`);
  };

  const cancelExitQuiz = async () => {
    setShowExitModal(false);
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) await elem.requestFullscreen();
    } catch (e) {}
    setIsPaused(false);
  };

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <FaSpinner className={styles.spinIcon} />
        <p>Memuat Soal...</p>
      </div>
    );
  }

  if (isFinished) {
    return (
      <QuizCompletionModal 
        isOpen={isFinished}
        score={finalScore}
        themeName={quizData?.theme}
        earnedExp={rewards.exp}
        earnedCoins={rewards.coins}
        onBack={() => navigate(`/quiz`)}
        onContinue={() => navigate(`/quiz/list/${mapelId}`)}
      />
    );
  }

  return (
    <div className={styles.quizMainContainer}>
      <header className={styles.quizHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => { setIsPaused(true); setShowExitModal(true); }}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}
          >
            <FaArrowLeft />
          </button>
          <div className={styles.headerInfo}>
            <p className={styles.answeredStats}>Soal Terjawab/Total: {answeredCount} / {totalQuestions}</p>
            <h2 className={styles.questionNavTitle}>
              {isReviewingSkipped ? "Review Soal Dilewati" : `Soal ${currentIdx + 1} - ${totalQuestions}`}
            </h2>
          </div>
        </div>
        <div className={styles.timerBadge}>
          {formatTime(timeLeft)}
        </div>
      </header>

      <main className={styles.quizBody}>
        <div className={styles.questionText}>
          {currentQuestion?.text}
        </div>

        {currentQuestion?.image && (
          <div className={styles.imageContainer}>
            <img src={currentQuestion.image} alt="Visual Soal" />
          </div>
        )}

        <div className={styles.optionsList}>
          {currentQuestion?.options?.map((opt, idx) => (
            <label 
              key={idx} 
              className={`${styles.optionItem} ${answers[currentIdx] === idx ? styles.activeOption : ''}`}
            >
              <input 
                type="radio" 
                name="quiz-opt" 
                checked={answers[currentIdx] === idx} 
                onChange={() => handleSelectOption(idx)}
                className={styles.hiddenRadio}
              />
              <span className={styles.customRadioCircle}></span>
              <span className={styles.optionLabelText}>{opt}</span>
            </label>
          ))}
        </div>
      </main>

      <footer className={styles.quizFooter}>
        <button 
          className={styles.btnSkip} 
          style={{ backgroundColor: '#64748b', color: 'white' }} 
          onClick={handleLewatiClick}
        >
          {isReviewingSkipped ? 'HANGUSKAN' : 'LEWATI'}
        </button>
        <button 
          className={styles.btnSubmit} 
          onClick={handleJawabClick}
        >
          {(!isReviewingSkipped && currentIdx === totalQuestions - 1) && !skippedQuestions.length ? 'SELESAI' : 'JAWAB'}
        </button>
      </footer>

      {showExitModal && (
        <div className={styles.modalWarningOverlay}>
          <div className={styles.modalWarningCard}>
            <FaTriangleExclamation className={styles.warningIcon} />
            <h3>Yakin Ingin Keluar?</h3>
            <p>Waktu kuis sedang dihentikan sementara. Jika kamu keluar, progres kuis ini tidak akan disimpan.</p>
            <div className={styles.modalActionGroup}>
              <button className={styles.btnWarningExit} onClick={confirmExitQuiz}>Keluar</button>
              <button className={styles.btnWarningResume} onClick={cancelExitQuiz}>Lanjut Kuis</button>
            </div>
          </div>
        </div>
      )}

      {showQueueModal && (
        <div className={styles.modalQueueOverlay}>
          <div className={styles.modalQueueCard}>
            <FaCircleQuestion className={styles.queueIcon} />
            <h3>Soal Terlewatkan!</h3>
            <p>Kamu telah melewati <strong>{skippedQuestions.length}</strong> soal dalam kuis ini. Apakah kamu ingin memeriksa dan menyelesaikannya sekarang?</p>
            <div className={styles.modalActionGroupVertical}>
              <button className={styles.btnQueueAccept} onClick={handleAcceptReview}>
                Ya, Selesaikan Sekarang
              </button>
              <button className={styles.btnQueueReject} onClick={handleRejectReview}>
                Tidak, Kumpulkan Saja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizStart;
