// v37.12 — tipagens globais de APIs vendor carregadas dinamicamente.
// Remove casts `as any` do código de funcionalidades SEM alterar comportamento:
// os membros continuam opcionais (ausência tratada pelos guards existentes).

interface PdfJsPageViewport {
  width: number;
  height: number;
}
interface PdfJsRenderTask {
  promise: Promise<void>;
}
interface PdfJsPage {
  getViewport: (p: { scale: number }) => PdfJsPageViewport;
  render: (p: { canvasContext: CanvasRenderingContext2D; viewport: PdfJsPageViewport }) => PdfJsRenderTask;
}
interface PdfJsDocument {
  numPages: number;
  getPage: (n: number) => Promise<PdfJsPage>;
}
interface PdfJsLib {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: string | { data: ArrayBuffer | Uint8Array }) => { promise: Promise<PdfJsDocument> };
}
interface JitsiMeetExternalAPIInstance {
  addEventListener?: (ev: string, cb: (...args: unknown[]) => void) => void;
  removeEventListener?: (ev: string, cb?: (...args: unknown[]) => void) => void;
  on: (ev: string, cb: (...args: unknown[]) => void) => void;
  off?: (ev: string, cb?: (...args: unknown[]) => void) => void;
  executeCommand?: (cmd: string, ...args: unknown[]) => void;
  getParticipantsInfo?: () => Array<unknown>;
  dispose?: () => void;
  isAudioMuted?: () => Promise<boolean>;
  isVideoMuted?: () => Promise<boolean>;
}

interface Window {
  /** Safari/legacy WebAudio */
  webkitAudioContext?: typeof AudioContext;
  /** pdf.js carregado via <script> (CDN) */
  pdfjsLib?: PdfJsLib;
  /** Jitsi External API carregada via <script> */
  JitsiMeetExternalAPI?: new (host: string, options: Record<string, unknown>) => JitsiMeetExternalAPIInstance;
}
