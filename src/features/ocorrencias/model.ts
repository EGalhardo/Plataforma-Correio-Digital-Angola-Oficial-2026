export const CATEGORIAS_OCORRENCIAS = [
  "Iluminação pública",
  "Estradas e vias",
  "Água",
  "Saneamento",
  "Resíduos",
  "Infraestruturas públicas",
  "Árvores e espaços verdes",
  "Outra",
] as const;
export const ESTADOS_OCORRENCIAS: Record<string, string> = {
  submetida: "Submetida",
  recebida: "Recebida",
  em_analise: "Em análise",
  encaminhada: "Encaminhada",
  em_resolucao: "Em resolução",
  aguarda_informacao: "Aguarda informação",
  resolvida: "Resolvida",
  encerrada: "Encerrada",
  reabertura_solicitada: "Reabertura solicitada",
};
/** 2026-09-14 (04/07) — percurso principal da ocorrência para a cronologia. */
export const TIMELINE_OCORRENCIA = [
  "submetida",
  "recebida",
  "em_analise",
  "em_resolucao",
  "resolvida",
] as const;
export interface TransicaoEstado {
  alvo: string;
  acao: string;
  exigeNota: boolean;
}
/** 2026-09-14 (07) — estados-alvo válidos a partir do estado actual, mapeados
 *  para as acções já existentes (mesmas regras de `acoesOcorrencia`). */
export function transicoesEstado(estado: string): TransicaoEstado[] {
  const out: TransicaoEstado[] = [];
  if (["submetida", "encaminhada"].includes(estado))
    out.push({ alvo: "recebida", acao: "receber", exigeNota: false });
  if (
    ["recebida", "aguarda_informacao", "reabertura_solicitada"].includes(estado)
  )
    out.push({ alvo: "em_analise", acao: "analisar", exigeNota: true });
  if (estado === "em_analise")
    out.push({
      alvo: "em_resolucao",
      acao: "iniciar_resolucao",
      exigeNota: true,
    });
  if (estado === "em_resolucao")
    out.push({ alvo: "resolvida", acao: "resolver", exigeNota: true });
  if (["em_analise", "em_resolucao", "reabertura_solicitada"].includes(estado))
    out.push({ alvo: "encerrada", acao: "encerrar", exigeNota: true });
  return out;
}
export interface ActorOcorrencia {
  id: string;
  papel: "cidadao" | "instituicao";
  identificador: string;
  nome: string;
  instituicao?: string;
}
export interface InstituicaoOcorrencia {
  codigo: string;
  nome: string;
  provincia: string;
  municipio: string;
}
export interface DadosOcorrencia {
  categoria: string;
  titulo: string;
  descricao: string;
  provincia: string;
  municipio: string;
  bairro: string;
  rua: string;
  referencia: string;
  instituicao_codigo: string;
}
export interface Ocorrencia extends DadosOcorrencia {
  id: string;
  numero: number;
  capa_url?: string | null;
  capa_nome?: string | null;
  cidadao_nome: string;
  instituicao_nome: string;
  estado: string;
  responsavel: string | null;
  versao: number;
  criado_em: string;
  actualizado_em: string;
  /** 2026-09-16 — localização automática (GPS): campos aditivos da migração
   *  sql/ocorrencias/002_localizacao_gps.sql. Ausentes/NULL nas ocorrências
   *  anteriores (tratadas como "manual") e enquanto a migração não for
   *  executada no Supabase (o RPC antigo ignora os campos extras). */
  tipo_localizacao?: "manual" | "automatica" | null;
  lat?: number | null;
  lon?: number | null;
  precisao_m?: number | null;
}
/** Payload de criação (extensão aditiva de DadosOcorrencia): acrescenta o
 *  modo de localização e, quando automático, as coordenadas GPS + precisão.
 *  Sem renomear/remover campos existentes. */
export interface DadosOcorrenciaEnvio extends DadosOcorrencia {
  tipo_localizacao?: "manual" | "automatica";
  lat?: number;
  lon?: number;
  precisao_m?: number;
}
export const rotuloTipoLocalizacao = (o: {
  tipo_localizacao?: string | null;
}): string =>
  o.tipo_localizacao === "automatica"
    ? "Localização automática (GPS)"
    : "Localização manual";
export const coordenadasGps = (o: {
  lat?: number | null;
  lon?: number | null;
  precisao_m?: number | null;
}): string | null =>
  typeof o.lat === "number" && typeof o.lon === "number"
    ? `${o.lat.toFixed(6)}, ${o.lon.toFixed(6)} · ±${Math.max(
        1,
        Math.round(o.precisao_m ?? 0),
      )} m`
    : null;
export interface FotoOcorrencia {
  id: string;
  nome: string;
  url: string;
  tamanho: number;
}
export interface EventoOcorrencia {
  id: string;
  ordem: number;
  actor_papel: string;
  actor_nome: string;
  actor_instituicao?: string;
  acao: string;
  estado_anterior?: string;
  estado_novo: string;
  descricao: string;
  destino_codigo?: string;
  criado_em: string;
}
export interface NotificacaoOcorrencia {
  id: string;
  ocorrencia_id: string;
  titulo: string;
  mensagem: string;
  criado_em: string;
  lida: boolean;
}
export const protocoloOcorrencia = (numero: number) =>
  `OC-${String(numero).padStart(6, "0")}`;
