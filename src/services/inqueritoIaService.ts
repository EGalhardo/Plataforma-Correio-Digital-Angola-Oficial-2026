// ============================================================================
// inqueritoIaService — «Inquérito com IA» conversacional (PROMPT v3, 2026-09-10)
// ----------------------------------------------------------------------------
// · A instituição escreve 2 textos; a IA deduz um GUIÃO; cada cidadão recebe
//   uma correspondência com «Iniciar Inquérito» e conversa (texto/voz) com a
//   IA; os campos extraídos ficam SÓ do lado da instituição (agregados).
// · Mesmo contrato e espírito do sondagemService: NUNCA lança excepção;
//   devolve SondagemResultado<T>; sem a migração v38 tudo devolve
//   motivo 'sem_migracao'.
// · Escritas via gravarDados (proxy /api/dados com sessão real; directo em
//   demo/dev) — igual às sondagens (v37.78.14).
// · Anonimato: o BI nunca é gravado; usa-se sha256(BI + sal do servidor)
//   obtido em /api/inquerito-ia/hash (o sal não sai do servidor).
// ============================================================================
import { supabase } from '../lib/supabaseClient';
import { gravarDados, lerLinhasDados } from './supabaseService';
import {
  audienciaV37,
  classificarInstituicao,
  sondagensDisponiveis,
  v37Disponivel,
  type AbrangenciaSondagem,
  type SondagemResultado,
} from './sondagemService';
import {
  guiaoPorTemplate,
  type CanalIA,
  type DuracaoIA,
  type GuiaoIA,
  type PassoConversaIA,
  type TomIA,
  type TrocaIA,
} from './inqueritoIaCore';

export type { GuiaoIA, CampoGuiaoIA, TrocaIA, PassoConversaIA, DuracaoIA, TomIA, CanalIA } from './inqueritoIaCore';

export type EstadoRespostaIA = 'em_curso' | 'concluido' | 'recusado';

export interface InqueritoIA {
  id: number;
  instituicao_code: string;
  instituicao_nome: string;
  o_que_pretende_saber: string;
  informacoes: string;
  guiao: GuiaoIA;
  guiao_origem: 'ia' | 'template';
  duracao: DuracaoIA;
  canal: CanalIA;
  tom: TomIA;
  status: 'rascunho' | 'ativo' | 'encerrado';
  abrangencia: AbrangenciaSondagem;
  audiencia_total: number;
  destinatarios?: number | null;
  criado_por: string;
  created_at: string;
  encerrado_em?: string | null;
}

export interface RespostaInqueritoIA {
  id: number;
  inquerito_id: number;
  cidadao_bi_hash: string;
  estado: EstadoRespostaIA;
  historico: TrocaIA[];
  campos: Record<string, string>;
  canal_usado: 'texto' | 'voz' | 'guiado' | null;
  n_perguntas: number;
  iniciado_em: string;
  actualizado_em: string;
  concluido_em?: string | null;
}

export interface ContadoresInqueritoIA { enviados: number; iniciados: number; concluidos: number; recusados: number; }
export interface AgregadoInqueritoIA { chave: string; valor: string; total: number; }

// ---- sonda de disponibilidade v38 (cache em memória) -----------------------
let v38Ok: boolean | null = null;
export const inqueritosIaDisponiveis = async (): Promise<boolean> => {
  if (v38Ok !== null) return v38Ok;
  try {
    const { error } = await supabase.from('inqueritos_ia').select('id', { count: 'exact', head: true });
    v38Ok = !error;
  } catch {
    v38Ok = false;
  }
  return v38Ok;
};

const erro = <T,>(mensagem: string, motivo: SondagemResultado<T>['motivo'] = 'erro'): SondagemResultado<T> => ({ ok: false, motivo, mensagem });

const fetchJson = async (url: string, body: unknown, timeoutMs = 60000): Promise<{ status: number; json: any } | null> => {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const json = await resp.json().catch(() => null);
    return { status: resp.status, json };
  } catch {
    return null;
  }
};

