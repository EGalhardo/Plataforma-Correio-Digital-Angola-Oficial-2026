import { supabase } from "../../lib/supabaseClient";
export class OcorrenciaRequestError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function ocorrenciasApi<T = any>(
  acao: string,
  data: Record<string, unknown> = {},
  signal?: AbortSignal,
): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token)
    throw new OcorrenciaRequestError(
      "Inicie sessão na nuvem para utilizar Ocorrências. As sessões de demonstração não enviam ocorrências reais.",
      401,
    );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 28000);
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  try {
    const r = await fetch("/api/ocorrencias", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ acao, ...data }),
      signal: controller.signal,
    });
    const result = await r.json().catch(() => null);
    if (!r.ok || !result?.ok)
      throw new OcorrenciaRequestError(
        result?.erro || "O serviço não respondeu. Tente novamente.",
        r.status,
      );
    return result as T;
  } catch (e) {
    if (e instanceof OcorrenciaRequestError) throw e;
    throw new OcorrenciaRequestError(
      "Não foi possível confirmar a operação. Verifique a ligação e tente novamente; não se perderam os dados deste formulário.",
      0,
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
/** Comprime fotografias no dispositivo; o servidor volta a validar e remove metadados. */
export async function prepararFotografia(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Utilize fotografias JPEG, PNG ou WebP.");
  if (file.size > 12 * 1024 * 1024)
    throw new Error("A fotografia original não pode exceder 12 MB.");
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("Não foi possível abrir esta fotografia.");
  });
  try {
    const factor = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * factor));
    canvas.height = Math.max(1, Math.round(bitmap.height * factor));
    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw new Error("O navegador não conseguiu preparar a fotografia.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    bitmap.close();
  }
}
