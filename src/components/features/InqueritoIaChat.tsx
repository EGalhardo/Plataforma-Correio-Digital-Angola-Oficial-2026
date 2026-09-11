// ============================================================================
// InqueritoIaChat — área Cidadão (2026-09-10, PROMPT_inquerito_ia v3 §4.2)
// Conversa conduzida pela IA a partir do GUIÃO do inquérito. O cidadão
// responde por texto ou por voz (canal 'ambos' — voz AUTOMÁTICA: a IA lê cada
// pergunta e abre o microfone sozinha; o cidadão pode desligar a voz a qualquer
// momento e escrever); a IA pergunta UMA coisa de
// cada vez; os valores extraídos são acumulados e gravados de forma anónima
// (hash do BI) — o cidadão NUNCA os vê. No fim: agradecimento + «Concluir».
//
// Contingência (§4.6): se /conversa falhar 2× seguidas ou devolver 503 entra
// em «modo guiado» (perguntas por template, campo a campo) — canal 'guiado'.
// Fechar a meio mantém `em_curso` com histórico; reabrir retoma.
// Padrão de popups do app: CdaModal.
// ============================================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessagesSquare, Mic, MicOff, Send, Volume2, VolumeX, Loader2, CheckCircle2, AlertTriangle, PartyPopper } from 'lucide-react';
import { CdaModal } from '../ui/CdaModal';
import { aplicarVozPt, escolherVozPt } from '../../utils/vozTts';
import {
  conversarInqueritoIA, iniciarOuRetomarRespostaIA, guardarProgressoIA, concluirRespostaIA, recusarRespostaIA,
  type InqueritoIA, type TrocaIA, type CampoGuiaoIA,
} from '../../services/inqueritoIaService';
import {
  LIMITE_TEXTO_CIDADAO, MENSAGEM_AGRADECIMENTO, MENSAGEM_RECUSA, RE_RECUSA,
  proximoCampoGuiado, perguntaGuiada, interpretarRespostaGuiada,
} from '../../services/inqueritoIaCore';

