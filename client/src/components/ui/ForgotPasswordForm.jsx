// client/src/components/ui/ForgotPasswordForm.jsx

import React, { useState } from 'react';
import styles from './LoginForm.module.css';

const ForgotPasswordForm = ({ onSubmit, isLoading, onSwitchToLogin }) => {
    const [email, setEmail] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(email);
    };

    return (
        <form onSubmit={handleSubmit} className={styles.formContainer}>
            <p className={styles.infoText}>
                Masukkan email aktif Anda. Kami akan mengirimkan tautan aman untuk memperbarui password Anda.
            </p>
            <div className={styles.inputGroup}>
                <label htmlFor="forgot-email">Email Terdaftar</label>
                <input
                    type="email"
                    id="forgot-email"
                    placeholder="contoh@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
            </div>
            <button type="submit" disabled={isLoading} className={styles.submitButton}>
                {isLoading ? 'Mengirim...' : 'Kirim Link Pemulihan'}
            </button>

            <p className={styles.switchText}>
                Ingat password Anda? <span onClick={onSwitchToLogin}>Kembali Login</span>
            </p>
        </form>
    );
};

export default ForgotPasswordForm;
