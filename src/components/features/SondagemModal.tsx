// ============================================================================
// SondagemModal — popup «Criar Sondagem» (v37, PROMPT_SONDAGEM_v37 §1)
// Padrão único de popups do app: CdaModal (commit 82cf4fb).
// v37: o botão «Criar Sondagem» insere a sondagem como rascunho/bloco na área
// de conteúdo da mensagem em composição (onCriarBloco). Sem onCriarBloco
// mantém-se o comportamento v36.1 (criar + difundir imediatamente).
// ============================================================================
import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { CdaModal } from '../ui/CdaModal';
import {
  audienciaV37, criarSondagem, criarRascunhoSondagem, sondagensDisponiveis,
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
}

export function SondagemModal({ aberto, onFechar, codigoInstituicao, nomeInstituicao, criadaPor, addAuditLog, onCriarBloco }: Props) {
  const [pergunta, setPergunta] = useState('');
  const [opcoes, setOpcoes] = useState<OpcaoSondagem[]>([novaOpcao(0), novaOpcao(1)]);
  const [permitirVarias, setPermitirVarias] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [disponivel, setDisponivel] = useState<boolean | null>(null);
  const [ambito, setAmbito] = useState<{ classificacao: AbrangenciaSondagem; n: number; semProvincia?: number } | null>(null);
  const [alerta, setAlerta] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    setPergunta(''); setOpcoes([novaOpcao(0), novaOpcao(1)]);
    setPermitirVarias(false); setEnviando(false); setAlerta(null); setAmbito(null);
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

  const enviar = async () => {
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
        icone={BarChart3}
        titulo="Criar Sondagem"
        subtitulo="Difusão oficial pelo Correio Digital Angola — modelo WhatsApp"
        maxW="max-w-2xl"
      >
        <div className="space-y-5 text-left">
          {/* Pergunta */}
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
              disabled={enviando}
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
        titulo="Sondagem"
        tomIcone="bg-amber-50 text-amber-600 border-amber-100"
        maxW="max-w-md"
      >
        <p className="text-sm font-semibold text-slate-700 text-left">{alerta}</p>
      </CdaModal>
    </>
  );
}
