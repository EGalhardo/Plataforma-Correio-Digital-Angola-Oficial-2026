// Teste local (Fase 2) — popup «Criar Inquérito com IA» + bloco no compositor.
// Conta demo institucional (AGT-9921-SR) — a API /guiao é mockada (page.route)
// para não gastar quota; nada é escrito no Supabase (demo → sem migração).
import { chromium } from 'playwright';
import fs from 'node:fs';

const GUIAO = {
  objectivo: 'Acesso a água potável no bairro',
  saudacao: 'Olá! Sou o assistente da AGT. Gostava de saber como está o acesso à água na sua casa. Podemos começar?',
  maxPerguntas: 10,
  campos: [
    { chave: 'tem_agua', rotulo: 'Tem água canalizada em casa', tipo: 'sim_nao' },
    { chave: 'onde_busca', rotulo: 'Onde vai buscar água', tipo: 'texto_curto', so_se: 'tem_agua=nao' },
    { chave: 'distancia', rotulo: 'Distância até ao ponto de água', tipo: 'distancia', so_se: 'tem_agua=nao' },
  ],
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
let pedidosGuiao = 0;
await page.route('**/api/inquerito-ia/guiao', async (route) => {
  pedidosGuiao++;
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, modelo: 'mock', guiao: GUIAO }) });
});
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));

await page.goto('http://localhost:3000/institucional');
await page.waitForTimeout(2500);
await page.locator('input[name="cda-utilizador"]').fill('AGT-9921-SR');
await page.locator('input[name="cda-senha"]').fill('000000');
await page.getByRole('button', { name: /Entrar|Aceder|Iniciar/i }).first().click();
await page.waitForTimeout(3000);
await page.evaluate(() => { window.location.hash = '#/correspondencias'; });
await page.waitForTimeout(1000);
await page.getByRole('button', { name: /Nova Mensagem/i }).first().click();
await page.waitForTimeout(1200);

await page.locator('#btn-criar-inquerito').click();
await page.locator('#opcao-inquerito-ia').click();
await page.locator('#btn-tipo-inquerito-ok').click();
await page.waitForTimeout(600);

// 2026-09-11 (T37) — geração A PEDIDO: a IA só é chamada no botão «Gerar com IA».
const R = []; const ok = (n, c, x = '') => { R.push(!!c); console.log(`${c ? '✔' : '✘'} ${n}${x ? ' — ' + x : ''}`); };
ok('popup «Criar Inquérito com IA» aberto', await page.getByText('Criar Inquérito com IA').first().isVisible());
ok('2 campos de texto visíveis', await page.locator('#inquerito-ia-temas').isVisible() && await page.locator('#inquerito-ia-informacoes').isVisible());
const gerar = page.locator('#btn-gerar-guiao-ia'); const criar = page.locator('#btn-criar-inquerito-ia'); const preview = page.locator('[data-testid="inquerito-ia-preview"]');
ok('botão «Gerar com IA» existe e está DESACTIVADO com campos vazios', (await gerar.count()) === 1 && await gerar.isDisabled());
ok('«Criar Inquérito» DESACTIVADO sem guião', await criar.isDisabled());
ok('pré-visualização vazia com instrução', (await preview.getAttribute('data-estado')) === 'vazio' && /Gerar com IA/.test(await preview.innerText()));

// Escrever (com correcções) NÃO chama a IA
await page.locator('#inquerito-ia-temas').fill('Se as famílias do bairro têm água');
await page.locator('#inquerito-ia-informacoes').fill('Tem água canalizada');
await page.waitForTimeout(1600);
await page.locator('#inquerito-ia-temas').fill('Se as famílias do bairro têm água potável');
await page.locator('#inquerito-ia-informacoes').fill('Tem água canalizada; onde vai buscar; distância');
await page.waitForTimeout(1600);
ok('escrever/corrigir os campos NÃO gera pedidos /guiao (poupança de quota)', pedidosGuiao === 0, `pedidos=${pedidosGuiao}`);
ok('«Gerar com IA» fica ACTIVO com os 2 campos preenchidos', await gerar.isEnabled());
ok('«Criar Inquérito» continua desactivado até gerar', await criar.isDisabled());

