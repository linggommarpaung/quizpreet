// client/src/contexts/GDPRContext.jsx

import React, { createContext, useContext, useState, useCallback } from 'react';
import GDPRModal from '../components/ui/GDPRModal'; // Akan kita buat/refaktor
import { toast } from 'react-hot-toast';

const GDPRContext = createContext(null);

export const useGDPR = () => useContext(GDPRContext);

export const GDPRProvider = ({ children }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [onConsentCallback, setOnConsentCallback] = useState(null);

    const requestConsent = useCallback((callback) => {
        const consent = localStorage.getItem('gdpr-consent');
        if (consent === 'true') {
            if (callback) callback(); // Langsung jalankan jika sudah setuju
        } else {
            // Jika belum setuju atau pernah menolak, tampilkan modal
            setOnConsentCallback(() => callback);
            setIsModalOpen(true);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('gdpr-consent', 'true');
        setIsModalOpen(false);
        toast.success('Terima kasih telah menyetujui kebijakan kami!');
        if (onConsentCallback) {
            onConsentCallback();
        }
    };

    const handleDecline = () => {
        localStorage.setItem('gdpr-consent', 'false');
        setIsModalOpen(false);
        toast.error('Persetujuan diperlukan untuk mendaftar atau masuk.', { duration: 4000 });
    };

    const value = { requestConsent };

    return (
        <GDPRContext.Provider value={value}>
            {children}
            <GDPRModal
                isOpen={isModalOpen}
                onAccept={handleAccept}
                onDecline={handleDecline}
            />
        </GDPRContext.Provider>
    );
};
