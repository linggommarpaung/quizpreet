// client/src/components/ui/LatihanSoalSection.jsx
import React from 'react';
import { FaCircleCheck, FaLightbulb, FaGraduationCap } from 'react-icons/fa6';
import styles from '../../pages/ForumPage.module.css';

const LatihanSoalSection = ({
  latihanSoal = [],
  currentLatihanIdx,
  setCurrentLatihanIdx,
  selectedLatihanAns,
  showPembahasan,
  handleLatihanAnswer,
  setActiveMateriSubTab
}) => {
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
