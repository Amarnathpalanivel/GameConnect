import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { AuthContext } from "./AuthContext";

export const VoiceContext = createContext();

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export const VoiceProvider = ({ children }) => {
  const { socket, authUser } = useContext(AuthContext);

  // ── Connection & Party State ─────────────────────────────────────────────
  const [isInVoice, setIsInVoice] = useState(false);
  const [currentVoicePartyId, setCurrentVoicePartyId] = useState(null);
  const [currentVoicePartyName, setCurrentVoicePartyName] = useState(null);
  const [voiceParticipants, setVoiceParticipants] = useState([]); // [{ socketId, userId, gamerTag, profilePic, isMuted, isDeafened, isSpeaking }]
  const [partyVoiceRosters, setPartyVoiceRosters] = useState({}); // { [partyId]: { count, users: [] } }

  // ── Audio Controls State ─────────────────────────────────────────────────
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPTT, setIsPTT] = useState(false); // Push-to-Talk mode
  const [pttKey, setPttKey] = useState("Space");
  const [isPTTHeld, setIsPTTHeld] = useState(false);
  const [micLevel, setMicLevel] = useState(0); // 0 - 100 for visual meter
  const [voicePing, setVoicePing] = useState(24); // ms estimate
  const [voiceError, setVoiceError] = useState(null);
  const [userVolumes, setUserVolumes] = useState({}); // { [userId]: number (0 - 2.0) }

  // ── Refs for WebRTC & Audio Processing ───────────────────────────────────
  const localStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const speakingTimeoutRef = useRef(null);
  const peersRef = useRef(new Map()); // socketId -> RTCPeerConnection
  const audioElementsRef = useRef(new Map()); // socketId -> HTMLAudioElement

  // ═════════════════════════════════════════════════════════════════════════
  // Web Audio API: Microphone Volume & Speaking Detection
  // ═════════════════════════════════════════════════════════════════════════

  const setupAudioAnalysis = useCallback((stream, partyId) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setMicLevel(normalized);

        // Speaking threshold: avg > 12 (~ -45dB)
        const speakingNow = avg > 12 && !isMuted && !isDeafened;

        if (speakingNow) {
          if (speakingTimeoutRef.current) {
            clearTimeout(speakingTimeoutRef.current);
            speakingTimeoutRef.current = null;
          }
          setIsSpeaking((prev) => {
            if (!prev) {
              socket?.emit("voice_speaking", { partyId, isSpeaking: true });
            }
            return true;
          });
        } else {
          if (!speakingTimeoutRef.current) {
            speakingTimeoutRef.current = setTimeout(() => {
              setIsSpeaking((prev) => {
                if (prev) {
                  socket?.emit("voice_speaking", { partyId, isSpeaking: false });
                }
                return false;
              });
              speakingTimeoutRef.current = null;
            }, 350);
          }
        }

        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err) {
      console.warn("AudioContext setup warning:", err);
    }
  }, [isMuted, isDeafened, socket]);

  const teardownAudioAnalysis = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current);
      speakingTimeoutRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setMicLevel(0);
    setIsSpeaking(false);
  }, []);

  // ═════════════════════════════════════════════════════════════════════════
  // WebRTC Peer Connection Helper
  // ═════════════════════════════════════════════════════════════════════════

  const createPeerConnection = useCallback((targetSocketId, targetUserId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // ICE candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("voice_signal", {
          toSocketId: targetSocketId,
          signal: { candidate: event.candidate },
        });
      }
    };

    // Remote audio track handler
    pc.ontrack = (event) => {
      let audioEl = audioElementsRef.current.get(targetSocketId);
      if (!audioEl) {
        audioEl = new Audio();
        audioEl.autoplay = true;
        audioEl.playsInline = true;
        audioElementsRef.current.set(targetSocketId, audioEl);
      }
      audioEl.srcObject = event.streams[0];
      const vol = userVolumes[targetUserId] !== undefined ? userVolumes[targetUserId] : 1.0;
      audioEl.volume = isDeafened ? 0 : Math.min(Math.max(vol, 0), 1.0);
      audioEl.play().catch((e) => console.warn("Remote audio play notice:", e));
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        pc.close();
        peersRef.current.delete(targetSocketId);
      }
    };

    peersRef.current.set(targetSocketId, pc);
    return pc;
  }, [socket, isDeafened, userVolumes]);

  // ═════════════════════════════════════════════════════════════════════════
  // Join Voice Channel
  // ═════════════════════════════════════════════════════════════════════════

  const joinVoice = async (partyId, partyName = "Party Voice") => {
    if (!partyId) return;
    if (isInVoice && currentVoicePartyId === partyId) {
      toast("Already connected to this voice channel", { icon: "🎧" });
      return;
    }

    // Leave existing voice room if connected to another party
    if (isInVoice) {
      await leaveVoice();
    }

    try {
      setVoiceError(null);

      // Acquire microphone stream
      let stream = null;
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: false,
          });
        } catch (mediaErr) {
          console.warn("Microphone access unavailable or declined:", mediaErr.message);
          toast.error("Microphone access declined. Joining in listen-only mode.", { duration: 4000 });
        }
      }

      localStreamRef.current = stream;

      // Apply initial mute state
      if (stream) {
        stream.getAudioTracks().forEach((t) => {
          t.enabled = !isMuted && (!isPTT || isPTTHeld);
        });
        setupAudioAnalysis(stream, partyId);
      }

      setIsInVoice(true);
      setCurrentVoicePartyId(partyId);
      setCurrentVoicePartyName(partyName);

      // Emit join event to server
      socket?.emit("voice_join", {
        partyId,
        gamerTag: authUser?.gamerTag || authUser?.fullName || "Gamer",
        profilePic: authUser?.profilePic || "",
      });

      // Simulate ping measurement
      setVoicePing(Math.floor(18 + Math.random() * 15));
      toast.success(`Connected to voice: ${partyName}`, { icon: "🎙️" });
    } catch (err) {
      console.error("joinVoice error:", err);
      setVoiceError(err.message);
      toast.error("Failed to connect to voice channel");
    }
  };

  // ═════════════════════════════════════════════════════════════════════════
  // Leave Voice Channel
  // ═════════════════════════════════════════════════════════════════════════

  const leaveVoice = useCallback(async () => {
    if (!isInVoice && !currentVoicePartyId) return;

    const pId = currentVoicePartyId;

    // Stop local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Teardown Web Audio analysis
    teardownAudioAnalysis();

    // Close all peer connections
    peersRef.current.forEach((pc) => {
      try {
        pc.close();
      } catch {}
    });
    peersRef.current.clear();

    // Remove remote audio elements
    audioElementsRef.current.forEach((el) => {
      try {
        el.pause();
        el.srcObject = null;
      } catch {}
    });
    audioElementsRef.current.clear();

    // Notify server
    if (pId && socket) {
      socket.emit("voice_leave", { partyId: pId });
    }

    setIsInVoice(false);
    setCurrentVoicePartyId(null);
    setCurrentVoicePartyName(null);
    setVoiceParticipants([]);
    setIsSpeaking(false);
    toast("Disconnected from voice channel", { icon: "📞" });
  }, [isInVoice, currentVoicePartyId, socket, teardownAudioAnalysis]);

  // ═════════════════════════════════════════════════════════════════════════
  // Audio Controls: Mute, Deafen, PTT, Volume
  // ═════════════════════════════════════════════════════════════════════════

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !nextMuted;
      });
    }

    if (currentVoicePartyId && socket) {
      socket.emit("voice_state", {
        partyId: currentVoicePartyId,
        isMuted: nextMuted,
        isDeafened,
      });
    }

    toast(nextMuted ? "Microphone Muted" : "Microphone Active", {
      icon: nextMuted ? "🔇" : "🎙️",
      duration: 1500,
    });
  };

  const toggleDeafen = () => {
    const nextDeafened = !isDeafened;
    setIsDeafened(nextDeafened);

    // When deafened, mute all incoming audio
    audioElementsRef.current.forEach((el) => {
      el.volume = nextDeafened ? 0 : 1.0;
    });

    // Also mute own microphone when deafened
    if (nextDeafened) {
      setIsMuted(true);
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => {
          t.enabled = false;
        });
      }
    }

    if (currentVoicePartyId && socket) {
      socket.emit("voice_state", {
        partyId: currentVoicePartyId,
        isMuted: nextDeafened ? true : isMuted,
        isDeafened: nextDeafened,
      });
    }

    toast(nextDeafened ? "Deafened (Audio & Mic Muted)" : "Undeafened", {
      icon: nextDeafened ? "🎧" : "🔊",
      duration: 1500,
    });
  };

  const togglePTT = () => {
    const nextPTT = !isPTT;
    setIsPTT(nextPTT);

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = nextPTT ? false : !isMuted;
      });
    }

    toast(nextPTT ? "Push-to-Talk Enabled (Hold Space)" : "Voice Activity Detection Active", {
      icon: nextPTT ? "🔘" : "🎙️",
      duration: 2000,
    });
  };

  const setParticipantVolume = (userId, vol) => {
    const clamped = Math.max(0, Math.min(2.0, vol));
    setUserVolumes((prev) => ({ ...prev, [userId]: clamped }));

    // Update audio element if peer socket matches
    const peerUser = voiceParticipants.find((p) => p.userId === userId);
    if (peerUser && audioElementsRef.current.has(peerUser.socketId)) {
      const el = audioElementsRef.current.get(peerUser.socketId);
      if (el && !isDeafened) {
        el.volume = Math.min(clamped, 1.0);
      }
    }
  };

  // ═════════════════════════════════════════════════════════════════════════
  // Push-to-Talk Key Listener
  // ═════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!isInVoice || !isPTT) return;

    const handleKeyDown = (e) => {
      if (e.code === pttKey && !isPTTHeld && !isMuted && !isDeafened) {
        // Prevent default spacebar scrolling
        if (e.code === "Space" && e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
          e.preventDefault();
        }
        setIsPTTHeld(true);
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = true));
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === pttKey && isPTTHeld) {
        setIsPTTHeld(false);
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isInVoice, isPTT, pttKey, isPTTHeld, isMuted, isDeafened]);

  // ═════════════════════════════════════════════════════════════════════════
  // Socket.io Event Listeners for Voice
  // ═════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!socket) return;

    // 1. Existing participants in voice channel when we join
    const handleVoiceRoomUsers = async ({ partyId, users }) => {
      setVoiceParticipants(users || []);

      // Initiate WebRTC offers to all existing peers
      for (const peer of users || []) {
        try {
          const pc = createPeerConnection(peer.socketId, peer.userId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit("voice_signal", {
            toSocketId: peer.socketId,
            signal: { type: "offer", sdp: pc.localDescription },
          });
        } catch (err) {
          console.warn("Peer connection offer error:", err);
        }
      }
    };

    // 2. New user joined the voice room
    const handleVoiceUserJoined = (newUser) => {
      setVoiceParticipants((prev) => {
        if (prev.some((p) => p.socketId === newUser.socketId)) return prev;
        return [...prev, newUser];
      });
      toast(`${newUser.gamerTag} joined voice`, { icon: "🎧", duration: 2500 });
    };

    // 3. WebRTC signaling relay (offer, answer, candidate)
    const handleVoiceSignal = async ({ fromSocketId, fromUserId, signal }) => {
      try {
        let pc = peersRef.current.get(fromSocketId);

        if (signal.type === "offer") {
          if (!pc) {
            pc = createPeerConnection(fromSocketId, fromUserId);
          }
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit("voice_signal", {
            toSocketId: fromSocketId,
            signal: { type: "answer", sdp: pc.localDescription },
          });
        } else if (signal.type === "answer") {
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          }
        } else if (signal.candidate) {
          if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
        }
      } catch (err) {
        console.warn("Voice signal handling notice:", err);
      }
    };

    // 4. Remote user mute/deafen state changed
    const handleVoiceUserState = ({ userId, isMuted: m, isDeafened: d }) => {
      setVoiceParticipants((prev) =>
        prev.map((p) => (p.userId === userId ? { ...p, isMuted: m, isDeafened: d } : p))
      );
    };

    // 5. Remote user speaking indicator changed
    const handleVoiceSpeakingChange = ({ userId, isSpeaking: sp }) => {
      setVoiceParticipants((prev) =>
        prev.map((p) => (p.userId === userId ? { ...p, isSpeaking: sp } : p))
      );
    };

    // 6. User left voice channel
    const handleVoiceUserLeft = ({ userId, socketId }) => {
      // Close peer connection
      if (peersRef.current.has(socketId)) {
        peersRef.current.get(socketId).close();
        peersRef.current.delete(socketId);
      }
      // Remove audio element
      if (audioElementsRef.current.has(socketId)) {
        audioElementsRef.current.get(socketId).pause();
        audioElementsRef.current.delete(socketId);
      }
      setVoiceParticipants((prev) => prev.filter((p) => p.socketId !== socketId && p.userId !== userId));
    };

    // 7. Global party voice roster update (for counter badges in party lists & headers)
    const handleVoiceRosterUpdate = ({ partyId, count, users }) => {
      setPartyVoiceRosters((prev) => ({
        ...prev,
        [partyId]: { count, users: users || [] },
      }));
    };

    socket.on("voice_room_users", handleVoiceRoomUsers);
    socket.on("voice_user_joined", handleVoiceUserJoined);
    socket.on("voice_signal", handleVoiceSignal);
    socket.on("voice_user_state", handleVoiceUserState);
    socket.on("voice_speaking_change", handleVoiceSpeakingChange);
    socket.on("voice_user_left", handleVoiceUserLeft);
    socket.on("voice_roster_update", handleVoiceRosterUpdate);

    return () => {
      socket.off("voice_room_users", handleVoiceRoomUsers);
      socket.off("voice_user_joined", handleVoiceUserJoined);
      socket.off("voice_signal", handleVoiceSignal);
      socket.off("voice_user_state", handleVoiceUserState);
      socket.off("voice_speaking_change", handleVoiceSpeakingChange);
      socket.off("voice_user_left", handleVoiceUserLeft);
      socket.off("voice_roster_update", handleVoiceRosterUpdate);
    };
  }, [socket, createPeerConnection]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      teardownAudioAnalysis();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      peersRef.current.forEach((pc) => pc.close());
      audioElementsRef.current.forEach((el) => el.pause());
    };
  }, [teardownAudioAnalysis]);

  const value = {
    isInVoice,
    currentVoicePartyId,
    currentVoicePartyName,
    voiceParticipants,
    partyVoiceRosters,
    isMuted,
    isDeafened,
    isSpeaking,
    isPTT,
    pttKey,
    setPttKey,
    isPTTHeld,
    micLevel,
    voicePing,
    voiceError,
    userVolumes,
    joinVoice,
    leaveVoice,
    toggleMute,
    toggleDeafen,
    togglePTT,
    setParticipantVolume,
  };

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
};
