// F19/F20 — Página "Registo" da área ADMIN (prompt v9.1 aprovado + revisão de layout).
// Formulário fiel ao popup "REGISTAR NOVO MEMBRO DA EQUIPA — CREDENCIAL OPERACIONAL
// PLATAFORMA" da página Equipa, com todos os campos adaptados ao universo da
// Administração da Plataforma (CDA).
//
// Decisões aprovadas: D1(a) componente próprio · D2(b) Estado bloqueado em
// "Pendente de Análise" · D3 sem captura facial (faz-se depois na página Conta)
// · D4 a Equipa activa na página Equipa · D5 credencial só neste dispositivo.
// Reutiliza EXCLUSIVAMENTE o que já existe: adminAgentStore + a chave de
// trabalhadores da página Equipa ('correio_digital_admin_workers').

import { useState, type FormEvent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  UserPlus, User, Mail, Phone, IdCard, Building, Lock,
  CheckCircle2, Info, X, Check, Copy, ShieldCheck, KeyRound,
} from 'lucide-react';
import {
  addAdminAgent,
  getAdminAgentCreds,
  isAdminAgentPasswordTaken,
  nextAdminAgentNumber,
} from '../../services/adminAgentStore';

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

/** Nº Agente seguinte — calculado sobre trabalhadores + credenciais (fonte completa). */
const computeNextAgent = (): string =>
  nextAdminAgentNumber([
    ...readAdminWorkers().map(w => w.agentId || ''),
    ...getAdminAgentCreds().map(c => c.agent),
  ]);

// ---------- Sistema visual da página (F20 — revisão de layout) ----------
const inputCls = "w-full bg-white border-2 border-slate-100 focus:border-[#4f46e5]/30 rounded-[20px] pl-11 pr-4 py-3.5 text-xs text-slate-800 outline-none transition-all font-bold placeholder:text-slate-350";
const labelCls = "text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1";
const iconCls = "absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none";

