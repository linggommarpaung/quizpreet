// client/src/components/ui/ChapterList.jsx
import React from 'react';
import { FaArrowLeft, FaSpinner, FaLock, FaCircleCheck, FaUnlock, FaChevronRight } from 'react-icons/fa6';
import { toast } from 'react-hot-toast';
import styles from '../../pages/ForumPage.module.css'; // Memakai modul css utama agar style tetap menyatu

const ChapterList = ({ 
  selectedSubject, 
  handleBackFromSubject, 
  loadingChapters, 
  chapters, 
  maxCompletedOrder, 
  handleSelectChapter 
}) => {
  return (
    <div className={styles.hubContentPanel}>
      <div className={styles.customLevel1Navbar}>
        <button className={styles.backToHubBtn} onClick={handleBackFromSubject}>
          <FaArrowLeft /> Kembali
        </button>
        <span className={styles.navbarSubjectTitle}>
          {selectedSubject.name.includes("Alam") ? "IPA" : 
           selectedSubject.name.includes("Sosial") ? "IPS" : 
           selectedSubject.name}
        </span>
        <div style={{ width: '32px' }}></div>
      </div>

      <div className={styles.selectionStandardGrid}>
        <h2 className={styles.sectionHeaderTitle}>Daftar Bab Belajar</h2>
        
        <div className={styles.chapterBoxStack}>
          {loadingChapters ? (
            <div className={styles.loadingStateBlock}>
              <FaSpinner className={styles.spinnerIconAnim} />
              <p>Memuat daftar bab...</p>
            </div>
          ) : chapters.length > 0 ? (
            chapters.map((ch, index) => {
              const currentOrder = Number(ch.order || 0);
              const isLocked = index === 0 ? false : currentOrder > (maxCompletedOrder + 1);
              const isCompleted = currentOrder <= maxCompletedOrder;

              return (
                <div 
                  key={ch.id} 
                  className={`${styles.chapterCardRow} ${isLocked ? styles.chapterRowLocked : ''}`} 
                  onClick={() => {
                    if (isLocked) {
                      toast.error("Materi Terkunci! Kerjakan mini ulangan bab sebelumnya terlebih dahulu ya!");
                    } else {
                      handleSelectChapter(ch);
                    }
                  }}
                >
                  <div className={styles.chapterRowMetaTop}>
                    <span>BAB {ch.order}</span>
                    {isLocked ? (
                      <span className={styles.badgeLockedStatus}><FaLock /> Terkunci</span>
                    ) : isCompleted ? (
                      <span className={styles.badgeCompletedStatus}><FaCircleCheck /> Selesai</span>
                    ) : (
                      <span className={styles.badgeOpenStatus}><FaUnlock /> Terbuka</span>
                    )}
                  </div>
                  <h4>{ch.title}</h4>
                  <FaChevronRight className={styles.arrowCardIcon} />
                </div>
              );
            })
          ) : (
            <div className={styles.emptyStateBlock}>Belum ada materi bab tersedia.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChapterList;
