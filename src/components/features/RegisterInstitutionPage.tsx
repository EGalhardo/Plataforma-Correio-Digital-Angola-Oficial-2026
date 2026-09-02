// ============================================================================
// Registar Instituição — formulário público de página única (área Login)
// ----------------------------------------------------------------------------
// Espelha o popup "Criar/Editar Instituição" da página Instituições da Admin,
// SEM os campos Estado/Logótipo (exclusivos da Admin). No final o sistema
// gera o Código Institucional (SIGLA + sequencial global) e a conta nasce
// PENDENTE — o mesmo modelo do registo do cidadão.
// ============================================================================

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2, MapPin, Mail, Phone, User, Briefcase, Lock, Shield,
  CheckCircle, CheckCircle2, Loader2, ArrowLeft, Copy, Check, Landmark
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { registoPublicoProxy } from '../../services/supabaseService';
import { provisionCloudAccount, markCloudAccount, isSupabaseConfigured, syntheticInstitutionAgentEmail } from '../../services/cloudAuthService';
import { purgeInstitutionLocalResidues } from '../../services/institutionSessionService';
import { homologationStore } from '../../services/homologationStore';
import {
  MUNICIPALITIES_BY_PROVINCE, CITIES_BY_PROVINCE, COMMUNES_BY_MUNICIPALITY,
  INSTITUTION_TYPES, generateSigla
} from '../../config/institutionCatalog';
import { DIRECTORIO_INSTITUCIONAL_ANGOLA } from '../../constants/directorioInstitucionalAngola';
import {
  buildInstObservacoes, buildInstCode, buildInstitutionalCode, buildAgentNumber,
  collectInstitutionUniqueness, nextGlobalSeq, normalizeInstCode, saveLocalInstReg,
  validarSigla, validarLocalizacao, countAgentsWithLocalFallback,
  type InstitutionRegPack
} from '../../services/institutionRegistrationStore';
import { normalizarNome, normalizarTitulo, normalizarTexto, corrigirDominioEmail } from '../../services/textNormalizeService';

interface RegisterInstitutionPageProps {
  onCancel: () => void;
  onSuccess: () => void;
  addAuditLog: (action: string, type?: 'info' | 'warning' | 'critical' | 'success') => void;
}

