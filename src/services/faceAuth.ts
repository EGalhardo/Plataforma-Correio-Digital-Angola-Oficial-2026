// ============================================================================
// Lógica facial avançada — demo-local com Alinhamento, Equalização e Sobel (F6/CDA 2026)
// ----------------------------------------------------------------------------
// 1. Deteção, Recorte e Alinhamento Automático do Rosto (BlazeFace lazy-loaded)
// 2. Equalização de Iluminação (normalização de luminância média 128, stddev 64)
// 3. Assinatura Geométrica de Alta Resolução 32x32 (1024 cinza + 1024 gradientes Sobel = 2048 pontos)
// 4. Retrocompatibilidade perfeita: compara assinaturas novas (2048) com templates legados (256) via downsample.
// ============================================================================

export const FACE_MATCH_THRESHOLD = 26;

export interface FaceTemplate {
  identifier: string;
  profileMode: string;
  displayName?: string;
  capturedAt: string;
  imageDataUrl?: string;
  signature: number[];
  signatures?: number[][];
}

export const normalizeFacePersonId = (personId?: string): string =>
  (personId || 'anon').toUpperCase().replace(/\s+/g, '');

export const buildFaceStorageKey = (mode: string, personId: string): string =>
  `cda_demo_face_${mode}_${normalizeFacePersonId(personId)}`;

/** Normalização de luminância e alongamento de contraste para estabilidade contra luz fraca/forte. */
export const normalizeIllumination = (gray: number[]): number[] => {
  if (!gray.length) return [];
  const mean = gray.reduce((sum, val) => sum + val, 0) / gray.length;
  const variance = gray.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / gray.length;
  const stddev = Math.sqrt(variance) || 1;
  return gray.map(val => {
    const norm = Math.round(128 + ((val - mean) / stddev) * 50);
    return Math.min(255, Math.max(0, norm));
  });
};

/** Cálculo de Gradientes de Borda (Sobel / HOG simplificado) para priorizar contornos faciais (olhos, nariz, maxilar). */
export const computeSobelGradients = (gray: number[], width: number, height: number): number[] => {
  const gradients: number[] = new Array(width * height).fill(0);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const tl = gray[(y - 1) * width + (x - 1)] || 0;
      const tc = gray[(y - 1) * width + x] || 0;
      const tr = gray[(y - 1) * width + (x + 1)] || 0;
      const ml = gray[y * width + (x - 1)] || 0;
      const mr = gray[y * width + (x + 1)] || 0;
      const bl = gray[(y + 1) * width + (x - 1)] || 0;
      const bc = gray[(y + 1) * width + x] || 0;
      const br = gray[(y + 1) * width + (x + 1)] || 0;

      const gx = -tl + tr - 2 * ml + 2 * mr - bl + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
      const mag = Math.min(255, Math.round(Math.sqrt(gx * gx + gy * gy) / 4));
      gradients[y * width + x] = mag;
    }
  }
  return gradients;
};

/** Deteção e corte centralizado do rosto com margem de 10% (suporta bounding box do BlazeFace ou fallback 70%). */
export const extractCenteredCanvas = (
  source: HTMLCanvasElement | HTMLVideoElement,
  bbox?: [number, number, number, number]
): HTMLCanvasElement => {
  const temp = document.createElement('canvas');
  const targetSize = 32;
  temp.width = targetSize;
  temp.height = targetSize;
  const ctx = temp.getContext('2d');
  if (!ctx) return temp;

  const srcWidth = (source as any).videoWidth || source.width || 300;
  const srcHeight = (source as any).videoHeight || source.height || 300;

  if (bbox && bbox.length === 4) {
    const [xMin, yMin, xMax, yMax] = bbox;
    const bw = xMax - xMin;
    const bh = yMax - yMin;
    const marginX = bw * 0.1;
    const marginY = bh * 0.1;
    const sx = Math.max(0, Math.floor(xMin - marginX));
    const sy = Math.max(0, Math.floor(yMin - marginY));
    const sw = Math.min(srcWidth - sx, Math.ceil(bw + marginX * 2));
    const sh = Math.min(srcHeight - sy, Math.ceil(bh + marginY * 2));
    if (sw > 0 && sh > 0) {
      ctx.drawImage(source as any, sx, sy, sw, sh, 0, 0, targetSize, targetSize);
      return temp;
    }
  }

  // Fallback: Corte central 70%
  const cropSize = Math.min(srcWidth, srcHeight) * 0.7;
  const sx = Math.max(0, Math.floor((srcWidth - cropSize) / 2));
  const sy = Math.max(0, Math.floor((srcHeight - cropSize) / 2));
  ctx.drawImage(source as any, sx, sy, cropSize, cropSize, 0, 0, targetSize, targetSize);
  return temp;
};

