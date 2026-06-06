import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import styles from './AdministratorPage.module.css';
import { useAuth } from '../../contexts/AuthContext';

const AdministratorPage = () => {
  const [admins, setAdmins] = useState([]);
  const [users, setUsers] = useState([]);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [adminToDelete, setAdminToDelete] = useState(null);
  const { currentUser } = useAuth();

  const fetchAdminsAndUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const adminUsers = allUsers.filter(user => user.role === 'admin');
      const regularUsers = allUsers.filter(user => user.role !== 'admin');
      
      setAdmins(adminUsers);
      setUsers(regularUsers);
    } catch (error) {
      console.error("Error fetching users: ", error);
      toast.error('Gagal memuat data pengguna.');
    }
  };

  useEffect(() => {
    fetchAdminsAndUsers();
  }, []);

  const handleAddAdminClick = () => {
    if (currentUser?.userPower !== 1) {
      toast.error('Anda tidak memiliki izin untuk menambah admin.');
      return;
    }
    setShowAddAdminModal(true);
  };

  const handleRemoveAdminClick = (admin) => {
    if (currentUser?.userPower !== 1) {
      toast.error('Anda tidak memiliki izin untuk menghapus admin.');
      return;
    }
    if (currentUser?.userPower === 1 && admin.userPower === 1) {
      toast.error('Tidak bisa menghapus sesama Super Admin.');
      return;
    }
    openDeleteConfirmModal(admin.id);
  };

  const handleAddAdmin = async () => {
    if (!selectedUser) {
      toast.error('Silakan pilih pengguna untuk dijadikan admin.');
      return;
    }

    try {
      const userDocRef = doc(db, 'users', selectedUser);
      await updateDoc(userDocRef, { role: 'admin' });
      toast.success('Pengguna berhasil dijadikan admin.');
      setShowAddAdminModal(false);
      fetchAdminsAndUsers();
    } catch (error) {
      console.error("Error updating user role: ", error);
      toast.error('Gagal menjadikan pengguna sebagai admin.');
    }
  };

  const openDeleteConfirmModal = (adminId) => {
    setAdminToDelete(adminId);
    setShowConfirmDeleteModal(true);
  };

  const handleRemoveAdmin = async () => {
    if (!adminToDelete) return;

    try {
      const userDocRef = doc(db, 'users', adminToDelete);
      await updateDoc(userDocRef, { role: 'user' });
      toast.success('Admin berhasil dihapus.');
      fetchAdminsAndUsers();
    } catch (error) {
      console.error("Error updating user role: ", error);
      toast.error('Gagal menghapus admin.');
    } finally {
      setShowConfirmDeleteModal(false);
      setAdminToDelete(null);
    }
  };

  const isActionDisabled = currentUser?.userPower !== 1;

  return (
    <div className={styles.container}>
      <Toaster />
      <div className={styles.header}>
        <h1>Administrator</h1>
        <button 
          onClick={handleAddAdminClick} 
          className={`${styles.addButton} ${isActionDisabled ? styles.disabled : ''}`}>
          Tambah Admin
        </button>
      </div>

      <div className={styles.adminList}>
        {admins.map(admin => {
          const isSuperAdmin = admin.userPower === 1;
          const currentUserIsSuperAdmin = currentUser?.userPower === 1;
          const cannotDelete = currentUserIsSuperAdmin && isSuperAdmin;
          const actionIsDisabled = isActionDisabled || cannotDelete

          return (
            <div key={admin.id} className={styles.adminItem}>
              <span>{admin.email} {isSuperAdmin ? <strong>(Super Admin)</strong> : '(Admin)'}</span>
              <button 
                onClick={() => handleRemoveAdminClick(admin)} 
                className={`${styles.removeButton} ${actionIsDisabled ? styles.disabled : ''}`}
                title={cannotDelete ? "Tidak bisa menghapus sesama Super Admin" : isActionDisabled ? "Anda tidak memiliki izin untuk menghapus admin" : "Hapus Admin"}
              >
                Hapus Admin
              </button>
            </div>
          );
        })}
      </div>

      {showAddAdminModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Tambah Admin Baru</h2>
            <select 
              value={selectedUser} 
              onChange={(e) => setSelectedUser(e.target.value)}
              className={styles.userSelect}
            >
              <option value="">Pilih Pengguna</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.email}</option>
              ))}
            </select>
            <div className={styles.modalActions}>
              <button onClick={handleAddAdmin} className={styles.confirmButton}>Tambah</button>
              <button onClick={() => setShowAddAdminModal(false)} className={styles.cancelButton}>Batal</button>
            </div>
          </div>
        </div>
      )}

      {showConfirmDeleteModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Konfirmasi Hapus Admin</h2>
            <p>Apakah Anda yakin ingin menghapus admin ini?</p>
            <div className={styles.modalActions}>
              <button onClick={handleRemoveAdmin} className={styles.removeButton}>Hapus</button>
              <button onClick={() => setShowConfirmDeleteModal(false)} className={styles.cancelButton}>Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdministratorPage;
