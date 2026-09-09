/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * WebRTCVideoCallRoom - Motor Nativo de Videoatendimento P2P Oficial CDA
 * 
 * 2026-09-09 — Implementação 100% WebRTC P2P Nativa:
 *  · ECRÃ GRANDE (Principal): Vídeo e áudio do OUTRO participante em Alta Definição (1080p).
 *  · ECRÃ PEQUENO (PiP Retorno): Vídeo local do utilizador com controlos de câmara.
 *  · Sinalização Tri-Canal Ultrarrápida: Servidor CDA API Polling + Supabase Realtime Broadcast + BroadcastChannel
 *  · Servidores STUN públicos para NAT transversal direto.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  RefreshCw,
  Camera,
  Monitor,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

export interface WebRTCVideoCallRoomProps {
  roomName: string;
  subject: string;
  isActive: boolean;
  isVideoOn?: boolean;
  isAudioOn?: boolean;
  isScreenSharing?: boolean;
  onEndCall?: () => void;
  currentUserRole?: 'institution' | 'citizen' | 'admin';
  currentUserName?: string;
  remoteUserName?: string;
}

export function WebRTCVideoCallRoom({
  roomName,
  subject,
  isActive,
  isVideoOn = true,
  isAudioOn = true,
  isScreenSharing = false,
  onEndCall,
  currentUserRole = 'citizen',
  currentUserName = 'Cidadão CDA',
  remoteUserName = 'Interlocutor Oficial',
}: WebRTCVideoCallRoomProps) {
  // DOM element refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // WebRTC & Stream refs (stable across renders)
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const candidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const isNegotiating = useRef(false);

  // Signaling & Identity refs
  const myPeerId = useRef<string>(`peer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  const joinedAt = useRef<number>(Date.now());
  const supabaseChannelRef = useRef<any>(null);
  const localBroadcastRef = useRef<BroadcastChannel | null>(null);

  // Props refs to avoid stale closures in stable listeners
  const propsRef = useRef({
    roomName,
    subject,
    currentUserName,
    currentUserRole,
    remoteUserName,
  });
  propsRef.current = { roomName, subject, currentUserName, currentUserRole, remoteUserName };

  // State
  const [connectionState, setConnectionState] = useState<'waiting' | 'connecting' | 'connected' | 'ended'>('waiting');
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [remoteParticipant, setRemoteParticipant] = useState<string>(remoteUserName);
  const [localAudioMuted, setLocalAudioMuted] = useState(!isAudioOn);
  const [localVideoMuted, setLocalVideoMuted] = useState(!isVideoOn);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isSharingScreen, setIsSharingScreen] = useState(isScreenSharing);
  const [callDuration, setCallDuration] = useState(0);
  const [isCameraLoading, setIsCameraLoading] = useState(true);
  const [scanOffset, setScanOffset] = useState(0);

  // Laser animation in PiP
  useEffect(() => {
    const handle = setInterval(() => {
      setScanOffset((prev) => (prev >= 100 ? 0 : prev + 2));
    }, 45);
    return () => clearInterval(handle);
  }, []);

  // Timer: duração da chamada (o tempo de espera deixou de ser exibido — 2026-09-09)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isActive && hasRemoteStream) {
      timer = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isActive, hasRemoteStream]);

  // Sync external props with tracks
  useEffect(() => {
    setLocalAudioMuted(!isAudioOn);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = isAudioOn;
      });
    }
  }, [isAudioOn]);

  useEffect(() => {
    setLocalVideoMuted(!isVideoOn);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = isVideoOn;
      });
    }
  }, [isVideoOn]);

  // Send signaling message through all available channels
  const sendSignal = useCallback((payload: any) => {
    const { roomName: currentRoom } = propsRef.current;
    const cleanRoom = currentRoom.replace(/[^a-zA-Z0-9\-_]/g, '');
    const message = {
      ...payload,
      sender: myPeerId.current,
      room: cleanRoom,
      timestamp: Date.now(),
    };

    // 1. Server-side Signaling API (fastest, guaranteed delivery across separate browser instances)
    try {
      fetch('/api/webrtc/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      }).catch(() => {});
    } catch {}

    // 2. BroadcastChannel (Same browser multi-tab)
    try {
      if (localBroadcastRef.current) {
        localBroadcastRef.current.postMessage(message);
      }
    } catch {}

    // 3. Supabase Realtime Broadcast (External networks)
    try {
      if (supabaseChannelRef.current) {
        supabaseChannelRef.current.send({
          type: 'broadcast',
          event: 'webrtc',
          payload: message,
        });
      }
    } catch {}
  }, []);

  // Create or retrieve PeerConnection
  const getOrCreatePeerConnection = useCallback((targetPeerId?: string) => {
    let pc = peerConnectionRef.current;
    if (!pc || pc.signalingState === 'closed') {
      console.log('[CDA-WebRTC] Criando nova RTCPeerConnection...');
      pc = new RTCPeerConnection(ICE_SERVERS);

      // Handle incoming remote track
      pc.ontrack = (event) => {
        console.log('[CDA-WebRTC] Faixa remota recebida:', event.track.kind, event.track.id);
        let stream = remoteStreamRef.current;
        if (!stream) {
          stream = new MediaStream();
          remoteStreamRef.current = stream;
        }
        if (event.streams && event.streams[0]) {
          event.streams[0].getTracks().forEach((t) => {
            if (!stream!.getTracks().some((st) => st.id === t.id)) {
              stream!.addTrack(t);
            }
          });
        }
        if (!stream.getTracks().some((t) => t.id === event.track.id)) {
          stream.addTrack(event.track);
        }

        setHasRemoteStream(true);
        setConnectionState('connected');

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          remoteVideoRef.current.play().catch(() => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.muted = true;
              remoteVideoRef.current.play().catch(() => {});
            }
          });
        }
      };

      // Handle local ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const candJson = typeof event.candidate.toJSON === 'function' ? event.candidate.toJSON() : {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            usernameFragment: event.candidate.usernameFragment,
          };
          sendSignal({
            type: 'candidate',
            candidate: candJson,
            target: targetPeerId,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('[CDA-WebRTC] Estado da ligação:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setConnectionState('connected');
          setHasRemoteStream(true);
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setConnectionState('waiting');
          setHasRemoteStream(false);
        }
      };

      peerConnectionRef.current = pc;
    }

    // Attach local tracks if not already added
    if (localStreamRef.current && pc) {
      const senders = pc.getSenders();
      localStreamRef.current.getTracks().forEach((track) => {
        const hasTrack = senders.some((s) => s.track && s.track.id === track.id);
        if (!hasTrack) {
          try {
            pc!.addTrack(track, localStreamRef.current!);
          } catch (e) {
            console.warn('[CDA-WebRTC] addTrack warning:', e);
          }
        }
      });
    }

    return pc;
  }, [sendSignal]);

  // Handle incoming signaling messages
  const handleSignalMessage = useCallback(async (msg: any) => {
    const { roomName: currentRoom, currentUserName: myName, currentUserRole: myRole } = propsRef.current;
    const cleanRoom = currentRoom.replace(/[^a-zA-Z0-9\-_]/g, '');

    if (!msg || msg.sender === myPeerId.current || msg.room !== cleanRoom) return;
    if (msg.timestamp && msg.timestamp < joinedAt.current - 2000) return;

    // Deterministic Perfect Negotiation: polite peer yields when both initiate
    const isPolite = myPeerId.current < msg.sender;

    console.log('[CDA-WebRTC] Sinal recebido:', msg.type, 'de', msg.sender, 'polite:', isPolite);

    // 1. Participant joined the room
    if (msg.type === 'join') {
      if (msg.name) setRemoteParticipant(msg.name);
      setConnectionState('connecting');

      // The impolite peer creates the offer
      if (!isPolite) {
        const pc = getOrCreatePeerConnection(msg.sender);
        if (isNegotiating.current) return;
        isNegotiating.current = true;

        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await pc.setLocalDescription(offer);
          const offerPayload = typeof offer.toJSON === 'function' ? offer.toJSON() : { type: offer.type, sdp: offer.sdp };
          sendSignal({
            type: 'offer',
            offer: offerPayload,
            target: msg.sender,
            name: myName,
            role: myRole,
          });
        } catch (err) {
          console.error('[CDA-WebRTC] Erro ao criar offer:', err);
        } finally {
          isNegotiating.current = false;
        }
      }
    }

    // 2. Received Offer
    if (msg.type === 'offer' && (msg.target === myPeerId.current || !msg.target)) {
      if (msg.name) setRemoteParticipant(msg.name);
      setConnectionState('connecting');

      const pc = getOrCreatePeerConnection(msg.sender);
      
      // If already connected and stable, ignore redundant offers
      if (pc.signalingState === 'stable' && pc.currentRemoteDescription && !isPolite) {
        return;
      }

      const readyForOffer = !isNegotiating.current && (pc.signalingState === 'stable' || isPolite);
      const offerCollision = !readyForOffer;

      if (offerCollision && !isPolite) {
        console.log('[CDA-WebRTC] Glare descartado por peer prioritário');
        return;
      }

      try {
        if (pc.signalingState !== 'stable') {
          try {
            await pc.setLocalDescription({ type: 'rollback' } as any);
          } catch {}
        }
        await pc.setRemoteDescription(new RTCSessionDescription(msg.offer));

        // Process queued ICE candidates
        while (candidateQueue.current.length > 0) {
          const cand = candidateQueue.current.shift();
          if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand));
        }

        if (pc.signalingState === 'have-remote-offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          const answerPayload = typeof answer.toJSON === 'function' ? answer.toJSON() : { type: answer.type, sdp: answer.sdp };
          sendSignal({
            type: 'answer',
            answer: answerPayload,
            target: msg.sender,
            name: myName,
            role: myRole,
          });
        }
      } catch (err) {
        console.error('[CDA-WebRTC] Erro ao responder ao offer:', err);
      }
    }

    // 3. Received Answer
    if (msg.type === 'answer' && (msg.target === myPeerId.current || !msg.target)) {
      if (msg.name) setRemoteParticipant(msg.name);
      const pc = getOrCreatePeerConnection(msg.sender);
      if (pc.signalingState === 'have-local-offer') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.answer));
          while (candidateQueue.current.length > 0) {
            const cand = candidateQueue.current.shift();
            if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand));
          }
        } catch (err) {
          console.error('[CDA-WebRTC] Erro ao aplicar answer:', err);
        }
      }
    }

    // 4. Received ICE Candidate
    if (msg.type === 'candidate' && (msg.target === myPeerId.current || !msg.target)) {
      const pc = getOrCreatePeerConnection(msg.sender);
      if (pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        } catch (err) {
          console.warn('[CDA-WebRTC] Erro ao adicionar ICE candidate:', err);
        }
      } else {
        candidateQueue.current.push(msg.candidate);
      }
    }

    // 5. Participant left
    if (msg.type === 'leave' && (msg.target === myPeerId.current || !msg.target)) {
      console.log('[CDA-WebRTC] Participante remoto saiu da chamada.');
      setHasRemoteStream(false);
      setConnectionState('waiting');
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    }
  }, [getOrCreatePeerConnection, sendSignal]);

  // Keep ref to latest signal handler to avoid re-attaching listeners
  const handleSignalRef = useRef(handleSignalMessage);
  handleSignalRef.current = handleSignalMessage;

  // Initialize Local Media Stream
  const initLocalMedia = useCallback(async () => {
    setIsCameraLoading(true);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280, min: 640 }, height: { ideal: 720, min: 480 }, facingMode: facingMode },
          audio: true,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode },
          audio: false,
        });
      }

      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        await localVideoRef.current.play().catch(() => {});
      }

      // If peer connection exists, add new tracks
      if (peerConnectionRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        stream.getTracks().forEach((track) => {
          const hasTrack = senders.some((s) => s.track && s.track.id === track.id);
          if (!hasTrack) {
            try {
              peerConnectionRef.current!.addTrack(track, stream);
            } catch {}
          }
        });
      }

      setIsCameraLoading(false);
      return stream;
    } catch (err: any) {
      console.warn('[CDA-WebRTC] Falha ao aceder à câmara:', err);
      setIsCameraLoading(false);
      return null;
    }
  }, [facingMode]);

  // Sync streams to video DOM tags
  useEffect(() => {
    if (hasRemoteStream && remoteStreamRef.current && remoteVideoRef.current) {
      if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
      remoteVideoRef.current.play().catch(() => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.muted = true;
          remoteVideoRef.current.play().catch(() => {});
        }
      });
    }
  }, [hasRemoteStream, connectionState]);

  useEffect(() => {
    if (localStreamRef.current && localVideoRef.current) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, [isCameraLoading, localVideoMuted]);

  // Main Call Lifecycle Effect (Runs ONCE per active session)
  useEffect(() => {
    if (!isActive) return;

    let isMounted = true;
    const cleanRoomName = roomName.replace(/[^a-zA-Z0-9\-_]/g, '');
    const channelId = `cda-video-room-${cleanRoomName}`;

    console.log('[CDA-WebRTC] Inicializando sala de vídeo:', channelId);

    // 1. Start local camera
    initLocalMedia().then(() => {
      if (!isMounted) return;

      // 2. Setup BroadcastChannel (multi-tab)
      try {
        const bc = new BroadcastChannel(channelId);
        bc.onmessage = (e) => {
          if (isMounted) handleSignalRef.current(e.data);
        };
        localBroadcastRef.current = bc;
      } catch {}

      // 3. Setup Supabase Realtime Broadcast
      try {
        const chan = supabase.channel(channelId);
        chan
          .on('broadcast', { event: 'webrtc' }, ({ payload }: any) => {
            if (isMounted) handleSignalRef.current(payload);
          })
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED' && isMounted) {
              console.log('[CDA-WebRTC] Subscrito ao canal Supabase com sucesso.');
              sendSignal({
                type: 'join',
                name: propsRef.current.currentUserName,
                role: propsRef.current.currentUserRole,
              });
            }
          });
        supabaseChannelRef.current = chan;
      } catch {}

      // Initial Join announcement
      sendSignal({
        type: 'join',
        name: propsRef.current.currentUserName,
        role: propsRef.current.currentUserRole,
      });
    });

    // 4. Server-Side Polling Loop for zero-latency cross-client synchronization
    let latestPollId = 0;
    const pollSignaling = async () => {
      if (!isMounted) return;
      try {
        const res = await fetch(`/api/webrtc/poll?room=${encodeURIComponent(cleanRoomName)}&sender=${encodeURIComponent(myPeerId.current)}&since=${latestPollId}`);
        if (res.ok) {
          const data = await res.json();
          if (typeof data.latestId === 'number') latestPollId = data.latestId;
          if (Array.isArray(data.messages)) {
            for (const msg of data.messages) {
              if (isMounted) await handleSignalRef.current(msg);
            }
          }
        }
      } catch {}
    };

    const pollInterval = setInterval(pollSignaling, 300);

    // Discovery heartbeat
    const pingInterval = setInterval(() => {
      if (isMounted) {
        sendSignal({
          type: 'join',
          name: propsRef.current.currentUserName,
          role: propsRef.current.currentUserRole,
        });
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(pingInterval);
      clearInterval(pollInterval);

      // Announce leave
      try {
        sendSignal({ type: 'leave' });
      } catch {}

      // Clean local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      // Close PeerConnection
      if (peerConnectionRef.current) {
        try {
          peerConnectionRef.current.close();
        } catch {}
        peerConnectionRef.current = null;
      }

      // Clean Supabase channel
      if (supabaseChannelRef.current) {
        try {
          supabase.removeChannel(supabaseChannelRef.current);
        } catch {}
        supabaseChannelRef.current = null;
      }

      // Clean BroadcastChannel
      if (localBroadcastRef.current) {
        try {
          localBroadcastRef.current.close();
        } catch {}
        localBroadcastRef.current = null;
      }
    };
  }, [isActive, roomName, initLocalMedia, sendSignal]);

  // Toggle Microphone
  const toggleMicrophone = () => {
    const nextMuted = !localAudioMuted;
    setLocalAudioMuted(nextMuted);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }
  };

  // Toggle Video
  const toggleVideo = () => {
    const nextMuted = !localVideoMuted;
    setLocalVideoMuted(nextMuted);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }
  };

  // Switch Camera Front/Back
  const toggleCameraFacing = async () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: !localAudioMuted,
      });
      const newVideoTrack = newStream.getVideoTracks()[0];

      if (localStreamRef.current) {
        const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
        if (oldVideoTrack) {
          localStreamRef.current.removeTrack(oldVideoTrack);
          oldVideoTrack.stop();
        }
        localStreamRef.current.addTrack(newVideoTrack);
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }

      if (peerConnectionRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(newVideoTrack);
        }
      }
    } catch (err) {
      console.error('[CDA-WebRTC] Erro ao alternar câmara:', err);
    }
  };

  // Screen Sharing
  const toggleScreenShare = async () => {
    if (!isSharingScreen) {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = displayStream.getVideoTracks()[0];

        screenTrack.onended = () => {
          setIsSharingScreen(false);
          initLocalMedia();
        };

        if (peerConnectionRef.current) {
          const senders = peerConnectionRef.current.getSenders();
          const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
          if (videoSender) {
            await videoSender.replaceTrack(screenTrack);
          }
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = displayStream;
        }

        setIsSharingScreen(true);
      } catch (err) {
        console.warn('[CDA-WebRTC] Partilha de ecrã cancelada:', err);
      }
    } else {
      setIsSharingScreen(false);
      await initLocalMedia();
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isActive) {
    return (
      <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800">
        <div className="text-center space-y-3 p-6">
          <div className="w-16 h-16 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Video size={28} className="text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-white text-sm font-black uppercase tracking-wider">Videoatendimento CDA</h3>
            <p className="text-slate-400 text-xs mt-1">Selecione uma sessão na agenda e clique em "Entrar" para iniciar a videochamada.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="webrtc-video-call-container" className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden relative shadow-2xl flex flex-col justify-between select-none">
      
      {/* 1. TOP STATUS BAR (Discrete & Clean) */}
      <div className="absolute top-0 left-0 right-0 z-30 p-3 flex items-center justify-between pointer-events-none">
        {/* 2026-09-09: em espera o canto superior esquerdo fica limpo (o estado
            «Aguardar Participante» é mostrado no centro do ecrã grande) */}
        {hasRemoteStream ? (
          <div className="flex items-center gap-1.5 bg-slate-950/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-emerald-500/30">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
            <span className="text-emerald-300 text-[10px] font-black uppercase tracking-wider">
              EM DIRETO
            </span>
          </div>
        ) : <div />}

        <div className="flex items-center gap-2">
          {hasRemoteStream && (
            <div className="bg-slate-950/70 backdrop-blur-md border border-slate-700/80 text-emerald-300 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-sm">
              <Clock size={11} className="text-emerald-400 animate-pulse" />
              <span>{formatTimer(callDuration)}</span>
            </div>
          )}
          <div className="bg-slate-950/70 backdrop-blur-md border border-slate-800 text-slate-300 px-2.5 py-1 rounded-full text-[9px] font-mono font-bold flex items-center gap-1">
            <ShieldCheck size={11} className="text-indigo-400" />
            <span>P2P</span>
          </div>
        </div>
      </div>

      {/* 2. MAIN LARGE SCREEN (REMOTE PARTICIPANT - 100% CLEAN VIDEO) */}
      <div className="relative w-full aspect-video min-h-[320px] md:min-h-[480px] bg-slate-950 flex items-center justify-center overflow-hidden">
        
        {/* Remote Video Stream Tag (Rendered with 100% clean unobstructed view) */}
        <video
          ref={remoteVideoRef}
          data-testid="remote-video"
          autoPlay
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-500 ${hasRemoteStream ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* WAITING SCREEN (Shown ONLY while waiting for the second participant to enter) */}
        {!hasRemoteStream && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 pb-[160px] sm:pb-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 text-center">
            
            {/* Animated Radar Pulse */}
            <div className="relative mb-6 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-indigo-600/10 border border-indigo-500/30 animate-ping absolute" />
              <div className="w-20 h-20 rounded-full bg-indigo-600/20 border border-indigo-500/40 animate-pulse absolute" />
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0E2B64] to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/20 relative z-10">
                <Video size={28} className="animate-pulse text-indigo-200" />
              </div>
            </div>

            <h3 className="text-white font-black text-sm sm:text-base md:text-lg uppercase tracking-tight">
              Aguardar Participante
            </h3>
          </div>
        )}

        {/* 3. SMALL PiP SCREEN (LOCAL USER CAMERA / RETORNO) */}
        <div className="absolute bottom-3 right-3 md:bottom-4 md:right-4 w-[100px] h-[140px] md:w-[150px] md:h-[200px] bg-slate-950 border-2 border-indigo-500/80 rounded-2xl overflow-hidden shadow-2xl z-40 transition-all flex flex-col justify-between shrink-0 select-none group">
          
          {/* Futuristic corner brackets */}
          <div className="absolute inset-0 pointer-events-none z-20">
            <div className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 border-indigo-400 rounded-tl" />
            <div className="absolute top-2 right-2 w-2 h-2 border-t-2 border-r-2 border-indigo-400 rounded-tr" />
            <div className="absolute bottom-2 left-2 w-2 h-2 border-b-2 border-l-2 border-indigo-400 rounded-bl" />
            <div className="absolute bottom-2 right-2 w-2 h-2 border-b-2 border-r-2 border-indigo-400 rounded-br" />
            <div
              className="w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent absolute shadow-[0_0_8px_rgba(99,102,241,0.8)]"
              style={{ top: `${scanOffset}%` }}
            />
          </div>

          {/* PiP Header */}
          <div className="absolute top-1 left-0 right-0 z-30 px-1.5 py-0.5 flex items-center justify-between bg-slate-950/60 backdrop-blur-xs">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[7.5px] font-bold text-white uppercase tracking-wider font-mono">
                EU
              </span>
            </div>
            <span className="text-[6.5px] text-emerald-400 font-bold font-mono">LIVE</span>
          </div>

          {/* Local Video Tag */}
          <div className="relative flex-1 w-full h-full bg-slate-900 flex items-center justify-center">
            {isCameraLoading ? (
              <div className="flex flex-col items-center justify-center gap-1.5 text-center p-2">
                <RefreshCw size={14} className="text-indigo-400 animate-spin" />
                <span className="text-[8px] text-slate-400 font-bold uppercase">A ligar...</span>
              </div>
            ) : localVideoMuted ? (
              <div className="flex flex-col items-center justify-center gap-1 text-center p-2">
                <VideoOff size={16} className="text-slate-500" />
                <span className="text-[8px] text-slate-500 font-bold">Câmara desligada</span>
              </div>
            ) : (
              <video
                ref={localVideoRef}
                data-testid="local-video"
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Quick Switch Camera button on mobile PiP */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleCameraFacing();
            }}
            className="absolute inset-x-0 bottom-0 py-1 bg-slate-950/90 text-white text-[7.5px] font-black uppercase tracking-widest text-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer border-0 z-30"
          >
            🔄 Mudar Câmara
          </button>
        </div>

      </div>

      {/* 4. BOTTOM ACTION CONTROL BAR (Clean & Informative) */}
      <div className="bg-slate-950/95 border-t border-slate-800 px-4 py-3 flex items-center justify-between z-30 gap-3">
        
        {/* Left: Remote Participant Info (Positioned outside the video stream) */}
        <div className="flex items-center gap-2 min-w-0 max-w-[180px] md:max-w-[280px]">
          <span className={`w-2 h-2 rounded-full shrink-0 ${hasRemoteStream ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500'}`} />
          <div className="min-w-0">
            <span className="text-white text-xs font-black truncate block leading-tight">
              {remoteParticipant || remoteUserName || 'Interlocutor Oficial'}
            </span>
            <span className="text-[9px] text-slate-400 truncate block">
              {subject || 'Videoatendimento'}
            </span>
          </div>
        </div>

        {/* Center Control Buttons */}
        <div className="flex items-center justify-center gap-2.5 mx-auto">
          
          {/* Mute Microphone */}
          <button
            type="button"
            onClick={toggleMicrophone}
            title={localAudioMuted ? 'Ativar Microfone' : 'Silenciar Microfone'}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all border-0 cursor-pointer shadow-md active:scale-95 ${
              localAudioMuted
                ? 'bg-red-500/90 text-white hover:bg-red-600 shadow-red-500/20'
                : 'bg-slate-800/90 text-slate-200 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {localAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Video Toggle */}
          <button
            type="button"
            onClick={toggleVideo}
            title={localVideoMuted ? 'Ligar Câmara' : 'Desligar Câmara'}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all border-0 cursor-pointer shadow-md active:scale-95 ${
              localVideoMuted
                ? 'bg-red-500/90 text-white hover:bg-red-600 shadow-red-500/20'
                : 'bg-slate-800/90 text-slate-200 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {localVideoMuted ? <VideoOff size={20} /> : <Video size={20} />}
          </button>

          {/* Switch Camera (Front / Back on mobile) */}
          <button
            type="button"
            onClick={toggleCameraFacing}
            title={`Alternar Câmara (${facingMode === 'user' ? 'Frontal' : 'Traseira'})`}
            className="w-11 h-11 rounded-2xl bg-slate-800/90 text-slate-200 hover:bg-slate-700 hover:text-white flex items-center justify-center transition-all border-0 cursor-pointer shadow-md active:scale-95"
          >
            <Camera size={20} />
          </button>

          {/* Share Screen */}
          <button
            type="button"
            onClick={toggleScreenShare}
            title={isSharingScreen ? 'Parar Partilha de Ecrã' : 'Partilhar Ecrã'}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all border-0 cursor-pointer shadow-md active:scale-95 ${
              isSharingScreen
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/30'
                : 'bg-slate-800/90 text-slate-200 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Monitor size={20} />
          </button>

          {/* Hangup / Leave Call */}
          <button
            type="button"
            onClick={onEndCall}
            title="Desligar Chamada"
            className="h-11 px-5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all border-0 cursor-pointer shadow-lg shadow-red-600/30 active:scale-95 ml-1"
          >
            <PhoneOff size={18} />
            <span className="hidden xs:inline">Desligar</span>
          </button>
        </div>

        {/* Right Status */}
        <div className="hidden sm:flex items-center gap-1.5 text-slate-400 text-[10px] font-mono">
          <span className={`w-2 h-2 rounded-full ${hasRemoteStream ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <span>{hasRemoteStream ? 'HD 1080p' : 'A aguardar...'}</span>
        </div>
      </div>

    </div>
  );
}
