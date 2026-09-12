/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================================
// 2026-09-12 (T53) — CRONOGRAMA DE ACOMPANHAMENTO DA DENÚNCIA
// Aparece no Detalhe da Correspondência (linha do «Ver detalhes Completos»,
// lado direito) apenas em correspondências «[DENÚNCIA]».
//   · Cidadão (remetente): leitura — vê a fase que a instituição activou.
//   · Instituição (destinatária): os pontos são clicáveis; ao clicar abre um
//     popup «Activar a fase …?» → Ok activa (só a fase seguinte; sem recuo).
//   · A activação é validada no servidor e notifica o cidadão.
// ============================================================================

import React, { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Lock } from 'lucide-react';
import { CdaModal } from '../ui/CdaModal';
import { ListChecks } from 'lucide-react';
import {
  FASES_DENUNCIA,
  definicaoFase,
  proximaFase,
  type DefinicaoFase,
  type FaseDenuncia,
} from '../../services/denunciaCore';
import { activarFaseDenuncia, lerCronogramaDenuncia, type EventoFaseDenuncia } from '../../services/denunciaService';

interface Props {
  messageId: number;
  /** true = sessão da instituição destinatária (pode activar fases). */
  podeGerir: boolean;
  /** Regista na auditoria local da mensagem / global. */
  onRegistar?: (texto: string) => void;
  /** Avisos ao utilizador (erros de regra/permissão). */
  onAviso?: (texto: string, tipo: 'success' | 'error' | 'info') => void;
}

