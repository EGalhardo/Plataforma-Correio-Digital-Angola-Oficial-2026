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