export const DADOS_VAZIOS: DadosOcorrencia = {
  categoria: "",
  titulo: "",
  descricao: "",
  provincia: "",
  municipio: "",
  bairro: "",
  rua: "",
  referencia: "",
  instituicao_codigo: "",
};
export function validarOcorrencia(d: DadosOcorrencia): string[] {
  const errors: string[] = [];
  if (!(CATEGORIAS_OCORRENCIAS as readonly string[]).includes(d.categoria))
    errors.push("Seleccione uma categoria.");
  for (const [key, label, min, max] of [
    ["titulo", "Título", 5, 160],
    ["descricao", "Descrição", 10, 5000],
    ["provincia", "Província", 2, 100],
    ["municipio", "Município", 2, 100],
    ["bairro", "Bairro / Localidade", 2, 160],
    ["referencia", "Ponto de referência", 3, 500],
  ] as const) {
    const value = typeof d[key] === "string" ? d[key].trim() : "";
    if (value.length < min || value.length > max)
      errors.push(`${label}: indique entre ${min} e ${max} caracteres.`);
  }
  if (
    (d.rua != null && typeof d.rua !== "string") ||
    String(d.rua || "").length > 180
  )
    errors.push("Rua: máximo de 180 caracteres.");
  if (!/^[A-Z0-9][A-Z0-9-]{2,29}$/.test(d.instituicao_codigo || ""))
    errors.push("Código institucional: indique um código válido (ex.: INAPEM-LLMM).");
  return errors;
}
export interface AcaoOcorrencia {
  id: string;
  label: string;
  description: string;
  tipo?: "atribuir" | "encaminhar";
  semNota?: boolean;
}
export function acoesOcorrencia(
  estado: string,
  institucional: boolean,
): AcaoOcorrencia[] {
  const out: AcaoOcorrencia[] = [];
  const add = (
    id: string,
    label: string,
    description: string,
    extra: Partial<AcaoOcorrencia> = {},
  ) => out.push({ id, label, description, ...extra });
  if (!institucional) {
    if (
      [
        "recebida",
        "em_analise",
        "em_resolucao",
        "aguarda_informacao",
        "encaminhada",
        "reabertura_solicitada",
      ].includes(estado)
    )
      add(
        "esclarecer",
        "Adicionar esclarecimento",
        "Envie uma informação adicional à instituição.",
      );
    if (estado === "resolvida")
      add(
        "confirmar_resolucao",
        "Confirmar resolução",
        "Confirme apenas se o problema foi efectivamente resolvido.",
        { semNota: true },
      );
    if (["resolvida", "encerrada"].includes(estado))
      add(
        "solicitar_reabertura",
        "Solicitar reabertura",
        "Explique por que motivo a ocorrência deve voltar a ser analisada.",
      );
    return out;
  }
  if (["submetida", "encaminhada"].includes(estado))
    add(
      "receber",
      "Confirmar recepção",
      "Confirma que a sua instituição recebeu esta ocorrência.",
      { semNota: true },
    );
  if (
    ["recebida", "aguarda_informacao", "reabertura_solicitada"].includes(estado)
  )
    add(
      "analisar",
      "Iniciar análise",
      "Registe o início da análise ou a aceitação da reabertura.",
    );
  if (estado === "em_analise")
    add(
      "iniciar_resolucao",
      "Iniciar resolução",
      "Descreva a intervenção que vai ser realizada.",
    );
  if (["recebida", "em_analise", "em_resolucao"].includes(estado))
    add(
      "pedir_esclarecimento",
      "Pedir esclarecimento",
      "Indique exactamente a informação de que necessita.",
    );
  if (estado === "em_resolucao")
    add(
      "resolver",
      "Marcar como resolvida",
      "Descreva a intervenção realizada e o resultado.",
    );
  if (!["resolvida", "encerrada"].includes(estado))
    add(
      "atribuir",
      "Atribuir responsável",
      "Indique o nome do responsável ou da equipa de tratamento.",
      { tipo: "atribuir" },
    );
  if (
    [
      "recebida",
      "em_analise",
      "em_resolucao",
      "aguarda_informacao",
      "reabertura_solicitada",
    ].includes(estado)
  )
    add(
      "encaminhar",
      "Encaminhar ocorrência",
      "Escolha outra instituição habilitada e justifique o encaminhamento. O histórico e as fotografias acompanham o processo.",
      { tipo: "encaminhar" },
    );
  if (["em_analise", "em_resolucao", "reabertura_solicitada"].includes(estado))
    add(
      "encerrar",
      "Encerrar com justificação",
      "Explique o motivo do encerramento. O cidadão será informado e poderá solicitar reabertura.",
    );
  return out;
}
