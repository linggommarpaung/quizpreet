import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import Header from './Header';
import styles from '../pages/AdminPage.module.css'; // Re-using styles for now

const AdminLayout = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div>Memeriksa otorisasi...</div>;
  }

  if (!currentUser) {
    toast.error("Anda harus login untuk mengakses halaman ini.");
    return <Navigate to="/" />;
  }

  if (currentUser.role !== 'admin') {
    toast.error("Anda tidak memiliki akses ke halaman admin.");
    return <Navigate to="/dashboard" />;
  }

  // If user is admin, render the layout with the Outlet for child routes
  return (
    <div className={styles.pageContainer}>
      <Header />
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
