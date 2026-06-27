// client/src/components/ui/QuizStart.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import styles from './QuizStart.module.css';
import { FaClock, FaSpinner, FaTriangleExclamation } from 'react-icons/fa6';
import QuizCompletionModal from './QuizCompletionModal';

const QuizStart = () => {
  const { currentUser } = useAuth();
  const { mapelId, quizId } = useParams();
  const navigate = useNavigate();

  const [quizData, setQuizData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  
  const [finalScore, setFinalScore] = useState(0);
  const [rewards, setRewards] = useState({ exp: 0, coins: 0 });

  // 1. FETCH DATA KUIS
  useEffect(() => {
    const fetchQuizData = async () => {
      try {
        const docRef = doc(db, 'dailyPaths', quizId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setQuizData(data);
          setTimeLeft((data.units?.length || 0) * 60);
        } else {
          toast.error("Data kuis tidak ditemukan!");
          navigate(`/quiz/list/${mapelId}`);
        }
      } catch (error) {
        console.error("Gagal mengambil kuis:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchQuizData();
  }, [quizId, mapelId, navigate]);

  // 2. SISTEM FULLSCREEN & ANTI KELUAR
  useEffect(() => {
    if (loading || !quizData || isFinished) return;

    // Paksa masuk layar penuh
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
      // Jika keluar dari layar penuh secara paksa (tekan ESC / tombol back HP)
      if (!document.fullscreenElement && !isFinished) {
        setIsPaused(true);
        setShowExitModal(true);
      }
    };

    // Cegah tombol back browser/HP
    const handlePopState = (e) => {
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

  // 3. TIMER HITUNG MUNDUR (Berhenti jika dipause)
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
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const units = quizData?.units || [];
  const currentQuestion = units[currentIdx];
  const totalQuestions = units.length;
  const answeredCount = Object.keys(answers).length;

  const handleSelectOption = (optIndex) => {
    setAnswers(prev => ({ ...prev, [currentIdx]: optIndex }));
  };

  const handleNext = () => {
    if (currentIdx < totalQuestions - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  // 4. LOGIKA SELESAI & PEMBERIAN REWARD
  const handleFinish = async () => {
    let score = 0;
    units.forEach((u, idx) => {
      if (answers[idx] === u.correctAnswer) score++;
    });
    
    const calcScore = Math.round((score / totalQuestions) * 100);
    setFinalScore(calcScore);

    // Hitung reward dinamis
    const earnedExp = Math.round(calcScore * 0.5); // Contoh: Skor 100 dapet 50 EXP
    const earnedCoins = calcScore >= 80 ? 10 : (calcScore >= 50 ? 5 : 2); // Koin tergantung KKM
    setRewards({ exp: earnedExp, coins: earnedCoins });

    setIsFinished(true);
    setIsPaused(true);

    // Otomatis keluar layar penuh saat selesai
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    // Tembak data ke Firestore
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

  // AKSI MODAL KELUAR
  const confirmExitQuiz = () => {
    navigate(`/quiz/list/${mapelId}`);
  };

  const cancelExitQuiz = async () => {
    setShowExitModal(false);
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) await elem.requestFullscreen();
    } catch (e) {}
    setIsPaused(false); // Lanjut timer
  };

  // LAYAR LOADING
  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <FaSpinner className={styles.spinIcon} />
        <p>Memuat Soal...</p>
      </div>
    );
  }

  // LAYAR HASIL AKHIR (Memanggil Komponen Baru)
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
      {/* HEADER BIRU */}
      <header className={styles.quizHeader}>
        <div className={styles.headerInfo}>
          <p className={styles.answeredStats}>Soal Terjawab/Total: {answeredCount} / {totalQuestions}</p>
          <h2 className={styles.questionNavTitle}>Pertanyaan {currentIdx + 1} dari {totalQuestions}</h2>
        </div>
        <div className={styles.timerBadge}>
          {formatTime(timeLeft)}
        </div>
      </header>

      {/* BODY KONTEN */}
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

      {/* FOOTER ACTION */}
      <footer className={styles.quizFooter}>
        <button 
          className={styles.btnSkip} 
          onClick={() => currentIdx > 0 && setCurrentIdx(prev => prev - 1)}
          disabled={currentIdx === 0}
        >
          {currentIdx === 0 ? '---' : 'KEMBALI'}
        </button>
        <button 
          className={styles.btnSubmit} 
          onClick={handleNext}
        >
          {currentIdx === totalQuestions - 1 ? 'SELESAI' : 'JAWAB'}
        </button>
      </footer>

      {/* MODAL KONFIRMASI KELUAR */}
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
    </div>
  );
};

export default QuizStart;
