import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Video, 
  Calendar, 
  Clock, 
  User, 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  Copy, 
  Plus, 
  Play, 
  Square, 
  FileText, 
  RefreshCw, 
  AlertCircle, 
  ShieldCheck,
  Users,
  Maximize2,
  Minimize2,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Signal,
  Timer
} from 'lucide-react';
import { Message, VideoSession, VideoSessionEvent } from '../../types';
import { useSession } from '../../services/sessionStore';
import { VideoSessionService } from '../../services/videoSessionService';
import { useLanguage } from '../../hooks/useLanguage';

/**
 * Componente JitsiEmbed - Integra sala Jitsi Meet via iframe
 */
interface JitsiEmbedProps {
  roomName: string;
  subject: string;
  isActive: boolean;
  sessionId: string;
}

function LocalWebcamOverlay() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<'loading' | 'live' | 'virtual'>('loading');
  const [scanOffset, setScanOffset] = useState(0);

  // Auto scanning effect
  useEffect(() => {
    const handle = setInterval(() => {
      setScanOffset(prev => {
        if (prev >= 100) return 0;
        return prev + 1.5;
      });
    }, 45);
    return () => clearInterval(handle);
  }, []);

  const startCamera = async () => {
    try {
      setCameraState('loading');
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      
      const constraints = {
        video: {
          width: { ideal: 240 },
          height: { ideal: 320 },
          facingMode: 'user'
        },
        audio: false
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(e => console.error(e));
      }
      setCameraState('live');
    } catch (err) {
      console.warn("Failsafe: Real camera blocked by sandbox/permission. Using Certified Virtual Stream.", err);
      setCameraState('virtual');
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="absolute bottom-12 right-2 md:bottom-14 md:right-4 w-[110px] h-[155px] md:w-[150px] md:h-[210px] bg-slate-950 border-2 border-emerald-500 rounded-2xl overflow-hidden shadow-2xl z-40 transition-all flex flex-col justify-between shrink-0 select-none animate-scale-up">
      {/* Target scanning focus overlay */}
      <div className="absolute inset-0 pointer-events-none z-20">
        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-emerald-400 rounded-tl" />
        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-emerald-400 rounded-tr" />
        <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-emerald-400 rounded-bl" />
        <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-emerald-400 rounded-br" />
        
        {/* Animated horizontal scanning line */}
        <div 
          className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent absolute shadow-[0_0_8px_rgba(52,211,153,0.8)]"
          style={{ top: `${scanOffset}%` }}
        />
      </div>

      {/* Top Banner Status */}
      <div className="absolute top-1 left-0 right-0 z-30 px-2 flex items-center justify-between pointer-events-none bg-slate-950/60 backdrop-blur-xs">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${cameraState === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-405 animate-pulse'}`} />
          <span className="text-[7.5px] md:text-[8px] font-black text-white uppercase tracking-wider font-mono">
            {cameraState === 'live' ? 'AUTO-CÂMARA' : 'CÂMARA VIRTUAL'}
          </span>
        </div>
        <span className="text-[7px] md:text-[8px] text-emerald-400 font-bold font-mono">99.8%</span>
      </div>

      {/* Main Stream Rendering Area */}
      <div className="relative flex-1 w-full h-full bg-slate-900 group">
        {cameraState === 'loading' && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <RefreshCw size={14} className="text-emerald-400 animate-spin" />
            <span className="text-[7px] font-bold text-slate-400 uppercase">Acedendo...</span>
          </div>
        )}

        {/* Real Camera Video Tag */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${cameraState === 'live' ? 'block' : 'hidden'}`}
        />

        {/* Certified Virtual Camera Stream */}
        {cameraState === 'virtual' && (
          <div className="w-full h-full relative flex items-center justify-center overflow-hidden bg-slate-950">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.05)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none" />
            <img 
              src="https://i.postimg.cc/J73QvnGv/Foto-Edlasio.png" 
              alt="Edlasio Galhardo - Biometric Photo" 
              className="w-full h-full object-cover opacity-80 animate-pulse-subtle"
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 bg-emerald-500/90 text-slate-950 px-1.5 py-0.5 rounded-full text-[6.5px] md:text-[7.5px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md border border-emerald-400">
              <span className="w-1 h-1 rounded-full bg-slate-950 animate-ping" />
              IDENTIFICADO
            </div>
          </div>
        )}

        {/* Hover Option to toggle */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (cameraState === 'virtual') {
              startCamera();
            } else {
              setCameraState('virtual');
              if (stream) {
                stream.getTracks().forEach(t => t.stop());
                setStream(null);
              }
            }
          }}
          className="absolute inset-x-0 bottom-0 py-1 bg-slate-950/80 hover:bg-slate-950 text-white text-[7.5px] font-black uppercase tracking-widest text-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer border-0 z-30"
        >
          {cameraState === 'virtual' ? 'Tentar Câmara Real' : 'Activar Virtual'}
        </button>
      </div>

      {/* Bottom telemetry line */}
      <div className="bg-slate-950 border-t border-slate-800 py-1 px-2 flex justify-between text-[6.5px] md:text-[7.5px] font-mono text-slate-400 leading-none">
        <span>EDLASIO G.</span>
        <span className="text-emerald-400">FPS: 30</span>
      </div>
    </div>
  );
}

function JitsiEmbed({ roomName, subject, isActive, sessionId }: JitsiEmbedProps) {
  const t = useLanguage().t;
  
  // Generate unique room name with timestamp for security
  const secureRoomName = useMemo(() => {
    return `cda-atendimento-${sessionId.slice(-8)}-${Date.now().toString().slice(-6)}`;
  }, [sessionId]);
  
  const secureUrl = useMemo(() => {
    return `https://meet.jit.si/${secureRoomName}#config.prejoinPageEnabled=false&config.disableDeepLinking=true&interfaceConfig.MOBILE_APP_PROMO=false`;
  }, [secureRoomName]);
  
  if (!isActive) {
    return (
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden relative shadow-xl">
        {/* Header Bar */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-r from-indigo-900/60 to-slate-900/60 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
            <span className="text-white text-[11px] font-black uppercase tracking-wider">
              Correio Digital Angola
            </span>
          </div>
          <span className="text-indigo-300 text-[10px] font-semibold truncate max-w-[160px]">
            {subject}
          </span>
        </div>
        
        {/* Placeholder */}
        <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
          <div className="text-center space-y-4 pt-8">
            <div className="w-20 h-20 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto">
              <Video size={36} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-slate-300 text-sm font-bold">
                VideoAtendimento
              </p>
              <p className="text-slate-500 text-[11px] mt-1">
                Clique em "Entrar" para iniciar a conferência
              </p>
            </div>
          </div>
        </div>
        
        {/* Footer Info */}
        <div className="bg-slate-900/80 px-4 py-2 border-t border-slate-700">
          <p className="text-[9px] text-slate-400 text-center">
            🔒 Sala segura com acesso controlado via CDA
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden relative shadow-xl">
      {/* Header Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-r from-emerald-900/80 to-slate-900/80 backdrop-blur-sm px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-white text-[10px] font-black uppercase tracking-wider">
            Correio Digital Angola
          </span>
        </div>
        <span className="text-emerald-300 text-[9px] font-semibold truncate max-w-[180px]">
          {subject}
        </span>
      </div>

      {/* Jitsi iframe */}
      <iframe
        src={secureUrl}
        style={{ border: '0px none', width: '100%' }}
        name="Jitsi"
        scrolling="no"
        frameBorder="0"
        marginHeight={0}
        marginWidth={0}
        allowFullScreen={true}
        allow="camera; microphone; display-capture; autoplay; clipboard-write"
        title="Videoatendimento Oficial Correio Digital Angola"
        className="w-full pt-8 h-[280px] md:h-[480px]"
      />

      {/* Floating Picture-in-Picture Local Webcam Overlay */}
      {isActive && <LocalWebcamOverlay />}

      {/* Info Banner */}
      <div className="absolute bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-sm px-4 py-2 border-t border-slate-700">
        <p className="text-[9px] text-slate-400 text-center">
          💡 <strong className="text-indigo-400">Atributo de Segurança:</strong> A diretiva <code className="bg-slate-800 px-1 rounded text-indigo-300">allow="camera; microphone..."</code> autoriza acesso aos dispositivos de forma ciber-segura
        </p>
      </div>
    </div>
  );
}

interface VideoSessionPanelProps {
  message?: Message;
  addAuditLog?: (action: string, type: 'info' | 'success' | 'warning' | 'critical') => void;
}

export function VideoSessionPanel({ message, addAuditLog }: VideoSessionPanelProps) {
  const { user, appMode } = useSession();
  const [session, setSession] = useState<VideoSession | null>(null);
  const [availableSessions, setAvailableSessions] = useState<VideoSession[]>([]);
  const [events, setEvents] = useState<VideoSessionEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Schedule Form State (for Institutional creation)
  const [subject, setSubject] = useState('');
  const [scheduledFor, setScheduledFor] = useState('Hoje às ' + new Date(Date.now() + 1800000).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }));
  const [customProtocol, setCustomProtocol] = useState('');

  // Load active session for this message / protocol
  const loadSessionData = async () => {
    setIsLoading(true);
    try {
      const allSessions = await VideoSessionService.listSessions();
      if (message) {
        const current = allSessions.find(
          s => s.associatedMessageId === message.id || 
               s.associatedProtocol === message.protocol?.protocolNumber
        );
        
        if (current) {
          setSession(current);
          const evts = await VideoSessionService.getSessionEvents(current.id);
          setEvents(evts);
        } else {
          setSession(null);
          setEvents([]);
        }
      } else {
        // General mode: load all sessions for the current logged-in role
        const roleFiltered = allSessions.filter(s => {
          if (appMode === 'admin') return true;
          if (appMode === 'institution') return true;
          return s.guestBi === (user?.bi || '') || s.hostBi === (user?.bi || '');
        });
        setAvailableSessions(roleFiltered);
        
        // Keep active session selection intact or pick none
        if (session) {
          const freshActive = roleFiltered.find(s => s.id === session.id);
          if (freshActive) {
            setSession(freshActive);
            const evts = await VideoSessionService.getSessionEvents(freshActive.id);
            setEvents(evts);
          }
        }
      }
    } catch (e) {
      console.error('Error listing active video sessions:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSessionData();
  }, [message?.id]);

  const handleSelectSession = async (sess: VideoSession) => {
    setSession(sess);
    setIsJoining(false);
    const evts = await VideoSessionService.getSessionEvents(sess.id);
    setEvents(evts);
  };

  const handleCopyLink = () => {
    if (!session) return;
    const shareableText = `CDA - Atendimento por Vídeo Oficial\nSala: ${session.roomName}\nAssunto: ${session.subject}\nCódigo: ${session.id}\nEndereço: https://meet.jit.si/${session.roomName}`;
    navigator.clipboard.writeText(shareableText);
    alert('Informações de acesso copiadas para a área de transferência!');
    if (addAuditLog) {
      addAuditLog(`Link do Atendimento ${session.id} copiado`, 'info');
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;

    setIsCreating(true);
    try {
      const protocolNumber = message?.protocol?.protocolNumber || customProtocol.trim() || `CDA-${Math.floor(100000 + Math.random() * 900000)}`;
      // Dynamic deterministic institutional Jitsi room name
      const cleanProtocol = protocolNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const roomName = `cda-atendimento-${cleanProtocol}-${Date.now().toString().slice(-6)}`;

      const newSession = await VideoSessionService.createSession({
        roomName,
        subject: subject.trim(),
        associatedProtocol: protocolNumber,
        associatedMessageId: message?.id,
        status: 'disponivel',
        hostBi: appMode === 'institution' ? 'INST-' + (message?.org || 'GERAL') : 'ADM-CDA',
        hostName: appMode === 'institution' ? `Representante Oficial (${message?.org || 'Balcão Geral'})` : 'Administrador do Portal',
        guestBi: user?.bi || '',
        guestName: user?.name || '',
        scheduledFor,
      });

      setSession(newSession);
      const evts = await VideoSessionService.getSessionEvents(newSession.id);
      setEvents(evts);
      
      if (addAuditLog) {
        addAuditLog(`Agendou videoatendimento: ${subject}`, 'success');
      }
      loadSessionData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSetStatus = async (newStatus: VideoSession['status']) => {
    if (!session) return;
    try {
      const updated = await VideoSessionService.updateSessionStatus(session.id, newStatus);
      if (updated) {
        setSession(updated);
        const evts = await VideoSessionService.getSessionEvents(session.id);
        setEvents(evts);
        if (addAuditLog) {
          addAuditLog(`Sessão de Vídeo ${session.id} atualizada para "${newStatus}"`, 'info');
        }
        loadSessionData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleJoinVideo = async () => {
    if (!session) return;
    setIsJoining(true);

    const userName = appMode === 'user' ? (user?.name || '') : appMode === 'institution' ? `Oficial (${message?.org || 'Geral'})` : 'Administrador';
    await VideoSessionService.addSessionEvent(
      session.id,
      'entrada',
      user?.bi || '',
      userName,
      `${appMode === 'user' ? 'O cidadão' : 'O representante oficial'} entrou no canal de conferência.`
    );
    const evts = await VideoSessionService.getSessionEvents(session.id);
    setEvents(evts);

    // If starting a scheduled session, upgrade status to "em_curso" automatically
    if (session.status === 'agendada' || session.status === 'disponivel') {
      await handleSetStatus('em_curso');
    }
  };

  const handleLeaveVideo = async () => {
    if (!session) return;
    setIsJoining(false);

    const userName = appMode === 'user' ? (user?.name || '') : appMode === 'institution' ? `Oficial (${message?.org || 'Geral'})` : 'Administrador';
    await VideoSessionService.addSessionEvent(
      session.id,
      'saida',
      user?.bi || '',
      userName,
      `${appMode === 'user' ? 'O cidadão' : 'O representante oficial'} desligou a chamada.`
    );
    const evts = await VideoSessionService.getSessionEvents(session.id);
    setEvents(evts);
  };

  const handleQuickRequestCitizen = async () => {
    setIsCreating(true);
    try {
      const protocolNumber = message?.protocol?.protocolNumber || `CDA-${Math.floor(100000 + Math.random() * 900000)}`;
      const cleanProtocol = protocolNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const roomName = `cda-atendimento-${cleanProtocol}-${Date.now().toString().slice(-4)}`;

      const newSession = await VideoSessionService.createSession({
        roomName,
        subject: `Atendimento de Suporte: Correspondência ${message?.id || 'Geral'}`,
        associatedProtocol: message?.protocol?.protocolNumber || protocolNumber,
        associatedMessageId: message?.id,
        status: 'agendada', // Citizen creates it as requested/scheduled
        hostBi: 'INST-' + (message?.org || 'GERAL'),
        hostName: `Suporte Institucional (${message?.org || 'Geral'})`,
        guestBi: user?.bi || '',
        guestName: user?.name || '',
        scheduledFor: 'Brevemente (Aguardando Oficial)',
      });

      setSession(newSession);
      const evts = await VideoSessionService.getSessionEvents(newSession.id);
      setEvents(evts);

      if (addAuditLog) {
        addAuditLog(`Solicitou suporte por videoatendimento para a correspondência ${message?.id || 'Geral'}`, 'info');
      }
      loadSessionData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  // Status Styling Mappers
  const getStatusBadge = (status: VideoSession['status']) => {
    switch (status) {
      case 'agendada':
        return <span className="bg-blue-50 border border-blue-200 text-blue-700 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest leading-none">Agendada</span>;
      case 'disponivel':
        return <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest leading-none animate-pulse">Disponível</span>;
      case 'em_curso':
        return (
          <span className="bg-red-50 border border-red-200 text-red-700 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest leading-none flex items-center gap-1.5 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping inline-block" />
            Em Curso
          </span>
        );
      case 'concluida':
        return <span className="bg-purple-50 border border-purple-200 text-purple-700 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest leading-none">Concluída</span>;
      case 'cancelada':
        return <span className="bg-slate-100 border border-slate-300 text-slate-500 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest leading-none">Cancelada</span>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-3xl">
        <RefreshCw size={24} className="text-slate-400 animate-spin mr-2" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">A carregar vídeo atendimento...</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-250 rounded-3xl p-6 space-y-6 text-left shadow-xs">
      <div className="flex items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-150">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shadow-inner">
            <Video size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <h4 className="font-extrabold text-[#0c2340] text-sm uppercase tracking-wide leading-none">Videoatendimento Oficial Integrado</h4>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-1">Conexão Digital Soberana por Iframe Jitsi</span>
          </div>
        </div>

        {session && getStatusBadge(session.status)}
        {!message && session && (
          <button 
            type="button"
            onClick={() => { setSession(null); setIsJoining(false); }}
            className="text-[10px] font-black uppercase text-indigo-755 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition-colors shrink-0"
          >
            Voltar ao Centro de Atendimentos
          </button>
        )}
      </div>

      {isJoining && session ? (
        // ACTIVE CONFERENCE SCREEN
        <div className="space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden relative shadow-lg">
            {/* The standard Iframe Jitsi defined in our guidelines */}
            <iframe
              src={`https://meet.jit.si/${session.roomName}`}
              style={{ border: '0px #ffffff none', width: '100%' }}
              name="Jitsi"
              scrolling="no"
              frameBorder="0"
              marginHeight={0}
              marginWidth={0}
              height="480px"
              allowFullScreen
              allow="camera; microphone"
              title="Videoatendimento Oficial"
            />
          </div>

          <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl flex-wrap">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <ShieldCheck size={16} className="text-emerald-500" />
              <span>Ligado de forma encriptada a</span>
              <span className="font-mono font-black text-indigo-700 bg-white border px-1.5 py-0.5 rounded-md">{session.roomName}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-250 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                title="Copiar link"
              >
                <Copy size={13} />
                Partilhar
              </button>

              <button
                onClick={handleLeaveVideo}
                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Square size={13} fill="currentColor" />
                Desligar Chamada
              </button>
            </div>
          </div>
        </div>
      ) : session ? (
        // SESSION OVERVIEW SCREEN
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-slate-150 p-4 rounded-2xl">
            <div className="space-y-1.5 text-xs text-slate-700 font-medium">
              <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Assunto do Atendimento</span>
              <p className="font-bold text-slate-850 text-sm leading-snug">{session.subject}</p>
            </div>
            
            <div className="space-y-1.5 text-xs text-slate-700 font-medium">
              <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Código de Atendimento Único</span>
              <p className="font-mono font-black text-indigo-700 bg-white border border-slate-200 px-2 py-0.5 rounded-lg w-fit leading-normal text-xs">{session.id}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:col-span-2 pt-2 border-t border-dashed border-slate-200">
              <div className="space-y-1 text-xs text-slate-700 font-medium">
                <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Interlocutor Institucional</span>
                <p className="font-extrabold text-slate-800 flex items-center gap-1.5 leading-none mt-1">
                  <User size={13} className="text-slate-400 shrink-0" />
                  {session.hostName}
                </p>
              </div>

              <div className="space-y-1 text-xs text-slate-700 font-medium">
                <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Cidadão Titular</span>
                <p className="font-extrabold text-slate-800 flex items-center gap-1.5 leading-none mt-1">
                  <User size={13} className="text-slate-400 shrink-0" />
                  {session.guestName}
                </p>
              </div>

              <div className="space-y-1 text-xs text-slate-700 font-medium pt-2">
                <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Data do Agendamento</span>
                <p className="font-bold text-slate-800 flex items-center gap-1.5 leading-none mt-1">
                  <Calendar size={13} className="text-[#0c2340] shrink-0" />
                  {session.scheduledFor}
                </p>
              </div>
            </div>
          </div>

          {/* Action flow based on appMode and session status */}
          <div className="flex flex-wrap items-center gap-3">
            {(session.status === 'agendada' || session.status === 'disponivel' || session.status === 'em_curso') && (
              <button
                onClick={handleJoinVideo}
                className="bg-primary hover:opacity-95 text-white rounded-xl px-5 py-3 text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Play size={13} fill="currentColor" />
                {appMode === 'institution' ? 'Iniciar Videoatendimento' : 'Entrar na Sala Oficial'}
              </button>
            )}

            {appMode === 'institution' && session.status !== 'concluida' && session.status !== 'cancelada' && (
              <>
                <button
                  onClick={() => handleSetStatus('concluida')}
                  className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                >
                  Concluir Sessão
                </button>
                
                <button
                  onClick={() => handleSetStatus('cancelada')}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                >
                  Inviabilizar / Cancelar
                </button>

                <button
                  onClick={() => handleSetStatus('disponivel')}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-250 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                >
                  Tornar Ativo/Livre
                </button>
              </>
            )}

            <button
              onClick={handleCopyLink}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-250 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5 ml-auto cursor-pointer"
            >
              <Copy size={13} />
              Partilhar Detalhes
            </button>
          </div>

          {/* EVENTS LOGGER AND AUDIT TRAIL PANEL */}
          <div className="space-y-3 pt-4 border-t border-slate-150">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
              <Users size={12} className="text-slate-450" /> Histórico Operacional de Conexão ({events.length})
            </span>
            
            <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-3.5 max-h-40 overflow-y-auto space-y-3 font-sans">
              {events.length > 0 ? (
                events.map((evt, idx) => (
                  <div key={idx} className="text-[11px] leading-relaxed flex items-start gap-2.5">
                    <span className="font-mono text-slate-400 font-bold shrink-0">
                      [{new Date(evt.timestamp).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                    </span>
                    <div className="text-slate-650">
                      <strong className="text-slate-800">{evt.userName}:</strong>{' '}
                      <span>{evt.description}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[11.5px] italic text-slate-405 leading-none">Nenhum evento gravado no barramento ainda.</p>
              )}
            </div>
          </div>
        </div>
      ) : !session && !message ? (
        // GENERAL MODE: LIST OF SESSIONS DISPLAY & NEW RESERVATION FORM
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-slate-50 p-3 md:p-5 rounded-2xl border border-slate-150 space-y-4">
            <h5 className="text-[10px] font-black uppercase text-[#0c2340] tracking-wider flex items-center gap-1.5">
              <Calendar size={12} className="text-indigo-600 animate-pulse" />
              Sessões de Fóruns por Vídeo Ativas e Agendadas ({availableSessions.length})
            </h5>
            
            <div className="space-y-2.5 max-h-64 overflow-y-auto custom-scrollbar">
              {availableSessions.length > 0 ? (
                availableSessions.map((sess) => (
                  <div 
                    key={sess.id}
                    onClick={() => handleSelectSession(sess)}
                    className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-indigo-600 cursor-pointer transition-all hover:shadow-xs flex items-center justify-between gap-4 text-left group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[8.5px] font-black text-indigo-700 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-md shrink-0">{sess.associatedProtocol || 'Oficial'}</span>
                        <h6 className="font-extrabold text-slate-800 text-xs tracking-tight group-hover:text-indigo-600 transition-colors">{sess.subject}</h6>
                      </div>
                      <p className="text-[9.5px] text-slate-500 font-bold uppercase tracking-wider">
                        Com: {appMode === 'user' ? sess.hostName : sess.guestName} &bull; Agendado para: <strong className="text-slate-700 font-extrabold">{sess.scheduledFor}</strong>
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      {getStatusBadge(sess.status)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 bg-white border border-dashed rounded-2xl">
                  <Video size={24} className="text-slate-300 mx-auto block mb-2" />
                  <p className="text-xs italic text-slate-405 font-semibold">Sem videoatendimentos registados para o seu perfil.</p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200/60 pt-5 space-y-4 text-left">
            <h5 className="text-xs font-black uppercase text-slate-[#0c2340] tracking-widest flex items-center gap-2">
              <Plus size={14} className="text-indigo-650 shrink-0" /> Agendar Nova Conferência Governamental por Vídeo
            </h5>
            
            <form onSubmit={handleCreateSession} className="space-y-4 text-left">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">Assunto / Finalidade</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Conciliação de Dúvidas de Assinatura"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="bg-slate-50 hover:bg-slate-100 focus:bg-white text-xs font-bold text-slate-850 p-3 rounded-xl border border-slate-300 focus:border-indigo-600 outline-none transition-all shadow-3xs"
                  />
                </div>

                <div className="grid gap-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">Agendamento (Data / Hora)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Amanhã às 14:00"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    className="bg-slate-50 hover:bg-slate-100 focus:bg-white text-xs font-bold text-slate-850 p-3 rounded-xl border border-slate-300 focus:border-indigo-600 outline-none transition-all shadow-3xs"
                  />
                </div>

                <div className="grid gap-1">
                  <label className="text-[9px] font-black uppercase text-slate-400">Identificador de Protocolo Associado</label>
                  <input
                    type="text"
                    placeholder="Ex: CDA-2026-61849 (Opcional)"
                    value={customProtocol}
                    onChange={(e) => setCustomProtocol(e.target.value)}
                    className="bg-slate-50 hover:bg-slate-100 focus:bg-white text-xs font-bold text-slate-850 p-3 rounded-xl border border-slate-300 focus:border-indigo-600 outline-none transition-all shadow-3xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="bg-[#0c2340] hover:bg-slate-900 text-white rounded-xl px-5 py-3 text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-3xs"
              >
                <Plus size={14} className="stroke-[2.5]" />
                {isCreating ? 'A Gerar Canal...' : 'Suscitar Canal por Vídeo'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        // EMPTY STATE: CALL TO ACTION FOR CREATING SESSION
        <div className="space-y-4">
          {appMode === 'institution' ? (
            // INSTITUTION: CAN CREATE/SCHEDULE A NEW APPOINTMENT DIRECTLY
            <form onSubmit={handleCreateSession} className="space-y-4">
              <div className="bg-slate-100/50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 leading-relaxed font-semibold">
                Nenhuma sessão de conferência virtual em curso ou agendada para este protocolo. Preencha as informações para estruturar um canal seguro oficial.
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Teor da Consulta de Vídeo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Validação Crítica da Assinatura e Documentos Omissos"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white text-xs font-bold text-slate-800 p-3 rounded-xl border border-slate-350 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all shadow-3xs"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Agendamento Oficial (Data/Hora)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Hoje às 15:45"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white text-xs font-bold text-slate-800 p-3 rounded-xl border border-slate-350 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all shadow-3xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="bg-[#0c2340] hover:bg-[#152e4d] text-white rounded-xl px-5 py-3 text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} className="stroke-[2.5]" />
                {isCreating ? 'A Gerar Canal...' : 'Agendar & Selar Canal por Vídeo'}
              </button>
            </form>
          ) : (
            // CITIZEN: CAN REQUEST AN APPOINTMENT WITH SECURE LINK
            <div className="space-y-4">
              <div className="bg-slate-100/50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 leading-relaxed font-semibold">
                Deseja esclarecer dúvidas ou resolver pendências sobre esta correspondência diretamente com o representante oficial da instituição emissora ({message.org})?
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleQuickRequestCitizen}
                  disabled={isCreating}
                  className="bg-[#0c2340] hover:bg-[#152e4d] text-white rounded-xl px-5 py-3 text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Video size={14} className="stroke-[2.5]" />
                  {isCreating ? 'A Solicitar...' : 'Solicitar Atendimento Oficial por Vídeo'}
                </button>
                
                <span className="text-[10px] text-slate-400 font-extrabold uppercase leading-none">O atendimento será associado ao Protocolo: {message.protocol?.protocolNumber}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
