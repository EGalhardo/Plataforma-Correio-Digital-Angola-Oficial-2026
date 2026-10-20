// ============================================================================
// Alertas automáticos de prazos — Etapa #3 (Cidadão)
// ----------------------------------------------------------------------------
import type { MetodoPagamento } from './pagamentosUtils';
import type { Pagamento } from './pagamentosService';
// Serviço PURO (sem React, testável em tsx) que:
//   • classifica prazos (ISO YYYY-MM-DD) em vencido / urgente (≤3 dias) /
//     próximo (≤7 dias) / ok / sem prazo / inválido;
//   • calcula dias restantes de forma determinística (meia-noite local,
//     sem erros de fuso horário — parse manual da data ISO);
//   • monta alertas a partir de cobranças pendentes (pagamentos.prazo);
//   • gere a emissão ÚNICA de cada alerta (anti-duplicação em localStorage —
//     o mesmo prazo não gera a mesma notificação duas vezes);
//   • fornece dados de demonstração com prazos próximos para a conta demo.
// NUNCA escreve na nuvem; apenas lê prazos e emite alertas locais.
// ============================================================================

export type PrazoEstado =
  | 'vencido'
  | 'urgente'
  | 'proximo'
  | 'ok'
  | 'sem_prazo'
  | 'invalido';

export interface PrazoAlerta {
  tipo: 'pagamento';
  id: string;
  bi: string;
  descricao: string;
  referencia?: string;
  prazo: string; // ISO YYYY-MM-DD
  estado: 'vencido' | 'urgente' | 'proximo';
  /** negativo = vencido há |dias| · 0 = vence hoje · positivo = dias restantes */
  dias: number;
  /** chave única anti-duplicação (tipo:id:estado) */
  chave: string;
}

export const URGENTE_DIAS = 3;
export const PROXIMO_DIAS = 7;

const MS_DIA = 86_400_000;

/** Parse determinístico de data ISO (YYYY-MM-DD) → meia-noite LOCAL (sem fuso). */
const parseISODate = (iso: string): number => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) return Number.NaN;
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return Number.NaN;
  return new Date(ano, mes - 1, dia).getTime();
};

/** Dias desde hoje até ao prazo (meia-noite local). Null se inválido/sem prazo. */
export const diasRestantes = (prazoISO: string | undefined | null, hoje: Date = new Date()): number | null => {
  if (!prazoISO) return null;
  const t = parseISODate(prazoISO);
  if (Number.isNaN(t)) return null;
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime();
  return Math.round((t - base) / MS_DIA);
};

export const classificarPrazo = (
  prazoISO: string | undefined | null,
  hoje: Date = new Date(),
): PrazoEstado => {
  const dias = diasRestantes(prazoISO, hoje);
  if (dias === null) return prazoISO ? 'invalido' : 'sem_prazo';
  if (dias < 0) return 'vencido';
  if (dias <= URGENTE_DIAS) return 'urgente';
  if (dias <= PROXIMO_DIAS) return 'proximo';
  return 'ok';
};

/** Frase em português: "VENCIDO há 2 dias" · "vence hoje" · "vence amanhã" · "vence em 5 dias". */
export const formatarDiasRestantes = (dias: number): string => {
  if (dias < 0) {
    const n = Math.abs(dias);
    return `VENCIDO há ${n} ${n === 1 ? 'dia' : 'dias'}`;
  }
  if (dias === 0) return 'vence hoje';
  if (dias === 1) return 'vence amanhã';
  return `vence em ${dias} dias`;
};

/** Data ISO → "18/08/2026". Devolve o texto original se não for possível. */
export const formatarDataCurta = (prazoISO: string | undefined | null): string => {
  if (!prazoISO) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(prazoISO.trim());
  if (!m) return prazoISO;
  return `${m[3]}/${m[2]}/${m[1]}`;
};

export interface PagamentoParaPrazo {
  id: string;
  destinatario_bi: string;
  descricao: string;
  referencia?: string;
  prazo?: string;
  estado?: string;
}

/**
 * Monta os alertas de prazos a partir de cobranças pendentes com prazo válido.
 * Devolve apenas vencido/urgente/próximo, ordenados por gravidade (mais
 * vencido primeiro; prazos iguais → os mais recentes primeiro).
 */
