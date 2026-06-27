// client/src/pages/admin/QuizListPage.jsx

import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import toast from 'react-hot-toast';
import styles from './QuizListPage.module.css';
import QuestionModal from '../../components/admin/QuestionModal';
import { 
  FaPlus, FaSpinner, FaTrash, FaArrowLeft, 
  FaCalculator, FaFlask, FaGlobe, FaLanguage, FaBook,
  FaFolderOpen, FaChevronDown, FaChevronUp, FaPenToSquare, FaClock,
  FaStar, FaCoins
} from 'react-icons/fa6';

const QuizListPage = () => {
  const [selectedMapel, setSelectedMapel] = useState(null); 
  const [selectedTheme, setSelectedTheme] = useState(null); 
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [themeToDelete, setThemeToDelete] = useState(null);
  
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal Soal States
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editQuestionData, setEditQuestionData] = useState(null);
  const [editQuestionIndex, setEditQuestionIndex] = useState(null);

  // Accordion State
  const [expandedQIndex, setExpandedQIndex] = useState(null);
  const [isRewardExpanded, setIsRewardExpanded] = useState(false);

  // Time Limit & Rewards State (Level 3)
  const [timeLimitInput, setTimeLimitInput] = useState('');
  const [rewardCorrectXp, setRewardCorrectXp] = useState('');
  const [rewardCorrectCoin, setRewardCorrectCoin] = useState('');
  const [penaltyWrongXp, setPenaltyWrongXp] = useState('');
  const [penaltyWrongCoin, setPenaltyWrongCoin] = useState('');

  // Modal Tambah Tema Manual States
  const [isAddThemeModalOpen, setIsAddThemeModalOpen] = useState(false);
  const [newThemeNumber, setNewThemeNumber] = useState('');
  const [newThemeName, setNewThemeName] = useState('');

  const listMapel = [
    { id: 'mtk', name: 'Matematika', icon: <FaCalculator />, color: '#ef4444', desc: 'Evaluasi kuis aljabar, geometri, & hitungan dasar' },
    { id: 'ipa', name: 'Sains (IPA)', icon: <FaFlask />, color: '#10b981', desc: 'Evaluasi kuis fisika, biologi, & kimia dasar' },
    { id: 'ips', name: 'IPS', icon: <FaGlobe />, color: '#f59e0b', desc: 'Evaluasi kuis sejarah, sosiologi, & geografi' },
    { id: 'inggris', name: 'Bahasa Inggris', icon: <FaLanguage />, color: '#3b82f6', desc: 'Evaluasi kuis grammar, tenses, & reading' },
    { id: 'indonesia', name: 'Bahasa Indonesia', icon: <FaBook />, color: '#8b5cf6', desc: 'Evaluasi kuis struktur teks, sastra, & ejaan' }
  ];

  const fetchThemes = async () => {
    if (!selectedMapel) return;
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'dailyPaths'));
      const allData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      
      const filtered = allData
        .filter((item) => item.mapel?.toLowerCase() === selectedMapel.toLowerCase())
        .sort((a, b) => {
          const numA = parseInt(a.themeCode?.replace(/^\D+/g, '')) || 0;
          const numB = parseInt(b.themeCode?.replace(/^\D+/g, '')) || 0;
          return numA - numB;
        });
      setThemes(filtered);
    } catch (err) {
      toast.error('Gagal memuat data tema.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchThemes(); }, [selectedMapel]);

  // Handle Pilih Tema (Masuk Level 3)
  const handleSelectThemeForDetails = (themeItem) => {
    setSelectedTheme(themeItem);
    setTimeLimitInput(themeItem.timeLimit || '10:00'); 
    
    setRewardCorrectXp(themeItem.rewardCorrectXp ?? '');
    setRewardCorrectCoin(themeItem.rewardCorrectCoin ?? '');
    setPenaltyWrongXp(themeItem.penaltyWrongXp ?? '');
    setPenaltyWrongCoin(themeItem.penaltyWrongCoin ?? '');
    
    setExpandedQIndex(null);
  };

  const handleCreateTheme = async (e) => {
    e.preventDefault();
    if (!newThemeNumber || !newThemeName.trim()) {
      toast.error('Semua kolom formulir wajib diisi!'); return;
    }
    const formattedCode = `Q${newThemeNumber.replace(/^\D+/g, '')}`;
    try {
      const newThemeObj = {
        mapel: selectedMapel, 
        themeCode: formattedCode, 
        theme: newThemeName.trim(), 
        units: [], 
        timeLimit: '10:00',
        rewardCorrectXp: '',
        rewardCorrectCoin: '',
        penaltyWrongXp: '',
        penaltyWrongCoin: ''
      };
      await addDoc(collection(db, 'dailyPaths'), newThemeObj);
      toast.success(`Tema ${formattedCode} berhasil disimpan!`);
      setNewThemeNumber(''); setNewThemeName(''); setIsAddThemeModalOpen(false); fetchThemes();
    } catch (err) {
      toast.error('Gagal menambahkan tema baru.');
    }
  };

  const triggerDeleteTheme = (e, themeItem) => {
    e.stopPropagation(); setThemeToDelete(themeItem); setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!themeToDelete) return;
    try {
      await deleteDoc(doc(db, 'dailyPaths', themeToDelete.id));
      toast.success(`Tema dihapus.`);
      setIsDeleteModalOpen(false); setThemeToDelete(null); fetchThemes();
    } catch (err) { toast.error('Gagal menghapus tema.'); }
  };

  const handleUpdateUnitsFirestore = async (newUnitsArr) => {
    const themeDocRef = doc(db, 'dailyPaths', selectedTheme.id);
    await updateDoc(themeDocRef, { units: newUnitsArr });
    setSelectedTheme(prev => ({ ...prev, units: newUnitsArr }));
    fetchThemes(); 
  };

  const handleSaveTimeLimit = async () => {
    const regex = /^\d{2}:\d{2}$/;
    if (!regex.test(timeLimitInput)) {
      toast.error('Format waktu salah! Gunakan MM:SS (contoh: 15:30)');
      setTimeLimitInput(selectedTheme.timeLimit || '10:00');
      return;
    }
    try {
      await updateDoc(doc(db, 'dailyPaths', selectedTheme.id), { timeLimit: timeLimitInput });
      toast.success('Batas waktu kuis diperbarui!');
      setSelectedTheme(prev => ({ ...prev, timeLimit: timeLimitInput }));
    } catch (err) { toast.error('Gagal menyimpan waktu.'); }
  };

  const handleSaveRewardsConfig = async () => {
    try {
      const updatedFields = {
        rewardCorrectXp: rewardCorrectXp !== '' ? Number(rewardCorrectXp) : '',
        rewardCorrectCoin: rewardCorrectCoin !== '' ? Number(rewardCorrectCoin) : '',
        penaltyWrongXp: penaltyWrongXp !== '' ? Number(penaltyWrongXp) : '',
        penaltyWrongCoin: penaltyWrongCoin !== '' ? Number(penaltyWrongCoin) : '',
      };
      
      await updateDoc(doc(db, 'dailyPaths', selectedTheme.id), updatedFields);
      setSelectedTheme(prev => ({ ...prev, ...updatedFields }));
      toast.success('Konfigurasi sistem reward disimpan!');
    } catch (err) {
      toast.error('Gagal memperbarui konfigurasi reward.');
    }
  };

  const handleImportJson = async (importedUnits) => {
    try {
      await handleUpdateUnitsFirestore(importedUnits);
      toast.success(`Data JSON berhasil ditimpa!`);
    } catch (e) { toast.error("Gagal menimpa JSON"); }
  };

  const handleSaveManualQuestion = async (unitData, editIdx) => {
    try {
      let currentUnits = [...(selectedTheme.units || [])];
      if (editIdx !== null) {
        currentUnits[editIdx] = unitData; 
        toast.success('Soal berhasil diedit!');
      } else {
        currentUnits.push(unitData); 
        toast.success('Soal baru berhasil ditambahkan!');
      }
      await handleUpdateUnitsFirestore(currentUnits);
    } catch (e) { toast.error("Gagal menyimpan soal."); }
  };

  const handleDeleteIndividualQuestion = async (idx) => {
    if(!window.confirm("Yakin ingin menghapus soal ini?")) return;
    try {
      let currentUnits = [...(selectedTheme.units || [])];
      currentUnits.splice(idx, 1);
      await handleUpdateUnitsFirestore(currentUnits);
      toast.success('Soal dihapus.');
      setExpandedQIndex(null);
    } catch (e) { toast.error("Gagal menghapus."); }
  };

  const openAddQuestion = () => {
    setEditQuestionData(null); setEditQuestionIndex(null); setIsQuestionModalOpen(true);
  };
  const openEditQuestion = (unit, idx) => {
    setEditQuestionData(unit); setEditQuestionIndex(idx); setIsQuestionModalOpen(true);
  };

  const currentMapelData = listMapel.find(m => m.id === selectedMapel);

  if (selectedMapel && selectedTheme) {
    return (
      <div className={styles.adminContainer}>
        <header className={styles.adminHeader}>
          <button onClick={() => setSelectedTheme(null)} className={styles.navButton}>
            <FaArrowLeft /> Kembali ke Daftar Tema
          </button>
          <h1>Kelola: {selectedTheme.themeCode} - {selectedTheme.theme}</h1>
        </header>

        <main className={styles.adminMain}>
          <div className={styles.actionBarLevel3}>
            <div className={styles.timeInputGroup}>
              <FaClock className={styles.timeIcon} />
              <label>Batas Waktu:</label>
              <input 
                type="text" 
                value={timeLimitInput}
                onChange={(e) => setTimeLimitInput(e.target.value)}
                onBlur={handleSaveTimeLimit}
                placeholder="MM:SS"
                maxLength={5}
                className={styles.timeInputBox}
                title="Format Menit:Detik (Kursor keluar otomatis simpan)"
              />
            </div>

            <button onClick={openAddQuestion} className={styles.addButton}>
              <FaPlus /> Tambah/Import Soal
            </button>
          </div>

          {/* ========================================================================= */}
          {/* PANEL SETTING REWARDS & COMBO PENALTY (ACCORDION DENGAN INPUT BEBAS) */}
          {/* ========================================================================= */}
          <div className={`${styles.rewardManagementPanel} ${isRewardExpanded ? styles.rewardExpanded : ''}`}>
            
            <div 
              className={styles.rewardAccordionHeader} 
              onClick={() => setIsRewardExpanded(!isRewardExpanded)}
            >
              <div className={styles.rewardHeaderLeft}>
                <span className={styles.rewardIconBadge}>🎯</span>
                <div className={styles.rewardHeaderTextGroup}>
                  <div className={styles.rewardSectionTitle}>Pengaturan Kustom Ekonomi & Reward (Per 1 Soal)</div>
                  <p className={styles.rewardSubtitle}>Atur perolehan atau potongan EXP & Koin secara combo disini</p>
                </div>
              </div>
              {isRewardExpanded ? <FaChevronUp className={styles.accIcon} /> : <FaChevronDown className={styles.accIcon} />}
            </div>

            {isRewardExpanded && (
              <div className={styles.rewardAccordionBody}>
                <div className={styles.rewardInputsGrid}>
                  {/* Kolom Reward Benar */}
                  <div className={styles.rewardCardColumn}>
                    <h4 className={styles.rewardCardHeaderBenar}>Jika Jawaban Benar (+)</h4>
                    
                    <div className={styles.rewardFieldRow}>
                      <div className={styles.inputIconPrefix}><FaStar className={styles.xpColorIcon} /></div>
                      <input 
                        type="number"
                        placeholder="0"
                        value={rewardCorrectXp}
                        onChange={(e) => setRewardCorrectXp(e.target.value)}
                        onBlur={handleSaveRewardsConfig}
                      />
                      <span className={styles.inputLabelSuffix}>XP</span>
                    </div>

                    <div className={styles.rewardFieldRow}>
                      <div className={styles.inputIconPrefix}><FaCoins className={styles.coinColorIcon} /></div>
                      <input 
                        type="number"
                        placeholder="0"
                        value={rewardCorrectCoin}
                        onChange={(e) => setRewardCorrectCoin(e.target.value)}
                        onBlur={handleSaveRewardsConfig}
                      />
                      <span className={styles.inputLabelSuffix}>Koin</span>
                    </div>
                  </div>

                  {/* Kolom Penalty Salah */}
                  <div className={styles.rewardCardColumn}>
                    <h4 className={styles.rewardCardHeaderSalah}>Jika Jawaban Salah (-)</h4>
                    
                    <div className={styles.rewardFieldRow}>
                      <div className={styles.inputIconPrefix}><FaStar className={styles.xpColorIcon} /></div>
                      <input 
                        type="number"
                        placeholder="0"
                        value={penaltyWrongXp}
                        onChange={(e) => setPenaltyWrongXp(e.target.value)}
                        onBlur={handleSaveRewardsConfig}
                      />
                      <span className={styles.inputLabelSuffix}>XP</span>
                    </div>

                    <div className={styles.rewardFieldRow}>
                      <div className={styles.inputIconPrefix}><FaCoins className={styles.coinColorIcon} /></div>
                      <input 
                        type="number"
                        placeholder="0"
                        value={penaltyWrongCoin}
                        onChange={(e) => setPenaltyWrongCoin(e.target.value)}
                        onBlur={handleSaveRewardsConfig}
                      />
                      <span className={styles.inputLabelSuffix}>Koin</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* ACCORDION BANK SOAL */}
          <div className={styles.accordionContainer}>
            {(!selectedTheme.units || selectedTheme.units.length === 0) ? (
              <div className={styles.emptyArea} style={{ padding: '2rem' }}>
                <p>Belum ada soal di paket kuis ini.</p>
              </div>
            ) : (
              selectedTheme.units.map((unit, idx) => (
                <div key={idx} className={`${styles.accordionItem} ${expandedQIndex === idx ? styles.itemExpanded : ''}`}>
                  
                  <div className={styles.accordionHeader} onClick={() => setExpandedQIndex(prev => prev === idx ? null : idx)}>
                    <div className={styles.accHeadLeft}>
                      <span className={styles.qNumber}>{idx + 1}</span>
                      <span className={styles.qTextTruncated}>
                        {unit.question?.length > 70 ? unit.question.substring(0, 70) + '...' : unit.question}
                      </span>
                    </div>
                    {expandedQIndex === idx ? <FaChevronUp className={styles.accIcon} /> : <FaChevronDown className={styles.accIcon} />}
                  </div>

                  {expandedQIndex === idx && (
                    <div className={styles.accordionBody}>
                      <div className={styles.fullQuestionText}>{unit.question}</div>
                      
                      <div className={styles.optionsListDisplay}>
                        {unit.options?.map((opt, oIdx) => (
                          <div key={oIdx} className={`${styles.optionDisplayBox} ${unit.answer === oIdx ? styles.correctDisplayBox : ''}`}>
                            <div className={styles.optLetter}>{['A', 'B', 'C', 'D'][oIdx]}</div>
                            <div className={styles.optTextDisplay}>{opt}</div>
                          </div>
                        ))}
                      </div>

                      <div className={styles.qActionRow}>
                        <button className={styles.btnEditQ} onClick={() => openEditQuestion(unit, idx)}>
                          <FaPenToSquare /> Edit Soal
                        </button>
                        <button className={styles.btnDeleteQ} onClick={() => handleDeleteIndividualQuestion(idx)}>
                          <FaTrash /> Hapus
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              ))
            )}
          </div>
        </main>

        <QuestionModal 
          isOpen={isQuestionModalOpen}
          onClose={() => setIsQuestionModalOpen(false)}
          onImportJson={handleImportJson}
          onSaveManual={handleSaveManualQuestion}
          editData={editQuestionData}
          editIndex={editQuestionIndex}
        />
      </div>
    );
  }

  if (selectedMapel) {
    return (
      <div className={styles.adminContainer}>
        <header className={styles.adminHeader}>
          <button onClick={() => setSelectedMapel(null)} className={styles.navButton}>
            <FaArrowLeft /> Kembali ke Mapel
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
            <h1>Kuis {currentMapelData?.name}</h1>
            <button className={styles.addButton} onClick={() => setIsAddThemeModalOpen(true)}>
              <FaPlus /> Tambah Tema
            </button>
          </div>
        </header>

        <main className={styles.adminMain}>
          {loading ? (
            <div className={styles.loadingArea}><FaSpinner className={styles.spinnerIcon} /></div>
          ) : themes.length > 0 ? (
            <div className={styles.chapterList}>
              {themes.map((item) => (
                <div key={item.id} className={styles.subjectCardRow} onClick={() => handleSelectThemeForDetails(item)}>
                  <span className={styles.subjectIconBox}>{item.themeCode}</span>
                  <div className={styles.subMetaData}>
                    <h4>{item.theme}</h4>
                    <p>{item.units?.length || 0} Soal • Waktu: {item.timeLimit || '10:00'}</p>
                  </div>
                  
                  <div className={styles.themeActionsRow} onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => triggerDeleteTheme(e, item)} className={styles.actionDeleteIconBtn}>
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyArea}>
              <FaFolderOpen className={styles.emptyIcon} />
              <h3>Belum Ada Tema</h3>
              <p>Klik tombol di atas untuk membuat kode kuis baru.</p>
            </div>
          )}
        </main>

        {/* MODAL TAMBAH TEMA & HAPUS */}
        {isAddThemeModalOpen && (
          <div className={styles.modalOverlay} onClick={() => setIsAddThemeModalOpen(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Buat Tema Baru</h2>
              </div>
              <form onSubmit={handleCreateTheme}>
                <div className={styles.formGroup}>
                  <label>Nomor Tema (Misal: 1)</label>
                  <input type="number" min="1" value={newThemeNumber} onChange={(e) => setNewThemeNumber(e.target.value)} required />
                </div>
                <div className={styles.formGroup}>
                  <label>Judul Tema</label>
                  <input type="text" value={newThemeName} onChange={(e) => setNewThemeName(e.target.value)} required />
                </div>
                <div className={styles.modalActions}>
                  <button type="button" className={styles.cancelBtn} onClick={() => setIsAddThemeModalOpen(false)}>Batal</button>
                  <button type="submit" className={styles.submitBtn}>Simpan</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isDeleteModalOpen && themeToDelete && (
          <div className={styles.modalOverlay} onClick={() => setIsDeleteModalOpen(false)}>
            <div className={styles.modalContent} style={{ maxWidth: '400px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ color: '#ef4444', fontSize: '3rem', marginBottom: '1rem' }}><FaTrash /></div>
              <h2>Hapus Tema?</h2>
              <p>Yakin ingin menghapus <strong>{themeToDelete.themeCode}</strong>? Seluruh array soal akan ikut terhapus permanen.</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsDeleteModalOpen(false)} style={{ flex: 1 }}>Batal</button>
                <button type="button" className={styles.submitBtn} onClick={handleConfirmDelete} style={{ flex: 1, backgroundColor: '#ef4444' }}>Ya, Hapus</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.adminContainer}>
      <header className={styles.adminHeader}>
        <h1>Manajemen Kuis</h1>
        <p className={styles.subtitleHeader}>Pilih mata pelajaran untuk mengelola bank soal JSON.</p>
      </header>
      <main className={styles.adminMain}>
        <div className={styles.mapelGrid}>
          {listMapel.map((mapel) => (
            <div key={mapel.id} className={styles.mapelCard} onClick={() => setSelectedMapel(mapel.id)}>
              <div className={styles.iconCircle} style={{ backgroundColor: `${mapel.color}15`, color: mapel.color }}>
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
