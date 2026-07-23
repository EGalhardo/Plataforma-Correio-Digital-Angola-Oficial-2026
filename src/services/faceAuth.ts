// ============================================================================
// Lógica facial partilhada — demo-local, por dispositivo/pessoa (F6)
// ----------------------------------------------------------------------------
// MESMA técnica usada no ecrã de login (assinatura 16×16 em tons de cinza,
// média de 3 capturas), extraída para ser partilhada:
//   · Página Conta/Perfil — REGISTO facial (após login), das 3 áreas;
//   · Página Login — apenas VERIFICAÇÃO (compara com o registo da Conta).
// É 100% demo: nada sai do dispositivo, não é biometria certificada.
// ============================================================================

export const FACE_MATCH_THRESHOLD = 22;

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

/** Assinatura 16×16 em tons de cinza — igual à usada no login. */
export const computeFaceSignature = (source: HTMLCanvasElement | HTMLVideoElement): number[] => {
  const temp = document.createElement('canvas');
  temp.width = 16;
  temp.height = 16;
  const ctx = temp.getContext('2d');
  if (!ctx) return [];
  ctx.drawImage(source as any, 0, 0, temp.width, temp.height);
  const { data } = ctx.getImageData(0, 0, temp.width, temp.height);
  const signature: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    signature.push(Math.round((data[i] + data[i + 1] + data[i + 2]) / 3));
  }
  return signature;
};

export const compareFaceSignatures = (a: number[], b: number[]): number => {
  if (!a.length || !b.length || a.length !== b.length) return 999;
  const totalDiff = a.reduce((sum, value, index) => sum + Math.abs(value - b[index]), 0);
  return totalDiff / a.length;
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

/** Assinatura simulada determinística (fallback sem câmara — demo). */
export const makeSimulatedSignature = (seed: number): number[] => {
  const out: number[] = [];
  let x = (seed || 7) % 2147483646 + 1;
  for (let i = 0; i < 256; i += 1) {
    x = (x * 48271) % 2147483647;
    out.push(60 + (x % 160));
  }
  return out;
};
