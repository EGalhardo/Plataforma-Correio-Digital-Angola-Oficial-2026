// ============================================================================
// Segurança de Login — Bloqueio Automático por Tentativas Falhadas
// ----------------------------------------------------------------------------
// Extraído do bloco de login do App.tsx (2026-08-22) para ser PARTILHADO:
// a página Equipa precisa de limpar o registo de tentativas quando o
// responsável ELIMINA um colaborador (eliminação total — a conta não pode
// deixar restos) e quando CRIA um novo (um Nº de agente reutilizado não pode
// herdar o bloqueio da conta anterior).
// ----------------------------------------------------------------------------
// Regras (FASE 1, 2026-08-15): 5 tentativas falhadas numa janela de 10 min
// bloqueiam o identificador durante 10 min (contador por identificador,
// persistido em localStorage em 'cda_login_attempts'; limpo em login com
// sucesso). O bloqueio é temporário e não substitui decisões do Admin.
// ============================================================================

const LOGIN_BLOQ_KEY = 'cda_login_attempts';

export interface LoginBloqueioInfo {
  bloqueado: boolean;
  tentativas: number;
  restanteMin: number;
}

interface RegistroTentativas {
  n?: number;
  inicio?: number;
  bloqueadoAte?: number;
}

const lerRegistros = (): Record<string, RegistroTentativas> => {
  try {
    const raw = localStorage.getItem(LOGIN_BLOQ_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return data && typeof data === 'object' ? (data as Record<string, RegistroTentativas>) : {};
  } catch {
    return {};
  }
};

const gravarRegistros = (data: Record<string, RegistroTentativas>): void => {
  try {
    localStorage.setItem(LOGIN_BLOQ_KEY, JSON.stringify(data));
  } catch {
    /* melhor esforço */
  }
};

/** Estado actual do identificador: bloqueado? quantas tentativas? quantos minutos restam? */
export const getLoginBloqueio = (ident: string): LoginBloqueioInfo => {
  try {
    const rec = lerRegistros()[ident];
    if (!rec) return { bloqueado: false, tentativas: 0, restanteMin: 0 };
    const agora = Date.now();
    if (rec.bloqueadoAte && agora < rec.bloqueadoAte) {
      return {
        bloqueado: true,
        tentativas: rec.n || 0,
        restanteMin: Math.ceil((rec.bloqueadoAte - agora) / 60000),
      };
    }
    return { bloqueado: false, tentativas: rec.n || 0, restanteMin: 0 };
  } catch {
    return { bloqueado: false, tentativas: 0, restanteMin: 0 };
  }
};

/** Regista UMA tentativa falhada (janela deslizante de 10 min; 5 falhas ⇒ bloqueio de 10 min). */
export const registarLoginFalha = (ident: string): void => {
  try {
    const data = lerRegistros();
    const agora = Date.now();
    const rec = data[ident] || { n: 0, inicio: agora };
    // janela deslizante de 10 min
    if (agora - (rec.inicio || 0) > 10 * 60 * 1000) {
      rec.n = 0;
      rec.inicio = agora;
    }
    rec.n = (rec.n || 0) + 1;
    if (rec.n >= 5) {
      rec.bloqueadoAte = agora + 10 * 60 * 1000;
      rec.n = 0;
    }
    data[ident] = rec;
    gravarRegistros(data);
  } catch {
    /* melhor esforço */
  }
};

/** Remove TODOS os registos do identificador (login com sucesso, eliminação ou criação de conta). */
export const limparLoginFalhas = (ident: string): void => {
  try {
    const data = lerRegistros();
    if (!(ident in data)) return;
    delete data[ident];
    gravarRegistros(data);
  } catch {
    /* melhor esforço */
  }
};