/** Assinatura de Alta Resolução (32x32 = 1024 pontos de cinza equalizado + 1024 gradientes Sobel = vetor de 2048 pontos). */
export const computeFaceSignatureFromCanvas = (canvas32: HTMLCanvasElement): number[] => {
  const ctx = canvas32.getContext('2d');
  if (!ctx) return [];
  const { data } = ctx.getImageData(0, 0, canvas32.width, canvas32.height);
  const gray: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    gray.push(Math.round((data[i] + data[i + 1] + data[i + 2]) / 3));
  }
  const equalized = normalizeIllumination(gray);
  const gradients = computeSobelGradients(equalized, canvas32.width, canvas32.height);
  return [...equalized, ...gradients];
};

/** Assinatura síncrona (corte central + equalização + gradientes Sobel). */
export const computeFaceSignature = (source: HTMLCanvasElement | HTMLVideoElement): number[] => {
  const canvas32 = extractCenteredCanvas(source);
  return computeFaceSignatureFromCanvas(canvas32);
};

/**
 * v37.78.41 — CACHE DO DETECTOR BLAZEFACE. Antes cada chamada de
 * computeFaceSignatureAsync fazia `import` + `blazeface.load()` — o que
 * descobre/baixa os pesos do modelo A CADA CAPTURA (3× no registo + 1× no
 * login = segundos de espera em cada uso, a causa principal da lentidão
 * relatada pelo dono). Agora o modelo carrega UMA vez por sessão.
 * A falha também fica cacheada durante a sessão: assim o registo e o login
 * usam SEMPRE o mesmo caminho (modelo ou corte central) e as assinaturas
 * ficam comparáveis entre si.
 */
type BlazefaceLike = { estimateFaces: (img: unknown, returnTensors?: boolean) => Promise<unknown[]> };
let blazefaceModelPromise: Promise<BlazefaceLike | null> | null = null;
const getBlazefaceModel = (): Promise<BlazefaceLike | null> => {
  if (!blazefaceModelPromise) {
    blazefaceModelPromise = (async () => {
      try {
        const blazeface = await import('@tensorflow-models/blazeface');
        return (await blazeface.load()) as BlazefaceLike;
      } catch (e) {
        console.warn('[FACE-AUTH] BlazeFace indisponível nesta sessão (sem rede/modelo) — será usado o corte central:', e);
        return null;
      }
    })();
  }
  return blazefaceModelPromise;
};

/** Pré-aquece o detector (chamar quando a câmara abre, em fundo, sem bloquear). */
export const warmUpFaceDetector = async (): Promise<boolean> => !!(await getBlazefaceModel());

/** Assinatura assíncrona inteligente: aciona o modelo leve BlazeFace sob demanda para centralizar o rosto perfeitamente. */
export const computeFaceSignatureAsync = async (
  source: HTMLCanvasElement | HTMLVideoElement
): Promise<number[]> => {
  try {
    const model = await getBlazefaceModel();
    if (model) {
      const preds = (await model.estimateFaces(source, false)) as Array<{ topLeft?: [number, number]; bottomRight?: [number, number] }>;
      if (preds && preds.length > 0) {
        const face = preds[0];
        const topLeft = face.topLeft;
        const bottomRight = face.bottomRight;
        if (topLeft && bottomRight) {
          const bbox: [number, number, number, number] = [
            topLeft[0],
            topLeft[1],
            bottomRight[0],
            bottomRight[1]
          ];
          const canvas32 = extractCenteredCanvas(source, bbox);
          return computeFaceSignatureFromCanvas(canvas32);
        }
      }
    }
  } catch (e) {
    console.warn('[FACE-AUTH] BlazeFace indisponível, fallback para corte central:', e);
  }
  return computeFaceSignature(source);
};

