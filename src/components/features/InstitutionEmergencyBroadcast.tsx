/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * F58 / v20 — Página de difusão institucional para a rede de emergência.
 * Cada linha tem o botão "Enviar Mensagem": 1º entrega CDA (se o familiar
 * tiver conta — desfecho REAL) → 2º abre o WhatsApp via wa.me (link honesto:
 * quem envia é o agente; "WhatsApp enviado" NÃO EXISTE aqui).
 * Truque anti-popup-blocker: window.open('', '_blank') SINCRONO no clique da
 * linha; a navegação para wa.me acontece depois dos awaits.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, X, Send, Users, Loader2, MessageCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import {
  RedeMember,
  PlatformChip,
  WhatsappChip,
  platformChipText,
  whatsappChipText,
  redeemerWhatsappTarget,
} from '../../services/institutionEmergencyService';

export interface RowSendOutcome {
  platform: 'enviado' | 'sem_conta' | 'falhou';
  platformErrorCode: string | null;
  waLink: string | null;
}

interface InstitutionEmergencyBroadcastProps {
  isOpen: boolean;
  citizenName: string;
  citizenBi: string;
  messageText: string;
  recipients: RedeMember[] | null;
  isLoadingRecipients: boolean;
  recipientsError: string | null;
  /** true na instituição demo (sandbox declarado; zero escrita real). */
  isSandbox: boolean;
  /**
   * Executa a parte assíncrona REAL da linha (envio plataforma + registo).
   * Recebe o membro; devolve o desfecho para os chips. O `win` (janela já
   * aberta sincronamente pelo componente) é navegado para wa.me pelo
   * componente depois do retorno — garante o clique dentro do gesto do user.
   */
  onSendRow: (member: RedeMember) => Promise<RowSendOutcome>;
  onClose: () => void;
}

interface RowUiState {
  platformChip: PlatformChip | 'sandbox';
  platformErrorCode: string | null;
  whatsappChip: WhatsappChip | 'sandbox';
  done: boolean;
  popupBlocked: boolean;
  waLink: string | null;
}

const initialRowState = (member: RedeMember, isSandbox: boolean): RowUiState =>
  isSandbox
    ? { platformChip: 'sandbox', platformErrorCode: null, whatsappChip: 'sandbox', done: false, popupBlocked: false, waLink: null }
    : {
        platformChip: member.has_cda_account ? 'a_enviar' : 'sem_conta',
        platformErrorCode: null,
        whatsappChip: 'pendente',
        done: false,
        popupBlocked: false,
        waLink: null,
      };

