import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import toast from 'react-hot-toast';
import styles from './QuizListPage.module.css';
import ImportQuizModal from '../../components/admin/ImportQuizModal';
import { 
  FaPlus, 
  FaSpinner, 
  FaTrash, 
  FaFileExport, 
  FaArrowLeft, 
  FaFileImport,
  FaCalculator, 
  FaFlask, 
  FaGlobeAsia, 
  FaLanguage, 
  FaBook,
  FaFolderOpen
} from 'react-icons/fa';

const QuizListPage = () => {
  // Navigation states
  const [selectedMapel, setSelectedMapel] = useState(null); // Menyimpan ID mapel (e.g., 'mtk')
  const [selectedTheme, setSelectedTheme] = useState(null); // Menyimpan objek tema aktif
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
const [themeToDelete, setThemeToDelete] = useState(null);

  // Data & loading states
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Modal Tambah Tema Manual States
  const [isAddThemeModalOpen, setIsAddThemeModalOpen] = useState(false);
  const [newThemeNumber, setNewThemeNumber] = useState('');
  const [newThemeName, setNewThemeName] = useState('');

  // 5 Daftar Mapel Wajib disamakan persis dengan MateriListPage
  const listMapel = [
    { id: 'mtk', name: 'Matematika', icon: <FaCalculator />, color: '#ef4444', desc: 'Evaluasi kuis aljabar, geometri, & hitungan dasar' },
    { id: 'ipa', name: 'Sains (IPA)', icon: <FaFlask />, color: '#10b981', desc: 'Evaluasi kuis fisika, biologi, & kimia dasar' },
    { id: 'ips', name: 'IPS', icon: <FaGlobeAsia />, color: '#f59e0b', desc: 'Evaluasi kuis sejarah, sosiologi, & geografi' },
    { id: 'inggris', name: 'Bahasa Inggris', icon: <FaLanguage />, color: '#3b82f6', desc: 'Evaluasi kuis grammar, tenses, & reading' },
    { id: 'indonesia', name: 'Bahasa Indonesia', icon: <FaBook />, color: '#8b5cf6', desc: 'Evaluasi kuis struktur teks, sastra, & ejaan' }
  ];

  // Mengambil data tema kuis dari Firestore
  const fetchThemes = async () => {
    if (!selectedMapel) return;
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'dailyPaths'));
      const allData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      
      // Filter berdasarkan mapel aktif, lalu urutkan secara numerik (Q1, Q2, Q3...)
      const filtered = allData
        .filter((item) => item.mapel?.toLowerCase() === selectedMapel.toLowerCase())
        .sort((a, b) => {
          const numA = parseInt(a.themeCode?.replace(/^\D+/g, '')) || 0;
          const numB = parseInt(b.themeCode?.replace(/^\D+/g, '')) || 0;
          return numA - numB;
        });

      setThemes(filtered);
    } catch (err) {
      console.error('Error fetching themes:', err);
      toast.error('Gagal memuat data tema.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThemes();
  }, [selectedMapel]);

  // Handle Tambah Tema Baru (Sistem Popup Modal disamakan dengan MateriSubjectPage)
  const handleCreateTheme = async (e) => {
    e.preventDefault();
    if (!newThemeNumber || !newThemeName.trim()) {
      toast.error('Semua kolom formulir wajib diisi!');
      return;
    }

    const formattedCode = `Q${newThemeNumber.replace(/^\D+/g, '')}`;

    try {
      const newThemeObj = {
        mapel: selectedMapel,
        themeCode: formattedCode,
        theme: newThemeName.trim(),
        units: []
      };

      await addDoc(collection(db, 'dailyPaths'), newThemeObj);
      toast.success(`Tema ${formattedCode} berhasil disimpan ke database! 🚀`);
      
      setNewThemeNumber('');
      setNewThemeName('');
      setIsAddThemeModalOpen(false);
      fetchThemes();
    } catch (err) {
      console.error(err);
      toast.error('Gagal menambahkan tema baru.');
    }
  };

  // Handle Hapus Tema
  const triggerDeleteTheme = (e, themeItem) => {
  e.stopPropagation(); // Mencegah masuk ke halaman kelola soal
  setThemeToDelete(themeItem);
  setIsDeleteModalOpen(true);
};

