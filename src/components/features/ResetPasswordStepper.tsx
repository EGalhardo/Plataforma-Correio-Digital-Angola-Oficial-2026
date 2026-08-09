/**
 * ResetPasswordStepper — Recuperação de senha REAL por e-mail (ITEM 3, 2026-08-09)
 * ----------------------------------------------------------------------------
 * ANTES (removido por ser teatro inseguro): OTP de simulação «123456» (qualquer
 * código de 6 dígitos passava — takeover local de qualquer B.I.) e a "nova
 * senha" gravada apenas no localStorage deste browser, sem tocar na nuvem.
 *
 * AGORA (real, tudo via Supabase Auth com anon key — sem SMTP extra):
 *   · O cidadão indica o E-MAIL da conta → o mailer do Supabase envia um link
 *     real (mensagem neutra anti-enumeração: nunca revelamos se o e-mail
 *     existe ou não).
 *   · Só tem B.I.? A conta usa um e-mail técnico interno que não recebe
 *     correio — o ecrã DIZ isso honestamente e aponta as duas vias reais
 *     (associar e-mail real no Perfil; reposição assistida pela Administração).
 *   · O link do e-mail abre a app em modo recuperação (PASSWORD_RECOVERY) —
 *     a App renderiza ESTE componente com recoveryMode, que arranca
 *     directamente no passo "nova senha" e grava com auth.updateUser.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  KeyRound,
  Lock,
  ShieldCheck,
  Mail,
  Check,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
  LifeBuoy,
  Send,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import {
  cloudResetPasswordEmail,
  cloudUpdatePasswordFromRecovery,
  isEmailPlausivel,
  isSupabaseConfigured,
} from '../../services/cloudAuthService';

interface ResetPasswordStepperProps {
  onCancel: () => void;
  onSuccess: () => void;
  addAuditLog: (action: string, type?: 'info' | 'warning' | 'critical' | 'success') => void;
  appMode?: 'user' | 'institution' | 'admin';
  /** true quando a App detectou PASSWORD_RECOVERY (link do e-mail) — arranca na nova senha */
  recoveryMode?: boolean;
}