/** Comparação vetorial de assinaturas faciais com retrocompatibilidade para moldes legados de 256 pontos (16x16). */
export const compareFaceSignatures = (a: number[], b: number[]): number => {
  if (!a || !b || !a.length || !b.length) return 999;
  if (a.length === b.length) {
    const totalDiff = a.reduce((sum, value, index) => sum + Math.abs(value - b[index]), 0);
    return totalDiff / a.length;
  }
  // Retrocompatibilidade automática: se um for 2048 (32x32 + sobel) e outro 256 (16x16 legado),
  // fazemos downsample dos 1024 primeiros pontos de cinza para 16x16 e comparamos
  const longSig = a.length > b.length ? a : b;
  const shortSig = a.length > b.length ? b : a;
  if (longSig.length >= 1024 && shortSig.length === 256) {
    const downsampled: number[] = [];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const idx1 = (y * 2) * 32 + (x * 2);
        const idx2 = idx1 + 1;
        const idx3 = (y * 2 + 1) * 32 + (x * 2);
        const idx4 = idx3 + 1;
        const avg = Math.round((longSig[idx1] + longSig[idx2] + longSig[idx3] + longSig[idx4]) / 4);
        downsampled.push(avg);
      }
    }
    const totalDiff = downsampled.reduce((sum, val, idx) => sum + Math.abs(val - shortSig[idx]), 0);
    return totalDiff / 256;
  }
  return 999;
};

/** Melhor distância contra as assinaturas registadas (999 = sem template). */
export const bestFaceDistance = (signature: number[], template: FaceTemplate | null): number => {
  if (!template) return 999;
  if (template.signatures && Array.isArray(template.signatures) && template.signatures.length) {
    return Math.min(...template.signatures.map(sig => compareFaceSignatures(signature, sig)));
  }
  if (template.signature) return compareFaceSignatures(signature, template.signature);
  return 999;
};

export const readFaceTemplate = (storageKey: string): FaceTemplate | null => {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as FaceTemplate) : null;
  } catch { return null; }
};

/**
 * v37.78.40 — inventário de TODAS as matrizes faciais guardadas neste
 * dispositivo (localStorage do navegador). O login facial usa isto para:
 *   (a) encontrar o registo quando a identidade foi registada noutra área
 *       (ex.: registou como Cidadão e abriu a área Institucional/Admin);
 *   (b) validar o rosto contra todos os registos locais quando o campo de
 *       identidade está vazio — «entrar apenas com o rosto»;
 *   (c) listar ao utilizador QUEM tem registo facial guardado no dispositivo.
 */
export interface DeviceFaceRecord {
  key: string;
  mode: string;        // 'user' | 'institution' | 'admin'
  identifier: string;  // BI / Nº Agente normalizado
  template: FaceTemplate;
}

export const listDeviceFaceTemplates = (): DeviceFaceRecord[] => {
  const out: DeviceFaceRecord[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('cda_demo_face_')) continue;
      const m = key.match(/^cda_demo_face_([a-z]+)_(.+)$/i);
      if (!m) continue;
      try {
        const template = readFaceTemplate(key);
        if (template && (Array.isArray(template.signatures) || Array.isArray(template.signature))) {
          out.push({ key, mode: m[1].toLowerCase(), identifier: m[2], template });
        }
      } catch { /* registo corrompido — ignorar */ }
    }
  } catch { /* armazenamento indisponível */ }
  return out;
};

/** Rótulo humano da área para mensagens ao utilizador. */
export const faceModeLabel = (mode: string): string =>
  mode === 'institution' ? 'Institucional' : mode === 'admin' ? 'Administração' : 'Cidadão';


/** Assinatura simulada determinística de alta resolução (2048 pontos) para o modo sem câmara. */
export const makeSimulatedSignature = (seed: number): number[] => {
  const out: number[] = [];
  let x = (seed || 7) % 2147483646 + 1;
  for (let i = 0; i < 2048; i += 1) {
    x = (x * 48271) % 2147483647;
    out.push(60 + (x % 160));
  }
  return out;
};
