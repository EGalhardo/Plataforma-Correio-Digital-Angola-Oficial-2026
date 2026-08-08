/**
 * Pagamentos — camada de SERVIÇO com Supabase (frontend-only, 2026-08-08 —
 * decisão do dono)
 * ----------------------------------------------------------------------------
 * A integração com o gateway de pagamentos (EMIS/Multicaixa/bancos) NÃO existe
 * ainda e NÃO é simulada: fica para depois da validação do projecto pelo
 * INAPEM. O que esta camada faz é o registo honesto das cobranças na tabela
 * public.pagamentos (v26) — a instituição emite, o cidadão consulta, e o botão
 * de pagamento EXPLICA o estado em vez de fingir que processa.
 *
 * Helpers puros e constantes vivem em ./pagamentosUtils (importável sem rede)
 * e são re-exportados aqui para os componentes terem um ponto único.
 */
import { supabase } from '../lib/supabaseClient';
import {
  METODOS_PAGAMENTO, MetodoPagamento, explicarErroPagamentos, limparBi,
} from './pagamentosUtils';

export {
  FRASE_GATEWAY_PENDENTE, MAX_DESCRICAO, MAX_VALOR_AOA, METODOS_PAGAMENTO, MIN_BI,
  MIN_DESCRICAO, documentoRefCombina, explicarErroPagamentos, formatarKz, limparBi,
  normalizarValorAoa,
} from './pagamentosUtils';
export type { MetodoPagamento } from './pagamentosUtils';

export const TABELA_PAGAMENTOS = 'pagamentos';

export type EstadoPagamento = 'pendente' | 'cancelado';

export interface Pagamento {
  id: string;
  instituicao_sigla: string;
  destinatario_bi: string;
  descricao: string;
  valor: number;
  metodos: MetodoPagamento[];
  referencia?: string;
  documento_ref?: string;
  prazo?: string;
  estado: EstadoPagamento;
  created_at: string;
  updated_at: string;
}

interface LinhaPagamento {
  id: string;
  instituicao_sigla: string;
  destinatario_bi: string;
  descricao: string;
  valor: number | string;
  metodos: string[] | null;
  referencia: string | null;
  documento_ref: string | null;
  prazo: string | null;
  estado: string;
  created_at: string;
  updated_at: string;
}

export interface NovoPagamento {
  destinatario_bi: string;
  descricao: string;
  valor: number;
  metodos: MetodoPagamento[];
  referencia?: string;
  documento_ref?: string;
  prazo?: string;
}

// ---------------------------------------------------------------------------
// Mapeamento defensivo da linha
// ---------------------------------------------------------------------------
const linhaParaPagamento = (l: LinhaPagamento): Pagamento | null => {
  if (!l || typeof l !== 'object') return null;
  const estado: EstadoPagamento = l.estado === 'cancelado' ? 'cancelado' : 'pendente';
  const valor = Number(l.valor);
  if (!Number.isFinite(valor) || valor <= 0) return null;
  const metodosConhecidos = (Array.isArray(l.metodos) ? l.metodos : [])
    .filter((m): m is MetodoPagamento => METODOS_PAGAMENTO.some(mm => mm.id === m));
  return {
    id: String(l.id),
    instituicao_sigla: String(l.instituicao_sigla || ''),
    destinatario_bi: String(l.destinatario_bi || ''),
    descricao: String(l.descricao || ''),
    valor,
    metodos: metodosConhecidos.length > 0 ? metodosConhecidos : METODOS_PAGAMENTO.map(m => m.id),
    referencia: l.referencia || undefined,
    documento_ref: l.documento_ref || undefined,
    prazo: l.prazo || undefined,
    estado,
    created_at: String(l.created_at || ''),
    updated_at: String(l.updated_at || ''),
  };
};

// ---------------------------------------------------------------------------
// CRUD (RLS decide quem vê/escreve — v26)
// ---------------------------------------------------------------------------

export const carregarPagamentosDoCidadao = async (
  bi: string,
): Promise<{ pagamentos: Pagamento[]; erro: string }> => {
  if (!bi.trim()) return { pagamentos: [], erro: 'BI do cidadão em falta.' };
  const { data, error } = await supabase
    .from(TABELA_PAGAMENTOS)
    .select('*')
    .eq('destinatario_bi', limparBi(bi))
    .order('created_at', { ascending: false });
  if (error) return { pagamentos: [], erro: explicarErroPagamentos(error.message) };
  const linhas = (Array.isArray(data) ? data : []) as LinhaPagamento[];
  return { pagamentos: linhas.map(linhaParaPagamento).filter((p): p is Pagamento => p !== null), erro: '' };
};

export const carregarPagamentosDaInstituicao = async (
  sigla: string,
): Promise<{ pagamentos: Pagamento[]; erro: string }> => {
  if (!sigla.trim()) return { pagamentos: [], erro: 'Sigla da instituição em falta.' };
  const { data, error } = await supabase
    .from(TABELA_PAGAMENTOS)
    .select('*')
    .ilike('instituicao_sigla', sigla.trim())
    .order('created_at', { ascending: false });
  if (error) return { pagamentos: [], erro: explicarErroPagamentos(error.message) };
  const linhas = (Array.isArray(data) ? data : []) as LinhaPagamento[];
  return { pagamentos: linhas.map(linhaParaPagamento).filter((p): p is Pagamento => p !== null), erro: '' };
};

export const criarPagamento = async (
  instituicaoSigla: string,
  novo: NovoPagamento,
): Promise<{ ok: boolean; erro: string }> => {
  const payload = {
    instituicao_sigla: instituicaoSigla.trim().toUpperCase(),
    destinatario_bi: limparBi(novo.destinatario_bi),
    descricao: novo.descricao.trim(),
    valor: novo.valor,
    metodos: novo.metodos.length > 0 ? novo.metodos : METODOS_PAGAMENTO.map(m => m.id),
    referencia: novo.referencia?.trim() || null,
    documento_ref: novo.documento_ref?.trim() || null,
    prazo: novo.prazo || null,
  };
  const { error } = await supabase.from(TABELA_PAGAMENTOS).insert(payload);
  if (error) return { ok: false, erro: explicarErroPagamentos(error.message) };
  return { ok: true, erro: '' };
};

export const cancelarPagamento = async (id: string): Promise<{ ok: boolean; erro: string }> => {
  const { error } = await supabase
    .from(TABELA_PAGAMENTOS)
    .update({ estado: 'cancelado' })
    .eq('id', id)
    .eq('estado', 'pendente');
  if (error) return { ok: false, erro: explicarErroPagamentos(error.message) };
  return { ok: true, erro: '' };
};
