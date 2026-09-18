import { ListaRolavel } from '../ui/ListaRolavel';
import { useState, useEffect, useMemo } from 'react';
import { Plus, ClipboardList, ShieldAlert, Search, ArrowRight, Bot } from 'lucide-react';
import type { Message, AppNotification } from '../../types';
import { BotaoVoltar } from '../ui/BotaoVoltar';
import { listarParticipacao, temInqueritoIA, temInqueritoNormal, filtrarAbaInquerito, type AbaInquerito } from '../../utils/listasParticipacao';
import { novidadesPorMensagem } from '../../utils/notificacoesAtalhos';
import { useLanguage } from '../../hooks/useLanguage';

interface Props {
  tipo: 'inqueritos' | 'denuncias';
  isInst: boolean;
  messages: Message[];
  notifications?: AppNotification[];
  onOpen: (message: Message) => void;
  onBack: () => void;
  onCreate?: () => void;
}

export function ListaParticipacaoContent({tipo, isInst, messages, notifications = [], onOpen, onBack, onCreate}: Props) {
  const {t} = useLanguage();
  const [query, setQuery] = useState('');
  const [aba, setAba] = useState<AbaInquerito>('normal');
  useEffect(() => { setQuery(''); setAba('normal'); }, [tipo, isInst]);
  const inqueritos = tipo === 'inqueritos';
  const titulo = inqueritos ? 'Inquéritos' : 'Livro de Reclamações';
  const anonimizar = !inqueritos && isInst;
  const base = useMemo(() => {
    const todos = listarParticipacao(messages, tipo);
    return inqueritos ? filtrarAbaInquerito(todos, aba) : todos;
  }, [messages, tipo, inqueritos, aba]);
  const lista = useMemo(() => listarParticipacao(base, tipo, query, anonimizar), [base, tipo, query, anonimizar]);
  const total = base.length;
  // Denúncias do cidadão vivem nas ENVIADAS: o «não lido» é recibo do
  // destinatário — as novidades são os avisos de estado ligados a cada item.
  const fundeNaoLidas = inqueritos || isInst;
  const novidades = useMemo(
    () => novidadesPorMensagem(notifications, listarParticipacao(messages, tipo), tipo, fundeNaoLidas),
    [notifications, messages, tipo, fundeNaoLidas],
  );
  const itensComNovidade = lista.filter(m => {
    const nov = novidades.porMensagem.get(m.id);
    return nov && (nov.naoLida || nov.atualizacoes > 0);
  }).length;
  const Icon = inqueritos ? ClipboardList : ShieldAlert;
  return <section className="space-y-4 md:space-y-6" aria-label={t(titulo)}>
    <header className="flex flex-wrap items-center gap-3">
      <BotaoVoltar onClick={onBack}/>
      {inqueritos
        ? <span className="p-3 rounded-2xl bg-primary/10 text-primary"><Icon size={24}/></span>
        : <span className="p-2 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
            <img src="https://i.postimg.cc/y8j1d36z/ANIESA-2.jpg" alt="ANIESA" loading="lazy"
                 className="h-[72px] w-[72px] md:h-[88px] md:w-[88px] object-contain rounded-xl" />
          </span>}
      <div className={inqueritos ? "min-w-0" : "flex-1 min-w-0"}><h2 className="text-xl md:text-2xl font-black text-primary">{t(titulo)}</h2>
        {!inqueritos && <p className="text-xs md:text-sm text-slate-500">{t(isInst ? 'Consulte as denúncias dirigidas à sua instituição e acompanhe o respectivo processo.' : 'Consulte as denúncias que enviou e acompanhe o respectivo processo.')}</p>}
      </div>
      {inqueritos && (
        <div role="tablist" aria-label={t('Tipo de inquérito')} data-aba-inquerito={aba}
          className="flex items-end gap-1.5 md:gap-5 border-b border-slate-200 overflow-x-auto custom-scrollbar-h shrink-0">
          {([
            { a: 'normal', rotulo: t('Normal'), Icone: ClipboardList },
            { a: 'ia', rotulo: t('IA'), Icone: Bot },
          ] as const).map(({ a, rotulo, Icone }) => {
            const activo = aba === a;
            return (
              <button key={a} type="button" role="tab" aria-selected={activo} data-aba={a} id={`tab-inqueritos-${a}`}
                onClick={() => { setAba(a); setQuery(''); }}
                className={`relative flex items-center gap-2.5 px-3 md:px-6 py-2.5 md:py-3 -mb-px whitespace-nowrap text-[0.7rem] md:text-[0.9rem] font-black transition-colors bg-transparent border-0 border-b-2 cursor-pointer ${
                  activo ? 'text-primary border-primary' : 'text-slate-400 border-transparent hover:text-slate-600'
                }`}>
                <Icone size={18} className="md:w-[1.4rem] md:h-[1.4rem] shrink-0" strokeWidth={activo ? 2.2 : 1.8} />
                {rotulo}
              </button>
            );
          })}
        </div>
      )}
      {!inqueritos && !isInst && onCreate && <button type="button" onClick={onCreate} className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 bg-primary text-white rounded-2xl px-5 py-3 text-xs font-black shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors">
        <Plus size={17} aria-hidden="true" />{t('Criar Denúncia')}
      </button>}
    </header>
    <div className="relative">
      <Search size={18} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/>
      <input type="search" aria-label={t(`Procurar ${inqueritos ? 'inquéritos' : 'denúncias'}`)} placeholder={t(`Procurar ${inqueritos ? 'inquéritos' : 'denúncias'} por assunto ou número...`)} value={query} onChange={e=>setQuery(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"/>
    </div>
    <p className="text-xs font-bold text-slate-500" aria-live="polite" data-novidades-tab={itensComNovidade} data-avisos-orfas={novidades.orfas}>{lista.length} {t('de')} {total} {t(inqueritos ? 'mensagens com inquéritos' : 'denúncias')}
      {itensComNovidade > 0 && <span className="text-red-600"> · {itensComNovidade} {t(fundeNaoLidas ? 'não lidas' : 'com atualizações')}</span>}
      {novidades.orfas > 0 && <span> · +{novidades.orfas} {t('avisos nas notificações')}</span>}
    </p>
    {lista.length === 0 ? <div className="p-8 text-center rounded-2xl border border-slate-200 bg-white text-slate-500">
      {t(query.trim() ? 'Nenhum resultado para esta procura.' : inqueritos ? (aba === 'ia' ? 'Ainda não recebeu inquéritos com IA.' : 'Ainda não recebeu inquéritos normais.') : isInst ? 'Ainda não recebeu denúncias.' : 'Ainda não enviou denúncias.')}
    </div> : <ListaRolavel count={lista.length} label={t(titulo)}>
      {lista.map(m=>{ const nov = novidades.porMensagem.get(m.id);
        return <button type="button" key={m.id} data-msg-id={m.id} onClick={()=>onOpen(m)} className="w-full min-w-0 text-left bg-white border border-slate-200 rounded-2xl p-4 md:p-5 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-500">
              <span>#{m.id}</span><span>{m.date}</span>
              {inqueritos && <span className="text-indigo-700">{t(temInqueritoIA(m) ? temInqueritoNormal(m) ? 'Normal e com IA' : 'Com IA' : 'Normal')}</span>}
            </div>
            <h3 className="font-bold text-primary break-words">{m.details?.subject || m.preview || t(titulo)}</h3>
            <p className="text-xs text-slate-500 break-words">{anonimizar ? t('Remetente: Anónimo') : `${t(inqueritos ? 'Instituição' : 'Destinatário')}: ${m.org || '—'}`}</p>
          </div><ArrowRight size={18} aria-hidden="true" className="shrink-0 text-primary mt-1"/>
        </div>
        <span className="block text-xs font-bold text-primary mt-3">{t(inqueritos ? 'Consultar inquérito' : 'Consultar denúncia')}</span>
      </button>; })}
    </ListaRolavel>}
  </section>;
}
