// ============================================================================
// sondagemService — Funcionalidade «Sondagem» (v36.1, spec aprovada pelo dono)
// ----------------------------------------------------------------------------
// · Enquetes estilo WhatsApp: órgão nacional ⇒ todos os cidadãos; instituição
//   local ⇒ só cidadãos registados no seu sistema (RPC cda_audiencia_sondagem).
// · NUNCA lança excepção: devolve resultados tipados (mesmo espírito de
//   cloudAuthService / institutionSessionService).
// · Sem a migração v36 aplicada no Supabase, tudo devolve motivo
//   'sem_migracao' — a UI mostra o selo honesto (fronteira 7.2 da spec).
// ============================================================================
import { supabase } from '../lib/supabaseClient';

export interface OpcaoSondagem { id: string; texto: string; }

export type AbrangenciaSondagem = 'nacional' | 'regional' | 'local';

export interface Sondagem {
  id: number;
  instituicao_code: string;
  instituicao_nome: string;
  pergunta: string;
  opcoes: OpcaoSondagem[];
  permitir_varias: boolean;
  status: 'rascunho' | 'ativa' | 'encerrada';
  abrangencia: AbrangenciaSondagem;
  audiencia_total: number;
  destinatarios?: number | null;
  criada_por: string;
  created_at: string;
}

export interface RespostaSondagem {
  cidadao_bi: string;
  escolhas: string[];
}

export type SondagemMotivo =
  | 'sem_migracao'   // tabelas v36 ainda não aplicadas no Supabase
  | 'sem_supabase'   // chaves não configuradas
  | 'audiencia_vazia'
  | 'validacao'
  | 'erro';

export interface SondagemResultado<T> {
  ok: boolean;
  dados?: T;
  motivo?: SondagemMotivo;
  mensagem?: string;
}

// ---- Âmbito por categoria (default sugerido; override = tabela/edição futura)
const RE_NACIONAL =
  /minist[ée]rio|presid[êe]ncia|vice-presid[êe]ncia|instituto nacional|administra[çc][ãa]o geral|seguran[çc]a social|pol[íi]cia nacional|protec[çc][ãa]o civil|bombeiros|migra|ine\b|inapem|\bINE\b/i;

export const abrangenciaSugerida = (nomeInstituicao: string, codigo: string): 'nacional' | 'local' => {
  const base = (codigo || '').split('-')[0];
  const nacionaisCodigo = ['INAPEM', 'INE', 'AGT', 'INSS', 'SME', 'PN', 'MINSA', 'PR', 'VPR'];
  if (nacionaisCodigo.includes(base.toUpperCase())) return 'nacional';
  return RE_NACIONAL.test(nomeInstituicao || '') ? 'nacional' : 'local';
};

// ============================================================================
// v37 — Classificação oficial + segmentação inteligente (PROMPT_SONDAGEM_v37)
// ============================================================================

/** Lê (e persiste, se ausente) a classificação oficial da instituição.
 *  Via RPC security-definer (v37) — imune ao RLS de profiles; degrada para
 *  leitura directa / heurística enquanto a migração não estiver aplicada. */
export const classificarInstituicao = async (
  codigo: string,
  nomeInstituicao: string,
): Promise<SondagemResultado<{ classe: AbrangenciaSondagem; provincia: string | null }>> => {
  try {
    if (await v37Disponivel()) {
      const { data, error } = await supabase.rpc('cda_classificacao_inst', { p_code: codigo });
      if (!error && Array.isArray(data) && data.length > 0) {
        return { ok: true, dados: { classe: (data[0] as any).abrangencia as AbrangenciaSondagem, provincia: (data[0] as any).provincia || null } };
      }
      if (!error && Array.isArray(data) && data.length === 0) {
        return { ok: false, motivo: 'erro', mensagem: 'Instituição não encontrada.' };
      }
      if (error) return { ok: false, motivo: 'erro', mensagem: error.message };
    }
    // Pré-migração (ou RPC indisponível): heurística v36, sem persistência.
    return { ok: true, dados: { classe: abrangenciaSugerida(nomeInstituicao, codigo) as AbrangenciaSondagem, provincia: null } };
  } catch (e: any) {
    return { ok: false, motivo: 'erro', mensagem: String(e?.message || e) };
  }
};

