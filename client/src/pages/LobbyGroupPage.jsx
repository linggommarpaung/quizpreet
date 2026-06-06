// client/src/pages/LobbyGroupPage.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { 
    FaArrowLeft, FaUsers, FaPlus, FaRightToBracket, FaCopy, 
    FaCheck, FaHourglassHalf, FaBookOpen, FaShieldHalved, FaShuffle, 
    FaGear, FaArrowRightArrowLeft, FaRightFromBracket,
    FaMicrophone, FaMicrophoneSlash, FaVolumeHigh, FaVolumeXmark
} from 'react-icons/fa6';
import styles from './LobbyGroupPage.module.css';
import { SOCKET_URL } from '../config/socketConfig';

const socket = io(SOCKET_URL);

const LobbyGroupPage = () => {
    const { currentUser } = useAuth();
    const { roomId } = useParams(); 
    const navigate = useNavigate();

    // State Alur Aliran Layar & Form
    const [viewMode, setViewMode] = useState(roomId ? 'inside' : 'menu'); 
    const [inputRoomCode, setInputRoomCode] = useState('');
    const [showExitModal, setShowExitModal] = useState(false);

    // State Pembuat Sesi
    const [selectedSubject, setSelectedSubject] = useState('mtk');
    const [maxMembers, setMaxMembers] = useState(5);
    const [gameMode, setGameMode] = useState('study'); 
    const [matchType, setMatchType] = useState('custom'); 

    // State Realtime Data & Voice Chat Controls
    const [lobbyData, setLobbyData] = useState(null);
    const [isSpeakerOn, setIsSpeakerOn] = useState(false);
    const [isMicOn, setIsMicOn] = useState(false);

    // WebRTC Refs untuk menampung Stream Audio dan Koneksi Peer-to-Peer
    const localStreamRef = useRef(null);
    const peersRef = useRef({}); // Menyimpan koneksi RTCPeerConnection ke tiap teman
    const hasRequestedStatus = useRef(false);

    const subjectsList = [
        { id: 'mtk', name: 'Matematika', icon: '📐' },
        { id: 'ipa', name: 'Sains (IPA)', icon: '🧪' },
        { id: 'ips', name: 'Sosial (IPS)', icon: '🌍' },
        { id: 'bing', name: 'Bahasa Inggris', icon: '🇬🇧' }
    ];

    // ==================== REALTIME WEBSOCKET LISTENERS ====================
    useEffect(() => {
        socket.removeAllListeners('group_room_created');
        socket.removeAllListeners('group_room_updated');
        socket.removeAllListeners('group_join_error');
        socket.removeAllListeners('group_action_error');
        socket.removeAllListeners('group_room_dissolved');
        socket.removeAllListeners('webrtc_signal_received');

        socket.on('group_room_created', ({ roomId }) => {
            toast.success('Lobby Grup Berhasil Dibuat! 👥', { id: 'grp_create' });
            setViewMode('inside');
            navigate(`/contest/group/lobby/${roomId}`);
        });

        socket.on('group_room_updated', (data) => {
            setLobbyData(data);
        });

        socket.on('group_join_error', ({ message }) => {
            toast.error(message, { id: 'grp_join_err' });
            closeVoiceChat();
            setLobbyData(null);
            setViewMode('menu');
            navigate('/contest/group');
        });

        socket.on('group_action_error', ({ message }) => {
            toast.error(message, { id: 'grp_action_err' });
        });

        socket.on('group_room_dissolved', ({ message }) => {
            toast.error(message, { id: 'grp_dissolve' });
            closeVoiceChat();
            setLobbyData(null);
            setViewMode('menu');
            navigate('/contest/group');
        });

        // LISTENER WEBRTC: Menerima jabat tangan audio dari kawan satu tim
        socket.on('webrtc_signal_received', async ({ senderSocketId, signalData, senderUid }) => {
            if (!isSpeakerOn) return; // Hiraukan sinyal jika speaker mati
            
            // Cek apakah pengirim sinyal adalah kawan satu tim nyata
            if (!checkIfSameTeam(senderUid)) return;

            try {
                let peer = peersRef.current[senderSocketId];
                if (!peer) {
                    peer = createPeerConnection(senderSocketId, senderUid);
                }

                if (signalData.sdp) {
                    await peer.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
                    if (signalData.sdp.type === 'offer') {
                        const answer = await peer.createAnswer();
                        await peer.setLocalDescription(answer);
                        socket.emit('webrtc_signal', {
                            targetSocketId: senderSocketId,
                            signalData: { sdp: peer.localDescription },
                            senderUid: currentUser.uid
                        });
                    }
                } else if (signalData.candidate) {
                    await peer.addIceCandidate(new RTCIceCandidate(signalData.candidate));
                }
            } catch (err) {
                console.error("Gagal memproses sinyal audio WebRTC: ", err);
            }
        });

        return () => {
            socket.off('group_room_created');
            socket.off('group_room_updated');
            socket.off('group_join_error');
            socket.off('group_action_error');
            socket.off('group_room_dissolved');
            socket.off('webrtc_signal_received');
        };
    }, [navigate, isSpeakerOn, lobbyData]);

    // Sinkronisasi Deep Link
    useEffect(() => {
        if (roomId && currentUser) {
            setViewMode('inside');
            if (!hasRequestedStatus.current) {
                socket.emit('join_group_room', { 
                    roomId: roomId.trim().toUpperCase(), 
                    uid: currentUser.uid,
                    name: currentUser.displayName || 'Anggota Grup',
                    photoURL: currentUser.photoURL || ''
                });
                hasRequestedStatus.current = true;
            }
        }
    }, [roomId, currentUser]);

    // Mengabarkan perubahan Mic/Speaker ke Server agar icon profile berubah dinamis
    useEffect(() => {
        if (roomId && currentUser && lobbyData) {
            socket.emit('update_voice_status', {
                roomId: roomId.toUpperCase(),
                uid: currentUser.uid,
                isMicOn,
                isSpeakerOn
            });
        }
    }, [isMicOn, isSpeakerOn, roomId, currentUser]);

    // Helper: Validasi apakah user target satu kubu dengan kita
    const checkIfSameTeam = (targetUid) => {
        if (!lobbyData) return false;
        if (lobbyData.gameMode === 'study') {
            return lobbyData.members.some(m => m.uid === currentUser.uid) && lobbyData.members.some(m => m.uid === targetUid);
        } else {
            const inTeamA = lobbyData.teamA.some(m => m.uid === currentUser.uid) && lobbyData.teamA.some(m => m.uid === targetUid);
            const inTeamB = lobbyData.teamB.some(m => m.uid === currentUser.uid) && lobbyData.teamB.some(m => m.uid === targetUid);
            return inTeamA || inTeamB;
        }
    };

    // ==================== LOGIKA CORE VOICE CHATENGINE (WEBRTC) ====================
    
    // Inisiasi koneksi ke teman satu tim yang ada di lobby
    const connectToTeamVoice = async () => {
        try {
            // Ambil izin Mic HP
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;
            
            // Default awal: Mic di-mute sampai tombol mic dinyalakan sengaja
            stream.getAudioTracks()[0].enabled = isMicOn;

            // Dapatkan daftar kawan satu tim
            let teammates = [];
            if (lobbyData.gameMode === 'study') {
                teammates = lobbyData.members.filter(m => m.uid !== currentUser.uid);
            } else {
                const amIInTeamA = lobbyData.teamA.some(m => m.uid === currentUser.uid);
                teammates = amIInTeamA 
                    ? lobbyData.teamA.filter(m => m.uid !== currentUser.uid)
                    : lobbyData.teamB.filter(m => m.uid !== currentUser.uid);
            }

            // Buat jalur koneksi ke tiap kawan satu tim
            teammates.forEach(async (member) => {
                if (member.socketId) {
                    const peer = createPeerConnection(member.socketId, member.uid);
                    const offer = await peer.createOffer();
                    await peer.setLocalDescription(offer);
                    
                    socket.emit('webrtc_signal', {
                        targetSocketId: member.socketId,
                        signalData: { sdp: peer.localDescription },
                        senderUid: currentUser.uid
                    });
                }
            });
        } catch (err) {
            console.error("Gagal mengakses Mikrofon perangkat:", err);
            toast.error("Gagal mengaktifkan Voice! Pastikan izin mic diberikan.");
            setIsSpeakerOn(false);
            setIsMicOn(false);
        }
    };

    const createPeerConnection = (targetSocketId, targetUid) => {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] // STUN Server Google gratisan
        });

        peersRef.current[targetSocketId] = pc;

        // Tempelkan aliran suara lokal kita ke koneksi teman
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
        }

        // Tangkap kandidat jaringan koneksi
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('webrtc_signal', {
                    targetSocketId: targetSocketId,
                    signalData: { candidate: event.candidate },
                    senderUid: currentUser.uid
                });
            }
        };

        // KETIKA SUARA TEMAN MASUK -> Mainkan langsung di speaker HP
        pc.ontrack = (event) => {
            const remoteAudio = document.createElement('audio');
            remoteAudio.srcObject = event.streams[0];
            remoteAudio.autoplay = true;
            remoteAudio.className = `remote-audio-${targetUid}`;
            document.body.appendChild(remoteAudio);
        };

        return pc;
    };

    const closeVoiceChat = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        Object.keys(peersRef.current).forEach(id => {
            peersRef.current[id].close();
        });
        peersRef.current = {};
        // Bersihkan objek tag audio teman yang tersisa di dom
        const audios = document.querySelectorAll('audio[className^="remote-audio-"]');
        audios.forEach(a => a.remove());
    };

    // TOGLE SPEAKER TRIGGER
    const toggleSpeaker = () => {
        if (isSpeakerOn) {
            // Matikan total sistem voice chat
            setIsSpeakerOn(false);
            setIsMicOn(false);
            closeVoiceChat();
            toast.error('Voice Chat dinonaktifkan 🔇');
        } else {
            // Aktifkan Speaker (Bisa dengar kawan dulu)
            setIsSpeakerOn(true);
            toast.success('Speaker Aktif! Mendengarkan obrolan tim... 🔊');
            setTimeout(() => connectToTeamVoice(), 300);
        }
    };

    // TOGLE MIC TRIGGER (TERINTEGRASI ATURAN KHUSUS KAMU)
    const toggleMic = () => {
        if (!isSpeakerOn) {
            // NOTIFIKASI KHUSUS JIKA SPEAKER BELUM NYALA
            return toast('Nyalakan speaker terlebih dahulu sebelum mengaktifkan mikrofon! 📢', {
                icon: '⚠️',
                style: { background: '#fffbeb', color: '#b45309', fontWeight: 'bold', border: '1px solid #fef3c7' }
            });
        }

        if (isMicOn) {
            setIsMicOn(false);
            if (localStreamRef.current) localStreamRef.current.getAudioTracks()[0].enabled = false;
            toast.error('Mikrofon kamu di-mute 🎙️❌');
        } else {
            setIsMicOn(true);
            if (localStreamRef.current) localStreamRef.current.getAudioTracks()[0].enabled = true;
            toast.success('Kamu sedang berbicara! On Mic 🎙️🟢');
        }
    };

    // Perubahan Manajemen Keluar Sesi
    const handleConfirmActualExit = () => {
        setShowExitModal(false);
        closeVoiceChat();
        if (roomId && currentUser) {
            socket.emit('leave_group_room', { roomId: roomId.toUpperCase(), uid: currentUser.uid });
        }
        setLobbyData(null);
        setViewMode('menu');
        navigate('/contest/group');
    };

    // Pembuatan Room & Join Code biasa
    const handleCreateGroupRoom = () => {
        if (!currentUser) return toast.error('Silakan login terlebih dahulu!');
        socket.emit('create_group_room', {
            uid: currentUser.uid, name: currentUser.displayName || 'Host Grup', photoURL: currentUser.photoURL || '',
            subject: selectedSubject, maxMembers, gameMode, matchType
        });
    };

    const handleJoinGroupRoomByCode = () => {
        if (!inputRoomCode.trim()) return toast.error('Ketik kode ruangan dulu!');
        const cleanCode = inputRoomCode.trim().toUpperCase();
        setViewMode('inside');
        navigate(`/contest/group/lobby/${cleanCode}`);
        socket.emit('join_group_room', {
            roomId: cleanCode, uid: currentUser.uid, name: currentUser.displayName || 'Anggota baru', photoURL: currentUser.photoURL || ''
        });
    };

    const handleSwitchTeam = (targetTeam) => {
        if (!roomId || !currentUser) return;
        socket.emit('switch_group_team', { roomId: roomId.toUpperCase(), uid: currentUser.uid, toTeam: targetTeam });
    };

    const currentSubject = subjectsList.find(s => s.id === (lobbyData?.subject || selectedSubject));

    // ==================== RENDERING SUB-ELEMENT AVATAR MEMBER DENGAN MIC ICON ====================
    const renderMemberAvatar = (user, index, isHostMode = false) => {
        // Tentukan kondisi icon berdasarkan status real-time dari server
        let voiceIcon = null;
        let indicatorClass = '';

        if (user.isSpeakerOn && user.isMicOn) {
            // Kondisi 1: Dua-duanya nyala -> Tampilkan Mic Hijau
            voiceIcon = <FaMicrophone />;
            indicatorClass = `${styles.miniVoiceProfileIndicator} ${styles.voiceActiveGreen}`;
        } else if (user.isSpeakerOn && !user.isMicOn) {
            // Kondisi 2: Hanya Speaker nyala -> Tampilkan Speaker Biru
            voiceIcon = <FaVolumeHigh />;
            indicatorClass = `${styles.miniVoiceProfileIndicator} ${styles.voiceSpeakerOnlyBlue}`;
        }
        // Kondisi 3: Dua-duanya mati -> voiceIcon tetap null (Icon tidak akan dirender/hilang)

        return (
            <div className={styles.avatarLeftArea}>
                {user.photoURL ? (
                    <img src={user.photoURL} alt="Ava" className={styles.avatarMainImage} />
                ) : (
                    <div className={styles.initialAva}>{user.name.charAt(0)}</div>
                )}
                
                {/* ICON HANYA MUNCUL JIKA KONDISI 1 ATAU 2 TERPENUHI */}
                {voiceIcon && (
                    <span className={indicatorClass}>
                        {voiceIcon}
                    </span>
                )}

                {isHostMode && index === 0 && <span className={styles.hostCrownBadge}>HOST</span>}
            </div>
        );
    };

    // ==================== RENDER LAYOUT INSIDE LOBBY ====================
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

                {/* DUA TOMBOL VOICE CONTROLS PANEL (SPEAKER & MIC) */}
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
                                    {renderMemberAvatar(user, index, true)}
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
                                        {renderMemberAvatar(user, idx, false)}
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
                                                {renderMemberAvatar(user, 0, false)}
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

    // Panel Utama Pemilihan (Form Pembuatan) - Tidak Berubah dari sebelumnya
    return (
        <div className={styles.groupLobbyMainContainer}>
            <div className={styles.headerTopArea}>
                <button className={styles.circularBackControlBtn} onClick={() => navigate('/dashboard')}>
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
                        <select className={styles.classicModernSelectStyle} value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                            {subjectsList.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                        </select>
                    </div>

                    <div className={styles.formElementFieldGroup}>
                        <label>2. Batas Anggota Per Regu ({maxMembers} Orang):</label>
                        <input className={styles.classicRangeSliderStyle} type="range" min="2" max="5" value={maxMembers} onChange={(e) => setMaxMembers(parseInt(e.target.value))} />
                    </div>

                    <div className={styles.formElementFieldGroup}>
                        <label>3. Tentukan Mode Kelompok:</label>
                        <div className={styles.customRadioDualFlexGrid}>
                            <div className={`${styles.radioSelectionOptionBox} ${gameMode === 'study' ? styles.boxSelectedActiveBlue : ''}`} onClick={() => setGameMode('study')}>
                                <FaBookOpen />
                                <div><h4>Belajar Bareng</h4><p>Baca materi kelompok & mini kuis.</p></div>
                            </div>
                            <div className={`${styles.radioSelectionOptionBox} ${gameMode === 'competition' ? styles.boxSelectedActivePurple : ''}`} onClick={() => setGameMode('competition')}>
                                <FaShieldHalved />
                                <div><h4>Kompetisi Regu</h4><p>Adu tangkas kuis antar tim.</p></div>
                            </div>
                        </div>
                    </div>

                    {gameMode === 'competition' && (
                        <div className={styles.formElementFieldGroup}>
                            <label><FaGear /> Pengaturan Pencarian Musuh:</label>
                            <div className={styles.customRadioDualFlexGrid}>
                                <div className={`${styles.radioSelectionOptionBox} ${matchType === 'custom' ? styles.boxSelectedActivePurple : ''}`} onClick={() => setMatchType('custom')}>
                                    <FaUsers />
                                    <div><h4>Custom Match</h4><p>Musuh masuk lewat 1 kode room.</p></div>
                                </div>
                                <div className={`${styles.radioSelectionOptionBox} ${matchType === 'random' ? styles.boxSelectedActiveBlue : ''}`} onClick={() => setMatchType('random')}>
                                    <FaShuffle />
                                    <div><h4>Random Match</h4><p>Otomatis cari lawan dari luar acak.</p></div>
                                </div>
                            </div>
                        </div>
                    )}

                    <button className={styles.primaryTriggerExecutionBtn} onClick={handleCreateGroupRoom}>
                        🚀 Buat Ruangan Grup Sekarang
                    </button>
                </div>

                <div className={styles.operationConfigBlockCard} style={{alignSelf: 'flex-start'}}>
                    <div className={styles.titleIconRowHeader}>
                        <div className={styles.iconCircleHolder} style={{backgroundColor:'rgba(16,185,129,0.1)', color:'#10b981'}}><FaRightToBracket /></div>
                        <h3>Gabung Sesi Grup Teman</h3>
                    </div>
                    
                    <div className={styles.formElementFieldGroup}>
                        <label>Masukkan Kode Unik Grup:</label>
                        <input className={styles.modernTextInputBoxStyle} type="text" placeholder="Contoh: GRPX92" maxLength={6} value={inputRoomCode} onChange={(e) => setInputRoomCode(e.target.value)} />
                    </div>

                    <button className={styles.primaryTriggerExecutionBtn} style={{backgroundColor:'#10b981'}} onClick={handleJoinGroupRoomByCode}>
                        <FaRightToBracket /> Bergabung Sekarang
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LobbyGroupPage;
