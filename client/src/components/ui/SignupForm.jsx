// client/src/components/ui/SignupForm.jsx

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import styles from './LoginForm.module.css';

const SignupForm = ({ onSubmit, onGoogleSignIn, isLoading, onSwitchToLogin }) => {
    const [displayName, setDisplayName] = useState(''); // Tambahkan state untuk displayName
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error("Password dan Konfirmasi Password tidak cocok!");
            return;
        }
        if (!displayName.trim()) { // Validasi displayName tidak boleh kosong
            toast.error("Nama Tampilan tidak boleh kosong!");
            return;
        }
        onSubmit(email, password, displayName); // Kirim displayName ke fungsi onSubmit
    };

    return (
        <form onSubmit={handleSubmit} className={styles.formContainer}>
             <div className={styles.inputGroup}>
                <label htmlFor="signup-display-name">Nama Tampilan</label>
                <input
                    type="text"
                    id="signup-display-name"
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength="6" // Tambahkan validasi minimal panjang password
                    required
                />
            </div>
            <div className={styles.inputGroup}>
                <label htmlFor="signup-confirm-password">Konfirmasi Password</label>
                <input
                    type="password"
                    id="signup-confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                />
            </div>
            <button type="submit" disabled={isLoading} className={styles.submitButton}>
                {isLoading ? 'Mendaftar...' : 'Daftar'}
            </button>

            <div className={styles.separator}>ATAU</div>

            <button type="button" onClick={onGoogleSignIn} disabled={isLoading} className={styles.googleButton}>
                Daftar dengan Google
            </button>

            <p className={styles.switchText}>
                Sudah punya akun? <span onClick={onSwitchToLogin}>Login Sekarang</span>
            </p>
        </form>
    );
};

export default SignupForm;
