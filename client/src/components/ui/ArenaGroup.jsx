// client/src/components/ui/ArenaGroup.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../config/firebaseConfig';
import { 
    doc, onSnapshot, collection, getDocs, query, where, 
    updateDoc, deleteDoc, addDoc, serverTimestamp, orderBy 
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { 
    FaArrowLeft, FaBookOpen, FaSpinner, 
    FaCommentDots, FaXmark, FaPaperPlane, FaExpand, FaCompress,
    FaChevronLeft, FaChevronRight, FaRotateLeft
} from 'react-icons/fa6';
import { Document, Page } from 'react-pdf';
import styles from './ArenaGroup.module.css';

import { pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

const ArenaGroup = () => {
    const { roomId } = useParams();
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // Data Sesi States
    const [lobbyData, setLobbyData] = useState(null);
    const [chaptersList, setChaptersList] = useState([]);
    const [loadingChapters, setLoadingChapters] = useState(true);
    const [currentChapter, setCurrentChapter] = useState(null);

    // Floating Chat States
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // LOGIKA TOMBOL CHAT BISA DIGESER (DRAGGABLE HP & LAPTOP)
    const [chatBtnPos, setChatBtnPos] = useState({ x: window.innerWidth - 70, y: window.innerHeight - 130 });
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0 });

    // Custom Modal State
    const [showExitModal, setShowExitModal] = useState(false);
    const [showImmersiveModal, setShowImmersiveModal] = useState(false); 


    // PDF Pages Control States
    const [pdfPage, setPdfPage] = useState(1);
    const [numPages, setNumPages] = useState(null);

    // State Zoom Cubit (Pinch to Zoom)
    const [scale, setScale] = useState(1);
    const touchStartDistRef = useRef(0);
    const startScaleRef = useRef(1);

    // Fullscreen Monitor State
    const [isFullscreen, setIsFullscreen] = useState(false);

    const isFirstLoad = useRef(true);
    const chatEndRef = useRef(null);

    const resetZoom = () => setScale(1);

    // Navigasi Halaman PDF
    const handleOriginalPrevPage = () => {
        if (pdfPage > 1) {
            setPdfPage(pdfPage - 1);
            resetZoom();
        }
    };

    const handleOriginalNextPage = () => {
        if (pdfPage < numPages) {
            setPdfPage(pdfPage + 1);
            resetZoom();
        }
    };

    // LOGIKA PINCH TO ZOOM (CUBIT LAYAR HP)
    const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            touchStartDistRef.current = dist;
            startScaleRef.current = scale;
        }
    };

        const handleTouchMove = (e) => {
        if (e.touches.length === 2 && touchStartDistRef.current > 0) {
            e.preventDefault(); // Cegah scroll layar HANYA saat mencubit/zoom
            const currentDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const factor = currentDist / touchStartDistRef.current;
            const newScale = Math.min(Math.max(startScaleRef.current * factor, 1), 3.5); // Minimal scale set ke 1 agar pas di layar
            setScale(newScale);
        }
    };


    const handleTouchEnd = (e) => {
        if (e.touches.length < 2) {
            touchStartDistRef.current = 0;
        }
    };

    // --- LOGIKA UTAMA DRAG & DROP UNTUK HP (TOUCH) & LAPTOP (MOUSE) ---
    
    // Fungsi pembantu saat mulai drag
    const startDrag = (clientX, clientY) => {
        isDraggingRef.current = false; 
        dragStartRef.current = {
            x: clientX - chatBtnPos.x,
            y: clientY - chatBtnPos.y
        };
    };

    // Fungsi pembantu saat proses pergeseran
    const moveDrag = (clientX, clientY) => {
        isDraggingRef.current = true;
        const newX = Math.min(Math.max(10, clientX - dragStartRef.current.x), window.innerWidth - 60);
        const newY = Math.min(Math.max(10, clientY - dragStartRef.current.y), window.innerHeight - 60);
        setChatBtnPos({ x: newX, y: newY });
    };

    // Fungsi pembantu saat selesai drag
    const endDrag = () => {
    if (!isDraggingRef.current) {
        setIsChatOpen(true); // Jika tidak digeser (hanya diklik), buka chat
        setUnreadCount(0);   // LANGSUNG HAPUS NOTIFIKASI MERAH SAAT DIKLIK
    }
    isDraggingRef.current = false;
};

    // Handler khusus Event Sentuh (HP)
    const handleChatBtnTouchStart = (e) => startDrag(e.touches[0].clientX, e.touches[0].clientY);
    const handleChatBtnTouchMove = (e) => moveDrag(e.touches[0].clientX, e.touches[0].clientY);
    const handleChatBtnTouchEnd = () => endDrag();

    // Handler khusus Event Mouse (Laptop/PC)
    const handleChatBtnMouseDown = (e) => {
        e.preventDefault(); // Cegah text selection saat tombol diseret mouse
        startDrag(e.clientX, e.clientY);

        const handleMouseMove = (moveEvent) => {
            moveDrag(moveEvent.clientX, moveEvent.clientY);
        };

        const handleMouseUp = () => {
            endDrag();
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    // Fullscreen API Logic
    const toggleFullscreen = () => {
        const elem = document.documentElement;
        if (!document.fullscreenElement) {
            if (elem.requestFullscreen) elem.requestFullscreen().catch(err => console.log(err));
            else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
            else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            else if (document.msExitFullscreen) document.msExitFullscreen();
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('msfullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('msfullscreenchange', handleFullscreenChange);
        };
    }, []);

    // Kalibrasi ulang posisi tombol chat saat ukuran layar berubah
    useEffect(() => {
        const handleResize = () => {
            setChatBtnPos({ x: window.innerWidth - 70, y: window.innerHeight - 130 });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    useEffect(() => {
    // Cek apakah browser saat ini sudah dalam mode fullscreen atau belum
    const isAlreadyFullscreen = !!document.fullscreenElement;

    if (!isAlreadyFullscreen) {
        const timer = setTimeout(() => {
            setShowImmersiveModal(true);
        }, 500);
        return () => clearTimeout(timer);
    }
}, []);

    // 1. DENGAR ROOM REALTIME
    useEffect(() => {
        if (!roomId) return;
        const cleanId = roomId.trim().toUpperCase();
        const roomRef = doc(db, 'lobbyGroups', cleanId);

        const unsubscribe = onSnapshot(roomRef, (snapshot) => {
            if (!snapshot.exists()) {
                toast.error('Ruangan belajar telah dibubarkan oleh Host! 👥❌');
                navigate('/contest/group');
                return;
            }
            setLobbyData(snapshot.data());
        });

        return () => unsubscribe();
    }, [roomId, navigate]);

    // 2. QUERY DAFTAR SILABUS
    useEffect(() => {
        if (!lobbyData) return;

        const fetchChaptersData = async () => {
            try {
                const chaptersRef = collection(db, 'chapters');
                const q = query(chaptersRef, where('subjectId', '==', lobbyData.subject));
                const querySnapshot = await getDocs(q);
                
                let loadedChapters = [];
                querySnapshot.forEach((docSnap) => {
                    loadedChapters.push({ uid: docSnap.id, ...docSnap.data() });
                });

                loadedChapters.sort((a, b) => (a.order || 0) - (b.order || 0));
                setChaptersList(loadedChapters);
                setLoadingChapters(false);

                if (lobbyData.currentChapterId) {
                    const activeCh = loadedChapters.find(ch => ch.uid === lobbyData.currentChapterId);
                    if (activeCh) {
                        setCurrentChapter(activeCh);
                        if (isFirstLoad.current || currentChapter?.uid !== activeCh.uid) {
                            setPdfPage(1);
                            setNumPages(null);
                            resetZoom();
                            isFirstLoad.current = false;
                        }
                    }
                }
            } catch (err) {
                console.error("Gagal menarik data bab: ", err);
                setLoadingChapters(false);
            }
        };

        fetchChaptersData();
    }, [lobbyData, lobbyData?.currentChapterId]);

    // 3. LISTEN REALTIME CHAT SUB-COLLECTION (FIX NOTIFIKASI MUNCUL LAGI)
useEffect(() => {
    if (!roomId) return;
    const cleanId = roomId.trim().toUpperCase();

    // 🛠️ 1. JALUR BARU: Mengarah langsung ke sub-koleksi chats milik room utama agar sinkron
    const chatRef = collection(db, 'lobbyGroups', cleanId, 'chats');
    const q = query(chatRef, orderBy('timestamp', 'asc'));

    // 🔒 2. FITUR NOTIFIKASI: Catat waktu saat komponen ini pertama kali dimuat
    const componentLoadTime = Date.now();

    const unsubscribe = onSnapshot(q, (snapshot) => {
        // Ambil data seluruh pesan secara realtime
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 🔒 3. FITUR NOTIFIKASI: Deteksi jika ada pesan baru masuk saat panel chat tertutup
        if (snapshot.docChanges().length > 0) {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const newMsg = change.doc.data();
                    
                    // Ambil waktu kirim pesan (jika timestamp biasa gunakan fallback Date.now)
                    const msgTime = newMsg.timestamp?.toMillis 
                        ? newMsg.timestamp.toMillis() 
                        : (newMsg.timestamp || Date.now());

                    // HANYA tambah angka notifikasi jika:
                    // - Pengirimnya BUKAN kita sendiri
                    // - Panel chat sedang tertutup (!isChatOpen)
                    // - Pesan masuk SETELAH halaman ini terbuka (msgTime > componentLoadTime)
                    if (newMsg.senderUid !== currentUser?.uid && !isChatOpen && msgTime > componentLoadTime) {
                        setUnreadCount(prev => prev + 1);
                    }
                }
            });
        }

        // Set state pesan untuk dirender ke UI
        setMessages(msgs);
        
        // Auto scroll ke bawah saat ada chat baru
        setTimeout(() => {
            if (chatEndRef.current) {
                chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        }, 100);
    }, (error) => {
        console.error("Gagal memuat obrolan: ", error);
    });

    return () => unsubscribe();
}, [roomId, isChatOpen, currentUser]);


    // 4. RESET NOTIFIKASI SINKRON SAAT PANEL CHAT DIBUKA
    useEffect(() => {
    if (isChatOpen) {
        setUnreadCount(0);
    }
}, [isChatOpen, messages]);

    const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !roomId) return;

    try {
        const chatRef = collection(db, 'lobbyGroups', roomId.toUpperCase(), 'chats');
        await addDoc(chatRef, {
            senderUid: currentUser.uid,
            senderName: currentUser.displayName || 'Rekan',
            text: chatInput.trim(),
            scope: 'all', // 🌟 Tetapkan 'all' agar terbaca sebagai chat global di mode belajar
            timestamp: Date.now()
        });
        setChatInput('');
    } catch (err) {
        console.error(err);
    }
};


    const handleConfirmExit = async () => {
        if (!roomId || !lobbyData || !currentUser) return;
        const cleanId = roomId.trim().toUpperCase();
        const roomRef = doc(db, 'lobbyGroups', cleanId);
        const isStudyMode = lobbyData.gameMode === 'study';
        const isHost = isStudyMode 
            ? lobbyData.members[0]?.uid === currentUser.uid
            : lobbyData.teamA[0]?.uid === currentUser.uid;

        try {
            if (isHost) {
                await deleteDoc(roomRef);
                toast.success('Room berhasil dibubarkan oleh Host.');
            } else {
                if (isStudyMode) {
                    const filtered = lobbyData.members.filter(m => m.uid !== currentUser.uid);
                    await updateDoc(roomRef, { members: filtered });
                } else {
                    const filteredA = lobbyData.teamA.filter(m => m.uid !== currentUser.uid);
                    const filteredB = lobbyData.teamB.filter(m => m.uid !== currentUser.uid);
                    await updateDoc(roomRef, { teamA: filteredA, teamB: filteredB });
                }
                toast.success('Kamu berhasil keluar dari Arena.');
            }
            setShowExitModal(false);
            navigate('/contest/group');
        } catch (err) {
            console.error(err);
        }
    };
    const handleActivateImmersive = () => {
    setShowImmersiveModal(false);
    toggleFullscreen(); // Langsung memicu fungsi fullscreen yang sudah kamu miliki
};


    const isStudyMode = lobbyData?.gameMode === 'study';
    const isHost = isStudyMode 
        ? lobbyData?.members[0]?.uid === currentUser?.uid
        : lobbyData?.teamA[0]?.uid === currentUser?.uid;

    return (
        <div className={styles.arenaContainer}>
            {/* HEADER AREA */}
            <div className={styles.headerArea}>
                <div className={styles.headerLeft}>
                    <button className={styles.circularBackBtn} onClick={() => setShowExitModal(true)}>
                        <FaArrowLeft />
                    </button>
                    <h2>Arena Belajar</h2>
                    <span className={styles.roomBadge}>KODE: {roomId?.toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2563eb' }}>
                        {isHost ? '👑 HOST' : '👥 ANGGOTA'}
                    </div>
                    <button 
                        onClick={toggleFullscreen} 
                        style={{
                            background: '#e2e8f0', border: 'none', padding: '4px 8px', 
                            borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                            fontSize: '0.68rem', fontWeight: 600, color: '#334155'
                        }}
                    >
                        {isFullscreen ? <><FaCompress /> Normal</> : <><FaExpand /> Penuh</>}
                    </button>
                </div>
            </div>

            {/* TAB SILABUS BAR */}
            <div className={styles.horizontalNavbar}>
                {loadingChapters ? (
                    <span style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                        <FaSpinner className={styles.spinningIcon} /> Sinkronisasi...
                    </span>
                ) : (
                    chaptersList.map((ch) => (
                        <button
                            key={ch.uid}
                            className={`${styles.chapterTabBtn} ${currentChapter?.uid === ch.uid ? styles.chapterActive : ''}`}
                            onClick={() => isHost && updateDoc(doc(db, 'lobbyGroups', roomId.toUpperCase()), { currentChapterId: ch.uid })}
                            disabled={!isHost}
                        >
                            {ch.title || `Bab ${ch.order}`}
                        </button>
                    ))
                )}
            </div>

            {/* CARD BINGKAI UTAMA VIEWPORT PDF */}
            <div className={styles.mainReaderCard}>
                {currentChapter ? (
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
                        
                        {/* HEADER STATUS MINIMALIS */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '6px', borderBottom: '1px solid #e2e8f0' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                                Hal. {pdfPage} / {numPages || '?'}
                            </span>
                            {scale !== 1 && (
                                <button onClick={resetZoom} style={{ background: '#f1f5f9', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', fontWeight: 600, color: '#475569' }}>
                                    <FaRotateLeft /> Reset ({Math.round(scale * 100)}%)
                                </button>
                            )}
                            <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontStyle: 'italic' }}>*Cubit layar HP untuk zoom</span>
                        </div>

               {/* CONTAINER PDF UTAMA DENGAN SCROLL INDEPENDEN SAAT ZOOM */}
                        <div 
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            style={{ 
                                flex: 1, 
                                overflow: 'auto', // Tetap izinkan scroll otomatis
                                background: '#cbd5e1', 
                                display: scale > 1 ? 'block' : 'flex', // Jika di-zoom gunakan block agar scrollbar bekerja akurat
                                justifyContent: 'center', 
                                alignItems: 'flex-start', 
                                padding: '8px', 
                                borderRadius: '8px', 
                                marginTop: '6px',
                                touchAction: scale > 1 ? 'auto' : 'pan-y' // Izinkan gesture geser jika sedang di-zoom
                            }}
                        >
                            <div style={{ 
                                transform: `scale(${scale})`, 
                                transformOrigin: 'top left', // Ubah ke top left agar browser tahu batas scroll kanan-bawah dokumen
                                width: scale > 1 ? `${100 / scale}%` : '100%', // Kalkulasi ulang lebar agar tidak memotong area dokumen
                                transition: touchStartDistRef.current === 0 ? 'transform 0.1s ease-out' : 'none',
                                display: 'inline-block'
                            }}>
                                <Document
                                    file={currentChapter.pdfUrl}
                                    onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                                    loading={<div style={{ padding: '20px', fontSize: '0.75rem', color: '#64748b' }}>Mengunduh dokumen materi...</div>}
                                >
                                    <Page 
                                        pageNumber={pdfPage} 
                                        width={Math.min(window.innerWidth - 40, 600)}
                                        renderAnnotationLayer={false}
                                        renderTextLayer={true}
                                    />
                                </Document>
                            </div>
                        </div>


                        {/* UTILITY ACTION DI BAWAH (MINIMALIS MOBILE) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px' }}>
                            <button 
                                onClick={handleOriginalPrevPage} 
                                disabled={pdfPage <= 1}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: pdfPage <= 1 ? '#cbd5e1' : '#2563eb', color: pdfPage <= 1 ? '#94a3b8' : 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: pdfPage <= 1 ? 'not-allowed' : 'pointer' }}
                            >
                                <FaChevronLeft /> Prev
                            </button>

                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Bersama Tim</span>

                            <button 
                                onClick={handleOriginalNextPage} 
                                disabled={pdfPage >= numPages}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: pdfPage >= numPages ? '#cbd5e1' : '#2563eb', color: pdfPage >= numPages ? '#94a3b8' : 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: pdfPage >= numPages ? 'not-allowed' : 'pointer' }}
                            >
                                Next <FaChevronRight />
                            </button>
                        </div>

                    </div>
                ) : (
                    <div className={styles.emptyStateContainer}>
                        <FaBookOpen style={{ fontSize: '1.5rem', color: '#cbd5e1' }} />
                        <p style={{ fontSize: '0.75rem' }}>Menunggu host mensinkronisasikan bab materi...</p>
                    </div>
                )}
            </div>

            {/* FLOATING BUBBLE CHAT DRAGGABLE (MENDUKUNG HP & LAPTOP MOUSE) */}
            <div 
                className={styles.floatingChatBubble}
                style={{
                    position: 'fixed',
                    left: `${chatBtnPos.x}px`,
                    top: `${chatBtnPos.y}px`,
                    bottom: 'auto',
                    right: 'auto',
                    touchAction: 'none',
                    cursor: 'grab'
                }}
                onTouchStart={handleChatBtnTouchStart}
                onTouchMove={handleChatBtnTouchMove}
                onTouchEnd={handleChatBtnTouchEnd}
                onMouseDown={handleChatBtnMouseDown}
            >
                <FaCommentDots />
                {unreadCount > 0 && <span className={styles.redBadgeNotification}>{unreadCount}</span>}
            </div>

            {/* SLIDE-IN CHAT PANEL (MUNCUL DARI KIRI KE KANAN) */}
            {isChatOpen && (
                <div className={styles.chatOverlay} onClick={() => setIsChatOpen(false)}>
                    <div className={styles.chatSidePanel} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.chatHeader}>
                            <h3>💬 Obrolan Regu</h3>
                            <button className={styles.closeChatBtn} onClick={() => setIsChatOpen(false)}>
                                <FaXmark />
                            </button>
                        </div>

                        <div className={styles.chatMessagesContainer}>
                            {messages.map((msg) => (
                                <div 
                                    key={msg.id} 
                                    className={`${styles.messageBubble} ${msg.senderUid === currentUser?.uid ? styles.msgSent : styles.msgReceived}`}
                                >
                                    {msg.senderUid !== currentUser?.uid && (
                                        <span className={styles.senderName}>{msg.senderName}</span>
                                    )}
                                    <div>{msg.text}</div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        <form className={styles.chatInputForm} onSubmit={handleSendChatMessage}>
                            <input 
                                className={styles.chatInput}
                                type="text" 
                                placeholder="Ketik pesan..." 
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                            />
                            <button type="submit" className={styles.sendMsgBtn}>
                                <FaPaperPlane style={{ fontSize: '0.75rem' }} />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL EXIT CONFIRMATION */}
            {showExitModal && (
                <div className={styles.customModalOverlay} onClick={() => setShowExitModal(false)}>
                    <div className={styles.customModalCard} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>Konfirmasi Keluar</h3>
                        <p className={styles.modalDesc}>
                            {isHost 
                                ? 'Kamu adalah Host. Jika kamu keluar, room akan dihapus sepenuhnya!' 
                                : 'Apakah kamu yakin ingin meninggalkan arena kelompok belajar ini?'}
                        </p>
                        <div className={styles.modalActionRow}>
                            <button className={styles.modalCancelBtn} onClick={() => setShowExitModal(false)}>Batal</button>
                            <button className={styles.modalConfirmBtn} onClick={handleConfirmExit}>Keluar</button>
                        </div>
                    </div>
                </div>
            )}
          {/* MODAL IMMERSIVE MODE PRESENTATION (SINGLE ACTION) */}
            {showImmersiveModal && (
                <div className={styles.immersiveModalOverlay}>
                    <div className={styles.immersiveModalCard}>
                        <div className={styles.immersiveIconAnim}>🚀</div>
                        <h3 className={styles.immersiveTitle}>Sinkronisasi Layar Arena</h3>
                        <p className={styles.immersiveDesc}>
                            Ketuk tombol di bawah untuk menyelaraskan resolusi layar imersif dan mulai membaca materi kompetensi bersama regu tim kamu.
                        </p>
                        <div className={styles.immersiveActionRow}>
                            <button 
                                className={styles.immersivePrimaryBtn} 
                                onClick={handleActivateImmersive}
                                style={{ width: '100%', flex: 'none' }} // Buat tombol memenuhi lebar modal
                            >
                                Masuk Arena Belajar ✨
                            </button>
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
};

export default ArenaGroup;
