// ============================================================================
// Painéis de Acesso da Instituição (F4)
// ----------------------------------------------------------------------------
//  · InstitutionAccessPanel — mostrado no Perfil da área da Instituição:
//    alteração de palavra-passe da pessoa logada (responsável ou colaborador)
//    e carregamento do logótipo (exclusivo do responsável).
//  · InstitutionForcedPasswordChange — écran obrigatório no 1.º login de um
//    colaborador (senha inicial criada pelo responsável).
// Senhas 100% locais (modelo demo), com unicidade dentro da instituição.
// ============================================================================

import { useRef, useState } from 'react';
import { Lock, CheckCircle2, AlertTriangle, UploadCloud, ShieldCheck, Landmark, KeyRound } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import type { InstitutionIdentity } from '../../services/institutionSessionService';
import {
  getLocalInstReg, isInstPasswordTaken, setInstResponsiblePassword,
  updateInstMemberPassword, setInstLogo
} from '../../services/institutionRegistrationStore';

const inputCls = "w-full bg-white border border-slate-200 focus:border-[#2563eb]/40 focus:ring-1 focus:ring-[#2563eb]/40 rounded-[14px] pl-10 pr-4 py-3 text-xs font-bold text-slate-800 outline-none transition-all placeholder:text-slate-400";
const labelCls = "text-[9.5px] font-black text-slate-500 uppercase tracking-widest ml-1";

interface PanelProps {
  code: string;
  identity: InstitutionIdentity | null;
  onAudit?: (action: string, type?: 'info' | 'warning' | 'critical' | 'success') => void;
}