// Superfície mínima da Web Speech API (a lib DOM do TS não traz SpeechRecognition).
interface ResultadoReconhecimento {
  resultIndex: number;
  results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } };
}
interface ReconhecimentoVoz {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((e: ResultadoReconhecimento) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}

interface Props {
  aberto: boolean;
  onFechar: () => void;
  inquerito: InqueritoIA;
  cidadaoBi: string;
  /** Chamado após «Concluir» (a correspondência passa a «Respondida»). */
  onConcluido?: () => void;
  /** Chamado quando o cidadão recusa logo na saudação. */
  onRecusado?: () => void;
  addAuditLog?: (action: string, type?: 'info' | 'warning' | 'critical' | 'success') => void;
}

type Fase = 'a_carregar' | 'saudacao' | 'conversa' | 'fim' | 'indisponivel';
type Canal = 'texto' | 'voz' | 'guiado';

const vozDisponivel = (): boolean => {
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
};

export function InqueritoIaChat({ aberto, onFechar, inquerito, cidadaoBi, onConcluido, onRecusado, addAuditLog }: Props) {
  const guiao = inquerito.guiao;
  const [fase, setFase] = useState<Fase>('a_carregar');
  const [respostaId, setRespostaId] = useState<number | null>(null);
  const [historico, setHistorico] = useState<TrocaIA[]>([]);
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [respostaRapida, setRespostaRapida] = useState<string[] | null>(null);
  const [texto, setTexto] = useState('');
  const [aPensar, setAPensar] = useState(false);
  const [aConcluir, setAConcluir] = useState(false);
  const [modoGuiado, setModoGuiado] = useState(false);
  const [campoGuiado, setCampoGuiado] = useState<CampoGuiaoIA | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  // voz
  const podeVoz = inquerito.canal !== 'texto' && vozDisponivel();
  const podeLer = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [aOuvir, setAOuvir] = useState(false);
  const [aFalar, setAFalar] = useState(false);
  const [interino, setInterino] = useState('');
  // Voz AUTOMÁTICA quando o inquérito permite voz: a IA lê cada pergunta e
  // abre o microfone a seguir. O cidadão pode desligar (botão altifalante).
  const [vozActiva, setVozActiva] = useState<boolean>(inquerito.canal !== 'texto' && podeLer);
  const [confirmacao, setConfirmacao] = useState(false); // ecrã «Participação registada»
  const usouVozRef = useRef(false);
  const recRef = useRef<ReconhecimentoVoz | null>(null);
  const falhasRef = useRef(0);
  const fimRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lerRef = useRef(false);
  lerRef.current = vozActiva;
  const faseRef = useRef<Fase>('a_carregar');
  const aPensarRef = useRef(false);
  aPensarRef.current = aPensar;
  const ouvirRef = useRef<() => void>(() => {});
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerSilencioRef = useRef<number | null>(null);

  useEffect(() => { faseRef.current = fase; }, [fase]);
  const nPerguntas = useMemo(() => historico.filter((t) => t.de === 'ia').length, [historico]);
  const canalUsado: Canal = modoGuiado ? 'guiado' : usouVozRef.current ? 'voz' : 'texto';

  // ---- leitura em voz alta (opcional; desligada por defeito) ----------------
  const falar = useCallback((t: string, depois?: () => void) => {
    if (!lerRef.current || typeof window === 'undefined' || !('speechSynthesis' in window)) { depois?.(); return; }
    const arrancar = () => {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(t);
        aplicarVozPt(u);
        utterRef.current = u; // evita GC da utterance antes do onend (bug conhecido do Chrome)
        let terminado = false;
        const fim = () => { if (terminado) return; terminado = true; setAFalar(false); utterRef.current = null; depois?.(); };
        u.onstart = () => setAFalar(true);
        u.onend = fim;
        u.onerror = fim;
        // Rede de segurança: alguns motores não disparam onend.
        window.setTimeout(fim, Math.min(30000, 2500 + t.length * 80));
        setAFalar(true);
        window.speechSynthesis.speak(u);
      } catch { setAFalar(false); depois?.(); }
    };
    // As vozes carregam de forma assíncrona no Chrome — sem esperar, a 1.ª
    // frase sai na voz por omissão (ou não sai). Espera até ~1,2 s.
    if (window.speechSynthesis.getVoices().length > 0 || escolherVozPt()) { arrancar(); return; }
    let feito = false;
    const go = () => { if (feito) return; feito = true; window.speechSynthesis.onvoiceschanged = null; arrancar(); };
    window.speechSynthesis.onvoiceschanged = go;
    window.setTimeout(go, 1200);
  }, []);

  /** Lê uma pergunta e, se a voz estiver activa e o inquérito permitir voz,
   *  abre o microfone quando a leitura terminar. */
  const perguntarEmVoz = useCallback((t: string) => {
    falar(t, () => {
      if (!lerRef.current || !podeVoz) return;
      const f = faseRef.current;
      if ((f === 'saudacao' || f === 'conversa') && !aPensarRef.current) ouvirRef.current();
    });
  }, [falar, podeVoz]);

  const acrescentar = useCallback((troca: TrocaIA) => {
    setHistorico((h) => [...h, troca]);
    if (troca.de === 'ia') perguntarEmVoz(troca.texto);
  }, [perguntarEmVoz]);

