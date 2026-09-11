// ============================================================================
// Directório de Órgãos — FICHA DE CONTACTO (DADOS SIMULADOS — demonstração)
// ----------------------------------------------------------------------------
// 2026-09-11 — Tarefa 41. Todos os valores aqui produzidos (telemóvel,
// endereço, e-mail, código institucional, coordenadas) são SIMULADOS,
// plausíveis e DETERMINÍSTICOS (derivados da sigla/id do órgão), para que a
// ficha e a composição de mensagem funcionem em demonstração sem inventar
// contactos reais de terceiros.
//
// TODO (fase real): quando as instituições acederem à plataforma, substituir
// `contactosDoOrgao()` por uma leitura da conta institucional (perfil real:
// código, telemóvel, endereço, e-mail, coordenadas). A UI não precisa de mudar.
// ============================================================================

import type { EntidadeDirectorio } from './directorioInstitucionalAngola';

export interface ContactosOrgao {
  /** Código institucional no padrão da plataforma (ex.: AGT-9921-SR). */
  codigoInstitucional: string;
  /** Telemóvel no formato +244 9XX XXX XXX. */
  telemovel: string;
  /** Rua, município, província. */
  endereco: string;
  /** E-mail institucional plausível (ex.: geral@agt.gov.ao). */
  email: string;
  latitude: number;
  longitude: number;
  /** Marca explícita para a UI/testes: dados de demonstração. */
  simulado: true;
}

// Hash determinístico (FNV-1a 32 bits) — estável entre sessões e ambientes.
const hash32 = (texto: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
};

/** Sigla normalizada para código: só A–Z/0–9, sem acentos, máx. 6 caracteres. */
const siglaParaCodigo = (sigla: string): string => {
  const limpa = (sigla || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]/g, '');
  return (limpa || 'ORG').slice(0, 6);
};

/**
 * Código institucional SIMULADO, determinístico e estável, no padrão da
 * plataforma `SIGLA-DDDD-LL` (ex.: AGT-9921-SR). A mesma sigla devolve sempre
 * o mesmo código.
 */
export const gerarCodigoInstitucionalSimulado = (sigla: string): string => {
  const base = siglaParaCodigo(sigla);
  const h = hash32(`cda-directorio:${base}`);
  const numero = String(1000 + (h % 9000)); // 1000–9999
  const letras = String.fromCharCode(65 + ((h >>> 8) % 26)) + String.fromCharCode(65 + ((h >>> 16) % 26));
  return `${base}-${numero}-${letras}`;
};

// Pontos de referência (aproximados) por província — coordenadas das capitais.
// Usados como âncora; cada órgão recebe um deslocamento determinístico (~±2 km).
const CAPITAIS: Record<string, { lat: number; lng: number; cidade: string }> = {
  'Luanda': { lat: -8.8383, lng: 13.2344, cidade: 'Luanda' },
  'Bengo': { lat: -8.5800, lng: 13.6644, cidade: 'Caxito' },
  'Benguela': { lat: -12.5763, lng: 13.4055, cidade: 'Benguela' },
  'Bié': { lat: -12.3833, lng: 16.9333, cidade: 'Cuito' },
  'Cabinda': { lat: -5.5500, lng: 12.2000, cidade: 'Cabinda' },
  'Cuando': { lat: -15.7833, lng: 20.3667, cidade: 'Mavinga' },
  'Cubango': { lat: -14.6585, lng: 17.6910, cidade: 'Menongue' },
  'Cuanza Norte': { lat: -9.3000, lng: 14.9167, cidade: 'Ndalatando' },
  'Cuanza Sul': { lat: -11.2000, lng: 13.8500, cidade: 'Sumbe' },
  'Cunene': { lat: -17.0667, lng: 15.7333, cidade: 'Ondjiva' },
  'Huambo': { lat: -12.7761, lng: 15.7392, cidade: 'Huambo' },
  'Huíla': { lat: -14.9167, lng: 13.5000, cidade: 'Lubango' },
  'Icolo e Bengo': { lat: -9.1000, lng: 13.6667, cidade: 'Catete' },
  'Lunda Norte': { lat: -7.3667, lng: 20.8333, cidade: 'Dundo' },
  'Lunda Sul': { lat: -9.6600, lng: 20.3900, cidade: 'Saurimo' },
  'Malanje': { lat: -9.5402, lng: 16.3410, cidade: 'Malanje' },
  'Moxico': { lat: -11.7833, lng: 19.9167, cidade: 'Luena' },
  'Moxico Leste': { lat: -11.8833, lng: 22.9167, cidade: 'Cazombo' },
  'Namibe': { lat: -15.1961, lng: 12.1522, cidade: 'Moçâmedes' },
  'Uíge': { lat: -7.6087, lng: 15.0613, cidade: 'Uíge' },
  'Zaire': { lat: -6.2667, lng: 14.2500, cidade: 'Mbanza Congo' },
};

