import React, { useState, useEffect, useCallback } from 'react';
import styles from './SettingsPage.module.css';
import { getAppName, updateAppName, getUsersByRole } from '../../services/firestoreService';
import toast from 'react-hot-toast';

const SettingsPage = () => {
  const [appName, setAppName] = useState('');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const fetchAppData = useCallback(async () => {
    try {
      const currentAppName = await getAppName();
      setAppName(currentAppName);
    } catch (error) {
      toast.error('Gagal memuat nama aplikasi.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const userList = await getUsersByRole('user');
      setUsers(userList);
    } catch (error) {
      toast.error('Gagal memuat daftar pengguna.');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchAppData();
    fetchUsers();
  }, [fetchAppData, fetchUsers]);

  const handleSaveAppName = async () => {
    if (!appName.trim()) {
      toast.error('Nama aplikasi tidak boleh kosong.');
      return;
    }
    try {
      await updateAppName(appName);
      toast.success('Nama aplikasi berhasil diperbarui!');
    } catch (error) {
      toast.error('Gagal memperbarui nama aplikasi.');
    }
  };

  return (
    <div className={styles.container}>
      <h1>Pengaturan Aplikasi</h1>

      <div className={styles.section}>
        <h2>Nama Aplikasi</h2>
        {loading ? (
          <p>Memuat...</p>
        ) : (
          <>
            <div className={styles.formGroup}>
              <label htmlFor="appName">Nama Aplikasi</label>
              <input
                type="text"
                id="appName"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
              />
            </div>
            <button onClick={handleSaveAppName} className={styles.button}>
              Simpan Perubahan
            </button>
          </>
        )}
      </div>

      <div className={styles.section}>
        <h2>Daftar Pengguna</h2>
        {loadingUsers ? (
          <p>Memuat pengguna...</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nama Pengguna</th>
                <th>Email</th>
                <th>Peran</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
