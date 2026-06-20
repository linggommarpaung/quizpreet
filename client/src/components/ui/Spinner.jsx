// client/src/components/ui/Spinner.jsx

import React from 'react';
import styles from './Spinner.module.css';
import loadingGif from '../../assets/load.gif'; 

const Spinner = () => {
    return (
        <div className={styles.spinnerOverlay}>
            <div className={styles.spinnerContainer}>
                {/* Menampilkan GIF animasi logo */}
                <img src={loadingGif} alt="Loading Animation" className={styles.gifImage} />
                
                {/* 3 Titik Pantul Bergantian */}
                <div className={styles.bouncingDotsContainer}>
                    <span className={styles.dot}></span>
                    <span className={styles.dot}></span>
                    <span className={styles.dot}></span>
                </div>
            </div>
        </div>
    );
};

export default Spinner;
