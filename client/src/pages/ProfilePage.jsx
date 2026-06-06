// client/src/pages/ProfilePage.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './ProfilePage.module.css';
import { toast } from 'react-hot-toast';
import { FaPencil, FaShieldHalved, FaRotate, FaArrowsLeftRight, FaCheck, FaXmark, FaTrashCan } from 'react-icons/fa6';

const ProfilePage = () => {
  const { currentUser, updateUserProfile, sendPasswordReset, deleteAccount, updateProfilePicture } = useAuth();
  const navigate = useNavigate(); 
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  // State Profil Data
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  // State Editor Foto (Mobile Touch Optimized)
  const [sourceImage, setSourceImage] = useState(null);
  const [editorMode, setEditorMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isMirrored, setIsMirrored] = useState(false);
  
  // Posisi Geser Gambar (Offset internal viewport)
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // State khusus kalkulasi cubitan 2 jari di HP (Pinch Zoom)
  const [initialTouchDistance, setInitialTouchDistance] = useState(null);
  const [initialZoom, setInitialZoom] = useState(1);

  // Dimensi dasar kotak pembatas pemotong di layar HP
  const VIEWPORT_SIZE = 220; 

  // State Keamanan
  const [uploading, setUploading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState('');

  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || '');
      setUsername(currentUser.username || (currentUser.email ? currentUser.email.split('@')[0] : ''));
    }
  }, [currentUser]);

  // Handler memuat file gambar dari HP
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Harap pilih file gambar valid.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setSourceImage(img);
        setRotation(0);
        setIsMirrored(false);

        // FIX PORTRAIT / LANDSPACE: Hitung dimensi skala agar gambar auto-fill memenuhi kotak tanpa sisa ruang kosong
        const scaleX = VIEWPORT_SIZE / img.width;
        const scaleY = VIEWPORT_SIZE / img.height;
        // Ambil skala terbesar (Math.max) supaya gambar langsung nge-zoom pas menutup seluruh area viewport
        const baseScale = Math.max(scaleX, scaleY);
        
        setZoom(baseScale);

        // Posisikan gambar tepat di tengah-tengah kotak pembatas persegi
        const startX = (VIEWPORT_SIZE - img.width * baseScale) / 2;
        const startY = (VIEWPORT_SIZE - img.height * baseScale) / 2;
        
        setOffset({ x: startX, y: startY });
        setEditorMode(true);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Fungsi kalkulasi jarak cubitan dua jari di layar HP
  const getDistance = (touches) => {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
  };

  // HANDLER ACCESSIBILITY UNTUK DEVICE LAYAR SENTUH HP
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y });
      setInitialTouchDistance(null);
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = getDistance(e.touches);
      setInitialTouchDistance(dist);
      setInitialZoom(zoom);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && isDragging) {
      setOffset({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
    } else if (e.touches.length === 2 && initialTouchDistance) {
      const currentDist = getDistance(e.touches);
      const factor = currentDist / initialTouchDistance;
      
      // Hitung batas minimum skala awal agar user tidak bisa memperkecil melewati batas ruang kosong kotak
      const scaleX = VIEWPORT_SIZE / sourceImage.width;
      const scaleY = VIEWPORT_SIZE / sourceImage.height;
      const minAllowedZoom = Math.max(scaleX, scaleY);

      const newZoom = Math.max(minAllowedZoom, Math.min(minAllowedZoom * 4, initialZoom * factor));
      setZoom(newZoom);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setInitialTouchDistance(null);
  };

  // DUKUNGAN INTERAKSI MOUSE (PC / DEVELOPMENT LAPTOP)
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  // FIX PERHITUNGAN MATEMATIKA CROP: Presisi 100% Untuk Gambar Portrait Maupun Landscape!
  const handleSaveCrop = async () => {
    if (!sourceImage) return;
    setUploading(true);
    setEditorMode(false);

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      const outputSize = 400;
      canvas.width = outputSize;
      canvas.height = outputSize;
      ctx.clearRect(0, 0, outputSize, outputSize);

      // Skala konversi dari koordinat CSS layar HP ke koordinat pixel Canvas asli
      const renderRatio = outputSize / VIEWPORT_SIZE;

      ctx.save();
      
      // 1. Pindahkan poros render ke pusat Canvas
      ctx.translate(outputSize / 2, outputSize / 2);
      
      // 2. Jalankan rotasi gambar
      ctx.rotate((rotation * Math.PI) / 180);
      
      // 3. Jalankan efek pembalikan cermin (mirror)
      ctx.scale(isMirrored ? -1 : 1, 1);

      // 4. Kalkulasi ukuran dimensi gambar sesungguhnya pada skala zoom saat ini
      const drawWidth = sourceImage.width * zoom * renderRatio;
      const drawHeight = sourceImage.height * zoom * renderRatio;

      // 5. Transformasi translasi koordinat pergeseran jari tangan
      const drawX = (offset.x - VIEWPORT_SIZE / 2) * renderRatio + drawWidth / 2;
      const drawY = (offset.y - VIEWPORT_SIZE / 2) * renderRatio + drawHeight / 2;

      // 6. Gambar objek asli ke canvas secara presisi tanpa offset meleset
      ctx.drawImage(
        sourceImage,
        -drawWidth / 2 + drawX,
        -drawHeight / 2 + drawY,
        drawWidth,
        drawHeight
      );

      ctx.restore();

      // Ekspor hasil akhir pemotongan ke format blob Firebase Storage
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error('Gagal mengekspor gambar.');
          setUploading(false);
          return;
        }
        const croppedFile = new File([blob], 'avatar_fixed_crop.jpg', { type: 'image/jpeg' });
        await updateProfilePicture(croppedFile);
        toast.success('Foto profil persegi berhasil diperbarui secara presisi!');
        setUploading(false);
      }, 'image/jpeg', 0.95);

    } catch (error) {
      console.error(error);
      toast.error('Gagal memperbarui foto profil.');
      setUploading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error('Nama tidak boleh kosong.');
      return;
    }
    setLoading(true);
    try {
      await updateUserProfile({ displayName, username });
      toast.success('Data profil berhasil diperbarui!');
    } catch (err) {
      toast.error('Gagal memperbarui data profil.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!currentUser?.email) return;
    setResettingPassword(true);
    try {
      await sendPasswordReset(currentUser.email);
    } catch (err) {
      console.error(err);
    } finally {
      setResettingPassword(false);
    }
  };

  const openDeleteModal = () => {
    setConfirmationEmail('');
    setShowDeleteModal(true);
  };
  const closeDeleteModal = () => setShowDeleteModal(false);

  const handleDeleteAccount = async () => {
    if (confirmationEmail.toLowerCase() !== currentUser.email.toLowerCase()) {
      toast.error('Email tidak cocok.');
      return;
    }
    setDeletingAccount(true);
    try {
      await deleteAccount();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingAccount(false);
      setShowDeleteModal(false);
    }
  };

  const userInitial = currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U';

  return (
    <>
      <div className={styles.profileContainer}>
        {/* --- PROFILE HEADER --- */}
        <header className={styles.profileHeader}>
          <h1 className={styles.headerTitle}>Profil Saya</h1>
          <p className={styles.headerSub}>Kelola foto profile dan informasi akun</p>
        </header>

        {/* --- AVATAR LAYOUT --- */}
        <div className={styles.avatarSection}>
          <div className={styles.avatarWrapper} onClick={() => !uploading && fileInputRef.current.click()}>
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="Avatar" className={styles.profileAvatar} />
            ) : (
              <div className={styles.avatarFallback}>{userInitial}</div>
            )}
            <div className={styles.editOverlay}>
              <FaPencil />
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className={styles.hiddenInput} 
          />
          {uploading && <p className={styles.uploadStatusText}>Mengunggah foto profil...</p>}
        </div>

        {/* --- FORM UPDATE DATA --- */}
        <form onSubmit={handleUpdateProfile} className={styles.profileForm}>
          <div className={styles.inputGroup}>
            <label htmlFor="displayName">Nama Lengkap</label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nama lengkap"
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Email</label>
            <input type="email" value={currentUser?.email || ''} disabled className={styles.disabledInput} />
          </div>

          <button type="submit" className={styles.saveButton} disabled={loading}>
            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </form>

        {/* --- HUB KEAMANAN --- */}
        <div className={styles.securitySection}>
          <h3>Keamanan Akun</h3>
          <div className={styles.securityActions}>
            <button type="button" onClick={handleResetPassword} className={styles.resetBtn} disabled={resettingPassword}>
              <FaShieldHalved /> {resettingPassword ? 'Mengirim...' : 'Kirim Link Reset Sandi'}
            </button>
            <button type="button" onClick={openDeleteModal} className={styles.deleteBtn}>
              <FaTrashCan /> Hapus Akun Permanen
            </button>
          </div>
        </div>
      </div>

      {/* --- ✂️ MOBILE PINCH-TO-ZOOM CROP SQUARE EDITOR WITH GRID --- */}
      {editorMode && sourceImage && (
        <div className={styles.editorOverlay}>
          <div className={styles.editorBox}>
            <h3>Atur & Potong Foto</h3>
            <p className={styles.guideText}>Cubit 2 jari untuk zoom, geser 1 jari untuk memposisikan gambar</p>
            
            {/* Viewport Kotak Persegi dengan Lapisan Garis Grid UX */}
            <div 
              className={styles.cropViewportSquare}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleTouchEnd}
              onMouseLeave={handleTouchEnd}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Gambar mentah editor tanpa css object-fit kaku */}
              <img 
                src={sourceImage.src} 
                alt="Source Crop" 
                style={{
                  width: `${sourceImage.width * zoom}px`,
                  height: `${sourceImage.height * zoom}px`,
                  transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scaleX(${isMirrored ? -1 : 1})`,
                  cursor: isDragging ? 'grabbing' : 'grab'
                }}
                draggable="false"
                className={styles.previewSourceImg}
              />

              {/* Lapisan Garis Bantu Grid UX (Rule of Thirds) */}
              <div className={styles.gridLayer}>
                <div className={styles.gridLineH1}></div>
                <div className={styles.gridLineH2}></div>
                <div className={styles.gridLineV1}></div>
                <div className={styles.gridLineV2}></div>
              </div>
            </div>

            {/* Tombol Aksesoris Fitur Tambahan */}
            <div className={styles.actionToolRow}>
              <button type="button" onClick={() => setIsMirrored(!isMirrored)}>
                <FaArrowsLeftRight /> Mirror Balik
              </button>
              <button type="button" onClick={() => setRotation((prev) => (prev + 90) % 360)}>
                <FaRotate /> Putar 90°
              </button>
            </div>

            {/* Konfirmasi Footer */}
            <div className={styles.editorFooter}>
              <button type="button" className={styles.cancelCropBtn} onClick={() => setEditorMode(false)}>
                <FaXmark /> Batal
              </button>
              <button type="button" className={styles.applyCropBtn} onClick={handleSaveCrop}>
                <FaCheck /> Potong & Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Canvas Utility */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* MODAL HAPUS AKUN */}
      {showDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>Konfirmasi Hapus Akun</h2>
            <p>Tindakan ini tidak bisa dibatalkan. Ketik email Anda untuk konfirmasi:</p>
            <input
              type="text"
              value={confirmationEmail}
              onChange={(e) => setConfirmationEmail(e.target.value)}
              placeholder="Email Anda"
              className={styles.confirmationInput}
              autoComplete="off"
            />
            <div className={styles.modalActions}>
              <button onClick={closeDeleteModal} className={styles.modalButtonCancel}>Batal</button>
              <button 
                onClick={handleDeleteAccount} 
                className={styles.modalButtonConfirm} 
                disabled={confirmationEmail.toLowerCase() !== currentUser?.email?.toLowerCase()}
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfilePage;
