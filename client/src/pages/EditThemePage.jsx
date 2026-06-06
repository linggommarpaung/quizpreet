// client/src/pages/EditThemePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import toast from 'react-hot-toast';
import styles from './EditThemePage.module.css';
import { FaArrowLeft, FaPlus, FaEdit, FaTrash, FaSpinner, FaChevronDown, FaChevronUp, FaSave, FaTimes } from 'react-icons/fa';
import KebabMenu from '../components/ui/KebabMenu'; // Import KebabMenu

// --- Komponen Pertanyaan (Tampilan) --- //
const QuestionItem = ({ question, onEdit, onDelete }) => (
    <div className={styles.questionItem}>
        <div className={styles.questionInfo}>
            <p><strong>P:</strong> {question.text}</p>
            <ol type="A">
                {question.options.map((opt, i) => (
                    <li key={i} style={{ fontWeight: i === question.correctAnswer ? 'bold' : 'normal', color: i === question.correctAnswer ? '#10b981' : 'inherit' }}>
                        {opt}
                    </li>
                ))}
            </ol>
            {question.explanation && <p><small><strong>Penjelasan:</strong> {question.explanation}</small></p>}
        </div>
        <div className={`${styles.questionActions} ${styles.desktopActions}`}>
            <button onClick={onEdit} className={styles.actionButton} title="Edit Pertanyaan"><FaEdit /></button>
            <button onClick={onDelete} className={`${styles.actionButton} ${styles.deleteButton}`} title="Hapus Pertanyaan"><FaTrash /></button>
        </div>
        <div className={`${styles.questionActions} ${styles.mobileActions}`}>
             <KebabMenu>
                <button onClick={onEdit}><FaEdit /> Edit</button>
                <button onClick={onDelete} className={styles.deleteMenuItem}><FaTrash /> Hapus</button>
            </KebabMenu>
        </div>
    </div>
);

