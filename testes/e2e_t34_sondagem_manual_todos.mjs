// ============================================================================
// E2E — Tarefa 34(a), cenário EXACTO do utilizador: sondagem NORMAL (sem IA)
// + destinatário manual (chip) + «Todos». O destinatário manual tem de
// receber a correspondência (com a sondagem embutida) e a notificação.
// BD REAL (contas reais). Cria 1 sondagem «[TESTE T34 …]». Sem IA.
// Uso: node testes/e2e_t34_sondagem_manual_todos.mjs   (≈ 40 s)
// ============================================================================
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:3000';
const cred = fs.readFileSync('/home/user/.credenciais_cda/contas_reais.md', 'utf8');
const senhaDe = (conta, d) => (cred.match(new RegExp(`${conta}[^\\n]*?(\\d{9})`)) || [])[1] || d;
const INST = { user: 'INAPEM-LLMM-01', pass: senhaDe('INAPEM-LLMM-01', '') };
const CID1 = { user: '002399714LA030', pass: senhaDe('002399714LA030', '') };
const CARIMBO = new Date().toISOString().slice(11, 16).replace(':', 'h');
const ASSUNTO = `[TESTE T34 ${CARIMBO}] Sondagem normal — água`;
const env = Object.fromEntries(fs.readFileSync('/home/user/.credenciais_cda/env', 'utf8').split('\n').filter((l) => /=/.test(l) && !/^\s*#/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim().replace(/^export\s+/, ''), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }));
const SUPA = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const rest = async (q) => (await fetch(`${SUPA}/rest/v1/${q}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })).json();

const R = [];
const ok = (n, c, x = '') => { R.push({ n, ok: !!c }); console.log(`${c ? '✔' : '✘'} ${n}${x ? ' — ' + x : ''}`); };
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
const erros = []; page.on('pageerror', (e) => erros.push(String(e)));
await page.goto(`${BASE}/institucional`); await page.waitForTimeout(2500);
await page.locator('input[name="cda-utilizador"]').fill(INST.user);
await page.locator('input[name="cda-senha"]').fill(INST.pass);
await page.getByRole('button', { name: /Entrar|Aceder|Iniciar/i }).first().click();
await page.waitForTimeout(4500);
ok('1 login instituição', !/login/.test(page.url()));
await page.evaluate(() => { window.location.hash = '#/correspondencias'; }); await page.waitForTimeout(2500);
await page.getByRole('button', { name: /Nova Mensagem/i }).first().click(); await page.waitForTimeout(1000);
await page.locator('input[placeholder*="Número do BI"]').fill(CID1.user);
await page.getByRole('button', { name: /Adicionar destinatário/i }).click(); await page.waitForTimeout(500);
ok('2 chip do destinatário manual', (await page.locator('span.font-mono', { hasText: CID1.user }).count()) > 0);
await page.locator('#btn-criar-inquerito').click();
await page.locator('#opcao-inquerito-normal').click();
await page.locator('#btn-tipo-inquerito-ok').click(); await page.waitForTimeout(600);
await page.locator('input[placeholder="Escreva a pergunta da sondagem"]').fill('Tem água canalizada em casa? (teste T34)');
await page.locator('input[placeholder="Texto A"]').fill('Sim');
await page.locator('input[placeholder="Texto B"]').fill('Não');
await page.getByRole('button', { name: /^Criar Sondagem$/i }).click();
await page.locator('[data-testid="sondagens-compostas"]').waitFor({ timeout: 30000 });
ok('3 bloco da sondagem no compositor + destinatário «Todos»', await page.evaluate(() => Array.from(document.querySelectorAll('input')).some((i) => /^todos$/i.test(i.value))));
await page.locator('input[placeholder="Qual o tema da sua mensagem?"]').fill(ASSUNTO); await page.waitForTimeout(300);
await page.locator('#btn-enviar-mensagem').click(); await page.waitForTimeout(800);
await page.getByText('Mensagem Normal').first().click();
await page.waitForSelector('text=/Correspondência enviada com sucesso/', { timeout: 90000 });
const txt = await page.locator('text=/Correspondência enviada com sucesso/').innerText();
ok('4 sucesso menciona difusão E destinatário directo', new RegExp(`1 destinatário\\(s\\) directo\\(s\\) \\(${CID1.user}\\)`).test(txt), txt);
await page.screenshot({ path: 'testes/evidencias/t34_sondagem_sucesso.png' });
await page.waitForTimeout(2500);
const msgs = await rest(`messages?select=recipient_bi,sondagem_ids,protocol_number&subject=eq.${encodeURIComponent(ASSUNTO)}&order=id.desc&limit=100`);
const manual = (msgs || []).find?.((m) => m.recipient_bi === CID1.user);
ok('5 BD: mensagem do destinatário manual com sondagem embutida + protocolo', !!manual && Array.isArray(manual.sondagem_ids) && manual.sondagem_ids.length === 1 && !!manual.protocol_number, JSON.stringify(manual));
ok('6 BD: linha «TODOS» (Enviadas) e difusão ao âmbito', (msgs || []).some?.((m) => m.recipient_bi === 'TODOS') && (msgs || []).length >= 3, `${(msgs || []).length} linhas`);
const notifs = await rest(`notifications?select=title,message&target_bi=eq.${CID1.user}&order=id.desc&limit=3`);
ok('7 BD: notificação do destinatário manual', (notifs || []).some?.((n) => String(n.message || '').includes(ASSUNTO)), (notifs || [])[0]?.message);
ok('8 sem erros JS', erros.length === 0, erros.join(' | '));
await browser.close();
const falhas = R.filter((r) => !r.ok);
console.log(`\n${R.length - falhas.length}/${R.length} verificações OK${falhas.length ? ' — FALHAS: ' + falhas.map((f) => f.n).join('; ') : ''}`);
process.exit(falhas.length ? 1 : 0);
