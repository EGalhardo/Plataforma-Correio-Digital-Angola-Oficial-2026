import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ListaRolavel} from '../../src/components/ui/ListaRolavel';
import {ListaParticipacaoContent} from '../../src/components/features/ListaParticipacaoContent';
import {LanguageProvider} from '../../src/context/language/LanguageContext';
import '../../src/index.css';
function Harness(){
 const [count,setCount]=useState(10),[expand,setExpand]=useState(false),[mode,setMode]=useState('mixed'),[clicked,setClicked]=useState('');
 const messages=Array.from({length:count},(_,i)=>({id:i+1,org:'Instituição Teste',preview:'Texto de teste',date:'14/09/2026',status:'Normal',sondagem_id:i+1,details:{subject:'[DENÚNCIA] Registo '+(i+1),body:''}}));
 return <LanguageProvider><div className="p-4 max-w-4xl mx-auto">
 <label>Quantidade<input id="count" type="number" value={count} onChange={e=>setCount(Number(e.target.value))}/></label>
 <select id="mode" value={mode} onChange={e=>setMode(e.target.value)}><option value="mixed">Normal e IA</option><option value="inqueritos">Inquéritos</option><option value="denuncias">Denúncias</option></select>
 <button id="expand" onClick={()=>setExpand(!expand)}>Expandir</button><output>{clicked}</output>
 {mode==='mixed'?<ListaRolavel count={count} label="Lista de teste">
 {Array.from({length:count},(_,i)=><button key={i} style={{height:expand&&i===0?600:24+(i%3)*8,flexShrink:0}} onClick={()=>setClicked('Aberto '+(i+1))}>Item {i+1}</button>)}
 </ListaRolavel>:<ListaParticipacaoContent tipo={mode as 'inqueritos'|'denuncias'} isInst={mode==='denuncias'} messages={messages} onOpen={m=>setClicked('Aberto '+m.id)} onBack={()=>{}}/>}
 </div></LanguageProvider>
}
createRoot(document.getElementById('root')!).render(<Harness/>);
