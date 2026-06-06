// client/src/pages/admin/MateriListPage.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './MateriListPage.module.css';
import { 
  FaArrowLeft, 
  FaCalculator, 
  FaFlask, 
  FaGlobeAsia, 
  FaLanguage, 
  FaBook 
} from 'react-icons/fa';

const MateriListPage = () => {
  const navigate = useNavigate();

  // Daftar 5 Mapel Wajib dengan ID dan Styling custom
  const listMapel = [
    { id: 'mtk', name: 'Matematika', icon: <FaCalculator />, color: '#ef4444', desc: 'Aljabar, geometri, & hitungan dasar' },
    { id: 'ipa', name: 'Sains (IPA)', icon: <FaFlask />, color: '#10b981', desc: 'Fisika, biologi, & kimia dasar' },
    { id: 'ips', name: 'IPS', icon: <FaGlobeAsia />, color: '#f59e0b', desc: 'Sejarah, sosiologi, & geografi' },
    { id: 'inggris', name: 'Bahasa Inggris', icon: <FaLanguage />, color: '#3b82f6', desc: 'Grammar, tenses, & reading comprehension' },
    { id: 'indonesia', name: 'Bahasa Indonesia', icon: <FaBook />, color: '#8b5cf6', desc: 'Struktur teks, sastra, & ejaan baku' }
  ];

  const handleMapelClick = (id) => {
    // Navigasi ke halaman detail bab untuk mapel terpilih
    navigate(`/admin/materi/${id}`);
  };

  return (
    <div className={styles.adminContainer}>
      <header className={styles.adminHeader}>
        <h1>Manajemen Materi</h1>
        <p className={styles.subtitleHeader}>Pilih mata pelajaran di bawah untuk mengelola materi dan daftar bab belajar.</p>
      </header>

      <main className={styles.adminMain}>
        <div className={styles.mapelGrid}>
          {listMapel.map((mapel) => (
            <div 
              key={mapel.id} 
              className={styles.mapelCard} 
              onClick={() => handleMapelClick(mapel.id)}
            >
              <div 
                className={styles.iconCircle} 
                style={{ backgroundColor: `${mapel.color}15`, color: mapel.color }}
              >
                {mapel.icon}
              </div>
              <div className={styles.mapelInfo}>
                <h3>{mapel.name}</h3>
                <p>{mapel.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default MateriListPage;
