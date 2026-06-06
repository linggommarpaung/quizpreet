// client/src/pages/AddThemePage.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import toast from 'react-hot-toast';
import styles from './AddThemePage.module.css';
import { FaArrowLeft, FaPlus, FaTrash, FaSave, FaSpinner, FaUpload } from 'react-icons/fa';

// Fungsi untuk menghasilkan ID unik 13 digit berbasis waktu
const generateUniqueId = () => Date.now().toString();

// Komponen kecil untuk mengelola satu pertanyaan
const QuestionEditor = ({ question, onUpdate, onDelete }) => {
    const handleOptionChange = (index, value) => {
        const newOptions = [...question.options];
        newOptions[index] = value;
        onUpdate({ ...question, options: newOptions });
    };

    return (
        <div className={styles.questionEditor}>
            <textarea 
                placeholder="Teks Pertanyaan" 
                value={question.text} 
                onChange={e => onUpdate({ ...question, text: e.target.value })}
                className={styles.questionTextarea}
            />
            <div className={styles.optionsGrid}>
                {question.options.map((opt, i) => (
                    <div key={i} className={styles.optionInputContainer}>
                        <input 
                            type="text" 
                            placeholder={`Opsi ${i + 1}`} 
                            value={opt}
                            onChange={e => handleOptionChange(i, e.target.value)}
                            className={question.correctAnswer === i ? styles.correctAnswer : ''}
                        />
                        <button 
                            onClick={() => onUpdate({ ...question, correctAnswer: i })}
                            className={`${styles.correctBtn} ${question.correctAnswer === i ? styles.activeCorrectBtn : ''}`}
                            title="Jadikan jawaban benar"
                        >
                            ✓
                        </button>
                    </div>
                ))}
            </div>
            <textarea 
                placeholder="Penjelasan Jawaban (opsional)" 
                value={question.explanation || ''}
                onChange={e => onUpdate({ ...question, explanation: e.target.value })}
                className={styles.explanationTextarea}
            />
            <button onClick={onDelete} className={`${styles.actionButton} ${styles.deleteButton}`} style={{ alignSelf: 'flex-end' }} title="Hapus Pertanyaan">
                <FaTrash />
            </button>
        </div>
    );
};

