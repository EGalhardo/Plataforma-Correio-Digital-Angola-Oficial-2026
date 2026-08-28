import React, { useState, useEffect } from "react";
import { 
  Settings, 
  Lock, 
  Laptop, 
  Languages, 
  History, 
  Check,
  Camera,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  X,
  Landmark
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useSession } from "../../services/sessionStore";
import { supabaseService, hasValidSupabaseKeys } from "../../services/supabaseService";
import { supabase } from '../../lib/supabaseClient';
import { guardarAvatar, isPlaceholderAvatar } from '../../services/avatarService';
import { guardarPerfilLocal } from '../../services/perfilLocalService';
import { syncProfileToCloud, buildCitizenContaPatch, contaSaveFeedbackFromOutcome, guardarPendenciaPerfil, limparPendenciaPerfil, syncInstitutionMemberToCloud, type ProfileSyncOutcome } from '../../services/profileSyncService';
import { getLocalInstReg, normalizeInstCode, updateInstMemberProfile, buildAgentNumber, setInstLogo } from "../../services/institutionRegistrationStore";

interface InstitutionProfileProps {
  userProfilePhoto: string;
  setIsPrefsOpen: (open: boolean) => void;
  setPrefSubTab: (tab: string) => void;
  setIsConfiguringSecurity: (configuring: boolean) => void;
  setTab: (tab: string) => void;
  profileName: string;
  nif: string;
  showSensitiveData: boolean;
  phone?: string;
  bi?: string;
  email?: string;
  role?: string;
  department?: string;
  institution?: string;
  lastAccess?: string;
  agentNumber?: string;
  addAuditLog?: (action: string, type?: 'info' | 'warning' | 'critical' | 'success') => void;
}

