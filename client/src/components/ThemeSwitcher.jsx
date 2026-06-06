import React, { useContext } from 'react';
import ThemeContext from '../contexts/ThemeContext';
import styles from './ThemeSwitcher.module.css';
import { FaSun, FaMoon, FaDesktop } from 'react-icons/fa';

const ThemeSwitcher = () => {
  const { theme, setTheme } = useContext(ThemeContext);

  return (
    <div className={styles.themeSwitcher}>
      <button
        className={`${styles.themeButton} ${theme === 'light' ? styles.active : ''}`}
        onClick={() => setTheme('light')}
      >
        <FaSun />
      </button>
      <button
        className={`${styles.themeButton} ${theme === 'dark' ? styles.active : ''}`}
        onClick={() => setTheme('dark')}
      >
        <FaMoon />
      </button>
      <button
        className={`${styles.themeButton} ${theme === 'system' ? styles.active : ''}`}
        onClick={() => setTheme('system')}
      >
        <FaDesktop />
      </button>
    </div>
  );
};

export default ThemeSwitcher;
