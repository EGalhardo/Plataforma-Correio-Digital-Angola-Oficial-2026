/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, History, Eye, EyeOff, Check, BadgeCheck, Settings, Camera, CheckCircle2 } from 'lucide-react';
import { USER_PROFILE_PHOTO } from '../../constants/data';
import { useSession } from '../../services/sessionStore';
import { supabase } from '../../lib/supabaseClient';
import { hasValidSupabaseKeys, supabaseService } from '../../services/supabaseService';
import { syncProfileToCloud, buildCitizenContaPatch, contaSaveFeedbackFromOutcome, guardarPendenciaPerfil, limparPendenciaPerfil } from '../../services/profileSyncService';
import { guardarAvatar } from '../../services/avatarService';
import { cloudChangePassword, hasActiveCloudSession, isCloudBound } from '../../services/cloudAuthService';
import { homologationStore } from '../../services/homologationStore';

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
  bi = '001928374LA092',
  phone = '+244 925 555 777',
  nif = '5401328901',
  passport = 'AO-P987654',
  profileName = 'Carlos Afonso Alberto'}: GovPerfilContentProps) {
  const { user, updateUserFields } = useSession();
  const [isEditingAdmin, setIsEditingAdmin] = useState(false);
  const [editAdminName, setEditAdminName] = useState(profileName || '');
  const [editAdminPhone, setEditAdminPhone] = useState(phone || '');
  const [editAdminEmail, setEditAdminEmail] = useState('admin@cda.gov.ao');
  const [editAdminNif, setEditAdminNif] = useState(nif || '');

  React.useEffect(() => {
    setEditAdminName(profileName || '');
    setEditAdminPhone(phone || '');
    setEditAdminNif(nif || '');
  }, [profileName, phone, nif]);

  const handleSaveAdminEdit = async () => {
    updateUserFields({
      name: editAdminName,
      phone: editAdminPhone,
      email: editAdminEmail,
      nif: editAdminNif
    });
    // 2026-08-20 — persistência real (mesmo padrão da página Perfil do cidadão):
    // nome/telefone/e-mail/NIF vão para `profiles` (bi = Nº de Agente) via
    // /api/perfil-sync (service role). Contas demo (ADM-8812-OP) ficam locais
    // (outcome 'demo'); falhas de nuvem ficam em fila local — feedback honesto.
    if (hasValidSupabaseKeys() && bi) {
      const patch = buildCitizenContaPatch(bi, {
        name: editAdminName,
        phone: editAdminPhone,
        email: editAdminEmail,
        nif: editAdminNif,
      });
      const res = await syncProfileToCloud(supabase, patch);
      if (res.outcome === 'error' || res.outcome === 'unavailable') {
        guardarPendenciaPerfil(bi, patch);
      } else if (res.outcome === 'ok' || res.outcome === 'created' || res.outcome === 'schema_retry') {
        limparPendenciaPerfil(bi);
      }
      const fb = contaSaveFeedbackFromOutcome(res.outcome);
      setPasswordSuccessMsg(fb.text);
    } else {
      setPasswordSuccessMsg('Informações da conta administrativa atualizadas com sucesso!');
    }
    setIsEditingAdmin(false);
    setPasswordSuccess(true);
  };

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingPhoto(true);
      if (hasValidSupabaseKeys()) {
        const fileExt = file.name.split('.').pop();
        const fileName = `admin_${bi || 'SOC'}_${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;
        const publicUrl = await supabaseService.uploadFile('fotos_perfil', filePath, file);
        if (publicUrl) {
          updateUserFields({ avatarUrl: publicUrl });
          // 2026-08-20 — persistir a foto por conta (localStorage por Nº de
          // Agente + user_metadata do Auth): sem isto o login seguinte repunha
          // o avatar neutro e a foto revertia.
          guardarAvatar('admin', bi || '', publicUrl);
          setPasswordSuccess(true);
          setPasswordSuccessMsg('Foto do administrador atualizada no Supabase Storage.');
        }
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64String = event.target?.result as string;
          updateUserFields({ avatarUrl: base64String });
          guardarAvatar('admin', bi || '', base64String);
          setPasswordSuccess(true);
          setPasswordSuccessMsg('Foto do administrador atualizada na sessão interativa.');
        };
        reader.readAsDataURL(file);
      }
    } catch (e) {
      setPasswordError('Falha ao carregar a nova foto de perfil.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');

  // F40-b (v13) — palavra-passe REAL na nuvem para agentes da Administração
  // (mesma lógica do Perfil cidadão/agente; sem espelho local — credenciais de
  // agente ficam na transição v12 até à porta privada F-c).
  const submitAdminPasswordChange = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setPasswordSuccess(false);
    setPasswordSuccessMsg('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Por favor, preencha todos os campos.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas introduzidas não coincidem.');
      return;
    }
    const targetBi = (bi || '').trim();
    if (homologationStore.isExempt(targetBi)) {
      console.log('[DEMO] cloudChangePassword ignorado — conta de demonstração (D7/v12).');
      setPasswordError('');
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('A nova palavra-passe deve ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('A nova palavra-passe deve ser diferente da senha atual.');
      return;
    }
    if (!hasValidSupabaseKeys()) {
      setPasswordError('Serviço temporariamente indisponível. A sua senha actual mantém-se válida — tente mais tarde.');
      return;
    }
    const sessionActive = await hasActiveCloudSession(supabase);
    if (!sessionActive) {
      setPasswordError(
        isCloudBound(targetBi)
          ? 'Sessão segura inactiva. Saia e entre novamente com a senha actual para activar a sessão de nuvem.'
          : 'Esta conta ainda não está ligada à nuvem — a alteração da palavra-passe fica disponível após o próximo início de sessão com senha.'
      );
      return;
    }
    const res = await cloudChangePassword(supabase, newPassword);
    if (res.outcome === 'ok') {
      setPasswordError('');
      setPasswordSuccess(true);
      setPasswordSuccessMsg('Palavra-passe actualizada. Passe a usar a nova palavra-passe em todos os dispositivos.');
      console.log('[AUTH-CLOUD] Palavra-passe de agente admin actualizada na nuvem pelo próprio titular');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else if (res.outcome === 'weak') {
      setPasswordError('A nova palavra-passe foi recusada pelo serviço de autenticação — escolha uma mais forte (mínimo 8 caracteres).');
    } else if (res.outcome === 'no_session') {
      setPasswordError('Sessão segura inactiva. Saia e entre novamente com a senha actual.');
    } else {
      setPasswordError('Serviço temporariamente indisponível. A sua senha actual mantém-se válida — tente mais tarde.');
    }
  };

  return (
    <section className="space-y-6 text-slate-950 animate-fade-in font-sans">
      {/* Header row — harmonizado com o Perfil do Cidadão e da Instituição:
          «Minha Conta» + saudação + selo de estado autenticado. Aparece
          sempre que a página renderiza (autenticado), incluindo no modo
          simulado (conta de demonstração da Administração). */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-5 mb-2 gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-slate-400">Minha Conta</span>
          <h1 className="text-2xl md:text-3xl font-black text-slate-950 tracking-tight">
            Bem-vindo, {(profileName || user?.name || 'Administrador').split(' ')[0]}
          </h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
            Administração do Correio Digital de Angola
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-full text-emerald-700 font-extrabold text-[11px] uppercase tracking-wider">
            <CheckCircle2 size={14} className="text-emerald-600 fill-emerald-100" />
            <span>Conta verificada e activa</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Left Column: Photo & Main Info Card — flex column h-full: fundo alinhado com a direita */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden h-full">
          {/* Background decoration */}
          <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
          
          <div className="relative mt-4 mb-4">
            <div className="w-32 h-32 md:w-36 md:h-36 rounded-[28px] border border-slate-200 p-1.5 bg-white relative group">
              <img 
                src={user?.avatarUrl || USER_PROFILE_PHOTO} 
                alt={profileName} 
                className="w-full h-full rounded-[20px] object-cover transition-all group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <label className="absolute inset-0 bg-slate-900/40 rounded-[20px] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="text-white mb-1" size={24} />
                <span className="text-[9px] font-black uppercase tracking-wider text-white">
                  {isUploadingPhoto ? 'A carregar...' : 'Mudar Foto'}
                </span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handlePhotoChange}
                  disabled={isUploadingPhoto}
                />
              </label>
              <div className="absolute -bottom-1 -right-1 text-white p-1.5 rounded-xl border border-slate-200 bg-emerald-500">
                <BadgeCheck size={16} />
              </div>
            </div>
          </div>

          <h3 className="text-xl font-black text-slate-950 uppercase italic tracking-tight mb-1">{profileName}</h3>
          <p className="text-slate-400 font-extrabold text-[9px] uppercase tracking-widest leading-none mb-4">Administrador do Estado</p>

          <div className="w-full border-t border-slate-100 my-4" />

          {/* Mini info badge */}
          <div className="w-full space-y-3 text-left animate-fade-in mt-auto">
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
        <div className="lg:col-span-2 flex flex-col gap-6 h-full">
          {/* Information Container */}
          <div className="bg-white border border-slate-200 rounded-[32px] p-6 md:p-8 shadow-sm space-y-6 text-left">
            <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
              <div>
                <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight">Informações de Conta</h4>
                <p className="text-xs text-slate-500 font-medium">
                  {isEditingAdmin ? 'A editar dados do perfil de administrador' : 'Histórico e dados de autoridade na infraestrutura digital do Estado'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!isEditingAdmin ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingAdmin(true)}
                    className="p-2.5 bg-[#0E2B64] hover:bg-[#081a3d] text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border-0"
                  >
                    <Settings size={14} />
                    <span>Editar Perfil</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveAdminEdit}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow-sm cursor-pointer border-0"
                    >
                      <Check size={14} />
                      <span>Gravar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingAdmin(false)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border-0"
                    >
                      <span>Cancelar</span>
                    </button>
                  </>
                )}
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
            </div>

            {!isEditingAdmin ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                {/* Nome Completo */}
                <div className="bg-white border border-slate-200 p-4 rounded-2xl h-full">
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Nome Completo</span>
                  <span className="text-xs font-bold text-slate-800 block">{user?.name || profileName}</span>
                </div>

              {/* B.I. */}
              <div className="bg-white border border-slate-200 p-4 rounded-2xl h-full">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Bilhete de Identidade (BI)</span>
                <span className="text-xs font-mono font-bold text-slate-800 block">
                  {showSensitiveData ? (bi || 'Não associado') : (bi ? bi.replace(/\(?[A-Z0-9]{6}\)?$/, '******') : 'Não associado')}
                </span>
              </div>

              {/* Email */}
              <div className="bg-white border border-slate-200 p-4 rounded-2xl h-full">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Funcional</span>
                <span className="text-xs font-bold text-slate-800 block mb-1 font-mono">
                  {user?.email || `${((profileName || 'Utilizador').toLowerCase().replace(/\s+/g, '.'))}@mindis.gov.ao`}
                </span>
                <span className="text-[9px] text-amber-600 font-bold bg-amber-50 rounded-lg px-2 py-0.5 border border-amber-100 italic block w-fit">
                  Não é possível alterar o email funcional
                </span>
              </div>

              {/* Telefone */}
              <div className="bg-white border border-slate-200 p-4 rounded-2xl h-full">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Telefone Principal</span>
                <span className="text-xs font-mono font-bold text-slate-800 block">
                  {showSensitiveData ? (user?.phone || phone || 'Não associado') : ((user?.phone || phone) ? (user?.phone || phone).replace(/\d{3} \d{3}$/, '*** ***') : 'Não associado')}
                </span>
              </div>

              {/* Contribuinte (NIF) */}
              <div className="bg-white border border-slate-200 p-4 rounded-2xl h-full">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Contribuinte (NIF)</span>
                <span className="text-xs font-mono font-bold text-slate-800 block">
                  {showSensitiveData ? (nif || 'Não associado') : (nif ? nif.replace(/\d{4}$/, '****') : 'Não associado')}
                </span>
              </div>

              {/* Passaporte */}
              <div className="bg-white border border-slate-200 p-4 rounded-2xl h-full">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Passaporte</span>
                <span className="text-xs font-mono font-bold text-slate-800 block">
                  {showSensitiveData ? (passport || 'Não associado') : (passport ? passport.replace(/[A-Z0-9]{4}$/, '****') : 'Não associado')}
                </span>
              </div>

              {/* Morada */}
              <div className="bg-white border border-slate-200 p-4 rounded-2xl md:col-span-2 h-full">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Departamento / Administração</span>
                <span className="text-xs font-bold text-slate-800 block">Ministério da Defesa e Infraestrutura de Segurança</span>
              </div>

              {/* Registo de Acesso */}
              <div className="bg-white border border-slate-200 p-4 rounded-2xl md:col-span-2 h-full">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Nível de Acesso</span>
                <span className="text-xs font-bold text-slate-800 block">Administrador de Sistema (Infraestrutura Central - CDA)</span>
              </div>
            </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={editAdminName}
                    onChange={(e) => setEditAdminName(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Telefone Principal</label>
                  <input
                    type="text"
                    value={editAdminPhone}
                    onChange={(e) => setEditAdminPhone(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Funcional</label>
                  <input
                    type="email"
                    value={editAdminEmail}
                    onChange={(e) => setEditAdminEmail(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">NIF</label>
                  <input
                    type="text"
                    value={editAdminNif}
                    onChange={(e) => setEditAdminNif(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}
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

            <form onSubmit={submitAdminPasswordChange} className="space-y-4">
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
                    className="text-[11px] text-red-650 font-black bg-red-50 border border-red-200 rounded-xl px-4 py-2.5"
                  >
                    {passwordError}
                  </motion.div>
                )}

                {passwordSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-[11px] text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex items-center gap-1.5"
                  >
                    <Check size={14} className="text-emerald-600" />
                    <span>{passwordSuccessMsg || 'Palavra-passe alterada com sucesso!'}</span>
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