  // ---- arranque / retoma -----------------------------------------------------
  useEffect(() => {
    if (!aberto) return;
    let vivo = true;
    setFase('a_carregar'); setErro(null); setTexto(''); setInterino(''); setRespostaRapida(null);
    setModoGuiado(false); setCampoGuiado(null); falhasRef.current = 0; usouVozRef.current = false;
    setConfirmacao(false); setVozActiva(inquerito.canal !== 'texto' && podeLer);
    (async () => {
      const r = await iniciarOuRetomarRespostaIA(inquerito.id, cidadaoBi);
      if (!vivo) return;
      if (!r.ok || !r.dados) { setErro(r.mensagem || 'Não foi possível iniciar o inquérito.'); setFase('indisponivel'); return; }
      setRespostaId(r.dados.id);
      const hist = Array.isArray(r.dados.historico) ? r.dados.historico : [];
      const cmp = r.dados.campos && typeof r.dados.campos === 'object' ? r.dados.campos : {};
      setCampos(cmp);
      if (r.dados.estado === 'concluido') { setHistorico(hist); setFase('fim'); return; }
      if (hist.length === 0) {
        setHistorico([{ de: 'ia', texto: guiao.saudacao }]);
        setRespostaRapida(['Sim, podemos', 'Agora não']);
        setFase('saudacao'); faseRef.current = 'saudacao';
        perguntarEmVoz(guiao.saudacao);
      } else {
        // retoma: a última troca deve ser da IA (pergunta pendente); se for do
        // cidadão, volta a pedir o passo seguinte à IA.
        setHistorico(hist);
        setFase('conversa'); faseRef.current = 'conversa';
        if (hist[hist.length - 1]?.de === 'ia') perguntarEmVoz(hist[hist.length - 1].texto);
        if (r.dados.canal_usado === 'guiado') {
          setModoGuiado(true);
          const c = proximoCampoGuiado(guiao, cmp);
          setCampoGuiado(c);
          if (c) setRespostaRapida(perguntaGuiada(c).respostaRapida);
        } else if (hist[hist.length - 1]?.de === 'cidadao') {
          void pedirPasso(hist, cmp);
        }
      }
    })();
    return () => { vivo = false; pararVoz(); if ('speechSynthesis' in window) window.speechSynthesis.cancel(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, inquerito.id, cidadaoBi]);

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [historico, aPensar]);

  // ---- passo da IA -------------------------------------------------------------
  const entrarModoGuiado = useCallback((hist: TrocaIA[], cmp: Record<string, string>) => {
    setModoGuiado(true);
    const c = proximoCampoGuiado(guiao, cmp);
    setCampoGuiado(c);
    if (!c) { terminar(hist, cmp, 'concluido'); return; }
    const p = perguntaGuiada(c);
    const novoHist = [...hist, { de: 'ia' as const, texto: p.texto }];
    setHistorico(novoHist); perguntarEmVoz(p.texto);
    setRespostaRapida(p.respostaRapida);
    if (respostaId) void guardarProgressoIA({ respostaId, historico: novoHist, campos: cmp, canalUsado: 'guiado' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guiao, respostaId, perguntarEmVoz]);

  const terminar = useCallback((hist: TrocaIA[], cmp: Record<string, string>, motivo: 'concluido' | 'limite_perguntas' | 'recusado') => {
    const ultimo = hist[hist.length - 1];
    const jaAgradeceu = ultimo?.de === 'ia' && /obrigad/i.test(ultimo.texto);
    const novoHist = jaAgradeceu ? hist : [...hist, { de: 'ia' as const, texto: motivo === 'recusado' ? MENSAGEM_RECUSA : MENSAGEM_AGRADECIMENTO }];
    setHistorico(novoHist);
    setRespostaRapida(null);
    setFase('fim'); faseRef.current = 'fim';
    if (!jaAgradeceu) falar(novoHist[novoHist.length - 1].texto);
    if (respostaId) void guardarProgressoIA({ respostaId, historico: novoHist, campos: cmp, canalUsado });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [respostaId, falar, canalUsado]);

  const pedirPasso = useCallback(async (hist: TrocaIA[], cmp: Record<string, string>) => {
    setAPensar(true); setRespostaRapida(null);
    const r = await conversarInqueritoIA({ guiao, historico: hist, camposRecolhidos: cmp, instituicao: inquerito.instituicao_nome, tom: inquerito.tom });
    setAPensar(false);
    if (!r.ok || !r.dados) {
      falhasRef.current += 1;
      if (falhasRef.current >= 2 || r.motivo !== 'validacao') { entrarModoGuiado(hist, cmp); return; }
      setErro('A ligação falhou. Tente enviar novamente.');
      return;
    }
    falhasRef.current = 0;
    const passo = r.dados;
    // O valor MAIS RECENTE prevalece sempre (a IA pode corrigir uma extracção provisória).
    const novosCampos = { ...cmp };
    for (const [k, v] of Object.entries(passo.camposExtraidos || {})) {
      if (guiao.campos.some((c) => c.chave === k) && String(v ?? '').trim()) novosCampos[k] = String(v).trim();
    }
    setCampos(novosCampos);
    const novoHist = [...hist, { de: 'ia' as const, texto: passo.proximaMensagem }];
    setHistorico(novoHist);
    if (passo.terminou) {
      setRespostaRapida(null);
      setFase('fim'); faseRef.current = 'fim';
      falar(passo.proximaMensagem);
      if (respostaId) void guardarProgressoIA({ respostaId, historico: novoHist, campos: novosCampos, canalUsado });
      return;
    }
    setRespostaRapida(passo.respostaRapida && passo.respostaRapida.length ? passo.respostaRapida.slice(0, 6) : null);
    if (respostaId) void guardarProgressoIA({ respostaId, historico: novoHist, campos: novosCampos, canalUsado });
    perguntarEmVoz(passo.proximaMensagem);
    if (!lerRef.current) setTimeout(() => inputRef.current?.focus(), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guiao, inquerito, respostaId, entrarModoGuiado, falar, perguntarEmVoz, canalUsado]);

  // ---- envio do cidadão --------------------------------------------------------
  const enviar = async (bruto?: string) => {
    const t = String(bruto ?? texto).trim().slice(0, LIMITE_TEXTO_CIDADAO);
    if (!t || aPensar || fase === 'fim' || fase === 'a_carregar') return;
    setTexto(''); setInterino(''); setErro(null);
    pararVoz();
    const hist = [...historico, { de: 'cidadao' as const, texto: t }];
    setHistorico(hist);

    // Saudação: recusa ⇒ agradece, estado 'recusado', nada de campos.
    if (fase === 'saudacao') {
      if (RE_RECUSA.test(t)) {
        setHistorico([...hist, { de: 'ia', texto: MENSAGEM_RECUSA }]);
        setRespostaRapida(null); setFase('fim'); faseRef.current = 'fim';
        falar(MENSAGEM_RECUSA);
        if (respostaId) await recusarRespostaIA(respostaId);
        addAuditLog?.(`Inquérito com IA «${guiao.objectivo}» recusado pelo cidadão.`, 'info');
        onRecusado?.();
        return;
      }
      setFase('conversa'); faseRef.current = 'conversa';
    }

    if (modoGuiado) {
      if (!campoGuiado) { terminar(hist, campos, 'concluido'); return; }
      const novosCampos = { ...campos, [campoGuiado.chave]: interpretarRespostaGuiada(campoGuiado, t) };
      setCampos(novosCampos);
      const limite = nPerguntas >= guiao.maxPerguntas;
      const prox = limite ? null : proximoCampoGuiado(guiao, novosCampos);
      if (!prox) { terminar(hist, novosCampos, limite ? 'limite_perguntas' : 'concluido'); return; }
      setCampoGuiado(prox);
      const p = perguntaGuiada(prox);
      const novoHist = [...hist, { de: 'ia' as const, texto: p.texto }];
      setHistorico(novoHist); perguntarEmVoz(p.texto);
      setRespostaRapida(p.respostaRapida);
      if (respostaId) void guardarProgressoIA({ respostaId, historico: novoHist, campos: novosCampos, canalUsado: 'guiado' });
      return;
    }
    await pedirPasso(hist, campos);
  };

  const concluir = async () => {
    if (!respostaId || aConcluir) return;
    setAConcluir(true);
    const ultimo = historico[historico.length - 1];
    const recusou = ultimo?.de === 'ia' && ultimo.texto === MENSAGEM_RECUSA && Object.keys(campos).length === 0;
    if (!recusou) {
      const r = await concluirRespostaIA({ respostaId, historico, campos, canalUsado });
      setAConcluir(false);
      if (!r.ok) { setErro(r.mensagem || 'Não foi possível concluir. Tente novamente.'); return; }
      addAuditLog?.(`Inquérito com IA «${guiao.objectivo}» concluído pelo cidadão (${Object.keys(campos).length} informação(ões), canal ${canalUsado}).`, 'success');
      onConcluido?.();
      pararVoz(); if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setConfirmacao(true); // ecrã «Participação registada»; ao fechar volta ao detalhe da correspondência
      return;
    }
    setAConcluir(false);
    onFechar();
  };

  // ---- voz (SpeechRecognition pt-PT) -------------------------------------------
  const limparTimerSilencio = () => { if (timerSilencioRef.current) { window.clearTimeout(timerSilencioRef.current); timerSilencioRef.current = null; } };
  const pararVoz = () => {
    limparTimerSilencio();
    const rec = recRef.current; recRef.current = null;
    if (rec) { rec.onend = null; rec.onresult = null; rec.onerror = null; try { rec.stop(); } catch { /* noop */ } }
    setAOuvir(false); setInterino('');
  };
  /** Abre o microfone: reconhecimento contínuo com paragem automática após
   *  ~1,8 s de silêncio depois de haver texto (ou 8 s sem nada). */
  const ouvir = () => {
    if (recRef.current || fase === 'fim' || fase === 'a_carregar' || aPensar) return;
    const w = window as unknown as { SpeechRecognition?: new () => ReconhecimentoVoz; webkitSpeechRecognition?: new () => ReconhecimentoVoz };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setAFalar(false);
    const rec = new Ctor();
    rec.lang = 'pt-PT'; rec.continuous = true; rec.interimResults = true;
    let final = '';
    let parcialAct = '';
    const agendarParagem = (ms: number) => {
      limparTimerSilencio();
      timerSilencioRef.current = window.setTimeout(() => { try { rec.stop(); } catch { /* noop */ } }, ms);
    };
    rec.onresult = (e) => {
      let parcial = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const tr = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += (final ? ' ' : '') + tr.trim(); else parcial += tr;
      }
      parcialAct = parcial;
      setInterino(parcial);
      setTexto((final + (parcial ? ' ' + parcial : '')).trim());
      agendarParagem(1800); // pausa natural ⇒ envia
    };
    rec.onerror = (e) => {
      limparTimerSilencio();
      setAOuvir(false); recRef.current = null; setInterino('');
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { setVozActiva(false); setErro('Sem permissão para usar o microfone. Pode continuar a escrever.'); }
    };
    rec.onend = () => {
      limparTimerSilencio();
      setAOuvir(false); recRef.current = null; setInterino('');
      const dito = (final + (parcialAct ? ' ' + parcialAct : '')).trim();
      if (dito) { usouVozRef.current = true; void enviar(dito); }
      else setTimeout(() => inputRef.current?.focus(), 50);
    };
    recRef.current = rec;
    setAOuvir(true); setErro(null);
    try { rec.start(); agendarParagem(8000); } catch { setAOuvir(false); recRef.current = null; }
  };
  ouvirRef.current = ouvir;
  const alternarVoz = () => { if (aOuvir) pararVoz(); else ouvir(); };
  const alternarLeitura = () => {
    const nova = !vozActiva;
    setVozActiva(nova); lerRef.current = nova;
    if (!nova) { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); setAFalar(false); pararVoz(); }
    else {
      // ao ligar, relê a última pergunta e abre o microfone
      const ult = historico[historico.length - 1];
      if (ult?.de === 'ia' && (fase === 'saudacao' || fase === 'conversa')) perguntarEmVoz(ult.texto);
    }
  };

  const fechar = () => {
    pararVoz();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    onFechar();
  };

  const progresso = Math.min(100, Math.round((nPerguntas / Math.max(1, guiao.maxPerguntas)) * 100));
  const podeEscrever = fase === 'saudacao' || fase === 'conversa';

  return (
    <CdaModal
      aberto={aberto}
      onFechar={fechar}
      icone={MessagesSquare}
      titulo="Inquérito com IA"
      subtitulo={inquerito.instituicao_nome}
      maxW="max-w-2xl"
    >
      {confirmacao ? (
        <div className="flex flex-col items-center text-center py-6 px-2" data-testid="inquerito-ia-confirmacao">
          <span className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 border border-emerald-100">
            <CheckCircle2 size={32} />
          </span>
          <h4 className="text-lg font-black text-slate-800 m-0">Participação registada</h4>
          <p className="text-sm font-medium text-slate-600 m-0 mt-2 max-w-md leading-relaxed">
            Muito obrigado. As suas respostas ao inquérito de <b>{inquerito.instituicao_nome}</b> foram registadas de forma anónima e vão ajudar a melhorar os serviços públicos.
          </p>
          <p className="text-[11px] font-semibold text-slate-400 m-0 mt-3 flex items-center gap-1.5"><PartyPopper size={13} /> Esta correspondência fica marcada como respondida.</p>
          <button
            type="button"
            onClick={fechar}
            className="mt-6 px-6 py-2.5 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white text-[11px] font-black uppercase tracking-widest border-0 cursor-pointer shadow"
            id="btn-inquerito-ia-voltar"
          >
            Voltar à mensagem
          </button>
        </div>
      ) : (
      <div className="flex flex-col text-left" style={{ height: 'min(70vh, 640px)' }} data-testid="inquerito-ia-chat">
        {/* Progresso */}
        {fase !== 'a_carregar' && fase !== 'indisponivel' && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
              <span>{fase === 'fim' ? 'Inquérito terminado' : `Pergunta ${Math.max(1, nPerguntas)} de ~${guiao.maxPerguntas}`}</span>
              <span className="flex items-center gap-2">
                {modoGuiado && <span className="inline-flex items-center gap-1 text-amber-600 normal-case tracking-normal font-bold"><AlertTriangle size={11} /> Modo simplificado</span>}
                {podeLer && (
                  <button
                    type="button"
                    onClick={alternarLeitura}
                    title={vozActiva ? 'Desligar a voz (só texto)' : 'Ligar a voz'}
                    aria-pressed={vozActiva}
                    className={`h-7 px-2 rounded-full border flex items-center gap-1 cursor-pointer transition-colors normal-case tracking-normal text-[10px] font-bold ${vozActiva ? 'bg-[#2563eb] border-[#2563eb] text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                    id="btn-inquerito-ia-ler"
                  >
                    {vozActiva ? <Volume2 size={13} className={aFalar ? 'animate-pulse' : ''} /> : <VolumeX size={13} />} {vozActiva ? 'Voz' : 'Texto'}
                  </button>
                )}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-[#2563eb] transition-all" style={{ width: `${fase === 'fim' ? 100 : progresso}%` }} />
            </div>
          </div>
        )}

        {/* Conversa */}
        <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/60 px-3 py-3 space-y-2.5" role="log" aria-live="polite">
          {fase === 'a_carregar' && (
            <p className="m-0 flex items-center gap-2 text-sm font-medium text-slate-500"><Loader2 size={15} className="animate-spin" /> A preparar o inquérito…</p>
          )}
          {fase === 'indisponivel' && (
            <p className="m-0 text-sm font-semibold text-rose-600">{erro || 'Inquérito indisponível.'}</p>
          )}
          {historico.map((t, i) => (
            <div key={i} className={`flex ${t.de === 'ia' ? 'justify-start' : 'justify-end'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm font-medium leading-snug whitespace-pre-wrap break-words ${
                  t.de === 'ia' ? 'bg-slate-100 text-slate-800 rounded-bl-md' : 'bg-indigo-600 text-white rounded-br-md'
                }`}
                data-testid={t.de === 'ia' ? 'bolha-ia' : 'bolha-cidadao'}
              >
                {t.texto}
              </div>
            </div>
          ))}
          {aPensar && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Loader2 size={13} className="animate-spin" /> a escrever…
              </div>
            </div>
          )}
          {interino && (
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-indigo-200/70 text-indigo-900 px-4 py-2.5 text-sm italic">{interino}</div>
            </div>
          )}
          <div ref={fimRef} />
        </div>

        {/* Chips de resposta rápida */}
        {podeEscrever && respostaRapida && respostaRapida.length > 0 && !aPensar && (
          <div className="flex flex-wrap gap-2 mt-3" data-testid="respostas-rapidas">
            {respostaRapida.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => void enviar(r)}
                className="px-3.5 py-1.5 rounded-full border border-[#2563eb]/40 bg-white text-[#2563eb] text-xs font-bold hover:bg-blue-50 cursor-pointer active:scale-95 transition-all"
              >
                {r}
              </button>
            ))}
          </div>
        )}

        {erro && fase !== 'indisponivel' && (
          <p className="m-0 mt-2 text-[11px] font-semibold text-amber-700 flex items-center gap-1.5"><AlertTriangle size={12} /> {erro}</p>
        )}

        {/* Entrada */}
        {podeEscrever && (
          <form
            className="mt-3 flex items-center gap-2"
            onSubmit={(e) => { e.preventDefault(); void enviar(); }}
          >
            {podeVoz && (
              <button
                type="button"
                onClick={alternarVoz}
                disabled={aPensar}
                title={aOuvir ? 'Parar de ouvir' : 'Responder por voz'}
                aria-pressed={aOuvir}
                className={`shrink-0 w-11 h-11 rounded-xl border flex items-center justify-center cursor-pointer transition-colors disabled:opacity-50 ${
                  aOuvir ? 'bg-rose-500 border-rose-500 text-white animate-pulse' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
                id="btn-inquerito-ia-mic"
              >
                {aOuvir ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            )}
            <input
              ref={inputRef}
              value={texto}
              onChange={(e) => setTexto(e.target.value.slice(0, LIMITE_TEXTO_CIDADAO))}
              maxLength={LIMITE_TEXTO_CIDADAO}
              disabled={aPensar}
              placeholder={aOuvir ? 'A ouvir… fale agora' : aFalar ? 'A IA está a falar…' : vozActiva && podeVoz ? 'Fale ou escreva a sua resposta' : 'Escreva a sua resposta'}
              autoComplete="off"
              className="flex-1 min-w-0 h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40 focus:border-[#2563eb] disabled:bg-slate-50"
              id="inquerito-ia-input"
            />
            <button
              type="submit"
              disabled={!texto.trim() || aPensar}
              className="shrink-0 h-11 px-4 rounded-xl bg-[#2563eb] hover:bg-blue-700 disabled:opacity-50 text-white flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-widest border-0 cursor-pointer shadow"
              id="btn-inquerito-ia-enviar"
            >
              <Send size={14} /> Enviar
            </button>
          </form>
        )}

        {/* Fim: apenas «Concluir» — sem resumo, sem campos, sem valores */}
        {fase === 'fim' && (
          <div className="mt-3 flex items-center justify-end">
            <button
              type="button"
              onClick={() => void concluir()}
              disabled={aConcluir}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#2563eb] hover:bg-blue-700 disabled:opacity-60 text-white text-[11px] font-black uppercase tracking-widest border-0 cursor-pointer shadow"
              id="btn-inquerito-ia-concluir"
            >
              {aConcluir ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Concluir
            </button>
          </div>
        )}
      </div>
      )}
    </CdaModal>
  );
}
