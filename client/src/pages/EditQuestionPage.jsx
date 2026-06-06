// client/src/pages/EditQuestionPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import toast from 'react-hot-toast';
import styles from './EditQuestionPage.module.css'; // Updated import
import { FaArrowLeft, FaSave, FaSpinner } from 'react-icons/fa';
import Spinner from '../components/ui/Spinner';

// Hook untuk membaca query params
function useQuery() {
    return new URLSearchParams(useLocation().search);
}

const EditQuestionPage = () => {
    const { themeId, unitId, questionId } = useParams();
    const navigate = useNavigate();
    const query = useQuery();
    const isNew = query.get('isNew') === 'true';

    const [theme, setTheme] = useState(null);
    const [unit, setUnit] = useState(null);
    const [question, setQuestion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const fetchAndPrepareData = useCallback(async () => {
        setLoading(true);
        try {
            const themeRef = doc(db, 'dailyPaths', themeId);
            const themeSnap = await getDoc(themeRef);

            if (!themeSnap.exists()) {
                toast.error("Tema tidak ditemukan.");
                return navigate('/admin');
            }
            
            const themeData = themeSnap.data();
            setTheme(themeData);
            
            const unitData = themeData.units.find(u => u.unitId === Number(unitId));
            if (!unitData) {
                toast.error("Unit tidak ditemukan.");
                return navigate(`/admin/quiz/edit-theme/${themeId}`);
            }
            setUnit(unitData);

            if (isNew) {
                // Mode Buat Baru: Siapkan pertanyaan kosong
                setQuestion({
                    id: Number(questionId), // ID unik dari timestamp
                    text: '',
                    options: ['', '', '', ''],
                    correctAnswer: 0,
                    explanation: ''
                });
            } else {
                // Mode Edit: Cari pertanyaan yang ada
                const questionData = unitData.questions.find(q => q.id === Number(questionId));
                if (questionData) {
                    setQuestion(questionData);
                } else {
                    toast.error("Pertanyaan tidak ditemukan.");
                    return navigate(`/admin/quiz/edit-theme/${themeId}`);
                }
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Gagal memuat data.");
        } finally {
            setLoading(false);
        }
    }, [themeId, unitId, questionId, navigate, isNew]);

    useEffect(() => {
        fetchAndPrepareData();
    }, [fetchAndPrepareData]);

    const handleUpdate = (field, value) => {
        setQuestion(prev => ({ ...prev, [field]: value }));
    };

    const handleOptionChange = (index, value) => {
        const newOptions = [...question.options];
        newOptions[index] = value;
        handleUpdate('options', newOptions);
    };

    const handleSave = async () => {
        if (!question.text.trim() || question.options.some(opt => !opt.trim())) {
            return toast.error("Teks pertanyaan dan semua opsi harus diisi.");
        }

        setSaving(true);
        try {
            const themeRef = doc(db, 'dailyPaths', themeId);
            
            const updatedUnits = theme.units.map(u => {
                if (u.unitId === Number(unitId)) {
                    let updatedQuestions;
                    if (isNew) {
                        // Tambahkan pertanyaan baru ke array
                        updatedQuestions = [...(u.questions || []), question];
                    } else {
                        // Perbarui pertanyaan yang sudah ada
                        updatedQuestions = u.questions.map(q => 
                            q.id === Number(questionId) ? question : q
                        );
                    }
                    return { ...u, questions: updatedQuestions };
                }
                return u;
            });

            await updateDoc(themeRef, { units: updatedUnits });

            toast.success(`Pertanyaan berhasil ${isNew ? 'dibuat' : 'diperbarui'}!`);
            navigate(`/admin/quiz/edit-theme/${themeId}`);

        } catch (error) {
            console.error("Error saving question:", error);
            toast.error("Gagal menyimpan perubahan.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Spinner />;
    if (!question) return <div className={styles.adminContainer}>Gagal memuat data pertanyaan.</div>; // Styled error

    return (
        <div className={styles.adminContainer}>
            <header className={styles.adminHeader}>
                <h1>{isNew ? 'Tambah Pertanyaan Baru' : 'Edit Pertanyaan'}</h1>
                <div className={styles.headerActions}>
                    <button onClick={handleSave} className={`${styles.navButton} ${styles.saveButton}`} disabled={saving}>
                        {saving ? <FaSpinner className={styles.spinner}/> : <FaSave />} {isNew ? 'Simpan' : 'Simpan Perubahan'}
                    </button>
                </div>
            </header>

            <main className={styles.adminMain}>
                <div className={styles.questionEditor}>
                    <p className={styles.breadcrumb}>Tema: {theme?.theme} / Unit: {unit?.unitTitle}</p>
                    <textarea 
                        placeholder="Tulis teks pertanyaan di sini..."
                        value={question.text} 
                        onChange={e => handleUpdate('text', e.target.value)}
                        className={styles.questionTextarea}
                    />
                    <div className={styles.optionsGrid}>
                        {question.options.map((opt, i) => (
                            <div key={i} className={styles.optionInputContainer}>
                                <input 
                                    type="text" 
                                    placeholder={`Opsi Jawaban ${String.fromCharCode(65 + i)}`}
                                    value={opt}
                                    onChange={e => handleOptionChange(i, e.target.value)}
                                    className={question.correctAnswer === i ? styles.correctAnswer : ''}
                                />
                                <button 
                                    onClick={() => handleUpdate('correctAnswer', i)}
                                    className={`${styles.correctBtn} ${question.correctAnswer === i ? styles.activeCorrectBtn : ''}`}
                                    title="Tandai sebagai jawaban benar"
                                >
                                    ✓
                                </button>
                            </div>
                        ))}
                    </div>
                    <textarea
                        placeholder="Tulis penjelasan jawaban di sini (opsional)..." 
                        value={question.explanation || ''}
                        onChange={e => handleUpdate('explanation', e.target.value)}
                        className={styles.explanationInput}
                    />
                </div>
            </main>
        </div>
    );
};

export default EditQuestionPage;