const inputCls = "w-full bg-white border border-slate-200 focus:border-[#2563eb]/40 focus:ring-1 focus:ring-[#2563eb]/40 rounded-[14px] px-4 py-3 text-xs font-bold text-slate-800 outline-none transition-all placeholder:text-slate-400";
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
  // v37.78.18 — REGRAS UX: estado da sincronização em segundo plano com a fila
  // da Administração (o ecrã de sucesso aparece IMEDIATAMENTE com o Código).
  const [syncEstado, setSyncEstado] = useState<'a_enviar' | 'ok' | 'falhou'>('a_enviar');
  const retryEnvioRef = useRef<(() => void) | null>(null);
  
  // Estado para contagem de agentes existentes (próximo Nº de Agente)
  const [agentCount, setAgentCount] = useState<number>(0);
  const [nextAgentSeq, setNextAgentSeq] = useState<number>(1);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);

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

  // Pré-visualização do próximo Nº de Agente: consulta a base de dados + store local
  // quando a SIGLA e os campos de localização estão válidos.
  useEffect(() => {
    const siglaValidacao = validarSigla(sigla);
    const localValidacao = validarLocalizacao(province, cidade, municipio, comuna);
    
    if (!siglaValidacao.valido || !localValidacao.valido) {
      setAgentCount(0);
      setNextAgentSeq(1);
      return;
    }
    
    const codigoPrevisualizacao = buildInstitutionalCode(
      siglaValidacao.siglaLimpa, province, cidade, municipio, comuna, []
    );
    
    let cancelled = false;
    const fetchAgentCount = async () => {
      setIsLoadingAgents(true);
      try {
        const result = await countAgentsWithLocalFallback(supabase, codigoPrevisualizacao);
        if (!cancelled) {
          setAgentCount(result.count);
          setNextAgentSeq(result.nextSeq);
        }
      } catch (e) {
        if (!cancelled) {
          setAgentCount(0);
          setNextAgentSeq(1);
        }
      } finally {
        if (!cancelled) setIsLoadingAgents(false);
      }
    };
    
    // Debounce: esperar 500ms após a última alteração para não consultar a cada tecla
    const timer = setTimeout(fetchAgentCount, 500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [sigla, province, cidade, municipio, comuna]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFieldErrors({}); setSubmitError('');

    // 1. Validação de campos obrigatórios
    const errs: Record<string, string> = {};
    if (fullName.trim().length < 3) errs.fullName = 'Insira o nome institucional completo (mínimo 3 caracteres).';
    
    // Validação rigorosa da SIGLA (2-10 caracteres, apenas letras)
    const siglaValidacao = validarSigla(sigla);
    if (!siglaValidacao.valido) {
      errs.sigla = siglaValidacao.erro || 'Sigla inválida.';
    }
    
    if (!INSTITUTION_TYPES.includes(typeInst)) errs.typeInst = 'Selecione o tipo de instituição.';
    
    // Validação dos campos de localização
    const locValidacao = validarLocalizacao(province, cidade, municipio, comuna);
    if (!locValidacao.valido) {
      // Determinar qual campo está vazio
      if (!province || province === 'Selecione...') errs.province = 'Selecione a província.';
      if (!cidade || cidade === 'Selecione...') errs.cidade = 'Selecione a cidade.';
      if (!municipio || municipio === 'Selecione...') errs.municipio = 'Selecione o município.';
      if (!comuna || comuna === 'Selecione...') errs.comuna = 'Selecione a comuna.';
    }
    
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
      const siglaFinal = siglaValidacao.siglaLimpa;
      const code = buildInstitutionalCode(siglaFinal, province, cidade, municipio, comuna, uni.takenCodes);
      if (uni.takenCodes.includes(code)) {
        setSubmitError('Não foi possível gerar um Código Institucional único. Tente novamente.');
        setIsSubmitting(false); return;
      }
      
      // Consultar o próximo Nº de Agente com contagem real da base de dados
      const agentResult = await countAgentsWithLocalFallback(supabase, code);
      const agentNumber = buildAgentNumber(code, agentResult.nextSeq);
      void buildInstCode; void nextGlobalSeq; // geradores do formato antigo (compatibilidade)
      // v37.74 — CONTA NOVA NASCE LIMPA (espelho v37.71 do cidadão): ciclos
      // eliminar→re-criar com o mesmo código deixavam rasto no dispositivo
      // (foto de perfil anterior, dados editados, espelho da equipa, estado de
      // homologação antigo) que era re-hidratado no login da adesão re-criada.
      // Purga ANTES de gravar o novo registo — a nova adesão parte de zero.
      try { purgeInstitutionLocalResidues(code); } catch { /* melhor esforço */ }

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
      setSyncEstado('a_enviar');

      // v37.78.18 — REGRAS UX (2.º plano): o utilizador recebe o Código e o
      // Nº Agente IMEDIATAMENTE; a gravação na fila da Administração e o
      // provisionamento do responsável correm em segundo plano (com uma
      // retoma automática e, se persistir a falha, aviso honesto + repetição).
      const enviarAdesaoNuvem = async (): Promise<'ok' | 'duplicado' | 'falhou'> => {
        try {
          // 4. Gravação na nuvem (mesma tabela do cidadão) — via proxy (service role)
          const ready = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
          if (!ready) return 'ok'; // sem nuvem configurada: espelho local (D3)
          const payloadAdesao = {
            nome: fullName.trim(),
            email: eA,
            bi_numero: code,      // o Código funciona como o B.I. da instituição
            url_frente: null,
            url_verso: null,
            url_selfie: null,
            status: 'Pendente',
            observacoes,
          };
          let error: any = null;
          // v37.78.18 — ANONIMO: a adesão é uma submissão pública; sem isto o
          // servidor «carimba» o bi_numero com o B.I. de qualquer cidadão com
          // sessão aberta neste browser (anti-spoof) e a adesão nasce corrompida.
          const viaProxy = await registoPublicoProxy('insert', undefined, payloadAdesao, { anonimo: true });
          if (viaProxy !== null) {
            if (!viaProxy.ok && viaProxy.erro !== 'demo') {
              error = { code: 'PROXY', message: viaProxy.erro || 'Falha ao registar a adesão na base central.' };
            }
          }
          if (viaProxy === null || (viaProxy && viaProxy.erro === 'demo')) {
            const direct = await supabase.from('solicitacoes_registo').insert([payloadAdesao]);
            error = direct.error;
          }
          if (error) {
            if (error.code === '23505') return 'duplicado';
            if (error.code !== 'PGRST205') console.error('Erro ao inserir solicitação institucional:', error);
            return 'falhou';
          }
          return 'ok';
        } catch {
          return 'falhou';
        }
      };

      const concluirEnvioNuvem = async () => {
        let r = await enviarAdesaoNuvem();
        if (r === 'falhou') {
          // uma retoma automática rápida antes de sinalizar falha
          await new Promise((res) => setTimeout(res, 5000));
          r = await enviarAdesaoNuvem();
        }
        if (r === 'ok') {
          setSyncEstado('ok');
          addAuditLog(`[NUVEM-BG] Adesão de ${fullName.trim()} (${code}) entregue à fila da Administração.`, 'success');
        } else if (r === 'duplicado') {
          setSyncEstado('ok');
          addAuditLog(`[NUVEM-BG] Adesão de ${code} já constava da fila central (código único) — mantida Pendente para homologação.`, 'warning');
        } else {
          setSyncEstado('falhou');
          homologationStore.addMessage(
            code,
            'admin',
            `ATENÇÃO: a sincronização da adesão de ${fullName.trim()} com a base central falhou — a Área de Administração ainda não recebeu o pedido. Toque em «Tentar novamente» no ecrã de conclusão (ou repita o registo mais tarde) para entregar a solicitação.`,
          );
          addAuditLog(`[NUVEM-BG] FALHA: a adesão de ${fullName.trim()} (${code}) não chegou à fila central — retoma manual disponível no ecrã de conclusão.`, 'critical');
        }
      };
      retryEnvioRef.current = () => { void concluirEnvioNuvem(); };
      void concluirEnvioNuvem();

      // — provisionamento do RESPONSÁVEL em segundo plano (F32 preservado) —
      void (async () => {
      // F32 (v12/D4-a) — o RESPONSÁVEL (-01) nasce na nuvem: a senha vive apenas no
      // Supabase Auth (bcrypt da plataforma). Best-effort (D3): falha nunca quebra a
      // adesão — a migração just-in-time ocorre no primeiro login (D2).
      if (isSupabaseConfigured()) {
        try {
          const cloudEmail = syntheticInstitutionAgentEmail(agentNumber);
          const prov = await provisionCloudAccount(supabase, {
            email: cloudEmail,
            password: senha,
            metadata: { agent: agentNumber, instituicao: code, name: respName.trim(), role: 'instituicao' },
          });
          if (prov.outcome === 'ok' || prov.outcome === 'linked_existing') {
            markCloudAccount(agentNumber, cloudEmail, 'instituicao');
            addAuditLog(`[AUTH-CLOUD] Responsável ${agentNumber} (${respName.trim()}) nascido na nuvem — a senha vive apenas no Supabase Auth.`, 'success');
          } else if (prov.outcome === 'pending_confirm') {
            addAuditLog('[AUTH-CLOUD] ATENÇÃO: confirmação de e-mail activa no Supabase — desactivar (Authentication → Providers → Email).', 'warning');
          } else if (prov.outcome === 'unavailable') {
            addAuditLog(`[AUTH-CLOUD] Nuvem indisponível no registo de ${fullName.trim()} — credencial local mantida; migração just-in-time no primeiro login (D3).`, 'warning');
          }
        } catch (cloudErr) {
          console.error('[AUTH-CLOUD] Falha inesperada no provisionamento institucional:', cloudErr);
        }
      }
      })();

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
          <h3 className="text-lg md:text-xl font-black text-[#0c2340] uppercase tracking-tight leading-tight">Pedido de Adesão Registado!</h3>
          <p className="text-[11px] text-slate-500 font-medium max-w-md mx-auto mt-2 leading-relaxed">
            A sua solicitação foi registada com sucesso e está a ser entregue à Área de Administração do Correio Digital Angola — em <strong>menos de 24 horas</strong> após a entrega receberá uma resposta. Enquanto estiver <strong>Pendente de Aprovação</strong>, após o login, a resposta oficial chega à caixa de <strong>Correio</strong> como correspondência não lida — com aviso no badge da foto de perfil.
          </p>
        </div>
        {/* v37.78.18 — estado vivo da entrega em segundo plano (REGRAS UX) */}
        <div className="w-full max-w-sm">
          {syncEstado === 'a_enviar' && (
            <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-2">
              <Loader2 size={12} className="animate-spin" /> A entregar à Administração…
            </div>
          )}
          {syncEstado === 'ok' && (
            <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-4 py-2">
              <CheckCircle2 size={12} /> Solicitação entregue à Administração
            </div>
          )}
          {syncEstado === 'falhou' && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-left space-y-2">
              <p className="text-[10.5px] font-bold text-amber-800 leading-relaxed m-0">
                ⚠️ A entrega à base central falhou — a Administração ainda não recebeu o pedido. A sua adesão ficou registada neste dispositivo com o Código abaixo.
              </p>
              <button
                type="button"
                onClick={() => { setSyncEstado('a_enviar'); retryEnvioRef.current?.(); }}
                className="px-4 py-2 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase tracking-wider border-none cursor-pointer transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          )}
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
              onBlur={() => { const n = normalizarTitulo(fullName); if (n !== fullName) handleHeightName(n); }}
              placeholder="Ex: Serviço de Migração e Estrangeiros"
              list="cda-directorio-sugestoes"
              className={inputCls + (fieldErrors.fullName ? ' ' + errCls : '')}
            />
            <datalist id="cda-directorio-sugestoes">
              {DIRECTORIO_INSTITUCIONAL_ANGOLA
                .filter(e => !e.referenciaDinamica)
                .map(e => <option key={e.id} value={e.nome} />)}
            </datalist>
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
              onBlur={() => { const n = normalizarTexto(endereco); if (n !== endereco) setEndereco(n); }}
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
                  list="cda-dominios-email"
                  value={emailContacto}
                  onChange={(e) => { setEmailContacto(e.target.value); setErr('emailContacto', ''); }}
                  onBlur={() => { const c = corrigirDominioEmail(emailContacto); if (c && c !== emailContacto) { setEmailContacto(c); setErr('emailContacto', ''); } }}
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
                  onBlur={() => { const n = normalizarNome(respName); if (n !== respName) setRespName(n); }}
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
                  onBlur={() => { const n = normalizarTitulo(respCargo); if (n !== respCargo) setRespCargo(n); }}
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
                list="cda-dominios-email"
                value={emailAcesso}
                onChange={(e) => { setEmailAcesso(e.target.value); setErr('emailAcesso', ''); }}
                onBlur={() => { const c = corrigirDominioEmail(emailAcesso); if (c && c !== emailAcesso) { setEmailAcesso(c); setErr('emailAcesso', ''); } }}
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
                {(() => {
                  const siglaVal = validarSigla(sigla);
                  const locVal = validarLocalizacao(province, cidade, municipio, comuna);
                  if (!siglaVal.valido) return '⚠ Sigla inválida (2-10 letras)';
                  if (!locVal.valido) return '⚠ Preencha Província, Cidade, Município e Comuna';
                  return buildInstitutionalCode(siglaVal.siglaLimpa, province, cidade, municipio, comuna, []);
                })()}
              </div>
              <p className="text-[8.5px] text-slate-400 font-bold ml-1 leading-snug">Sigla + iniciais de Província · Cidade · Município · Comuna.</p>
            </div>
            <div className="grid gap-1">
              <label className={labelCls}>Nº Agente Institucional (automático)</label>
              <div className="bg-slate-50 border-2 border-dashed border-[#2563eb]/25 rounded-[14px] px-4 py-3 text-xs font-mono font-black text-[#0E2B64] tracking-widest select-all flex items-center gap-2">
                {isLoadingAgents ? (
                  <Loader2 size={12} className="animate-spin text-[#2563eb]" />
                ) : null}
                <span>
                  {(() => {
                    const siglaVal = validarSigla(sigla);
                    const locVal = validarLocalizacao(province, cidade, municipio, comuna);
                    if (!siglaVal.valido || !locVal.valido) return 'Aguarda dados válidos…';
                    const codigo = buildInstitutionalCode(siglaVal.siglaLimpa, province, cidade, municipio, comuna, []);
                    return `${codigo}-${String(nextAgentSeq).padStart(2, '0')}`;
                  })()}
                </span>
              </div>
              <p className="text-[8.5px] text-slate-400 font-bold ml-1 leading-snug">
                {agentCount > 0 
                  ? `${agentCount} agente${agentCount > 1 ? 's' : ''} existente${agentCount > 1 ? 's' : ''} — próximo: -${String(nextAgentSeq).padStart(2, '0')}`
                  : 'O responsável criado neste registo recebe sempre o agente -01.'}
              </p>
            </div>
          </div>
          
          {/* Validação visual da SIGLA */}
          {sigla && !siglaEdited && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-[9px] text-blue-700 font-semibold leading-relaxed">
              💡 A sigla é gerada automaticamente a partir do nome da instituição. Pode editá-la manualmente se necessário.
            </div>
          )}
          {siglaEdited && sigla && (() => {
            const val = validarSigla(sigla);
            if (!val.valido) {
              return (
                <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-[9px] text-red-700 font-semibold leading-relaxed">
                  ⚠ {val.erro}
                </div>
              );
            }
            return (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-[9px] text-emerald-700 font-semibold leading-relaxed">
                ✓ Sigla válida: {val.siglaLimpa} ({val.siglaLimpa.length} caracteres)
              </div>
            );
          })()}
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
    
      <datalist id="cda-dominios-email">
        <option value="@gmail.com" />
        <option value="@yahoo.com" />
        <option value="@hotmail.com" />
        <option value="@outlook.com" />
        <option value="@icloud.com" />
        <option value="@correiodigital.ao" />
        <option value="@inapem.ao" />
        <option value="@agt.ao" />
        <option value="@sme.ao" />
        <option value="@minfin.gov.ao" />
      </datalist>
</div>
  );
}
