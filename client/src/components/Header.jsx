import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './Header.module.css';
import { FaBell, FaArrowLeft, FaHome } from 'react-icons/fa';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminPage = location.pathname.startsWith('/admin');

  const handleBackClick = () => {
    if (location.pathname === '/admin') {
      navigate('/dashboard');
    } else {
      navigate(-1);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        {isAdminPage && (
          <button onClick={handleBackClick} className={styles.backButton}>
            <FaArrowLeft />
          </button>
        )}
        <div className={styles.headerTitle}>
          {isAdminPage ? 'Admin' : 'DEUTSCHE FREUNDE INDONESIA'}
        </div>
      </div>
      <div className={styles.headerMenu}>
        <button className={styles.iconButton}><FaBell /></button>
        <button className={styles.iconButton} onClick={() => navigate('/')}><FaHome /></button>
      </div>
    </header>
  );
};

export default Header;