// --- Komponen Accordion Unit --- //
const UnitAccordion = ({ 
    unit,
    isEditing, 
    editingTitle,
    onSetEditingTitle,
    onStartEditing,
    onCancelEditing,
    onSaveEditing,
    onDeleteUnit,
    onAddQuestion, 
    onDeleteQuestion, 
    onEditQuestion
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleSave = (e) => {
        e.stopPropagation();
        onSaveEditing();
    };

    const handleCancel = (e) => {
        e.stopPropagation();
        onCancelEditing();
    };

    const handleStartEditing = (e) => {
        e.stopPropagation();
        onStartEditing();
    }

    return (
        <div className={styles.unitAccordion}>
            <div className={styles.unitItem} onClick={() => !isEditing && setIsOpen(!isOpen)}>
                <div className={styles.unitInfo}>
                    {isEditing ? (
                        <input 
                            type="text"
                            value={editingTitle}
                            onChange={(e) => onSetEditingTitle(e.target.value)}
                            className={styles.unitTitleInput}
                            onClick={(e) => e.stopPropagation()} // Mencegah accordion tertutup
                            autoFocus
                        />
                    ) : (
                        <h4>{unit.unitTitle}</h4>
                    )}
                    <p>{unit.questions?.length || 0} Pertanyaan</p>
                </div>
                <div className={`${styles.unitActions} ${styles.desktopActions}`}>
                    {isEditing ? (
                        <>
                            <button onClick={handleSave} className={`${styles.actionButton} ${styles.saveButtonSmall}`} title="Simpan Judul"><FaSave/></button>
                            <button onClick={handleCancel} className={`${styles.actionButton} ${styles.cancelButton}`} title="Batal"><FaTimes/></button>
                        </>
                    ) : (
                        <>
                            <button onClick={(e) => {e.stopPropagation(); onAddQuestion()}} className={`${styles.actionButton} ${styles.addButtonSmall}`} title="Tambah Pertanyaan Baru"><FaPlus/></button>
                            <button onClick={handleStartEditing} className={styles.actionButton} title="Edit Judul Unit"><FaEdit /></button>
                            <button onClick={(e) => {e.stopPropagation(); onDeleteUnit()}} className={`${styles.actionButton} ${styles.deleteButton}`} title="Hapus Unit"><FaTrash /></button>
                            <button className={styles.actionButton}>{isOpen ? <FaChevronUp /> : <FaChevronDown />}</button>
                        </>
                    )}
                </div>
                 <div className={`${styles.unitActions} ${styles.mobileActions}`}>
                    {isEditing ? (
                        <>
                            <button onClick={handleSave} className={`${styles.actionButton} ${styles.saveButtonSmall}`} title="Simpan Judul"><FaSave/></button>
                            <button onClick={handleCancel} className={`${styles.actionButton} ${styles.cancelButton}`} title="Batal"><FaTimes/></button>
                        </>
                    ) : (
                        <KebabMenu>
                             <button onClick={(e) => {e.stopPropagation(); onAddQuestion()}}><FaPlus/> Tambah Pertanyaan</button>
                            <button onClick={handleStartEditing}><FaEdit /> Edit Judul</button>
                            <button onClick={(e) => {e.stopPropagation(); onDeleteUnit()}} className={styles.deleteMenuItem}><FaTrash /> Hapus Unit</button>
                        </KebabMenu>
                    )}
                </div>
            </div>
            {isOpen && (
                <div className={styles.questionsContainer}>
                    {(unit.questions || []).map(q => (
                        <QuestionItem 
                            key={q.id} 
                            question={q} 
                            onEdit={() => onEditQuestion(q.id)} 
                            onDelete={() => onDeleteQuestion(q.id, q.text)} 
                        />
                    ))}
                    {(!unit.questions || unit.questions.length === 0) && <p className={styles.noQuestions}>Belum ada pertanyaan di unit ini.</p>}
                </div>
            )}
        </div>
    );
};


// --- Halaman Utama Edit Tema --- //
const EditThemePage = () => {
    const { themeId } = useParams();
    const navigate = useNavigate();
    const [theme, setTheme] = useState(null);
    const [themeName, setThemeName] = useState('');
    const [showOn, setShowOn] = useState(''); // Default ke string kosong
    const [loading, setLoading] = useState(true);
    const [editingUnit, setEditingUnit] = useState({ id: null, title: '' });

    const fetchTheme = useCallback(async () => {
        setLoading(true);
        try {
            const docRef = doc(db, 'dailyPaths', themeId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                const units = (data.units || []).map(u => ({ ...u, unitId: u.unitId || Date.now() + Math.random(), questions: (u.questions || []).map(q => ({...q, id: q.id || Date.now() + Math.random()})) }));
                setTheme({ id: docSnap.id, ...data, units });
                setThemeName(data.theme);
                setShowOn(data.showOn || ''); // Jika null atau undefined, set jadi string kosong
            } else {
                toast.error('Tema tidak ditemukan.'); navigate('/admin/quiz');
            }
        } catch (err) {
            console.error("Error fetching theme:", err); toast.error('Gagal memuat data.');
        } finally {
            setLoading(false);
        }
    }, [themeId, navigate]);

    useEffect(() => { 
        fetchTheme(); 
    }, [fetchTheme]);

    const updateFirestore = async (updatedData) => {
        const docRef = doc(db, 'dailyPaths', themeId);
        try {
            await updateDoc(docRef, updatedData);
            return true;
        } catch (err) {
            toast.error("Gagal menyimpan perubahan ke database."); console.error(err);
            return false;
        }
    };

    const handleSaveThemeDetails = async () => {
        const trimmedName = themeName.trim();
        if (!trimmedName) {
            toast.error("Nama tema tidak boleh kosong.");
            setThemeName(theme.theme);
            return;
        }

        const updates = {};
        let hasChanges = false;

        if (trimmedName !== theme.theme) {
            updates.theme = trimmedName;
            hasChanges = true;
        }
        
        if (showOn !== theme.showOn) {
            updates.showOn = showOn;
            hasChanges = true;
        }

        if (hasChanges) {
            if (await updateFirestore(updates)) {
                toast.success('Perubahan berhasil disimpan.');
                setTheme(t => ({...t, ...updates}));
            }
        } else {
            toast.success('Tidak ada perubahan untuk disimpan.');
        }
    };

    const handleAddUnit = async () => {
        const newUnit = { unitId: Date.now(), unitTitle: "Unit Baru", questions: [] };
        const updatedUnits = [...theme.units, newUnit];
        if (await updateFirestore({ units: updatedUnits })) {
            toast.success('Unit baru ditambahkan. Silakan edit judulnya.');
            setTheme(t => ({...t, units: updatedUnits}));
            setEditingUnit({ id: newUnit.unitId, title: newUnit.unitTitle });
        }
    };

    const handleSaveUnitTitle = async () => {
        const { id, title } = editingUnit;
        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
            toast.error("Judul unit tidak boleh kosong.");
            return;
        }
        const updatedUnits = theme.units.map(u => u.unitId === id ? { ...u, unitTitle: trimmedTitle } : u);
        if (await updateFirestore({ units: updatedUnits })) {
            toast.success('Judul unit berhasil diperbarui.');
            setTheme(t => ({...t, units: updatedUnits}));
            setEditingUnit({ id: null, title: '' });
        }
    };
    
    const handleDeleteUnit = async (unitId) => {
        if (window.confirm(`Yakin ingin menghapus unit ini?`)) {
            const updatedUnits = theme.units.filter(u => u.unitId !== unitId);
            if (await updateFirestore({ units: updatedUnits })) {
                toast.success(`Unit berhasil dihapus.`);
                setTheme(t => ({...t, units: updatedUnits}));
            }
        }
    };

    // --- Logika Pertanyaan --- //
    const handleAddQuestionToUnit = (unitId) => {
        const newQuestionId = Date.now();
        navigate(`/admin/quiz/edit-question/${themeId}/${unitId}/${newQuestionId}?isNew=true`);
    };

    const handleEditQuestion = (unitId, questionId) => {
        navigate(`/admin/quiz/edit-question/${themeId}/${unitId}/${questionId}`);
    };

    const handleDeleteQuestion = async (unitId, questionId, qText) => {
        if (window.confirm(`Yakin ingin menghapus pertanyaan \"${qText}\"?`)) {
            const updatedUnits = theme.units.map(u => {
                if (u.unitId === unitId) {
                    const updatedQuestions = u.questions.filter(q => q.id !== questionId);
                    return { ...u, questions: updatedQuestions };
                }
                return u;
            });
            if (await updateFirestore({ units: updatedUnits })) {
                toast.success('Pertanyaan berhasil dihapus.');
                setTheme(t => ({...t, units: updatedUnits}));
            }
        }
    };

    if (loading) return <div className={styles.loadingContainer}><FaSpinner className={styles.spinner} /> Memuat...</div>;
    if (!theme) return null;

    return (
        <div className={styles.adminContainer}>
            <header className={styles.adminHeader}>
                 <div className={styles.themeNameEditor}>
                    <input type="text" value={themeName} onChange={(e) => setThemeName(e.target.value)} className={styles.themeTitleInput} placeholder="Nama Tema" />
                    <div className={styles.dateInputContainer}>
                        <label htmlFor="showOnDateEdit">Tampilkan pada tanggal:</label>
                        <input 
                            id="showOnDateEdit"
                            type="date" 
                            value={showOn}
                            onChange={e => setShowOn(e.target.value)}
                            className={styles.dateInput}
                        />
                    </div>
                    <button onClick={handleSaveThemeDetails} className={`${styles.navButton} ${styles.saveButton}`}><FaSave/> Simpan</button>
                </div>
            </header>

            <main className={styles.adminMain}>
                <div className={styles.unitListHeader}>
                     <h3>Daftar Unit</h3>
                     <button onClick={handleAddUnit} className={`${styles.navButton} ${styles.addButton}`}><FaPlus /> Tambah Unit</button>
                </div>
                <div className={styles.unitsList}>
                    {theme.units?.sort((a,b) => a.unitId - b.unitId).map(unit => (
                        <UnitAccordion 
                            key={unit.unitId} 
                            unit={unit} 
                            isEditing={editingUnit.id === unit.unitId}
                            editingTitle={editingUnit.title}
                            onSetEditingTitle={(title) => setEditingUnit({...editingUnit, title})}
                            onStartEditing={() => setEditingUnit({ id: unit.unitId, title: unit.unitTitle })}
                            onCancelEditing={() => setEditingUnit({ id: null, title: '' })}
                            onSaveEditing={handleSaveUnitTitle}
                            onDeleteUnit={() => handleDeleteUnit(unit.unitId)}
                            onAddQuestion={() => handleAddQuestionToUnit(unit.unitId)}
                            onDeleteQuestion={(qId, qText) => handleDeleteQuestion(unit.unitId, qId, qText)}
                            onEditQuestion={(qId) => handleEditQuestion(unit.unitId, qId)}
                        />
                    ))}
                     {(!theme.units || theme.units.length === 0) && <p className={styles.noQuestions}>Belum ada unit untuk tema ini.</p>}
                </div>
            </main>
        </div>
    );
};

export default EditThemePage;
