// client/src/components/ui/LatihanSoalSection.jsx
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom'; // 🟢 Tambahkan import router
import { 
  FaCircleCheck, 
  FaLightbulb, 
  FaGraduationCap, 
  FaClock, 
  FaAward, 
  FaLock, 
  FaPaperPlane, 
  FaFaceFrown, 
  FaCoins, 
  FaBolt, 
  FaShareNodes 
} from 'react-icons/fa6';
import styles from './LatihanSoalSection.module.css';

const LatihanSoalSection = ({
  
  setIsExitingSafely,
  // Kontrol Navigasi Utama Tab
  activeMateriSubTab,
  setActiveMateriSubTab,

  // Props Latihan Soal
  latihanSoal = [],
  currentLatihanIdx,
  setCurrentLatihanIdx,
  selectedLatihanAns,
  showPembahasan,
  handleLatihanAnswer,

  // Props Mini Ulangan
  selectedChapter,
  isUjianStarted,
  setIsUjianStarted,
  ujianTimer,
  formatUjianTime,
  selectedUjianAns,
  setSelectedUjianAns,
  handleFinishUjian,
  showUjianResultModal,
  ujianCardRef,
  isLulusUjian,
  ujianScore,
  hasCompletedThisChapterBefore,
  handleShareHasilUjian,
  chapters,
  maxCompletedOrder,
  handleSelectChapter,
  
  // Props pembersih lama (Bisa dibiarkan untuk mencegah error dari parent)
  setSelectedChapter,
  setPageTimers,
  setUnlockedPages,
  setNumPages,
  setFullscreenLevel,
  setShowUjianResultModal
}) => {

  const navigate = useNavigate();
  const { subjectId } = useParams();
  
  // =======================================================================
  // 🟢 MODE RENDER: MINI ULANGAN
  // =======================================================================
  if (activeMateriSubTab === 'ulangan') {
    return (
      <div className={styles.ujianWrapper}>
        
        {!isUjianStarted && !showUjianResultModal && (
          <div className={styles.gerbangUjianBox}>
            <h3><FaGraduationCap /> Mini Ulangan: {selectedChapter?.title}</h3>
            <p>Uji kesiapan pemahaman materi Olimpiade kamu di bab ini dengan aturan berikut:</p>
            <div className={styles.aturanUjianList}>
              <div><FaCircleCheck /> <strong>Jumlah Soal:</strong> {selectedChapter?.miniUlangan?.length || 0} Soal Pilihan Ganda</div>
              <div><FaClock /> <strong>Durasi Waktu:</strong> 10 Menit (Timer Global)</div>
              <div><FaAward /> <strong>Syarat Kelulusan (KKM):</strong> Minimal 75%</div>
              <div><FaLock /> <strong>Sistem Ujian:</strong> Tertutup. Kunci jawaban & pembahasan baru terbuka setelah ujian dikirim.</div>
            </div>
            <button 
              className={styles.startUjianBtn}
              onClick={() => setIsUjianStarted(true)}
            >
              Mulai Ujian Bab Sekarang <FaPaperPlane />
            </button>
          </div>
        )}

        {isUjianStarted && (
          <div className={styles.lembaranUjianActive}>
            <div className={styles.floatingTimerHeader}>
              <span>Sisa Waktu: <strong className={ujianTimer <= 60 ? styles.timerKritis : ''}>{formatUjianTime(ujianTimer)}</strong></span>
            </div>

            <div className={styles.judulDaftarSoal}>Lembar Jawaban Mini Ulangan</div>

            <div className={styles.scrollableSoalArea}>
              {selectedChapter?.miniUlangan?.map((soal, idx) => {
                const qId = soal.id || idx;
                return (
                  <div key={qId} className={styles.barisSoalPolos}>
                    <p className={styles.teksSoalUjian}>{idx + 1}. {soal.question}</p>
                    <div className={styles.pilihanUjianRow}>
                      {soal.options?.map(opt => {
                        const isChecked = selectedUjianAns[qId] === opt;
                        return (
                          <button
                            key={opt}
                            className={`${styles.btnOpsiUjianPolos} ${isChecked ? styles.btnOpsiUjianTerpilih : ''}`}
                            onClick={() => setSelectedUjianAns(prev => ({ ...prev, [qId]: opt }))}
                          >
                            <span className={styles.bulatanCeklist}>{isChecked ? '●' : '○'}</span> {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <button 
                className={styles.submitUjianActionBtn}
                onClick={() => handleFinishUjian(false)}
              >
                Selesai & Kirim Ujian <FaLock />
              </button>
            </div>
          </div>
        )}

        {showUjianResultModal && (
          <div className={styles.backdropModalUjian}>
            <div className={styles.cardHasilUjianKertas} ref={ujianCardRef}>
              {isLulusUjian ? (
                <div className={styles.badgeStatusLulus}>LULUS EXAM <FaAward /></div>
              ) : (
                <div className={styles.badgeStatusRemedial}>REMEDIAL <FaFaceFrown /></div>
              )}
              
              <h2 className={styles.titleHasilChapter}>{selectedChapter?.title}</h2>
              <div className={styles.dividerGaris}></div>
              
              <div className={styles.scoreBesarMelingkar}>
                <span className={styles.labelScoreKecil}>SKOR AKHIR</span>
                <span className={styles.angkaScoreUtama}>{ujianScore}</span>
                <span className={styles.labelKkmKeterangan}>Target: 75</span>
              </div>

              <div className={styles.boxRewardUjianKecil}>
                <h5><FaAward /> Perolehan Hadiah Bab:</h5>
                <div className={styles.rowRewardAset}>
                  {!hasCompletedThisChapterBefore ? (
                    <>
                      <span><FaCoins /> +5 Koin</span>
                      <span><FaBolt /> +20 EXP</span>
                    </>
                  ) : (
                    <span><FaBolt /> +4 EXP</span>
                  )}
                </div>
                <p className={styles.notifReviewSaja}>*Mengulangi materi/ujian yang sudah lulus tidak akan menduplikasi koin.</p>
              </div>

              <div className={styles.grupAksiTombolModal}>
                <button className={styles.btnAksiShare} onClick={handleShareHasilUjian}>
                  <FaShareNodes /> Bagikan Hasil
                </button>
                
                <div className={styles.rowAksiNavigasi}>
                  <button 
                    className={styles.btnAksiKembaliList}
                    onClick={() => {
      // 🟢 1. Tandai bahwa ini adalah keluar yang aman (sudah selesai ujian)
      if (setIsExitingSafely) setIsExitingSafely(true);

      // 2. Tutup status modal ujian
      setShowUjianResultModal(false);
      setIsUjianStarted(false);
      
      // 3. Navigasi otomatis kembali ke list mapel
      navigate(`/forum/list/${subjectId}`); 
      
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        document.exitFullscreen().catch(err => console.log(err));
      }
    }}
                  >
                    List Bab
                  </button>
                  
                  <button 
                    className={styles.btnAksiLanjutBab}
                    onClick={() => {
                      const currentIdx = chapters.findIndex(c => c.id === selectedChapter?.id);
                      const nextChapterObj = chapters[currentIdx + 1];

                      setShowUjianResultModal(false);
                      setIsUjianStarted(false);

                      if (nextChapterObj) {
                        const isNextLocked = Number(nextChapterObj.order || 0) > (maxCompletedOrder + 1);
                        if (isNextLocked) {
                          alert("Bab selanjutnya masih terkunci! Selesaikan target prasyarat dulu.");
                          // 🟢 Navigasi kembali karena bab belum terbuka
                          navigate(`/forum/list/${subjectId}`);
                          if (document.fullscreenElement || document.webkitFullscreenElement) {
                            document.exitFullscreen().catch(err => console.log(err));
                          }
                        } else {
                          // Memanggil handleSelectChapter bawaan ForumPage yang sudah dilengkapi URL router
                          handleSelectChapter(nextChapterObj);
                        }
                      } else {
                        alert("Hebat! Kamu telah menamatkan semua bab di Mapel ini!");
                        // 🟢 Navigasi kembali karena sudah tamat
                        navigate(`/forum/list/${subjectId}`);
                        if (document.fullscreenElement || document.webkitFullscreenElement) {
                          document.exitFullscreen().catch(err => console.log(err));
                        }
                      }
                    }}
                  >
                    Bab Selanjutnya
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =======================================================================
  // 🔵 MODE RENDER: LATIHAN SOAL STANDARD
  // =======================================================================
  if (!latihanSoal || latihanSoal.length === 0) {
    return <div className={styles.emptyStateBlock}>Belum ada latihan soal untuk bab ini.</div>;
  }

  const totalSoal = latihanSoal.length;
  const currentLat = latihanSoal[currentLatihanIdx];
  const qId = currentLat.id || currentLatihanIdx;
  
  const isChosen = selectedLatihanAns[qId] !== undefined;
  const isSelesaiSemua = latihanSoal.every((lat, idx) => selectedLatihanAns[lat.id || idx] !== undefined);

  return (
    <div className={styles.latihanFlexSection}>
      <div className={styles.infoAlertBanner}>
        <FaCircleCheck /> Materi selesai dibaca! Selesaikan latihan di bawah:
      </div>

      <div className={styles.latihanQuizContainer}>
        <div className={styles.quizHeaderMeta}>
          <span>Soal <strong>{currentLatihanIdx + 1}</strong> dari {totalSoal}</span>
          <div className={styles.miniProgressDots}>
            {latihanSoal.map((_, dotIdx) => (
              <div 
                key={dotIdx} 
                className={`${styles.dotItem} ${dotIdx === currentLatihanIdx ? styles.dotActive : selectedLatihanAns[_.id || dotIdx] !== undefined ? styles.dotFilled : ''}`}
              ></div>
            ))}
          </div>
        </div>

        <div className={styles.latihanQuestionCardAnim} key={currentLatihanIdx}>
          <h4>{currentLatihanIdx + 1}. {currentLat.question}</h4>
          
          <div className={styles.latihanOptionsVerticalStack}>
            {currentLat.options?.map(opt => {
              const isThisOptChosen = selectedLatihanAns[qId] === opt;
              const isCorrect = currentLat.answer === opt;
              
              let optionClass = styles.latihanOptBtn;
              if (showPembahasan[qId]) {
                if (isCorrect) optionClass = styles.correctOptBtn;
                else if (isThisOptChosen) optionClass = styles.wrongOptBtn;
              } else if (isThisOptChosen) {
                optionClass = styles.latihanOptBtnPicked;
              }

              return (
                <button 
                  key={opt} 
                  disabled={showPembahasan[qId]} 
                  onClick={() => handleLatihanAnswer(qId, opt, currentLat.answer)} 
                  className={optionClass}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {showPembahasan[qId] && (
            <div className={styles.latihanExplanationBox}>
              <h5><FaLightbulb /> Kunci Pembahasan:</h5>
              <p>{currentLat.explanation}</p>
            </div>
          )}
        </div>

        <div className={styles.quizNavigationRow}>
          <button 
            className={styles.quizNavBtn}
            disabled={currentLatihanIdx === 0}
            onClick={() => setCurrentLatihanIdx(p => p - 1)}
          >
            &larr; Sebelumnya
          </button>

          {currentLatihanIdx < totalSoal - 1 ? (
            <button 
              className={styles.quizNavBtnPrimary}
              disabled={!isChosen}
              onClick={() => setCurrentLatihanIdx(p => p + 1)}
            >
              Selanjutnya &rarr;
            </button>
          ) : (
            <button 
              className={styles.quizNavBtnFinished}
              disabled={!isSelesaiSemua}
              onClick={() => {
                setActiveMateriSubTab('ulangan');
                setCurrentLatihanIdx(0);
              }}
            >
              Buka Ujian Bab <FaGraduationCap />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LatihanSoalSection;