// ============================================================================
// A) GUIÃO — 2 textos ⇒ guião (IA) ou template (contingência)
// ============================================================================
export const gerarGuiaoInqueritoIA = async (params: {
  oQuePretendeSaber: string; informacoes: string; instituicao: string; duracao: DuracaoIA; tom: TomIA;
}): Promise<SondagemResultado<{ guiao: GuiaoIA; origem: 'ia' | 'template'; modelo?: string }>> => {
  const r = await fetchJson('/api/inquerito-ia/guiao', params);
  if (r && r.status === 200 && r.json?.ok && r.json.guiao) {
    return { ok: true, dados: { guiao: r.json.guiao as GuiaoIA, origem: 'ia', modelo: r.json.modelo } };
  }
  if (r && r.status === 400) return erro(r.json?.erro || 'Preencha os dois campos.', 'validacao');
  // 503 / 429 / rede: contingência honesta — guião por template, marcado como tal.
  return {
    ok: true,
    dados: { guiao: guiaoPorTemplate(params), origem: 'template' },
    mensagem: r?.json?.erro || 'A IA está temporariamente indisponível — será usado o modo simplificado.',
  };
};

// ============================================================================
// B) CONVERSA — próximo passo (o cliente decide o modo guiado se falhar)
// ============================================================================
export const conversarInqueritoIA = async (params: {
  guiao: GuiaoIA; historico: TrocaIA[]; camposRecolhidos: Record<string, string>;
  instituicao: string; tom: TomIA; simulacao?: boolean; sessao?: string;
}): Promise<SondagemResultado<PassoConversaIA & { modelo?: string }>> => {
  const r = await fetchJson('/api/inquerito-ia/conversa', params, 45000);
  if (r && r.status === 200 && r.json?.ok && r.json.proximaMensagem) {
    const { ok: _ok, ...passo } = r.json;
    return { ok: true, dados: passo as PassoConversaIA & { modelo?: string } };
  }
  if (r && r.status === 400) return erro(r.json?.erro || 'Pedido inválido.', 'validacao');
  return erro(r?.json?.erro || 'A IA está temporariamente indisponível.');
};

// ============================================================================
// C) HASH anónimo do BI
// ============================================================================
const hashCache = new Map<string, string>();
export const hashCidadaoInqueritoIA = async (bi: string): Promise<string | null> => {
  const k = String(bi || '').trim().toUpperCase();
  if (!k) return null;
  const c = hashCache.get(k);
  if (c) return c;
  const r = await fetchJson('/api/inquerito-ia/hash', { bi: k }, 15000);
  const h = r?.json?.ok ? String(r.json.hash || '') : '';
  if (!h) return null;
  hashCache.set(k, h);
  return h;
};

// ============================================================================
// INSTITUIÇÃO — rascunho / expedição / lista / resultados / encerrar
// ============================================================================

