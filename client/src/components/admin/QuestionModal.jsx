// client/src/components/admin/QuestionModal.jsx

import React, { useState, useEffect } from 'react';
import styles from './QuestionModal.module.css';
import { FaXmark, FaFileCode, FaPenToSquare } from 'react-icons/fa6';
import toast from 'react-hot-toast';

const QuestionModal = ({ isOpen, onClose, onImportJson, onSaveManual, editData = null, editIndex = null }) => {
  // Tabs: 'manual' atau 'json'
  const [activeTab, setActiveTab] = useState('manual');
  const [error, setError] = useState('');

  // STATE UNTUK INPUT MANUAL
  const [qText, setQText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(0); // Index jawaban benar (0-3)

  // Efek jika modal dibuka untuk "EDIT" soal
  useEffect(() => {
    if (isOpen && editData) {
      setActiveTab('manual');
      // SINKRONISASI: Mengambil dari properti 'question' dan 'answer'
      setQText(editData.question || '');
      setOptions(editData.options || ['', '', '', '']);
      setCorrectAnswer(editData.answer ?? 0); 
      setError('');
    } else if (isOpen && !editData) {
      // Reset form jika buka untuk tambah baru
      setQText('');
      setOptions(['', '', '', '']);
      setCorrectAnswer(0);
      setError('');
    }
  }, [isOpen, editData]);

  if (!isOpen) return null;

  // HANDLE UPLOAD JSON
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setError('File harus berformat .json');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed || !parsed.units || !Array.isArray(parsed.units)) {
          setError('Format JSON salah! Wajib memiliki properti "units" (Array).');
          return;
        }
        onImportJson(parsed.units);
        onClose();
      } catch (err) {
        setError('File JSON tidak valid / rusak.');
      }
    };
    reader.readAsText(file);
  };

  // HANDLE SAVE MANUAL
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!qText.trim()) {
      setError('Teks pertanyaan tidak boleh kosong!'); return;
    }
    if (options.some(opt => !opt.trim())) {
      setError('Semua 4 pilihan jawaban harus diisi!'); return;
    }

    // SINKRONISASI: Menyusun objek baru persis seperti struktur JSON
    const newUnit = {
      id: editData?.id || `unit_${Date.now()}`, // Generate ID unik jika baru
      question: qText.trim(),
      options: options.map(o => o.trim()),
      answer: Number(correctAnswer),
      explanation: editData?.explanation || "" // Pertahankan explanation jika ada sebelumnya
    };

    onSaveManual(newUnit, editIndex);
    onClose();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <button onClick={onClose} className={styles.closeButton}><FaXmark /></button>
        
        <h2>{editData ? 'Edit Soal' : 'Tambahkan Soal'}</h2>

        {/* Tab Selector (Sembunyikan jika sedang mode Edit) */}
        {!editData && (
          <div className={styles.tabContainer}>
            <button
              type="button"
              onClick={() => { setActiveTab('manual'); setError(''); }}
              className={`${styles.tabBtn} ${activeTab === 'manual' ? styles.activeTab : ''}`}
            >
              <FaPenToSquare /> Tulis Manual
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('json'); setError(''); }}
              className={`${styles.tabBtn} ${activeTab === 'json' ? styles.activeTab : ''}`}
            >
              <FaFileCode /> Upload JSON
            </button>
          </div>
        )}

        {error && <div className={styles.errorBanner}>{error}</div>}

        {activeTab === 'json' && !editData ? (
          <div className={styles.jsonUploadArea}>
            <label>Pilih File .json (Akan menimpa/overwrite soal yang ada)</label>
            <input 
              type="file" 
              accept=".json" 
              onChange={handleFileUpload}
              className={styles.fileInput}
            />
            <p className={styles.jsonWarning}>Perhatian: Mengupload file JSON akan menghapus array soal yang ada saat ini dan menggantinya dengan isi file.</p>
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} className={styles.manualForm}>
            <div className={styles.formGroup}>
              <label>Pertanyaan</label>
              <textarea 
                value={qText} 
                onChange={e => setQText(e.target.value)} 
                placeholder="Tuliskan soal di sini..."
                rows={3}
              />
            </div>

            <div className={styles.optionsGrid}>
              {options.map((opt, idx) => (
                // SINKRONISASI: Menggunakan correctAnswer, bukan answer
                <div key={idx} className={`${styles.optionBox} ${correctAnswer === idx ? styles.optCorrect : ''}`}>
                  <div className={styles.optHeader}>
                    <label className={styles.radioLabel}>
                      <input 
                        type="radio" 
                        name="correctAnswer" 
                        value={idx} 
                        checked={correctAnswer === idx} 
                        onChange={() => setCorrectAnswer(idx)} 
                      />
                      Opsi {['A', 'B', 'C', 'D'][idx]} {correctAnswer === idx && '(Kunci Jawaban)'}
                    </label>
                  </div>
                  <input 
                    type="text" 
                    value={opt} 
                    onChange={e => {
                      const newOpts = [...options];
                      newOpts[idx] = e.target.value;
                      setOptions(newOpts);
                    }} 
                    placeholder={`Teks pilihan ${['A', 'B', 'C', 'D'][idx]}...`}
                  />
                </div>
              ))}
            </div>

            <div className={styles.formActions}>
              <button type="button" onClick={onClose} className={styles.cancelBtn}>Batal</button>
              <button type="submit" className={styles.saveBtn}>{editData ? 'Simpan Perubahan' : 'Tambahkan Soal'}</button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

export default QuestionModal;