// Halaman Utama untuk Menambah Tema
const AddThemePage = () => {
    const navigate = useNavigate();
    const [themeName, setThemeName] = useState('');
    const [showOn, setShowOn] = useState('');
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isDirty, setIsDirty] = useState(false); // State untuk melacak perubahan
    const fileInputRef = useRef(null);
    
    // Peringatan sebelum meninggalkan halaman jika ada perubahan
    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (isDirty) {
                event.preventDefault();
                event.returnValue = ''; // Diperlukan untuk beberapa browser
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isDirty]);


    const handleNavigateBack = () => {
        if (isDirty) {
            if (window.confirm("Anda memiliki perubahan yang belum disimpan. Yakin ingin kembali? Perubahan akan hilang.")) {
                navigate('/admin/quiz');
            }
        } else {
            navigate('/admin/quiz');
        }
    };


    // --- Manajemen Unit ---
    const addUnit = () => {
        setIsDirty(true);
        setUnits([...units, { unitId: generateUniqueId(), unitTitle: '', questions: [] }]);
    };

    const updateUnitTitle = (index, title) => {
        setIsDirty(true);
        const newUnits = [...units];
        newUnits[index].unitTitle = title;
        setUnits(newUnits);
    };

    const removeUnit = (index) => {
        if (window.confirm("Yakin ingin menghapus unit ini?")) {
            setIsDirty(true);
            const newUnits = units.filter((_, i) => i !== index);
            setUnits(newUnits);
        }
    };

    // --- Manajemen Pertanyaan ---
    const addQuestion = (unitIndex) => {
        setIsDirty(true);
        const newUnits = [...units];
        newUnits[unitIndex].questions.push({ 
            id: generateUniqueId(), 
            text: '', 
            options: ['', '', '', ''], 
            correctAnswer: 0, 
            explanation: '' 
        });
        setUnits(newUnits);
    };

    const updateQuestion = (unitIndex, qIndex, updatedQuestion) => {
        setIsDirty(true);
        const newUnits = [...units];
        newUnits[unitIndex].questions[qIndex] = updatedQuestion;
        setUnits(newUnits);
    };

    const removeQuestion = (unitIndex, qIndex) => {
        setIsDirty(true);
        const newUnits = [...units];
        newUnits[unitIndex].questions = newUnits[unitIndex].questions.filter((_, i) => i !== qIndex);
        setUnits(newUnits);
    };

    const handleJsonImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.theme && data.units) {
                    // Validasi dan tambahkan ID jika tidak ada
                    const validatedUnits = data.units.map(unit => ({
                        ...unit,
                        unitId: unit.unitId || generateUniqueId(),
                        questions: unit.questions.map(q => ({
                            ...q,
                            id: q.id || generateUniqueId()
                        }))
                    }));

                    setThemeName(data.theme);
                    setShowOn(data.showOn || '');
                    setUnits(validatedUnits);
                    setIsDirty(true);
                    toast.success("Data berhasil diimpor dari JSON.");
                } else {
                    toast.error("Format JSON tidak valid. Harus memiliki 'theme' dan 'units'.");
                }
            } catch (error) {
                console.error("JSON Import Error:", error);
                toast.error("Gagal membaca atau mem-parsing file JSON.");
            }
        };
        reader.readAsText(file);
        event.target.value = null; // Reset input file
    };

    // --- Simpan ke Firestore ---
    const handleSaveTheme = async () => {
        if (!themeName.trim()) return toast.error('Nama tema tidak boleh kosong.');
        if (units.some(u => !u.unitTitle.trim())) return toast.error('Judul setiap unit tidak boleh kosong.');
        if (units.length === 0) return toast.error('Tema harus memiliki setidaknya satu unit.');
        if (units.some(u => u.questions.length === 0)) return toast.error('Setiap unit harus memiliki setidaknya satu pertanyaan.');
        if (units.some(u => u.questions.some(q => !q.text.trim()))) return toast.error('Teks pertanyaan tidak boleh kosong.');

        setLoading(true);
        const themeId = themeName.trim().replace(/\s+/g, '-').toLowerCase();
        const docRef = doc(db, 'dailyPaths', themeId);

        // Stuktur data final sesuai permintaan
        const themeData = {
            id: themeId, // Menambahkan ID tema
            theme: themeName.trim(),
            showOn: showOn || "",
            units: units.map(unit => ({
                unitId: unit.unitId, // Memastikan unitId disertakan
                unitTitle: unit.unitTitle,
                questions: unit.questions.map(q => ({
                    id: q.id, // Memastikan id pertanyaan disertakan
                    text: q.text,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation || ''
                }))
            })),
            createdAt: serverTimestamp()
        };

        try {
            await setDoc(docRef, themeData);
            setIsDirty(false); // Perubahan sudah disimpan
            toast.success('Tema baru berhasil disimpan!');
            navigate('/admin/quiz');
        } catch (err) {
            console.error("Error saving theme:", err);
            toast.error('Gagal menyimpan tema. Lihat konsol untuk detail.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.adminContainer}>
            <header className={styles.adminHeader}>
                <h1>Tambah Tema Baru</h1>
                <div className={styles.headerActions}>
                    <button onClick={() => fileInputRef.current.click()} className={`${styles.navButton} ${styles.importButton}`}>
                        <FaUpload /> Impor dari JSON
                    </button>
                    <input type="file" accept=".json" ref={fileInputRef} onChange={handleJsonImport} style={{ display: 'none' }} />
                    <button onClick={handleSaveTheme} className={`${styles.navButton} ${styles.saveButton}`} disabled={loading || !isDirty}>
                        {loading ? <FaSpinner className={styles.spinner} /> : <FaSave />} Simpan Tema
                    </button>
                </div>
            </header>

            <main className={`${styles.adminMain} ${styles.addThemeForm}`}>
                <div className={styles.themeMeta}>
                    <input 
                        type="text"
                        placeholder="Masukkan Nama Tema Utama..."
                        value={themeName}
                        onChange={e => { setThemeName(e.target.value); setIsDirty(true); }}
                        className={styles.themeTitleInput}
                    />
                    <div className={styles.dateInputContainer}>
                        <label htmlFor="showOnDate">Tampilkan pada tanggal (opsional):</label>
                        <input 
                            type="date" 
                            id="showOnDate"
                            value={showOn}
                            onChange={e => { setShowOn(e.target.value); setIsDirty(true); }}
                            className={styles.dateInput}
                        />
                    </div>
                </div>

                <div className={styles.unitListHeader}>
                    <h3>Daftar Unit</h3>
                    <button onClick={addUnit} className={`${styles.navButton} ${styles.addButton}`}><FaPlus/> Tambah Unit</button>
                </div>
                
                <div className={styles.unitsList}>
                    {units.map((unit, uIndex) => (
                        <div key={unit.unitId} className={styles.unitEditor}>
                            <div className={styles.unitEditorHeader}>
                                <input 
                                    type="text"
                                    placeholder={`Judul Unit ${uIndex + 1}`}
                                    value={unit.unitTitle}
                                    onChange={e => updateUnitTitle(uIndex, e.target.value)}
                                    className={styles.unitTitleInput}
                                />
                                <button onClick={() => removeUnit(uIndex)} className={`${styles.actionButton} ${styles.deleteButton}`} title="Hapus Unit">
                                    <FaTrash />
                                </button>
                            </div>

                            <div className={styles.questionsSection}>
                                {unit.questions.map((q, qIndex) => (
                                    <QuestionEditor 
                                        key={q.id} // Menggunakan ID unik sebagai key
                                        question={q} 
                                        onUpdate={(updatedQ) => updateQuestion(uIndex, qIndex, updatedQ)}
                                        onDelete={() => removeQuestion(uIndex, qIndex)}
                                    />
                                ))}
                                <button onClick={() => addQuestion(uIndex)} className={styles.addQuestionBtn}>
                                    <FaPlus /> Tambah Pertanyaan ke Unit Ini
                                </button>
                            </div>
                        </div>
                    ))}
                    {units.length === 0 && <p className={styles.noQuestions}>Klik "Tambah Unit" untuk memulai atau impor dari file JSON.</p>}
                </div>
            </main>
        </div>
    );
};

export default AddThemePage;
