// ============================================================================
// Base de Conhecimento SELF-SERVICE da instituição — E6 (2026-08-07, "Avança
// todas" do dono). CRUD REAL contra public.kb_fontes_instituicao (RLS: a
// instituição só escreve na própria sigla; leitura de fontes ativas é
// pública). As fontes ativas são fundidas pelo servidor na próxima consulta
// do Assistente de Documentos — sem fingimento: listagens, criar, ativar/
// desativar e eliminar acontecem de verdade na base de dados.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Plus, Trash2, Loader2, AlertTriangle, Globe, Info, Sparkles, Wand2, CheckCircle2, UploadCloud, FileText, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { removerFicheiroStoragePorUrl, kbRemoverFicheiro } from '../../services/supabaseService';
import {
  analisarConteudoKb, ROTULO_TIPO_KB, type KbMetaSugestoes,
} from '../../services/kbMetaAssistService';
import {
  extrairTextoDeFicheiro, fileToBase64, limitarTextoKb, ROTULO_TIPO_FICHEIRO,
} from '../../services/kbFileService';

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
// 2026-08-22 — o campo "Conteúdo que a IA pode usar" passa a aceitar
// 20.000 caracteres (antes 4.000). A base de dados precisa do script
// supabase/v30_ia_kb_20000_e_sem_limite.sql para o constraint acompanhar.
const MAX_TEXTO = 20000;

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
  // Carregamento de ficheiros (PDF/Word/TXT) — etapa de melhoria KB
  const [kbFicheiro, setKbFicheiro] = useState<File | null>(null);
  const [aExtrairFicheiro, setAExtrairFicheiro] = useState(false);
  const [erroFicheiro, setErroFicheiro] = useState('');
  const [avisoFicheiro, setAvisoFicheiro] = useState<string | null>(null);
  const [ficheiroUrl, setFicheiroUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Seleção de ficheiro: extrai o texto automaticamente (preenche o campo
   * `texto` que a IA lê) e carrega o ficheiro original para o Supabase
   * Storage (bucket kb_ficheiros) — a referência fica como fonte auditável.
   * 2026-08-22 — SEM limite de tamanho (PDF, Word .doc/.docx e TXT): o
   * upload do original passa a ser DIRETO do browser para o Storage
   * (política pública de insert), com o /api/kb-upload como fallback.
   */
  const handleKbFicheiroSelecionado = async (file: File) => {
    setErroFicheiro('');
    setAvisoFicheiro(null);
    setKbFicheiro(file);
    setAExtrairFicheiro(true);
    try {
      const extraido = await extrairTextoDeFicheiro(file);
      if (extraido.aviso) setAvisoFicheiro(extraido.aviso);
      if (extraido.texto.trim()) {
        setTexto(limitarTextoKb(extraido.texto));
        // Sugere o título a partir da primeira frase, se o campo estiver vazio
        if (!titulo.trim()) {
          const primeiraFrase = extraido.texto.split(/[.!?]/)[0]?.trim().slice(0, 80);
          if (primeiraFrase && primeiraFrase.length >= 8) setTitulo(primeiraFrase.charAt(0).toUpperCase() + primeiraFrase.slice(1));
        }
      }
      // Upload do ficheiro original para o storage (auditoria/consulta):
      // 1) DIRETO do browser para o Storage (aceita QUALQUER tamanho — a
      //    política v28 permite insert no bucket kb_ficheiros);
      // 2) fallback /api/kb-upload (service role) para ficheiros pequenos.
      // O texto extraído mantém-se mesmo se o upload falhar.
      try {
        let urlGuardada: string | null = null;
        try {
          const sanitizado = file.name.replace(/[^\w.\-]+/g, '_');
          const pasta = (sigla || 'inst').replace(/[^\w\-]+/g, '_').toUpperCase();
          const filePath = `kb/${pasta}/${Date.now()}-${sanitizado}`;
          const { error: upErr } = await supabase.storage
            .from('kb_ficheiros')
            .upload(filePath, file, { cacheControl: '3600', upsert: true, contentType: file.type || undefined });
          if (!upErr) {
            const { data: pub } = supabase.storage.from('kb_ficheiros').getPublicUrl(filePath);
            if (pub?.publicUrl) urlGuardada = pub.publicUrl;
          }
        } catch (dirErr) {
          console.warn('[KB-FICHEIRO] Upload direto falhou — tenta o servidor:', dirErr);
        }
        if (!urlGuardada && file.size <= 4 * 1024 * 1024) {
          const base64 = await fileToBase64(file);
          const upResp = await fetch('/api/kb-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: file.name, base64, sigla, tipo: file.type }),
          });
          const upJson = await upResp.json().catch(() => ({ ok: false, erro: 'Resposta inválida do servidor.' }));
          if (upJson.ok && upJson.url) urlGuardada = upJson.url;
        }
        if (urlGuardada) {
          setFicheiroUrl(urlGuardada);
          if (!fonteUrl.trim()) setFonteUrl(urlGuardada);
        } else {
          setAvisoFicheiro(aviso => aviso ? `${aviso} O ficheiro original não foi guardado.` : 'O ficheiro original não foi guardado — o texto extraído fica na fonte.');
        }
      } catch (upErr) {
        console.warn('[KB-FICHEIRO] Falha no upload do ficheiro original (o texto extraído mantém-se):', upErr);
        setAvisoFicheiro(aviso => aviso ? `${aviso} O ficheiro original não foi guardado.` : 'O ficheiro original não foi guardado — o texto extraído fica na fonte.');
      }
    } catch (e) {
      console.error('[KB-FICHEIRO] Falha ao processar o ficheiro:', e);
      setErroFicheiro('Não foi possível ler o ficheiro. Tente outro formato (PDF, Word ou TXT) ou cole o texto manualmente.');
    } finally {
      setAExtrairFicheiro(false);
    }
  };

  // Etapa #5 — preenchimento assistido de metadados (heurística local, sem IA)
  const [assistSugestoes, setAssistSugestoes] = useState<KbMetaSugestoes | null>(null);
  const [assistAplicado, setAssistAplicado] = useState<string[]>([]);
  // Nunca sobrescrever o que o utilizador escreveu à mão:
  const tituloEditadoManual = useRef(false);
  const tipoEditadoManual = useRef(false);

  // Análise assistida reativa (debounce 700ms) quando o conteúdo é suficiente.
  useEffect(() => {
    if (texto.trim().length < MIN_TEXTO) {
      setAssistSugestoes(null);
      return;
    }
    const timer = setTimeout(() => {
      setAssistSugestoes(analisarConteudoKb(texto));
    }, 700);
    return () => clearTimeout(timer);
  }, [texto]);

  // Aplicar título sugerido (só se o utilizador não escreveu título à mão).
  const aplicarTituloAssistido = () => {
    if (!assistSugestoes?.tituloSugerido) return;
    if (tituloEditadoManual.current && titulo.trim()) return;
    setTitulo(assistSugestoes.tituloSugerido);
    setAssistAplicado(prev => Array.from(new Set([...prev, 'título'])));
    addAuditLog?.('KB-ASSIST: título sugerido aplicado a partir do conteúdo', 'info');
  };

  // Aplicar tipo sugerido (só se o utilizador não escolheu tipo à mão).
  const aplicarTipoAssistido = () => {
    if (!assistSugestoes) return;
    if (tipoEditadoManual.current) return;
    setTipo(assistSugestoes.tipoSugerido);
    setAssistAplicado(prev => Array.from(new Set([...prev, 'tipo'])));
    addAuditLog?.(`KB-ASSIST: tipo "${ROTULO_TIPO_KB[assistSugestoes.tipoSugerido]}" sugerido aplicado`, 'info');
  };

  // Aplicar todas as sugestões de uma vez (respeitando edições manuais).
  const aplicarTudoAssistido = () => {
    if (!assistSugestoes) return;
    aplicarTituloAssistido();
    aplicarTipoAssistido();
    addAuditLog?.('KB-ASSIST: metadados sugeridos aplicados ao formulário', 'success');
  };

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
      // v37.78.23 — o FICHEIRO carregado é a fonte auditável: antes gravava-se
      // apenas o campo manual de URL e o ficheiro do bucket ficava ÓRFÃO para
      // sempre (a linha nunca o referenciava; eliminar a linha não o apagava).
      fonte_url: (ficheiroUrl || fonteUrl).trim() || null,
      autor: profileName.trim() || null,
    }]);
    setAGuardar(false);
    if (error) {
      if (error.code === '23514') {
        setFormErro('A base de dados ainda limita o conteúdo a 4.000 caracteres (constraint da versão anterior). Para aceitar 20.000, aplica o script supabase/v30_ia_kb_20000_e_sem_limite.sql no SQL Editor do Supabase — depois a gravação passa a funcionar.');
        return;
      }
      setFormErro(error.code === '42501'
        ? 'A base recusou a escrita: só podes adicionar fontes à TUA instituição, ligado com a conta dela.'
        : `Falha ao guardar (${error.message || 'erro desconhecido'}).`);
      return;
    }
    addAuditLog?.(`KB: nova fonte "${titulo.trim()}" adicionada à base de conhecimento da ${sigla}`, 'success');
    setTitulo(''); setTexto(''); setFonteUrl(''); setTipo('procedimento');
    setAssistSugestoes(null); setAssistAplicado([]);
    setKbFicheiro(null); setFicheiroUrl(''); setErroFicheiro(''); setAvisoFicheiro(null);
    tituloEditadoManual.current = false;
    tipoEditadoManual.current = false;
    await carregar();
  };

  const alternarAtivo = async (f: KbFonteRow) => {
    const { error } = await supabase.from(TABELA).update({ ativo: !f.ativo }).eq('id', f.id);
    if (error) { setErro(`Não foi possível alterar o estado (${error.message || 'erro'}).`); return; }
    addAuditLog?.(`KB: fonte "${f.titulo}" ${f.ativo ? 'desativada' : 'ativada'}`, 'info');
    await carregar();
  };

  const eliminar = async (f: KbFonteRow) => {
    // v37.78.23 — ZERO RASTOS: o ficheiro do bucket kb_ficheiros sai JUNTO
    // com a linha (antes ficava um ficheiro órfão para sempre no Storage).
    if (f.fonte_url) {
      // v37.78.23 — ZERO RASTOS: o ficheiro sai do bucket JUNTO com a linha.
      // DELETE do bucket exige o endpoint (política v28 só cobre INSERT);
      // remove directo fica como fallback para instalações com política aberta.
      try { const ok = await kbRemoverFicheiro(f.fonte_url); if (!ok) await removerFicheiroStoragePorUrl(f.fonte_url); } catch { /* best-effort */ }
    }
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
              onChange={e => { tituloEditadoManual.current = true; setTitulo(e.target.value); }}
              placeholder="Ex.: Instrução de atendimento ao contribuinte — 2026"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold outline-none focus:border-indigo-400"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Tipo</label>
              <select
                value={tipo}
                onChange={e => { tipoEditadoManual.current = true; setTipo(e.target.value as KbFonteRow['tipo']); }}
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

          {/* Carregamento de ficheiro (PDF/Word/TXT) — extrai o texto automaticamente */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2.5">
            <div className="flex items-center gap-2">
              <UploadCloud size={14} className="text-indigo-600 shrink-0" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 m-0">
                Carregar documento (PDF · Word .doc/.docx · TXT · sem limite)
              </p>
              {!kbFicheiro && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={aExtrairFicheiro}
                  className="ml-auto inline-flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {aExtrairFicheiro ? <Loader2 size={10} className="animate-spin" /> : <FileText size={10} />}
                  {aExtrairFicheiro ? 'A ler…' : 'Escolher ficheiro'}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt,.md"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) void handleKbFicheiroSelecionado(f);
                }}
              />
            </div>

            {kbFicheiro && (
              <div className="flex items-center gap-2 rounded-xl bg-white border border-indigo-200 p-2.5">
                <FileText size={14} className="text-indigo-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10.5px] font-bold text-slate-700 truncate m-0">{kbFicheiro.name}</p>
                  <p className="text-[9px] text-slate-400 font-semibold m-0">
                    {ROTULO_TIPO_FICHEIRO[(kbFicheiro.name.toLowerCase().endsWith('.pdf') ? 'pdf' : kbFicheiro.name.toLowerCase().endsWith('.docx') ? 'docx' : kbFicheiro.name.toLowerCase().endsWith('.doc') ? 'doc' : kbFicheiro.name.toLowerCase().endsWith('.txt') || kbFicheiro.name.toLowerCase().endsWith('.md') ? 'txt' : 'outro')]}
                    {ficheiroUrl ? ' · guardado como fonte' : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setKbFicheiro(null); setFicheiroUrl(''); setAvisoFicheiro(null); }}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                  title="Remover ficheiro"
                >
                  <X size={13} />
                </button>
              </div>
            )}

            {aExtrairFicheiro && (
              <p className="text-[10px] text-indigo-700 font-bold flex items-center gap-1.5 m-0">
                <Loader2 size={11} className="animate-spin" /> A extrair o texto do documento…
              </p>
            )}
            {erroFicheiro && (
              <p className="text-[10px] text-rose-700 font-bold flex items-start gap-1.5 m-0">
                <AlertTriangle size={11} className="shrink-0 mt-0.5" /> {erroFicheiro}
              </p>
            )}
            {avisoFicheiro && (
              <p className="text-[10px] text-amber-700 font-bold flex items-start gap-1.5 m-0">
                <Info size={11} className="shrink-0 mt-0.5" /> {avisoFicheiro}
              </p>
            )}
            {kbFicheiro && texto.trim() && (
              <p className="text-[9.5px] text-emerald-700 font-bold flex items-center gap-1.5 m-0">
                <CheckCircle2 size={11} className="shrink-0" /> Texto extraído ({texto.trim().length} caracteres) — o conteúdo abaixo foi preenchido; revê antes de publicar.
              </p>
            )}
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide">
              Conteúdo que a IA pode usar ({texto.trim().length}/{MAX_TEXTO} caracteres)
            </label>
            <textarea
              value={texto}
              onChange={e => setTexto(e.target.value)}
              maxLength={MAX_TEXTO}
              rows={7}
              placeholder="Cola aqui o texto oficial: regras, passos, prazos, contactos — tal como publicado pela instituição."
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold outline-none focus:border-indigo-400 resize-y"
            />
          </div>
          {/* Etapa #5 — painel de preenchimento assistido de metadados */}
          {assistSugestoes && assistSugestoes.pronto && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-3.5 space-y-2.5" data-testid="kb-assist-panel">
              <div className="flex items-center gap-2">
                <Sparkles size={13} className="text-indigo-600 shrink-0" />
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-900 m-0">
                  Metadados sugeridos a partir do conteúdo
                </p>
                <button
                  type="button"
                  onClick={aplicarTudoAssistido}
                  data-testid="kb-assist-aplicar-tudo"
                  className="ml-auto inline-flex items-center gap-1 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 transition-colors cursor-pointer"
                >
                  <Wand2 size={10} /> Aplicar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[10.5px]">
                <div className="rounded-xl bg-white border border-indigo-100 p-2.5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 m-0">Tipo recomendado</p>
                  <p className="font-black text-slate-800 m-0 mt-0.5 inline-flex items-center gap-1.5 flex-wrap">
                    {ROTULO_TIPO_KB[assistSugestoes.tipoSugerido]}
                    <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-1.5 py-0.5">
                      confiança {Math.round(assistSugestoes.confiancaTipo * 100)}%
                    </span>
                    {assistAplicado.includes('tipo') && (
                      <CheckCircle2 size={12} className="text-emerald-600" />
                    )}
                  </p>
                  {!tipoEditadoManual.current && (
                    <button
                      type="button"
                      onClick={aplicarTipoAssistido}
                      className="mt-1.5 text-[9px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-800 underline underline-offset-2 cursor-pointer"
                    >
                      Usar este tipo
                    </button>
                  )}
                </div>
                <div className="rounded-xl bg-white border border-indigo-100 p-2.5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 m-0">Palavras-chave detectadas</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {assistSugestoes.palavrasChave.map(p => (
                      <span key={p} className="rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[9px] font-bold px-2 py-0.5">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {assistSugestoes.tituloSugerido && (
                <div className="rounded-xl bg-white border border-indigo-100 p-2.5 text-[10.5px]">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 m-0">Título sugerido</p>
                  <p className="font-bold text-slate-700 m-0 mt-0.5 flex items-center gap-1.5 flex-wrap">
                    “{assistSugestoes.tituloSugerido}”
                    {assistAplicado.includes('título') && <CheckCircle2 size={12} className="text-emerald-600" />}
                  </p>
                  {!tituloEditadoManual.current && (
                    <button
                      type="button"
                      onClick={aplicarTituloAssistido}
                      data-testid="kb-assist-aplicar-titulo"
                      className="mt-1.5 text-[9px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-800 underline underline-offset-2 cursor-pointer"
                    >
                      Usar este título
                    </button>
                  )}
                </div>
              )}

              <p className="text-[9px] font-semibold text-indigo-900/60 m-0 leading-snug">
                Assistência local e determinística — revê sempre antes de publicar. Se já escreveste o título ou escolheste o tipo à mão, nada é sobrescrito.
              </p>
            </div>
          )}

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
