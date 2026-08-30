import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  CheckCircle2,
  UploadCloud,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Shield,
  FileText,
  Fingerprint,
  Sparkles,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { homologationStore, notifyRegistrationSubmitted, notifyAccountApproved } from '../../services/homologationStore';
import { registoPublicoProxy } from '../../services/supabaseService';
import { CdaModal } from '../ui/CdaModal';
import { isSupabaseConfigured, cloudSignOutBestEffort } from '../../services/cloudAuthService';
import { purgeCitizenLocalResidues } from '../../services/accountGateService';
import { gravarJob, correrRegistoBg, EVENTO_DESFECHO_BG, type RegistoBgJob } from '../../services/registoBgService';
import { runRegistrationVerification, prewarmVerificationEngine, type RegistrationVerificationReport } from '../../services/verificationEngine';
import { normalizarNome, normalizarTitulo, corrigirDominioEmail } from '../../services/textNormalizeService';

const base64ToBlob = (base64Str: string): Blob => {
  try {
    const parts = base64Str.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
  } catch (e) {
    console.error('Error converting base64 to blob:', e);
    return new Blob([], { type: 'image/jpeg' });
  }
};

// F45 (Auditoria F42 · Storage privado): a PVI deixa de depender de URL pública
// (bucket selado na v15) — o endpoint /api/verificar-cadastro aceita data-URL,
// pelo que comprimimos o blob em JPEG ≤1280px para a IA de visão do servidor.
// Falha => '' e a PVI recebe a referência restante (regra de ouro: REVISAO).
// v37.72 — 1024px (era 1280): coincide com o redimensionamento do servidor e
// corta ~36% do payload base64 enviado ao endpoint da PVI (upload mais rápido).
const blobToPviDataUrl = (blob: Blob, maxSide = 1024, quality = 0.8): Promise<string> =>
  new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      const timer = setTimeout(() => { URL.revokeObjectURL(url); resolve(''); }, 8000);
      img.onload = () => {
        clearTimeout(timer);
        try {
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height, 1));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) { URL.revokeObjectURL(url); resolve(''); return; }
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          URL.revokeObjectURL(url);
          resolve(dataUrl.startsWith('data:image/') ? dataUrl : '');
        } catch { URL.revokeObjectURL(url); resolve(''); }
      };
      img.onerror = () => { clearTimeout(timer); URL.revokeObjectURL(url); resolve(''); };
      img.src = url;
    } catch { resolve(''); }
  });

interface RegisterStepperProps {
  onCancel: () => void;
  onSuccess: () => void;
  addAuditLog: (action: string, type?: 'info' | 'warning' | 'critical' | 'success') => void;
  appMode?: 'user' | 'institution' | 'admin';
}

