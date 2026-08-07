// ============================================================================
// Base de Conhecimento SELF-SERVICE da instituição — E6 (2026-08-07, "Avança
// todas" do dono). CRUD REAL contra public.kb_fontes_instituicao (RLS: a
// instituição só escreve na própria sigla; leitura de fontes ativas é
// pública). As fontes ativas são fundidas pelo servidor na próxima consulta
// do Assistente de Documentos — sem fingimento: listagens, criar, ativar/
// desativar e eliminar acontecem de verdade na base de dados.
// ============================================================================
import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Plus, Trash2, Loader2, AlertTriangle, Globe, Info } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export interface KbFonteRow {
  id: string;
  sigla: string;
  titulo: string;
  tipo: 'regulamento' | 'procedimento' | 'faq';
  texto: string;
  fonte_url: string | null;
  ativo: boolean;
  atualizado_em: string;
  autor: string | null;
  created_at: string;
}

interface InstKbSelfServiceProps {
  institutionCode: string;
  profileName?: string;
  /** resumo para indicadores externos (chips de estatística) */
  onResumo?: (resumo: { total: number; ativas: number } | null) => void;
  addAuditLog?: (action: string, type: 'info' | 'warning' | 'critical' | 'success') => void;
}

const TIPOS_FONTE: Array<{ id: KbFonteRow['tipo']; label: string }> = [
  { id: 'regulamento', label: 'Regulamento / Lei' },
  { id: 'procedimento', label: 'Procedimento' },
  { id: 'faq', label: 'Pergunta frequente' },
];

export const ROTULO_TIPO: Record<KbFonteRow['tipo'], string> = {
  regulamento: 'Regulamento',
  procedimento: 'Procedimento',
  faq: 'FAQ',
};

const TABELA = 'kb_fontes_instituicao';
const MIN_TEXTO = 200;
const MAX_TEXTO = 4000;

/** Resumo leve (só contagem) para chips/cartões fora desta aba. */
export async function carregarResumoKb(sigla: string): Promise<{ total: number; ativas: number } | null> {
  const s = sigla.trim().toUpperCase();
  if (!s) return null;
  const { count: total, error: e1 } = await supabase.from(TABELA).select('id', { count: 'exact', head: true }).eq('sigla', s);
  if (e1) return null;
  const { count: ativas } = await supabase.from(TABELA).select('id', { count: 'exact', head: true }).eq('sigla', s).eq('ativo', true);
  return { total: total ?? 0, ativas: ativas ?? 0 };
}

