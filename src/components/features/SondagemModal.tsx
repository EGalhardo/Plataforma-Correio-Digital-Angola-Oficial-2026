// ============================================================================
// SondagemModal — popup «Criar Sondagem» (v37, PROMPT_SONDAGEM_v37 §1)
// Padrão único de popups do app: CdaModal (commit 82cf4fb).
// v37: o botão «Criar Sondagem» insere a sondagem como rascunho/bloco na área
// de conteúdo da mensagem em composição (onCriarBloco). Sem onCriarBloco
// mantém-se o comportamento v36.1 (criar + difundir imediatamente).
// ============================================================================
import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Plus, Trash2, AlertTriangle, BrainCircuit, Loader2, Sparkles } from 'lucide-react';
import { CdaModal } from '../ui/CdaModal';
import {
  audienciaV37, criarSondagem, criarRascunhoSondagem, gerarInqueritoIA, sondagensDisponiveis,
  type AbrangenciaSondagem, type OpcaoSondagem, type Sondagem,
} from '../../services/sondagemService';

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
  /** 2026-09-09: 'ia' = Inquérito IA (temas + informações → IA sugere pergunta/opções). */
  modo?: 'normal' | 'ia';
}

export function SondagemModal({ aberto, onFechar, codigoInstituicao, nomeInstituicao, criadaPor, addAuditLog, onCriarBloco, modo = 'normal' }: Props) {
  const modoIA = modo === 'ia';
  const [pergunta, setPergunta] = useState('');
  const [opcoes, setOpcoes] = useState<OpcaoSondagem[]>([novaOpcao(0), novaOpcao(1)]);
  const [permitirVarias, setPermitirVarias] = useState(false);
  const [enviando, setEnviando] = useState(false);
  // Inquérito IA
  const [temasIA, setTemasIA] = useState('');
  const [informacoesIA, setInformacoesIA] = useState('');
  const [gerandoIA, setGerandoIA] = useState(false);
  const [geradoIA, setGeradoIA] = useState(false);
  const [disponivel, setDisponivel] = useState<boolean | null>(null);
  const [ambito, setAmbito] = useState<{ classificacao: AbrangenciaSondagem; n: number; semProvincia?: number } | null>(null);
  const [alerta, setAlerta] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    setPergunta(''); setOpcoes([novaOpcao(0), novaOpcao(1)]);
    setPermitirVarias(false); setEnviando(false); setAlerta(null); setAmbito(null);
    setTemasIA(''); setInformacoesIA(''); setGerandoIA(false); setGeradoIA(false);
    (async () => {
      const ok = await sondagensDisponiveis();
      setDisponivel(ok);
      if (ok) {
        const aud = await audienciaV37(codigoInstituicao, nomeInstituicao);
        if (aud.ok && aud.dados) {
          setAmbito({ classificacao: aud.dados.classificacao, n: aud.dados.bis.length, semProvincia: aud.dados.semProvincia });
        } else if (aud.motivo === 'validacao') {
          setAlerta(aud.mensagem || 'Classificação da instituição necessária.');
        }
      }
    })();
  }, [aberto, codigoInstituicao, nomeInstituicao]);

  const validas = useMemo(() => {
    const textos = opcoes.map(o => o.texto.trim()).filter(Boolean);
    return textos;
  }, [opcoes]);

  const gerarComIA = async () => {
    const faltas: string[] = [];
    if (!temasIA.trim()) faltas.push('os Temas que pretende investigar');
    if (!informacoesIA.trim()) faltas.push('as Informações que precisam ser recolhidas');
    if (faltas.length) { setAlerta(`Para a IA criar o inquérito está a faltar preencher: ${faltas.join(' e ')}.`); return; }
    setGerandoIA(true);
    const r = await gerarInqueritoIA({ temas: temasIA.trim(), informacoes: informacoesIA.trim(), instituicao: nomeInstituicao });
    setGerandoIA(false);
    if (!r.ok || !r.dados) { setAlerta(r.mensagem || 'Não foi possível gerar o inquérito com IA.'); return; }
    setPergunta(r.dados.pergunta);
    setOpcoes(r.dados.opcoes.map((texto, i) => ({ id: LETRAS[i] || String(i), texto })));
    setPermitirVarias(r.dados.permitirVarias);
    setGeradoIA(true);
    addAuditLog(`Inquérito IA gerado para revisão (temas: «${temasIA.trim().slice(0, 60)}»).`, 'info');
  };

  const enviar = async () => {
    if (modoIA && (!pergunta.trim() || validas.length < 2)) {
      setAlerta('Preencha os temas e as informações e clique em «Gerar com IA» antes de criar a sondagem.'); return;
    }
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
        icone={modoIA ? BrainCircuit : BarChart3}
        titulo={modoIA ? 'Criar Sondagem com IA' : 'Criar Sondagem'}
        subtitulo={modoIA ? 'A Inteligência Artificial ajuda a criar o inquérito' : 'Difusão oficial pelo Correio Digital Angola — modelo WhatsApp'}
        maxW="max-w-2xl"
      >
        <div className="space-y-5 text-left">
          {/* Inquérito IA — o que investigar e o que recolher */}
          {modoIA && (
            <div className="space-y-4">
              <div>
                <label className="block font-sans font-black text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Temas que pretende investigar</label>
                <textarea
                  value={temasIA}
                  maxLength={1500}
                  rows={3}
                  onChange={(e) => setTemasIA(e.target.value)}
                  placeholder="Ex.: satisfação com o atendimento presencial; tempo de espera nos balcões; utilização dos serviços digitais"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40 focus:border-[#2563eb]"
                  id="inquerito-ia-temas"
                />
              </div>
              <div>
                <label className="block font-sans font-black text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Informações que precisam ser recolhidas</label>
                <textarea
                  value={informacoesIA}
                  maxLength={1500}
                  rows={3}
                  onChange={(e) => setInformacoesIA(e.target.value)}
                  placeholder="Ex.: grau de satisfação; principal motivo de insatisfação; canal preferido para ser atendido"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40 focus:border-[#2563eb]"
                  id="inquerito-ia-informacoes"
                />
              </div>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="m-0 text-[11px] font-semibold text-slate-500">
                  {geradoIA ? 'Inquérito gerado pela IA. Clique em «Criar Sondagem» para o inserir na mensagem.' : 'A IA transforma estes dados numa pergunta com opções de resposta.'}
                </p>
                <button
                  type="button"
                  onClick={gerarComIA}
                  disabled={gerandoIA || enviando}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563eb] hover:bg-blue-700 disabled:opacity-60 text-white text-[11px] font-black uppercase tracking-widest border-0 cursor-pointer shadow"
                  id="btn-gerar-inquerito-ia"
                >
                  {gerandoIA ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {gerandoIA ? 'A gerar…' : geradoIA ? 'Gerar novamente' : 'Gerar com IA'}
                </button>
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
              disabled={enviando || gerandoIA}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#2563eb] hover:bg-blue-700 disabled:opacity-60 text-white text-[11px] font-black uppercase tracking-widest border-0 cursor-pointer shadow"
            >
              <Plus size={14} /> {enviando ? 'A criar…' : 'Criar Sondagem'}
            </button>
          </div>
        </div>
      </CdaModal>

      {/* Popup de validação / avisos (spec §1.3 / §3.5) */}
      <CdaModal
        aberto={!!alerta}
        onFechar={() => setAlerta(null)}
        icone={AlertTriangle}
        titulo={modoIA ? 'Sondagem com IA' : 'Sondagem'}
        tomIcone="bg-amber-50 text-amber-600 border-amber-100"
        maxW="max-w-md"
      >
        <p className="text-sm font-semibold text-slate-700 text-left">{alerta}</p>
      </CdaModal>
    </>
  );
}
