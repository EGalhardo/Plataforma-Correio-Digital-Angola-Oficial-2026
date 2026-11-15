/**
 * institutionService — acesso à tabela `public.institutions` (Supabase).
 *
 * 2026-11-15 — As instituições viviam apenas em
 * `localStorage['correio_digital_institutions']`, semeadas a partir do
 * catálogo do código (MOCK_INSTITUTIONS). Criar/editar/eliminar não saía do
 * browser: noutro dispositivo a instituição não existia.
 *
 * Este serviço é a ponte com a base: mapeia snake_case (SQL) ↔ camelCase
 * (Institution do TypeScript) e devolve null quando não há nuvem — o chamador
 * decide o que mostrar, em vez de inventar dados.
 */
import { supabase } from '../lib/supabaseClient';
import { isSupabaseConfigured } from './cloudAuthService';
import { Institution, InstitutionStatus } from '../types';

/** Linha crua de public.institutions. */
interface LinhaInstituicao {
  id: string;
  name: string;
  full_name: string | null;
  inst_code: string | null;
  type_inst: string | null;
  category: string | null;
  province: string | null;
  municipio: string | null;
  cidade: string | null;
  comuna: string | null;
  address: string | null;
  status: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  responsible_name: string | null;
  responsible_role: string | null;
  total_correspondence: number | null;
  total_agents: number | null;
  ai_usage_rate: string | null;
  performance_score: string | null;
  response_rate: string | null;
  registration_date: string | null;
}

/** Linha da base → objecto da aplicação. */
export const linhaParaInstituicao = (l: LinhaInstituicao): Institution => ({
  id: l.id,
  name: l.name || '',
  fullName: l.full_name || l.name || 'Instituição',
  category: l.category || 'Serviços',
  province: l.province || '—',
  municipio: l.municipio || '—',
  status: (l.status as InstitutionStatus) || InstitutionStatus.ATIVA,
  totalCorrespondence: l.total_correspondence ?? 0,
  totalAgents: l.total_agents ?? 0,
  lastActivity: '—',
  responseRate: l.response_rate || '—',
  registrationDate: l.registration_date || '—',
  aiUsageRate: l.ai_usage_rate || '0%',
  performanceScore: l.performance_score || '—',
  contactEmail: l.contact_email || undefined,
  contactPhone: l.contact_phone || undefined,
  responsibleName: l.responsible_name || undefined,
  responsibleRole: l.responsible_role || undefined,
  instCode: l.inst_code || undefined,
  typeInst: l.type_inst || undefined,
  cidade: l.cidade || undefined,
  comuna: l.comuna || undefined,
});

/** Objecto da aplicação → payload de escrita (só colunas que existem). */
export const instituicaoParaLinha = (i: Partial<Institution>) => {
  const out: Record<string, unknown> = {};
  const põe = (k: string, v: unknown) => { if (v !== undefined) out[k] = v; };
  põe('name', i.name);
  põe('full_name', i.fullName);
  põe('inst_code', i.instCode);
  põe('type_inst', i.typeInst);
  põe('category', i.category);
  põe('province', i.province);
  põe('municipio', i.municipio);
  põe('cidade', i.cidade);
  põe('comuna', i.comuna);
  põe('status', i.status);
  põe('contact_email', i.contactEmail);
  põe('contact_phone', i.contactPhone);
  põe('responsible_name', i.responsibleName);
  põe('responsible_role', i.responsibleRole);
  põe('total_correspondence', i.totalCorrespondence);
  põe('total_agents', i.totalAgents);
  põe('ai_usage_rate', i.aiUsageRate);
  põe('performance_score', i.performanceScore);
  põe('response_rate', i.responseRate);
  põe('registration_date', i.registrationDate);
  return out;
};

const nuvemDisponivel = () => isSupabaseConfigured() && !!supabase;

/** Lê todas as instituições. Devolve null se a nuvem não estiver acessível. */
export const listarInstituicoes = async (): Promise<Institution[] | null> => {
  if (!nuvemDisponivel()) return null;
  try {
    const { data, error } = await supabase
      .from('institutions')
      .select('*')
      .order('name', { ascending: true });
    if (error) {
      console.warn('[INSTITUIÇÕES] leitura da base falhou:', error.message);
      return null;
    }
    return ((data || []) as LinhaInstituicao[]).map(linhaParaInstituicao);
  } catch (e) {
    console.warn('[INSTITUIÇÕES] leitura da base falhou:', e);
    return null;
  }
};

/** Cria uma instituição. Devolve a linha criada, ou null em caso de falha. */
export const criarInstituicao = async (i: Omit<Institution, 'id'>): Promise<Institution | null> => {
  if (!nuvemDisponivel()) return null;
  try {
    const { data, error } = await supabase
      .from('institutions')
      .insert(instituicaoParaLinha(i))
      .select('*')
      .single();
    if (error) { console.warn('[INSTITUIÇÕES] criação falhou:', error.message); return null; }
    return linhaParaInstituicao(data as LinhaInstituicao);
  } catch (e) { console.warn('[INSTITUIÇÕES] criação falhou:', e); return null; }
};

/** Actualiza por id. Devolve true quando a base confirma. */
export const actualizarInstituicao = async (id: string, campos: Partial<Institution>): Promise<boolean> => {
  if (!nuvemDisponivel()) return false;
  try {
    const { error } = await supabase
      .from('institutions')
      .update(instituicaoParaLinha(campos))
      .eq('id', id);
    if (error) { console.warn('[INSTITUIÇÕES] actualização falhou:', error.message); return false; }
    return true;
  } catch (e) { console.warn('[INSTITUIÇÕES] actualização falhou:', e); return false; }
};

/** Elimina por id. Devolve true quando a base confirma. */
export const eliminarInstituicao = async (id: string): Promise<boolean> => {
  if (!nuvemDisponivel()) return false;
  try {
    const { error } = await supabase.from('institutions').delete().eq('id', id);
    if (error) { console.warn('[INSTITUIÇÕES] eliminação falhou:', error.message); return false; }
    return true;
  } catch (e) { console.warn('[INSTITUIÇÕES] eliminação falhou:', e); return false; }
};

/**
 * Semeia a tabela com o catálogo, uma única vez.
 * Só escreve quando a tabela está VAZIA — nunca duplica nem sobrepõe o que o
 * administrador já criou. Devolve o número de linhas inseridas.
 */
export const semearInstituicoes = async (catalogo: Institution[]): Promise<number> => {
  if (!nuvemDisponivel()) return 0;
  try {
    const { count, error } = await supabase
      .from('institutions')
      .select('id', { count: 'exact', head: true });
    if (error) { console.warn('[INSTITUIÇÕES] contagem falhou:', error.message); return 0; }
    if ((count ?? 0) > 0) return 0; // já tem dados — não toca

    const linhas = catalogo.map((i) => instituicaoParaLinha(i));
    const { error: errIns } = await supabase.from('institutions').insert(linhas);
    if (errIns) { console.warn('[INSTITUIÇÕES] semeadura falhou:', errIns.message); return 0; }
    return linhas.length;
  } catch (e) { console.warn('[INSTITUIÇÕES] semeadura falhou:', e); return 0; }
};
