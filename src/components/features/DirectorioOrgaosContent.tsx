// ============================================================================
// Directório de Órgãos — área de REFERÊNCIA (pilar 3 do design)
// ----------------------------------------------------------------------------
// Navegação por categoria → lista de entidades → ficha (logomarca, nome, sigla,
// serviços, contactos, mapa, fonte).
// 2026-09-11 (T41) — a ficha passa a ser ACCIONÁVEL em DEMONSTRAÇÃO: contactos
// simulados (directorioContactosDemo.ts) e botão «Enviar Mensagem» que abre o
// compositor com o código institucional simulado. Quando as instituições
// acederem à plataforma, só `contactosDoOrgao()` muda (dados reais).
// Separado dos Contactos de Emergência (ContactsContent) — nunca misturar.
// ============================================================================

import { useState } from 'react';
import { Landmark, Search, Info, ExternalLink, Phone, MapPin, Mail, Map as MapIcon, ChevronUp } from 'lucide-react';
import { BotaoVoltar } from '../ui/BotaoVoltar';
import { InstitutionLogo } from '../ui/InstitutionLogo';
import { getInstitutionLogoUrl } from '../../config/institutionLogos';
import { useLanguage } from '../../hooks/useLanguage';
import { contactosDoOrgao, urlGoogleMaps, urlMapaEmbutido } from '../../constants/directorioContactosDemo';
import {
  CATEGORIAS_DIRECTORIO,
  DIRECTORIO_INSTITUCIONAL_ANGOLA,
  pesquisarDirectorio,
  type CategoriaDirectorio,
  type EntidadeDirectorio,
} from '../../constants/directorioInstitucionalAngola';

interface Props {
  onVoltar?: () => void;
  /**
   * T41 — «Enviar Mensagem» na ficha do órgão: abre o compositor com o
   * destinatário pré-preenchido (código institucional simulado). Sem callback
   * o botão não aparece (ex.: contexto onde o envio não faz sentido).
   */
  onEnviarMensagem?: (destino: { codigo: string; nome: string; sigla: string }) => void;
}

