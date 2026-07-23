// ============================================================================
// Registar Instituição — formulário público de página única (área Login)
// ----------------------------------------------------------------------------
// Espelha o popup "Criar/Editar Instituição" da página Instituições da Admin,
// SEM os campos Estado/Logótipo (exclusivos da Admin). No final o sistema
// gera o Código Institucional (SIGLA + sequencial global) e a conta nasce
// PENDENTE — o mesmo modelo do registo do cidadão.
// ============================================================================

import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2, MapPin, Mail, Phone, User, Briefcase, Lock, Shield,
  CheckCircle, CheckCircle2, Loader2, ArrowLeft, Copy, Check, Landmark
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { homologationStore } from '../../services/homologationStore';
import {
  MUNICIPALITIES_BY_PROVINCE, CITIES_BY_PROVINCE, COMMUNES_BY_MUNICIPALITY,
  INSTITUTION_TYPES, generateSigla
} from '../../config/institutionCatalog';
import {
  buildInstObservacoes, buildInstCode, buildInstitutionalCode, buildAgentNumber,
  collectInstitutionUniqueness, nextGlobalSeq, normalizeInstCode, saveLocalInstReg,
  type InstitutionRegPack
} from '../../services/institutionRegistrationStore';

interface RegisterInstitutionPageProps {
  onCancel: () => void;
  onSuccess: () => void;
  addAuditLog: (action: string, type?: 'info' | 'warning' | 'critical' | 'success') => void;
}

const inputCls = "w-full bg-white border border-slate-200 focus:border-[#2563eb]/40 focus:ring-1 focus:ring-[#2563eb]/40 rounded-[14px] px-4 py-3 text-xs font-bold text-slate-800 outline-none transition-all placeholder:text-slate-350";
const selectCls = inputCls + " appearance-none cursor-pointer pr-9 pl-4";
const labelCls = "text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1";
const errCls = "border-red-300 focus:border-red-400 focus:ring-red-300";

