// client/src/components/admin/ChapterContentManager.jsx

import React, { useState, useEffect, useRef } from 'react';
// 1. IMPORT_STORAGE DARI CONFIGURASI FIREBASE KAMU
import { db, storage } from '../../config/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
// 2. IMPORT UNTUK KEPERLUAN UPLOAD FILE PDF KE STORAGE
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast, { Toaster } from 'react-hot-toast';
import { 
  FaArrowLeft, 
  FaSave, 
  FaFilePdf, 
  FaCode, 
  FaGraduationCap, 
  FaSpinner,
  FaFileUpload,
  FaFileCode
} from 'react-icons/fa';
import styles from './ChapterContentManager.module.css';

const ChapterContentManager = ({ subjectId, chapterId, onBack }) => {
  const [chapter, setChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('pdf');

  // State Input Form Konten
  const [pdfUrl, setPdfUrl] = useState('');
  // 3. STATE BARU UNTUK MENAMPUNG FILE PDF BARU YANG DI-UPLOAD
  const [newPdfFile, setNewPdfFile] = useState(null);
  const [latihanJson, setLatihanJson] = useState('');
  const [ulanganJson, setUlanganJson] = useState('');

  // Ref untuk mereset input file HTML jika dibutuhkan
  const fileInputPdfRef = useRef(null);
  const fileInputLatihanRef = useRef(null);
  const fileInputUlanganRef = useRef(null);

  const jsonTemplate = [
    {
      "id": 1,
      "question": "Contoh pertanyaan soal di sini?",
      "options": ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
      "answer": "Pilihan A",
      "explanation": "Penjelasan mengapa pilihan A benar ditulis di sini."
    }
  ];

  useEffect(() => {
    const fetchChapterDetail = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'chapters', chapterId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setChapter(data);
          setPdfUrl(data.pdfUrl || '');
          setLatihanJson(data.latihanSoal ? JSON.stringify(data.latihanSoal, null, 2) : '');
          setUlanganJson(data.miniUlangan ? JSON.stringify(data.miniUlangan, null, 2) : '');
        } else {
          toast.error('Bab tidak ditemukan!');
          onBack();
        }
      } catch (err) {
        console.error('Error fetching chapter:', err);
        toast.error('Gagal memuat detail bab.');
      } finally {
        setLoading(false);
      }
    };

    if (chapterId) {
      fetchChapterDetail();
    }
  }, [chapterId, onBack]);

  // LOGIKA: Memvalidasi berkas PDF yang dimasukkan oleh Admin
  const handlePdfFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Berkas harus berformat .pdf!');
        e.target.value = null;
        setNewPdfFile(null);
        return;
      }
      setNewPdfFile(file);
      toast.success('File PDF baru siap diunggah! 📄');
    }
  };

  // LOGIKA UTAMA: Membaca file .json yang diunggah
  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/json" && !file.name.endsWith('.json')) {
      toast.error('Berkas harus berformat .json!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target.result;
        const parsed = JSON.parse(result);
        const formattedJson = JSON.stringify(parsed, null, 2);

        if (type === 'latihan') {
          setLatihanJson(formattedJson);
          toast.success('File JSON Latihan berhasil dimuat! 📄');
        } else if (type === 'ulangan') {
          setUlanganJson(formattedJson);
          toast.success('File JSON Mini Ulangan berhasil dimuat! 📄');
        }
      } catch (error) {
        toast.error('Isi file JSON tidak valid! Periksa sintaksisnya.');
      }
    };

    reader.readAsText(file);
  };

  const handleSaveContent = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let parsedLatihan = null;
      let parsedUlangan = null;
      let finalPdfUrl = pdfUrl; // Definisikan default URL lama

      // A. JIKA ADMIN MEMILIH FILE PDF BARU, PROSES UPLOAD KE STORAGE DULU
      if (newPdfFile) {
        toast.loading('Sedang mengunggah berkas PDF baru...', { id: 'pdfUploadProgress' });
        const fileExtension = newPdfFile.name.split('.').pop();
        const uniqueFileName = `${subjectId || 'materi'}_${chapterId}_${Date.now()}.${fileExtension}`;
        const storageRef = ref(storage, `materi_pdf/${uniqueFileName}`);
        
        const metadata = {
    contentType: 'application/pdf'
  };
        
        const uploadResult = await uploadBytes(storageRef, newPdfFile, metadata);
        finalPdfUrl = await getDownloadURL(uploadResult.ref);
        toast.dismiss('pdfUploadProgress');
      }

      if (latihanJson.trim()) {
        try {
          parsedLatihan = JSON.parse(latihanJson);
          if (!Array.isArray(parsedLatihan)) throw new Error("Data kuis harus berupa Array objek");
        } catch (e) {
          throw new Error("Format JSON Latihan Soal tidak valid! Periksa koma atau tanda kurung.");
        }
      }

      if (ulanganJson.trim()) {
        try {
          parsedUlangan = JSON.parse(ulanganJson);
          if (!Array.isArray(parsedUlangan)) throw new Error("Data ulangan harus berupa Array objek");
        } catch (e) {
          throw new Error("Format JSON Mini Ulangan tidak valid! Periksa koma atau tanda kurung.");
        }
      }
  
      const docRef = doc(db, 'chapters', chapterId);

      const updatedData = {
        pdfUrl: finalPdfUrl.trim(), // Memakai hasil link final berkas terunggah
        latihanSoal: parsedLatihan,
        miniUlangan: parsedUlangan,
        updatedAt: new Date()
      };

      await updateDoc(docRef, updatedData);

      // Perbarui lokal state URL jika berhasil
      setPdfUrl(finalPdfUrl);
      setNewPdfFile(null); // Reset file handler
      if (fileInputPdfRef.current) fileInputPdfRef.current.value = '';

      toast.success('Isi konten bab sukses diperbarui! 💾');
    } catch (error) {
      toast.dismiss('pdfUploadProgress');
      toast.error(error.message || 'Gagal menyimpan isi konten.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingArea}>
        <FaSpinner className={styles.spinnerIcon} />
        <p>Memuat pengelola konten bab...</p>
      </div>
    );
  }

  return (
    <div className={styles.managerContainer}>
      <Toaster />
      <header className={styles.managerHeader}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          <FaArrowLeft /> Kembali ke Daftar Bab
        </button>
        <div className={styles.titleRow}>
          <div>
            <h1>Kelola Konten: {chapter?.title}</h1>
            <p className={styles.subtitle}>Bab {chapter?.order} &bull; Atur berkas PDF dan kuis kustom JSON via teks atau unggah file.</p>
          </div>
        </div>
      </header>

      <div className={styles.managerContentCard}>
        <div className={styles.tabNavbar}>
          <button type="button" className={`${styles.tabItem} ${activeTab === 'pdf' ? styles.tabActive : ''}`} onClick={() => setActiveTab('pdf')}><FaFilePdf /> Rangkuman PDF</button>
          <button type="button" className={`${styles.tabItem} ${activeTab === 'latihan' ? styles.tabActive : ''}`} onClick={() => setActiveTab('latihan')}><FaCode /> Latihan Soal (JSON)</button>
          <button type="button" className={`${styles.tabItem} ${activeTab === 'ulangan' ? styles.tabActive : ''}`} onClick={() => setActiveTab('ulangan')}><FaGraduationCap /> Mini Ulangan (JSON)</button>
        </div>

        <form onSubmit={handleSaveContent} className={styles.contentForm}>
          {/* TAB 1: MANAJEMEN PDF (SEKARANG VERSI UPLOAD FILE) */}
          {activeTab === 'pdf' && (
            <div className={styles.formSection}>
              <h3><FaFilePdf /> Berkas Rangkuman PDF Materi</h3>
              
              {pdfUrl && (
                <div style={{ marginBottom: '1.25rem', padding: '10px 14px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                  <small style={{ color: '#1e40af', fontWeight: '700', display: 'block' }}>File Terpasang Saat Ini:</small>
                  <a href={pdfUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: '#2563eb', fontWeight: '600', wordBreak: 'break-all' }}>
                    {pdfUrl}
                  </a>
                </div>
              )}

              <div className={styles.uploadBoxWrapper}>
                <div className={styles.uploadHeaderTitle}><FaFileUpload /> Ganti / Unggah File PDF Baru</div>
                <input 
                  type="file" 
                  id="uploadPdfMateriFile" 
                  accept="application/pdf"
                  ref={fileInputPdfRef}
                  onChange={handlePdfFileChange}
                  disabled={submitting}
                  className={styles.fileInputHidden}
                />
                <label htmlFor="uploadPdfMateriFile" className={styles.uploadLabelZone}>
                  <FaFilePdf className={styles.uploadZoneIcon} style={{ color: newPdfFile ? '#16a34a' : '#94a3b8' }} />
                  <span>{newPdfFile ? `Terpilih: ${newPdfFile.name}` : 'Klik untuk memilih file PDF dari komputermu'}</span>
                  <small>Hanya menerima file berekstensi khusus .pdf</small>
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: MANAJEMEN JSON LATIHAN SOAL */}
          {activeTab === 'latihan' && (
            <div className={styles.formSection}>
              <h3><FaCode /> Bank Soal Latihan Bab (Format JSON)</h3>
              
              <div className={styles.uploadBoxWrapper}>
                <div className={styles.uploadHeaderTitle}><FaFileUpload /> Opsi 1: Unggah Berkas File (.json)</div>
                <input 
                  type="file" 
                  id="uploadLatihanFile" 
                  accept=".json,application/json"
                  ref={fileInputLatihanRef}
                  onChange={(e) => handleFileUpload(e, 'latihan')}
                  disabled={submitting}
                  className={styles.fileInputHidden}
                />
                <label htmlFor="uploadLatihanFile" className={styles.uploadLabelZone}>
                  <FaFileCode className={styles.uploadZoneIcon} />
                  <span>Klik untuk pilih file kuis kustom kamu dari komputer</span>
                  <small>Hanya mendukung file berekstensi .json</small>
                </label>
              </div>

              <div className={styles.formGroup} style={{ marginTop: '1.5rem' }}>
                <label><FaCode /> Opsi 2: Edit atau Tempel Kode Teks JSON Langsung</label>
                <textarea rows="12" placeholder={JSON.stringify(jsonTemplate, null, 2)} value={latihanJson} onChange={(e) => setLatihanJson(e.target.value)} disabled={submitting} />
              </div>
            </div>
          )}

          {/* TAB 3: MANAJEMEN JSON MINI ULANGAN */}
          {activeTab === 'ulangan' && (
            <div className={styles.formSection}>
              <h3><FaGraduationCap /> Bank Soal Mini Ulangan (Format JSON)</h3>
              
              <div className={styles.uploadBoxWrapper}>
                <div className={styles.uploadHeaderTitle}><FaFileUpload /> Opsi 1: Unggah Berkas File (.json)</div>
                <input 
                  type="file" 
                  id="uploadUlanganFile" 
                  accept=".json,application/json"
                  ref={fileInputUlanganRef}
                  onChange={(e) => handleFileUpload(e, 'ulangan')}
                  disabled={submitting}
                  className={styles.fileInputHidden}
                />
                <label htmlFor="uploadUlanganFile" className={styles.uploadLabelZone}>
                  <FaFileCode className={styles.uploadZoneIcon} />
                  <span>Klik untuk pilih file ulangan kustom kamu dari komputer</span>
                  <small>Hanya mendukung file berekstensi .json</small>
                </label>
              </div>

              <div className={styles.formGroup} style={{ marginTop: '1.5rem' }}>
                <label><FaCode /> Opsi 2: Edit atau Tempel Kode Teks JSON Langsung</label>
                <textarea rows="12" placeholder={JSON.stringify(jsonTemplate, null, 2)} value={ulanganJson} onChange={(e) => setUlanganJson(e.target.value)} disabled={submitting} />
              </div>
            </div>
          )}

          <div className={styles.formActionsBar}>
            <button type="submit" className={styles.saveBtn} disabled={submitting}>
              {submitting ? <><FaSpinner className={styles.spin} /> Menyimpan...</> : <><FaSave /> Simpan Perubahan</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChapterContentManager;
