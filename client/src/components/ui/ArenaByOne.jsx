// client/src/components/ui/ArenaByOne.jsx

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../config/firebaseConfig';
import { doc, onSnapshot, collection, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { FaArrowRightFromBracket, FaExpand, FaCompress, FaShareNodes, FaArrowRight } from 'react-icons/fa6';
import styles from './ArenaByOne.module.css';
import html2canvas from 'html2canvas';

const ArenaByOne = () => {
    const { lobbyId } = useParams();
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const [matchData, setMatchData] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [loadingQuestions, setLoadingQuestions] = useState(true);
    const [isTransitioning, setIsTransitioning] = useState(false); 
    const [showExitModal, setShowExitModal] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const arenaRef = useRef(null);
    const isFetchingRef = useRef(false);

    // 1. LISTEN REAL-TIME DATA LOBBY & SINKRONISASI SOAL
    useEffect(() => {
        if (!lobbyId) return;
        const cleanRoomId = lobbyId.trim().toUpperCase();
        const roomDocRef = doc(db, 'lobbies_1v1', cleanRoomId);

        const unsubscribe = onSnapshot(roomDocRef, (snapshot) => {
            if (!snapshot.exists()) {
                // Jangan langsung tendang jika permainan sudah selesai agar user bisa melihat skor akhir
                return;
            }
            const data = snapshot.data();
            setMatchData(data);

            if (data.gameQuestions && data.gameQuestions.length > 0) {
                setQuestions(data.gameQuestions);
                setLoadingQuestions(false);
            }
        });

        return () => unsubscribe();
    }, [lobbyId]);

    // 2. OTOMATIS MODE IMERSIF (FULLSCREEN)
    useEffect(() => {
        const enterFullscreen = async () => {
            try {
                if (arenaRef.current && !document.fullscreenElement) {
                    await arenaRef.current.requestFullscreen();
                    setIsFullscreen(true);
                }
            } catch (err) {
                console.log("Gagal memicu mode imersif:", err);
            }
        };
        if (matchData) enterFullscreen();

        const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, [matchData]);

    const toggleManualFullscreen = async () => {
        if (!document.fullscreenElement) {
            await arenaRef.current.requestFullscreen();
        } else {
            await document.exitFullscreen();
        }
    };

    // 3. GENERATE SOAL DAN PROTEKSI ANTI-DUPLIKAT (HANYA HOST)
    useEffect(() => {
        if (!matchData || isFetchingRef.current) return;
        
        const isHost = matchData.host?.uid === currentUser?.uid;
        if (matchData.gameQuestions || !isHost) return;

        isFetchingRef.current = true;

        const generateAndSyncQuestions = async () => {
            const selectedSubject = matchData.subject;
            const uniqueQuestionsMap = new Map();

            try {
                const chaptersSnap = await getDocs(collection(db, 'chapters'));
                chaptersSnap.forEach(chapterDoc => {
                    const chData = chapterDoc.data();
                    if (selectedSubject === 'all' || chData.subjectId === selectedSubject) {
                        if (Array.isArray(chData.latihanSoal)) {
                            chData.latihanSoal.forEach(soal => {
                                if (soal.question && soal.options) {
                                    const trimmedText = soal.question.trim();
                                    if (!uniqueQuestionsMap.has(trimmedText)) {
                                        uniqueQuestionsMap.set(trimmedText, {
                                            text: soal.question,
                                            options: [...soal.options],
                                            answer: soal.answer
                                        });
                                    }
                                }
                            });
                        }
                        if (Array.isArray(chData.miniUlangan)) {
                            chData.miniUlangan.forEach(soal => {
                                if (soal.question && soal.options) {
                                    const trimmedText = soal.question.trim();
                                    if (!uniqueQuestionsMap.has(trimmedText)) {
                                        uniqueQuestionsMap.set(trimmedText, {
                                            text: soal.question,
                                            options: [...soal.options],
                                            answer: soal.answer
                                        });
                                    }
                                }
                            });
                        }
                    }
                });

                const dailySnap = await getDocs(collection(db, 'dailyPaths'));
                dailySnap.forEach(dailyDoc => {
                    const dData = dailyDoc.data();
                    if (selectedSubject === 'all' || dData.mapel === selectedSubject) {
                        if (Array.isArray(dData.units)) {
                            dData.units.forEach(unit => {
                                if (unit.text && unit.options && unit.answer !== undefined) {
                                    const trimmedText = unit.text.trim();
                                    if (!uniqueQuestionsMap.has(trimmedText)) {
                                        uniqueQuestionsMap.set(trimmedText, {
                                            text: unit.text,
                                            options: [...unit.options],
                                            answer: unit.options[unit.answer] || unit.answer
                                        });
                                    }
                                }
                            });
                        }
                    }
                });

                let pool = Array.from(uniqueQuestionsMap.values());
                if (pool.length === 0) {
                    toast.error('Bank soal kosong!');
                    return;
                }

                for (let i = pool.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [pool[i], pool[j]] = [pool[j], pool[i]];
                }
                const selectedQuestions = pool.slice(0, 10);

                const roomDocRef = doc(db, 'lobbies_1v1', lobbyId.toUpperCase());
                await updateDoc(roomDocRef, { gameQuestions: selectedQuestions });

            } catch (err) {
                console.error("Gagal melakukan filter & sinkronisasi soal:", err);
            }
        };

        generateAndSyncQuestions();
    }, [matchData, currentUser, lobbyId]);

    if (!matchData) return <div className={styles.loading}>Memuat Arena Duel...</div>;

    const isHost = matchData.host?.uid === currentUser?.uid;
    const playerMe = isHost ? matchData.host : matchData.challenger;
    const playerOpponent = isHost ? matchData.challenger : matchData.host;

    const myScore = playerMe?.score || 0;
    const oppScore = playerOpponent?.score || 0;

    // Logika Penentu Judul Status Akhir
    let matchStatusTitle = "MATCH COMPLETED";
    let statusClass = styles.statusDraw;
    if (myScore > oppScore) {
        matchStatusTitle = "YOU WIN! 🎉";
        statusClass = styles.statusWin;
    } else if (myScore < oppScore) {
        matchStatusTitle = "YOU LOSE! 💔";
        statusClass = styles.statusLose;
    } else if (myScore === oppScore && questions.length > 0 && currentQuestionIdx >= questions.length) {
        matchStatusTitle = "DRAW MATCH 🤝";
    }

    const handleConfirmExitArena = async () => {
        if (document.fullscreenElement) await document.exitFullscreen();
        setShowExitModal(false);
        const roomDocRef = doc(db, 'lobbies_1v1', lobbyId.toUpperCase());

        if (isHost) {
            await deleteDoc(roomDocRef).catch(() => {});
        } else {
            await updateDoc(roomDocRef, { challenger: null }).catch(() => {});
        }
        navigate('/contest/1v1');
    };

    const handleBackToLobby = async () => {
        if (document.fullscreenElement) await document.exitFullscreen();
        navigate('/contest/1v1'); 
    };

    const handleShareScore = async () => {
        const cardElement = document.querySelector(`.${styles.finishCardBody}`);
        if (!cardElement) return;

        const toastId = toast.loading("Sedang menyiapkan gambar duel...");

        try {
            await new Promise((resolve) => setTimeout(resolve, 300));

            const canvas = await html2canvas(cardElement, {
                useCORS: true,
                allowTaint: false,
                backgroundColor: null,
                scale: 3, 
                logging: false,
            });

            const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1.0));
            if (!blob) throw new Error("Gagal membuat file gambar.");

            const file = new File([blob], `Hasil_Duel_${lobbyId || '1v1'}.png`, { type: 'image/png' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Hasil Duel QuizPride 1v1',
                    text: `Pertandingan sengit di QuizPride 1v1! Skor saya: ${myScore} Pts vs Lawan: ${oppScore} Pts.`,
                });
                toast.success("Berhasil membagikan hasil duel!", { id: toastId });
            } else {
                const dataUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = `Hasil-Duel-${lobbyId || '1v1'}.png`;
                link.href = dataUrl;
                link.click();
                toast.success("Gambar berhasil disimpan!", { id: toastId });
            }
        } catch (error) {
            console.error("Gagal melakukan fitur share:", error);
            toast.error("Gagal membagikan gambar hasil duel.", { id: toastId });
        }
    };

    const handleAnswerSelection = async (selectedOption) => {
        if (isTransitioning) return; 
        setIsTransitioning(true);

        const currentQuestion = questions[currentQuestionIdx];
        const isCorrect = selectedOption === currentQuestion.answer;

        if (isCorrect) {
            toast.success("Benar! +10 Poin", { duration: 800 });
            const roomDocRef = doc(db, 'lobbies_1v1', lobbyId.toUpperCase());
            const updatedScore = myScore + 10;

            if (isHost) {
                await updateDoc(roomDocRef, { "host.score": updatedScore });
            } else {
                await updateDoc(roomDocRef, { "challenger.score": updatedScore });
            }
        } else {
            toast.error("Salah!", { duration: 800 });
        }

        setTimeout(() => {
            setCurrentQuestionIdx(prev => prev + 1);
            setIsTransitioning(false); 
        }, 400); 
    };

    return (
        <div ref={arenaRef} className={styles.arenaWrapper}>
            
            {/* Hanya tampilkan Top Panel jika belum selesai game */}
            {currentQuestionIdx < questions.length && (
                <div className={styles.topDashboardPanel}>
                    <button className={styles.exitArenaBtn} onClick={() => setShowExitModal(true)}>
                        <FaArrowRightFromBracket /> <span>Keluar</span>
                    </button>
                    {!loadingQuestions && questions.length > 0 && (
                        <div className={styles.questionCounterBadge}>
                            SOAL: {currentQuestionIdx + 1} / {questions.length}
                        </div>
                    )}
                    <button className={styles.fullscreenToggleBtn} onClick={toggleManualFullscreen}>
                        {isFullscreen ? <FaCompress /> : <FaExpand />}
                    </button>
                </div>
            )}

            <div className={styles.questionBoard}>
                {loadingQuestions ? (
                    <div className={styles.innerLoading}>Menyelaraskan Soal Duel...🎲</div>
                ) : currentQuestionIdx >= questions.length ? (
                    
                    <div className={styles.finishCardContainer}>
                        <div className={styles.finishCardBody}>
                            {/* Header Melengkung Biru dengan Motif Balok Abstrak & Watermark Pojok Kanan Atas */}
                            <div className={styles.finishCardHeader}>
                                <span className={styles.watermarkText}>QUIZPRIDE</span>
                                
                                <div className={`${styles.abstractBlock} ${styles.block1}`}></div>
                                <div className={`${styles.abstractBlock} ${styles.block2}`}></div>
                                <div className={`${styles.abstractBlock} ${styles.block3}`}></div>
                                <div className={`${styles.abstractBlock} ${styles.block4}`}></div>

                                <div className={styles.vsLayoutContainer}>
                                    {/* Avatar Saya (Kiri) */}
                                    <div className={`${styles.avatarWrapperContainer} ${styles.avatarLeft}`}>
                                        <img 
                                            src={playerMe?.photoURL || '../../../poto.png'} 
                                            alt={playerMe?.name} 
                                            className={styles.finishAvatarImg} 
                                            crossOrigin="anonymous"
                                        />
                                    </div>

                                    {/* Logo / Teks VS di Tengah */}
                                    <div className={styles.vsBadgeMiddle}>VS</div>

                                    {/* Avatar Lawan (Kanan) */}
                                    <div className={`${styles.avatarWrapperContainer} ${styles.avatarRight}`}>
                                        <img 
                                            src={playerOpponent?.photoURL || '../../../poto.png'} 
                                            alt={playerOpponent?.name} 
                                            className={styles.finishAvatarImg} 
                                            crossOrigin="anonymous"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Konten Utama Kartu Hasil */}
                            <div className={styles.finishCardContent}>
                                <div className={`${styles.statusBadgeText} ${statusClass}`}>
                                    {matchStatusTitle}
                                </div>
                                <h2 className={styles.finishUserNameText}>
                                    {playerMe?.name || 'User'}
                                </h2>

                                {/* Lingkaran Skor Khas Putus-Putus */}
                                <div className={styles.circularScoreFrame}>
                                    <span className={styles.scoreTitleLabel}>SKOR</span>
                                    <span className={styles.scoreBigValue}>{myScore}</span>
                                    <span className={styles.scoreSubTargetText}>Lawan: {oppScore}</span>
                                </div>

                                <div className={styles.automaticFooterPlatform}>
                                    DI BUAT OTOMATIS VIA PLATFORM QUIZPRIDE
                                </div>
                            </div>
                        </div>

                        {/* Tombol Aksi Bawah */}
                        <div className={styles.finishActionRowBar}>
                            <button className={styles.btnActionShare} onClick={handleShareScore}>
                                <FaShareNodes /> <span>Bagikan</span>
                            </button>
                            <button className={styles.btnActionNextLobby} onClick={handleBackToLobby}>
                                <span>Lanjut</span> <FaArrowRight />
                            </button>
                        </div>
                    </div>

                ) : isTransitioning ? (
                    <div className={styles.innerLoading}>Menyiapkan soal berikutnya...</div>
                ) : (
                    <div className={styles.quizActiveContainer}>
                        <div className={styles.questionTextCard}>
                            {questions[currentQuestionIdx].text}
                        </div>
                        <div className={styles.optionsLayoutGrid}>
                            {questions[currentQuestionIdx].options.map((opt, index) => (
                                <button 
                                    key={index} 
                                    className={styles.optionClickItem}
                                    onClick={() => handleAnswerSelection(opt)}
                                    disabled={isTransitioning}
                                >
                                    <span className={styles.optionIndexLabel}>
                                        {String.fromCharCode(65 + index)}
                                    </span>
                                    <span className={styles.optionValueText}>{opt}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* HUD Status Pemain Bawah (Hanya muncul saat game berlangsung) */}
            {currentQuestionIdx < questions.length && (
                <div className={styles.playersHudContainer}>
                    <div className={`${styles.playerHudBox} ${styles.hudLeft}`}>
                        <img src={playerMe?.photoURL || '../../../poto.png'} alt="Me" className={styles.hudAvatar} />
                        <div className={styles.hudDetails}>
                            <span className={styles.hudName}>Kamu ({playerMe?.name?.split(' ')[0]})</span>
                            <div className={styles.hudScoreBox}>
                                <span className={styles.scoreText}>{myScore}</span> Pts
                            </div>
                        </div>
                    </div>

                    <div className={`${styles.playerHudBox} ${styles.hudRight}`}>
                        <div className={styles.hudDetailsRight}>
                            <span className={styles.hudName}>{playerOpponent ? playerOpponent.name?.split(' ')[0] : 'Lawan'}</span>
                            <div className={styles.hudScoreBoxRight}>
                                Pts <span className={styles.scoreText}>{oppScore}</span>
                            </div>
                        </div>
                        <img src={playerOpponent?.photoURL || '../../../poto.png'} alt="Opponent" className={styles.hudAvatar} />
                    </div>
                </div>
            )}

            {showExitModal && (
                <div className={styles.customModalOverlay}>
                    <div className={styles.customModalBox}>
                        <h3>Keluar dari Game?</h3>
                        <p>{isHost ? 'Lobby akan hancur jika kamu keluar.' : 'Kamu akan dianggap kalah.'}</p>
                        <div className={styles.customModalActionRow}>
                            <button className={styles.cancelActionBtn} onClick={() => setShowExitModal(false)}>Batal</button>
                            <button className={styles.confirmLeaveBtn} onClick={handleConfirmExitArena}>Keluar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ArenaByOne;
