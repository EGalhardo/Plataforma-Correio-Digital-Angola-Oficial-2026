// ============================================================================
// 2026-09-11 — Data de Expiração da correspondência (compositor «Nova Mensagem»)
// PURO: sem rede, sem React. O selector guarda a data no formato nativo do
// <input type="date"> (YYYY-MM-DD, calendário local). Daqui derivam:
//   • o rótulo humano  (DD/MM/YYYY)  → messages.deadline_text / details.deadline
//   • o carimbo ISO    (fim do dia)  → messages.deadline_at (timestamptz)
// ============================================================================

export const PADRAO_DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

const doisDigitos = (n: number) => String(n).padStart(2, '0');

/** Data de hoje (fuso local) em YYYY-MM-DD — usada como `min` do selector. */
export function hojeISO(agora: Date = new Date()): string {
  return `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`;
}

/** Converte YYYY-MM-DD num Date LOCAL (meia-noite). `null` se inválida. */
export function dataISOParaLocal(iso: string | undefined | null): Date | null {
  const v = (iso || '').trim();
  if (!PADRAO_DATA_ISO.test(v)) return null;
  const [a, m, d] = v.split('-').map(Number);
  const dt = new Date(a, m - 1, d);
  // rejeita datas "arredondadas" pelo Date (ex.: 2026-02-31 → 3 de Março)
  if (dt.getFullYear() !== a || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
}

/** YYYY-MM-DD → DD/MM/YYYY (rótulo apresentado em «EXPIRA:» e no detalhe). */
export function formatarDataExpiracao(iso: string | undefined | null): string {
  const dt = dataISOParaLocal(iso);
  if (!dt) return '';
  return `${doisDigitos(dt.getDate())}/${doisDigitos(dt.getMonth() + 1)}/${dt.getFullYear()}`;
}

/** YYYY-MM-DD → ISO 8601 do FIM desse dia (23:59:59.999 local) para `deadline_at`. */
export function dataExpiracaoParaISO(iso: string | undefined | null): string | null {
  const dt = dataISOParaLocal(iso);
  if (!dt) return null;
  dt.setHours(23, 59, 59, 999);
  return dt.toISOString();
}

/**
 * Valida a data escolhida. Vazia = sem prazo (válido). Inválida ou anterior a
 * hoje = erro (bloqueia o envio — uma correspondência não pode nascer expirada).
 */
export function validarDataExpiracao(
  iso: string | undefined | null,
  agora: Date = new Date(),
): { ok: boolean; erro: string } {
  const v = (iso || '').trim();
  if (!v) return { ok: true, erro: '' };
  const dt = dataISOParaLocal(v);
  if (!dt) return { ok: false, erro: 'A data de expiração é inválida.' };
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  if (dt.getTime() < hoje.getTime()) {
    return { ok: false, erro: 'A data de expiração não pode ser anterior a hoje.' };
  }
  return { ok: true, erro: '' };
}

// ----------------------------------------------------------------------------
// 2026-09-11 (T45) — Estado da expiração para o Detalhe da Correspondência.
// Fonte primária: `deadlineAt` (ISO, messages.deadline_at). Fallback: o rótulo
// humano `details.deadline` quando está em DD/MM/YYYY (mensagens locais /
// antigas). «Sem prazo», vazio ou texto livre ⇒ não definida.
// ----------------------------------------------------------------------------
export interface EstadoExpiracao {
  /** true quando existe uma data de expiração concreta. */
  definida: boolean;
  /** Rótulo humano (DD/MM/YYYY) ou «Sem prazo». */
  rotulo: string;
  /** true quando a data já passou (fim do dia). */
  expirada: boolean;
  /** Dias inteiros até à expiração (0 = expira hoje); null se não definida. */
  diasRestantes: number | null;
  /** Texto curto de apoio: «Expira hoje», «Faltam 3 dias», «Expirada há 2 dias». */
  descricao: string;
}

const PADRAO_DD_MM_AAAA = /^(\d{2})\/(\d{2})\/(\d{4})$/;

export function estadoExpiracao(
  deadlineAt: string | null | undefined,
  rotuloGuardado: string | null | undefined,
  agora: Date = new Date(),
): EstadoExpiracao {
  let fim: Date | null = null;
  if (deadlineAt) {
    const d = new Date(deadlineAt);
    if (!Number.isNaN(d.getTime())) fim = d;
  }
  if (!fim) {
    const m = PADRAO_DD_MM_AAAA.exec((rotuloGuardado || '').trim());
    if (m) {
      const local = dataISOParaLocal(`${m[3]}-${m[2]}-${m[1]}`);
      if (local) { local.setHours(23, 59, 59, 999); fim = local; }
    }
  }
  if (!fim) {
    const r = (rotuloGuardado || '').trim();
    return { definida: false, rotulo: r && !/^sem prazo$/i.test(r) ? r : 'Sem prazo', expirada: false, diasRestantes: null, descricao: '' };
  }
  const rotulo = `${doisDigitos(fim.getDate())}/${doisDigitos(fim.getMonth() + 1)}/${fim.getFullYear()}`;
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const diaFim = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate());
  const dias = Math.round((diaFim.getTime() - hoje.getTime()) / 86_400_000);
  const expirada = dias < 0;
  const descricao = expirada
    ? (dias === -1 ? 'Expirada ontem' : `Expirada há ${-dias} dias`)
    : dias === 0 ? 'Expira hoje' : dias === 1 ? 'Expira amanhã' : `Faltam ${dias} dias`;
  return { definida: true, rotulo, expirada, diasRestantes: dias, descricao };
}
