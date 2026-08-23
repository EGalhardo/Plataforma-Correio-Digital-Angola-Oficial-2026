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

export interface Sondagem {
  id: number;
  instituicao_code: string;
  instituicao_nome: string;
  pergunta: string;
  opcoes: OpcaoSondagem[];
  permitir_varias: boolean;
  status: 'ativa' | 'encerrada';
  abrangencia: 'nacional' | 'local';
  audiencia_total: number;
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
