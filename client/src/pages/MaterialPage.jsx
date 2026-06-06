// client/src/pages/MaterialPage.jsx

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import styles from './MaterialPage.module.css';
import { FaBookOpen, FaClipboardList, FaArrowLeft } from 'react-icons/fa';

// Data Dummy Sederhana (Hanya untuk tampilan)
const materialData = {
    senin: { 
        title: "Logika Dasar & Penalaran Kritis", 
        description: "Panduan lengkap untuk menguasai tes logika, matematika, dan sejarah.",
        content: "### Apa itu Logika Dasar?\n\nLogika dasar adalah cabang ilmu yang mempelajari prinsip-prinsip untuk membedakan penalaran yang benar (valid) dan yang salah (invalid). Di sini, kita akan membahas Silogisme dan Analogi Verbal. Gunakan daftar modul di samping untuk menjelajahi topik secara bertahap. Setelah selesai, kerjakan kuis untuk mendapatkan hadiah!",
        modules: [
            { id: 1, title: "Pengantar Silogisme", status: "completed" },
            { id: 2, title: "Analogi Verbal Lanjutan", status: "current" },
            { id: 3, title: "Latihan Soal Matematika", status: "locked" },
            { id: 4, title: "Sejarah Perang Dunia", status: "locked" },
        ]
    },
    // ... Anda bisa tambahkan tema lain seperti 'selasa', 'rabu', dst.
};

const MaterialPage = () => {
    const { topicId } = useParams();
    const [topic, setTopic] = useState(null);

    useEffect(() => {
        const data = materialData[topicId] || { 
            title: "Materi Tidak Ditemukan", 
            description: "ID materi yang Anda cari tidak valid.",
            content: "Kembali ke halaman utama forum.",
            modules: []
        };
        setTopic(data);
        window.scrollTo(0, 0); 
    }, [topicId]);

    if (!topic) {
        return <div className={styles.loading}>Memuat Materi...</div>;
    }

    return (
        <div className={styles.materialContainer}>
            <Link to="/forum" className={styles.backButton}>
                <FaArrowLeft /> Kembali ke Forum
            </Link>
            
            <header className={styles.header}>
                <FaBookOpen className={styles.headerIcon} />
                <h1>{topic.title}</h1>
                <p className={styles.description}>{topic.description}</p>
            </header>

            <div className={styles.contentWrapper}>
                {/* Bagian KONTEN MATERI UTAMA */}
                <main className={styles.mainContent}>
                    <section className={styles.materialCard}>
                        <h2>{topic.title}</h2>
                        <div className={styles.materialText}>
                            <p>{topic.content}</p>
                            <p>Contoh: Jika semua A adalah B, dan C adalah A, maka C adalah B (Silogisme). Lanjut ke modul berikutnya untuk tes!</p>
                        </div>
                    </section>
                </main>

                {/* Bagian SIDEBAR Modul/Daftar Isi */}
                <aside className={styles.sidebar}>
                    <h3 className={styles.sidebarTitle}><FaClipboardList /> Daftar Modul</h3>
                    <ul className={styles.moduleList}>
                        {topic.modules.map(module => (
                            <li key={module.id} className={`${styles.moduleItem} ${styles[module.status]}`}>
                                {module.title}
                                <span className={styles.statusIndicator}>
                                    {module.status === 'completed' ? '✅' : module.status === 'current' ? '▶️' : '🔒'}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <button className={styles.quizButton}>
                        Selesaikan Kuis Materi Ini
                    </button>
                </aside>
            </div>
        </div>
    );
};

export default MaterialPage;