/** v37 §2.3 — leitura da classificação oficial (para a consola administrativa). */
export const lerClassificacaoInstituicao = async (
  codigo: string,
): Promise<SondagemResultado<{ classe: AbrangenciaSondagem | null; provincia: string | null }>> => {
  try {
    if (!(await v37Disponivel())) return { ok: true, dados: { classe: null, provincia: null } };
    const { data, error } = await supabase.rpc('cda_classificacao_inst', { p_code: codigo });
    if (!error && Array.isArray(data)) {
      if (!data.length) return { ok: false, motivo: 'erro', mensagem: 'Instituição não encontrada.' };
      return { ok: true, dados: { classe: ((data[0] as any).abrangencia as AbrangenciaSondagem) || null, provincia: (data[0] as any).provincia || null } };
    }
    return { ok: false, motivo: 'erro', mensagem: error?.message || 'Classificação indisponível.' };
  } catch (e: any) {
    return { ok: false, motivo: 'erro', mensagem: String(e?.message || e) };
  }
};

/** v37 §2.3 — definição administrativa da classificação (NACIONAL/REGIONAL/LOCAL). */
export const definirClassificacaoInstituicao = async (params: {
  codigo: string;
  classe: AbrangenciaSondagem;
  provincia?: string | null;
}): Promise<SondagemResultado<null>> => {
  try {
    if (params.classe === 'regional' && !String(params.provincia || '').trim()) {
      return { ok: false, motivo: 'validacao', mensagem: 'Indique a província para classificação REGIONAL.' };
    }
    if (!(await v37Disponivel())) {
      return { ok: false, motivo: 'sem_migracao', mensagem: 'Classificação ainda não disponível (migração v37 por aplicar).' };
    }
    const { error } = await supabase.rpc('cda_definir_classificacao_inst', {
      p_code: params.codigo,
      p_classe: params.classe,
      p_provincia: params.classe === 'regional' ? String(params.provincia || '').trim() : null,
    });
    if (error) return { ok: false, motivo: 'erro', mensagem: error.message };
    return { ok: true, dados: null };
  } catch (e: any) {
    return { ok: false, motivo: 'erro', mensagem: String(e?.message || e) };
  }
};

/** Contagem honesta de cidadãos sem província registada (aviso REGIONAL). */
export const contarCidadaosSemProvincia = async (): Promise<number> => {
  try {
    if (!(await v37Disponivel())) return 0;
    const { data, error } = await supabase.rpc('cda_cidadaos_sem_provincia');
    if (!error && typeof data === 'number') return data;
    return 0;
  } catch {
    return 0;
  }
};

export interface AudienciaV37 {
  classificacao: AbrangenciaSondagem;
  bis: string[];
  semProvincia?: number;
}

/**
 * Audiência segundo a classificação oficial (RPC v37). Sem a migração v37
 * aplica-se o caminho v36 (heurística + RPC antiga) — nunca falha em silêncio.
 */
