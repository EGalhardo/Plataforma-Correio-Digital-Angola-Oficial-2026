// F19 — Página "Registo" da área ADMIN (prompt v9.1 aprovado).
// Substitui o formulário de cidadão que o RegisterStepper mostrava indevidamente
// no registo Admin por um formulário fiel ao popup "REGISTAR NOVO MEMBRO DA
// EQUIPA — CREDENCIAL OPERACIONAL PLATAFORMA" da página Equipa, com todos os
// campos adaptados ao universo da Administração da Plataforma (CDA).
//
// Decisões aprovadas: D1(a) componente próprio · D2(b) Estado bloqueado em
// "Pendente de Análise" · D3 sem captura facial (faz-se depois na página Conta)
// · D4 a Equipa activa na página Equipa · D5 credencial só neste dispositivo.
// Reutiliza EXCLUSIVAMENTE o que já existe: adminAgentStore + a chave de
// trabalhadores da página Equipa ('correio_digital_admin_workers').

import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import {
  UserPlus, User, Mail, Phone, IdCard, Building, Lock,
  CheckCircle2, Info, X, Check, Copy,
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

const inputCls = "w-full bg-white border-2 border-slate-100 focus:border-[#4f46e5]/30 rounded-[20px] pl-11 pr-4 py-3.5 text-xs text-slate-800 outline-none transition-all font-bold placeholder:text-slate-350";
const labelCls = "text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 min-h-[20px] flex items-end pb-1";

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

  // ===== Ecrã de sucesso — mostra a credencial gerada (prompt v9.1 §4.2) =====
  if (createdAgent) {
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
          <h3 className="text-lg md:text-xl font-black text-[#0c2340] uppercase tracking-tight leading-tight">Cadastro Submetido com Sucesso!</h3>
          <p className="text-[11px] text-slate-500 font-medium max-w-md mx-auto mt-2 leading-relaxed">
            O seu pedido de adesão à <strong>Equipa da Administração</strong> foi registado e está <strong>Pendente de Análise</strong>. A sua credencial será activada pela Equipa na página Equipa — depois entra no login da Administração com o seu <strong>Nº Agente + a palavra-passe definida</strong>.
          </p>
        </div>
        <div className="w-full max-w-sm bg-slate-50 border-2 border-dashed border-[#4f46e5]/30 rounded-3xl p-5 space-y-1.5">
          <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block">O seu Nº Agente Admin</span>
          <span className="font-mono font-black text-2xl text-[#0E2B64] tracking-widest block">{createdAgent}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#4f46e5] hover:text-[#0E2B64] bg-transparent border-none cursor-pointer transition-colors"
          >
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            {copied ? 'Copiado!' : 'Copiar Nº Agente'}
          </button>
          <p className="text-[9px] text-slate-400 font-bold leading-snug m-0 pt-1 select-none">
            Guarde este número: é o seu identificador de acesso. A palavra-passe fica guardada apenas neste dispositivo.
          </p>
        </div>
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

  // ===== Formulário — fiel ao popup da Equipa, adaptado a membros admin =====
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col max-h-[72vh] overflow-y-auto custom-scrollbar pr-1 text-left"
    >
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-5">
        {/* Cabeçalho */}
        <div className="flex items-center gap-3.5 shrink-0">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shrink-0 border border-indigo-100/40 shadow-sm">
            <UserPlus size={22} strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base md:text-lg font-black text-[#0c2340] italic uppercase tracking-tighter leading-none mb-1">
              Registar Novo Membro da Equipa
            </h3>
            <p className="text-[#4f46e5] font-black text-[9px] uppercase tracking-[0.16em] mt-1 m-0 leading-none">
              Credencial Operacional Plataforma
            </p>
          </div>
        </div>

        {/* Secção 1 — Dados Pessoais do Membro */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[#4f46e5]">
            <User size={14} className="stroke-[2.5]" />
            <span className="font-extrabold text-[10.5px] uppercase tracking-widest">Dados Pessoais do Membro</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="grid gap-1.5">
              <label className={labelCls}>Nome Completo *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><User size={16} /></span>
                <input required type="text" className={inputCls} placeholder="Ex: Dr. Francisco Manuel" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <label className={labelCls}>Email Institucional da Plataforma *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><Mail size={16} /></span>
                <input required type="email" className={inputCls} placeholder="f.manuel@cdaadmin.ao" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <label className={labelCls}>Telefone Profissional *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><Phone size={16} /></span>
                <input required type="text" className={inputCls + " font-mono"} placeholder="+244 923 000 000" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-dashed border-slate-150" />

        {/* Secção 2 — Afiliação & Funções */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[#4f46e5]">
            <IdCard size={14} className="stroke-[2.5]" />
            <span className="font-extrabold text-[10.5px] uppercase tracking-widest">Afiliação & Funções do Membro da Equipa</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="grid gap-1.5">
              <label className={labelCls}>Perfil Funcional *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><IdCard size={16} /></span>
                <input required type="text" className={inputCls} placeholder="Ex: Auditor Geral do Sistema" value={role} onChange={(e) => setRole(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <label className={labelCls}>Departamento / Área Funcional *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><Building size={16} /></span>
                <input required type="text" className={inputCls} placeholder="Ex: Direcção de Operações da Plataforma" value={dept} onChange={(e) => setDept(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <label className={labelCls}>Nº Agente Admin</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><Lock size={16} /></span>
                <input
                  type="text"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-[20px] pl-11 pr-4 py-3.5 text-xs text-slate-500 font-mono outline-none"
                  placeholder="Gerado automaticamente pelo sistema"
                  value={computeNextAgent()}
                  readOnly
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-dashed border-slate-150" />

        {/* Secção 3 — Estágio de Autorização (D2b: bloqueado em Pendente de Análise) */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-500">
            <CheckCircle2 size={14} className="stroke-[2.5]" />
            <span className="font-extrabold text-[10.5px] uppercase tracking-widest">Estágio de Autorização</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
            <div className="grid gap-1.5 md:col-span-5">
              <label className={labelCls}>Estado de Acesso *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none"><CheckCircle2 size={16} /></span>
                <select
                  disabled
                  value="Pendente"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-[20px] pl-11 pr-10 py-3.5 text-xs text-slate-500 font-bold outline-none appearance-none cursor-not-allowed"
                >
                  <option value="Pendente">Pendente de Análise</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 text-[9px]">🔒</div>
              </div>
            </div>
            <div className="md:col-span-7 bg-[#f0fdf4] border border-[#10b981]/15 rounded-[20px] p-3.5 flex gap-2.5 text-left">
              <Info size={17} className="text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#065f46] leading-relaxed font-bold m-0 select-none">
                Novos membros nascem 'Pendente de Análise' — a Equipa da Administração activa a credencial na página Equipa. Membros 'Desativados' ou 'Suspensos' terão o acesso à Administração revogado preventivamente.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-dashed border-slate-150" />

        {/* Secção 4 — Credencial Operacional */}
        <div className="grid gap-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Palavra-passe Inicial do Agente *</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none"><UserPlus size={16} /></span>
            <input
              type="text"
              autoComplete="off"
              placeholder="Mín. 8 caracteres — definida por si neste registo"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls + " font-mono focus:border-blue-500/30"}
            />
          </div>
          <p className="text-[9px] text-slate-400 font-bold leading-snug m-0 mr-1 select-none">
            O membro entra com <strong>Nº Agente Admin + esta palavra-passe</strong> no login da Administração. A palavra-passe identifica a pessoa — não pode repetir outra credencial activa e fica guardada apenas neste dispositivo.
          </p>
        </div>

        {/* Erro de validação */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-[16px] px-4 py-3 text-[11px] font-bold text-red-600 leading-snug">
            {error}
          </div>
        )}

        {/* Acções */}
        <div className="border-t border-dashed border-slate-150 pt-4 shrink-0 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-[20px] font-extrabold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
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