export function InstitutionEmergencyBroadcast({
  isOpen,
  citizenName,
  citizenBi,
  messageText,
  recipients,
  isLoadingRecipients,
  recipientsError,
  isSandbox,
  onSendRow,
  onClose,
}: InstitutionEmergencyBroadcastProps) {
  const [rowStates, setRowStates] = useState<Record<number, RowUiState>>({});
  const [sendingIdx, setSendingIdx] = useState<number | null>(null);

  const getRowState = (idx: number, member: RedeMember): RowUiState =>
    rowStates[idx] ?? initialRowState(member, isSandbox);

  const patchRow = (idx: number, member: RedeMember, patch: Partial<RowUiState>) =>
    setRowStates(prev => ({ ...prev, [idx]: { ...getRowState(idx, member), ...patch } }));

  /**
   * Sequência REAL (spec v20 §3.3):
   *  1. window.open sincrono (anti-popup-blocker);
   *  2. entrega CDA + registo (App via onSendRow);
   *  3. navegar a janela para wa.me (ou fechar se número inválido);
   *  4. desactivar a linha após o fluxo real completar.
   */
  const handleRowSend = async (idx: number, member: RedeMember) => {
    if (sendingIdx !== null) return;
    const state = getRowState(idx, member);
    if (state.done) return;

    // 1 — SINCRONO: abrir a janela DENTRO do gesto do utilizador.
    const win = window.open('', '_blank');

    if (isSandbox) {
      // Sandbox declarado: nada é escrito na BD e NENHUM link é aberto
      // (destinatários fictícios marcados; chips ficam no estado sandbox).
      win?.close();
      patchRow(idx, member, { done: true });
      return;
    }

    setSendingIdx(idx);
    if (state.platformChip === 'a_enviar') patchRow(idx, member, { platformChip: 'enviando' });

    let outcome: RowSendOutcome;
    try {
      outcome = await onSendRow(member);
    } catch (e) {
      outcome = { platform: 'falhou', platformErrorCode: e?.code || 'EXCEPCAO', waLink: null };
    }

    // 2 — chips com o desfecho REAL da plataforma
    const platformChip: PlatformChip =
      outcome.platform === 'enviado' ? 'enviado'
      : outcome.platform === 'sem_conta' ? 'sem_conta'
      : 'falhou';

    // 3 — WhatsApp: navegar a janela já aberta (nunca relatar como "enviado")
    let whatsappChip: WhatsappChip;
    let popupBlocked = false;
    if (outcome.waLink) {
      if (win && !win.closed) {
        win.location.href = outcome.waLink;
        whatsappChip = 'link_aberto';
      } else {
        popupBlocked = true;
        whatsappChip = 'popup_bloqueado';
      }
    } else {
      win?.close();
      whatsappChip = 'numero_invalido';
    }

    patchRow(idx, member, {
      platformChip,
      platformErrorCode: outcome.platformErrorCode,
      whatsappChip,
      popupBlocked,
      waLink: popupBlocked ? outcome.waLink : null,
      done: true,
    });
    setSendingIdx(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.93, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.93, opacity: 0, y: 15 }}
            className="relative bg-white w-full max-w-[640px] max-h-[92vh] rounded-[28px] shadow-2xl border border-red-100 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 md:p-7 border-b border-slate-100 space-y-3 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-13 h-13 p-3 bg-red-50 text-red-600 rounded-full flex items-center justify-center shrink-0 border border-red-100">
                  <ShieldAlert size={26} strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg md:text-xl font-black text-red-700 uppercase tracking-tight leading-none mb-1">
                    Difusão de Mensagem de Emergência
                  </h3>
                  <p className="text-red-500 font-extrabold text-[10px] uppercase tracking-widest leading-none">
                    {isSandbox ? 'Modo Sandbox — destinatários fictícios, nada é enviado' : `Rede de emergência de ${citizenName} (BI ${citizenBi})`}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-50 rounded-full cursor-pointer"
                  id="close-inst-broadcast"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Mensagem composta (igual para todos)</p>
                <p className="text-slate-700 text-xs leading-relaxed whitespace-pre-line max-h-20 overflow-y-auto">
                  {messageText}
                </p>
              </div>
            </div>

            {/* Lista da rede */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-7 space-y-3">
              {isLoadingRecipients && (
                <div className="flex flex-col items-center py-10 gap-3">
                  <Loader2 size={30} className="text-red-500 animate-spin" />
                  <p className="text-slate-500 text-sm font-bold">A carregar a rede de emergência…</p>
                </div>
              )}

              {recipientsError && !isLoadingRecipients && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-2.5">
                  <AlertTriangle size={17} className="text-red-600 shrink-0 mt-0.5" />
                  <p className="text-red-700 text-xs font-bold leading-relaxed">
                    Não foi possível carregar a rede de emergência (Erro real: {recipientsError}).
                  </p>
                </div>
              )}

              {!isLoadingRecipients && !recipientsError && recipients && recipients.length === 0 && (
                <div className="text-center py-10 space-y-3">
                  <Users size={34} className="text-slate-300 mx-auto" />
                  <p className="text-slate-500 text-sm font-bold">Este cidadão não tem contactos do tipo «Emergência» registados.</p>
                </div>
              )}

              {!isLoadingRecipients && !recipientsError && (recipients || []).map((member, idx) => {
                const state = getRowState(idx, member);
                const busy = sendingIdx === idx;
                return (
                  <div
                    key={idx}
                    className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-white hover:border-red-200 transition-colors"
                    data-testid={`broadcast-row-${idx}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 text-sm uppercase tracking-tight truncate">{member.name}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{member.relation || 'Familiar'}</p>
                      </div>
                      {/* Linha desactiva após o fluxo real completar (anti-disparo duplo) */}
                      <button
                        type="button"
                        onClick={() => handleRowSend(idx, member)}
                        disabled={state.done || sendingIdx !== null}
                        className={`shrink-0 py-2.5 px-4 rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center gap-2 transition-all ${
                          state.done
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default'
                            : sendingIdx !== null
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              : 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200 active:scale-95 cursor-pointer'
                        }`}
                        id={`broadcast-send-${idx}`}
                      >
                        {busy ? <Loader2 size={14} className="animate-spin" /> : state.done ? <CheckCircle size={14} /> : <Send size={14} />}
                        {busy ? 'A enviar…' : state.done ? 'Concluído' : 'Enviar Mensagem'}
                      </button>
                    </div>

                    {/* Chips de estado HONESTOS por canal */}
                    <div className="flex flex-wrap gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        state.platformChip === 'enviado'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : state.platformChip === 'falhou'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        <MessageCircle size={10} />
                        {platformChipText(state.platformChip, state.platformErrorCode)}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        state.whatsappChip === 'link_aberto'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : state.whatsappChip === 'numero_invalido' || state.whatsappChip === 'popup_bloqueado'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        <MessageCircle size={10} />
                        {whatsappChipText(state.whatsappChip)}
                      </span>
                      {/* Fallback quando o browser bloqueou o pop-up (clique explícito do agente) */}
                      {state.popupBlocked && state.waLink && (
                        <a
                          href={state.waLink}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 cursor-pointer"
                        >
                          Abrir WhatsApp
                        </a>
                      )}
                    </div>

                    {/* Destino WhatsApp calculado (o número só existe dentro do separador) */}
                    {!isSandbox && !redeemerWhatsappTarget(member) && (
                      <p className="text-[10px] text-slate-400 font-semibold">
                        Sem número angolano válido para WhatsApp — entrega apenas na plataforma CDA (se houver conta).
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Rodapé informativo honesto */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 shrink-0">
              <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                Cada linha envia primeiro para a conta CDA do familiar (quando existe, com resultado real) e
                depois abre o WhatsApp — <strong>o envio no WhatsApp é confirmado por si</strong>, mensagem a
                mensagem. A plataforma regista apenas o link aberto, nunca "mensagem enviada".
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
