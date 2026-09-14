import { ListaRolavel } from '../ui/ListaRolavel';
import { useState, useEffect } from 'react';
import { ClipboardList, ShieldAlert, Search, ArrowRight } from 'lucide-react';
import type { Message } from '../../types';
import { BotaoVoltar } from '../ui/BotaoVoltar';
import { listarParticipacao, temInqueritoIA, temInqueritoNormal } from '../../utils/listasParticipacao';
import { useLanguage } from '../../hooks/useLanguage';

interface Props {
  tipo: 'inqueritos' | 'denuncias';
  isInst: boolean;
  messages: Message[];
  onOpen: (message: Message) => void;
  onBack: () => void;
}

export function ListaParticipacaoContent({tipo, isInst, messages, onOpen, onBack}: Props) {
  const {t} = useLanguage();
  const [query, setQuery] = useState('');
  useEffect(() => setQuery(''), [tipo, isInst]);
  const inqueritos = tipo === 'inqueritos';
  const titulo = inqueritos ? 'Inquéritos' : isInst ? 'Denúncias recebidas' : 'Denúncias';
  const anonimizar = !inqueritos && isInst;
  const lista = listarParticipacao(messages, tipo, query, anonimizar);
  const total = listarParticipacao(messages, tipo).length;
  const Icon = inqueritos ? ClipboardList : ShieldAlert;
  return <section className="space-y-4 md:space-y-6" aria-label={t(titulo)}>
    <header className="flex items-center gap-3">
      <BotaoVoltar onClick={onBack}/>
      <span className="p-3 rounded-2xl bg-primary/10 text-primary"><Icon size={24}/></span>
      <div><h2 className="text-xl md:text-2xl font-black text-primary">{t(titulo)}</h2>
        <p className="text-xs md:text-sm text-slate-500">{t(inqueritos
          ? 'Inquéritos recebidos — consulte a mensagem para responder e acompanhar a sua participação.'
          : isInst ? 'Consulte as denúncias dirigidas à sua instituição e acompanhe o respectivo processo.'
          : 'Consulte as denúncias que enviou e acompanhe o respectivo processo.')}</p>
      </div>
    </header>
    <div className="relative">
      <Search size={18} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/>
      <input type="search" aria-label={t(`Procurar ${inqueritos ? 'inquéritos' : 'denúncias'}`)} placeholder={t(`Procurar ${inqueritos ? 'inquéritos' : 'denúncias'} por assunto ou número...`)} value={query} onChange={e=>setQuery(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"/>
    </div>
    <p className="text-xs font-bold text-slate-500" aria-live="polite">{lista.length} {t('de')} {total} {t(inqueritos ? 'mensagens com inquéritos' : 'denúncias')}</p>
    {lista.length === 0 ? <div className="p-8 text-center rounded-2xl border border-slate-200 bg-white text-slate-500">
      {t(query.trim() ? 'Nenhum resultado para esta procura.' : inqueritos ? 'Ainda não recebeu inquéritos.' : isInst ? 'Ainda não recebeu denúncias.' : 'Ainda não enviou denúncias.')}
    </div> : <ListaRolavel count={lista.length} label={t(titulo)}>
      {lista.map(m=><button type="button" key={m.id} onClick={()=>onOpen(m)} className="w-full min-w-0 text-left bg-white border border-slate-200 rounded-2xl p-4 md:p-5 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-500">
              <span>#{m.id}</span><span>{m.date}</span>
              {inqueritos && <span className="text-indigo-700">{t(temInqueritoIA(m) ? temInqueritoNormal(m) ? 'Normal e com IA' : 'Com IA' : 'Normal')}</span>}
            </div>
            <h3 className="font-bold text-primary break-words">{m.details?.subject || m.preview || t(titulo)}</h3>
            <p className="text-xs text-slate-500 break-words">{anonimizar ? t('Remetente: Anónimo') : `${t(inqueritos ? 'Instituição' : 'Destinatário')}: ${m.org || '—'}`}</p>
          </div><ArrowRight size={18} aria-hidden="true" className="shrink-0 text-primary mt-1"/>
        </div>
        <span className="block text-xs font-bold text-primary mt-3">{t(inqueritos ? 'Consultar inquérito' : 'Consultar denúncia')}</span>
      </button>)}
    </ListaRolavel>}
  </section>;
}
