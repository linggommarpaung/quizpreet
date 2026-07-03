// client/src/pages/QuizLobby.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../config/firebaseConfig'; 
import { doc, setDoc, updateDoc, onSnapshot, deleteDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { 
    FaArrowLeft, FaPlus, FaRightToBracket, 
    FaCopy, FaHourglassHalf, FaSpinner 
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
    const [isLoading, setIsLoading] = useState(false); 

    const hasRequestedStatus = useRef(false);
    const prevChallengerRef = useRef(null);

    const subjectsList = [
        { id: 'mtk', name: 'Matematika', icon: '📐' },
        { id: 'ipa', name: 'Sains (IPA)', icon: '🧪' },
        { id: 'ips', name: 'Ilmu Pengetahuan Sosial (IPS)', icon: '🌍' },
        { id: 'bing', name: 'Bahasa Inggris', icon: '🇬🇧' },
        { id: 'bind', name: 'Bahasa Indonesia', icon: '🇮🇩' },
        { id: 'all', name: 'Seluruh Pelajaran (Acak)', icon: '🎲' }
    ];

    // ✨ MODIFIKASI: Murni 6 karakter acak HURUF SAJA (Angka dibuang total)
    function generateRoomId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // LISTENER REAL-TIME FIREBASE
    useEffect(() => {
        if (!lobbyId) return;
        const cleanRoomId = lobbyId.trim().toUpperCase();
        const roomDocRef = doc(db, 'lobbies_1v1', cleanRoomId);

        const unsubscribe = onSnapshot(roomDocRef, (snapshot) => {
            // JIKA ROOM TIBA-TIBA DIHAPUS (Karena Host Keluar)
            if (!snapshot.exists()) {
                if (viewMode === 'inside') {
                    toast.error('Lobby telah dibubarkan oleh Host!', { duration: 4000, icon: '🚪' });
                    setLobbyData(null);
                    setViewMode('menu');
                    navigate('/contest/1v1');
                }
                return;
            }

            const data = snapshot.data();

            // Pengalihan ke arena saat match dimulai
            if (data.status === 'playing') {
                toast.success('Pertandingan Dimulai! Mengalihkan ke Arena...', { icon: '🎮' });
                navigate(`/contest/1v1/arena/${cleanRoomId}`); 
            }

            // Notifikasi gabung/keluar untuk challenger
            if (data.challenger && !prevChallengerRef.current) {
                toast.success(`${data.challenger.name} telah bergabung!`, { icon: '⚔️' });
            } else if (!data.challenger && prevChallengerRef.current) {
                toast.error(`${prevChallengerRef.current.name} keluar dari lobby.`, { icon: '🏃‍♂️' });
            }

            setLobbyData(data);
            prevChallengerRef.current = data.challenger || null;
        });

        return () => unsubscribe();
    }, [lobbyId, viewMode, navigate]);

    // LOGIKA SAAT USER MASUK LEWAT LINK MABAR / REFRESH
    useEffect(() => {
        const checkLinkJoin = async () => {
            if (lobbyId && currentUser && !hasRequestedStatus.current) {
                setViewMode('inside');
                const cleanCode = lobbyId.trim().toUpperCase();
                const roomDocRef = doc(db, 'lobbies_1v1', cleanCode);

                try {
                    const snapshot = await getDoc(roomDocRef);
                    if (!snapshot.exists()) {
                        toast.error('Tautan mabar tidak ditemukan!');
                        setViewMode('menu');
                        navigate('/contest/1v1');
                        return;
                    }

                    const data = snapshot.data();
                    if (data.host.uid === currentUser.uid) {
                        return; // Host aman, jangan timpa datanya sendiri
                    } 
                    
                    // Jika kamu adalah challenger yang masuk/kembali masuk
                    if (!data.challenger || data.challenger.uid === currentUser.uid) {
                        await updateDoc(roomDocRef, {
                            challenger: {
                                uid: currentUser.uid,
                                name: currentUser.displayName || 'Penantang',
                                photoURL: currentUser.photoURL || '',
                                score: 0,
                                isReady: true
                            }
                        });
                    } else {
                        toast.error('Room duel sudah penuh!');
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

    const handleCreateRoom = async () => {
        if (!currentUser) return toast.error('Silakan login terlebih dahulu!');
        
        setIsLoading(true);
        try {
            const roomId = generateRoomId();
            const roomDocRef = doc(db, 'lobbies_1v1', roomId);

            await setDoc(roomDocRef, {
                roomId: roomId,
                status: 'waiting',
                subject: selectedSubject,
                host: {
                    uid: currentUser.uid,
                    name: currentUser.displayName || 'Host Mabar',
                    photoURL: currentUser.photoURL || '',
                    score: 0,
                    isReady: true
                },
                challenger: null
            });
            
            setViewMode('inside');
            navigate(`/contest/1v1/lobby/${roomId}`);
        } catch (error) {
            console.error(error);
            toast.error('Gagal membuat room.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinRoomByCode = async () => {
        if (!inputRoomCode.trim()) return toast.error('Masukkan kode room!');
        
        setIsLoading(true);
        const cleanCode = inputRoomCode.trim().toUpperCase();
        
        setTimeout(() => {
            setIsLoading(false);
            navigate(`/contest/1v1/lobby/${cleanCode}`);
        }, 500);
    };

    // LOGIKA KELUAR ROOM YANG LEBIH PINTAR
    const handleConfirmActualExit = async () => {
        if (!lobbyId) return;
        setShowExitModal(false);
        
        const isCurrentUserHost = lobbyData?.host?.uid === currentUser?.uid;
        const cleanCode = lobbyId.toUpperCase();
        const roomDocRef = doc(db, 'lobbies_1v1', cleanCode);

        try {
            if (isCurrentUserHost) {
                // JIKA HOST KELUAR -> HAPUS TOTAL DARI FIREBASE
                await deleteDoc(roomDocRef);
            } else {
                // JIKA CHALLENGER KELUAR -> HAPUS SLOT CHALLENGER SAJA
                await updateDoc(roomDocRef, { challenger: null });
            }
        } catch (error) {
            console.error("Gagal keluar room:", error);
        }

        setLobbyData(null);
        setViewMode('menu');
        navigate('/contest/1v1');
    };

    // FITUR KLIK UNTUK COPY KODE + TOAST
    const handleCopyRoomLink = () => {
        if (!lobbyId) return;
        navigator.clipboard.writeText(lobbyId.toUpperCase());
        toast.success('Kode room berhasil disalin!', { icon: '📋' });
    };

    const handleStartMatchGame = async () => {
        if (!lobbyData?.challenger) return toast.error('Tunggu lawan bergabung!');
        const roomDocRef = doc(db, 'lobbies_1v1', lobbyId.toUpperCase());
        await updateDoc(roomDocRef, { status: 'playing' }); 
    };

    const currentSubjectInfo = subjectsList.find(s => s.id === (lobbyData?.subject || selectedSubject));

    // ================= VIEW: DI DALAM LOBBY =================
    if (viewMode === 'inside') {
        const isCurrentUserHost = lobbyData?.host?.uid === currentUser?.uid;
        return (
            <div className={styles.lobbyMainWrapper}>
                <div className={styles.headerCompact}>
                    <button className={styles.circularBackBtn} onClick={() => setShowExitModal(true)}>
                        <FaArrowLeft />
                    </button>
                    <h2>Ruang Tunggu 1v1</h2>
                    <div className={styles.subjectBadge}>
                        {currentSubjectInfo?.icon} {currentSubjectInfo?.name}
                    </div>
                </div>

                {/* KLIK PADA CARD INI AKAN MENYALIN KODE DAN MEMICU TOAST */}
                <div className={styles.codeCompactCard} onClick={handleCopyRoomLink}>
                    <span>KODE ROOM :</span>
                    <h2>{lobbyId?.toUpperCase()} <FaCopy className={styles.iconSmall} /></h2>
                </div>

                <div className={styles.duelCompactRow}>
                    <div className={styles.playerCompactCard}>
                        <img src={lobbyData?.host?.photoURL || '/default-avatar.png'} alt="Host" />
                        <div className={styles.playerInfo}>
                            <span className={styles.badgeRole}>HOST</span>
                            <h4>{lobbyData?.host?.name || 'Menghubungkan...'}</h4>
                        </div>
                    </div>
                    
                    <div className={styles.vsBadge}>VS</div>

                    <div className={`${styles.playerCompactCard} ${!lobbyData?.challenger ? styles.emptySlot : ''}`}>
                        {lobbyData?.challenger ? (
                            <>
                                <img src={lobbyData.challenger.photoURL || '/default-avatar.png'} alt="Challenger" />
                                <div className={styles.playerInfo}>
                                    <span className={styles.badgeRole}>LAWAN</span>
                                    <h4>{lobbyData.challenger.name}</h4>
                                </div>
                            </>
                        ) : (
                            <div className={styles.waitingSlot}>
                                <FaHourglassHalf className={styles.spinIcon} />
                                <span>Menunggu Lawan...</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.actionBottom}>
                    {isCurrentUserHost ? (
                        <button 
                            className={styles.startBtn} 
                            disabled={!lobbyData?.challenger} 
                            onClick={handleStartMatchGame}
                        >
                            MULAI PERTANDINGAN
                        </button>
                    ) : (
                        <div className={styles.waitingHost}>Menunggu Host Memulai...</div>
                    )}
                </div>

                {showExitModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modalContent}>
                            <h3>{isCurrentUserHost ? 'Bubarkan Lobby?' : 'Keluar Ruangan?'}</h3>
                            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '8px 0 16px' }}>
                                {isCurrentUserHost ? 'Lobby akan dihapus secara permanen.' : 'Kamu bisa bergabung kembali nanti.'}
                            </p>
                            <div className={styles.modalBtns}>
                                <button onClick={() => setShowExitModal(false)}>Batal</button>
                                <button onClick={handleConfirmActualExit} className={styles.dangerBtn}>Keluar</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ================= VIEW: UTAMA (MENU BUAT / GABUNG) =================
    return (
        <div className={styles.lobbyMainWrapper}>
            <div className={styles.headerCompact}>
                <button className={styles.circularBackBtn} onClick={() => navigate('/dashboard')}>
                    <FaArrowLeft />
                </button>
                <h2>Arena Duel 1 vs 1</h2>
            </div>

            <div className={styles.menuCompactGrid}>
                <div className={styles.menuCompactCard}>
                    <FaPlus className={styles.cardIcon} />
                    <h3>Buat Lobby</h3>
                    <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                        {subjectsList.map(sub => (
                            <option key={sub.id} value={sub.id}>{sub.icon} {sub.name}</option>
                        ))}
                    </select>
                    <button className={styles.primaryBtn} onClick={handleCreateRoom} disabled={isLoading}>
                        {isLoading ? <FaSpinner className={styles.loadingSpinnerBtn} /> : 'Buat Room'}
                    </button>
                </div>

                <div className={styles.menuCompactCard}>
                    <FaRightToBracket className={styles.cardIcon} />
                    <h3>Gabung Lobby</h3>
                    <input 
                        type="text" 
                        placeholder="KODE ROOM" 
                        value={inputRoomCode} 
                        // ✨ MODIFIKASI: Kunci input agar otomatis jadi huruf kapital dan buang angka/simbol secara realtime
                        onChange={(e) => setInputRoomCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} 
                        maxLength={6}
                        disabled={isLoading}
                    />
                    <button className={styles.secondaryBtn} onClick={handleJoinRoomByCode} disabled={isLoading}>
                        {isLoading ? <FaSpinner className={styles.loadingSpinnerBtn} /> : 'Gabung'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuizLobby;
