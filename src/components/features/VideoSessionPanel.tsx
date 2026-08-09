import React, { useState, useEffect } from 'react';
import { notify } from '../../lib/notify';
import { Video, Calendar, User, Copy, Plus, Play, Square, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { Message, VideoSession, VideoSessionEvent } from '../../types';
import { useSession } from '../../services/sessionStore';
import { VideoSessionService } from '../../services/videoSessionService';

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
    notify('Informações de acesso copiadas para a área de transferência!');
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
    // Regra estrita: O cidadão não pode agendar/criar uma reunião diretamente no sistema central.
    // Apenas pode submeter uma intenção ou solicitação administrativa simples, mas a criação de sessões Jitsi
    // e agendamento formal é um privilégio exclusivo de representantes oficiais e funcionários de Instituições.
    notify('Acesso negado: Por motivos regulamentares de soberania administrativa, a criação e agendamento de reuniões oficiais por vídeo é de competência exclusiva de funcionários de instituições governamentais autorizadas.');
    if (addAuditLog) {
      addAuditLog(`Tentativa de agendamento de vídeo bloqueada para o cidadão por restrição regulamentar`, 'warning');
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
