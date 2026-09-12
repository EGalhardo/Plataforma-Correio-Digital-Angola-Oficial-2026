/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================================
// 2026-09-12 (T53) — DENÚNCIAS: núcleo puro partilhado (cliente + servidor).
//
// Uma «denúncia» é uma correspondência normal do cidadão cujo assunto começa
// por «[DENÚNCIA]» (escolhido no popup «Enviar Mensagem»). Não há tabela nova:
//   · a FASE actual vive em message_state_history com state = "DENUNCIA:<fase>"
//     (uma linha por activação; a mais avançada é a fase corrente);
//   · só o RESPONSÁVEL da plataforma da instituição destinatária (agente «-01»)
//     pode avançar a fase, sempre para a frente e sem saltos;
//   · o cidadão vê o cronograma em modo leitura e recebe notificação a cada
//     activação;
//   · para a instituição o remetente aparece como «Anónimo».
//
// Sem dependências de React/Node — copiado literalmente para api/index.ts.
// ============================================================================

export const PREFIXO_DENUNCIA = '[DENÚNCIA]';
export const PREFIXO_ESTADO_DENUNCIA = 'DENUNCIA:';

export type FaseDenuncia = 'registada' | 'recebida' | 'em_analise' | 'respondida' | 'encerrada';

export interface DefinicaoFase {
  id: FaseDenuncia;
  ordem: number;
  rotulo: string;
  /** Texto do popup de confirmação (instituição). */
  descricao: string;
  /** Mensagem da notificação enviada ao cidadão. */
  notificacao: string;
}

export const FASES_DENUNCIA: readonly DefinicaoFase[] = [
  { id: 'registada', ordem: 0, rotulo: 'Registada', descricao: 'A denúncia foi registada na plataforma com protocolo oficial.', notificacao: 'A sua denúncia foi registada com protocolo oficial.' },
  { id: 'recebida', ordem: 1, rotulo: 'Recebida', descricao: 'Confirma que a instituição recebeu e tomou conhecimento da denúncia.', notificacao: 'A sua denúncia foi recebida pela instituição.' },
  { id: 'em_analise', ordem: 2, rotulo: 'Em análise', descricao: 'Indica que a denúncia está a ser analisada pelos serviços competentes.', notificacao: 'A sua denúncia passou a «Em análise».' },
  { id: 'respondida', ordem: 3, rotulo: 'Respondida', descricao: 'Indica que a instituição já deu resposta à denúncia.', notificacao: 'A instituição respondeu à sua denúncia.' },
  { id: 'encerrada', ordem: 4, rotulo: 'Encerrada', descricao: 'Encerra o processo da denúncia. Esta é a última fase.', notificacao: 'O processo da sua denúncia foi encerrado.' },
] as const;

const NORMALIZAR = (s: string) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

/** Uma correspondência é denúncia quando o assunto começa por «[DENÚNCIA]»
 *  (tolerante a acentos/maiúsculas: «[denuncia]» também conta). */
export function ehAssuntoDenuncia(assunto: string | null | undefined): boolean {
  return NORMALIZAR(assunto || '').startsWith('[DENUNCIA]');
}

export function definicaoFase(id: string | null | undefined): DefinicaoFase | null {
  return FASES_DENUNCIA.find((f) => f.id === id) || null;
}

/** Converte um `state` de message_state_history na fase, ou null se não for
 *  um evento de denúncia. */
export function faseDeEstado(state: string | null | undefined): FaseDenuncia | null {
  const s = String(state || '');
  if (!s.startsWith(PREFIXO_ESTADO_DENUNCIA)) return null;
  const id = s.slice(PREFIXO_ESTADO_DENUNCIA.length).trim().toLowerCase();
  return definicaoFase(id) ? (id as FaseDenuncia) : null;
}

export function estadoDeFase(fase: FaseDenuncia): string {
  return `${PREFIXO_ESTADO_DENUNCIA}${fase}`;
}

/** Fase corrente a partir do histórico: a mais avançada registada; sem
 *  eventos, a denúncia está apenas «registada» (activada no envio). */
export function faseActual(estados: ReadonlyArray<string | null | undefined>): DefinicaoFase {
  let melhor = FASES_DENUNCIA[0];
  for (const st of estados) {
    const id = faseDeEstado(st);
    if (!id) continue;
    const def = definicaoFase(id)!;
    if (def.ordem > melhor.ordem) melhor = def;
  }
  return melhor;
}

/** Regra «só para a frente, sem saltos»: a única fase activável é a seguinte
 *  à actual. Devolve a definição ou null quando já está encerrada. */
export function proximaFase(actual: FaseDenuncia): DefinicaoFase | null {
  const def = definicaoFase(actual);
  if (!def) return null;
  return FASES_DENUNCIA.find((f) => f.ordem === def.ordem + 1) || null;
}

export function podeActivar(actual: FaseDenuncia, pretendida: FaseDenuncia): { ok: true } | { ok: false; motivo: string } {
  const prox = proximaFase(actual);
  if (!prox) return { ok: false, motivo: 'A denúncia já está encerrada.' };
  const alvo = definicaoFase(pretendida);
  if (!alvo) return { ok: false, motivo: 'Fase desconhecida.' };
  if (alvo.ordem <= definicaoFase(actual)!.ordem) return { ok: false, motivo: 'Não é possível recuar para uma fase anterior.' };
  if (alvo.id !== prox.id) return { ok: false, motivo: `Active primeiro a fase «${prox.rotulo}».` };
  return { ok: true };
}

/** O responsável da plataforma de uma instituição é o agente com sequência 01
 *  (ex.: INAPEM-LLMM-01). Colaboradores (-02, -03, …) não tratam denúncias. */
export function ehResponsavelDaPlataforma(agente: string | null | undefined): boolean {
  const a = String(agente || '').trim().toUpperCase();
  const partes = a.split('-');
  if (partes.length < 2) return false;
  return /^0*1$/.test(partes[partes.length - 1]);
}

/** Código da instituição sem o sufixo de agente (INAPEM-LLMM-01 → INAPEM-LLMM). */
export function codigoInstituicaoBase(codigo: string | null | undefined): string {
  const c = String(codigo || '').trim().toUpperCase();
  const partes = c.split('-');
  if (partes.length > 2 && /^\d+$/.test(partes[partes.length - 1])) return partes.slice(0, -1).join('-');
  return c;
}

/** Rótulo do remetente visto pela instituição numa denúncia. */
export const REMETENTE_ANONIMO = 'Cidadão: Anónimo';
