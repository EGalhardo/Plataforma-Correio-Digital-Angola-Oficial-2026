// Motor de Pré-Verificação de Registo (100% local, no browser)
// Analisa os dados fornecidos no registo do cidadão ANTES da submissão:
//  - Correspondência facial: face recortada do B.I. vs. selfie da câmara (BlazeFace)
//  - OCR real do documento (Tesseract.js, PT) vs. campos digitados (nome / nº B.I.)
//  - Qualidade da imagem (nitidez Laplaciana, brilho, contraste, resolução)
//  - Coerência global ponderada → alimenta os scores reais da fila do Admin
// Toda a análise é defensiva: qualquer falha degrada para "indisponível" e
// NUNCA bloqueia o registo. Resultado = verificação preliminar, não certificada.

export interface FaceVerificationResult {
  attempted: boolean;
  faceFoundInDocument: boolean;
  faceFoundInSelfie: boolean;
  similarity: number | null;   // 0-100
  geometryScore: number | null; // 0-100
  method: string;
  error?: string;
}

export interface OcrVerificationResult {
  attempted: boolean;
  available: boolean;
  confidence: number;   // 0-100 (média do motor OCR)
  biFound: boolean;
  biScore: number;      // 0-100
  nameScore: number;    // 0-100
  score: number | null; // agregado 0-100
  snippet: string;
  error?: string;
}

export interface QualityResult {
  frontSharpnessScore: number | null;
  frontBrightness: number | null;
  frontResolution: string | null;
  selfieSharpnessScore: number | null;
  score: number;
}

export interface RegistrationVerificationReport {
  face: FaceVerificationResult;
  ocr: OcrVerificationResult;
  quality: QualityResult;
  coherenceScore: number;
  iaResult: 'Aprovado' | 'Revisão Administrativa' | 'Rejeitado';
  iaLabel: string;
  durationMs: number;
  errors: string[];
}

export interface RegistrationVerificationParams {
  frontImageDataUrl: string | null;
  selfieDataUrl: string | null;
  typedBi: string;
  typedName: string;
}

// ---------------------------------------------------------------------------
// Utilitários puros (testáveis em Node, sem dependências de browser)
// ---------------------------------------------------------------------------

export const normalizeLooseText = (input: string): string => {
  return (input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
};

// Percentagem de tokens do nome digitado encontrados no texto OCR (0-100)
export const fuzzyNameMatchScore = (typedName: string, ocrText: string): number => {
  const typedTokens = normalizeLooseText(typedName).split(' ').filter(t => t.length >= 3);
  if (typedTokens.length === 0) return 0;
  const ocrTokens = new Set(normalizeLooseText(ocrText).split(' '));
  const hits = typedTokens.filter(t => ocrTokens.has(t)).length;
  return Math.round((hits / typedTokens.length) * 100);
};

export const avgAbsDiff = (a: number[] | Uint8ClampedArray, b: number[] | Uint8ClampedArray): number => {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 255;
  let sum = 0;
  for (let i = 0; i < len; i++) sum += Math.abs(a[i] - b[i]);
  return sum / len;
};

export const scoreFromSharpnessVariance = (laplacianVariance: number): number => {
  // var < 80: muito desfocada | var >= 600: nítida
  return Math.max(0, Math.min(100, Math.round(laplacianVariance / 6)));
};

export const computeWeightedCoherence = (parts: { value: number | null; weight: number }[]): number => {
  const usable = parts.filter(p => p.value !== null && p.weight > 0) as { value: number; weight: number }[];
  if (usable.length === 0) return 50; // neutro: nada analisável não penaliza
  const totalW = usable.reduce((s, p) => s + p.weight, 0);
  const score = usable.reduce((s, p) => s + p.value * (p.weight / totalW), 0);
  return Math.round(score);
};

// ---------------------------------------------------------------------------
// Helpers de canvas (apenas browser; chamados dentro de try/catch)
// ---------------------------------------------------------------------------

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Falha ao carregar imagem para análise'));
    img.src = src;
  });
};

// Matriz de tons de cinza redimensionada (para nitidez e assinaturas)
const grayscaleMatrix = (img: CanvasImageSource, srcW: number, srcH: number, targetW = 160) => {
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, targetW / Math.max(1, srcW));
  canvas.width = Math.max(8, Math.round(srcW * scale));
  canvas.height = Math.max(8, Math.round(srcH * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponível');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const gray = new Uint8ClampedArray(canvas.width * canvas.height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
  }
  return { gray, width: canvas.width, height: canvas.height, canvas };
};