export default function InstKbSelfService({ institutionCode, profileName = '', onResumo, addAuditLog }: InstKbSelfServiceProps) {
  const sigla = (institutionCode || '').trim().toUpperCase();

  const [estado, setEstado] = useState<'a_carregar' | 'ok' | 'erro'>('a_carregar');
  const [erro, setErro] = useState('');
  const [fontes, setFontes] = useState<KbFonteRow[]>([]);
  const [aGuardar, setAGuardar] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState<string | null>(null);

  // formulário de nova fonte
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<KbFonteRow['tipo']>('procedimento');
  const [texto, setTexto] = useState('');
  const [fonteUrl, setFonteUrl] = useState('');
  const [formErro, setFormErro] = useState('');

  const publicarResumo = useCallback((lista: KbFonteRow[]) => {
    onResumo?.({ total: lista.length, ativas: lista.filter(f => f.ativo).length });
  }, [onResumo]);

  const carregar = useCallback(async () => {
    if (!sigla) return;
    setEstado('a_carregar');
    setErro('');
    const { data, error } = await supabase
      .from(TABELA)
      .select('id, sigla, titulo, tipo, texto, fonte_url, ativo, atualizado_em, autor, created_at')
      .eq('sigla', sigla)
      .order('created_at', { ascending: false });
    if (error) {
      setEstado('erro');
      setErro(error.code === '42501' || (error.message || '').includes('row-level security')
        ? 'Sem permissão para ler a base desta instituição. Confirma que estás ligado com a conta da instituição certa.'
        : `Não foi possível carregar a base (${error.message || 'erro desconhecido'}).`);
      onResumo?.(null);
      return;
    }
    const lista = (data || []) as KbFonteRow[];
    setFontes(lista);
    publicarResumo(lista);
    setEstado('ok');
  }, [sigla, publicarResumo, onResumo]);

  useEffect(() => { void carregar(); }, [carregar]);

  const validarForm = (): string => {
    if (titulo.trim().length < 8) return 'O título precisa de pelo menos 8 caracteres — escreve o nome oficial do documento.';
    if (texto.trim().length < MIN_TEXTO) return `O conteúdo está demasiado curto (mínimo ${MIN_TEXTO} caracteres, para a IA ter contexto real).`;
    if (texto.trim().length > MAX_TEXTO) return `O conteúdo excede o máximo de ${MAX_TEXTO} caracteres — divide em mais do que uma fonte.`;
    if (fonteUrl.trim() && !fonteUrl.trim().startsWith('https://')) return 'O link da fonte tem de começar por https:// (proveniência auditável).';
    return '';
  };

  const guardar = async () => {
    const v = validarForm();
    if (v) { setFormErro(v); return; }
    setFormErro('');
    setAGuardar(true);
    const { error } = await supabase.from(TABELA).insert([{
      sigla,
      titulo: titulo.trim(),
      tipo,
      texto: texto.trim(),
      fonte_url: fonteUrl.trim() || null,
      autor: profileName.trim() || null,
    }]);
    setAGuardar(false);
    if (error) {
      setFormErro(error.code === '42501'
        ? 'A base recusou a escrita: só podes adicionar fontes à TUA instituição, ligado com a conta dela.'
        : `Falha ao guardar (${error.message || 'erro desconhecido'}).`);
      return;
    }
    addAuditLog?.(`KB: nova fonte "${titulo.trim()}" adicionada à base de conhecimento da ${sigla}`, 'success');
    setTitulo(''); setTexto(''); setFonteUrl(''); setTipo('procedimento');
    await carregar();
  };

  const alternarAtivo = async (f: KbFonteRow) => {
    const { error } = await supabase.from(TABELA).update({ ativo: !f.ativo }).eq('id', f.id);
    if (error) { setErro(`Não foi possível alterar o estado (${error.message || 'erro'}).`); return; }
    addAuditLog?.(`KB: fonte "${f.titulo}" ${f.ativo ? 'desativada' : 'ativada'}`, 'info');
    await carregar();
  };

  const eliminar = async (f: KbFonteRow) => {
    const { error } = await supabase.from(TABELA).delete().eq('id', f.id);
    setConfirmarEliminar(null);
    if (error) { setErro(`Não foi possível eliminar (${error.message || 'erro'}).`); return; }
    addAuditLog?.(`KB: fonte "${f.titulo}" eliminada da base`, 'warning');
    await carregar();
  };

  if (!sigla) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[11px] font-bold text-amber-900 flex items-start gap-2">
        <AlertTriangle size={15} className="shrink-0 mt-0.5" />
        <p>A Base de Conhecimento self-service precisa do código da instituição ligada. Entra com a conta institucional para gerir as fontes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-left">
      {/* Nota honesta de funcionamento */}
      <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-3 flex items-start gap-2.5">
        <Info size={14} className="text-indigo-600 shrink-0 mt-0.5" />
        <p className="text-[10.5px] text-indigo-950 font-bold leading-relaxed m-0">
          As fontes <strong>ativas</strong> entram nas respostas do Assistente de Documentos da plataforma quando o assunto envolve a <strong>{sigla}</strong> —
          a IA cita estas fontes e mostra no selo de proveniência quantos documentos oficiais usou. Revê cada texto antes de publicar.
        </p>
      </div>

      {/* Lista de fontes existentes */}
      <div className="bg-white border border-[#0c2340]/15 rounded-[20px] p-5">
        <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-2.5">
          <h3 className="text-xs font-black text-[#0c2340] tracking-wider uppercase m-0 flex items-center gap-2">
            <BookOpen size={14} className="text-indigo-600" /> Fontes da {sigla}
          </h3>
          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
            {fontes.filter(f => f.ativo).length} ativas / {fontes.length}
          </span>
        </div>

        {estado === 'a_carregar' && (
          <p className="text-[11px] font-bold text-slate-500 flex items-center gap-2 py-6 justify-center">
            <Loader2 size={14} className="animate-spin" /> A carregar a base de conhecimento…
          </p>
        )}
        {erro && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[10.5px] font-bold text-amber-900 mb-2">{erro}</div>
        )}
        {estado === 'ok' && fontes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <BookOpen className="w-9 h-9 text-slate-300 mb-2" />
            <p className="text-xs text-slate-400 font-semibold text-center leading-relaxed">
              A {sigla} ainda não tem fontes próprias. Adiciona a primeira em baixo.
            </p>
          </div>
        )}
        {estado === 'ok' && fontes.length > 0 && (
          <ul className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {fontes.map(f => (
              <li key={f.id} className={`rounded-xl border p-3 ${f.ativo ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-70'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11.5px] font-black text-slate-800 leading-snug">{f.titulo}</p>
                    <p className="text-[9.5px] font-bold text-slate-400 mt-1 uppercase tracking-wide">
                      {ROTULO_TIPO[f.tipo]} · atualizado em {f.atualizado_em}{f.autor ? ` · por ${f.autor}` : ''} · {f.ativo ? 'ATIVA' : 'DESATIVADA'}
                    </p>
                    {f.fonte_url && (
                      <a href={f.fonte_url} target="_blank" rel="noreferrer" className="text-[9.5px] font-bold text-indigo-600 hover:underline inline-flex items-center gap-1 mt-1 break-all">
                        <Globe size={10} /> {f.fonte_url}
                      </a>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => void alternarAtivo(f)}
                      className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide cursor-pointer border ${f.ativo ? 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100' : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'}`}
                    >
                      {f.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    {confirmarEliminar === f.id ? (
                      <button
                        type="button"
                        onClick={() => void eliminar(f)}
                        className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide cursor-pointer border border-red-300 text-white bg-red-500 hover:bg-red-600"
                      >
                        Confirmar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmarEliminar(f.id)}
                        className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide cursor-pointer border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 inline-flex items-center gap-1"
                      >
                        <Trash2 size={10} /> Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Nova fonte */}
      <div className="bg-white border border-[#0c2340]/15 rounded-[20px] p-5">
        <h3 className="text-xs font-black text-[#0c2340] tracking-wider uppercase m-0 mb-3 flex items-center gap-2">
          <Plus size={14} className="text-indigo-600" /> Adicionar nova fonte
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Título oficial do documento</label>
            <input
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ex.: Instrução de atendimento ao contribuinte — 2026"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold outline-none focus:border-indigo-400"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Tipo</label>
              <select
                value={tipo}
                onChange={e => setTipo(e.target.value as KbFonteRow['tipo'])}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold outline-none focus:border-indigo-400 bg-white"
              >
                {TIPOS_FONTE.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Link público da fonte (opcional)</label>
              <input
                value={fonteUrl}
                onChange={e => setFonteUrl(e.target.value)}
                placeholder="https://…"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold outline-none focus:border-indigo-400"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">
              Conteúdo que a IA pode usar ({texto.trim().length}/{MAX_TEXTO} caracteres)
            </label>
            <textarea
              value={texto}
              onChange={e => setTexto(e.target.value)}
              rows={7}
              placeholder="Cola aqui o texto oficial: regras, passos, prazos, contactos — tal como publicado pela instituição."
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold outline-none focus:border-indigo-400 resize-y"
            />
          </div>
          {formErro && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[10.5px] font-bold text-amber-900">{formErro}</div>
          )}
          <button
            type="button"
            onClick={() => void guardar()}
            disabled={aGuardar}
            className="w-full py-3 px-4 bg-[#0E2B64] hover:bg-[#081a3d] text-white rounded-xl font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {aGuardar ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} className="stroke-[2.5]" />}
            {aGuardar ? 'A guardar…' : 'Guardar fonte na base de conhecimento'}
          </button>
        </div>
      </div>
    </div>
  );
}
