// client/src/pages/admin/MateriSubjectPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../config/firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  doc,   
  updateDoc
} from 'firebase/firestore';
import styles from './MateriSubjectPage.module.css';
import toast, { Toaster } from 'react-hot-toast';
import { 
  FaArrowLeft, 
  FaPlus, 
  FaBookOpen, 
  FaSpinner, 
  FaFolderOpen,
  FaXmark
} from 'react-icons/fa6';

// IMPOR KOMPONEN MANAJER KONTEN YANG BARU
import ChapterContentManager from '../../components/admin/ChapterContentManager';

const MateriSubjectPage = () => {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  
  // State data bab
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State Modal Tambah Bab
  const [showModal, setShowModal] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterOrder, setNewChapterOrder] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // STATE UNTUK TRACKING BAB YANG SEDANG DIKLIK / DIEDIT
  const [selectedChapterId, setSelectedChapterId] = useState(null);

  // Data nama mapel lokal berdasarkan ID parameter URL
  const mapelNames = {
    mtk: 'Matematika',
    ipa: 'Sains (IPA)',
    ips: 'IPS',
    inggris: 'Bahasa Inggris',
    indonesia: 'Bahasa Indonesia'
  };

  const currentSubjectName = mapelNames[subjectId] || 'Mata Pelajaran';

  // 1. Ambil data Bab dari Firestore
  const fetchChapters = async (targetSubjectId) => {
    // Gunakan parameter fungsi atau fallback ke useParams jika parameter kosong
    const idToFetch = targetSubjectId || subjectId;
    if (!idToFetch) return;

    setLoading(true);
    try {
      // Query ke Firestore HANYA menggunakan 'where', hilangkan 'orderBy' agar bebas dari composite index
      const q = query(
        collection(db, 'chapters'), 
        where('subjectId', '==', idToFetch)
      );
      
      const querySnapshot = await getDocs(q);
      
      // Ambil datanya
      const chaptersData = querySnapshot.docs.map((doc) => ({ 
        id: doc.id, 
        ...doc.data() 
      }));

      // KITA URUTKAN PAKAI JAVASCRIPT
      chaptersData.sort((a, b) => parseInt(a.order || 0) - parseInt(b.order || 0));

      // Set ke state
      setChapters(chaptersData);
      
    } catch (err) {
      console.error('Error fetching chapters:', err);
      toast.error('Gagal memuat data bab');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subjectId) {
      fetchChapters(subjectId);
    }
  }, [subjectId]);

  // 2. Tambah Bab Baru ke Firestore + Otomatis Naikkan Versi Cache Metadata
  const handleAddChapterSubmit = async (e) => {
    e.preventDefault();
    if (!newChapterTitle.trim() || !newChapterOrder) {
      toast.error('Semua kolom formulir wajib diisi!');
      return;
    }

    setSubmitting(true);
    try {
      // A. Ambil versi lama dari metadata/forum_version terlebih dahulu
      const versionRef = doc(db, 'metadata', 'forum_version');
      const querySnapshotVersion = await getDocs(query(collection(db, 'metadata'), where('__name__', '==', 'forum_version')));
      
      let currentVersion = 0;
      if (!querySnapshotVersion.empty) {
        currentVersion = querySnapshotVersion.docs[0].data().version || 0;
      }
      const nextVersion = currentVersion + 1;

      // B. Buat dokumen bab baru seperti biasa
      const docData = {
        subjectId: subjectId,
        title: newChapterTitle.trim(),
        order: parseInt(newChapterOrder, 10),
        pdfUrl: '',
        latihanSoal: null,
        miniUlangan: null,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'chapters'), docData);

      // C. 🚀 SEKALIGUS UPDATE VERSI METADATA (Memicu HP Siswa Refresh Cache)
      await updateDoc(versionRef, {
        version: nextVersion
      });
      
      toast.success(`Bab baru berhasil disimpan & data dipublish ke versi ${nextVersion}! 🚀`);
      setNewChapterTitle('');
      setNewChapterOrder('');
      setShowModal(false);
      
      fetchChapters(subjectId);
    } catch (error) {
      console.error("Error adding chapter and updating metadata:", error);
      toast.error('Gagal menambahkan bab atau memperbarui server.');
    } finally {
      setSubmitting(false);
    }
  };


  // Pemicu pergantian konten dinamis saat bab diklik
  const handleChapterClick = (chapterId) => {
    setSelectedChapterId(chapterId);
  };

  // JIKA ADMIN SEDANG MENGKLIK SEBUAH BAB, TAMPILKAN HALAMAN MANAJER KONTENNYA
  if (selectedChapterId) {
    return (
      <ChapterContentManager 
        subjectId={subjectId} 
        chapterId={selectedChapterId} 
        onBack={() => {
          setSelectedChapterId(null); // Tutup halaman editor dan kembali ke daftar list bab
          fetchChapters(subjectId);   // Ambil ulang data terupdate
        }} 
      />
    );
  }

  // TAMPILAN DEFAULT: MENAMPILKAN DAFTAR BAB MAPEL
  return (
    <div className={styles.subjectContainer}>
      <Toaster />
      
      <header className={styles.subjectHeader}>
        <div className={styles.headerInfoRow}>
          <div>
            <h1>Bab Belajar: {currentSubjectName}</h1>
            <p className={styles.subtitleHeader}>Kelola urutan bab beserta rangkuman isi materi pembelajaran siswa.</p>
          </div>
          <button className={styles.addBtn} onClick={() => setShowModal(true)}>
            <FaPlus /> Tambah Bab Baru
          </button>
        </div>
      </header>

      <main className={styles.subjectMain}>
        {loading ? (
          <div className={styles.loadingArea}>
            <FaSpinner className={styles.spinnerIcon} />
            <p>Sedang mengambil daftar bab dari cloud database...</p>
          </div>
        ) : chapters.length > 0 ? (
          <div className={styles.chapterList}>
            {chapters.map((chapter) => (
              <div 
                key={chapter.id} 
                className={styles.chapterCard}
                onClick={() => handleChapterClick(chapter.id)}
              >
                <div className={styles.chapterCardLeft}>
                  <div className={styles.orderBadge}>Bab {chapter.order}</div>
                  <h3 className={styles.chapterTitle}>{chapter.title}</h3>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyArea}>
            <FaFolderOpen className={styles.emptyIcon} />
            <h3>Belum Ada Bab yang Dibuat</h3>
            <p>Mata pelajaran ini masih kosong. Silakan klik tombol di kanan atas untuk membuat bab materi pertama kamu!</p>
          </div>
        )}
      </main>

      {/* ==================== MODAL DIALOG POPUP TAMBAH BAB ==================== */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Buat Bab Baru</h2>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
                <FaXmark />
              </button>
            </div>
            
            <form onSubmit={handleAddChapterSubmit}>
              <div className={styles.formGroup}>
                <label htmlFor="chapterOrder">Nomor Urutan Bab</label>
                <input
                  type="number"
                  id="chapterOrder"
                  min="1"
                  placeholder="Contoh: 1"
                  value={newChapterOrder}
                  onChange={(e) => setNewChapterOrder(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="chapterTitle">Judul Materi Bab</label>
                <input
                  type="text"
                  id="chapterTitle"
                  placeholder="Contoh: Aljabar Linear / Besaran Fisika"
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <div className={styles.modalActions}>
                <button 
                  type="button" 
                  className={styles.cancelBtn} 
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className={styles.submitBtn}
                  disabled={submitting}
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Bab'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MateriSubjectPage;
