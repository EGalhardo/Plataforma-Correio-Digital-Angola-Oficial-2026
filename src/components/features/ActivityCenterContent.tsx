import { History, Mail, FileText, Bell, CheckCircle2, Clock3, Send, Building2 } from 'lucide-react';
import { AppMode, AppNotification, Correspondence, DocRequest, Document, Message, UserRequest } from '../../types';

interface ActivityCenterContentProps {
  appMode: AppMode;
  messages: Message[];
  sentMessages: Message[];
  documents: Document[];
  docRequests: DocRequest[];
  userRequests: UserRequest[];
  correspondences: Correspondence[];
  notifications: AppNotification[];
  auditLogs: { action?: string; user?: string; timestamp?: string; type?: string }[];
  setTab: (tab: string) => void;
}

export function ActivityCenterContent({
  appMode,
  messages,
  sentMessages,
  documents,
  docRequests,
  userRequests,
  correspondences,
  notifications,
  auditLogs,
  setTab,
}: ActivityCenterContentProps) {
  const isAdmin = appMode === 'admin';
  const isInstitution = appMode === 'institution';

  const title = isAdmin ? 'Centro de Histórico Operacional' : isInstitution ? 'Histórico Institucional' : 'Histórico do Cidadão';
  const subtitle = isAdmin
    ? 'Evidências recentes de gestão, emissão, aprovação e segurança da plataforma.'
    : isInstitution
      ? 'Acompanhe envios, respostas, validações e pedidos associados à instituição activa.'
      : 'Consulte correspondências, documentos, pedidos e eventos recentes do seu endereço digital oficial.';

  const messageTimeline = isAdmin
    ? correspondences.slice(0, 4).map((correspondence) => ({
        id: `cor-${correspondence.id}`,
        title: correspondence.subject,
        desc: `${correspondence.sender} • ${correspondence.date}`,
        action: 'Expediente',
        target: 'gov-correspondencias',
        icon: Mail,
      }))
    : messages.slice(0, 4).map((message) => ({
        id: `msg-${message.id}`,
        title: message.details?.subject || message.preview,
        desc: `${message.org} • ${message.date}`,
        action: isInstitution ? 'Correio' : 'Correspondência',
        target: 'correspondencias',
        icon: Mail,
      }));

  const activityItems = [
    ...messageTimeline,
    ...documents.slice(0, 3).map((document) => ({
      id: `doc-${document.code}`,
      title: document.name,
      desc: `${document.issuer} • ${document.issuedAt}`,
      action: 'Documento',
      target: 'pasta-digital',
      icon: FileText,
    })),
    ...docRequests.slice(0, 3).map((request) => ({
      id: `req-${request.id}`,
      title: request.docType,
      desc: `${request.institution} • ${request.status}`,
      action: 'Solicitação',
      target: isAdmin ? 'gov-docs' : 'pasta-digital',
      icon: Clock3,
    })),
    ...notifications.slice(0, 3).map((notification) => ({
      id: `notif-${notification.id}`,
      title: notification.title,
      desc: `${notification.message} • ${notification.time}`,
      action: 'Notificação',
      target: 'notificacoes',
      icon: Bell,
    })),
    ...(isAdmin ? auditLogs.slice(0, 3).map((log, index) => ({
      id: `audit-${index}`,
      title: log.action || 'Evento de Auditoria',
      desc: `${log.user || 'Sistema'} • ${log.timestamp || 'Agora'}`,
      action: 'Auditoria',
      target: 'gov-seguranca',
      icon: CheckCircle2,
    })) : []),
  ].slice(0, 10);

  const topMetrics = isAdmin
    ? [
        { label: 'Expedientes', value: correspondences.length, description: 'Registos operacionais monitorizados.' },
        { label: 'Aprovações', value: docRequests.filter((item) => item.status === 'Aprovado').length, description: 'Solicitações homologadas.' },
        { label: 'Auditoria', value: auditLogs.length, description: 'Eventos disponíveis no histórico recente.' },
      ]
    : isInstitution
      ? [
          { label: 'Mensagens', value: messages.length, description: 'Pedidos e respostas da instituição.' },
          { label: 'Enviadas', value: sentMessages.length, description: 'Correspondências já despachadas.' },
          { label: 'Validações', value: documents.length, description: 'Documentos disponíveis para validação.' },
        ]
      : [
          { label: 'Correspondências', value: messages.length + sentMessages.length, description: 'Leituras e respostas registadas.' },
          { label: 'Documentos', value: documents.length, description: 'Itens guardados na pasta digital.' },
          { label: 'Solicitações', value: userRequests.length + docRequests.length, description: 'Pedidos em acompanhamento.' },
        ];

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <History size={24} />
          </div>
          <div>
            <h3 className="text-lg md:text-2xl font-black text-primary leading-tight uppercase italic tracking-tighter">{title}</h3>
            <p className="text-[10px] md:text-sm text-slate-600 font-semibold max-w-2xl">{subtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-widest">
          <button onClick={() => setTab(isAdmin ? 'gov-dashboard' : 'home')} className="text-slate-400 hover:text-primary transition-colors cursor-pointer">Voltar ao Painel</button>
          <button onClick={() => setTab('notificacoes')} className="text-slate-400 hover:text-primary transition-colors cursor-pointer">Notificações</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topMetrics.map((metric) => (
          <div key={metric.label} className="bg-white border border-slate-200 rounded-[28px] p-5 shadow-sm">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">{metric.label}</span>
            <div className="text-2xl font-black text-slate-950">{metric.value}</div>
            <p className="text-[10px] text-slate-500 font-semibold mt-1">{metric.description}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="bg-white border border-slate-200 rounded-[28px] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 bg-primary rounded-full" />
            <h4 className="text-sm font-black text-slate-950 uppercase tracking-tight">Linha Temporal Recente</h4>
          </div>
          <div className="space-y-3">
            {activityItems.length > 0 ? activityItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.target)}
                className="w-full text-left bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl p-4 transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-primary flex items-center justify-center shrink-0">
                    <item.icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs font-black text-slate-900 truncate">{item.title}</span>
                    <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">{item.action}</span>
                </div>
              </button>
            )) : (
              <div className="py-10 text-center bg-slate-50 border border-dashed border-slate-200 rounded-[24px]">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Sem actividade registada</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-[28px] p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={16} className="text-primary" />
              <h4 className="text-sm font-black text-slate-950 uppercase tracking-tight">Estado dos Fluxos</h4>
            </div>
            <div className="space-y-3 text-[11px]">
              <div className="flex justify-between items-center bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                <span className="font-bold text-slate-700">Correspondências pendentes</span>
                <span className="font-black text-amber-600">{messages.filter((item) => item.unread).length}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                <span className="font-bold text-slate-700">Solicitações em aberto</span>
                <span className="font-black text-indigo-600">{docRequests.filter((item) => item.status === 'Pendente').length + userRequests.filter((item) => item.status !== 'concluido').length}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                <span className="font-bold text-slate-700">Eventos auditáveis</span>
                <span className="font-black text-emerald-600">{auditLogs.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[28px] p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 size={16} className="text-primary" />
              <h4 className="text-sm font-black text-slate-950 uppercase tracking-tight">Atalhos de Continuidade</h4>
            </div>
            <div className="space-y-2">
              {(isAdmin
                ? [
                    { label: 'Abrir Correspondências Nacionais', target: 'gov-correspondencias' },
                    { label: 'Abrir Emissão Documental', target: 'gov-docs' },
                    { label: 'Abrir Relatórios', target: 'gov-relatorio' },
                  ]
                : isInstitution
                  ? [
                      { label: 'Abrir Correio Institucional', target: 'correspondencias' },
                      { label: 'Abrir QR Code', target: 'inst-qrcode' },
                      { label: 'Abrir Conta Institucional', target: 'perfil' },
                    ]
                  : [
                      { label: 'Abrir Correspondências', target: 'correspondencias' },
                      { label: 'Abrir Pasta Digital', target: 'pasta-digital' },
                    ]
              ).map((link) => (
                <button
                  key={link.target}
                  onClick={() => setTab(link.target)}
                  className="w-full text-left py-3 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-700 transition-all cursor-pointer"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
