// client/src/pages/IndexPage.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; 
import { useGDPR } from '../contexts/GDPRContext';
import styles from './IndexPage.module.css';
import DailyPathDashboard from '../components/ui/DailyPathDashboard';
import { getAppName } from '../services/firestoreService';

const LandingPage = () => {
    const navigate = useNavigate();
    const { requestConsent } = useGDPR();
    const [appName, setAppName] = useState('QuizPride');
    const [activeActionId, setActiveActionId] = useState(null);

    // Ref untuk scroll animation
    const heroRef = useRef(null);
    const subjectsRef = useRef(null);
    const featureRef = useRef(null);

    const subjects = [
        { id: 'sb1', name: 'Matematika', icon: '📐', desc: 'Analisis logika, aljabar, geometri, dan teori bilangan standar kompetisi.' },
        { id: 'sb2', name: 'IPA (Sains)', icon: '🧪', desc: 'Eksplorasi mendalam mekanika fisik, konsep kimia, dan ekosistem biologi.' },
        { id: 'sb3', name: 'IPS (Sosial)', icon: '🌍', desc: 'Kupas tuntas dinamika geografi, sejarah nasional, dan pemahaman ekonomi.' },
        { id: 'sb4', name: 'Bahasa Inggris', icon: '🇬🇧', desc: 'Penguasaan struktur gramatikal tingkat lanjut, teks bacaan, dan kosakata.' },
        { id: 'sb5', name: 'Bahasa Indonesia', icon: '🇮🇩', desc: 'Pendalaman penalaran linguistik, analisis wacana, dan kaidah kebahasaan.' }
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

        // Intersection Observer untuk memicu animasi saat di-scroll
        const observerOptions = {
            root: null,
            threshold: 0.1, 
        };

        const observerCallback = (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add(styles.visible);
                }
            });
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);

        if (heroRef.current) observer.observe(heroRef.current);
        if (subjectsRef.current) observer.observe(subjectsRef.current);
        if (featureRef.current) observer.observe(featureRef.current);

        return () => observer.disconnect();
    }, []);

    const handleStartAuth = () => {
        if (requestConsent) {
            requestConsent(() => navigate('/auth'));
        } else {
            navigate('/auth');
        }
    };

    const triggerFeedbackAnim = (id) => {
        setActiveActionId(id);
        setTimeout(() => {
            setActiveActionId(null);
        }, 500);
    };

    return (
        <div className={styles.landingContainer}>
            {/* NAVBAR */}
            <header className={styles.header}>
                <h1 className={styles.logo} onClick={() => triggerFeedbackAnim('logo-brand')}>
                    <span className={styles.logoMain}>Quiz</span>
                    <span className={styles.logoSub}>Pride</span>
                </h1>
                <button className={styles.loginBtn} onClick={handleStartAuth}>
                    Masuk Akun
                </button>
            </header>

            {/* HERO SECTION (FADE UP SMOOTH) */}
            <main ref={heroRef} className={`${styles.heroSection} ${styles.scrollReveal}`}>
                <div className={styles.heroContent}>
                    <div 
                        className={`${styles.announcementTag} ${activeActionId === 'tag' ? styles.shakeAnim : ''}`}
                        onClick={() => triggerFeedbackAnim('tag')}
                    >
                        <span className={styles.tagDot}></span> Pusat Persiapan Olimpiade Nasional
                    </div>
                    <h2 className={styles.tagline} onClick={() => triggerFeedbackAnim('tagline')}>
                        Cara Pintar Kuasai Materi dan Raih <span className={styles.textHighlight}>Medali Emas</span>
                    </h2>
                    <p className={styles.description} onClick={() => triggerFeedbackAnim('desc')}>
                        Platform belajar dan simulasi ujian terpadu untuk kompetisi sains dan bahasa tingkat nasional. 
                        Akses ratusan modul terstruktur dan uji pemahamanmu secara real-time.
                    </p>
                    <button className={styles.mainCtaBtn} onClick={handleStartAuth}>
                        Mulai Belajar Sekarang &rarr;
                    </button>
                </div>
            </main>

            {/* SELEKSI MATA PELAJARAN (STAGGERED FADE UP) */}
            <section ref={subjectsRef} className={`${styles.subjectsSection} ${styles.scrollReveal}`}>
                <h3 className={styles.sectionTitle}>Pilih Bidang Fokus Olimpiade</h3>
                <div className={styles.subjectsGrid}>
                    {subjects.map((subject, idx) => (
                        <div 
                            key={subject.id} 
                            className={`${styles.subjectCard} ${activeActionId === subject.id ? styles.giggleAnim : ''}`} 
                            style={{ '--card-index': idx }}
                            onClick={() => triggerFeedbackAnim(subject.id)}
                        >
                            <div className={styles.subjectTopRow}>
                                <div className={styles.subjectIcon}>{subject.icon}</div>
                                <span className={styles.cardArrow}>✦</span>
                            </div>
                            <div className={styles.subjectInfoWrapper}>
                                <h4>{subject.name}</h4>
                                <p>{subject.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* FEATURE SECTION (STAGGERED FADE UP) */}
            <section ref={featureRef} className={`${styles.featureSection} ${styles.scrollReveal}`}>
                <div 
                    className={`${styles.featureCard} ${activeActionId === 'ft1' ? styles.giggleAnim : ''}`}
                    style={{ '--card-index': 0 }}
                    onClick={() => triggerFeedbackAnim('ft1')}
                >
                    <div className={styles.featureIcon}>📚</div>
                    <h3>Modul Terstruktur</h3>
                    <p>Materi pembelajaran komprehensif yang disusun rapi sesuai dengan kisi-kisi silabus olimpiade terbaru.</p>
                </div>
                <div 
                    className={`${styles.featureCard} ${activeActionId === 'ft2' ? styles.giggleAnim : ''}`}
                    style={{ '--card-index': 1 }}
                    onClick={() => triggerFeedbackAnim('ft2')}
                >
                    <div className={styles.featureIcon}>⚡</div>
                    <h3>Simulasi Ujian</h3>
                    <p>Uji kesiapan mental dan pemahaman materi lewat sistem kuis interaktif dengan penilaian instan.</p>
                </div>
                <div 
                    className={`${styles.featureCard} ${activeActionId === 'ft3' ? styles.giggleAnim : ''}`}
                    style={{ '--card-index': 2 }}
                    onClick={() => triggerFeedbackAnim('ft3')}
                >
                    <div className={styles.featureIcon}>👥</div>
                    <h3>Ruang Diskusi</h3>
                    <p>Berbagi strategi penyelesaian soal sulit bersama rekan seperjuangan dari berbagai sekolah.</p>
                </div>
            </section>

            <footer className={styles.pageFooter} onClick={() => triggerFeedbackAnim('footer')}>
                <p>&copy; 2026 {appName} Platform. Semua materi dirancang khusus untuk persiapan kompetisi resmi.</p>
            </footer>
        </div>
    );
};

const IndexPage = () => {
    const { currentUser } = useAuth();
    return currentUser ? <DailyPathDashboard /> : <LandingPage />;
};

export default IndexPage;
