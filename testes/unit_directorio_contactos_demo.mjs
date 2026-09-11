/**
 * T41 — Testes unitários dos contactos SIMULADOS do Directório de Órgãos.
 * Uso: npx tsx testes/unit_directorio_contactos_demo.mjs
 */
import {
  gerarCodigoInstitucionalSimulado,
  contactosDoOrgao,
  urlMapaEmbutido,
  urlGoogleMaps,
} from '../src/constants/directorioContactosDemo.ts';
import { DIRECTORIO_INSTITUCIONAL_ANGOLA } from '../src/constants/directorioInstitucionalAngola.ts';

let total = 0, okN = 0; const falhas = [];
const ok = (c, m) => { total++; if (c) { okN++; console.log(`✔ ${m}`); } else { falhas.push(m); console.log(`✘ ${m}`); } };

// Estabilidade e padrão
const a = gerarCodigoInstitucionalSimulado('AGT');
const b = gerarCodigoInstitucionalSimulado('AGT');
ok(a === b, `código estável entre chamadas (${a})`);
ok(/^[A-Z0-9]{1,6}-\d{4}-[A-Z]{2}$/.test(a), 'padrão SIGLA-DDDD-LL');
ok(gerarCodigoInstitucionalSimulado('agt') === a, 'insensível a maiúsculas/minúsculas');
ok(gerarCodigoInstitucionalSimulado('ÁGUA').startsWith('AGUA-'), 'acentos removidos na sigla (ÁGUA → AGUA-…)');
ok(gerarCodigoInstitucionalSimulado('Cuanza Norte').startsWith('CUANZA-'), 'espaços removidos e máx. 6 caracteres');
ok(gerarCodigoInstitucionalSimulado('') .startsWith('ORG-'), 'sigla vazia cai em ORG-');
ok(gerarCodigoInstitucionalSimulado('AGT') !== gerarCodigoInstitucionalSimulado('SME'), 'siglas diferentes → códigos diferentes');

// Contactos por órgão
const agt = DIRECTORIO_INSTITUCIONAL_ANGOLA.find(e => e.sigla === 'AGT') || DIRECTORIO_INSTITUCIONAL_ANGOLA[0];
const c1 = contactosDoOrgao(agt); const c2 = contactosDoOrgao(agt);
ok(JSON.stringify(c1) === JSON.stringify(c2), 'contactos determinísticos para o mesmo órgão');
ok(/^\+244 9\d{2} \d{3} \d{3}$/.test(c1.telemovel), `telemóvel no formato +244 9XX XXX XXX (${c1.telemovel})`);
ok(/^geral@[a-z0-9]+\.gov\.ao$/.test(c1.email), `e-mail institucional plausível (${c1.email})`);
ok(/Luanda$/.test(c1.endereco) && /n\.º \d+/.test(c1.endereco), `endereço com rua, n.º, município, província (${c1.endereco})`);
ok(c1.simulado === true, 'marcado como simulado');
ok(c1.codigoInstitucional === gerarCodigoInstitucionalSimulado(agt.sigla), 'código da ficha = função pura');

// Coordenadas: dentro de Angola, distintas entre órgãos
const todos = DIRECTORIO_INSTITUCIONAL_ANGOLA.map(e => contactosDoOrgao(e));
ok(todos.every(c => c.latitude > -18.1 && c.latitude < -4.3 && c.longitude > 11.6 && c.longitude < 24.1), 'todas as coordenadas dentro de Angola');
const chaves = new Set(todos.map(c => `${c.latitude},${c.longitude}`));
ok(chaves.size === todos.length, `coordenadas distintas por órgão (${chaves.size}/${todos.length})`);
const luanda = DIRECTORIO_INSTITUCIONAL_ANGOLA.filter(e => e.categoria !== 'Provincial').map(e => contactosDoOrgao(e));
ok(luanda.every(c => Math.abs(c.latitude + 8.8383) < 0.03 && Math.abs(c.longitude - 13.2344) < 0.03), 'órgãos nacionais ancorados em Luanda (≈ ±2 km)');
const huila = DIRECTORIO_INSTITUCIONAL_ANGOLA.find(e => e.categoria === 'Provincial' && e.sigla === 'Huíla');
const ch = contactosDoOrgao(huila);
ok(Math.abs(ch.latitude + 14.9167) < 0.03 && /Lubango, Huíla$/.test(ch.endereco), `Governo Provincial da Huíla ancorado em Lubango (${ch.endereco})`);

// URLs
ok(urlMapaEmbutido(-8.8, 13.2).startsWith('https://www.openstreetmap.org/export/embed.html?bbox=') && urlMapaEmbutido(-8.8, 13.2).includes('marker=-8.80000%2C13.20000'), 'URL OpenStreetMap com bbox e marcador');
ok(urlGoogleMaps(-8.8, 13.2) === 'https://www.google.com/maps?q=-8.80000,13.20000', 'URL Google Maps');

console.log(`\n${okN}/${total} verificações OK`);
if (falhas.length) process.exit(1);
