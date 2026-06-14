// client/src/components/ui/MainLayout.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ThemeSwitcher from '../ThemeSwitcher'; 
import styles from './MainLayout.module.css';
import { toast } from 'react-hot-toast';
import { 
    FaHouse, 
    FaBookOpen, 
    FaAward, 
    FaUser,
    FaGear, 
    FaRightFromBracket,
    FaShieldHalved,
    FaCircleQuestion
} from 'react-icons/fa6'; 

const MainLayout = ({ children }) => {
    const { currentUser, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false); 

    const isAdmin = currentUser?.role === 'admin';
    const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

    // 🛠️ LOGIKA BARU: Cek apakah path saat ini adalah halaman toko
    // Sesuaikan '/shop' dengan rute path yang kamu daftarkan di App.jsx kamu
    const isShopPage = location.pathname.includes('shop'); 

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        const elem = document.documentElement;
        if (!document.fullscreenElement) {
            if (elem.requestFullscreen) {
                elem.requestFullscreen()
                    .then(() => toast.success('Mode Game Imersif Aktif! 🎮✨'))
                    .catch((err) => console.log(`Gagal Fullscreen: ${err.message}`));
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen()
                    .then(() => toast.success('Keluar dari Mode Imersif.'));
            }
        }
        setShowSettingsDropdown(false); 
    };

    const triggerLogoutConfirmation = () => {
        setShowSettingsDropdown(false);
        setShowLogoutModal(true); 
    };

    const confirmSignOut = () => {
        try {
            setShowLogoutModal(false);
            signOut(); 
        } catch (error) {
            console.error("Gagal keluar akun secara sistem:", error);
        }
    };

    const getActiveNav = () => {
        const path = location.pathname;
        if (path.includes('dashboard')) return 'home';
        if (path.includes('forum')) return 'forum';
        if (path.includes('leaderboard')) return 'leaderboard';
        if (path.includes('quiz')) return 'quiz';
        if (path.includes('profile')) return 'profile';
        return 'home';
    };

    const activeNav = getActiveNav();

    return (
        <div className={styles.qpDashboardContainer}>
            {/* --- TOP NAVBAR (Tetap selalu muncul di semua halaman) --- */}
            <header className={styles.topNavbar}>
                <div className={styles.logoArea} onClick={() => navigate('/dashboard')}>
                    <span className={styles.logoText}>QuizPreet</span>
                    <span className={styles.logoBadge}>Olimpiade</span>
                </div>

                <div className={styles.userProfileWrapper}>
                    {isAdmin && (
                        <button 
                            className={`${styles.iconBtn} ${styles.adminBtn}`}
                            onClick={() => navigate('/admin')}
                            title="Panel Admin"
                        >
                            <FaShieldHalved />
                        </button>
                    )}

                    <div className={styles.settingsGroup}>
                        <button 
                            className={`${styles.iconBtn} ${showSettingsDropdown ? styles.activeBtn : ''}`}
                            onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                            title="Pengaturan & Tema"
                        >
                            <FaGear />
                        </button>

                        {showSettingsDropdown && (
                            <div className={styles.settingsDropdown}>
                                <div className={styles.dropdownHeader}>Pengaturan</div>
                                <div className={styles.dropdownItem}>
                                    <span>Mode Gelap</span>
                                    <ThemeSwitcher />
                                </div>
                                <div className={styles.dropdownDivider} />
                                <button 
                                    className={styles.dropdownMenuBtn} 
                                    onClick={() => { navigate('/profile'); setShowSettingsDropdown(false); }}
                                >
                                    <FaGear /> Edit Profile
                                </button>
                                <button className={styles.dropdownActionItemBtn} onClick={toggleFullscreen}>
                                    <span>{isFullscreen ? '↩️' : '📺'}</span>
                                    <span>{isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh'}</span>
                                </button>
                                <div className={styles.dropdownDivider} />
                                <button 
                                    className={`${styles.dropdownMenuBtn} ${styles.logoutBtn}`} 
                                    onClick={triggerLogoutConfirmation}
                                >
                                    <FaRightFromBracket /> Keluar Akun
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* --- MAIN CONTENT AREA --- */}
            {/* 🛠️ MODIFIKASI: Mengurangi padding-bottom kontainer jika sedang membuka halaman toko */}
            <main className={`${styles.mainContent} ${isShopPage ? styles.shopPageActiveContent : ''}`}>
                {children}
            </main>

            {/* --- FLOATING BOTTOM NAVIGATION BAR --- */}
            {/* 🛠️ PERBAIKAN UTAMA: Hanya tampilkan bottom nav jika BUKAN halaman toko (!isShopPage) */}
            {!isShopPage && (
                <div className={styles.navContainerFixed}>
                    <footer className={styles.qpBottomNavFloating}>
                        <button
                            className={`${styles.qpNavItem} ${activeNav === 'home' ? styles.active : ''}`}
                            onClick={() => navigate('/dashboard')}
                            title="Dashboard Utama"
                        >
                            <FaHouse className={styles.navIcon} />
                            <span className={styles.navLabel}>Utama</span>
                        </button>
                        
                        <button
                            className={`${styles.qpNavItem} ${activeNav === 'forum' ? styles.active : ''}`}
                            onClick={() => navigate('/forum')}
                            title="Materi & Forum"
                        >
                            <FaBookOpen className={styles.navIcon} />
                            <span className={styles.navLabel}>Materi</span>
                        </button>
                        
                        <button
                            className={`${styles.qpNavItem} ${activeNav === 'leaderboard' ? styles.active : ''}`}
                            onClick={() => navigate('/leaderboard')}
                            title="Papan Peringkat"
                        >
                            <FaAward className={styles.navIcon} />
                            <span className={styles.navLabel}>Peringkat</span>
                        </button>
                        
                        <button
                            className={`${styles.qpNavItem} ${activeNav === 'quiz' ? styles.active : ''}`}
                            onClick={() => navigate('/quiz')}
                            title="quiz"
                        >
                            <FaCircleQuestion className={styles.navIcon} />
                            <span className={styles.navLabel}>Quiz</span>
                        </button>
                        
                        <button
                            className={`${styles.qpNavItem} ${activeNav === 'profile' ? styles.active : ''}`}
                            onClick={() => navigate('/profile')}
                            title="Profil Saya"
                        >
                            <FaUser className={styles.navIcon} />
                            <span className={styles.navLabel}>Profil</span>
                        </button>
                    </footer>
                </div>
            )}
            
            {showLogoutModal && (
                <div className={styles.logoutModalOverlay} onClick={() => setShowLogoutModal(false)}>
                    <div className={styles.logoutModalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.logoutWarnIcon}>⚠️</div>
                        <h3>Mau Keluar Sekarang?</h3>
                        <p>Kamu harus memasukkan kembali email dan kata sandi pada sesi berikutnya.</p>
                        <div className={styles.logoutModalActions}>
                            <button className={styles.logoutCancelBtn} onClick={() => setShowLogoutModal(false)}>
                                Batal
                            </button>
                            <button className={styles.logoutConfirmBtn} onClick={confirmSignOut}>
                                Keluar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MainLayout;
