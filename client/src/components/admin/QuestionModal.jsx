// client/src/components/admin/QuestionModal.jsx

import React, { useState, useEffect } from 'react';
import styles from './QuestionModal.module.css';
import { FaTimes } from 'react-icons/fa';

const QuestionModal = ({ isOpen, onClose, onSave, questionData }) => {
    const [text, setText] = useState(''); // Mengganti nama state
    const [options, setOptions] = useState(['', '', '', '']);
    const [correctAnswer, setCorrectAnswer] = useState(0);
    const [explanation, setExplanation] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) { // Hanya update saat modal dibuka
            if (questionData) {
                setText(questionData.text || ''); // Menggunakan properti 'text'
                setOptions(questionData.options || ['', '', '', '']);
                setCorrectAnswer(questionData.correctAnswer || 0);
                setExplanation(questionData.explanation || '');
            } else {
                // Reset form untuk pertanyaan baru
                setText('');
                setOptions(['', '', '', '']);
                setCorrectAnswer(0);
                setExplanation('');
            }
        }
    }, [questionData, isOpen]);

    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (!text.trim()) {
            setError('Teks pertanyaan tidak boleh kosong.');
            return;
        }
        if (options.some(opt => !opt.trim())) {
            setError('Semua pilihan jawaban harus diisi.');
            return;
        }

        // Mengirim data dengan properti 'text'
        onSave({
            text,
            options,
            correctAnswer,
            explanation
        });
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <button onClick={onClose} className={styles.closeButton}><FaTimes /></button>
                <h2>{questionData ? 'Edit Pertanyaan' : 'Tambah Pertanyaan Baru'}</h2>
                
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label htmlFor="question">Teks Pertanyaan</label>
                        <textarea 
                            id="question"
                            value={text} // Menggunakan state 'text'
                            onChange={(e) => setText(e.target.value)} // Mengupdate state 'text'
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Pilihan Jawaban</label>
                        {options.map((option, index) => (
                            <div key={index} className={styles.optionInput}>
                                <input 
                                    type="text"
                                    value={option}
                                    onChange={(e) => handleOptionChange(index, e.target.value)}
                                    required
                                />
                                <input 
                                    type="radio"
                                    name="correctAnswer"
                                    checked={correctAnswer === index}
                                    onChange={() => setCorrectAnswer(index)}
                                    className={styles.radioInput}
                                />
                                <span className={styles.radioLabel}>Benar</span>
                            </div>
                        ))}
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="explanation">Penjelasan (Opsional)</label>
                        <textarea 
                            id="explanation"
                            value={explanation}
                            onChange={(e) => setExplanation(e.target.value)}
                        />
                    </div>

                    {error && <p className={styles.error}>{error}</p>}

                    <div className={styles.formActions}>
                        <button type="button" onClick={onClose} className={styles.cancelButton}>Batal</button>
                        <button type="submit" className={styles.saveButton}>Simpan</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default QuestionModal;
