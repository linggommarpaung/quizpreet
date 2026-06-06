// client/src/components/ui/GDPRModal.jsx

import React from 'react';
import styles from './GDPRModal.module.css';

const GDPRModal = ({ isOpen, onAccept, onDecline }) => {
    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h2 className={styles.title}>Kebijakan Privasi & Cookie</h2>
                <p className={styles.description}>
                    Situs web kami menggunakan cookie untuk meningkatkan pengalaman Anda. Dengan melanjutkan, Anda menyetujui penggunaan cookie kami dan kebijakan privasi data kami. Ini diperlukan agar fitur-fitur seperti login dan penyimpanan progres Anda dapat berfungsi.
                </p>
                <div className={styles.buttonContainer}>
                    <button 
                        onClick={onAccept} 
                        className={`${styles.button} ${styles.acceptButton}`}>
                        Setuju
                    </button>
                    <button 
                        onClick={onDecline} 
                        className={`${styles.button} ${styles.declineButton}`}>
                        Tolak
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GDPRModal;