export function RegisterInstitutionPage({ onCancel, onSuccess, addAuditLog }: RegisterInstitutionPageProps) {
  // Dados da Instituição
  const [fullName, setFullName] = useState('');
  const [sigla, setSigla] = useState('');
  const [siglaEdited, setSiglaEdited] = useState(false);
  const [typeInst, setTypeInst] = useState('Ministério');
  // Localização
  const [province, setProvince] = useState('Luanda');
  const [cidade, setCidade] = useState(CITIES_BY_PROVINCE['Luanda'][0]);
  const [municipio, setMunicipio] = useState(MUNICIPALITIES_BY_PROVINCE['Luanda'][1] || 'Belas');
  const [comuna, setComuna] = useState(() => (COMMUNES_BY_MUNICIPALITY[municipio] || ['Sede'])[0]);
  const [endereco, setEndereco] = useState('');
  // Contactos
  const [emailContacto, setEmailContacto] = useState('');
  const [telefone, setTelefone] = useState('');
  // Responsável
  const [respName, setRespName] = useState('');
  const [respCargo, setRespCargo] = useState('');
  // Credenciais de Acesso (do responsável)
  const [emailAcesso, setEmailAcesso] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [generatedAgent, setGeneratedAgent] = useState('');
  const [copied, setCopied] = useState(false);

  const setErr = (k: string, msg: string) => setFieldErrors(prev => msg ? { ...prev, [k]: msg } : (({ [k]: _, ...rest }) => rest)(prev));
  const isEmailValid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  const handleHeightName = (v: string) => {
    setFullName(v);
    if (!siglaEdited) setSigla(generateSigla(v === '' ? 'I' : v));
  };

  const onChangeProvince = (v: string) => {
    setProvince(v);
    const munis = MUNICIPALITIES_BY_PROVINCE[v] || ['Todos'];
    const nextMuni = munis[1] || munis[0] || '';
    setMunicipio(nextMuni);
    const cities = CITIES_BY_PROVINCE[v] || ['Sede'];
    setCidade(cities[0] || 'Sede');
    const coms = COMMUNES_BY_MUNICIPALITY[nextMuni] || ['Sede'];
    setComuna(coms[0] || 'Sede');
  };
  const onChangeMunicipio = (v: string) => {
    setMunicipio(v);
    const coms = COMMUNES_BY_MUNICIPALITY[v] || ['Sede'];
    setComuna(coms[0] || 'Sede');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFieldErrors({}); setSubmitError('');

    // 1. Validação de campos obrigatórios
    const errs: Record<string, string> = {};
    if (fullName.trim().length < 3) errs.fullName = 'Insira o nome institucional completo (mínimo 3 caracteres).';
    if (normalizeInstCode(sigla).length < 2) errs.sigla = 'Insira a sigla institucional.';
    if (!INSTITUTION_TYPES.includes(typeInst)) errs.typeInst = 'Selecione o tipo de instituição.';
    if (!province) errs.province = 'Selecione a província.';
    if (!cidade) errs.cidade = 'Selecione a cidade.';
    if (!municipio) errs.municipio = 'Selecione o município.';
    if (!comuna) errs.comuna = 'Selecione a comuna.';
    if (endereco.trim().length < 3) errs.endereco = 'Insira o endereço institucional.';
    if (!isEmailValid(emailContacto)) errs.emailContacto = 'Insira um e-mail institucional válido.';
    if (telefone.replace(/\D/g, '').length < 9) errs.telefone = 'Insira um telefone válido (mín. 9 dígitos).';
    if (respName.trim().length < 3) errs.respName = 'Insira o nome do responsável.';
    if (respCargo.trim().length < 2) errs.respCargo = 'Insira o cargo do responsável.';
    if (!isEmailValid(emailAcesso)) errs.emailAcesso = 'Insira o e-mail de acesso válido.';
    if (senha.length < 8) errs.senha = 'A senha deve ter pelo menos 8 caracteres.';
    if (confirmar !== senha) errs.confirmar = 'As senhas não coincidem.';
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      setSubmitError('Corrija os campos assinalados para finalizar o registo.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 2. Anti-duplicação (antes de gravar qualquer dado)
      setSubmitMessage('A verificar se os dados já existem na plataforma...');
      const uni = await collectInstitutionUniqueness(supabase);
      const s = normalizeInstCode(sigla);
      const eC = emailContacto.toLowerCase().trim();
      const eA = emailAcesso.toLowerCase().trim();
      if (uni.takenSiglas.includes(s)) {
        setSubmitError(`Não é possível efectuar o registo: a sigla "${s.toUpperCase()}" já se encontra registada.`);
        setIsSubmitting(false); return;
      }
      if (uni.takenEmails.includes(eC)) {
        setSubmitError('Não é possível efectuar o registo: este e-mail institucional já se encontra registado.');
        setIsSubmitting(false); return;
      }
      if (uni.takenEmails.includes(eA)) {
        setSubmitError('Não é possível efectuar o registo: este e-mail de acesso já se encontra registado.');
        setIsSubmitting(false); return;
      }

      // 3. Geração definitiva no submit — F6/B2: SIGLA + iniciais P/C/M/C (sufixo numérico se colidir)
      const code = buildInstitutionalCode(s, province, cidade, municipio, comuna, uni.takenCodes);
      if (uni.takenCodes.includes(code)) {
        setSubmitError('Não foi possível gerar um Código Institucional único. Tente novamente.');
        setIsSubmitting(false); return;
      }
      const agentNumber = buildAgentNumber(code, 1); // responsável = -01
      void buildInstCode; void nextGlobalSeq; // geradores do formato antigo (compatibilidade)

      const pack: InstitutionRegPack = {
        v: 1,
        sigla: s,
        tipo: typeInst,
        provincia: province,
        cidade,
        municipio,
        comuna,
        endereco: endereco.trim(),
        emailContacto: eC,
        emailAcesso: eA,
        telefone: telefone.trim(),
        responsavel: respName.trim(),
        cargo: respCargo.trim(),
        agentNumber,
      };
      const observacoes = buildInstObservacoes(pack, `Adesão formal da instituição ${fullName.trim()} (${s.toUpperCase()}). Pendente de homologação administrativa.`);

      // 4. Gravação na nuvem (mesma tabela do cidadão)
      const ready = (import.meta as any).env.VITE_SUPABASE_URL && (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
      if (ready) {
        setSubmitMessage('A enviar a solicitação para a Área de Administração...');
        const { error } = await supabase.from('solicitacoes_registo').insert([{
          nome: fullName.trim(),
          email: eA,
          password_hash: senha, // demo — igual ao modelo actual do cidadão
          bi_numero: code,      // o Código funciona como o B.I. da instituição
          url_frente: null,
          url_verso: null,
          url_selfie: null,
          status: 'Pendente',
          observacoes,
        }]);
        if (error) {
          if (error.code === '23505') {
            setSubmitError('Não é possível efectuar o registo: este Código Institucional já se encontra registado. Tente novamente.');
            setIsSubmitting(false); return;
          }
          if (error.code !== 'PGRST205') {
            console.error('Erro ao inserir solicitação institucional:', error);
          }
        }
      }

      // 5. Espelho local + conta nasce PENDENTE (modelo do cidadão)
      saveLocalInstReg({
        code,
        nome: fullName.trim(),
        email: eA,
        password: senha,
        status: 'Pendente',
        observacoes,
        criadoEm: new Date().toISOString(),
        agentNumber,
      });
      homologationStore.setStatus(code, 'pending', undefined, fullName.trim());
      // Correspondência automática da Área de Administração (visível na página informativa)
      homologationStore.clearThread(code);
      homologationStore.addMessage(
        code,
        'admin',
        `Exmos. Senhores da ${fullName.trim()} (${s.toUpperCase()}), a Área de Administração do Correio Digital Angola confirma a receção da vossa solicitação de adesão (Código Institucional: ${code}). O pedido já foi enviado para análise e em menos de 24 horas receberão uma resposta oficial através deste canal. Enquanto o pedido estiver pendente, cada comunicação oficial chega a esta caixa como correspondência não lida — o aviso aparece no badge da foto de perfil e no menu "Mensagens não lidas".`
      );
      addAuditLog(`Adesão institucional de ${fullName.trim()} (${code}) submetida — pendente de aprovação da Área de Administração.`, 'success');

      setGeneratedCode(code);
      setGeneratedAgent(agentNumber);
      addAuditLog(`Código Institucional gerado: ${code} · Nº Agente do responsável: ${agentNumber}`, 'info');
    } catch (err) {
      console.error('Erro global no registo institucional:', err);
      setSubmitError('Ocorreu um erro inesperado ao finalizar o registo. Tente novamente.');
    } finally {
      setIsSubmitting(false);
      setSubmitMessage('');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
    } catch {
      // fallback manual: seleccionar texto
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // ---------- Ecrã de sucesso ----------
  if (generatedCode) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex-1 flex flex-col items-center justify-center text-center space-y-5 py-6"
      >
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
          <CheckCircle2 size={30} />
        </div>
        <div>
          <h3 className="text-lg md:text-xl font-black text-[#0c2340] uppercase tracking-tight leading-tight">Pedido de Adesão Enviado!</h3>
          <p className="text-[11px] text-slate-500 font-medium max-w-md mx-auto mt-2 leading-relaxed">
            A sua solicitação foi enviada com sucesso à Área de Administração do Correio Digital Angola e em <strong>menos de 24 horas</strong> receberá uma resposta. Enquanto estiver <strong>Pendente de Aprovação</strong>, após o login, a resposta oficial chega à caixa de <strong>Correio</strong> como correspondência não lida — com aviso no badge da foto de perfil.
          </p>
        </div>
        <div className="w-full max-w-sm bg-slate-50 border-2 border-dashed border-[#2563eb]/30 rounded-3xl p-5 space-y-1.5">
          <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block">Código Institucional</span>
          <span className="font-mono font-black text-2xl text-[#0E2B64] tracking-widest block">{generatedCode}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#2563eb] hover:text-[#0E2B64] bg-transparent border-none cursor-pointer transition-colors"
          >
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            {copied ? 'Copiado!' : 'Copiar Código'}
          </button>
          {generatedAgent && (
            <div className="pt-2 mt-1 border-t border-dashed border-slate-200">
              <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block">Nº Agente Institucional do Responsável</span>
              <span className="font-mono font-black text-lg text-[#0E2B64] tracking-widest block">{generatedAgent}</span>
            </div>
          )}
          <p className="text-[9.5px] text-slate-400 mt-1 leading-snug">Guarde ambos: o <strong>Código</strong> identifica a instituição; o <strong>Nº Agente</strong> identifica a pessoa no login (responsável = -01; a equipa recebe -02, -03…).</p>
        </div>
        <button
          type="button"
          onClick={onSuccess}
          className="bg-[#0E2B64] hover:bg-[#081a3d] text-white rounded-xl px-8 py-3 font-black text-[11px] uppercase tracking-wider transition-all cursor-pointer border-none shadow-lg shadow-[#0E2B64]/15"
        >
          Voltar ao Login
        </button>
      </motion.div>
    );
  }

  // ---------- Formulário ----------
  return (
    <div className="flex-1 flex flex-col justify-center">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2 text-[#2563eb] mb-1">
        <button
          type="button"
          onClick={onCancel}
          className="bg-transparent border-none cursor-pointer text-slate-400 hover:text-[#0c2340] transition-colors p-1"
          title="Voltar"
        >
          <ArrowLeft size={15} />
        </button>
        <Landmark size={15} className="text-[#2563eb]" />
        <span className="font-black text-[11px] uppercase tracking-widest">REGISTO DE INSTITUIÇÃO</span>
      </div>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-4 ml-8">Adesão oficial ao Correio Digital Angola</p>

      <AnimatePresence>
        {submitError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-red-50 border border-red-200/60 text-red-700 px-4 py-2.5 rounded-2xl text-[10px] font-bold mb-3 leading-normal"
          >
            {submitError}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-5 pr-1 max-h-[62vh] overflow-y-auto custom-scrollbar">
        {/* 1. DADOS INSTITUCIONAIS */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[#2563eb]">
            <Building2 size={13} className="stroke-[2.5]" />
            <span className="font-extrabold text-[10px] uppercase tracking-widest">Dados da Instituição</span>
          </div>
          <div className="grid gap-1">
            <label className={labelCls}>Nome Institucional Completo *</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => { handleHeightName(e.target.value); setErr('fullName', ''); }}
              placeholder="Ex: Serviço de Migração e Estrangeiros"
              className={inputCls + (fieldErrors.fullName ? ' ' + errCls : '')}
            />
            {fieldErrors.fullName && <p className="text-[9.5px] text-red-500 font-bold ml-1">{fieldErrors.fullName}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="grid gap-1">
              <label className={labelCls}>Sigla Institucional *</label>
              <input
                type="text"
                value={sigla}
                onChange={(e) => { setSigla(e.target.value.toUpperCase().replace(/\s+/g, '')); setSiglaEdited(true); setErr('sigla', ''); }}
                placeholder="Ex: SME"
                className={inputCls + (fieldErrors.sigla ? ' ' + errCls : '')}
              />
              {fieldErrors.sigla && <p className="text-[9.5px] text-red-500 font-bold ml-1">{fieldErrors.sigla}</p>}
            </div>
            <div className="grid gap-1">
              <label className={labelCls}>Tipo de Instituição *</label>
              <div className="relative">
                <select value={typeInst} onChange={(e) => setTypeInst(e.target.value)} className={selectCls}>
                  {INSTITUTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">▼</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-dashed border-slate-150" />

        {/* 2. LOCALIZAÇÃO */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[#2563eb]">
            <MapPin size={13} className="stroke-[2.5]" />
            <span className="font-extrabold text-[10px] uppercase tracking-widest">Localização</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <label className={labelCls}>Província *</label>
              <div className="relative">
                <select value={province} onChange={(e) => onChangeProvince(e.target.value)} className={selectCls}>
                  {Object.keys(MUNICIPALITIES_BY_PROVINCE).filter(p => p !== 'Todas').map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">▼</span>
              </div>
            </div>
            <div className="grid gap-1">
              <label className={labelCls}>Cidade *</label>
              <div className="relative">
                <select value={cidade} onChange={(e) => setCidade(e.target.value)} className={selectCls}>
                  {(CITIES_BY_PROVINCE[province] || ['Sede']).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">▼</span>
              </div>
            </div>
            <div className="grid gap-1">
              <label className={labelCls}>Município *</label>
              <div className="relative">
                <select value={municipio} onChange={(e) => onChangeMunicipio(e.target.value)} className={selectCls}>
                  {(MUNICIPALITIES_BY_PROVINCE[province] || []).filter(m => m !== 'Todos').map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">▼</span>
              </div>
            </div>
            <div className="grid gap-1">
              <label className={labelCls}>Comuna *</label>
              <div className="relative">
                <select value={comuna} onChange={(e) => setComuna(e.target.value)} className={selectCls}>
                  {(COMMUNES_BY_MUNICIPALITY[municipio] || ['Sede']).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">▼</span>
              </div>
            </div>
          </div>
          <div className="grid gap-1">
            <label className={labelCls}>Endereço Institucional *</label>
            <input
              type="text"
              value={endereco}
              onChange={(e) => { setEndereco(e.target.value); setErr('endereco', ''); }}
              placeholder="Ex: Rua dos Correios, Casa 25, Maianga"
              className={inputCls + (fieldErrors.endereco ? ' ' + errCls : '')}
            />
            {fieldErrors.endereco && <p className="text-[9.5px] text-red-500 font-bold ml-1">{fieldErrors.endereco}</p>}
          </div>
        </div>

        <div className="border-t border-dashed border-slate-150" />

        {/* 3. CONTACTOS */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[#2563eb]">
            <Mail size={13} className="stroke-[2.5]" />
            <span className="font-extrabold text-[10px] uppercase tracking-widest">Contactos</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="grid gap-1">
              <label className={labelCls}>E-mail Institucional *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Mail size={14} /></span>
                <input
                  type="email"
                  value={emailContacto}
                  onChange={(e) => { setEmailContacto(e.target.value); setErr('emailContacto', ''); }}
                  placeholder="Ex: geral@sme.gov.ao"
                  className={inputCls + ' pl-10' + (fieldErrors.emailContacto ? ' ' + errCls : '')}
                />
              </div>
              {fieldErrors.emailContacto && <p className="text-[9.5px] text-red-500 font-bold ml-1">{fieldErrors.emailContacto}</p>}
            </div>
            <div className="grid gap-1">
              <label className={labelCls}>Telefone Institucional *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Phone size={14} /></span>
                <input
                  type="tel"
                  value={telefone}
                  onChange={(e) => { setTelefone(e.target.value); setErr('telefone', ''); }}
                  placeholder="Ex: +244 923 000 000"
                  className={inputCls + ' pl-10 font-mono' + (fieldErrors.telefone ? ' ' + errCls : '')}
                />
              </div>
              {fieldErrors.telefone && <p className="text-[9.5px] text-red-500 font-bold ml-1">{fieldErrors.telefone}</p>}
            </div>
          </div>
        </div>

        <div className="border-t border-dashed border-slate-150" />

        {/* 4. RESPONSÁVEL */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[#2563eb]">
            <User size={13} className="stroke-[2.5]" />
            <span className="font-extrabold text-[10px] uppercase tracking-widest">Responsável Institucional</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="grid gap-1">
              <label className={labelCls}>Nome do Responsável *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><User size={14} /></span>
                <input
                  type="text"
                  value={respName}
                  onChange={(e) => { setRespName(e.target.value); setErr('respName', ''); }}
                  placeholder="Ex: Dr. António Fernando"
                  className={inputCls + ' pl-10' + (fieldErrors.respName ? ' ' + errCls : '')}
                />
              </div>
              {fieldErrors.respName && <p className="text-[9.5px] text-red-500 font-bold ml-1">{fieldErrors.respName}</p>}
            </div>
            <div className="grid gap-1">
              <label className={labelCls}>Cargo do Responsável *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Briefcase size={14} /></span>
                <input
                  type="text"
                  value={respCargo}
                  onChange={(e) => { setRespCargo(e.target.value); setErr('respCargo', ''); }}
                  placeholder="Ex: Director Geral"
                  className={inputCls + ' pl-10' + (fieldErrors.respCargo ? ' ' + errCls : '')}
                />
              </div>
              {fieldErrors.respCargo && <p className="text-[9.5px] text-red-500 font-bold ml-1">{fieldErrors.respCargo}</p>}
            </div>
          </div>
        </div>

        <div className="border-t border-dashed border-slate-150" />

        {/* 5. CREDENCIAIS DE ACESSO */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[#2563eb]">
            <Shield size={13} className="stroke-[2.5]" />
            <span className="font-extrabold text-[10px] uppercase tracking-widest">Credenciais de Acesso</span>
          </div>
          <div className="grid gap-1">
            <label className={labelCls}>E-mail de Acesso (do responsável) *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Mail size={14} /></span>
              <input
                type="email"
                value={emailAcesso}
                onChange={(e) => { setEmailAcesso(e.target.value); setErr('emailAcesso', ''); }}
                placeholder="Ex: director@sme.gov.ao"
                className={inputCls + ' pl-10' + (fieldErrors.emailAcesso ? ' ' + errCls : '')}
              />
            </div>
            {fieldErrors.emailAcesso && <p className="text-[9.5px] text-red-500 font-bold ml-1">{fieldErrors.emailAcesso}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="grid gap-1">
              <label className={labelCls}>Senha *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Lock size={14} /></span>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => { setSenha(e.target.value); setErr('senha', ''); }}
                  placeholder="Mínimo 8 caracteres"
                  className={inputCls + ' pl-10' + (fieldErrors.senha ? ' ' + errCls : '')}
                />
              </div>
              {fieldErrors.senha
                ? <p className="text-[9.5px] text-red-500 font-bold ml-1">{fieldErrors.senha}</p>
                : senha && (
                  <p className={`text-[9.5px] font-bold ml-1 ${senha.length >= 8 && /\d/.test(senha) && /[a-zA-Z]/.test(senha) ? 'text-emerald-600' : senha.length >= 6 ? 'text-amber-600' : 'text-red-500'}`}>
                    Força: {senha.length >= 8 && /\d/.test(senha) && /[a-zA-Z]/.test(senha) ? 'Forte' : senha.length >= 6 ? 'Média' : 'Fraca'}
                  </p>
                )}
            </div>
            <div className="grid gap-1">
              <label className={labelCls}>Confirmar Senha *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Lock size={14} /></span>
                <input
                  type="password"
                  value={confirmar}
                  onChange={(e) => { setConfirmar(e.target.value); setErr('confirmar', ''); }}
                  placeholder="Repita a senha"
                  className={inputCls + ' pl-10' + (fieldErrors.confirmar ? ' ' + errCls : '')}
                />
              </div>
              {confirmar && senha === confirmar && !fieldErrors.confirmar && (
                <p className="text-[9.5px] text-emerald-600 font-bold ml-1 flex items-center gap-1"><Check size={10} /> As senhas coincidem</p>
              )}
              {fieldErrors.confirmar && <p className="text-[9.5px] text-red-500 font-bold ml-1">{fieldErrors.confirmar}</p>}
            </div>
          </div>

          {/* F6/B2 — Gerados automaticamente pelo sistema (pré-visualização em tempo real; valor definitivo no submit) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="grid gap-1">
              <label className={labelCls}>Código Institucional (automático)</label>
              <div className="bg-slate-50 border-2 border-dashed border-[#2563eb]/25 rounded-[14px] px-4 py-3 text-xs font-mono font-black text-[#0E2B64] tracking-widest select-all">
                {normalizeInstCode(sigla).length >= 2
                  ? buildInstitutionalCode(sigla, province, cidade, municipio, comuna, [])
                  : 'Aguarda a sigla…'}
              </div>
              <p className="text-[8.5px] text-slate-400 font-bold ml-1 leading-snug">Sigla + iniciais de Província · Cidade · Município · Comuna.</p>
            </div>
            <div className="grid gap-1">
              <label className={labelCls}>Nº Agente Institucional (automático)</label>
              <div className="bg-slate-50 border-2 border-dashed border-[#2563eb]/25 rounded-[14px] px-4 py-3 text-xs font-mono font-black text-[#0E2B64] tracking-widest select-all">
                {normalizeInstCode(sigla).length >= 2
                  ? `${buildInstitutionalCode(sigla, province, cidade, municipio, comuna, [])}-01`
                  : 'Aguarda a sigla…'}
              </div>
              <p className="text-[8.5px] text-slate-400 font-bold ml-1 leading-snug">O responsável criado neste registo recebe sempre o agente -01.</p>
            </div>
          </div>
        </div>

        <div className="border-t border-dashed border-slate-150 pt-2" />

        {/* Ações */}
        <div className="flex items-center justify-between gap-3 pb-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-[16px] font-extrabold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-[#0E2B64] hover:bg-[#081a3d] disabled:opacity-60 text-white py-3 rounded-[16px] font-black text-[10.5px] uppercase tracking-widest shadow-xl shadow-[#0E2B64]/15 flex items-center justify-center gap-2 transition-all cursor-pointer border-none"
          >
            {isSubmitting ? (<><Loader2 size={13} className="animate-spin" /> {submitMessage || 'A processar...'}</>) : (<><CheckCircle size={13} className="stroke-[3]" /> Finalizar Registo</>)}
          </button>
        </div>
      </form>
    </div>
  );
}