const laplacianVariance = (gray: Uint8ClampedArray, width: number, height: number): number => {
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - width] - gray[i + width];
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }
  if (count === 0) return 0;
  const mean = sum / count;
  return (sumSq - (sum * mean)) / count;
};

const meanBrightness = (gray: Uint8ClampedArray): number => {
  if (gray.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < gray.length; i++) sum += gray[i];
  return sum / gray.length;
};

// Recorta a região da face com margem e devolve assinatura 16x16 em tons de cinza
const faceSignatureFromCrop = (
  img: CanvasImageSource,
  box: { xMin: number; yMin: number; width: number; height: number }
): number[] => {
  const margin = 0.35;
  const cx = box.xMin - box.width * margin;
  const cy = box.yMin - box.height * margin;
  const cw = box.width * (1 + margin * 2);
  const ch = box.height * (1 + margin * 2);
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  ctx.drawImage(img, Math.max(0, cx), Math.max(0, cy), Math.max(1, cw), Math.max(1, ch), 0, 0, 16, 16);
  const { data } = ctx.getImageData(0, 0, 16, 16);
  const sig: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    sig.push(Math.round((data[i] + data[i + 1] + data[i + 2]) / 3));
  }
  return sig;
};

// ---------------------------------------------------------------------------
// IA carregada sob demanda (code-splitting: não pesa no bundle principal)
// ---------------------------------------------------------------------------

let blazeFacePromise: Promise<any> | null = null;
const ensureBlazeFace = async () => {
  if (!blazeFacePromise) {
    blazeFacePromise = (async () => {
      const tf = await import('@tensorflow/tfjs');
      try { await tf.setBackend('cpu'); } catch (_) { /* mantém backend por defeito */ }
      await tf.ready();
      const blazeface = await import('@tensorflow-models/blazeface');
      return blazeface.load();
    })();
    blazeFacePromise.catch(() => { blazeFacePromise = null; });
  }
  return blazeFacePromise;
};

const detectLargestFace = async (detector: any, imgEl: HTMLImageElement) => {
  const predictions = await detector.estimateFaces(imgEl, false);
  if (!predictions || predictions.length === 0) return null;
  // maior caixa = face principal do documento/retrato
  const sorted = [...predictions].sort((a: any, b: any) =>
    (b.bottomRight[0] - b.topLeft[0]) * (b.bottomRight[1] - b.topLeft[1]) -
    (a.bottomRight[0] - a.topLeft[0]) * (a.bottomRight[1] - a.topLeft[1])
  );
  const p = sorted[0];
  const xMin = p.topLeft[0];
  const yMin = p.topLeft[1];
  return {
    box: { xMin, yMin, width: p.bottomRight[0] - xMin, height: p.bottomRight[1] - yMin },
    landmarks: (p.landmarks || []) as number[][]
  };
};

// Pontos BlazeFace: [olho dir, olho esq, nariz, boca, orelha dir, orelha esq]
const geometryRatioScore = (landA: number[][], landB: number[][]): number | null => {
  if (!landA || !landB || landA.length < 4 || landB.length < 4) return null;
  const ratios = (l: number[][]) => {
    const dist = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1]);
    const eyes = dist(l[0], l[1]);
    const mouth = l[3];
    const eyesMid = [(l[0][0] + l[1][0]) / 2, (l[0][1] + l[1][1]) / 2];
    const eyeMouth = dist(eyesMid, mouth);
    const nose = l[2];
    const noseToEyes = dist(nose, eyesMid);
    if (eyes === 0) return null;
    return [eyeMouth / eyes, noseToEyes / eyes];
  };
  const ra = ratios(landA);
  const rb = ratios(landB);
  if (!ra || !rb) return null;
  const diff = (Math.abs(ra[0] - rb[0]) + Math.abs(ra[1] - rb[1])) / 2;
  // diferença 0 → 100; diferença >= 0.6 → 0
  return Math.max(0, Math.min(100, Math.round(100 - (diff / 0.6) * 100)));
};

let tesseractWorkerPromise: Promise<any> | null = null;
const ensureTesseractWorker = async () => {
  if (!tesseractWorkerPromise) {
    tesseractWorkerPromise = (async () => {
      const Tesseract = await import('tesseract.js');
      const worker = await (Tesseract as any).createWorker('por');
      return worker;
    })();
    tesseractWorkerPromise.catch(() => { tesseractWorkerPromise = null; });
  }
  return tesseractWorkerPromise;
};

