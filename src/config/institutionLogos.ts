// ============================================================================
// Catálogo de logomarcas institucionais — Ficha Institucional (Área do Cidadão)
// ----------------------------------------------------------------------------
// Fonte ÚNICA e escalável das logomarcas por instituição. Para adicionar ou
// alterar uma logomarca, basta editar esta tabela — o componente da Ficha
// Institucional (InstitutionLogo) NÃO precisa de mudanças.
//
//   • As chaves são os NOMES usados na seleção (ex.: 'AGT', 'SME', 'ENDE',
//     'Polícia Nacional', 'Seguro Social', ...) — iguais aos de
//     INSTITUTION_FULL_NAMES na InstitutionDetail.
//   • O valor é o URL da logomarca oficial (object-fit: contain, proporções
//     originais respeitadas). Pode ser URL externa ou data-URI.
//   • Instituições SEM entrada (ou com URL vazio) usam o placeholder
//     institucional elegante com a sigla — nunca imagem quebrada.
//
// Exemplo de adição futura (sem tocar no componente):
//   'AGT': 'https://.../logo-agt.png',
//   'SME': 'https://.../logo-sme.png',
// ============================================================================

/** Mapa nome → URL da logomarca oficial. */
export const INSTITUTION_LOGOS: Record<string, string> = {
  // --- Logomarcas oficiais fornecidas pelo dono (2026-08-27) ---
  // As chaves são EXACTAMENTE os nomes da lista de «Instituições Conectadas»
  // (HomeContent.tsx) que alimentam a Ficha Institucional. 'Administradoras'
  // fica de propósito sem entrada: ainda não há logomarca oficial e o
  // componente apresenta o placeholder com a sigla.
  'INAPEM': 'https://i.postimg.cc/PPTSmsXf/Inapem.jpg',
  'SME': 'https://i.postimg.cc/9Df1ndwN/sme.png',
  'AGT': 'https://i.postimg.cc/BtxhLQ0s/AGT.jpg',
  'ENDE': 'https://i.postimg.cc/rzSh0FLY/ENDE.jpg',
  'EPAL': 'https://i.postimg.cc/bdQ6DNhh/EPAL.jpg',
  'Tribunal': 'https://i.postimg.cc/w1BFGXRf/Tribunal.webp',
  'Hospital': 'https://i.postimg.cc/234Hb8DC/Hospital.jpg',
  'Ministerios': 'https://i.postimg.cc/N5Bd1qsf/Ministerio.png',
  'Polícia Nacional': 'https://i.postimg.cc/yDrn4DFH/Policia-Nacional.jpg',
  'Notário': 'https://i.postimg.cc/w3hWyTd2/Administracao.jpg',
  'Registo Civil': 'https://i.postimg.cc/w3hWyTd2/Administracao.jpg',
  'Seguro Social': 'https://i.postimg.cc/sM2KNYGw/Seguranca-Social.jpg',
  'INE': 'https://i.postimg.cc/CzScjThF/INE.jpg',
};

/**
 * Devolve o URL da logomarca para o nome da instituição (case-insensitive),
 * ou undefined se não houver registada.
 */
export const getInstitutionLogoUrl = (name: string | undefined | null): string | undefined => {
  if (!name) return undefined;
  const limpo = name.trim();
  if (INSTITUTION_LOGOS[limpo]) return INSTITUTION_LOGOS[limpo];
  const chave = Object.keys(INSTITUTION_LOGOS).find(
    (k) => k.toLowerCase() === limpo.toLowerCase(),
  );
  return chave ? INSTITUTION_LOGOS[chave] : undefined;
};

/**
 * Sigla apresentável da instituição (para o placeholder) — extrai as iniciais
 * das palavras principais. Ex.: 'Administração Geral Tributária' → 'AGT';
 * 'Polícia Nacional de Angola' → 'PNA'; 'ENDE' → 'ENDE'.
 */
export const derivarSiglaInstituicao = (name: string | undefined | null): string => {
  if (!name) return 'IN';
  const limpo = name.trim();
  // se já é uma sigla curta (≤5 letras/maiúsculas), usa-a
  if (/^[A-ZÀ-Ú0-9]{2,5}$/.test(limpo)) return limpo;
  // iniciais das palavras com ≥3 letras (máx. 3)
  const palavras = limpo.split(/[\s\-–—/]+/).filter(Boolean);
  const iniciais = palavras
    .filter((p) => p.length >= 3 && !/^(de|da|do|dos|das|e|em|com|para)$/i.test(p))
    .map((p) => p.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 3);
  return iniciais || limpo.slice(0, 3).toUpperCase();
};

/**
 * Cor institucional determinística por instituição (hash do nome) — mantém o
 * tom azul-escuro da identidade CDA com variação subtil por entidade.
 */
const CORES_INSTITUCIONAIS: Array<[string, string]> = [
  ['#0c2340', '#1e3a8a'], // azul-escuro CDA
  ['#0e2b64', '#1d4ed8'], // azul profundo
  ['#1e3a5f', '#2563eb'], // azul marinho
  ['#0f2e52', '#1d4ed8'], // azul noite
  ['#142d4c', '#2b5fd9'], // azul aço
];

/** Devolve o par (fundo, acento) estável para a instituição. */
export const coresDaInstituicao = (name: string | undefined | null): [string, string] => {
  const base = (name || '').trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0;
  return CORES_INSTITUCIONAIS[h % CORES_INSTITUCIONAIS.length];
};

/**
 * Gera um data-URI SVG com a sigla da instituição (placeholder institucional
 * elegante — usado quando não há logomarca oficial registada).
 */
export const gerarPlaceholderInstituicao = (name: string | undefined | null): string => {
  const sigla = derivarSiglaInstituicao(name);
  const [fundo, acento] = coresDaInstituicao(name);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>
  <defs>
    <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='${fundo}'/>
      <stop offset='100%' stop-color='${acento}'/>
    </linearGradient>
  </defs>
  <rect width='160' height='160' rx='32' fill='url(#g)'/>
  <rect x='6' y='6' width='148' height='148' rx='27' fill='none' stroke='rgba(255,255,255,0.18)' stroke-width='2'/>
  <text x='80' y='98' font-family='Arial,Helvetica,sans-serif' font-size='48' font-weight='800' fill='#ffffff' text-anchor='middle' letter-spacing='1'>${sigla}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
