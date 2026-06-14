import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { 
    FaArrowLeft, FaUsers, FaPlus, FaRightToBracket, FaCopy, 
    FaCheck, FaHourglassHalf, FaBookOpen, FaShieldHalved, FaShuffle, 
    FaGear, FaArrowRightArrowLeft, FaRightFromBracket,
    FaMicrophone, FaMicrophoneSlash, FaVolumeHigh, FaVolumeXmark,
    FaSpinner, FaXmark 
} from 'react-icons/fa6';
import styles from './LobbyGroupPage.module.css';

import { db } from '../config/firebaseConfig'; 
import { 
    doc, setDoc, getDoc, updateDoc, onSnapshot, deleteDoc, arrayUnion, collection 
} from 'firebase/firestore';

// 🌐 MENGIKUTI LEADERBOARD: Mendukung efek border avatar toko secara realtime
import '../components/border.css'; 

const LobbyGroupPage = () => {
    const { currentUser, getLeaderboardData } = useAuth();
    const { roomId } = useParams(); 
    const navigate = useNavigate();

    // State Alur Aliran Layar & Form
    const [viewMode, setViewMode] = useState(roomId ? 'inside' : 'menu'); 
    const [inputRoomCode, setInputRoomCode] = useState('');
    const [showExitModal, setShowExitModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // 🌟 SEPERTI LEADERBOARD: State untuk menampung data preview avatar yang sedang diklik
    const [selectedAvatar, setSelectedAvatar] = useState(null);

    // State Pembuat Sesi
    const [selectedSubject, setSelectedSubject] = useState('mtk');
    const [maxMembers, setMaxMembers] = useState(5);
    const [gameMode, setGameMode] = useState('study'); 
    const [matchType, setMatchType] = useState('custom'); 

    // State Realtime Data & Voice Chat Controls
    const [lobbyData, setLobbyData] = useState(null);
    const [isSpeakerOn, setIsSpeakerOn] = useState(false);
    const [isMicOn, setIsMicOn] = useState(false);

    // WebRTC Refs
    const localStreamRef = useRef(null);
    const peersRef = useRef({}); 
    const hasJoinedRoom = useRef(false);

    const subjectsList = [
        { id: 'mtk', name: 'Matematika', icon: '📐' },
        { id: 'ipa', name: 'Sains (IPA)', icon: '🧪' },
        { id: 'ips', name: 'Sosial (IPS)', icon: '🌍' },
        { id: 'bing', name: 'Bahasa Inggris', icon: '🇬🇧' }
    ];

    // ==================== 🟢 LISTENER 1: REALTIME UI LOBBY ====================
    useEffect(() => {
        if (!roomId || !currentUser) return;

        const roomRef = doc(db, 'lobbyGroups', roomId.toUpperCase());

        const unsubscribe = onSnapshot(roomRef, (docSnap) => {
            if (!docSnap.exists()) {
                if (hasJoinedRoom.current) {
                    toast.error('Lobby Grup telah dibubarkan oleh Host! 👥❌', { id: 'grp_dissolve' });
                    closeVoiceChat();
                    setLobbyData(null);
                    setViewMode('menu');
                    hasJoinedRoom.current = false;
                    navigate('/contest/group');
                }
                return;
            }

            const data = docSnap.data();
            setLobbyData(data); 
            setViewMode('inside'); 
            hasJoinedRoom.current = true;
        }, (error) => {
            console.error("Firestore UI Listener Error:", error);
        });

        return () => unsubscribe();
    }, [roomId, currentUser, navigate]);

    // ==================== 🔊 LISTENER 2: HANDSHAKE SIGNALLING WEBRTC ====================
    useEffect(() => {
        if (!roomId || !currentUser || !isSpeakerOn) return;

        const signalsQuery = collection(db, 'lobbyGroups', roomId.toUpperCase(), 'signals');

        const unsubscribeSignals = onSnapshot(signalsQuery, (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added' || change.type === 'modified') {
                    const sigData = change.doc.data();
                    if (sigData.targetUid !== currentUser.uid || sigData.senderUid === currentUser.uid) return;

                    const senderUid = sigData.senderUid;

                    if (sigData.type === 'offer') {
                        try {
                            let peer = peersRef.current[senderUid];
                            if (!peer) peer = createPeerConnection(senderUid);

                            if (peer.signalingState === "stable") {
                                await peer.setRemoteDescription(new RTCSessionDescription(sigData.sdp));
                                const answer = await peer.createAnswer();
                                await peer.setLocalDescription(answer);

                                const mySignalRef = doc(db, 'lobbyGroups', roomId.toUpperCase(), 'signals', `${currentUser.uid}_ans_to_${senderUid}`);
                                await setDoc(mySignalRef, {
                                    targetUid: senderUid,
                                    senderUid: currentUser.uid,
                                    sdp: peer.localDescription.toJSON(),
                                    type: 'answer',
                                    timestamp: Date.now()
                                });
                            }
                        } catch (err) {
                            console.error("Gagal handshaking Offer:", err);
                        }
                    }

                    if (sigData.type === 'answer') {
                        try {
                            const peer = peersRef.current[senderUid];
                            if (peer && peer.signalingState === "have-local-offer") {
                                await peer.setRemoteDescription(new RTCSessionDescription(sigData.sdp));
                            }
                        } catch (err) {
                            console.error("Gagal handshaking Answer:", err);
                        }
                    }

                    if (sigData.type === 'candidate') {
                        try {
                            const peer = peersRef.current[senderUid];
                            if (peer && peer.remoteDescription && peer.remoteDescription.type) {
                                await peer.addIceCandidate(new RTCIceCandidate(sigData.candidate));
                            }
                        } catch (e) {
                            // Abaikan delay kecil
                        }
                    }
                }
            });
        });

        return () => unsubscribeSignals();
    }, [roomId, currentUser, isSpeakerOn]);

    // Sinkronisasi Otomatis URL Deep Link
    useEffect(() => {
        if (roomId && currentUser && !hasJoinedRoom.current) {
            executeJoinRoomAction(roomId.trim().toUpperCase());
        }
    }, [roomId, currentUser]);
    
    // SINKRONISASI TOMBOL MIC
    useEffect(() => {
        if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
            localStreamRef.current.getAudioTracks()[0].enabled = isMicOn;
        }
    }, [isMicOn]);

    // Sinkronisasi status mic/speaker ke Firestore
    const syncVoiceStatusToFirestore = async (newMic, newSpeaker) => {
        if (!roomId || !currentUser) return;
        const roomRef = doc(db, 'lobbyGroups', roomId.toUpperCase());

        try {
            const freshDoc = await getDoc(roomRef);
            if (!freshDoc.exists()) return;
            const currentData = freshDoc.data();

            if (currentData.gameMode === 'study') {
                const updatedMembers = currentData.members.map(m => 
                    m.uid === currentUser.uid ? { ...m, isMicOn: newMic, isSpeakerOn: newSpeaker } : m
                );
                await updateDoc(roomRef, { members: updatedMembers });
            } else {
                const updatedTeamA = currentData.teamA.map(m => 
                    m.uid === currentUser.uid ? { ...m, isMicOn: newMic, isSpeakerOn: newSpeaker } : m
                );
                const updatedTeamB = currentData.teamB.map(m => 
                    m.uid === currentUser.uid ? { ...m, isMicOn: newMic, isSpeakerOn: newSpeaker } : m
                );
                await updateDoc(roomRef, { teamA: updatedTeamA, teamB: updatedTeamB });
            }
        } catch (err) {
            console.error("Gagal sinkronisasi status voice ke Firestore:", err);
        }
    };

    // ==================== 🔊 ENGINE WEBRTC ====================
    const connectToTeamVoice = async () => {
        if (!lobbyData) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;
            stream.getAudioTracks()[0].enabled = isMicOn; 

            let teammates = [];
            if (lobbyData.gameMode === 'study') {
                teammates = lobbyData.members.filter(m => m.uid !== currentUser.uid);
            } else {
                const amIInTeamA = lobbyData.teamA.some(m => m.uid === currentUser.uid);
                teammates = amIInTeamA 
                    ? lobbyData.teamA.filter(m => m.uid !== currentUser.uid)
                    : lobbyData.teamB.filter(m => m.uid !== currentUser.uid);
            }

            for (const member of teammates) {
                const peer = createPeerConnection(member.uid);
                const offer = await peer.createOffer();
                await peer.setLocalDescription(offer);
                
                const mySignalRef = doc(db, 'lobbyGroups', roomId.toUpperCase(), 'signals', `${currentUser.uid}_to_${member.uid}_offer`);
                await setDoc(mySignalRef, {
                    targetUid: member.uid,
                    senderUid: currentUser.uid,
                    sdp: peer.localDescription.toJSON(),
                    type: 'offer',
                    timestamp: Date.now()
                });
            }
        } catch (err) {
            console.error("Gagal mengakses Mikrofon:", err);
            toast.error("Gagal mengaktifkan Voice! Periksa izin mic.");
            setIsSpeakerOn(false);
            setIsMicOn(false);
        }
    };

    const createPeerConnection = (targetUid) => {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        });

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current);
            });
        }

        peersRef.current[targetUid] = pc;

        pc.onicecandidate = async (event) => {
            if (event.candidate && roomId) {
                const candRef = doc(db, 'lobbyGroups', roomId.toUpperCase(), 'signals', `${currentUser.uid}_cand_${Date.now()}`);
                await setDoc(candRef, {
                    targetUid: targetUid,
                    senderUid: currentUser.uid,
                    candidate: event.candidate.toJSON(),
                    type: 'candidate'
                });
            }
        };

        pc.ontrack = (event) => {
            let remoteAudio = document.querySelector(`.remote-audio-${targetUid}`);
            if (!remoteAudio) {
                remoteAudio = document.createElement('audio');
                remoteAudio.className = `remote-audio-${targetUid}`;
                remoteAudio.setAttribute('playsinline', 'true');
                document.body.appendChild(remoteAudio);
            }
            remoteAudio.srcObject = event.streams[0];
            remoteAudio.autoplay = true;
            remoteAudio.play().catch(e => console.log("Autoplay blocked:", e));
        };

        return pc;
    };

    const closeVoiceChat = async () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        Object.keys(peersRef.current).forEach(id => {
            if (peersRef.current[id]) peersRef.current[id].close();
        });
        peersRef.current = {};
        const audios = document.querySelectorAll('audio[class^="remote-audio-"]');
        audios.forEach(a => a.remove());
    };

    const toggleSpeaker = () => {
        const nextState = !isSpeakerOn;
        setIsSpeakerOn(nextState);
        if (!nextState) {
            setIsMicOn(false);
            closeVoiceChat();
            syncVoiceStatusToFirestore(false, false);
            toast.error('Voice Chat dinonaktifkan 🔇');
        } else {
            toast.success('Speaker Aktif! Mendengarkan obrolan tim... 🔊');
            syncVoiceStatusToFirestore(isMicOn, true);
            setTimeout(() => connectToTeamVoice(), 300);
        }
    };

    const toggleMic = () => {
        if (!isSpeakerOn) {
            return toast('Nyalakan speaker terlebih dahulu sebelum mengaktifkan mikrofon! 📢', {
                icon: '⚠️',
                style: { background: '#fffbeb', color: '#b45309', fontWeight: 'bold', border: '1px solid #fef3c7' }
            });
        }

        const nextMicState = !isMicOn;
        setIsMicOn(nextMicState);
        syncVoiceStatusToFirestore(nextMicState, isSpeakerOn);

        if (nextMicState) {
            toast.success('Kamu sedang berbicara! On Mic 🎙️🟢');
        } else {
            toast.error('Mikrofon kamu di-mute 🎙️❌');
        }
    };

    // ==================== FIRESTORE CRUD ACTIONS ====================
    
    const handleCreateGroupRoom = async () => {
        if (!currentUser) return toast.error('Silakan login terlebih dahulu!');
        setIsLoading(true);
        
        // ✨ MODIFIKASI: Mengunci format depan agar selalu "GRP" + 3 digit karakter acak
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let generatedRoomId = 'GRP';
        for (let i = 0; i < 3; i++) {
            generatedRoomId += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        const roomRef = doc(db, 'lobbyGroups', generatedRoomId);

        const newUserData = {
            uid: currentUser.uid,
            name: currentUser.displayName || 'Host',
            photoURL: currentUser.photoURL || '',
            activeBorder: currentUser.activeBorder || 'borderNormal', // Ambil border toko
            isMicOn: false,
            isSpeakerOn: false,
            joinedAt: Date.now()
        };

        const initialPayload = {
            roomId: generatedRoomId,
            subject: selectedSubject,
            maxMembers,
            gameMode,
            matchType,
            createdAt: Date.now(),
            members: gameMode === 'study' ? [newUserData] : [],
            teamA: gameMode === 'competition' ? [newUserData] : [],
            teamB: []
        };

        try {
            await setDoc(roomRef, initialPayload);
            toast.success('Lobby Grup Berhasil Dibuat! 👥');
            navigate(`/contest/group/lobby/${generatedRoomId}`);
        } catch (err) {
            console.error(err);
            toast.error('Gagal membuat ruangan grup.');
        } finally {
            setIsLoading(false);
        }
    };

    const executeJoinRoomAction = async (targetCode) => {
        setIsLoading(true);
        const roomRef = doc(db, 'lobbyGroups', targetCode);
        
        try {
            const docSnap = await getDoc(roomRef);

            if (!docSnap.exists()) {
                toast.error('Kamar grup tidak ditemukan! Pastikan kodenya benar. 🔍❌');
                setViewMode('menu');
                navigate('/contest/group');
                setIsLoading(false);
                return;
            }

            const data = docSnap.data();
            
            let cleanMembers = (data.members || []).filter(m => m.uid !== currentUser.uid);
            let cleanTeamA = (data.teamA || []).filter(m => m.uid !== currentUser.uid);
            let cleanTeamB = (data.teamB || []).filter(m => m.uid !== currentUser.uid);

            const totalNow = data.gameMode === 'study' ? cleanMembers.length : (cleanTeamA.length + cleanTeamB.length);

            if (totalNow >= data.maxMembers) {
                toast.error('Maaf, kuota tampung ruangan grup ini sudah penuh! 👥⚠️');
                setViewMode('menu');
                navigate('/contest/group');
                setIsLoading(false);
                return;
            }

            const memberStructure = {
                uid: currentUser.uid,
                name: currentUser.displayName || 'Anggota baru',
                photoURL: currentUser.photoURL || '',
                activeBorder: currentUser.activeBorder || 'borderNormal', // Ambil border toko
                isMicOn: false,
                isSpeakerOn: false,
                joinedAt: Date.now()
            };

            if (data.gameMode === 'study') {
                cleanMembers.push(memberStructure);
                await updateDoc(roomRef, { members: cleanMembers });
            } else {
                cleanTeamA.push(memberStructure);
                await updateDoc(roomRef, { teamA: cleanTeamA, teamB: cleanTeamB });
            }
        } catch (err) {
            console.error(err);
            toast.error('Gagal memproses penggabungan kelompok.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinGroupRoomByCode = () => {
        if (!inputRoomCode.trim()) return toast.error('Ketik kode ruangan dulu!');
        const cleanCode = inputRoomCode.trim().toUpperCase();
        navigate(`/contest/group/lobby/${cleanCode}`);
    };

    const handleSwitchTeam = async (targetTeam) => {
        if (!roomId || !currentUser || !lobbyData) return;
        const roomRef = doc(db, 'lobbyGroups', roomId.toUpperCase());
        
        const myOldData = [...lobbyData.teamA, ...lobbyData.teamB].find(m => m.uid === currentUser.uid);
        if (!myOldData) return;

        const updatedUser = { ...myOldData, joinedAt: Date.now() };

        let filteredA = lobbyData.teamA.filter(m => m.uid !== currentUser.uid);
        let filteredB = lobbyData.teamB.filter(m => m.uid !== currentUser.uid);

        try {
            if (targetTeam === 'A') {
                if (lobbyData.teamA.length >= lobbyData.maxMembers) return toast.error('Tim Alfa penuh!');
                filteredA.push(updatedUser);
            } else {
                if (lobbyData.teamB.length >= lobbyData.maxMembers) return toast.error('Tim Beta penuh!');
                filteredB.push(updatedUser);
            }
            await updateDoc(roomRef, { teamA: filteredA, teamB: filteredB });
        } catch (err) {
            console.error(err);
        }
    };

    const handleConfirmActualExit = async () => {
        if (!roomId || !currentUser || !lobbyData) return;
        setShowExitModal(false);
        await closeVoiceChat(); 

        const roomRef = doc(db, 'lobbyGroups', roomId.toUpperCase());
        const isStudyMode = lobbyData.gameMode === 'study';
        
        const isHost = isStudyMode 
            ? lobbyData.members[0]?.uid === currentUser.uid
            : lobbyData.teamA[0]?.uid === currentUser.uid;

        try {
            if (isHost) {
                await deleteDoc(roomRef);
            } else {
                if (isStudyMode) {
                    const filteredMembers = lobbyData.members.filter(m => m.uid !== currentUser.uid);
                    await updateDoc(roomRef, { members: filteredMembers });
                } else {
                    const filteredA = lobbyData.teamA.filter(m => m.uid !== currentUser.uid);
                    const filteredB = lobbyData.teamB.filter(m => m.uid !== currentUser.uid);
                    await updateDoc(roomRef, { teamA: filteredA, teamB: filteredB });
                }
            }
        } catch (err) {
            console.error("Gagal keluar kamar: ", err);
        }

        setLobbyData(null);
        setViewMode('menu');
        navigate('/contest/group');
    };

    // 🌟 SEPERTI LEADERBOARD: Fungsi klik avatar untuk trigger modal zoom preview
    const handleAvatarClick = (e, photoUrl, name) => {
        e.stopPropagation();
        const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=2563eb&color=ffffff&bold=true`;
        setSelectedAvatar({ url: photoUrl || fallbackUrl, name });
    };

    const currentSubject = subjectsList.find(s => s.id === (lobbyData?.subject || selectedSubject));

    // ==================== 🛠️ RENDERING AVATAR DENGAN KONDISI GLOW VOICE + BORDER TOKO ====================
    const renderMemberAvatar = (user, index, isHostMode = false, baseFrameClass) => {
        let voiceIcon = null;
        let voiceIndicatorClass = '';

        // 🟢 ATURAN PRIORITAS BORDER:
        // Jika sedang On-Mic atau dengar suara, pakai border voice. Jika diam, pakai border dari toko (activeBorder)
        let finalBorderClass = user?.activeBorder || 'borderNormal';

        if (user.isSpeakerOn && user.isMicOn) {
            voiceIcon = <FaMicrophone />;
            voiceIndicatorClass = `${styles.miniVoiceProfileIndicator} ${styles.voiceActiveGreen}`;
            finalBorderClass = styles.borderActiveGreen; // Override ke hijau menyala
        } else if (user.isSpeakerOn && !user.isMicOn) {
            voiceIcon = <FaVolumeHigh />;
            voiceIndicatorClass = `${styles.miniVoiceProfileIndicator} ${styles.voiceSpeakerOnlyBlue}`;
            finalBorderClass = styles.borderSpeakerOnlyBlue; // Override ke biru menyala
        }

        const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=2563eb&color=ffffff&bold=true`;

        return (
            <div className={styles.avatarContainerPositionRef}>
                {/* Frame Div menggunakan gabungan class CSS Module & file border.css toko */}
                <div 
                    className={`${baseFrameClass} ${finalBorderClass}`} 
                    onClick={(e) => handleAvatarClick(e, user?.photoURL, user?.name)}
                >
                    <img 
                        src={user?.photoURL || fallbackUrl} 
                        alt={user?.name || 'Avatar'} 
                    />
                </div>

                {/* Indikator Icon Mic / Speaker melayang kecil */}
                {voiceIcon && (
                    <span className={voiceIndicatorClass}>
                        {voiceIcon}
                    </span>
                )}

                {isHostMode && index === 0 && <span className={styles.hostCrownBadge}>HOST</span>}
            </div>
        );
    };

    // LAYOUT 1: DI DALAM RUANG LOBBY
    if (viewMode === 'inside') {
        const isStudyMode = lobbyData?.gameMode === 'study';
        const isHost = isStudyMode 
            ? lobbyData?.members[0]?.uid === currentUser?.uid
            : lobbyData?.teamA[0]?.uid === currentUser?.uid;

        return (
            <div className={styles.groupLobbyMainContainer}>
                <div className={styles.headerTopArea}>
                    <button className={styles.circularBackControlBtn} onClick={() => setShowExitModal(true)}>
                        <FaArrowLeft />
                    </button>
                    <h2>Ruang Mabar Grup</h2>
                </div>

                <div className={styles.voiceChatControlActionRow}>
                    <button 
                        className={`${styles.voiceControlBtn} ${isSpeakerOn ? styles.btnActiveSpeaker : styles.btnInactive}`}
                        onClick={toggleSpeaker}
                    >
                        {isSpeakerOn ? <FaVolumeHigh /> : <FaVolumeXmark />} 
                        <span>{isSpeakerOn ? 'Speaker On' : 'Speaker Off'}</span>
                    </button>

                    <button 
                        className={`${styles.voiceControlBtn} ${isMicOn ? styles.btnActiveMic : styles.btnInactive}`}
                        onClick={toggleMic}
                    >
                        {isMicOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
                        <span>{isMicOn ? 'Mic Open' : 'Mic Mute'}</span>
                    </button>
                </div>

                <div className={styles.metaBadgeHorizontalFlex}>
                    <span className={styles.modeIndicatorTag} style={{ backgroundColor: isStudyMode ? '#10b981' : '#7c3aed' }}>
                        {isStudyMode ? <FaBookOpen /> : <FaShieldHalved />} 
                        {isStudyMode ? 'Belajar Bareng' : `Kompetisi (${lobbyData?.matchType?.toUpperCase()})`}
                    </span>
                    <span className={styles.subjectIndicatorTag}>
                        {currentSubject?.icon} {currentSubject?.name}
                    </span>
                    <span className={styles.limitIndicatorTag}>
                        <FaUsers /> Max: {lobbyData?.maxMembers} Orang
                    </span>
                </div>

                <div className={styles.roomCodeDisplayCardContainer} onClick={() => {
                    const link = `${window.location.origin}/contest/group/lobby/${roomId.toUpperCase()}`;
                    navigator.clipboard.writeText(link);
                    toast.success('Tautan mabar grup berhasil disalin! 🔗');
                }}>
                    <span className={styles.tinyLabel}>KODE AKSES GRUP</span>
                    <div className={styles.innerCodeFlexRow}>
                        <h1>{roomId?.toUpperCase()}</h1>
                        <FaCopy />
                    </div>
                    <p>Klik kotak untuk menyalin tautan undang cepat kelompok belajarmu.</p>
                </div>

                {isStudyMode ? (
                    <div className={styles.singleCasualGroupContainer}>
                        <h3><FaUsers /> Anggota Kelompok Belajar ({lobbyData?.members?.length || 0})</h3>
                        <div className={styles.casualMembersGrid}>
                            {lobbyData?.members?.map((user, index) => (
                                <div key={user.uid} className={styles.memberAvatarCardRow}>
                                    {renderMemberAvatar(user, index, true, styles.lobbyMainAvatarFrame)}
                                    <div className={styles.memberIdentityCenter}>
                                        <h4>{user.name}</h4>
                                        <p>{index === 0 ? 'Pemimpin Kelompok' : 'Anggota Tim'}</p>
                                    </div>
                                    <span className={styles.statusLiveReadyBadge}><FaCheck /> Ready</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className={styles.competitionDualTeamWrapper}>
                        {/* TIM A */}
                        <div className={styles.factionTeamColumnBlock}>
                            <div className={styles.factionColumnHeaderRow}>
                                <h3>🔵 TIM ALFA ({lobbyData?.teamA?.length || 0}/{lobbyData?.maxMembers})</h3>
                                <button className={styles.teamSwitchActionBtn} onClick={() => handleSwitchTeam('A')}>
                                    <FaArrowRightArrowLeft /> Masuk
                                </button>
                            </div>
                            <div className={styles.teamSlotsVerticalList}>
                                {lobbyData?.teamA?.map((user, idx) => (
                                    <div key={user.uid} className={styles.compactUserCardItem}>
                                        {renderMemberAvatar(user, idx, false, styles.lobbyListAvatarFrame)}
                                        <h4>{user.name} {idx === 0 && <strong style={{color:'#2563eb'}}>(Host)</strong>}</h4>
                                    </div>
                                ))}
                                {Array.from({ length: Math.max(0, (lobbyData?.maxMembers || 5) - (lobbyData?.teamA?.length || 0)) }).map((_, i) => (
                                    <div key={`empty-a-${i}`} className={styles.emptySlotPlaceholder}>Slot Rekan Kosong</div>
                                ))}
                            </div>
                        </div>

                        <div className={styles.vsSeparatorAnimationZone}>
                            <div className={styles.vsBadgeCircleOuter}>VS</div>
                        </div>

                        {/* TIM B */}
                        <div className={styles.factionTeamColumnBlock}>
                            <div className={styles.factionColumnHeaderRow}>
                                <h3>🔴 TIM BETA ({lobbyData?.teamB?.length || 0}/{lobbyData?.maxMembers})</h3>
                                {lobbyData?.matchType === 'custom' ? (
                                    <button className={styles.teamSwitchActionBtn} style={{backgroundColor: '#ef4444'}} onClick={() => handleSwitchTeam('B')}>
                                        <FaArrowRightArrowLeft /> Masuk
                                    </button>
                                ) : (
                                    <span className={styles.lockInfoLabel}>Terkunci (Acak)</span>
                                )}
                            </div>
                            <div className={styles.teamSlotsVerticalList}>
                                {lobbyData?.matchType === 'random' ? (
                                    <div className={styles.matchmakingSearchingFallback}>
                                        <FaShuffle className={styles.spinningIconElement} />
                                        <p>Mencari musuh global otomatis saat game dimulai...</p>
                                    </div>
                                ) : (
                                    <>
                                        {lobbyData?.teamB?.map((user) => (
                                            <div key={user.uid} className={styles.compactUserCardItem}>
                                                {renderMemberAvatar(user, 0, false, styles.lobbyListAvatarFrame)}
                                                <h4>{user.name}</h4>
                                            </div>
                                        ))}
                                        {Array.from({ length: Math.max(0, (lobbyData?.maxMembers || 5) - (lobbyData?.teamB?.length || 0)) }).map((_, i) => (
                                            <div key={`empty-b-${i}`} className={styles.emptySlotPlaceholder}>Slot Musuh Kosong</div>
                                        ))}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className={styles.bottomFixedActionBarContainer}>
                    {isHost ? (
                        <button className={styles.launchMatchCoreActionBtn}>
                            🚀 MULAI SESI {isStudyMode ? 'BELAJAR BARENG' : 'KOMPETISI TIM'}
                        </button>
                    ) : (
                        <div className={styles.playerNotificationWaitingBanner}>
                            <FaHourglassHalf className={styles.spinningIconElement} />
                            <span>Menunggu pemimpin kelompok memulai sesi...</span>
                        </div>
                    )}
                </div>

                {/* 🔒 SEPERTI LEADERBOARD: MODAL POP-UP PREVIEW AVATAR KETIKA DIKLIK */}
                {selectedAvatar && (
                    <div className={styles.modalOverlay} onClick={() => setSelectedAvatar(null)}>
                        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                            <button className={styles.modalCloseBtn} onClick={() => setSelectedAvatar(null)}>
                                <FaXmark />
                            </button>
                            <img src={selectedAvatar.url} alt={selectedAvatar.name} className={styles.modalImageImg} />
                            <h3 className={styles.modalImageTitle}>{selectedAvatar.name}</h3>
                        </div>
                    </div>
                )}

                {showExitModal && (
                    <div className={styles.overlayModalContainer}>
                        <div className={styles.exitModalBodyCard}>
                            <h3><FaRightFromBracket /> Konfirmasi Keluar</h3>
                            <p>{isHost ? 'Seluruh ruangan grup akan dibubarkan secara otomatis dan sesi voice chat tim ditutup.' : 'Apakah yakin ingin keluar dari kelompok?'}</p>
                            <div className={styles.modalButtonsFlexRow}>
                                <button className={styles.cancelModalBtn} onClick={() => setShowExitModal(false)}>Batal</button>
                                <button className={styles.confirmModalBtn} onClick={handleConfirmActualExit}>Ya, Keluar</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // LAYOUT 2: MENU UTAMA SEBELUM MASUK ROOM
    return (
        <div className={styles.groupLobbyMainContainer}>
            <div className={styles.headerTopArea}>
                <button className={styles.circularBackControlBtn} onClick={() => navigate('/dashboard')} disabled={isLoading}>
                    <FaArrowLeft />
                </button>
                <h2>Lobby Belajar Kelompok & Regu</h2>
            </div>

            <div className={styles.dualMenuCardFlexibleGrid}>
                <div className={styles.operationConfigBlockCard}>
                    <div className={styles.titleIconRowHeader}>
                        <div className={styles.iconCircleHolder} style={{backgroundColor:'rgba(37,99,235,0.1)', color:'#2563eb'}}><FaPlus /></div>
                        <h3>Buat Sesi Grup Baru</h3>
                    </div>

                    <div className={styles.formElementFieldGroup}>
                        <label>1. Pilih Kategori Pelajaran:</label>
                        <select className={styles.classicModernSelectStyle} value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} disabled={isLoading}>
                            {subjectsList.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                        </select>
                    </div>

                    <div className={styles.formElementFieldGroup}>
                        <label>2. Batas Anggota Per Regu ({maxMembers} Orang):</label>
                        <input className={styles.classicRangeSliderStyle} type="range" min="2" max="5" value={maxMembers} onChange={(e) => setMaxMembers(parseInt(e.target.value))} disabled={isLoading} />
                    </div>

                    <div className={styles.formElementFieldGroup}>
                        <label>3. Tentukan Mode Kelompok:</label>
                        <div className={styles.customRadioDualFlexGrid}>
                            <div className={`${styles.radioSelectionOptionBox} ${gameMode === 'study' ? styles.boxSelectedActiveBlue : ''} ${isLoading ? styles.disabledBox : ''}`} onClick={() => !isLoading && setGameMode('study')}>
                                <FaBookOpen />
                                <div><h4>Belajar Bareng</h4><p>Baca materi kelompok & mini kuis.</p></div>
                            </div>
                            <div className={`${styles.radioSelectionOptionBox} ${gameMode === 'competition' ? styles.boxSelectedActivePurple : ''} ${isLoading ? styles.disabledBox : ''}`} onClick={() => !isLoading && setGameMode('competition')}>
                                <FaShieldHalved />
                                <div><h4>Kompetisi Regu</h4><p>Adu tangkas kuis antar tim.</p></div>
                            </div>
                        </div>
                    </div>

                    {gameMode === 'competition' && (
                        <div className={styles.formElementFieldGroup}>
                            <label><FaGear /> Pengaturan Pencarian Musuh:</label>
                            <div className={styles.customRadioDualFlexGrid}>
                                <div className={`${styles.radioSelectionOptionBox} ${matchType === 'custom' ? styles.boxSelectedActivePurple : ''} ${isLoading ? styles.disabledBox : ''}`} onClick={() => !isLoading && setMatchType('custom')}>
                                    <FaUsers />
                                    <div><h4>Custom Match</h4><p>Musuh masuk lewat 1 kode room.</p></div>
                                </div>
                                <div className={`${styles.radioSelectionOptionBox} ${matchType === 'random' ? styles.boxSelectedActiveBlue : ''} ${isLoading ? styles.disabledBox : ''}`} onClick={() => !isLoading && setMatchType('random')}>
                                    <FaShuffle />
                                    <div><h4>Random Match</h4><p>Otomatis cari lawan dari luar acak.</p></div>
                                </div>
                            </div>
                        </div>
                    )}

                    <button className={styles.primaryTriggerExecutionBtn} onClick={handleCreateGroupRoom} disabled={isLoading}>
                        {isLoading ? <><FaSpinner className={styles.spinningIconElement} /> Membuat Sesi...</> : '🚀 Buat Ruangan Grup Sekarang'}
                    </button>
                </div>

                <div className={styles.operationConfigBlockCard} style={{alignSelf: 'flex-start'}}>
                    <div className={styles.titleIconRowHeader}>
                        <div className={styles.iconCircleHolder} style={{backgroundColor:'rgba(16,185,129,0.1)', color:'#10b981'}}><FaRightToBracket /></div>
                        <h3>Gabung Sesi Grup Teman</h3>
                    </div>
                    
                    <div className={styles.formElementFieldGroup}>
                        <label>Masukkan Kode Unik Grup:</label>
                        {/* ✨ MODIFIKASI: Menambahkan e.target.value.toUpperCase() agar otomatis huruf besar saat diketik */}
                        <input 
                            className={styles.modernTextInputBoxStyle} 
                            type="text" 
                            placeholder="Contoh: GRPX92" 
                            maxLength={6} 
                            value={inputRoomCode} 
                            onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())} 
                            disabled={isLoading} 
                        />
                    </div>

                    <button className={styles.primaryTriggerExecutionBtn} style={{backgroundColor:'#10b981'}} onClick={handleJoinGroupRoomByCode} disabled={isLoading}>
                        {isLoading ? <><FaSpinner className={styles.spinningIconElement} /> Membuka Pintu...</> : <><FaRightToBracket /> Bergabung Sekarang</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LobbyGroupPage;