export const InstitutionProfile: React.FC<InstitutionProfileProps> = ({
  userProfilePhoto,
  setIsPrefsOpen,
  setPrefSubTab,
  setIsConfiguringSecurity,
  setTab,
  profileName: originalProfileName,
  nif: _originalNif,
  phone: originalPhone,
  bi: originalBi,
  email: originalEmail,
  role: originalRole,
  department: originalDepartment,
  institution: originalInstitution,
  lastAccess: originalLastAccess,
  agentNumber: agentNumberProp,
  addAuditLog,
}) => {
  // F8 — apenas os dados desta conta: campos vazios mostram "—" (sem dados demo do cidadão).
  const profileName = typeof originalProfileName === 'string' && originalProfileName.trim()
    ? originalProfileName
    : (typeof originalInstitution === 'string' && originalInstitution.trim() ? originalInstitution.replace(/\s*\([^)]*\)\s*$/, '') : 'Agente Institucional');
  const bi = typeof originalBi === 'string' && originalBi ? originalBi : '';
  const phone = typeof originalPhone === 'string' && originalPhone ? originalPhone : '';
  const email = typeof originalEmail === 'string' && originalEmail ? originalEmail : '';
  const role = typeof originalRole === 'string' && originalRole ? originalRole : 'Agente Institucional';
  const department = typeof originalDepartment === 'string' && originalDepartment ? originalDepartment : '';
  const institution = typeof originalInstitution === 'string' && originalInstitution ? originalInstitution : 'Administração Geral Tributária (AGT)';
  const lastAccess = typeof originalLastAccess === 'string' && originalLastAccess ? originalLastAccess : '—';

  // F8 — sem foto própria, mostra-se um marcador neutro institucional (nunca a foto do cidadão demo).
  // v37.56 — conta nova sem foto de perfil ⇒ iniciais + fundo azul (nunca a foto
  // por omissão). Qualquer URL placeholder (Edlasio/unsplash) conta como "sem foto".
  // v37.68 — detector único partilhado (isPlaceholderAvatar) em vez da lista local.
  const finalPhoto = isPlaceholderAvatar(userProfilePhoto) ? "" : userProfilePhoto;

  const { updateUserFields, updateActiveProfileFields } = useSession();
  const [isEditingInst, setIsEditingInst] = useState(false);
  const [editInstName, setEditInstName] = useState(profileName || '');
  const [editInstRole, setEditInstRole] = useState(role || 'Funcionário Oficial');
  const [editInstDept, setEditInstDept] = useState(department || '');
  const [editInstPhone, setEditInstPhone] = useState(phone || '');
  const [editInstEmail, setEditInstEmail] = useState(email || '');

  useEffect(() => {
    setEditInstName(profileName || '');
    setEditInstRole(role || 'Funcionário Oficial');
    setEditInstDept(department || '');
    setEditInstPhone(phone || '');
    setEditInstEmail(email || '');
  }, [profileName, role, department, phone, email]);

  const handleSaveInstEdit = async () => {
    updateUserFields({ name: editInstName, phone: editInstPhone, email: editInstEmail });
    updateActiveProfileFields({
      role: editInstRole,
      departmentName: editInstDept,
    });

    // 2026-08-21 — a gravação distingue QUEM edita:
    //  · COLABORADOR (sessão com Nº de agente diferente do responsável): os
    //    dados vão para o REGISTO DO PRÓPRIO MEMBRO (local) e para os
    //    user_metadata da conta Auth DELE (nuvem, via /api/perfil-sync com
    //    `agente`). A linha `profiles` da instituição NUNCA é tocada — antes
    //    a edição do membro sobrescrevia o nome/telefone/e-mail do RESPONSÁVEL
    //    na nuvem e o nome editado pelo membro nem ficava para ele.
    //  · RESPONSÁVEL: comportamento anterior intacto (profiles + espelho por
    //    código).
    const reg = (() => { try { return bi ? getLocalInstReg(normalizeInstCode(bi)) : undefined; } catch { return undefined; } })();
    const respAgent = (reg?.agentNumber || (bi ? buildAgentNumber(normalizeInstCode(bi), 1) : '')).toUpperCase().replace(/\s+/g, '');
    const sessionAgent = (agentNumberProp || '').toUpperCase().replace(/\s+/g, '');
    const isMemberSession = !!sessionAgent && !!respAgent && sessionAgent !== respAgent;
    const personKey = isMemberSession ? sessionAgent : bi;
    const memberRec = isMemberSession
      ? (reg?.members || []).find(m => (m.agentNumber || '').toUpperCase().replace(/\s+/g, '') === sessionAgent)
      : undefined;

    // espelho local POR PESSOA (2026-08-20 padrão; membros agora por Nº de agente)
    guardarPerfilLocal('institution', personKey || '', {
      name: editInstName,
      phone: editInstPhone,
      email: editInstEmail,
    });

    let syncOutcome: ProfileSyncOutcome | 'no_cloud' = 'no_cloud';
    if (isMemberSession && memberRec) {
      // grava no registo do próprio membro (Equipa reflecte as alterações)
      updateInstMemberProfile(normalizeInstCode(bi), memberRec.id, {
        name: editInstName,
        email: editInstEmail,
        phone: editInstPhone,
        role: editInstRole,
        dept: editInstDept,
      });
      if (hasValidSupabaseKeys()) {
        const res = await syncInstitutionMemberToCloud(supabase, sessionAgent, {
          name: editInstName,
          phone: editInstPhone,
          email: editInstEmail,
        });
        syncOutcome = res;
        if (res === 'error' || res === 'unavailable') {
          guardarPendenciaPerfil(personKey, buildCitizenContaPatch(personKey, {
            name: editInstName,
            phone: editInstPhone,
            email: editInstEmail,
          }));
        } else if (res === 'ok') {
          limparPendenciaPerfil(personKey);
        }
      }
    } else if (hasValidSupabaseKeys() && bi) {
      const patch = buildCitizenContaPatch(bi, {
        name: editInstName,
        phone: editInstPhone,
        email: editInstEmail,
      });
      const res = await syncProfileToCloud(supabase, patch);
      syncOutcome = res.outcome;
      if (res.outcome === 'error' || res.outcome === 'unavailable') {
        guardarPendenciaPerfil(bi, patch);
      } else if (res.outcome === 'ok' || res.outcome === 'created' || res.outcome === 'schema_retry') {
        limparPendenciaPerfil(bi);
      }
    }
    if (addAuditLog) {
      addAuditLog(isMemberSession
        ? `Perfil do colaborador ${memberRec?.name || sessionAgent} atualizado — registo do membro + nuvem (conta própria).`
        : 'Perfil Institucional e credenciais funcionais atualizados com sucesso', 'success');
    }
    setIsEditingInst(false);
    const fb = contaSaveFeedbackFromOutcome(syncOutcome);
    setFeedback({ type: fb.type, text: fb.text, details: fb.details });
  };
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string; details?: string } | null>(null);

  useEffect(() => {
    if (feedback && feedback.type === 'success') {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPhoto(true);
      setFeedback(null);
      if (addAuditLog) {
        addAuditLog('Iniciado upload de nova foto de perfil (Agente/Instituição)', 'info');
      }

      if (hasValidSupabaseKeys()) {
        const fileExt = file.name.split('.').pop();
        // 2026-08-21 — foto POR PESSOA: um colaborador não substitui a foto do
        // responsável/instituição (chave = Nº de agente próprio).
        const reg = (() => { try { return bi ? getLocalInstReg(normalizeInstCode(bi)) : undefined; } catch { return undefined; } })();
        const respAgent = (reg?.agentNumber || (bi ? buildAgentNumber(normalizeInstCode(bi), 1) : '')).toUpperCase().replace(/\s+/g, '');
        const sessionAgent = (agentNumberProp || '').toUpperCase().replace(/\s+/g, '');
        const personKey = (sessionAgent && respAgent && sessionAgent !== respAgent) ? sessionAgent : bi;
        const fileName = `${personKey || 'institution'}_${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const publicUrl = await supabaseService.uploadFile('fotos_perfil', filePath, file);
        if (publicUrl) {
          updateUserFields({ avatarUrl: publicUrl });
          try { if (personKey) localStorage.setItem(`cda_inst_profile_photo_${personKey.toUpperCase()}`, publicUrl); } catch { /* ignora */ }
          guardarAvatar('institution', personKey || '', publicUrl);
          
          if (addAuditLog) {
            addAuditLog('Foto de perfil institucional atualizada com sucesso no Supabase Storage', 'success');
          }
          
          setFeedback({
            type: 'success',
            text: 'Foto de perfil institucional atualizada com sucesso no Supabase Storage!',
            details: `Ficheiro guardado em bucket fotos_perfil/avatars/${fileName}`
          });
        } else {
          throw new Error('Falha ao obter URL pública do Supabase');
        }
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64String = event.target?.result as string;
          updateUserFields({ avatarUrl: base64String });
          try { if (bi) localStorage.setItem(`cda_inst_profile_photo_${bi.toUpperCase()}`, base64String); } catch { /* ignora */ }
          guardarAvatar('institution', bi || '', base64String);
          
          if (addAuditLog) {
            addAuditLog('Foto de perfil institucional atualizada com sucesso localmente', 'success');
          }
          
          setFeedback({
            type: 'success',
            text: 'Foto de perfil institucional atualizada com sucesso localmente!',
            details: 'Guardada no armazenamento offline do navegador (localStorage)'
          });
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      if (addAuditLog) {
        addAuditLog(`Erro ao atualizar foto de perfil institucional: ${error.message || error}`, 'warning');
      }
      setFeedback({
        type: 'error',
        text: 'Erro ao carregar a foto de perfil institucional.',
        details: (error as Error)?.message || String(error)
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const normalizedInstitution = institution;
  const institutionAcronymMatch = typeof normalizedInstitution === 'string' ? normalizedInstitution.match(/\(([^)]+)\)/) : null;
  const institutionAcronym = institutionAcronymMatch?.[1] || (typeof normalizedInstitution === 'string' ? normalizedInstitution.split(' ').map(word => word ? word[0] : '').join('').slice(0, 8).toUpperCase() : 'AGT');
  // F8 — sem e-mail registado não se inventa um endereço a partir do nome: mostra-se "—".
  const derivedEmail = email;
  const derivedPersonalEmail = '';
  // F8 — dados reais do registo desta instituição (Nº agente + data de adesão)
  const instReg = (() => { try { return bi ? getLocalInstReg(normalizeInstCode(bi)) : undefined; } catch { return undefined; } })();
  const agentNoDisplay = agentNumberProp || instReg?.agentNumber || (bi ? `CDA-${institutionAcronym}-2026-${bi.slice(-4)}` : '—');
  const adhesionDate = instReg?.criadoEm ? new Date(instReg.criadoEm).toLocaleDateString('pt-AO') : '12 de Março de 2024';

  // v37.50 — actualizar a logomarca da instituição no Perfil. O «ID Digital» do
  // Painel refresca sozinho (tick de 4s) porque lê reg.logoDataUrl.
  const instLogoCode = normalizeInstCode(originalBi || '');
  const [logoVer, setLogoVer] = useState(0);
  const [logoMsg, setLogoMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const logoAtual = getLocalInstReg(instLogoCode)?.logoDataUrl;
  void logoVer;
  const handleLogoFilePerfil = (file: File) => {
    setLogoMsg(null);
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setLogoMsg({ kind: 'err', text: 'A logomarca excede 2MB.' }); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl) { setLogoMsg({ kind: 'err', text: 'Não foi possível ler a imagem.' }); return; }
      setInstLogo(instLogoCode, dataUrl);
      try {
        const raw = localStorage.getItem('correio_digital_institutions');
        if (raw) {
          const list = JSON.parse(raw).map((it: { instCode?: string; logoUrl?: string }) =>
            (it.instCode || '').toUpperCase() === instLogoCode.toUpperCase() ? { ...it, logoUrl: dataUrl } : it);
          localStorage.setItem('correio_digital_institutions', JSON.stringify(list));
        }
      } catch { /* ignora */ }
      setLogoVer(v => v + 1);
      setLogoMsg({ kind: 'ok', text: 'Logomarca actualizada — reflecte no Painel («ID Digital»).' });
      addAuditLog?.(`Logomarca da instituição ${instLogoCode} actualizada no Perfil.`, 'info');
    };
    reader.readAsDataURL(file);
  };

  return (
    <section className="space-y-6 text-slate-950 animate-fade-in font-sans">
      
      {/* Header row as seen in screenshot 2 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-5 mb-2 gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-slate-400">Minha Conta</span>
          <h1 className="text-2xl md:text-3xl font-black text-slate-950 tracking-tight">Perfil do Utilizador</h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Gerencie suas informações pessoais e preferências de acesso</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-[#f0f4ff] border border-blue-200 rounded-full text-blue-700 font-extrabold text-[11px] uppercase tracking-wider">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 bg-emerald-500 animate-pulse" />
          <span>Online & Autenticado</span>
        </div>
      </div>

      {/* Feedback Banner */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 border rounded-2xl flex items-start gap-3 text-xs relative ${
              feedback.type === 'success' 
                ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900' 
                : feedback.type === 'error'
                ? 'bg-rose-50/90 border-rose-200 text-rose-900'
                : 'bg-slate-50/90 border-slate-150 text-slate-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-1 pr-6">
              <p className="font-extrabold leading-none">{feedback.text}</p>
              {feedback.details && <p className="text-[11px] opacity-85 leading-relaxed">{feedback.details}</p>}
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="absolute top-3 right-3 p-1 rounded-lg hover:bg-black/5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* v37.50 — Logomarca da Instituição (actualizável no Perfil) */}
      <div className="bg-white border border-slate-200 rounded-[32px] p-5 md:p-6 shadow-sm flex items-center gap-4 md:gap-6">
        <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl border border-slate-100 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
          {logoAtual ? (
            <img src={logoAtual} alt="Logomarca da instituição" className="w-full h-full object-contain" />
          ) : (
            <Landmark size={22} className="text-slate-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Logomarca da Instituição</div>
          <div className="text-sm font-bold text-slate-900 leading-snug truncate">{originalInstitution || instLogoCode}</div>
          {logoMsg && (
            <p className={`mt-1 text-[11px] font-bold ${logoMsg.kind === 'ok' ? 'text-emerald-600' : 'text-rose-600'}`}>{logoMsg.text}</p>
          )}
        </div>
        <label className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-extrabold uppercase tracking-wider cursor-pointer">
          <Camera size={14} />
          {logoAtual ? 'Substituir' : 'Carregar'}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoFilePerfil(f); e.target.value = ''; }} />
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

        {/* Left Column — flex column h-full: o cartão preenche a altura da linha */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-[32px] p-6 flex flex-col items-center text-center relative overflow-hidden shadow-sm text-left h-full">
          
          <div className="relative mt-4 mb-4 group">
            <div className="w-32 h-32 md:w-36 md:h-36 rounded-[28px] border border-slate-150 p-1 bg-white relative overflow-hidden">
              {finalPhoto ? (
                <img 
                  src={finalPhoto} 
                  alt={profileName} 
                  className="w-full h-full rounded-[22px] object-cover transition-all group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full rounded-[22px] bg-gradient-to-b from-[#1e3a8a] to-[#0c2340] flex items-center justify-center text-white">
                  <span className="text-6xl font-black leading-none select-none">
                    {(profileName || institutionAcronym || '?').trim().charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              
              {/* Hover overlay */}
              <label 
                htmlFor="inst-photo-upload" 
                className="absolute inset-1 rounded-[22px] bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-all duration-200"
              >
                <Camera size={24} className="mb-1" />
                <span className="text-[9px] font-black tracking-wider uppercase">Alterar Foto</span>
              </label>
              
              {/* Upload loading state overlay */}
              {isUploadingPhoto && (
                <div className="absolute inset-1 rounded-[22px] bg-slate-900/60 flex flex-col items-center justify-center text-white">
                  <RefreshCw size={24} className="animate-spin mb-1 text-sky-400" />
                  <span className="text-[9px] font-black tracking-wider uppercase">A Carregar...</span>
                </div>
              )}
            </div>

            {/* Checkmark or Action Trigger overlay */}
            <label 
              htmlFor="inst-photo-upload"
              className="absolute -bottom-1 -right-1 text-white p-2 rounded-xl border-2 border-white bg-indigo-600 hover:bg-indigo-800 shadow-md cursor-pointer transition-all active:scale-95 flex items-center justify-center"
              title="Carregar nova foto"
            >
              <Camera size={14} strokeWidth={2.5} />
            </label>

            <input 
              id="inst-photo-upload"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              disabled={isUploadingPhoto}
              className="hidden"
            />
          </div>

          <h3 className="text-xl font-black text-slate-950 tracking-tight text-center uppercase mb-1">
            {profileName}
          </h3>
          <p className="text-[#2563eb] font-extrabold text-[10px] uppercase text-center tracking-wider mb-2 leading-none">{role}</p>
          
          <div className="inline-flex mx-auto items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-wider mb-6 border border-emerald-100">
            <Check size={10} strokeWidth={3} />
            Conta Ativa
          </div>

          <div className="w-full border-t border-slate-100 my-2" />

          {/* Utilizador details stack */}
          <div className="w-full space-y-4 text-left p-2">
            {[
              { label: 'ID do Utilizador', value: agentNoDisplay, type: 'mono' },
              { label: 'Departamento', value: department || '—', type: 'text' },
              { label: 'Cargo Oficial', value: role, type: 'text' },
              { label: 'Email Institucional', value: derivedEmail || '—', type: 'text' },
              { label: 'Telefone do Estado', value: phone || '—', type: 'mono' },
              { label: 'Data de Adesão', value: adhesionDate, type: 'text' },
              { label: 'Último Acesso', value: lastAccess, type: 'text', bold: true }
            ].map((detail, idx) => (
              <div key={idx} className="border-b border-slate-50 pb-2.5 last:border-0 last:pb-0">
                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{detail.label}</span>
                <span className={`text-[11px] block font-bold ${detail.bold ? 'text-[#2563eb]' : 'text-slate-800'} ${detail.type === 'mono' ? 'font-mono' : ''}`}>
                  {detail.value}
                </span>
              </div>
            ))}
          </div>

          <button 
            onClick={() => {
              setIsPrefsOpen(true);
              setPrefSubTab('geral');
            }}
            className="w-full mt-auto pt-4 py-3 bg-[#0E2B64] border border-[#0E2B64] hover:bg-[#081a3d] hover:border-[#081a3d] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Settings size={13} />
            Editar Perfil
          </button>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 flex flex-col gap-6 h-full text-left">
          
          {/* INFORMAÇÕES DA CONTA */}
          <div className="bg-white border border-slate-200 rounded-[32px] p-6 md:p-8 space-y-6 shadow-sm">
            <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-950 text-xl uppercase tracking-tight">Informações da Conta</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  {isEditingInst ? 'A editar credenciais funcionais' : 'Credenciais funcionais e sector público'}
                </p>
              </div>
              <div>
                {!isEditingInst ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingInst(true)}
                    className="px-4 py-2.5 bg-[#0E2B64] hover:bg-[#081a3d] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border-0"
                  >
                    <Settings size={14} />
                    Editar Perfil
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveInstEdit}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1 shadow-sm cursor-pointer border-0"
                    >
                      <Check size={14} />
                      Gravar
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingInst(false)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border-0"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {!isEditingInst ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Nome Completo', value: profileName },
                  { label: 'Função no Sistema', value: role },
                  { label: 'Nível de Acesso', value: 'Padrão', highlight: true },
                  { label: 'Perfil de Permissões', value: 'Operacional' },
                  { label: 'Instituição Sincronizada', value: institution, colSpan: 'md:col-span-2' },
                  { label: 'Departamento / Repartição', value: department || '—', colSpan: 'md:col-span-2' },
                  { label: 'Email Alternativo (Pessoal)', value: derivedPersonalEmail || '—' },
                  { label: 'Telefone Pessoal', value: phone || '—' }
                ].map((field, idx) => (
                  <div key={idx} className={`bg-slate-50/50 border border-slate-150 p-4 rounded-2xl flex flex-col justify-center ${field.colSpan || ''}`}>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">{field.label}</span>
                    <div className="flex items-center gap-2">
                      {field.highlight ? (
                        <span className="text-xs font-black bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
                          {field.value}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-800">
                          {field.value}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col justify-center">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={editInstName}
                    onChange={(e) => setEditInstName(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col justify-center">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Função no Sistema</label>
                  <input
                    type="text"
                    value={editInstRole}
                    onChange={(e) => setEditInstRole(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col justify-center md:col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Departamento / Repartição</label>
                  <input
                    type="text"
                    value={editInstDept}
                    onChange={(e) => setEditInstDept(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col justify-center">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Email Alternativo</label>
                  <input
                    type="email"
                    value={editInstEmail}
                    onChange={(e) => setEditInstEmail(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col justify-center">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Telefone Pessoal</label>
                  <input
                    type="text"
                    value={editInstPhone}
                    onChange={(e) => setEditInstPhone(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3 Lower Bento Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch mt-auto">
            
            {/* A. SEGURANÇA DA CONTA */}
            <div className="bg-white border border-slate-200 rounded-[32px] p-6 text-left shadow-sm flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-100">
                    <Lock size={15} />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest leading-none">Segurança da Conta</h4>
                  </div>
                </div>

                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Autenticação 2FA</span>
                    <span className="font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 border border-emerald-100 rounded-md">Ativo</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Dispositivos Ligados</span>
                    <span className="font-bold text-slate-800">3 dispositivos</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500 font-medium">Sessões Ativas</span>
                    <span className="font-bold text-slate-800">1 sessão</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setIsConfiguringSecurity(true)}
                className="w-full mt-auto pt-4 py-2.5 bg-[#0E2B64] hover:bg-[#081a3d] border border-[#0E2B64] rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-white flex items-center justify-center gap-1 cursor-pointer"
              >
                Alterar Senha & 2FA
              </button>
            </div>

            {/* B. DISPOSITIVOS E ACESSOS */}
            <div className="bg-white border border-slate-200 rounded-[32px] p-6 text-left shadow-sm flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                    <Laptop size={15} />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest leading-none">Dispositivos</h4>
                  </div>
                </div>

                <div className="space-y-2 text-[10px]">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-800">Windows &bull; Chrome</span>
                    <span className="text-[8px] font-black uppercase text-emerald-700 bg-emerald-50 px-1 rounded">Atual</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">Android &bull; Chrome</span>
                    <span className="text-slate-400">Ativo</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-500">iPhone &bull; Safari</span>
                    <span className="text-slate-400">Inativo</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => { setIsPrefsOpen(true); setPrefSubTab('conectividade'); }}
                className="w-full mt-auto pt-4 py-2.5 bg-[#0E2B64] hover:bg-[#081a3d] border border-[#0E2B64] rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-white flex items-center justify-center gap-1 cursor-pointer"
              >
                Gerir Dispositivos
              </button>
            </div>

            {/* C. PREFERÊNCIAS */}
            <div className="bg-white border border-slate-200 rounded-[32px] p-6 text-left shadow-sm flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                    <Languages size={15} />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest leading-none">Preferências</h4>
                  </div>
                </div>

                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between pb-1 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Idioma</span>
                    <span className="font-bold text-slate-800">Português</span>
                  </div>
                  <div className="flex justify-between pb-1 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Notificações</span>
                    <span className="font-extrabold text-emerald-600">Ativas</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Tema</span>
                    <span className="font-bold text-slate-600">Claro</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => { setIsPrefsOpen(true); setPrefSubTab('geral'); }}
                className="w-full mt-auto pt-4 py-2.5 bg-[#0E2B64] hover:bg-[#081a3d] border border-[#0E2B64] rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-white flex items-center justify-center gap-1 cursor-pointer"
              >
                Gerir Preferências
              </button>
            </div>

          </div>

          {/* ATIVIDADE RECENTE NA CONTA */}
          <div className="bg-white border border-slate-200 rounded-[32px] p-6 md:p-8 text-left shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-950 text-sm uppercase tracking-widest">Atividade Recente na Conta</h3>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb] shrink-0" />
            </div>

            <div className="overflow-x-auto">
              <table className="mobile-data-table w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 font-black text-slate-400 uppercase tracking-wider text-[9px]">
                    <th className="py-3 pr-4">Actividade</th>
                    <th className="py-3 px-4">Dispositivo</th>
                    <th className="py-3 px-4">Data & Local</th>
                    <th className="py-3 pl-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                  <tr>
                    <td className="py-3.5 pr-4 font-bold text-slate-900">Login no sistema</td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">Windows &bull; Chrome</td>
                    <td className="py-3.5 px-4">Hoje às 18:45 &bull; Luanda, AO</td>
                    <td className="py-3.5 pl-4 text-right">
                      <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md uppercase">Sucesso</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 pr-4 font-bold text-slate-900">Visualização de correspondência</td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">Windows &bull; Chrome</td>
                    <td className="py-3.5 px-4">Hoje às 16:30 &bull; Protocolo: CD-2026-0001254</td>
                    <td className="py-3.5 pl-4 text-right">
                      <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md uppercase">Sucesso</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 pr-4 font-bold text-slate-900">Download de documento</td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">Windows &bull; Chrome</td>
                    <td className="py-3.5 px-4">Hoje às 15:10 &bull; Alvará da instituição</td>
                    <td className="py-3.5 pl-4 text-right">
                      <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md uppercase">Sucesso</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <button 
              onClick={() => setTab('historico')}
              className="w-full mt-4 py-2.5 bg-[#0E2B64] hover:bg-[#081a3d] border border-[#0E2B64] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-white flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <History size={12} />
              Ver Toda Atividade
            </button>
          </div>

        </div>
      </div>
    </section>
  );
};
