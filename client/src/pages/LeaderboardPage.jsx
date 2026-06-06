// client/src/pages/LeaderboardPage.jsx

import React, { useState, useEffect } from 'react';
import styles from './LeaderboardPage.module.css';
import { FaCrown, FaMedal, FaTrophy, FaStar, FaXmark } from 'react-icons/fa6';
import { useAuth } from '../contexts/AuthContext'; 
import Spinner from '../components/ui/Spinner'; 

const LeaderboardPage = () => {
  const { getLeaderboardData, currentUser } = useAuth(); 
  const [ranks, setRanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State interaktif modal preview foto profil
  const [selectedAvatar, setSelectedAvatar] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const leaderboardData = await getLeaderboardData();
        setRanks(leaderboardData || []);
      } catch (err) {
        setError('Gagal memuat data papan peringkat. Silakan coba lagi nanti.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [getLeaderboardData]);

  const getInitial = (name) => name ? name.charAt(0).toUpperCase() : 'U';

  const handleAvatarClick = (e, photoUrl, name) => {
    e.stopPropagation();
    const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=2563eb&color=fff`;
    setSelectedAvatar({ url: photoUrl || fallbackUrl, name: name || 'User' });
  };

  const renderContent = () => {
    if (loading) return <Spinner message="Menghitung skor para juara..." />;
    if (error) return <div className={styles.errorText}>{error}</div>;
    if (ranks.length === 0) return <div className={styles.errorText}>Belum ada kompetitor aktif.</div>;

    const top3 = ranks.slice(0, 3);
    const remainingPlayers = ranks.slice(3);

    // Formasi Podium Visual Game: Juara 2 (Kiri), Juara 1 (Tengah/Tinggi), Juara 3 (Kanan)
    const podiumOrder = [];
    if (top3[1]) podiumOrder.push({ player: top3[1], originalRank: 2, positionClass: styles.silverPodium, delay: '0.2s' });
    if (top3[0]) podiumOrder.push({ player: top3[0], originalRank: 1, positionClass: styles.goldPodium, delay: '0s' });
    if (top3[2]) podiumOrder.push({ player: top3[2], originalRank: 3, positionClass: styles.bronzePodium, delay: '0.3s' });

    return (
      <>
        {/* --- 🏆 PODIUM JUARA UTAMA (TOP 3) --- */}
        <div className={styles.podiumContainer}>
          {podiumOrder.map(({ player, originalRank, positionClass, delay }) => {
            const isMe = player.uid === currentUser?.uid;
            return (
              <div 
                key={player.uid || player.id} 
                className={`${styles.podiumColumn} ${positionClass} ${isMe ? styles.podiumMe : ''}`}
                style={{ '--anim-delay': delay }}
              >
                <div className={styles.podiumAvatarWrapper}>
                  {originalRank === 1 && <FaCrown className={styles.crownIcon} />}
                  {player.photoURL ? (
                    <img 
                      src={player.photoURL} 
                      alt={player.displayName} 
                      className={styles.podiumAvatar} 
                      onClick={(e) => handleAvatarClick(e, player.photoURL, player.displayName)}
                    />
                  ) : (
                    <div 
                      className={styles.podiumAvatarFallback}
                      onClick={(e) => handleAvatarClick(e, null, player.displayName)}
                    >
                      {getInitial(player.displayName)}
                    </div>
                  )}
                  <span className={styles.podiumRankBadge}>
                    {originalRank === 1 && <FaTrophy />}
                    {originalRank === 2 && <FaMedal />}
                    {originalRank === 3 && <FaMedal />}
                  </span>
                </div>
                <div className={styles.podiumInfo}>
                  <span className={styles.podiumName}>{isMe ? 'Kamu' : (player.displayName?.split(' ')[0] || 'User')}</span>
                  <span className={styles.podiumScore}>
                    <FaStar className={styles.starIconMini} />
                    {player.score?.toLocaleString('id-ID') || 0}
                  </span>
                </div>
                <div className={styles.podiumBase}>
                  <span className={styles.podiumNumber}>{originalRank}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* --- 📋 BARIS DAFTAR PERINGKAT BERLANJUT (RANK 4+) --- */}
        <div className={styles.rankList}>
          {remainingPlayers.map((player, index) => {
            const actualRank = index + 4;
            const isCurrentUser = player.uid === currentUser?.uid;
            
            return (
              <div 
                key={player.uid || player.id} 
                className={`${styles.rankItem} ${isCurrentUser ? styles.currentUser : ''}`}
                style={{ '--row-index': index }}
              >
                <div className={styles.rankLeftSection}>
                  <span className={styles.rankNumber}>{actualRank}</span>
                  <div className={styles.avatarClickableWrapper}>
                    {player.photoURL ? (
                      <img 
                        src={player.photoURL} 
                        alt={player.displayName} 
                        className={styles.avatar} 
                        onClick={(e) => handleAvatarClick(e, player.photoURL, player.displayName)}
                      />
                    ) : (
                      <div 
                        className={styles.avatarFallback}
                        onClick={(e) => handleAvatarClick(e, null, player.displayName)}
                      >
                        {getInitial(player.displayName)}
                      </div>
                    )}
                  </div>
                  <span className={styles.name}>{isCurrentUser ? 'Kamu (Di Sini)' : player.displayName}</span>
                </div>
                <div className={styles.rankRightSection}>
                  <span className={styles.score}>
                    {player.score?.toLocaleString('id-ID') || 0} <span className={styles.poinLabel}>Poin</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <div className={styles.leaderboardContainer}>
      {/* --- HEADER TANPA CONTAINER & TANPA TOMBOL KEMBALI --- */}
      <header className={styles.headerArea}>
        <h1 className={styles.title}>Papan Peringkat</h1>
        <p className={styles.description}>Uji keahlian otakmu bersama jawara sekolah lainnya!</p>
      </header>

      {/* --- ISI DATA UTAMA --- */}
      {renderContent()}

      {/* --- MODAL POP-UP PREVIEW AVATAR --- */}
      {selectedAvatar && (
        <div className={styles.modalOverlay} onClick={() => setSelectedAvatar(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalCloseBtn} onClick={() => setSelectedAvatar(null)}>
              <FaXmark />
            </button>
            <img src={selectedAvatar.url} alt={selectedAvatar.name} className={styles.modalImageImg} />
            <h3 className={styles.modalImageTitle}>{selectedAvatar.name}</h3>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaderboardPage;
