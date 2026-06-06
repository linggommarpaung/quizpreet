import React, { useState } from 'react';
import styles from './QuestionModal.module.css'; // Memanfaatkan css modal yang sudah ada
import { FaTimes, FaFileCode, FaClipboard } from 'react-icons/fa';
import toast from 'react-hot-toast';

const ImportQuizModal = ({ isOpen, onClose, onImportSuccess }) => {
  const [jsonText, setJsonText] = useState('');
  const [activeTab, setActiveTab] = useState('file'); // 'file' atau 'copas'
  const [error, setError] = useState('');

  if (!isOpen) return null;

  // Handle pembacaan file upload .json
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
        setJsonText(JSON.stringify(parsed, null, 2));
        setError('');
        toast.success('File JSON berhasil dimuat!');
      } catch (err) {
        setError('File JSON tidak valid. Periksa kembali strukturnya.');
      }
    };
    reader.readAsText(file);
  };

    const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!jsonText.trim()) {
      setError('Data JSON tidak boleh kosong.');
      return;
    }

    try {
      const parsedData = JSON.parse(jsonText);
      
      // LOGIKA BARU: Validasi apakah properti "units" ada dan bertipe Array
      if (!parsedData || !parsedData.units || !Array.isArray(parsedData.units)) {
        setError('Format JSON salah! Wajib berupa objek dengan properti "units" berisi array soal.');
        return;
      }

      onImportSuccess(parsedData);
      setJsonText('');
      onClose();
    } catch (err) {
      setError('Format JSON rusak / tidak valid. Silakan cek tanda koma atau tanda kurung.');
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} style={{ maxWidth: '650px' }}>
        <button onClick={onClose} className={styles.closeButton}>
          <FaTimes />
        </button>
        {/* Mengubah judul modal agar sesuai fungsinya */}
        <h2>Import Soal Kuis via JSON</h2>

        {/* Tab Selector Pilihan Upload */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <button
            type="button"
            onClick={() => { setActiveTab('file'); setError(''); }}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: activeTab === 'file' ? '#2563eb' : '#fff',
              color: activeTab === 'file' ? '#fff' : '#374151',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FaFileCode /> Upload File
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('copas'); setError(''); }}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: activeTab === 'copas' ? '#2563eb' : '#fff',
              color: activeTab === 'copas' ? '#fff' : '#374151',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FaClipboard /> Copas Teks JSON
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {activeTab === 'file' ? (
            <div className={styles.formGroup}>
              <label>Pilih File .json</label>
              <input 
                type="file" 
                accept=".json" 
                onChange={handleFileUpload}
                style={{ padding: '10px', border: '2px dashed #d1d5db', borderRadius: '8px' }}
              />
            </div>
          ) : null}

             <div className={styles.formGroup}>
            <label>Preview / Teks JSON Data</label>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder={'Contoh struktur:\n{\n  "units": [\n    {\n      "text": "Pertanyaan",\n      "options": ["A", "B", "C", "D"],\n      "correctAnswer": 0,\n      "explanation": "Penjelasan"\n    }\n  ]\n}'}
              style={{ minHeight: '220px', fontFamily: 'monospace', fontSize: '0.9rem' }}
              disabled={activeTab === 'file' && !jsonText}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.formActions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>Batal</button>
            <button type="submit" className={styles.saveButton}>Proses & Simpan</button>
          </div>
        </form>
      </div>
    </div>
  );


  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} style={{ maxWidth: '650px' }}>
        <button onClick={onClose} className={styles.closeButton}>
          <FaTimes />
        </button>
        <h2>Import Tema & Soal via JSON</h2>

        {/* Tab Selector Pilihan Upload */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <button
            type="button"
            onClick={() => { setActiveTab('file'); setError(''); }}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: activeTab === 'file' ? '#2563eb' : '#fff',
              color: activeTab === 'file' ? '#fff' : '#374151',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FaFileCode /> Upload File
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('copas'); setError(''); }}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: activeTab === 'copas' ? '#2563eb' : '#fff',
              color: activeTab === 'copas' ? '#fff' : '#374151',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FaClipboard /> Copas Teks JSON
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {activeTab === 'file' ? (
            <div className={styles.formGroup}>
              <label>Pilih File .json</label>
              <input 
                type="file" 
                accept=".json" 
                onChange={handleFileUpload}
                style={{ padding: '10px', border: '2px dashed #d1d5db', borderRadius: '8px' }}
              />
            </div>
          ) : null}

          <div className={styles.formGroup}>
            <label>Preview / Teks JSON Data</label>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder='Contoh struktur:&#13;{&#13;  "theme": "Matematika",&#13;  "units": []&#13;}'
              style={{ minHeight: '220px', fontFamily: 'monospace', fontSize: '0.9rem' }}
              disabled={activeTab === 'file' && !jsonText}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.formActions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>Batal</button>
            <button type="submit" className={styles.saveButton}>Proses & Simpan</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ImportQuizModal;
