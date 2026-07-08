// client/src/components/ui/DailyPathDashboard.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getAllDailyPaths, updateUserData } from '../../services/firestoreService';
import styles from './DailyPathDashboard.module.css';
import Spinner from './Spinner';
import { FaStar, FaChartLine, FaCoins, FaChevronRight, FaUsers, FaUser, FaBookOpen, FaRocket, FaGamepad } from 'react-icons/fa6';
import { toast } from 'react-hot-toast';

import { collection, getDocs, onSnapshot, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase'; 

import '../../components/border.css';

const DailyPathDashboard = () => {
    const { currentUser, loading: authLoading, getLeaderboardData } = useAuth();
    const navigate = useNavigate();

    const [showInfoModal, setShowInfoModal] = useState(false);
    const [activeSliderIndex, setActiveSliderIndex] = useState(0);
    const [dynamicMaterials, setDynamicMaterials] = useState([]);
    const [dynamicQuizzes, setDynamicQuizzes] = useState([]);
    const [realRank, setRealRank] = useState('-');
    const [loading, setLoading] = useState(true);

    // 🟢 STATE BARU: Menyimpan data profil user secara realtime dari Firestore (Koleksi users)
    const [realtimeUser, setRealtimeUser] = useState(null);

    const prevLevelRef = useRef();
    const hasTriggeredRef = useRef(false);

    useEffect(() => {
        const hasSeenInfo = localStorage.getItem('hasSeenFullscreenInfo');
        if (!hasSeenInfo) {
            setShowInfoModal(true);
        }
    }, []);

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

    // =======================================================================
    // 🟢 REALTIME LISTENER SINKRONISASI COLECTION PROFILE, PROGRESS, & SLIDE
    // =======================================================================
    useEffect(() => {
        if (authLoading || !currentUser?.uid) return;

        setLoading(true);
        let unsubscribeUser = () => {};
        let unsubscribeProgress = () => {};
        let unsubscribeLeaderboard = () => {};

        const initDashboardRealtime = async () => {
            try {
                // Ambil data Master Silabus dari Koleksi Berbeda SEKALI saja di awal agar ringan dan mencegah race-condition
                const allChaptersFromDB = await getAllDailyPaths(); // ini mengambil dari koleksi 'chapters'
                const snapshotDailyPaths = await getDocs(collection(db, 'dailyPaths')); // ini mengambil dari koleksi 'dailyPaths'
                const allDailyPathsFromDB = snapshotDailyPaths.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // 1. Dengarkan data Profil Utama User (Koleksi users) -> EXP, Koin, Border, Score
                const userDocRef = doc(db, 'users', currentUser.uid);
                unsubscribeUser = onSnapshot(userDocRef, (userDocSnap) => {
                    if (userDocSnap.exists()) {
                        setRealtimeUser(userDocSnap.data());
                    }
                });

                // 2. Dengarkan data Progres Belajar Aktif (Koleksi userProgress) -> Mapel Terakhir, Order Bab, Kuis
                const progressDocRef = doc(db, 'userProgress', currentUser.uid);
                unsubscribeProgress = onSnapshot(progressDocRef, (progressDocSnap) => {
                    if (!progressDocSnap.exists()) {
                        setDynamicMaterials([]);
                        setDynamicQuizzes([]);
                        setLoading(false);
                        return;
                    }

                    const progressData = progressDocSnap.data();
                    const availableSubjects = ['mtk', 'ipa', 'ips', 'inggris', 'indonesia'];
                    
                    const formatSubjectName = (id) => {
                        if (id === 'mtk') return 'Matematika';
                        if (id === 'ipa') return 'IPA';
                        if (id === 'ips') return 'IPS';
                        if (id === 'inggris') return 'Bahasa Inggris';
                        if (id === 'indonesia') return 'Bahasa Indonesia';
                        return id.toUpperCase();
                    };

                    // --- FILTER SLIDE 1: MATERI TERBARU (Mencocokkan ke koleksi 'chapters' via allChaptersFromDB) ---
                    const activeSubjects = [];
                    availableSubjects.forEach(subject => {
                        const subjectMap = progressData[subject];
                        if (subjectMap && subjectMap.order !== undefined && Number(subjectMap.order) > 0) {
                            let timestampMs = 0;
                            if (subjectMap.time) {
                                if (typeof subjectMap.time.toDate === 'function') timestampMs = subjectMap.time.toDate().getTime();
                                else if (subjectMap.time.seconds) timestampMs = subjectMap.time.seconds * 1000;
                                else timestampMs = new Date(subjectMap.time).getTime() || Date.now();
                            }

                            activeSubjects.push({ 
                                namaMap: subject, 
                                order: Number(subjectMap.order), 
                                time: timestampMs 
                            });
                        }
                    });

                    activeSubjects.sort((a, b) => b.time - a.time);
                    const topTwoSubjects = activeSubjects.slice(0, 2);
                    const filteredMaterials = [];

                    topTwoSubjects.forEach(activeSub => {
                        const matchedChapter = allChaptersFromDB.find(rawDoc => {
                            const ch = (typeof rawDoc.data === 'function') ? rawDoc.data() : rawDoc;
                            const dbSubjectId = ch.subjectId || ch.subject_id || ch.SubjectId || ch.subjectID || "";
                            const dbOrder = ch.order || ch.Order || 0;

                            return String(dbSubjectId).toLowerCase() === String(activeSub.namaMap).toLowerCase() && 
                                   Number(dbOrder) === Number(activeSub.order);
                        });

                        if (matchedChapter) {
                            const chData = (typeof matchedChapter.data === 'function') ? matchedChapter.data() : matchedChapter;
                            const finalUid = matchedChapter.id || chData.id || chData.uid || chData.chapterId || "id_tidak_ditemukan";

                            filteredMaterials.push({
                                uidchapter: finalUid,
                                title: chData.title || `Bab ${activeSub.order}`,
                                namaMap: activeSub.namaMap,
                                subjectDisplay: activeSub.namaMap.toUpperCase(),
                                xpReward: chData.xpReward || 20
                            });
                        }
                    });

                    // --- FILTER SLIDE 2: KUIS TERBARU (Mencocokkan ke koleksi 'dailyPaths' via allDailyPathsFromDB) ---
                    const activeQuizzes = [];
                    availableSubjects.forEach(subject => {
                        const subjectMap = progressData[subject];
                        if (subjectMap && subjectMap.orderq !== undefined && Number(subjectMap.orderq) > 0) {
                            let timestampMs = 0;
                            if (subjectMap.timeq) {
                                if (typeof subjectMap.timeq.toDate === 'function') timestampMs = subjectMap.timeq.toDate().getTime();
                                else if (subjectMap.timeq.seconds) timestampMs = subjectMap.timeq.seconds * 1000;
                                else timestampMs = new Date(subjectMap.timeq).getTime() || Date.now();
                            }

                            activeQuizzes.push({ subjectId: subject, currentOrderQ: Number(subjectMap.orderq), timeq: timestampMs });
                        }
                    });

                    activeQuizzes.sort((a, b) => b.timeq - a.timeq);
                    const topTwoQuizzes = activeQuizzes.slice(0, 2);
                    const filteredQuizzes = [];

                    topTwoQuizzes.forEach(activeQuiz => {
                        const matchedQuiz = allDailyPathsFromDB.find(rawDoc => {
                            const q = (typeof rawDoc.data === 'function') ? rawDoc.data() : rawDoc;
                            const dbMapel = q.mapel || "";
                            const dbThemeCodeStr = q.themeCode || "Q0";
                            
                            const dbThemeCodeNum = Number(dbThemeCodeStr.replace(/[^0-9]/g, '')) || 0;

                            return String(dbMapel).toLowerCase() === String(activeQuiz.subjectId).toLowerCase() && 
                                   dbThemeCodeNum === Number(activeQuiz.currentOrderQ);
                        });

                        if (matchedQuiz) {
                            const qData = (typeof matchedQuiz.data === 'function') ? matchedQuiz.data() : matchedQuiz;
                            const finalUid = matchedQuiz.id || qData.id || qData.uid || "id_tidak_ditemukan";

                            filteredQuizzes.push({
                                id: finalUid,
                                title: qData.theme || `Kuis Paket ${activeQuiz.currentOrderQ}`,
                                subject: formatSubjectName(activeQuiz.subjectId),
                                rawSubjectId: activeQuiz.subjectId,
                                isCompleted: true
                            });
                        }
                    });

                    setDynamicMaterials(filteredMaterials);
                    setDynamicQuizzes(filteredQuizzes);
                    setLoading(false);
                }, (err) => {
                    console.error("Gagal sinkronisasi progres belajar:", err);
                    setLoading(false);
                });

                // 3. Dengarkan Urutan Posisi Peringkat Leaderboard secara Realtime
                const leaderboardQuery = query(collection(db, 'users'), orderBy('score', 'desc'));
                unsubscribeLeaderboard = onSnapshot(leaderboardQuery, (snapshot) => {
                    const leaderboardData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
                    if (leaderboardData && leaderboardData.length > 0) {
                        const userIndex = leaderboardData.findIndex(player => player.uid === currentUser.uid);
                        setRealRank(userIndex !== -1 ? `#${userIndex + 1}` : '-');
                    }
                }, (err) => {
                    console.error("Gagal sinkronisasi leaderboard:", err);
                });

            } catch (err) {
                console.error(err);
                toast.error("Gagal memuat antrean belajar hari ini.");
                setLoading(false);
            }
        };

        initDashboardRealtime();

        return () => {
            unsubscribeUser();
            unsubscribeProgress();
            unsubscribeLeaderboard();
        };
    }, [currentUser?.uid, authLoading]);

    // =======================================================================
    // 🟢 SISTEM LEVELING SESUAI RUMUS EKSPONESIAL KOMPLEKS (BISA NAIK & TURUN)
    // =======================================================================
    const totalExp = realtimeUser?.exp ?? currentUser?.exp ?? 0;
    const dbLevel = realtimeUser?.level ?? currentUser?.level ?? 1; 

    const calculateLevelSystem = (exp) => {
        let level = 1;
        let minExpForCurrentLevel = 0;
        let baseExpNeeded = 100;
        
        const staticRequirements = [0, 100, 150, 220, 300, 450, 650, 900, 1200, 1600];
        let tempExp = exp;

        while (true) {
            if (level <= 9) {
                baseExpNeeded = staticRequirements[level];
            } else {
                baseExpNeeded = Math.floor(baseExpNeeded * 1.4);
            }

            if (tempExp >= baseExpNeeded) {
                tempExp -= baseExpNeeded;
                minExpForCurrentLevel += baseExpNeeded;
                level++;
            } else {
                break;
            }
        }

        return { 
            level, 
            minExp: minExpForCurrentLevel,
            maxExp: minExpForCurrentLevel + baseExpNeeded,
            currentProgressInLevel: tempExp,
            baseExpNeeded
        };
    };

    const { level: userLevel, maxExp, baseExpNeeded, currentProgressInLevel } = calculateLevelSystem(totalExp);
    const expPercentage = Math.min(100, Math.floor((currentProgressInLevel / baseExpNeeded) * 100));

    // Sinkronisasi awal tracker level
    useEffect(() => {
        if (!authLoading && !loading && (realtimeUser || currentUser)) {
            if (prevLevelRef.current === undefined) {
                prevLevelRef.current = dbLevel;
            }
        }
    }, [realtimeUser, currentUser, authLoading, loading, dbLevel]);

    // Reset kuncian mutasi jika level sinkron kembali
    useEffect(() => {
        if (userLevel === dbLevel) {
            hasTriggeredRef.current = false;
        }
    }, [userLevel, dbLevel]);

    // Update level ke Firebase secara otomatis (baik saat level naik maupun turun)
    useEffect(() => {
        if (!authLoading && !loading && currentUser?.uid && userLevel !== dbLevel && !hasTriggeredRef.current) {
            hasTriggeredRef.current = true;
            prevLevelRef.current = userLevel;

            updateUserData(currentUser.uid, { level: userLevel }).catch(() => {
                hasTriggeredRef.current = false;
            });
        }
    }, [userLevel, dbLevel, currentUser?.uid, authLoading, loading]);

    if (authLoading || loading) return <Spinner />;

    const targetUser = realtimeUser || currentUser;
    const userInitial = targetUser?.displayName ? targetUser.displayName.charAt(0).toUpperCase() : 'U';
    const userBorderClass = targetUser?.activeBorder || 'borderNormal';
    const userCoins = targetUser?.koin ?? 0;
    const score = targetUser?.score ?? 0;

    return (
        <div className={styles.dashboardContainer}>
            <div className={styles.fixedTopSection}>
                <header className={styles.topHeader}>
                    <div className={styles.userGreet}>
                        <div className={`${styles.avatarContainerWrapper} ${userBorderClass}`} onClick={() => navigate('/profile')}>
                            {targetUser?.photoURL ? (
                                <img src={targetUser.photoURL} alt="Profile" className={styles.avatarMini} />
                            ) : (
                                <div className={styles.avatarInitialFallback}>{userInitial}</div>
                            )}
                        </div>
                        <div className={styles.greetTextWrapper}>
                            <h2>Halo, {targetUser?.displayName?.split(' ')[0] || 'Pelajar'} 👋</h2>
                            <div className={styles.levelProgressContainer}>
                                <span className={styles.levelBadgeText}>Lv. {userLevel}</span>
                                <div className={styles.expTrackSliderOuter}>
                                    <div className={styles.expFillSliderInner} style={{ width: `${expPercentage}%` }} />
                                    <span className={styles.expNumericIndicator}>
                                        {totalExp} / {maxExp} XP
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button className={styles.notificationBtn} onClick={() => navigate('/leaderboard')}>
                        <FaChartLine />
                    </button>
                </header>

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

            <div className={styles.sliderOuterViewport}>
                <div className={styles.sliderTrackAnimated} style={{ transform: `translateX(-${activeSliderIndex * 50}%)` }}>
                    
                    <div className={styles.singleSlidePane}>
                        <div className={styles.sectionHeader}>
                            <h3>Misi Pembelajaran Terakhir</h3>
                            <span className={styles.seeAllLink} onClick={() => navigate('/forum')}>Lihat Semua</span>
                        </div>
                        <div className={styles.dailyPathListStack}>
                            {dynamicMaterials.length > 0 ? (
                                dynamicMaterials.map((path) => (
                                    <div 
                                        key={path.uidchapter} 
                                        className={styles.pathChallengeCardRow}
                                        onClick={() => {
                                            if (document.documentElement.requestFullscreen) {
                                                document.documentElement.requestFullscreen().catch(() => {});
                                            } else if (document.documentElement.webkitRequestFullscreen) {
                                                document.documentElement.webkitRequestFullscreen();
                                            } else if (document.documentElement.msRequestFullscreen) {
                                                document.documentElement.msRequestFullscreen();
                                            }
                                            navigate(`/forum/list/${path.namaMap}/${path.uidchapter}`);
                                        }}
                                    >
                                        <div className={styles.pathIconBoxLeft}><FaBookOpen /></div>
                                        <div className={styles.quizInfo}>
                                            <h4>{path.title}</h4>
                                            <p>{path.subjectDisplay} • +{path.xpReward} EXP</p>
                                        </div>
                                        <div className={styles.actionStatusZoneRight}>
                                            <FaChevronRight className={styles.arrowIcon} />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className={styles.onboardingStarterCard}>
                                    <div className={styles.onboardingIcon}><FaRocket /></div>
                                    <div className={styles.onboardingText}>
                                        <h4>Perjalanan Dimulai!</h4>
                                        <p>Pilih materi dan kumpulkan EXP pertamamu.</p>
                                    </div>
                                    <button className={styles.onboardingBtn} onClick={() => navigate('/forum')}>
                                        Mulai Belajar
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.singleSlidePane}>
                        <div className={styles.sectionHeader}>
                            <h3>Kuis Selesai Review</h3>
                            <span className={styles.seeAllLink} onClick={() => navigate('/quiz')}>Lihat Semua</span>
                        </div>
                        <div className={styles.dailyPathListStack}>
                            {dynamicQuizzes.length > 0 ? (
                                dynamicQuizzes.map((quiz) => (
                                    <div 
                                        key={quiz.id} 
                                        className={styles.pathChallengeCardRow}
                                        onClick={() => navigate(`/quiz/list/${quiz.rawSubjectId}/${quiz.id}`)}
                                    >
                                        <div className={styles.pathIconBoxLeft} style={{ backgroundColor: 'rgba(22, 163, 74, 0.1)', color: '#16a34a' }}><FaStar /></div>
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
                                <div className={styles.onboardingStarterCard}>
                                    <div className={styles.onboardingIcon} style={{ background: '#fef3c7', color: '#ea580c' }}><FaGamepad /></div>
                                    <div className={styles.onboardingText}>
                                        <h4>Kuis Pertamamu</h4>
                                        <p>Asah otakmu setelah menguasai materi bab.</p>
                                    </div>
                                    <button className={styles.onboardingBtn} style={{ background: '#ea580c' }} onClick={() => navigate('/quiz')}>
                                        Buka Kuis
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                <div className={styles.sliderDotsIndicatorRow}>
                    <div className={`${styles.dotItem} ${activeSliderIndex === 0 ? styles.dotActive : ''}`} onClick={() => setActiveSliderIndex(0)} />
                    <div className={`${styles.dotItem} ${activeSliderIndex === 1 ? styles.dotActive : ''}`} onClick={() => setActiveSliderIndex(1)} />
                </div>
            </div>

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