// Fungsi eksekusi hapus setelah dikonfirmasi di dalam modal
const handleConfirmDelete = async () => {
  if (!themeToDelete) return;
  
  try {
    await deleteDoc(doc(db, 'dailyPaths', themeToDelete.id));
    toast.success(`Tema "${themeToDelete.theme}" berhasil dihapus.`);
    setIsDeleteModalOpen(false);
    setThemeToDelete(null);
    fetchThemes(); // Refresh daftar tema
  } catch (err) {
    toast.error('Gagal menghapus tema.');
  }
};

  // Handle Sukses Import via JSON
  const handleImportJsonSuccess = async (parsedData) => {
    if (!selectedTheme) {
      toast.error("Tidak ada paket kuis aktif yang dipilih!");
      return;
    }

    setLoading(true);
    try {
      // Ambil referensi dokumen paket kuis yang sedang aktif berdasarkan ID-nya
      const themeDocRef = doc(db, 'dailyPaths', selectedTheme.id);

      // Validasi: Harus berupa objek dan wajib memiliki properti 'units' yang berbentuk Array
      if (!parsedData || !parsedData.units || !Array.isArray(parsedData.units)) {
        throw new Error("Format JSON tidak valid! Harus berupa objek dengan properti 'units' berisi array soal.");
      }

      // Ambil data array soal langsung dari properti units
      const importedUnits = parsedData.units;

      // Lakukan updateDoc untuk menimpa field 'units' pada dokumen kuis ini dengan array baru
      await updateDoc(themeDocRef, {
        units: importedUnits
      });
      
      toast.success(`Data soal kuis berhasil ditimpakan ke paket ini! 🚀`);
      
      // Perbarui state lokal selectedTheme agar tampilan daftar soal di layar langsung berubah real-time
      setSelectedTheme(prev => ({
        ...prev,
        units: importedUnits
      }));

      // Refresh data utama dari Firestore
      fetchThemes(); 
      setIsImportModalOpen(false); // Tutup modal impor
    } catch (err) {
      console.error("Error importing theme data:", err);
      toast.error(err.message || 'Gagal memperbarui data kuis dari JSON.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Ekspor Data ke File JSON
  const exportAsJson = (e, themeItem) => {
    e.stopPropagation();
    try {
      const dataStr = JSON.stringify(themeItem, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', `${themeItem.themeCode}_${themeItem.theme}.json`);
      linkElement.click();
      toast.success('Tema kuis berhasil diekspor ke JSON.');
    } catch (error) {
      toast.error('Gagal mengekspor data.');
    }
  };

  // Data Mapel Aktif Saat Ini
  const currentMapelData = listMapel.find(m => m.id === selectedMapel);

  // =========================================================================
  // LEVEL 3 VIEW: MANAGE KONTEN SOAL FILE JSON (Halaman khusus Manage Tema)
  // =========================================================================
  if (selectedMapel && selectedTheme) {
    return (
      <div className={styles.adminContainer}>
        <header className={styles.adminHeader}>
          <button onClick={() => setSelectedTheme(null)} className={styles.navButton}>
            <FaArrowLeft /> Kembali ke Daftar Tema
          </button>
          <h1>Kelola Soal: {selectedTheme.themeCode} - {selectedTheme.theme}</h1>
          <p className={styles.subtitleHeader}>Tempat peletakan file JSON kuis dan komponen soal-soal latihan.</p>
        </header>

        <main className={styles.adminMain}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ margin: 0, color: 'var(--text-color, #1e293b)' }}>Struktur Array Pertanyaan (Units)</h3>
            <button onClick={() => setIsImportModalOpen(true)} className={styles.addButton} style={{ backgroundColor: '#10b981', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}>
              <FaFileImport /> Import Data Kuis JSON
            </button>
          </div>
          
          <div style={{ backgroundColor: '#1e1e1e', color: '#a9b7c6', padding: '1.5rem', borderRadius: '12px', fontFamily: 'monospace', overflowX: 'auto', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
            <pre style={{ margin: 0 }}>{JSON.stringify(selectedTheme.units || [], null, 2)}</pre>
          </div>
        </main>

        <ImportQuizModal 
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImportSuccess={handleImportJsonSuccess}
        />
      </div>
    );
  }

  // =========================================================================
  // LEVEL 2 VIEW: DAFTAR TEMA (Q1, Q2, dst) berdasarkan Mapel Terpilih
  // =========================================================================
  if (selectedMapel) {
    return (
      <div className={styles.adminContainer}>
        <header className={styles.adminHeader}>
          <button onClick={() => setSelectedMapel(null)} className={styles.navButton}>
            <FaArrowLeft /> Kembali ke Mapel
          </button>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginTop: '1rem' }}>
            <div>
              <h1 style={{ margin: 0 }}>Tema Kuis: {currentMapelData?.name}</h1>
              <p className={styles.subtitleHeader}>Daftar urutan tema kuis yang disusun berurutan dari Q1 sampai seterusnya.</p>
            </div>
            <button className={styles.addButton} onClick={() => setIsAddThemeModalOpen(true)}>
              <FaPlus /> Tambah Tema Baru
            </button>
          </div>
        </header>

        <main className={styles.adminMain}>
          {loading ? (
            <div className={styles.loadingArea}>
              <FaSpinner className={styles.spinnerIcon} />
              <p>Sedang mengambil daftar tema dari cloud database...</p>
            </div>
          ) : themes.length > 0 ? (
            <div className={styles.chapterList}>
              {themes.map((item) => (
                <div 
                  key={item.id} 
                  className={styles.chapterCard}
                  onClick={() => setSelectedTheme(item)}
                >
                  <div className={styles.chapterCardLeft}>
                    <div className={styles.orderBadge}>{item.themeCode}</div>
                    <h3 className={styles.chapterTitle}>{item.theme}</h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-color-subtle, #64748b)', marginLeft: '0.5rem' }}>
                      ({item.units?.length || 0} Soal Tersemat)
                    </span>
                  </div>
                  
                  <div className={styles.themeActions} onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={(e) => triggerDeleteTheme(e, item)} 
                      className={`${styles.actionButton} ${styles.deleteButton}`} 
                      title="Hapus Tema"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyArea}>
              <FaFolderOpen className={styles.emptyIcon} />
              <h3>Belum Ada Tema Kuis</h3>
              <p>Mata pelajaran ini belum memiliki kode kuis. Klik tombol di kanan atas untuk membuat nomor urut kuis pertama Anda!</p>
            </div>
          )}
        </main>

        {/* POP-UP DIALOG MODAL TAMBAH TEMA (Persis Gaya MateriSubjectPage) */}
        {isAddThemeModalOpen && (
          <div className={styles.modalOverlay} onClick={() => setIsAddThemeModalOpen(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Buat Tema Baru ({currentMapelData?.name})</h2>
                <button className={styles.closeBtn} onClick={() => setIsAddThemeModalOpen(false)}>
                  
                </button>
              </div>
              
              <form onSubmit={handleCreateTheme}>
                <div className={styles.formGroup}>
                  <label>Nomor Urut Tema (Hanya Angka)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Contoh: 1 (Akan menjadi Q1)"
                    value={newThemeNumber}
                    onChange={(e) => setNewThemeNumber(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Nama Judul Tema Kuis</label>
                  <input
                    type="text"
                    placeholder="Contoh: Operasi Aljabar & Aritmatika"
                    value={newThemeName}
                    onChange={(e) => setNewThemeName(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.modalActions}>
                  <button 
                    type="button" 
                    className={styles.cancelBtn} 
                    onClick={() => setIsAddThemeModalOpen(false)}
                  >
                    Batal
                  </button>
                  <button type="submit" className={styles.submitBtn}>
                    Simpan Tema
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* POP-UP DIALOG MODAL HAPUS CUSTOM (Bermaterial Blur & Animasi) */}
{isDeleteModalOpen && themeToDelete && (
  <div className={styles.modalOverlay} onClick={() => setIsDeleteModalOpen(false)}>
    <div className={styles.modalContent} style={{ maxWidth: '400px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
      <div style={{ color: '#ef4444', fontSize: '3.5rem', marginBottom: '1rem' }}>
        <FaTrash />
      </div>
      
      <h2 style={{ margin: '0 0 0.75rem 0', fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-color, #1e293b)' }}>
        Hapus Tema Kuis?
      </h2>
      
      <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: 'var(--text-color-subtle, #64748b)', lineHeight: '1.5' }}>
        Apakah Anda yakin ingin menghapus tema <strong style={{ color: '#1e293b' }}>{themeToDelete.themeCode} - {themeToDelete.theme}</strong>?<br />
        Tindakan ini akan menghapus seluruh data array soal di dalamnya secara permanen.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
        <button 
          type="button" 
          className={styles.cancelBtn} 
          onClick={() => setIsDeleteModalOpen(false)}
          style={{ width: '100%', padding: '0.75rem' }}
        >
          Batal
        </button>
        <button 
          type="button" 
          className={styles.submitBtn} 
          onClick={handleConfirmDelete}
          style={{ backgroundColor: '#ef4444', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)', width: '100%', padding: '0.75rem' }}
        >
          Ya, Hapus
        </button>
      </div>
    </div>
  </div>
)}

      </div>
    );
  }

  // =========================================================================
  // LEVEL 1 VIEW: UTAMA - PILIH MAPEL (Menggunakan Grid Card Indah dari Materi)
  // =========================================================================
  return (
    <div className={styles.adminContainer}>
      <header className={styles.adminHeader}>
        <h1>Manajemen Kuis</h1>
        <p className={styles.subtitleHeader}>Klik kelola kuis untuk menampilkan list mata pelajaran wajib di bawah ini.</p>
      </header>

      <main className={styles.adminMain}>
        <div className={styles.mapelGrid}>
          {listMapel.map((mapel) => (
            <div 
              key={mapel.id} 
              className={styles.mapelCard} 
              onClick={() => setSelectedMapel(mapel.id)}
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

export default QuizListPage;
