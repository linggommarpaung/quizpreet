// client/src/components/ui/MiniUlanganSection.jsx
import React from 'react';
import { FaGraduationCap, FaCircleCheck, FaClock, FaAward, FaLock, FaPaperPlane, FaFaceFrown, FaCoins, FaBolt, FaShareNodes } from 'react-icons/fa6';
import styles from '../../pages/ForumPage.module.css';

const MiniUlanganSection = ({
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
  setSelectedChapter,
  setPageTimers,
  setUnlockedPages,
  setNumPages,
  setFullscreenLevel,
  setShowUjianResultModal
}) => {
  return (
    <div className={styles.ujianWrapper}>
      
      {!isUjianStarted && !showUjianResultModal && (
        <div className={styles.gerbangUjianBox}>
          <h3><FaGraduationCap /> Mini Ulangan: {selectedChapter.title}</h3>
          <p>Uji kesiapan pemahaman materi Olimpiade kamu di bab ini dengan aturan berikut:</p>
          <div className={styles.aturanUjianList}>
            <div><FaCircleCheck /> <strong>Jumlah Soal:</strong> {selectedChapter.miniUlangan?.length || 0} Soal Pilihan Ganda</div>
            <div><FaClock /> <strong>Durasi Waktu:</strong> 10 Menit (Timer Global)</div>
            <div><FaAward /> <strong>Syarat Kelulusan (KKM):</strong> Minimal 75%</div>
            <div><FaLock /> <strong>Sistem Ujian:</strong> Tertutup. Kunci jawaban & pembahasan baru terbuka setelah ujian dikirim.</div>
          </div>
          <button 
            className={styles.startUjianBtn}
            onClick={() => {
              setIsUjianStarted(true);
            }}
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
            {selectedChapter.miniUlangan?.map((soal, idx) => {
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
            
            <h2 className={styles.titleHasilChapter}>{selectedChapter.title}</h2>
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
                    setShowUjianResultModal(false);
                    setIsUjianStarted(false);
                    setSelectedChapter(null);
                    setPageTimers({});
                    setUnlockedPages({});
                    setNumPages(null);
                    setFullscreenLevel(1); 
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
                    const currentIdx = chapters.findIndex(c => c.id === selectedChapter.id);
                    const nextChapterObj = chapters[currentIdx + 1];

                    setShowUjianResultModal(false);
                    setIsUjianStarted(false);

                    if (nextChapterObj) {
                      const isNextLocked = Number(nextChapterObj.order || 0) > (maxCompletedOrder + 1);
                      if (isNextLocked) {
                        alert("Bab selanjutnya masih terkunci! Selesaikan target prasyarat dulu.");
                        setSelectedChapter(null);
                        setFullscreenLevel(1);
                        if (document.fullscreenElement || document.webkitFullscreenElement) {
                          document.exitFullscreen().catch(err => console.log(err));
                        }
                      } else {
                        handleSelectChapter(nextChapterObj);
                      }
                    } else {
                      alert("Hebat! Kamu telah menamatkan semua bab di Mapel ini!");
                      setSelectedChapter(null);
                      setFullscreenLevel(1);
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
};

export default MiniUlanganSection;
