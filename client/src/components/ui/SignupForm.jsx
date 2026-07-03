// client/src/components/ui/SignupForm.jsx

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import styles from './LoginForm.module.css';

const SignupForm = ({ onSubmit, onGoogleSignIn, isLoading, onSwitchToLogin }) => {
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error("Password tidak cocok!");
            return;
        }
        if (!displayName.trim()) {
            toast.error("Nama tidak boleh kosong!");
            return;
        }
        onSubmit(email, password, displayName);
    };

    return (
        <form onSubmit={handleSubmit} className={styles.formContainer}>
             <div className={styles.inputGroup}>
                <label htmlFor="signup-display-name">Nama Lengkap</label>
                <input
                    type="text"
                    id="signup-display-name"
                    placeholder="Ahmad Fauzi"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                />
            </div>
            <div className={styles.inputGroup}>
                <label htmlFor="signup-email">Email</label>
                <input
                    type="email"
                    id="signup-email"
                    placeholder="contoh@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
            </div>
            <div className={styles.inputGroup}>
                <label htmlFor="signup-password">Password</label>
                <input
                    type="password"
                    id="signup-password"
                    placeholder="Min. 6 Karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength="6"
                    required
                />
            </div>
            <div className={styles.inputGroup}>
                <label htmlFor="signup-confirm-password">Konfirmasi Password</label>
                <input
                    type="password"
                    id="signup-confirm-password"
                    placeholder="Ulangi password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                />
            </div>
            
            <button type="submit" disabled={isLoading} className={styles.submitButton}>
                {isLoading ? 'Mendaftar...' : 'Buat Akun Sekarang'}
            </button>

            <div className={styles.separator}>
                <span>atau</span>
            </div>

            <button type="button" onClick={onGoogleSignIn} disabled={isLoading} className={styles.googleButton}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.22-.67-.35-1.37-.35-2.09z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.86 3.03c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Daftar dengan Google</span>
            </button>

            <p className={styles.switchText}>
                Sudah punya akun? <span onClick={onSwitchToLogin}>Login</span>
            </p>
        </form>
    );
};

export default SignupForm;
