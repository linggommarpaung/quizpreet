// client/src/pages/IndexPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; 
import { useGDPR } from '../contexts/GDPRContext';
import styles from './IndexPage.module.css';
import DailyPathDashboard from '../components/ui/DailyPathDashboard';
import { getAppName } from '../services/firestoreService';

// --- Halaman Landing untuk Pengguna yang Belum Login ---
const LandingPage = () => {
    const navigate = useNavigate();
    const { requestConsent } = useGDPR();
    const [appName, setAppName] = useState('QuizPreet');

    // Daftar mata pelajaran Olimpiade untuk tampilan interaktif
    const subjects = [
        { name: 'Matematika', icon: '📐', color: '#ff4d4d' },
        { name: 'IPA (Sains)', icon: '🧪', color: '#2ed573' },
        { name: 'IPS (Sosial)', icon: '🌍', color: '#ffa502' },
        { name: 'Bahasa Inggris', icon: '🇬🇧', color: '#1e90ff' },
        { name: 'Bahasa Indonesia', icon: '🇮🇩', color: '#ff6b81' }
    ];

    useEffect(() => {
        const fetchAppName = async () => {
            try {
                const name = await getAppName();
                if (name) {
                    setAppName(name);
                }
            } catch (error) {
                console.error("Gagal mengambil nama aplikasi:", error);
            }
        };
        fetchAppName();
    }, []);

    const handleStart = () => {
        requestConsent(() => {
            navigate('/auth');
        });
    };

    return (
        <div className={styles.landingContainer}>
            {/* Navbar Modern */}
            <header className={styles.header}>
                <h1 className={styles.logo}>{appName} <span className={styles.badge}>Olimpiade</span></h1>
                <button onClick={handleStart} className={styles.loginButton}>
                    Masuk / Daftar
                </button>
            </header>

            {/* Hero Section yang Lebih Canggih */}
            <main className={styles.heroSection}>
                <div className={styles.heroContent}>
                    <div className={styles.liveTag}>✨ Hub Belajar Olimpiade Masa Depan</div>
                    <h2 className={styles.tagline}>
                        Kuasai Materi, Taklukkan <span className={styles.highlight}>Olimpiade Nasional!</span>
                    </h2>
                    <p className={styles.description}>
                        Platform persiapan kompetisi sains dan bahasa terpadu. Akses materi eksklusif, uji kemampuan lewat kuis intensif, dan berkolaborasi bersama talenta terbaik se-Indonesia.
                    </p>
                    <div className={styles.ctaGroup}>
                        <button onClick={handleStart} className={styles.ctaButton}>
                            Mulai Belajar Sekarang 🚀
                        </button>
                    </div>
                </div>
            </main>

            {/* Section Mata Pelajaran Olimpiade */}
            <section className={styles.subjectsSection}>
                <h3 className={styles.sectionTitle}>Pilih Fokus Olimpiade Kamu</h3>
                <div className={styles.subjectGrid}>
                    {subjects.map((subject, index) => (
                        <div key={index} className={styles.subjectCard} style={{ '--accent-color': subject.color }}>
                            <span className={styles.subjectIcon}>{subject.icon}</span>
                            <h4>{subject.name}</h4>
                            <p>Materi & Kuis Pendalaman</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Section Fitur Utama (Konsep Baru) */}
            <section className={styles.featureSection}>
                <div className={styles.featureCard}>
                    <div className={styles.featureIconContainer}>📚</div>
                    <h3>Modul & Materi Eksklusif</h3>
                    <p>Materi pembelajaran terstruktur yang dirancang khusus untuk standar kompetisi nasional.</p>
                </div>
                <div className={styles.featureCard}>
                    <div className={styles.featureIconContainer}>⚡</div>
                    <h3>Kuis & Simulasi Real-Time</h3>
                    <p>Uji pemahamanmu dengan ribuan soal latihan Olimpiade tingkat tinggi kapan saja.</p>
                </div>
                <div className={styles.featureCard}>
                    <div className={styles.featureIconContainer}>👥</div>
                    <h3>Belajar Bareng (Ruang Kolaborasi)</h3>
                    <p>Diskusikan soal-soal sulit dan berbagi strategi belajar bersama teman seperjuangan.</p>
                </div>
            </section>
        </div>
    );
};

// --- Halaman Utama dengan Logika Tampilan ---
const IndexPage = () => {
    const { currentUser } = useAuth();

    return currentUser ? <DailyPathDashboard /> : <LandingPage />;
};

export default IndexPage;
