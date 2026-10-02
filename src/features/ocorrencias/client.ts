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
    capa_url: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&auto=format&fit=crop&q=80",
    capa_nome: "av_4_fevereiro_iluminacao.jpg",
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
    capa_url: "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=800&auto=format&fit=crop&q=80",
    capa_nome: "rotura_tubagem_kinaxixi.jpg",
    criado_em: new Date(Date.now() - 3600000 * 48).toISOString(),
    actualizado_em: new Date(Date.now() - 3600000 * 12).toISOString(),
    tipo_localizacao: "manual",
  }
];

function detectCurrentActor(): { id: string; papel: "cidadao" | "instituicao"; identificador: string; nome: string; instituicao?: string } {
  let isInst = false;
  if (typeof window !== 'undefined') {
    const loc = window.location.pathname + window.location.hash;
    if (loc.includes('institucional')) {
      isInst = true;
    }
  }
  if (isInst) {
    return {
      id: "inst-agt-001",
      papel: "instituicao",
      identificador: "AGT-9921-SR",
      instituicao: "AGT",
      nome: "Administração Geral Tributária (AGT)"
    };
  }
  return {
    id: "009874562LA041",
    papel: "cidadao",
    identificador: "009874562LA041",
    nome: "Edlasio Galhardo"
  };
}

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
        actor: detectCurrentActor(),
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

      // Eventos
      const eventKey = `cda_ocorrencias_events_${oco.id}`;
      let eventos: any[] = [];
      try {
        const rawEv = localStorage.getItem(eventKey);
        if (rawEv) eventos = JSON.parse(rawEv);
      } catch {}
      if (!eventos.length) {
        eventos = [
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
        ];
      }

      // Fotos
      const photoKey = `cda_ocorrencias_photos_${oco.id}`;
      let fotos: any[] = [];
      try {
        const rawPhotos = localStorage.getItem(photoKey) || localStorage.getItem(`cda_ocorrencias_photos_${oco.numero}`);
        if (rawPhotos) fotos = JSON.parse(rawPhotos);
      } catch {}

      if (!fotos.length && oco.capa_url) {
        fotos = [{
          id: `foto-${oco.id}-capa`,
          nome: oco.capa_nome || 'fotografia.jpg',
          url: oco.capa_url,
          tamanho: 102400
        }];
      }

      return {
        ok: true,
        ocorrencia: oco,
        eventos,
        fotos,
        maisHistorico: false
      } as unknown as T;
    }

    case "criar": {
      const d = data.dados as DadosOcorrenciaEnvio;
      const numGerado = Math.floor(100000 + Math.random() * 900000);
      const instRef = DEFAULT_INSTITUICOES.find(i => i.codigo === d.instituicao_codigo);
      const photosList = Array.isArray(data.photosList) ? data.photosList : (Array.isArray(data.fotosObj) ? data.fotosObj : []);
      const capaUrl = photosList.length > 0 ? (photosList[0].url || photosList[0].base64 || null) : null;
      const capaNome = photosList.length > 0 ? (photosList[0].nome || 'fotografia.jpg') : null;

      const novaOco: Ocorrencia = {
        ...d,
        id: `oco-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        numero: numGerado,
        cidadao_nome: "Edlasio Galhardo",
        instituicao_nome: instRef?.nome || d.instituicao_codigo,
        estado: "submetida",
        responsavel: null,
        capa_url: capaUrl,
        capa_nome: capaNome,
        versao: 1,
        criado_em: new Date().toISOString(),
        actualizado_em: new Date().toISOString(),
        tipo_localizacao: d.tipo_localizacao || "manual",
      };

      if (photosList.length > 0) {
        try {
          localStorage.setItem(`cda_ocorrencias_photos_${novaOco.id}`, JSON.stringify(photosList));
          localStorage.setItem(`cda_ocorrencias_photos_${novaOco.numero}`, JSON.stringify(photosList));
        } catch {}
      }

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
      const oco = savedLocal.find(o => o.id === idAlvo || String(o.numero) === idAlvo);
      if (!oco) throw new OcorrenciaRequestError("Ocorrência não encontrada.", 404);

      let novoEstado = oco.estado;
      if (operacao === 'receber') novoEstado = 'recebida';
      else if (operacao === 'analisar') novoEstado = 'em_analise';
      else if (operacao === 'iniciar_resolucao') novoEstado = 'em_resolucao';
      else if (operacao === 'resolver' || operacao === 'confirmar_resolucao') novoEstado = 'resolvida';
      else if (operacao === 'encerrar') novoEstado = 'encerrada';
      else if (operacao === 'pedir_esclarecimento') novoEstado = 'aguarda_informacao';
      else if (operacao === 'solicitar_reabertura') novoEstado = 'reabertura_solicitada';
      else if (operacao === 'encaminhar') novoEstado = 'encaminhada';

      const dados = (data.dados || {}) as Record<string, string>;
      let novoResponsavel = oco.responsavel;
      if (operacao === 'atribuir' && dados.responsavel) {
        novoResponsavel = dados.responsavel;
      }
      let novaInstCodigo = oco.instituicao_codigo;
      let novaInstNome = oco.instituicao_nome;
      if (operacao === 'encaminhar' && dados.instituicao_codigo) {
        novaInstCodigo = dados.instituicao_codigo;
        const instRef = DEFAULT_INSTITUICOES.find(i => i.codigo === dados.instituicao_codigo);
        novaInstNome = instRef?.nome || dados.instituicao_codigo;
      }

      const updatedOco: Ocorrencia = {
        ...oco,
        estado: novoEstado,
        responsavel: novoResponsavel,
        instituicao_codigo: novaInstCodigo,
        instituicao_nome: novaInstNome,
        versao: (oco.versao || 1) + 1,
        actualizado_em: new Date().toISOString(),
      };

      const updatedList = savedLocal.map(o => (o.id === idAlvo || String(o.numero) === idAlvo) ? updatedOco : o);
      localStorage.setItem('cda_ocorrencias_local', JSON.stringify(updatedList));

      // Guardar evento no histórico
      const eventKey = `cda_ocorrencias_events_${oco.id}`;
      let eventosExistentes: any[] = [];
      try {
        const rawEv = localStorage.getItem(eventKey);
        if (rawEv) eventosExistentes = JSON.parse(rawEv);
      } catch {}
      const novoEvento = {
        id: `ev-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        ordem: eventosExistentes.length + 1,
        actor_papel: 'instituicao',
        actor_nome: dados.responsavel || 'Agente Institucional',
        acao: operacao,
        estado_anterior: oco.estado,
        estado_novo: novoEstado,
        descricao: dados.descricao || dados.responsavel || 'Actualização de estado da ocorrência.',
        destino_codigo: dados.instituicao_codigo || undefined,
        criado_em: new Date().toISOString()
      };
      eventosExistentes.unshift(novoEvento);
      try {
        localStorage.setItem(eventKey, JSON.stringify(eventosExistentes));
        localStorage.setItem(`cda_ocorrencias_events_${oco.numero}`, JSON.stringify(eventosExistentes));
      } catch {}

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
          tamanho: 102400
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
      if (acao === "eliminar" || acao === "criar" || acao === "actuar" || acao === "detalhe" || r.status === 401 || r.status === 404 || r.status >= 500) {
        return executarFallbackLocal<T>(acao, data);
      }
      throw new OcorrenciaRequestError(
        result?.erro || "O serviço não respondeu. Tente novamente.",
        r.status,
      );
    }
    return result as T;
  } catch (e) {
    if (acao === "eliminar" || acao === "criar" || acao === "actuar" || acao === "detalhe") {
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

