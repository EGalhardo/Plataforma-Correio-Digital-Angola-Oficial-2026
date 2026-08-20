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
