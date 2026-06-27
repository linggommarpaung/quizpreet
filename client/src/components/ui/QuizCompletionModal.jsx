// client/src/components/ui/QuizCompletionModal.jsx

import React, { useState, useEffect, useRef } from 'react';
import styles from './QuizCompletionModal.module.css';
import html2canvas from 'html2canvas';
import { toast } from 'react-hot-toast';
import { FaShareNodes, FaArrowRight, FaHouse, FaCoins, FaStar, FaSpinner } from 'react-icons/fa6';
import SprinkleAnimation from './SprinkleAnimation'; // Pastikan component ini sudah dibuat

const quotesData = [
    { text: "Hanya anak bangsa sendirilah yang dapat diandalkan untuk membangun Indonesia.", author: "B.J. Habibie" },
    { text: "Pendidikan adalah senjata paling mematikan di dunia untuk mengubah dunia.", author: "Nelson Mandela" },
    { text: "Barangsiapa tidak mau merasakan pahitnya belajar, ia akan merasakan hinanya kebodohan.", author: "Imam Syafi'i" },
    { text: "Belajar tanpa berpikir itu tidak berguna, berpikir tanpa belajar itu berbahaya!", author: "Soekarno" },
    { text: "Keberhasilan bukanlah milik orang pintar, melainkan orang yang senantiasa berusaha.", author: "B.J. Habibie" }
];

const QuizCompletionModal = ({ isOpen, score, themeName, earnedExp, earnedCoins, onBack, onContinue, profilePicture }) => {
    const cardRef = useRef(null);
    const [randomQuote, setRandomQuote] = useState(quotesData[0]);
    const [isSharing, setIsSharing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setRandomQuote(quotesData[Math.floor(Math.random() * quotesData.length)]);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const getGradeInfo = () => {
        if (score >= 80) return { text: 'Luar Biasa!', color: '#10b981' }; // Hijau
        if (score >= 50) return { text: 'Cukup Bagus!', color: '#f59e0b' }; // Kuning
        return { text: 'Tetap Semangat!', color: '#ef4444' }; // Merah
    };
    const grade = getGradeInfo();

    const handleShare = async () => {
        if (!cardRef.current || isSharing) return;
        setIsSharing(true);
        try {
            toast.loading("Menyiapkan sertifikat kuis...", { id: 'share' });
            
            const canvas = await html2canvas(cardRef.current, { 
                scale: 2, 
                backgroundColor: "#ffffff",
                useCORS: true 
            });

            canvas.toBlob(async (blob) => {
                if (!blob) throw new Error("Gagal membuat blob gambar");
                
                const file = new File([blob], `Skor_${themeName.replace(/\s+/g, '_')}.png`, { type: 'image/png' });
                const shareData = {
                    title: 'Hasil Kuis Quizpride',
                    text: `Aku baru saja menyelesaikan tantangan ${themeName} dengan skor ${score}! Yuk ikutan belajar di Quizpride.`,
                    files: [file]
                };

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share(shareData);
                    toast.success("Berhasil dibagikan!", { id: 'share' });
                } else {
                    const link = document.createElement('a');
                    link.download = shareData.files[0].name;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                    toast.success("Gambar disimpan ke galeri (Perangkat tidak mendukung direct share)", { id: 'share', duration: 4000 });
                }
                setIsSharing(false);
            }, 'image/png');

        } catch (error) {
            console.error("Share error:", error);
            toast.error("Gagal membagikan hasil kuis.", { id: 'share' });
            setIsSharing(false);
        }
    };

    return (
        <div className={styles.modalOverlay}>
            <SprinkleAnimation /> {/* Efek sprinkle dari bawah */}
            
            <div className={styles.scrollContainer}>
                {/* 1. KOTAK YANG AKAN DI-SHARE */}
                <div className={styles.captureCard} ref={cardRef}>
                    <div className={styles.cardHeader} style={{ backgroundColor: grade.color }}>
                        <h2>{grade.text}</h2>
                        <p>Tantangan {themeName} Selesai</p>
                    </div>
                    
                    <div className={styles.profileBadgeWrapper}>
                        <div className={styles.profileAvatarBox}>
                            <img src={profilePicture} alt="Profil" className={styles.profilePic} />
                        </div>
                    </div>

                    <div className={styles.scoreCircleWrapper}>
                        <div className={styles.scoreCircle} style={{ color: grade.color, borderColor: grade.color }}>
                            <span>{score}</span>
                        </div>
                    </div>

                    <div className={styles.rewardsRow}>
                        <div className={styles.rewardBadge}>
                            <FaStar className={styles.iconExp} />
                            <span>+{earnedExp} EXP</span>
                        </div>
                        <div className={styles.rewardBadge}>
                            <FaCoins className={styles.iconCoin} />
                            <span>+{earnedCoins} Koin</span>
                        </div>
                    </div>

                    <div className={styles.quoteBox}>
                        <p className={styles.quoteText}>"{randomQuote.text}"</p>
                        <span className={styles.quoteAuthor}>— {randomQuote.author}</span>
                    </div>
                </div>

                {/* 2. TOMBOL AKSI */}
                <div className={styles.actionButtonsRow}>
                    <button className={styles.btnSecondary} onClick={onBack}>
                        <FaHouse /> Beranda
                    </button>
                    <button className={styles.btnPrimary} onClick={onContinue}>
                        Lanjut <FaArrowRight />
                    </button>
                    <button className={`${styles.btnShare} ${isSharing ? styles.sharingActive : ''}`} onClick={handleShare}>
                        {isSharing ? <FaSpinner className={styles.spinIcon} /> : <FaShareNodes />} {isSharing ? 'Memuat...' : 'Bagikan'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default QuizCompletionModal;