// Artérias plausíveis de Luanda (ruas/avenidas genéricas de referência)
// para compor endereços de demonstração — sem números de porta reais.
const ARTERIAS_LUANDA = [
  'Avenida 4 de Fevereiro', 'Rua Rainha Ginga', 'Avenida Ho Chi Minh', 'Largo do Ambiente',
  'Avenida Comandante Gika', 'Rua Amílcar Cabral', 'Avenida Lenine', 'Rua Major Kanhangulo',
  'Avenida de Portugal', 'Rua Comandante Che Guevara', 'Avenida Deolinda Rodrigues', 'Rua da Missão',
];
const MUNICIPIOS_LUANDA = ['Ingombota', 'Maianga', 'Rangel', 'Sambizanga', 'Talatona', 'Kilamba Kiaxi'];

/** Domínio de e-mail plausível a partir da sigla (ex.: AGT → agt.gov.ao). */
const dominioDe = (sigla: string): string => {
  const base = siglaParaCodigo(sigla).toLowerCase();
  return `${base}.gov.ao`;
};

/**
 * Contactos SIMULADOS de um órgão do Directório (determinísticos).
 * Entidades provinciais ficam ancoradas à capital da respectiva província;
 * as restantes distribuem-se por pontos distintos de Luanda.
 */
export const contactosDoOrgao = (e: Pick<EntidadeDirectorio, 'id' | 'sigla' | 'categoria'>): ContactosOrgao => {
  const h = hash32(`cda-directorio-contactos:${e.id}`);
  const h2 = hash32(`cda-directorio-geo:${e.id}`);

  const provincia = e.categoria === 'Provincial' && CAPITAIS[e.sigla] ? e.sigla : 'Luanda';
  const ancora = CAPITAIS[provincia];
  // deslocamento determinístico até ~±0,02° (≈ 2 km) — pontos distintos por órgão
  const dLat = ((h2 % 4001) - 2000) / 100000;
  const dLng = (((h2 >>> 12) % 4001) - 2000) / 100000;

  const arteria = ARTERIAS_LUANDA[h % ARTERIAS_LUANDA.length];
  const numeroPorta = 10 + ((h >>> 4) % 240);
  const municipio = provincia === 'Luanda'
    ? MUNICIPIOS_LUANDA[(h >>> 8) % MUNICIPIOS_LUANDA.length]
    : ancora.cidade;
  const endereco = provincia === 'Luanda'
    ? `${arteria}, n.º ${numeroPorta}, ${municipio}, Luanda`
    : `Rua Principal, n.º ${numeroPorta}, ${municipio}, ${provincia}`;

  // Telemóvel +244 9XX XXX XXX (prefixos móveis plausíveis 92x/93x)
  const prefixo = ['923', '924', '925', '926', '927', '931', '932', '933'][h % 8];
  const resto = String(100000 + ((h >>> 3) % 900000));
  const telemovel = `+244 ${prefixo} ${resto.slice(0, 3)} ${resto.slice(3, 6)}`;

  return {
    codigoInstitucional: gerarCodigoInstitucionalSimulado(e.sigla),
    telemovel,
    endereco,
    email: `geral@${dominioDe(e.sigla)}`,
    latitude: Number((ancora.lat + dLat).toFixed(5)),
    longitude: Number((ancora.lng + dLng).toFixed(5)),
    simulado: true,
  };
};

/** URL do mapa embutido (OpenStreetMap, sem chave) centrado no ponto com marcador. */
export const urlMapaEmbutido = (lat: number, lng: number, delta = 0.008): string => {
  const bbox = [lng - delta, lat - delta, lng + delta, lat + delta].map(v => v.toFixed(5)).join('%2C');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(5)}%2C${lng.toFixed(5)}`;
};

/** Link externo para o Google Maps. */
export const urlGoogleMaps = (lat: number, lng: number): string =>
  `https://www.google.com/maps?q=${lat.toFixed(5)},${lng.toFixed(5)}`;