export function CronogramaDenuncia({ messageId, podeGerir, onRegistar, onAviso }: Props) {
  const [actual, setActual] = useState<DefinicaoFase>(FASES_DENUNCIA[0]);
  const [eventos, setEventos] = useState<EventoFaseDenuncia[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [pedida, setPedida] = useState<DefinicaoFase | null>(null);
  const [aActivar, setAActivar] = useState(false);
  const [erroPopup, setErroPopup] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    const r = await lerCronogramaDenuncia(messageId);
    setActual(r.actual);
    setEventos(r.eventos);
    setACarregar(false);
  }, [messageId]);

  useEffect(() => {
    let vivo = true;
    setACarregar(true);
    lerCronogramaDenuncia(messageId).then((r) => {
      if (!vivo) return;
      setActual(r.actual); setEventos(r.eventos); setACarregar(false);
    }).catch(() => { if (vivo) setACarregar(false); });
    return () => { vivo = false; };
  }, [messageId]);

  const seguinte = proximaFase(actual.id);
  // Telemóvel (<640px): cronograma vertical; a partir de «sm» fica horizontal.
  const [vertical, setVertical] = useState<boolean>(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 639px)');
    const aoMudar = (e: MediaQueryListEvent) => setVertical(e.matches);
    mq.addEventListener('change', aoMudar);
    return () => mq.removeEventListener('change', aoMudar);
  }, []);

  const aoClicarPonto = (fase: DefinicaoFase) => {
    if (!podeGerir) return;
    if (fase.ordem <= actual.ordem) {
      onAviso?.(`A fase «${fase.rotulo}» já está activa. Só é possível avançar para a fase seguinte.`, 'info');
      return;
    }
    if (!seguinte || fase.id !== seguinte.id) {
      onAviso?.(seguinte ? `Active primeiro a fase «${seguinte.rotulo}».` : 'A denúncia já está encerrada.', 'info');
      return;
    }
    setErroPopup(null);
    setPedida(fase);
  };

  const confirmar = async () => {
    if (!pedida || aActivar) return;
    setAActivar(true);
    const r = await activarFaseDenuncia(messageId, pedida.id as FaseDenuncia);
    setAActivar(false);
    if (r.ok === true) {
      setPedida(null);
      onRegistar?.(`Fase da denúncia «${r.rotulo}» activada${r.notificado ? ' — cidadão notificado' : ''}.`);
      onAviso?.(`Fase «${r.rotulo}» activada${r.notificado ? '. O cidadão foi notificado.' : '.'}`, 'success');
      await recarregar();
    } else {
      setErroPopup(r.erro);
    }
  };

  const dataDe = (fase: FaseDenuncia) => eventos.find((e) => e.fase === fase);

  return (
    <div
      className="flex flex-col items-stretch lg:items-end gap-2 w-full lg:w-auto sm:min-w-[340px]"
      data-testid="cronograma-denuncia"
      data-fase-actual={actual.id}
    >
      <div className="flex items-center gap-2 lg:justify-end">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Acompanhamento da denúncia</span>
        {aCarregar && <Loader2 size={11} className="animate-spin text-slate-400" />}
        {!podeGerir && (
          <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md" title="Só a instituição destinatária actualiza as fases">
            só leitura
          </span>
        )}
      </div>

      {/* Desktop/tablet (≥640px): horizontal. Telemóvel: lista vertical. */}
      <ol className={`w-full lg:w-auto m-0 p-0 list-none ${vertical ? 'flex flex-col gap-0' : 'flex items-start'}`} data-orientacao={vertical ? 'vertical' : 'horizontal'}>
        {FASES_DENUNCIA.map((fase, i) => {
          const concluida = fase.ordem < actual.ordem;
          const activa = fase.id === actual.id;
          const ehSeguinte = !!seguinte && fase.id === seguinte.id;
          const clicavel = podeGerir && ehSeguinte;
          const ev = dataDe(fase.id);
          const ultima = i === FASES_DENUNCIA.length - 1;
          const corPonto = activa
            ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/30'
            : concluida
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : clicavel
                ? 'bg-white border-blue-400 text-blue-600 border-dashed hover:bg-blue-50'
                : 'bg-white border-slate-300 text-slate-400';
          const corLinha = fase.ordem < actual.ordem ? 'bg-emerald-400' : 'bg-slate-200';
          const corRotulo = activa ? 'text-blue-700' : concluida ? 'text-emerald-700' : 'text-slate-400';
          const textoData = ev ? `${ev.data}${ev.hora ? ` ${ev.hora}` : ''}` : fase.ordem > actual.ordem ? 'a aguardar' : '';
          const ponto = (
            <button
              type="button"
              onClick={() => aoClicarPonto(fase)}
              disabled={!podeGerir}
              aria-label={`${fase.rotulo}${activa ? ' (fase actual)' : concluida ? ' (concluída)' : ' (a aguardar)'}`}
              aria-current={activa ? 'step' : undefined}
              data-testid={`fase-${fase.id}`}
              data-estado={activa ? 'activa' : concluida ? 'concluida' : 'aguardar'}
              title={podeGerir ? (clicavel ? `Activar «${fase.rotulo}»` : activa ? 'Fase actual' : concluida ? 'Concluída' : 'A aguardar') : fase.rotulo}
              style={{ width: 32, height: 32, minWidth: 32, minHeight: 32, padding: 0 }}
              className={`rounded-full border-2 flex items-center justify-center text-[10px] font-black transition-all shrink-0 box-border ${corPonto} ${
                clicavel ? 'cursor-pointer active:scale-95' : 'cursor-default'
              } disabled:opacity-100`}
            >
              {concluida ? <Check size={13} strokeWidth={3} /> : activa ? <span className="w-2.5 h-2.5 rounded-full bg-white block shrink-0" aria-hidden="true" /> : clicavel ? i + 1 : <Lock size={11} className="opacity-60" />}
            </button>
          );
          if (vertical) {
            return (
              <li key={fase.id} className="flex items-stretch gap-3">
                <div className="flex flex-col items-center">
                  {ponto}
                  {!ultima && <div className={`w-0.5 flex-1 min-h-[18px] my-1 rounded ${corLinha}`} />}
                </div>
                <div className={`flex items-baseline justify-between gap-3 flex-1 min-w-0 ${ultima ? 'pb-0' : 'pb-3'} pt-1.5`}>
                  <span className={`text-[10px] font-extrabold uppercase tracking-wide leading-tight ${corRotulo}`}>{fase.rotulo}</span>
                  <span className="text-[9px] font-mono text-slate-400 leading-none shrink-0">{textoData}</span>
                </div>
              </li>
            );
          }
          return (
            <li key={fase.id} className="flex items-start flex-1 lg:flex-none min-w-0">
              <div className="flex flex-col items-center min-w-[52px] md:min-w-[64px]">
                {ponto}
                <span className={`mt-1.5 text-[8px] md:text-[9px] font-extrabold uppercase tracking-wide text-center leading-tight ${corRotulo}`}>
                  {fase.rotulo}
                </span>
                <span className="text-[8px] font-mono text-slate-400 leading-none mt-0.5 h-3">{textoData}</span>
              </div>
              {!ultima && <div className={`h-0.5 flex-1 lg:w-6 lg:flex-none mt-3.5 md:mt-4 rounded ${corLinha}`} />}
            </li>
          );
        })}
      </ol>

      {pedida && (
        <CdaModal
          aberto
          onFechar={() => { if (!aActivar) setPedida(null); }}
          icone={ListChecks}
          titulo={`Activar a fase «${pedida.rotulo}»`}
          subtitulo="Cronograma da denúncia"
          maxW="max-w-md"
          padding="p-6"
          tomIcone="bg-blue-50 text-blue-600 border-blue-100/60"
        >
          <div className="text-left space-y-4" data-testid="popup-activar-fase">
            <p className="text-base font-semibold text-slate-800 leading-relaxed m-0">
              Pretende activar este ponto do cronograma?
            </p>
            <p className="text-sm text-slate-600 leading-relaxed m-0">{pedida.descricao}</p>
            <p className="text-xs text-slate-500 font-medium m-0 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
              O avanço é definitivo (não é possível recuar) e o cidadão será notificado. A identidade do cidadão permanece protegida.
            </p>
            {erroPopup && (
              <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 m-0" role="alert">{erroPopup}</p>
            )}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setPedida(null)}
                disabled={aActivar}
                className="w-full px-5 py-3 rounded-xl font-bold text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer border-none disabled:opacity-50"
                id="btn-fase-fechar"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={confirmar}
                disabled={aActivar}
                className="w-full px-5 py-3 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-colors cursor-pointer border-none flex items-center justify-center gap-2 disabled:opacity-60"
                id="btn-fase-ok"
              >
                {aActivar ? <Loader2 size={14} className="animate-spin" /> : null}
                {aActivar ? 'A activar…' : 'Ok'}
              </button>
            </div>
          </div>
        </CdaModal>
      )}
    </div>
  );
}

export const rotuloFaseDenuncia = (id: FaseDenuncia) => definicaoFase(id)?.rotulo || id;
