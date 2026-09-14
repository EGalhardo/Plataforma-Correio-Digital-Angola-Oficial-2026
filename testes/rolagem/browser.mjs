import {chromium} from 'playwright';import assert from 'node:assert/strict';
const b=await chromium.launch();let checks=0;
try{
for(const width of [1440,390]){
 const p=await b.newPage({viewport:{width,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>new URL(r.request().url()).hostname==='localhost'?r.continue():r.abort());
 await p.goto('http://localhost:3010/testes/rolagem/index.html');
 for(const mode of ['mixed','inqueritos','denuncias']){
  await p.locator('#mode').selectOption(mode);
  for(const n of [0,9,10,11,25]){
   await p.locator('#count').fill(String(n));
   const wrapper=p.locator('[data-list-scroll]');
   if(n===0 && mode!=='mixed'){assert.equal(await wrapper.count(),0);checks++;continue}
   await wrapper.waitFor({state:'attached'});
   await p.waitForFunction(({n})=>{const w=document.querySelector('[data-list-scroll]');return w?.getAttribute('data-list-scroll')===String(n>10)&&w.querySelector('[data-list-content]').children.length===n},{n});
   assert.equal(await wrapper.locator('[data-list-content] > *').count(),n);checks++;
   if(n>10){
    const dims=await wrapper.evaluate(w=>({h:w.clientHeight,sh:w.scrollHeight,tab:w.tabIndex,overflow:getComputedStyle(w).overflowY,full:Array.from(w.querySelector('[data-list-content]').children).filter(x=>{const r=x.getBoundingClientRect(),v=w.getBoundingClientRect();return r.top>=v.top-1&&r.bottom<=v.bottom+1}).length}));
    assert.ok(dims.sh>dims.h&&dims.tab===0&&dims.overflow==='auto'&&dims.full<=10);checks++;
    await wrapper.focus();await p.keyboard.press('End');await p.waitForFunction(()=>{const w=document.querySelector('[data-list-scroll]');return w.scrollTop>0});
    const last=wrapper.locator('[data-list-content] > *').last();await last.click();assert.equal(await p.locator('output').innerText(),'Aberto '+n);checks++;
   }else{assert.ok(!await wrapper.getAttribute('style'));checks++}
  }
  await p.locator('#count').fill('10');await p.waitForFunction(()=>document.querySelector('[data-list-scroll]')?.getAttribute('data-list-scroll')==='false');assert.ok(!await wrapperStyle(p));checks++;
 }
 await p.locator('#mode').selectOption('mixed');await p.locator('#count').fill('25');await p.locator('#expand').click();
 await p.locator('[data-list-scroll]').evaluate(w=>w.scrollTop=0);
 const full=await p.locator('[data-list-scroll]').evaluate(w=>Array.from(w.querySelector('[data-list-content]').children).filter(x=>{const r=x.getBoundingClientRect(),v=w.getBoundingClientRect();return r.top>=v.top&&r.bottom<=v.bottom}).length);
 assert.ok(full<=10);checks++;
 assert.deepEqual(errors,[]);console.log('PASS viewport',width);await p.close();
}
console.log(checks+' verificações aprovadas');
}finally{await b.close()}
async function wrapperStyle(p){return p.locator('[data-list-scroll]').getAttribute('style')}
