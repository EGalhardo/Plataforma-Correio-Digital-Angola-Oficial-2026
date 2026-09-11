import { Bell, BadgeCheck, ShieldAlert, Info, ChevronRight } from 'lucide-react';
import { AppNotification, AppMode } from '../../types';
import { BotaoVoltar } from '../ui/BotaoVoltar';

interface NotificationsCenterContentProps {
  notifications: AppNotification[];
  setTab: (tab: string) => void;
  appMode: AppMode;
}

export function NotificationsCenterContent({ notifications, setTab, appMode }: NotificationsCenterContentProps) {
  const grouped = {
    success: notifications.filter((n) => n.type === 'success'),
    warning: notifications.filter((n) => n.type === 'warning'),
    info: notifications.filter((n) => n.type === 'info')
  };

  const navigateToTarget = (targetTab: string) => {
    setTab(targetTab || (appMode === 'admin' ? 'gov-dashboard' : 'home'));
  };

  const sections = [
    { key: 'warning', label: 'Alertas Prioritários', items: grouped.warning, icon: ShieldAlert, theme: 'text-amber-700 bg-amber-50 border-amber-100' },
    { key: 'success', label: 'Actualizações Concluídas', items: grouped.success, icon: BadgeCheck, theme: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
    { key: 'info', label: 'Informações do Sistema', items: grouped.info, icon: Info, theme: 'text-blue-700 bg-blue-50 border-blue-100' },
  ];

  return (
    <section className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
        <div className="flex items-center gap-3.5 text-left">
          <BotaoVoltar />
          <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
            <Bell size={20} className="md:w-6 md:h-6" />
          </div>
          <div>
            <h3 className="text-lg md:text-2xl font-black text-primary leading-tight uppercase tracking-tight">Centro de Notificações</h3>
            <p className="text-xs text-slate-500 font-medium normal-case">{notifications.length} alertas sincronizados</p>
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar-h py-1 no-scrollbar">
          <button onClick={() => setTab('historico')} className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap shadow-3xs hover:border-slate-300 transition-all cursor-pointer">Ver Histórico</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl md:rounded-[28px] p-3 md:p-5 shadow-xs text-left">
          <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 truncate">Prioridade</span>
          <div className="text-lg md:text-2xl font-black text-slate-950">{grouped.warning.length}</div>
          <p className="hidden md:block text-[10px] text-slate-500 font-medium mt-1">Alertas que exigem atenção imediata.</p>
        </div>
        <div className="bg-white border border-slate-200/90 rounded-2xl md:rounded-[28px] p-3 md:p-5 shadow-xs text-left">
          <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 truncate">Concluídas</span>
          <div className="text-lg md:text-2xl font-black text-slate-950">{grouped.success.length}</div>
          <p className="hidden md:block text-[10px] text-slate-500 font-medium mt-1">Confirmações de emissão ou entrega.</p>
        </div>
        <div className="bg-white border border-slate-200/90 rounded-2xl md:rounded-[28px] p-3 md:p-5 shadow-xs text-left">
          <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 truncate">Informativas</span>
          <div className="text-lg md:text-2xl font-black text-slate-950">{grouped.info.length}</div>
          <p className="hidden md:block text-[10px] text-slate-500 font-medium mt-1">Eventos operacionais do sistema.</p>
        </div>
      </div>

      <div className="space-y-3 md:space-y-4">
        {sections.map((section) => (
          <div key={section.key} className="bg-white border border-slate-200/90 rounded-2xl md:rounded-[28px] p-4 md:p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-7 h-7 md:w-8 md:h-8 rounded-xl border flex items-center justify-center ${section.theme}`}>
                <section.icon size={15} />
              </div>
              <h4 className="text-xs md:text-sm font-bold text-slate-950 uppercase tracking-tight">{section.label}</h4>
            </div>

            {section.items.length > 0 ? (
              <div className="space-y-2">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigateToTarget(item.targetTab)}
                    className="w-full text-left bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl md:rounded-2xl p-3.5 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="block text-xs font-bold text-slate-900">{item.title}</span>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">{item.message}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase block">{item.time}</span>
                        <span className="text-[9px] text-primary font-bold mt-1.5 inline-flex items-center gap-0.5">Abrir <ChevronRight size={11} /></span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl md:rounded-2xl">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nenhum registo nesta secção</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
