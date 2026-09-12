/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// 2026-09-12 (T53) — Denúncias: leitura do cronograma e activação de fase.
// A activação passa SEMPRE pelo servidor (/api/denuncia/fase), que valida o
// responsável da plataforma, a titularidade e a regra «só para a frente».

import { supabase } from '../lib/supabaseClient';
import { supabaseService } from './supabaseService';
import { faseActual, faseDeEstado, type DefinicaoFase, type FaseDenuncia } from './denunciaCore';

export interface EventoFaseDenuncia {
  fase: FaseDenuncia;
  data: string;
  hora: string;
}

export interface EstadoCronogramaDenuncia {
  actual: DefinicaoFase;
  eventos: EventoFaseDenuncia[];
}

const idBase = (id: number) => (id >= 10000 && id < 90000000 ? id - 10000 : id);

export async function lerCronogramaDenuncia(messageId: number): Promise<EstadoCronogramaDenuncia> {
  const linhas = (await supabaseService.getMessageStateHistory(idBase(messageId))) || [];
  const eventos: EventoFaseDenuncia[] = [];
  for (const l of linhas as Array<{ state?: string; event_date?: string; event_time?: string }>) {
    const fase = faseDeEstado(l.state);
    if (!fase) continue;
    eventos.push({
      fase,
      data: l.event_date ? new Date(l.event_date).toLocaleDateString('pt-AO') : '',
      hora: (l.event_time || '').slice(0, 5),
    });
  }
  return { actual: faseActual(eventos.map((e) => `DENUNCIA:${e.fase}`)), eventos };
}

export async function activarFaseDenuncia(
  messageId: number,
  fase: FaseDenuncia,
): Promise<{ ok: true; rotulo: string; notificado: boolean } | { ok: false; erro: string }> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token || '';
    if (!token) return { ok: false, erro: 'Sessão obrigatória para actualizar a fase.' };
    const resp = await fetch('/api/denuncia/fase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: idBase(messageId), fase }),
    });
    const json = await resp.json().catch(() => null);
    if (!json || json.ok !== true) return { ok: false, erro: (json && json.erro) || `Falha (${resp.status}).` };
    return { ok: true, rotulo: String(json.rotulo || ''), notificado: !!json.notificado };
  } catch {
    return { ok: false, erro: 'Sem ligação ao servidor. Tente novamente.' };
  }
}