// Gerar
await gerar.click();
await page.waitForFunction(() => document.querySelector('[data-testid="inquerito-ia-preview"]')?.getAttribute('data-estado') === 'pronto', null, { timeout: 15000 });
const preview1 = await preview.innerText();
ok('1 clique = 1 pedido /guiao', pedidosGuiao === 1, `pedidos=${pedidosGuiao}`);
ok('pré-visualização mostra a saudação e o resumo', preview1.includes('Sou o assistente da AGT') && /3 informaç/.test(preview1));
ok('botão passa a «Regenerar»', /Regenerar/i.test(await gerar.innerText()));
ok('«Criar Inquérito» ACTIVO depois de gerar', await criar.isEnabled());
await page.screenshot({ path: 'testes/evidencias/f2_popup_inquerito_ia.png' });

// Alterar texto depois de gerar → desactualizado; criar volta a ficar bloqueado
await page.locator('#inquerito-ia-informacoes').fill('Tem água canalizada; onde vai buscar; distância; horas de energia');
await page.waitForTimeout(300);
ok('alterar os campos marca a pré-visualização como DESACTUALIZADA (sem chamar a IA)', (await preview.getAttribute('data-estado')) === 'desactualizado' && pedidosGuiao === 1);
ok('«Criar Inquérito» bloqueia até gerar de novo', await criar.isDisabled());
ok('botão indica «Gerar de novo com IA»', /Gerar de novo/i.test(await gerar.innerText()));

// Opções avançadas também desactualizam, mas NÃO geram sozinhas
await gerar.click();
await page.waitForFunction(() => document.querySelector('[data-testid="inquerito-ia-preview"]')?.getAttribute('data-estado') === 'pronto', null, { timeout: 15000 });
await page.locator('#btn-opcoes-avancadas-ia').click();
await page.getByRole('button', { name: /Curto/ }).click();
await page.getByRole('button', { name: 'Formal' }).click();
await page.waitForTimeout(1600);
ok('mudar duração/tom NÃO gera automaticamente (só marca desactualizado)', pedidosGuiao === 2 && (await preview.getAttribute('data-estado')) === 'desactualizado', `pedidos=${pedidosGuiao}`);
await gerar.click();
await page.waitForFunction(() => document.querySelector('[data-testid="inquerito-ia-preview"]')?.getAttribute('data-estado') === 'pronto', null, { timeout: 15000 });
ok('regenerar após opções = mais 1 pedido (total 3)', pedidosGuiao === 3, `pedidos=${pedidosGuiao}`);
await page.screenshot({ path: 'testes/evidencias/f2_popup_inquerito_ia_avancadas.png' });

// Criar Inquérito (demo → sem Supabase real → alerta honesto de migração)
await criar.click();
await page.waitForTimeout(1500);
const alertaMig = await page.getByText(/aguarda a migração v38/).count();
const bloco = await page.locator('[data-testid="inqueritos-ia-compostos"]').count();
ok('criar (demo): alerta de migração OU bloco no compositor; sem novo pedido à IA', (alertaMig > 0 || bloco > 0) && pedidosGuiao === 3, `alerta=${alertaMig > 0} bloco=${bloco > 0} pedidos=${pedidosGuiao}`);
await page.screenshot({ path: 'testes/evidencias/f2_apos_criar.png' });
if (bloco > 0) {
  const txt = await page.locator('[data-testid="inqueritos-ia-compostos"]').innerText();
  console.log('bloco: rótulo/objectivo/saudação/canal:', /Inquérito com IA/i.test(txt), /Acesso a água potável/.test(txt), /Sou o assistente/.test(txt), /só texto/.test(txt));
  console.log('destinatário automático «Todos»:', await page.locator('input[value="Todos"], input[value="TODOS"]').count() > 0);
  console.log('popup fechado:', (await page.getByText('Criar Inquérito com IA').count()) === 0);
  // Remoção pelo fluxo da aplicação (elimina o rascunho criado neste teste)
  await page.locator('[data-testid="inqueritos-ia-compostos"] button[title="Remover inquérito da mensagem"]').click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /^Remover$/ }).click();
  await page.waitForTimeout(1500);
  console.log('bloco removido:', (await page.locator('[data-testid="inqueritos-ia-compostos"]').count()) === 0);
  console.log('destinatário limpo:', await page.locator('input[value="Todos"]').count() === 0);
}
ok('sem erros de página', erros.length === 0, erros.join(' | '));
await browser.close();
const f = R.filter((x) => !x).length; console.log(`\n${R.length - f}/${R.length} verificações OK`); process.exit(f ? 1 : 0);