/** Cria o inquérito como rascunho (bloco no compositor) — ainda não distribui. */
export const criarRascunhoInqueritoIA = async (params: {
  codigo: string; nomeInstituicao: string; criadoPor: string;
  oQuePretendeSaber: string; informacoes: string;
  guiao: GuiaoIA; guiaoOrigem: 'ia' | 'template';
  duracao: DuracaoIA; canal: CanalIA; tom: TomIA;
}): Promise<SondagemResultado<InqueritoIA>> => {
  try {
    if (!(await inqueritosIaDisponiveis())) return erro('Inquérito com IA aguarda a migração v38 no Supabase.', 'sem_migracao');
    const classif = await classificarInstituicao(params.codigo, params.nomeInstituicao);
    const classe: AbrangenciaSondagem = classif.ok && classif.dados ? classif.dados.classe : 'local';
    const linha = {
      instituicao_code: params.codigo,
      instituicao_nome: params.nomeInstituicao,
      o_que_pretende_saber: params.oQuePretendeSaber,
      informacoes: params.informacoes,
      guiao: params.guiao,
      guiao_origem: params.guiaoOrigem,
      duracao: params.duracao,
      canal: params.canal,
      tom: params.tom,
      status: 'rascunho',
      abrangencia: classe,
      audiencia_total: 0,
      criado_por: params.criadoPor,
    };
    const r = await gravarDados<InqueritoIA[]>('inqueritos_ia', 'insert', undefined, [linha], { retorno: true }, async () => {
      const { data, error } = await supabase.from('inqueritos_ia').insert(linha).select();
      if (error) throw error;
      return (data || []) as InqueritoIA[];
    });
    const criado = Array.isArray(r) ? r[0] : null;
    if (!criado) return erro('Não foi possível guardar o rascunho do inquérito.');
    return { ok: true, dados: criado };
  } catch (e: unknown) {
    return erro(String((e as Error)?.message || e));
  }
};

/** Remove um rascunho (só rascunhos). */
export const removerRascunhoInqueritoIA = async (id: number): Promise<SondagemResultado<null>> => {
  try {
    const r = await gravarDados('inqueritos_ia', 'delete', { id, status: 'rascunho' }, undefined, undefined, async () => {
      const { error } = await supabase.from('inqueritos_ia').delete().eq('id', id).eq('status', 'rascunho');
      if (error) throw error;
      return { escrito: true } as unknown as any;
    });
    return r ? { ok: true, dados: null } : erro('Não foi possível remover o rascunho.');
  } catch (e: unknown) {
    return erro(String((e as Error)?.message || e));
  }
};

const difundirLinhas = async (rows: Record<string, unknown>[]): Promise<number> => {
  let inseridas = 0;
  for (let i = 0; i < rows.length; i += 25) {
    const lote = rows.slice(i, i + 25);
    const r = await gravarDados('messages', 'insert', undefined, lote, undefined, async () => {
      const { error } = await supabase.from('messages').insert(lote);
      if (error) throw error;
      return { escrito: true } as unknown as any;
    });
    if (r) inseridas += lote.length;
    else console.warn('[InqueritoIA] lote de difusão falhou (proxy recusou) — lotes anteriores mantêm-se.');
  }
  return inseridas;
};

const notificarDestinatarios = async (bis: string[], titulo: string, texto: string): Promise<void> => {
  try {
    let pendentes = bis.slice();
    if (pendentes.length) {
      const { data: existentes } = await supabase
        .from('notifications').select('target_bi')
        .eq('title', titulo).eq('message', texto).is('read_at', null).in('target_bi', pendentes);
      if (existentes?.length) {
        const ja = new Set(existentes.map((r: { target_bi: string }) => String(r.target_bi || '').toUpperCase()));
        pendentes = pendentes.filter((bi) => !ja.has(String(bi || '').toUpperCase()));
      }
    }
    if (!pendentes.length) return;
    const rows = pendentes.map((bi) => ({ target_bi: bi, title: titulo, message: texto, time_text: 'Agora', type: 'info', target_tab: 'correspondencias' }));
    for (let i = 0; i < rows.length; i += 25) {
      const lote = rows.slice(i, i + 25);
      await gravarDados('notifications', 'insert', undefined, lote, undefined, async () => {
        const { error } = await supabase.from('notifications').insert(lote);
        if (error) throw error;
        return { escrito: true } as unknown as any;
      }).catch(() => console.warn('[InqueritoIA] notificação de difusão falhou (best-effort).'));
    }
  } catch {
    console.warn('[InqueritoIA] verificação anti-duplicação de notificações falhou (best-effort).');
  }
};

/**
 * Activa os rascunhos e distribui UMA correspondência por cidadão do âmbito
 * com os inquéritos embutidos (inquerito_ia_id + inquerito_ia_ids) — espelho
 * exacto de distribuirSondagensCompostas (v37).
 */
