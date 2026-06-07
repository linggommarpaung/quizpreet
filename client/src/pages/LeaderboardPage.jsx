// client/src/pages/LeaderboardPage.jsx

import React, { useState, useEffect } from 'react';
import styles from './LeaderboardPage.module.css';
import { FaCrown, FaMedal, FaTrophy, FaStar, FaXmark } from 'react-icons/fa6';
import { useAuth } from '../contexts/AuthContext'; 
import Spinner from '../components/ui/Spinner'; 

// 🌐 TAMBAHKAN IMPOR INI: Mendukung efek border avatar toko secara realtime
import '../components/border.css'; 

const LeaderboardPage = () => {
  const { getLeaderboardData, currentUser } = useAuth(); 
  const [ranks, setRanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
    const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=2563eb&color=ffffff&bold=true`;
    setSelectedAvatar({ url: photoUrl || fallbackUrl, name });
  };

  if (loading) return <Spinner />;
  if (error) return <div className={styles.errorContainer}>{error}</div>;

  // 🛠️ ANALISIS POSISI PRIVAT USER (Dukungan Fitur Rank > 20)
  const currentUserIndex = ranks.findIndex(player => player.uid === currentUser?.uid);
  const currentUserRank = currentUserIndex !== -1 ? currentUserIndex + 1 : null;
  const isBelowTop20 = currentUserRank > 20;

  // Batasi list peringkat publik hanya sampai Top 20 saja
  const top20Players = ranks.slice(0, 20);

  // Ambil pecahan juara podium (1, 2, 3)
  const firstPlace = top20Players[0];
  const secondPlace = top20Players[1];
  const thirdPlace = top20Players[2];

  // Ambil sisa baris barisan rank (Rank 4 sampai 20)
  const scrollableRankList = top20Players.slice(3);

  // Helper fungsi untuk merender avatar lengkap dengan border kustom dinamis
  const renderAvatarWithBorder = (player, baseClass) => {
    const borderClass = player?.activeBorder || 'borderNormal';
    const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(player?.displayName || 'U')}&background=2563eb&color=ffffff&bold=true`;

    return (
      <div 
        className={`${baseClass} ${borderClass}`} 
        onClick={(e) => handleAvatarClick(e, player?.photoURL, player?.displayName)}
      >
        <img 
          src={player?.photoURL || fallbackUrl} 
          alt={player?.displayName || 'Avatar'} 
        />
      </div>
    );
  };

  return (
    <div className={styles.leaderboardContainer}>
      
      {/* 🔒 1. AREA FIXED/STICKY (Diam di Atas: Header & Podium) */}
      <div className={styles.fixedTopSection}>
        <header className={styles.headerArea}>
          <h1 className={styles.title}>Papan Peringkat</h1>
          <p className={styles.description}>Uji keahlian otakmu bersama jawara sekolah lainnya!</p>
        </header>

        {/* 🏆 STRUKTUR PODIUM JUARA INDEPENDEN (RANK 1, 2, 3) */}
        <div className={styles.podiumContainer}>
          {/* JUARA 2 */}
          <div className={`${styles.podiumColumn} ${styles.silver}`}>
            <div className={styles.podiumAvatarWrapper}>
              <div className={styles.badgeCrown}><FaMedal /></div>
              {secondPlace ? renderAvatarWithBorder(secondPlace, styles.podiumAvatar) : (
                <div className={styles.emptyAvatarSlot}>{getInitial('')}</div>
              )}
            </div>
            <span className={styles.podiumName}>{secondPlace ? (secondPlace.uid === currentUser?.uid ? 'Kamu' : secondPlace.displayName) : 'Kosong'}</span>
            <div className={styles.barBlock}><span className={styles.barNumber}>2</span></div>
          </div>

          {/* JUARA 1 */}
          <div className={`${styles.podiumColumn} ${styles.gold}`}>
            <div className={styles.podiumAvatarWrapper}>
              <div className={`${styles.badgeCrown} ${styles.goldCrown}`}><FaCrown /></div>
              {firstPlace ? renderAvatarWithBorder(firstPlace, styles.podiumAvatar) : (
                <div className={styles.emptyAvatarSlot}>{getInitial('')}</div>
              )}
            </div>
            <span className={styles.podiumName}>{firstPlace ? (firstPlace.uid === currentUser?.uid ? 'Kamu' : firstPlace.displayName) : 'Kosong'}</span>
            <div className={styles.barBlock}><span className={styles.barNumber}>1</span></div>
          </div>

          {/* JUARA 3 */}
          <div className={`${styles.podiumColumn} ${styles.bronze}`}>
            <div className={styles.podiumAvatarWrapper}>
              <div className={styles.badgeCrown}><FaTrophy /></div>
              {thirdPlace ? renderAvatarWithBorder(thirdPlace, styles.podiumAvatar) : (
                <div className={styles.emptyAvatarSlot}>{getInitial('')}</div>
              )}
            </div>
            <span className={styles.podiumName}>{thirdPlace ? (thirdPlace.uid === currentUser?.uid ? 'Kamu' : thirdPlace.displayName) : 'Kosong'}</span>
            <div className={styles.barBlock}><span className={styles.barNumber}>3</span></div>
          </div>
        </div>
      </div>

      {/* 📜 2. AREA SCROLLABLE LIST (Hanya baris rank 4-20 yang bisa di-scroll) */}
      <div className={`${styles.scrollableRankContainer} ${isBelowTop20 ? styles.hasFloatingPadding : ''}`}>
        {scrollableRankList.length > 0 ? (
          scrollableRankList.map((player, index) => {
            const currentRankNumber = index + 4;
            const isItMe = player.uid === currentUser?.uid;

            return (
              <div key={player.uid} className={`${styles.rankRowCard} ${isItMe ? styles.rowHighlightMe : ''}`}>
                <div className={styles.rankLeftSection}>
                  <span className={styles.rankNumberText}>{currentRankNumber}</span>
                  {renderAvatarWithBorder(player, styles.listRowAvatarFrame)}
                  <span className={styles.playerNameText}>{isItMe ? 'Kamu (Di Sini)' : player.displayName}</span>
                </div>
                <div className={styles.rankRightSection}>
                  <span className={styles.scoreText}>
                    {player.score?.toLocaleString('id-ID') || 0} <span className={styles.poinLabel}>Poin</span>
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <p className={styles.emptyInfo}>Belum ada penantang di peringkat ini.</p>
        )}
      </div>

      {/* 🔒 3. FLOATING CARD PRIVAT (Hanya tampil jika Rank Login User > 20) */}
      {isBelowTop20 && ranks[currentUserIndex] && (
        <div className={styles.privateUserFloatingCard}>
          <div className={styles.rankLeftSection}>
            <span className={styles.rankNumberText}>{currentUserRank}</span>
            {renderAvatarWithBorder(ranks[currentUserIndex], styles.listRowAvatarFrame)}
            <span className={styles.playerNameText}>Kamu</span>
          </div>
          <div className={styles.rankRightSection}>
            <span className={styles.scoreText}>
              {ranks[currentUserIndex].score?.toLocaleString('id-ID') || 0} <span className={styles.poinLabel}>Poin</span>
            </span>
          </div>
        </div>
      )}

      {/* MODAL POP-UP PREVIEW AVATAR */}
      {selectedAvatar && (
        <div className={styles.modalOverlay} onClick={() => setSelectedAvatar(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>         <button className={styles.modalCloseBtn} onClick={() => setSelectedAvatar(null)}>
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