export function DirectorioOrgaosContent({ onVoltar, onEnviarMensagem }: Props) {
  const { t } = useLanguage();
  const [categoria, setCategoria] = useState<CategoriaDirectorio | null>(null);
  const [selecionada, setSelecionada] = useState<EntidadeDirectorio | null>(null);
  const [busca, setBusca] = useState('');
  // T41 — mapa embutido (lazy: só carrega quando expandido) e fallback se falhar.
  const [mapaAberto, setMapaAberto] = useState(false);
  const [mapaFalhou, setMapaFalhou] = useState(false);
  const contactos = selecionada ? contactosDoOrgao(selecionada) : null;
  const seleccionar = (e: EntidadeDirectorio | null) => {
    setSelecionada(e);
    setMapaAberto(false);
    setMapaFalhou(false);
  };

  const resultadoBusca = busca.trim() ? pesquisarDirectorio(busca) : [];
  const aMostrar = busca.trim()
    ? resultadoBusca
    : (categoria
        ? DIRECTORIO_INSTITUCIONAL_ANGOLA.filter(e => e.categoria === categoria)
        : DIRECTORIO_INSTITUCIONAL_ANGOLA);

  const voltar = () => {
    if (selecionada && mapaAberto) { setMapaAberto(false); return; }
    if (selecionada) { seleccionar(null); return; }
    if (categoria) { setCategoria(null); return; }
    onVoltar?.();
  };
  // Sem onVoltar (embutido, ex.: separador «Contactos de Instituições») o botão
  // «voltar» só aparece quando há uma categoria/entidade para recuar.
  const mostrarVoltar = !!onVoltar || !!categoria || !!selecionada;

  return (
    <div className={`${onVoltar ? 'max-w-5xl mx-auto' : 'w-full'} space-y-4`}>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {mostrarVoltar && (
          <BotaoVoltar onClick={voltar} />
          )}
          <div>
            <h2 className="text-base md:text-xl font-black text-primary leading-tight flex items-center gap-2">
              <Landmark size={20} className="text-[#0c2340]" />
              {t('Directório de Órgãos')}
            </h2>
            <p className="text-[10px] text-slate-500 font-semibold">{t('Referência dos órgãos do Estado de Angola por categoria')}</p>
          </div>
        </div>
      </div>

      {/* Pesquisa */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={t('Pesquisar órgão (nome ou sigla)...')}
          className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs font-semibold text-slate-800 outline-none focus:border-[#2563eb]/50 transition-all"
        />
      </div>

      {/* Seleção de entidade */}
      {selecionada && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 space-y-4" data-testid="directorio-ficha-orgao">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                <InstitutionLogo
                  name={selecionada.sigla}
                  logoUrl={getInstitutionLogoUrl(selecionada.sigla) || getInstitutionLogoUrl(selecionada.nome)}
                  size={52}
                  data-testid="directorio-ficha-logo"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 rounded-lg px-2 py-0.5">
                    {selecionada.sigla}
                  </span>
                  <span className="text-[9px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5">
                    {t(CATEGORIAS_DIRECTORIO.find(c => c.chave === selecionada.categoria)?.rotulo || '')}
                  </span>
                  {selecionada.referenciaDinamica && (
                    <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                      {t('Referência dinâmica')}
                    </span>
                  )}
                </div>
                <h3 className="text-sm md:text-lg font-black text-slate-900 mt-1.5 leading-tight">{selecionada.nome}</h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => seleccionar(null)}
              aria-label="Fechar"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Info size={16} />
            </button>
          </div>

          {selecionada.servicos && selecionada.servicos.length > 0 && (
            <div>
              <p className="text-[9.5px] font-black uppercase tracking-widest text-slate-400 mb-1.5">{t('Serviços')}</p>
              <div className="flex flex-wrap gap-1.5">
                {selecionada.servicos.map(s => (
                  <span key={s} className="text-[10px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1">
                    {t(s)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {selecionada.fonte && (
            <div className="text-[10.5px] text-slate-500 font-semibold">
              <span className="font-black uppercase tracking-widest text-slate-400 text-[9px]">{t('Fonte')}: </span>
              {selecionada.fonte}
            </div>
          )}

          {selecionada.contactoPublico && (
            <a
              href={selecionada.contactoPublico}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#2563eb] hover:underline"
            >
              <ExternalLink size={12} /> {selecionada.contactoPublico}
            </a>
          )}

          {/* T41 — Contactos (DADOS SIMULADOS — demonstração) */}
          {contactos && (
            <div className="border-t border-slate-100 pt-4 space-y-3" data-testid="directorio-ficha-contactos">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[9.5px] font-black uppercase tracking-widest text-slate-400">{t('Contactos')}</p>
                <span className="text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5" title={t('Dados de demonstração — serão substituídos pelos da conta institucional')}>
                  {t('Demonstração')}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <a href={`tel:${contactos.telemovel.replace(/\s+/g, '')}`} className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 hover:border-[#2563eb]/50 transition-colors" data-testid="directorio-ficha-telemovel">
                  <span className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#0c2340] shrink-0"><Phone size={14} /></span>
                  <span className="min-w-0">
                    <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">{t('Contacto (Telemóvel)')}</span>
                    <span className="block text-[11.5px] font-bold text-slate-800 truncate">{contactos.telemovel || t('Não disponível')}</span>
                  </span>
                </a>
                <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3" data-testid="directorio-ficha-endereco">
                  <span className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#0c2340] shrink-0"><MapPin size={14} /></span>
                  <span className="min-w-0">
                    <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">{t('Endereço')}</span>
                    <span className="block text-[11.5px] font-bold text-slate-800 leading-snug">{contactos.endereco || t('Não disponível')}</span>
                  </span>
                </div>
                <a href={`mailto:${contactos.email}`} className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 hover:border-[#2563eb]/50 transition-colors" data-testid="directorio-ficha-email">
                  <span className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#0c2340] shrink-0"><Mail size={14} /></span>
                  <span className="min-w-0">
                    <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">{t('E-mail')}</span>
                    <span className="block text-[11.5px] font-bold text-slate-800 truncate">{contactos.email || t('Não disponível')}</span>
                  </span>
                </a>
              </div>

              {/* Localização no mapa (lazy) */}
              <div className="space-y-2">
                <button
                  type="button"
                  id="btn-directorio-ver-mapa"
                  onClick={() => setMapaAberto(v => !v)}
                  aria-expanded={mapaAberto}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border cursor-pointer transition-colors bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
                >
                  {mapaAberto ? <ChevronUp size={14} /> : <MapIcon size={14} />}
                  {mapaAberto ? t('Ocultar mapa') : t('Ver no mapa')}
                </button>
                {mapaAberto && (
                  <div className="space-y-2" data-testid="directorio-ficha-mapa">
                    {!mapaFalhou ? (
                      <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 h-[220px] md:h-[280px]">
                        <iframe
                          title={`${t('Localização de')} ${selecionada.sigla}`}
                          src={urlMapaEmbutido(contactos.latitude, contactos.longitude)}
                          className="w-full h-full border-0"
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          onError={() => setMapaFalhou(true)}
                          data-testid="directorio-ficha-mapa-iframe"
                        />
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-start gap-3" data-testid="directorio-ficha-mapa-fallback">
                        <MapPin size={16} className="text-[#0c2340] shrink-0 mt-0.5" />
                        <div className="text-[11px] font-semibold text-slate-700 leading-snug">
                          {t('Mapa indisponível neste momento.')} {contactos.endereco}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[10px] font-semibold text-slate-400">
                        {contactos.latitude.toFixed(5)}, {contactos.longitude.toFixed(5)}
                      </span>
                      <a
                        href={urlGoogleMaps(contactos.latitude, contactos.longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#2563eb] hover:underline"
                        data-testid="directorio-ficha-link-google-maps"
                      >
                        <ExternalLink size={12} /> {t('Abrir no Google Maps')}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Enviar Mensagem → compositor com destinatário pré-preenchido */}
              {onEnviarMensagem && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <span className="text-[10.5px] font-semibold text-slate-500">
                    {t('Código institucional')}: <span className="font-mono font-black text-slate-800" data-testid="directorio-ficha-codigo">{contactos.codigoInstitucional}</span>
                  </span>
                  <button
                    type="button"
                    id="btn-directorio-enviar-mensagem"
                    onClick={() => onEnviarMensagem({ codigo: contactos.codigoInstitucional, nome: selecionada.nome, sigla: selecionada.sigla })}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border cursor-pointer transition-colors bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow"
                  >
                    <Mail size={14} /> {t('Enviar Mensagem')}
                  </button>
                </div>
              )}
            </div>
          )}

          <p className="text-[10px] text-slate-400 font-medium border-t border-slate-100 pt-3">
            {t('Órgão de referência — a correspondência só é possível com instituições registadas no Correio Digital Angola.')}
          </p>
        </div>
      )}

      {/* Categorias (vista inicial) */}
      {!categoria && !selecionada && !busca.trim() && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {CATEGORIAS_DIRECTORIO.map(c => {
            const n = DIRECTORIO_INSTITUCIONAL_ANGOLA.filter(e => e.categoria === c.chave).length;
            return (
              <button
                key={c.chave}
                type="button"
                onClick={() => setCategoria(c.chave)}
                className="text-left bg-white border border-slate-200 rounded-2xl p-3.5 hover:border-[#2563eb]/50 hover:shadow-sm transition-all cursor-pointer"
              >
                <span className="text-[11px] font-black text-slate-800 leading-snug block">{t(c.rotulo)}</span>
                <span className="text-[9px] font-bold text-slate-400 mt-1 block">{n} {t('entradas')}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Lista (categoria ou pesquisa) */}
      {(categoria || busca.trim()) && !selecionada && (
        <div className="bg-white border border-slate-200 rounded-3xl divide-y divide-slate-100 overflow-hidden">
          {categoria && (
            <div className="px-4 py-3 bg-slate-50/60">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {t(CATEGORIAS_DIRECTORIO.find(c => c.chave === categoria)?.rotulo || '')} · {aMostrar.length}
              </span>
            </div>
          )}
          {aMostrar.length === 0 && (
            <div className="px-4 py-10 text-center text-[11px] text-slate-400 font-semibold">
              {t('Nenhum órgão encontrado.')}
            </div>
          )}
          {aMostrar.map(e => (
            <button
              key={e.id}
              type="button"
              onClick={() => seleccionar(e)}
              className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 rounded-lg px-2 py-1 w-16 text-center shrink-0">
                  {e.sigla.slice(0, 12)}
                </span>
                <span className="text-[11.5px] font-bold text-slate-800 leading-snug">{t(e.nome)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