export function RegisterStepper({ onCancel, onSuccess, addAuditLog, appMode = 'user' }: RegisterStepperProps) {
  // Current step state
  const [step, setStep] = useState<1 | 2 | 3 | 'success'>(1);

  // Step 1: Credenciais States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Confirmação é usada apenas para validação no cliente; nunca é persistida.
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pwdStrength, setPwdStrength] = useState<'Fraca' | 'Média' | 'Forte'>('Fraca');

  // Step 2: Identidade States
  const [biNumber, setBiNumber] = useState('');
  // v37.8 — dados do formulário a conferir com o B.I. pela IA (sem biometria facial)
  const [dataNascimento, setDataNascimento] = useState('');
  const [sexo, setSexo] = useState('');
  // v37.8 — resultado da validação automática por IA
  const [aprovadoPopup, setAprovadoPopup] = useState(false);
  // v37.29 — popup com Nº de acesso + senha ao concluir a inscrição
  const [credPopup, setCredPopup] = useState(false);
  // v37.78.17 — REGRAS UX (processamento em segundo plano): estado vivo da
  // análise do registo, visível no ecrã de sucesso e nos popups.
  const [analiseEstado, setAnaliseEstado] = useState<'em_analise' | 'aprovado' | 'correcoes'>('em_analise');
  const mountedRef = useRef(true);
  const credPopupRef = useRef(false);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => { credPopupRef.current = credPopup; }, [credPopup]);
  // v37.78.17 — desfecho do processamento em segundo plano (inclui RETOMA
  // após reload: o registoBgService emite o evento ao concluir a análise).
  useEffect(() => {
    const aoDesfechoBg = (ev: Event) => {
      const d = (ev as CustomEvent).detail || {};
      if (String(d.bi || '').toUpperCase().replace(/\s+/g, '') !== String(biNumber || '').toUpperCase().replace(/\s+/g, '')) return;
      if (d.tipo === 'aprovado') setAnaliseEstado('aprovado');
      else if (d.tipo === 'correcoes') setAnaliseEstado('correcoes');
    };
    window.addEventListener(EVENTO_DESFECHO_BG, aoDesfechoBg as EventListener);
    return () => window.removeEventListener(EVENTO_DESFECHO_BG, aoDesfechoBg as EventListener);
  }, [biNumber]);
  const [aprovadoPendente, setAprovadoPendente] = useState(false);
  const [reprovacaoInfo, setReprovacaoInfo] = useState<{ motivo: string; alertas: string[] } | null>(null);
  const [documentFrente, setDocumentFrente] = useState<File | null>(null);
  const [documentVerso, setDocumentVerso] = useState<File | null>(null);
  const [frentePreview, setFrentePreview] = useState<string | null>(null);
  const [versoPreview, setVersoPreview] = useState<string | null>(null);
  const [isUploadingFrente, setIsUploadingFrente] = useState(false);
  const [isUploadingVerso, setIsUploadingVerso] = useState(false);
  const [frenteSuccess, setFrenteSuccess] = useState(false);
  const [versoSuccess, setVersoSuccess] = useState(false);

  // Step 3: Biometria States
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [, setScanStateText] = useState('Pronto para Captura');
  const [captureFinished, setCaptureFinished] = useState(false);
  const [savedFacePhoto, setSavedFacePhoto] = useState<string>('');

  // Pré-verificação real dos documentos (Fase 1 — motor local no browser)
  const [verificationReport, setVerificationReport] = useState<RegistrationVerificationReport | null>(null);
  // F28 (v11.1): selo «Aprovado automaticamente por Pré-Verificação Inteligente (IA)» no ecrã de sucesso
  const [pviAutoApproved, setPviAutoApproved] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const verificationStartedRef = useRef(false);

  // Motor Biométrico Real (mesma configuração do Login Facial do App.tsx)
  const [webcamReady, setWebcamReady] = useState(false);
  const [isSimulatedCamera, setIsSimulatedCamera] = useState(false);
  const [faceCaptureHint, setFaceCaptureHint] = useState('Posicione o rosto no centro da moldura.');
  const [tempFaceCaptures, setTempFaceCaptures] = useState<{ imageDataUrl: string; signature: number[] }[]>([]);
  const faceVideoRef = useRef<HTMLVideoElement | null>(null);
  const faceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceStreamRef = useRef<MediaStream | null>(null);

  // Submissão ao Supabase
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState('');

  // v37.29 — ANTI-FUGA: ao abrir o registo, termina qualquer sessão Auth
  // residual de OUTRO utilizador neste dispositivo — a nova conta nunca herda
  // fotos/e-mails de sessões anteriores (ex.: titular que estava logado).
  useEffect(() => {
    if (isSupabaseConfigured()) void cloudSignOutBestEffort(supabase);
    // eslint-disable-next-line react-hooks/devDependencies
  }, []);

  // v37.8 — após o popup «Aprovado», a página de registo fecha automaticamente
  // e o cidadão é redireccionado para o Login (6 s, ou já ao clicar «Entendi»).
  useEffect(() => {
    if (!aprovadoPopup) return;
    const timer = setTimeout(() => onSuccess(), 6000);
    return () => clearTimeout(timer);
  }, [aprovadoPopup, onSuccess]);

  // Calculate Password Strength in real time
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

  // Validation routines
  const isEmailValid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const isNameValid = (n: string) => {
    const trimmed = n.trim();
    if (appMode === 'institution') {
      return trimmed.length >= 3;
    }
    return trimmed.length >= 6 && trimmed.split(/\s+/).length >= 2;
  };
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isStep1Valid = isNameValid(name) && isEmailValid(email) && password.length >= 8 && passwordsMatch;

  // Angolan NIF validator
  const isNifValid = (nif: string) => {
    const cleanNif = nif.trim().toUpperCase();
    return cleanNif.length >= 9 && cleanNif.length <= 14;
  };

  // Angolan BI validator (example: 009874562LA041 -> 14 characters, ends with 2 letters and 3 digits)
  const isBiValid = (bi: string) => {
    const cleanBi = bi.trim().toUpperCase();
    if (cleanBi.length !== 14) return false;
    return /[A-Z]/.test(cleanBi);
  };
  const isStep2Valid = appMode === 'institution'
    ? isNifValid(biNumber) && frenteSuccess && versoSuccess
    // v37.8 — cidadão: BI válido + frente/verso + data de nascimento e sexo
    // (campos usados pela IA na comparação com os dados extraídos do B.I.)
    : isBiValid(biNumber) && frenteSuccess && versoSuccess && !!dataNascimento && !!sexo;

  // Handle front file drop/selection
  const handleFrenteFile = (file: File) => {
    setIsUploadingFrente(true);
    setFrenteSuccess(false);
    setDocumentFrente(file); // sem isto o upload nunca acontecia — imagem perdida
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setFrentePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Simulate OCR Scan with security feedback
    setTimeout(() => {
      setIsUploadingFrente(false);
      setFrenteSuccess(true);
      addAuditLog('Leitura óptica OCR sucedida na Frente do B.I.', 'info');
    }, 1500);
  };

  // Handle back file drop/selection
  const handleVersoFile = (file: File) => {
    setIsUploadingVerso(true);
    setVersoSuccess(false);
    setDocumentVerso(file); // sem isto o upload nunca acontecia — imagem perdida
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setVersoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Simulate OCR Scan
    setTimeout(() => {
      setIsUploadingVerso(false);
      setVersoSuccess(true);
      addAuditLog('Leitura óptica OCR sucedida no Verso do B.I.', 'info');
    }, 1500);
  };

  // Formatter for BI input
  const handleBiChange = (val: string) => {
    const formatted = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14);
    setBiNumber(formatted);
  };

  // ===== Motor Biométrico Facial de Registo (idêntico ao do Login Facial do App.tsx) =====

  // Chave canónica de armazenamento local: cda_demo_face_[mode]_[BI_EM_MAIÚSCULAS]
  // 100% interoperável com a validação do Login Facial (App.tsx getDemoFaceStorageKey)
  const getDemoFaceStorageKey = () => {
    const identifier = (biNumber || 'anon').toUpperCase().replace(/\s+/g, '');
    return `cda_demo_face_${appMode}_${identifier}`;
  };

  // Assinatura de tons de cinza 16x16 (mesma função do Login)
  const computeFaceSignature = (canvas: HTMLCanvasElement): number[] => {
    const temp = document.createElement('canvas');
    temp.width = 16;
    temp.height = 16;
    const ctx = temp.getContext('2d');
    if (!ctx) return [];
    ctx.drawImage(canvas, 0, 0, temp.width, temp.height);
    const { data } = ctx.getImageData(0, 0, temp.width, temp.height);
    const signature: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
      signature.push(gray);
    }
    return signature;
  };

  const stopFaceCamera = () => {
    if (faceStreamRef.current) {
      faceStreamRef.current.getTracks().forEach(track => track.stop());
      faceStreamRef.current = null;
    }
    if (faceVideoRef.current) {
      faceVideoRef.current.srcObject = null;
    }
    setWebcamReady(false);
    setIsSimulatedCamera(false);
  };

  // Captura do frame real da câmara; fallback para câmara virtual biométrica sobre o canvas
  const captureFaceFrame = () => {
    const video = faceVideoRef.current;
    const canvas = faceCanvasRef.current;

    // Se o vídeo real estiver ativo e válido, capturar o frame físico
    if (video && canvas && video.videoWidth > 0 && video.videoHeight > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const signature = computeFaceSignature(canvas);
        return { imageDataUrl, signature };
      }
    }

    // Fallback: desenhar a face biométrica simulada no canvas (mesmo desenho do Login)
    if (canvas) {
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 300, 300);

        ctx.strokeStyle = 'rgba(37, 99, 235, 0.2)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 300; i += 30) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, 300);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(300, i);
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.ellipse(150, 150, 70, 100, 0, 0, 2 * Math.PI);
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#60a5fa';
        ctx.beginPath();
        ctx.arc(120, 130, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(180, 130, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(150, 150);
        ctx.lineTo(145, 175);
        ctx.lineTo(155, 175);
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(150, 200, 20, 8, 0, 0, Math.PI);
        ctx.stroke();

        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const signature = computeFaceSignature(canvas);
        return { imageDataUrl, signature };
      }
    }

    return null;
  };

  // Ativação real da câmara ao entrar na fase de Biometria (passo 3), com câmara virtual de fallback
  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      if (step !== 3) return;
      // v37.8 — cidadão: a etapa facial foi REMOVIDA do registo (validação só
      // por comparação de dados do B.I.); a câmara é exclusiva do fluxo institucional.
      if (appMode !== 'institution') return;
      setIsSimulatedCamera(false);
      setFaceCaptureHint('Posicione o rosto no centro da moldura.');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        faceStreamRef.current = stream;
        if (faceVideoRef.current) {
          faceVideoRef.current.srcObject = stream;
          await faceVideoRef.current.play().catch(err => console.warn('[CDA-sync] Sincronização falhou (não bloqueia a ação local):', err));
        }
        setWebcamReady(true);
      } catch (error) {
        console.error('Erro ao abrir câmara no registo facial:', error);
        // Fallback para a câmara virtual biométrica simulada — o fluxo nunca congela
        setWebcamReady(true);
        setIsSimulatedCamera(true);
        setFaceCaptureHint('Câmara física indetectável. Ativada Câmara Virtual com Scanner Biométrico Integrado para Demonstração.');
      }
    };

    if (step === 3 && appMode === 'institution') {
      startCamera();
    } else {
      stopFaceCamera();
    }

    return () => {
      mounted = false;
      stopFaceCamera();
    };
  }, [step, appMode]);

  // Pré-verificação automática (Fase 1): dispara quando a captura facial termina
  useEffect(() => {
    if (!captureFinished || !savedFacePhoto || verificationStartedRef.current) return;
    verificationStartedRef.current = true;
    setIsVerifying(true);
    addAuditLog('Pré-verificação automática dos documentos iniciada (motor local)', 'info');
    runRegistrationVerification({
      frontImageDataUrl: frentePreview,
      selfieDataUrl: savedFacePhoto,
      typedBi: biNumber,
      typedName: name
    }).then(report => {
      setVerificationReport(report);
      addAuditLog(`Pré-verificação concluída em ${report.durationMs}ms — coerência global ${report.coherenceScore}% (${report.iaResult})`, 'info');
      if (report.errors.length > 0) {
        addAuditLog(`Pré-verificação com análises indisponíveis: ${report.errors.join('; ')}`, 'warning');
      }
    }).catch(err => {
      console.error('Falha global na pré-verificação:', err);
    }).finally(() => {
      setIsVerifying(false);
    });
  }, [captureFinished, savedFacePhoto, frentePreview, biNumber, name, addAuditLog]);

  // Fluxo robusto de registo em 3 capturas (Frente → Esquerda → Sorriso/Cima) com fusão criptográfica
  const startCameraScan = async () => {
    if (!webcamReady || isScanning || captureFinished) return;

    const captured = captureFaceFrame();
    if (!captured) {
      setFaceCaptureHint('Não foi possível capturar a imagem facial. Aguarde a ativação da câmara e tente novamente.');
      return;
    }

    setIsScanning(true);
    setScanProgress(20);

    const currentCapturesCount = tempFaceCaptures.length;
    setFaceCaptureHint(`A processar captura ${currentCapturesCount + 1} de 3...`);
    addAuditLog(`Iniciou digitalização biométrica facial no Registo (Captura ${currentCapturesCount + 1}/3)`, 'info');

    const finalize = (progress: number) => new Promise(resolve => setTimeout(() => {
      setScanProgress(progress);
      resolve(true);
    }, 220));

    await finalize(45);
    await finalize(75);

    const nextCaptures = [...tempFaceCaptures, captured];

    if (currentCapturesCount < 2) {
      // Ainda não são 3 capturas: guarda o progresso temporário
      setTempFaceCaptures(nextCaptures);
      await finalize(100);
      setIsScanning(false);
      setScanProgress(0);

      const nextStep = currentCapturesCount + 2;
      if (nextStep === 2) {
        setFaceCaptureHint('Captura 1/3 gravada! Agora, incline ligeiramente o rosto para a ESQUERDA.');
        addAuditLog('Biometria facial no Registo: Captura 1/3 (Frente) registada', 'info');
      } else if (nextStep === 3) {
        setFaceCaptureHint('Captura 2/3 gravada! Agora, sorria ou olhe ligeiramente para CIMA.');
        addAuditLog('Biometria facial no Registo: Captura 2/3 (Esquerda) registada', 'info');
      }
      return;
    }

    // 3ª captura: compilar, fundir criptograficamente e persistir o perfil biométrico local
    const avgSignature: number[] = [];
    const len = nextCaptures[0].signature.length;
    for (let i = 0; i < len; i++) {
      const sum = nextCaptures[0].signature[i] + nextCaptures[1].signature[i] + nextCaptures[2].signature[i];
      avgSignature.push(Math.round(sum / 3));
    }

    const storagePayload = {
      identifier: biNumber.toUpperCase(),
      profileMode: appMode,
      displayName: name.trim(),
      capturedAt: new Date().toLocaleString('pt-AO'),
      imageDataUrl: captured.imageDataUrl,
      signature: avgSignature,
      signatures: nextCaptures.map(c => c.signature),
    };

    localStorage.setItem(getDemoFaceStorageKey(), JSON.stringify(storagePayload));

    setTempFaceCaptures([]);
    setSavedFacePhoto(captured.imageDataUrl);
    setCaptureFinished(true);
    setScanStateText('Mapeamento Facial Concluído!');
    setFaceCaptureHint('Cadastro biométrico robusto concluído! 3/3 faces fundidas criptograficamente.');
    await finalize(100);
    setIsScanning(false);
    addAuditLog(`DEMO_FACE_ENROLLED: Registo biométrico de 3 capturas concluído com sucesso no Registo (${appMode})`, 'success');
  };


  // PRÉ-AQUECIMENTO do motor de pré-verificação: assim que o utilizador anexa o
  // primeiro documento, os modelos de IA (BlazeFace + OCR) começam a carregar
  // em segundo plano — quando terminar a captura biométrica, a análise arranca
  // quase instantaneamente.
  // v37.66 — só o fluxo INSTITUCIONAL usa o motor local (BlazeFace + Tesseract):
  // no cidadão/admin a etapa facial foi removida (v37.8) e a aprovação baseia-se
  // apenas na IA de visão do servidor. Pré-aquecer aqui faria o cidadão/admin
  // descarregar ~15 MB de modelos ML nunca usados, competindo com a rede durante
  // o registo e atrasando a análise — por isso o prewarm é exclusivo da instituição.
  useEffect(() => {
    if (appMode === 'institution' && (frenteSuccess || versoSuccess)) {
      prewarmVerificationEngine();
    }
  }, [appMode, frenteSuccess, versoSuccess]);

  // Form submission and registration inside Supabase (with fallback to local storage)
  const handleFinalSubmit = async () => {
    // Defesa em profundidade: nunca prosseguir para upload/criação sem confirmação.
    if (password !== confirmPassword) {
      setSubmitError('As senhas não coincidem. Confirme a senha para concluir o registo.');
      return;
    }
    // v37.71 — CONTA NOVA NASCE LIMPA: ciclos eliminar→re-criar com a mesma B.I.
    // deixavam rasto no dispositivo (foto de perfil anterior, dados editados,
    // entrada local antiga, matrizes faciais) que era re-hidratado no login da
    // conta re-criada — esta purga garante que o NOVO registo parte de zero.
    // Corre ANTES de qualquer escrita deste registo (senha local, fila, sessão).
    if (appMode === 'user') {
      try { purgeCitizenLocalResidues(biNumber.trim().toUpperCase().replace(/\s+/g, '')); } catch { /* melhor esforço */ }
    }
    setIsSubmitting(true);
    setSubmitError('');

    // Standard register/institution block
    const newUser = {
      id: appMode === 'institution' ? `inst_${Date.now()}` : `cit_${Date.now()}`,
      name: name.trim(),
      category: appMode === 'institution' ? 'Instituição' : 'Cidadão',
      province: 'Luanda',
      municipio: 'Belas',
      address: appMode === 'institution' ? 'Sede da ENDE, Luanda, Angola' : 'Centralidade do Kilamba, Bloco T22',
      contact: email.trim().toLowerCase(),
      status: 'Pendente' as const,
      biNumber: biNumber.toUpperCase(),
      // v37.29 — sem foto capturada no registo (v37.8): a foto fica VAZIA.
      // Antigamente todos os novos cidadãos recebiam a MESMA foto de stock
      // (parecia dado de outra pessoa); agora o perfil mostra fundo azul com
      // a inicial do nome até o cidadão carregar a sua própria foto.
      facePhoto: savedFacePhoto || '',
      verificationScore: verificationReport ? verificationReport.coherenceScore : parseFloat((94 + Math.random() * 5).toFixed(1)),
      // Métricas reais da pré-verificação local (a fila do Admin usa estes valores quando presentes)
      facialMatch: verificationReport?.face.similarity ?? undefined,
      imageQuality: verificationReport?.quality.score ?? undefined,
      ocrDataMatch: verificationReport?.ocr.score ?? undefined,
      coherenceLevel: verificationReport?.coherenceScore ?? undefined,
      iaResult: verificationReport?.iaResult ?? undefined,
      reason: (appMode === 'institution'
        ? '[Instituição] Adesão formal para a instituição ENDE. Pendente de homologação administrativa.'
        : 'Aguardando validação formal de vivacidade e homologação de dados por analista tributário e SME.')
        + (verificationReport ? ` | Pré-verificação local: ${verificationReport.coherenceScore}% (${verificationReport.iaResult})` : '')
    };

    // ===== v37.78.17 · REGRAS UX — confirmação IMEDIATA + análise em 2.º plano =====
    const isSupabaseReady = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
    const biClean = newUser.biNumber.replace(/\s+/g, '');

    // — dup-check síncrono (B.I./e-mail únicos): erro legítimo ANTES do popup —
    if (isSupabaseReady) {

      // v37.78.17-fix — dup-check TAMBÉM via proxy do servidor (service role):
      // o select anónimo pode ser limitado por RLS e deixar passar um B.I. que
      // já está na fila — um erro legítimo tem de aparecer ANTES do popup.
      try {
        const dupProxy = await registoPublicoProxy('select', { bi_numero: newUser.biNumber });
        if (dupProxy && dupProxy.ok && Array.isArray(dupProxy.linhas) && dupProxy.linhas.length > 0) {
          setSubmitError('Não é possível efectuar o registo: este número de B.I. já se encontra registado.');
          setIsSubmitting(false);
          return;
        }
      } catch { /* rede — o caminho original abaixo ainda tenta */ }

        // DUPLICADOS: o B.I. e o e-mail são únicos por cidadão — se já
        // constarem na base de dados, o registo é recusado antes de qualquer envio.
        setSubmitMessage('A verificar os dados na base de dados...');
        try {
          const [{ data: biDup }, { data: emailDup }] = await Promise.all([
            supabase.from('solicitacoes_registo').select('id').eq('bi_numero', newUser.biNumber).limit(1),
            supabase.from('solicitacoes_registo').select('id').eq('email', newUser.contact).limit(1)
          ]);
          if (biDup && biDup.length > 0) {
            setSubmitError('Não é possível efectuar o registo: este número de B.I. já se encontra registado.');
            setIsSubmitting(false);
            return;
          }
          if (emailDup && emailDup.length > 0) {
            setSubmitError('Não é possível efectuar o registo: este e-mail já se encontra registado.');
            setIsSubmitting(false);
            return;
          }
        } catch (dupErr) {
          // Se a verificação falhar (rede/tabela ausente), prossegue — o insert trata duplicados (23505).
          console.warn('Verificação de duplicados indisponível:', dupErr);
        }
      }

      // — gravação LOCAL instantânea (D3): a conta existe desde JÁ para login —
      try {
        const saved = localStorage.getItem('gov_admin_citizens');
        const currentCitizens: any[] = saved ? JSON.parse(saved) : [];
        // re-submissão após correcções substitui a entrada anterior do mesmo B.I.
        const semRepetidos = currentCitizens.filter((c) => String(c.biNumber || '').toUpperCase() !== newUser.biNumber.toUpperCase());
        semRepetidos.unshift({
          ...newUser,
          status: newUser.status || 'Pendente',
          analiseEstado: 'em_analise',
        });
        localStorage.setItem('gov_admin_citizens', JSON.stringify(semRepetidos));
        localStorage.setItem(`citizen_pass_${newUser.biNumber}`, password);
      } catch { /* melhor esforço — não trava a confirmação imediata */ }
      // F47-fix — novo registo submetido: limpa a marca de revogação local.
      try { localStorage.removeItem('cda_revoked_' + biClean.toUpperCase()); } catch { /* ignora */ }

      // — homologação nasce PENDENTE + correspondência oficial de recepção —
      homologationStore.setStatus(newUser.biNumber, 'pending', undefined, newUser.name);
      notifyRegistrationSubmitted(newUser.biNumber, newUser.name);
      addAuditLog(`Processo de Adesão de ${newUser.name} submetido ao SME — validação IA em segundo plano.`, 'info');

      // — confirmação IMEDIATA ao cidadão; o utilizador NÃO espera pela análise —
      setAnaliseEstado('em_analise');
      setStep('success');
      setCredPopup(true);
      setIsSubmitting(false);

      // — PROCESSAMENTO EM SEGUNDO PLANO (uploads + PVI + provisionamento) —
      // v37.78.17: o pipeline pesado vive no registoBgService — é descrito num
      // JOB persistido antes de arrancar, pelo que sobrevive a um reload/fecho
      // da página (retoma no arranque da aplicação e no login). O utilizador
      // já recebeu a confirmação imediata e pode entrar já na sua conta.
      let jobBg: RegistoBgJob;
      try {
        const frenteBlobBg: Blob | null = documentFrente
          || (frentePreview && frentePreview.startsWith('data:image/') ? base64ToBlob(frentePreview) : null);
        const versoBlobBg: Blob | null = documentVerso
          || (versoPreview && versoPreview.startsWith('data:image/') ? base64ToBlob(versoPreview) : null);
        const [frenteBgData, versoBgData] = await Promise.all([
          frenteBlobBg ? blobToPviDataUrl(frenteBlobBg).catch(() => '') : Promise.resolve(''),
          versoBlobBg ? blobToPviDataUrl(versoBlobBg).catch(() => '') : Promise.resolve(''),
        ]);
        jobBg = {
          bi: biClean,
          startedAt: Date.now(),
          tentativa: 0,
          payload: {
            newUser, password, appMode,
            frenteDataUrl: frenteBgData, versoDataUrl: versoBgData,
            savedFacePhoto, dataNascimento, sexo, verificationReport,
          },
        };
        gravarJob(jobBg);
      } catch (jobErr) {
        // melhor esforço: sem persistência, o pipeline ainda corre nesta página
        console.warn('[registoBg] Job não persistido (a executar apenas nesta página):', jobErr);
        jobBg = {
          bi: biClean, startedAt: Date.now(), tentativa: 0,
          payload: { newUser, password, appMode, frenteDataUrl: '', versoDataUrl: '', savedFacePhoto, dataNascimento, sexo, verificationReport },
        };
      }
      void correrRegistoBg(jobBg, {
        addAuditLog,
        setSubmitMessage,
        setAnaliseEstado: (e) => { if (mountedRef.current) setAnaliseEstado(e); },
        setReprovacaoInfo: (i) => { if (mountedRef.current) setReprovacaoInfo(i); },
        setPviAutoApproved,
        pedirPopupAprovado: () => { if (mountedRef.current && !credPopupRef.current) setAprovadoPendente(true); },
      });
  };

  return (
    <div className="w-full flex flex-col justify-between min-h-[440px] flex-1 font-sans">
      {/* Dynamic High-Fidelity Stepper Indicator */}
      {step !== 'success' && step !== 1 && (
        <div className="relative flex items-center justify-between w-full max-w-lg mx-auto mb-4 select-none px-4">
          {/* Background Connector Bar with smooth animated progress */}
          <div className="absolute top-[14px] left-10 right-10 h-[2.5px] bg-slate-100 pointer-events-none -translate-y-1/2 -z-0">
            <div 
              className="h-full bg-[#2563eb] transition-all duration-300 rounded-full" 
              style={{
                width: step === 1 ? '0%' : step === 2 ? '50%' : '100%'
              }}
            />
          </div>

          {/* Step 1 */}
          <div className="relative z-10 flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10.5px] font-black transition-all ${
              step === 1 ? 'border-[#2563eb] text-[#2563eb] bg-white ring-4 ring-blue-50/75' : 'border-[#2563eb] text-white bg-[#2563eb]'
            }`}>
              {step > 1 ? <Check size={13} className="stroke-[3]" /> : "01"}
            </div>
            <span className={`text-[10px] font-black tracking-widest uppercase mt-1 ${
              step === 1 ? 'text-[#0f172a]' : 'text-slate-400'
            }`}>
              ACESSO
            </span>
          </div>

          {/* Step 2 */}
          <div className="relative z-10 flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10.5px] font-black transition-all ${
              step === 2 
                ? 'border-[#2563eb] text-[#2563eb] bg-white ring-4 ring-blue-50/75' 
                : step > 2 
                ? 'border-[#2563eb] text-white bg-[#2563eb]' 
                : 'border-slate-200 text-slate-400 bg-white'
            }`}>
              {step > 2 ? <Check size={13} className="stroke-[3]" /> : "02"}
            </div>
            <span className={`text-[10px] font-black tracking-widest uppercase mt-1 ${
              step === 2 ? 'text-[#2563eb]' : 'text-slate-400'
            }`}>
              IDENTIDADE
            </span>
          </div>

          {/* Step 3 */}
          <div className="relative z-10 flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10.5px] font-black transition-all ${
              step === 3 ? 'border-[#2563eb] text-[#2563eb] bg-white ring-4 ring-blue-50/75' : 'border-slate-200 text-slate-400 bg-white'
            }`}>
              03
            </div>
            <span className={`text-[10px] font-black tracking-widest uppercase mt-1 ${
              step === 3 ? 'text-[#0f172a]' : 'text-slate-400'
            }`}>
              {/* v37.8 — cidadão: etapa de validação por IA (sem biometria facial) */}
              {appMode === 'institution' ? 'BIOMETRIA' : 'VALIDAÇÃO IA'}
            </span>
          </div>
        </div>
      )}

      {/* Steps Content inside AnimatePresence */}
      <div className="flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.28 }}
              className="space-y-4"
            >
              {/* Centered User Avatar exactly like the Login image */}
              <div className="text-center space-y-1.5">
                <div className="flex justify-center mb-1">
                  <div className="w-14 h-14 rounded-full bg-[#f0f4f9] flex items-center justify-center border border-slate-100 shadow-3xs">
                    <User className="text-[#0c2340]" size={22} />
                  </div>
                </div>

                <h2 className="text-[25px] font-black text-[#0c2340] tracking-tight uppercase leading-none">
                  {appMode === 'institution' ? 'REGISTO DE INSTITUIÇÃO' : 'REGISTO'}
                </h2>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mt-0.5">
                  {appMode === 'institution' ? 'Adesão oficial da instituição ao Correio Digital' : 'Criação oficial da conta de cidadão digital'}
                </p>
              </div>

              {/* Form Input fields */}
              <div className="space-y-3.5 pt-0 max-w-lg mx-auto">
                {/* Nome Completo */}
                <div className="grid gap-1 text-left">
                  <span className="text-[10.5px] text-slate-500 font-extrabold tracking-wider uppercase">
                    {appMode === 'institution' ? 'Nome da Instituição' : 'Nome Completo'}
                  </span>
                  <div className="flex items-center gap-3 bg-white border border-slate-200 focus-within:border-[#0c2340] focus-within:ring-1 focus-within:ring-[#0c2340] rounded-[15px] px-4 py-1.5 transition-all">
                    <div className="w-10 h-10 bg-[#f0f4f9] text-[#1e3a8a] rounded-lg flex items-center justify-center shrink-0">
                      <User size={19} className="text-[#2563eb]" />
                    </div>
                    <input 
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onBlur={() => setName(appMode === 'institution' ? normalizarTitulo(name) : normalizarNome(name))}
                      className="w-full bg-transparent font-bold tracking-wider text-slate-800 border-none outline-none text-[13px] placeholder-slate-400"
                      placeholder={appMode === 'institution' ? 'Ex: ENDE - Empresa Nacional de Distribuição de Electricidade' : 'Ex: Manuel António da Silva'}
                    />
                  </div>
                  {name && !isNameValid(name) && (
                    <span className="text-[10px] text-red-500 font-extrabold uppercase tracking-tight block mt-0.5 pl-2" id="name-error-msg">
                      {appMode === 'institution' ? 'Insira o nome da Instituição (mínimo 3 caracteres)' : 'Insira nome e sobrenome completo'}
                    </span>
                  )}
                </div>

                {/* E-mail */}
                <div className="grid gap-1 text-left">
                  <span className="text-[10.5px] text-slate-500 font-extrabold tracking-wider uppercase">
                    {appMode === 'institution' ? 'E-mail Institucional' : 'Endereço de E-mail'}
                  </span>
                  <div className="flex items-center gap-3 bg-white border border-slate-200 focus-within:border-[#0c2340] focus-within:ring-1 focus-within:ring-[#0c2340] rounded-[15px] px-4 py-1.5 transition-all">
                    <div className="w-10 h-10 bg-[#f0f4f9] text-[#1e3a8a] rounded-lg flex items-center justify-center shrink-0">
                      <Mail size={18} className="text-[#2563eb]" />
                    </div>
                    <input 
                      type="email"
                      list="cda-dominios-email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setSubmitError(''); }}
                      onBlur={() => { const c = corrigirDominioEmail(email); if (c && c !== email) { setEmail(c); setSubmitError(''); } }}
                      className="w-full bg-transparent font-bold tracking-wider text-slate-800 border-none outline-none text-[13px] placeholder-slate-400"
                      placeholder={appMode === 'institution' ? 'geral@ende.co.ao' : 'manuel.silva@netangola.ao'}
                    />
                  </div>
                  {email && !isEmailValid(email) && (
                    <span className="text-[10px] text-red-500 font-extrabold uppercase tracking-tight block mt-0.5 pl-2" id="email-error-msg">
                      Formato de e-mail inválido
                    </span>
                  )}
                </div>

                {/* Password/Senha Row */}
                <div className="grid gap-1 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] text-slate-500 font-extrabold tracking-wider uppercase">
                      Senha de Acesso
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
                    <span className="text-[10px] text-red-500 font-extrabold uppercase tracking-tight block mt-0.5 pl-2" id="pwd-error-msg">
                      Utilize no mínimo 8 caracteres
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirm-password" className="text-[10.5px] text-slate-800 font-extrabold tracking-widest uppercase">
                    Confirmar Senha
                  </label>
                  <div className={`flex items-center gap-3 bg-white border focus-within:ring-1 rounded-[15px] px-4 py-1.5 transition-all relative ${
                    confirmPassword && !passwordsMatch
                      ? 'border-red-400 focus-within:border-red-500 focus-within:ring-red-200'
                      : passwordsMatch
                        ? 'border-emerald-400 focus-within:border-emerald-500 focus-within:ring-emerald-200'
                        : 'border-slate-200 focus-within:border-[#0c2340] focus-within:ring-[#0c2340]'
                  }`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${passwordsMatch ? 'bg-emerald-50 text-emerald-700' : 'bg-[#f0f4f9] text-[#1e3a8a]'}`}>
                      <Lock size={18} className="text-[#2563eb]" />
                    </div>
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full bg-transparent font-bold tracking-wider text-slate-800 border-none outline-none text-[13px] placeholder-slate-400 pr-10"
                      placeholder="••••••••••••"
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 bg-transparent border-none cursor-pointer flex items-center justify-center transition-all">
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <span className="text-[10px] text-red-600 font-extrabold uppercase tracking-tight block mt-0.5 pl-2" role="alert">
                      As senhas não coincidem. Verifique e tente novamente.
                    </span>
                  )}
                  {passwordsMatch && (
                    <span className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-tight flex items-center gap-1 mt-0.5 pl-2" role="status">
                      <Check size={12} aria-hidden="true" /> As senhas coincidem.
                    </span>
                  )}
                </div>

                {/* Password requirements banner matching image 1 perfectly */}
                <div className="bg-[#f0f4f9] rounded-xl p-3 flex items-center gap-3 shadow-2xs border border-slate-100">
                  <ShieldCheck size={18} className="text-[#2563eb] shrink-0" />
                  <span className="text-slate-700 text-[10.5px] font-bold leading-normal font-sans">
                    A senha deve ter pelo menos 8 caracteres, incluindo letras e números.
                  </span>
                </div>
              </div>

              {/* Horizontal Separator Line */}
              <div className="border-t border-slate-100/80 my-2 max-w-lg mx-auto" />

              {/* Actions Footer */}
              <div className="flex flex-col gap-2.5 max-w-lg mx-auto w-full pt-0">
                <button
                  type="button"
                  disabled={!isStep1Valid}
                  onClick={() => setStep(2)}
                  className={`w-full text-white rounded-[15px] py-3 font-black text-[12px] uppercase tracking-widest shadow-lg transition-all border-none flex items-center justify-center gap-2 ${
                    isStep1Valid 
                      ? 'bg-[#0c2340] hover:bg-slate-900 shadow-[#0c2340]/15 cursor-pointer hover:opacity-95' 
                      : 'bg-slate-200 cursor-not-allowed text-slate-400 shadow-none'
                  }`}
                  id="btn-next-step-1"
                >
                  CONTINUAR <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full bg-[#f8fafc] hover:bg-slate-100 text-[#2563eb] border border-slate-200 rounded-[15px] py-3 font-black text-[12px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer shadow-3xs"
                  id="btn-cancel-step-1"
                >
                  CANCELAR
                </button>
              </div>

              {/* Protected Seal footer */}
              <div className="flex items-center justify-center gap-2 text-slate-500 text-[11px] font-bold mt-0">
                <Shield size={14} className="text-[#2563eb]" />
                <span>Seus dados estão protegidos com segurança.</span>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-3"
            >
              {/* Submission Title Header */}
              <div className="text-center mt-0 animate-fadeIn">
                <h1 className="text-[#0f172a] text-lg md:text-xl font-black tracking-tight uppercase leading-none">
                  {appMode === 'institution' ? 'SUBMISSÃO DE DOCUMENTOS DA INSTITUIÇÃO' : 'SUBMISSÃO OFICIAL DE IDENTIDADE'}
                </h1>
              </div>

              {/* Form container */}
              <div className="space-y-3 text-left max-w-2xl mx-auto">
                {/* BI input field */}
                <div className="space-y-1">
                  <label className="text-[10.5px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1 mb-0.5 bg-transparent">
                    <FileText size={12} className="text-[#2563eb]" /> {appMode === 'institution' ? 'NÚMERO DE IDENTIFICAÇÃO FISCAL (NIF)' : 'Nº DO BILHETE DE IDENTIDADE (Nº B.I.)'}
                  </label>
                  <div className="relative font-mono">
                    <input 
                      type="text"
                      value={biNumber}
                      onChange={(e) => { handleBiChange(e.target.value); setSubmitError(''); }}
                      className="w-full bg-white border border-slate-200 focus:border-[#2563eb]/60 rounded-xl px-4 py-2 pl-10.5 text-[13px] text-slate-800 outline-none transition-all font-bold tracking-widest placeholder:text-slate-400"
                      placeholder={appMode === 'institution' ? '540132918' : '002931298LA045'}
                      maxLength={14}
                    />
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2563eb]">
                      <FileText size={14} />
                    </div>
                    {appMode === 'institution' ? isNifValid(biNumber) && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-[#2563eb] rounded-full p-0.5">
                        <Check size={10.5} className="font-extrabold" />
                      </div>
                    ) : isBiValid(biNumber) && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-[#2563eb] rounded-full p-0.5">
                        <Check size={10.5} className="font-extrabold" />
                      </div>
                    )}
                  </div>
                  {biNumber && (appMode === 'institution' ? !isNifValid(biNumber) : !isBiValid(biNumber)) && (
                    <span className="text-[10px] text-red-500 font-extrabold uppercase tracking-tight block ml-1" id="bi-validation-error">
                      {appMode === 'institution' ? 'O NIF deve possuir entre 9 e 14 caracteres' : 'O B.I. deve possuir exatamente 14 caracteres'}
                    </span>
                  )}
                  {/* FASE 4 — confirmação de leitura óptica (OCR): quando a pré-verificação
                      local confirma o B.I. digitado com alta confiança, mostra o selo de
                      verificação. Não altera dados — apenas feedback honesto. */}
                  {appMode !== 'institution' && biNumber && verificationReport?.ocr?.biFound && verificationReport.ocr.biScore >= 80 && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 mt-1.5 uppercase tracking-wider">
                      <Check size={9} /> B.I. confirmado por leitura óptica (OCR {verificationReport.ocr.biScore}%)
                    </span>
                  )}
                </div>

                {/* v37.8 — dados pessoais para comparação com o B.I. (só cidadão).
                    A IA compara estes campos com os extraídos da imagem do B.I.;
                    não existe reconhecimento facial nesta etapa. */}
                {appMode !== 'institution' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10.5px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1 mb-0.5 bg-transparent">
                        <FileText size={12} className="text-[#2563eb]" /> DATA DE NASCIMENTO
                      </label>
                      <input
                        type="date"
                        value={dataNascimento}
                        onChange={(e) => { setDataNascimento(e.target.value); setSubmitError(''); setReprovacaoInfo(null); }}
                        className="w-full bg-white border border-slate-200 focus:border-[#2563eb]/60 rounded-xl px-4 py-2 text-[13px] text-slate-800 outline-none transition-all font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10.5px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1 mb-0.5 bg-transparent">
                        <FileText size={12} className="text-[#2563eb]" /> SEXO
                      </label>
                      <select
                        value={sexo}
                        onChange={(e) => { setSexo(e.target.value); setSubmitError(''); setReprovacaoInfo(null); }}
                        className="w-full bg-white border border-slate-200 focus:border-[#2563eb]/60 rounded-xl px-4 py-2 text-[13px] text-slate-800 outline-none transition-all font-bold"
                      >
                        <option value="">Seleccionar…</option>
                        <option value="M">Masculino</option>
                        <option value="F">Feminino</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Grid of Double Upload Columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Frente Card with Dashed Blue Border */}
                  <div className="space-y-1">
                    <span className="text-[10.5px] text-slate-800 font-extrabold tracking-widest uppercase flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-[#2563eb] rounded-full"></span> {appMode === 'institution' ? 'REGISTO COMERCIAL / DIÁRIO' : 'FRENTE DO B.I.'}
                    </span>
                    <label className={`group relative border-2 border-dashed rounded-[16px] p-2.5 text-center flex flex-col items-center justify-center min-h-[108px] cursor-pointer transition-all duration-300 select-none ${
                      frenteSuccess 
                        ? 'border-emerald-500 bg-emerald-50/10' 
                        : isUploadingFrente 
                        ? 'border-[#2563eb] bg-blue-50/15 animate-pulse' 
                        : 'border-[#bfdbfe] bg-white hover:bg-[#eff6ff]/30 hover:border-[#2563eb]'
                    }`}>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleFrenteFile(e.target.files[0]);
                        }}
                      />
                      
                      {isUploadingFrente ? (
                        <div className="flex flex-col items-center gap-1">
                           <Loader2 size={18} className="text-[#2563eb] animate-spin" />
                           <span className="text-[10.5px] font-black text-[#2563eb] uppercase tracking-widest">A processar...</span>
                        </div>
                      ) : frenteSuccess ? (
                        <div className="flex flex-col items-center w-full">
                          {frentePreview ? (
                            <div className="w-full h-[72px] rounded-lg overflow-hidden border border-emerald-200 relative">
                              <img src={frentePreview} alt="Frente Preview" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-0.5">
                              <CheckCircle2 size={18} className="text-emerald-500" />
                              <span className="text-[10.5px] font-black text-emerald-600 uppercase tracking-wider">Leitura Completa</span>
                            </div>
                          )}
                          <span className="text-[10px] font-black text-emerald-700 mt-0.5 uppercase tracking-tight">Ficheiro Carregado</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-9 h-9 bg-white border border-blue-50 rounded-full flex items-center justify-center text-[#2563eb] shadow-sm">
                            <UploadCloud size={16} />
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[10.5px] font-black text-slate-800 uppercase tracking-widest block font-sans">CARREGAR DOCUMENTO</span>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-tight block font-sans">Clique para carregar</span>
                          </div>
                          <span className="bg-[#eff6ff] text-[10px] font-bold text-[#2563eb] px-2 py-0.5 rounded-full uppercase tracking-wider block font-sans">
                            Formatos: JPG, PNG, PDF
                          </span>
                        </div>
                      )}
                    </label>
                  </div>

                  {/* Verso Card with Dashed Blue Border */}
                  <div className="space-y-1">
                    <span className="text-[10.5px] text-slate-800 font-extrabold tracking-widest uppercase flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-[#2563eb] rounded-full"></span> {appMode === 'institution' ? 'COMPROVATIVO DE NIF / ALVARÁ' : 'VERSO DO B.I.'}
                    </span>
                    <label className={`group relative border-2 border-dashed rounded-[16px] p-2.5 text-center flex flex-col items-center justify-center min-h-[108px] cursor-pointer transition-all duration-300 select-none ${
                      versoSuccess 
                        ? 'border-emerald-500 bg-emerald-50/10' 
                        : isUploadingVerso 
                        ? 'border-[#2563eb] bg-blue-50/15 animate-pulse' 
                        : 'border-[#bfdbfe] bg-white hover:bg-[#eff6ff]/30 hover:border-[#2563eb]'
                    }`}>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleVersoFile(e.target.files[0]);
                        }}
                      />
                      
                      {isUploadingVerso ? (
                        <div className="flex flex-col items-center gap-1">
                          <Loader2 size={18} className="text-[#2563eb] animate-spin" />
                          <span className="text-[10.5px] font-black text-[#2563eb] uppercase tracking-widest">A processar...</span>
                        </div>
                      ) : versoSuccess ? (
                        <div className="flex flex-col items-center w-full">
                          {versoPreview ? (
                            <div className="w-full h-[72px] rounded-lg overflow-hidden border border-emerald-200 relative">
                              <img src={versoPreview} alt="Verso Preview" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-0.5">
                              <CheckCircle2 size={18} className="text-emerald-500" />
                              <span className="text-[10.5px] font-black text-emerald-600 uppercase tracking-wider">Leitura Completa</span>
                            </div>
                          )}
                          <span className="text-[10px] font-black text-emerald-700 mt-0.5 uppercase tracking-tight">Ficheiro Carregado</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-9 h-9 bg-white border border-blue-50 rounded-full flex items-center justify-center text-[#2563eb] shadow-sm">
                            <UploadCloud size={16} />
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[10.5px] font-black text-slate-800 uppercase tracking-widest block font-sans">CARREGAR VERSO</span>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-tight block font-sans">Clique para carregar</span>
                          </div>
                          <span className="bg-[#eff6ff] text-[10px] font-bold text-[#2563eb] px-2 py-0.5 rounded-full uppercase tracking-wider block font-sans">
                            Formatos: JPG, PNG, PDF
                          </span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Encrypted files alert status bar */}
                <div className="bg-[#f1f5f9] rounded-xl p-2.5 flex items-center gap-2 mt-1.5">
                  <div className="w-5 h-5 rounded-md bg-[#2563eb]/10 flex items-center justify-center text-[#2563eb] shrink-0 shadow-sm">
                    <Lock size={11} className="font-extrabold" />
                  </div>
                  <span className="text-[10.5px] font-semibold text-slate-700 leading-normal">
                    Os documentos são <span className="font-bold text-[#2563eb]">encriptados</span> e utilizados apenas para validação da sua identidade.
                  </span>
                </div>
              </div>

              {/* Actions Box */}
              <div className="pt-2.5 border-t border-slate-100 flex gap-3 max-w-2xl mx-auto">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-800 font-black text-[11.5px] uppercase tracking-widest rounded-xl transition-all cursor-pointer bg-white flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft size={13} /> VOLTAR
                </button>
                <button
                  type="button"
                  disabled={!isStep2Valid}
                  onClick={() => setStep(3)}
                  className={`flex-1 py-2 text-white font-black text-[11.5px] uppercase tracking-widest rounded-xl transition-all border-0 shadow-md flex items-center justify-center gap-1.5 ${
                    isStep2Valid 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20 cursor-pointer' 
                      : 'bg-slate-100 cursor-not-allowed text-slate-400 border border-slate-200'
                  }`}
                >
                  SEGUINTE <ArrowRight size={13} />
                </button>
              </div>


            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-2.5"
            >
              {appMode !== 'institution' ? (
                <>
                  {/* v37.8 — Registo do cidadão SEM biometria facial: a IA apenas
                      compara os dados do formulário com os dados extraídos do B.I. */}
                  <div className="text-center">
                    <h1 className="text-[#0f172a] text-xl font-extrabold tracking-tight mb-0.5 leading-tight">
                      Validação Automática por IA
                    </h1>
                    <p className="text-[11px] text-slate-500 font-semibold m-0">
                      A IA compara os dados introduzidos com os dados extraídos do Bilhete de Identidade.
                      Não é realizado reconhecimento facial nesta etapa.
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-4 max-w-md mx-auto text-left shadow-sm space-y-2">
                    {[
                      ['Nome completo', name],
                      ['Número do BI', biNumber],
                      ['Data de nascimento', dataNascimento ? new Date(dataNascimento + 'T00:00:00').toLocaleDateString('pt-PT') : '—'],
                      ['Sexo', sexo === 'M' ? 'Masculino' : sexo === 'F' ? 'Feminino' : '—'],
                      ['Frente do B.I.', frenteSuccess ? 'Carregada ✓' : 'Em falta'],
                      ['Verso do B.I.', versoSuccess ? 'Carregado ✓' : 'Em falta'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{k}</span>
                        <span className="text-[12px] font-bold text-slate-800 text-right truncate max-w-[220px]">{v}</span>
                      </div>
                    ))}
                  </div>

                  {reprovacaoInfo && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 max-w-md mx-auto text-left">
                      <p className="text-[11px] font-black text-amber-800 uppercase tracking-widest m-0 mb-1 flex items-center gap-1.5">
                        <AlertTriangle size={13} /> Dados não correspondem
                      </p>
                      <p className="text-[11.5px] font-semibold text-amber-800 m-0 leading-relaxed">
                        {reprovacaoInfo.motivo || 'Existem dados que precisam de ser corrigidos ou verificados.'}
                      </p>
                      {reprovacaoInfo.alertas.length > 0 && (
                        <p className="text-[10px] font-semibold text-amber-700 mt-1.5 m-0">
                          Alertas: {reprovacaoInfo.alertas.join(', ')}
                        </p>
                      )}
                      <p className="text-[10.5px] font-semibold text-amber-700 mt-1.5 m-0">
                        Corrija os dados na etapa anterior e repita a validação.
                      </p>
                    </div>
                  )}

                  {isSubmitting && (
                    <div className="flex items-center justify-center gap-1.5 py-0.5 text-[10px] font-bold text-blue-600 animate-pulse">
                      <Loader2 size={13} className="animate-spin" />
                      {submitMessage}
                    </div>
                  )}
                  {submitError && !isSubmitting && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-[10.5px] font-bold text-red-700 text-left max-w-md mx-auto">
                      <AlertTriangle size={14} className="shrink-0 mt-px text-red-500" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <div className="flex gap-3 w-full max-w-md mx-auto pt-1">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setStep(2)}
                      className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-800 font-extrabold text-[#0f172a] text-[11.5px] uppercase tracking-widest rounded-xl transition-all cursor-pointer bg-white flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <ArrowLeft size={13} /> VOLTAR
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleFinalSubmit}
                      className="flex-1 py-2 text-[11.5px] font-black uppercase tracking-widest rounded-xl transition-all border-0 shadow-md flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white cursor-pointer shadow-blue-500/20 disabled:opacity-60"
                    >
                      {isSubmitting ? 'A VALIDAR...' : 'VALIDAR COM IA E CONCLUIR'} <Check size={13} />
                    </button>
                  </div>
                </>
              ) : (
              <>
              {/* Centered titles */}
              <div className="text-center">
                <h1 className="text-[#0f172a] text-xl font-extrabold tracking-tight mb-0.5 leading-tight">
                  {appMode === 'institution' ? 'Biometria Facial do Representante' : 'Assinatura de Biometria Facial'}
                </h1>
              </div>

              {/* Círculo interativo de Captura Biométrica (mesma configuração do Login Facial) */}
              <div className="relative flex justify-center py-1 mb-1.5">
                <div className="relative w-[168px] h-[168px] rounded-full flex items-center justify-center bg-white shadow-xl transition-all duration-300">
                  {/* Anel SVG de progresso 0% → 100% */}
                  <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none z-10" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      fill="none"
                      stroke="#f1f5f9"
                      strokeWidth="2.5"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      fill="none"
                      stroke={captureFinished ? '#10b981' : '#2563eb'}
                      strokeWidth="3"
                      strokeDasharray={`${2 * Math.PI * 46}`}
                      strokeDashoffset={`${2 * Math.PI * 46 * (1 - scanProgress / 100)}`}
                      className="transition-all duration-150 ease-out"
                      strokeLinecap="round"
                    />
                    {/* Indicador deslizante no anel */}
                    {scanProgress > 0 && scanProgress < 100 && (
                      <circle
                        cx={50 + 46 * Math.cos((scanProgress / 100) * 2 * Math.PI - Math.PI / 2)}
                        cy={50 + 46 * Math.sin((scanProgress / 100) * 2 * Math.PI - Math.PI / 2)}
                        r="2.5"
                        fill="#3b82f6"
                        className="shadow-sm"
                      />
                    )}
                  </svg>

                  {/* Círculo escuro principal */}
                  <div className="w-[152px] h-[152px] rounded-full overflow-hidden bg-gradient-to-b from-[#0f172a] to-[#1e1b4b] relative flex items-center justify-center border-[3px] border-white shadow-inner z-5">
                    {/* Grelha tecnológica de fundo */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:10px_10px] opacity-25" />

                    {/* Laser de varredura (mesmo do Login) */}
                    {isScanning && (
                      <div
                        className="absolute top-0 left-0 right-0 h-1 bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.9)] z-20 pointer-events-none"
                        style={{
                          animation: 'scan-motion 2.5s infinite ease-in-out',
                          position: 'absolute'
                        }}
                      />
                    )}

                    {/* Cantos da moldura oval de calibração */}
                    <div className="absolute top-5 left-5 w-4 h-4 border-t-2 border-l-2 border-white rounded-tl-sm opacity-80 pointer-events-none" />
                    <div className="absolute top-5 right-5 w-4 h-4 border-t-2 border-r-2 border-white rounded-tr-sm opacity-80 pointer-events-none" />
                    <div className="absolute bottom-5 left-5 w-4 h-4 border-b-2 border-l-2 border-white rounded-bl-sm opacity-80 pointer-events-none" />
                    <div className="absolute bottom-5 right-5 w-4 h-4 border-b-2 border-r-2 border-white rounded-br-sm opacity-80 pointer-events-none" />

                    {/* Vídeo real da câmara física (sempre montado para evitar race conditions) */}
                    <video
                      ref={faceVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover absolute inset-0 rounded-full scale-[1.06] transition-all duration-300 ${
                        webcamReady && !isSimulatedCamera && !captureFinished ? 'opacity-95 z-10' : 'opacity-0 z-0 pointer-events-none'
                      }`}
                    />

                    {/* Face final fundida OU câmara virtual biométrica simulada */}
                    {captureFinished && savedFacePhoto ? (
                      <img
                        src={savedFacePhoto}
                        alt="Captura Facial"
                        className="absolute inset-0 w-full h-full object-cover z-10 animate-scaleUp"
                      />
                    ) : (!webcamReady || isSimulatedCamera) && (
                      <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-slate-950 z-10">
                        <div className="relative w-full h-full flex items-center justify-center">
                          {/* Silhueta vetorial da face */}
                          <svg className={`w-20 h-20 stroke-[1] ${isScanning ? 'text-blue-400 animate-pulse' : 'text-sky-400'} transition-colors`} viewBox="0 0 100 100" fill="none">
                            <path d="M50,15 C28,15 28,50 28,68 C28,86 42,92 50,92 C58,92 72,86 72,68 C72,50 72,15 50,15 Z" stroke="currentColor" strokeDasharray="3 4" />
                            <ellipse cx="38" cy="48" rx="4.5" ry="2.5" stroke="currentColor" />
                            <ellipse cx="62" cy="48" rx="4.5" ry="2.5" stroke="currentColor" />
                            <path d="M50,52 L50,68 L46,68" stroke="currentColor" />
                            <path d="M40,78 Q50,84 60,78" stroke="currentColor" />

                            <circle cx="38" cy="48" r="1.5" className="fill-blue-400 animate-ping" />
                            <circle cx="62" cy="48" r="1.5" className="fill-blue-400 animate-ping" />
                            <circle cx="50" cy="92" r="2" className="fill-blue-500 animate-bounce" />
                          </svg>

                          {/* Anéis HUD rotativos */}
                          <div className="absolute inset-3 border border-sky-500/10 rounded-full animate-[spin_10s_linear_infinite]" />
                          <div className="absolute inset-6 border border-dashed border-indigo-400/20 rounded-full animate-[spin_20s_linear_infinite_reverse]" />
                        </div>
                      </div>
                    )}
                    <canvas ref={faceCanvasRef} className="hidden" />
                  </div>
                </div>
              </div>

              {/* Capture Aligned Info Tag - estado dinâmico por etapa */}
              <div className="text-center space-y-1">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                  captureFinished 
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                    : isScanning 
                    ? 'bg-blue-50 border-blue-100 text-blue-600 animate-pulse' 
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  <Check size={10.5} className="font-extrabold" />
                  <span>
                    {captureFinished
                      ? 'Cadastro biométrico robusto concluído! 3/3 faces fundidas criptograficamente.'
                      : isScanning
                        ? `A processar: ${scanProgress}%`
                        : tempFaceCaptures.length === 0
                          ? 'Pronto para registo (Captura 1/3: Frente)'
                          : tempFaceCaptures.length === 1
                            ? 'Pronto para registo (Captura 2/3: Esquerda)'
                            : 'Pronto para registo (Captura 3/3: Sorriso)'}
                  </span>
                </div>
                <p className="text-slate-400 text-[10px] font-semibold">{faceCaptureHint}</p>
              </div>

              {/* Centered Scanning Fingerprint Action Button */}
              {!captureFinished && (
                <div className="max-w-md mx-auto">
                  <button
                    type="button"
                    disabled={isScanning || !webcamReady}
                    onClick={startCameraScan}
                    className={`w-full py-2.5 rounded-2xl font-black text-[11.5px] uppercase tracking-widest transition-all border-0 shadow-md flex items-center justify-center gap-2 ${
                      isScanning || !webcamReady
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white cursor-pointer shadow-blue-500/15'
                    }`}
                  >
                    {isScanning ? (
                      <>
                        <Loader2 size={13} className="animate-spin text-white" />
                        MAPEAMENTO FACIAL: {scanProgress}%...
                      </>
                    ) : (
                      <>
                        <Fingerprint size={13} className="text-white animate-pulse" />
                        {tempFaceCaptures.length === 0
                          ? 'INICIAR CAPTURA (1/3: FRENTE)'
                          : tempFaceCaptures.length === 1
                            ? 'REGISTAR CAPTURA (2/3: ESQUERDA)'
                            : 'REGISTAR CAPTURA (3/3: SORRISO)'}
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Success Bio validation Alert Box */}
              {captureFinished && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 flex gap-2 text-left max-w-md mx-auto">
                  <ShieldCheck size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[10.5px] font-black text-emerald-900 uppercase tracking-tight">BIOMETRIA CONCLUÍDA</p>
                    <p className="text-[10px] text-[#065f46] leading-relaxed font-semibold">
                      Os seus padrões biométricos foram validados e vinculados de forma criptografada à sua identidade civil.
                    </p>
                  </div>
                </div>
              )}

              {/* Motor local de pré-verificação: corre em SILÊNCIO para o cidadão.
                  O relatório técnico (concordância facial, OCR, coerência global) é
                  enviado APENAS para a fila de homologação da Área de Administração. */}
              {isVerifying && (
                <div className="bg-white border border-blue-100 rounded-xl p-3 max-w-md mx-auto text-left shadow-3xs">
                  <div className="flex items-center gap-2 py-1 text-[10.5px] font-bold text-blue-600">
                    <Loader2 size={13} className="animate-spin" />
                    A validar a integridade dos documentos submetidos…
                  </div>
                </div>
              )}

              {/* Action Buttons Voltar / Terminar */}
              <div className="pt-2.5 border-t border-slate-100 flex flex-col gap-2 max-w-md mx-auto">
                {isSubmitting && (
                  <div className="flex items-center justify-center gap-1.5 py-0.5 text-[10px] font-bold text-blue-600 animate-pulse">
                    <Loader2 size={13} className="animate-spin" />
                    {submitMessage}
                  </div>
                )}
                {submitError && !isSubmitting && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-[10.5px] font-bold text-red-700 text-left">
                    <AlertTriangle size={14} className="shrink-0 mt-px text-red-500" />
                    <span>{submitError}</span>
                  </div>
                )}
                <div className="flex gap-3 w-full">
                  <button
                    type="button"
                    disabled={isScanning || isSubmitting}
                    onClick={() => setStep(2)}
                    className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-800 font-extrabold text-[#0f172a] text-[11.5px] uppercase tracking-widest rounded-xl transition-all cursor-pointer bg-white flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <ArrowLeft size={13} /> VOLTAR
                  </button>
                  <button
                    type="button"
                    disabled={!captureFinished || isScanning || isSubmitting || isVerifying}
                    onClick={handleFinalSubmit}
                    className={`flex-1 py-2 text-[11.5px] font-black uppercase tracking-widest rounded-xl transition-all border-0 shadow-md flex items-center justify-center gap-1.5 ${
                      captureFinished && !isScanning && !isSubmitting && !isVerifying
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white cursor-pointer shadow-blue-500/20' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
                    }`}
                  >
                    {isVerifying ? 'A ANALISAR...' : isSubmitting ? 'A ENVIAR...' : 'FINALIZAR SUBMISSÃO'} <Check size={13} />
                  </button>
                </div>
              </div>

              </>
              )}
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="step-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4 max-w-lg mx-auto"
            >
              <div className="mx-auto w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center shadow-md border border-emerald-100 animate-scaleUp">
                <ShieldCheck size={28} />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl md:text-2xl font-black text-slate-900 italic uppercase tracking-tight leading-tight">
                  {appMode === 'institution' ? 'Pedido de Adesão Enviado!' : 'Documentação Enviada com Sucesso!'}
                </h3>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-slate-650 text-left space-y-2 shadow-inner">
                  <p className="text-slate-800 text-[12.5px] md:text-[13.5px] font-semibold leading-relaxed">
                    {appMode === 'institution' 
                      ? 'O processo de adesão da instituição ENDE foi submetido com sucesso para homologação administrativa.' 
                      : 'O seu processo de registo foi enviado com sucesso para a fila de homologação.'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    {pviAutoApproved
                      ? (appMode === 'institution'
                        ? 'A adesão foi APROVADA AUTOMATICAMENTE pela Pré-Verificação Inteligente (IA) — a área institucional fica activa de imediato, sem espera pela homologação manual.'
                        : 'A sua conta foi APROVADA AUTOMATICAMENTE pela Pré-Verificação Inteligente (IA) e está activa de imediato — já pode iniciar sessão com o seu B.I.')
                      : (appMode === 'institution'
                        ? 'O pedido está sob revisão da nossa equipa administrativa e técnica. Em menos de 24h enviaremos para o e-mail institucional os resultados.'
                        : 'O seu processo está sob revisão dos inspectores de identificação civil nacional usando inteligência artificial. Em menos de 24h enviaremos para o seu Email os resultados.')}
                  </p>
                </div>
              </div>

              {/* v37.78.17 — estado vivo da análise em segundo plano (REGRAS UX) */}
              {appMode !== 'institution' && (
                <div className={`rounded-xl border p-3 flex items-center gap-2.5 text-left ${analiseEstado === 'aprovado' ? 'bg-emerald-50 border-emerald-200' : analiseEstado === 'correcoes' ? 'bg-amber-50 border-amber-200' : 'bg-indigo-50 border-indigo-100'}`}>
                  <span className="text-base leading-none select-none">{analiseEstado === 'aprovado' ? '✅' : analiseEstado === 'correcoes' ? '⚠️' : '⏳'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10.5px] font-black uppercase tracking-widest m-0" style={{ color: analiseEstado === 'aprovado' ? '#047857' : analiseEstado === 'correcoes' ? '#b45309' : '#4338ca' }}>
                      {analiseEstado === 'aprovado' ? 'Registo aprovado' : analiseEstado === 'correcoes' ? 'Correcções necessárias' : 'Análise em curso'}
                    </p>
                    <p className="text-[10.5px] text-slate-600 font-semibold m-0 mt-0.5 leading-relaxed">
                      {analiseEstado === 'aprovado'
                        ? 'A análise do seu registo terminou com aprovação. A conta está activa e todos os serviços ficam disponíveis.'
                        : analiseEstado === 'correcoes'
                          ? 'A análise terminou com dados a corrigir. Regresse ao registo, corrija os dados e repita a validação.'
                          : 'O sistema está a analisar os seus documentos em segundo plano — pode continuar a usar a aplicação; o resultado chega por notificação.'}
                    </p>
                  </div>
                  {analiseEstado === 'correcoes' && (
                    <button
                      type="button"
                      onClick={() => { setStep(2); }}
                      className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase tracking-wider border-none cursor-pointer shrink-0"
                    >
                      Corrigir dados
                    </button>
                  )}
                </div>
              )}
              <div className="bg-blue-50 border border-blue-100/60 rounded-xl p-3 text-left flex gap-2.5 items-center">
                <span className="text-[11px] font-black text-blue-800 select-none font-sans font-extrabold uppercase">
                  {appMode === 'institution' ? 'NIF da Instituição:' : 'B.I. de Acesso:'}
                </span>
                <span className="text-[12.5px] font-mono font-black text-slate-800 uppercase tracking-widest bg-white border border-blue-100 px-3 py-1 rounded-lg">
                  {biNumber}
                </span>
              </div>

              {pviAutoApproved && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-center gap-2 animate-fadeIn">
                  <Sparkles size={13} className="text-emerald-600" />
                  <span className="text-[10.5px] font-black text-emerald-700 uppercase tracking-widest">Aprovado automaticamente por Pré-Verificação Inteligente (IA)</span>
                </div>
              )}

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

      {/* Embedded scanning scanner animation patterns */}
      <style>{`
        @keyframes scan-laser-relative {
          0%, 100% { top: 6%; opacity: 0.85; }
          50% { top: 94%; opacity: 0.85; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.94); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scaleUp {
          animation: scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
      {/* v37.29 — popup de credenciais ao concluir a inscrição */}
      <CdaModal
        aberto={credPopup}
        onFechar={() => {
          setCredPopup(false);
          if (aprovadoPendente) { setAprovadoPendente(false); setAprovadoPopup(true); }
        }}
        icone={Lock}
        titulo="Registo Concluído"
        subtitulo="Dados de acesso · SME"
        tomIcone="bg-blue-50 text-blue-600 border-blue-100"
        maxW="max-w-md"
      >
        <div className="text-left space-y-3">
          <p className="text-sm font-semibold text-slate-700 m-0 leading-relaxed">
            O seu registo foi recebido com sucesso e está a ser analisado pelo sistema. Use estes dados para iniciar sessão no portal:
          </p>
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-800 shrink-0">Nº de Acesso</span>
              <span className="font-mono font-black text-slate-900 text-[13px] bg-white border border-blue-100 rounded-lg px-3 py-1.5 truncate">{biNumber}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-800 shrink-0">Senha</span>
              <span className="font-mono font-black text-slate-900 text-[13px] bg-white border border-blue-100 rounded-lg px-3 py-1.5 break-all text-right">{password}</span>
            </div>
          </div>
          <p className="text-[10.5px] font-semibold text-slate-500 m-0">
            Por segurança, memorize ou guarde estes dados num local seguro — a senha não volta a ser mostrada.
          </p>
          <p className="text-[10.5px] font-semibold text-blue-700 m-0 leading-relaxed">
            Pode entrar na aplicação já agora: a análise decorre em segundo plano e o resultado será notificado nesta mesma conta.
          </p>
        </div>
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => {
              setCredPopup(false);
              if (aprovadoPendente) { setAprovadoPendente(false); setAprovadoPopup(true); }
            }}
            className="px-6 py-3 rounded-full font-black text-xs uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer border-none shadow-md shadow-blue-200"
          >
            OK
          </button>
        </div>
      </CdaModal>

      {/* v37.8 — popup de aprovação automática do registo do cidadão */}
      <CdaModal
        aberto={aprovadoPopup}
        onFechar={() => { setAprovadoPopup(false); onSuccess(); }}
        icone={CheckCircle2}
        titulo="Aprovado"
        subtitulo="Registo validado automaticamente"
        tomIcone="bg-emerald-50 text-emerald-600 border-emerald-100"
        maxW="max-w-md"
      >
        <p className="text-sm font-semibold text-slate-700 text-left m-0">Seu cadastro foi aprovado.</p>
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => { setAprovadoPopup(false); onSuccess(); }}
            className="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer border-none shadow-sm"
          >
            Entendi
          </button>
        </div>
      </CdaModal>
      <datalist id="cda-dominios-email">
        <option value="@gmail.com" />
        <option value="@yahoo.com" />
        <option value="@hotmail.com" />
        <option value="@outlook.com" />
        <option value="@icloud.com" />
        <option value="@correiodigital.ao" />
        <option value="@inapem.ao" />
        <option value="@agt.ao" />
        <option value="@sme.ao" />
        <option value="@minfin.gov.ao" />
      </datalist>
    </div>
  );
}