/**
 * Pré-aquecimento do motor: dispara o carregamento dos modelos de IA em
 * segundo plano (BlazeFace + worker OCR/Tesseract) ANTES de a verificação ser
 * pedida. Chamado pelo RegisterStepper logo que o primeiro documento é anexado;
 * quando o utilizador termina a captura biométrica, a análise arranca num
 * instante. Totalmente tolerante a falhas (a verificação real continua a
 * funcionar e a repetir a inicialização se necessário).
 */
export const prewarmVerificationEngine = (): void => {
  try { void ensureBlazeFace().catch(() => { /* ignorado */ }); } catch (_) { /* ignorado */ }
  try { void ensureTesseractWorker().catch(() => { /* ignorado */ }); } catch (_) { /* ignorado */ }
};

// Pré-processamento: escala + cinza + contraste para melhorar OCR do B.I.
const preprocessForOcr = (img: HTMLImageElement): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  // teto de 1800px: fotos grandes de telemóvel (ex.: 4000x3000) eram processadas
  // na resolução total, tornando o OCR várias vezes mais lento sem ganho real.
  const maxDim = Math.max(img.naturalWidth, img.naturalHeight);
  let scale = Math.min(2, Math.max(1, 1400 / Math.max(1, img.naturalWidth)));
  if (maxDim * scale > 1800) scale = 1800 / maxDim;
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;
  const contrast = 1.35;
  for (let i = 0; i < d.length; i += 4) {
    const g = Math.round((d[i] + d[i + 1] + d[i + 2]) / 3);
    const adj = Math.max(0, Math.min(255, Math.round((g - 128) * contrast + 128)));
    d[i] = d[i + 1] = d[i + 2] = adj;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

// ---------------------------------------------------------------------------
// Ponto de entrada principal
// ---------------------------------------------------------------------------

export const runRegistrationVerification = async (
  params: RegistrationVerificationParams
): Promise<RegistrationVerificationReport> => {
  const startedAt = Date.now();
  const errors: string[] = [];

  const face: FaceVerificationResult = {
    attempted: false, faceFoundInDocument: false, faceFoundInSelfie: false,
    similarity: null, geometryScore: null, method: 'BlazeFace local + assinatura normalizada (preliminar)'
  };
  const ocr: OcrVerificationResult = {
    attempted: false, available: false, confidence: 0, biFound: false,
    biScore: 0, nameScore: 0, score: null, snippet: ''
  };
  const quality: QualityResult = {
    frontSharpnessScore: null, frontBrightness: null, frontResolution: null,
    selfieSharpnessScore: null, score: 50
  };

  let frontImg: HTMLImageElement | null = null;
  let selfieImg: HTMLImageElement | null = null;

  // Modelos de IA arrancam IMEDIATAMENTE em paralelo com a leitura das imagens
  // (promessas em cache no módulo — chamadas repetidas são instantâneas)
  void ensureBlazeFace().catch(() => { /* a etapa facial trata os erros */ });
  void ensureTesseractWorker().catch(() => { /* a etapa OCR trata os erros */ });
  await Promise.all([
    (async () => {
      try { if (params.frontImageDataUrl) frontImg = await loadImage(params.frontImageDataUrl); } catch (e) { errors.push('falha ao ler imagem da frente do B.I.'); }
    })(),
    (async () => {
      try { if (params.selfieDataUrl) selfieImg = await loadImage(params.selfieDataUrl); } catch (e) { errors.push('falha ao ler a selfie'); }
    })(),
  ]);

  // ---- Qualidade (nitidez/brilho/resolução) — sempre executa se houver imagem
  try {
    if (frontImg) {
      const g = grayscaleMatrix(frontImg, frontImg.naturalWidth, frontImg.naturalHeight);
      const variance = laplacianVariance(g.gray, g.width, g.height);
      quality.frontSharpnessScore = scoreFromSharpnessVariance(variance);
      quality.frontBrightness = Math.round(meanBrightness(g.gray));
      quality.frontResolution = `${frontImg.naturalWidth}x${frontImg.naturalHeight}`;
    }
    if (selfieImg) {
      const gs = grayscaleMatrix(selfieImg, selfieImg.naturalWidth, selfieImg.naturalHeight, 96);
      quality.selfieSharpnessScore = scoreFromSharpnessVariance(laplacianVariance(gs.gray, gs.width, gs.height));
    }
    const qParts: number[] = [];
    if (quality.frontSharpnessScore !== null) qParts.push(quality.frontSharpnessScore);
    if (quality.selfieSharpnessScore !== null) qParts.push(quality.selfieSharpnessScore);
    const brightnessPenalty = quality.frontBrightness !== null && (quality.frontBrightness < 45 || quality.frontBrightness > 220) ? 20 : 0;
    quality.score = qParts.length
      ? Math.max(0, Math.min(100, Math.round(qParts.reduce((s, v) => s + v, 0) / qParts.length) - brightnessPenalty))
      : 50;
  } catch (e) {
    errors.push('análise de qualidade indisponível');
  }

  // ---- Correspondência facial (BlazeFace) e OCR do documento EM PARALELO:
  // o OCR executa dentro de um web worker (thread de fundo) enquanto a
  // inferência facial corre na thread principal — o tempo total passa a ser
  // ≈ o mais lento dos dois, em vez da soma de ambos.
  const faceTask = (async () => {
    try {
      if (frontImg && selfieImg) {
        face.attempted = true;
        const detector = await ensureBlazeFace();
        const docFace = await detectLargestFace(detector, frontImg);
        const selfieFace = await detectLargestFace(detector, selfieImg);
        face.faceFoundInDocument = !!docFace;
        face.faceFoundInSelfie = !!selfieFace;

        if (docFace && selfieFace) {
          const sigDoc = faceSignatureFromCrop(frontImg, docFace.box);
          const sigSelfie = faceSignatureFromCrop(selfieImg, selfieFace.box);
          const pixelScore = Math.max(0, Math.min(100, Math.round(100 - avgAbsDiff(sigDoc, sigSelfie) * 2)));
          const geo = geometryRatioScore(docFace.landmarks, selfieFace.landmarks);
          face.geometryScore = geo;
          face.similarity = geo !== null ? Math.round(pixelScore * 0.6 + geo * 0.4) : pixelScore;
        } else {
          if (!docFace) errors.push('nenhuma face detetada na foto do documento');
          if (!selfieFace) errors.push('nenhuma face detetada na selfie (câmara virtual?)');
        }
      }
    } catch (e: any) {
      face.error = e?.message || 'motor facial indisponível';
      errors.push('comparação facial indisponível neste dispositivo/rede');
    }
  })();

  // ---- OCR real do documento (Tesseract.js, PT)
  const ocrTask = (async () => {
    try {
      if (frontImg) {
        ocr.attempted = true;
        const worker = await ensureTesseractWorker();
        const prepared = preprocessForOcr(frontImg);
        const { data } = await worker.recognize(prepared);
        const text: string = data?.text || '';
        ocr.available = text.trim().length > 0;
        ocr.confidence = Math.round(data?.confidence || 0);
        // fix: regex de whitespace corrigida (\s em vez de \\s escapado a dobrar,
        // que impedia a compactação do texto e anulava a deteção do BI)
        ocr.snippet = text.replace(/\s+/g, ' ').trim().slice(0, 120);

        if (ocr.available) {
          const biNorm = (params.typedBi || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
          const ocrCompact = normalizeLooseText(text).replace(/\s+/g, '');
          ocr.biFound = biNorm.length > 0 && ocrCompact.includes(biNorm);
          ocr.biScore = ocr.biFound ? 100 : 0;
          ocr.nameScore = fuzzyNameMatchScore(params.typedName, text);
          ocr.score = Math.round(ocr.confidence * 0.2 + ocr.biScore * 0.35 + ocr.nameScore * 0.45);
        }
      }
    } catch (e: any) {
      ocr.error = e?.message || 'motor OCR indisponível';
      errors.push('OCR indisponível neste dispositivo/rede');
    }
  })();

  await Promise.all([faceTask, ocrTask]);

  // ---- Coerência global ponderada
  const coherenceScore = computeWeightedCoherence([
    { value: face.similarity, weight: 0.45 },
    { value: ocr.score, weight: 0.25 },
    { value: quality.score, weight: 0.20 },
    { value: ocr.attempted && ocr.available ? ocr.biScore : null, weight: 0.10 },
  ]);

  const iaResult: RegistrationVerificationReport['iaResult'] =
    coherenceScore >= 85 ? 'Aprovado' : coherenceScore >= 55 ? 'Revisão Administrativa' : 'Rejeitado';
  const iaLabel =
    iaResult === 'Aprovado' ? 'Aprovado na pré-verificação' :
    iaResult === 'Revisão Administrativa' ? 'Requer revisão humana' : 'Sinal de risco detetado';

  return {
    face, ocr, quality, coherenceScore, iaResult, iaLabel,
    durationMs: Date.now() - startedAt,
    errors
  };
};
