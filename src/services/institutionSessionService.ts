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
import { cloudSignIn, provisionCloudAccount, isCloudBound, markCloudAccount, syntheticInstitutionAgentEmail } from './cloudAuthService';
import {
  getLocalInstReg, normalizeInstCode, parseInstPack, splitAgentNumber,
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
  if (status === 'Aprovado') return 'active';
  if (status === 'Rejeitado' || status === 'Reprovado' || status === 'Não Aprovado') return 'rejected';
  if (status === 'Em Correções') return 'correcao';
  // F44 (v15): o bloqueio administrativo lido da fila passa a valer também
  // cross-device (antes só no dispositivo onde o admin actuou).
  if (status === 'Bloqueado') return 'blocked';
  return 'pending';
};

// ----------------------------------------------------------------------------
// F44 (Auditoria F42 · v15) — Reconhecimento pré-Auth da instituição.
// O SELECT directo em solicitacoes_registo MORREU com o selo RLS (o anónimo
// não vê a fila) → o login institucional passava a "não reconhecida" em
// qualquer dispositivo sem espelho local. A RPC security-definer devolve
// APENAS { nome, status } da linha do código exacto (sem listagem, sem dados
// sensíveis). Se a RPC ainda não existir (janela de deploy), cai no SELECT
// antigo (que devolve [] sob RLS) e no espelho local — sem quebrar.
// ----------------------------------------------------------------------------
const preloginLookupInstitution = async (supabase: any, code: string): Promise<{ nome?: string; status?: string } | null> => {
  if (!supabase?.rpc) return null;
  try {
    const { data, error } = await supabase.rpc('cda_prelogin_instituicao', { p_codigo: code });
    if (!error && Array.isArray(data) && data.length > 0 && data[0]) {
      return { nome: data[0].nome, status: data[0].status };
    }
    // Linha inexistente na nuvem: null (o chamador distingue "não reconhecida")
    if (!error && Array.isArray(data) && data.length === 0) return null;
  } catch (e) {
    console.warn('[InstSession] RPC de pré-login indisponível (fallback local/legado):', e);
  }
  return null;
};

/**
 * F6/B6 — Login FACIAL da instituição: a face (já validada no dispositivo contra
 * o template registado na página Conta) substitui a senha como credencial da
 * pessoa identificada pelo Nº Agente. Mantém EXATAMENTE os mesmos gates da via
 * por senha (rejeitada/suspensa → deny; pendente/correções → restricted).
 */
export const resolveInstitutionFaceLogin = async (
  typedRaw: string,
  supabase?: any
): Promise<InstitutionLoginResult> => {
  const typed = normalizeInstCode(typedRaw);
  const { code: parsedCode, seq: agentSeq } = splitAgentNumber(typed);
  const code = agentSeq !== null ? parsedCode : typed;
  if (!code) {
    return { outcome: 'invalid', code, name: '', message: 'Introduza o Nº Agente Institucional.' };
  }

  const reg: LocalInstitutionRegistration | undefined = getLocalInstReg(code);
  let row: any = null;
  // F44 (v15): reconhecimento pré-Auth por RPC security-definer (devolve só nome+estado).
  // Guarda SEM `ready` (padrão do serviço): o cliente injectado decide — sem nuvem,
  // a RPC falha e cai no SELECT legado / espelho local (D3), sem quebrar.
  let preRow: { nome?: string; status?: string } | null = null;
  if (supabase) {
    preRow = await preloginLookupInstitution(supabase, code);
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
  const status: HomologationStatus = rec?.status || mapRowStatus(row?.status || reg?.status || preRow?.status);
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
  supabase?: any
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
  let row: any = null;
  // F44 (v15): reconhecimento pré-Auth por RPC security-definer (devolve só nome+estado).
  // Guarda SEM `ready` (padrão do serviço): o cliente injectado decide — sem nuvem,
  // a RPC falha e cai no SELECT legado / espelho local (D3), sem quebrar.
  let preRow: { nome?: string; status?: string } | null = null;
  if (supabase) {
    preRow = await preloginLookupInstitution(supabase, code);
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
  const status: HomologationStatus = rec?.status || mapRowStatus(row?.status || reg?.status || preRow?.status);

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
