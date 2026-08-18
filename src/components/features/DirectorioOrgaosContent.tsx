// ============================================================================
// Directório de Órgãos — área de REFERÊNCIA (pilar 3 do design)
// ----------------------------------------------------------------------------
// Navegação por categoria → lista de entidades → ficha (nome, sigla, serviços,
// contacto público, fonte). APENAS consulta — nenhuma acção de envio.
// Separado dos Contactos de Emergência (ContactsContent) — nunca misturar.
// ============================================================================

import { useState } from 'react';
import { Landmark, ChevronLeft, Search, Info, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import {
  CATEGORIAS_DIRECTORIO,
  DIRECTORIO_INSTITUCIONAL_ANGOLA,
  pesquisarDirectorio,
  type CategoriaDirectorio,
  type EntidadeDirectorio,
} from '../../constants/directorioInstitucionalAngola';

interface Props {
  onVoltar?: () => void;
}

export function DirectorioOrgaosContent({ onVoltar }: Props) {
  const { t } = useLanguage();
  const [categoria, setCategoria] = useState<CategoriaDirectorio | null>(null);
  const [selecionada, setSelecionada] = useState<EntidadeDirectorio | null>(null);
  const [busca, setBusca] = useState('');

  const resultadoBusca = busca.trim() ? pesquisarDirectorio(busca) : [];
  const aMostrar = busca.trim()
    ? resultadoBusca
    : (categoria
        ? DIRECTORIO_INSTITUCIONAL_ANGOLA.filter(e => e.categoria === categoria)
        : DIRECTORIO_INSTITUCIONAL_ANGOLA);

  const voltar = () => {
    if (selecionada) { setSelecionada(null); return; }
    if (categoria) { setCategoria(null); return; }
    onVoltar?.();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={voltar}
            aria-label="Voltar"
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>
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
        <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 rounded-lg px-2 py-0.5">
                  {selecionada.sigla}
                </span>
                {selecionada.referenciaDinamica && (
                  <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                    {t('Referência dinâmica')}
                  </span>
                )}
              </div>
              <h3 className="text-sm md:text-lg font-black text-slate-900 mt-1.5 leading-tight">{selecionada.nome}</h3>
            </div>
            <button
              type="button"
              onClick={() => setSelecionada(null)}
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
              onClick={() => setSelecionada(e)}
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
