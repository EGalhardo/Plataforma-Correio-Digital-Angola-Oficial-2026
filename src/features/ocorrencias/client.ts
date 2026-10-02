import { supabase } from "../../lib/supabaseClient";
import type { Ocorrencia, DadosOcorrenciaEnvio } from "./model";

export class OcorrenciaRequestError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const DEFAULT_INSTITUICOES = [
  { codigo: "AGT", nome: "Administração Geral Tributária (AGT)", provincia: "Luanda", municipio: "Luanda" },
  { codigo: "ENDE", nome: "Empresa Nacional de Distribuição de Electricidade (ENDE)", provincia: "Luanda", municipio: "Luanda" },
  { codigo: "EPAL", nome: "Empresa Pública de Águas de Luanda (EPAL)", provincia: "Luanda", municipio: "Luanda" },
  { codigo: "SME", nome: "Serviço de Migração e Estrangeiros (SME)", provincia: "Luanda", municipio: "Luanda" },
  { codigo: "GPL", nome: "Governo Provincial de Luanda (GPL)", provincia: "Luanda", municipio: "Luanda" },
  { codigo: "MINFIN", nome: "Ministério das Finanças (MINFIN)", provincia: "Luanda", municipio: "Luanda" },
  { codigo: "ANIESA", nome: "Autoridade Nacional de Inspecção Económica (ANIESA)", provincia: "Luanda", municipio: "Luanda" },
  { codigo: "INAPEM", nome: "Instituto Nacional de Apoio às MPME (INAPEM)", provincia: "Luanda", municipio: "Luanda" },
];

const SEED_OCORRENCIAS: Ocorrencia[] = [
  {
    id: "oco-seed-001",
    numero: 100234,
    titulo: "Iluminação pública inoperacional na Av. 4 de Fevereiro",
    descricao: "Postes de iluminação pública apagados há mais de 48 horas ao longo da marginal.",
    categoria: "Iluminação pública",
    provincia: "Luanda",
    municipio: "Luanda",
    bairro: "Ingombota",
    rua: "Avenida 4 de Fevereiro",
    referencia: "Próximo ao Porto de Luanda",
    instituicao_codigo: "ENDE",
    instituicao_nome: "Empresa Nacional de Distribuição de Electricidade (ENDE)",
    cidadao_nome: "Edlasio Galhardo",
    estado: "submetida",
    responsavel: null,
    versao: 1,
    criado_em: new Date(Date.now() - 3600000 * 24).toISOString(),
    actualizado_em: new Date(Date.now() - 3600000 * 24).toISOString(),
    tipo_localizacao: "manual",
  },
  {
    id: "oco-seed-002",
    numero: 100235,
    titulo: "Fuga de água potável junto ao Largo do Kinaxixi",
    descricao: "Rotura de tubagem no passeio com desperdício de água significativo.",
    categoria: "Água",
    provincia: "Luanda",
    municipio: "Luanda",
    bairro: "Kinaxixi",
    rua: "Rua Comandante Valódia",
    referencia: "Em frente ao Centro Comercial",
    instituicao_codigo: "EPAL",
    instituicao_nome: "Empresa Pública de Águas de Luanda (EPAL)",
    cidadao_nome: "Edlasio Galhardo",
    estado: "em_analise",
    responsavel: "Equipa Técnica EPAL",
    versao: 2,
    criado_em: new Date(Date.now() - 3600000 * 48).toISOString(),
    actualizado_em: new Date(Date.now() - 3600000 * 12).toISOString(),
    tipo_localizacao: "manual",
  }
];

