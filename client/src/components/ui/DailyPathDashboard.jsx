// client/src/components/ui/DailyPathDashboard.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getAllDailyPaths, getUserProgress } from '../../services/firestoreService';
import styles from './DailyPathDashboard.module.css';
import Spinner from './Spinner';
import { FaStar, FaChartLine, FaCoins, FaChevronRight, FaUsers, FaUser, FaBookOpen, FaGamepad } from 'react-icons/fa6';
import { toast } from 'react-hot-toast';

const DailyPathDashboard = () => {
    const { currentUser, loading: authLoading, getLeaderboardData } = useAuth();
    const navigate = useNavigate();

    const [showInfoModal, setShowInfoModal] = useState(false);

useEffect(() => {
    // Mengecek apakah user sudah pernah melihat popup pengingat ini sebelumnya
    const hasSeenInfo = localStorage.getItem('hasSeenFullscreenInfo');
    if (!hasSeenInfo) {
        setShowInfoModal(true);
    }
}, []);

const handleCloseInfoModal = () => {
    localStorage.setItem('hasSeenFullscreenInfo', 'true');
    setShowInfoModal(false);
    toast.success('Selamat belajar! Jangan lupa cek menu Pengaturan ya 🚀');
};
    
    const shortcutMaterials = [
        { id: 'ipa-c1', title: 'Bab 1: Pengukuran & Besaran', subject: 'Sains (IPA)', xpReward: 100 },
        { id: 'mtk-c1', title: 'Bab 1: Aljabar Linear', subject: 'Matematika', xpReward: 120 },
        { id: 'ips-c1', title: 'Bab 1: Interaksi Keruangan', subject: 'IPS', xpReward: 100 }
    ];

    const shortcutQuizzes = [
        { id: 'ipa-q1', title: 'Quiz 1: Pengukuran', subject: 'Sains (IPA)', isCompleted: true },
        { id: 'mtk-q1', title: 'Quiz 1: Eksponen', subject: 'Matematika', isCompleted: false },
        { id: 'ips-q1', title: 'Quiz 1: Konektivitas Ruang', subject: 'IPS', isCompleted: false }
    ];

    const handleShortcutMateriClick = (pathId) => {
        // Mengarahkan user langsung ke tab materi di ForumPage
        navigate('/forum', { state: { activeTab: 'materi', autoOpenId: pathId } });
    };

    const handleShortcutQuizClick = () => {
        // Mengarahkan user langsung ke QuizPage
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
            const [pathsData, progressData, leaderboardData] = await Promise.all([
                getAllDailyPaths(),
                getUserProgress(currentUser.uid),
                getLeaderboardData()
            ]);
            
            setAllPaths(pathsData);
            if (progressData) setUserProgress(progressData);

            if (leaderboardData && leaderboardData.length > 0) {
                const userIndex = leaderboardData.findIndex(player => player.uid === currentUser.uid);
                if (userIndex !== -1) {
                    setRealRank(`#${userIndex + 1}`);
                } else {
                    setRealRank('-');
                }
            }
        } catch (err) {
            console.error("Fetch data error:", err);
        } finally {
            setLoading(false);
        }
    }, [currentUser?.uid, getLeaderboardData]);

    useEffect(() => {
        if (!authLoading) fetchData();
    }, [authLoading, fetchData]);

    if (authLoading || loading) return <Spinner />;

    const userInitial = currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U';
    const userCoins = currentUser?.coins ?? currentUser?.coin ?? currentUser?.points ?? 0;

    return (
        <div className={styles.dashboardContainer}>
            {/* --- TOP PROFILE HEADER --- */}
            <header className={styles.topHeader}>
                <div className={styles.userGreet}>
                    {currentUser?.photoURL ? (
                        <img src={currentUser.photoURL} alt="Profile" className={styles.avatarMini} />
                    ) : (
                        <div className={styles.avatarInitialFallback}>{userInitial}</div>
                    )}
                    <div className={styles.greetTextWrapper}>
                        <h2>Halo, {currentUser?.displayName?.split(' ')[0] || 'Pelajar'}</h2>
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
                 {/* ==================== 📚 MISI PEMBELAJARAN (SHORTCUT MATERI) ==================== */}
            <section className={styles.sectionArea}>
                <div className={styles.sectionHeader}>
                    <h3>Misi Pembelajaran Hari Ini</h3> <span className={styles.seeAllLink} onClick={() => navigate('/forum')}>
                        Lihat Semua
                    </span>
                </div>

                <div className={styles.dailyPathListStack}>
                    {shortcutMaterials && shortcutMaterials.length > 0 ? (
                        shortcutMaterials.map((path) => (
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
                        <div className={styles.emptyCard}>Belum ada tantangan materi aktif.</div>
                    )}
                </div>
            </section>

            {/* ==================== 🎯 REKOMENDASI TANTANGAN QUIZ (SHORTCUT QUIZ) ==================== */}
            <section className={styles.sectionArea}>
                <div className={styles.sectionHeader}>
                    <h3>Kuis Pilihan Untukmu</h3>
                    <span className={styles.seeAllLink} onClick={() => navigate('/quiz')}>
                        Lihat Semua
                    </span>
                </div>

                <div className={styles.dailyPathListStack}>
                    {shortcutQuizzes && shortcutQuizzes.length > 0 ? (
                        shortcutQuizzes.map((quiz) => (
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
                        <div className={styles.emptyCard}>Belum ada kuis tersedia.</div>
                    )}
                </div>
            </section>

            {/* ==================== 🎮 MODE KOMPETISI (MABAR) ==================== */}
            <section className={styles.sectionArea}>
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

            {showInfoModal && (
    <div className={styles.fullscreenModalOverlay}>
        <div className={styles.gameModalContentBox} style={{ animation: `${styles.bounceInAnim} 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards` }}>
            <div className={styles.gameIconPulseWrapper} style={{ background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)', boxShadow: '0 0 20px rgba(234, 179, 8, 0.4)' }}>
                <span style={{ fontSize: '2rem', animation: 'wobbleEffect 2s infinite ease-in-out' }}>💡</span>
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
