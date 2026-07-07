/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Landmark, 
  AlertTriangle,
  CheckCircle2,
  Lock,
  History,
  Shield,
  ShieldCheck,
  Plane,
  Smartphone,
  Eye,
  EyeOff,
  IdCard,
  User,
  Sparkles,
  Settings,
  Check,
  Bell,
  Globe,
  BadgeCheck,
  X
} from 'lucide-react';
import { USER_PROFILE_PHOTO } from '../../constants/data';

interface AuditLog {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  type: 'info' | 'warning' | 'critical' | 'success';
}

interface GovPerfilContentProps {
  logs: AuditLog[];
  emergencyMode: boolean;
  onToggleEmergency: (active: boolean) => void;
  bi?: string;
  phone?: string;
  nif?: string;
  passport?: string;
  profileName?: string;
  userBirthDate?: string;
  userFiliation?: string;
  userMaritalStatus?: string;
  hasFacialAuth?: boolean;
  hasTwoFactor?: boolean;
  govPin?: string;
}

export function GovPerfilContent({ 
  logs, 
  emergencyMode, 
  onToggleEmergency,
  bi = '001928374LA092',
  phone = '+244 925 555 777',
  nif = '5401328901',
  passport = 'AO-P987654',
  profileName = 'Carlos Afonso Alberto',
  userBirthDate = '15/08/1978',
  userFiliation = 'Afonso Alberto & Teresa Carlos Alberto',
  userMaritalStatus = 'Casado',
  hasFacialAuth = true,
  hasTwoFactor = false,
  govPin = '1234'
}: GovPerfilContentProps) {
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Photo & Main Info Card */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
          
          <div className="relative mt-4 mb-4">
            <div className="w-32 h-32 md:w-36 md:h-36 rounded-[28px] border border-slate-200 p-1.5 bg-white relative">
              <img 
                src={USER_PROFILE_PHOTO} 
                alt={profileName} 
                className="w-full h-full rounded-[20px] object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-1 -right-1 text-white p-1.5 rounded-xl border border-slate-200 bg-emerald-500">
                <BadgeCheck size={16} />
              </div>
            </div>
          </div>

          <h3 className="text-xl font-black text-slate-950 uppercase italic tracking-tight mb-1">{profileName}</h3>
          <p className="text-slate-400 font-extrabold text-[9px] uppercase tracking-widest leading-none mb-4">Administrador do Estado</p>

          <div className="w-full border-t border-slate-100 my-4" />

          {/* Mini info badge */}
          <div className="w-full space-y-3 text-left animate-fade-in">
            <div>
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Nível de Autoridade</span>
              <span className="text-xs font-bold text-slate-700">Administrador Geral / Central</span>
            </div>
            <div className="pt-1">
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Data de Criação da Conta</span>
              <span className="text-xs font-bold text-slate-700">1 de junho de 2026</span>
            </div>
          </div>
        </div>

        {/* Right Column: Information fields & Security section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Information Container */}
          <div className="bg-white border border-slate-200 rounded-[32px] p-6 md:p-8 shadow-sm space-y-6 text-left">
            <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
              <div>
                <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight">Informações de Conta</h4>
                <p className="text-xs text-slate-500 font-medium">Histórico e dados de autoridade na infraestrutura digital do Estado</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowSensitiveData(!showSensitiveData)}
                className={`p-2 border rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${
                  showSensitiveData 
                    ? 'bg-[#0E2B64] border-[#0E2B64] text-white hover:bg-[#0E2B64]/90 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50 border-slate-200 bg-white'
                }`}
              >
                {showSensitiveData ? <EyeOff size={14} className={showSensitiveData ? 'text-white' : 'text-slate-400'} /> : <Eye size={14} />}
                <span>{showSensitiveData ? 'Ocultar' : 'Revelar'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nome Completo */}
              <div className="bg-white border border-slate-200 p-4 rounded-2xl">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Nome Completo</span>
                <span className="text-xs font-bold text-slate-800 block">Edlasio Galhardo</span>
              </div>

              {/* B.I. */}
              <div className="bg-white border border-slate-200 p-4 rounded-2xl">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Bilhete de Identidade (BI)</span>
                <span className="text-xs font-mono font-bold text-slate-800 block">
                  {showSensitiveData ? (bi || 'Não associado') : (bi ? bi.replace(/\(?[A-Z0-9]{6}\)?$/, '******') : 'Não associado')}
                </span>
              </div>

              {/* Email */}
              <div className="bg-white border border-slate-200 p-4 rounded-2xl">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Funcional</span>
                <span className="text-xs font-bold text-slate-800 block mb-1 font-mono">
                  {((profileName || 'Utilizador').toLowerCase().replace(/\s+/g, '.'))}@mindis.gov.ao
                </span>
                <span className="text-[9px] text-amber-600 font-bold bg-amber-50 rounded-lg px-2 py-0.5 border border-amber-100 italic block w-fit">
                  Não é possível alterar o email funcional
                </span>
              </div>

              {/* Telefone */}
              <div className="bg-white border border-slate-200 p-4 rounded-2xl">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Telefone Principal</span>
                <span className="text-xs font-mono font-bold text-slate-800 block">
                  {showSensitiveData ? (phone || 'Não associado') : (phone ? phone.replace(/\d{3} \d{3}$/, '*** ***') : 'Não associado')}
                </span>
              </div>

              {/* Contribuinte (NIF) */}
              <div className="bg-white border border-slate-200 p-4 rounded-2xl">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Contribuinte (NIF)</span>
                <span className="text-xs font-mono font-bold text-slate-800 block">
                  {showSensitiveData ? (nif || 'Não associado') : (nif ? nif.replace(/\d{4}$/, '****') : 'Não associado')}
                </span>
              </div>

              {/* Passaporte */}
              <div className="bg-white border border-slate-200 p-4 rounded-2xl">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Passaporte</span>
                <span className="text-xs font-mono font-bold text-slate-800 block">
                  {showSensitiveData ? (passport || 'Não associado') : (passport ? passport.replace(/[A-Z0-9]{4}$/, '****') : 'Não associado')}
                </span>
              </div>

              {/* Morada */}
              <div className="bg-white border border-slate-200 p-4 rounded-2xl md:col-span-2">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Departamento / Administração</span>
                <span className="text-xs font-bold text-slate-800 block">Ministério da Defesa e Infraestrutura de Segurança</span>
              </div>

              {/* Registo de Acesso */}
              <div className="bg-white border border-slate-200 p-4 rounded-2xl md:col-span-2">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Nível de Acesso</span>
                <span className="text-xs font-bold text-slate-800 block">Administrador de Sistema (Infraestrutura Central - CDA)</span>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="bg-white border border-slate-200 rounded-[32px] p-6 md:p-8 shadow-sm text-left space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                  <Lock size={18} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-base uppercase tracking-tight flex items-center gap-2">
                    🔒 Segurança & Credenciais
                  </h4>
                  <p className="text-xs text-slate-500 font-medium font-sans">Altere a sua palavra-passe para garantir a integridade do seu perfil de administrador</p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setShowLogs(!showLogs)}
                className={`px-3 py-1.5 border rounded-xl text-[9px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-1 shrink-0 transition-all ${
                  showLogs
                    ? 'bg-[#0E2B64] border-[#0E2B64] text-white hover:bg-[#0E2B64]/90 shadow-sm'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <History size={11} className={showLogs ? 'text-white' : ''} />
                <span>{showLogs ? 'Ocultar Logs' : 'Ver Logs'}</span>
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!currentPassword || !newPassword || !confirmPassword) {
                setPasswordError('Por favor, preencha todos os campos.');
                setPasswordSuccess(false);
                return;
              }
              if (newPassword !== confirmPassword) {
                setPasswordError('As senhas introduzidas não coincidem.');
                setPasswordSuccess(false);
                return;
              }
              setPasswordSuccess(true);
              setPasswordError('');
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
            }} className="space-y-4">
              <div className="flex flex-col gap-4">
                <div className="space-y-1">
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha Atual</span>
                  <input 
                    type="password"
                    className="w-full h-11 bg-white border border-slate-200 focus:border-primary/40 rounded-xl px-4 text-xs font-semibold outline-none transition-all"
                    placeholder="Senha atual"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                
                <div className="space-y-1">
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Palavra-passe</span>
                  <input 
                    type="password"
                    className="w-full h-11 bg-white border border-slate-200 focus:border-primary/40 rounded-xl px-4 text-xs font-semibold outline-none transition-all"
                    placeholder="Nova palavra-passe"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Nova Senha</span>
                  <input 
                    type="password"
                    className="w-full h-11 bg-white border border-slate-200 focus:border-primary/40 rounded-xl px-4 text-xs font-semibold outline-none transition-all"
                    placeholder="Repita a nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <AnimatePresence mode="popLayout">
                {passwordError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-[11px] text-red-650 font-black bg-red-50 border border-red-150 rounded-xl px-4 py-2.5"
                  >
                    {passwordError}
                  </motion.div>
                )}

                {passwordSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-[11px] text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-150 rounded-xl px-4 py-2.5 flex items-center gap-1.5"
                  >
                    <Check size={14} className="text-emerald-600" />
                    <span>Palavra-passe alterada com sucesso!</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-end pt-2">
                <button 
                  type="submit"
                  className="bg-primary hover:bg-primary/95 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3.5 rounded-xl shadow-md active:scale-95 transition-all cursor-pointer font-sans"
                >
                  Altere a sua palavra-passe
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Slide-out System Logs Section */}
      <AnimatePresence>
        {showLogs && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="bg-white border border-slate-150/60 rounded-[32px] p-6 md:p-8 shadow-sm text-left"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <History size={16} className="text-[#2563eb]" />
                <h4 className="font-sans text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest leading-none">
                  Logs de Auditoria de Acesso unificado (SME/AGT)
                </h4>
              </div>
              <span className="font-mono text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                {logs.length} Registros Activos
              </span>
            </div>

            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
              {logs.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 font-semibold uppercase tracking-widest">
                  Sem eventos registados recentemente.
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 rounded-2xl bg-slate-50/50 border border-slate-100 hover:bg-slate-100/30 transition-all font-mono text-[10px]">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        log.type === 'critical' ? 'bg-red-500 animate-pulse' :
                        log.type === 'warning' ? 'bg-amber-500' :
                        log.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
                      }`} />
                      <span className="font-bold text-slate-800 uppercase">{log.action}</span>
                    </div>
                    <div className="text-slate-400 font-semibold mt-1.5 sm:mt-0">
                      {log.timestamp} &bull; <span className="font-bold text-indigo-600 font-sans">{log.user}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
