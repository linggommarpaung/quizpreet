// client/src/components/ui/ChatDashboardSection.jsx

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
  writeBatch,
  updateDoc
} from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { 
  FaArrowLeft, 
  FaPaperPlane, 
  FaChevronRight, 
  FaMagnifyingGlass, 
  FaEarthAsia, 
  FaComments,
  FaMessage,
  FaCheck,
  FaCheckDouble,
  FaXmark
} from 'react-icons/fa6'; 
import styles from './ChatDashboardSection.module.css';
import '../border.css';

const ChatDashboardSection = ({ 
  currentUser, 
  handleExitChatMode, 
  chatMessages, 
  handleSendChat, 
  inputChat, 
  setInputChat, 
  chatEndRef,
}) => {
  const [chatSubTab, setChatSubTab] = useState('global'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // State Manajemen Status Online, Unread, dan Pesan Terakhir
  const [onlineUserIds, setOnlineUserIds] = useState([]); 
  const [unreadPerUser, setUnreadPerUser] = useState({});
  const [lastMessages, setLastMessages] = useState({});
  const [lastMessageTimes, setLastMessageTimes] = useState({}); 

  const [activePersonalRoom, setActivePersonalRoom] = useState(null); 
  const [personalMessages, setPersonalMessages] = useState([]);
  const [inputPersonalChat, setInputPersonalChat] = useState('');
  const personalChatEndRef = useRef(null);

  const [previewPhotoUser, setPreviewPhotoUser] = useState(null);

  const generatePersonalRoomId = (uid1, uid2) => {
    return [uid1, uid2].sort().join('_');
  };

  // =========================================================
  //  🟢 MENDENGAR REALTIME STATUS ONLINE ALL USERS FIRESTORE
  // =========================================================
  useEffect(() => {
    const usersQuery = query(collection(db, 'users'));
    
    const unsubscribeOnlineStatus = onSnapshot(usersQuery, (snapshot) => {
      const onlineIds = [];
      snapshot.docs.forEach((docSnap) => {
        const userData = docSnap.data();
        if (userData.isOnline === true) {
          onlineIds.push(docSnap.id);
        }
      });
      setOnlineUserIds(onlineIds);
    }, (err) => {
      console.error("Gagal mendengarkan status online:", err);
    });

    return () => unsubscribeOnlineStatus();
  }, []);

  // =========================================================
  //  🟢 UNREAD CHAT MAP, LAST MESSAGES & TIMESTAMP (FIRESTORE)
  // =========================================================
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribes = [];

    const fetchChatsDataMap = async () => {
      try {
        const q = query(collection(db, 'users'));
        const snap = await getDocs(q);
        
        snap.docs.forEach((userDoc) => {
          const otherUserId = userDoc.id;
          if (otherUserId === currentUser.uid) return;

          const roomId = generatePersonalRoomId(currentUser.uid, otherUserId);
          const messagesRef = collection(db, 'personal_chats', roomId, 'messages');
          const qMessages = query(messagesRef, orderBy('createdAt', 'asc'));

          const unsub = onSnapshot(qMessages, (snapshot) => {
            let unreadCount = 0;
            let lastMsgText = '';
            let lastMsgTime = 0; 

            const docsArray = snapshot.docs;
            
            docsArray.forEach((docSnap) => {
              const msgData = docSnap.data();
              if (msgData.uid !== currentUser.uid && msgData.status !== 'read') {
                unreadCount++;
              }
            });

            if (docsArray.length > 0) {
              const lastDocData = docsArray[docsArray.length - 1].data();
              lastMsgText = lastDocData.text || '';
              if (lastDocData.createdAt) {
                lastMsgTime = lastDocData.createdAt.toMillis ? lastDocData.createdAt.toMillis() : lastDocData.createdAt;
              }
            }

            setUnreadPerUser(prev => ({ ...prev, [otherUserId]: unreadCount }));
            setLastMessages(prev => ({ ...prev, [otherUserId]: lastMsgText }));
            setLastMessageTimes(prev => ({ ...prev, [otherUserId]: lastMsgTime }));
          });

          unsubscribes.push(unsub);
        });
      } catch (err) {
        console.error("Gagal melacak map chat pribadi:", err);
      }
    };

    fetchChatsDataMap();
    return () => unsubscribes.forEach(unsub => unsub());
  }, [currentUser?.uid]);

  // =========================================================
  // 🟢 DIRECTORY DIRECT REALTIME ALL USERS LIST
  // =========================================================
  useEffect(() => {
    if (!currentUser?.uid) return;
    setLoadingUsers(true);

    const q = query(collection(db, 'users'));
    
    const unsubscribeUsers = onSnapshot(q, (snap) => {
      const usersList = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.id !== currentUser?.uid); 
      setAllUsers(usersList);
      setLoadingUsers(false);
    }, (err) => {
      console.error("Error fetching users:", err);
      setLoadingUsers(false);
    });

    return () => unsubscribeUsers();
  }, [currentUser?.uid]);

  // =========================================================
  // SINKRONISASI RUANG CHAT AKTIF & BATCH UPDATE READ STATUS
  // =========================================================
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
      
      setTimeout(() => {
        personalChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

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
        status: 'sent', 
        activeBorder: currentUser?.activeBorder || 'borderNormal' 
      });
    } catch (err) {
      console.error("Gagal mengirim pesan personal:", err);
      toast.error("Gagal mengirim pesan");
    }
  };

  // =========================================================
  // 🟢 LOGIKA FILTERING PENCARIAN (FIXED: DIREKTORI SELALU MUNCUL)
  // =========================================================
  const filteredUsers = allUsers.filter(user => {
    const name = (user.displayName || '').toLowerCase();
    const username = (user.username || '').toLowerCase();
    const search = searchQuery.trim().toLowerCase();

    // Tampilkan semua user terdaftar jika kolom input pencarian kosong
    if (search === '') {
      return true; 
    }

    return name.includes(search) || username.includes(search);
  });

  const filteredAndSortedUsers = filteredUsers.sort((a, b) => {
    const timeA = lastMessageTimes[a.id] || 0;
    const timeB = lastMessageTimes[b.id] || 0;
    return timeB - timeA; 
  });

  const renderMessageStatus = (msg) => {
    if (msg.uid !== currentUser?.uid) return null; 

    const isRecipientOnline = onlineUserIds.includes(activePersonalRoom?.id);

    if (msg.status === 'read') {
      return <FaCheckDouble className={`${styles.tickIcon} ${styles.tickRead}`} />;
    } else if (isRecipientOnline) {
      return <FaCheckDouble className={`${styles.tickIcon} ${styles.tickDelivered}`} />;
    } else {
      return <FaCheck className={`${styles.tickIcon} ${styles.tickSent}`} />;
    }
  };

  const formatSubMessageText = (text) => {
    if (!text) return '';
    return text.length > 20 ? text.substring(0, 20) + '...' : text;
  };

  return (
    <div className={styles.chatResponsiveWrapper}>
      
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

      <header className={styles.chatCustomHeader}>
        {activePersonalRoom ? (
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
              <p>Terhubung langsung dengan siswa lainnya secara realtime</p>
            </>
          )}
        </div>
      </header>

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

      <div className={styles.chatMainContentBody}>
        
        {chatSubTab === 'global' ? (
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
                      <div className={styles.chatAvatarWrapperZone}>
                        <div className={msg.activeBorder || 'borderNormal'}>
                          {msg.photoURL ? (
                            <img 
                              src={msg.photoURL} 
                              alt="avatar" 
                              className={styles.chatMsgInternalAvatar}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewPhotoUser({ photoURL: msg.photoURL, displayName: msg.displayName });
                              }}
                            />
                          ) : (
                            <div className={styles.chatMsgInitialFallback}>
                              {msg.displayName ? msg.displayName.charAt(0).toUpperCase() : 'U'}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={styles.msgContentBlock}>
                        {!isSelf && (
                          <span className={styles.msgSenderName}>
                            {msg.displayName || msg.username || 'Siswa'}
                          </span>
                        )}
                        <div className={styles.msgBubbleCore}>
                          <p>{msg.text}</p>
                        </div>
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
          <div className={styles.personalChatLayoutContainer}>
            {!activePersonalRoom ? (
              <>
                <div className={styles.searchUserBarContainer}>
                  <FaMagnifyingGlass className={styles.searchIconBar} />
                  <input 
                    type="text" 
                    placeholder="Ketik untuk mencari & mulai chat baru..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className={styles.directoryUsersScrollArea}>
                  {loadingUsers ? (
                    <div className={styles.loadingStateBlock}>
                      <FaMessage className={styles.spinAnimation} /> Memuat data chat...
                    </div>
                  ) : filteredAndSortedUsers.length > 0 ? (
                    filteredAndSortedUsers.map(user => {
                      const isOnline = onlineUserIds.includes(user.id); 
                      const userUnreadCount = unreadPerUser[user.id] || 0;
                      const userLastMsg = lastMessages[user.id] || '';

                      return (
                        <div 
                          key={user.id} 
                          className={styles.userItemRowCard} 
                          onClick={() => setActivePersonalRoom(user)} 
                        >
                          <div className={styles.avatarWrapperContainer}>
                            <div className={styles.chatAvatarWrapperZone}>
                              <div className={user.activeBorder || 'borderNormal'}>
                                {user.photoURL ? (
                                  <img 
                                    src={user.photoURL} 
                                    alt="avatar" 
                                    className={styles.chatMsgInternalAvatar}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPreviewPhotoUser(user);
                                    }}
                                  />
                                ) : (
                                  <div className={styles.chatMsgInitialFallback}>
                                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                                  </div>
                                )}
                              </div>
                            </div>
                            <span className={`${styles.onlineDotIndicator} ${isOnline ? styles.dotActive : styles.dotInactive}`} />
                          </div>

                          <div className={styles.userMainMetaDetails}>
                            <h4>{user.displayName || 'Siswa'}</h4>
                            <p>{userLastMsg ? formatSubMessageText(userLastMsg) : `@${user.username || 'siswa_quiz'}`}</p>
                          </div>

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
                  ) : (
                    <div className={styles.emptyChatPlaceholder}>
                      <FaComments className={styles.placeholderIcon} />
                      <h4>Tidak Ditemukan</h4>
                      <p>Siswa dengan nama atau username "{searchQuery}" tidak ada.</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className={styles.personalChatRoomContainer}>
                <div className={styles.chatMessagesStreamArea}>
                  {personalMessages.length > 0 ? (
                    personalMessages.map((msg, index) => {
                      const isSelf = msg.uid === currentUser?.uid;
                      
                      const msgBorder = isSelf 
                        ? (currentUser?.activeBorder || 'borderNormal') 
                        : (msg.activeBorder || activePersonalRoom?.activeBorder || 'borderNormal');

                      return (
                        <div 
                          key={msg.id || index} 
                          className={`${styles.messageRowItem} ${isSelf ? styles.msgRowSelf : styles.msgRowOther}`}
                        >
                          <div className={styles.chatAvatarWrapperZone}>
                            <div className={msgBorder}>
                              {isSelf ? (
                                currentUser?.photoURL ? (
                                  <img src={currentUser.photoURL} alt="Kamu" className={styles.chatMsgInternalAvatar} />
                                ) : (
                                  <div className={styles.chatMsgInitialFallback}>K</div>
                                )
                              ) : (
                                activePersonalRoom?.photoURL ? (
                                  <img 
                                    src={activePersonalRoom.photoURL} 
                                    alt="Lawan" 
                                    className={styles.chatMsgInternalAvatar} 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPreviewPhotoUser(activePersonalRoom);
                                    }}
                                  />
                                ) : (
                                  <div className={styles.chatMsgInitialFallback}>
                                    {activePersonalRoom?.displayName ? activePersonalRoom.displayName.charAt(0).toUpperCase() : 'U'}
                                  </div>
                                )
                              )}
                            </div>
                          </div>

                          <div className={styles.msgContentBlock}>
                            <div className={styles.msgBubbleCore}>
                              <p>{msg.text}</p>
                              <div className={styles.msgMetaStatusContainer}>
                                {renderMessageStatus(msg)}
                              </div>
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