export const distribuirInqueritosIA = async (params: {
  codigo: string; nomeInstituicao: string; inqueritos: InqueritoIA[];
  assuntoBase?: string; corpoExtra?: string; excluirBi?: string; excluirBis?: string[];
}): Promise<SondagemResultado<{ audiencia: number; classificacao: AbrangenciaSondagem }>> => {
  try {
    if (!params.inqueritos.length) return erro('Sem inquéritos para distribuir.', 'validacao');
    if (!(await inqueritosIaDisponiveis())) return erro('Inquérito com IA aguarda a migração v38 no Supabase.', 'sem_migracao');
    if (!(await sondagensDisponiveis()) || !(await v37Disponivel())) return erro('A difusão exige as migrações v36/v37 no Supabase.', 'sem_migracao');
    const aud = await audienciaV37(params.codigo, params.nomeInstituicao);
    if (!aud.ok || !aud.dados) return erro(aud.mensagem || 'Audiência indisponível.', aud.motivo || 'erro');
    const { classificacao } = aud.dados;
    let bis = aud.dados.bis;
    if (params.excluirBi) bis = bis.filter((b) => b.toUpperCase() !== String(params.excluirBi).toUpperCase());
    if (params.excluirBis?.length) {
      const ex = new Set(params.excluirBis.map((b) => String(b || '').trim().toUpperCase()).filter(Boolean));
      bis = bis.filter((b) => !ex.has(String(b).toUpperCase()));
    }
    if (bis.length === 0 && aud.dados.bis.length === 0) return { ok: false, motivo: 'audiencia_vazia' };

    for (const q of params.inqueritos) {
      await gravarDados('inqueritos_ia', 'update', { id: q.id },
        { status: 'ativo', abrangencia: classificacao, audiencia_total: bis.length, destinatarios: bis.length }, undefined, async () => {
          const { error } = await supabase.from('inqueritos_ia')
            .update({ status: 'ativo', abrangencia: classificacao, audiencia_total: bis.length, destinatarios: bis.length }).eq('id', q.id);
          if (error) throw error;
          return { escrito: true } as unknown as any;
        });
    }

    const primeiro = params.inqueritos[0];
    const tituloCurto = primeiro.guiao?.objectivo || primeiro.o_que_pretende_saber;
    const assunto = params.assuntoBase?.trim()
      ? params.assuntoBase.trim()
      : `Inquérito: ${tituloCurto.length > 70 ? tituloCurto.slice(0, 67) + '…' : tituloCurto}`;
    const corpo = params.corpoExtra?.trim()
      ? params.corpoExtra.trim()
      : `${params.nomeInstituicao} convida-o(a) a participar num breve inquérito conduzido por um assistente inteligente, por texto ou voz. A participação é anónima e demora poucos minutos. Abra a mensagem e toque em «Iniciar Inquérito».`;
    const ids = params.inqueritos.map((q) => q.id);
    const rows = bis.map((bi) => ({
      sender_bi: params.codigo, recipient_bi: bi, org: params.codigo,
      preview: assunto, status: 'Normal', subject: assunto, body: corpo,
      unread: true, sensitivity: 'Público', priority_scale: 'Normal', actions: [], attachments: [],
      inquerito_ia_id: ids[0], inquerito_ia_ids: ids,
    }));
    const inseridas = await difundirLinhas(rows);
    if (inseridas === 0) return erro('A difusão falhou — nenhuma mensagem foi entregue. Nada foi notificado; tente novamente.');
    await notificarDestinatarios(bis, 'Novo Inquérito Oficial', `${assunto} — foi disponibilizado no seu endereço digital oficial. Participe abrindo a mensagem e tocando em «Iniciar Inquérito».`);
    return { ok: true, dados: { audiencia: inseridas, classificacao } };
  } catch (e: unknown) {
    return erro(String((e as Error)?.message || e));
  }
};

