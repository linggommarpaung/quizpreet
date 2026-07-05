// client/src/components/ui/ArenaMatch.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../config/firebaseConfig';
import { 
    doc, onSnapshot, collection, updateDoc, deleteDoc, addDoc, orderBy, query 
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { 
    FaArrowLeft, FaXmark, FaPaperPlane, FaClock, FaFire, FaLock, 
    FaCommentDots, FaGlobe, FaSpinner, FaTrophy, FaShareNodes, FaHouse
} from 'react-icons/fa6';
import html2canvas from 'html2canvas';
import styles from './ArenaMatch.module.css';

const ArenaMatch = () => {
    const { roomId } = useParams();
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // Sesi Utama & Pertandingan States
    const [lobbyData, setLobbyData] = useState(null);
    const [myTeam, setMyTeam] = useState(''); // 'A' atau 'B'
    const [isCaptain, setIsCaptain] = useState(false);
    const [showImmersiveModal, setShowImmersiveModal] = useState(true);
    const [showExitModal, setShowExitModal] = useState(false);

    // Chat States 
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [chatScope, setChatScope] = useState('team'); 
    const [messages, setMessages] = useState([]);
    const chatEndRef = useRef(null);
    const modalCaptureRef = useRef(null);

    // Draggable Floating Chat Button Position State
    const [chatBtnPos, setChatBtnPos] = useState({ x: window.innerWidth - 70, y: window.innerHeight - 150 });
    const isDraggingRef = useRef(false);
    const dragOffsetRef = useRef({ x: 0, y: 0 });

    // State Internal Pilihan Jawaban Kelompok
    const [mySelectedVote, setMySelectedVote] = useState(null);
    const [isSharing, setIsSharing] = useState(false);

    // Bank Data Soal Kompetisi
    const poolQuestions = [
        {
            question: "Manakah di antara berikut ini yang merupakan struktur data Linear teratur?",
            options: ["Graph berarah", "Tree / Pohon data", "Stack / Tumpukan", "Binary Search Tree"],
            correctIndex: 2
        },
        {
            question: "Protokol manakah yang berjalan pada Transport Layer untuk pengiriman data handal?",
            options: ["UDP", "IP", "HTTP", "TCP"],
            correctIndex: 3
        },
        {
            question: "Manakah sintaks yang benar untuk membuat komponen fungsi di React?",
            options: ["function MyComponent() { return <div />; }", "component MyComponent() {}", "class MyComponent extends Function {}", "new Component()"],
            correctIndex: 0
        }
    ];

    // ==================== 🎮 1. REALTIME ENGINE LISTENERS ====================
    useEffect(() => {
        if (!roomId || !currentUser) return;

        const roomRef = doc(db, 'lobbyGroups', roomId.toUpperCase());
        const unsubscribe = onSnapshot(roomRef, (docSnap) => {
            if (!docSnap.exists()) {
                toast.error('Pertandingan dibubarkan!');
                navigate('/contest/group');
                return;
            }
            const data = docSnap.data();
            setLobbyData(data);

            if (data.matchEndedForced) return; 

            const inTeamA = data.teamA?.some(m => m.uid === currentUser.uid);
            const inTeamB = data.teamB?.some(m => m.uid === currentUser.uid);

            if (inTeamA) {
                setMyTeam('A');
                setIsCaptain(data.teamA.find(m => m.uid === currentUser.uid)?.isCaptain || false);
            } else if (inTeamB) {
                setMyTeam('B');
                setIsCaptain(data.teamB.find(m => m.uid === currentUser.uid)?.isCaptain || false);
            }

            if (data.currentQuestionIndex === undefined) {
                updateDoc(roomRef, {
                    currentQuestionIndex: 0,
                    scoreTeamA: 0,
                    scoreTeamB: 0,
                    phase: 'buzz', 
                    buzzWinner: null,
                    votes: {},
                    wrongAnswersEliminated: [],
                    currentTimerValue: 48,
                    matchEndedForced: false,
                    winnerDeclarationText: ""
                });
            }
        });

        return () => unsubscribe();
    }, [roomId, currentUser, navigate]);

    // ==================== ⏱️ 2. ENGINE COUNTDOWN MUTLAK OLEH KAPTEN AKTIF ====================
    useEffect(() => {
        if (!lobbyData || lobbyData.phase === 'buzz') return;

        const isCurrentActiveCaptain = 
            (lobbyData.phase === 'discussion' && lobbyData.buzzWinner === myTeam && isCaptain) ||
            (lobbyData.phase === 'steal' && lobbyData.buzzWinner !== myTeam && isCaptain);

        if (!isCurrentActiveCaptain) return;

        const interval = setInterval(async () => {
            const currentTime = lobbyData.currentTimerValue !== undefined ? lobbyData.currentTimerValue : 48;
            const roomRef = doc(db, 'lobbyGroups', roomId.toUpperCase());
            const qIndex = lobbyData.currentQuestionIndex || 0;

            if (currentTime > 0) {
                await updateDoc(roomRef, { currentTimerValue: currentTime - 1 });
            } else {
                clearInterval(interval);

                if (lobbyData.phase === 'discussion') {
                    const activeTeam = lobbyData.buzzWinner;
                    const scoreField = activeTeam === 'A' ? 'scoreTeamA' : 'scoreTeamB';
                    const finalScore = Math.max(0, (lobbyData[scoreField] || 0) - 50);

                    toast.error("Waktu berpikir habis! Poin dipotong & soal dilempar.");
                    await updateDoc(roomRef, {
                        [scoreField]: finalScore,
                        phase: 'steal',
                        votes: {},
                        currentTimerValue: 48
                    });
                } else if (lobbyData.phase === 'steal') {
                    const stealingTeam = lobbyData.buzzWinner === 'A' ? 'B' : 'A';
                    const scoreField = stealingTeam === 'A' ? 'scoreTeamA' : 'scoreTeamB';
                    const finalScore = Math.max(0, (lobbyData[scoreField] || 0) - 50);

                    toast.error("Waktu mencuri habis! Poin dipotong. Lanjut soal berikutnya.");
                    const nextIndex = qIndex + 1;
                    if (nextIndex >= poolQuestions.length) {
                        handleTriggerGameOverFinal(
                            stealingTeam === 'A' ? finalScore : lobbyData.scoreTeamA,
                            stealingTeam === 'B' ? finalScore : lobbyData.scoreTeamB
                        );
                    } else {
                        await updateDoc(roomRef, {
                            [scoreField]: finalScore,
                            phase: 'buzz',
                            buzzWinner: null,
                            votes: {},
                            wrongAnswersEliminated: [],
                            currentQuestionIndex: nextIndex,
                            currentTimerValue: 48
                        });
                    }
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [lobbyData?.currentTimerValue, lobbyData?.phase, isCaptain, myTeam, roomId]);

    // ==================== 💬 3. ENGINE CHAT SYNC ====================
    useEffect(() => {
        if (!roomId || !myTeam) return;

        const chatRef = collection(db, 'lobbyGroups', roomId.toUpperCase(), 'chats');
        const q = query(chatRef, orderBy('timestamp', 'asc'));

        const unsubscribeChat = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const filtered = msgs.filter(msg => 
                msg.scope === 'all' || (msg.scope === 'team' && msg.senderTeam === myTeam)
            );
            setMessages(filtered);
            if (chatEndRef.current) {
                chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        });

        return () => unsubscribeChat();
    }, [roomId, myTeam]);

    // ==================== 🖱️ 4. HANDLER DRAG TOMBOL CHAT MELAYANG ====================
    const handlePointerDown = (e) => {
        isDraggingRef.current = true;
        dragOffsetRef.current = {
            x: e.clientX - chatBtnPos.x,
            y: e.clientY - chatBtnPos.y
        };
        e.target.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if (!isDraggingRef.current) return;
        let newX = e.clientX - dragOffsetRef.current.x;
        let newY = e.clientY - dragOffsetRef.current.y;

        newX = Math.max(10, Math.min(window.innerWidth - 60, newX));
        newY = Math.max(10, Math.min(window.innerHeight - 60, newY));

        setChatBtnPos({ x: newX, y: newY });
    };

    const handlePointerUp = (e) => {
        isDraggingRef.current = false;
    };

    // ==================== 🎮 5. LOGIC MEKANIK PERTANDINGAN ====================
    const handleTriggerGameOverFinal = async (scoreA, scoreB) => {
        const roomRef = doc(db, 'lobbyGroups', roomId.toUpperCase());
        let declaration = "DRAW";
        if (scoreA > scoreB) declaration = "TIM ALFA";
        if (scoreB > scoreA) declaration = "TIM BETA";

        await updateDoc(roomRef, {
            matchEndedForced: true,
            winnerDeclarationText: declaration
        });
    };

    const handlePressBuzzer = async () => {
        if (!roomId || !lobbyData || !isCaptain || lobbyData.phase !== 'buzz') return;
        const roomRef = doc(db, 'lobbyGroups', roomId.toUpperCase());

        try {
            await updateDoc(roomRef, {
                phase: 'discussion',
                buzzWinner: myTeam,
                votes: {},
                currentTimerValue: 48
            });
            toast.success(`Tim ${myTeam === 'A' ? 'Alfa' : 'Beta'} Mengunci Soal! 🚨`);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSelectOptionVote = async (optionIdx) => {
        if (!roomId || !lobbyData || !myTeam) return;
        
        const isMyTurn = 
            (lobbyData.phase === 'discussion' && lobbyData.buzzWinner === myTeam) ||
            (lobbyData.phase === 'steal' && lobbyData.buzzWinner !== myTeam);

        if (!isMyTurn) return;
        if (lobbyData.wrongAnswersEliminated?.includes(optionIdx)) return;

        const roomRef = doc(db, 'lobbyGroups', roomId.toUpperCase());
        const updatedVotes = { ...lobbyData.votes };
        updatedVotes[currentUser.uid] = optionIdx;

        setMySelectedVote(optionIdx);
        await updateDoc(roomRef, { votes: updatedVotes });
    };

    const handleCaptainConfirmAnswer = async () => {
        if (!roomId || !lobbyData || !isCaptain) return;
        if (mySelectedVote === null || mySelectedVote === undefined) {
            toast.error("Pilih salah satu opsi terlebih dahulu!");
            return;
        }

        const roomRef = doc(db, 'lobbyGroups', roomId.toUpperCase());
        const qIndex = lobbyData.currentQuestionIndex || 0;
        const correctIdx = poolQuestions[qIndex].correctIndex;
        const isCorrect = mySelectedVote === correctIdx;
        const nextQuestionIdx = qIndex + 1;
        const isLastQuestion = nextQuestionIdx >= poolQuestions.length;

        try {
            if (lobbyData.phase === 'discussion') {
                const scoreField = myTeam === 'A' ? 'scoreTeamA' : 'scoreTeamB';
                if (isCorrect) {
                    const finalScore = (lobbyData[scoreField] || 0) + 100;
                    if (isLastQuestion) {
                        handleTriggerGameOverFinal(
                            myTeam === 'A' ? finalScore : lobbyData.scoreTeamA,
                            myTeam === 'B' ? finalScore : lobbyData.scoreTeamB
                        );
                    } else {
                        await updateDoc(roomRef, {
                            [scoreField]: finalScore,
                            phase: 'buzz',
                            buzzWinner: null,
                            votes: {},
                            wrongAnswersEliminated: [],
                            currentQuestionIndex: nextQuestionIdx,
                            currentTimerValue: 48
                        });
                        setMySelectedVote(null);
                        toast.success("JAWABAN BENAR! +100 Poin 🎉");
                    }
                } else {
                    const finalScore = Math.max(0, (lobbyData[scoreField] || 0) - 50);
                    await updateDoc(roomRef, {
                        [scoreField]: finalScore,
                        phase: 'steal',
                        votes: {},
                        wrongAnswersEliminated: [mySelectedVote],
                        currentTimerValue: 48
                    });
                    setMySelectedVote(null);
                    toast.error("JAWABAN SALAH! -50 Poin. Soal dilempar ke lawan! ⚠️");
                }
            } else if (lobbyData.phase === 'steal') {
                const scoreField = myTeam === 'A' ? 'scoreTeamA' : 'scoreTeamB';
                
                if (isCorrect) {
                    const finalScore = (lobbyData[scoreField] || 0) + 50;
                    if (isLastQuestion) {
                        handleTriggerGameOverFinal(
                            myTeam === 'A' ? finalScore : lobbyData.scoreTeamA,
                            myTeam === 'B' ? finalScore : lobbyData.scoreTeamB
                        );
                    } else {
                        await updateDoc(roomRef, {
                            [scoreField]: finalScore,
                            phase: 'buzz',
                            buzzWinner: null,
                            votes: {},
                            wrongAnswersEliminated: [],
                            currentQuestionIndex: nextQuestionIdx,
                            currentTimerValue: 48
                        });
                        setMySelectedVote(null);
                        toast.success("STEAL BERHASIL! +50 Poin ⚔️🔥");
                    }
                } else {
                    const finalScore = Math.max(0, (lobbyData[scoreField] || 0) - 50);
                    if (isLastQuestion) {
                        handleTriggerGameOverFinal(
                            myTeam === 'A' ? finalScore : lobbyData.scoreTeamA,
                            myTeam === 'B' ? finalScore : lobbyData.scoreTeamB
                        );
                    } else {
                        await updateDoc(roomRef, {
                            [scoreField]: finalScore,
                            phase: 'buzz',
                            buzzWinner: null,
                            votes: {},
                            wrongAnswersEliminated: [],
                            currentQuestionIndex: nextQuestionIdx,
                            currentTimerValue: 48
                        });
                        setMySelectedVote(null);
                        toast.error("STEAL GAGAL! -50 Poin. Lanjut soal berikutnya. 🔄");
                    }
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSendChatMessage = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || !roomId || !myTeam) return;

        try {
            const chatRef = collection(db, 'lobbyGroups', roomId.toUpperCase(), 'chats');
            await addDoc(chatRef, {
                senderUid: currentUser.uid,
                senderName: currentUser.displayName || 'Rekan',
                text: chatInput.trim(),
                scope: chatScope,
                senderTeam: myTeam,
                timestamp: Date.now()
            });
            setChatInput('');
        } catch (err) {
            console.error(err);
        }
    };

    // Pemicu Tangkapan Layar Card Menjadi PNG / JPG untuk Share
    const handleExportCardToImage = async () => {
        if (!modalCaptureRef.current || isSharing) return;
        setIsSharing(true);
        const toastId = toast.loading("Sedang merender lembar kemenangan...");

        try {
            const canvas = await html2canvas(modalCaptureRef.current, {
                backgroundColor: null,
                useCORS: true,
                scale: 2,
                logging: false
            });
            const imageUri = canvas.toDataURL("image/png");
            
            const link = document.createElement('a');
            link.download = `MATCH-${roomId.toUpperCase()}-RESULT.png`;
            link.href = imageUri;
            link.click();
            toast.success("Gambar berhasil diunduh!", { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error("Gagal mengekspor gambar arena.", { id: toastId });
        } finally {
            setIsSharing(false);
        }
    };

    const handleExecuteCustomExitLobby = async () => {
        if (!roomId || !lobbyData) return;
        const roomRef = doc(db, 'lobbyGroups', roomId.toUpperCase());
        const isHost = lobbyData.hostUid === currentUser.uid;

        try {
            if (isHost) {
                await deleteDoc(roomRef);
                toast.success("Pertandingan dibubarkan oleh Host Utama!");
                navigate('/contest/group');
            } else if (isCaptain) {
                const enemyWinText = myTeam === 'A' ? "TIM BETA" : "TIM ALFA";
                await updateDoc(roomRef, {
                    matchEndedForced: true,
                    winnerDeclarationText: enemyWinText
                });
                setShowExitModal(false);
            } else {
                toast.success("Keluar dari arena.");
                navigate('/contest/group');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleActivateImmersiveMode = () => {
        const docElm = document.documentElement;
        if (docElm.requestFullscreen) docElm.requestFullscreen().catch(() => {});
        setShowImmersiveModal(false);
    };

    // Data Mapping Helpers
    const qIndex = lobbyData?.currentQuestionIndex || 0;
    const currentQuestion = poolQuestions[qIndex] || poolQuestions[0];
    const displayTime = lobbyData?.currentTimerValue !== undefined ? lobbyData.currentTimerValue : 48;
    
    const isMyTeamTurn = 
        (lobbyData?.phase === 'discussion' && lobbyData?.buzzWinner === myTeam) ||
        (lobbyData?.phase === 'steal' && lobbyData?.buzzWinner !== myTeam);

    const isEnemyTeamTurn = 
        (lobbyData?.phase === 'discussion' && lobbyData?.buzzWinner !== myTeam) ||
        (lobbyData?.phase === 'steal' && lobbyData?.buzzWinner === myTeam);

    return (
        <div className={styles.arenaContainer}>
            {/* 🔴 ACTION SCOREBOARD */}
            <div className={styles.headerScoreboard}>
                <button className={styles.backBtn} onClick={() => setShowExitModal(true)}>
                    <FaArrowLeft />
                </button>

                <div className={styles.globalScoreLayoutFlex}>
                    <div className={`${styles.teamScoreBox} ${myTeam === 'A' ? styles.myOwnTeamBorder : ''}`}>
                        <span className={styles.teamTitle} style={{ color: '#2563eb' }}>ALFA</span>
                        <h2 className={styles.scoreText}>{lobbyData?.scoreTeamA || 0}</h2>
                    </div>

                    <div className={styles.versusMidTimingZone}>
                        <div className={`${styles.timerBadgeContainer} ${lobbyData?.phase !== 'buzz' ? styles.timerPulseActive : ''}`}>
                            <FaClock /> <span>{displayTime}s</span>
                        </div>
                        <div className={styles.vsDividerText}>VS</div>
                    </div>

                    <div className={`${styles.teamScoreBox} ${myTeam === 'B' ? styles.myOwnTeamBorder : ''}`}>
                        <span className={styles.teamTitle} style={{ color: '#ef4444' }}>BETA</span>
                        <h2 className={styles.scoreText}>{lobbyData?.scoreTeamB || 0}</h2>
                    </div>
                </div>

                <div style={{ width: 38 }} />
            </div>

            {/* 🟡 ARENA INTERAKTIF UTAMA (DIV SOAL & PILIHAN TERPISAH DENGAN ANIMASI LEMBARAN) */}
            <div className={styles.mainInteractiveSplitArea}>
                <div className={styles.gamePlayZoneContainer}>
                    
                    {/* 📄 DIV SOAL MANDIRI (Efek Animasi Lembaran Masuk) */}
                    <div key={`q-card-${qIndex}`} className={styles.isolatedQuestionSurfacePanel}>
                        <div className={styles.questionHeaderBadgeRow}>
                            <span className={styles.questionIndexLabel}>SOAL SELEKSI {qIndex + 1} / {poolQuestions.length}</span>
                            {isCaptain && <span className={styles.captainCrownBadge}><FaFire /> KAPTEN JAWAB</span>}
                        </div>
                        <h2 className={styles.actualQuestionText}>{currentQuestion?.question}</h2>
                    </div>

                    {/* 🗂️ DIV PILIHAN JAWABAN & MEKANIK TOMBOL JAWAB */}
                    <div className={styles.isolatedOptionsPanelSurface}>
                        {/* FASE 1: REBUTAN TOMBOL BUZZER */}
                        {lobbyData?.phase === 'buzz' && (
                            <div className={styles.buzzInFaseZone}>
                                <div className={styles.blurredOptionsMock}>
                                    <div className={styles.blurBar}>Pilihan jawaban disembunyikan. Klik Buzzer!</div>
                                </div>
                                
                                {isCaptain ? (
                                    <div className={styles.buzzer3DWrapper}>
                                        <button className={styles.buzzerPhysicalCircularRed} onClick={handlePressBuzzer}>
                                            <span className={styles.buzzerInnerCore} />
                                        </button>
                                        <label className={styles.buzzerPressLabelText}>TAP BUZZER REBUTAN!</label>
                                    </div>
                                ) : (
                                    <div className={styles.waitingCaptainBuzzNotification}>
                                        <FaSpinner className={styles.spinningIconElement} />
                                        <span>Menunggu Kapten Regu menekan buzzer...</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* FASE 2 & 4: TIM KITA BERPIKIR / STEAL */}
                        {isMyTeamTurn && (
                            <div className={styles.optionsVerticalGridSystem}>
                                {currentQuestion?.options.map((option, idx) => {
                                    const isEliminated = lobbyData?.wrongAnswersEliminated?.includes(idx);
                                    const votersForThisOption = [];
                                    
                                    if (lobbyData?.votes) {
                                        const currentTeamList = myTeam === 'A' ? lobbyData.teamA : lobbyData.teamB;
                                        Object.entries(lobbyData.votes).forEach(([uid, votedIdx]) => {
                                            if (votedIdx === idx) {
                                                const uName = currentTeamList?.find(m => m.uid === uid)?.name || "Rekan";
                                                votersForThisOption.push(uName);
                                            }
                                        });
                                    }

                                    return (
                                        <button 
                                            key={idx} 
                                            className={`${styles.optionInteractiveRowBtn} ${mySelectedVote === idx ? styles.optionSelectedLocal : ''} ${isEliminated ? styles.optionEliminatedGrey : ''}`}
                                            onClick={() => !isEliminated && handleSelectOptionVote(idx)}
                                            disabled={isEliminated}
                                        >
                                            <div className={styles.optionIndicatorLetter}>
                                                {String.fromCharCode(65 + idx)}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <span className={styles.optionContentText}>{option}</span>
                                                {votersForThisOption.length > 0 && (
                                                    <div className={styles.votersRowBadges}>
                                                        {votersForThisOption.map((name, nIdx) => (
                                                            <span key={nIdx} className={styles.voterNameTag}>👥 {name}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}

                                {isCaptain && (
                                    <button className={styles.captainLockFinalAnswerBtn} onClick={handleCaptainConfirmAnswer}>
                                        ✨ Kunci Jawaban Akhir ({displayTime}s)
                                    </button>
                                )}
                            </div>
                        )}

                        {/* FASE ANIMASI MENUNGGU TIM LAWAN */}
                        {isEnemyTeamTurn && (
                            <div className={styles.enemyTurnCardWaiting}>
                                <div className={styles.shimmeringWaveSphere}>
                                    <div className={styles.waveCoreInside} />
                                </div>
                                <h3>Tim Lawan Sedang Berpikir</h3>
                                <p className={styles.waitingSubtext}>
                                    Sisa waktu mereka: <strong>{displayTime} Detik</strong>. Siapkan strategi jawaban tim kamu jika mereka salah!
                                </p>
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* 💬 TOMBOL CHAT NGAMBANG DRAGGABLE */}
            <button 
                className={styles.draggableFloatingChatBtn}
                style={{ left: chatBtnPos.x, top: chatBtnPos.y }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onClick={() => !isDraggingRef.current && setIsChatOpen(true)}
            >
                <FaCommentDots />
            </button>

            {/* 💬 SLIDE DRAWER OVERLAY CHAT (Layout Flex Anti-Tenggelam Keyboard) */}
            <div className={`${styles.floatingChatOverlayDrawer} ${isChatOpen ? styles.chatDrawerOpen : ''}`}>
                <div className={styles.sidePanelChatComponent}>
                    <div className={styles.panelChatHeader}>
                        <div>
                            <h3>Obrolan Arena</h3>
                            <span className={styles.secretSecurityHint}>
                                {chatScope === 'team' ? <FaLock /> : <FaGlobe />} Saringan Komunikasi
                            </span>
                        </div>
                        <button className={styles.closeChatComponentBtn} onClick={() => setIsChatOpen(false)}>
                            <FaXmark />
                        </button>
                    </div>

                    <div className={styles.chatMessagesListContainer}>
                        {messages.map((msg) => (
                            <div 
                                key={msg.id} 
                                className={`${styles.msgBubbleRow} ${msg.senderUid === currentUser?.uid ? styles.bubbleSent : styles.bubbleReceived} ${msg.scope === 'all' ? styles.bubbleScopeAll : ''}`}
                            >
                                <span className={styles.msgNameTitleLabel}>
                                    {msg.senderName} ({msg.scope === 'all' ? 'SEMUA' : `TIM ${msg.senderTeam}`})
                                </span>
                                <div className={styles.msgBodyText}>{msg.text}</div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    <form className={styles.chatInputFlexForm} onSubmit={handleSendChatMessage}>
                        <select 
                            className={styles.scopeSelectorDropdown}
                            value={chatScope}
                            onChange={(e) => setChatScope(e.target.value)}
                        >
                            <option value="team">Team</option>
                            <option value="all">Semua</option>
                        </select>
                        
                        <input 
                            type="text" 
                            className={styles.chatTextInputField}
                            placeholder="Ketik pesan..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                        />
                        <button type="submit" className={styles.chatSendActionBtn}>
                            <FaPaperPlane />
                        </button>
                    </form>
                </div>
                <div className={styles.chatClickableBackdropRight} onClick={() => setIsChatOpen(false)} />
            </div>

            {/* MODAL KELUAR */}
            {showExitModal && (
                <div className={styles.immersiveModalOverlay}>
                    <div className={styles.customConfirmCard}>
                        <div className={styles.warningIconHeader}>⚠️</div>
                        <h3>Konfirmasi Keluar</h3>
                        <p>Apakah kamu yakin ingin meninggalkan arena pertandingan?</p>
                        <div className={styles.confirmModalActionButtonsFlex}>
                            <button className={styles.cancelExitModalBtn} onClick={() => setShowExitModal(false)}>Batal</button>
                            <button className={styles.executeExitModalBtn} onClick={handleExecuteCustomExitLobby}>Keluar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🏆 MODAL GAME OVER INTERAKTIF EPSOR IMAGE (Sesuai Gaya Desain Screenshot) */}
            {lobbyData?.matchEndedForced && (
                <div className={styles.immersiveModalOverlay} style={{ flexDirection: 'column', gap: '20px' }}>
                    
                    {/* 🎴 CARD UTAMA YANG AKAN DI-EXPORT MENJADI JPG/PNG */}
                    <div ref={modalCaptureRef} className={styles.vsStyleScorePodiumCard}>
                        <div className={styles.badgeTopMatchResult}>MATCH COMPLETED</div>
                        
                        <div className={styles.versusRowShowdownDisplay}>
                            <div className={`${styles.teamIdentityShowdownBlock} ${lobbyData?.winnerDeclarationText === 'TIM ALFA' ? styles.isUltimateWinnerglow : ''}`}>
                                <div className={styles.showdownAvatarCircle}>A</div>
                                <h4>TIM ALFA</h4>
                                <h1>{lobbyData?.scoreTeamA}</h1>
                            </div>

                            <div className={styles.centerVsCrossBadgeText}>VS</div>

                            <div className={`${styles.teamIdentityShowdownBlock} ${lobbyData?.winnerDeclarationText === 'TIM BETA' ? styles.isUltimateWinnerglow : ''}`}>
                                <div className={styles.showdownAvatarCircle} style={{ background: '#ef4444' }}>B</div>
                                <h4>TIM BETA</h4>
                                <h1>{lobbyData?.scoreTeamB}</h1>
                            </div>
                        </div>

                        <div className={styles.victoryCrownAnnounceStrip}>
                            {lobbyData?.winnerDeclarationText === 'DRAW' ? (
                                <span className={styles.drawStatusStripText}>PERTANDINGAN BERAKHIR SERI 🤝</span>
                            ) : (
                                <span>KEMENANGAN MUTLAK: <strong>{lobbyData?.winnerDeclarationText}</strong> 🏆</span>
                            )}
                        </div>
                    </div>

                    {/* 🛠️ TOMBOL KONTROL DI LUAR CARD KEMENANGAN */}
                    <div className={styles.actionButtonsOutsideContainer}>
                        <button className={styles.btnShareResultImage} onClick={handleExportCardToImage} disabled={isSharing}>
                            <FaShareNodes /> {isSharing ? 'Mengekspor...' : 'Simpan / Share Hasil'}
                        </button>
                        <button className={styles.btnReturnToDashboardGroup} onClick={() => navigate('/contest/group')}>
                            <FaHouse /> Kembali ke Dashboard
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL IMMERSIVE AWAL */}
            {showImmersiveModal && (
                <div className={styles.immersiveModalOverlay}>
                    <div className={styles.immersiveModalCard}>
                        <div className={styles.immersiveIconAnim}>🎮</div>
                        <h3 className={styles.immersiveTitle}>Sinkronisasi Arena Kuis</h3>
                        <p className={styles.immersiveDesc}>Ketuk tombol di bawah untuk masuk ke mode layar penuh.</p>
                        <div className={styles.immersiveActionRow}>
                            <button className={styles.immersivePhysicalCircularBtn} onClick={handleActivateImmersiveMode}>
                                MASUK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ArenaMatch;