/** Painel de secção numerado — ritmo vertical claro dentro do cartão de autenticação. */
const Section = ({ n, icon, tint, tintSoft, title, children }: {
  n: string; icon: ReactNode; tint: string; tintSoft: string; title: string; children: ReactNode;
}) => (
  <section className="bg-slate-50/70 border border-slate-100 rounded-[22px] p-4 space-y-3.5 text-left">
    <div className="flex items-center gap-2.5">
      <span
        className="w-5.5 h-5.5 min-w-[22px] min-h-[22px] rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-sm"
        style={{ backgroundColor: tint }}
      >
        {n}
      </span>
      <span style={{ color: tint }}>{icon}</span>
      <span className={`font-extrabold text-[10.5px] uppercase tracking-widest ${tintSoft}`}>{title}</span>
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
  const [role, setRole] = useState('');
  const [dept, setDept] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [createdAgent, setCreatedAgent] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
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

    // Credencial operacional — o Nº Agente é atribuído pelo sistema no momento da submissão.
    const agent = computeNextAgent();
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
      department: dept.trim() || 'Geral',
      agentId: agent,
      // D2(b)/D4 — nasce "Pendente de Análise"; a Equipa activa na página Equipa.
      status: 'Pendente',
      lastAccess: 'Nunca acedeu',
      registrationDate: dateAO,
      permissions: ['Visualizar', 'Homologar'],
      activityLogs: [
        { action: 'Cadastro submetido via página Registo da Administração — pendente de análise pela Equipa.', timestamp: `${dateAO} ${timeAO}`, ip: '127.0.0.1' },
      ],
    });
    addAdminAgent({ agent, password, workerId, name: name.trim() });
    addAuditLog?.(`[REGISTO-ADMIN] Novo membro da equipa ${name.trim()} submetido via página Registo — Agente ${agent}, estado Pendente de Análise.`, 'success');
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
          <h3 className="text-lg md:text-xl font-black text-[#0c2340] uppercase tracking-tight leading-tight">Cadastro Submetido com Sucesso!</h3>
          <p className="text-[11px] text-slate-500 font-medium max-w-md mx-auto mt-2 leading-relaxed">
            O seu pedido de adesão à <strong>Equipa da Administração</strong> está <strong>Pendente de Análise</strong>. Depois de activado na página Equipa, entra no login da Administração com o seu <strong>Nº Agente + a palavra-passe definida</strong>.
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
            <span className="shrink-0 inline-flex items-center gap-1 bg-amber-400/15 border border-amber-300/30 text-amber-300 rounded-full px-2.5 py-1 text-[8.5px] font-black uppercase tracking-widest">
              <Lock size={10} /> Pendente de Análise
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
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 space-y-4">
        {/* Área rolável */}
        <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[64vh] pr-1.5 space-y-4">
          {/* Cabeçalho */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-gradient-to-br from-[#4f46e5] to-[#2563eb] text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
              <UserPlus size={22} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[15px] md:text-base font-black text-[#0c2340] italic uppercase tracking-tighter leading-tight">
                Registar Novo Membro da Equipa
              </h3>
              <span className="inline-flex items-center gap-1 mt-1.5 bg-indigo-50 border border-indigo-100 text-[#4f46e5] rounded-full px-2.5 py-0.5 font-black text-[8.5px] uppercase tracking-[0.16em] leading-none">
                Credencial Operacional Plataforma
              </span>
            </div>
          </div>

          {/* Secção 1 — Dados Pessoais do Membro */}
          <Section n="1" icon={<User size={14} className="stroke-[2.5]" />} tint="#4f46e5" tintSoft="text-[#4f46e5]" title="Dados Pessoais do Membro">
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
          <Section n="2" icon={<IdCard size={14} className="stroke-[2.5]" />} tint="#2563eb" tintSoft="text-[#2563eb]" title="Afiliação & Funções do Membro da Equipa">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Field label="Perfil Funcional *" icon={<IdCard size={16} />}>
                <input required type="text" className={inputCls} placeholder="Ex: Auditor Geral do Sistema" value={role} onChange={(e) => setRole(e.target.value)} />
              </Field>
              <Field label="Departamento / Área Funcional *" icon={<Building size={16} />}>
                <input required type="text" className={inputCls} placeholder="Ex: Direcção de Operações da Plataforma" value={dept} onChange={(e) => setDept(e.target.value)} />
              </Field>
            </div>
            <Field label="Nº Agente Admin" icon={<Lock size={16} />}>
              <input
                type="text"
                className="w-full bg-indigo-50/60 border-2 border-indigo-100 rounded-[20px] pl-11 pr-[74px] py-3.5 text-xs text-[#4f46e5] font-mono font-black outline-none"
                placeholder="Gerado automaticamente pelo sistema"
                value={computeNextAgent()}
                readOnly
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-indigo-100/80 text-[#4f46e5] rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-widest pointer-events-none">
                Auto
              </span>
            </Field>
          </Section>

          {/* Secção 3 — Estágio de Autorização */}
          <Section n="3" icon={<CheckCircle2 size={14} className="stroke-[2.5]" />} tint="#d97706" tintSoft="text-[#b45309]" title="Estágio de Autorização">
            <Field label="Estado de Acesso *" icon={<CheckCircle2 size={16} className="text-amber-500" />}>
              <select
                disabled
                value="Pendente"
                className="w-full bg-amber-50/70 border-2 border-amber-100 rounded-[20px] pl-11 pr-11 py-3.5 text-xs text-amber-700 font-black outline-none appearance-none cursor-not-allowed"
              >
                <option value="Pendente">Pendente de Análise</option>
              </select>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-400 pointer-events-none"><Lock size={13} /></span>
            </Field>
            <div className="bg-[#f0fdf4] border border-[#10b981]/15 rounded-[18px] p-3.5 flex gap-2.5 text-left">
              <Info size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-[10.5px] text-[#065f46] leading-relaxed font-bold m-0 select-none">
                Novos membros nascem 'Pendente de Análise' — a Equipa da Administração activa a credencial na página Equipa. Membros 'Desativados' ou 'Suspensos' terão o acesso à Administração revogado preventivamente.
              </p>
            </div>
          </Section>

          {/* Secção 4 — Credencial Operacional */}
          <Section n="4" icon={<ShieldCheck size={14} className="stroke-[2.5]" />} tint="#0c2340" tintSoft="text-[#0c2340]" title="Credencial Operacional">
            <Field label="Palavra-passe Inicial do Agente *" icon={<KeyRound size={16} className="text-blue-500" />}>
              <input
                type="text"
                autoComplete="off"
                placeholder="Mín. 8 caracteres — definida por si neste registo"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls + " font-mono focus:border-blue-500/30"}
              />
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
            <div className="bg-red-50 border border-red-200 rounded-[18px] px-4 py-3 text-[11px] font-bold text-red-600 leading-snug flex gap-2.5 items-start">
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
            className="sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-[20px] font-extrabold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <X size={15} />
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 bg-[#0c2340] hover:bg-[#152e4d] text-white py-3.5 rounded-[20px] font-black text-xs uppercase tracking-widest shadow-xl shadow-[#0c2340]/15 flex items-center justify-center gap-2.5 transition-all duration-300 cursor-pointer active:scale-98 border-0"
          >
            <Check size={15} className="stroke-[3]" />
            Submeter Cadastro do Membro
          </button>
        </div>
      </form>
    </motion.div>
  );
}
