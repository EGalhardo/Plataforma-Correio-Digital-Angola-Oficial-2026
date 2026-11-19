/**
 * E2E — Área Instituição · "Agendar Video-atendimento" · botão Verificar.
 * Reproduz e valida a correção do bug: a verificação de um cidadão registado
 * devolvia «Cidadão não localizado na plataforma (42501)» porque a RPC
 * cda_cidadao_lookup_bi exige JWT de instituição (gate da v20) e a sessão
 * demo usa a chave anon.
 *
 * Uso: node scripts/e2e_video_agendar_cidadao.mjs  (servidor em :3000)
 */
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE || 'http://127.0.0.1:3000';
let pass = 0, fail = 0;
const check = (nome, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FALHA'} | ${nome}${extra ? ' -> ' + extra : ''}`);
  ok ? pass++ : fail++;
};

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = [];
p.on('pageerror', e => errs.push(e.message));

// --- login instituição (demo AGT) ---
await p.goto(BASE, { waitUntil: 'load', timeout: 60000 });
await p.waitForTimeout(3000);
const ins = p.locator('input');
await ins.nth(0).fill('AGT-9921-SR');
await ins.nth(1).fill('000000');
await p.getByText('ENTRAR NO PORTAL', { exact: false }).first().click();
await p.waitForTimeout(7000);
check('login instituição', p.url().includes('/institucional#/home'), p.url());

await p.getByText('VÍDEO-ATENDIMENTO', { exact: false }).first().click();
await p.waitForTimeout(2500);
await p.getByText('AGENDAR VIDEO-ATENDIMENTO', { exact: false }).first().click();
await p.waitForTimeout(2000);

const campoBi = p.locator('input[placeholder="Ex.: 002399714LA030"]').last();
const campoAssunto = p.locator('input[placeholder="Ex.: Esclarecimento sobre o Certificado MPME"]');
const verificar = p.getByText('VERIFICAR', { exact: false }).last();

// --- casos de verificação ---
const casos = [
  ['cidadão registado #1', '009874562LA041', true],
  ['cidadão registado #2', '008812342LA011', true],
  ['cidadão registado #3', '007712342LA021', true],
  ['BI inexistente', '000000000XX999', false],
  ['formato inválido', 'abc', false],
];
for (const [nome, bi, deveAchar] of casos) {
  await campoBi.fill(bi);
  await verificar.click();
  await p.waitForTimeout(2000);
  const t = await p.locator('body').innerText();
  const achou = /Cidadão localizado/i.test(t);
  const recusou = /não localizado|B\.I\. válido/i.test(t);
  const erroTecnico = /\(42501\)|\(P0001\)|\(SEM_CHAVES\)/.test(t);
  check(`verificar · ${nome}`, deveAchar ? (achou && !recusou) : (!achou && recusou),
        achou ? 'localizado' : 'recusado');
  check(`verificar · ${nome} · sem código técnico`, !erroTecnico);
}

// --- bloqueio de agendamento sem verificar ---
await campoBi.fill('009874562LA041');
await campoAssunto.fill('Bloqueio sem verificar');
await p.locator('input[type="date"]').last().fill('2026-12-20');
await p.locator('input[type="time"]').last().fill('09:00');
await p.getByText('AGENDAR ATENDIMENTO', { exact: false }).last().click();
await p.waitForTimeout(2000);
check('bloqueia agendar sem verificar',
      /Verifique primeiro o cidadão/i.test(await p.locator('body').innerText()));

// --- fluxo completo: reabrir o popup limpo e agendar ---
// Os casos negativos deixam erro pendente no formulário; o fluxo real começa
// num popup novo (é assim que o utilizador o usa).
await p.getByText('CANCELAR', { exact: false }).last().click();
await p.waitForTimeout(1500);
await p.getByText('AGENDAR VIDEO-ATENDIMENTO', { exact: false }).first().click();
await p.waitForTimeout(2000);

const assunto = `E2E agendamento ${Date.now()}`;
await p.locator('input[placeholder="Ex.: Esclarecimento sobre o Certificado MPME"]').fill(assunto);
await p.locator('input[type="date"]').last().fill('2026-12-15');
await p.locator('input[type="time"]').last().fill('10:30');
const campoBi2 = p.locator('input[placeholder="Ex.: 002399714LA030"]').last();
await campoBi2.fill('009874562LA041');
await p.getByText('VERIFICAR', { exact: false }).last().click();
await p.waitForTimeout(2500);
check('verificar antes de agendar', /Cidadão localizado/i.test(await p.locator('body').innerText()));

await p.getByText('AGENDAR ATENDIMENTO', { exact: false }).last().click();
await p.waitForTimeout(5000);
const tAg = await p.locator('body').innerText();
check('popup fecha após agendar', !tAg.includes('ASSUNTO DO ATENDIMENTO'));
check('agendamento aparece na agenda', tAg.includes(assunto));
check('agendamento com nome oficial do cidadão', tAg.includes('Edlasio Galhardo'));
check('sem falso alarme de sincronização', !/NÃO foi sincronizado com a nuvem/i.test(tAg));
check('confirmação de sucesso mostrada', /agendado com/i.test(tAg));

// --- persistência após recarregar ---
await p.reload({ waitUntil: 'load' });
await p.waitForTimeout(6000);
check('agendamento persiste após recarregar',
      (await p.locator('body').innerText()).includes(assunto));

check('sem erros de JavaScript', errs.length === 0, errs.slice(0, 3).join(' | '));

await b.close();
console.log(`\n=== RESULTADO: ${pass} PASS / ${fail} FALHA ===`);
process.exit(fail === 0 ? 0 : 1);
