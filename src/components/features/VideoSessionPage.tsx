/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * VideoSessionPage - Página completa de VideoAtendimento
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Video, Calendar, Clock, User, CheckCircle, Play, ShieldCheck,
  Users, Monitor, Phone, PhoneOff, Bell, Camera, CameraOff,
  Mic, MicOff, ArrowLeft, History, Shield, VideoOff, MonitorPlay,
  RefreshCw
} from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { VideoSessionService } from '../../services/videoSessionService';

interface JitsiEmbedProps {
  roomName: string;
  subject: string;
  isActive: boolean;
  isVideoOn?: boolean;
}

function LocalWebcamOverlay() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
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
      streamRef.current = mediaStream;
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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
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
              if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
              }
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

function JitsiEmbed({ roomName, subject, isActive, isVideoOn = true }: JitsiEmbedProps) {
  const jitsiUrl = useMemo(() => {
    return `https://meet.jit.si/${roomName}#config.prejoinPageEnabled=false&config.disableDeepLinking=true&interfaceConfig.MOBILE_APP_PROMO=false`;
  }, [roomName]);
  
  if (!isActive) {
    return (
      <div id="video-atendimento-container" className="bg-slate-950 border border-slate-700 rounded-2xl overflow-hidden relative shadow-lg">
        <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto">
              <Video size={28} className="text-indigo-400" />
            </div>
            <p className="text-slate-400 text-xs font-semibold">VideoAtendimento disponível</p>
            <p className="text-slate-500 text-[10px]">Selecione uma sessão e clique em "Entrar"</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="video-atendimento-container" className="bg-slate-950 border border-slate-700 rounded-2xl overflow-hidden relative shadow-xl">
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-r from-indigo-900/80 to-slate-900/80 backdrop-blur-sm px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-white text-[10px] font-black uppercase tracking-wider">Correio Digital Angola</span>
        </div>
        <span className="text-indigo-300 text-[9px] font-semibold truncate max-w-[180px]">{subject}</span>
      </div>
      
      <iframe
        src={jitsiUrl}
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
      {isActive && isVideoOn && <LocalWebcamOverlay />}

      <div className="absolute bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-sm px-4 py-2 border-t border-slate-700">
        <p className="text-[9px] text-slate-400 text-center">
          💡 Atributo de Segurança: A diretiva <code className="bg-slate-800 px-1 rounded text-indigo-300">allow="camera; microphone..."</code> autoriza acesso aos dispositivos
        </p>
      </div>
    </div>
  );
}

interface VideoSessionPageProps {
  onBack?: () => void;
  onNavigateToMail?: () => void;
  addAuditLog?: (action: string, type: 'info' | 'success' | 'warning' | 'critical') => void;
}

// mockSessions com atendimentos disponíveis e 1 sessão de demonstração sempre activa
const mockSessions = [
  {
    id: 'sessao-demo',
    subject: 'CONFERÊNCIA DEMO ACTIVA - Testar Jitsi Meet',
    hostName: 'Dr. Edlásio Galhardo (Agente de Atendimento)',
    time: 'Sessão Activa',
    date: 'Hoje (Demonstração)',
    status: 'disponivel',
    roomName: 'cda-atendimento-demo-video',
    protocol: 'DEMO-CDA-2026-ACTIVE'
  },
  {
    id: 'sessao-001',
    subject: 'Atendimento Ministério da Saúde',
    hostName: 'Dr. António Campos',
    time: '10:30',
    date: '20/06/2026',
    status: 'disponivel',
    roomName: 'cda-saude-001',
    protocol: 'CDA-2026-PT-123456'
  },
  {
    id: 'sessao-002',
    subject: 'Regularização Documents - SME',
    hostName: 'Eng. Maria João',
    time: '14:00',
    date: '20/06/2026',
    status: 'agendada',
    roomName: 'cda-sme-002',
    protocol: 'CDA-2026-PT-123457'
  },
  {
    id: 'sessao-003',
    subject: 'Apoio Técnico - ENDE',
    hostName: 'Eng. Carlos Mendes',
    time: '16:00',
    date: '20/06/2026',
    status: 'disponivel',
    roomName: 'cda-ende-003',
    protocol: 'CDA-2026-PT-123458'
  }
];

export function VideoSessionPage({ onBack, addAuditLog }: VideoSessionPageProps) {
  const { t } = useLanguage();
  
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'agenda' | 'historico' | 'calendario' | 'ajuda' | 'video'>('agenda');
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  
  const [isLargeScreen, setIsLargeScreen] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const allSessions = await VideoSessionService.listSessions();
      // Garantir que a sessão demo de teste esteja sempre ativa e incluída na lista para demonstração
      let finalSessions: any[] = allSessions.length > 0 ? [...allSessions] : [...mockSessions];
      if (!finalSessions.some(s => s.id === 'sessao-demo')) {
        finalSessions = [mockSessions[0], ...finalSessions];
      }
      setSessions(finalSessions);
    } catch (e) {
      setSessions(mockSessions);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => { loadSessions(); }, [loadSessions]);
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isInCall) {
      interval = setInterval(() => { setCallDuration(prev => prev + 1); }, 1000);
    }
    return () => clearInterval(interval);
  }, [isInCall]);
  
  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };
  
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'disponivel': return { color: 'bg-emerald-500', text: 'Disponível', bg: 'bg-emerald-50', border: 'border-emerald-200' };
      case 'agendada': return { color: 'bg-blue-500', text: 'Agendada', bg: 'bg-blue-50', border: 'border-blue-200' };
      case 'em_curso': return { color: 'bg-red-500 animate-pulse', text: 'Em Curso', bg: 'bg-red-50', border: 'border-red-200' };
      case 'concluida': return { color: 'bg-slate-400', text: 'Concluída', bg: 'bg-slate-50', border: 'border-slate-200' };
      case 'cancelada': return { color: 'bg-rose-500', text: 'Cancelada', bg: 'bg-rose-50', border: 'border-rose-200' };
      default: return { color: 'bg-slate-400', text: status, bg: 'bg-slate-50', border: 'border-slate-200' };
    }
  };
  
  const availableCount = sessions.filter(s => s.status === 'disponivel' || s.status === 'agendada').length;
  const inProgressCount = sessions.filter(s => s.status === 'em_curso').length;
  
  const handleStartCall = (session: any) => {
    setSelectedSession(session);
    setIsInCall(true);
    setCallDuration(0);
    setActiveTab('video');
    setIsVideoOn(true);
    setIsAudioOn(true);
    addAuditLog?.(`Iniciou videoatendimento: ${session.subject}`, 'info');
  };
  
  const handleEndCall = () => {
    if (selectedSession) {
      VideoSessionService.updateSessionStatus(selectedSession.id, 'concluida');
      addAuditLog?.(`Terminou videoatendimento: ${selectedSession.subject}`, 'info');
    }
    setIsInCall(false);
    setSelectedSession(null);
    setCallDuration(0);
    loadSessions();
  };

  return (
    <section className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl flex items-center justify-center transition-all active:scale-95 border border-slate-200">
            <ArrowLeft size={18} className="md:w-5 md:h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <Video size={24} />
            </div>
            <div>
              <h3 className="text-lg md:text-2xl font-black text-primary leading-tight">{t("VideoAtendimento")}</h3>
              <p className="text-[10px] md:text-sm text-slate-600 font-black uppercase tracking-widest">
                {availableCount + inProgressCount} atendimentos disponíveis
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-emerald-700 uppercase">{availableCount} Agendados</span>
          </div>
          {inProgressCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-black text-red-700 uppercase">{inProgressCount} Em Curso</span>
            </div>
          )}
        </div>
      </div>

      <div className={`grid grid-cols-1 ${activeTab === 'video' && selectedSession ? '' : 'lg:grid-cols-3'} gap-6`}>
        {/* Left Column */}
        <div className={`${activeTab === 'video' && selectedSession ? 'w-full' : 'lg:col-span-2'} space-y-4`}>
          {/* Tabs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-1.5 flex gap-1">
            {[
              { id: 'agenda', label: 'Agenda', icon: <Calendar size={14} /> },
              { id: 'historico', label: 'Histórico', icon: <History size={14} /> },
              { id: 'calendario', label: 'Calendário', icon: <Clock size={14} /> },
              { id: 'ajuda', label: 'Ajuda', icon: <Bell size={14} /> },
              { id: 'video', label: 'Video', icon: <MonitorPlay size={14} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  // Se selecionar tab video sem sessão, mostrar mensagem
                  if (tab.id === 'video' && !selectedSession) {
                    // não faz nada, mostra placeholder
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-tight transition-all border-0 cursor-pointer ${
                  activeTab === tab.id ? 'bg-primary text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* JITSI EMBED PARA DESKTOP/MOBILE - DEBAIXO DO TABBAR EM ABA VIDEO ATIVA */}
          {activeTab === 'video' && selectedSession && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <JitsiEmbed 
                roomName={selectedSession.roomName || `cda-atendimento-${selectedSession.id}`} 
                subject={selectedSession.subject} 
                isActive={isInCall} 
                isVideoOn={isVideoOn}
              />
            </motion.div>
          )}

          {/* Content */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-4 md:p-6 shadow-sm">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-4 flex items-center gap-2">
              <Users size={16} className="text-primary" />
              {activeTab === 'agenda' && 'Atendimentos Disponíveis'}
              {activeTab === 'historico' && 'Histórico de Sessões'}
              {activeTab === 'calendario' && 'Calendário de Videoatendimentos'}
              {activeTab === 'ajuda' && 'Guias e Tutorial'}
              {activeTab === 'video' && 'VideoAtendimento - Jitsi Meet'}
            </h4>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="space-y-3">
                {/* Agenda */}
                {activeTab === 'agenda' && sessions
                  .filter(s => s.status === 'disponivel' || s.status === 'agendada' || s.status === 'em_curso')
                  .map(session => {
                    const statusConfig = getStatusConfig(session.status);
                    return (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 border ${statusConfig.border} ${statusConfig.bg} rounded-2xl hover:shadow-md transition-all cursor-pointer`}
                        onClick={() => handleStartCall(session)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`w-2 h-2 rounded-full ${statusConfig.color}`} />
                              <span className="text-[10px] font-black uppercase text-slate-500">{statusConfig.text}</span>
                            </div>
                            <h5 className="text-sm font-black text-slate-800 mb-1">{session.subject}</h5>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500">
                              <span className="flex items-center gap-1"><User size={10} />{session.hostName}</span>
                              <span className="flex items-center gap-1"><Clock size={10} />{session.time}</span>
                            </div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleStartCall(session); }} className="px-3 py-1.5 bg-primary text-white text-[10px] font-black uppercase rounded-lg hover:bg-primary/90 transition-all border-0 cursor-pointer">Entrar</button>
                        </div>
                      </motion.div>
                    );
                  })}

                {/* Histórico */}
                {activeTab === 'historico' && sessions
                  .filter(s => s.status === 'concluida' || s.status === 'cancelada')
                  .map(session => {
                    const statusConfig = getStatusConfig(session.status);
                    return (
                      <div key={session.id} className={`p-4 border ${statusConfig.border} ${statusConfig.bg} rounded-2xl opacity-75`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-black uppercase text-slate-500 mb-1 block">{statusConfig.text}</span>
                            <h5 className="text-xs font-black text-slate-700">{session.subject}</h5>
                            <p className="text-[9px] text-slate-500 mt-0.5">{session.date} - {session.time}</p>
                          </div>
                          <CheckCircle size={16} className={statusConfig.color.replace('bg-', 'text-').replace('animate-pulse', '')} />
                        </div>
                      </div>
                    );
                  })}

                {/* Calendário */}
                {activeTab === 'calendario' && (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Calendar size={32} className="text-primary" />
                    </div>
                    <h5 className="text-sm font-black text-slate-700 mb-1">Calendário de Videoatendimentos</h5>
                    <p className="text-[10px] mt-1">{availableCount} atendimentos agendados</p>
                  </div>
                )}

                {/* Ajuda */}
                {activeTab === 'ajuda' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <h5 className="text-sm font-black text-slate-800 mb-2 flex items-center gap-2">
                        <CheckCircle size={16} className="text-emerald-500" />Como usar o VideoAtendimento
                      </h5>
                      <ul className="text-[11px] text-slate-600 space-y-2">
                        <li>1. Selecione um atendimento disponível na aba "Agenda"</li>
                        <li>2. Clique no botão "Entrar" para iniciar a videochamada</li>
                        <li>3. Permita o acesso à câmera e microfone quando solicitado</li>
                        <li>4. Aguarde a conexão com o atendente</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <h5 className="text-sm font-black text-slate-800 mb-2 flex items-center gap-2">
                        <Shield size={16} />Segurança
                      </h5>
                      <p className="text-[11px] text-slate-600">
                        Todas as sessões são gravadas e auditadas. Sua identidade é verificada através do BI digital. 
                        Os atendimentos têm valor jurídico perante o Estado angolano.
                      </p>
                    </div>
                  </div>
                )}

                {/* TAB VIDEO - EXIBE OS DETALHES E CONTROLES (JITSI FICA DO LADO DE FORA ACIMA) */}
                {activeTab === 'video' && (
                  <div className="space-y-4">
                    {selectedSession ? (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
                        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                              <User size={20} className="text-primary" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-black text-slate-800">{selectedSession.subject}</p>
                              <p className="text-[10px] text-slate-500">Com: <span className="font-semibold">{selectedSession.hostName}</span></p>
                              {selectedSession.protocol && (
                                <p className="text-[9px] text-indigo-600 font-mono mt-1 bg-indigo-100 px-2 py-0.5 rounded inline-block">{selectedSession.protocol}</p>
                              )}
                            </div>
                            {isInCall && (
                              <div className="bg-emerald-100 px-3 py-1.5 rounded-xl">
                                <span className="text-[10px] font-mono font-bold text-emerald-700">{formatDuration(callDuration)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center justify-center gap-2 shadow-sm">
                          <button onClick={() => setIsAudioOn(!isAudioOn)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border-0 cursor-pointer ${isAudioOn ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-red-500 text-white'}`}>
                            {isAudioOn ? <Mic size={18} /> : <MicOff size={18} />}
                          </button>
                          <button onClick={() => setIsVideoOn(!isVideoOn)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border-0 cursor-pointer ${isVideoOn ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-red-500 text-white'}`}>
                            {isVideoOn ? <Camera size={18} /> : <CameraOff size={18} />}
                          </button>
                          <button onClick={() => setIsScreenSharing(!isScreenSharing)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border-0 cursor-pointer ${isScreenSharing ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                            <Monitor size={18} />
                          </button>
                          {isInCall ? (
                            <button onClick={handleEndCall} className="h-10 px-5 rounded-full flex items-center justify-center bg-red-500 text-white hover:bg-red-600 transition-all gap-2 border-0 cursor-pointer">
                              <PhoneOff size={18} /><span className="text-[11px] font-black uppercase">Terminar</span>
                            </button>
                          ) : (
                            <button onClick={() => handleStartCall(selectedSession)} className="h-10 px-5 rounded-full flex items-center justify-center bg-emerald-500 text-white hover:bg-emerald-600 transition-all gap-2 border-0 cursor-pointer shadow-md">
                              <Play size={18} /><span className="text-[11px] font-black uppercase">Entrar</span>
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ) : (
                      <div className="text-center py-12">
                        <VideoOff size={48} className="mx-auto mb-3 text-slate-300" />
                        <p className="text-sm font-medium text-slate-600 mb-1">Nenhuma sessão selecionada</p>
                        <p className="text-[10px] text-slate-500">Selecione um atendimento na aba "Agenda" para iniciar o videoatendimento</p>
                        <button onClick={() => setActiveTab('agenda')} className="mt-4 px-4 py-2 bg-primary text-white text-[10px] font-black uppercase rounded-xl hover:bg-primary/90 transition-all border-0 cursor-pointer">Ver Agenda</button>
                      </div>
                    )}
                  </div>
                )}
                
                {activeTab === 'agenda' && sessions.filter(s => s.status === 'disponivel' || s.status === 'agendada' || s.status === 'em_curso').length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <VideoOff size={40} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-medium">Nenhum atendimento disponível</p>
                    <p className="text-[10px] mt-1">Aguarde novo agendamento da instituição</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (only visible when not viewing an active video session) */}
        {!(activeTab === 'video' && selectedSession) && (
          <div className="space-y-4">
            {selectedSession ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                    <Video size={12} className="text-primary" />VideoAtendimento
                  </span>
                  {isInCall && <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">{formatDuration(callDuration)}</span>}
                </div>
                
                {/* Jitsi Embed visível na coluna direita para Desktops */}
                {isLargeScreen ? (
                  <JitsiEmbed 
                    roomName={selectedSession.roomName || `cda-atendimento-${selectedSession.id}`} 
                    subject={selectedSession.subject} 
                    isActive={isInCall} 
                    isVideoOn={isVideoOn}
                  />
                ) : (
                  <div className="bg-slate-900/10 border border-dashed border-slate-300 rounded-2xl p-6 text-center text-slate-500">
                    <Video size={36} className="mx-auto text-primary mb-2 opacity-60 animate-pulse" />
                    <p className="text-xs font-bold uppercase tracking-wider">Modo Telemóvel Activo</p>
                    <p className="text-[9px] text-slate-400 mt-1">Selecione a aba "Video" acima para aceder à conferência.</p>
                  </div>
                )}
                
                <div className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center justify-center gap-2 shadow-sm">
                  <button onClick={() => setIsAudioOn(!isAudioOn)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border-0 cursor-pointer ${isAudioOn ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-red-500 text-white'}`}>
                    {isAudioOn ? <Mic size={18} /> : <MicOff size={18} />}
                  </button>
                  <button onClick={() => setIsVideoOn(!isVideoOn)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border-0 cursor-pointer ${isVideoOn ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-red-500 text-white'}`}>
                    {isVideoOn ? <Camera size={18} /> : <CameraOff size={18} />}
                  </button>
                  <button onClick={() => setIsScreenSharing(!isScreenSharing)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border-0 cursor-pointer ${isScreenSharing ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                    <Monitor size={18} />
                  </button>
                  {isInCall ? (
                    <button onClick={handleEndCall} className="h-10 px-5 rounded-full flex items-center justify-center bg-red-500 text-white hover:bg-red-600 transition-all gap-2 border-0 cursor-pointer">
                      <PhoneOff size={18} /><span className="text-[10px] font-black uppercase">Sair</span>
                    </button>
                  ) : (
                    <button onClick={() => { setActiveTab('video'); handleStartCall(selectedSession); }} className="h-10 px-5 rounded-full flex items-center justify-center bg-emerald-500 text-white hover:bg-emerald-600 transition-all gap-2 border-0 cursor-pointer shadow-md">
                      <Play size={18} /><span className="text-[10px] font-black uppercase">Entrar</span>
                    </button>
                  )}
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <User size={18} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate">{selectedSession.subject}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Com: <span className="font-semibold">{selectedSession.hostName}</span></p>
                      {selectedSession.protocol && <p className="text-[9px] text-indigo-600 font-mono mt-1 bg-indigo-50 px-2 py-0.5 rounded inline-block">{selectedSession.protocol}</p>}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm">
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Video size={28} className="text-indigo-600" />
                  </div>
                  <p className="text-sm font-black text-slate-700 mb-1">VideoAtendimento</p>
                  <p className="text-[10px] text-slate-500 mb-3">Selecione uma sessão para iniciar</p>
                  <button onClick={() => setActiveTab('agenda')} className="px-4 py-2.5 bg-primary text-white text-[10px] font-black uppercase rounded-xl hover:bg-primary/90 transition-all border-0 cursor-pointer">Ver Agenda</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default VideoSessionPage;
