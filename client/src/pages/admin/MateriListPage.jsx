// client/src/pages/admin/MateriListPage.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebaseConfig';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import styles from './MateriListPage.module.css';
import ChapterContentManager from '../../components/admin/ChapterContentManager';

import { 
  FaArrowLeft, FaPlus, FaSpinner, FaFolderOpen, FaXmark, FaTrash,
  FaCalculator, FaFlask, FaGlobe, FaLanguage, FaBook
} from 'react-icons/fa6';

const listMapel = [
  { id: 'mtk', name: 'Matematika', desc: 'Aljabar, Geometri, Kalkulus', icon: <FaCalculator />, color: '#2563eb' },
  { id: 'ipa', name: 'Ipa', desc: 'Mekanika, Termodinamika, Optik', icon: <FaFlask />, color: '#ea580c' },
  { id: 'ips', name: 'IPS / Geografi', desc: 'Sosiologi, Sejarah, Atmosfer', icon: <FaGlobe />, color: '#16a34a' },
  { id: 'inggris', name: 'Bahasa Inggris', desc: 'Grammar, Reading, Listening', icon: <FaLanguage />, color: '#db2777' },
  { id: 'indonesia', name: 'Bahasa Indonesia', desc: 'Literasi, Puisi, Karya Ilmiah', icon: <FaBook />, color: '#7c3aed' },
];

const MateriListPage = () => {
  const [selectedMapel, setSelectedMapel] = useState(null);
  const [selectedChapterId, setSelectedChapterId] = useState(null);
  
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [chapterToDelete, setChapterToDelete] = useState(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterOrder, setNewChapterOrder] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selectedMapel) {
      fetchChapters();
    }
  }, [selectedMapel]);

  const fetchChapters = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'chapters'),
        where('subjectId', '==', selectedMapel)
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Urutkan berdasarkan order bab secara ascending
      data.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
      setChapters(data);
    } catch (error) {
      console.error(error);
      toast.error("Gagal mengambil data bab");
    } finally {
      setLoading(false);
    }
  };

  const handleAddChapter = async (e) => {
    e.preventDefault();
    if (!newChapterTitle || !newChapterOrder) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'chapters'), {
        subjectId: selectedMapel,
        title: newChapterTitle,
        order: Number(newChapterOrder),
        pdfUrl: '',
        latihanSoal: [],
        miniUlangan: [],
        createdAt: serverTimestamp()
      });
      toast.success("Bab berhasil ditambahkan!");
      setNewChapterTitle('');
      setNewChapterOrder('');
      setShowAddModal(false);
      fetchChapters();
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyimpan bab");
    } finally {
      setSubmitting(false);
    }
  };

 // 1. Pemicu saat tombol hapus di klik pada baris/kartu bab
  const handleDeleteClick = (chapter) => {
  setChapterToDelete(chapter);
  setIsDeleteModalOpen(true);
};