export const montarAlertasDePagamentos = (
  pagamentos: PagamentoParaPrazo[],
  hoje: Date = new Date(),
): PrazoAlerta[] => {
  if (!Array.isArray(pagamentos)) return [];
  const alertas: PrazoAlerta[] = [];
  for (const p of pagamentos) {
    if (!p || p.estado !== 'pendente') continue;
    const prazo = (p.prazo || '').trim();
    const dias = diasRestantes(prazo, hoje);
    if (dias === null) continue;
    const estado = classificarPrazo(prazo, hoje);
    if (estado !== 'vencido' && estado !== 'urgente' && estado !== 'proximo') continue;
    const chave = `pagamento:${p.id}:${estado}`;
    alertas.push({
      tipo: 'pagamento',
      id: String(p.id),
      bi: (p.destinatario_bi || '').trim(),
      descricao: (p.descricao || 'Cobrança').trim(),
      referencia: p.referencia,
      prazo,
      estado,
      dias,
      chave,
    });
  }
  const gravidade: Record<PrazoAlerta['estado'], number> = { vencido: 0, urgente: 1, proximo: 2 };
  return alertas.sort((a, b) =>
    gravidade[a.estado] - gravidade[b.estado] || a.dias - b.dias
  );
};

/** Título curto para a notificação do alerta. */
export const tituloDeAlerta = (a: PrazoAlerta): string => {
  if (a.estado === 'vencido') return `Prazo vencido — cobrança`;
  if (a.estado === 'urgente') return `Prazo a terminar — cobrança`;
  return `Prazo próximo — cobrança`;
};

/** Mensagem completa da notificação do alerta. */
export const mensagemDeAlerta = (a: PrazoAlerta): string => {
  const alvo = a.referencia ? ` (ref. ${a.referencia})` : '';
  return `${a.descricao}${alvo} — ${formatarDiasRestantes(a.dias)} (${formatarDataCurta(a.prazo)}). Abra Pagamentos para regularizar.`;
};

// ---------------------------------------------------------------------------
// Emissão ÚNICA (anti-duplicação) — localStorage
// ---------------------------------------------------------------------------

const ALERTS_KEY = 'cda_prazo_alerts_v1';
const ALERTS_MAX = 300;

export const alertaJaEmitido = (chave: string): boolean => {
  if (typeof localStorage === 'undefined') return false;
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    if (!raw) return false;
    const set: string[] = JSON.parse(raw);
    return Array.isArray(set) && set.includes(chave);
  } catch {
    return false;
  }
};

export const marcarAlertaEmitido = (chave: string): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    const set: string[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(set)) return;
    if (!set.includes(chave)) set.push(chave);
    localStorage.setItem(ALERTS_KEY, JSON.stringify(set.slice(-ALERTS_MAX)));
  } catch {
    /* sem espaço — sem espelho */
  }
};

/** Limpa os marcadores (usado em limpezas/testes). */
export const limparAlertasEmitidos = (): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(ALERTS_KEY);
  } catch {
    /* ignora */
  }
};

// ---------------------------------------------------------------------------
// Dados de demonstração (conta demo) — cobranças com prazos próximos
// ---------------------------------------------------------------------------

/** Prazos relativos a hoje, para a demo nunca ficar sem alertas. */
export const PAGAMENTOS_DEMO_PRAZOS = (hoje: Date = new Date()): Pagamento[] => {
  const iso = (diasOffset: number): string => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + diasOffset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const agora = new Date().toISOString();
  return [
    {
      id: 'demo-prazo-001',
      instituicao_sigla: 'AGT',
      destinatario_bi: '009874562LA041',
      descricao: 'Licenciamento anual de veículo — taxa de circulação',
      valor: 12500,
      metodos: ['multicaixa_express', 'referencia_atm'] as MetodoPagamento[],
      referencia: 'DEMO-AGT-2026-01',
      documento_ref: 'Ofício AGT 2026/0142',
      prazo: iso(-2),
      estado: 'pendente',
      created_at: agora,
      updated_at: agora,
    },
    {
      id: 'demo-prazo-002',
      instituicao_sigla: 'SME',
      destinatario_bi: '009874562LA041',
      descricao: 'Emolumento de certificado de aproveitamento escolar',
      valor: 3200,
      metodos: ['transferencia', 'multicaixa_express'] as MetodoPagamento[],
      referencia: 'DEMO-SME-2026-02',
      documento_ref: 'Certificado 2026/0881',
      prazo: iso(1),
      estado: 'pendente',
      created_at: agora,
      updated_at: agora,
    },
    {
      id: 'demo-prazo-003',
      instituicao_sigla: 'CAML',
      destinatario_bi: '009874562LA041',
      descricao: 'Taxa municipal de licença comercial — renovação',
      valor: 8750,
      metodos: ['transferencia', 'referencia_atm', 'multicaixa_express'] as MetodoPagamento[],
      referencia: 'DEMO-CAML-2026-03',
      documento_ref: 'Alvará 2026/0357',
      prazo: iso(5),
      estado: 'pendente',
      created_at: agora,
      updated_at: agora,
    },
  ];
};