/** Registo único da expedição «Todos» na lista Enviadas da instituição. */
export const registarExpedicaoInqueritosIA = async (params: {
  codigo: string; nomeInstituicao: string; assunto: string; corpo: string; inqueritoIds: number[];
}): Promise<SondagemResultado<null>> => {
  try {
    const linha = {
      sender_bi: params.codigo, recipient_bi: 'TODOS', org: params.codigo,
      preview: params.assunto, status: 'Normal', subject: params.assunto, body: params.corpo,
      unread: false, sensitivity: 'Público', priority_scale: 'Normal', actions: [], attachments: [],
      inquerito_ia_id: params.inqueritoIds[0] ?? null, inquerito_ia_ids: params.inqueritoIds,
    };
    const r = await gravarDados('messages', 'insert', undefined, [linha], undefined, async () => {
      const { error } = await supabase.from('messages').insert([linha]);
      if (error) throw error;
      return { escrito: true } as unknown as any;
    });
    return r ? { ok: true, dados: null } : erro('Não foi possível registar a expedição em «Enviadas».');
  } catch (e: unknown) {
    return erro(String((e as Error)?.message || e));
  }
};

export const listarInqueritosIA = async (codigo: string): Promise<SondagemResultado<InqueritoIA[]>> => {
  try {
    if (!(await inqueritosIaDisponiveis())) return erro('Migração v38 em falta.', 'sem_migracao');
    const linhas = await lerLinhasDados<InqueritoIA>('inqueritos_ia', { instituicao_code: codigo }, { col: 'created_at', dir: 'desc' }, async () => {
      const { data, error } = await supabase.from('inqueritos_ia').select('*').eq('instituicao_code', codigo).order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as InqueritoIA[];
    });
    return { ok: true, dados: (linhas || []).filter((q) => q.status !== 'rascunho') };
  } catch (e: unknown) {
    return erro(String((e as Error)?.message || e));
  }
};

export const buscarInqueritoIA = async (id: number): Promise<SondagemResultado<InqueritoIA>> => {
  try {
    if (!(await inqueritosIaDisponiveis())) return erro('Migração v38 em falta.', 'sem_migracao');
    const linhas = await lerLinhasDados<InqueritoIA>('inqueritos_ia', { id }, undefined, async () => {
      const { data, error } = await supabase.from('inqueritos_ia').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data ? [data as InqueritoIA] : [];
    }, { limite: 1 });
    const q = linhas?.[0];
    return q ? { ok: true, dados: q } : erro('Inquérito não encontrado.');
  } catch (e: unknown) {
    return erro(String((e as Error)?.message || e));
  }
};

export const encerrarInqueritoIA = async (id: number): Promise<SondagemResultado<null>> => {
  try {
    const dados = { status: 'encerrado', encerrado_em: new Date().toISOString() };
    const r = await gravarDados('inqueritos_ia', 'update', { id }, dados, undefined, async () => {
      const { error } = await supabase.from('inqueritos_ia').update(dados).eq('id', id);
      if (error) throw error;
      return { escrito: true } as unknown as any;
    });
    return r ? { ok: true, dados: null } : erro('Não foi possível encerrar o inquérito.');
  } catch (e: unknown) {
    return erro(String((e as Error)?.message || e));
  }
};

