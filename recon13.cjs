const { chromium } = require('playwright');
const { login, APP } = require('./scripts/test_interop_contas_reais_playwright.cjs');
(async () => {
  const browser = await chromium.launch();
  const c = await login(browser, 'cidadao', '/home/user/repo/test-artifacts');
  const p = c.page;
  await p.goto(`${APP}/#/ocorrencias`, { waitUntil:'networkidle' });
  await p.waitForTimeout(9000);
  await p.click('button:has-text("Criar Ocorrência")');
  await p.waitForTimeout(3000);
  await p.selectOption('select', { label: 'Iluminação pública' });
  await p.fill('input[placeholder*="Poste de iluminação"]', 'RECON-OC-99');
  await p.fill('textarea', 'texto');
  await p.fill('input[placeholder*="INAPEM"]', 'AGT-LMM');
  await p.waitForTimeout(1500);
  const estado = await p.evaluate(()=>{
    const b=[...document.querySelectorAll('button')].find(x=>/Rever ocorrência/i.test(x.innerText));
    return b?{disabled:b.disabled, txt:b.innerText, cls:b.className.slice(0,60)}:null;
  });
  console.log('botão Rever:', JSON.stringify(estado));
  console.log('ecrã:', (await p.evaluate(()=>document.body.innerText.replace(/\s+/g,' '))).slice(0,700));
  await p.screenshot({ path:'test-artifacts/recon-oc-form-preenchido.png', fullPage:true });
  await p.click('button:has-text("Rever ocorrência")');
  await p.waitForTimeout(3000);
  console.log('--- após Rever ---');
  const bs = await p.$$eval('button', els => [...new Set(els.map(e => (e.innerText || '').trim()).filter(Boolean))].slice(-10));
  console.log('botões:', JSON.stringify(bs));
  console.log('ecrã:', (await p.evaluate(()=>document.body.innerText.replace(/\s+/g,' '))).slice(0,600));
  await p.screenshot({ path:'test-artifacts/recon-oc-rever.png', fullPage:true });
  const erros = await p.evaluate(()=>{
    const out=[];
    document.querySelectorAll('*').forEach(el=>{
      if(el.children.length===0){
        const t=(el.textContent||'').trim();
        if(t && t.length<120 && /obrigat|preench|selecc|escolh|inv[aá]lid|erro|falta|necess/i.test(t)) out.push(t);
      }
    });
    return [...new Set(out)].slice(0,10);
  });
  console.log('mensagens de validação:', JSON.stringify(erros));
  const req = await p.evaluate(()=>[...document.querySelectorAll('input,textarea,select')].map(e=>({ph:e.placeholder,tag:e.tagName,req:e.required,val:(e.value||'').slice(0,30),vis:!!e.offsetParent})).filter(x=>x.vis));
  console.log('campos+valores:', JSON.stringify(req));
  await c.ctx.close(); await browser.close();
})();