export function InstitutionAccessPanel({ code, identity, onAudit }: PanelProps) {
  const reg = getLocalInstReg(code);
  const member = identity?.type === 'member' ? (reg?.members || []).find(m => m.id === identity.memberId) : undefined;
  const isResponsible = !identity || identity.type === 'responsible';

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const [logoMsg, setLogoMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [logoVersion, setLogoVersion] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!reg) {
    // Instituição demo (AGT-9921-SR) — sem registo de adesão; painel não se aplica.
    return null;
  }

  const handleChangePassword = () => {
    setPwdMsg(null);
    const actual = isResponsible ? reg.password : member?.password;
    if (!currentPwd || currentPwd !== actual) {
      setPwdMsg({ kind: 'err', text: 'A palavra-passe actual está incorrecta.' });
      return;
    }
    if (newPwd.length < 8) {
      setPwdMsg({ kind: 'err', text: 'A nova palavra-passe deve ter pelo menos 8 caracteres.' });
      return;
    }
    if (newPwd === actual) {
      setPwdMsg({ kind: 'err', text: 'A nova palavra-passe não pode ser igual à actual.' });
      return;
    }
    // Anti-duplicação: a senha identifica a pessoa — sem repetições dentro da instituição
    if (isInstPasswordTaken(code, newPwd, member?.id)) {
      setPwdMsg({ kind: 'err', text: 'Esta palavra-passe já está em uso por outra credencial desta instituição. Escolha outra.' });
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdMsg({ kind: 'err', text: 'A confirmação não coincide com a nova palavra-passe.' });
      return;
    }
    if (isResponsible) {
      setInstResponsiblePassword(code, newPwd);
      // best-effort: actualiza também a password_hash na nuvem (mesma tabela do registo)
      const ready = (import.meta as any).env?.VITE_SUPABASE_URL && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
      if (ready) {
        void (async () => {
          try {
            const { error } = await supabase.from('solicitacoes_registo').update({ password_hash: newPwd }).eq('bi_numero', code);
            if (error) console.error('Erro a actualizar password_hash na nuvem:', error);
          } catch (e) { console.warn('Nuvem indisponível:', e); }
        })();
      }
    } else if (member) {
      updateInstMemberPassword(code, member.id, newPwd);
    }
    setPwdMsg({ kind: 'ok', text: 'Palavra-passe alterada com sucesso. Utilize-a no próximo login.' });
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    onAudit?.(`Palavra-passe ${isResponsible ? 'do responsável' : `do colaborador ${member?.name}`} da instituição ${code} alterada.`, 'success');
  };

  const handleLogoFile = (file: File) => {
    setLogoMsg(null);
    if (file.size > 2 * 1024 * 1024) {
      setLogoMsg({ kind: 'err', text: 'Logótipo excede 2MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setInstLogo(code, dataUrl);
      // reflecte na ficha da página Instituições da Admin (idem dispositivo)
      try {
        const raw = localStorage.getItem('correio_digital_institutions');
        if (raw) {
          const list = JSON.parse(raw).map((i: any) => (i.instCode || '').toUpperCase() === code.toUpperCase() ? { ...i, logoUrl: dataUrl } : i);
          localStorage.setItem('correio_digital_institutions', JSON.stringify(list));
        }
      } catch { /* ignora */ }
      setLogoVersion(v => v + 1);
      setLogoMsg({ kind: 'ok', text: 'Logótipo actualizado com sucesso.' });
      onAudit?.(`Logótipo da instituição ${code} actualizado pelo responsável.`, 'info');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="px-4 md:px-8 pt-4 md:pt-6 space-y-4">
      {/* Alterar Palavra-passe */}
      <div className="bg-white border border-slate-200 rounded-[22px] p-5 md:p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-3.5">
          <KeyRound size={15} className="text-[#2563eb]" />
          <span className="text-[10.5px] font-black uppercase tracking-widest text-slate-800">
            Alterar Palavra-passe {isResponsible ? '(Responsável)' : `(${member?.name || 'Colaborador'})`}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="grid gap-1.5">
            <label className={labelCls}>Palavra-passe actual</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Lock size={13} /></span>
              <input type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} className={inputCls} placeholder="Actual" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <label className={labelCls}>Nova palavra-passe</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Lock size={13} /></span>
              <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className={inputCls} placeholder="Mín. 8 caracteres" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <label className={labelCls}>Confirmar nova</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Lock size={13} /></span>
              <input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} className={inputCls} placeholder="Repita a nova" />
            </div>
          </div>
        </div>
        {pwdMsg && (
          <p className={`text-[10px] font-bold mt-3 flex items-center gap-1.5 ${pwdMsg.kind === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>
            {pwdMsg.kind === 'ok' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />} {pwdMsg.text}
          </p>
        )}
        <button
          type="button"
          onClick={handleChangePassword}
          className="mt-3.5 bg-[#0E2B64] hover:bg-[#081a3d] text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer border-none"
        >
          Guardar Nova Palavra-passe
        </button>
      </div>

      {/* Logótipo Institucional — responsável apenas */}
      {isResponsible && (
        <div className="bg-white border border-slate-200 rounded-[22px] p-5 md:p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-3.5">
            <Landmark size={15} className="text-[#2563eb]" />
            <span className="text-[10.5px] font-black uppercase tracking-widest text-slate-800">Logótipo Institucional</span>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div key={logoVersion} className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
              {reg.logoDataUrl
                ? <img src={reg.logoDataUrl} alt="Logótipo" className="w-full h-full object-cover" />
                : <Landmark size={26} className="text-slate-300" />}
            </div>
            <div className="flex-1 min-w-[220px]">
              <p className="text-[10px] text-slate-500 font-bold leading-snug mb-2.5">PNG, JPG ou SVG — máx. 2MB. O logótipo aparece na ficha da instituição vista pela Área de Administração.</p>
              <input
                ref={fileRef}
                type="file"
                accept=".png,.jpg,.jpeg,.svg,image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoFile(f); e.target.value = ''; }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="bg-white hover:bg-slate-50 text-[#2563eb] border-2 border-dashed border-[#2563eb]/40 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2"
              >
                <UploadCloud size={13} /> {reg.logoDataUrl ? 'Substituir Logótipo' : 'Carregar Logótipo'}
              </button>
              {logoMsg && (
                <p className={`text-[10px] font-bold mt-2 flex items-center gap-1.5 ${logoMsg.kind === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {logoMsg.kind === 'ok' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />} {logoMsg.text}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ForcedProps {
  code: string;
  memberId?: string;
  memberName?: string;
  onCompleted: () => void;
  onAudit?: (action: string, type?: 'info' | 'warning' | 'critical' | 'success') => void;
}

export function InstitutionForcedPasswordChange({ code, memberId, memberName, onCompleted, onAudit }: ForcedProps) {
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const handleSubmit = () => {
    setMsg(null);
    const reg = getLocalInstReg(code);
    const member = (reg?.members || []).find(m => m.id === memberId);
    if (!reg || !member) {
      setMsg({ kind: 'err', text: 'Dados do colaborador não encontrados. Contacte o responsável.' });
      return;
    }
    if (!currentPwd || currentPwd !== member.password) {
      setMsg({ kind: 'err', text: 'A palavra-passe inicial está incorrecta.' });
      return;
    }
    if (newPwd.length < 8) {
      setMsg({ kind: 'err', text: 'A nova palavra-passe deve ter pelo menos 8 caracteres.' });
      return;
    }
    if (newPwd === currentPwd) {
      setMsg({ kind: 'err', text: 'A nova palavra-passe deve ser diferente da palavra-passe inicial.' });
      return;
    }
    if (isInstPasswordTaken(code, newPwd, member.id)) {
      setMsg({ kind: 'err', text: 'Esta palavra-passe já está em uso por outra credencial desta instituição. Escolha outra.' });
      return;
    }
    if (newPwd !== confirmPwd) {
      setMsg({ kind: 'err', text: 'A confirmação não coincide.' });
      return;
    }
    updateInstMemberPassword(code, member.id, newPwd);
    onAudit?.(`1.º login do colaborador ${member.name} (${code}): palavra-passe inicial substituída.`, 'success');
    onCompleted();
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-[28px] p-7 md:p-8 shadow-xl text-center space-y-5">
        <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563eb] mx-auto">
          <ShieldCheck size={26} />
        </div>
        <div>
          <h2 className="text-base md:text-lg font-black text-[#0c2340] uppercase tracking-tight leading-tight">Defina a sua Palavra-passe Pessoal</h2>
          <p className="text-[10.5px] text-slate-500 font-medium leading-relaxed mt-2">
            Olá{memberName ? `, ${memberName}` : ''}. Por segurança, a palavra-passe inicial criada pelo responsável da instituição deve ser substituída no primeiro acesso. Após a confirmação, terá acesso à área da instituição.
          </p>
        </div>
        <div className="space-y-3 text-left">
          <div className="grid gap-1.5">
            <label className={labelCls}>Palavra-passe inicial</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Lock size={13} /></span>
              <input type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} className={inputCls} placeholder="A que recebeu do responsável" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <label className={labelCls}>Nova palavra-passe</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Lock size={13} /></span>
              <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className={inputCls} placeholder="Mín. 8 caracteres" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <label className={labelCls}>Confirmar nova</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Lock size={13} /></span>
              <input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} className={inputCls} placeholder="Repita a nova" />
            </div>
          </div>
          {msg && (
            <p className={`text-[10px] font-bold flex items-center gap-1.5 ${msg.kind === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>
              {msg.kind === 'ok' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />} {msg.text}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full bg-[#0E2B64] hover:bg-[#081a3d] text-white py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all cursor-pointer border-none"
        >
          Confirmar e Entrar
        </button>
      </div>
    </div>
  );
}