/** Contadores via RPC (rápido); degrada para contagem no cliente. */
export const contadoresInqueritoIA = async (q: InqueritoIA): Promise<ContadoresInqueritoIA> => {
  try {
    const { data, error } = await supabase.rpc('cda_inquerito_ia_contadores', { p_inquerito_id: q.id });
    const row = Array.isArray(data) ? data[0] : data;
    if (!error && row) {
      return { enviados: Number(row.enviados || 0), iniciados: Number(row.iniciados || 0), concluidos: Number(row.concluidos || 0), recusados: Number(row.recusados || 0) };
    }
  } catch { /* segue para fallback */ }
  const linhas = await lerLinhasDados<Pick<RespostaInqueritoIA, 'estado'>>('inquerito_ia_respostas', { inquerito_id: q.id }, undefined, async () => {
    const { data } = await supabase.from('inquerito_ia_respostas').select('estado').eq('inquerito_id', q.id);
    return (data || []) as Pick<RespostaInqueritoIA, 'estado'>[];
  });
  const l = linhas || [];
  return {
    enviados: Number(q.destinatarios || 0),
    iniciados: l.length,
    concluidos: l.filter((r) => r.estado === 'concluido').length,
    recusados: l.filter((r) => r.estado === 'recusado').length,
  };
};

/** Agregados por campo/valor via RPC; degrada para agregação no cliente
 *  (só respostas concluídas; nunca devolve linhas individuais à UI). */
export const agregadosInqueritoIA = async (id: number): Promise<SondagemResultado<AgregadoInqueritoIA[]>> => {
  try {
    const { data, error } = await supabase.rpc('cda_inquerito_ia_agregados', { p_inquerito_id: id });
    if (!error && Array.isArray(data)) {
      return { ok: true, dados: data.map((r: any) => ({ chave: String(r.chave), valor: String(r.valor), total: Number(r.total || 0) })) };
    }
    const linhas = await lerLinhasDados<Pick<RespostaInqueritoIA, 'estado' | 'campos'>>('inquerito_ia_respostas', { inquerito_id: id, estado: 'concluido' }, undefined, async () => {
      const { data: d } = await supabase.from('inquerito_ia_respostas').select('estado,campos').eq('inquerito_id', id).eq('estado', 'concluido');
      return (d || []) as Pick<RespostaInqueritoIA, 'estado' | 'campos'>[];
    });
    const mapa = new Map<string, number>();
    for (const r of linhas || []) {
      for (const [k, v] of Object.entries(r.campos || {})) {
        const val = String(v ?? '').trim();
        if (!val) continue;
        const norm = val.charAt(0).toUpperCase() + val.slice(1);
        const key = `${k}\u0000${norm}`;
        mapa.set(key, (mapa.get(key) || 0) + 1);
      }
    }
    const out: AgregadoInqueritoIA[] = [...mapa.entries()].map(([key, total]) => {
      const [chave, valor] = key.split('\u0000');
      return { chave, valor, total };
    }).sort((a, b) => a.chave.localeCompare(b.chave) || b.total - a.total);
    return { ok: true, dados: out };
  } catch (e: unknown) {
    return erro(String((e as Error)?.message || e));
  }
};

// ============================================================================
// CIDADÃO — iniciar/retomar, guardar progresso, concluir, recusar
// ============================================================================

export const minhaRespostaInqueritoIA = async (inqueritoId: number, bi: string): Promise<SondagemResultado<RespostaInqueritoIA | null>> => {
  try {
    if (!(await inqueritosIaDisponiveis())) return erro('Migração v38 em falta.', 'sem_migracao');
    const hash = await hashCidadaoInqueritoIA(bi);
    if (!hash) return erro('Não foi possível preparar a sua participação anónima.');
    const linhas = await lerLinhasDados<RespostaInqueritoIA>('inquerito_ia_respostas', { inquerito_id: inqueritoId, cidadao_bi_hash: hash }, undefined, async () => {
      const { data, error } = await supabase.from('inquerito_ia_respostas').select('*').eq('inquerito_id', inqueritoId).eq('cidadao_bi_hash', hash).maybeSingle();
      if (error) throw error;
      return data ? [data as RespostaInqueritoIA] : [];
    }, { limite: 1 });
    return { ok: true, dados: linhas?.[0] || null };
  } catch (e: unknown) {
    return erro(String((e as Error)?.message || e));
  }
};

