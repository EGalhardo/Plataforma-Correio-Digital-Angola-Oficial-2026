// ============================================================================
// SondagemModal — popup «Criar Sondagem» (v37, PROMPT_SONDAGEM_v37 §1)
// Padrão único de popups do app: CdaModal (commit 82cf4fb).
// v37: o botão «Criar Sondagem» insere a sondagem como rascunho/bloco na área
// de conteúdo da mensagem em composição (onCriarBloco). Sem onCriarBloco
// mantém-se o comportamento v36.1 (criar + difundir imediatamente).
// ============================================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Plus, Trash2, AlertTriangle, Loader2, MessagesSquare, RefreshCw, ChevronRight, MessageCircle, Sparkles } from 'lucide-react';
import { CdaModal } from '../ui/CdaModal';
import {
  audienciaV37, criarSondagem, criarRascunhoSondagem, sondagensDisponiveis,
  type AbrangenciaSondagem, type OpcaoSondagem, type Sondagem,
} from '../../services/sondagemService';
// 2026-09-10 — Inquérito com IA conversacional (PROMPT v3): o modo 'ia' deixa
// de gerar UMA pergunta de escolha múltipla e passa a criar um GUIÃO para uma
// conversa conduzida pela IA com cada cidadão (texto/voz). Popup SIMPLES:
// 2 campos obrigatórios + pré-visualização automática + opções avançadas.
import {
  gerarGuiaoInqueritoIA, criarRascunhoInqueritoIA, inqueritosIaDisponiveis,
  type GuiaoIA, type InqueritoIA, type DuracaoIA, type TomIA, type CanalIA,
} from '../../services/inqueritoIaService';

const LETRAS = 'ABCDEFGHIJ';
const novaOpcao = (i: number): OpcaoSondagem => ({ id: LETRAS[i] || String(i), texto: '' });

interface Props {
  aberto: boolean;
  onFechar: () => void;
  codigoInstituicao: string;
  nomeInstituicao: string;
  criadaPor: string;
  addAuditLog: (action: string, type?: 'info' | 'warning' | 'critical' | 'success') => void;
  /** v37: quando presente, «Criar Sondagem» insere rascunho na composição. */
  onCriarBloco?: (sondagem: Sondagem) => void;
  /** 2026-09-10: no modo 'ia', «Criar Inquérito» insere o rascunho do
   *  Inquérito com IA (conversacional) na composição. */
  onCriarBlocoIA?: (inquerito: InqueritoIA) => void;
  /** 2026-09-09: 'ia' = Inquérito com IA (2026-09-10: conversacional, PROMPT v3). */
  modo?: 'normal' | 'ia';
}

const DURACOES: { v: DuracaoIA; rotulo: string }[] = [
  { v: 'curto', rotulo: 'Curto · ≈5 perguntas' },
  { v: 'normal', rotulo: 'Normal · ≈10' },
  { v: 'completo', rotulo: 'Completo · ≈15' },
];

