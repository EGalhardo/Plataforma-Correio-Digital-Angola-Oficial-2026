/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Mail, FileText, Send, Clock } from 'lucide-react';
import { HIGHLIGHT_SLIDES, INST_HIGHLIGHT_SLIDES } from '../../constants/data';
import { Message, LanguageCode } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';
import { LazyImage } from '../ui/LazyImage';
import { AnimatedCounter } from '../ui/AnimatedCounter';

interface HomeContentProps {
  activeSlide: number;
  setActiveSlide: (slide: number) => void;
  isMobile: boolean;
  setTab: (tab: string) => void;
  unreadTotal: number;
  inbox: Message[];
  sentMessages: Message[];
  handleSelectMessage: (msg: Message) => void;
  onCreateRequest?: (type: string, priority: 'Alta' | 'Média' | 'Baixa') => void;
  isInst?: boolean;
  onDoubleClickInstitution?: (name: string) => void;
  currentLanguage?: LanguageCode;
}
export function HomeContent({
  activeSlide,
  setActiveSlide,
  isMobile,
  setTab,
  unreadTotal,
  inbox,
  sentMessages,
  handleSelectMessage,
  onCreateRequest,
  isInst,
  onDoubleClickInstitution,
  currentLanguage: propLanguage
}: HomeContentProps) {
  const { currentLanguage, t } = useLanguage();
  const slides = isInst ? INST_HIGHLIGHT_SLIDES : HIGHLIGHT_SLIDES;
  const currentSlide = slides[activeSlide % slides.length];

  return (
    <div className="grid gap-3 md:gap-3.5">
      <section className="relative h-[280px] md:h-[385px] rounded-[20px] md:rounded-[24px] overflow-hidden shadow-xl border border-line/60">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${isInst ? 'gov' : 'user'}-${activeSlide}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0"
          >
            <LazyImage
              src={isMobile && currentSlide.mobileImage 
                ? currentSlide.mobileImage 
                : currentSlide.image
              }
              alt={t(currentSlide.title)}
              priority={true}
              placeholder="skeleton"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
              }}
              className="w-full h-full"
            />
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />

        {/* Slide Indicators */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveSlide(i % slides.length)}
              className={`h-1 rounded-full transition-all duration-500 ${
                activeSlide % slides.length === i ? 'w-6 bg-white' : 'w-1.5 bg-white/30'
              }`}
            />
          ))}
        </div>
      </section>

      {/* Quick Summary / Security Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <div className="bg-white border border-slate-200 rounded-[28px] md:rounded-[32px] p-4 md:p-6 flex items-center gap-4 md:gap-6 shadow-sm overflow-hidden relative group">
          <div className={`w-12 h-12 md:w-16 md:h-16 ${isInst ? 'bg-white border-slate-100' : 'bg-green-600 border-green-600'} rounded-2xl flex items-center justify-center shadow-sm shrink-0 border`}>
            {isInst ? (
              <LazyImage 
                src="https://i.postimg.cc/4x1mS4hQ/AGT.jpg" 
                alt="AGT" 
                style={{
                  width: '100%',
                  height: '100%',
                }}
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              <ShieldCheck size={24} className="md:w-8 md:h-8 text-white" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 truncate">{t("ID Digital")}</div>
            <div className="text-base md:text-xl font-black text-slate-900 leading-tight italic tracking-tighter">
              {isInst ? t('Agente AGT Verificado') : t('Cidadão Verificado')}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <div className={`w-1.5 h-1.5 rounded-full ${isInst ? 'bg-red-600' : 'bg-emerald-500'} animate-pulse`} />
              <span className="text-[9px] md:text-xs font-bold text-slate-700">{t("Protocolo Ativado 100%")}</span>
            </div>
          </div>
        </div>
        
        <div 
          role="button"
          onClick={() => setTab('correspondencias')}
          className="bg-white border border-slate-200 rounded-[28px] md:rounded-[32px] p-4 md:p-6 flex items-center gap-4 md:gap-6 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="w-12 h-12 md:w-16 md:h-16 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-sm shrink-0 group-hover:scale-110 transition-transform border border-red-600">
            <Mail size={24} className="md:w-8 md:h-8 font-bold" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 truncate">{t("Novas Mensagens")}</div>
            <AnimatedCounter
              to={unreadTotal}
              duration={1200}
              className="text-base md:text-xl font-black text-slate-900 leading-tight italic tracking-tighter"
              triggerOnVisible
            />
            <span className="text-base md:text-xl font-black text-slate-900 leading-tight italic tracking-tighter"> {t("Não Lidas")}</span>
            <div className="text-[9px] md:text-xs text-primary font-bold mt-1">{t("Ver Correspondências")} &rarr;</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 px-1 text-[10px] font-black uppercase tracking-widest">
        <button onClick={() => setTab('historico')} className="cda-link-text">{t("Ver Histórico")}</button>
        <button onClick={() => setTab('notificacoes')} className="cda-link-text">{t("Notificações")}</button>
        {isInst && (
          <button onClick={() => setTab('inst-qrcode')} className="cda-link-text">{t("Validação QR")}</button>
        )}
      </div>

      <section className="bg-white border border-slate-200 rounded-[24px] md:rounded-[32px] p-5 shadow-sm overflow-hidden relative group">
        <div className="flex flex-col md:flex-row md:items-center justify-between md:relative gap-2 mb-4 pb-2 border-b border-slate-50">
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-6 bg-primary rounded-full" />
             <div className="min-w-0">
                <h3 className="text-slate-950 font-black text-xs md:text-base italic tracking-tighter uppercase leading-none">{t("Instituições Conectadas")}</h3>
             </div>
          </div>
          <div className="md:absolute md:left-1/2 md:-translate-x-1/2 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center mt-1 md:mt-0">
            {t("Governação Electrónica")}
          </div>
          <div className="hidden md:block" />
        </div>
         <div className="flex flex-nowrap gap-2 md:gap-3 overflow-x-auto custom-scrollbar-h pb-2">
          {["SME", "AGT", "ENDE", "EPAL", "Tribunal", "Hospital", "Ministerios", "Polícia Nacional", "Notário", "Registo Civil", "Seguro Social", "Administradoras", "INE", "INAPEM"].map((name) => {
            const unreadCount = (inbox || []).filter(
              m => m.unread && (m.org || '').toUpperCase().includes(name.toUpperCase())
            ).length;

            return (
              <div key={name} className="relative shrink-0 pt-1.5 pr-1.5">
                <button 
                  onClick={() => {
                    if (!isInst) {
                      if (name === "AGT") {
                         onCreateRequest?.("NIF", "Média");
                      } else if (name === "SME") {
                         onCreateRequest?.("Visto/BI", "Alta");
                      } else if (name === "INE") {
                         onCreateRequest?.("Certificação Estatística", "Média");
                      } else if (name === "INAPEM") {
                         onCreateRequest?.("Certificação PME", "Média");
                      }
                    }
                  }}
                  onDoubleClick={() => {
                    if (!isInst && onDoubleClickInstitution) {
                      onDoubleClickInstitution?.(name);
                    }
                  }}
                  className="px-4 py-2 rounded-full text-[10px] md:text-xs font-black bg-[#0E2B64] text-white border border-[#0E2B64] whitespace-nowrap hover:bg-[#0c2350] transition-all cursor-pointer shadow-md hover:shadow-lg text-center"
                  title={(isInst || !onDoubleClickInstitution) ? name : "Dê duplo clique para ver detalhes desta instituição"}
                >
                  {name}
                </button>
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white shadow-md animate-pulse ring-1 ring-white">
                    {unreadCount}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className={`grid grid-cols-1 md:grid-cols-2 ${(inbox || []).some(m => m.unread) ? 'xl:grid-cols-3' : 'xl:grid-cols-2'} gap-4`}>
        {(inbox || []).some(m => m.unread) && (
          <section className={`bg-white border border-slate-100 rounded-[28px] md:rounded-[32px] p-5 md:p-6 shadow-sm flex flex-col group ${isInst ? 'order-2' : ''}`}>
            <div className="flex items-center justify-between mb-5 shrink-0 px-2">
               <div className="flex items-center gap-2">
                  <Mail size={16} className="text-red-500" />
                  <h3 className="text-slate-950 font-black text-sm md:text-base italic tracking-tighter">{t("Não Lidas")}</h3>
               </div>
               <span className="text-red-500 font-black text-sm md:text-base">{(inbox || []).filter(m => m.unread).length}</span>
            </div>
            <div className="h-[320px] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
              {(inbox || []).filter(m => m.unread).map(m => (
                <div key={m.id} role="button" className="flex justify-between items-center text-[12px] md:text-sm border-b border-slate-50 pb-3 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer px-2 py-1.5 rounded-xl group/item" onClick={() => handleSelectMessage(m)}>
                  <div className="min-w-0 flex-1 truncate mr-3">
                    <span className="font-black text-slate-900 group-hover/item:text-primary transition-colors">{t(m.org)}:</span>
                    <span className="ml-1 text-slate-600 font-medium">{t(m.preview)}</span>
                  </div>
                  <span className="text-white font-black shrink-0 text-[10px] bg-red-600 px-2 py-0.5 rounded-lg shadow-lg shadow-red-100">{m.date}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className={`bg-white border border-slate-100 rounded-[28px] md:rounded-[32px] p-5 md:p-6 shadow-sm flex flex-col group ${isInst ? 'order-1' : ''}`}>
          <div className="flex items-center justify-between mb-5 shrink-0 px-2">
             <div className="flex items-center gap-2">
                <Mail size={16} className="text-emerald-500" />
                <h3 className="text-slate-950 font-black text-sm md:text-base italic tracking-tighter">{t("Lidas")}</h3>
             </div>
             <span className="text-emerald-500 font-black text-sm md:text-base">{(inbox || []).filter(m => !m.unread).length}</span>
          </div>
          <div className="h-[320px] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
            {(inbox || []).filter(m => !m.unread).map(m => (
              <div key={m.id} role="button" className="flex justify-between items-center text-[12px] md:text-sm border-b border-slate-50 pb-3 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer px-2 py-1.5 rounded-xl group/item" onClick={() => handleSelectMessage(m)}>
                <div className="min-w-0 flex-1 truncate mr-3">
                  <span className="font-bold text-slate-700">{t(m.org)}:</span>
                  <span className="ml-1 text-slate-500 font-medium">{t(m.preview)}</span>
                </div>
                <span className="text-white font-black shrink-0 text-[10px] bg-emerald-600 px-2.5 py-1 rounded-lg border border-emerald-700 font-sans tracking-wide uppercase">{m.date}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={`bg-white border border-slate-100 rounded-[28px] md:rounded-[32px] p-5 md:p-6 shadow-sm flex flex-col group ${(inbox || []).some(m => m.unread) ? 'md:col-span-2 xl:col-span-1' : ''} ${isInst ? 'order-3' : ''}`}>
          <div className="flex items-center justify-between mb-5 shrink-0 px-2">
             <div className="flex items-center gap-2">
                <Mail size={16} className="text-blue-500" />
                <h3 className="text-slate-950 font-black text-sm md:text-base italic tracking-tighter">{t("Enviadas")}</h3>
             </div>
             <span className="text-blue-500 font-black text-sm md:text-base">{(sentMessages || []).length}</span>
          </div>
          <div className="h-[320px] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
            {(sentMessages || []).map(m => (
              <div key={m.id} role="button" className="flex justify-between items-center text-[12px] md:text-sm border-b border-slate-50 pb-3 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer px-2 py-1.5 rounded-xl group/item" onClick={() => handleSelectMessage(m)}>
                <div className="min-w-0 flex-1 truncate mr-3">
                  <span className="font-bold text-slate-700">{t(m.org)}:</span>
                  <span className="ml-1 text-slate-500 font-medium">{t(m.preview)}</span>
                </div>
                <span className="text-white font-black shrink-0 text-[10px] bg-blue-600 px-2.5 py-1 rounded-lg border border-blue-700 font-sans tracking-wide uppercase">{m.date}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
