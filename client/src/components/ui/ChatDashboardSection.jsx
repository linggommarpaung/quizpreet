import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../config/firebaseConfig';
import { 
  collection, 
  getDocs, 
  query, 
  addDoc, 
  onSnapshot, 
  orderBy, 
  serverTimestamp, 
  doc, 
  writeBatch 
} from 'firebase/firestore';
import { useSocket } from '../../contexts/SocketContext';
import { toast } from 'react-hot-toast';
import { 
  FaArrowLeft, 
  FaPaperPlane, 
  FaChevronRight, 
  FaMagnifyingGlass, 
  FaCircleUser, 
  FaEarthAsia, 
  FaComments,
  FaMessage,
  FaCheck,
  FaCheckDouble,
  FaXmark
} from 'react-icons/fa6'; 
import styles from './ChatDashboardSection.module.css';

const ChatDashboardSection = ({ 
  currentUser, 
  handleExitChatMode, 
  chatMessages, 
  handleSendChat, 
  inputChat, 
  setInputChat, 
  chatEndRef,
  socket,
}) => {
  const { onlineUserIds, unreadPerUser } = useSocket();
  const [chatSubTab, setChatSubTab] = useState('global'); // 'global' atau 'personal'
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // State Manajemen Personal Chat Baru
  const [activePersonalRoom, setActivePersonalRoom] = useState(null); // Menyimpan objek user yang sedang diajak chat
  const [personalMessages, setPersonalMessages] = useState([]);
  const [inputPersonalChat, setInputPersonalChat] = useState('');
  const personalChatEndRef = useRef(null);

  // State Modal Pop-up Foto Profil
  const [previewPhotoUser, setPreviewPhotoUser] = useState(null);

  // 1. Ambil data user dari Firestore untuk tab daftar kontak
  useEffect(() => {
    const fetchUsers = async () => {
      if (chatSubTab !== 'personal') return;
      setLoadingUsers(true);
      try {
        const q = query(collection(db, 'users'));
        const snap = await getDocs(q);
        const usersList = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(u => u.id !== currentUser?.uid); // Kecualikan diri sendiri
        setAllUsers(usersList);
      } catch (err) {
        console.error("Error fetching users:", err);
        toast.error("Gagal memuat daftar pengguna");
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [chatSubTab, currentUser?.uid]);

  // Helper membuat Room ID unik gabungan dua UID secara urut alfabet
  const generatePersonalRoomId = (uid1, uid2) => {
    return [uid1, uid2].sort().join('_');
  };

  // 2. Listen Data Pesan Personal Chat secara Real-time dari Firestore
  useEffect(() => {
    if (!activePersonalRoom || !currentUser) {
      setPersonalMessages([]);
      return;
    }

    const roomId = generatePersonalRoomId(currentUser.uid, activePersonalRoom.id);
    const messagesRef = collection(db, 'personal_chats', roomId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPersonalMessages(msgs);
      
      // Auto-scroll ke bawah saat ada pesan baru masuk
      setTimeout(() => {
        personalChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      // Logika Pembaruan Status Centang: Jika ada pesan dari lawan yang masuk dan statusnya belum 'read', tandai menjadi 'read'
      const batch = writeBatch(db);
      let hasUpdates = false;

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.uid !== currentUser.uid && data.status !== 'read') {
          const docRef = doc(db, 'personal_chats', roomId, 'messages', docSnap.id);
          batch.update(docRef, { status: 'read' });
          hasUpdates = true;
        }
      });

      if (hasUpdates) {
        batch.commit().catch(err => console.error("Gagal update status baca:", err));
      }
    });

    return () => unsubscribe();
  }, [activePersonalRoom, currentUser]);

  // 3. Fungsi Kirim Pesan Personal Chat
  const handleSendPersonalChat = async (e) => {
    e.preventDefault();
    if (!inputPersonalChat.trim() || !activePersonalRoom || !currentUser) return;

    const roomId = generatePersonalRoomId(currentUser.uid, activePersonalRoom.id);
    const messageText = inputPersonalChat.trim();
    setInputPersonalChat('');

    try {
      const messagesRef = collection(db, 'personal_chats', roomId, 'messages');
      await addDoc(messagesRef, {
        text: messageText,
        uid: currentUser.uid,
        displayName: currentUser.displayName || 'User',
        createdAt: serverTimestamp(),
        status: 'sent' // Default awal terkirim
      });
    } catch (err) {
      console.error("Gagal mengirim pesan personal:", err);
      toast.error("Gagal mengirim pesan");
    }
  };

// Filter daftar teman berdasarkan input kolom pencarian
  const filteredUsers = allUsers.filter(user => {
    const name = (user.displayName || '').toLowerCase();
    const username = (user.username || '').toLowerCase();
    const search = searchQuery.toLowerCase();
    return name.includes(search) || username.includes(search);
  });

  // 1. Logika Sorting otomatis: Teman yang mengirim chat belum dibaca akan naik ke paling atas list
  const filteredAndSortedUsers = filteredUsers.sort((a, b) => {
    const unreadA = unreadPerUser[a.id] || 0;
    const unreadB = unreadPerUser[b.id] || 0;
    return unreadB - unreadA;
  });

  // Render Status Centang WhatsApp Style
  const renderMessageStatus = (msg) => {
    if (msg.uid !== currentUser?.uid) return null; // Status centang hanya untuk pengirim pesan

    const isRecipientOnline = onlineUserIds.includes(activePersonalRoom?.id);

    if (msg.status === 'read') {
      // Centang 2 Ungu / Biru (Sudah dibaca)
      return <FaCheckDouble className={`${styles.tickIcon} ${styles.tickRead}`} />;
    } else if (isRecipientOnline) {
      // Centang 2 Abu-abu (Penerima online tapi belum membuka room obrolan tersebut)
      return <FaCheckDouble className={`${styles.tickIcon} ${styles.tickDelivered}`} />;
    } else {
      // Centang 1 Abu-abu (Penerima sedang offline total dari socket server)
      return <FaCheck className={`${styles.tickIcon} ${styles.tickSent}`} />;
    }
  };

  return (
    <div className={styles.chatResponsiveWrapper}>
      
      {/* 4. MODAL POP-UP PREVIEW FOTO PROFIL */}
      {previewPhotoUser && (
        <div className={styles.photoOverlayContainer} onClick={() => setPreviewPhotoUser(null)}>
          <div className={styles.photoModalCard} onClick={(e) => e.stopPropagation()}>
            <header className={styles.photoModalHeader}>
              <h4>{previewPhotoUser.displayName || 'Profil Pengguna'}</h4>
              <button className={styles.closePhotoBtn} onClick={() => setPreviewPhotoUser(null)}>
                <FaXmark />
              </button>
            </header>
            <div className={styles.photoContentArea}>
              <img src={previewPhotoUser.photoURL} alt="Large Avatar" />
            </div>
          </div>
        </div>
      )}

      {/* HEADER UTAMA RUANG OBROLAN */}
      <header className={styles.chatCustomHeader}>
        {activePersonalRoom ? (
          // Jika sedang di dalam room chat personal, tombol back mengembalikan ke daftar user
          <button type="button" className={styles.chatBackBtn} onClick={() => setActivePersonalRoom(null)}>
            <FaArrowLeft /> Kembali ke Daftar
          </button>
        ) : (
          <button type="button" className={styles.chatBackBtn} onClick={handleExitChatMode}>
            <FaArrowLeft /> Kembali
          </button>
        )}
        
        <div className={styles.chatHeaderTitleBlock}>
          {activePersonalRoom ? (
            <>
              <h3>{activePersonalRoom.displayName || 'Siswa'}</h3>
              <p>{onlineUserIds.includes(activePersonalRoom.id) ? '🟢 Sedang Aktif' : '⚪ Sedang Offline'}</p>
            </>
          ) : (
            <>
              <h3>Forum Diskusi & Chat</h3>
              <p>Terhubung langsung dengan pengajar lainnya</p>
            </>
          )}
        </div>
      </header>

      {/* NAV SUBMENU INTERNAL: GLOBAL VS PERSONAL (Sembunyikan saat masuk ke dalam obrolan personal) */}
      {!activePersonalRoom && (
        <div className={styles.chatSubNavTabs}>
          <button 
            type="button" 
            className={`${styles.subTabButton} ${chatSubTab === 'global' ? styles.subTabActive : ''}`}
            onClick={() => setChatSubTab('global')}
          >
            <FaEarthAsia /> Obrolan Global
          </button>
          <button 
            type="button" 
            className={`${styles.subTabButton} ${chatSubTab === 'personal' ? styles.subTabActive : ''}`}
            onClick={() => setChatSubTab('personal')}
          >
            <FaComments /> Pesan Pribadi
          </button>
        </div>
      )}

      {/* KONTEN UTAMA BERDASARKAN SUB TAB */}
      <div className={styles.chatMainContentBody}>
        
        {chatSubTab === 'global' ? (
          /* ================= TAMPILAN GLOBAL CHAT ================= */
          <div className={styles.globalChatLayoutContainer}>
            <div className={styles.chatMessagesStreamArea}>
              {chatMessages && chatMessages.length > 0 ? (
                chatMessages.map((msg, index) => {
                  const isSelf = msg.uid === currentUser?.uid;
                  return (
                    <div 
                      key={msg.id || index} 
                      className={`${styles.messageRowItem} ${isSelf ? styles.msgRowSelf : styles.msgRowOther}`}
                    >
                      {!isSelf && (
                        <span className={styles.msgSenderName}>
                          {msg.displayName || msg.username || 'Siswa'}
                        </span>
                      )}
                      <div className={styles.msgBubbleCore}>
                        <p>{msg.text}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className={styles.emptyChatPlaceholder}>
                  <FaMessage className={styles.placeholderIcon} />
                  <h4>Belum ada obrolan global</h4>
                  <p>Mulai ketik pesan di bawah untuk meramaikan ruang forum bersama siswa lain.</p>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <footer className={styles.whatsappFooterFixedContainer}>
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendChat(e); }}
                className={styles.msgBottomInputForm}
              >
                <div className={styles.inputContainerStickyMobile}>
                  <input 
                    type="text" 
                    placeholder="Tulis pesan diskusi di sini..." 
                    value={inputChat}
                    onChange={(e) => setInputChat(e.target.value)}
                  />
                  <button type="submit" className={styles.msgSubmitSendBtn}>
                    <FaPaperPlane />
                  </button>
                </div>
              </form>
            </footer>
          </div>
        ) : (
          /* ================= TAMPILAN PERSONAL CHAT ================= */
          <div className={styles.personalChatLayoutContainer}>
            {!activePersonalRoom ? (
              /* SUB-HALAMAN A: DAFTAR KONTAK TEMAN */
              <>
                <div className={styles.searchUserBarContainer}>
                  <FaMagnifyingGlass className={styles.searchIconBar} />
                  <input 
                    type="text" 
                    placeholder="Cari nama teman atau username..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className={styles.directoryUsersScrollArea}>
                  {loadingUsers ? (
                    <div className={styles.loadingStateBlock}>
                      <FaMessage className={styles.spinAnimation} /> Memuat data pengguna...
                    </div>
                     ) : filteredAndSortedUsers.length > 0 ? (
                filteredAndSortedUsers.map(user => {
                  const isOnline = onlineUserIds.includes(user.id); // Deteksi apakah uid ada di list online backend
                  const userUnreadCount = unreadPerUser[user.id] || 0;

                  return (
                    <div 
                      key={user.id} 
                      className={styles.userItemRowCard} 
                      onClick={() => setActivePersonalRoom(user)} 
                    >
                      <div className={styles.avatarWrapperContainer}>
                        <div 
                          className={styles.userAvatarProfileBadge}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (user.photoURL) setPreviewPhotoUser(user);
                          }}
                        >
                          {user.photoURL ? <img src={user.photoURL} alt="avatar" /> : <FaCircleUser size={36} />}
                        </div>
                        {/* Indikator Titik Hijau Status Online */}
                        <span className={`${styles.onlineDotIndicator} ${isOnline ? styles.dotActive : styles.dotInactive}`} />
                      </div>

                      <div className={styles.userMainMetaDetails}>
                        <h4>{user.displayName || 'Siswa Quizpreet'}</h4>
                        <p>@{user.username || 'user_forum'}</p>
                      </div>

                      {/* Notifikasi Angka Merah Pesan Belum Dibaca */}
                      {userUnreadCount > 0 ? (
                        <div className={styles.contactListUnreadBadge}>
                          {userUnreadCount}
                        </div>
                      ) : (
                        <FaChevronRight className={styles.chevronRightAction} />
                      )}
                    </div>
                  );
                })
              )
                      : (
                    <div className={styles.emptyStateBlock}>
                      <p>Tidak ada pengguna bernama "{searchQuery}" ditemukan.</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* SUB-HALAMAN B: RUANG OBROLAN CHAT PERSONAL AKTIF */
              <div className={styles.personalChatRoomContainer}>
                <div className={styles.chatMessagesStreamArea}>
                  {personalMessages.length > 0 ? (
                    personalMessages.map((msg, index) => {
                      const isSelf = msg.uid === currentUser?.uid;
                      return (
                        <div 
                          key={msg.id || index} 
                          className={`${styles.messageRowItem} ${isSelf ? styles.msgRowSelf : styles.msgRowOther}`}
                        >
                          <div className={styles.msgBubbleCore}>
                            <p>{msg.text}</p>
                            {/* Penyematan Ikon Status Centang WhatsApp */}
                            <div className={styles.msgMetaStatusContainer}>
                              {renderMessageStatus(msg)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className={styles.emptyChatPlaceholder}>
                      <FaMessage className={styles.placeholderIcon} />
                      <h4>Mulai Obrolan</h4>
                      <p>Kirim pesan pribadi pertama kamu ke {activePersonalRoom.displayName || 'User'}.</p>
                    </div>
                  )}
                  <div ref={personalChatEndRef} />
                </div>

                <footer className={styles.whatsappFooterFixedContainer}>
                  <form onSubmit={handleSendPersonalChat} className={styles.msgBottomInputForm}>
                    <div className={styles.inputContainerStickyMobile}>
                      <input 
                        type="text" 
                        placeholder="Tulis pesan pribadi..." 
                        value={inputPersonalChat}
                        onChange={(e) => setInputPersonalChat(e.target.value)}
                      />
                      <button type="submit" className={styles.msgSubmitSendBtn}>
                        <FaPaperPlane />
                      </button>
                    </div>
                  </form>
                </footer>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default ChatDashboardSection;