export const audienciaV37 = async (
  codigo: string,
  nomeInstituicao: string,
): Promise<SondagemResultado<AudienciaV37>> => {
  try {
    if (!(await sondagensDisponiveis())) return { ok: false, motivo: 'sem_migracao' };
    const classif = await classificarInstituicao(codigo, nomeInstituicao);
    // classificarInstituicao nunca falha (degrada para heurística); ainda assim,
    // em erro imprevisto segue com 'local' por defeito (menor jurisdição).
    const classe: AbrangenciaSondagem = classif.ok && classif.dados ? classif.dados.classe : 'local';
    const provincia = classif.ok && classif.dados ? classif.dados.provincia : null;
    // REGIONAL sem província definida ⇒ bloqueio honesto (v37 §3.2)
    if (classe === 'regional' && !provincia) {
      return { ok: false, motivo: 'validacao', mensagem: 'Instituição REGIONAL sem província definida. Classifique a instituição antes de criar sondagens.' };
    }
    if (!(await v37Disponivel())) {
      // Migração v37 ainda não aplicada ⇒ degrada para o caminho v36.
      const legado = await audienciaPara(codigo, nomeInstituicao);
      if (!legado.ok || !legado.dados) return { ok: false, motivo: legado.motivo, mensagem: legado.mensagem };
      return { ok: true, dados: { classificacao: legado.dados.abrangencia as AbrangenciaSondagem, bis: legado.dados.bis } };
    }
    const { data, error } = await supabase.rpc('cda_audiencia_sondagem_v2', { p_code: codigo });
    if (error || !Array.isArray(data)) {
      const legado = await audienciaPara(codigo, nomeInstituicao);
      if (!legado.ok || !legado.dados) return { ok: false, motivo: legado.motivo, mensagem: legado.mensagem };
      return { ok: true, dados: { classificacao: legado.dados.abrangencia as AbrangenciaSondagem, bis: legado.dados.bis } };
    }
    const bis = [...new Set((data as any[]).map((l) => String(l?.bi || l)).filter(Boolean))];
    const res: AudienciaV37 = { classificacao: classe, bis };
    if (classe === 'regional') res.semProvincia = await contarCidadaosSemProvincia();
    return { ok: true, dados: res };
  } catch (e: any) {
    return { ok: false, motivo: 'erro', mensagem: String(e?.message || e) };
  }
};

/** Cria a sondagem como rascunho (v37 §1.4) — ainda não distribui. */
export const criarRascunhoSondagem = async (params: {
  codigo: string;
  nomeInstituicao: string;
  criadaPor: string;
  pergunta: string;
  opcoes: OpcaoSondagem[];
  permitirVarias: boolean;
}): Promise<SondagemResultado<Sondagem>> => {
  try {
    if (!(await sondagensDisponiveis())) {
      return { ok: false, motivo: 'sem_migracao', mensagem: 'Sondagens aguarda a migração no Supabase.' };
    }
    const classif = await classificarInstituicao(params.codigo, params.nomeInstituicao);
    const classe: AbrangenciaSondagem = classif.ok && classif.dados ? classif.dados.classe : 'local';
    const { data, error } = await supabase
      .from('sondagens')
      .insert({
        instituicao_code: params.codigo,
        instituicao_nome: params.nomeInstituicao,
        pergunta: params.pergunta,
        opcoes: params.opcoes,
        permitir_varias: params.permitirVarias,
        status: 'rascunho',
        abrangencia: classe,
        audiencia_total: 0,
        criada_por: params.criadaPor,
      })
      .select()
      .single();
    if (error || !data) return { ok: false, motivo: 'erro', mensagem: error?.message };
    return { ok: true, dados: data as Sondagem };
  } catch (e: any) {
    return { ok: false, motivo: 'erro', mensagem: String(e?.message || e) };
  }
};

/** Remove um rascunho (só rascunhos — v37 §1.4). */
export const removerRascunhoSondagem = async (sondagemId: number): Promise<SondagemResultado<null>> => {
  try {
    const { error } = await supabase
      .from('sondagens')
      .delete()
      .eq('id', sondagemId)
      .eq('status', 'rascunho');
    if (error) return { ok: false, motivo: 'erro', mensagem: error.message };
    return { ok: true, dados: null };
  } catch (e: any) {
    return { ok: false, motivo: 'erro', mensagem: String(e?.message || e) };
  }
};

/**
 * v37 §1.5/§4 — ativa os rascunhos e distribui UMA mensagem por cidadão com
 * todas as sondagens embutidas (sondagem_ids). Dedupe garantido (conjunto de
 * BI único); destinatário directo opcionalmente excluído para não duplicar.
 */
