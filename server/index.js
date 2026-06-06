// ~/quizpreet/server/index.js

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Server Realtime Quizpreet Berjalan!');
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:3000", "http://192.168.1.250:3000"],
        methods: ["GET", "POST"]
    }
});

const activeLobbies = {};
const activeGroupLobbies = {};
const onlineUsers = {};

function generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

io.on('connection', (socket) => {
    console.log(`[SOCKET] User terhubung: ${socket.id}`);
    
    // Event saat user masuk ke halaman chat / online
    socket.on('user_online', ({ uid }) => {
        if (uid) {
            socket.uid = uid; // Simpan uid di dalam instance socket agar mudah dilacak saat disconnect
            onlineUsers[uid] = socket.id;
            
            // Broadcast daftar UID yang sedang online ke semua client yang aktif
            io.emit('list_online_users', Object.keys(onlineUsers));
            console.log(`[CHAT] User ${uid} sekarang ONLINE.`);
        }
    });

    // Event opsional jika user sengaja logout / keluar dari tab chat tanpa menutup aplikasi
    socket.on('user_offline', ({ uid }) => {
        if (uid && onlineUsers[uid]) {
            delete onlineUsers[uid];
            io.emit('list_online_users', Object.keys(onlineUsers));
            console.log(`[CHAT] User ${uid} sekarang OFFLINE.`);
        }
    });

    // EVENT 1: Pembuatan Room Baru oleh Host
    socket.on('create_room', ({ uid, name, photoURL, subject }) => {
        const roomId = generateRoomId();
        
        activeLobbies[roomId] = {
            roomId: roomId,
            status: 'waiting',
            subject: subject,
            host: { socketId: socket.id, uid, name, photoURL, isReady: true },
            challenger: null
        };

        socket.join(roomId);
        socket.emit('room_created', { roomId });
        console.log(`[SOCKET] Room ${roomId} berhasil dibuat oleh Host: ${name}`);
    });

    // EVENT 2: Challenger Masuk Lewat Klik Tombol Gabung / Masukkan Kode Manual
    socket.on('join_room', ({ roomId, uid, name, photoURL }) => {
        if (!roomId) return;
        const cleanRoomId = roomId.trim().toUpperCase();
        const lobby = activeLobbies[cleanRoomId];

        if (!lobby) {
            return socket.emit('join_error', { message: 'Kode room tidak valid atau sudah kedaluwarsa!' });
        }

        if (lobby.host.uid === uid) {
            lobby.host.socketId = socket.id;
            socket.join(cleanRoomId);
            return io.to(cleanRoomId).emit('room_updated', lobby);
        }

        if (lobby.challenger && lobby.challenger.uid !== uid) {
            return socket.emit('join_error', { message: 'Maaf, slot pertandingan sudah penuh!' });
        }

        if (!lobby.challenger) {
            lobby.challenger = { socketId: socket.id, uid, name, photoURL, isReady: false };
            console.log(`[SOCKET] Challenger ${name} bergabung ke room ${cleanRoomId}`);
            
            // KIRIM NOTIFIKASI KHUSUS KE HOST: Lawan baru masuk
            socket.to(cleanRoomId).emit('challenger_joined_toast', { 
                message: `${name} telah memasuki lobby pertandingan, siap dimulai!` 
            });
        } else if (lobby.challenger.uid === uid) {
            lobby.challenger.socketId = socket.id;
        }

        socket.join(cleanRoomId);
        io.to(cleanRoomId).emit('room_updated', lobby);
    });

    // EVENT 3: Sinkronisasi Otomatis Via Share Link Langsung
    socket.on('get_room_status', ({ roomId, uid, name, photoURL }) => {
        if (!roomId) return;
        const cleanRoomId = roomId.trim().toUpperCase();
        const lobby = activeLobbies[cleanRoomId];
        
        if (!lobby) {
            return socket.emit('join_error', { message: 'Sesi tautan mabar tidak ditemukan atau sudah hangus!' });
        }

        socket.join(cleanRoomId);

        if (lobby.host.uid === uid) {
            lobby.host.socketId = socket.id;
        } 
        else if (lobby.challenger && lobby.challenger.uid === uid) {
            lobby.challenger.socketId = socket.id;
        } 
        else if (!lobby.challenger) {
            lobby.challenger = { socketId: socket.id, uid, name, photoURL, isReady: false };
            console.log(`[SOCKET] Challenger ${name} masuk via Tautan Link ke room ${cleanRoomId}`);
            
            // KIRIM NOTIFIKASI KHUSUS KE HOST VIA LINK: Lawan baru masuk
            socket.to(cleanRoomId).emit('challenger_joined_toast', { 
                message: `${name} telah memasuki lobby pertandingan, siap dimulai!` 
            });
        } 
        else {
            return socket.emit('join_error', { message: 'Maaf, room duel ini sudah penuh!' });
        }

        io.to(cleanRoomId).emit('room_updated', lobby);
    });

    // EVENT HOST KELUAR SECARA SENGAJA (Klik Ya di Popup)
    socket.on('host_leave_room', ({ roomId }) => {
        if (!roomId) return;
        const cleanRoomId = roomId.trim().toUpperCase();
        if (activeLobbies[cleanRoomId]) {
            io.to(cleanRoomId).emit('player_left_broadcast', { message: 'Host telah meninggalkan lobby, ruangan dibubarkan!' });
            delete activeLobbies[cleanRoomId];
            console.log(`[EXIT] Room ${cleanRoomId} dihapus secara instan karena Host memilih keluar.`);
        }
    });

    // EVENT CHALLENGER KELUAR SECARA SENGAJA (Klik Ya di Popup)
    socket.on('challenger_leave_room', ({ roomId }) => {
        if (!roomId) return;
        const cleanRoomId = roomId.trim().toUpperCase();
        const lobby = activeLobbies[cleanRoomId];
        if (lobby) {
            const challengerName = lobby.challenger ? lobby.challenger.name : 'Lawan';
            lobby.challenger = null;
            io.to(cleanRoomId).emit('room_updated', lobby);
            io.to(cleanRoomId).emit('challenger_left_notification', { message: `${challengerName} telah keluar dari lobby mabar.` });
            console.log(`[EXIT] Slot penantang di room ${cleanRoomId} dikosongkan karena memilih keluar.`);
        }
    });
    
    socket.on('create_group_room', ({ uid, name, photoURL, subject, maxMembers, gameMode, matchType }) => {
        const roomId = 'GRP' + generateRoomId().substring(0, 3); // Contoh: GRPX92
        
        const newGroupLobby = {
            roomId: roomId,
            status: 'waiting',
            subject: subject,
            maxMembers: parseInt(maxMembers) || 5,
            gameMode: gameMode, // 'study' atau 'competition'
            matchType: gameMode === 'competition' ? matchType : null, // 'random' atau 'custom'
            members: [],
            teamA: [],
            teamB: []
        };

        const hostUserData = { socketId: socket.id, uid, name, photoURL, isReady: true };

        // Taruh host ke posisinya sesuai mode yang dipilih
        if (gameMode === 'study') {
            newGroupLobby.members.push(hostUserData);
        } else {
            newGroupLobby.teamA.push(hostUserData); // Default tim A untuk kompetisi
        }

        activeGroupLobbies[roomId] = newGroupLobby;
        socket.join(roomId);
        
        socket.emit('group_room_created', { roomId });
        console.log(`[GROUP] Room ${roomId} [${gameMode}] berhasil dibuat oleh ${name}`);
    });

    // 2. EVENT JOIN ROOM GROUP (KODE / LINK)
    socket.on('join_group_room', ({ roomId, uid, name, photoURL }) => {
        if (!roomId) return;
        const cleanRoomId = roomId.trim().toUpperCase();
        const lobby = activeGroupLobbies[cleanRoomId];

        if (!lobby) {
            return socket.emit('group_join_error', { message: 'Kode group lobby tidak valid atau sudah hangus!' });
        }

        const newUserData = { socketId: socket.id, uid, name, photoURL, isReady: false };

        // JIKA MODE BELAJAR BARENG (STUDY)
        if (lobby.gameMode === 'study') {
            const isExist = lobby.members.find(m => m.uid === uid);
            if (isExist) {
                isExist.socketId = socket.id; // Update socket id jika refresh
            } else {
                if (lobby.members.length >= lobby.maxMembers) {
                    return socket.emit('group_join_error', { message: 'Maaf, kuota belajar kelompok sudah penuh!' });
                }
                lobby.members.push(newUserData);
            }
        } 
        // JIKA MODE KOMPETISI
        else {
            const isHostInA = lobby.teamA.find(m => m.uid === uid);
            const isUserInB = lobby.teamB.find(m => m.uid === uid);

            if (isHostInA) isHostInA.socketId = socket.id;
            else if (isUserInB) isUserInB.socketId = socket.id;
            else {
                // User baru masuk lewat link/kode di mode kompetisi
                if (lobby.teamA.length < lobby.maxMembers) {
                    lobby.teamA.push(newUserData);
                } else if (lobby.teamB.length < lobby.maxMembers && lobby.matchType === 'custom') {
                    lobby.teamB.push(newUserData);
                } else {
                    return socket.emit('group_join_error', { message: 'Maaf, semua slot tim sudah penuh!' });
                }
            }
        }

        socket.join(cleanRoomId);
        io.to(cleanRoomId).emit('group_room_updated', lobby);
    });

    // 3. EVENT PINDAH TIM (KHUSUS MODE KOMPETISI CUSTOM)
    socket.on('switch_group_team', ({ roomId, uid, toTeam }) => {
        if (!roomId) return;
        const cleanRoomId = roomId.trim().toUpperCase();
        const lobby = activeGroupLobbies[cleanRoomId];
        if (!lobby || lobby.gameMode !== 'competition') return;

        let foundUser = null;

        // Cari user di tim A
        const idxA = lobby.teamA.findIndex(m => m.uid === uid);
        if (idxA !== -1) {
            foundUser = lobby.teamA[idxA];
            if (toTeam === 'B') {
                if (lobby.teamB.length >= lobby.maxMembers) {
                    return socket.emit('group_action_error', { message: 'Tim B sudah penuh!' });
                }
                lobby.teamA.splice(idxA, 1);
                lobby.teamB.push(foundUser);
            }
        }

        // Cari user di tim B
        const idxB = lobby.teamB.findIndex(m => m.uid === uid);
        if (idxB !== -1) {
            foundUser = lobby.teamB[idxB];
            if (toTeam === 'A') {
                if (lobby.teamA.length >= lobby.maxMembers) {
                    return socket.emit('group_action_error', { message: 'Tim A sudah penuh!' });
                }
                lobby.teamB.splice(idxB, 1);
                lobby.teamA.push(foundUser);
            }
        }

        io.to(cleanRoomId).emit('group_room_updated', lobby);
    });

    // 4. EVENT LEAVE / BUBAR RUANGAN GROUP SECARA SENGAJA
    socket.on('leave_group_room', ({ roomId, uid }) => {
        if (!roomId) return;
        const cleanRoomId = roomId.trim().toUpperCase();
        const lobby = activeGroupLobbies[cleanRoomId];
        if (!lobby) return;

        // Cek apakah yang keluar adalah pembuat room (Host)
        // Kita anggap orang pertama di members atau teamA sebagai host pembuka
        const isHost = (lobby.gameMode === 'study' && lobby.members[0]?.uid === uid) || 
                       (lobby.gameMode === 'competition' && lobby.teamA[0]?.uid === uid);

        if (isHost) {
            io.to(cleanRoomId).emit('group_room_dissolved', { message: 'Host telah membubarkan group lobby ini!' });
            delete activeGroupLobbies[cleanRoomId];
            console.log(`[GROUP] Room ${cleanRoomId} resmi dibubarkan oleh Host.`);
        } else {
            // Pemain biasa yang keluar, hapus dari list array tempat dia berada
            if (lobby.gameMode === 'study') {
                lobby.members = lobby.members.filter(m => m.uid !== uid);
            } else {
                lobby.teamA = lobby.teamA.filter(m => m.uid !== uid);
                lobby.teamB = lobby.teamB.filter(m => m.uid !== uid);
            }
            io.to(cleanRoomId).emit('group_room_updated', lobby);
            socket.leave(cleanRoomId);
        }
    });
    
    // Host/Anggota mengabarkan status Mic & Speaker mereka ke seluruh orang di room
    socket.on('update_voice_status', ({ roomId, uid, isMicOn, isSpeakerOn }) => {
        if (!roomId) return;
        const cleanRoomId = roomId.trim().toUpperCase();
        const lobby = activeGroupLobbies[cleanRoomId];
        if (!lobby) return;

        // Cari user di study mode, teamA, atau teamB untuk update status visual icon mic
        let user = null;
        if (lobby.gameMode === 'study') {
            user = lobby.members.find(m => m.uid === uid);
        } else {
            user = lobby.teamA.find(m => m.uid === uid) || lobby.teamB.find(m => m.uid === uid);
        }

        if (user) {
            user.isMicOn = isMicOn;
            user.isSpeakerOn = isSpeakerOn;
        }

        // Broadcast data terbaru agar icon mic di foto profil ter-update secara realtime
        io.to(cleanRoomId).emit('group_room_updated', lobby);
    });

    // Jalur pengiriman sinyal WebRTC (Hanya diteruskan ke target socket id tertentu)
    socket.on('webrtc_signal', ({ targetSocketId, signalData, senderUid }) => {
        io.to(targetSocketId).emit('webrtc_signal_received', {
            senderSocketId: socket.id,
            signalData: signalData,
            senderUid: senderUid
        });
    });

    // EVENT 4: Putus Koneksi Karena Masalah Jaringan / Force Close Aplikasi (Toleransi 10 Detik)
    socket.on('disconnect', () => {
      // --- SEGMEN BARU UNTUK CHAT (INSTAN) ---
        if (socket.uid && onlineUsers[socket.uid]) {
            delete onlineUsers[socket.uid];
            io.emit('list_online_users', Object.keys(onlineUsers));
            console.log(`[CHAT] User ${socket.uid} putus koneksi (OFFLINE).`);
        }
        setTimeout(() => {
            Object.keys(activeLobbies).forEach((roomId) => {
                const lobby = activeLobbies[roomId];
                if (!lobby) return;

                if (lobby.host && lobby.host.socketId === socket.id) {
                    if (activeLobbies[roomId] && activeLobbies[roomId].host.socketId === socket.id) {
                        io.to(roomId).emit('player_left_broadcast', { message: 'Host terputus, room dibubarkan otomatis!' });
                        delete activeLobbies[roomId];
                        console.log(`[SOCKET] Room ${roomId} dihapus karena Host disconnect.`);
                    }
                } else if (lobby.challenger && lobby.challenger.socketId === socket.id) {
                    if (activeLobbies[roomId] && activeLobbies[roomId].challenger.socketId === socket.id) {
                        lobby.challenger = null;
                        io.to(roomId).emit('room_updated', lobby);
                        io.to(roomId).emit('challenger_left_notification', { message: 'Lawan terputus dari jaringan.' });
                        console.log(`[SOCKET] Slot penantang di room ${roomId} dikosongkan.`);
                    }
                }
            });
        }, 10000);
    });
});

server.listen(PORT, () => {
    console.log(`[BACKEND] Server Realtime berjalan di port ${PORT}`);
});
