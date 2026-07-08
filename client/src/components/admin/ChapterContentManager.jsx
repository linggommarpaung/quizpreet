// client/src/components/admin/ChapterContentManager.jsx

import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../config/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast, { Toaster } from 'react-hot-toast';
import { 
  FaArrowLeft,
  FaFilePdf, 
  FaCode, 
  FaGraduationCap, 
  FaSpinner,
  FaFile,
  FaFileCode,
  FaPlus,
  FaTrash,
  FaPen,
  FaList,
  FaXmark,
  FaTriangleExclamation
} from 'react-icons/fa6';
import styles from './ChapterContentManager.module.css';

const ChapterContentManager = ({ subjectId, chapterId, onBack }) => {
  const [chapter, setChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('pdf');

  // Dropdown Metode: 'form' (Input Manual via Modal) atau 'json' (Upload File .json)
  const [latihanMethod, setLatihanMethod] = useState('form');
  const [ulanganMethod, setUlanganMethod] = useState('form');

  // State Array Utama Bank Soal Terpasang
  const [latihanArray, setLatihanArray] = useState([]);
  const [ulanganArray, setUlanganArray] = useState([]);

  // =========================================================================
  // STATE MODAL INPUT SOAL MANUAL & CONFIRM DELETE
  // =========================================================================
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Penampung index & tipe data yang akan dihapus
  const [deleteTarget, setDeleteTarget] = useState({ index: null, type: '' });

  // State Input Form Soal di dalam Modal
  const [qText, setQText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(0); // Index 0-3 (Opsi A-D)
  const [explanation, setExplanation] = useState('');
  const [editQuestionIndex, setEditQuestionIndex] = useState(null); // null jika tambah baru

  // State File PDF & URL
  const [pdfUrl, setPdfUrl] = useState('');
  const [newPdfFile, setNewPdfFile] = useState(null);

  // Ref Input Berkas File
  const fileInputPdfRef = useRef(null);
  const fileInputLatihanRef = useRef(null);
  const fileInputUlanganRef = useRef(null);

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
          setLatihanArray(Array.isArray(data.latihanSoal) ? data.latihanSoal : []);
          setUlanganArray(Array.isArray(data.miniUlangan) ? data.miniUlangan : []);
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

  // Reset form internal manual setiap kali selesai aksi atau tutup modal
  const resetManualForm = () => {
    setQText('');
    setOptions(['', '', '', '']);
    setCorrectAnswer(0);
    setExplanation('');
    setEditQuestionIndex(null);
    setIsQuestionModalOpen(false);
  };

  // Handler validasi PDF materi
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

  // Handler Upload File .JSON langsung dimasukkan ke array penampung
  const handleJsonFileUpload = (e, targetType) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/json" && !file.name.endsWith('.json')) {
      toast.error('Berkas harus berformat .json!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!Array.isArray(parsed)) {
          toast.error('Isi JSON harus berupa Array Kumpulan Objek Soal!');
          return;
        }

        const validatedArray = parsed.map((item) => {
          let ansText = item.answer;
          if (typeof item.answer === 'number' && Array.isArray(item.options)) {
            ansText = item.options[item.answer] || '';
          }
          return {
            id: item.id || Date.now() + Math.random(),
            question: item.question || '',
            options: Array.isArray(item.options) ? item.options : ['', '', '', ''],
            answer: ansText || '',
            explanation: item.explanation || ''
          };
        });

        if (targetType === 'latihan') {
          setLatihanArray(validatedArray);
          toast.success(`Berhasil memuat ${validatedArray.length} soal latihan dari JSON!`);
        } else if (targetType === 'ulangan') {
          setUlanganArray(validatedArray);
          toast.success(`Berhasil memuat ${validatedArray.length} soal ulangan dari JSON!`);
        }
      } catch (error) {
        toast.error('Isi file JSON rusak atau salah penulisan sintaks!');
      }
    };
    reader.readAsText(file);
  };

  // =========================================================================
  // LOGIKA TAMBAH ATAU UPDATE SOAL MANUAL KE LIST SEMENTARA VIA MODAL
  // =========================================================================
  const handleSaveQuestionToList = () => {
    if (!qText.trim()) {
      toast.error('Pertanyaan soal tidak boleh kosong!');
      return;
    }
    if (options.some(opt => !opt.trim())) {
      toast.error('Semua pilihan opsi (A, B, C, D) harus diisi!');
      return;
    }

    const selectedAnswerText = options[correctAnswer];

    const newQuestionObj = {
      id: editQuestionIndex !== null 
        ? (activeTab === 'latihan' ? latihanArray[editQuestionIndex].id : ulanganArray[editQuestionIndex].id)
        : Date.now(),
      question: qText.trim(),
      options: options.map(o => o.trim()),
      answer: selectedAnswerText,
      explanation: activeTab === 'latihan' ? explanation.trim() : '' 
    };

    if (activeTab === 'latihan') {
      if (editQuestionIndex !== null) {
        const updated = [...latihanArray];
        updated[editQuestionIndex] = newQuestionObj;
        setLatihanArray(updated);
        toast.success('Soal latihan berhasil diperbarui!');
      } else {
        setLatihanArray([...latihanArray, newQuestionObj]);
        toast.success('Soal latihan berhasil ditambahkan!');
      }
    } else if (activeTab === 'ulangan') {
      if (editQuestionIndex !== null) {
        const updated = [...ulanganArray];
        updated[editQuestionIndex] = newQuestionObj;
        setUlanganArray(updated);
        toast.success('Soal ulangan berhasil diperbarui!');
      } else {
        setUlanganArray([...ulanganArray, newQuestionObj]);
        toast.success('Soal ulangan berhasil ditambahkan!');
      }
    }

    resetManualForm();
  };

  // Mode Edit Soal -> Pemicu Buka Modal Soal beserta datanya
  const startEditQuestion = (index, type) => {
    const targetItem = type === 'latihan' ? latihanArray[index] : ulanganArray[index];
    setQText(targetItem.question);
    setOptions([...targetItem.options]);
    setExplanation(targetItem.explanation || '');
    setEditQuestionIndex(index);

    const foundIdx = targetItem.options.findIndex(opt => opt === targetItem.answer);
    setCorrectAnswer(foundIdx !== -1 ? foundIdx : 0);
    
    setIsQuestionModalOpen(true);
  };

  // Memicu Custom Dialog Hapus Soal
  const triggerDeleteConfirm = (index, type) => {
    setDeleteTarget({ index, type });
    setIsDeleteModalOpen(true);
  };

  // Mengeksekusi Penghapusan Soal dari Custom Modal
  const executeDeleteQuestion = () => {
    const { index, type } = deleteTarget;
    if (index === null) return;

    if (type === 'latihan') {
      setLatihanArray(latihanArray.filter((_, i) => i !== index));
    } else {
      setUlanganArray(ulanganArray.filter((_, i) => i !== index));
    }

    toast.success('Soal berhasil dihapus dari antrean.');
    setIsDeleteModalOpen(false);
    setDeleteTarget({ index: null, type: '' });
  };

  // =========================================================================
  // AKSI SIMPAN PERMANEN KESELURUHAN DATA KE FIREBASE
  // =========================================================================
  const handleSaveAllContent = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let finalPdfUrl = pdfUrl;

      if (newPdfFile) {
        toast.loading('Sedang mengunggah berkas PDF baru...', { id: 'pdfUploadProgress' });
        const fileExtension = newPdfFile.name.split('.').pop();
        const uniqueFileName = `${subjectId || 'materi'}_${chapterId}_${Date.now()}.${fileExtension}`;
        const storageRef = ref(storage, `materi_pdf/${uniqueFileName}`);
        
        const uploadResult = await uploadBytes(storageRef, newPdfFile, { contentType: 'application/pdf' });
        finalPdfUrl = await getDownloadURL(uploadResult.ref);
        toast.dismiss('pdfUploadProgress');
      }
  
      const docRef = doc(db, 'chapters', chapterId);
      await updateDoc(docRef, {
        pdfUrl: finalPdfUrl.trim(),
        latihanSoal: latihanArray, 
        miniUlangan: ulanganArray,  
        updatedAt: new Date()
      });

      setPdfUrl(finalPdfUrl);
      setNewPdfFile(null);
      if (fileInputPdfRef.current) fileInputPdfRef.current.value = '';

      toast.success('Seluruh isi konten Bab berhasil disimpan permanen! 💾');
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
        <FaSpinner className={styles.spin} style={{ fontSize: '2rem', color: '#4f46e5' }} />
        <p>Memuat pengelola konten bab...</p>
      </div>
    );
  }

  return (
    <div className={styles.managerContainer}>
      <Toaster />
      
      <header className={styles.managerHeader}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          <FaArrowLeft /> Kembali
        </button>
        <div className={styles.titleRow}>
          <h1>Kelola Konten: {chapter?.title}</h1>
          <p className={styles.subtitle}>Bab {chapter?.order} &bull; Unggah ringkasan materi PDF, kelola bank soal latihan dan kuis mini ulangan.</p>
        </div>
      </header>

      {/* STICKY NAVBAR TAB MENU - MENEMPEL DI ATAS SAAT DI-SCROLL */}
      <nav className={styles.stickyNavbar}>
        <button type="button" className={`${styles.tabItem} ${activeTab === 'pdf' ? styles.tabActive : ''}`} onClick={() => { setActiveTab('pdf'); }}><FaFilePdf />Materi</button>
        <button type="button" className={`${styles.tabItem} ${activeTab === 'latihan' ? styles.tabActive : ''}`} onClick={() => { setActiveTab('latihan'); }}><FaCode /> Latihan</button>
        <button type="button" className={`${styles.tabItem} ${activeTab === 'ulangan' ? styles.tabActive : ''}`} onClick={() => { setActiveTab('ulangan'); }}><FaGraduationCap /> Ulangan</button>
      </nav>

      {/* FORM UTAMA LANGSUNG DI HALAMAN TANPA DIV CARD PEMBUNGKUS */}
      <form onSubmit={handleSaveAllContent} className={styles.contentForm}>
        
        {/* TAB 1: RANGKUMAN PDF MATERI */}
        {activeTab === 'pdf' && (
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}><FaFilePdf /> Berkas Rangkuman PDF Materi</h3>
            
            {pdfUrl && (
              <div className={styles.currentPdfIndicator}>
                <small>File Aktif Saat Ini:</small>
                <a href={pdfUrl} target="_blank" rel="noreferrer">{pdfUrl}</a>
              </div>
            )}

            <div className={styles.uploadBoxWrapper}>
              <div className={styles.uploadHeaderTitle}><FaFile /> Ganti / Unggah File PDF Baru</div>
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
                <FaFilePdf className={styles.uploadZoneIcon} style={{ color: newPdfFile ? '#10b981' : '#94a3b8' }} />
                <span>{newPdfFile ? `Terpilih: ${newPdfFile.name}` : 'Klik untuk memilih file PDF baru'}</span>
                <small>Hanya menerima file berekstensi khusus .pdf</small>
              </label>
            </div>
          </div>
        )}

        {/* TAB 2: MANAJEMEN LATIHAN SOAL */}
        {activeTab === 'latihan' && (
          <div className={styles.formSection}>
            <div className={styles.sectionHeaderRow}>
              <h3 className={styles.sectionTitle}><FaCode /> Pengelola Kuis Latihan Soal</h3>
              <div className={styles.methodSelectorArea}>
                <select 
                  id="latihanDropdownSelect"
                  value={latihanMethod} 
                  onChange={(e) => { setLatihanMethod(e.target.value); }}
                  className={styles.methodDropdown}
                >
                  <option value="form">✍️ Mode Input Manual (Modal)</option>
                  <option value="json">📁 Mode Unggah Berkas (.json)</option>
                </select>

                {latihanMethod === 'form' && (
                  <button type="button" onClick={() => { resetManualForm(); setEditQuestionIndex(null); setIsQuestionModalOpen(true); }} className={styles.triggerModalBtn}>
                    <FaPlus /> Buat Soal Latihan
                  </button>
                )}
              </div>
            </div>

            {/* JIKA METODE UPLOAD FILE JSON */}
            {latihanMethod === 'json' && (
              <div className={styles.uploadBoxWrapper}>
                <div className={styles.uploadHeaderTitle}><FaFile /> Unggah Berkas File (.json)</div>
                <input 
                  type="file" 
                  id="uploadLatihanFile" 
                  accept=".json,application/json"
                  ref={fileInputLatihanRef}
                  onChange={(e) => handleJsonFileUpload(e, 'latihan')}
                  className={styles.fileInputHidden}
                />
                <label htmlFor="uploadLatihanFile" className={styles.uploadLabelZone}>
                  <FaFileCode className={styles.uploadZoneIcon} />
                  <span>Klik untuk memilih berkas kustom .json dari komputermu</span>
                  <small>Mengunggah file .json baru otomatis me-replace isi daftar antrean di bawah</small>
                </label>
              </div>
            )}

            {/* ANTREAN LIST SOAL TERPASANG DI DATABASE SEMENTARA */}
            <div className={styles.queueContainer}>
              <h4 className={styles.queueTitle}><FaList /> Daftar Antrean Soal Latihan ({latihanArray.length} Soal)</h4>
              {latihanArray.length === 0 ? (
                <p className={styles.emptyQueueText}>Belum ada kuis latihan soal yang dimasukkan.</p>
              ) : (
                <div className={styles.queueList}>
                  {latihanArray.map((item, idx) => (
                    <div key={idx} className={styles.queueItemCard}>
                      <div className={styles.queueCardMeta}>
                        <strong>{idx + 1}. {item.question}</strong>
                        <div className={styles.metaAnswerBadgeLatihan}>✔ Kunci Jawaban: {item.answer}</div>
                        {item.explanation && <div className={styles.metaExplanationText}>💡 Pembahasan: {item.explanation}</div>}
                      </div>
                      <div className={styles.queueCardActions}>
                        <button type="button" onClick={() => startEditQuestion(idx, 'latihan')} className={styles.actionEditBtn} title="Edit Soal"><FaPen /></button>
                        <button type="button" onClick={() => triggerDeleteConfirm(idx, 'latihan')} className={styles.actionDeleteBtn} title="Hapus Soal"><FaTrash /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MANAJEMEN MINI ULANGAN */}
        {activeTab === 'ulangan' && (
          <div className={styles.formSection}>
            <div className={styles.sectionHeaderRow}>
              <h3 className={styles.sectionTitle}><FaGraduationCap /> Pengelola Kuis Mini Ulangan</h3>
              <div className={styles.methodSelectorArea}>
                <select 
                  id="ulanganDropdownSelect"
                  value={ulanganMethod} 
                  onChange={(e) => { setUlanganMethod(e.target.value); }}
                  className={styles.methodDropdown}
                >
                  <option value="form">✍️ Mode Input Manual (Modal)</option>
                  <option value="json">📁 Mode Unggah Berkas (.json)</option>
                </select>

                {ulanganMethod === 'form' && (
                  <button type="button" onClick={() => { resetManualForm(); setEditQuestionIndex(null); setIsQuestionModalOpen(true); }} className={styles.triggerModalBtn} style={{ background: '#ea580c' }}>
                    <FaPlus /> Buat Soal Ulangan
                  </button>
                )}
              </div>
            </div>

            {/* JIKA METODE UPLOAD FILE JSON */}
            {ulanganMethod === 'json' && (
              <div className={styles.uploadBoxWrapper}>
                <div className={styles.uploadHeaderTitle}><FaFile /> Unggah Berkas File (.json)</div>
                <input 
                  type="file" 
                  id="uploadUlanganFile" 
                  accept=".json,application/json"
                  ref={fileInputUlanganRef}
                  onChange={(e) => handleJsonFileUpload(e, 'ulangan')}
                  className={styles.fileInputHidden}
                />
                <label htmlFor="uploadUlanganFile" className={styles.uploadLabelZone}>
                  <FaFileCode className={styles.uploadZoneIcon} />
                  <span>Klik untuk memilih berkas kustom .json dari komputermu</span>
                  <small>Mengunggah file .json baru otomatis me-replace isi daftar antrean di bawah</small>
                </label>
              </div>
            )}

            {/* ANTREAN LIST SOAL MINI ULANGAN TERPASANG */}
            <div className={styles.queueContainer}>
              <h4 className={styles.queueTitle}><FaList /> Daftar Antrean Soal Mini Ulangan ({ulanganArray.length} Soal)</h4>
              {ulanganArray.length === 0 ? (
                <p className={styles.emptyQueueText}>Belum ada kuis mini ulangan yang dimasukkan.</p>
              ) : (
                <div className={styles.queueList}>
                  {ulanganArray.map((item, idx) => (
                    <div key={idx} className={styles.queueItemCard}>
                      <div className={styles.queueCardMeta}>
                        <strong>{idx + 1}. {item.question}</strong>
                        <div className={styles.metaAnswerBadgeUlangan}>✔ Kunci Jawaban: {item.answer}</div>
                      </div>
                      <div className={styles.queueCardActions}>
                        <button type="button" onClick={() => startEditQuestion(idx, 'ulangan')} className={styles.actionEditBtn} title="Edit Soal"><FaPen /></button>
                        <button type="button" onClick={() => triggerDeleteConfirm(idx, 'ulangan')} className={styles.actionDeleteBtn} title="Hapus Soal"><FaTrash /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* BOTTOM FLOATING ACTION BAR BAR SIMPAN UTAMA */}
        <div className={styles.formActionsBar}>
          <button type="submit" className={styles.saveBtn} disabled={submitting}>
            {submitting ? <><FaSpinner className={styles.spin} /> Menyimpan...</> : <>Simpan Perubahan Konten Bab</>}
          </button>
        </div>
      </form>

      {/* =========================================================================
         1. CUSTOM MODAL INPUT & EDIT SOAL MANUAL (Gaya QuestionModal layout grid)
         ========================================================================= */}
      {isQuestionModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <button type="button" className={styles.closeButton} onClick={resetManualForm}>
              <FaXmark />
            </button>
            <h2 className={styles.modalMainTitle}>
              {editQuestionIndex !== null ? '📝 Sunting Butir Soal' : '➕ Tambah Soal Manual Baru'}
            </h2>
            <p className={styles.modalSubTitle}>Lengkapi data pertanyaan, pilihan opsi ganda beserta kunci jawaban.</p>

            <div className={styles.modalFormBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabelTitle}>Pertanyaan / Soal</label>
                <textarea 
                  rows="4" 
                  placeholder="Ketikkan butir pertanyaan kuis di sini..." 
                  value={qText} 
                  onChange={(e) => setQText(e.target.value)} 
                  className={styles.questionTextarea}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabelTitle}>Pilihan Jawaban & Kunci (Pilih salah satu radio button)</label>
                <div className={styles.optionsGrid}>
                  {options.map((opt, idx) => (
                    <div key={idx} className={`${styles.optionBox} ${correctAnswer === idx ? styles.optCorrect : ''}`}>
                      <div className={styles.optHeader}>
                        <label className={styles.radioLabel}>
                          <input 
                            type="radio" 
                            name="modalCorrectAnswerRadio" 
                            value={idx} 
                            checked={correctAnswer === idx} 
                            onChange={() => setCorrectAnswer(idx)} 
                          />
                          Opsi {['A', 'B', 'C', 'D'][idx]} {correctAnswer === idx && '(Kunci)'}
                        </label>
                      </div>
                      <input 
                        type="text" 
                        placeholder={`Teks pilihan opsi ${['A', 'B', 'C', 'D'][idx]}...`} 
                        value={opt}
                        onChange={(e) => {
                          const updated = [...options];
                          updated[idx] = e.target.value;
                          setOptions(updated);
                        }}
                        className={styles.optionInputText}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* INPUT EXPLANATION HANYA MUNCUL DI TAB LATIHAN SOAL */}
              {activeTab === 'latihan' && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabelTitle}>Pembahasan / Explanation</label>
                  <textarea 
                    rows="3" 
                    placeholder="Tuliskan alasan atau pembahasan mengapa kunci jawaban tersebut benar..." 
                    value={explanation} 
                    onChange={(e) => setExplanation(e.target.value)} 
                    className={styles.questionTextarea}
                  />
                </div>
              )}
            </div>

            <div className={styles.modalActionsFooter}>
              <button type="button" className={styles.cancelBtn} onClick={resetManualForm}>Batal</button>
              <button type="button" onClick={handleSaveQuestionToList} className={styles.submitBtn}>
                {editQuestionIndex !== null ? 'Simpan Perubahan Soal' : 'Tambahkan Soal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         2. CUSTOM MODAL CONFIRM DELETE (GANTI ALERT BAWAAN YANG JELEK)
         ========================================================================= */}
      {isDeleteModalOpen && (
        <div className={styles.modalOverlay} style={{ zIndex: 1100 }}>
          <div className={styles.modalConfirmCard}>
            <div className={styles.confirmIconHeader}>
              <FaTriangleExclamation />
            </div>
            <h3>Konfirmasi Hapus Soal</h3>
            <p>Apakah Anda yakin ingin menghapus soal nomor <strong>{(deleteTarget.index || 0) + 1}</strong> dari daftar antrean sementara {deleteTarget.type === 'latihan' ? 'Latihan Soal' : 'Mini Ulangan'}? Tindakan ini tidak bisa dibatalkan.</p>
            
            <div className={styles.confirmButtonsRow}>
              <button type="button" className={styles.cancelBtn} onClick={() => { setIsDeleteModalOpen(false); setDeleteTarget({ index: null, type: '' }); }}>Batal</button>
              <button type="button" className={styles.deleteConfirmBtn} onClick={executeDeleteQuestion}>Ya, Hapus Soal</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ChapterContentManager;
