// client/src/components/ui/QuizStart.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { toast } from 'react-hot-toast';
import styles from './QuizStart.module.css';
import { FaClock, FaCheck, FaArrowLeft, FaArrowRight, FaSpinner } from 'react-icons/fa6';

const QuizStart = () => {
  // Ambil parameter dari URL
  const { mapelId, quizId } = useParams();
  const navigate = useNavigate();

  const [quizData, setQuizData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0); 
  const [isFinished, setIsFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  // FETCH DATA KUIS SPESIFIK DARI FIRESTORE BERDASARKAN URL
  useEffect(() => {
    const fetchQuizData = async () => {
      try {
        const docRef = doc(db, 'dailyPaths', quizId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setQuizData(data);
          // Set waktu 60 detik per soal berdasarkan data yang di-fetch
          setTimeLeft((data.units?.length || 0) * 60);
        } else {
          toast.error("Data kuis tidak ditemukan!");
          navigate(`/quiz/list/${mapelId}`);
        }
      } catch (error) {
        console.error("Gagal mengambil kuis:", error);
        toast.error("Terjadi kesalahan saat memuat kuis.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuizData();
  }, [quizId, mapelId, navigate]);

  const units = quizData?.units || [];
  const totalQuestions = units.length;
  const currentQuestion = units[currentIdx];

  // Timer Hitung Mundur (Berjalan setelah loading selesai)
  useEffect(() => {
    if (loading || !quizData) return;
    
    if (isFinished || timeLeft <= 0) {
      if (timeLeft <= 0 && !isFinished) handleFinish();
      return;
    }
    const timerId = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timerId);
  }, [timeLeft, isFinished, loading, quizData]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSelectOption = (optIndex) => {
    setAnswers(prev => ({ ...prev, [currentIdx]: optIndex }));
  };

  const handleFinish = () => {
    let score = 0;
    units.forEach((u, idx) => {
      if (answers[idx] === u.correctAnswer) score++;
    });
    setFinalScore(Math.round((score / totalQuestions) * 100));
    setIsFinished(true);
  };

  // Fungsi untuk kembali ke halaman list mapel
  const handleExitQuiz = () => {
    navigate(`/quiz/list/${mapelId}`);
  };

  const labelAlphabet = ['A', 'B', 'C', 'D', 'E'];

  // LAYAR LOADING
  if (loading) {
    return (
      <div className={styles.unbkFullscreenOverlay} style={{ justifyContent: 'center', alignItems: 'center' }}>
        <FaSpinner className="fa-spin" style={{ fontSize: '3rem', color: '#3b82f6', marginBottom: '10px' }} />
        <h3 style={{ color: '#64748b' }}>Menyiapkan Lembar Ujian...</h3>
      </div>
    );
  }

  if (!quizData) return null;

  // LAYAR HASIL AKHIR
  if (isFinished) {
    return (
      <div className={styles.unbkFullscreenOverlay} style={{ justifyContent: 'center' }}>
        <div className={styles.resultCardBox}>
          <h2>Ujian Selesai!</h2>
          <p>Tantangan <strong>{quizData.theme}</strong> telah berhasil diselesaikan.</p>
          <div className={styles.scoreCircleDisplay}>
            <h1>{finalScore}</h1>
          </div>
          <button className={styles.btnFinishExit} onClick={handleExitQuiz}>Kembali ke Menu Utama</button>
        </div>
      </div>
    );
  }

  // LAYAR UJIAN UNBK
  return (
    <div className={styles.unbkFullscreenOverlay}>
      <div className={styles.unbkHeaderBar}>
        <div className={styles.headerLeftLogo}>
          <h3>Quizpreet <span>UNBK Mode</span></h3>
        </div>
        <div className={styles.headerCenterTitle}>
          {quizData.theme} (Bab {quizData.themeNumber})
        </div>
        <div className={styles.headerRightTimer}>
          <FaClock /> Sisa Waktu: <strong>{formatTime(timeLeft)}</strong>
        </div>
      </div>

      <div className={styles.unbkBodyContainer}>
        {/* PANEL KIRI: SOAL & JAWABAN */}
        <div className={styles.questionPanelArea}>
          <div className={styles.questionHeader}>
            <div className={styles.nomorSoalBadge}>Soal No. {currentIdx + 1}</div>
          </div>
          
          <div className={styles.questionTextContent}>
            {currentQuestion?.text}
          </div>

          <div className={styles.optionsListContainer}>
            {currentQuestion?.options?.map((opt, optIdx) => {
              const isSelected = answers[currentIdx] === optIdx;
              return (
                <div 
                  key={optIdx} 
                  className={`${styles.optionRowItem} ${isSelected ? styles.optionSelected : ''}`}
                  onClick={() => handleSelectOption(optIdx)}
                >
                  <div className={styles.alphabetCircle}>{labelAlphabet[optIdx]}</div>
                  <div className={styles.optionTextData}>{opt}</div>
                </div>
              );
            })}
          </div>

          {/* NAVIGASI BAWAH */}
          <div className={styles.bottomNavActions}>
            <button 
              className={styles.navBtnSecondary} 
              disabled={currentIdx === 0} 
              onClick={() => setCurrentIdx(p => p - 1)}
            >
              <FaArrowLeft /> Soal Sebelumnya
            </button>
            
            {currentIdx === totalQuestions - 1 ? (
              <button className={styles.navBtnFinish} onClick={handleFinish}>
                <FaCheck /> Selesai Ujian
              </button>
            ) : (
              <button 
                className={styles.navBtnPrimary} 
                onClick={() => setCurrentIdx(p => p + 1)}
              >
                Soal Berikutnya <FaArrowRight />
              </button>
            )}
          </div>
        </div>

        {/* PANEL KANAN: GRID NAVIGASI SOAL */}
        <div className={styles.gridNavPanelArea}>
          <div className={styles.gridHeader}>Navigasi Soal</div>
          <div className={styles.gridNumbersWrapper}>
            {units.map((_, idx) => {
              const hasAnswered = answers[idx] !== undefined;
              const isCurrent = currentIdx === idx;
              return (
                <div 
                  key={idx} 
                  className={`
                    ${styles.gridBoxItem} 
                    ${hasAnswered ? styles.gridAnswered : ''} 
                    ${isCurrent ? styles.gridActiveCurrent : ''}
                  `}
                  onClick={() => setCurrentIdx(idx)}
                >
                  {idx + 1}
                </div>
              );
            })}
          </div>
          <button className={styles.forceFinishBtn} onClick={handleFinish}>Hentikan & Kumpulkan</button>
        </div>
      </div>
    </div>
  );
};

export default QuizStart;