export const distribuirSondagensCompostas = async (params: {
  codigo: string;
  nomeInstituicao: string;
  sondagens: Sondagem[];
  assuntoBase?: string;
  corpoExtra?: string;
  excluirBi?: string;
}): Promise<SondagemResultado<{ audiencia: number; classificacao: AbrangenciaSondagem }>> => {
  try {
    if (!params.sondagens.length) return { ok: false, motivo: 'validacao', mensagem: 'Sem sondagens para distribuir.' };
    if (!(await sondagensDisponiveis())) {
      return { ok: false, motivo: 'sem_migracao', mensagem: 'Sondagens aguarda a migração no Supabase.' };
    }
    // v37 exige messages.sondagem_ids — sonda honesta antes de ativar rascunhos
    if (!(await v37Disponivel())) {
      return { ok: false, motivo: 'sem_migracao', mensagem: 'Distribuição multi-sondagem exige a migração v37 no Supabase.' };
    }
    const aud = await audienciaV37(params.codigo, params.nomeInstituicao);
    if (!aud.ok || !aud.dados) {
      return { ok: false, motivo: aud.motivo || 'erro', mensagem: aud.mensagem };
    }
    const { classificacao } = aud.dados;
    let bis = aud.dados.bis;
    if (params.excluirBi) bis = bis.filter((b) => b.toUpperCase() !== String(params.excluirBi).toUpperCase());
    if (bis.length === 0) return { ok: false, motivo: 'audiencia_vazia' };

    // Ativa rascunhos + regista contagem real (melhor esforço por sondagem)
    for (const s of params.sondagens) {
      await supabase
        .from('sondagens')
        .update({ status: 'ativa', abrangencia: classificacao, audiencia_total: bis.length, destinatarios: bis.length })
        .eq('id', s.id);
    }

    const multiplas = params.sondagens.length > 1;
    const resumoSondagens = params.sondagens
      .map((s) => {
        const linhas = s.opcoes.map((o, i) => `${String.fromCharCode(65 + i)}) ${o.texto}`).join('\n');
        return `${s.pergunta}\n${linhas}`;
      })
      .join('\n\n');
    const assunto = params.assuntoBase?.trim()
      ? params.assuntoBase.trim()
      : `Sondagem${multiplas ? 's' : ''}: ${params.sondagens[0].pergunta.length > 70 ? params.sondagens[0].pergunta.slice(0, 67) + '…' : params.sondagens[0].pergunta}`;
    const corpo = params.corpoExtra?.trim()
      ? `${params.corpoExtra.trim()}\n\n— Sondagem${multiplas ? 's' : ''} incluída${multiplas ? 's' : ''} nesta mensagem —\n\n${resumoSondagens}\n\nAbra a mensagem e toque em «Responder à Sondagem».`
      : `${params.nomeInstituicao} convida-o(a) a participar na seguinte sondagem oficial:\n\n${resumoSondagens}\n\nAbra a mensagem e toque em «Responder à Sondagem».`;
    const ids = params.sondagens.map((s) => s.id);
    const rows = bis.map((bi) => ({
      sender_bi: params.codigo,
      recipient_bi: bi,
      org: params.codigo,
      preview: assunto,
      status: 'Normal',
      subject: assunto,
      body: corpo,
      unread: true,
      sensitivity: 'Público',
      priority_scale: 'Normal',
      actions: [],
      attachments: [],
      sondagem_id: ids[0],          // retrocompatibilidade v36
      sondagem_ids: ids,            // v37 — várias sondagens embutidas
    }));
    for (let i = 0; i < rows.length; i += 25) {
      const { error: eMsg } = await supabase.from('messages').insert(rows.slice(i, i + 25));
      if (eMsg) console.warn('[Sondagens v37] difusão parcial:', eMsg.message);
    }
    return { ok: true, dados: { audiencia: bis.length, classificacao } };
  } catch (e: any) {
    return { ok: false, motivo: 'erro', mensagem: String(e?.message || e) } };
};

// ---- sonda de disponibilidade (cache em memória) ----------------------------
let tabelaOk: boolean | null = null;

export const sondagensDisponiveis = async (): Promise<boolean> => {
  if (tabelaOk !== null) return tabelaOk;
  try {
    const { error } = await supabase.from('sondagens').select('id', { count: 'exact', head: true });
    tabelaOk = !error;
  } catch {
    tabelaOk = false;
  }
  return tabelaOk;
};

// v37 — sonda única de esquema (messages.sondagem_ids). Evita repetir sondas
// 404/400 às RPCs v37 enquanto a migração não for aplicada pelo dono.
let v37Ok: boolean | null = null;
export const v37Disponivel = async (): Promise<boolean> => {
  if (v37Ok !== null) return v37Ok;
  try {
    const { error } = await supabase.from('messages').select('sondagem_ids', { count: 'exact', head: true });
    v37Ok = !error;
  } catch {
    v37Ok = false;
  }
  return v37Ok;
};