// 2. Eksekutor penghapusan setelah user menekan tombol "Ya, Hapus" di dalam Modal
  const handleConfirmDelete = async () => {
  if (!chapterToDelete) return;
  
  setLoading(true); // Opsional jika ada loading state global
  try {
    const docRef = doc(db, 'chapters', chapterToDelete.id); // Sesuaikan dengan nama collection kamu
    await deleteDoc(docRef);
    
    toast.success(`Bab "${chapterToDelete.title || chapterToDelete.chapterTitle}" berhasil dihapus!`);
    
    fetchChapters(); 
    
  } catch (error) {
    console.error("Error deleting chapter: ", error);
    toast.error("Gagal menghapus bab.");
  } finally {
    setLoading(false);
    setIsDeleteModalOpen(false);
    setChapterToDelete(null);
  }
};



  // RENDER LEVEL 3: MANAJEMEN ISI KONTEN (MODULAR)
  if (selectedMapel && selectedChapterId) {
    return (
      <ChapterContentManager 
        subjectId={selectedMapel}
        chapterId={selectedChapterId}
        onBack={() => {
          setSelectedChapterId(null);
          fetchChapters(); // Refresh data bab saat kembali
        }}
      />
    );
  }

  // RENDER LEVEL 2: DAFTAR BAB BERDASARKAN MAPEL
  if (selectedMapel) {
    const currentMapel = listMapel.find(m => m.id === selectedMapel);
    return (
      <div className={styles.adminContainer}>
        <Toaster />
        <header className={styles.adminHeader}>
          <button className={styles.navButton} onClick={() => setSelectedMapel(null)}>
            <FaArrowLeft /> Kembali
          </button>
          <div className={styles.headerTitleRow}>
            <div>
              <h1>Bab {currentMapel?.name}</h1>
              <p className={styles.subtitleHeader}>Kelola susunan bab materi pembelajaran.</p>
            </div>
            <button className={styles.addButton} onClick={() => setShowAddModal(true)}>
              <FaPlus /> Tambah Bab
            </button>
          </div>
        </header>

        <main className={styles.adminMain}>
          {loading ? (
            <div className={styles.loadingArea}>
              <FaSpinner className={styles.spin} /> <p>Memuat daftar bab...</p>
            </div>
          ) : chapters.length > 0 ? (
            <div className={styles.chapterListGrid}>
              {chapters.map((ch) => (
                <div 
                  key={ch.id} 
                  className={styles.chapterItemCard}
                  onClick={() => setSelectedChapterId(ch.id)}
                >
                  <div className={styles.chapterCardLeft}>
                    <div className={styles.chapterBadge}>Bab {ch.order}</div>
                    <h3 className={styles.chapterTitleText}>{ch.title}</h3>
                  </div>
                  <button 
                    className={styles.deleteChapterBtn}
                    onClick={(e) => {
        e.stopPropagation();
        handleDeleteClick(ch);
      }}
                    title="Hapus Bab"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyArea}>
              <FaFolderOpen className={styles.emptyIcon} />
              <h3>Belum Ada Bab</h3>
              <p>Mata pelajaran ini belum memiliki bab materi. Silakan tambahkan bab baru.</p>
            </div>
          )}
        </main>

        {/* MODAL TAMBAH BAB */}
        {showAddModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h2>Tambah Bab Baru</h2>
                <button className={styles.closeBtn} onClick={() => setShowAddModal(false)}><FaXmark /></button>
              </div>
              <form onSubmit={handleAddChapter}>
                <div className={styles.formGroup}>
                  <label>Urutan Bab (Angka)</label>
                  <input 
                    type="number" 
                    min="1" 
                    placeholder="Contoh: 1"
                    value={newChapterOrder}
                    onChange={(e) => setNewChapterOrder(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Judul Bab</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Persamaan Kuadrat"
                    value={newChapterTitle}
                    onChange={(e) => setNewChapterTitle(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.modalActions}>
                  <button type="button" className={styles.cancelBtn} onClick={() => setShowAddModal(false)}>Batal</button>
                  <button type="submit" className={styles.submitBtn} disabled={submitting}>
                    {submitting ? 'Menyimpan...' : 'Simpan Bab'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
              {/* Modal Hapus */}
      {isDeleteModalOpen && chapterToDelete && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ animation: 'fadeIn 0.2s ease-out' }}>
            <div className={styles.modalHeader}>
              <h2 style={{ color: '#1e293b', fontSize: '1.35rem', fontWeight: 800 }}>Konfirmasi Hapus</h2>
              <button className={styles.closeBtn} onClick={() => setIsDeleteModalOpen(false)}>
                <FaXmark />
              </button>
            </div>
            
            <div style={{ margin: '1rem 0 1.5rem 0', color: '#475569', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Apakah kamu yakin ingin menghapus bab <strong>{chapterToDelete.title || chapterToDelete.chapterTitle}</strong>? 
              <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: 500 }}>
                ⚠️ Seluruh data PDF, Latihan, dan Ulangan di dalam bab ini akan ikut terhapus permanen.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button" 
                className={styles.cancelBtn} 
                onClick={() => setIsDeleteModalOpen(false)} 
                style={{ flex: 1 }}
              >
                Batal
              </button>
              <button 
                type="button" 
                className={styles.submitBtn} 
                onClick={handleConfirmDelete} 
                style={{ flex: 1, backgroundColor: '#ef4444', color: 'white', border: 'none' }}
              >
                Ya, Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    );
  }

  // RENDER LEVEL 1: PILIH MATA PELAJARAN UTAMA
  return (
    <div className={styles.adminContainer}>
      <Toaster />
      <header className={styles.adminHeader}>
        <h1>Manajemen Materi & Bab</h1>
        <p className={styles.subtitleHeader}>Pilih mata pelajaran untuk mengelola struktur data PDF, Latihan, dan Ulangan.</p>
      </header>
      <main className={styles.adminMain}>
        <div className={styles.mapelGrid}>
          {listMapel.map((mapel) => (
            <div key={mapel.id} className={styles.mapelCard} onClick={() => setSelectedMapel(mapel.id)}>
              <div className={styles.iconCircle} style={{ backgroundColor: `${mapel.color}15`, color: mapel.color }}>
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
