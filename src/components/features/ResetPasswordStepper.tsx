import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  KeyRound,
  Lock,
  Shield,
  ShieldCheck,
  FileText,
  Check,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Lightbulb,
  ChevronRight
} from 'lucide-react';

interface ResetPasswordStepperProps {
  onCancel: () => void;
  onSuccess: () => void;
  addAuditLog: (action: string, type?: 'info' | 'warning' | 'critical' | 'success') => void;
  appMode?: 'user' | 'institution' | 'admin';
}

export function ResetPasswordStepper({ onCancel, onSuccess, addAuditLog, appMode = 'user' }: ResetPasswordStepperProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 'success'>(1);

  // Step 1: Identificacao
  const [biNumber, setBiNumber] = useState('');

  // Step 2: Codigo OTP de seguranca (mesmo padrao do login two-factor)
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');

  // Step 3: Nova senha
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdStrength, setPwdStrength] = useState<'Fraca' | 'Média' | 'Forte'>('Fraca');

  // Forca da senha em tempo real (mesma logica do Registo)
  useEffect(() => {
    if (!password) {
      setPwdStrength('Fraca');
      return;
    }
    const hasNumbers = /\d/.test(password);
    const hasLetters = /[a-zA-Z]/.test(password);
    const isLong = password.length >= 8;

    if (hasNumbers && hasLetters && isLong) {
      setPwdStrength('Forte');
    } else if (password.length >= 6) {
      setPwdStrength('Média');
    } else {
      setPwdStrength('Fraca');
    }
  }, [password]);

  // Validadores (identicos ao Registo)
  const isNifValid = (nif: string) => {
    const cleanNif = nif.trim().toUpperCase();
    return cleanNif.length >= 9 && cleanNif.length <= 14;
  };
  const isBiValid = (bi: string) => {
    const cleanBi = bi.trim().toUpperCase();
    if (cleanBi.length !== 14) return false;
    return /[A-Z]/.test(cleanBi);
  };
  const isDocValid = appMode === 'institution' ? isNifValid(biNumber) : isBiValid(biNumber);
  const isStep3Valid = password.length >= 8 && password === confirmPassword;

  const handleBiChange = (val: string) => {
    const formatted = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14);
    setBiNumber(formatted);
  };

  const handleSendCode = () => {
    if (!isDocValid) return;
    addAuditLog(`Recuperação de credenciais: código de segurança emitido para o documento ${biNumber}`, 'info');
    setStep(2);
  };

  const handleValidateOtp = () => {
    // Mesmo criterio de simulacao do login two-factor: codigo 123456 ou qualquer OTP de 6 digitos
    if (enteredOtp === '123456' || enteredOtp.length === 6) {
      setOtpError('');
      addAuditLog('Recuperação de credenciais: código de segurança validado', 'success');
      setStep(3);
    } else {
      setOtpError('Código de verificação OTP incorrecto. Utilize o código de simulação 123456.');
    }
  };

  const handleRedefine = () => {
    if (!isStep3Valid) return;
    try {
      // Mesma chave canonica escrita pelo Registo: citizen_pass_[BI]
      localStorage.setItem(`citizen_pass_${biNumber.toUpperCase()}`, password);
      addAuditLog(`Redefinição de senha concluída para o documento ${biNumber}`, 'success');
      setStep('success');
    } catch (e) {
      console.error('Erro ao redefinir senha', e);
    }
  };

  return (
    <div className="w-full flex flex-col justify-between min-h-[440px] flex-1 font-sans">
      {/* Stepper Indicator (visivel nos passos 2 e 3, tal como no Registo) */}
      {step !== 1 && step !== 'success' && (
        <div className="relative flex items-center justify-between w-full max-w-lg mx-auto mb-4 select-none px-4">
          <div className="absolute top-[14px] left-10 right-10 h-[2.5px] bg-slate-100 pointer-events-none -translate-y-1/2 -z-0">
            <div
              className="h-full bg-[#2563eb] transition-all duration-300 rounded-full"
              style={{
                width: step === 2 ? '50%' : '100%'
              }}
            />
          </div>

          {/* Step 1 */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10.5px] font-black transition-all border-[#2563eb] text-white bg-[#2563eb]">
              <Check size={13} className="stroke-[3]" />
            </div>
            <span className="text-[10px] font-black tracking-widest uppercase mt-1 text-slate-400">
              IDENTIDADE
            </span>
          </div>

          {/* Step 2 */}
          <div className="relative z-10 flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10.5px] font-black transition-all ${
              step === 2
                ? 'border-[#2563eb] text-[#2563eb] bg-white ring-4 ring-blue-50/75'
                : 'border-[#2563eb] text-white bg-[#2563eb]'
            }`}>
              {step === 3 ? <Check size={13} className="stroke-[3]" /> : "02"}
            </div>
            <span className={`text-[10px] font-black tracking-widest uppercase mt-1 ${
              step === 2 ? 'text-[#2563eb]' : 'text-slate-400'
            }`}>
              CÓDIGO
            </span>
          </div>

          {/* Step 3 */}
          <div className="relative z-10 flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10.5px] font-black transition-all ${
              step === 3
                ? 'border-[#2563eb] text-[#2563eb] bg-white ring-4 ring-blue-50/75'
                : 'border-slate-200 text-slate-400 bg-white'
            }`}>
              03
            </div>
            <span className={`text-[10px] font-black tracking-widest uppercase mt-1 ${
              step === 3 ? 'text-[#0f172a]' : 'text-slate-400'
            }`}>
              NOVA SENHA
            </span>
          </div>
        </div>
      )}

      {/* Conteudo das etapas */}
      <div className="flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="reset-step-1"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.28 }}
              className="space-y-4"
            >
              {/* Cabecalho */}
              <div className="text-center space-y-1.5">
                <div className="flex justify-center mb-1">
                  <div className="w-14 h-14 rounded-full bg-[#f0f4f9] flex items-center justify-center border border-slate-100 shadow-3xs">
                    <KeyRound className="text-[#0c2340]" size={22} />
                  </div>
                </div>
                <h2 className="text-[25px] font-black text-[#0c2340] tracking-tight uppercase leading-none">
                  Redefinir Senha
                </h2>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mt-0.5">
                  Recuperação segura da sua conta de cidadão digital
                </p>
              </div>

              {/* Campo B.I. / NIF */}
              <div className="max-w-lg mx-auto w-full space-y-1.5">
                <label className="text-[10.5px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1 mb-0.5">
                  <FileText size={12} className="text-[#2563eb]" /> {appMode === 'institution' ? 'NÚMERO DE IDENTIFICAÇÃO FISCAL (NIF)' : 'Nº DO BILHETE DE IDENTIDADE (Nº B.I.)'}
                </label>
                <div className="relative font-mono">
                  <input
                    type="text"
                    value={biNumber}
                    onChange={(e) => handleBiChange(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-[#2563eb]/60 rounded-xl px-4 py-2 pl-10.5 text-[13px] text-slate-800 outline-none transition-all font-bold tracking-widest placeholder:text-slate-350"
                    placeholder={appMode === 'institution' ? '540132918' : '009874562LA041'}
                    maxLength={14}
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2563eb]">
                    <FileText size={14} />
                  </div>
                  {isDocValid && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-[#2563eb] rounded-full p-0.5">
                      <Check size={10.5} className="font-extrabold" />
                    </div>
                  )}
                </div>
                {biNumber && !isDocValid && (
                  <span className="text-[10px] text-red-500 font-extrabold uppercase tracking-tight block mt-0.5 pl-2">
                    {appMode === 'institution' ? 'O NIF deve possuir entre 9 e 14 caracteres' : 'O B.I. deve possuir exatamente 14 caracteres'}
                  </span>
                )}
                <p className="text-[10.5px] text-slate-500 font-semibold leading-normal pl-1 pt-1">
                  Enviaremos um código de segurança de 6 dígitos para validar a titularidade da conta.
                </p>
              </div>

              {/* Acoes */}
              <div className="flex flex-col gap-2.5 max-w-lg mx-auto w-full pt-0">
                <button
                  type="button"
                  disabled={!isDocValid}
                  onClick={handleSendCode}
                  className={`w-full text-white rounded-[15px] py-3 font-black text-[12px] uppercase tracking-widest shadow-lg transition-all border-none flex items-center justify-center gap-2 ${
                    isDocValid
                      ? 'bg-[#0c2340] hover:bg-slate-900 shadow-[#0c2340]/15 cursor-pointer hover:opacity-95'
                      : 'bg-slate-200 cursor-not-allowed text-slate-400 shadow-none'
                  }`}
                >
                  ENVIAR CÓDIGO DE SEGURANÇA <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full bg-[#f8fafc] hover:bg-slate-100 text-[#2563eb] border border-slate-200 rounded-[15px] py-3 font-black text-[12px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer shadow-3xs"
                >
                  VOLTAR AO LOGIN
                </button>
              </div>

              {/* Selo de protecao */}
              <div className="flex items-center justify-center gap-2 text-slate-500 text-[11px] font-bold mt-0">
                <Shield size={14} className="text-[#2563eb]" />
                <span>Operação protegida por verificação de identidade civil.</span>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="reset-step-2"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.28 }}
              className="space-y-3.5"
            >
              {/* Cabecalho */}
              <div className="text-center space-y-1">
                <h2 className="text-[#0f172a] text-lg md:text-xl font-black tracking-tight uppercase leading-none">
                  Verificação de Segurança
                </h2>
                <p className="text-[10.5px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                  Insira o código de 6 dígitos enviado para os seus canais
                </p>
              </div>

              {/* Cartao OTP com 6 slots (mesmo padrao do login two-factor) */}
              <div className="relative py-3 max-w-md mx-auto w-full bg-[#fafbfc]/50 border border-slate-100 rounded-2xl p-3.5 shadow-3xs">
                <input
                  type="tel"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={enteredOtp}
                  onChange={(e) => { setEnteredOtp(e.target.value.replace(/\D/g, '')); setOtpError(''); }}
                  className="absolute inset-0 opacity-0 cursor-text w-full h-full z-20"
                  autoFocus
                />
                <div className="grid grid-cols-6 gap-2">
                  {[0, 1, 2, 3, 4, 5].map((idx) => {
                    const val = enteredOtp[idx] || '';
                    const isFocused = enteredOtp.length === idx;
                    return (
                      <div
                        key={idx}
                        className={`h-12 rounded-xl bg-white border flex items-center justify-center font-mono font-black text-lg transition-all ${
                          isFocused
                            ? 'border-blue-500 ring-2 ring-blue-100 scale-102 shadow-xs'
                            : 'border-slate-200 text-slate-800'
                        }`}
                      >
                        {val ? val : <span className="text-slate-300 font-normal leading-none">-</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {otpError && (
                <p className="text-[10px] text-red-500 font-extrabold uppercase tracking-tight text-center max-w-md mx-auto">
                  {otpError}
                </p>
              )}

              {/* Badge de simulacao (mesmo padrao do two-factor) */}
              <div className="bg-blue-50/50 border border-blue-100/70 rounded-2xl p-3 flex items-center gap-2.5 text-left max-w-md mx-auto w-full">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                  <Lightbulb className="text-white fill-[#fcd34d]" size={15} />
                </div>
                <div className="text-[10.5px]">
                  <h5 className="font-extrabold text-[#0c2340] leading-none mb-1">Dica de Simulação:</h5>
                  <p className="text-slate-500 font-semibold leading-normal">
                    O código de teste recebido por canais é <strong className="text-blue-700 font-mono font-extrabold text-[12px] select-all">123456</strong>
                  </p>
                </div>
              </div>

              {/* Acoes */}
              <div className="pt-1 grid grid-cols-2 gap-3 max-w-md mx-auto w-full">
                <button
                  type="button"
                  onClick={onCancel}
                  className="py-2.5 bg-white border border-slate-200 text-slate-600 font-black text-[11.5px] uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all cursor-pointer shadow-3xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleValidateOtp}
                  className="py-2.5 bg-[#0E2B64] hover:bg-[#081a3d] border-none text-white font-black text-[11.5px] uppercase tracking-widest rounded-2xl flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md"
                >
                  Validar Código
                  <ChevronRight size={14} className="stroke-[2.5]" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="reset-step-3"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.28 }}
              className="space-y-3.5"
            >
              {/* Cabecalho */}
              <div className="text-center space-y-1">
                <h2 className="text-[#0f172a] text-lg md:text-xl font-black tracking-tight uppercase leading-none">
                  Definir Nova Senha
                </h2>
                <p className="text-[10.5px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                  Crie uma senha forte para proteger a sua identidade digital
                </p>
              </div>

              {/* Campos de senha */}
              <div className="space-y-3 max-w-md mx-auto w-full">
                {/* Nova Senha */}
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

                {/* Confirmar Nova Senha */}
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

                {/* Banner de requisitos */}
                <div className="bg-[#f0f4f9] rounded-xl p-3 flex items-center gap-3 shadow-2xs border border-slate-100">
                  <ShieldCheck size={18} className="text-[#2563eb] shrink-0" />
                  <span className="text-slate-700 text-[10.5px] font-bold leading-normal font-sans">
                    A senha deve ter pelo menos 8 caracteres, incluindo letras e números.
                  </span>
                </div>
              </div>

              {/* Acoes */}
              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto w-full pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="py-2.5 bg-white border border-slate-200 text-slate-600 font-black text-[11.5px] uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all cursor-pointer shadow-3xs flex items-center justify-center gap-1"
                >
                  <ArrowLeft size={14} /> Voltar
                </button>
                <button
                  type="button"
                  disabled={!isStep3Valid}
                  onClick={handleRedefine}
                  className={`py-2.5 border-none text-white font-black text-[11.5px] uppercase tracking-widest rounded-2xl flex items-center justify-center gap-1 transition-all shadow-md ${
                    isStep3Valid
                      ? 'bg-[#0E2B64] hover:bg-[#081a3d] cursor-pointer'
                      : 'bg-slate-200 cursor-not-allowed text-slate-400 shadow-none'
                  }`}
                >
                  Redefinir Senha
                  <Check size={14} />
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
                <h3 className="text-xl md:text-2xl font-black text-slate-900 italic uppercase tracking-tight leading-tight">
                  Senha Redefinida com Sucesso!
                </h3>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-slate-650 text-left space-y-2 shadow-inner">
                  <p className="text-slate-750 text-[12.5px] font-semibold leading-relaxed">
                    A sua nova credencial de acesso foi registada e associada de forma única à sua identidade civil nacional.
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    A partir deste momento, utilize a nova senha para entrar no portal do Correio Digital de Angola. Todas as sessões anteriores continuam protegidas pela verificação de identidade.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100/60 rounded-xl p-3 text-left flex gap-2.5 items-center">
                <span className="text-[11px] font-black text-blue-800 select-none font-sans font-extrabold uppercase">
                  {appMode === 'institution' ? 'NIF da Instituição:' : 'B.I. de Acesso:'}
                </span>
                <span className="text-[12.5px] font-mono font-black text-slate-750 uppercase tracking-widest bg-white border border-blue-100 px-3 py-1 rounded-lg">
                  {biNumber}
                </span>
              </div>

              <button
                type="button"
                onClick={onSuccess}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-black text-[12px] uppercase tracking-widest transition-all cursor-pointer border-0 shadow-xl shadow-blue-500/15 flex items-center justify-center gap-2"
              >
                Voltar ao Login e Acesso Seguro
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Animacao de entrada */}
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
