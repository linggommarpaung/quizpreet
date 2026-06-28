// client/src/components/ui/QuizCompletionModal.jsx

import React, { useState, useEffect, useRef } from 'react';
import styles from './QuizCompletionModal.module.css';
import html2canvas from 'html2canvas';
import { toast } from 'react-hot-toast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { FaShareNodes, FaArrowRight, FaHouse, FaCoins, FaStar, FaSpinner } from 'react-icons/fa6';
import SprinkleAnimation from './SprinkleAnimation'; 

const quotesData = [
    { text: "Hanya anak bangsa sendirilah yang dapat diandalkan untuk membangun Indonesia.", author: "B.J. Habibie" },
    { text: "Pendidikan adalah senjata paling mematikan di dunia untuk mengubah dunia.", author: "Nelson Mandela" },
    { text: "Barangsiapa tidak mau merasakan pahitnya belajar, ia akan merasakan hinanya kebodohan.", author: "Imam Syafi'i" },
    { text: "Belajar tanpa berpikir itu tidak berguna, berpikir tanpa belajar itu berbahaya!", author: "Soekarno" },
    { text: "Keberhasilan bukanlah milik orang pintar, melainkan orang yang senantiasa berusaha.", author: "B.J. Habibie" }
];

const QuizCompletionModal = ({ isOpen, score, themeName, earnedExp, earnedCoins, onBack, onContinue }) => {
    const { currentUser } = useAuth();
    const cardRef = useRef(null);
    const [randomQuote, setRandomQuote] = useState(quotesData[0]);
    const [isSharing, setIsSharing] = useState(false);
    const [userPhoto, setUserPhoto] = useState("");

    useEffect(() => {
        const fetchUserProfilePic = async () => {
            if (isOpen && currentUser?.uid) {
                try {
                    const userRef = doc(db, 'users', currentUser.uid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        if (userData.photoURL) {
                            setUserPhoto(userData.photoURL);
                        }
                    }
                } catch (err) {
                    console.error("Gagal mengambil foto profil:", err);
                }
            }
        };

        if (isOpen) {
            setRandomQuote(quotesData[Math.floor(Math.random() * quotesData.length)]);
            fetchUserProfilePic();
        }
    }, [isOpen, currentUser]);

    if (!isOpen) return null;

    const handleShare = async () => {
        if (!cardRef.current || isSharing) return;
        setIsSharing(true);
        const toastId = toast.loading("Sedang menyiapkan gambar hasil kuis...");

        try {
            await new Promise((resolve) => setTimeout(resolve, 500));

            const canvas = await html2canvas(cardRef.current, {
                useCORS: true,
                allowTaint: false,
                backgroundColor: null,
                scale: 3,
                logging: false,
            });

            const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1.0));
            if (!blob) throw new Error("Gagal membuat file gambar.");

            const file = new File([blob], `Skor_${themeName?.replace(/\s+/g, '_') || 'Quiz'}.png`, { type: 'image/png' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Hasil Kuis QuizPride',
                    text: `Hore! Saya meraih skor ${score} di kuis "${themeName}". Yuk asah kemampuanmu di QuizPride!`,
                });
                toast.success("Berhasil membagikan nilai kuis!", { id: toastId });
            } else {
                const dataUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = `Skor-${themeName || 'Quiz'}.png`;
                link.href = dataUrl;
                link.click();
                toast.success("Gambar berhasil disimpan ke galeri!", { id: toastId, duration: 4500 });
            }
        } catch (error) {
            console.error("Gagal melakukan fitur share:", error);
            toast.error("Gagal membagikan gambar hasil kuis.", { id: toastId });
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <div className={styles.modalOverlay}>
            <SprinkleAnimation />

            <div className={styles.scrollContainer}>
                {/* COMPACT CAPTURE CARD */}
                <div className={styles.captureCard} ref={cardRef}>
                    <div className={styles.cardHeaderDecoration}>
                        <div className={styles.decorativeCircleLeft}></div>
                        <div className={styles.decorativeCircleRight}></div>
                        <div className={styles.watermarkHeader}>QuizPride</div>
                    </div>

                    <div className={styles.avatarWrapperContainer}>
                        <img 
                            src={userPhoto || "https://api.dicebear.com/7.x/fun-emoji/svg?seed=QuizPride"} 
                            alt="User Profile" 
                            className={styles.userProfileAvatarStyle} 
                            crossOrigin="anonymous"
                        />
                    </div>

                    <div className={styles.cardMainCoreContent}>
                        <span className={styles.badgeLabelContext}>QUIZ COMPLETED</span>
                        <h4 className={styles.themeQuizHeadingText}>{themeName || "Paket Bab Kuis"}</h4>
                        
                        {/* LINGKARAN SKOR COMPACT */}
                        <div className={styles.circularScoreDisplayLayout}>
                            <span className={styles.scoreTopTextLabel}>SKOR</span>
                            <h2 className={styles.actualScoreMainDigits}>{score}</h2>
                            <span className={styles.kkmLimitLabelInfo}>Target: 75</span>
                        </div>

                        {/* BOX REWARD COMPACT */}
                        <div className={styles.rewardsRowLayoutGrid}>
                            <div className={styles.rewardCardMetric}>
                                <FaStar className={styles.iconExpParticle} />
                                <div className={styles.rewardMetaBoxTxt}>
                                    <span className={styles.rewardLabelType}>EXP POIN</span>
                                    <h5>+{earnedExp} EXP</h5>
                                </div>
                            </div>
                            <div className={styles.rewardCardMetric}>
                                <FaCoins className={styles.iconCoinParticle} />
                                <div className={styles.rewardMetaBoxTxt}>
                                    <span className={styles.rewardLabelType}>KOIN</span>
                                    <h5>+{earnedCoins}</h5>
                                </div>
                            </div>
                        </div>

                        {/* QUOTES DENGAN PADDING RINGKAS */}
                        <div className={styles.customQuoteBoxWrapper}>
                            <p className={styles.customQuoteContentText}>"{randomQuote.text}"</p>
                            <span className={styles.customQuoteAuthorSignature}>— {randomQuote.author}</span>
                        </div>
                        
                        <div className={styles.footerWatermarkText}>Dibuat otomatis via platform QuizPride</div>
                    </div>
                </div>

                {/* PANEL TOMBOL AKSI */}
                <div className={styles.actionButtonsRowLayout}>
                    <button className={styles.btnSecondaryBackHome} onClick={onBack}>
                        <FaHouse /> <span>Beranda</span>
                    </button>
                    <button className={styles.btnPrimaryNextChapter} onClick={onContinue}>
                        <span>Lanjut</span> <FaArrowRight />
                    </button>
                    <button 
                        className={`${styles.btnShareCanvasResult} ${isSharing ? styles.sharingStateDisabled : ''}`} 
                        onClick={handleShare}
                        disabled={isSharing}
                    >
                        {isSharing ? <FaSpinner className={styles.spinIconAnim} /> : <FaShareNodes />} 
                        <span>Bagikan</span>
                    </button>
                </div>

            </div>
        </div>
    );
};

export default QuizCompletionModal;
