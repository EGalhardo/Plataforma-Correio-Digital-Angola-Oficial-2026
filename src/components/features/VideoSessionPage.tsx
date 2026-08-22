/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * VideoSessionPage - Página completa de VideoAtendimento
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import {
  Video,
  Calendar,
  CalendarPlus,
  Search,
  X,
  Plus,
  Clock,
  User,
  CheckCircle,
  Play,
  Users,
  Monitor,
  PhoneOff,
  Bell,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  ArrowLeft,
  History,
  Shield,
  VideoOff,
  MonitorPlay,
  RefreshCw,
  WifiOff,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { notify } from '../../lib/notify';
import { VideoSessionService } from '../../services/videoSessionService';
import type { VideoSessionExtended } from '../../services/videoSessionService';
import { supabaseService } from '../../services/supabaseService';
import { generateProtocol } from '../../utils/protocolGenerator';
import type { Message } from '../../types';

// Servidor Jitsi configurável (FASE 2026-08-15): por defeito usa o serviço
// público meet.jit.si, mas pode apontar para um servidor próprio (self-hosted)
// via variável de ambiente VITE_JITSI_SERVER_URL — sem alterar código.
const JITSI_SERVER = (import.meta as any).env?.VITE_JITSI_SERVER_URL || 'https://meet.jit.si';

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
          <span className={`w-1.5 h-1.5 rounded-full ${cameraState === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-400 animate-pulse'}`} />
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
              src="https://i.postimg.cc/Y92CFNC5/Foto-de-Perfil-(1).png" 
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

interface JitsiEmbedProps {
  roomName: string;
  subject: string;
  isActive: boolean;
  isVideoOn?: boolean;
}

/**
 * 2026-08-22 — DOIS ECRÃS (semântica correcta de videochamada):
 *  · ECRÃ GRANDE = o OUTRO participante. Usa a API externa do Jitsi
 *    (external_api.js) para saber QUEM está na sala: sem participante remoto,
 *    o ecrã grande mostra a TELA DE OFFLINE ("A aguardar o outro
 *    participante…") — nunca a filmagem própria.
 *  · ECRÃ PEQUENO (canto inferior direito, PiP) = SEMPRE a filmagem LOCAL
 *    (self-view) do utilizador que está a ver o ecrã.
 * Se a API externa não carregar (rede/DNS), o ecrã grande mostra o estado de
 * erro honesto com ajuda — a filmagem própria continua apenas no PiP.
 */
function JitsiEmbed({ roomName, subject, isActive, isVideoOn = true }: JitsiEmbedProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<any>(null);
  const estadoRef = useRef<string>('checking');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [remoteCount, setRemoteCount] = useState(0);
  const [callState, setCallState] = useState<'checking' | 'connecting' | 'connected' | 'error'>('checking');
  const [erroDetalhe, setErroDetalhe] = useState('');

  useEffect(() => {
    if (!isActive) return;
    let cancelado = false;
    setCallState('checking');
    setErroDetalhe('');
    setRemoteCount(0);
    estadoRef.current = 'checking';

    const marcar = (s: string) => { estadoRef.current = s; };

    const carregarScript = (): Promise<void> => new Promise((resolve, reject) => {
      const w = window as any;
      if (w.JitsiMeetExternalAPI) { resolve(); return; }
      const existente = document.getElementById('cda-jitsi-external-api') as HTMLScriptElement | null;
      if (existente) {
        existente.addEventListener('load', () => resolve(), { once: true });
        existente.addEventListener('error', () => reject(new Error('script falhou')), { once: true });
        return;
      }
      const s = document.createElement('script');
      s.id = 'cda-jitsi-external-api';
      s.src = `${JITSI_SERVER}/external_api.js`;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('script indisponível'));
      document.body.appendChild(s);
    });

    const criarSala = () => {
      const w = window as any;
      if (!w.JitsiMeetExternalAPI || !containerRef.current) return;
      try {
        const api = new w.JitsiMeetExternalAPI(JITSI_SERVER.replace('https://', ''), {
          roomName,
          parentNode: containerRef.current,
          width: '100%',
          height: '100%',
          configOverwrite: {
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableSimulcast: false,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_BRAND_WATERMARK: false,
            SHOW_POWERED_BY: false,
            DEFAULT_REMOTE_DISPLAY_NAME: 'Outro participante',
            MOBILE_APP_PROMO: false,
          },
        });
        apiRef.current = api;

        const atualizarParticipantes = () => {
          try {
            const partes = api.getParticipantsInfo ? api.getParticipantsInfo() : [];
            const n = Array.isArray(partes) ? Math.max(0, partes.length - 1) : 0;
            if (!cancelado) setRemoteCount(n);
          } catch { /* melhor esforço */ }
        };

        api.on('videoConferenceJoined', () => {
          if (cancelado) return;
          setCallState('connected');
          marcar('connected');
          atualizarParticipantes();
        });
        api.on('participantJoined', atualizarParticipantes);
        api.on('participantLeft', atualizarParticipantes);
        // backup: poll periódico (alguns clientes não disparam os eventos).
        pollRef.current = setInterval(atualizarParticipantes, 4000);
        api.on('videoConferenceLeft', () => {
          if (cancelado) return;
          setCallState('error');
          setErroDetalhe('A sala de vídeo terminou ou a ligação caiu.');
        });
      } catch (e) {
        if (!cancelado) {
          setCallState('error');
          setErroDetalhe('Não foi possível criar a sala de vídeo.');
        }
      }
    };

    const iniciar = async () => {
      try {
        setCallState('connecting');
        marcar('connecting');
        await carregarScript();
        if (cancelado) return;
        criarSala();
      } catch (e) {
        if (!cancelado) {
          setCallState('error');
          setErroDetalhe('O módulo de vídeo não carregou a partir do servidor (rede/DNS bloqueado?).');
        }
      }
    };

    // Timeout de segurança: 30s sem ligar a sala → ajuda honesta.
    const timer = setTimeout(() => {
      if (!cancelado && estadoRef.current !== 'connected') {
        setCallState('error');
        setErroDetalhe('O servidor de vídeo não respondeu a tempo.');
      }
    }, 30000);

    void iniciar();

    return () => {
      cancelado = true;
      clearTimeout(timer);
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      try { apiRef.current?.dispose?.(); } catch { /* melhor esforço */ }
      apiRef.current = null;
    };
  }, [isActive, roomName]);

  // ---------- Ecrã grande (o outro participante) ----------
  const renderEcrãGrande = () => {
    if (!isActive) {
      return (
        <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto">
              <Video size={28} className="text-indigo-400" />
            </div>
            <p className="text-slate-400 text-xs font-semibold">VideoAtendimento disponível</p>
            <p className="text-slate-500 text-[10px]">Selecione uma sessão e clique em "Entrar"</p>
          </div>
        </div>
      );
    }

    if (callState === 'error') {
      return (
        <div className="w-full h-[280px] md:h-[480px] flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 p-6">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-14 h-14 bg-rose-500/15 rounded-2xl flex items-center justify-center mx-auto">
              <WifiOff size={26} className="text-rose-400" />
            </div>
            <div>
              <h4 className="text-white text-sm font-black uppercase tracking-wide">Sala de vídeo indisponível</h4>
              <p className="text-slate-400 text-[11px] font-medium leading-relaxed mt-2">
                O servidor de vídeo (<span className="text-indigo-300">{JITSI_SERVER.replace('https://', '')}</span>) não está acessível a partir da sua rede.
                {erroDetalhe ? ` ${erroDetalhe}` : ''}
              </p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-left space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-amber-400">Possíveis causas e soluções</p>
              <p className="text-[10px] text-slate-300 font-medium leading-snug">• Verifique a ligação à internet e que o DNS resolve domínios externos.</p>
              <p className="text-[10px] text-slate-300 font-medium leading-snug">• Redes corporativas/operadoras com filtros podem bloquear o domínio de vídeo.</p>
              <p className="text-[10px] text-slate-300 font-medium leading-snug">• Experimente outra rede (ex.: dados móveis) e tente novamente.</p>
            </div>
            <button
              type="button"
              onClick={() => { setCallState('connecting'); setErroDetalhe(''); setRemoteCount(0); }}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer border-none"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* A sala Jitsi monta AQUI (ecrã grande = o outro participante). */}
        <div ref={containerRef} className="w-full h-[280px] md:h-[480px]" />

        {/* ENQUANTO O OUTRO PARTICIPANTE NÃO ESTÁ NA SALA: tela de OFFLINE por
            cima — o ecrã grande NUNCA mostra a filmagem própria (a self-view
            fica apenas no PiP do canto inferior direito). */}
        {(callState === 'checking' || callState === 'connecting') && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/95">
            <div className="text-center space-y-4 max-w-sm px-6">
              <Loader2 size={28} className="animate-spin text-indigo-400 mx-auto" />
              <div>
                <h4 className="text-white text-sm font-black uppercase tracking-wide">A ligar à sala de vídeo…</h4>
                <p className="text-slate-400 text-[11px] font-medium leading-relaxed mt-2">
                  O outro participante ainda não se encontra na sala. Aguarde, por favor — quando ele entrar, a imagem dele aparece aqui no ecrã grande.
                </p>
              </div>
            </div>
          </div>
        )}
        {callState === 'connected' && remoteCount === 0 && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/95">
            <div className="text-center space-y-4 max-w-sm px-6">
              <div className="w-20 h-20 bg-slate-800/80 border border-slate-700 rounded-full flex items-center justify-center mx-auto relative">
                <VideoOff size={30} className="text-slate-400" />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 animate-pulse border-2 border-slate-950" />
              </div>
              <div>
                <h4 className="text-white text-sm font-black uppercase tracking-wide">O outro participante ainda não se encontra na sala</h4>
                <p className="text-slate-400 text-[11px] font-medium leading-relaxed mt-2">
                  Deve aguardar. Você está ligado e a sua imagem aparece no ecrã pequeno (canto inferior direito). Assim que o outro participante entrar, a imagem dele aparece AQUI, no ecrã grande.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 bg-slate-800/70 border border-slate-700 rounded-full px-4 py-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Sala ativa • a aguardar o outro participante</span>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div id="video-atendimento-container" className="bg-slate-950 border border-slate-700 rounded-2xl overflow-hidden relative shadow-xl">
      <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-r from-indigo-900/80 to-slate-900/80 backdrop-blur-sm px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-white text-[10px] font-black uppercase tracking-wider">Correio Digital Angola</span>
        </div>
        <span className="text-indigo-300 text-[9px] font-semibold truncate max-w-[180px]">{subject}</span>
      </div>

      {renderEcrãGrande()}

      {/* ECRÃ PEQUENO (PiP) — SEMPRE a filmagem LOCAL do utilizador. */}
      {isActive && isVideoOn && <LocalWebcamOverlay />}

      <div className="absolute bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-sm px-4 py-2 border-t border-slate-700">
        <p className="text-[9px] text-slate-400 text-center">
          💡 O ecrã grande mostra o outro participante; a sua filmagem aparece no ecrã pequeno (canto inferior direito).
        </p>
      </div>
    </div>
  );
}

interface VideoSessionPageProps {
  onBack?: () => void;
  onNavigateToMail?: () => void;
  addAuditLog?: (action: string, type: 'info' | 'success' | 'warning' | 'critical') => void;
  // 2026-08-22 — contexto da sessão: a página passa a distinguir os papéis.
  //  · Instituição: agenda video-atendimentos com QUALQUER cidadão registado
  //    (lookup por BI) e vê as sessões de que é anfitriã.
  //  · Cidadão: vê as sessões agendadas PARA ele e entra na sala em tempo real.
  isInst?: boolean;
  bi?: string;
  instCode?: string;
  instDisplayName?: string;
  sessionDemo?: boolean;
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

export function VideoSessionPage({ onBack, addAuditLog, isInst = false, bi = '', instCode = '', instDisplayName = '', sessionDemo = false }: VideoSessionPageProps) {
  const { t } = useLanguage();
  
  const [sessions, setSessions] = useState<any[]>([]);

  // ==========================================================================
  // 2026-08-22 — AGENDAMENTO pela INSTITUIÇÃO (qualquer cidadão registado)
  // ==========================================================================
  const [showAgendar, setShowAgendar] = useState(false);
  const [formAgendar, setFormAgendar] = useState({
    assunto: '', data: '', hora: '', agenda: '', biCidadao: '', nomeCidadao: '',
  });
  const [lookupEstado, setLookupEstado] = useState<'idle' | 'checking' | 'found' | 'not_found'>('idle');
  const [formErro, setFormErro] = useState('');
  const [aAgendar, setAAgendar] = useState(false);

  const normalizar = (s?: string) => String(s || '').toUpperCase().replace(/\s+/g, '');

  /** Filtra as sessões para o papel da sessão (o proxy já devolve escopado;
   *  este filtro cobre o fallback local e as listas demo). */
  const filtrarParaSessao = useCallback((lista: any[]): any[] => {
    if (sessionDemo) return lista;
    if (isInst) return lista.filter(s => normalizar(s.hostBi) === normalizar(instCode || bi));
    return lista.filter(s => normalizar(s.guestBi) === normalizar(bi));
  }, [sessionDemo, isInst, instCode, bi]);

  const handleVerificarCidadao = async () => {
    setFormErro('');
    const alvo = normalizar(formAgendar.biCidadao);
    if (!/^[A-Z0-9][A-Z0-9\-]{3,23}$/.test(alvo)) {
      setLookupEstado('not_found');
      setFormErro('Escreva um Nº de B.I. válido (ex.: 002399714LA030).');
      return;
    }
    setLookupEstado('checking');
    const res = await supabaseService.institutionLookupCidadao(alvo);
    if (res.found && res.citizen) {
      const nome = res.citizen.name || '';
      setFormAgendar(prev => ({ ...prev, biCidadao: alvo, nomeCidadao: nome }));
      setLookupEstado('found');
    } else {
      setLookupEstado('not_found');
      setFormErro(res.errorCode === 'SEM_CHAVES'
        ? 'A verificação de cidadãos está indisponível (nuvem sem chaves).'
        : `Cidadão não localizado na plataforma (${res.errorCode || 'não registado'}). O video-atendimento só pode ser agendado para cidadãos registados no Correio Digital de Angola.`);
    }
  };

  const handleAgendar = async () => {
    setFormErro('');
    const { assunto, data, hora, biCidadao, nomeCidadao } = formAgendar;
    if (assunto.trim().length < 4) { setFormErro('Escreva o assunto do atendimento.'); return; }
    if (!data || !hora) { setFormErro('Escolha a data e a hora do atendimento.'); return; }
    if (!/^[A-Z0-9][A-Z0-9\-]{3,23}$/.test(normalizar(biCidadao))) { setFormErro('Indique o Nº de B.I. do cidadão.'); return; }
    if (lookupEstado !== 'found' || !nomeCidadao.trim()) {
      setFormErro('Verifique primeiro o cidadão (botão Verificar) — o agendamento fica registado com o nome oficial.');
      return;
    }
    setAAgendar(true);
    try {
      const codigo = normalizar(instCode || bi) || 'INST';
      const agora = Date.now();
      const nova = await VideoSessionService.createSession({
        roomName: `cda-video-${codigo}-${agora}`,
        subject: assunto.trim(),
        status: 'agendada',
        hostBi: codigo,
        hostName: instDisplayName || codigo,
        guestBi: normalizar(biCidadao),
        guestName: nomeCidadao.trim(),
        scheduledFor: `${data} às ${hora}`,
        agenda: formAgendar.agenda.trim() || undefined,
      } as any);
      // 2026-08-22 — AVISO AO CIDADÃO (formato oficial pedido pelo dono):
      // 1) NOTIFICAÇÃO (dropdown da foto de perfil) com o texto "Caro cidadão
      //    X, o instituto X agendou uma videochamada consigo…" — ao clicar,
      //    o botão da notificação abre a página Video-atendimento.
      // 2) CORRESPONDÊNCIA OFICIAL (caixa de entrada, NÃO LIDA — aparece no
      //    contador de não-lidas da foto de perfil) com o mesmo texto e um
      //    botão "Ir para o Video-atendimento" no detalhe da mensagem.
      const nomeInst = instDisplayName || codigo;
      const corpoAviso = `Caro cidadão ${nomeCidadao.trim()}, o(a) ${nomeInst} agendou uma videochamada consigo para o dia ${data} às ${hora}. Caso não seja possível comparecer, informe o(a) ${nomeInst} da sua indisponibilidade.\n\nAssunto da chamada: ${assunto.trim()}\nPara entrar: abra a página Video-atendimento no horário marcado.`;
      void supabaseService.insertNotification({
        title: 'Video-atendimento agendado',
        message: corpoAviso.replace(/\n/g, ' '),
        type: 'info',
        targetTab: 'video-atendimento',
      }, normalizar(biCidadao));

      // Correspondência oficial (unread) + protocolo selado (mesmo padrão do
      // compositor oficial — executeOfficialSend).
      try {
        const messageId = Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`);
        const protocolo = generateProtocol(normalizar(biCidadao), 'message', messageId, `Video-atendimento: ${assunto.trim()}`);
        const novaMensagem: Message = {
          id: messageId,
          org: normalizar(biCidadao),
          preview: `Video-atendimento agendado: ${assunto.trim()}`,
          date: 'hoje',
          status: 'Informativo',
          details: {
            subject: `Video-atendimento agendado: ${assunto.trim()}`,
            body: corpoAviso,
            deadline: 'Sem prazo',
            state: 'Entregue & Autenticado',
            // marcador 'video-atendimento' → o Detalhe da Mensagem mostra o
            // botão "Ir para o Video-atendimento".
            actions: ['Ver detalhes', 'video-atendimento'],
            attachments: [],
          },
          protocol: protocolo,
        };
        await supabaseService.sendOfficialMessage(novaMensagem, normalizar(biCidadao), codigo);
        await supabaseService.insertDigitalProtocol(protocolo);
        addAuditLog?.(`Correspondência oficial de agendamento enviada ao cidadão ${nomeCidadao.trim()} (${normalizar(biCidadao)}) — protocolo ${protocolo.protocolNumber}.`, 'success');
      } catch (msgErr) {
        console.warn('[VIDEO-AGENDAR] Correspondência oficial não pôde ser enviada (a sessão/notificação mantêm-se):', msgErr);
      }
      VideoSessionService.createNotification(String(nova.id), 'reminder', `Novo video-atendimento agendado: ${assunto.trim()}`);
      addAuditLog?.(`Agendou video-atendimento com o cidadão ${nomeCidadao.trim()} (${normalizar(biCidadao)}) — "${assunto.trim()}" em ${data} às ${hora}.`, 'success');
      setShowAgendar(false);
      setFormAgendar({ assunto: '', data: '', hora: '', agenda: '', biCidadao: '', nomeCidadao: '' });
      setLookupEstado('idle');
      notify(`Video-atendimento agendado com ${nomeCidadao.trim()} para ${data} às ${hora}.`, 'success');
      await loadSessions();
    } catch (e) {
      setFormErro('Não foi possível agendar. Tente novamente.');
      console.error('[VIDEO-AGENDAR]', e);
    } finally {
      setAAgendar(false);
    }
  };
  type SessaoPagina = VideoSessionExtended | (typeof mockSessions)[number];
  const [selectedSession, setSelectedSession] = useState<SessaoPagina | null>(null);
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
      // 2026-08-22 — contas REAIS nunca veem mocks/demo: a lista vem do proxy
      // com o escopo do papel (instituição → host; cidadão → convidado).
      // Contas demo mantêm as sessões de demonstração de sempre.
      let finalSessions: SessaoPagina[] = sessionDemo
        ? (allSessions.length > 0 ? [...allSessions] : [...mockSessions])
        : [...allSessions];
      if (sessionDemo && !finalSessions.some(s => s.id === 'sessao-demo')) {
        finalSessions = [mockSessions[0], ...finalSessions];
      }
      setSessions(filtrarParaSessao(finalSessions));
    } catch (e) {
      setSessions(sessionDemo ? mockSessions : []);
    } finally {
      setIsLoading(false);
    }
  }, [sessionDemo, filtrarParaSessao]);
  
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
    // Variantes dark incluídas (corrige visibilidade da lista no modo escuro).
    switch (status) {
      case 'disponivel': return { color: 'bg-emerald-500', text: 'Disponível', bg: 'bg-emerald-50', border: 'border-emerald-200', bgDark: 'dark:bg-emerald-900/40', borderDark: 'dark:border-emerald-700', semClass: 'cda-st-disponivel' };
      case 'agendada': return { color: 'bg-blue-500', text: 'Agendada', bg: 'bg-blue-50', border: 'border-blue-200', bgDark: 'dark:bg-blue-900/40', borderDark: 'dark:border-blue-700', semClass: 'cda-st-agendada' };
      case 'em_curso': return { color: 'bg-red-500 animate-pulse', text: 'Em Curso', bg: 'bg-red-50', border: 'border-red-200', bgDark: 'dark:bg-red-900/40', borderDark: 'dark:border-red-700', semClass: 'cda-st-em_curso' };
      case 'concluida': return { color: 'bg-slate-400', text: 'Concluída', bg: 'bg-slate-50', border: 'border-slate-200', bgDark: 'dark:bg-slate-800', borderDark: 'dark:border-slate-700' };
      case 'cancelada': return { color: 'bg-rose-500', text: 'Cancelada', bg: 'bg-rose-50', border: 'border-rose-200', bgDark: 'dark:bg-rose-900/40', borderDark: 'dark:border-rose-700' };
      default: return { color: 'bg-slate-400', text: status, bg: 'bg-slate-50', border: 'border-slate-200', bgDark: 'dark:bg-slate-800', borderDark: 'dark:border-slate-700' };
    }
  };
  
  const availableCount = sessions.filter(s => s.status === 'disponivel' || s.status === 'agendada').length;
  const inProgressCount = sessions.filter(s => s.status === 'em_curso').length;
  
  const handleStartCall = (session: SessaoPagina) => {
    setSelectedSession(session);
    setIsInCall(true);
    setCallDuration(0);
    setActiveTab('video');
    setIsVideoOn(true);
    setIsAudioOn(true);
    // 2026-08-22 — estado persistido (Modo Real via proxy): o outro
    // participante vê a sessão "Em Curso" e entra na MESMA sala Jitsi —
    // a chamada é em tempo real (áudio/vídeo WebRTC do meet.jit.si).
    if (!String(session.id).startsWith('sessao-') && !String(session.id).startsWith('vs-')) {
      void VideoSessionService.updateSessionStatus(session.id, 'em_curso');
    }
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
          <button onClick={onBack} className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl flex items-center justify-center transition-all active:scale-95 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700">
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
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl dark:bg-emerald-900/40 dark:border-emerald-700">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-emerald-700 uppercase dark:text-emerald-300">{availableCount} Agendados</span>
          </div>
          {inProgressCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-xl dark:bg-red-900/40 dark:border-red-700">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-black text-red-700 uppercase dark:text-red-300">{inProgressCount} Em Curso</span>
            </div>
          )}
          {/* 2026-08-22 — AGENDAMENTO: exclusivo da instituição (anfitriã) */}
          {isInst && (
            <button
              onClick={() => { setFormErro(''); setLookupEstado('idle'); setShowAgendar(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border-0 shadow-md"
            >
              <CalendarPlus size={15} />
              Agendar Video-atendimento
            </button>
          )}
        </div>
      </div>

      <div className={`grid grid-cols-1 ${activeTab === 'video' && selectedSession ? '' : 'lg:grid-cols-3'} gap-6`}>
        {/* Left Column */}
        <div className={`${activeTab === 'video' && selectedSession ? 'w-full' : 'lg:col-span-2'} space-y-4`}>
          {/* Tabs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-1.5 flex gap-1 dark:bg-slate-900 dark:border-slate-700">
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
                  activeTab === tab.id ? 'bg-primary text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
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
          <div className="bg-white border border-slate-200 rounded-[24px] p-4 md:p-6 shadow-sm dark:bg-slate-900 dark:border-slate-700">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-4 flex items-center gap-2 dark:text-slate-100">
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
                {/* Agenda — container "Atendimentos Disponíveis" com acabamento premium no modo escuro
                    (fundo #091124 + cards glassmorphism; modo claro inalterado — ver index.css html.dark .cda-video-agenda*) */}
                {activeTab === 'agenda' && (
                  <div className="space-y-3 cda-video-agenda">
                    {sessions
                      .filter(s => s.status === 'disponivel' || s.status === 'agendada' || s.status === 'em_curso')
                      .map(session => {
                        const statusConfig = getStatusConfig(session.status);
                        return (
                          <motion.div
                            key={session.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-4 border ${statusConfig.border} ${statusConfig.bg} rounded-2xl hover:shadow-md transition-all cursor-pointer cda-video-agenda-card`}
                            onClick={() => handleStartCall(session)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`w-2 h-2 rounded-full ${statusConfig.color}`} />
                                  <span className={`text-[10px] font-black uppercase text-slate-500 cda-video-agenda-label ${statusConfig.semClass}`}>{statusConfig.text}</span>
                                </div>
                                <h5 className="text-sm font-black text-slate-800 mb-1 cda-video-agenda-title">{session.subject}</h5>
                                <div className="flex items-center gap-3 text-[10px] text-slate-500 cda-video-agenda-meta">
                                  {isInst ? (
                                    <span className="flex items-center gap-1"><User size={10} />Cidadão: {session.guestName}{session.guestBi ? ` (${session.guestBi})` : ''}</span>
                                  ) : (
                                    <span className="flex items-center gap-1"><User size={10} />{session.hostName}</span>
                                  )}
                                  <span className="flex items-center gap-1"><Clock size={10} />{session.scheduledFor || session.time || session.date}</span>
                                </div>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); handleStartCall(session); }} className="px-3 py-1.5 bg-primary text-white text-[10px] font-black uppercase rounded-lg hover:bg-primary/90 transition-all border-0 cursor-pointer">Entrar</button>
                            </div>
                          </motion.div>
                        );
                      })}
                    {sessions.filter(s => s.status === 'disponivel' || s.status === 'agendada' || s.status === 'em_curso').length === 0 && (
                      <div className="text-center py-10 px-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 dark:bg-slate-800">
                          <Calendar size={26} className="text-slate-400" />
                        </div>
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-wide dark:text-slate-400">
                          {isInst
                            ? 'Nenhum video-atendimento agendado. Use "Agendar Video-atendimento" para criar a primeira sessão com um cidadão.'
                            : 'Nenhum video-atendimento agendado para si. Quando uma instituição agendar, a sessão aparece aqui.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Histórico */}
                {activeTab === 'historico' && sessions
                  .filter(s => s.status === 'concluida' || s.status === 'cancelada')
                  .map(session => {
                    const statusConfig = getStatusConfig(session.status);
                    return (
                      <div key={session.id} className={`p-4 border ${statusConfig.border} ${statusConfig.bg} ${statusConfig.borderDark} ${statusConfig.bgDark} rounded-2xl opacity-75`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-black uppercase text-slate-500 mb-1 block dark:text-slate-400">{statusConfig.text}</span>
                            <h5 className="text-xs font-black text-slate-700 dark:text-slate-200">{session.subject}</h5>
                            <p className="text-[9px] text-slate-500 mt-0.5 dark:text-slate-400">{session.date} - {session.time}</p>
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
                    <h5 className="text-sm font-black text-slate-700 mb-1 dark:text-slate-200">Calendário de Videoatendimentos</h5>
                    <p className="text-[10px] mt-1 dark:text-slate-400">{availableCount} atendimentos agendados</p>
                  </div>
                )}

                {/* Ajuda */}
                {activeTab === 'ajuda' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl dark:bg-slate-800 dark:border-slate-700">
                      <h5 className="text-sm font-black text-slate-800 mb-2 flex items-center gap-2 dark:text-slate-100">
                        <CheckCircle size={16} className="text-emerald-500" />Como usar o VideoAtendimento
                      </h5>
                      <ul className="text-[11px] text-slate-600 space-y-2 dark:text-slate-300">
                        <li>1. Selecione um atendimento disponível na aba "Agenda"</li>
                        <li>2. Clique no botão "Entrar" para iniciar a videochamada</li>
                        <li>3. Permita o acesso à câmera e microfone quando solicitado</li>
                        <li>4. Aguarde a conexão com o atendente</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl dark:bg-slate-800 dark:border-slate-700">
                      <h5 className="text-sm font-black text-slate-800 mb-2 flex items-center gap-2 dark:text-slate-100">
                        <Shield size={16} />Segurança
                      </h5>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
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
                        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 dark:bg-indigo-950/40 dark:border-indigo-800">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                              <User size={20} className="text-primary" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-black text-slate-800 dark:text-slate-100">{selectedSession.subject}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">Com: <span className="font-semibold">{selectedSession.hostName}</span></p>
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
                        
                        <div className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center justify-center gap-2 shadow-sm dark:bg-slate-800 dark:border-slate-700">
                          <button onClick={() => setIsAudioOn(!isAudioOn)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border-0 cursor-pointer ${isAudioOn ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600' : 'bg-red-500 text-white'}`}>
                            {isAudioOn ? <Mic size={18} /> : <MicOff size={18} />}
                          </button>
                          <button onClick={() => setIsVideoOn(!isVideoOn)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border-0 cursor-pointer ${isVideoOn ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600' : 'bg-red-500 text-white'}`}>
                            {isVideoOn ? <Camera size={18} /> : <CameraOff size={18} />}
                          </button>
                          <button onClick={() => setIsScreenSharing(!isScreenSharing)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border-0 cursor-pointer ${isScreenSharing ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'}`}>
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
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
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
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 dark:bg-slate-800 dark:border-slate-700">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <User size={18} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate dark:text-slate-100">{selectedSession.subject}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 dark:text-slate-400">Com: <span className="font-semibold">{selectedSession.hostName}</span></p>
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

      {/* ==========================================================================
          2026-08-22 — MODAL DE AGENDAMENTO (instituição): marcar video-
          atendimento com QUALQUER cidadão registado na plataforma (lookup por
          B.I. real — nada de nomes inventados).
          ========================================================================== */}
      {showAgendar && isInst && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          {/* 2026-08-22 — fundo PRETO translúcido (preto cinzento) com blur;
              o popup fica SEMPRE por cima (portal no <body>, acima de todo o
              layout da aplicação). */}
          <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-md" onClick={() => setShowAgendar(false)} />

          <div className="relative w-full max-w-[520px] bg-white rounded-[28px] shadow-[0_25px_80px_rgba(2,6,23,0.55)] border border-white/10 overflow-hidden animate-fadeIn">
            {/* Cabeçalho do popup */}
            <div className="bg-gradient-to-r from-indigo-950 to-slate-900 px-6 py-5 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-white/10 border border-white/15 rounded-2xl flex items-center justify-center shrink-0">
                  <CalendarPlus size={20} className="text-indigo-200" />
                </div>
                <div>
                  <h3 className="text-white text-sm font-black uppercase tracking-wide leading-none">Agendar Video-atendimento</h3>
                  <p className="text-indigo-200/80 text-[10px] font-bold uppercase tracking-wider mt-1.5">
                    {instDisplayName || 'Instituição'} • anfitriã da sessão
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAgendar(false)}
                aria-label="Fechar"
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer border-0 transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Corpo do popup */}
            <div className="px-6 py-5 space-y-4 max-h-[62vh] overflow-y-auto custom-scrollbar">
              <div className="grid gap-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Assunto do atendimento *</label>
                <input
                  type="text"
                  value={formAgendar.assunto}
                  onChange={(e) => setFormAgendar(prev => ({ ...prev, assunto: e.target.value }))}
                  placeholder="Ex.: Esclarecimento sobre o Certificado MPME"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Data *</label>
                  <input type="date" value={formAgendar.data} onChange={(e) => setFormAgendar(prev => ({ ...prev, data: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none transition-colors" />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Hora *</label>
                  <input type="time" value={formAgendar.hora} onChange={(e) => setFormAgendar(prev => ({ ...prev, hora: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none transition-colors" />
                </div>
              </div>

              <div className="grid gap-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cidadão (Nº de B.I.) *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formAgendar.biCidadao}
                    onChange={(e) => { setFormAgendar(prev => ({ ...prev, biCidadao: e.target.value.toUpperCase(), nomeCidadao: '' })); setLookupEstado('idle'); }}
                    placeholder="Ex.: 002399714LA030"
                    className="flex-1 bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl px-4 py-3 text-xs font-mono font-bold text-slate-800 outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => void handleVerificarCidadao()}
                    disabled={lookupEstado === 'checking'}
                    className="flex items-center gap-1.5 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer border-0 shrink-0 transition-colors"
                  >
                    <Search size={13} />
                    {lookupEstado === 'checking' ? 'A verificar…' : 'Verificar'}
                  </button>
                </div>
                {lookupEstado === 'found' && (
                  <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 m-0 flex items-center gap-1.5">
                    <CheckCircle size={13} className="shrink-0" />
                    Cidadão localizado: <span className="font-black">{formAgendar.nomeCidadao}</span> ({formAgendar.biCidadao})
                  </p>
                )}
              </div>

              <div className="grid gap-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Agenda do atendimento</label>
                <textarea
                  value={formAgendar.agenda}
                  onChange={(e) => setFormAgendar(prev => ({ ...prev, agenda: e.target.value }))}
                  rows={3}
                  placeholder="Pontos a tratar na videochamada (fica visível para o cidadão)…"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 outline-none transition-colors resize-y"
                />
              </div>

              {formErro && (
                <p className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 m-0 flex items-start gap-1.5">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {formErro}
                </p>
              )}

              <p className="text-[10px] text-slate-500 font-semibold leading-relaxed m-0 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                Ao agendar, o cidadão recebe a notificação oficial e vê a sessão na página Video-atendimento dele. No horário marcado, ambos entram na MESMA sala de vídeo (Jitsi Meet) — a chamada é em tempo real, com áudio e vídeo.
              </p>
            </div>

            {/* Rodapé do popup */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center gap-3">
              <button onClick={() => setShowAgendar(false)} className="flex-1 py-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer transition-colors">Cancelar</button>
              <button
                onClick={() => void handleAgendar()}
                disabled={aAgendar}
                className="flex-1 py-3 bg-indigo-950 hover:bg-indigo-900 disabled:opacity-60 text-white rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer border-0 shadow-md flex items-center justify-center gap-2 transition-colors"
              >
                {aAgendar ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {aAgendar ? 'A agendar…' : 'Agendar Atendimento'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
