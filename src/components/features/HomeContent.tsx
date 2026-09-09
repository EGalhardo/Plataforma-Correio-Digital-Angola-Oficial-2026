/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Mail } from 'lucide-react';
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
  /** F11 — marca da instituição da sessão (sigla/logótipo/estado). */
  instSigla?: string;
  instLogoUrl?: string;
  /**
   * v37.39 — origem do logótipo resolvido no App:
   * 'proprio' = upload da instituição · 'categoria' = logomarca oficial ·
   * 'neutro' = avatar com a sigla. Decide o object-fit e o fallback.
   */
  instLogoOrigem?: 'proprio' | 'categoria' | 'neutro' | 'nenhum';
  /** v37.39 — avatar neutro com a sigla, usado se o logótipo não carregar. */
  instLogoFallback?: string;
  instVerified?: boolean;
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
  instSigla,
  instLogoUrl,
  instLogoOrigem,
  instLogoFallback,
  instVerified,
  onDoubleClickInstitution}: HomeContentProps) {
  const { t } = useLanguage();
  /**
   * v37.39 — se a logomarca oficial falhar (URL removida/fora do ar), cai no
   * avatar neutro com a sigla em vez do bloco genérico "Imagem não disponível".
   * Guardamos o URL que falhou: assim o estado repõe-se sozinho quando a
   * sessão muda de instituição.
   */
  const [logoFalhouEm, setLogoFalhouEm] = useState<string | null>(null);
  const logoFalhou = Boolean(instLogoUrl) && logoFalhouEm === instLogoUrl;
  const slides = isInst ? INST_HIGHLIGHT_SLIDES : HIGHLIGHT_SLIDES;
  const currentSlide = slides[activeSlide % slides.length];

  // Contagens para layout dinâmico dos containers de correspondências:
  const unreadCount = (inbox || []).filter(m => m.unread).length;
  const readCount = (inbox || []).filter(m => !m.unread).length;
  const sentCount = (sentMessages || []).length;

  // Regra de layout desktop: quando "Não Lidas" estiver vazia (0) E os restantes
  // possuírem correspondências (> 0), oculta "Não Lidas" no desktop e expande
  // os restantes para 50% / 50% da largura útil cada (2 colunas).
  const shouldHideUnread = unreadCount === 0 && (readCount > 0 || sentCount > 0);

  return (
    <div className="grid gap-3 md:gap-3.5">
      <section className="relative h-[170px] sm:h-[240px] md:h-[385px] rounded-2xl md:rounded-[28px] overflow-hidden shadow-xs border border-slate-200/90 bg-slate-900">
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
                objectFit: 'cover',
              }}
              className="w-full h-full"
            />
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />

        {/* Slide Indicators */}
        <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
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
        <div className="bg-white border border-slate-200 rounded-2xl md:rounded-[28px] p-4 md:p-6 flex items-center gap-3.5 md:gap-5 shadow-xs overflow-hidden relative group">
          <div className={`w-11 h-11 md:w-14 md:h-14 ${isInst ? 'bg-white border-slate-100' : 'bg-emerald-600 border-emerald-600'} rounded-2xl flex items-center justify-center shadow-xs shrink-0 border`}>
            {isInst ? (
              <LazyImage
                key={`${logoFalhou ? 'fb' : 'ok'}:${instLogoUrl || ''}`}
                src={logoFalhou ? (instLogoFallback || '') : (instLogoUrl || '')}
                alt={instSigla || 'Instituição'}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: instLogoOrigem === 'proprio' && !logoFalhou ? 'cover' : 'contain',
                }}
                className="w-full h-full rounded-2xl"
                onError={() => { if (instLogoUrl) setLogoFalhouEm(instLogoUrl); }}
              />
            ) : (
              <ShieldCheck size={22} className="md:w-7 md:h-7 text-white" />
            )}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 truncate">{t("ID Digital")}</div>
            <div className="text-sm md:text-lg font-black text-slate-900 leading-tight tracking-tight truncate">
              {isInst ? t('Agente {sigla} Verificado').replace('{sigla}', instSigla || 'AGT') : t('Cidadão Verificado')}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <div className={`w-2 h-2 rounded-full ${isInst && instVerified === false ? 'bg-red-600' : 'bg-emerald-500'} animate-pulse shrink-0`} />
              <span className="text-[10px] md:text-xs font-semibold text-slate-600">{t("Protocolo Ativado 100%")}</span>
            </div>
          </div>
        </div>
        
        <div 
          role="button"
          onClick={() => setTab('correspondencias')}
          className="bg-white border border-slate-200 rounded-2xl md:rounded-[28px] p-4 md:p-6 flex items-center gap-3.5 md:gap-5 shadow-xs hover:border-primary/20 transition-all cursor-pointer group relative overflow-hidden text-left"
        >
          <div className="w-11 h-11 md:w-14 md:h-14 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform border border-red-600">
            <Mail size={22} className="md:w-7 md:h-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 truncate">{t("Novas Mensagens")}</div>
            <div className="flex items-baseline gap-1 truncate">
              <AnimatedCounter
                to={unreadTotal}
                duration={1200}
                className="text-sm md:text-lg font-black text-slate-900 leading-tight tracking-tight"
                triggerOnVisible
              />
              <span className="text-sm md:text-lg font-black text-slate-900 leading-tight tracking-tight"> {t("Não Lidas")}</span>
            </div>
            <div className="text-[10px] md:text-xs text-primary font-bold mt-1 flex items-center gap-1">{t("Ver Correspondências")} &rarr;</div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar-h py-1 px-0.5 no-scrollbar">
        <button onClick={() => setTab('historico')} className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap shadow-3xs hover:border-slate-300 transition-all cursor-pointer">{t("Ver Histórico")}</button>
        <button onClick={() => setTab('notificacoes')} className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap shadow-3xs hover:border-slate-300 transition-all cursor-pointer">{t("Notificações")}</button>
        <button onClick={() => setTab('directorio-orgaos')} className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap shadow-3xs hover:border-slate-300 transition-all cursor-pointer">{t("Directório de Órgãos")}</button>
        {isInst ? (
          <button onClick={() => setTab('inst-pagamentos')} className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap shadow-3xs hover:border-slate-300 transition-all cursor-pointer">{t("Pagamentos")}</button>
        ) : (
          <button onClick={() => setTab('pagamentos')} className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap shadow-3xs hover:border-slate-300 transition-all cursor-pointer">{t("Pagamentos")}</button>
        )}
        {isInst && (
          <button onClick={() => setTab('inst-qrcode')} className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap shadow-3xs hover:border-slate-300 transition-all cursor-pointer">{t("Validação QR")}</button>
        )}
      </div>

      <section className="bg-white border border-slate-200/90 rounded-2xl md:rounded-[28px] p-4 md:p-5 shadow-xs overflow-hidden relative group">
        <div className="flex flex-row items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 min-w-0">
             <div className="w-1.5 h-4 md:h-5 bg-primary rounded-full shrink-0" />
             <div className="min-w-0">
                <h3 className="text-slate-900 font-bold text-xs md:text-sm leading-none truncate">{t("Instituições Conectadas")}</h3>
             </div>
          </div>
          <div className="text-[10px] font-semibold text-slate-400 text-right shrink-0">
            {t("Governação Electrónica")}
          </div>
        </div>
         <div className="flex flex-nowrap gap-2 md:gap-3 overflow-x-auto custom-scrollbar-h pb-2">
          {["INAPEM", "SME", "AGT", "ENDE", "EPAL", "Tribunal", "Hospital", "Ministerios", "Polícia Nacional", "Notário", "Registo Civil", "Seguro Social", "Administradoras", "INE"].map((name) => {
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
                  title={(isInst || !onDoubleClickInstitution) ? t(name) : t("Dê duplo clique para ver detalhes desta instituição")}
                >
                  {t(name)}
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

      {/* Containers de Correspondências — Layout dinâmico em Desktop (3 colunas ou 2 colunas 50/50 quando Não Lidas estiver vazia) */}
      <div className={`grid grid-cols-1 ${shouldHideUnread ? 'md:grid-cols-2 xl:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-3'} gap-3 md:gap-4`}>
        {!shouldHideUnread && (
          <section className={`bg-white border border-slate-200/90 rounded-2xl md:rounded-[28px] p-4 md:p-6 shadow-xs flex flex-col group ${isInst ? 'order-2' : ''}`}>
            <div className="flex items-center justify-between mb-3.5 shrink-0 px-1">
               <div className="flex items-center gap-2">
                  <Mail size={16} className="text-red-500" />
                  <h3 className="text-slate-900 font-bold text-sm md:text-base tracking-tight">{t("Não Lidas")}</h3>
               </div>
               <span className="text-red-600 font-black text-sm md:text-base">{unreadCount}</span>
            </div>
            <div className="max-h-[320px] overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
              {unreadCount === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-8 text-slate-400">
                  <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-2 shadow-xs">
                    <Mail size={16} className="text-slate-300" />
                  </div>
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">{t("Sem mensagens novas")}</p>
                </div>
              ) : (
                (inbox || []).filter(m => m.unread).map(m => (
                  <div key={m.id} role="button" className="flex justify-between items-center text-[12px] md:text-sm border-b border-slate-50 pb-2.5 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer px-2 py-1.5 rounded-xl group/item" onClick={() => handleSelectMessage(m)}>
                    <div className="min-w-0 flex-1 truncate mr-3">
                      <span className="font-extrabold text-slate-900 group-hover/item:text-primary transition-colors">{t(m.org)}:</span>
                      <span className="ml-1 text-slate-600 font-medium">{t(m.preview)}</span>
                    </div>
                    <span className="text-white font-bold shrink-0 text-[10px] bg-red-600 px-2 py-0.5 rounded-lg font-mono shadow-xs">{t(m.date)}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        <section className={`bg-white border border-slate-200/90 rounded-2xl md:rounded-[28px] p-4 md:p-6 shadow-xs flex flex-col group ${isInst ? 'order-1' : ''}`}>
          <div className="flex items-center justify-between mb-3.5 shrink-0 px-1">
             <div className="flex items-center gap-2">
                <Mail size={16} className="text-emerald-500" />
                <h3 className="text-slate-900 font-bold text-sm md:text-base tracking-tight">{t("Lidas")}</h3>
             </div>
             <span className="text-emerald-600 font-black text-sm md:text-base">{readCount}</span>
          </div>
          <div className="max-h-[320px] overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
            {(inbox || []).filter(m => !m.unread).map(m => (
              <div key={m.id} role="button" className="flex justify-between items-center text-[12px] md:text-sm border-b border-slate-50 pb-2.5 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer px-2 py-1.5 rounded-xl group/item" onClick={() => handleSelectMessage(m)}>
                <div className="min-w-0 flex-1 truncate mr-3">
                  <span className="font-extrabold text-slate-800">{t(m.org)}:</span>
                  <span className="ml-1 text-slate-500 font-medium">{t(m.preview)}</span>
                </div>
                <span className="text-white font-bold shrink-0 text-[10px] bg-emerald-600 px-2 py-0.5 rounded-lg font-mono">{t(m.date)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={`bg-white border border-slate-200/90 rounded-2xl md:rounded-[28px] p-4 md:p-6 shadow-xs flex flex-col group ${shouldHideUnread ? 'col-span-1' : 'md:col-span-2 xl:col-span-1'} ${isInst ? 'order-3' : ''}`}>
          <div className="flex items-center justify-between mb-3.5 shrink-0 px-1">
             <div className="flex items-center gap-2">
                <Mail size={16} className="text-blue-500" />
                <h3 className="text-slate-900 font-bold text-sm md:text-base tracking-tight">{t("Enviadas")}</h3>
             </div>
             <span className="text-blue-600 font-black text-sm md:text-base">{sentCount}</span>
          </div>
          <div className="max-h-[320px] overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
            {(sentMessages || []).map(m => (
              <div key={m.id} role="button" className="flex justify-between items-center text-[12px] md:text-sm border-b border-slate-50 pb-2.5 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer px-2 py-1.5 rounded-xl group/item" onClick={() => handleSelectMessage(m)}>
                <div className="min-w-0 flex-1 truncate mr-3">
                  <span className="font-extrabold text-slate-800">{t(m.org)}:</span>
                  <span className="ml-1 text-slate-500 font-medium">{t(m.preview)}</span>
                </div>
                <span className="text-white font-bold shrink-0 text-[10px] bg-blue-600 px-2 py-0.5 rounded-lg font-mono">{t(m.date)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