// ---- Audiência ----------------------------------------------------------------
export const audienciaPara = async (
  codigo: string,
  nomeInstituicao: string,
): Promise<SondagemResultado<{ abrangencia: 'nacional' | 'local'; bis: string[] }>> => {
  try {
    const abrangencia = abrangenciaSugerida(nomeInstituicao, codigo);
    if (abrangencia === 'nacional') {
      const { data, error } = await supabase.from('profiles').select('bi').eq('role', 'user').limit(5000);
      if (error) return { ok: false, motivo: 'erro', mensagem: error.message };
      const bis = [...new Set((data || []).map((r: any) => String(r.bi)).filter(Boolean))];
      return { ok: true, dados: { abrangencia, bis } };
    }
    // local: RPC da v36 (cidadãos com relação pré-existente com a instituição)
    const { data, error } = await supabase.rpc('cda_audiencia_sondagem', { p_code: codigo });
    if (error) return { ok: false, motivo: 'erro', mensagem: error.message };
    const linhas: any[] = (data as any[]) || [];
    const bis = [...new Set(linhas.map((b) => String(b)).filter(Boolean))];
    return { ok: true, dados: { abrangencia, bis } };
  } catch (e: any) {
    return { ok: false, motivo: 'erro', mensagem: String(e?.message || e) };
  }
};

// ---- Criação + difusão ---------------------------------------------------------
export const criarSondagem = async (params: {
  codigo: string;
  nomeInstituicao: string;
  criadaPor: string;
  pergunta: string;
  opcoes: OpcaoSondagem[];
  permitirVarias: boolean;
}): Promise<SondagemResultado<{ id: number; audiencia: number }>> => {
  try {
    if (!(await sondagensDisponiveis())) {
      return { ok: false, motivo: 'sem_migracao', mensagem: 'Sondagens aguarda a migração v36 no Supabase.' };
    }
    const aud = await audienciaPara(params.codigo, params.nomeInstituicao);
    if (!aud.ok) return { ok: false, motivo: aud.motivo, mensagem: aud.mensagem };
    const { abrangencia, bis } = aud.dados!;
    if (bis.length === 0) return { ok: false, motivo: 'audiencia_vazia' };

    const { data, error } = await supabase
      .from('sondagens')
      .insert({
        instituicao_code: params.codigo,
        instituicao_nome: params.nomeInstituicao,
        pergunta: params.pergunta,
        opcoes: params.opcoes,
        permitir_varias: params.permitirVarias,
        abrangencia,
        audiencia_total: bis.length,
        criada_por: params.criadaPor,
      })
      .select()
      .single();
    if (error || !data) return { ok: false, motivo: 'erro', mensagem: error?.message };

    // fan-out: uma mensagem por cidadão, corpo referenciado (não duplicado)
    const assunto = `Sondagem: ${params.pergunta.length > 80 ? params.pergunta.slice(0, 77) + '…' : params.pergunta}`;
    const linhas = params.opcoes.map((o, i) => `${String.fromCharCode(65 + i)}) ${o.texto}`).join('\n');
    const corpo =
      `${params.nomeInstituicao} convida-o(a) a participar na seguinte sondagem oficial:\n\n` +
      `${params.pergunta}\n\n${linhas}\n\n` +
      (params.permitirVarias
        ? 'Pode seleccionar várias opções. Abra a mensagem e toque em «Responder à Sondagem».'
        : 'Seleccione uma opção. Abra a mensagem e toque em «Responder à Sondagem».');
    const rows = bis.map((bi) => ({
      sender_bi: params.codigo,
      recipient_bi: bi,
      org: params.codigo,
      preview: assunto,
      status: 'Normal',
      subject: assunto,
      body: corpo,
      unread: true,
      sensitivity: 'Público',
      priority_scale: 'Normal',
      actions: [],
      attachments: [],
      sondagem_id: data.id,
    }));
    // insert em lotes de 25 (best-effort: falha parcial não anula a sondagem)
    for (let i = 0; i < rows.length; i += 25) {
      const { error: eMsg } = await supabase.from('messages').insert(rows.slice(i, i + 25));
      if (eMsg) console.warn('[Sondagens] difusão parcial:', eMsg.message);
    }
    return { ok: true, dados: { id: data.id, audiencia: bis.length } };
  } catch (e: any) {
    return { ok: false, motivo: 'erro', mensagem: String(e?.message || e) };
  }
};