/** Cria a linha em_curso (ou devolve a existente) — idempotente pelo unique. */
export const iniciarOuRetomarRespostaIA = async (inqueritoId: number, bi: string): Promise<SondagemResultado<RespostaInqueritoIA>> => {
  try {
    const existente = await minhaRespostaInqueritoIA(inqueritoId, bi);
    if (!existente.ok) return erro(existente.mensagem || 'Erro.', existente.motivo);
    if (existente.dados) return { ok: true, dados: existente.dados };
    const hash = await hashCidadaoInqueritoIA(bi);
    if (!hash) return erro('Não foi possível preparar a sua participação anónima.');
    const linha = { inquerito_id: inqueritoId, cidadao_bi_hash: hash, estado: 'em_curso', historico: [], campos: {}, n_perguntas: 0 };
    const r = await gravarDados<RespostaInqueritoIA[]>('inquerito_ia_respostas', 'insert', undefined, [linha], { retorno: true }, async () => {
      const { data, error } = await supabase.from('inquerito_ia_respostas').insert(linha).select();
      if (error) throw error;
      return (data || []) as RespostaInqueritoIA[];
    });
    const criada = Array.isArray(r) ? r[0] : null;
    if (criada) return { ok: true, dados: criada };
    // corrida (unique): reler
    const relida = await minhaRespostaInqueritoIA(inqueritoId, bi);
    return relida.ok && relida.dados ? { ok: true, dados: relida.dados } : erro('Não foi possível iniciar o inquérito.');
  } catch (e: unknown) {
    return erro(String((e as Error)?.message || e));
  }
};

const actualizarResposta = async (id: number, dados: Record<string, unknown>): Promise<boolean> => {
  const r = await gravarDados('inquerito_ia_respostas', 'update', { id }, dados, undefined, async () => {
    const { error } = await supabase.from('inquerito_ia_respostas').update(dados).eq('id', id);
    if (error) throw error;
    return { escrito: true } as unknown as any;
  });
  return !!r;
};

/** Guarda histórico + campos (uso interno) sem alterar o estado. */
export const guardarProgressoIA = async (params: {
  respostaId: number; historico: TrocaIA[]; campos: Record<string, string>; canalUsado: 'texto' | 'voz' | 'guiado';
}): Promise<SondagemResultado<null>> => {
  const ok = await actualizarResposta(params.respostaId, {
    historico: params.historico, campos: params.campos, canal_usado: params.canalUsado,
    n_perguntas: params.historico.filter((t) => t.de === 'ia').length,
    // Quem recusou e depois voltou a participar regressa a «em_curso».
    estado: 'em_curso', concluido_em: null,
    actualizado_em: new Date().toISOString(),
  });
  return ok ? { ok: true, dados: null } : erro('Não foi possível guardar o progresso.');
};

/** «Concluir» — registo definitivo. O cidadão nunca vê os campos. */
export const concluirRespostaIA = async (params: {
  respostaId: number; historico: TrocaIA[]; campos: Record<string, string>; canalUsado: 'texto' | 'voz' | 'guiado';
}): Promise<SondagemResultado<null>> => {
  const agora = new Date().toISOString();
  const ok = await actualizarResposta(params.respostaId, {
    historico: params.historico, campos: params.campos, canal_usado: params.canalUsado,
    n_perguntas: params.historico.filter((t) => t.de === 'ia').length,
    estado: 'concluido', actualizado_em: agora, concluido_em: agora,
  });
  return ok ? { ok: true, dados: null } : erro('Não foi possível concluir o inquérito.');
};

/** Recusa logo na saudação — nada de campos é gravado. */
export const recusarRespostaIA = async (respostaId: number): Promise<SondagemResultado<null>> => {
  const agora = new Date().toISOString();
  const ok = await actualizarResposta(respostaId, { estado: 'recusado', historico: [], campos: {}, actualizado_em: agora, concluido_em: agora });
  return ok ? { ok: true, dados: null } : erro('Não foi possível registar a recusa.');
};
