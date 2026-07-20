// ============================================================================
// HomologationGate — Ecrã de "Conta em Homologação"
// ----------------------------------------------------------------------------
// O cidadão autenticou-se com sucesso, mas a conta ainda NÃO está ativa.
// Enquanto a Área de Administração não aprovar os dados, o acesso a
// correspondência institucional fica bloqueado e o único canal aberto é a
// correspondência oficial Admin ⇄ Cidadão (homologationStore).
// ============================================================================

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Clock,
  Send,
  LogOut,
  RefreshCw,
  MessageSquareText,
  FileWarning,
  Building2,
  BellOff,
  Video,
  FolderLock,
  CheckCircle2,
} from 'lucide-react';
import { homologationStore, HomologationRecord, HomologationMessage } from '../../services/homologationStore';

interface HomologationGateProps {
  bi: string;
  name: string;
  record: HomologationRecord;
  addAuditLog?: (action: string, type?: 'info' | 'warning' | 'critical' | 'success') => void;
  onActivated: () => void;
  onResubmit: () => void;
  onLogout: () => void;
}

export function HomologationGate({ bi, name, record, addAuditLog, onActivated, onResubmit, onLogout }: HomologationGateProps) {
  const [thread, setThread] = useState<HomologationMessage[]>(() => homologationStore.getThread(bi));
  const [replyText, setReplyText] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);

  const reloadThread = () => setThread(homologationStore.getThread(bi));

  // Verificação periódica do estado da conta (aprovação noutra sessão/aba é detetada)
  useEffect(() => {
    const interval = setInterval(() => {
      const current = homologationStore.getStatus(bi);
      reloadThread();
      if (current && current.status === 'active') {
        addAuditLog?.('Homologação: conta ativada pela Área de Administração — acesso total libertado', 'success');
        clearInterval(interval);
        setTimeout(() => onActivated(), 400);
      }
    }, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bi, refreshTick]);

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    homologationStore.addMessage(bi, 'citizen', replyText.trim());
    setReplyText('');
    reloadThread();
    addAuditLog?.('Homologação: cidadão respondeu à Área de Administração pelo canal oficial', 'info');
  };

  const isRejected = record.status === 'rejected';

  const blockedFeatures = [
    { icon: FolderLock, label: 'Correio Institucional (AGT, SME, ENDE, EPAL)' },
    { icon: BellOff, label: 'Notificações oficiais das instituições' },
    { icon: Building2, label: 'Solicitação e emissão de documentos oficiais' },
    { icon: Video, label: 'VideoAtendimento com instituições' },
  ];

  return (
    <section className="min-h-screen bg-slate-100 p-4 md:p-6 flex items-start justify-center font-sans">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl space-y-4 mt-4"
      >
        {/* Cabeçalho institucional */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md ${isRejected ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'bg-gradient-to-br from-amber-500 to-orange-600'}`}>
            {isRejected ? <ShieldAlert size={22} /> : <Shield size={22} />}
          </div>
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full text-slate-500 font-extrabold text-[9px] uppercase tracking-[0.15em]">
              <Lock size={10} />
              Conta em Homologação
            </div>
            <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight leading-tight mt-1">
              {isRejected ? 'Registo Indeferido' : 'Conta Pendente de Ativação'}
            </h1>
            <p className="text-[11.5px] text-slate-500 font-semibold">
              Olá, <span className="text-slate-800 font-bold">{name || 'Cidadão(ã)'}</span> · BI: <span className="font-mono text-slate-800">{bi.toUpperCase()}</span>
            </p>
          </div>
        </div>

        {/* Cartão de estado */}
        <div className={`rounded-3xl border shadow-sm p-5 ${isRejected ? 'bg-red-50/70 border-red-100' : 'bg-amber-50/70 border-amber-100'}`}>
          <div className="flex items-start gap-3">
            {isRejected ? (
              <FileWarning size={20} className="text-red-500 shrink-0 mt-0.5" />
            ) : (
              <Clock size={20} className="text-amber-500 shrink-0 mt-0.5 animate-pulse" />
            )}
            <div className="space-y-1.5">
              <p className={`text-[12px] font-black uppercase tracking-wide ${isRejected ? 'text-red-700' : 'text-amber-700'}`}>
                {isRejected ? 'O seu registo foi indeferido pela Área de Administração' : 'A sua conta aguarda aprovação da Área de Administração'}
              </p>
              <p className={`text-[12px] leading-relaxed font-semibold ${isRejected ? 'text-red-600' : 'text-amber-600'}`}>
                {isRejected
                  ? `Motivo oficial: ${record.reason || 'Documentação em desconformidade.'}`
                  : 'Os inspetores de identificação civil nacional estão a validar a sua documentação. Previsão de resposta: menos de 24 horas. Será notificado neste canal assim que a conta for ativada.'}
              </p>
              <p className="text-[10px] text-slate-400 font-semibold">
                Última atualização do processo: {record.updatedAt}
              </p>
            </div>
          </div>
        </div>

        {/* Funcionalidades bloqueadas até ativação */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-3">
          <p className="text-[10.5px] font-black text-slate-500 uppercase tracking-widest">Indisponível até à ativação da conta</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {blockedFeatures.map((f, i) => (
              <div key={i} className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 rounded-2xl px-3.5 py-2.5 opacity-75">
                <f.icon size={15} className="text-slate-400 shrink-0" />
                <span className="text-[11px] font-bold text-slate-500 leading-snug">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Canal oficial exclusivo: Administração ⇄ Cidadão */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquareText size={16} className="text-blue-600" />
            <p className="text-[10.5px] font-black text-slate-700 uppercase tracking-widest flex-1">
              Correspondência Oficial — Área de Administração
            </p>
            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Canal aberto
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 space-y-2.5 max-h-64 overflow-y-auto">
            {thread.length === 0 && (
              <p className="text-[11px] text-slate-400 font-semibold text-center py-4">
                Ainda não existe correspondência neste processo.
              </p>
            )}
            {thread.map((msg) => (
              <div key={msg.id} className={`flex ${msg.from === 'citizen' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[11.5px] leading-relaxed shadow-sm ${
                  msg.from === 'citizen'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : msg.from === 'system'
                      ? 'bg-slate-200/80 text-slate-600'
                      : 'bg-white border border-slate-200 text-slate-700 rounded-bl-md'
                }`}>
                  <p className="font-semibold whitespace-pre-line">{msg.text}</p>
                  <p className={`text-[9px] mt-1 ${msg.from === 'citizen' ? 'text-blue-100' : 'text-slate-400'}`}>
                    {msg.from === 'citizen' ? 'Você' : msg.from === 'system' ? 'Sistema' : 'Área de Administração'} · {msg.at}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendReply(); }}
              placeholder="Responder à Área de Administração..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-[12px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
            <button
              type="button"
              onClick={handleSendReply}
              disabled={!replyText.trim()}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl px-4 py-2.5 font-black text-[11px] uppercase tracking-widest flex items-center gap-1.5 cursor-pointer border-0 shadow-md disabled:opacity-40 disabled:shadow-none"
            >
              <Send size={13} />
              Enviar
            </button>
          </div>
        </div>

        {/* Ações da sessão */}
        <div className="flex flex-col sm:flex-row gap-2.5 pb-6">
          {isRejected && (
            <button
              type="button"
              onClick={() => {
                addAuditLog?.('Homologação: cidadão iniciou correção e reenvio de documentação após indeferimento', 'warning');
                onResubmit();
              }}
              className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-black text-[11.5px] uppercase tracking-widest transition-all cursor-pointer border-0 shadow-md flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} />
              Corrigir e Reenviar Documentação
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setRefreshTick(t => t + 1);
              reloadThread();
              const current = homologationStore.getStatus(bi);
              if (current && current.status === 'active') onActivated();
            }}
            className="flex-1 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl font-black text-[11.5px] uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={14} className="text-emerald-500" />
            Verificar Estado da Conta
          </button>
          <button
            type="button"
            onClick={() => {
              addAuditLog?.('Homologação: sessão terminada pelo cidadão em modo homologação', 'info');
              onLogout();
            }}
            className="sm:w-auto px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-[11.5px] uppercase tracking-widest transition-all cursor-pointer border-0 flex items-center justify-center gap-2"
          >
            <LogOut size={14} />
            Terminar Sessão
          </button>
        </div>

        {/* Rodapé de garantia */}
        <div className="flex items-center justify-center gap-1.5 text-slate-400 text-[10px] font-bold pb-4">
          <ShieldCheck size={13} />
          <span>Canal exclusivo e seguro com a Área de Administração do Correio Digital de Angola.</span>
        </div>
      </motion.div>
    </section>
  );
}
