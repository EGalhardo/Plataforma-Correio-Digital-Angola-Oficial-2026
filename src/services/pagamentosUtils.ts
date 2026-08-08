/**
 * Pagamentos — helpers PUROS (2026-08-08)
 * ----------------------------------------------------------------------------
 * Sem rede, sem Supabase, sem import.meta — importável em qualquer runtime
 * (Vite, Vercel, node/tsx para testes). A camada com Supabase fica em
 * pagamentosService.ts, que re-exporta tudo daqui.
 */

/** Os 4 canais típicos de Angola, apresentados sempre como «previstos». */
export const METODOS_PAGAMENTO = [
  { id: 'multicaixa_express', rotulo: 'Multicaixa Express' },
  { id: 'referencia_atm', rotulo: 'Referência Multicaixa (ATM)' },
  { id: 'tpa', rotulo: 'TPA / POS' },
  { id: 'transferencia', rotulo: 'Transferência Bancária' },
] as const;
export type MetodoPagamento = (typeof METODOS_PAGAMENTO)[number]['id'];

export const FRASE_GATEWAY_PENDENTE =
  'Pagamento online ainda indisponível: a integração com o gateway (Multicaixa/bancos) será ativada depois da validação do projeto pelo INAPEM. Até lá, o pagamento faz-se pelos canais oficiais da instituição emissora.';

export const MIN_DESCRICAO = 8;
export const MAX_DESCRICAO = 300;
export const MAX_VALOR_AOA = 99_999_999.99;
export const MIN_BI = 5;

export const formatarKz = (valor: number): string =>
  `Kz ${valor.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Aceita «12 500», «12500,50», «Kz 12.500,50»; devolve null se inválido. */
export const normalizarValorAoa = (entrada: string): number | null => {
  const t = entrada
    .trim()
    .replace(/^kz\s*/i, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const v = Number(t);
  return v > 0 && v <= MAX_VALOR_AOA ? v : null;
};

export const limparBi = (bi: string): string => bi.trim().toUpperCase();

/** Referência do documento bate com o assunto da mensagem (nas duas direções). */
export const documentoRefCombina = (documentoRef: string | undefined, assunto: string): boolean => {
  const a = (documentoRef || '').trim().toLowerCase();
  const b = assunto.trim().toLowerCase();
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
};

/** Erros explicados (padrão RLS-aware da Base de Conhecimento). */
export const explicarErroPagamentos = (mensagem: string): string => {
  if (/row-level security/i.test(mensagem)) {
    return 'Sem permissão para esta operação de pagamentos. Confirme que está com a sessão da instituição (ou do cidadão) correta e que a migração v26 foi aplicada.';
  }
  if (/violates check constraint|check constraint/i.test(mensagem)) {
    return 'Dados fora dos limites (descrição 8–300 caracteres; valor > 0; métodos conhecidos).';
  }
  if (/Could not find the table|PGRST205/i.test(mensagem)) {
    return 'A tabela de pagamentos ainda não existe na base de dados — aplique a migração v26 no SQL Editor do Supabase.';
  }
  return mensagem;
};
