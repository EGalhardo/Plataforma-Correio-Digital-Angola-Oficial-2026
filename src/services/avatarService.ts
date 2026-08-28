// ============================================================================
// Persistência do avatar de perfil (2026-08-20)
// ----------------------------------------------------------------------------
// A foto escolhida no Perfil era guardada APENAS no estado da sessão — no
// login seguinte a hidratação reaplicava a selfie KYC/face antiga (conta real)
// ou a foto canónica (conta demo) e a nova foto revertia. Agora o avatar fica:
//   1) localStorage POR CONTA (sobrevive a sair/entrar no mesmo dispositivo,
//      inclusive nas contas demo — sem contaminar outras contas: chave por BI);
//   2) user_metadata do Supabase Auth (contas reais — sobrevive a dispositivos;
//      data-URLs ficam apenas locais para não inchar os metadados).
// ============================================================================
import { supabase } from '../lib/supabaseClient';

const chaveLocal = (modo: 'user' | 'institution' | 'admin', ident: string): string =>
  `cda_avatar_${modo}_${String(ident || '').toUpperCase().replace(/\s+/g, '')}`;

/** Guarda o avatar do utilizador (local + Auth metadata quando aplicável). */
export const guardarAvatar = (modo: 'user' | 'institution' | 'admin', ident: string, url: string): void => {
  if (!url) return;
  try {
    localStorage.setItem(chaveLocal(modo, ident), url);
  } catch { /* melhor esforço */ }
  try {
    if (url.startsWith('data:')) return; // data-URL fica só local
    void supabase.auth.updateUser({ data: { avatar_url: url } })
      .then(({ error }) => {
        if (error) console.warn('[AVATAR] Falha ao gravar no Auth:', error.message);
      })
      .catch(() => { /* melhor esforço */ });
  } catch { /* melhor esforço */ }
};

/** Lê o avatar guardado neste dispositivo para a conta indicada. */
export const lerAvatarLocal = (modo: 'user' | 'institution' | 'admin', ident: string): string => {
  try { return localStorage.getItem(chaveLocal(modo, ident)) || ''; } catch { return ''; }
};

/** Lê o avatar persistido no user_metadata do Auth (conta real). */
export const lerAvatarAuth = async (): Promise<string> => {
  try {
    const { data } = await supabase.auth.getUser();
    const url = data?.user?.user_metadata?.avatar_url;
    return typeof url === 'string' && url ? url : '';
  } catch { return ''; }
};

// v37.68 — detector ÚNICO da foto placeholder/demo (Edlasio + genéricas).
// Antes cada componente tinha a sua lista incompleta: o InstitutionProfile
// apanhava «Y92CFNC5», mas o sessionStore e o Header não — e uma conta
// institucional nova mostrava a foto do Edlasio. Qualquer URL destes padrões
// conta como «sem foto própria»: em instituição/admin mostra-se o círculo azul
// com as iniciais; só o cidadão demo (Edlasio) a pode exibir legitimamente.
const PADROES_PLACEHOLDER = [
  'foto-edlasio', 'foto_perfil_edlasio', 'edlasio',
  'unsplash', 'postimg', 'sxwsygx2', 'y92cfnc5',
];
export const isPlaceholderAvatar = (url: string | null | undefined): boolean => {
  if (!url) return true; // sem URL = sem foto
  const u = String(url).toLowerCase();
  if (u.startsWith('data:image/svg')) return false; // avatar neutro (iniciais) é válido
  return PADROES_PLACEHOLDER.some((p) => u.includes(p));
};
