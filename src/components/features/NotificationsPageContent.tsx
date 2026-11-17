/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * NotificationsPageContent — página do Centro de Notificações com pré-selecção.
 *
 * 2026-11-15 (pedido do dono): «Quando o utilizador preenche o inquérito e envia
 * para a instituição apenas aparece uma notificação. Torne possível clicar nas
 * notificações. Ao clicar deverá exibir a respectiva página.»
 *
 * O Centro de Notificações já sabia navegar por separador, mas NUNCA abria um
 * item concreto: clicar numa notificação de resposta a inquérito deixava a
 * instituição na lista geral de Inquéritos, sem qualquer destaque do inquérito
 * respondido. Esta página isola o item clicado e mostra-o aberto no topo.
 */
import { useRef, useEffect } from 'react';
import { Bell, ChevronRight, ArrowDownLeft, Megaphone, AlertTriangle } from 'lucide-react';
import type { AppNotification } from '../../types';
import { NotificationsCenterContent } from './NotificationsCenterContent';
import { BotaoVoltar } from '../ui/BotaoVoltar';
import { assuntoCitado } from '../../utils/resolverNotificacao';

export interface FocoNotificacao {
  /** Id da notificação (linha da nuvem ou sintética). */
  id: number | string;
  titulo: string;
  mensagem: string;
  tipo: string;
  /** Instante em que a pré-selecção foi pedida (para permitir repetir o mesmo item). */
  em: number;
}

interface Props {
  notifications: AppNotification[];
  setTab: (tab: string) => void;
  appMode: string;
  messages?: any[];
  onOpenMessage?: (msg: any) => void;
  foco?: FocoNotificacao | null;
  onLimparFoco?: () => void;
  onAbrirNotificacao?: (n: AppNotification) => void;
}

const iconePorTipo = (tipo: string) => {
  if (tipo === 'warning') return AlertTriangle;
  if (tipo === 'success') return Megaphone;
  return ArrowDownLeft;
};

export function NotificationsPageContent({
  notifications, setTab, appMode, messages = [], onOpenMessage, foco, onLimparFoco, onAbrirNotificacao,
}: Props) {
  const refFoco = useRef<HTMLDivElement | null>(null);

  // O item clicado fica visível sem o utilizador ter de o procurar na lista.
  useEffect(() => {
    if (!foco) return;
    const t = window.setTimeout(() => {
      refFoco.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 220);
    return () => window.clearTimeout(t);
  }, [foco]);

  const itemFoco = foco
    ? notifications.find((n) => String(n.id) === String(foco.id))
      || ({ id: foco.id, title: foco.titulo, message: foco.mensagem, type: foco.tipo, time: 'Agora', targetTab: 'inqueritos', unread: false } as unknown as AppNotification)
    : null;

  const assunto = foco ? assuntoCitado(foco.mensagem) : '';
  const Icone = itemFoco ? iconePorTipo(String(itemFoco.type)) : Bell;

  return (
    <section className="space-y-4 md:space-y-6">
      <div className="flex items-start gap-3.5 text-left">
        <BotaoVoltar />
        <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
          <Bell size={20} className="md:w-6 md:h-6" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg md:text-2xl font-black text-primary leading-tight uppercase tracking-tight">Centro de Notificações</h3>
          <p className="text-xs text-slate-500 font-medium normal-case">{notifications.length} alertas sincronizados</p>
        </div>
      </div>

      {foco && itemFoco && (
        <div
          ref={refFoco}
          data-testid="notificacao-em-foco"
          className="bg-white border-2 border-primary/25 rounded-2xl md:rounded-[28px] p-4 md:p-6 shadow-sm text-left animate-fadeIn"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-primary/5 border border-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icone size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="inline-block text-[9px] font-black uppercase tracking-widest text-primary bg-primary/5 border border-primary/10 rounded-full px-2 py-0.5">
                Notificação seleccionada
              </span>
              <h4 className="text-sm md:text-base font-black text-slate-900 leading-tight mt-1.5">{itemFoco.title}</h4>
              <p className="text-[11px] md:text-xs text-slate-600 font-semibold leading-relaxed mt-1">{itemFoco.message}</p>
              {assunto && (
                <p className="text-[11px] md:text-xs text-slate-500 font-bold mt-2">
                  Correspondência: <span className="text-primary font-black">{assunto}</span>
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-3.5">
                <button
                  type="button"
                  data-testid="notificacao-ir-inqueritos"
                  onClick={() => { onLimparFoco?.(); setTab('inqueritos'); }}
                  className="px-3.5 py-2 rounded-xl bg-[#0E2B64] hover:bg-[#081a3d] text-white text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                >
                  Abrir inquéritos <ChevronRight size={12} />
                </button>
                <button
                  type="button"
                  data-testid="notificacao-ir-correspondencias"
                  onClick={() => { onLimparFoco?.(); setTab('correspondencias'); }}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.98]"
                >
                  Ver correspondência
                </button>
                <button
                  type="button"
                  onClick={() => onLimparFoco?.()}
                  className="px-3 py-2 rounded-xl bg-transparent text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <NotificationsCenterContent
        notifications={notifications}
        setTab={setTab}
        appMode={appMode as any}
        messages={messages}
        onOpenMessage={onOpenMessage}
        onAbrirNotificacao={onAbrirNotificacao}
      />
    </section>
  );
}
