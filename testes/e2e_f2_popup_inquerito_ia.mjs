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

const titulo = await page.getByText('Criar Inquérito com IA').first().isVisible();
console.log('popup título «Criar Inquérito com IA»:', titulo);
console.log('botão «Gerar com IA» ausente:', (await page.locator('#btn-gerar-inquerito-ia').count()) === 0);
console.log('textareas visíveis:', await page.locator('#inquerito-ia-temas').isVisible(), await page.locator('#inquerito-ia-informacoes').isVisible());
console.log('campos «Pergunta»/opções ocultos:', (await page.getByText(/^Pergunta$/).count()) === 0);
const preview0 = await page.locator('[data-testid="inquerito-ia-preview"]').innerText();
console.log('preview inicial:', preview0.split('\n')[1]);

// Validação: criar sem preencher
await page.locator('#btn-criar-inquerito-ia').click();
await page.waitForTimeout(400);
console.log('alerta campos vazios:', await page.getByText(/Indique o que pretende saber e que informações/).isVisible());
await page.getByRole('button', { name: 'Fechar' }).last().click();
await page.waitForTimeout(300);

// Preencher → pré-visualização automática (debounce 1,2 s)
await page.locator('#inquerito-ia-temas').fill('Se as famílias do bairro têm água potável');
await page.locator('#inquerito-ia-informacoes').fill('Tem água canalizada; onde vai buscar; distância');
await page.waitForTimeout(600);
console.log('pedidos /guiao antes do debounce:', pedidosGuiao);
await page.waitForTimeout(1500);
console.log('pedidos /guiao após debounce:', pedidosGuiao);
const preview1 = await page.locator('[data-testid="inquerito-ia-preview"]').innerText();
console.log('preview mostra saudação:', preview1.includes('Sou o assistente da AGT'), '| resumo:', /3 informaç/.test(preview1));
await page.screenshot({ path: 'testes/evidencias/f2_popup_inquerito_ia.png' });

// Opções avançadas
await page.locator('#btn-opcoes-avancadas-ia').click();
await page.getByRole('button', { name: /Curto/ }).click();
await page.getByRole('button', { name: 'Só texto' }).click();
await page.getByRole('button', { name: 'Formal' }).click();
await page.waitForTimeout(1600);
console.log('regenerou após mudar duração/tom (1 pedido por debounce):', pedidosGuiao === 2, '| total', pedidosGuiao);
await page.screenshot({ path: 'testes/evidencias/f2_popup_inquerito_ia_avancadas.png' });

// Criar Inquérito (demo → sem Supabase real → alerta honesto de migração)
await page.locator('#btn-criar-inquerito-ia').click();
await page.waitForTimeout(1500);
const alertaMig = await page.getByText(/aguarda a migração v38/).count();
const bloco = await page.locator('[data-testid="inqueritos-ia-compostos"]').count();
console.log('resultado criar (demo): alerta migração =', alertaMig > 0, '| bloco no compositor =', bloco > 0);
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
console.log('erros de página:', erros.length ? erros : 'nenhum');
await browser.close();
