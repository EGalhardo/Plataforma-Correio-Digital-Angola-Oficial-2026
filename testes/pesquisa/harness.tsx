// Componentes originais, dados fictícios e armazenamento exclusivamente em memória.
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ContactsContent} from '../../src/components/features/ContactsContent';
import {AddContactModal} from '../../src/components/features/AddContactModal';
import {MailContent} from '../../src/components/features/MailContent';
import {LanguageProvider} from '../../src/context/language/LanguageContext';
import {pesquisarContacto, pesquisarMensagem, CONTACTO_INSTITUCIONAL} from '../../src/utils/pesquisaContactosCorreio';
import {validateContactForm} from '../../src/services/emergencyContactsService';
import '../../src/index.css';
const initial:any[]=[{id:1,name:'José Teste',bi:'BI-TESTE',relation:'Amigo/a',phone:'+244 923 111 222',email:'jose@example.test',type:'Normal',status:'Confirmado'}, {id:2,name:'Clínica Fictícia',bi:'NIF-TESTE',relation:CONTACTO_INSTITUCIONAL,phone:'+244 222 111 222',type:'Normal',status:'Confirmado'}];
const msgs:any[]=[{id:1,org:'Instituição Alfa',preview:'Aviso',details:{subject:'Renovação',body:'Documento especial'},date:'14/09/2026',status:'Normal',unread:1},{id:2,org:'Entidade Beta',preview:'Outro assunto',details:{subject:'Pagamento',body:'Factura'},date:'14/09/2026',status:'Normal',unread:1}];
const empty:any={name:'',bi:'',relation:'',phone:'',whatsapp:'',email:'',type:'Normal'};
function Harness(){
 const [contacts,setContacts]=useState(initial),[query,setQuery]=useState(''),[open,setOpen]=useState(false),[form,setForm]=useState(empty),[errors,setErrors]=useState<string[]>([]),[page,setPage]=useState('contacts');
 return <LanguageProvider><button id="test-mail" onClick={()=>{setPage('mail');setQuery('')}}>Correio teste</button>{page==='contacts'?<>
 <ContactsContent contacts={contacts} filteredContacts={contacts.filter(c=>pesquisarContacto(c,query))} searchContact={query} setSearchContact={setQuery} setIsAddingContact={setOpen} setContactToDelete={()=>{}} onAddContact={i=>{setForm({...empty,relation:i?CONTACTO_INSTITUCIONAL:''});setErrors([]);setOpen(true)}}/>
 <AddContactModal institutional={form.relation===CONTACTO_INSTITUCIONAL} isAddingContact={open} setIsAddingContact={setOpen} contactForm={form} setContactForm={setForm} formErrors={errors} onAddContact={()=>{const e=validateContactForm(form,contacts);setErrors(e);if(!e.length){setContacts([{...form,id:Date.now(),status:'Confirmado'},...contacts]);setOpen(false)}}}/>
 </>:<MailContent {...({isComposing:false,setIsComposing:()=>{},composeData:{to:'',subject:'',body:''},setComposeData:()=>{},handleSendMessage:()=>{},correspondenciaTab:'recebidas',setCorrespondenciaTab:()=>{},inbox:msgs,sentMessages:[],searchMail:query,setSearchMail:setQuery,filteredMessages:msgs.filter(m=>pesquisarMensagem(m,query)),handleSelectMessage:()=>{},setTab:()=>{},bi:'TESTE',unreadTotal:2,currentLanguage:'pt',contacts:[],institutions:[]} as any)}/>}</LanguageProvider>
}
createRoot(document.getElementById('root')!).render(<Harness/>);
