// ============================================================================
// Cliente do Assistente de Documentos — Fase 1 / S2
// Chama POST /api/assistente-documento (implementado em S1).
// Falha de rede/HTTP/timeout => { ok:false, erro } honesto; o componente
// decide como mostrar. NUNCA devolve texto fingido.
// ============================================================================

import type { AcaoDocumento, TipoRascunho, IdiomaTraducao } from './aiDocumentoCore';

const TIMEOUT_MS = 45000;

export interface AssistenteResposta {
  ok: boolean;
  resultado?: string;
  modelo?: string;
  erro?: string;
  // E4 — proveniência da resposta quando a Base de Conhecimento foi usada.
  kb?: AssistenteKb;
}

// E4 — o servidor devolve este formato quando injeta a KB da instituição.
export interface AssistenteKb {
  instituicao: string;
  fontes: string[];
  truncado: boolean;
}

// E4 — Selo de proveniência: UMA fonte única da frase honesta (testada de
// forma isolada). Nunca omitir nem exagerar: com KB diz quantos documentos
// oficiais fundamentaram a resposta; sem KB diz que a resposta veio só do
// documento do cidadão.
export function seloKb(kb?: AssistenteKb | null): string {
  if (!kb) return 'Sem regulamentos carregados — resposta só com base no documento';
  const n = kb.fontes.length;
  const rotulo = n === 1 ? 'documento oficial' : 'documentos oficiais';
  const base = `Com base em ${n} ${rotulo} de ${kb.instituicao}`;
  return kb.truncado ? `${base} (parcial — base maior que o limite desta consulta)` : base;
}

export async function assistenteDocumento(args: {
  acao: AcaoDocumento;
  texto: string;
  titulo?: string;
  remetente?: string;
  tipoRascunho?: TipoRascunho;
  idiomaDestino?: IdiomaTraducao;
}): Promise<AssistenteResposta> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch('/api/assistente-documento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(args),
    });
    interface CorpoRespostaApi {
      ok?: boolean; resultado?: string; modelo?: string; erro?: string;
      kb?: { instituicao?: unknown; fontes?: unknown; truncado?: unknown };
    }
    let data: CorpoRespostaApi | null = null;
    try {
      data = await resp.json();
    } catch {
      data = null;
    }
    if (!resp.ok) {
      return { ok: false, erro: data?.erro || `O serviço respondeu com erro (${resp.status}).` };
    }
    if (!data?.ok || typeof data.resultado !== 'string' || data.resultado.trim().length === 0) {
      return { ok: false, erro: 'O assistente devolveu uma resposta vazia.' };
    }
    // E4 — reencaminha a proveniência se vier com formato conhecido.
    let kb: AssistenteKb | undefined;
    if (data.kb && typeof data.kb.instituicao === 'string' && Array.isArray(data.kb.fontes)) {
      kb = {
        instituicao: data.kb.instituicao,
        fontes: data.kb.fontes.filter((f: unknown) => typeof f === 'string'),
        truncado: data.kb.truncado === true,
      };
    }
    return { ok: true, resultado: data.resultado, modelo: data.modelo, kb };
  } catch (e) {
    if (e?.name === 'AbortError') {
      return { ok: false, erro: 'O assistente demorou demasiado tempo a responder.' };
    }
    return { ok: false, erro: 'Falha de ligação ao assistente de IA.' };
  } finally {
    clearTimeout(timer);
  }
}
