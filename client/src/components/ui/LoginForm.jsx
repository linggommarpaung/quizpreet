// client/src/components/ui/LoginForm.jsx

import React, { useState } from 'react';
import styles from './LoginForm.module.css'; // Import CSS Module

const LoginForm = ({ onSubmit, onGoogleSignIn, isLoading, onSwitchToSignup, onSwitchToForgotPassword }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(email, password);
    };

    return (
        <form onSubmit={handleSubmit} className={styles.formContainer}>
            <div className={styles.inputGroup}>
                <label htmlFor="login-email">Email</label>
                <input
                    type="email"
                    id="login-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
            </div>
            <div className={styles.inputGroup}>
                <label htmlFor="login-password">Password</label>
                <input
                    type="password"
                    id="login-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
            </div>
            <button type="submit" disabled={isLoading} className={styles.submitButton}>
                {isLoading ? 'Memproses...' : 'Login'}
            </button>

            <div className={styles.separator}>ATAU</div>

            <button type="button" onClick={onGoogleSignIn} disabled={isLoading} className={styles.googleButton}>
                Masuk dengan Google
            </button>

            <p className={styles.switchText}>
                Belum punya akun? <span onClick={onSwitchToSignup}>Daftar Sekarang</span>
            </p>
            <p className={styles.switchText}>
                <span onClick={onSwitchToForgotPassword}>Lupa Password?</span>
            </p>
        </form>
    );
};

export default LoginForm;
