// Limpeza do estado local (browser) de uma conta de cidadão.
//
// Problema: parte dos dados do cidadão fica no localStorage sem dono (listas
// globais como «correio_digital_sent», «correio_digital_notifications»,
// «correio_digital_inbox», «correio_digital_faturas»), e outros por BI
// (selfie, B.I. digitalizado, leituras, palavras-passe). Quando a conta é
// eliminada e recriada, estes resíduos voltavam para a conta nova.
//
// Regras:
//  · apagarDadosLocaisDoBi(bi): ao ELIMINAR a conta (admin) — remove tudo o
//    que é do BI e filtra as listas globais pelo BI.
//  · apagarDadosLocaisDaConta(): ao REGISTAR uma conta nova neste dispositivo —
//    a conta nova começa sem nenhum estado local anterior.
//  · apagarMarcadoresDeEliminacao(bi): ao registar de novo o mesmo BI, retira as
//    marcas «eliminado/revogado» para a conta nova aparecer na consola.

const normBi = (v?: string | null): string => String(v || '').toUpperCase().replace(/\s+/g, '').trim();

const obterStorage = (): Storage | null => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
};

const CHAVES_GLOBAIS_DO_UTILIZADOR = [
  'correio_digital_inbox',
  'correio_digital_sent',
  'correio_digital_notifications',
  'correio_digital_faturas',
  'cda_ocorrencias_local',
  'cda_ocorrencias_deleted',
];

const PREFIXOS_DO_UTILIZADOR = [
  'cda_notifications_',
  'cda_hidden_messages_',
  'cda_deleted_messages_',
  'cda_ocorrencias_events_',
  'cda_ocorrencias_photos_',
];

const CHAVES_POR_BI = (bi: string): string[] => [
  `citizen_pass_${bi}`,
  `cda_read_msgs_${bi}`,
  `cda_demo_face_user_${bi}`,
  `cda_user_selfie_${bi}`,
  `cda_user_bi_frente_${bi}`,
  `cda_user_bi_verso_${bi}`,
  `cda_avatar_user_${bi}`,
  `cda_perfil_dados_user_${bi}`,
  `cda_hidden_messages_${bi}`,
  `cda_deleted_messages_${bi}`,
  `cda_notifications_${bi}`,
];

const filtrarListaLocal = (ls: Storage, chave: string, deveRemover: (item: any) => boolean): void => {
  try {
    const raw = ls.getItem(chave);
    if (!raw) return;
    const lista = JSON.parse(raw);
    if (!Array.isArray(lista)) return;
    const mantidos = lista.filter(item => !(item && deveRemover(item)));
    if (mantidos.length !== lista.length) ls.setItem(chave, JSON.stringify(mantidos));
  } catch {
    /* melhor esforço */
  }
};

/** Eliminação de conta: remove o estado local do BI e as entradas do BI nas listas globais. */
export const apagarDadosLocaisDoBi = (bi: string): void => {
  const ls = obterStorage();
  const b = normBi(bi);
  if (!ls || !b) return;
  for (const chave of Array.from(new Set([...CHAVES_POR_BI(b), ...CHAVES_POR_BI(String(bi))]))) {
    try { ls.removeItem(chave); } catch { /* ignora */ }
  }
  filtrarListaLocal(ls, 'correio_digital_sent', m => normBi(m.senderKey) === b);
  filtrarListaLocal(ls, 'correio_digital_notifications', n => normBi(n.ownerId) === b);
  filtrarListaLocal(ls, 'correio_digital_inbox', m =>
    normBi(m.recipientBi) === b || (m.homologation === true && normBi(m.homologationBi) === b));
};

/** Conta nova neste dispositivo: apaga as listas do utilizador anterior (globais e por dono). */
export const apagarDadosLocaisDaConta = (): void => {
  const ls = obterStorage();
  if (!ls) return;
  for (const chave of CHAVES_GLOBAIS_DO_UTILIZADOR) {
    try { ls.removeItem(chave); } catch { /* ignora */ }
  }
  try {
    const chaves: string[] = [];
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k && PREFIXOS_DO_UTILIZADOR.some(p => k.startsWith(p))) chaves.push(k);
    }
    chaves.forEach(k => { try { ls.removeItem(k); } catch { /* ignora */ } });
  } catch {
    /* melhor esforço */
  }
};

// Pertence ao titular: o próprio código, ou um agente dele (ex.: CÓDIGO-01, CÓDIGO-02).
const pertenceA = (valor: unknown, titular: string): boolean => {
  const v = normBi(typeof valor === 'string' ? valor : '');
  return !!v && (v === titular || v.startsWith(`${titular}-`));
};

/** Instituição: remove as chaves do código e as entradas do código (e agentes) nas listas globais. */
export const apagarDadosLocaisDaInstituicao = (codigo: string): void => {
  const ls = obterStorage();
  const c = normBi(codigo);
  if (!ls || !c) return;
  for (const chave of [`cda_notifications_${c}`, `cda_hidden_messages_${c}`, `cda_deleted_messages_${c}`, `cda_ai_stats_${c}`]) {
    try { ls.removeItem(chave); } catch { /* ignora */ }
  }
  filtrarListaLocal(ls, 'correio_digital_sent', m => pertenceA(m.senderKey, c));
  filtrarListaLocal(ls, 'correio_digital_notifications', n => pertenceA(n.ownerId, c));
  filtrarListaLocal(ls, 'correio_digital_inbox', m =>
    pertenceA(m.recipientInst, c) || (m.homologation === true && pertenceA(m.homologationBi, c)));
};

/** Registo de novo do mesmo BI: retira as marcas de eliminação/revogação locais. */
export const apagarMarcadoresDeEliminacao = (bi: string): void => {
  const ls = obterStorage();
  const b = normBi(bi);
  if (!ls || !b) return;
  for (const chave of [`cda_revoked_${b}`, `cda_deleted_${b}`]) {
    try { ls.removeItem(chave); } catch { /* ignora */ }
  }
};