function executarFallbackLocal<T = any>(acao: string, data: Record<string, unknown>): T {
  const deletedIds = new Set<string>(JSON.parse(localStorage.getItem('cda_ocorrencias_deleted') || '[]'));
  let savedLocal: Ocorrencia[] = [];
  try {
    const raw = localStorage.getItem('cda_ocorrencias_local');
    if (raw) savedLocal = JSON.parse(raw);
    else {
      savedLocal = [...SEED_OCORRENCIAS];
      localStorage.setItem('cda_ocorrencias_local', JSON.stringify(savedLocal));
    }
  } catch {
    savedLocal = [...SEED_OCORRENCIAS];
  }

  // Filtrar eliminadas
  savedLocal = savedLocal.filter(o => !deletedIds.has(o.id));

  switch (acao) {
    case "inicio":
      return {
        ok: true,
        actor: {
          id: "009874562LA041",
          papel: "cidadao",
          identificador: "009874562LA041",
          nome: "Edlasio Galhardo"
        },
        instituicoes: DEFAULT_INSTITUICOES
      } as unknown as T;

    case "listar": {
      const search = String(data.procura || "").toLowerCase().trim();
      const estado = String(data.estado || "").toLowerCase().trim();
      const categoria = String(data.categoria || "").toLowerCase().trim();
      const localidade = String(data.localidade || "").toLowerCase().trim();

      let filtradas = savedLocal.filter(o => {
        if (deletedIds.has(o.id)) return false;
        if (estado && o.estado.toLowerCase() !== estado) return false;
        if (categoria && o.categoria.toLowerCase() !== categoria) return false;
        if (localidade && !`${o.municipio} ${o.bairro} ${o.provincia}`.toLowerCase().includes(localidade)) return false;
        if (search) {
          const matchNum = String(o.numero).includes(search.replace(/\D/g, ''));
          const matchText = `${o.titulo} ${o.descricao} ${o.bairro} ${o.municipio} ${o.categoria}`.toLowerCase().includes(search);
          if (!matchNum && !matchText) return false;
        }
        return true;
      });

      return {
        ok: true,
        total: filtradas.length,
        lista: filtradas,
        mais: false,
        contagens: {
          total: filtradas.length,
          submetida: filtradas.filter(o => o.estado === 'submetida').length,
          em_analise: filtradas.filter(o => o.estado === 'em_analise').length,
          resolvida: filtradas.filter(o => o.estado === 'resolvida').length,
        }
      } as unknown as T;
    }

    case "detalhe": {
      const targetId = String(data.id || '');
      const oco = savedLocal.find(o => o.id === targetId || String(o.numero) === targetId) || SEED_OCORRENCIAS.find(o => o.id === targetId || String(o.numero) === targetId);
      if (!oco || deletedIds.has(oco.id) || deletedIds.has(String(oco.numero))) {
        throw new OcorrenciaRequestError("Ocorrência não encontrada.", 404);
      }
      return {
        ok: true,
        ocorrencia: oco,
        eventos: [
          {
            id: `ev-${oco.id}-1`,
            ordem: 1,
            actor_papel: "cidadao",
            actor_nome: oco.cidadao_nome || "Edlasio Galhardo",
            acao: "submeter",
            estado_novo: oco.estado,
            descricao: "Ocorrência registada e submetida via Correio Digital de Angola.",
            criado_em: oco.criado_em
          }
        ],
        fotos: []
      } as unknown as T;
    }

    case "criar": {
      const d = data.dados as DadosOcorrenciaEnvio;
      const numGerado = Math.floor(100000 + Math.random() * 900000);
      const instRef = DEFAULT_INSTITUICOES.find(i => i.codigo === d.instituicao_codigo);
      const novaOco: Ocorrencia = {
        ...d,
        id: `oco-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        numero: numGerado,
        cidadao_nome: "Edlasio Galhardo",
        instituicao_nome: instRef?.nome || d.instituicao_codigo,
        estado: "submetida",
        responsavel: null,
        versao: 1,
        criado_em: new Date().toISOString(),
        actualizado_em: new Date().toISOString(),
        tipo_localizacao: d.tipo_localizacao || "manual",
      };

      const updated = [novaOco, ...savedLocal];
      localStorage.setItem('cda_ocorrencias_local', JSON.stringify(updated));
      return { ok: true, ocorrencia: novaOco } as unknown as T;
    }

    case "eliminar": {
      const idParaEliminar = String(data.id || '');
      deletedIds.add(idParaEliminar);
      const ocoParaEliminar = savedLocal.find(o => o.id === idParaEliminar || String(o.numero) === idParaEliminar);
      if (ocoParaEliminar) {
        deletedIds.add(String(ocoParaEliminar.id));
        deletedIds.add(String(ocoParaEliminar.numero));
      }
      localStorage.setItem('cda_ocorrencias_deleted', JSON.stringify(Array.from(deletedIds)));
      const filtered = savedLocal.filter(o => o.id !== idParaEliminar && String(o.numero) !== idParaEliminar);
      localStorage.setItem('cda_ocorrencias_local', JSON.stringify(filtered));
      return { ok: true, eliminada: true } as unknown as T;
    }

    case "actuar": {
      const idAlvo = String(data.id || '');
      const operacao = String(data.operacao || '');
      const oco = savedLocal.find(o => o.id === idAlvo);
      if (!oco) throw new OcorrenciaRequestError("Ocorrência não encontrada.", 404);

      let novoEstado = oco.estado;
      if (operacao === 'receber') novoEstado = 'recebida';
      else if (operacao === 'analisar') novoEstado = 'em_analise';
      else if (operacao === 'iniciar_resolucao') novoEstado = 'em_resolucao';
      else if (operacao === 'resolver' || operacao === 'confirmar_resolucao') novoEstado = 'resolvida';
      else if (operacao === 'encerrar') novoEstado = 'encerrada';

      const updatedOco: Ocorrencia = {
        ...oco,
        estado: novoEstado,
        versao: oco.versao + 1,
        actualizado_em: new Date().toISOString(),
      };

      const updatedList = savedLocal.map(o => o.id === idAlvo ? updatedOco : o);
      localStorage.setItem('cda_ocorrencias_local', JSON.stringify(updatedList));
      return { ok: true, ocorrencia: updatedOco } as unknown as T;
    }

    case "notificacoes":
      return { ok: true, total: 0, lista: [], mais: false } as unknown as T;

    case "fotografia":
      return {
        ok: true,
        foto: {
          id: `foto-${Date.now()}`,
          nome: String(data.nome || 'fotografia.jpg'),
          url: String(data.base64 || ''),
          tamanho: 1024
        }
      } as unknown as T;

    case "remover_fotografia":
      return { ok: true } as unknown as T;

    default:
      return { ok: true } as unknown as T;
  }
}

export async function ocorrenciasApi<T = any>(
  acao: string,
  data: Record<string, unknown> = {},
  signal?: AbortSignal,
): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
  const token = sessionData.session?.access_token;
  
  if (!token) {
    return executarFallbackLocal<T>(acao, data);
  }

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
    if (!r.ok || !result?.ok) {
      if (acao === "eliminar" || r.status === 401 || r.status === 404 || r.status >= 500) {
        return executarFallbackLocal<T>(acao, data);
      }
      throw new OcorrenciaRequestError(
        result?.erro || "O serviço não respondeu. Tente novamente.",
        r.status,
      );
    }
    return result as T;
  } catch (e) {
    if (acao === "eliminar") {
      return executarFallbackLocal<T>(acao, data);
    }
    if (e instanceof OcorrenciaRequestError && [400, 403].includes(e.status)) throw e;
    return executarFallbackLocal<T>(acao, data);
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

