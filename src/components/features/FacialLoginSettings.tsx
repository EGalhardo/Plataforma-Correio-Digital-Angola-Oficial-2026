// ============================================================================
// Login Facial — Página Conta/Perfil (F6/B6)
// ----------------------------------------------------------------------------
// Secção de REGISTO facial, disponível nas três áreas depois de autenticado:
//   Meu Perfil (Cidadão) · Perfil Institucional · Perfil Administrativo.
// O registo muda de sítio: antes fazia-se no ecrã de login; agora faz-se aqui
// (B6). O login facial na página de entrada passa a ser apenas verificação.
// 100% demo-local: o template fica guardado apenas neste dispositivo e por
// PESSOA (BI / Nº Agente Institucional / Nº Agente Admin).
// ============================================================================

import { useRef, useState } from 'react';
import { ScanFace, ShieldCheck, Trash2, Camera, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import {
  buildFaceStorageKey, readFaceTemplate, computeFaceSignature,
  makeSimulatedSignature, type FaceTemplate
} from '../../services/faceAuth';

interface FacialLoginSettingsProps {
  /** 'user' | 'institution' | 'admin' — tal como o appMode da sessão. */
  mode: string;
  /** Identificador DA PESSOA: BI do cidadão · Nº Agente Institucional · Nº Agente Admin. */
  personId: string;
  displayName?: string;
  onAudit?: (action: string, type?: 'info' | 'warning' | 'critical' | 'success') => void;
}

const STEPS = ['FRONTAL', 'ESQUERDA', 'SORRISO'] as const;

export function FacialLoginSettings({ mode, personId, displayName, onAudit }: FacialLoginSettingsProps) {
  const storageKey = buildFaceStorageKey(mode, personId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [template, setTemplate] = useState<FaceTemplate | null>(() => readFaceTemplate(storageKey));
  const [capturing, setCapturing] = useState(false);
  const [step, setStep] = useState(0);
  const [cameraError, setCameraError] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const capturesRef = useRef<number[][]>([]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const startEnrollment = async () => {
    capturesRef.current = [];
    setStep(0);
    setSimulated(false);
    setCameraError(false);
    setCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch {
      // Sem câmara: via simulada (mesmo espírito do login demo) — o utilizador
      // confirma cada captura e o sistema gera uma assinatura sintética.
      setCameraError(true);
    }
  };

  const cancelEnrollment = () => {
    stopCamera();
    setCapturing(false);
    setStep(0);
    capturesRef.current = [];
  };

  const doCapture = () => {
    let signature: number[] = [];
    let imageDataUrl: string | undefined;
    if (!cameraError && videoRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        signature = computeFaceSignature(canvas);
        imageDataUrl = canvas.toDataURL('image/jpeg', 0.7);
      }
    }
    if (!signature.length) {
      // Fallback simulado: semente mista (pessoa + passo) para assinatura sintética estável
      signature = makeSimulatedSignature(personId.length * 97 + step * 131 + 17);
      setSimulated(true);
    }

    const next = [...capturesRef.current, signature];
    capturesRef.current = next;

    if (next.length < 3) {
      setStep(next.length);
      return;
    }

    // 3.ª captura: compila o template (média das 3 assinaturas)
    const avg: number[] = [];
    const len = next[0].length;
    for (let i = 0; i < len; i += 1) {
      avg.push(Math.round((next[0][i] + next[1][i] + next[2][i]) / 3));
    }
    const payload: FaceTemplate = {
      identifier: personId.toUpperCase().replace(/\s+/g, ''),
      profileMode: mode,
      displayName: displayName || undefined,
      capturedAt: new Date().toLocaleString('pt-AO'),
      imageDataUrl,
      signature: avg,
      signatures: next,
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
      setTemplate(payload);
      onAudit?.(`LOGIN FACIAL: rosto registado na página Conta (${mode} · ${payload.identifier}).`, 'success');
    } catch (e) {
      console.warn('[FacialLoginSettings] Falha ao gravar template local:', e);
      onAudit?.('LOGIN FACIAL: falha ao gravar o registo facial neste dispositivo.', 'warning');
    }
    cancelEnrollment();
  };

  const removeTemplate = () => {
    try { localStorage.removeItem(storageKey); } catch { /* ignora */ }
    setTemplate(null);
    onAudit?.(`LOGIN FACIAL: registo facial removido (${mode} · ${personId.toUpperCase().replace(/\s+/g, '')}).`, 'warning');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-[22px] p-5 md:p-6 shadow-xs">
      <div className="flex items-center gap-2 mb-3.5">
        <ScanFace size={15} className="text-[#2563eb]" />
        <span className="text-[10.5px] font-black uppercase tracking-widest text-slate-800">Login Facial</span>
      </div>

      {/* Estado do registo */}
      <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-[10.5px] font-bold ${
        template
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : 'bg-slate-50 border-slate-200 text-slate-500'
      }`}>
        {template ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
        {template
          ? <span>Face registada neste dispositivo em <strong className="font-black">{template.capturedAt}</strong> — pode entrar com o rosto na página de login.</span>
          : <span>Sem registo facial neste dispositivo. Registe a sua face para poder entrar com o rosto na página de login.</span>}
      </div>

      {/* Fluxo de captura */}
      {capturing ? (
        <div className="mt-4 space-y-3">
          <div className="relative w-full max-w-[280px] aspect-[4/3] mx-auto rounded-2xl overflow-hidden bg-slate-950 border-2 border-[#2563eb]/30">
            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 gap-2">
                <ScanFace size={26} className="text-sky-400 animate-pulse" />
                <span className="text-[9.5px] font-black uppercase tracking-widest text-sky-300">Modo simulado (sem câmara)</span>
                <span className="text-[8.5px] text-slate-400 font-bold leading-snug">Não foi possível aceder à câmara. A assinatura será gerada em modo de demonstração.</span>
              </div>
            ) : (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <p className="text-center text-[10px] font-black uppercase tracking-widest text-[#2563eb]">
            Captura {step + 1} de 3 — {STEPS[step]}
          </p>
          <div className="flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={cancelEnrollment}
              className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-4 py-2.5 rounded-xl font-black text-[9.5px] uppercase tracking-widest transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={doCapture}
              className="bg-[#0E2B64] hover:bg-[#081a3d] text-white px-6 py-2.5 rounded-xl font-black text-[9.5px] uppercase tracking-widest transition-all cursor-pointer border-none flex items-center gap-2"
            >
              <Camera size={13} /> Capturar {step + 1}/3
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={startEnrollment}
            className="bg-[#0E2B64] hover:bg-[#081a3d] text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer border-none flex items-center gap-2"
          >
            <Camera size={13} /> {template ? 'Atualizar a minha face' : 'Registar a minha face'}
          </button>
          {template && (
            <button
              type="button"
              onClick={removeTemplate}
              className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2"
            >
              <Trash2 size={13} /> Remover registo facial
            </button>
          )}
          {simulated === false && cameraError && null}
          <Loader2 size={0} className="hidden" />
        </div>
      )}

      {/* Aviso demo obrigatório (B6) */}
      <p className="mt-3 text-[9px] text-slate-400 font-bold leading-snug flex items-start gap-1.5">
        <CheckCircle2 size={11} className="shrink-0 mt-0.5 text-slate-300" />
        Modo demonstração: a face fica guardada apenas neste dispositivo e por pessoa
        (<strong className="font-black">{personId.toUpperCase().replace(/\s+/g, '')}</strong>).
        Não é biometria certificada. O registo faz-se aqui, na página Conta; na página
        de entrada o "Login Facial" serve apenas para verificar e entrar.
      </p>
    </div>
  );
}