// ---- Consulta (instituição) ------------------------------------------------------
export const listarSondagens = async (codigo: string): Promise<SondagemResultado<Sondagem[]>> => {
  try {
    if (!(await sondagensDisponiveis())) return { ok: false, motivo: 'sem_migracao' };
    const { data, error } = await supabase
      .from('sondagens')
      .select('*')
      .eq('instituicao_code', codigo)
      .order('id', { ascending: false });
    if (error) return { ok: false, motivo: 'erro', mensagem: error.message };
    return { ok: true, dados: (data || []) as Sondagem[] };
  } catch (e: any) {
    return { ok: false, motivo: 'erro', mensagem: String(e?.message || e) };
  }
};

export const resultadosSondagem = async (sondagemId: number): Promise<SondagemResultado<RespostaSondagem[]>> => {
  try {
    if (!(await sondagensDisponiveis())) return { ok: false, motivo: 'sem_migracao' };
    const { data, error } = await supabase
      .from('sondagem_respostas')
      .select('cidadao_bi, escolhas')
      .eq('sondagem_id', sondagemId);
    if (error) return { ok: false, motivo: 'erro', mensagem: error.message };
    return {
      ok: true,
      dados: (data || []).map((r: any) => ({ cidadao_bi: r.cidadao_bi, escolhas: (r.escolhas || []) as string[] })),
    };
  } catch (e: any) {
    return { ok: false, motivo: 'erro', mensagem: String(e?.message || e) };
  }
};

export const encerrarSondagem = async (sondagemId: number): Promise<SondagemResultado<null>> => {
  try {
    const { error } = await supabase.from('sondagens').update({ status: 'encerrada' }).eq('id', sondagemId);
    if (error) return { ok: false, motivo: 'erro', mensagem: error.message };
    return { ok: true, dados: null };
  } catch (e: any) {
    return { ok: false, motivo: 'erro', mensagem: String(e?.message || e) };
  }
};

// ---- Cidadão ------------------------------------------------------------------------
export const buscarSondagem = async (sondagemId: number): Promise<SondagemResultado<Sondagem>> => {
  try {
    if (!(await sondagensDisponiveis())) return { ok: false, motivo: 'sem_migracao' };
    const { data, error } = await supabase.from('sondagens').select('*').eq('id', sondagemId).maybeSingle();
    if (error || !data) return { ok: false, motivo: 'erro', mensagem: error?.message };
    return { ok: true, dados: data as Sondagem };
  } catch (e: any) {
    return { ok: false, motivo: 'erro', mensagem: String(e?.message || e) };
  }
};

export const minhaResposta = async (sondagemId: number, bi: string): Promise<SondagemResultado<string[]>> => {
  try {
    const { data, error } = await supabase
      .from('sondagem_respostas')
      .select('escolhas')
      .eq('sondagem_id', sondagemId)
      .eq('cidadao_bi', bi)
      .maybeSingle();
    if (error) return { ok: false, motivo: 'erro', mensagem: error.message };
    return { ok: true, dados: (data?.escolhas || []) as string[] };
  } catch (e: any) {
    return { ok: false, motivo: 'erro', mensagem: String(e?.message || e) };
  }
};

export const responderSondagem = async (
  sondagemId: number,
  bi: string,
  escolhas: string[],
): Promise<SondagemResultado<null>> => {
  try {
    const { error } = await supabase
      .from('sondagem_respostas')
      .upsert(
        { sondagem_id: sondagemId, cidadao_bi: bi, escolhas, updated_at: new Date().toISOString() },
        { onConflict: 'sondagem_id,cidadao_bi' },
      );
    if (error) return { ok: false, motivo: 'erro', mensagem: error.message };
    return { ok: true, dados: null };
  } catch (e: any) {
    return { ok: false, motivo: 'erro', mensagem: String(e?.message || e) };
  }
};
