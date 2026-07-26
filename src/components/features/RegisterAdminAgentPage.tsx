// F19/F20/F22/F23 — Página "Registo" da área ADMIN (prompts v9.1 + v10.1 aprovados).
// Formulário fiel ao popup "REGISTAR NOVO MEMBRO DA EQUIPA — CREDENCIAL OPERACIONAL
// PLATAFORMA" da página Equipa, com todos os campos adaptados ao universo da
// Administração da Plataforma (CDA).
//
// v10.1 (Admin Alfa): a página serve UMA única vez — o registo do elemento mais
// alto da hierarquia — com Nº forçado ADMIN-0001, Estado "Ativo" (sem estágio de
// aprovação), permissões completas e os dois cargos máximos fixos (readOnly, D1).
// Após o registo, a opção "Registar" do login Admin fica desactivada com nota (D2/D3
// — flag 'cda_admin_alfa_v1'); os restantes membros são adicionados pelo Alfa na
// página Equipa (ADMIN-0002, ADMIN-0003, …). Se o Alfa for removido na Equipa, a
// opção "Registar" reactiva (D4). Credencial só neste dispositivo (D6).
// F23 — Revisão de layout conforme o modelo visual aprovado (imagem de
// referência): secções em painéis brancos rounded-2xl com badges maiores
// (1&2 azul, 3 âmbar, 4 navy), inputs rounded-xl mais altos, campos fixos com
// chevron de "select", Nº Agente com ícone '#', palavra-passe mascarada com
// botão olho, botão Submeter azul. Textos v9.1/v10.1 intactos.
// F24 — Dimensão igual às restantes páginas de registo (o mesmo cartão do
// login com painel lateral; scroll interno com teto) e título actualizado:
// "Registar Admin" (subtítulo "Credencial Operacional Plataforma" intacto).
// Reutiliza EXCLUSIVAMENTE o que já existe: adminAgentStore + a chave de
// trabalhadores da página Equipa ('correio_digital_admin_workers').

import { useState, type FormEvent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  UserPlus, User, Mail, Phone, IdCard, Building, Lock, Hash, Shield,
  CheckCircle2, Info, X, Check, Copy, ShieldCheck, KeyRound,
  Eye, EyeOff, ChevronDown,
} from 'lucide-react';
import {
  addAdminAgent,
  ADMIN_ALFA_AGENT,
  hasActiveAdminAlfa,
  isAdminAgentPasswordTaken,
  setAdminAlfa,
} from '../../services/adminAgentStore';
import { supabase } from '../../lib/supabaseClient';
import { provisionCloudAccount, markCloudAccount, isSupabaseConfigured, syntheticAdminEmail } from '../../services/cloudAuthService';

interface RegisterAdminAgentPageProps {
  onCancel: () => void;
  onSuccess: () => void;
  addAuditLog: (action: string, type?: 'info' | 'warning' | 'critical' | 'success') => void;
}

/** Mesma forma do `Trabajador` da página Equipa (GovContactsContent). */
interface AdminWorker {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  agentId: string;
  status: 'Ativo' | 'Desativado' | 'Suspenso' | 'Férias' | 'Pendente';
  lastAccess: string;
  phone: string;
  registrationDate: string;
  permissions: string[];
  activityLogs: { action: string; timestamp: string; ip: string }[];
}

const WORKERS_KEY = 'correio_digital_admin_workers';

// ---------- v10.1 — Conteúdo fixo do Admin Alfa (elemento mais alto da hierarquia) ----------
/** D1 — Perfil Funcional fixo do Alfa (readOnly, sem edição). */
const ALFA_ROLE = 'Administrador Geral da Plataforma';
/** D1 — Departamento / Área Funcional fixa do Alfa (readOnly, sem edição). */
const ALFA_DEPT = 'Direcção Geral — Sede Executiva';
/** Permissões completas — as mesmas do administrador-semente w-admin-1 da Equipa (reutilizadas). */
const ALFA_PERMISSIONS = ['Visualizar', 'Homologar', 'Bloqueio', 'Alertas', 'Logs', 'API'];

