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
import { cloudSignIn, provisionCloudAccount, isCloudBound, markCloudAccount, unmarkCloudAccount, syntheticInstitutionAgentEmail } from './cloudAuthService';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getLocalInstReg, normalizeInstCode, parseInstPack, splitAgentNumber,
  removeLocalInstReg,
  type LocalInstitutionRegistration
} from './institutionRegistrationStore';

export type InstitutionLoginOutcome = 'invalid' | 'deny' | 'restricted' | 'full';

export interface InstitutionIdentity {
  type: 'responsible' | 'member';
  memberId?: string;
  memberName?: string;
  mustChangePassword?: boolean;
  agentNumber?: string; // F6 — Nº Agente da pessoa autenticada (ex.: SME-LLVV-01)
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
  // A RPC e a tabela podem devolver variantes de maiúsculas, sem acento ou
  // estados internos em inglês. Normalizar aqui evita que "active"/"Ativa"
  // caiam no fallback pending e façam o indicador Online voltar a vermelho.
  const normalized = (status || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().toUpperCase();
  if (['APROVADO', 'APROVADA', 'ATIVO', 'ATIVA', 'ACTIVE', 'APPROVED'].includes(normalized)) return 'active';
  if (['REJEITADO', 'REJEITADA', 'REPROVADO', 'REPROVADA', 'NAO APROVADO', 'NAO APROVADA', 'REJECTED'].includes(normalized)) return 'rejected';
  if (['EM CORRECOES', 'CORRECAO', 'CORRECOES'].includes(normalized)) return 'correcao';
  if (['BLOQUEADO', 'BLOQUEADA', 'BLOCKED'].includes(normalized)) return 'blocked';
  return 'pending';
};
// F49: exportado para a sondagem viva institucional no App (mesma matriz).
export { mapRowStatus };

// ----------------------------------------------------------------------------
// F44 (Auditoria F42 · v15) — Reconhecimento pré-Auth da instituição.
// O SELECT directo em solicitacoes_registo MORREU com o selo RLS (o anónimo
// não vê a fila) → o login institucional passava a "não reconhecida" em
// qualquer dispositivo sem espelho local. A RPC security-definer devolve
// APENAS { nome, status } da linha do código exacto (sem listagem, sem dados
// sensíveis). Se a RPC ainda não existir (janela de deploy), cai no SELECT
// antigo (que devolve [] sob RLS) e no espelho local — sem quebrar.
// F49 — o resultado passa a ser um UNIÃO DISCRIMINADA: 'empty' (a RPC
// respondeu DEFINITIVAMENTE sem linha — base da revogação F47-institucional)
// distingue-se de 'unavailable' (RPC em falta/rede → via legada D3, nunca
// revoga por falso-positivo).
// ----------------------------------------------------------------------------
export type InstPreloginLookup =
  | { kind: 'found'; nome?: string; status?: string }
  | { kind: 'empty' }
  | { kind: 'unavailable' };

export const preloginLookupInstitution = async (supabase: SupabaseClient, code: string): Promise<InstPreloginLookup> => {
  if (!supabase?.rpc) return { kind: 'unavailable' };
  try {
    const { data, error } = await supabase.rpc('cda_prelogin_instituicao', { p_codigo: code });
    if (!error && Array.isArray(data) && data.length > 0 && data[0]) {
      return { kind: 'found', nome: data[0].nome, status: data[0].status };
    }
    // Linha inexistente na nuvem: 'empty' definitivo (o chamador avalia revogação)
    if (!error && Array.isArray(data) && data.length === 0) return { kind: 'empty' };
  } catch (e) {
    console.warn('[InstSession] RPC de pré-login indisponível (fallback local/legado):', e);
  }
  return { kind: 'unavailable' };
};

// F49 — purga dos vestígios LOCAIS de uma adesão institucional ELIMINADA
// (espelho do registo + credenciais da equipa, estado/correspondência de
// homologação, marcadores de nuvem dos Nº de agente e matrizes faciais).
export const purgeInstitutionLocalResidues = (
  codeRaw: string,
  reg?: LocalInstitutionRegistration,
): void => {
  const code = normalizeInstCode(codeRaw);
  if (!code) return;
  try { removeLocalInstReg(code); } catch { /* ignora */ }
  try { homologationStore.clearStatus(code); } catch { /* ignora */ }
  try { homologationStore.clearThread(code); } catch { /* ignora */ }
  const agentKeys = new Set<string>();
  if (reg?.agentNumber) agentKeys.add(normalizeInstCode(reg.agentNumber));
  (reg?.members || []).forEach(m => { if (m.agentNumber) agentKeys.add(normalizeInstCode(m.agentNumber)); });
  agentKeys.add(`${code}-01`); // responsável padrão (F6/B2), mesmo sem espelho
  agentKeys.forEach(a => { try { unmarkCloudAccount(a); } catch { /* ignora */ } });
  const faceTargets = new Set<string>([code, ...agentKeys]);
  faceTargets.forEach(k => {
    ['user', 'institution', 'admin'].forEach(m => {
      try { localStorage.removeItem(`cda_demo_face_${m}_${k}`); } catch { /* ignora */ }
    });
  });
  try { localStorage.removeItem(`cda_read_msgs_${code}`); } catch { /* ignora */ }
};

// F49 — regra de revogação (gémea de isRevokedDeletedAccount do cidadão):
// RPC definitivamente sem linha + prova de existência prévia neste dispositivo
// (espelho do registo, estado local de homologação ou marcador de nuvem do Nº
// Agente digitado) ⇒ a adesão foi ELIMINADA pelo Admin. Sem prova, é apenas um
// código nunca registado neste dispositivo — via "não reconhecida" intacta.
export const isRevokedDeletedInstitution = (
  pre: InstPreloginLookup,
  evidence: { hasLocalReg: boolean; hasLocalStatus: boolean; hasCloudMark: boolean },
): boolean =>
  pre.kind === 'empty' && (evidence.hasLocalReg || evidence.hasLocalStatus || evidence.hasCloudMark);

export const institutionEliminatedMessage = (code: string, name?: string): string =>
  `A adesão da instituição "${name || code}" (${code}) foi ELIMINADA pela Área de Administração. Para voltar a usar a plataforma, efectue um NOVO registo — a conta só ficará activa após nova homologação.`;

/**
 * F6/B6 — Login FACIAL da instituição: a face (já validada no dispositivo contra
 * o template registado na página Conta) substitui a senha como credencial da
 * pessoa identificada pelo Nº Agente. Mantém EXATAMENTE os mesmos gates da via
 * por senha (rejeitada/suspensa → deny; pendente/correções → restricted).
 */
export const resolveInstitutionFaceLogin = async (
  typedRaw: string,
  supabase?: SupabaseClient
): Promise<InstitutionLoginResult> => {
  const typed = normalizeInstCode(typedRaw);
  const { code: parsedCode, seq: agentSeq } = splitAgentNumber(typed);
  const code = agentSeq !== null ? parsedCode : typed;
  if (!code) {
    return { outcome: 'invalid', code, name: '', message: 'Introduza o Nº Agente Institucional.' };
  }

  const reg: LocalInstitutionRegistration | undefined = getLocalInstReg(code);
  let row: Record<string, string> | null = null;
  // F44 (v15): reconhecimento pré-Auth por RPC security-definer (devolve só nome+estado).
  // Guarda SEM `ready` (padrão do serviço): o cliente injectado decide — sem nuvem,
  // a RPC falha e cai no SELECT legado / espelho local (D3), sem quebrar.
  let preRow: { nome?: string; status?: string } | null = null;
  let preKind: InstPreloginLookup['kind'] = 'unavailable';
  if (supabase) {
    const pre = await preloginLookupInstitution(supabase, code);
    preKind = pre.kind;
    if (pre.kind === 'found') preRow = { nome: pre.nome, status: pre.status };
    if (!preRow) {
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
  }

  // F49 — ADESÃO ELIMINADA (regra F47 estendida às instituições): a RPC
  // security-definer respondeu DEFINITIVAMENTE sem linha e há prova de que a
  // adesão existiu neste dispositivo ⇒ o Admin eliminou-a: purgar vestígios e
  // recusar — o acesso só volta com NOVO registo (nasce Pendente, sem excepção).
  if (preKind === 'empty' && isRevokedDeletedInstitution({ kind: 'empty' }, {
    hasLocalReg: !!reg,
    hasLocalStatus: !!homologationStore.getStatus(code),
    hasCloudMark: agentSeq !== null && isCloudBound(typed),
  })) {
    purgeInstitutionLocalResidues(code, reg);
    return {
      outcome: 'deny', code, name: reg?.nome || code, status: 'rejected',
      message: institutionEliminatedMessage(code, reg?.nome),
    };
  }

  const name: string = row?.nome || preRow?.nome || reg?.nome || code;
  const pack = parseInstPack(row?.observacoes || reg?.observacoes || '');
  if (!reg && !row && !preRow) {
    return {
      outcome: 'invalid', code, name: '',
      message: `A instituição \"${code}\" não foi reconhecida. Confirme o seu Nº Agente Institucional.`
    };
  }

  // A face é a credencial: resolve a pessoa pelo Nº Agente (sem exigir senha)
  let identity: InstitutionIdentity | null = null;
  if (agentSeq !== null) {
    if (agentSeq === 1) {
      identity = { type: 'responsible', agentNumber: typed };
    } else if (reg) {
      const member = (reg.members || []).find(m => {
        const own = splitAgentNumber(m.agentNumber || '');
        return own.seq === agentSeq && own.code === code;
      });
      if (member) identity = { type: 'member', memberId: member.id, memberName: member.name, mustChangePassword: false, agentNumber: typed };
    }
  } else {
    // Formato antigo (código simples) → assume o responsável (via demo conservadora)
    identity = { type: 'responsible', agentNumber: reg?.agentNumber || pack?.agentNumber };
  }
  if (!identity) {
    return {
      outcome: 'invalid', code, name,
      message: `O Nº Agente \"${typed}\" não corresponde a nenhuma pessoa desta instituição.`
    };
  }

  const rec = homologationStore.getStatus(code);
  const fichaSuspensa = isInstitutionFichaSuspended(code);
  // A decisão administrativa persistida na nuvem é canónica. O espelho
  // local só é fallback offline e não pode sobrepor aprovação/rejeição remota.
  const persistedStatus = row?.status || preRow?.status;
  const status: HomologationStatus = persistedStatus
    ? mapRowStatus(persistedStatus)
    : (rec?.status || mapRowStatus(reg?.status));
  if (status === 'rejected') {
    return {
      outcome: 'deny', code, name, pack, status,
      message: `A adesão da instituição \"${name}\" (${code}) foi REJEITADA pela Área de Administração.${rec?.reason ? ` Motivo: \"${rec.reason}\".` : ''}`
    };
  }
  if (status === 'blocked' || fichaSuspensa) {
    return {
      outcome: 'deny', code, name, pack, status: 'blocked',
      message: `A conta da instituição \"${name}\" (${code}) encontra-se SUSPENSA pela Área de Administração.${rec?.reason ? ` Motivo: \"${rec.reason}\".` : ''}`
    };
  }
  if (status === 'pending' || status === 'correcao') {
    return { outcome: 'restricted', code, name, pack, identity, status };
  }
  return { outcome: 'full', code, name, pack, identity, status: 'active' };
};

export const resolveInstitutionLogin = async (
  codeRaw: string,
  password: string,
  supabase?: SupabaseClient
): Promise<InstitutionLoginResult> => {
  const typed = normalizeInstCode(codeRaw);
  // F6/B3: o campo recebe o Nº Agente Institucional (SME-LLVV-01). Códigos antigos
  // (ENDE01) e o demo (AGT-9921-SR) chegam sem sufixo NN → via legada (C4).
  const { code: parsedCode, seq: agentSeq } = splitAgentNumber(typed);
  const code = agentSeq !== null ? parsedCode : typed;
  if (!code) {
    return { outcome: 'invalid', code, name: '', message: 'Introduza o Nº Agente Institucional.' };
  }

  // 1. Localizar o registo: espelho local primeiro, nuvem depois
  const reg: LocalInstitutionRegistration | undefined = getLocalInstReg(code);
  let row: Record<string, string> | null = null;
  // F44 (v15): reconhecimento pré-Auth por RPC security-definer (devolve só nome+estado).
  // Guarda SEM `ready` (padrão do serviço): o cliente injectado decide — sem nuvem,
  // a RPC falha e cai no SELECT legado / espelho local (D3), sem quebrar.
  let preRow: { nome?: string; status?: string } | null = null;
  let preKind: InstPreloginLookup['kind'] = 'unavailable';
  if (supabase) {
    const pre = await preloginLookupInstitution(supabase, code);
    preKind = pre.kind;
    if (pre.kind === 'found') preRow = { nome: pre.nome, status: pre.status };
    if (!preRow) {
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
  }

  // F49 — ADESÃO ELIMINADA (regra F47 estendida às instituições): idêntica à
  // via facial — RPC definitivamente sem linha + prova de existência prévia ⇒
  // purgar vestígios e recusar (antes, o espelho local mantinha acesso FULL).
  if (preKind === 'empty' && isRevokedDeletedInstitution({ kind: 'empty' }, {
    hasLocalReg: !!reg,
    hasLocalStatus: !!homologationStore.getStatus(code),
    hasCloudMark: agentSeq !== null && isCloudBound(typed),
  })) {
    purgeInstitutionLocalResidues(code, reg);
    return {
      outcome: 'deny', code, name: reg?.nome || code, status: 'rejected',
      message: institutionEliminatedMessage(code, reg?.nome),
    };
  }

  if (!reg && !row && !preRow) {
    return {
      outcome: 'invalid', code, name: '',
      message: `O Código Institucional "${code}" não foi reconhecido. Confirme o código recebido no registo ou registe a instituição.`
    };
  }

  // F44 (v15): `let` — a re-hidratação pós-Auth (abaixo) pode chegar aos dados
  // completos DEPOIS desta primeira composição pré-Auth (nome via RPC/local).
  let name: string = row?.nome || preRow?.nome || reg?.nome || code;
  let pack = parseInstPack(row?.observacoes || reg?.observacoes || '');

  // 2. A senha confirma a PESSOA (F6/C5: o NN do agente identifica; a senha valida essa pessoa)
  let identity: InstitutionIdentity | null = null;
  const respPasswordOk = (!!row && row.password_hash === password) || (!!reg && reg.password === password);

  // F32 (v12/D4-a) — NUVEM PRIMEIRO para Nº Agente explícito: a senha vive no
  // Supabase Auth. Nuvem ok => identidade resolvida pela nuvem; nuvem recusa com
  // conta já migrada => tentativa local de TRANSIÇÃO (até F-c); nuvem em baixo =>
  // validação local de emergência (D3). Via legada (código sem NN) não muda.
  const cloudAgentEmail = agentSeq !== null ? syntheticInstitutionAgentEmail(typed) : '';
  const cloudAgentMarked = agentSeq !== null ? isCloudBound(typed) : false;
  // Guarda SEM `ready`: o cliente injectado decide (testes tsx não têm import.meta.env);
  // sem configuração a chamada falha => 'unavailable' => fallback local D3.
  if (supabase && agentSeq !== null) {
    const cloudRes = await cloudSignIn(supabase, cloudAgentEmail, password);
    if (cloudRes.outcome === 'ok') {
      if (!cloudAgentMarked) markCloudAccount(typed, cloudAgentEmail, 'instituicao');
      // F44 (v15) — RE-HIDRATAÇÃO PÓS-AUTH: autenticado, a linha da fila passa
      // a ser visível pela própria RLS → num dispositivo novo recuperam-se os
      // dados completos (nome do formulário e InstPack das observações).
      if (!row && supabase) {
        try {
          const { data: fullRow } = await supabase
            .from('solicitacoes_registo')
            .select('*')
            .eq('bi_numero', code)
            .maybeSingle();
          if (fullRow) {
            row = fullRow;
            if (fullRow.nome) name = fullRow.nome;
            const fullPack = parseInstPack(fullRow.observacoes || '');
            if (fullPack) pack = fullPack;
          }
        } catch { /* best-effort: já se entrou com dados pré-Auth */ }
      }
      if (agentSeq === 1) {
        identity = { type: 'responsible', agentNumber: typed };
      } else if (reg) {
        const cloudMember = (reg.members || []).find(m => { const own = splitAgentNumber(m.agentNumber || ''); return own.seq === agentSeq && own.code === code; });
        if (cloudMember) identity = { type: 'member', memberId: cloudMember.id, memberName: cloudMember.name, mustChangePassword: !!cloudMember.mustChangePassword, agentNumber: typed };
      }
      if (!identity && cloudRes.metadata?.name && agentSeq !== 1) {
        // Login noutro dispositivo sem espelho local: metadados do Auth identificam a pessoa
        identity = { type: 'member', memberName: String(cloudRes.metadata.name), mustChangePassword: false, agentNumber: typed };
      }
      if (!identity) {
        return {
          outcome: 'invalid', code, name,
          message: `O Nº Agente \"${typed}\" não corresponde a nenhuma pessoa desta instituição.`
        };
      }
    } else if (cloudRes.outcome === 'invalid' && cloudAgentMarked) {
      console.warn('[AUTH-CLOUD] Nuvem recusou as credenciais de', typed, '— tentativa local de TRANSIÇÃO (válida até à reposição assistida F-c).');
    } else if (cloudRes.outcome === 'unavailable') {
      console.warn('[AUTH-CLOUD] Nuvem indisponível para', typed, '— validação local de emergência (D3).');
    }
  }

  if (!identity) {
  if (agentSeq !== null) {
    // Via nova: Nº Agente explícito
    if (agentSeq === 1) {
      if (respPasswordOk) identity = { type: 'responsible', agentNumber: typed };
    } else if (reg) {
      const member = (reg.members || []).find(m => {
        const own = splitAgentNumber(m.agentNumber || '');
        return own.seq === agentSeq && own.code === code;
      });
      if (member && member.password === password && password.length > 0) {
        identity = { type: 'member', memberId: member.id, memberName: member.name, mustChangePassword: !!member.mustChangePassword, agentNumber: typed };
      }
    }
    if (!identity) {
      return {
        outcome: 'invalid', code, name,
        message: 'Credenciais incorrectas: a senha não corresponde a este Nº Agente Institucional.'
      };
    }
  } else {
    // Via legada (código sem NN): a senha identifica a pessoa — comportamento F3 mantido
    if (respPasswordOk) {
      identity = { type: 'responsible', agentNumber: reg?.agentNumber || (parseInstPack(row?.observacoes || reg?.observacoes || '')?.agentNumber) };
    } else if (reg) {
      const member = (reg.members || []).find(m => m.password === password && password.length > 0);
      if (member) identity = { type: 'member', memberId: member.id, memberName: member.name, mustChangePassword: !!member.mustChangePassword, agentNumber: member.agentNumber };
    }
    if (!identity) {
      return {
        outcome: 'invalid', code, name,
        message: 'Credenciais incorrectas: a senha não corresponde a nenhuma credencial activa desta instituição.'
      };
    }
  }
  }

  // F32 (D2) — MIGRAÇÃO JUST-IN-TIME institucional: credencial local válida +
  // nuvem disponível + agente explícito ainda não migrado => provisiona já.
  if (identity && supabase && agentSeq !== null && !cloudAgentMarked) {
    const jitProv = await provisionCloudAccount(supabase, {
      email: cloudAgentEmail,
      password,
      metadata: { agent: typed, instituicao: code, name: identity.memberName || name, role: 'instituicao' },
    });
    if (jitProv.outcome === 'ok' || jitProv.outcome === 'linked_existing') {
      markCloudAccount(typed, cloudAgentEmail, 'instituicao');
      console.warn(`[AUTH-CLOUD] Migração just-in-time (D2): agente institucional ${typed} provisionado na nuvem.`);
    }
  }

  // 3. Estado da instituição (homologação local ganha; depois ficha suspensa; depois linha)
  const rec = homologationStore.getStatus(code);
  const fichaSuspensa = isInstitutionFichaSuspended(code);
  // A decisão administrativa persistida na nuvem é canónica. O espelho
  // local só é fallback offline e não pode sobrepor aprovação/rejeição remota.
  const persistedStatus = row?.status || preRow?.status;
  const status: HomologationStatus = persistedStatus
    ? mapRowStatus(persistedStatus)
    : (rec?.status || mapRowStatus(reg?.status));

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
