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
    let data: any = null;
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
    return { ok: true, resultado: data.resultado, modelo: data.modelo };
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      return { ok: false, erro: 'O assistente demorou demasiado tempo a responder.' };
    }
    return { ok: false, erro: 'Falha de ligação ao assistente de IA.' };
  } finally {
    clearTimeout(timer);
  }
}
