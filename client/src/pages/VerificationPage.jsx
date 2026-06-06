// client/src/pages/VerificationPage.jsx

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import styles from './VerificationPage.module.css'; // Buat file CSS ini

const VerificationPage = () => {
    const { currentUser, resendVerificationEmail, signOut } = useAuth();
    const navigate = useNavigate();

    const handleResendEmail = () => {
        resendVerificationEmail();
    };

    const handleSignOut = () => {
        signOut();
        navigate('/');
    }

    return (
        <div className={styles.verificationContainer}>
            <div className={styles.verificationCard}>
                <h2>Verifikasi Email Anda</h2>
                <p>
                    Terima kasih telah mendaftar! Sebuah link verifikasi telah dikirim ke 
                    <strong>{currentUser?.email}</strong>.
                </p>
                <p>
                    Silakan periksa kotak masuk Anda (dan folder spam) dan klik link tersebut untuk melanjutkan.
                </p>
                <div className={styles.buttonGroup}>
                    <button onClick={handleResendEmail} className={styles.resendButton}>
                        Kirim Ulang Email
                    </button>
                    <button onClick={handleSignOut} className={styles.logoutButton}>
                        Logout
                    </button>
                </div>
                <p className={styles.infoText}>
                    Setelah email Anda terverifikasi, Anda akan dapat login.
                </p>
            </div>
        </div>
    );
};

export default VerificationPage;