const readAdminWorkers = (): AdminWorker[] => {
  try {
    const raw = localStorage.getItem(WORKERS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const appendAdminWorker = (w: AdminWorker): void => {
  try {
    localStorage.setItem(WORKERS_KEY, JSON.stringify([...readAdminWorkers(), w]));
  } catch { /* sem storage: fica apenas a credencial */ }
};

// ---------- Sistema visual da página (F23 — modelo visual da referência anexada) ----------
const inputCls = "w-full bg-white border-2 border-slate-200 focus:border-[#2563eb]/35 rounded-xl pl-11 pr-4 py-4 text-[13px] text-slate-800 outline-none transition-all font-bold placeholder:text-slate-400 placeholder:font-medium";
/** v10.1 — campos do Alfa com valor fixo (readOnly): aspecto de select bloqueado (chevron à direita). */
const lockedCls = "w-full bg-slate-50 border-2 border-slate-200 rounded-xl pl-11 pr-11 py-4 text-[13px] text-slate-600 outline-none font-bold cursor-not-allowed select-none";
/** Palavra-passe: mesma geometria do input comum, com folga à direita para o botão "olho". */
const passwordCls = "w-full bg-white border-2 border-slate-200 focus:border-blue-500/35 rounded-xl pl-11 pr-11 py-4 text-[13px] text-slate-800 outline-none transition-all font-bold placeholder:text-slate-400 placeholder:font-medium font-mono";
const labelCls = "text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1";
const iconCls = "absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none";

/** Painel de secção numerado — painel branco com badge colorido maior (modelo visual F23). */
const Section = ({ n, icon, tint, tintSoft, title, children }: {
  n: string; icon: ReactNode; tint: string; tintSoft: string; title: string; children: ReactNode;
}) => (
  <section className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 space-y-4 shadow-sm text-left">
    <div className="flex items-center gap-3">
      <span
        className="w-7 h-7 min-w-[28px] min-h-[28px] rounded-full flex items-center justify-center text-[12px] font-black text-white shadow-sm"
        style={{ backgroundColor: tint }}
      >
        {n}
      </span>
      <span style={{ color: tint }}>{icon}</span>
      <span className={`font-black text-[11.5px] uppercase tracking-[0.14em] ${tintSoft}`}>{title}</span>
    </div>
    {children}
  </section>
);

/** Campo com etiqueta + ícone à esquerda (geometria consistente em todas as linhas). */
const Field = ({ label, icon, children, className = '' }: {
  label: string; icon: ReactNode; children: ReactNode; className?: string;
}) => (
  <div className={`grid gap-1.5 ${className}`}>
    <label className={labelCls}>{label}</label>
    <div className="relative">
      <span className={iconCls}>{icon}</span>
      {children}
    </div>
  </div>
);

export function RegisterAdminAgentPage({ onCancel, onSuccess, addAuditLog }: RegisterAdminAgentPageProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  // v10.1 (D1) — Perfil Funcional e Departamento/Área Funcional: cargos máximos fixos (readOnly).
  const role = ALFA_ROLE;
  const dept = ALFA_DEPT;
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [createdAgent, setCreatedAgent] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (hasActiveAdminAlfa()) { // F26 — a marcação só bloqueia com a credencial do Alfa existente
      setError('O registo está encerrado — o Administrador Geral já foi registado neste dispositivo. Os restantes membros são adicionados por ele na página Equipa (ADMIN-0002, ADMIN-0003, …).');
      return;
    }
    if (!name.trim() || !email.trim() || !phone.trim() || !role.trim() || !dept.trim()) {
      setError('Preencha todos os campos obrigatórios (Nome, Email, Telefone, Perfil Funcional e Departamento).');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Indique um Email Institucional válido (ex: f.manuel@cdaadmin.ao).');
      return;
    }
    if (!password || password.length < 8) {
      setError('Defina a Palavra-passe inicial do agente (mínimo 8 caracteres). O login Admin será: Nº Agente Admin + esta palavra-passe.');
      return;
    }
    if (isAdminAgentPasswordTaken(password)) {
      setError('Esta palavra-passe já está a ser usada por outro agente da Administração. Como a palavra-passe identifica a pessoa no login, escolha outra.');
      return;
    }

    // v10.1 — Admin Alfa: Nº forçado ADMIN-0001, "Ativo" desde o primeiro instante, acesso total.
    const agent = ADMIN_ALFA_AGENT;
    const workerId = `w-${Date.now()}`;
    const now = new Date();
    const dateAO = now.toLocaleDateString('pt-AO');
    const timeAO = now.toTimeString().slice(0, 5);

    appendAdminWorker({
      id: workerId,
      name: name.trim(),
      email: email.trim(),
      role: role.trim(),
      phone: phone.trim(),
      department: dept.trim(),
      agentId: agent,
      // v10.1 — sem estágio de aprovação: o Administrador Geral nasce "Ativo".
      status: 'Ativo',
      lastAccess: 'Nunca acedeu',
      registrationDate: dateAO,
      permissions: [...ALFA_PERMISSIONS],
      activityLogs: [
        { action: 'Registo do Administrador Geral efectuado — acesso total atribuído.', timestamp: `${dateAO} ${timeAO}`, ip: '127.0.0.1' },
      ],
    });
    addAdminAgent({ agent, password, workerId, name: name.trim() });
    setAdminAlfa(agent); // D3 — fecha a opção "Registar" do login Admin neste dispositivo
    addAuditLog?.(`[REGISTO-ADMIN] Administrador Geral (Admin Alfa) ${name.trim()} registado — Agente ${agent}, estado Ativo, acesso total. Novos membros serão adicionados por si na página Equipa.`, 'success');

    // F32 (v12/D4-a) — o Alfa nasce na NUVEM: a palavra-passe vive apenas no
    // Supabase Auth. Best-effort (D3): falha nunca quebra o registo — a migração
    // just-in-time ocorre no primeiro login (D2).
    if (isSupabaseConfigured()) {
      const alfaEmail = syntheticAdminEmail(agent);
      void provisionCloudAccount(supabase, {
        email: alfaEmail,
        password,
        metadata: { agent, name: name.trim(), workerId, role: 'admin' },
      }).then((prov) => {
        if (prov.outcome === 'ok' || prov.outcome === 'linked_existing') {
          markCloudAccount(agent, alfaEmail, 'admin');
          addAuditLog?.(`[AUTH-CLOUD] Administrador Geral ${agent} nascido na nuvem — a palavra-passe vive apenas no Supabase Auth.`, 'success');
        } else if (prov.outcome === 'pending_confirm') {
          addAuditLog?.('[AUTH-CLOUD] ATENÇÃO: confirmação de e-mail activa no Supabase — desactivar (Authentication → Providers → Email).', 'warning');
        } else if (prov.outcome === 'unavailable') {
          addAuditLog?.('[AUTH-CLOUD] Nuvem indisponível no registo do Alfa — credencial local mantida; migração just-in-time no primeiro login (D3).', 'warning');
        }
      }).catch((provErr) => console.error('[AUTH-CLOUD] Falha inesperada no provisionamento do Alfa:', provErr));
    }

    setCreatedAgent(agent);
  };

  const handleCopy = () => {
    try { navigator.clipboard.writeText(createdAgent); } catch { /* clipboard indisponível */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // ===== Ecrã de sucesso — credencial gerada + resumo do cadastro (F20) =====
  if (createdAgent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex-1 flex flex-col items-center justify-center text-center space-y-5 py-6"
      >
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
          <CheckCircle2 size={30} />
        </div>
        <div>
          <h3 className="text-lg md:text-xl font-black text-[#0c2340] uppercase tracking-tight leading-tight">Cadastro Efectuado com Sucesso!</h3>
          <p className="text-[11px] text-slate-500 font-medium max-w-md mx-auto mt-2 leading-relaxed">
            É o elemento mais alto da hierarquia — <strong>acesso total imediato</strong>. Entra já no login da Administração com o seu <strong>Nº Agente + a palavra-passe definida</strong>. Os restantes colaboradores são adicionados por si na página Equipa (ADMIN-0002, …).
          </p>
        </div>

        {/* Cartão da credencial */}
        <div className="w-full max-w-sm bg-gradient-to-b from-[#0c2340] to-[#152e4d] rounded-3xl p-5 shadow-xl shadow-[#0c2340]/20 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-blue-200/80 uppercase tracking-[0.18em]">Credencial Operacional Plataforma</span>
            <ShieldCheck size={15} className="text-emerald-400" />
          </div>
          <span className="font-mono font-black text-[26px] text-white tracking-[0.14em] block mt-2.5">{createdAgent}</span>
          <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="block text-[11px] font-bold text-white truncate">{name}</span>
              <span className="block text-[9.5px] font-medium text-blue-200/80 truncate">{email}</span>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1 bg-emerald-400/15 border border-emerald-300/30 text-emerald-300 rounded-full px-2.5 py-1 text-[8.5px] font-black uppercase tracking-widest">
              <CheckCircle2 size={10} /> Ativo
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#4f46e5] hover:text-[#0E2B64] bg-transparent border-none cursor-pointer transition-colors"
        >
          {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
          {copied ? 'Nº Agente Copiado!' : 'Copiar Nº Agente'}
        </button>

        <button
          type="button"
          onClick={onSuccess}
          className="w-full max-w-sm bg-[#0c2340] hover:bg-[#152e4d] text-white py-3.5 rounded-[20px] font-black text-xs uppercase tracking-widest shadow-xl shadow-[#0c2340]/15 transition-all cursor-pointer active:scale-98 border-0"
        >
          Voltar ao Login da Administração
        </button>
      </motion.div>
    );
  }

  // ===== Formulário — layout revisto (F20): secções numeradas, pares 2-col,
  // ===== rodapé de acções sempre visível fora da área de scroll. =====
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col min-h-0 text-left"
    >
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 space-y-5">
        {/* Área rolável */}
        <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[64vh] pr-1.5 space-y-5">
          {/* Cabeçalho */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-[#2563eb] to-[#4f46e5] text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/25">
              <UserPlus size={27} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg md:text-xl font-black text-[#0c2340] uppercase tracking-tight leading-tight">
                Registar Admin
              </h3>
              <span className="inline-flex items-center gap-1 mt-1 text-[#2563eb] font-black text-[9.5px] uppercase tracking-[0.18em] leading-none">
                Credencial Operacional Plataforma
              </span>
            </div>
          </div>

          {/* Secção 1 — Dados Pessoais do Membro */}
          <Section n="1" icon={<User size={15} className="stroke-[2.5]" />} tint="#2563eb" tintSoft="text-[#2563eb]" title="Dados Pessoais do Membro">
            <Field label="Nome Completo *" icon={<User size={16} />}>
              <input required type="text" className={inputCls} placeholder="Ex: Dr. Francisco Manuel" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Field label="Email Institucional da Plataforma *" icon={<Mail size={16} />}>
                <input required type="email" className={inputCls} placeholder="f.manuel@cdaadmin.ao" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="Telefone Profissional *" icon={<Phone size={16} />}>
                <input required type="text" className={inputCls + " font-mono"} placeholder="+244 923 000 000" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
            </div>
          </Section>

          {/* Secção 2 — Afiliação & Funções */}
          <Section n="2" icon={<IdCard size={15} className="stroke-[2.5]" />} tint="#2563eb" tintSoft="text-[#2563eb]" title="Afiliação & Funções do Membro da Equipa">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Field label="Perfil Funcional *" icon={<IdCard size={16} />}>
                <input type="text" className={lockedCls} value={role} readOnly title="Cargo máximo — definido pela plataforma" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><ChevronDown size={15} /></span>
              </Field>
              <Field label="Departamento / Área Funcional *" icon={<Building size={16} />}>
                <input type="text" className={lockedCls} value={dept} readOnly title="Cargo máximo — definido pela plataforma" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><ChevronDown size={15} /></span>
              </Field>
            </div>
            <Field label="Nº Agente Admin" icon={<Hash size={16} className="text-indigo-400" />}>
              <input
                type="text"
                className="w-full bg-indigo-50/60 border-2 border-indigo-200 rounded-xl pl-11 pr-[74px] py-4 text-[13px] text-[#4f46e5] font-mono font-black outline-none"
                placeholder="Gerado automaticamente pelo sistema"
                value={ADMIN_ALFA_AGENT}
                readOnly
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-indigo-100/80 text-[#4f46e5] rounded-full px-2.5 py-1 text-[8.5px] font-black uppercase tracking-widest pointer-events-none">
                Auto
              </span>
            </Field>
          </Section>

          {/* Secção 3 — Estágio de Autorização */}
          <Section n="3" icon={<ShieldCheck size={15} className="stroke-[2.5]" />} tint="#d97706" tintSoft="text-[#b45309]" title="Estágio de Autorização">
            <Field label="Estado de Acesso *" icon={<CheckCircle2 size={16} className="text-emerald-500" />}>
              <select
                disabled
                value="Ativo"
                className="w-full bg-emerald-50 border-2 border-emerald-200 rounded-xl pl-11 pr-11 py-4 text-[13px] text-emerald-700 font-black outline-none appearance-none cursor-not-allowed"
              >
                <option value="Ativo">Ativo</option>
              </select>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none"><Lock size={13} /></span>
            </Field>
            <div className="bg-[#f0fdf4] border border-[#10b981]/15 rounded-xl p-4 flex gap-2.5 text-left">
              <Info size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-[10.5px] text-[#065f46] leading-relaxed font-bold m-0 select-none">
                O Administrador Geral tem acesso total imediato — não requer homologação. Os restantes membros (ADMIN-0002, ADMIN-0003, …) são adicionados por si na página Equipa; 'Desativados' ou 'Suspensos' terão o acesso à Administração revogado preventivamente.
              </p>
            </div>
          </Section>

          {/* Secção 4 — Credencial Operacional */}
          <Section n="4" icon={<Shield size={15} className="stroke-[2.5]" />} tint="#0c2340" tintSoft="text-[#0c2340]" title="Credencial Operacional">
            <Field label="Palavra-passe Inicial do Agente *" icon={<KeyRound size={16} className="text-blue-500" />}>
              <input
                type={showPwd ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Mín. 8 caracteres — definida por si neste registo"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={passwordCls}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                aria-label={showPwd ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                title={showPwd ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors bg-transparent border-none cursor-pointer p-0.5"
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </Field>
            <div className="flex items-center justify-between gap-3 px-1">
              <p className="text-[9px] text-slate-400 font-bold leading-snug m-0 select-none">
                Login: <strong>Nº Agente Admin + esta palavra-passe</strong>. Não pode repetir outra credencial activa; fica guardada apenas neste dispositivo.
              </p>
              {password.length >= 8 && (
                <span className="shrink-0 inline-flex items-center gap-1 text-emerald-600 text-[9px] font-black uppercase tracking-widest">
                  <Check size={11} className="stroke-[3]" /> Mín. 8
                </span>
              )}
            </div>
          </Section>

          {/* Erro de validação */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[11px] font-bold text-red-600 leading-snug flex gap-2.5 items-start">
              <X size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Rodapé de acções — FORA da área de scroll: sempre visível */}
        <div className="shrink-0 border-t border-slate-100 pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-extrabold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <X size={15} />
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 bg-[#2563eb] hover:bg-[#1d4ed8] text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2.5 transition-all duration-300 cursor-pointer active:scale-98 border-0"
          >
            <Check size={15} className="stroke-[3]" />
            Submeter Cadastro do Membro
          </button>
        </div>
      </form>
    </motion.div>
  );
}
