// ============================================================================
// Serviço de Sessão Institucional — Correio Digital Angola
// ----------------------------------------------------------------------------
// Resolve o login da área Instituição por **Código Institucional + Senha**:
//  · O Código identifica a INSTITUIÇÃO (o seu "B.I.", guardado em bi_numero).
//  · A Senha identifica a PESSOA: a do responsável (cloud, password_hash) ou a
//    de um colaborador (senhas locais da equipa — vêm da F4).
//  · Classifica o resultado: deny (rejeitada/suspensa/inactiva) | restricted
//    (pendente/em correções → entra com funcionalidades bloqueadas) | full.
// ============================================================================

import { homologationStore, type HomologationStatus } from './homologationStore';
import {
  getLocalInstReg, normalizeInstCode, parseInstPack,
  type LocalInstitutionRegistration
} from './institutionRegistrationStore';

export type InstitutionLoginOutcome = 'invalid' | 'deny' | 'restricted' | 'full';

export interface InstitutionIdentity {
  type: 'responsible' | 'member';
  memberId?: string;
  memberName?: string;
  mustChangePassword?: boolean;
}

export interface InstitutionLoginResult {
  outcome: InstitutionLoginOutcome;
  code: string;
  name: string;
  message?: string;
  identity?: InstitutionIdentity;
  status?: HomologationStatus | 'Pendente' | 'Aprovado' | 'Rejeitado' | 'Em Correções';
  pack?: ReturnType<typeof parseInstPack>;
}

/** Lê a ficha (lista `correio_digital_institutions`) e diz se está suspensa/inactiva. */
export const isInstitutionFichaSuspended = (code: string): boolean => {
  try {
    const raw = localStorage.getItem('correio_digital_institutions');
    if (!raw) return false;
    const list = JSON.parse(raw) as { instCode?: string; status?: string }[];
    const ficha = list.find(i => normalizeInstCode(i.instCode || '') === normalizeInstCode(code));
    return !!ficha && ficha.status !== 'Ativa';
  } catch { return false; }
};

const mapRowStatus = (status?: string): HomologationStatus => {
  if (status === 'Aprovado') return 'active';
  if (status === 'Rejeitado' || status === 'Reprovado' || status === 'Não Aprovado') return 'rejected';
  if (status === 'Em Correções') return 'correcao';
  return 'pending';
};

export const resolveInstitutionLogin = async (
  codeRaw: string,
  password: string,
  supabase?: any
): Promise<InstitutionLoginResult> => {
  const code = normalizeInstCode(codeRaw);
  if (!code) {
    return { outcome: 'invalid', code, name: '', message: 'Introduza o Código Institucional.' };
  }

  // 1. Localizar o registo: espelho local primeiro, nuvem depois
  const reg: LocalInstitutionRegistration | undefined = getLocalInstReg(code);
  let row: any = null;
  const ready = (import.meta as any).env?.VITE_SUPABASE_URL && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
  if (ready && supabase) {
    try {
      const { data, error } = await supabase
        .from('solicitacoes_registo')
        .select('*')
        .eq('bi_numero', code)
        .maybeSingle();
      if (!error) row = data;
    } catch (e) {
      console.warn('[InstSession] Consulta cloud indisponível:', e);
    }
  }

  if (!reg && !row) {
    return {
      outcome: 'invalid', code, name: '',
      message: `O Código Institucional "${code}" não foi reconhecido. Confirme o código recebido no registo ou registe a instituição.`
    };
  }

  const name: string = row?.nome || reg?.nome || code;
  const pack = parseInstPack(row?.observacoes || reg?.observacoes || '');

  // 2. A senha identifica a PESSOA
  let identity: InstitutionIdentity | null = null;
  if ((row && row.password_hash === password) || (reg && reg.password === password)) {
    identity = { type: 'responsible' };
  } else if (reg) {
    const member = (reg.members || []).find(m => m.password === password && password.length > 0);
    if (member) identity = { type: 'member', memberId: member.id, memberName: member.name, mustChangePassword: !!member.mustChangePassword };
  }
  if (!identity) {
    return {
      outcome: 'invalid', code, name,
      message: 'Credenciais incorrectas: a senha não corresponde a nenhuma credencial activa desta instituição.'
    };
  }

  // 3. Estado da instituição (homologação local ganha; depois ficha suspensa; depois linha)
  const rec = homologationStore.getStatus(code);
  const fichaSuspensa = isInstitutionFichaSuspended(code);
  const status: HomologationStatus = rec?.status || mapRowStatus(row?.status || reg?.status);

  if (status === 'rejected') {
    return {
      outcome: 'deny', code, name, pack, status,
      message: `A adesão da instituição "${name}" (${code}) foi REJEITADA pela Área de Administração.${rec?.reason ? ` Motivo: "${rec.reason}".` : ''} Contacte a Administração caso considere um engano.`
    };
  }
  if (status === 'blocked' || fichaSuspensa) {
    return {
      outcome: 'deny', code, name, pack, status: 'blocked',
      message: `A conta da instituição "${name}" (${code}) encontra-se SUSPENSA pela Área de Administração.${rec?.reason ? ` Motivo: "${rec.reason}".` : ''} Os acessos ficam indisponíveis até reactivação.`
    };
  }
  if (status === 'pending' || status === 'correcao') {
    return { outcome: 'restricted', code, name, pack, identity, status };
  }
  return { outcome: 'full', code, name, pack, identity, status: 'active' };
};
