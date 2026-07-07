import React, { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  ShieldCheck, 
  History, 
  Settings, 
  Lock, 
  ChevronRight, 
  Users, 
  Smartphone, 
  IdCard, 
  Check,
  RefreshCw,
  Database,
  AlertTriangle,
  X,
  Info,
  Camera
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabaseService, hasValidSupabaseKeys } from "../../services/supabaseService";
import { useSession } from "../../services/sessionStore";

import { Contact, Document } from '../../types';

interface CitizenProfileProps {
  userProfilePhoto: string;
  setIsPrefsOpen: (open: boolean) => void;
  setPrefSubTab: (tab: string) => void;
  setIsConfiguringSecurity: (configuring: boolean) => void;
  setTab: (tab: string) => void;
  profileName: string;
  bi: string;
  phone: string;
  email?: string;
  userFiliation?: string;
  contactsList?: Contact[];
  documentsList?: Document[];
  correspondencesCount?: number;
  institutionsCount?: number;
  lastAccess?: string;
  onSyncSupabase?: () => Promise<any>;
  isSyncingSupabase?: boolean;
  addAuditLog?: (action: string, type?: 'info' | 'warning' | 'critical' | 'success') => void;
}

export const CitizenProfile: React.FC<CitizenProfileProps> = ({
  userProfilePhoto = '',
  setIsPrefsOpen,
  setPrefSubTab,
  setIsConfiguringSecurity,
  setTab,
  profileName = 'Edlasio Galhardo',
  bi = '',
  phone = '',
  email = '',
  userFiliation = 'António Galhardo & Maria Conceição',
  contactsList = [],
  documentsList = [],
  correspondencesCount = 0,
  institutionsCount = 0,
  lastAccess = 'Hoje às 18:45',
  onSyncSupabase,
  isSyncingSupabase = false,
  addAuditLog,
}) => {
  const [localSyncing, setLocalSyncing] = useState(false);
  const [localSyncStep, setLocalSyncStep] = useState('');
  const [showMissingKeysDialog, setShowMissingKeysDialog] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string; details?: string } | null>(null);

  const { user, updateUserFields } = useSession();
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editFiliation, setEditFiliation] = useState(user?.filiation || 'António Galhardo & Maria Conceição');
  const [editMaritalStatus, setEditMaritalStatus] = useState(user?.maritalStatus || 'Solteiro');

  useEffect(() => {
    setEditName(user?.name || '');
    setEditPhone(user?.phone || '');
    setEditEmail(user?.email || '');
    setEditFiliation(user?.filiation || 'António Galhardo & Maria Conceição');
    setEditMaritalStatus(user?.maritalStatus || 'Solteiro');
  }, [user]);

  const handleSaveDirectEdit = async () => {
    try {
      updateUserFields({
        name: editName,
        phone: editPhone,
        email: editEmail,
        filiation: editFiliation,
        maritalStatus: editMaritalStatus
      });

      if (hasValidSupabaseKeys()) {
        await supabaseService.upsertProfile({
          bi: user?.bi || '',
          name: editName,
          phone: editPhone,
          filiation: editFiliation,
          marital_status: editMaritalStatus,
          role: 'user'
        });
        if (addAuditLog) {
          addAuditLog('Dados do cidadão sincronizados com sucesso no Supabase', 'success');
        }
      }

      if (addAuditLog) {
        addAuditLog('Ficha civil e dados de perfil atualizados diretamente no Perfil', 'success');
      }

      setIsEditingInfo(false);
      setFeedback({
        type: 'success',
        text: 'Perfil atualizado com sucesso!',
        details: 'As suas informações pessoais foram guardadas localmente e propagadas no sistema central.'
      });
    } catch (error: any) {
      setFeedback({
        type: 'error',
        text: 'Erro ao atualizar o perfil.',
        details: error?.message || String(error)
      });
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPhoto(true);
      setFeedback(null);
      if (addAuditLog) {
        addAuditLog('Iniciado upload de nova foto de perfil', 'info');
      }

      if (hasValidSupabaseKeys()) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${bi || 'avatar'}_${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const publicUrl = await supabaseService.uploadFile('fotos_perfil', filePath, file);
        if (publicUrl) {
          updateUserFields({ avatarUrl: publicUrl });
          
          if (addAuditLog) {
            addAuditLog('Foto de perfil atualizada e sincronizada com sucesso no Supabase Storage', 'success');
          }
          
          setFeedback({
            type: 'success',
            text: 'Foto de perfil atualizada com sucesso no Supabase Storage!',
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
          
          if (addAuditLog) {
            addAuditLog('Foto de perfil atualizada com sucesso localmente (Modo Offline)', 'success');
          }
          
          setFeedback({
            type: 'success',
            text: 'Foto de perfil atualizada com sucesso localmente!',
            details: 'Guardada no armazenamento offline do navegador (localStorage)'
          });
        };
        reader.readAsDataURL(file);
      }
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      if (addAuditLog) {
        addAuditLog(`Erro ao atualizar foto de perfil: ${error.message || error}`, 'warning');
      }
      setFeedback({
        type: 'error',
        text: 'Erro ao carregar a foto de perfil.',
        details: error?.message || String(error)
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  useEffect(() => {
    if (feedback && feedback.type === 'success') {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const handleSyncClick = async () => {
    setFeedback(null);
    const hasKeys = hasValidSupabaseKeys();
    
    if (!hasKeys) {
      setShowMissingKeysDialog(true);
      return;
    }

    if (onSyncSupabase) {
      try {
        setLocalSyncing(true);
        setLocalSyncStep('A inicializar ligação segura com Supabase...');
        await new Promise(resolve => setTimeout(resolve, 600));
        
        setLocalSyncStep('A sincronizar ficha civil e dados de perfil...');
        await new Promise(resolve => setTimeout(resolve, 800));

        setLocalSyncStep('A exportar expedientes e correspondência...');
        await new Promise(resolve => setTimeout(resolve, 700));

        const result = await onSyncSupabase();
        
        if (result && result.success) {
          setFeedback({
            type: 'success',
            text: 'Sincronização com Supabase concluída!',
            details: `A sua conta foi sincronizada com sucesso. ${result.message || ''}`
          });
          if (addAuditLog) {
            addAuditLog('Sincronização bidireccional completa com Supabase', 'success');
          }
        } else if (result && !result.success) {
          setFeedback({
            type: 'error',
            text: 'Erro de Sincronização Supabase',
            details: result.message || 'Verifique as suas chaves e tabelas no painel do Supabase.'
          });
        } else {
          setFeedback({
            type: 'success',
            text: 'Sincronização efetuada com sucesso!',
            details: 'A sua conta do Correio Digital foi totalmente integrada com o banco de dados central.'
          });
        }
      } catch (err: any) {
        setFeedback({
          type: 'error',
          text: 'Falha na ligação com o servidor Supabase',
          details: err?.message || 'Verifique a sua ligação de rede e tente novamente.'
        });
      } finally {
        setLocalSyncing(false);
        setLocalSyncStep('');
      }
    }
  };

  const handleSimulatedSync = async () => {
    setShowMissingKeysDialog(false);
    setLocalSyncing(true);
    setFeedback(null);

    try {
      setLocalSyncStep('A simular ligação ao servidor Supabase...');
      await new Promise(resolve => setTimeout(resolve, 800));

      setLocalSyncStep('A empacotar dados locais do Bilhete de Identidade...');
      await new Promise(resolve => setTimeout(resolve, 900));

      setLocalSyncStep(`A exportar ficheiros (${documentsList.length}) e correspondências (${correspondencesCount})...`);
      await new Promise(resolve => setTimeout(resolve, 1000));

      setLocalSyncStep('A finalizar mapeamento relacional de tabelas...');
      await new Promise(resolve => setTimeout(resolve, 600));

      localStorage.setItem('supabase_last_sync_time', new Date().toLocaleString());
      
      setFeedback({
        type: 'success',
        text: 'Sincronização Simulada Concluída com Sucesso! (Modo Sandbox)',
        details: `Sincronizados com sucesso: 1 perfil, ${documentsList.length} ficheiros digitais, ${correspondencesCount} correspondências e ${contactsList.length} contactos na base de dados virtual.`
      });

      if (addAuditLog) {
        addAuditLog('Sincronização com Supabase simulada com sucesso no navegador', 'success');
      }
    } catch (e) {
      // ignore
    } finally {
      setLocalSyncing(false);
      setLocalSyncStep('');
    }
  };

  const parents = userFiliation ? userFiliation.split('&').map(p => p.trim()) : [];
  const prioritizedContacts = [...contactsList].sort((a, b) => {
    const emergencyBoost = (value?: string) => value === 'Emergência' ? 1 : 0;
    return emergencyBoost(b.type) - emergencyBoost(a.type);
  });
  const fallbackContacts = [
    { name: parents[1] || 'Maria Conceição', relation: 'Familiar (Pai/Mãe)' },
    { name: parents[0] || 'António Galhardo', relation: 'Familiar (Pai/Mãe)' }
  ];
  const visibleContacts = [0, 1].map((index) => {
    const contact = prioritizedContacts[index];
    if (contact) {
      return {
        name: contact.name,
        relation: contact.relation || (contact.type === 'Emergência' ? 'Contacto de Emergência' : 'Contacto Autorizado')
      };
    }
    return fallbackContacts[index];
  });
  const safeProfileName = profileName || 'Cidadão';
  const derivedEmail = email || `${safeProfileName.toLowerCase().replace(/\s+/g, '.')}@cidadao.ao`;
  const visibleDocuments = documentsList.length > 0
    ? documentsList.slice(0, 3).map((doc) => ({ name: doc.name, status: 'Activo' }))
    : [
        { name: 'B.I. Digital', status: 'Activo' },
        { name: 'Passaporte Digital', status: 'Activo' },
        { name: 'Carta de Condução', status: 'Activo' }
      ];

  const isSyncBusy = isSyncingSupabase || localSyncing;

  return (
    <section className="space-y-6 text-slate-950 animate-fade-in font-sans">
      
      {/* Header row as seen in screenshot 3 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-5 mb-2 gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-slate-400">Minha Conta</span>
          <h1 className="text-2xl md:text-3xl font-black text-slate-950 tracking-tight">Bem-vindo, {profileName.split(' ')[0]}</h1>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Button "Sincronizar Supabase" on the left side of the "Conta verificada e activa" container */}
          <button
            onClick={handleSyncClick}
            disabled={isSyncBusy}
            className={`flex items-center gap-2 px-4 py-2 border rounded-full font-extrabold text-[11px] uppercase tracking-wider transition-all shadow-xs cursor-pointer select-none
              ${isSyncBusy 
                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                : 'bg-sky-50 hover:bg-sky-100 border-sky-100 text-sky-700 active:scale-[0.98]'
              }`}
          >
            <RefreshCw size={13} className={`${isSyncBusy ? 'animate-spin' : ''}`} />
            <span>{isSyncBusy ? 'A Sincronizar...' : 'Sincronizar Supabase'}</span>
          </button>

          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-full text-emerald-700 font-extrabold text-[11px] uppercase tracking-wider">
            <CheckCircle2 size={14} className="text-emerald-600 fill-emerald-100" />
            <span>Conta verificada e activa</span>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      <AnimatePresence>
        {localSyncStep && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-sky-50/80 border border-sky-150 rounded-2xl flex items-center gap-3 text-xs font-semibold text-sky-800 shadow-xs"
          >
            <RefreshCw size={16} className="animate-spin text-sky-600 shrink-0" />
            <div className="flex-1 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
              <span>{localSyncStep}</span>
              <span className="text-[10px] bg-sky-100 text-sky-700 px-2.5 py-0.5 rounded-full font-mono font-bold animate-pulse">Sincronizando...</span>
            </div>
          </motion.div>
        )}

        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 border rounded-2xl flex items-start gap-3 text-xs relative ${
              feedback.type === 'success' 
                ? 'bg-emerald-50/90 border-emerald-150 text-emerald-900' 
                : feedback.type === 'error'
                ? 'bg-rose-50/90 border-rose-150 text-rose-900'
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

      {/* Missing Keys Interactive Dialog Modal */}
      <AnimatePresence>
        {showMissingKeysDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[32px] border border-slate-200 max-w-md w-full p-6 md:p-8 shadow-2xl text-left font-sans text-slate-950"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
                  <Database size={24} />
                </div>
                <button 
                  onClick={() => setShowMissingKeysDialog(false)}
                  className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <h3 className="text-lg font-black text-slate-950 tracking-tight mb-2 uppercase">Integração do Supabase</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                As chaves de acesso ao <strong>Supabase</strong> não estão configuradas no ambiente local (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">.env</code>).
              </p>

              <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-2xl mb-6 space-y-2 text-[11px] text-slate-600">
                <p className="font-extrabold text-[#0c2340] flex items-center gap-1">
                  <Info size={12} className="text-indigo-600" />
                  O que deseja fazer?
                </p>
                <p>1. <strong>Simular Sincronização:</strong> Testa o fluxo visual e a atualização da ficha civil local no navegador.</p>
                <p>2. <strong>Configurar Chaves:</strong> Abre as configurações para introduzir as chaves reais de URL e Chave Pública do seu projecto Supabase.</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleSimulatedSync}
                  className="flex-1 py-3 bg-[#0E2B64] hover:bg-[#081a3d] border border-[#0E2B64] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-white cursor-pointer"
                >
                  Simular Sincronização
                </button>
                <button
                  onClick={() => {
                    setShowMissingKeysDialog(false);
                    setIsPrefsOpen(true);
                    setPrefSubTab('supabase');
                  }}
                  className="flex-1 py-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                >
                  Configurar Chaves
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6 text-left">
          
          {/* Photo Card with profile stats */}
          <div className="bg-white border border-slate-200 rounded-[32px] p-6 flex flex-col items-center text-center relative overflow-hidden shadow-sm">
            
            <div className="relative mt-4 mb-4 group">
              <div className="w-32 h-32 md:w-36 md:h-36 rounded-[28px] border border-slate-150 p-1 bg-white relative overflow-hidden">
                {userProfilePhoto ? (
                  <img 
                    src={userProfilePhoto} 
                    alt={profileName} 
                    className="w-full h-full rounded-[22px] object-cover transition-all group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                ) : null}
                
                {/* Hover overlay */}
                <label 
                  htmlFor="profile-photo-upload" 
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
                htmlFor="profile-photo-upload"
                className="absolute -bottom-1 -right-1 text-white p-2 rounded-xl border-2 border-white bg-indigo-600 hover:bg-indigo-750 shadow-md cursor-pointer transition-all active:scale-95 flex items-center justify-center"
                title="Carregar nova foto"
              >
                <Camera size={14} strokeWidth={2.5} />
              </label>

              <input 
                id="profile-photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                disabled={isUploadingPhoto}
                className="hidden"
              />
            </div>

            <h3 className="text-xl font-black text-slate-950 tracking-tight mb-1 uppercase">{profileName}</h3>
            <div className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-wider mb-6 border border-emerald-100">
              <ShieldCheck size={11} className="text-emerald-600" />
              CIDADÃO VERIFICADO
            </div>

            {/* ESTATÍSTICAS DA CONTA */}
            <div className="w-full space-y-4 text-left bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-2">Estatísticas da Conta</h4>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Ficheiros Guardados</span>
                <span className="font-extrabold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded-md">{documentsList.length}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Correspondências</span>
                <span className="font-extrabold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded-md">{correspondencesCount}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Instituições Ligadas</span>
                <span className="font-extrabold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded-md">{institutionsCount}</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-dashed border-slate-200">
                <span className="text-slate-400 font-medium text-[10px]">Último Acesso</span>
                <span className="font-bold text-slate-600">{lastAccess}</span>
              </div>
            </div>
          </div>

          {/* ACTIVIDADE RECENTE LOGS */}
          <div className="bg-white border border-slate-200 rounded-[32px] p-6 text-left shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Actividade Recente</h4>
              <span className="w-2 h-2 rounded-full bg-emerald-505 bg-emerald-500 animate-pulse" />
            </div>

            <div className="space-y-3">
              {[
                { action: 'BI actualizado', desc: 'Ficha civil sincronizada', time: 'Hoje às 10:32', type: 'success' },
                { action: 'Nova correspondência da AGT', desc: 'Notificação electrónica', time: 'Hoje às 09:15', type: 'info' },
                { action: 'Passaporte validado', desc: 'Homologação pelo SME', time: 'Ontem às 16:45', type: 'success' },
                { action: 'Factura da ENDE recebida', desc: 'Pagamento de utilidade integrado', time: 'Ontem às 11:20', type: 'warn' }
              ].map((act, idx) => (
                <div key={idx} className="flex gap-3 items-start text-xs border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                    act.type === 'success' ? 'bg-emerald-500' :
                    act.type === 'warn' ? 'bg-amber-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1">
                    <div className="font-extrabold text-slate-800 leading-snug">{act.action}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{act.desc}</div>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 text-right shrink-0">{act.time}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setTab('historico')}
              className="w-full mt-4 py-2.5 bg-[#0E2B64] hover:bg-[#081a3d] border border-[#0E2B64] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-white flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <History size={12} />
              Ver Toda Actividade
            </button>
          </div>

        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6 text-left">

          {/* INFORMAÇÕES PESSOAIS Card */}
          <div className="bg-white border border-slate-200 rounded-[32px] p-6 md:p-8 space-y-6 text-left shadow-sm">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="font-black text-slate-950 text-xl uppercase tracking-tight">Informações Pessoais</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  {isEditingInfo ? 'A editar ficha civil e dados do cidadão' : 'Ficha civil do cidadão titular sincronizada nacionalmente'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!isEditingInfo ? (
                  <>
                    <button 
                      onClick={() => setIsEditingInfo(true)}
                      className="px-4 py-2.5 bg-[#0E2B64] hover:bg-[#081a3d] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border-0"
                    >
                      <Settings size={14} />
                      Editar Perfil
                    </button>
                    <button 
                      onClick={() => {
                        setIsPrefsOpen(true);
                        setPrefSubTab('geral');
                      }}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border-0"
                    >
                      <Settings size={14} />
                      Configuração
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={handleSaveDirectEdit}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border-0"
                    >
                      <Check size={14} />
                      Guardar
                    </button>
                    <button 
                      onClick={() => setIsEditingInfo(false)}
                      className="px-4 py-2.5 bg-rose-150 hover:bg-rose-200 text-rose-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border-0"
                    >
                      <X size={14} />
                      Cancelar
                    </button>
                  </>
                )}
              </div>
            </div>

            {isEditingInfo ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex flex-col justify-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Nome Completo</span>
                  <input 
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-855 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-800"
                  />
                </div>

                <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex flex-col justify-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">B.I. (Nº Bilhete de Identidade) - Inalterável</span>
                  <span className="text-xs font-mono font-bold text-slate-500 p-2 bg-slate-100/50 rounded-lg">{bi}</span>
                </div>

                <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex flex-col justify-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Telemóvel Registado</span>
                  <input 
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-855 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-800"
                  />
                </div>

                <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex flex-col justify-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Correio Eletrónico (E-mail)</span>
                  <input 
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-855 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-800"
                  />
                </div>

                <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex flex-col justify-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Estado Civil</span>
                  <select 
                    value={editMaritalStatus}
                    onChange={(e) => setEditMaritalStatus(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-855 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer text-slate-800"
                  >
                    <option value="Solteiro">Solteiro(a)</option>
                    <option value="Casado">Casado(a)</option>
                    <option value="Divorciado">Divorciado(a)</option>
                    <option value="Viúvo">Viúvo(a)</option>
                  </select>
                </div>

                <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex flex-col justify-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Filiação (Paternidade & Maternidade)</span>
                  <input 
                    type="text"
                    value={editFiliation}
                    onChange={(e) => setEditFiliation(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-855 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-800"
                  />
                </div>

                <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex flex-col justify-center md:col-span-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Morada Residencial</span>
                  <input 
                    type="text"
                    defaultValue="Rua do Papel, 45, Luanda, Angola"
                    disabled
                    className="w-full p-2 bg-slate-100/50 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 focus:outline-none cursor-not-allowed"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Nome Completo', value: user?.name || '', type: 'text' },
                  { label: 'B.I. (Nº Bilhete de Identidade)', value: user?.bi || '', type: 'mono' },
                  { label: 'Email Registado', value: user?.email || derivedEmail, type: 'email', verified: true },
                  { label: 'Telemóvel Registado', value: user?.phone || '', type: 'phone', verified: true },
                  { label: 'Estado Civil', value: user?.maritalStatus || 'Solteiro(a)', type: 'text' },
                  { label: 'Filiação (Paternidade & Maternidade)', value: user?.filiation || 'António Galhardo & Maria Conceição', type: 'text' },
                  { label: 'Morada Residencial', value: 'Rua do Papel, 45, Luanda, Angola', type: 'text', colSpan: 'md:col-span-2' },
                  { label: 'Registo do Sistema Central', value: 'Conta criada em: 16 de Junho de 2025', type: 'text', colSpan: 'md:col-span-2', subtle: true }
                ].map((field, index) => (
                  <div 
                    key={index}
                    className={`bg-slate-50/50 border border-slate-150 p-4 rounded-2xl flex flex-col justify-center ${field.colSpan || ''}`}
                  >
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">{field.label}</span>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-bold text-slate-800 ${field.type === 'mono' ? 'font-mono' : ''}`}>
                        {field.value}
                      </span>
                      {field.verified && (
                        <span className="flex items-center gap-1 text-[8px] font-black text-emerald-700 bg-emerald-50 border border-emerald-150 px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0">
                          <Check size={10} strokeWidth={3} />
                          Verificado
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bento Grid: 4 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 1. SEGURANÇA */}
            <div className="bg-white border border-slate-200 rounded-[32px] p-6 text-left shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-2 border-b border-slate-50 pb-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-100">
                    <Lock size={16} />
                  </div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Segurança</h4>
                </div>
                
                <div className="divide-y divide-slate-50">
                  {[
                    { title: 'Alterar Palavra-passe', action: () => setIsConfiguringSecurity(true) },
                    { title: 'Activar Autenticação 2FA', action: () => setIsConfiguringSecurity(true) },
                    { title: 'Gerir Sessões Activas', action: () => { setIsPrefsOpen(true); setPrefSubTab('conectividade'); } },
                    { title: 'Dispositivos Ligados', action: () => { setIsPrefsOpen(true); setPrefSubTab('conectividade'); } }
                  ].map((item, idx) => (
                    <button 
                      key={idx}
                      onClick={item.action}
                      className="w-full py-3 flex justify-between items-center text-xs font-bold text-slate-705 hover:text-primary transition-all text-left cursor-pointer"
                    >
                      <span>{item.title}</span>
                      <ChevronRight size={14} className="text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. CONTACTOS DE EMERGÊNCIA */}
            <div className="bg-white border border-slate-200 rounded-[32px] p-6 text-left shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-2 border-b border-slate-50 pb-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                    <Users size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none mb-0.5">Contactos de Emergência</h4>
                    <span className="text-[9px] text-slate-400 font-semibold leading-none">Pessoas de confiança</span>
                  </div>
                </div>

                <div className="space-y-4 py-2">
                  {visibleContacts.map((contact, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <p className="text-xs font-extrabold text-slate-800">{contact.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{contact.relation}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                        <Smartphone size={14} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => setTab('contatos')}
                className="w-full mt-4 py-2.5 bg-[#0E2B64] hover:bg-[#081a3d] border border-[#0E2B64] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-white flex items-center justify-center gap-1 cursor-pointer"
              >
                Gerir Contactos
              </button>
            </div>

          </div>
          
        </div>
      </div>
    </section>
  );
};
