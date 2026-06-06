// client/src/pages/admin/AdminDashboard.jsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './AdminDashboard.module.css';
import { 
  FaQuestionCircle, 
  FaBookOpen, // Mengganti FaNewspaper dengan ikon Buku untuk Materi
  FaDollarSign, 
  FaBell, 
  FaSignOutAlt, 
  FaCog, 
  FaUserShield, 
  FaFileContract 
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext'; 
import toast, { Toaster } from 'react-hot-toast';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

const AdminDashboard = () => {
  const { logout } = useAuth();
  const [themeCount, setThemeCount] = useState(0);

  useEffect(() => {
    const fetchThemeCount = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'dailyPaths'));
        setThemeCount(querySnapshot.size);
      } catch (error) {
        console.error("Error fetching theme count: ", error);
        toast.error('Gagal memuat jumlah tema.');
      }
    };

    fetchThemeCount();
  }, []);

  const handleComingSoon = (e) => {
    e.preventDefault();
    toast.success('Akan segera hadir');
  };

  return (
    <div className={styles.dashboardContainer}>
      <Toaster />
      <div className={styles.widgetsGrid}>
        {/* Manage Quiz */}
        <Link to="quiz" className={styles.widgetCard}>
          <FaQuestionCircle className={`${styles.widgetIcon} ${styles.quizIcon}`} />
          <div className={styles.widgetInfo}>
            <h3 className={styles.widgetTitle}>Manage Quiz</h3>
            <p className={styles.widgetText}>Total {themeCount} Themes</p>
          </div>
        </Link>

        {/* HAPUS NEWS -> GANTI JADI MANAJEMEN MATERI */}
        <Link to="materi" className={styles.widgetCard}>
          <FaBookOpen className={`${styles.widgetIcon} ${styles.materiIcon}`} />
          <div className={styles.widgetInfo}>
            <h3 className={styles.widgetTitle}>Manajemen Materi</h3>
            <p className={styles.widgetText}>Kelola Mapel & Upload Bab</p>
          </div>
        </Link>

        {/* Sales / Income */}
        <a href="#" className={styles.widgetCard} onClick={handleComingSoon}>
          <FaDollarSign className={`${styles.widgetIcon} ${styles.salesIcon}`} />
          <div className={styles.widgetInfo}>
            <h3 className={styles.widgetTitle}>Sales / Income</h3>
            <p className={styles.widgetText}>View sales and income</p>
          </div>
        </a>

        {/* Notification */}
        <a href="#" className={styles.widgetCard} onClick={handleComingSoon}>
          <FaBell className={`${styles.widgetIcon} ${styles.notificationIcon}`} />
          <div className={styles.widgetInfo}>
            <h3 className={styles.widgetTitle}>Notification</h3>
            <p className={styles.widgetText}>Total 1 Templates</p>
          </div>
        </a>

        {/* Settings */}
        <Link to="setting" className={styles.widgetCard}>
          <FaCog className={`${styles.widgetIcon} ${styles.settingsIcon}`} />
          <div className={styles.widgetInfo}>
            <h3 className={styles.widgetTitle}>Settings</h3>
            <p className={styles.widgetText}>App and user settings</p>
          </div>
        </Link>

        {/* Administrator */}
        <Link to="administrator" className={styles.widgetCard}>
          <FaUserShield className={`${styles.widgetIcon} ${styles.adminIcon}`} />
          <div className={styles.widgetInfo}>
            <h3 className={styles.widgetTitle}>Administrator</h3>
            <p className={styles.widgetText}>Manage user roles</p>
          </div>
        </Link>

        {/* License */}
        <a href="#" className={styles.widgetCard} onClick={handleComingSoon}>
          <FaFileContract className={`${styles.widgetIcon} ${styles.licenseIcon}`} />
          <div className={styles.widgetInfo}>
            <h3 className={styles.widgetTitle}>License</h3>
            <p className={styles.widgetText}>View and manage licenses</p>
          </div>
        </a>
      </div>
    </div>
  );
};

export default AdminDashboard;
