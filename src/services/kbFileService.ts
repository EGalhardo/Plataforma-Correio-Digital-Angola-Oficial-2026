// ============================================================================
// Carregamento de ficheiros na Base de Conhecimento — extração de texto
// ----------------------------------------------------------------------------
// A KB da IA lê o campo `texto` (o conteúdo que fundamenta as respostas).
// Este serviço permite ao utilizador carregar um ficheiro (PDF, DOCX, TXT) e
// extrai AUTOMATICAMENTE o texto para preencher esse campo — sem colar à mão.
// O ficheiro original é guardado no Supabase Storage (bucket kb_ficheiros) e a
// referência fica em fonte_url para consulta/auditoria.
//
// Bibliotecas (lazy — só carregam quando o utilizador usa o upload):
//   • pdfjs-dist — extração de PDF (worker via ?url do Vite);
//   • mammoth — extração de .docx (mammoth/mammoth.browser).
// ============================================================================

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
// @ts-ignore — mammoth.browser não tem tipos; API estável (extractRawText)
import mammoth from 'mammoth/mammoth.browser';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type KbFileTipo = 'pdf' | 'docx' | 'txt' | 'outro';

export interface KbFileExtraido {
  texto: string;
  tipo: KbFileTipo;
  aviso?: string;
}

/** Deteta o tipo pelo nome/extensão do ficheiro. */
export const detectarTipoFicheiro = (name: string): KbFileTipo => {
  const n = (name || '').toLowerCase();
  if (n.endsWith('.pdf')) return 'pdf';
  if (n.endsWith('.docx')) return 'docx';
  if (n.endsWith('.txt') || n.endsWith('.md')) return 'txt';
  return 'outro';
};

export const ROTULO_TIPO_FICHEIRO: Record<KbFileTipo, string> = {
  pdf: 'PDF',
  docx: 'Word (.docx)',
  txt: 'Texto (.txt/.md)',
  outro: 'Formato não suportado',
};

/** Extrai texto de um PDF (todas as páginas). */
const extrairTextoPdf = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const doc = await loadingTask.promise;
  const partes: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const linha = content.items
      .map((item: any) => (typeof item?.str === 'string' ? item.str : ''))
      .join(' ');
    partes.push(linha);
  }
  await doc.destroy().catch(() => {});
  return partes.join('\n').replace(/\s+/g, ' ').trim();
};

/** Extrai texto de um .docx (Word). */
const extrairTextoDocx = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  const result = await mammoth.extractRawText({ arrayBuffer });
  return (result.value || '').replace(/\s+/g, ' ').trim();
};

/** Extrai texto de um .txt/.md (UTF-8). */
const extrairTextoTxt = (arrayBuffer: ArrayBuffer): string =>
  new TextDecoder('utf-8').decode(arrayBuffer).replace(/\s+/g, ' ').trim();

/**
 * Extrai o texto de um ficheiro carregado. Devolve o texto (para preencher o
 * campo `texto` da KB) e o tipo. Formatos não suportados devolvem aviso.
 */
export const extrairTextoDeFicheiro = async (file: File): Promise<KbFileExtraido> => {
  const tipo = detectarTipoFicheiro(file.name);
  const arrayBuffer = await file.arrayBuffer();
  switch (tipo) {
    case 'pdf':
      return { texto: await extrairTextoPdf(arrayBuffer), tipo };
    case 'docx':
      return { texto: await extrairTextoDocx(arrayBuffer), tipo };
    case 'txt':
      return { texto: extrairTextoTxt(arrayBuffer), tipo };
    default:
      return { texto: '', tipo, aviso: 'Formato não suportado para extração automática (use PDF, Word ou TXT). Pode carregar o ficheiro na mesma — o conteúdo ficará disponível por ligação, mas cole o texto manualmente.' };
  }
};

/** Limita o texto extraído ao máximo da tabela (4000 chars), cortando em frase. */
export const limitarTextoKb = (texto: string, max = 4000): string => {
  const limpo = (texto || '').trim();
  if (limpo.length <= max) return limpo;
  const corte = limpo.slice(0, max);
  const ultimoPonto = corte.lastIndexOf('.');
  return ultimoPonto > max * 0.6 ? corte.slice(0, ultimoPonto + 1) : `${corte}…`;
};

/** Converte um File para base64 (data-URL) — usado no upload via servidor. */
export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const resultado = typeof reader.result === 'string' ? reader.result : '';
      // remove o prefixo "data:...;base64," — só o conteúdo base64
      const idx = resultado.indexOf(',');
      resolve(idx >= 0 ? resultado.slice(idx + 1) : resultado);
    };
    reader.onerror = () => reject(new Error('Falha ao ler o ficheiro.'));
    reader.readAsDataURL(file);
  });
