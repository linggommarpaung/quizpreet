// client/src/pages/QuizLobby.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { 
    FaArrowLeft, 
    FaUserGroup, 
    FaPlus, 
    FaRightToBracket, 
    FaCopy, 
    FaCheck, 
    FaHourglassHalf, 
    FaGamepad,
    FaCircleInfo
} from 'react-icons/fa6';
import styles from './QuizLobby.module.css';

// Koneksi socket diarahkan ke IP lokal HP Termux port backend 5000
const socket = io('http://192.168.1.250:5000');

const QuizLobby = () => {
    const { currentUser } = useAuth();
    const { lobbyId } = useParams(); 
    const navigate = useNavigate();

    const [viewMode, setViewMode] = useState(lobbyId ? 'inside' : 'menu'); 
    const [selectedSubject, setSelectedSubject] = useState('mtk');
    const [inputRoomCode, setInputRoomCode] = useState('');
    const [lobbyData, setLobbyData] = useState(null);
    const [showExitModal, setShowExitModal] = useState(false); // State untuk mengontrol pop-up konfirmasi
    const hasRequestedStatus = useRef(false);

    const subjectsList = [
        { id: 'mtk', name: 'Matematika', icon: '📐', themeColor: '#2563eb' },
        { id: 'ipa', name: 'Sains (IPA)', icon: '🧪', themeColor: '#128c7e' },
        { id: 'ips', name: 'Ilmu Pengetahuan Sosial (IPS)', icon: '🌍', themeColor: '#7c3aed' },
        { id: 'bing', name: 'Bahasa Inggris', icon: '🇬🇧', themeColor: '#eab308' }
    ];

    // ==================== REALTIME SOCKET LISTENERS ====================
    useEffect(() => {
        socket.on('room_created', ({ roomId }) => {
            toast.success('Lobby Berhasil Dibuat! 🚀');
            setViewMode('inside');
            navigate(`/contest/1v1/lobby/${roomId}`);
        });

        socket.on('room_updated', (data) => {
            setLobbyData(data);
        });

        socket.on('join_error', ({ message }) => {
            toast.error(message);
            setLobbyData(null);
            setViewMode('menu');
            navigate('/contest/1v1');
        });
 
        socket.on('challenger_joined_toast', ({ message }) => {
            toast.success(message, { 
                icon: '⚔️', 
                duration: 5000,
                style: {
                    border: '1px solid #2563eb',
                    padding: '16px',
                    color: '#1e3a8a',
                    fontWeight: 'bold'
                }
            });
        });

        // Notifikasi khusus untuk Host saat Challenger keluar secara sengaja
        socket.on('challenger_left_notification', ({ message }) => {
            toast.error(message, { icon: '🏃‍♂️', duration: 4000 });
        });

        // Trigger perpindahan layar otomatis serentak ketika game dimulai
        socket.on('game_started_broadcast', ({ roomId, subject }) => {
            toast.success('Pertandingan Dimulai! Mengalihkan ke Arena...', { icon: '🎮' });
        });

        // Kawan mental keluar massal (Saat host membubarkan / keluar room)
        socket.on('player_left_broadcast', ({ message }) => {
            toast.error(message, { duration: 5000, icon: '🚪' });
            setLobbyData(null);
            setViewMode('menu');
            navigate('/contest/1v1');
        });

        return () => {
            socket.off('room_created');
            socket.off('room_updated');
            socket.off('join_error');
            socket.off('challenger_left_notification');
            socket.off('challenger_joined_toast');
            socket.off('game_started_broadcast');
            socket.off('player_left_broadcast');
        };
    }, [navigate]);

    // ==================== SYNC URL / REFRESH BROWSER (SHARE LINK) ====================
    useEffect(() => {
        if (lobbyId && currentUser) {
            setViewMode('inside');
            if (!hasRequestedStatus.current) {
                socket.emit('get_room_status', { 
                    roomId: lobbyId.trim().toUpperCase(), 
                    uid: currentUser.uid,
                    name: currentUser.displayName || 'Pemain Kuis',
                    photoURL: currentUser.photoURL || ''
                });
                hasRequestedStatus.current = true;
            }
        } else {
            setViewMode('menu');
            setLobbyData(null);
            hasRequestedStatus.current = false;
        }
    }, [lobbyId, currentUser]);

    // ==================== EVENT HANDLERS FUNGSI ====================
    const handleCreateRoom = () => {
        if (!currentUser) return toast.error('Silakan login terlebih dahulu!');
        socket.emit('create_room', {
            uid: currentUser.uid,
            name: currentUser.displayName || 'Host Mabar',
            photoURL: currentUser.photoURL || '',
            subject: selectedSubject
        });
    };

    const handleJoinRoomByCode = () => {
        if (!inputRoomCode.trim()) return toast.error('Silakan ketik kode room dulu!');
        if (!currentUser) return toast.error('Silakan login terlebih dahulu!');

        const cleanCode = inputRoomCode.trim().toUpperCase();
        
        setViewMode('inside');
        navigate(`/contest/1v1/lobby/${cleanCode}`);

        socket.emit('join_room', {
            roomId: cleanCode,
            uid: currentUser.uid,
            name: currentUser.displayName || 'Penantang',
            photoURL: currentUser.photoURL || ''
        });
    };

    // Fungsi pemicu klik tombol back (menampilkan modal pop-up konfirmasi)
    const handleTriggerExitRequest = () => {
        setShowExitModal(true);
    };

    // Eksekusi pemutusan resmi setelah menekan tombol "Ya, Keluar" di pop-up
    const handleConfirmActualExit = () => {
        setShowExitModal(false);
        const isCurrentUserHost = lobbyData?.host?.uid === currentUser?.uid;

        if (isCurrentUserHost) {
            // Jika dia Host, hapus total room dari database backend
            socket.emit('host_leave_room', { roomId: lobbyId.toUpperCase() });
        } else {
            // Jika dia Lawan, kosongkan slot challenger saja
            socket.emit('challenger_leave_room', { roomId: lobbyId.toUpperCase() });
        }

        // Kembalikan state frontend ke menu utama secara instan
        setLobbyData(null);
        setViewMode('menu');
        navigate('/contest/1v1');
    };

    const copyRoomIdToClipboard = () => {
        if (lobbyId) {
            const inviteURL = `${window.location.origin}/contest/1v1/lobby/${lobbyId.toUpperCase()}`;
            navigator.clipboard.writeText(inviteURL);
            toast.success('Link mabar otomatis berhasil disalin!');
        }
    };

    const handleStartMatchGame = () => {
        if (!lobbyData?.challenger) {
            return toast.error('Tidak bisa memulai, tunggu lawan bergabung dulu!');
        }
        socket.emit('start_game_trigger', { roomId: lobbyId.toUpperCase() });
    };

    const currentSubjectInfo = subjectsList.find(s => s.id === (lobbyData?.subject || selectedSubject));

    // ==================== RENDERING TAMPILAN DALAM RUANGAN (INSIDE) ====================
    if (viewMode === 'inside') {
        const isCurrentUserHost = lobbyData?.host?.uid === currentUser?.uid;

        return (
            <div className={styles.lobbyMainWrapper}>
                <div className={styles.headerTopZone}>
                    {/* Mengubah fungsi klik kembali agar memicu pop-up konfirmasi */}
                    <button className={styles.circularBackBtn} onClick={handleTriggerExitRequest}>
                        <FaArrowLeft />
                    </button>
                    <h2>Ruang Tunggu Duel 1v1</h2>
                </div>

                <div className={styles.infoSubjectBannerBar}>
                    <FaCircleInfo />
                    <span>Kategori Duel Saat Ini: <strong>{currentSubjectInfo?.name || 'Mata Pelajaran'}</strong></span>
                </div>

                <div className={styles.roomCodeDisplayCardBox} onClick={copyRoomIdToClipboard} title="Klik untuk salin link">
                    <span className={styles.codeLabelTxt}>KODE ROOM DUEL</span>
                    <div className={styles.codeFlexDisplayRow}>
                        <h1 className={styles.mainCodeRoomText}>{lobbyId?.toUpperCase()}</h1>
                        <FaCopy className={styles.copyIconFeedback} />
                    </div>
                    <p>Klik kotak di atas untuk menyalin link mabar cepat dan kirim ke kawanmu!</p>
                </div>

                <div className={styles.duelistVSContainerRow}>
                    {/* SLOT PLAYER 1: HOST */}
                    <div className={styles.duelistCardItemBox}>
                        <div className={styles.avatarWrapperContainer}>
                            {lobbyData?.host?.photoURL ? (
                                <img src={lobbyData.host.photoURL} alt="Host Avatar" className={styles.duelistAvatarImage} />
                            ) : (
                                <div className={styles.fallbackAvatarDuelist}>
                                    {lobbyData?.host?.name?.charAt(0).toUpperCase() || 'H'}
                                </div>
                            )}
                            <span className={styles.badgeRolePlayerTag}>HOST</span>
                        </div>
                        <h4>{lobbyData?.host?.name || 'Menghubungkan...'}</h4>
                        <div className={styles.statusReadyBadgeStyle}>
                            <FaCheck className={styles.iconCheckGreen} /> Ready
                        </div>
                    </div>

                    <div className={styles.versusMidLogoAnimationArea}>
                        <div className={styles.vsCircleOuterCircle}>
                            <h2>VS</h2>
                        </div>
                    </div>

                    {/* SLOT PLAYER 2: PENANTANG (CHALLENGER) */}
                    <div className={styles.duelistCardItemBox}>
                        {lobbyData?.challenger ? (
                            <>
                                <div className={styles.avatarWrapperContainer}>
                                    {lobbyData.challenger.photoURL ? (
                                        <img src={lobbyData.challenger.photoURL} alt="Challenger Avatar" className={styles.duelistAvatarImage} />
                                    ) : (
                                        <div className={styles.fallbackAvatarDuelist} style={{ backgroundColor: '#7c3aed' }}>
                                            {lobbyData?.challenger?.name?.charAt(0).toUpperCase() || 'L'}
                                        </div>
                                    )}
                                    <span className={styles.badgeRolePlayerTag} style={{ backgroundColor: '#7c3aed' }}>LAWAN</span>
                                </div>
                                <h4>{lobbyData.challenger.name}</h4>
                                <div className={styles.statusReadyBadgeStyle}>
                                    <FaCheck className={styles.iconCheckGreen} /> Ready
                                </div>
                            </>
                        ) : (
                            <div className={styles.emptySlotWaitingAnimation}>
                                <div className={styles.pulseLoadingCircleIcon}>
                                    <FaHourglassHalf className={styles.spinningHourglassIcon} />
                                </div>
                                <h4>Menunggu Lawan...</h4>
                                <p>Bagikan kode room di atas agar temanmu bisa masuk ke slot ini.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.lobbyActionBottomControlArea}>
                    {isCurrentUserHost ? (
                        <button 
                            className={lobbyData?.challenger ? styles.startGameActiveTriggerBtn : styles.startGameDisabledTriggerBtn}
                            disabled={!lobbyData?.challenger}
                            onClick={handleStartMatchGame}
                        >
                            <FaGamepad /> MULAI PERTANDINGAN
                        </button>
                    ) : (
                        <div className={styles.waitingHostNotificationBanner}>
                            <FaHourglassHalf className={styles.spinningHourglassIcon} /> 
                            <span>Menunggu Host Memulai Pertandingan...</span>
                        </div>
                    )}
                </div>

                {/* POP-UP MODAL KONFIRMASI KUSTOM KELUAR RUANGAN */}
                {showExitModal && (
                    <div className={styles.modalOverlayZone}>
                        <div className={styles.modalContentCard}>
                            <h3>Konfirmasi Keluar</h3>
                            <p>
                                {isCurrentUserHost 
                                    ? "Apakah kamu yakin ingin keluar? Karena kamu adalah HOST, ruangan mabar ini akan dihapus otomatis dan lawan akan dikeluarkan."
                                    : "Apakah kamu yakin ingin meninggalkan ruangan duel ini?"}
                            </p>
                            <div className={styles.modalButtonsRow}>
                                <button className={styles.modalCancelBtn} onClick={() => setShowExitModal(false)}>
                                    Batal
                                </button>
                                <button className={styles.modalConfirmBtn} onClick={handleConfirmActualExit}>
                                    Ya, Keluar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ==================== RENDERING TAMPILAN MENU UTAMA SELEKSI ====================
    return (
        <div className={styles.lobbyMainWrapper}>
            <div className={styles.headerTopZone}>
                <button className={styles.circularBackBtn} onClick={() => navigate('/dashboard')}>
                    <FaArrowLeft />
                </button>
                <h2>Arena Duel 1 vs 1</h2>
            </div>

            <div className={styles.dualMenuFlexGrid}>
                <div className={styles.lobbyCardActionBlock}>
                    <div className={styles.cardHeaderIconArea}>
                        <FaPlus className={styles.mainBlueIcon} />
                    </div>
                    <h3>Buat Lobby Duel</h3>
                    <p className={styles.descCardText}>Pilih mata pelajaran kuis di bawah ini, lalu buat kode unik untuk mengundang teman mabar kamu.</p>
                    
                    <div className={styles.formGroupControl}>
                        <label>Pilih Mata Pelajaran:</label>
                        <select 
                            value={selectedSubject} 
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className={styles.customSelectInput}
                        >
                            {subjectsList.map((sub) => (
                                <option key={sub.id} value={sub.id}>
                                    {sub.icon} {sub.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button className={styles.primaryActionBlueBtn} onClick={handleCreateRoom}>
                        <FaGamepad /> Buat Room Sekarang
                    </button>
                </div>

                <div className={styles.lobbyCardActionBlock}>
                    <div className={styles.cardHeaderIconArea}>
                        <FaRightToBracket className={styles.mainBlueIcon} />
                    </div>
                    <h3>Gabung Lobby Teman</h3>
                    <p className={styles.descCardText}>Masukkan 6-digit kode room unik yang dibagikan oleh temanmu untuk langsung memulai duel mabar.</p>
                    
                    <div className={styles.formGroupControl}>
                        <label>Kode Room Duel:</label>
                        <input 
                            type="text"
                            placeholder="Contoh: MAT61A"
                            value={inputRoomCode}
                            onChange={(e) => setInputRoomCode(e.target.value)}
                            maxLength={6}
                            className={styles.customTextInputStyle}
                        />
                    </div>
                    <button onClick={handleJoinRoomByCode} className={styles.secondaryActionBlueBtn}>
                        <FaUserGroup /> Gabung Ke Duel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuizLobby;