// appMode faz parte da interface pública (a App passa-o sempre); o fluxo real
// por e-mail é idêntico para os três portais, por isso o valor não é lido
// aqui — o prefixo mantém o contrato sem lint-falso-positivo.
export function ResetPasswordStepper({ onCancel, onSuccess, addAuditLog, appMode: _appMode = 'user', recoveryMode = false }: ResetPasswordStepperProps) {
  type Step = 'identificar' | 'enviado' | 'nova_senha' | 'success';
  const [step, setStep] = useState<Step>(recoveryMode ? 'nova_senha' : 'identificar');

  // Step identificar
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState('');

  // Step nova senha
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdStrength, setPwdStrength] = useState<'Fraca' | 'Média' | 'Forte'>('Fraca');
  const [gravando, setGravando] = useState(false);
  const [erroNova, setErroNova] = useState('');

  useEffect(() => {
    if (!password) { setPwdStrength('Fraca'); return; }
    const hasNumbers = /\d/.test(password);
    const hasLetters = /[a-zA-Z]/.test(password);
    const isLong = password.length >= 8;
    setPwdStrength(hasNumbers && hasLetters && isLong ? 'Forte' : password.length >= 6 ? 'Média' : 'Fraca');
  }, [password]);

  const emailValido = isEmailPlausivel(email);
  const isStepNovaValid = password.length >= 8 && password === confirmPassword;

  const handleEnviarLink = async () => {
    if (!emailValido || enviando) return;
    setEnviando(true);
    setErroEnvio('');
    if (!isSupabaseConfigured()) {
      setErroEnvio('O serviço de autenticação não está configurado neste ambiente.');
      setEnviando(false);
      return;
    }
    const r = await cloudResetPasswordEmail(supabase, email, `${window.location.origin}/`);
    setEnviando(false);
    if (r.outcome === 'unavailable') {
      setErroEnvio('Não consegui contactar o serviço de autenticação. Verifique a sua ligação e tente novamente.');
      return;
    }
    // Mensagem NEUTRA anti-enumeração (mesmo em r.outcome === 'error'): nunca
    // revelamos se o e-mail existe na plataforma. Só a indisponibilidade real
    // de rede é reportada acima.
    addAuditLog('Recuperação de senha: pedido de envio de link por e-mail efectuado (resposta neutra, sem revelar existência da conta).', 'info');
    setStep('enviado');
  };

  const handleGravarNova = async () => {
    if (!isStepNovaValid || gravando) return;
    setGravando(true);
    setErroNova('');
    const r = await cloudUpdatePasswordFromRecovery(supabase, password);
    setGravando(false);
    if (r.outcome === 'ok') {
      addAuditLog('Recuperação de senha: nova palavra-passe gravada na nuvem via link de e-mail (PASSWORD_RECOVERY).', 'success');
      setStep('success');
      return;
    }
    if (r.outcome === 'no_session') {
      setErroNova('A ligação de recuperação expirou. Peça um novo e-mail de recuperação.');
      setStep('identificar');
      return;
    }
    if (r.outcome === 'weak') {
      setErroNova(r.message || 'A senha foi considerada fraca pelo servidor.');
      return;
    }
    setErroNova(r.outcome === 'unavailable'
      ? 'O serviço de autenticação está indisponível de momento. Tente novamente dentro de instantes.'
      : (r.message || 'Não consegui gravar a nova senha. Tente novamente.'));
  };

  return (
    <div className="w-full flex flex-col justify-between min-h-[440px] flex-1 font-sans">
      <div className="flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">

          {step === 'identificar' && (
            <motion.div
              key="reset-identificar"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.28 }}
              className="space-y-4"
            >
              <div className="text-center space-y-1.5">
                <div className="flex justify-center mb-1">
                  <div className="w-14 h-14 rounded-full bg-[#f0f4f9] flex items-center justify-center border border-slate-100 shadow-3xs">
                    <KeyRound className="text-[#0c2340]" size={22} />
                  </div>
                </div>
                <h2 className="text-[25px] font-black text-[#0c2340] tracking-tight uppercase leading-none">
                  Recuperar Senha
                </h2>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mt-0.5">
                  Receba um link de recuperação no seu e-mail
                </p>
              </div>

              <div className="max-w-lg mx-auto w-full space-y-1.5">
                <label className="text-[10.5px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1 mb-0.5">
                  <Mail size={12} className="text-[#2563eb]" /> E-MAIL DA CONTA
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-[#2563eb]/60 rounded-xl px-4 py-2.5 pl-10.5 text-[13px] text-slate-800 outline-none transition-all font-bold placeholder:text-slate-350"
                    placeholder="oseuemail@exemplo.com"
                    autoComplete="email"
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2563eb]">
                    <Mail size={14} />
                  </div>
                  {emailValido && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-[#2563eb] rounded-full p-0.5">
                      <Check size={10.5} className="font-extrabold" />
                    </div>
                  )}
                </div>
                {email && !emailValido && (
                  <span className="text-[10px] text-red-500 font-extrabold uppercase tracking-tight block mt-0.5 pl-2">
                    Escreva um e-mail válido
                  </span>
                )}
                {erroEnvio && (
                  <p className="text-[11px] text-red-600 font-bold leading-normal pl-1 pt-1 flex items-start gap-1">
                    <AlertTriangle size={12} className="shrink-0 mt-0.5" /> {erroEnvio}
                  </p>
                )}
                <p className="text-[10.5px] text-slate-500 font-semibold leading-normal pl-1 pt-1">
                  Por segurança, dizemos sempre o mesmo — quer o e-mail exista ou não na plataforma. Se existir, receberá o link dentro de instantes.
                </p>
              </div>

              <div className="max-w-lg mx-auto w-full bg-blue-50 border border-blue-100 rounded-xl p-3.5 flex items-start gap-2.5 text-left">
                <LifeBuoy size={15} className="text-blue-700 shrink-0 mt-0.5" />
                <p className="text-[10.5px] text-blue-900 font-semibold leading-relaxed m-0">
                  <strong>Registou-se só com o B.I.?</strong> Essas contas usam um e-mail técnico interno que <strong>não recebe correio</strong>. Para ter recuperação por e-mail, entre na sua conta e associe um e-mail real em <em>Perfil → Segurança</em>. Se já não consegue entrar, peça a <strong>reposição assistida</strong> à Área de Administração (suporte oficial) — nunca recriamos a conta por telefone.
                </p>
              </div>

              <div className="flex flex-col gap-2.5 max-w-lg mx-auto w-full pt-0">
                <button
                  type="button"
                  disabled={!emailValido || enviando}
                  onClick={handleEnviarLink}
                  className={`w-full text-white rounded-[15px] py-3 font-black text-[12px] uppercase tracking-widest shadow-lg transition-all border-none flex items-center justify-center gap-2 ${
                    emailValido && !enviando ? 'bg-[#0E2B64] hover:bg-[#081a3d] cursor-pointer' : 'bg-slate-300 cursor-not-allowed'
                  }`}
                >
                  {enviando ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
                  {enviando ? 'A enviar…' : 'Enviar link de recuperação'}
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full py-2.5 text-slate-500 font-black text-[11px] uppercase tracking-widest hover:text-slate-700 transition-colors bg-transparent border-none cursor-pointer"
                >
                  Voltar à Entrada
                </button>
              </div>
            </motion.div>
          )}

          {step === 'enviado' && (
            <motion.div
              key="reset-enviado"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4 max-w-lg mx-auto"
            >
              <div className="mx-auto w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-md border border-blue-100">
                <Mail size={26} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight leading-tight">
                  Verifique o seu e-mail
                </h3>
                <p className="text-slate-650 text-[12.5px] font-semibold leading-relaxed">
                  Se <strong>{email}</strong> estiver associado a uma conta da plataforma, receberá dentro de instantes um e-mail com um link para definir uma nova senha (válido por tempo limitado).
                </p>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Não chegou? Veja a pasta de Spam/Lixo eletrónico. Se a sua conta foi criada só com o B.I. (e-mail técnico interno), o correio nunca chegará — use a reposição assistida da Administração.
                </p>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-black text-[12px] uppercase tracking-widest transition-all cursor-pointer border-0 shadow-xl shadow-blue-500/15"
              >
                Voltar ao Login
              </button>
            </motion.div>
          )}

          {step === 'nova_senha' && (
            <motion.div
              key="reset-nova"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.28 }}
              className="space-y-3.5"
            >
              <div className="text-center space-y-1">
                <h2 className="text-[#0f172a] text-lg md:text-xl font-black tracking-tight uppercase leading-none">
                  Definir Nova Senha
                </h2>
                <p className="text-[10.5px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                  Chegou pelo link do e-mail — a senha fica gravada na plataforma
                </p>
              </div>

              <div className="space-y-3 max-w-md mx-auto w-full">
                <div className="grid gap-1 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] text-slate-505 font-extrabold tracking-wider uppercase">
                      Nova Senha
                    </span>
                    {password && (
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                        pwdStrength === 'Fraca' ? 'bg-red-50 text-red-600' :
                        pwdStrength === 'Média' ? 'bg-amber-50 text-amber-600' :
                        'bg-emerald-50 text-emerald-600'
                      }`}>
                        {pwdStrength}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 bg-white border border-slate-200 focus-within:border-[#0c2340] focus-within:ring-1 focus-within:ring-[#0c2340] rounded-[15px] px-4 py-1.5 transition-all relative">
                    <div className="w-10 h-10 bg-[#f0f4f9] text-[#1e3a8a] rounded-lg flex items-center justify-center shrink-0">
                      <Lock size={18} className="text-[#2563eb]" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent font-bold tracking-wider text-slate-800 border-none outline-none text-[13px] placeholder-slate-400 pr-10"
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 bg-transparent border-none cursor-pointer flex items-center justify-center transition-all"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {password && password.length < 8 && (
                    <span className="text-[10px] text-red-500 font-extrabold uppercase tracking-tight block mt-0.5 pl-2">
                      Utilize no mínimo 8 caracteres
                    </span>
                  )}
                </div>

                <div className="grid gap-1 text-left">
                  <span className="text-[10.5px] text-slate-505 font-extrabold tracking-wider uppercase">
                    Confirmar Nova Senha
                  </span>
                  <div className="flex items-center gap-3 bg-white border border-slate-200 focus-within:border-[#0c2340] focus-within:ring-1 focus-within:ring-[#0c2340] rounded-[15px] px-4 py-1.5 transition-all relative">
                    <div className="w-10 h-10 bg-[#f0f4f9] text-[#1e3a8a] rounded-lg flex items-center justify-center shrink-0">
                      <Lock size={18} className="text-[#2563eb]" />
                    </div>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-transparent font-bold tracking-wider text-slate-800 border-none outline-none text-[13px] placeholder-slate-400 pr-10"
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 bg-transparent border-none cursor-pointer flex items-center justify-center transition-all"
                    >
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <span className="text-[10px] text-red-500 font-extrabold uppercase tracking-tight block mt-0.5 pl-2">
                      As senhas não coincidem
                    </span>
                  )}
                </div>

                <div className="bg-[#f0f4f9] rounded-xl p-3 flex items-center gap-3 shadow-2xs border border-slate-100">
                  <ShieldCheck size={18} className="text-[#2563eb] shrink-0" />
                  <span className="text-slate-700 text-[10.5px] font-bold leading-normal font-sans">
                    A senha deve ter pelo menos 8 caracteres, incluindo letras e números. As outras sessões serão encerradas.
                  </span>
                </div>

                {erroNova && (
                  <p className="text-[11px] text-red-600 font-bold leading-normal flex items-start gap-1">
                    <AlertTriangle size={12} className="shrink-0 mt-0.5" /> {erroNova}
                  </p>
                )}
              </div>

              <div className="max-w-md mx-auto w-full pt-1">
                <button
                  type="button"
                  disabled={!isStepNovaValid || gravando}
                  onClick={handleGravarNova}
                  className={`w-full py-2.5 border-none text-white font-black text-[11.5px] uppercase tracking-widest rounded-2xl flex items-center justify-center gap-1.5 transition-all shadow-md ${
                    isStepNovaValid && !gravando
                      ? 'bg-[#0E2B64] hover:bg-[#081a3d] cursor-pointer'
                      : 'bg-slate-200 cursor-not-allowed text-slate-400 shadow-none'
                  }`}
                >
                  {gravando ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {gravando ? 'A gravar na nuvem…' : 'Gravar nova senha'}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="reset-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4 max-w-lg mx-auto"
            >
              <div className="mx-auto w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center shadow-md border border-emerald-100 animate-scaleUp">
                <ShieldCheck size={28} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight leading-tight">
                  Nova senha gravada!
                </h3>
                <p className="text-slate-650 text-[12.5px] font-semibold leading-relaxed">
                  A sua nova palavra-passe foi gravada na plataforma e passa a valer em todos os dispositivos. Entre agora com o seu e-mail (ou B.I., se a conta ainda o tiver) e a nova senha.
                </p>
              </div>
              <button
                type="button"
                onClick={onSuccess}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-black text-[12px] uppercase tracking-widest transition-all cursor-pointer border-0 shadow-xl shadow-blue-500/15"
              >
                Entrar com a nova senha
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <style>{`
        @keyframes scaleUp {
          from { transform: scale(0.94); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scaleUp {
          animation: scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