export function SondagemModal({ aberto, onFechar, codigoInstituicao, nomeInstituicao, criadaPor, addAuditLog, onCriarBloco, onCriarBlocoIA, modo = 'normal' }: Props) {
  const modoIA = modo === 'ia';
  const [pergunta, setPergunta] = useState('');
  const [opcoes, setOpcoes] = useState<OpcaoSondagem[]>([novaOpcao(0), novaOpcao(1)]);
  const [permitirVarias, setPermitirVarias] = useState(false);
  const [enviando, setEnviando] = useState(false);
  // Inquérito com IA (conversacional) — 2 campos + guião automático
  const [temasIA, setTemasIA] = useState('');          // «O que pretende saber?»
  const [informacoesIA, setInformacoesIA] = useState(''); // «Que informações precisa de recolher?»
  const [gerandoIA, setGerandoIA] = useState(false);
  const [guiaoIA, setGuiaoIA] = useState<GuiaoIA | null>(null);
  const [guiaoOrigem, setGuiaoOrigem] = useState<'ia' | 'template' | null>(null);
  const [guiaoParaTextos, setGuiaoParaTextos] = useState('');   // assinatura dos textos que geraram o guião
  const [duracaoIA, setDuracaoIA] = useState<DuracaoIA>('normal');
  const [canalIA, setCanalIA] = useState<CanalIA>('ambos');
  const [tomIA, setTomIA] = useState<TomIA>('proximo');
  const [avancadasAbertas, setAvancadasAbertas] = useState(false);
  const [disponivelIA, setDisponivelIA] = useState<boolean | null>(null);
  const pedidoGuiaoRef = useRef(0);
  const [disponivel, setDisponivel] = useState<boolean | null>(null);
  const [ambito, setAmbito] = useState<{ classificacao: AbrangenciaSondagem; n: number; semProvincia?: number } | null>(null);
  const [alerta, setAlerta] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    setPergunta(''); setOpcoes([novaOpcao(0), novaOpcao(1)]);
    setPermitirVarias(false); setEnviando(false); setAlerta(null); setAmbito(null);
    setTemasIA(''); setInformacoesIA(''); setGerandoIA(false);
    setGuiaoIA(null); setGuiaoOrigem(null); setGuiaoParaTextos('');
    setDuracaoIA('normal'); setCanalIA('ambos'); setTomIA('proximo'); setAvancadasAbertas(false);
    pedidoGuiaoRef.current++;
    (async () => {
      const ok = await sondagensDisponiveis();
      setDisponivel(ok);
      if (modoIA) setDisponivelIA(await inqueritosIaDisponiveis());
      if (ok) {
        const aud = await audienciaV37(codigoInstituicao, nomeInstituicao);
        if (aud.ok && aud.dados) {
          setAmbito({ classificacao: aud.dados.classificacao, n: aud.dados.bis.length, semProvincia: aud.dados.semProvincia });
        } else if (aud.motivo === 'validacao') {
          setAlerta(aud.mensagem || 'Classificação da instituição necessária.');
        }
      }
    })();
  }, [aberto, codigoInstituicao, nomeInstituicao, modoIA]);

  // ---- Guião gerado A PEDIDO (botão «Gerar com IA») ---------------------------
  // 2026-09-11 — antes, o guião era gerado automaticamente 1,2 s após cada
  // pausa na escrita: uma instituição que corrigisse o texto várias vezes
  // disparava 5–10 chamadas ao modelo por inquérito e esgotava a quota diária.
  // Agora há UMA chamada por intenção explícita; se os textos/opções mudarem
  // depois de gerar, a pré-visualização fica «desactualizada» e é preciso
  // gerar de novo antes de «Criar Inquérito».
  const assinaturaTextos = `${temasIA.trim()}\u0000${informacoesIA.trim()}\u0000${duracaoIA}\u0000${tomIA}`;
  const camposPreenchidos = !!temasIA.trim() && !!informacoesIA.trim();
  const guiaoActual = !!guiaoIA && guiaoParaTextos === assinaturaTextos;
  const guiaoDesactualizado = !!guiaoIA && !guiaoActual;
  const gerarGuiao = async () => {
    const oQue = temasIA.trim(); const info = informacoesIA.trim();
    if (!oQue || !info) { setAlerta('Preencha os dois campos antes de gerar com IA.'); return null; }
    const meu = ++pedidoGuiaoRef.current;
    setGerandoIA(true);
    const r = await gerarGuiaoInqueritoIA({ oQuePretendeSaber: oQue, informacoes: info, instituicao: nomeInstituicao, duracao: duracaoIA, tom: tomIA });
    if (meu !== pedidoGuiaoRef.current) return null; // resposta obsoleta
    setGerandoIA(false);
    if (!r.ok || !r.dados) { setAlerta(r.mensagem || 'Não foi possível gerar o guião. Tente novamente.'); return null; }
    setGuiaoIA(r.dados.guiao); setGuiaoOrigem(r.dados.origem); setGuiaoParaTextos(assinaturaTextos);
    return r.dados.guiao;
  };

  const validas = useMemo(() => {
    const textos = opcoes.map(o => o.texto.trim()).filter(Boolean);
    return textos;
  }, [opcoes]);

  // «Criar Inquérito» (modo IA): garante o guião (IA ou template), grava o
  // rascunho e devolve o bloco ao compositor — mesmo fluxo da sondagem normal.
  const criarInqueritoIA = async () => {
    const faltas: string[] = [];
    if (!temasIA.trim()) faltas.push('o que pretende saber');
    if (!informacoesIA.trim()) faltas.push('que informações precisa de recolher');
    if (faltas.length) { setAlerta(`Indique ${faltas.join(' e ')}.`); return; }
    if (disponivelIA === false) { setAlerta('Inquérito com IA disponível em Modo Real (Supabase) — aguarda a migração v38.'); return; }
    if (ambito && ambito.classificacao === 'local' && ambito.n === 0) { setAlerta('Não há cidadãos registados no sistema desta instituição.'); return; }
    // O guião tem de existir e corresponder aos textos actuais — nunca se gera
    // implicitamente aqui (uma chamada à IA só por acção explícita do utilizador).
    if (!guiaoIA || !guiaoActual) { setAlerta(guiaoIA ? 'Os campos foram alterados depois da geração. Clique em «Gerar com IA» para actualizar o guião antes de criar.' : 'Clique primeiro em «Gerar com IA» para preparar a conversa.'); return; }
    setEnviando(true);
    const guiao = guiaoIA;
    const origem = guiaoOrigem || 'ia';
    const rasc = await criarRascunhoInqueritoIA({
      codigo: codigoInstituicao, nomeInstituicao, criadoPor: criadaPor,
      oQuePretendeSaber: temasIA.trim(), informacoes: informacoesIA.trim(),
      guiao, guiaoOrigem: origem, duracao: duracaoIA, canal: canalIA, tom: tomIA,
    });
    setEnviando(false);
    if (!rasc.ok || !rasc.dados) {
      if (rasc.motivo === 'sem_migracao') setAlerta('Inquérito com IA disponível em Modo Real (Supabase) — aguarda a migração v38.');
      else setAlerta(rasc.mensagem || 'Não foi possível criar o inquérito.');
      return;
    }
    addAuditLog(`Inquérito com IA «${temasIA.trim().slice(0, 60)}» (${guiao.campos.length} informações, guião ${origem === 'ia' ? 'gerado pela IA' : 'simplificado'}) adicionado à mensagem em composição.`, 'info');
    onCriarBlocoIA?.(rasc.dados);
    onFechar();
  };

  const enviar = async () => {
    if (modoIA) { await criarInqueritoIA(); return; }
    const faltas: string[] = [];
    if (!pergunta.trim()) faltas.push('a Pergunta');
    if (validas.length < 2) faltas.push('pelo menos duas opções (Texto A e Texto B)');
    const dup = new Set(validas.map(t => t.toLowerCase())).size !== validas.length;
    if (!faltas.length && dup) { setAlerta('Existem opções duplicadas. Corrija antes de criar.'); return; }
    if (faltas.length) { setAlerta(`Na sua sondagem está a faltar preencher alguns campos: ${faltas.join(' e ')}.`); return; }
    if (disponivel === false) { setAlerta('Funcionalidade disponível em Modo Real (Supabase) — aguarda a migração.'); return; }
    if (ambito && ambito.classificacao === 'local' && ambito.n === 0) {
      setAlerta('Não há cidadãos registados no sistema desta instituição.'); return;
    }
    const opcoesFinais = opcoes.filter(o => o.texto.trim()).map((o, i) => ({ id: LETRAS[i], texto: o.texto.trim() }));
    setEnviando(true);

    // v37: compositor → cria rascunho e devolve ao conteúdo da mensagem
    if (onCriarBloco) {
      const rasc = await criarRascunhoSondagem({
        codigo: codigoInstituicao,
        nomeInstituicao,
        criadaPor,
        pergunta: pergunta.trim(),
        opcoes: opcoesFinais,
        permitirVarias,
      });
      setEnviando(false);
      if (!rasc.ok || !rasc.dados) {
        if (rasc.motivo === 'sem_migracao') setAlerta('Funcionalidade disponível em Modo Real (Supabase) — aguarda a migração.');
        else setAlerta(rasc.mensagem || 'Não foi possível criar a sondagem.');
        return;
      }
      addAuditLog(`Sondagem «${pergunta.trim().slice(0, 60)}» adicionada à mensagem em composição (âmbito ${ambito?.classificacao || 'local'}).`, 'info');
      onCriarBloco(rasc.dados);
      onFechar();
      return;
    }

    // Caminho legado v36.1 (criar + difundir imediatamente)
    const res = await criarSondagem({
      codigo: codigoInstituicao,
      nomeInstituicao,
      criadaPor,
      pergunta: pergunta.trim(),
      opcoes: opcoesFinais,
      permitirVarias,
    });
    setEnviando(false);
    if (!res.ok) {
      if (res.motivo === 'audiencia_vazia') setAlerta('Não há cidadãos registados no sistema desta instituição.');
      else if (res.motivo === 'sem_migracao') setAlerta('Funcionalidade disponível em Modo Real (Supabase) — aguarda a migração.');
      else setAlerta(res.mensagem || 'Não foi possível criar a sondagem.');
      return;
    }
    addAuditLog(`Sondagem «${pergunta.trim().slice(0, 60)}» criada e difundida a ${res.dados!.audiencia} cidadãos (âmbito ${ambito?.classificacao || 'nacional'}).`, 'success');
    onFechar();
  };

  return (
    <>
      <CdaModal
        aberto={aberto}
        onFechar={() => !enviando && onFechar()}
        icone={modoIA ? MessagesSquare : BarChart3}
        titulo={modoIA ? 'Criar Inquérito com IA' : 'Criar Sondagem'}
        subtitulo={modoIA ? 'A IA conversa com cada cidadão e recolhe as informações' : 'Difusão oficial pelo Correio Digital Angola — modelo WhatsApp'}
        maxW="max-w-2xl"
      >
        <div className="space-y-5 text-left">
          {/* Inquérito com IA (conversacional) — 2 campos + pré-visualização + opções avançadas */}
          {modoIA && (
            <div className="space-y-4">
              <div>
                <label className="block font-sans font-black text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">O que pretende saber?</label>
                <textarea
                  value={temasIA}
                  maxLength={1500}
                  rows={3}
                  onChange={(e) => setTemasIA(e.target.value)}
                  placeholder="Ex.: Se as famílias do bairro têm acesso a água potável e energia eléctrica e quais as maiores dificuldades"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40 focus:border-[#2563eb]"
                  id="inquerito-ia-temas"
                />
              </div>
              <div>
                <label className="block font-sans font-black text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Que informações precisa de recolher?</label>
                <textarea
                  value={informacoesIA}
                  maxLength={1500}
                  rows={3}
                  onChange={(e) => setInformacoesIA(e.target.value)}
                  placeholder="Ex.: Tem água canalizada em casa; onde vai buscar água; distância; horas de energia por dia; principal problema"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40 focus:border-[#2563eb]"
                  id="inquerito-ia-informacoes"
                />
              </div>

              {/* Botão «Gerar com IA» — única forma de chamar a IA (poupa quota) */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="m-0 text-[11px] font-semibold text-slate-500">
                  {guiaoDesactualizado
                    ? 'Os campos mudaram — gere de novo para actualizar a conversa.'
                    : guiaoIA
                      ? 'Guião pronto. Pode regenerar ou criar o inquérito.'
                      : 'Preencha os dois campos e clique em «Gerar com IA».'}
                </p>
                <button
                  type="button"
                  onClick={() => void gerarGuiao()}
                  disabled={!camposPreenchidos || gerandoIA || enviando}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                    guiaoIA && !guiaoDesactualizado
                      ? 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
                      : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow'
                  }`}
                  id="btn-gerar-guiao-ia"
                >
                  {gerandoIA ? <Loader2 size={14} className="animate-spin" /> : guiaoIA ? <RefreshCw size={14} /> : <Sparkles size={14} />}
                  {gerandoIA ? 'A gerar…' : guiaoIA ? (guiaoDesactualizado ? 'Gerar de novo com IA' : 'Regenerar') : 'Gerar com IA'}
                </button>
              </div>

              {/* Pré-visualização (só leitura) — aparece depois de gerar */}
              <div
                className={`rounded-xl border px-4 py-3 ${guiaoDesactualizado ? 'border-amber-200 bg-amber-50/50' : 'border-blue-100 bg-blue-50/50'}`}
                data-testid="inquerito-ia-preview"
                data-estado={gerandoIA ? 'a-gerar' : guiaoDesactualizado ? 'desactualizado' : guiaoIA ? 'pronto' : 'vazio'}
              >
                <p className={`m-0 flex items-center gap-1.5 font-sans font-black text-[10px] uppercase tracking-widest ${guiaoDesactualizado ? 'text-amber-700' : 'text-blue-700'}`}>
                  <MessageCircle size={13} /> Como a IA vai começar{guiaoDesactualizado ? ' · desactualizado' : ''}
                </p>
                {gerandoIA ? (
                  <p className="m-0 mt-2 flex items-center gap-2 text-sm font-medium text-slate-500"><Loader2 size={14} className="animate-spin" /> A preparar a conversa…</p>
                ) : guiaoIA ? (
                  <>
                    <p className={`m-0 mt-2 text-sm font-medium leading-snug ${guiaoDesactualizado ? 'text-slate-500' : 'text-slate-800'}`}>«{guiaoIA.saudacao}»</p>
                    <p className="m-0 mt-2 text-[11px] font-semibold text-slate-500">
                      A IA vai recolher {guiaoIA.campos.length} informação(ões) em até {guiaoIA.maxPerguntas} perguntas
                      {guiaoOrigem === 'template' ? ' · guião simplificado (IA indisponível neste momento)' : ''}.
                    </p>
                  </>
                ) : (
                  <p className="m-0 mt-2 text-sm font-medium text-slate-500">A pré-visualização aparece aqui depois de clicar em «Gerar com IA».</p>
                )}
              </div>

              {/* Opções avançadas (recolhidas) */}
              <div className="rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setAvancadasAbertas((v) => !v)}
                  aria-expanded={avancadasAbertas}
                  className="w-full flex items-center gap-2 px-4 py-2.5 bg-transparent border-0 cursor-pointer text-left font-sans font-black text-[10px] uppercase tracking-widest text-slate-500"
                  id="btn-opcoes-avancadas-ia"
                >
                  <ChevronRight size={14} className={`transition-transform ${avancadasAbertas ? 'rotate-90' : ''}`} /> Opções avançadas
                  <span className="ml-auto text-[10px] font-semibold normal-case tracking-normal text-slate-400">
                    {DURACOES.find((d) => d.v === duracaoIA)?.rotulo.split(' · ')[0]} · {canalIA === 'ambos' ? 'Texto e voz' : 'Só texto'} · {tomIA === 'proximo' ? 'Próximo' : 'Formal'}
                  </span>
                </button>
                {avancadasAbertas && (
                  <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
                    {([
                      { rotulo: 'Duração', opcoes: DURACOES.map((d) => ({ v: d.v, r: d.rotulo })), valor: duracaoIA, set: (v: string) => setDuracaoIA(v as DuracaoIA) },
                      { rotulo: 'Canal', opcoes: [{ v: 'ambos', r: 'Texto e voz' }, { v: 'texto', r: 'Só texto' }], valor: canalIA, set: (v: string) => setCanalIA(v as CanalIA) },
                      { rotulo: 'Tom', opcoes: [{ v: 'proximo', r: 'Próximo' }, { v: 'formal', r: 'Formal' }], valor: tomIA, set: (v: string) => setTomIA(v as TomIA) },
                    ] as const).map((grupo) => (
                      <div key={grupo.rotulo} className="flex items-center gap-2 flex-wrap">
                        <span className="w-20 shrink-0 text-[10px] font-black uppercase tracking-widest text-slate-500">{grupo.rotulo}</span>
                        {grupo.opcoes.map((o) => (
                          <button
                            key={o.v}
                            type="button"
                            onClick={() => grupo.set(o.v)}
                            aria-pressed={grupo.valor === o.v}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border cursor-pointer transition-colors ${
                              grupo.valor === o.v ? 'bg-[#2563eb] border-[#2563eb] text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            {o.r}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pergunta (oculta no modo IA: a IA gera-a a partir dos temas/informações) */}
          {!modoIA && (<>
          <div>
            <label className="block font-sans font-black text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Pergunta</label>
            <input
              value={pergunta}
              maxLength={280}
              onChange={(e) => setPergunta(e.target.value)}
              placeholder="Escreva a pergunta da sondagem"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40 focus:border-[#2563eb]"
            />
          </div>

          {/* Opções */}
          <div>
            <label className="block font-sans font-black text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Opções</label>
            <div className="space-y-2">
              {opcoes.map((o, i) => (
                <div key={o.id} className="flex items-center gap-2">
                  <span className="shrink-0 w-7 h-7 rounded-lg bg-blue-50 text-[#2563eb] font-black text-xs flex items-center justify-center">{LETRAS[i]}</span>
                  <input
                    value={o.texto}
                    maxLength={120}
                    onChange={(e) => setOpcoes(prev => prev.map(p => p.id === o.id ? { ...p, texto: e.target.value } : p))}
                    placeholder={i === 0 ? 'Texto A' : i === 1 ? 'Texto B' : `Texto ${LETRAS[i]}`}
                    className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40 focus:border-[#2563eb]"
                  />
                  {opcoes.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setOpcoes(prev => prev.filter(p => p.id !== o.id))}
                      className="shrink-0 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-0 cursor-pointer p-1"
                      title="Remover opção"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {opcoes.length < 10 && (
              <button
                type="button"
                onClick={() => setOpcoes(prev => [...prev, novaOpcao(prev.length)])}
                className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-[#2563eb] hover:text-blue-800 bg-transparent border-0 cursor-pointer"
              >
                <Plus size={14} /> Adicionar opção
              </button>
            )}
          </div>

          {/* Toggle permitir várias respostas */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm font-bold text-slate-700">Permitir várias respostas</span>
            <button
              type="button"
              role="switch"
              aria-checked={permitirVarias}
              onClick={() => setPermitirVarias(v => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer border-0 ${permitirVarias ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${permitirVarias ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Âmbito / audiência (transparência antes do envio — spec §3.4) */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-[12px] font-semibold text-slate-700">
            {disponivel === false ? (
              <span className="text-amber-700">Funcionalidade disponível em Modo Real (Supabase) — aguarda a migração.</span>
            ) : ambito ? (
              <>
                {ambito.classificacao === 'nacional' && <>Âmbito: <strong>Nacional</strong> — será enviada a todos cidadãos registados.</>}
                {ambito.classificacao === 'regional' && (
                  <>
                    Âmbito: <strong>Regional</strong> — será enviada aos <strong>{ambito.n}</strong> cidadãos da província da instituição.
                    {typeof ambito.semProvincia === 'number' && ambito.semProvincia > 0 && (
                      <span className="block mt-1 text-amber-700">{ambito.semProvincia} cidadão(s) sem província registada não serão abrangidos.</span>
                    )}
                  </>
                )}
                {ambito.classificacao === 'local' && <>Âmbito: <strong>Local</strong> — será enviada aos <strong>{ambito.n}</strong> cidadãos registados no sistema da instituição.</>}
              </>
            ) : (
              'A calcular audiência…'
            )}
          </div>

          </>)}

          {/* Rodapé */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onFechar}
              className="px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 bg-transparent border border-slate-200 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={enviar}
              disabled={enviando || (modoIA && (!guiaoActual || gerandoIA))}
              title={modoIA && !guiaoActual ? 'Gere primeiro a conversa com IA' : undefined}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#2563eb] hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-[11px] font-black uppercase tracking-widest border-0 cursor-pointer shadow"
              id={modoIA ? 'btn-criar-inquerito-ia' : undefined}
            >
              {enviando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} {enviando ? 'A criar…' : modoIA ? 'Criar Inquérito' : 'Criar Sondagem'}
            </button>
          </div>
        </div>
      </CdaModal>

      {/* Popup de validação / avisos (spec §1.3 / §3.5) */}
      <CdaModal
        aberto={!!alerta}
        onFechar={() => setAlerta(null)}
        icone={AlertTriangle}
        titulo={modoIA ? 'Inquérito com IA' : 'Sondagem'}
        tomIcone="bg-amber-50 text-amber-600 border-amber-100"
        maxW="max-w-md"
      >
        <p className="text-sm font-semibold text-slate-700 text-left">{alerta}</p>
      </CdaModal>
    </>
  );
}
