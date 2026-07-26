// ============================================================================
// Pré-Verificação Inteligente de Cadastros — Prompt v11.1 (F27/F28/F29)
// ----------------------------------------------------------------------------
// Porta 2 + Porta 3 no SERVIDOR: o cliente envia os dados MÍNIMOS do formulário
// e as URLs públicas das imagens do documento (já gravadas no Supabase Storage)
// para POST /api/verificar-cadastro, que consulta a IA de visão (Groq Llama 4
// Scout) SEM persistir imagens nem dados sensíveis.
//
// REGRA DE OURO (inesgotável): qualquer falha de rede, timeout, HTTP não-200,
// resposta inválida ou incoerente (APTO com alertas) => veredicto REVISAO —
// o cadastro permanece PENDENTE exactamente como hoje. NUNCA existe aprovação
// automática por erro técnico.
//
// Este módulo é PURO (sem supabase, sem import.meta) — seguro para importar em
// qualquer componente e nos testes lógicos.
// ============================================================================

export type PviVeredicto = 'APTO' | 'REVISAO';

export interface PviVerdict {
  veredicto: PviVeredicto;
  alertas: string[];
  motivo: string;
  duracaoMs: number;
  modelo: string;
}

export interface PviRequest {
  biNumber: string;
  nome: string;
  tipo: 'cidadao' | 'instituicao';
  urls: { frente: string; verso: string };
  dataNascimento?: string;
  sexo?: string;
}

export const PVI_MODEL_ID = 'meta-llama/llama-4-scout-17b-16e-instruct';

const PVI_CLIENT_TIMEOUT_MS = 30000;

const revisaoFallback = (alerta: string, motivo: string, startedAt: number): PviVerdict => ({
  veredicto: 'REVISAO',
  alertas: [alerta],
  motivo,
  duracaoMs: Date.now() - startedAt,
  modelo: PVI_MODEL_ID,
});

// ----------------------------------------------------------------------------
// Chamada ao endpoint do servidor (Porta 2 + 3)
// ----------------------------------------------------------------------------
export const requestPviVerification = async (req: PviRequest): Promise<PviVerdict> => {
  const startedAt = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PVI_CLIENT_TIMEOUT_MS);
    let resp: Response;
    try {
      resp = await fetch('/api/verificar-cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!resp || !resp.ok) {
      return revisaoFallback('falha_tecnica', 'Serviço de pré-verificação indisponível — o cadastro segue para homologação manual.', startedAt);
    }

    const data: any = await resp.json().catch(() => null);
    if (!data || (data.veredicto !== 'APTO' && data.veredicto !== 'REVISAO')) {
      return revisaoFallback('resposta_invalida', 'Resposta inválida do serviço de pré-verificação — homologação manual.', startedAt);
    }

    const alertas: string[] = Array.isArray(data.alertas)
      ? data.alertas.filter((a: unknown) => typeof a === 'string' && (a as string).trim()).slice(0, 12)
      : [];

    // Coerência defensiva (espelha a regra do servidor): APTO nunca convive com alertas.
    if (data.veredicto === 'APTO' && alertas.length > 0) {
      return {
        veredicto: 'REVISAO',
        alertas,
        motivo: typeof data.motivo === 'string' && data.motivo.trim()
          ? data.motivo
          : 'Veredicto incoerente (APTO com alertas) — homologação manual.',
        duracaoMs: typeof data.duracaoMs === 'number' ? data.duracaoMs : Date.now() - startedAt,
        modelo: typeof data.modelo === 'string' && data.modelo ? data.modelo : PVI_MODEL_ID,
      };
    }

    return {
      veredicto: data.veredicto,
      alertas,
      motivo: typeof data.motivo === 'string' ? data.motivo : '',
      duracaoMs: typeof data.duracaoMs === 'number' ? data.duracaoMs : Date.now() - startedAt,
      modelo: typeof data.modelo === 'string' && data.modelo ? data.modelo : PVI_MODEL_ID,
    };
  } catch {
    // Abort/timeout ou falha de rede — regra de ouro: REVISAO.
    return revisaoFallback('falha_tecnica', 'Falha técnica ou timeout na pré-verificação — homologação manual.', startedAt);
  }
};

// ----------------------------------------------------------------------------
// Marcador compacto gravado em `observacoes` de solicitacoes_registo — mesmo
// padrão do marcador [KYC:{...}] já existente (legível pelo Admin noutro
// dispositivo, nunca mostrado ao cidadão).
// ----------------------------------------------------------------------------
export const buildPvicMarker = (v: PviVerdict): string =>
  `[PVIC:${JSON.stringify({
    v: 1,
    ver: v.veredicto,
    al: v.alertas,
    mot: v.motivo,
    dur: v.duracaoMs,
    mod: v.modelo,
    ts: new Date().toISOString(),
  })}]`;

// ----------------------------------------------------------------------------
// Parser partilhado do marcador [PVIC:{...}] (Área de Administração — F29)
// Parsing conservador: marcador malformado/inesperado => null (sem crash).
// ----------------------------------------------------------------------------
export interface PvicMarkerParsed {
  ver: 'APTO' | 'REVISAO' | null;
  al: string[];
  mot: string;
  dur: number | null;
  mod: string;
  ts: string;
}

export const parsePvicFromObservacoes = (raw?: string): PvicMarkerParsed | null => {
  if (!raw) return null;
  const marker = raw.match(/\[PVIC:(\{[\s\S]*?\})\]/);
  if (!marker) return null;
  try {
    const p = JSON.parse(marker[1]);
    return {
      ver: p.ver === 'APTO' ? 'APTO' : p.ver === 'REVISAO' ? 'REVISAO' : null,
      al: Array.isArray(p.al) ? p.al.filter((x: unknown) => typeof x === 'string') : [],
      mot: typeof p.mot === 'string' ? p.mot : '',
      dur: typeof p.dur === 'number' ? p.dur : null,
      mod: typeof p.mod === 'string' ? p.mod : '',
      ts: typeof p.ts === 'string' ? p.ts : '',
    };
  } catch {
    return null;
  }
};
