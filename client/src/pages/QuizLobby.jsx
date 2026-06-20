// client/src/pages/QuizLobby.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// Menggunakan modul Firestore modular (v9/v10+)
import { db } from '../config/firebaseConfig'; 
import { doc, setDoc, updateDoc, onSnapshot, deleteDoc, getDoc } from 'firebase/firestore';
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

const QuizLobby = () => {
    const { currentUser } = useAuth();
    const { lobbyId } = useParams(); 
    const navigate = useNavigate();

    const [viewMode, setViewMode] = useState(lobbyId ? 'inside' : 'menu'); 
    const [selectedSubject, setSelectedSubject] = useState('mtk');
    const [inputRoomCode, setInputRoomCode] = useState('');
    const [lobbyData, setLobbyData] = useState(null);
    const [showExitModal, setShowExitModal] = useState(false); 
    const hasRequestedStatus = useRef(false);

    // Ref untuk memantau data lawan sebelumnya (keperluan memicu toast)
    const prevChallengerRef = useRef(null);

    const subjectsList = [
        { id: 'mtk', name: 'Matematika', icon: '📐', themeColor: '#2563eb' },
        { id: 'ipa', name: 'Sains (IPA)', icon: '🧪', themeColor: '#128c7e' },
        { id: 'ips', name: 'Ilmu Pengetahuan Sosial (IPS)', icon: '🌍', themeColor: '#7c3aed' },
        { id: 'bing', name: 'Bahasa Inggris', icon: '🇬🇧', themeColor: '#eab308' }
    ];

    function generateRoomId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // ==================== REALTIME FIRESTORE LISTENERS ====================
    useEffect(() => {
        if (!lobbyId) return;

        const cleanRoomId = lobbyId.trim().toUpperCase();
        // Referensi dokumen di Firestore: collection 'lobbies_1v1', document 'KODEROOM'
        const roomDocRef = doc(db, 'lobbies_1v1', cleanRoomId);

        // onSnapshot adalah pengganti onValue/socket.on untuk memantau data secara realtime
        const unsubscribe = onSnapshot(roomDocRef, (snapshot) => {
            if (!snapshot.exists()) {
                if (viewMode === 'inside') {
                    toast.error('Lobby telah dibubarkan oleh Host!', { duration: 5000, icon: '🚪' });
                    setLobbyData(null);
                    setViewMode('menu');
                    navigate('/contest/1v1');
                }
                return;
            }

            const data = snapshot.data();

            // Deteksi game dimulai
            if (data.status === 'playing') {
                toast.success('Pertandingan Dimulai! Mengalihkan ke Arena...', { icon: '🎮' });
            }

            // Logika memicu toast penantang masuk/keluar
            if (data.challenger && !prevChallengerRef.current) {
                toast.success(`${data.challenger.name} telah memasuki lobby pertandingan, siap dimulai!`, { 
                    icon: '⚔️', 
                    duration: 5000,
                    style: {
                        border: '1px solid #2563eb',
                        padding: '16px',
                        color: '#1e3a8a',
                        fontWeight: 'bold'
                    }
                });
            } else if (!data.challenger && prevChallengerRef.current) {
                toast.error(`${prevChallengerRef.current.name} telah keluar dari lobby mabar.`, { icon: '🏃‍♂️', duration: 4000 });
            }

            setLobbyData(data);
            prevChallengerRef.current = data.challenger || null;
        });

        return () => {
            unsubscribe();
        };
    }, [lobbyId, viewMode, navigate]);

    // ==================== SYNC URL / REFRESH BROWSER (SHARE LINK) ====================
    useEffect(() => {
        const checkLinkJoin = async () => {
            if (lobbyId && currentUser && !hasRequestedStatus.current) {
                setViewMode('inside');
                const cleanCode = lobbyId.trim().toUpperCase();
                const roomDocRef = doc(db, 'lobbies_1v1', cleanCode);

                try {
                    const snapshot = await getDoc(roomDocRef);
                    if (!snapshot.exists()) {
                        toast.error('Sesi tautan mabar tidak ditemukan atau sudah hangus!');
                        setViewMode('menu');
                        navigate('/contest/1v1');
                        return;
                    }

                    const data = snapshot.data();

                    if (data.host.uid === currentUser.uid || (data.challenger && data.challenger.uid === currentUser.uid)) {
                        return; // Host atau Challenger lama menyegarkan halaman
                    } else if (!data.challenger) {
                        // Slot kosong, isi data penantang baru
                        await updateDoc(roomDocRef, {
                            challenger: {
                                uid: currentUser.uid,
                                name: currentUser.displayName || 'Penantang',
                                photoURL: currentUser.photoURL || '',
                                isReady: true
                            }
                        });
                    } else {
                        toast.error('Maaf, room duel ini sudah penuh!');
                        setViewMode('menu');
                        navigate('/contest/1v1');
                    }
                } catch (err) {
                    console.error(err);
                }
                hasRequestedStatus.current = true;
            }
        };

        if (!lobbyId) {
            setViewMode('menu');
            setLobbyData(null);
            hasRequestedStatus.current = false;
            prevChallengerRef.current = null;
        } else {
            checkLinkJoin();
        }
    }, [lobbyId, currentUser, navigate]);

    // ==================== EVENT HANDLERS FUNGSI ====================
    const handleCreateRoom = async () => {
        if (!currentUser) return toast.error('Silakan login terlebih dahulu!');
        
        const roomId = generateRoomId();
        const roomDocRef = doc(db, 'lobbies_1v1', roomId);

        const newLobbyStructure = {
            roomId: roomId,
            status: 'waiting',
            subject: selectedSubject,
            host: {
                uid: currentUser.uid,
                name: currentUser.displayName || 'Host Mabar',
                photoURL: currentUser.photoURL || '',
                isReady: true
            },
            challenger: null
        };

        try {
            await setDoc(roomDocRef, newLobbyStructure);
            toast.success('Lobby Berhasil Dibuat! 🚀');
            setViewMode('inside');
            navigate(`/contest/1v1/lobby/${roomId}`);
        } catch (error) {
            console.error(error);
            toast.error('Gagal membuat room, coba lagi.');
        }
    };

    const handleJoinRoomByCode = async () => {
        if (!inputRoomCode.trim()) return toast.error('Silakan ketik kode room dulu!');
        if (!currentUser) return toast.error('Silakan login terlebih dahulu!');

        const cleanCode = inputRoomCode.trim().toUpperCase();
        const roomDocRef = doc(db, 'lobbies_1v1', cleanCode);

        try {
            const snapshot = await getDoc(roomDocRef);
            if (!snapshot.exists()) {
                return toast.error('Kode room tidak valid atau sudah kedaluwarsa!');
            }

            const data = snapshot.data();

            if (data.challenger && data.challenger.uid !== currentUser.uid) {
                return toast.error('Maaf, slot pertandingan sudah penuh!');
            }

            if (!data.challenger) {
                await updateDoc(roomDocRef, {
                    challenger: {
                        uid: currentUser.uid,
                        name: currentUser.displayName || 'Penantang',
                        photoURL: currentUser.photoURL || '',
                        isReady: true
                    }
                });
            }

            setViewMode('inside');
            navigate(`/contest/1v1/lobby/${cleanCode}`);
        } catch (error) {
            console.error(error);
            toast.error('Gagal masuk ke room.');
        }
    };

    const handleTriggerExitRequest = () => {
        setShowExitModal(true);
    };

    const handleConfirmActualExit = async () => {
        setShowExitModal(false);
        const isCurrentUserHost = lobbyData?.host?.uid === currentUser?.uid;
        const cleanCode = lobbyId.toUpperCase();
        const roomDocRef = doc(db, 'lobbies_1v1', cleanCode);

        try {
            if (isCurrentUserHost) {
                // Jika host keluar, hapus dokumen kamar mabar dari Firestore
                await deleteDoc(roomDocRef);
            } else {
                // Jika penantang keluar, kosongkan field 'challenger'
                await updateDoc(roomDocRef, {
                    challenger: null
                });
            }
        } catch (error) {
            console.error("Gagal keluar ruangan:", error);
        }

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

    const handleStartMatchGame = async () => {
        if (!lobbyData?.challenger) {
            return toast.error('Tidak bisa memulai, tunggu lawan bergabung dulu!');
        }
        
        const cleanCode = lobbyId.toUpperCase();
        const roomDocRef = doc(db, 'lobbies_1v1', cleanCode);
        
        // Update status di Firestore menjadi 'playing' untuk trigger lawan
        await updateDoc(roomDocRef, { status: 'playing' });
    };

    const currentSubjectInfo = subjectsList.find(s => s.id === (lobbyData?.subject || selectedSubject));

    // ==================== RENDERING TAMPILAN DALAM RUANGAN (INSIDE) ====================
    if (viewMode === 'inside') {
        const isCurrentUserHost = lobbyData?.host?.uid === currentUser?.uid;

        return (
            <div className={styles.lobbyMainWrapper}>
                <div className={styles.headerTopZone}>
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
