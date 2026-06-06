// client/src/components/ui/ForgotPasswordForm.jsx

import React, { useState } from 'react';
import styles from './LoginForm.module.css'; // Re-use some styles

const ForgotPasswordForm = ({ onSubmit, isLoading, onSwitchToLogin }) => {
    const [email, setEmail] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(email);
    };

    return (
        <form onSubmit={handleSubmit} className={styles.formContainer}>
            <p className={styles.switchText} style={{ marginBottom: '20px' }}>
                Masukkan email Anda, kami akan kirim link reset password.
            </p>
            <div className={styles.inputGroup}>
                <label htmlFor="forgot-email">Email</label>
                <input
                    type="email"
                    id="forgot-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
            </div>
            <button type="submit" disabled={isLoading} className={styles.submitButton}>
                {isLoading ? 'Mengirim...' : 'Kirim Link Reset'}
            </button>

            <p className={styles.switchText}>
                Ingat password Anda? <span onClick={onSwitchToLogin}>Login</span>
            </p>
        </form>
    );
};

export default ForgotPasswordForm;
