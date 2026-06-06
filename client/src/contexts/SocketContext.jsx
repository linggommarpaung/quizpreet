import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { db } from '../config/firebaseConfig';
import { collectionGroup, onSnapshot, query, where } from 'firebase/firestore';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [unreadPerUser, setUnreadPerUser] = useState({}); // Format: { uid_teman: jumlah_unread }

  // 1. Efek Manajemen Koneksi Socket Global
  useEffect(() => {
    // Ganti IP dengan IP server mabar andalanmu
    const newSocket = io('http://192.168.1.250:5000');
    setSocket(newSocket);

    // Dapatkan data user online secara berkala dari server
    newSocket.on('list_online_users', (userIds) => {
      setOnlineUserIds(userIds);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // 2. Efek Sinkronisasi Emit Kehadiran (Presence) jika User Login
  useEffect(() => {
    if (socket && currentUser) {
      // Mengabarkan ke server mabar kalau user ini aktif di aplikasi
      socket.emit('user_online', {
        uid: currentUser.uid,
        name: currentUser.displayName || 'Siswa'
      });
    }
  }, [socket, currentUser]);

  // 3. Efek Menghitung Jumlah Pesan Masuk yang Belum Dibaca (Firestore Collection Group)
  useEffect(() => {
    if (!currentUser) {
      setTotalUnreadCount(0);
      setUnreadPerUser({});
      return;
    }

    // Menggunakan collectionGroup untuk men-scan seluruh sub-koleksi bernama 'messages'
    const messagesQuery = query(
      collectionGroup(db, 'messages'),
      where('status', '==', 'sent')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      let total = 0;
      const unreadMap = {};

      snapshot.docs.forEach((docSnap) => {
        const msgData = docSnap.data();
        
        // Pastikan pesan itu bukan dikirim oleh kita sendiri
        if (msgData.uid !== currentUser.uid) {
          // Cari tahu ID room-nya (didapat dari path: personal_chats/uidA_uidB/messages/msgId)
          const pathSegments = docSnap.ref.path.split('/');
          const roomId = pathSegments[1]; // Mengambil segmen 'uidA_uidB'

          // Pastikan kita adalah bagian dari Room ID alfabetis ini
          if (roomId.includes(currentUser.uid)) {
            total += 1;
            
            // Ekstrak UID teman dari Room ID tersebut
            const friendUid = roomId.replace(currentUser.uid, '').replace('_', '');
            unreadMap[friendUid] = (unreadMap[friendUid] || 0) + 1;
          }
        }
      });

      setTotalUnreadCount(total);
      setUnreadPerUser(unreadMap);
    });

    return () => unsubscribe();
  }, [currentUser]);

  return (
    <SocketContext.Provider value={{ socket, onlineUserIds, totalUnreadCount, unreadPerUser }}>
      {children}
    </SocketContext.Provider>
  );
};
