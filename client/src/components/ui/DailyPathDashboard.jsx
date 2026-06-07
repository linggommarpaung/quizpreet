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
    
    const [dynamicMaterials, setDynamicMaterials] = useState([]);
const [dynamicQuizzes, setDynamicQuizzes] = useState([]);

    const handleShortcutMateriClick = (pathId) => {
        navigate('/forum', { state: { activeTab: 'materi', autoOpenId: pathId } });
    };

    const handleShortcutQuizClick = () => {
        navigate('/quiz');
    };
    
    const [allPaths, setAllPaths] = useState([]);
    const [userProgress, setUserProgress] = useState({ completedUnits: [] });
    const [realRank, setRealRank] = useState('-');
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
    if (!currentUser?.uid) return;
    setLoading(true);
    try {
        // A. Ambil Progres User & Data Leaderboard
        const [progressData, leaderboardData] = await Promise.all([
            getUserProgress(currentUser.uid),
            getLeaderboardData()
        ]);
        
        if (progressData) {
            setUserProgress(progressData);
            
            /* B. LOGIKA FILTER MAPEL DARI DATABASE
               Asumsi struktur progressData: 
               {
                  mtk: { order: 1, time: Timestamp/Date },
                  ipa: { order: 2, time: Timestamp/Date },
                  completedUnits: [...]
               }
            */
            const activeSubjects = [];
            
            // List mapel yang ada di sistem kamu (bisa disesuaikan)
            const avaibleSubjects = ['mtk', 'ipa', 'ips', 'inggris', 'indo'];
            
            avaibleSubjects.forEach(subject => {
                if (progressData[subject] && progressData[subject].order) {
                    activeSubjects.push({
                        subjectId: subject,
                        currentOrder: progressData[subject].order,
                        // Konversi ke milidetik untuk sorting akurat baik berupa Firestore Timestamp atau Date string
                        time: progressData[subject].time?.seconds 
                            ? progressData[subject].time.seconds * 1000 
                            : new Date(progressData[subject].time).getTime() || 0
                    });
                }
            });

            // Urutkan berdasarkan waktu pengerjaan paling baru (descending)
            activeSubjects.sort((a, b) => b.time - a.time);

            // Ambil maksimal 2 mapel teratas yang paling baru beraktivitas
            const topTwoSubjects = activeSubjects.slice(0, 2);

            // C. Query ke koleksi 'chapters' berdasarkan subjectId & order
            // Catatan: Pastikan fungsi getAllDailyPaths() kamu bisa menerima filter atau kamu memfilter hasil buatan seluruh chapter.
            const allChaptersFromDB = await getAllDailyPaths(); // mengambil seluruh dokumen dari koleksi 'chapters'
            
            const filteredMaterials = [];
            const filteredQuizzes = [];

            topTwoSubjects.forEach(activeSub => {
                // Cari di database chapter yang subjectId dan order-nya pas cocok
                const matchedChapter = allChaptersFromDB.find(ch => 
                    ch.subjectId === activeSub.subjectId && 
                    Number(ch.order) === Number(activeSub.currentOrder)
                );

                if (matchedChapter) {
                    // Masukkan ke daftar Materi Antrean
                    filteredMaterials.push({
                        id: matchedChapter.id || matchedChapter.chapterId,
                        title: matchedChapter.title || `Bab ${matchedChapter.order}`,
                        subject: matchedChapter.subjectName || activeSub.subjectId.toUpperCase(),
                        xpReward: matchedChapter.xpReward || 100
                    });

                    // Masukkan ke daftar Kuis Antrean (Persiapan fitur kuis berikutnya)
                    filteredQuizzes.push({
                        id: `quiz-${matchedChapter.id}`,
                        title: `Kuis ${matchedChapter.title || matchedChapter.order}`,
                        subject: matchedChapter.subjectName || activeSub.subjectId.toUpperCase(),
                        isCompleted: false
                    });
                }
            });

            // Set ke state untuk me-render UI secara dinamis
            setDynamicMaterials(filteredMaterials);
            setDynamicQuizzes(filteredQuizzes);
        }

        // D. Hitung Real Rank Leaderboard seperti biasa
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
    } finally {
        setLoading(false);
    }
}, [currentUser?.uid, getLeaderboardData]);

    useEffect(() => {
        if (!authLoading) fetchData();
    }, [authLoading, fetchData]);

    if (authLoading || loading) return <Spinner />;

    const userInitial = currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U';
    const userCoins = currentUser?.koin ?? 0;
    const userBorderClass = currentUser?.activeBorder || 'borderNormal';

    return (
        <div className={styles.dashboardContainer}>
            
            {/* 🔒 AREA ATAS FIXED (HEADER & STATS) */}
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
                            <p>Ayo taklukkan materi hari ini!</p>
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
                            <span>POIN</span>
                            <strong>{currentUser?.score?.toLocaleString('id-ID') || currentUser?.points?.toLocaleString('id-ID') || 0}</strong>
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

            {/* 🔄 AREA CAROUSEL SLIDER (GESER KANAN KIRI BERDAMPINGAN) */}
                        <div className={styles.sliderOuterViewport}>
                <div 
                    className={styles.sliderTrackAnimated} 
                    style={{ transform: `translateX(-${activeSliderIndex * 50}%)` }} // Karena track 200%, geser per slide adalah 50% dari total width track
                >
                    {/* SLIDE 1: MISI PEMBELAJARAN */}
                    <div className={styles.singleSlidePane}>
                        <div className={styles.sectionHeader}>
                            <h3>Misi Pembelajaran Hari Ini</h3>
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
                                            <p>{path.subject} • {path.xpReward} XP</p>
                                        </div>
                                        <div className={styles.actionStatusZoneRight}>
                                            <FaChevronRight className={styles.arrowIcon} />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className={styles.emptyCardMini}>Belum ada materi aktif hari ini.</div>
                            )}
                        </div>
                    </div>

                    {/* SLIDE 2: REKOMENDASI TANTANGAN QUIZ (KUIS - MAKSIMAL 2 ITEM) */}
                    <div className={styles.singleSlidePane}>
                        <div className={styles.sectionHeader}>
                            <h3>Kuis Pilihan Untukmu</h3>
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
                                        <div className={styles.pathIconBoxLeft} style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
                                            <FaStar />
                                        </div>
                                        <div className={styles.quizInfo}>
                                            <h4>{quiz.title}</h4>
                                            <p>{quiz.subject} • <span className={quiz.isCompleted ? styles.statusDoneTxt : styles.statusProgressTxt}>{quiz.isCompleted ? 'Selesai' : 'Belum Mulai'}</span></p>
                                        </div>
                                        <div className={styles.actionStatusZoneRight}>
                                            {quiz.isCompleted ? (
                                                <span className={styles.badgeDoneLabel}>Selesai</span>
                                            ) : (
                                                <FaChevronRight className={styles.arrowIcon} />
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className={styles.emptyCardMini}>Belum ada kuis tersedia.</div>
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


            {/* ==================== 🎮 MODE KOMPETISI (MABAR) - PAS DI BAWAH ==================== */}
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
