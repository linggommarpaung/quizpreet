// client/src/pages/AuthPage.jsx

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGDPR } from '../contexts/GDPRContext'; // <-- Impor useGDPR
import styles from './AuthPage.module.css';

// Impor komponen form
import LoginForm from '../components/ui/LoginForm';
import SignupForm from '../components/ui/SignupForm';
import ForgotPasswordForm from '../components/ui/ForgotPasswordForm';
import Spinner from '../components/ui/Spinner';

const AuthPage = () => {
    const [authMode, setAuthMode] = useState('login'); 
    const { requestConsent } = useGDPR(); // <-- Gunakan hook GDPR

    const { 
        signInWithGoogle, 
        signInWithEmail,
        signUpWithEmail,
        sendPasswordReset,
        loading 
    } = useAuth();

    // Bungkus semua aksi otentikasi dengan `requestConsent`
    const handleGoogleSignIn = () => {
        requestConsent(async () => {
            try {
                await signInWithGoogle();
            } catch (error) {
                console.error("Google Sign-In failed from AuthPage:", error);
            }
        });
    };

    const handleEmailLogin = (email, password) => {
        requestConsent(async () => {
            await signInWithEmail(email, password);
        });
    };

    const handleEmailSignup = (email, password, displayName) => {
        requestConsent(async () => {
            await signUpWithEmail(email, password, displayName);
        });
    };

    const handlePasswordReset = async (email) => {
        await sendPasswordReset(email);
        setAuthMode('login');
    };

    const renderForm = () => {
        // Hapus logika yang menonaktifkan form
        switch (authMode) {
            case 'signup':
                return (
                    <SignupForm 
                        onSubmit={handleEmailSignup}
                        onGoogleSignIn={handleGoogleSignIn}
                        isLoading={loading}
                        onSwitchToLogin={() => setAuthMode('login')}
                    />
                );
            case 'forgot':
                return (
                    <ForgotPasswordForm
                        onSubmit={handlePasswordReset}
                        isLoading={loading}
                        onSwitchToLogin={() => setAuthMode('login')}
                    />
                );
            case 'login':
            default:
                return (
                    <LoginForm
                        onSubmit={handleEmailLogin}
                        onGoogleSignIn={handleGoogleSignIn}
                        isLoading={loading}
                        onSwitchToSignup={() => setAuthMode('signup')}
                        onSwitchToForgotPassword={() => setAuthMode('forgot')}
                    />
                );
        }
    };

    return (
        <div className={styles.authPageContainer}>
            {loading && <Spinner />}
            <div className={styles.backgroundWave}></div>
            <div className={styles.authCard}>
                 <div className={styles.authHeader}>
                    {authMode === 'login' && <h1>Selamat Datang!</h1>}
                    {authMode === 'signup' && <h1>Buat Akun Baru</h1>}
                    {authMode === 'forgot' && <h1>Reset Password Anda</h1>}
                    <p>Mulai perjalanan kuis Anda untuk menjadi pahlawan kemerdekaan!</p>
                </div>
                
                {renderForm()}
                
                <div className={styles.footerText}>
                    <p>Dengan melanjutkan, Anda menyetujui Ketentuan Layanan & Kebijakan Privasi kami.</p>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
