// client/src/components/ui/DailyPathDashboard.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getAllDailyPaths, getUserProgress } from '../../services/firestoreService';
import styles from './DailyPathDashboard.module.css';
import Spinner from './Spinner';
import { FaStar, FaChartLine, FaCoins, FaChevronRight, FaUsers, FaUser, FaBookOpen } from 'react-icons/fa6';
import { toast } from 'react-hot-toast';

// Ambil style border kustom toko global jika ada
import '../../components/border.css';

const DailyPathDashboard = () => {
    const { currentUser, loading: authLoading, getLeaderboardData } = useAuth();
    const navigate = useNavigate();

    const [showInfoModal, setShowInfoModal] = useState(false);
    
    // State control index halaman slider (0 = Materi, 1 = Kuis)
    const [activeSliderIndex, setActiveSliderIndex] = useState(0);
    const [dynamicMaterials, setDynamicMaterials] = useState([]);
    const [dynamicQuizzes, setDynamicQuizzes] = useState([]);
    
    const [realRank, setRealRank] = useState('-');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const hasSeenInfo = localStorage.getItem('hasSeenFullscreenInfo');
        if (!hasSeenInfo) {
            setShowInfoModal(true);
        }
    }, []);

    // Timer Auto-Slide otomatis geser ke samping setiap 4 detik secara bergantian
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveSliderIndex((prevIndex) => (prevIndex === 0 ? 1 : 0));
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    const handleCloseInfoModal = () => {
        localStorage.setItem('hasSeenFullscreenInfo', 'true');
        setShowInfoModal(false);
        toast.success('Selamat belajar! Jangan lupa cek menu Pengaturan ya 🚀');
    };

    const handleShortcutMateriClick = (pathId) => {
        navigate('/forum', { state: { activeTab: 'materi', autoOpenId: pathId } });
    };

    const handleShortcutQuizClick = () => {
        navigate('/quiz');
    };

    // =======================================================================
    // 🟢 LOGIKA AMBIL DATA PROGRESS DAN CHAPTER SECARA DINAMIS
    // =======================================================================
    const fetchData = useCallback(async () => {
        if (!currentUser?.uid) return;
        setLoading(true);
        try {
            console.log("Dashboard fetch data untuk UID:", currentUser.uid);
            
            // A. Ambil Progres User & Data Leaderboard secara paralel
            const [progressData, leaderboardData] = await Promise.all([
                getUserProgress(currentUser.uid),
                getLeaderboardData()
            ]);
            
            if (progressData) {
                const availableSubjects = ['mtk', 'ipa', 'ips', 'inggris', 'indonesia'];
                
                // =======================================================================
                // 1. PROSES FILTER MATERI (KODE BACKUP AMAN KAMU - TIDAK DIUBAH)
                // =======================================================================
                const activeSubjects = [];
                availableSubjects.forEach(subject => {
                    const subjectMap = progressData[subject];
                    if (subjectMap && subjectMap.order !== undefined && Number(subjectMap.order) > 0) {
                        let timestampMs = 0;
                        if (subjectMap.time) {
                            if (typeof subjectMap.time.toDate === 'function') {
                                timestampMs = subjectMap.time.toDate().getTime();
                            } else if (subjectMap.time.seconds) {
                                timestampMs = subjectMap.time.seconds * 1000;
                            } else {
                                timestampMs = new Date(subjectMap.time).getTime() || Date.now();
                            }
                        } else {
                            timestampMs = Date.now(); 
                        }

                        activeSubjects.push({
                            subjectId: subject,
                            currentOrder: Number(subjectMap.order),
                            time: timestampMs
                        });
                    }
                });

                activeSubjects.sort((a, b) => b.time - a.time);
                const topTwoSubjects = activeSubjects.slice(0, 2);

                const allChaptersFromDB = await getAllDailyPaths(); // Master Materi/Chapters
                const filteredMaterials = [];

                const formatSubjectName = (id) => {
                    if (id === 'mtk') return 'Matematika';
                    if (id === 'ipa') return 'IPA';
                    if (id === 'ips') return 'IPS';
                    if (id === 'inggris') return 'Bahasa Inggris';
                    if (id === 'indonesia') return 'Bahasa Indonesia';
                    return id.toUpperCase();
                };

                topTwoSubjects.forEach(activeSub => {
                    const matchedChapter = allChaptersFromDB.find(ch => 
                        String(ch.subjectId).toLowerCase() === String(activeSub.subjectId).toLowerCase() && 
                        Number(ch.order) === Number(activeSub.currentOrder)
                    );

                    if (matchedChapter) {
                        filteredMaterials.push({
                            id: matchedChapter.id || matchedChapter.chapterId || matchedChapter.uid,
                            title: matchedChapter.title || `Bab ${matchedChapter.order}`,
                            subject: formatSubjectName(activeSub.subjectId),
                            xpReward: matchedChapter.xpReward || 20
                        });
                    } else {
                        filteredMaterials.push({
                            id: `fallback-${activeSub.subjectId}-${activeSub.currentOrder}`,
                            title: `Bab ${activeSub.currentOrder}`,
                            subject: formatSubjectName(activeSub.subjectId),
                            xpReward: 20
                        });
                    }
                });


                // =======================================================================
                // 2. PROSES FILTER QUIZ YANG BARU (BERDASARKAN orderq & timeq DI DALAM MAP MAPEL)
                // =======================================================================
                const activeQuizzes = [];
                
                availableSubjects.forEach(subject => {
                    const subjectMap = progressData[subject];
                    
                    if (subjectMap && subjectMap.orderq !== undefined && Number(subjectMap.orderq) > 0) {
                        let timestampMs = 0;
                        
                        if (subjectMap.timeq) {
                            if (typeof subjectMap.timeq.toDate === 'function') {
                                timestampMs = subjectMap.timeq.toDate().getTime();
                            } else if (subjectMap.timeq.seconds) {
                                timestampMs = subjectMap.timeq.seconds * 1000;
                            } else {
                                timestampMs = new Date(subjectMap.timeq).getTime() || Date.now();
                            }
                        } else {
                            timestampMs = Date.now(); 
                        }

                        activeQuizzes.push({
                            subjectId: subject,       
                            currentOrderQ: Number(subjectMap.orderq),
                            timeq: timestampMs
                        });
                    }
                });

                activeQuizzes.sort((a, b) => b.timeq - a.timeq);
                const topTwoQuizzes = activeQuizzes.slice(0, 2);

                const filteredQuizzes = [];
                const allQuizFromDB = allChaptersFromDB; 

                topTwoQuizzes.forEach(activeQuiz => {
                    const matchedQuiz = allQuizFromDB.find(pathDoc => {
                        if (!pathDoc.themeCode) return false;
                        
                        const codeNumbers = pathDoc.themeCode.replace(/^\D+/g, ''); 
                        const themeOrder = Number(codeNumbers);
                        const themeLetters = pathDoc.themeCode.replace(/[0-9]/g, '').toLowerCase();

                        return themeLetters === activeQuiz.subjectId && themeOrder === activeQuiz.currentOrderQ;
                    });

                    if (matchedQuiz) {
                        filteredQuizzes.push({
                            id: matchedQuiz.id || `quiz-${activeQuiz.subjectId}-${activeQuiz.currentOrderQ}`,
                            title: matchedQuiz.theme || `Kuis Tantangan ${matchedQuiz.themeCode}`,
                            subject: formatSubjectName(activeQuiz.subjectId),
                            isCompleted: true
                        });
                    } else {
                        filteredQuizzes.push({
                            id: `quiz-fallback-${activeQuiz.subjectId}-${activeQuiz.currentOrderQ}`,
                            title: `Kuis Tantangan Bab ${activeQuiz.currentOrderQ}`,
                            subject: formatSubjectName(activeQuiz.subjectId),
                            isCompleted: true
                        });
                    }
                });

                console.log("Materi Siap Tampil:", filteredMaterials);
                console.log("Kuis Siap Tampil (Berdasarkan timeq):", filteredQuizzes);
                
                setDynamicMaterials(filteredMaterials);
                setDynamicQuizzes(filteredQuizzes);
            }

            // B. Hitung peringkat asli di Leaderboard
            if (leaderboardData && leaderboardData.length > 0) {
                const userIndex = leaderboardData.findIndex(player => player.uid === currentUser.uid);
                if (userIndex !== -1) {
                    setRealRank(`#${userIndex + 1}`);
                } else {
                    setRealRank('-');
                }
            }
        } catch (err) {
            console.error("Gagal memuat data path edukasi:", err);
            toast.error("Gagal memperbarui antrean belajar hari ini.");
        } finally {
            setLoading(false);
        }
    }, [currentUser, getLeaderboardData]);


    useEffect(() => {
        if (!authLoading) fetchData();
    }, [authLoading, fetchData]);

    if (authLoading || loading) return <Spinner />;

    const userInitial = currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U';
    const userCoins = currentUser?.koin ?? 0;
    const userBorderClass = currentUser?.activeBorder || 'borderNormal';

    // =======================================================================
    // 🟢 LOGIKA PENETAPAN LEVEL DAN KALKULASI SLIDE BAR EXP
    // =======================================================================
    const userLevel = currentUser?.level ?? 1;
    const totalExp = currentUser?.exp ?? 0;
    const score = currentUser?.score ?? 0;

    // Batas target EXP maksimal di level saat ini (Kelipatan Level * 100)
    const nextLevelExpTarget = userLevel * 100;

    // Hitung sisa akumulasi EXP murni untuk level berjalan saja menggunakan Modulo
    // Jika level 1, pengurang level sebelumnya adalah 0
    const prevLevelsCombinedExp = ((userLevel - 1) * userLevel) / 2 * 100;
    const currentLevelExpProgress = Math.max(0, totalExp - prevLevelsCombinedExp);

    // Ambil persentase lebar bar (maksimal 100%)
    const expPercentage = Math.min(100, Math.floor((currentLevelExpProgress / nextLevelExpTarget) * 100));

    return (
        <div className={styles.dashboardContainer}>
            
            {/* AREA ATAS FIXED (HEADER & STATS) */}
            <div className={styles.fixedTopSection}>
                <header className={styles.topHeader}>
                    <div className={styles.userGreet}>
                        <div className={`${styles.avatarContainerWrapper} ${userBorderClass}`} onClick={() => navigate('/profile')}>
                            {currentUser?.photoURL ? (
                                <img src={currentUser.photoURL} alt="Profile" className={styles.avatarMini} />
                            ) : (
                                <div className={styles.avatarInitialFallback}>{userInitial}</div>
                            )}
                        </div>
                        <div className={styles.greetTextWrapper}>
                            <h2>Halo, {currentUser?.displayName?.split(' ')[0] || 'Pelajar'} 👋</h2>
                            
                            {/* INDIKATOR LAYOUT LEVEL DAN SLIDE BAR EXP */}
                            <div className={styles.levelProgressContainer}>
    <span className={styles.levelBadgeText}>Lv. {userLevel}</span>
    <div className={styles.expTrackSliderOuter}>
        <div 
            className={styles.expFillSliderInner} 
            style={{ width: `${expPercentage}%` }}
        />
        {/* Angka EXP sekarang ada di dalam bar */}
        <span className={styles.expNumericIndicator}>
            {currentLevelExpProgress}/{nextLevelExpTarget} XP
        </span>
    </div>
</div>

                        </div>
                    </div>
                    <button className={styles.notificationBtn} onClick={() => navigate('/leaderboard')}>
                        <FaChartLine />
                    </button>
                </header>

                {/* --- STATS ROW CARD --- */}
                <section className={styles.statsCard}>
                    <div className={styles.statItem}>
                        <FaStar className={styles.statIconStar} />
                        <div className={styles.statInfo}>
                            <span>Score</span>
                            <strong>{score.toLocaleString('id-ID')}</strong>
                        </div>
                    </div>
                    <div className={styles.divider} />
                    <div className={styles.statItem}>
                        <FaChartLine className={styles.statIconRank} />
                        <div className={styles.statInfo}>
                            <span>RANK</span>
                            <strong>{realRank}</strong>
                        </div>
                    </div>
                    <div className={styles.divider} />
                    <div className={styles.statItem}>
                        <FaCoins className={styles.statIconCoin} />
                        <div className={styles.statInfo}>
                            <span>KOIN</span>
                            <strong>{userCoins.toLocaleString('id-ID')}</strong>
                        </div>
                    </div>
                </section>
            </div>

            {/* AREA CAROUSEL SLIDER */}
            <div className={styles.sliderOuterViewport}>
                <div 
                    className={styles.sliderTrackAnimated} 
                    style={{ transform: `translateX(-${activeSliderIndex * 50}%)` }}
                >
                    {/* SLIDE 1: MISI PEMBELAJARAN */}
                    <div className={styles.singleSlidePane}>
                        <div className={styles.sectionHeader}>
                            <h3>Misi Pembelajaran Terakhir</h3>
                            <span className={styles.seeAllLink} onClick={() => navigate('/forum')}>
                                Lihat Semua
                            </span>
                        </div>
                        <div className={styles.dailyPathListStack}>
                            {dynamicMaterials.length > 0 ? (
                                dynamicMaterials.map((path) => (
                                    <div 
                                        key={path.id} 
                                        className={styles.pathChallengeCardRow}
                                        onClick={() => handleShortcutMateriClick(path.id)}
                                    >
                                        <div className={styles.pathIconBoxLeft}>
                                            <FaBookOpen />
                                        </div>
                                        <div className={styles.quizInfo}>
                                            <h4>{path.title}</h4>
                                            <p>{path.subject} • +{path.xpReward} EXP</p>
                                        </div>
                                        <div className={styles.actionStatusZoneRight}>
                                            <FaChevronRight className={styles.arrowIcon} />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className={styles.emptyCardMini}>Belum ada riwayat materi aktif belakangan ini.</div>
                            )}
                        </div>
                    </div>

                    {/* SLIDE 2: REKOMENDASI TANTANGAN QUIZ */}
                    <div className={styles.singleSlidePane}>
                        <div className={styles.sectionHeader}>
                            <h3>Kuis Selesai Review</h3>
                            <span className={styles.seeAllLink} onClick={() => navigate('/quiz')}>
                                Lihat Semua
                            </span>
                        </div>
                        <div className={styles.dailyPathListStack}>
                            {dynamicQuizzes.length > 0 ? (
                                dynamicQuizzes.map((quiz) => (
                                    <div 
                                        key={quiz.id} 
                                        className={styles.pathChallengeCardRow}
                                        onClick={handleShortcutQuizClick}
                                    >
                                        <div className={styles.pathIconBoxLeft} style={{ backgroundColor: 'rgba(22, 163, 74, 0.1)', color: '#16a34a' }}>
                                            <FaStar />
                                        </div>
                                        <div className={styles.quizInfo}>
                                            <h4>{quiz.title}</h4>
                                            <p>{quiz.subject} • <span className={styles.statusDoneTxt}>Selesai</span></p>
                                        </div>
                                        <div className={styles.actionStatusZoneRight}>
                                            <span className={styles.badgeDoneLabel}>Lulus</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className={styles.emptyCardMini}>Belum ada kuis yang diulas.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* INDIKATOR TITIK (DOTS) DI BAWAH SLIDER */}
                <div className={styles.sliderDotsIndicatorRow}>
                    <div className={`${styles.dotItem} ${activeSliderIndex === 0 ? styles.dotActive : ''}`} onClick={() => setActiveSliderIndex(0)} />
                    <div className={`${styles.dotItem} ${activeSliderIndex === 1 ? styles.dotActive : ''}`} onClick={() => setActiveSliderIndex(1)} />
                </div>
            </div>

            {/* MODE KOMPETISI (MABAR) */}
            <section className={styles.sectionAreaMabar}>
                <div className={styles.sectionHeader}>
                    <h3>Mode Kompetisi (Mabar)</h3>
                </div>
                
                <div className={styles.contestGrid}>
                    <div className={styles.contestCard} onClick={() => navigate('/contest/group')}>
                        <div className={styles.contestIconBg} style={{ backgroundColor: 'rgba(2, 132, 199, 0.08)' }}>
                            <FaUsers style={{ color: '#0ea5e9' }} />
                        </div>
                        <h4>Kontes Grup</h4>
                        <p>Mabar massal terjadwal</p>
                    </div>
                    
                    <div className={styles.contestCard} onClick={() => navigate('/contest/1v1')}>
                        <div className={styles.contestIconBg} style={{ backgroundColor: 'rgba(217, 119, 6, 0.08)' }}>
                            <FaUser style={{ color: '#f59e0b' }} />
                        </div>
                        <h4>Duel 1 vs 1</h4>
                        <p>Tanding adu mekanik</p>
                    </div>
                </div>
            </section>

            {/* MODAL TIPS INFO FULLSCREEN */}
            {showInfoModal && (
                <div className={styles.fullscreenModalOverlay}>
                    <div className={styles.gameModalContentBox} style={{ animation: `${styles.bounceInAnim} 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards` }}>
                        <div className={styles.gameIconPulseWrapper} style={{ background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)', boxShadow: '0 0 20px rgba(234, 179, 8, 0.4)' }}>
                            <span style={{ fontSize: '2rem' }}>💡</span>
                        </div>
                        <h3>Tips Pengalaman Belajar! ✨</h3>
                        <p>
                            Agar belajar dan kompetisi duel mabar kamu menjadi lebih fokus, imersif, dan bebas dari gangguan, kamu bisa mengaktifkan <strong>Mode Layar Penuh (Fullscreen)</strong> kapan saja melalui ikon <strong>Pengaturan ⚙️</strong> di pojok kanan atas layar!
                        </p>
                        <button className={styles.enterGameModeBtn} style={{ backgroundColor: '#eab308', boxShadow: '0 4px 12px rgba(234, 179, 8, 0.3)' }} onClick={handleCloseInfoModal}>
                            Siap, Saya Mengerti!
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DailyPathDashboard;
