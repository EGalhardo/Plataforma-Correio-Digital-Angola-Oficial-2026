/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Propriedade (dono) das notificações — correspondência por FAMÍLIA de chaves.
 *
 * 2026-11-15 (defeito reportado pelo dono): «Quando o utilizador preenche o
 * inquérito e envia para a instituição apenas aparece uma notificação. Torne
 * possível clicar nas notificações.»
 *
 * Causa apurada em produção: a notificação de «Resposta ao Inquérito» é gravada
 * com `target_bi = 'AGT-LMM'` (o código SIGLA que a mensagem traz em
 * `sender_bi`), enquanto a sessão da instituição usa a chave canónica
 * `AGT-LMM-01`. `currentNotifications` filtrava por igualdade exacta
 * (`n.ownerId === sessionOwnerKey`), pelo que a notificação existia na nuvem mas
 * era DESCARTADA antes de chegar ao ecrã — a instituição nunca a via, logo nunca
 * podia clicar nela.
 *
 * A leitura da nuvem (`supabaseService.getNotifications`) já resolvia o mesmo
 * problema alargando o alvo à família {chave completa, BI limpo, pai, sigla,
 * 'TODOS'}. Aqui aplica-se a MESMA regra do lado da apresentação, para que
 * qualquer variante gravada por versões antigas continue a chegar ao dono certo
 * — sem nunca alargar a estranhos (as variantes derivam sempre da própria chave).
 */

/** Normaliza uma chave de titular (BI ou código de instituição/agente). */
export const normalizarChaveDono = (chave?: string): string =>
  String(chave || '').trim().toUpperCase().replace(/\s+/g, '');

/**
 * Família de chaves que identificam o MESMO titular.
 * Ex.: 'AGT-LMM-01' → ['AGT-LMM-01', 'AGT-LMM', 'AGT'].
 * BI de cidadão (9 dígitos + 2 letras + 3 dígitos) não tem pai nem sigla.
 */
export function chavesDaFamilia(chave?: string): string[] {
  const base = normalizarChaveDono(chave);
  if (!base) return [];
  const ehBiCidadao = /^\d{9}[A-Z]{2}\d{3}$/.test(base);
  if (ehBiCidadao) return [base];
  const partes = base.split('-');
  const sigla = partes[0];
  const pai = partes.length > 2 ? partes.slice(0, -1).join('-') : base;
  return Array.from(new Set([base, pai, sigla].filter(Boolean)));
}

/**
 * A notificação pertence à sessão actual?
 * - `TODOS` (difusão nacional) pertence a todos os cidadãos;
 * - caso contrário, qualquer variante da família da sessão serve.
 */
export function notificacaoPertenceAoDono(ownerId: string | undefined, sessionKey: string, ehCidadao = false): boolean {
  const dono = normalizarChaveDono(ownerId);
  const sessao = normalizarChaveDono(sessionKey);
  if (!dono) return true; // notificações locais antigas sem dono
  if (!sessao) return false;
  if (dono === sessao) return true;
  if (ehCidadao && dono === 'TODOS') return true;
  const familia = new Set(chavesDaFamilia(sessao));
  return familia.has(dono);
}
