// ============================================================================
// Validação determinística pré-envio — Fase 1 / S6
// PURO: sem rede, sem env, sem supabase. Corre no compositor ANTES do envio.
// Bloqueios impedem o envio; avisos exigem confirmação explícita ("enviar
// mesmo assim"). O gate P0-B (instituição não registada) continua a existir
// à parte, à frente deste módulo, na App/MailContent.
// (Camada de IA opcional adiada — revisão de clareza fica para aprovação
// futura; o determinístico é gratuito, offline e previsível.)
// ============================================================================

export interface ResultadoValidacaoEnvio {
  bloqueios: string[];
  avisos: string[];
}

export const LIMITE_ANEXOS_AVISO = 5;
export const COMPRIMENTO_MIN_CORPO = 20;

export const PADRAO_DATA =
  /\b\d{1,2}\s*[\/\-.]\s*\d{1,2}\s*[\/\-.]\s*\d{2,4}\b|\b\d{1,2}\s+de\s+(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/i;

export const PADRAO_PRAZO = /\bprazo(s)?\b|prorrog|até ao dia|até à data|data limite|dentro de \d+\s*dias/i;

export function validarEnvio(d: {
  to: string;
  subject: string;
  body: string;
  attachments?: string[];
  /** v37.76 — expedição múltipla: lista de destinatários em chips. Quando
   *  presente, o campo «para» individual pode estar vazio. */
  toArray?: string[];
}): ResultadoValidacaoEnvio {
  const bloqueios: string[] = [];
  const avisos: string[] = [];

  const to = (d.to || '').trim();
  const toArray = (d.toArray || []).map((t) => (t || '').trim()).filter(Boolean);
  const body = (d.body || '').trim();
  const subject = (d.subject || '').trim();

  if (!to && toArray.length === 0) {
    bloqueios.push('Indica o destinatário da correspondência.');
  }
  if (body.length === 0) {
    bloqueios.push('Escreve o conteúdo da mensagem antes de enviar.');
  } else if (body.length < COMPRIMENTO_MIN_CORPO) {
    avisos.push(`A mensagem é muito curta (menos de ${COMPRIMENTO_MIN_CORPO} caracteres); confirma que não falta conteúdo.`);
  }

  if (body.length > 0 && !subject) {
    avisos.push('O assunto está vazio; vai ser usado o início da mensagem como assunto.');
  }

  const anexos = d.attachments || [];
  if (anexos.length > LIMITE_ANEXOS_AVISO) {
    avisos.push(`Levas ${anexos.length} anexos; confirma que são todos necessários e legíveis.`);
  }

  if (body.length > 0 && PADRAO_PRAZO.test(body) && !PADRAO_DATA.test(body)) {
    avisos.push('O texto fala de prazo mas não indica uma data concreta — o destinatário pode ficar sem orientação clara.');
  }

  return { bloqueios, avisos };
}
