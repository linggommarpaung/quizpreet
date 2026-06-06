// client/src/components/SubNavForum.jsx
import React from 'react';
import { FaBookOpen, FaComments, FaRobot } from 'react-icons/fa6';
import styles from './SubNavForum.module.css';
import { useSocket } from '../contexts/SocketContext';

const SubNavForum = ({ activeTab, setActiveTab, disabled }) => {
  const { totalUnreadCount } = useSocket();
  return (
    <div className={`${styles.tabNavContainer} ${disabled ? styles.navDisabled : ''}`}>
      <button 
        className={`${styles.tabBtn} ${activeTab === 'materi' ? styles.activeTab : ''}`}
        onClick={() => !disabled && setActiveTab('materi')}
        disabled={disabled}
      >
        <FaBookOpen size={18} />
        <span>Hub Materi</span>
      </button>
      <button 
        className={`${styles.tabBtn} ${activeTab === 'chat' ? styles.activeTab : ''} ${styles.relativeBtn}`} // <-- Tambah class relativeBtn
        onClick={() => !disabled && setActiveTab('chat')}
        disabled={disabled}
      >
        <FaComments size={18} />
        <span>Chat Global</span>
        
        {/* BULATAN MERAH NOTIFIKASI */}
        {totalUnreadCount > 0 && (
          <span className={styles.globalRedBadgeNotif}>
            {totalUnreadCount}
          </span>
        )}
      </button>
      <button 
        className={`${styles.tabBtn} ${activeTab === 'ai' ? styles.activeTab : ''}`}
        onClick={() => !disabled && setActiveTab('ai')}
        disabled={disabled}
      >
        <FaRobot size={18} />
        <span>AI Tutor</span>
      </button>
    </div>
  );
};

export default SubNavForum;
