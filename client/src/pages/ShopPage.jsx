// client/src/pages/ShopPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebaseConfig';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import styles from './ShopPage.module.css';
import { toast } from 'react-hot-toast';
import { FaArrowLeft, FaCoins, FaCrown, FaCheck } from 'react-icons/fa6';

// Mengload file CSS border kustom global
import '../components/border.css'; 

const ShopPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // State sinkronisasi database
  const [userCoins, setUserCoins] = useState(0);
  const [ownedBorders, setOwnedBorders] = useState(['borderNormal']);
  const [activeBorder, setActiveBorder] = useState('borderNormal');
  const [loadingAction, setLoadingAction] = useState(false);

  // 1. Ambil data koin dan kepemilikan border langsung dari document user saat component dimuat
  useEffect(() => {
    if (!currentUser?.uid) return;

    const fetchUserData = async () => {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userSnapshot = await getDoc(userDocRef);

        if (userSnapshot.exists()) {
          const data = userSnapshot.data();
          // Sinkronisasi data dari collection users/uid
          setUserCoins(data.koin ?? 0);
          setOwnedBorders(data.ownedBorders ?? ['borderNormal']);
          setActiveBorder(data.activeBorder || 'borderNormal');
        }
      } catch (error) {
        console.error("Gagal mengambil data user dari Firestore:", error);
      }
    };

    fetchUserData();
  }, [currentUser]);

  // 🛠️ PERBAIKAN DATA: styleClass sekarang dipetakan 1-per-1 secara unik sesuai nama class di border.css
  const borderShopData = [
    {
      tierName: "Tier Biasa (Standard)",
      tierClass: styles.tierStandardHeader,
      items: [
        { id: 'borderNormal', name: 'Default Frame', price: 0, styleClass: 'borderNormal', desc: 'Bingkai standar bawaan.' },
        { id: 'borderClassic', name: 'Classic Bronze', price: 150, styleClass: 'borderClassic', desc: 'Bingkai perunggu klasik.' } // 👈 Diperbaiki
      ]
    },
    {
      tierName: "Tier Langka (Rare Glow)",
      tierClass: styles.tierRareHeader,
      items: [
        { id: 'borderGlowPulse', name: 'Shadow Pulse', price: 350, styleClass: 'borderGlowPulse', desc: 'Aura ungu berdenyut live.' },
        { id: 'borderCyanGlow', name: 'Neon Cyber', price: 450, styleClass: 'borderCyanGlow', desc: 'Cahaya neon cyan futuristik.' } // 👈 Diperbaiki
      ]
    },
    {
      tierName: "Tier Epik (Legendary)",
      tierClass: styles.tierEpicHeader,
      items: [
        { id: 'borderRainbowRotate', name: 'RGB Gamer', price: 750, styleClass: 'borderRainbowRotate', desc: 'Gradasi pelangi memutar dinamis.' },
        { id: 'borderFireMotion', name: 'Magma Flare', price: 900, styleClass: 'borderFireMotion', desc: 'Efek kobaran api membara.' } // 👈 Diperbaiki
      ]
    }
  ];

  // ⚡ LOGIKA UTAMA: AKSI BELI DAN PASANG LANGSUNG KE FIRESTORE
  const handleAction = async (item) => {
    if (!currentUser?.uid || loadingAction) return;

    const isOwned = ownedBorders.includes(item.id);
    const userDocRef = doc(db, 'users', currentUser.uid);

    setLoadingAction(true);

    try {
      if (isOwned) {
        // --- AKSI 1: JIKA SUDAH PUNYA, MAKA LANGSUNG GUNAKAN (PASANG) ---
        await updateDoc(userDocRef, {
          activeBorder: item.id
        });
        setActiveBorder(item.id);
        toast.success(`Bingkai ${item.name} berhasil digunakan!`);
      } else {
        // --- AKSI 2: JIKA BELUM PUNYA, MAKA PROSES BELI ---
        if (userCoins >= item.price) {
          const sisaKoin = userCoins - item.price;

          await updateDoc(userDocRef, {
            koin: sisaKoin,
            ownedBorders: arrayUnion(item.id) // Tambah id baru ke array ownedBorders di Firestore
          });

          setUserCoins(sisaKoin);
          setOwnedBorders([...ownedBorders, item.id]);
          toast.success(`Sukses membeli ${item.name}!`);
        } else {
          toast.error('Koin kamu tidak cukup!');
        }
      }
    } catch (error) {
      console.error("Gagal memperbarui transaksi di database:", error);
      toast.error("Terjadi kesalahan sistem, coba lagi nanti.");
    } finally {
      setLoadingAction(false);
    }
  };

  const dummyAvatarImg = currentUser?.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";

  return (
    <div className={styles.shopPageContainer}>
      
      {/*  1. FIXED HEADER AREA */}
      <div className={styles.fixedHeaderArea}>
        <div className={styles.headerTopRow}>
          <button className={styles.backButtonCircle} onClick={() => navigate(-1)} disabled={loadingAction}>
            <FaArrowLeft />
          </button>
          <h4>Toko Variasi</h4>
          <div className={styles.coinBadgeDisplay}>
            <FaCoins className={styles.coinGoldIcon} />
            <span>{userCoins}</span>
          </div>
        </div>
        <p className={styles.headerSubInfo}>Gunakan koin untuk membuka border avatar ikonik!</p>
      </div>

      {/* 2. VERTICAL SCROLL AREA */}
      <div className={styles.verticalScrollContent}>
        {borderShopData.map((tier, tierIdx) => (
          <div key={tierIdx} className={styles.tierSectionBlock}>
            
            <div className={`${styles.tierTitleHeader} ${tier.tierClass}`}>
              <FaCrown /> <span>{tier.tierName}</span>
            </div>

            {/* 鈿旴笍 HORIZONTAL SCROLL LIST CARD */}
            <div className={styles.horizontalScrollWrapper}>
              {tier.items.map((item) => {
                const isOwned = ownedBorders.includes(item.id);
                const isActive = activeBorder === item.id;

                return (
                  <div key={item.id} className={`${styles.borderProductCard} ${isActive ? styles.cardActiveActive : ''}`}>
                    
                    {/* Live Preview Avatar */}
                    <div className={styles.previewBoxWrapper}>
                      {/* Class CSS dibaca dinamis dari item.styleClass hasil perbaikan kita */}
                      <div className={item.styleClass}>
                        <img src={dummyAvatarImg} alt="Preview" className={styles.avatarProductDummy} />
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className={styles.productDetailsMeta}>
                      <h5>{item.name}</h5>
                      <p>{item.desc}</p>
                    </div>

                    {/* Tombol Aksi Transaksi */}
                    <button 
                      onClick={() => handleAction(item)}
                      disabled={loadingAction}
                      className={`${styles.actionButtonBase} ${isActive ? styles.btnActiveState : isOwned ? styles.btnUseState : styles.btnBuyState}`}
                    >
                      {isActive ? <FaCheck /> : isOwned ? 'Gunakan' : (
                        <>
                          <FaCoins style={{ marginRight: '4px', fontSize: '0.65rem' }} /> {item.price}
                        </>
                      )}
                    </button>

                  </div>
                );
              })}
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};

export default ShopPage;
