// client/src/components/auth/ProtectedRoute.jsx

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { currentUser, loading } = useAuth();

    // Tampilkan indikator pemuatan jika status otentikasi masih diperiksa
    if (loading) {
        return <div>Memuat...</div>; // Ini mencegah pengalihan dini
    }

    // Setelah selesai memuat, jika tidak ada pengguna, alihkan ke halaman login
    if (!currentUser) {
        return <Navigate to="/" />;
    }

    // Jika pemuatan selesai dan ada pengguna, tampilkan konten yang dilindungi
    return children;
};

export default ProtectedRoute;
