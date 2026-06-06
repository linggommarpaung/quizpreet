// client/src/components/ui/Spinner.jsx

import React from 'react';
import styles from './Spinner.module.css';

const Spinner = () => {
    return (
        <div className={styles.spinnerOverlay}>
            <div className={styles.spinnerContainer}>
                <div className={styles.premiumSpinner}>
                    <div className={styles.spinnerInnerRing}></div>
                </div>
                <p className={styles.spinnerText}>Memuat Data...</p>
            </div>
        </div>
    );
};

export default Spinner;
