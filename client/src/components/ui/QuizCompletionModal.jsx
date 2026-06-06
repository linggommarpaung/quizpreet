
// client/src/components/ui/QuizCompletionModal.jsx

import React from 'react';
import styles from './QuizCompletionModal.module.css';

const QuizCompletionModal = ({ isOpen, onClose, score, totalQuestions, earnedDiamonds, earnedStreaks, earnedPoints }) => {
    if (!isOpen) return null;

    const correctAnswers = score;
    const incorrectAnswers = totalQuestions - score;
    const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    let message = '';
    let feedback = '';
    let icon = '';

    if (percentage >= 75) {
        message = 'Luar Biasa!';
        feedback = 'Selamat, Anda telah menguasai unit ini dengan sangat baik. Terus pertahankan!';
        icon = '🏆';
    } else if (percentage >= 50) {
        message = 'Bagus!';
        feedback = 'Anda berhasil menyelesaikan unit ini. Terus asah kemampuanmu untuk menjadi lebih cerdas!';
        icon = '👍';
    } else {
        message = 'Tetap Semangat!';
        feedback = 'Anda telah menyelesaikan unit ini. Jangan menyerah, belajar lebih giat lagi dan coba lagi!';
        icon = '💪';
    }

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.icon}>{icon}</div>
                <h2>{message}</h2>
                <p>{feedback}</p>
                
                <div className={styles.rewards}>
                    <div className={styles.rewardItem}>
                        <span>⭐</span>
                        <span>+{earnedPoints}</span>
                    </div>
                    <div className={styles.rewardItem}>
                        <span>🔥</span>
                        <span>+{earnedStreaks}</span>
                    </div>
                    <div className={styles.rewardItem}>
                        <span>💎</span>
                        <span>+{earnedDiamonds}</span>
                    </div>
                </div>

                <div className={styles.stats}>
                    <div className={styles.statItem}>
                        <span>Benar</span>
                        <span className={`${styles.statValue} ${styles.correct}`}>{correctAnswers}</span>
                    </div>
                    <div className={styles.statItem}>
                        <span>Salah</span>
                        <span className={`${styles.statValue} ${styles.incorrect}`}>{incorrectAnswers}</span>
                    </div>
                    <div className={styles.statItem}>
                        <span>Skor</span>
                        <span className={`${styles.statValue}`}>{percentage}%</span>
                    </div>
                </div>
                
                <button onClick={onClose} className={styles.closeButton}>
                    Kembali ke Dashboard
                </button>
            </div>
        </div>
    );
};

export default QuizCompletionModal;
