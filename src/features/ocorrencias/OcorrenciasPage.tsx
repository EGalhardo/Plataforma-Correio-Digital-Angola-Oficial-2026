import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  MapPin,
  Plus,
  Search,
  ArrowLeft,
  ArrowRight,
  Bell,
  RefreshCw,
  Camera,
  X,
  CheckCircle,
  Building2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Send,
  Check,
  MessageSquare,
  LocateFixed,
  Trash2,
} from "lucide-react";
import { ListaRolavel } from "../../components/ui/ListaRolavel";
import {
  ocorrenciasApi,
  prepararFotografia,
  OcorrenciaRequestError,
} from "./client";
import {
  MapaOcorrencia,
  reverterGeocodificacao,
  provinciaMaisProxima,
} from "./MapaOcorrencia";
import {
  CATEGORIAS_OCORRENCIAS,
  ESTADOS_OCORRENCIAS,
  DADOS_VAZIOS,
  validarOcorrencia,
  protocoloOcorrencia,
  acoesOcorrencia,
  transicoesEstado,
  TIMELINE_OCORRENCIA,
  type ActorOcorrencia,
  type InstituicaoOcorrencia,
  type DadosOcorrencia,
  type DadosOcorrenciaEnvio,
  type Ocorrencia,
  type FotoOcorrencia,
  type EventoOcorrencia,
  type NotificacaoOcorrencia,
  type AcaoOcorrencia,
  rotuloTipoLocalizacao,
  coordenadasGps,
} from "./model";
import { MUNICIPALITIES_BY_PROVINCE } from "../../config/institutionCatalog";
const date = (s: string) =>
  new Date(s).toLocaleString("pt-AO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const hora = (s: string) =>
  new Date(s).toLocaleString("pt-AO", {
    hour: "2-digit",
    minute: "2-digit",
  });
const primary =
  "inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-primary text-white font-bold text-xs hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";
const secondary =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
const input =
  "w-full min-w-0 border border-slate-200 rounded-xl px-3 py-3 bg-white text-sm text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50";
const panel =
  "rounded-2xl md:rounded-3xl border border-slate-200 bg-white p-4 md:p-6 space-y-4";
function Field({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <label className="block min-w-0 space-y-1.5">
      <span className="block text-xs font-bold text-slate-600">{label}</span>
      {children}
    </label>
  );
}
function Estado({ value }: { value: string }) {
  const color = ["resolvida", "encerrada"].includes(value)
    ? "bg-emerald-50 text-emerald-700"
    : ["aguarda_informacao", "reabertura_solicitada"].includes(value)
      ? "bg-amber-50 text-amber-800"
      : "bg-indigo-50 text-indigo-700";
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black ${color}`}
    >
      {ESTADOS_OCORRENCIAS[value] || value}
    </span>
  );
}
function TimelineOcorrencia({
  estado,
  events,
  clicavel = false,
  onPonto,
}: {
  estado: string;
  events: EventoOcorrencia[];
  clicavel?: boolean;
  onPonto?: (alvo: string) => void;
}) {
  const datas = new Map<string, string>();
  // 2026-09-22 — DESCRIÇÃO NO CRONOGRAMA: o cidadão via o estado e a data no
  // Acompanhamento, mas não o texto que a instituição escreveu ao mudar o estado
  // («A análise está sendo feita»), que só aparecia em Comunicações/Histórico.
  // Guarda-se aqui a descrição do evento que chegou a cada estado (o mais
  // recente, porque `events` vem por ordem decrescente).
  const notas = new Map<string, string>();
  for (const e of events) {
    if (e.estado_novo && !datas.has(e.estado_novo))
      datas.set(e.estado_novo, e.criado_em);
    if (
      e.estado_novo &&
      !notas.has(e.estado_novo) &&
      e.descricao &&
      e.descricao.trim()
    )
      notas.set(e.estado_novo, e.descricao.trim());
  }
  const idx = (TIMELINE_OCORRENCIA as readonly string[]).indexOf(estado);
  const extras = [
    "encaminhada",
    "aguarda_informacao",
    "encerrada",
    "reabertura_solicitada",
  ].filter((st) => st === estado || datas.has(st));
  return (
    <div className="space-y-3">
      <ol className="space-y-3">
        {TIMELINE_OCORRENCIA.map((st, i) => {
          const feito = idx >= 0 ? i <= idx : datas.has(st);
          const atual = st === estado;
          const conteudo = (
            <>
              <span
                className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  feito
                    ? "bg-primary text-white"
                    : "bg-slate-200 text-slate-400"
                }`}
              >
                {feito ? (
                  <Check size={12} />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                )}
              </span>
              <div className="min-w-0">
                <p
                  className={`text-xs font-bold ${
                    atual
                      ? "text-primary"
                      : feito
                        ? "text-slate-700"
                        : "text-slate-400"
                  }`}
                >
                  {ESTADOS_OCORRENCIAS[st]}
                  {atual ? " (actual)" : ""}
                </p>
                {datas.get(st) && (
                  <p className="text-[11px] text-slate-500">
                    {date(datas.get(st) as string)}
                  </p>
                )}
                {notas.get(st) && (
                  <p className="text-[11px] text-slate-600 whitespace-pre-wrap break-words mt-0.5">
                    {notas.get(st)}
                  </p>
                )}
              </div>
            </>
          );
          return (
            <li key={st}>
              {clicavel ? (
                <button
                  type="button"
                  onClick={() => onPonto?.(st)}
                  title={`Mudar estado para ${ESTADOS_OCORRENCIAS[st]}`}
                  className="flex gap-3 items-start text-left w-full rounded-lg p-1 -m-1 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {conteudo}
                </button>
              ) : (
                <span className="flex gap-3 items-start">{conteudo}</span>
              )}
            </li>
          );
        })}
      </ol>
      {extras.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {extras.map((st) => (
            <span key={st} className="inline-flex">
              <Estado value={st} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
function TabelaHistorico({ events }: { events: EventoOcorrencia[] }) {
  if (!events.length)
    return (
      <p className="text-sm text-slate-500">Sem histórico registado.</p>
    );
  return (
    <div className="overflow-auto max-h-[420px] rounded-xl border border-slate-200">
      <table className="w-full text-sm min-w-[560px]">
        <thead className="sticky top-0 bg-slate-50">
          <tr className="text-left text-xs text-slate-500">
            <th className="font-bold px-4 py-2.5">Autor</th>
            <th className="font-bold px-4 py-2.5">Data</th>
            <th className="font-bold px-4 py-2.5">Acção</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id} className="border-t border-slate-100 align-top">
              <td className="px-4 py-2.5 text-xs font-bold text-slate-700">
                {e.actor_nome}
                {e.actor_instituicao ? (
                  <span className="block font-normal text-slate-500">
                    {e.actor_instituicao}
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-2.5 text-[11px] text-slate-500 whitespace-nowrap">
                {date(e.criado_em)}
              </td>
              <td className="px-4 py-2.5 text-xs text-slate-600">
                <span className="font-bold">
                  {String(e.acao || "").replace(/_/g, " ")}
                </span>
                {e.descricao ? (
                  <span className="block whitespace-pre-wrap break-words">
                    {e.descricao}
                  </span>
                ) : null}
                {e.destino_codigo ? (
                  <span className="block text-indigo-700">
                    Destino: {e.destino_codigo}
                  </span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function BolhasComunicacao({ events }: { events: EventoOcorrencia[] }) {
  const comTexto = [...events]
    .reverse()
    .filter((e) => e.descricao && e.descricao.trim());
  if (!comTexto.length)
    return <p className="text-sm text-slate-500">Ainda sem comunicações.</p>;
  return (
    <div className="space-y-3">
      {comTexto.map((e) => {
        const inst = e.actor_papel === "instituicao";
        return (
          <div
            key={e.id}
            className={`flex ${inst ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                inst
                  ? "bg-indigo-50 text-slate-800 rounded-tl-sm"
                  : "bg-slate-100 text-slate-800 rounded-tr-sm"
              }`}
            >
              <p className="text-[11px] font-bold text-slate-500">
                {e.actor_nome}
                {e.actor_instituicao ? ` · ${e.actor_instituicao}` : ""} ·{" "}
                {hora(e.criado_em)}
              </p>
              <p className="whitespace-pre-wrap break-words mt-1">
                {e.descricao}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
function Empty({ children }: { children?: ReactNode }) {
  return (
    <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 bg-white text-slate-500 text-sm">
      {children}
    </div>
  );
}
function Safety() {
  return (
    <p className="flex gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
      <AlertTriangle size={16} className="shrink-0" />
      Este canal não substitui os serviços de emergência nem garante atendimento
      imediato. Em caso de perigo, procure assistência de emergência.
    </p>
  );
}
function Photos({
  photos,
  proporcional = false,
}: {
  photos: FotoOcorrencia[];
  /** 2026-09-20 — «Tratar ocorrência» (instituição): caixa de dimensão ÚNICA
   *  para todas as fotografias (mesma largura e altura), com a imagem inteira
   *  visível (contida, sem cortes). Nos restantes locais a apresentação
   *  mantém-se como estava. */
  proporcional?: boolean;
}) {
  return photos.length ? (
    <div
      className={`grid grid-cols-2 sm:grid-cols-3 gap-3${proporcional ? " items-start" : ""}`}
    >
      {photos.map((f) => (
        <a
          key={f.id}
          href={f.url.startsWith("data:") ? undefined : f.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block min-w-0 rounded-xl border border-slate-200 overflow-hidden focus:ring-2 focus:ring-primary"
        >
          <img
            src={f.url}
            alt={f.nome}
            className={
              proporcional
                ? "block w-full h-[180px] sm:h-[220px] md:h-[260px] object-contain bg-slate-50"
                : "w-full h-28 md:h-36 object-cover"
            }
          />
          <span className="block p-2 text-[11px] text-slate-500 truncate">
            {f.nome}
          </span>
        </a>
      ))}
    </div>
  ) : (
    <p className="text-sm text-slate-500">Sem fotografias anexadas.</p>
  );
}
function ActionDialog({
  action,
  institutions,
  current,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  action: AcaoOcorrencia;
  institutions: InstituicaoOcorrencia[];
  current: Ocorrencia;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (data: Record<string, string>, pedido: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [note, setNote] = useState(""),
    [target, setTarget] = useState(""),
    [responsible, setResponsible] = useState(current.responsavel || "");
  const request = useRef(crypto.randomUUID());
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      aria-labelledby="oc-action-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      className="w-[calc(100%_-_2rem)] max-w-lg rounded-3xl p-0 border-0 shadow-2xl backdrop:bg-slate-950/60"
    >
      <form
        className="p-5 md:p-7 space-y-5 max-h-[85vh] overflow-y-auto"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(
            {
              descricao: note,
              responsavel: responsible,
              instituicao_codigo: target,
            },
            request.current,
          );
        }}
      >
        <div className="flex gap-3 items-start justify-between">
          <h3 id="oc-action-title" className="text-xl font-black text-primary">
            {action.label}
          </h3>
          <button
            type="button"
            aria-label="Fechar"
            className={secondary}
            disabled={busy}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-sm text-slate-600">{action.description}</p>
        <p className="text-xs font-bold text-slate-500">
          {protocoloOcorrencia(current.numero)} · {current.titulo}
        </p>
        {action.tipo === "atribuir" ? (
          <Field label="Responsável / equipa *">
            <input
              autoFocus
              required
              minLength={2}
              maxLength={160}
              className={input}
              value={responsible}
              onChange={(e) => {
                request.current = crypto.randomUUID();
                setResponsible(e.target.value);
              }}
              placeholder="Ex.: Equipa de manutenção"
              disabled={busy}
            />
          </Field>
        ) : (
          <>
            {action.tipo === "encaminhar" && (
              <Field label="Instituição habilitada de destino *">
                <select
                  required
                  className={input}
                  value={target}
                  onChange={(e) => {
                    request.current = crypto.randomUUID();
                    setTarget(e.target.value);
                  }}
                  disabled={busy}
                >
                  <option value="">Seleccione outra instituição</option>
                  {institutions
                    .filter((i) => i.codigo !== current.instituicao_codigo)
                    .map((i) => (
                      <option key={i.codigo} value={i.codigo}>
                        {i.nome} · {i.codigo}
                      </option>
                    ))}
                </select>
              </Field>
            )}
            {!action.semNota && (
              <Field
                label={
                  action.id === "esclarecer"
                    ? "Esclarecimento *"
                    : "Descrição / justificação *"
                }
              >
                <textarea
                  required
                  minLength={5}
                  maxLength={5000}
                  rows={5}
                  className={input}
                  value={note}
                  disabled={busy}
                  onChange={(e) => {
                    request.current = crypto.randomUUID();
                    setNote(e.target.value);
                  }}
                />
              </Field>
            )}
          </>
        )}
        {action.tipo === "encaminhar" && (
          <p className="text-xs bg-indigo-50 text-indigo-800 p-3 rounded-xl">
            A descrição, a localização, as fotografias e o histórico acompanham
            a ocorrência. Após confirmar, o tratamento passa para a instituição
            destinatária e o cidadão será notificado.
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="text-sm text-red-700 bg-red-50 rounded-xl p-3"
          >
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className={secondary}
            disabled={busy}
          >
            Cancelar
          </button>
          <button type="submit" className={primary} disabled={busy}>
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle size={16} />
            )}
            Confirmar
          </button>
        </div>
      </form>
    </dialog>,
    document.body,
  );
}
export function OcorrenciasPage({ onBack }: { onBack: () => void }) {
  const [actor, setActor] = useState<ActorOcorrencia | null>(null),
    [institutions, setInstitutions] = useState<InstituicaoOcorrencia[]>([]);
  const [view, setView] = useState<
    "lista" | "criar" | "rever" | "detalhe" | "notificacoes" | "encaminhar"
  >("lista");
  const [boot, setBoot] = useState(true),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [actionError, setActionError] = useState("");
  const [list, setList] = useState<Ocorrencia[]>([]),
    [total, setTotal] = useState(0),
    [more, setMore] = useState(false);
  // 2026-09-20 — Eliminação de ocorrências (cidadão e instituição): guarda a
  // ocorrência escolhida para o diálogo de confirmação.
  const [paraEliminar, setParaEliminar] = useState<Ocorrencia | null>(null);
  const [query, setQuery] = useState(""),
    [state, setState] = useState(""),
    [category, setCategory] = useState(""),
    [locality, setLocality] = useState("");
  const [data, setData] = useState<DadosOcorrencia>({ ...DADOS_VAZIOS }),
    [photos, setPhotos] = useState<FotoOcorrencia[]>([]),
    [confirmed, setConfirmed] = useState(false),
    [attempted, setAttempted] = useState(false);
  // 2026-09-16 — Localização "Manual"/"Automático (GPS)". O modo automático
  // usa a API nativa de geolocalização do navegador (no telemóvel, o GPS do
  // aparelho — o pedido de permissão é o diálogo nativo do sistema).
  const [tipoLocalizacao, setTipoLocalizacao] = useState<
    "manual" | "automatico"
  >("manual");
  const [gps, setGps] = useState<{
    lat: number;
    lon: number;
    precisao: number;
  } | null>(null);
  const [gpsEstado, setGpsEstado] = useState<
    "idle" | "carregando" | "sucesso" | "erro"
  >("idle");
  const [gpsErro, setGpsErro] = useState("");
  // 2026-09-16 — no modo Automático os campos de endereço ficam ocultos: a
  // localidade (província/município/bairro/referência) é derivada das
  // coordenadas GPS (geocodificação reversa + fallback pela província mais
  // próxima) e preenchida no formulário para respeitar a estrutura do
  // registo (a base exige os quatro campos não vazios).
  const [localGps, setLocalGps] = useState<{
    provincia: string;
    municipio: string;
    bairro: string;
    referencia: string;
  } | null>(null);
  const [localGpsAObter, setLocalGpsAObter] = useState(false);
  const createRequest = useRef(crypto.randomUUID());
  const [selected, setSelected] = useState<Ocorrencia | null>(null),
    [events, setEvents] = useState<EventoOcorrencia[]>([]),
    [detailPhotos, setDetailPhotos] = useState<FotoOcorrencia[]>([]),
    [moreHistory, setMoreHistory] = useState(false);
  const [action, setAction] = useState<AcaoOcorrencia | null>(null);
  const [contagens, setContagens] = useState<Record<string, number>>({});
  const [abaNotif, setAbaNotif] = useState<"todas" | "naoLidas">("todas");
  const [deDetalhe, setDeDetalhe] = useState(false);
  const [tratResp, setTratResp] = useState("");
  const [tratAlvo, setTratAlvo] = useState("");
  const [tratNota, setTratNota] = useState("");
  const [tlAlvo, setTlAlvo] = useState<string | null>(null);
  const [tlNota, setTlNota] = useState("");
  const [tlBloqueio, setTlBloqueio] = useState("");
  const [tlErro, setTlErro] = useState("");
  const [encDestino, setEncDestino] = useState("");
  const [encMotivo, setEncMotivo] = useState("");
  const [verFotos, setVerFotos] = useState(false);
  const [esclarecimento, setEsclarecimento] = useState("");
  useEffect(() => {
    setTratResp(selected?.responsavel || "");
    setTratAlvo("");
    setTratNota("");
    setEncDestino("");
    setEncMotivo("");
    setVerFotos(true);
    setEsclarecimento("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);
  const [notifs, setNotifs] = useState<NotificacaoOcorrencia[]>([]),
    [unread, setUnread] = useState(0),
    [moreNotifs, setMoreNotifs] = useState(false);
  const notifFetchId = useRef(0);
  const fetchId = useRef(0),
    mounted = useRef(true);
  const gpsWatchRef = useRef<number | null>(null);
  const gpsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const limparGpsWatch = () => {
    if (gpsWatchRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(gpsWatchRef.current);
      gpsWatchRef.current = null;
    }
    if (gpsTimerRef.current !== null) {
      clearTimeout(gpsTimerRef.current);
      gpsTimerRef.current = null;
    }
  };

  const institutional = actor?.papel === "instituicao";
  const title = institutional ? "Ocorrências recebidas" : "Ocorrências Locais";
  const showError = (e: unknown) => {
    if (mounted.current)
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível concluir a operação.",
      );
  };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      fetchId.current++;
      limparGpsWatch();
    };
  }, []);
  const refreshUnread = useCallback(async () => {
    try {
      const r = await ocorrenciasApi("notificacoes", { naoLidas: true });
      if (mounted.current) setUnread(r.total);
    } catch {
      /* O erro de notificações é mostrado ao abrir a respectiva lista. */
    }
  }, []);
  const init = useCallback(async () => {
    setBoot(true);
    setError("");
    try {
      const r = await ocorrenciasApi("inicio");
      if (mounted.current) {
        setActor(r.actor);
        setInstitutions(r.instituicoes);
        void refreshUnread();
      }
    } catch (e) {
      showError(e);
    } finally {
      if (mounted.current) setBoot(false);
    }
  }, [refreshUnread]);
  useEffect(() => {
    void init();
  }, [init]);
  const loadList = useCallback(
    async (append = false) => {
      const request = ++fetchId.current;
      setLoading(true);
      setError("");
      try {
        const r = await ocorrenciasApi("listar", {
          procura: query,
          estado: state,
          categoria: category,
          localidade: locality,
          offset: append ? list.length : 0,
        });
        if (request === fetchId.current && mounted.current) {
          setList((prev) =>
            append
              ? [
                  ...prev,
                  ...r.lista.filter(
                    (x: Ocorrencia) => !prev.some((p) => p.id === x.id),
                  ),
                ]
              : r.lista,
          );
          setTotal(r.total);
          setMore(r.mais);
          if (!append) setContagens(r.contagens || {});
        }
      } catch (e) {
        if (request === fetchId.current) showError(e);
      } finally {
        if (request === fetchId.current && mounted.current) setLoading(false);
      }
    },
    [query, state, category, locality, list.length],
  );
  // Debounce de pesquisa e cancelamento lógico de resultados de consultas anteriores.
  useEffect(() => {
    if (!actor || view !== "lista") return;
    fetchId.current++;
    const timer = setTimeout(() => void loadList(), 250);
    return () => {
      clearTimeout(timer);
      fetchId.current++;
    };
  }, [actor, view, query, state, category, locality]);
  useEffect(() => {
    if (!actor) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refreshUnread();
    }, 30000);
    return () => clearInterval(timer);
  }, [actor, refreshUnread]);
  useEffect(() => {
    if (!["criar", "rever"].includes(view)) return;
    const warn = (e: BeforeUnloadEvent) => {
      if (data.titulo || photos.length) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [view, data.titulo, photos.length]);
  const loadNotifs = useCallback(
    async (append = false) => {
      const request = ++notifFetchId.current;
      setLoading(true);
      setError("");
      try {
        const r = await ocorrenciasApi("notificacoes", {
          naoLidas: abaNotif === "naoLidas",
          offset: append ? notifs.length : 0,
        });
        if (mounted.current && request === notifFetchId.current) {
          setNotifs((prev) =>
            append
              ? [
                  ...prev,
                  ...r.lista.filter(
                    (n: NotificacaoOcorrencia) =>
                      !prev.some((p) => p.id === n.id),
                  ),
                ]
              : r.lista,
          );
          setMoreNotifs(r.mais);
        }
        await refreshUnread();
      } catch (e) {
        if (request === notifFetchId.current) showError(e);
      } finally {
        if (mounted.current && request === notifFetchId.current)
          setLoading(false);
      }
    },
    [abaNotif, notifs.length, refreshUnread],
  );
  useEffect(() => {
    if (actor && view === "notificacoes") void loadNotifs();
    return () => {
      notifFetchId.current++;
    };
  }, [actor, view, abaNotif]);
  const openDetail = async (key: string) => {
    setLoading(true);
    setError("");
    try {
      const r = await ocorrenciasApi("detalhe", { id: key });
      if (mounted.current) {
        setSelected(r.ocorrencia);
        setEvents(r.eventos);
        setDetailPhotos(r.fotos);
        setMoreHistory(r.maisHistorico);
        setView("detalhe");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (e) {
      showError(e);
    } finally {
      if (mounted.current) setLoading(false);
    }
  };
  const newReport = () => {
    setData({ ...DADOS_VAZIOS });
    setPhotos([]);
    setConfirmed(false);
    setAttempted(false);
    setTipoLocalizacao("manual");
    setGps(null);
    setGpsEstado("idle");
    setGpsErro("");
    setLocalGps(null);
    setLocalGpsAObter(false);
    createRequest.current = crypto.randomUUID();
    setError("");
    setSuccess("");
    setView("criar");
  };
  // Deriva a localidade das coordenadas GPS e preenche os campos de endereço
  // (ocultos no modo Automático): geocodificação reversa (mesmo recurso do
  // mapa) + fallbacks determinísticos — a base de dados exige os quatro
  // campos não vazios, por isso sempre há valor final.
  const normalizarNome = (s: string) =>
    (s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  const derivarLocalidadeGps = async (lat: number, lon: number) => {
    setLocalGpsAObter(true);
    try {
      const rev = await reverterGeocodificacao(lat, lon);
      const provincias = Object.keys(MUNICIPALITIES_BY_PROVINCE).filter(
        (p) => p !== "Todas",
      );
      const provBruta = rev.provincia || provinciaMaisProxima(lat, lon);
      const provincia =
        provincias.find((p) => normalizarNome(p) === normalizarNome(provBruta)) ||
        provBruta;
      const listaMunicipios = MUNICIPALITIES_BY_PROVINCE[provincia] || [];
      const munBruto = rev.municipio || provincia;
      const municipio =
        listaMunicipios.find(
          (m) => normalizarNome(m) === normalizarNome(munBruto),
        ) || munBruto;
      const bairro = rev.bairro || municipio;
      const referencia =
        rev.rua || `GPS: ${lat.toFixed(6)}, ${lon.toFixed(6)}`;
      const loc = { provincia, municipio, bairro, referencia };
      setLocalGps(loc);
      setData((prev) => ({ ...prev, ...loc }));
    } finally {
      setLocalGpsAObter(false);
    }
  };
  const obterGps = () => {
    setGpsErro("");
    limparGpsWatch();
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsEstado("erro");
      setGpsErro(
        "Este navegador não suporta geolocalização. Utilize a localização «Manual».",
      );
      return;
    }
    if (!window.isSecureContext) {
      setGpsEstado("erro");
      setGpsErro(
        "A geolocalização só funciona em ligação segura (HTTPS). Em produção o portal é servido via HTTPS; neste ambiente, utilize a localização «Manual».",
      );
      return;
    }
    setGpsEstado("carregando");

    let melhorFix: GeolocationPosition | null = null;
    let amostragem = 0;

    const aplicarFix = (pos: GeolocationPosition) => {
      limparGpsWatch();
      setGps({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        precisao: pos.coords.accuracy,
      });
      setGpsEstado("sucesso");
      void derivarLocalidadeGps(pos.coords.latitude, pos.coords.longitude);
    };

    // Janela de convergência de alta precisão: aguarda estabilização dos satélites
    gpsTimerRef.current = setTimeout(() => {
      if (melhorFix) {
        aplicarFix(melhorFix);
      } else {
        navigator.geolocation.getCurrentPosition(
          (pos) => aplicarFix(pos),
          (err) => {
            setGpsEstado("erro");
            setGpsErro(
              err.code === 1
                ? "Permissão de localização negada no navegador. Para a reativar, abra as definições de site do navegador e permita a localização (no telemóvel, também as definições de privacidade do aparelho) — ou use «Manual»."
                : err.code === 2
                  ? "A localização do dispositivo não está disponível de momento (GPS desligado ou sem sinal). Ative a localização no telemóvel/computador e tente novamente — ou use «Manual»."
                  : "O GPS demorou demasiado a responder. Tente novamente num local aberto — ou use «Manual».",
            );
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
      }
    }, 3500);

    try {
      gpsWatchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          amostragem++;
          if (!melhorFix || pos.coords.accuracy < melhorFix.coords.accuracy) {
            melhorFix = pos;
          }
          // Se obteve precisão sub-3 metros com pelo menos 2 amostras convergidas
          if (pos.coords.accuracy <= 3 && amostragem >= 2) {
            aplicarFix(pos);
          }
        },
        (err) => {
          if (melhorFix) {
            aplicarFix(melhorFix);
            return;
          }
          limparGpsWatch();
          setGpsEstado("erro");
          setGpsErro(
            err.code === 1
              ? "Permissão de localização negada no navegador. Para a reativar, abra as definições de site do navegador e permita a localização (no telemóvel, também as definições de privacidade do aparelho) — ou use «Manual»."
              : err.code === 2
                ? "A localização do dispositivo não está disponível de momento (GPS desligado ou sem sinal). Ative a localização no telemóvel/computador e tente novamente — ou use «Manual»."
                : "O GPS demorou demasiado a responder. Tente novamente num local aberto — ou use «Manual».",
          );
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    } catch {
      navigator.geolocation.getCurrentPosition(
        (pos) => aplicarFix(pos),
        (err) => {
          setGpsEstado("erro");
          setGpsErro("Não foi possível obter sinal GPS com precisão.");
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    }
  };
  const cancelReport = async () => {
    if (
      !window.confirm(
        attempted
          ? "A submissão pode já ter concluído. Voltar à lista para verificar?"
          : "Sair sem enviar esta ocorrência?",
      )
    )
      return;
    setBusy(true);
    try {
      await Promise.all(
        photos.map((p) => ocorrenciasApi("remover_fotografia", { id: p.id })),
      );
      setPhotos([]);
      setView("lista");
      setError("");
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    if (photos.length + files.length > 5) {
      setError("Pode adicionar no máximo cinco fotografias.");
      return;
    }
    setPhotoBusy(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const base64 = await prepararFotografia(file);
        const r = await ocorrenciasApi("fotografia", {
          base64,
          nome: file.name,
        });
        if (mounted.current)
          setPhotos((prev) => [...prev, { ...r.foto, url: base64 }]);
      }
    } catch (e) {
      showError(e);
    } finally {
      if (mounted.current) setPhotoBusy(false);
    }
  };
  const removePhoto = async (key: string) => {
    setPhotoBusy(true);
    try {
      await ocorrenciasApi("remover_fotografia", { id: key });
      setPhotos((prev) => prev.filter((p) => p.id !== key));
    } catch (e) {
      showError(e);
    } finally {
      setPhotoBusy(false);
    }
  };
  const submit = async () => {
    setBusy(true);
    setError("");
    setAttempted(true);
    try {
      // Extensão aditiva: modo de localização + coordenadas GPS quando
      // automático (a migração 002 guarda os campos; o RPC antigo ignora-os).
      const dadosEnvio: DadosOcorrenciaEnvio = {
        ...data,
        tipo_localizacao:
          tipoLocalizacao === "automatico" && gps ? "automatica" : "manual",
      };
      if (tipoLocalizacao === "automatico" && gps) {
        dadosEnvio.lat = gps.lat;
        dadosEnvio.lon = gps.lon;
        dadosEnvio.precisao_m = Math.max(1, Math.round(gps.precisao));
      }
      const r = await ocorrenciasApi("criar", {
        dados: dadosEnvio,
        fotos: photos.map((p) => p.id),
        pedido: createRequest.current,
        confirmado: confirmed,
      });
      setPhotos([]);
      setSelected(r.ocorrencia);
      setView("lista");
      setSuccess(
        `${protocoloOcorrencia(r.ocorrencia.numero)} submetida. Aguarda confirmação de recepção pela instituição.`,
      );
      void openDetail(r.ocorrencia.id);
      void refreshUnread();
    } catch (e) {
      showError(e);
      if (e instanceof OcorrenciaRequestError && [400, 403].includes(e.status))
        setAttempted(false);
    } finally {
      setBusy(false);
    }
  };
  const eliminar = async (o: Ocorrencia) => {
    setBusy(true);
    setError("");
    try {
      await ocorrenciasApi("eliminar", { id: o.id });
      setParaEliminar(null);
      setSuccess(`Ocorrência ${protocoloOcorrencia(o.numero)} eliminada.`);
      setList((prev) => prev.filter((x) => x.id !== o.id));
      setTotal((t) => Math.max(0, t - 1));
      if (selected?.id === o.id) {
        setSelected(null);
        setView("lista");
      }
      void loadList();
      void refreshUnread();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível eliminar a ocorrência.",
      );
    } finally {
      setBusy(false);
    }
  };
  const perform = async (payload: Record<string, string>, pedido: string) => {
    if (!selected || !action) return;
    setBusy(true);
    setActionError("");
    try {
      const r = await ocorrenciasApi("actuar", {
        id: selected.id,
        versao: selected.versao,
        operacao: action.id,
        dados: payload,
        pedido,
      });
      const forwarded = action.id === "encaminhar";
      setSelected(r.ocorrencia);
      setAction(null);
      setSuccess(
        "Actualização guardada. O histórico e a notificação foram registados.",
      );
      if (forwarded) {
        setView("lista");
        void loadList();
      } else void openDetail(r.ocorrencia.id);
      void refreshUnread();
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Não foi possível actualizar.",
      );
    } finally {
      setBusy(false);
    }
  };
  const executarAcao = async (
    operacao: string,
    dados: Record<string, string>,
  ): Promise<boolean> => {
    if (!selected) return false;
    setBusy(true);
    setActionError("");
    setError("");
    try {
      const r = await ocorrenciasApi("actuar", {
        id: selected.id,
        versao: selected.versao,
        operacao,
        dados,
        pedido: crypto.randomUUID(),
      });
      setSelected(r.ocorrencia);
      setAction(null);
      setSuccess(
        "Actualização guardada. O histórico e a notificação foram registados.",
      );
      if (operacao === "encaminhar") {
        setView("lista");
        void loadList();
      } else void openDetail(r.ocorrencia.id);
      void refreshUnread();
      return true;
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Não foi possível actualizar.";
      setActionError(msg);
      setError(msg);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const submitEsclarecimento = async () => {
    if (esclarecimento.trim().length < 5) {
      setError("Escreva um esclarecimento com pelo menos 5 caracteres.");
      return;
    }
    if (await executarAcao("esclarecer", { descricao: esclarecimento.trim() }))
      setEsclarecimento("");
  };
  const submitResponsavel = async () => {
    if (tratResp.trim().length < 2) {
      setError("Indique o nome do responsável ou da equipa.");
      return;
    }
    await executarAcao("atribuir", { responsavel: tratResp.trim() });
  };
  const submitTratamento = async () => {
    const t = transicoes.find((x) => x.alvo === tratAlvo);
    if (!selected || !t) return;
    if (t.exigeNota && tratNota.trim().length < 5) {
      setError("Indique a justificação da alteração (mínimo 5 caracteres).");
      return;
    }
    if (await executarAcao(t.acao, { descricao: tratNota.trim() }))
      setTratNota("");
  };
  // Mudança de estado por clique no cronograma: só avança UM nível (sem
  // retroceder nem saltar), e só para alvos válidos na matriz de transições.
  const pedirMudancaTimeline = (alvo: string) => {
    if (!selected) return;
    const atual = selected.estado;
    const tl = TIMELINE_OCORRENCIA as readonly string[];
    const rotulo = (st: string) => ESTADOS_OCORRENCIAS[st] || st;
    setTlNota("");
    setTlErro("");
    setTlAlvo(alvo);
    if (alvo === atual) {
      setTlBloqueio(`A ocorrência já está em «${rotulo(atual)}».`);
      return;
    }
    const ia = tl.indexOf(atual);
    const ib = tl.indexOf(alvo);
    if (ia >= 0 && ib >= 0) {
      if (ib < ia) {
        setTlBloqueio(
          `Não é possível retroceder de «${rotulo(atual)}» para «${rotulo(alvo)}».`,
        );
        return;
      }
      if (ib - ia > 1) {
        setTlBloqueio(
          `Só é possível avançar um nível de cada vez (actual: «${rotulo(atual)}»).`,
        );
        return;
      }
    }
    if (!transicoes.some((x) => x.alvo === alvo)) {
      setTlBloqueio(
        `«${rotulo(alvo)}» não é um passo válido a partir de «${rotulo(atual)}».`,
      );
      return;
    }
    setTlBloqueio("");
  };
  const confirmarMudancaTimeline = async () => {
    const t = transicoes.find((x) => x.alvo === tlAlvo);
    if (!selected || !tlAlvo || !t) return;
    if (t.exigeNota && tlNota.trim().length < 5) {
      setTlErro("Indique a justificação da alteração (mínimo 5 caracteres).");
      return;
    }
    if (await executarAcao(t.acao, { descricao: tlNota.trim() })) {
      setTlAlvo(null);
      setTlNota("");
      setTlBloqueio("");
      setTlErro("");
    }
  };
  const fecharMudancaTimeline = () => {
    setTlAlvo(null);
    setTlNota("");
    setTlBloqueio("");
    setTlErro("");
  };
  const submitEncaminhar = async () => {
    if (!encDestino) {
      setError("Seleccione a instituição de destino.");
      return;
    }
    if (encMotivo.trim().length < 5) {
      setError(
        "Indique o motivo do encaminhamento (mínimo 5 caracteres).",
      );
      return;
    }
    await executarAcao("encaminhar", {
      instituicao_codigo: encDestino,
      descricao: encMotivo.trim(),
    });
  };
  const markRead = async (n: NotificacaoOcorrencia, open: boolean) => {
    setError("");
    setLoading(true);
    try {
      await ocorrenciasApi("ler_notificacao", { id: n.id });
      setNotifs((prev) =>
        prev.map((p) => (p.id === n.id ? { ...p, lida: true } : p)),
      );
      void refreshUnread();
      if (open) await openDetail(n.ocorrencia_id);
      else if (abaNotif === "naoLidas") await loadNotifs();
    } catch (e) {
      showError(e);
    } finally {
      if (mounted.current) setLoading(false);
    }
  };
  const back = () => {
    setError("");
    setSuccess("");
    if (view === "criar" || view === "rever") {
      void cancelReport();
      return;
    }
    if (view === "lista") onBack();
    else if (view === "encaminhar") setView("detalhe");
    else setView("lista");
  };
  // O campo aceita digitação livre do código; a normalização permite
  // confirmar contra a lista de habilitadas (sugestões + cartão de confirmação).
  const codigoDigitado = (data.instituicao_codigo || "")
    .toUpperCase()
    .replace(/\s+/g, "");
  const currentInstitution = institutions.find(
    (i) => i.codigo === codigoDigitado,
  );
  const acoesCidada =
    !institutional && selected
      ? acoesOcorrencia(selected.estado, false)
      : [];
  const podeEsclarecer = acoesCidada.some((a) => a.id === "esclarecer");
  const transicoes =
    institutional && selected ? transicoesEstado(selected.estado) : [];
  const acoesTrat =
    institutional && selected ? acoesOcorrencia(selected.estado, true) : [];
  if (boot)
    return (
      <div role="status" className={`${panel} text-center text-slate-500`}>
        <Loader2 className="animate-spin mx-auto" />A carregar Ocorrências...
      </div>
    );
  if (!actor)
    return (
      <div className={panel}>
        <h2 className="font-black text-xl text-primary">Ocorrências</h2>
        <p role="alert" className="text-red-700">
          {error || "Não foi possível carregar a sessão."}
        </p>
        <button onClick={() => void init()} className={primary}>
          Tentar novamente
        </button>
        <button onClick={onBack} className={`${secondary} ml-2`}>
          Voltar ao Painel
        </button>
      </div>
    );
  return (
    <section className="space-y-4 md:space-y-6" aria-label={title}>
      <header className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={back}
          disabled={busy || photoBusy}
          aria-label="Voltar"
          className={secondary}
        >
          <ArrowLeft size={18} />
        </button>
        <span className="p-2 rounded-[15%] bg-white border border-slate-200 flex items-center justify-center shrink-0">
          <img
            src="https://i.postimg.cc/nrmY1WZL/Ocorrencias-locais-(1).png"
            alt="Ocorrências Locais"
            loading="lazy"
            className="h-[83px] w-[83px] md:h-[101px] md:w-[101px] object-contain rounded-[15%]"
          />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-black text-primary text-xl md:text-2xl">
            {view === "criar"
              ? "Registar ocorrência"
              : view === "rever"
                ? "Rever e enviar"
                : view === "notificacoes"
                  ? "Notificações de Ocorrências"
                  : view === "encaminhar"
                    ? "Encaminhar ocorrência"
                    : view === "detalhe" && selected
                      ? institutional
                        ? `Tratar ocorrência ${protocoloOcorrencia(selected.numero)}`
                        : `Ocorrência ${protocoloOcorrencia(selected.numero)}`
                      : title}
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            {view === "encaminhar" && selected
              ? `protocolo ${protocoloOcorrencia(selected.numero)}`
              : institutional
                ? "Receba, encaminhe e acompanhe problemas comunicados pelos cidadãos."
                : "Comunique problemas da sua localidade e acompanhe o seu tratamento."}
          </p>
        </div>
        {view === "lista" && !institutional && (
          <button
            type="button"
            onClick={newReport}
            className={`${primary} w-full sm:w-auto`}
          >
            <Plus size={17} />
            Registar ocorrência
          </button>
        )}
      </header>
      {!["criar", "rever", "encaminhar"].includes(view) && (
        <nav
          className="flex gap-2 flex-wrap"
          aria-label="Navegação de Ocorrências"
        >
          <button
            className={view === "lista" ? primary : secondary}
            onClick={() => {
              setView("lista");
              setError("");
            }}
          >
            Ocorrências
          </button>
          <button
            className={view === "notificacoes" ? primary : secondary}
            onClick={() => {
              setDeDetalhe(view === "detalhe");
              setView("notificacoes");
              setError("");
            }}
          >
            <Bell size={16} />
            Notificações{" "}
            {unread > 0 && (
              <span className="bg-red-600 text-white rounded-full px-2 py-0.5 text-[10px]">
                {unread}
              </span>
            )}
          </button>
        </nav>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-xl p-4 bg-red-50 border border-red-200 text-red-800 text-sm"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          role="status"
          className="rounded-xl p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex justify-between gap-3"
        >
          {success}
          <button aria-label="Fechar aviso" onClick={() => setSuccess("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {view === "lista" && (
        <>
          {institutional && (
            <div
              className="flex flex-wrap gap-2"
              aria-label="Ocorrências por estado"
            >
              {(
                [
                  ["recebida", "Recebidas"],
                  ["em_analise", "Em análise"],
                  ["em_resolucao", "Em resolução"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  title={`Filtrar: ${label}`}
                  onClick={() => setState((prev) => (prev === k ? "" : k))}
                  className={`${state === k ? primary : secondary} !rounded-full`}
                >
                  {label}
                  <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-black">
                    {contagens[k] || 0}
                  </span>
                </button>
              ))}
            </div>
          )}
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 ${institutional ? "xl:grid-cols-5" : "xl:grid-cols-3"} gap-3`}
          >
            <Field label="Procurar ocorrência">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  className={`${input} pl-10`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Número, assunto ou localidade"
                />
              </div>
            </Field>
            <Field label="Estado">
              <select
                className={input}
                value={state}
                onChange={(e) => setState(e.target.value)}
              >
                <option value="">Todos os estados</option>
                {Object.entries(ESTADOS_OCORRENCIAS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            {institutional && (
              <Field label="Categoria">
                <select
                  className={input}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Todas as categorias</option>
                  {CATEGORIAS_OCORRENCIAS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            )}
            {institutional && (
              <Field label="Bairro / Localidade">
                <input
                  className={input}
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  placeholder="Filtrar por localidade"
                />
              </Field>
            )}
            <div className="flex items-end">
              <button
                className={`${secondary} w-full`}
                onClick={() => {
                  void loadList();
                  void refreshUnread();
                }}
                disabled={loading}
              >
                <RefreshCw
                  size={16}
                  className={loading ? "animate-spin" : ""}
                />
                Actualizar
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500" aria-live="polite">
            {list.length} de {total} ocorrência(s)
            {loading ? " · A carregar..." : ""}
          </p>
          {list.length === 0 && !loading ? (
            <Empty>
              {error
                ? "Não foi possível carregar a lista. Utilize Actualizar."
                : query || state || category || locality
                  ? "Nenhuma ocorrência corresponde aos filtros."
                  : institutional
                    ? "Ainda não recebeu ocorrências."
                    : "Ainda não registou ocorrências. Utilize «Registar ocorrência» para começar."}
            </Empty>
          ) : (
            institutional ? (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <div className="overflow-auto max-h-[560px]">
                    <table className="w-full text-sm min-w-[640px]">
                      <thead className="sticky top-0 bg-slate-50">
                        <tr className="text-left text-xs text-slate-500">
                          <th className="font-bold px-4 py-3">Nº</th>
                          <th className="font-bold px-4 py-3">Ocorrência</th>
                          <th className="font-bold px-4 py-3">Localidade</th>
                          <th className="font-bold px-4 py-3">Estado</th>
                          <th className="font-bold px-4 py-3">Acção</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((o) => (
                          <tr
                            key={o.id}
                            className="border-t border-slate-100 hover:bg-slate-50/60"
                          >
                            <td className="px-4 py-3 font-bold text-xs text-slate-500 whitespace-nowrap">
                              {protocoloOcorrencia(o.numero)}
                            </td>
                            <td className="px-4 py-3 font-bold text-primary break-words">
                              {o.titulo}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600">
                              {o.bairro}
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <Estado value={o.estado} />
                                <p className="text-[11px] text-slate-500">
                                  {o.responsavel || "Por atribuir"}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={loading}
                                  onClick={() => void openDetail(o.id)}
                                  className={`${secondary} !px-3 !py-1.5`}
                                >
                                  Ver
                                </button>
                                <button
                                  type="button"
                                  disabled={loading || busy}
                                  onClick={() => setParaEliminar(o)}
                                  title="Eliminar ocorrência"
                                  aria-label={`Eliminar ${protocoloOcorrencia(o.numero)}`}
                                  className={`${secondary} !px-3 !py-1.5 !text-red-600 !border-red-200 hover:!bg-red-50`}
                                >
                                  <Trash2 size={14} />
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Até 10 itens visíveis · Role para consultar mais.
                </p>
              </>
            ) : (
              <ListaRolavel count={list.length} label={title}>
                {list.map((o) => (
                  <div key={o.id} className="space-y-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => void openDetail(o.id)}
                      className={`${panel} w-full !space-y-2 text-left hover:border-primary/40 transition-colors disabled:opacity-60`}
                    >
                      <div className="flex gap-3 justify-between">
                        <div className="min-w-0 flex-1 space-y-1">
                          <span className="font-bold text-xs text-slate-500">
                            {protocoloOcorrencia(o.numero)}
                          </span>
                          <h3 className="font-black text-primary text-base break-words">
                            {o.titulo}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {o.bairro} · {o.municipio}
                          </p>
                          <p className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                            Status: <Estado value={o.estado} />
                          </p>
                          <p className="text-xs text-slate-500">
                            Criada em {date(o.criado_em)}
                          </p>
                        </div>
                        {o.capa_url ? (
                          <img
                            src={o.capa_url}
                            alt={o.capa_nome || o.titulo}
                            loading="lazy"
                            className="w-[129px] h-[92px] md:w-[166px] md:h-[110px] object-cover rounded-[15%] border border-slate-200 shrink-0"
                          />
                        ) : (
                          <span className="w-[129px] h-[92px] md:w-[166px] md:h-[110px] rounded-[15%] bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                            <Camera size={20} />
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-primary font-bold inline-flex gap-2 items-center">
                        Ver detalhes
                        <ArrowRight size={14} />
                      </span>
                    </button>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={loading || busy}
                        onClick={() => setParaEliminar(o)}
                        title="Eliminar ocorrência"
                        aria-label={`Eliminar ${protocoloOcorrencia(o.numero)}`}
                        className={`${secondary} !px-3 !py-1.5 !text-red-600 !border-red-200 hover:!bg-red-50`}
                      >
                        <Trash2 size={14} />
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </ListaRolavel>
            )
          )}
          {more && (
            <button
              disabled={loading}
              onClick={() => void loadList(true)}
              className={secondary}
            >
              Carregar mais ocorrências
            </button>
          )}
          {!institutional && <Safety />}
        </>
      )}
      {view === "criar" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const errs = validarOcorrencia(data);
            if (errs.length) {
              setError(errs.join(" "));
              return;
            }
            if (tipoLocalizacao === "automatico" && (!gps || gpsEstado !== "sucesso")) {
              setGpsEstado("erro");
              setGpsErro(
                "Obtenha a localização GPS (ou mude para «Manual») antes de rever a ocorrência.",
              );
              setError("");
              return;
            }
            if (tipoLocalizacao === "automatico" && localGpsAObter) {
              setError(
                "A localidade do GPS ainda está a ser determinada. Aguarde uns segundos e volte a tentar.",
              );
              return;
            }
            setError("");
            setConfirmed(false);
            setView("rever");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="space-y-4"
        >
          <div className={panel}>
            <h3 className="font-black text-primary">O que aconteceu?</h3>
            <Field label="Categoria *">
              <select
                required
                className={input}
                value={data.categoria}
                onChange={(e) =>
                  setData({ ...data, categoria: e.target.value })
                }
              >
                <option value="">Seleccione a categoria</option>
                {CATEGORIAS_OCORRENCIAS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Título *">
              <input
                required
                minLength={5}
                maxLength={160}
                className={input}
                value={data.titulo}
                onChange={(e) => setData({ ...data, titulo: e.target.value })}
                placeholder="Ex.: Poste de iluminação avariado"
              />
            </Field>
            <Field label="Descrição *">
              <textarea
                required
                minLength={10}
                maxLength={5000}
                rows={4}
                className={input}
                value={data.descricao}
                onChange={(e) =>
                  setData({ ...data, descricao: e.target.value })
                }
                placeholder="Explique o problema, há quanto tempo acontece e o local exacto."
              />
            </Field>
          </div>
          <div className={panel}>
            <h3 className="font-black text-primary flex gap-2">
              <MapPin size={18} />
              Localização
            </h3>
            {/* Tabbar no estilo da página Contactos (sublinhado activo). */}
            <div
              role="tablist"
              aria-label="Tipo de localização"
              className="flex items-end gap-1.5 md:gap-5 border-b border-slate-200 overflow-x-auto custom-scrollbar-h"
            >
              {(
                [
                  { chave: "manual" as const, rotulo: "Manual", Icone: MapPin },
                  {
                    chave: "automatico" as const,
                    rotulo: "Automático (GPS)",
                    Icone: LocateFixed,
                  },
                ] as const
              ).map(({ chave, rotulo, Icone }) => {
                const activo = tipoLocalizacao === chave;
                return (
                  <button
                    key={chave}
                    type="button"
                    role="tab"
                    aria-selected={activo}
                    onClick={() => {
                      setTipoLocalizacao(chave);
                      setGpsErro("");
                      // Re-sincronizar a localidade derivada do GPS já obtido
                      // (a leitura GPS volta a ser a fonte de verdade).
                      if (chave === "automatico" && gps)
                        void derivarLocalidadeGps(gps.lat, gps.lon);
                    }}
                    className={`relative flex items-center gap-2.5 px-3 md:px-6 py-2.5 md:py-3 -mb-px whitespace-nowrap text-[0.7rem] md:text-[0.9rem] font-black transition-colors bg-transparent border-0 border-b-2 cursor-pointer ${
                      activo
                        ? "text-primary border-primary"
                        : "text-slate-400 border-transparent hover:text-slate-600"
                    }`}
                    id={`tab-localizacao-${chave}`}
                  >
                    <Icone
                      size={18}
                      className="md:w-[1.4rem] md:h-[1.4rem] shrink-0"
                      strokeWidth={activo ? 2.2 : 1.8}
                    />
                    {rotulo}
                  </button>
                );
              })}
            </div>
            {tipoLocalizacao === "manual" ? (
              <p className="text-xs text-slate-500">
                Não é necessário autorizar GPS. Indique a localização onde o
                problema ocorre.
              </p>
            ) : (
              <div className="space-y-3">
                {gpsEstado === "erro" ? (
                  <div
                    role="alert"
                    className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900 space-y-2.5"
                  >
                    <p className="text-sm font-bold flex gap-2 items-start">
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                      {gpsErro}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void obterGps()}
                        className={secondary}
                      >
                        <LocateFixed size={14} />
                        Tentar novamente
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTipoLocalizacao("manual");
                          setGpsErro("");
                        }}
                        className={secondary}
                      >
                        Usar localização Manual
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`rounded-xl border p-3 space-y-2 ${
                      gpsEstado === "sucesso"
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    {gpsEstado === "carregando" ? (
                      <p className="text-sm font-bold text-slate-600 flex items-center gap-2">
                        <LocateFixed size={16} className="text-slate-400" />
                        A obter localização do GPS…
                      </p>
                    ) : gpsEstado === "sucesso" && gps ? (
                      <>
                        <p className="text-sm font-black text-emerald-800 flex items-center gap-2">
                          <CheckCircle size={16} />
                          Localização obtida
                        </p>
                        <p className="text-xs text-emerald-900 font-mono break-words">
                          {gps.lat.toFixed(6)}, {gps.lon.toFixed(6)} · ±
                          {Math.max(1, Math.round(gps.precisao))} m
                        </p>
                        {localGpsAObter ? (
                          <p className="text-xs text-emerald-900/80 flex items-center gap-2">
                            <Loader2 size={13} className="animate-spin shrink-0" />
                            A determinar a localidade a partir do GPS…
                          </p>
                        ) : localGps ? (
                          <p className="text-xs text-emerald-900 font-bold break-words">
                            Localidade: {localGps.bairro} · {localGps.municipio} ·{" "}
                            {localGps.provincia}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-xs text-slate-600">
                        Vai ser pedido acesso ao GPS do seu dispositivo (no
                        telemóvel, o pedido aparece no ecrã do aparelho). Se a
                        primeira leitura demorar, mantenha a página aberta — de
                        preferência num local aberto.
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void obterGps()}
                        disabled={gpsEstado === "carregando"}
                        className={primary}
                      >
                        {gpsEstado === "carregando" ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <LocateFixed size={16} />
                        )}
                        {gpsEstado === "sucesso"
                          ? "Atualizar localização"
                          : "Obter localização (GPS)"}
                      </button>
                    </div>
                  </div>
                )}
                <p className="text-xs text-slate-500">
                  As coordenadas GPS e a localidade aproximada que delas se
                  obtém são guardadas com a ocorrência e partilhadas com a
                  instituição.
                </p>
              </div>
            )}
            {/* Campos de endereço: apenas no modo Manual — no Automático o
                GPS determina a localidade (ver localGps). */}
            {tipoLocalizacao === "manual" && (
              <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Província *">
                <select
                  required
                  className={input}
                  value={data.provincia}
                  onChange={(e) =>
                    setData({
                      ...data,
                      provincia: e.target.value,
                      municipio: "",
                    })
                  }
                >
                  <option value="">Seleccione a província</option>
                  {Object.keys(MUNICIPALITIES_BY_PROVINCE)
                    .filter((pr) => pr !== "Todas")
                    .map((pr) => (
                      <option key={pr} value={pr}>
                        {pr}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Município *">
                <select
                  required
                  className={input}
                  value={data.municipio}
                  disabled={!data.provincia}
                  onChange={(e) =>
                    setData({ ...data, municipio: e.target.value })
                  }
                >
                  <option value="">
                    {data.provincia
                      ? "Seleccione o município"
                      : "Escolha primeiro a província"}
                  </option>
                  {(MUNICIPALITIES_BY_PROVINCE[data.provincia] || [])
                    .filter((m) => m !== "Todos")
                    .map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Bairro / Localidade *">
                  <input
                    className={input}
                    required
                    minLength={2}
                    maxLength={160}
                    value={data.bairro}
                    onChange={(e) =>
                      setData({ ...data, bairro: e.target.value })
                    }
                  />
                </Field>
              </div>
            </div>
              <Field label="Rua / Ponto de referência *">
                <input
                  className={input}
                  required
                  minLength={3}
                  maxLength={500}
                  value={data.referencia}
                  onChange={(e) =>
                    setData({ ...data, referencia: e.target.value })
                  }
                  placeholder="Ex.: junto à escola, em frente ao mercado"
                />
              </Field>
              </>
            )}
          </div>
          <div className={panel}>
            <h3 className="font-black text-primary flex items-center gap-2">
              <Camera size={18} />
              Fotografias (opcional)
            </h3>
            <p className="text-xs text-slate-500">
              Até 5 fotografias JPEG, PNG ou WebP. São comprimidas para poupar
              dados e guardadas de forma privada. Evite rostos e documentos
              pessoais desnecessários.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-slate-200 overflow-hidden"
                >
                  <img
                    alt={p.nome}
                    src={p.url}
                    className="h-28 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => void removePhoto(p.id)}
                    disabled={photoBusy}
                    className={`${secondary} w-full !rounded-none`}
                  >
                    <X size={14} />
                    Remover fotografia
                  </button>
                </div>
              ))}
            </div>
            <Field
              label={
                photoBusy
                  ? "A carregar fotografia..."
                  : `Adicionar fotografias (${photos.length}/5)`
              }
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={photoBusy || photos.length >= 5}
                className={input}
                onChange={(e) => {
                  void upload(e.target.files);
                  e.target.value = "";
                }}
              />
            </Field>
          </div>
          <div className={panel}>
            <h3 className="font-black text-primary flex items-center gap-2">
              <Building2 size={18} />
              Instituição destinatária
            </h3>
            <p className="text-xs text-slate-500">
              Digite o código institucional da responsável pelo problema e pela
              localidade (ex.: INAPEM-LLMM). A lista sugere instituições com
              registo aprovado no CDA.
            </p>
            <Field label="Código institucional *">
              <input
                type="text"
                required
                className={input}
                placeholder="Ex.: INAPEM-LLMM"
                autoComplete="off"
                spellCheck={false}
                list="oco-instituicoes-habilitadas"
                value={data.instituicao_codigo}
                onChange={(e) =>
                  setData({
                    ...data,
                    instituicao_codigo: e.target.value
                      .toUpperCase()
                      .replace(/\s+/g, ""),
                  })
                }
              />
              <datalist id="oco-instituicoes-habilitadas">
                {institutions.map((i) => (
                  <option key={i.codigo} value={i.codigo}>
                    {i.nome}
                    {i.municipio ? ` · ${i.municipio}` : ""}
                  </option>
                ))}
              </datalist>
            </Field>
            {codigoDigitado && !currentInstitution && (
              <p role="alert" className="text-amber-800 text-sm">
                Este código não consta da lista de instituições habilitadas
                carregada. Verifique a digitação antes de enviar.
              </p>
            )}
            {currentInstitution && (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <span className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                  <Building2 size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-primary break-words">
                    {currentInstitution.nome}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {currentInstitution.codigo}
                    {currentInstitution.municipio
                      ? ` · ${currentInstitution.municipio}`
                      : ""}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 shrink-0">
                  <ShieldCheck size={14} />
                  Habilitada no CDA
                </span>
              </div>
            )}
            {!institutions.length && (
              <p role="alert" className="text-amber-800 text-sm">
                Não foi possível carregar a lista de instituições habilitadas.
                Pode digitar o código na mesma — confirme que está correcto.
              </p>
            )}
          </div>
          <Safety />
          <p className="text-xs text-slate-500">
            Este formulário ainda não foi enviado. Ao sair, os dados não
            submetidos podem perder-se; fotografias temporárias expiram após 24
            horas.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className={secondary}
              onClick={() => void cancelReport()}
              disabled={busy || photoBusy}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={photoBusy || busy || !institutions.length}
              className={primary}
            >
              Rever ocorrência
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      )}
      {view === "rever" && (
        <div className="space-y-4">
          <div className={panel}>
            <h3 className="font-black text-primary">Detalhes da Ocorrência</h3>
            <dl className="text-sm space-y-2">
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 text-slate-500">Categoria</dt>
                <dd className="font-bold text-slate-800">{data.categoria}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 text-slate-500">Título</dt>
                <dd className="font-bold text-slate-800 break-words">
                  {data.titulo}
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 text-slate-500">Descrição</dt>
                <dd className="text-slate-700 whitespace-pre-wrap break-words">
                  {data.descricao}
                </dd>
              </div>
            </dl>
          </div>
          <div className={panel}>
            <h3 className="font-black text-primary">Localização</h3>
            <div className="flex gap-3 text-sm">
              <span className="w-24 shrink-0 text-slate-500">Tipo</span>
              <span className="text-slate-700 font-bold">
                {tipoLocalizacao === "automatico" && gps
                  ? "Localização automática (GPS)"
                  : "Localização manual"}
              </span>
            </div>
            {tipoLocalizacao === "automatico" && gps && (
              <div className="flex gap-3 text-sm">
                <span className="w-24 shrink-0 text-slate-500">
                  Coordenadas
                </span>
                <span className="text-slate-700 font-mono break-words">
                  {gps.lat.toFixed(6)}, {gps.lon.toFixed(6)} · ±
                  {Math.max(1, Math.round(gps.precisao))} m
                </span>
              </div>
            )}
            <div className="flex gap-3 text-sm">
              <span className="w-24 shrink-0 text-slate-500">Endereço</span>
              <span className="text-slate-700">
                {data.bairro} · {data.municipio} · {data.provincia}
                <br />
                {data.referencia}
              </span>
            </div>
          </div>
          <div className={panel}>
            <h3 className="font-black text-primary">Anexos</h3>
            <p className="text-sm text-slate-600">
              Fotografias ({photos.length})
            </p>
            <Photos photos={photos} />
          </div>
          <div className={panel}>
            <h3 className="font-black text-primary">Instituição Destinatária</h3>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                <Building2 size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-primary break-words">
                  {currentInstitution?.nome || data.instituicao_codigo}
                </p>
                <p className="text-[11px] text-slate-500">
                  {currentInstitution
                    ? `${data.instituicao_codigo}${
                        currentInstitution.municipio
                          ? ` · ${currentInstitution.municipio}`
                          : ""
                      }`
                    : data.instituicao_codigo}
                </p>
              </div>
              {currentInstitution ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 shrink-0">
                  <ShieldCheck size={14} />
                  Habilitada no CDA
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 shrink-0">
                  Código informado
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Fotografias e localização serão partilhadas com a instituição
              destinatária.
            </p>
          </div>
          <label className="flex items-start gap-3 p-4 rounded-xl border bg-white text-sm">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={busy || attempted}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1"
            />
            Confirmo os dados e a instituição destinatária.
          </label>
          {attempted && error && (
            <p className="text-xs text-amber-800">
              Tente novamente com os mesmos dados para evitar duplicados, ou
              volte à lista para verificar se a ocorrência já foi submetida.
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              className={secondary}
              disabled={busy || attempted}
              onClick={() => {
                setView("criar");
                setError("");
              }}
            >
              Editar
            </button>
            <button
              className={primary}
              disabled={busy || !confirmed}
              onClick={() => void submit()}
            >
              {busy ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Send size={16} />
              )}
              Enviar ocorrência
            </button>
          </div>
        </div>
      )}
      {view === "detalhe" && selected && (
        <>
          <div className="flex flex-wrap justify-between gap-2 items-center">
            <Estado value={selected.estado} />
            <button
              className={secondary}
              disabled={loading || busy}
              onClick={() => void openDetail(selected.id)}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Actualizar detalhes
            </button>
          </div>
          {institutional ? (
            <div className="space-y-4">
              <div className={panel}>
                <h3 className="text-xl font-black text-primary break-words">
                  {selected.titulo}
                </h3>
                <p className="text-xs text-slate-500 flex gap-1.5 items-center">
                  <MapPin size={14} />
                  {selected.bairro} · {selected.municipio} ·{" "}
                  {selected.provincia}
                </p>
                <p className="text-xs font-bold text-slate-600 break-words">
                  {rotuloTipoLocalizacao(selected)}
                  {selected.tipo_localizacao === "automatica" &&
                  coordenadasGps(selected)
                    ? ` · ${coordenadasGps(selected)}`
                    : ""}
                </p>
                <p className="text-sm whitespace-pre-wrap break-words text-slate-700">
                  {selected.descricao}
                </p>
                <p className="text-xs text-slate-500">
                  {selected.categoria} · {selected.referencia}
                </p>
                {detailPhotos.length > 0 && (
                  <>
                    <Photos photos={detailPhotos} proporcional />
                    <p className="text-[11px] text-slate-400">
                      As ligações das fotografias expiram por segurança.
                      Utilize «Actualizar detalhes» para renová-las.
                    </p>
                  </>
                )}
              </div>
              <div className={panel}>
                <h3 className="font-black text-primary flex items-center gap-2">
                  <MapPin size={18} />
                  Mapa da ocorrência
                </h3>
                <MapaOcorrencia
                  provincia={selected.provincia}
                  municipio={selected.municipio}
                  bairro={selected.bairro}
                  rua={selected.rua}
                  lat={selected.lat}
                  lon={selected.lon}
                  precisao={selected.precisao_m}
                />
              </div>
              <div className={panel}>
                <div>
                  <span className="block text-xs font-bold text-slate-600 mb-1.5">
                    Responsável pelo tratamento
                  </span>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      className={input}
                      value={tratResp}
                      minLength={2}
                      maxLength={160}
                      placeholder="Ex.: Equipa técnica"
                      disabled={busy || loading}
                      onChange={(e) => setTratResp(e.target.value)}
                    />
                    <button
                      type="button"
                      className={`${secondary} shrink-0`}
                      disabled={busy || loading}
                      onClick={() => void submitResponsavel()}
                    >
                      Atribuir
                    </button>
                  </div>
                </div>
                {transicoes.length > 0 && (
                  <>
                    <Field label="Actualizar estado">
                      <select
                        className={input}
                        value={tratAlvo}
                        disabled={busy || loading}
                        onChange={(e) => setTratAlvo(e.target.value)}
                      >
                        <option value="">Seleccione o novo estado</option>
                        {transicoes.map((t) => (
                          <option key={t.alvo} value={t.alvo}>
                            {ESTADOS_OCORRENCIAS[t.alvo] || t.alvo}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Justificação da alteração *">
                      <textarea
                        className={input}
                        rows={4}
                        minLength={5}
                        maxLength={5000}
                        value={tratNota}
                        disabled={busy || loading}
                        onChange={(e) => setTratNota(e.target.value)}
                        placeholder="Descreva a intervenção ou o motivo"
                      />
                    </Field>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className={primary}
                        disabled={busy || loading || !tratAlvo}
                        onClick={() => void submitTratamento()}
                      >
                        Guardar actualização
                      </button>
                    </div>
                  </>
                )}
                <div className="flex flex-wrap gap-2">
                  {acoesTrat.some((a) => a.id === "pedir_esclarecimento") && (
                    <button
                      type="button"
                      className={secondary}
                      disabled={busy || loading}
                      onClick={() => {
                        const a = acoesTrat.find(
                          (x) => x.id === "pedir_esclarecimento",
                        );
                        setActionError("");
                        if (a) setAction(a);
                      }}
                    >
                      Pedir esclarecimento
                    </button>
                  )}
                  {acoesTrat.some((a) => a.id === "encaminhar") && (
                    <button
                      type="button"
                      className={primary}
                      disabled={busy || loading}
                      onClick={() => setView("encaminhar")}
                    >
                      Encaminhar
                    </button>
                  )}
                </div>
              </div>
              <div className={panel}>
                <h3 className="font-black text-primary">Acompanhamento</h3>
                <p className="text-xs text-slate-500 -mt-1">
                  Clique num ponto para propor a mudança de estado.
                </p>
                <TimelineOcorrencia
                  estado={selected.estado}
                  events={events}
                  clicavel
                  onPonto={pedirMudancaTimeline}
                />
              </div>
              {tlAlvo !== null && selected && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Actualizar estado da ocorrência"
                  onClick={fecharMudancaTimeline}
                >
                  <div
                    className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl space-y-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="font-black text-primary">
                      Actualizar estado
                    </h3>
                    {tlBloqueio ? (
                      <p role="alert" className="text-sm text-amber-800">
                        {tlBloqueio}
                      </p>
                    ) : (
                      <>
                        <p className="text-sm text-slate-700">
                          Pretende actualizar a ocorrência de{" "}
                          <strong>
                            «
                            {ESTADOS_OCORRENCIAS[selected.estado] ||
                              selected.estado}
                            »
                          </strong>{" "}
                          para{" "}
                          <strong>
                            «{ESTADOS_OCORRENCIAS[tlAlvo] || tlAlvo}»
                          </strong>
                          ?
                        </p>
                        {transicoes.find((x) => x.alvo === tlAlvo)
                          ?.exigeNota && (
                          <Field label="Justificação da alteração *">
                            <textarea
                              className={input}
                              rows={3}
                              minLength={5}
                              maxLength={5000}
                              value={tlNota}
                              disabled={busy}
                              onChange={(e) => setTlNota(e.target.value)}
                              placeholder="Descreva a intervenção ou o motivo"
                            />
                          </Field>
                        )}
                        {tlErro && (
                          <p role="alert" className="text-sm text-rose-700">
                            {tlErro}
                          </p>
                        )}
                      </>
                    )}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className={secondary}
                        disabled={busy}
                        onClick={fecharMudancaTimeline}
                      >
                        {tlBloqueio ? "Fechar" : "Cancelar"}
                      </button>
                      {!tlBloqueio && (
                        <button
                          type="button"
                          className={primary}
                          disabled={busy}
                          onClick={() => void confirmarMudancaTimeline()}
                        >
                          {busy ? "A actualizar…" : "Confirmar actualização"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div className={panel}>
                <h3 className="font-black text-primary flex items-center gap-2">
                  <Clock size={18} />
                  Histórico
                </h3>
                <TabelaHistorico events={events} />
                {moreHistory && (
                  <button
                    className={secondary}
                    disabled={loading}
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const r = await ocorrenciasApi("historico", {
                          id: selected.id,
                          offset: events.length,
                        });
                        setEvents((prev) => [...prev, ...r.lista]);
                        setMoreHistory(r.mais);
                      } catch (e) {
                        showError(e);
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    Carregar mais histórico
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="xl:col-span-2 space-y-4">
                <div className={panel}>
                  <h3 className="text-xl font-black text-primary break-words">
                    {selected.titulo}
                  </h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-slate-500">Categoria</dt>
                      <dd className="font-bold text-slate-800">
                        {selected.categoria}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Localização</dt>
                      <dd className="font-bold text-slate-800">
                        {selected.bairro} · {selected.municipio}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">
                        Instituição responsável
                      </dt>
                      <dd className="font-bold text-slate-800 break-words">
                        {selected.instituicao_nome}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Enviada em</dt>
                      <dd className="font-bold text-slate-800">
                        {date(selected.criado_em)}
                      </dd>
                    </div>
                  </dl>
                  <p className="text-sm whitespace-pre-wrap break-words text-slate-700">
                    {selected.descricao}
                  </p>
                  <div className="text-sm text-slate-600 space-y-1 border-t pt-3">
                    <p className="font-bold">
                      {rotuloTipoLocalizacao(selected)}
                    </p>
                    <p>
                      {selected.bairro} · {selected.municipio} ·{" "}
                      {selected.provincia}
                    </p>
                    {selected.rua && <p>{selected.rua}</p>}
                    <p>{selected.referencia}</p>
                    {selected.tipo_localizacao === "automatica" &&
                    coordenadasGps(selected) ? (
                      <p className="font-mono text-xs text-slate-500">
                        GPS: {coordenadasGps(selected)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-primary text-sm">
                      Fotografias ({detailPhotos.length})
                    </h4>
                    <button
                      type="button"
                      className={secondary}
                      onClick={() => setVerFotos((v) => !v)}
                    >
                      {verFotos ? "Ocultar fotografias" : "Ver fotografias"}
                    </button>
                  </div>
                  {verFotos && detailPhotos.length > 0 && (
                    <Photos photos={detailPhotos} />
                  )}
                  {verFotos && detailPhotos.length === 0 && (
                    <p className="text-sm text-slate-500">
                      Sem fotografias anexadas.
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400">
                    As ligações das fotografias expiram por segurança. Utilize
                    «Actualizar detalhes» para renová-las.
                  </p>
                </div>
                <div className={panel}>
                  <h3 className="font-black text-primary flex items-center gap-2">
                    <MessageSquare size={18} />
                    Comunicações
                  </h3>
                  <BolhasComunicacao events={events} />
                  {podeEsclarecer && (
                    <div className="space-y-2">
                      <textarea
                        className={input}
                        rows={3}
                        maxLength={5000}
                        value={esclarecimento}
                        disabled={busy || loading}
                        onChange={(e) => setEsclarecimento(e.target.value)}
                        placeholder="Adicionar esclarecimento..."
                        aria-label="Adicionar esclarecimento"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className={primary}
                          disabled={
                            busy ||
                            loading ||
                            esclarecimento.trim().length < 5
                          }
                          onClick={() => void submitEsclarecimento()}
                        >
                          Enviar esclarecimento
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className={panel}>
                  <h3 className="font-black text-primary flex items-center gap-2">
                    <Clock size={18} />
                    Histórico
                  </h3>
                  <TabelaHistorico events={events} />
                  {moreHistory && (
                    <button
                      className={secondary}
                      disabled={loading}
                      onClick={async () => {
                        setLoading(true);
                        try {
                          const r = await ocorrenciasApi("historico", {
                            id: selected.id,
                            offset: events.length,
                          });
                          setEvents((prev) => [...prev, ...r.lista]);
                          setMoreHistory(r.mais);
                        } catch (e) {
                          showError(e);
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >
                      Carregar mais histórico
                    </button>
                  )}
                </div>
              </div>
              <aside className="space-y-4">
                <div className={panel}>
                  <h3 className="font-black text-primary">Informação</h3>
                  <dl className="space-y-3 text-xs">
                    <div>
                      <dt className="text-slate-500">Instituição responsável</dt>
                      <dd className="font-bold mt-1 break-words">
                        {selected.instituicao_nome}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Responsável / equipa</dt>
                      <dd className="font-bold mt-1">
                        {selected.responsavel || "Por atribuir"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Data de submissão</dt>
                      <dd className="mt-1">{date(selected.criado_em)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Última actualização</dt>
                      <dd className="mt-1">{date(selected.actualizado_em)}</dd>
                    </div>
                  </dl>
                  <p className="text-xs text-slate-500">
                    «Submetida» significa guardada no CDA. «Recebida» só é
                    atribuída após confirmação da instituição.
                  </p>
                </div>
                <div className={panel}>
                  <h3 className="font-black text-primary">Acompanhamento</h3>
                  <TimelineOcorrencia
                    estado={selected.estado}
                    events={events}
                  />
                </div>
                <div className={panel}>
                  <h3 className="font-black text-primary">A sua participação</h3>
                  {acoesCidada
                    .filter((a) => a.id !== "esclarecer")
                    .map((a) => (
                      <button
                        key={a.id}
                        className={`${secondary} w-full`}
                        onClick={() => {
                          setActionError("");
                          setAction(a);
                        }}
                        disabled={busy || loading}
                      >
                        {a.label}
                      </button>
                    ))}
                  {acoesCidada.length === 0 && (
                    <p className="text-xs text-slate-500">
                      {["resolvida", "encerrada"].includes(selected.estado)
                        ? "Ocorrência concluída. O histórico permanece disponível."
                        : "Aguarde uma actualização da instituição."}
                    </p>
                  )}
                </div>
              </aside>
            </div>
          )}
          {!institutional && <Safety />}
        </>
      )}
      {view === "encaminhar" && selected && (
        <div className="space-y-4">
          <div className={panel}>
            <h3 className="text-xl font-black text-primary break-words">
              {selected.titulo}
            </h3>
            <p className="text-xs text-slate-500 flex gap-1.5 items-center">
              <MapPin size={14} />
              {selected.bairro} · {selected.municipio}
            </p>
          </div>
          <div className={panel}>
            <Field label="Instituição de destino *">
              <select
                className={input}
                value={encDestino}
                disabled={busy}
                onChange={(e) => setEncDestino(e.target.value)}
              >
                <option value="">Instituições habilitadas no CDA</option>
                {institutions
                  .filter((it) => it.codigo !== selected.instituicao_codigo)
                  .map((it) => (
                    <option key={it.codigo} value={it.codigo}>
                      {it.nome} · {it.codigo}
                    </option>
                  ))}
              </select>
            </Field>
            {(() => {
              const dest = institutions.find((it) => it.codigo === encDestino);
              return dest ? (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                    <Building2 size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-primary break-words">
                      {dest.nome}
                    </p>
                    <p className="text-[11px] text-slate-500">{dest.codigo}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 shrink-0">
                    <ShieldCheck size={14} />
                    Habilitada
                  </span>
                </div>
              ) : null;
            })()}
            <Field label="Motivo do encaminhamento *">
              <textarea
                className={input}
                rows={4}
                minLength={5}
                maxLength={5000}
                value={encMotivo}
                disabled={busy}
                onChange={(e) => setEncMotivo(e.target.value)}
                placeholder="Ex.: Competência de manutenção da iluminação pública."
              />
            </Field>
            <fieldset>
              <legend className="text-xs font-bold text-slate-600 mb-1.5">
                O encaminhamento inclui sempre
              </legend>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                {["Fotografias", "Descrição", "Localização", "Histórico"].map(
                  (t) => (
                    <label
                      key={t}
                      className="flex gap-2 items-center text-slate-700"
                    >
                      <input type="checkbox" checked disabled />
                      {t}
                    </label>
                  ),
                )}
              </div>
            </fieldset>
            <p className="text-xs text-slate-500">
              A origem, o destino e a justificação ficam registados no
              histórico. O cidadão será notificado após confirmação do
              encaminhamento.
            </p>
          </div>
          {institutions.filter((it) => it.codigo !== selected.instituicao_codigo)
            .length === 0 && (
            <p className="flex gap-2 text-xs text-indigo-800 bg-indigo-50 border border-indigo-200 rounded-xl p-3">
              <AlertTriangle size={16} className="shrink-0" />
              Sem instituição habilitada? Mantenha a ocorrência em análise e
              informe o cidadão; não há destino automático.
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className={secondary}
              disabled={busy}
              onClick={() => setView("detalhe")}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={primary}
              disabled={busy || !encDestino || encMotivo.trim().length < 5}
              onClick={() => void submitEncaminhar()}
            >
              Confirmar encaminhamento
            </button>
          </div>
        </div>
      )}
      {view === "notificacoes" && (
        <>
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div
              role="tablist"
              aria-label="Filtro de notificações"
              className="flex gap-2"
            >
              <button
                type="button"
                role="tab"
                aria-selected={abaNotif === "todas"}
                onClick={() => setAbaNotif("todas")}
                className={abaNotif === "todas" ? primary : secondary}
              >
                Todas
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={abaNotif === "naoLidas"}
                onClick={() => setAbaNotif("naoLidas")}
                className={abaNotif === "naoLidas" ? primary : secondary}
              >
                Não lidas{" "}
                {unread > 0 && (
                  <span className="bg-red-600 text-white rounded-full px-2 py-0.5 text-[10px]">
                    {unread}
                  </span>
                )}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {deDetalhe && selected && (
                <button
                  className={primary}
                  onClick={() => {
                    setDeDetalhe(false);
                    setView("detalhe");
                  }}
                >
                  <ArrowLeft size={14} />
                  Voltar à ocorrência
                </button>
              )}
              <button
                className={secondary}
                onClick={() => void loadNotifs()}
                disabled={loading}
              >
                <RefreshCw size={14} />
                Actualizar notificações
              </button>
            </div>
          </div>
          {loading && (
            <p role="status" className="text-xs text-slate-500">
              A carregar notificações...
            </p>
          )}
          {!notifs.length && !loading ? (
            <Empty>
              {error
                ? "Não foi possível carregar as notificações."
                : "Não existem notificações para esta selecção."}
            </Empty>
          ) : (
            <ListaRolavel
              count={notifs.length}
              label="Notificações de Ocorrências"
            >
              {notifs.map((n) => (
                <article
                  key={n.id}
                  className={`${panel} !space-y-2 ${n.lida ? "" : "!border-indigo-200"}`}
                >
                  <div className="flex justify-between gap-2">
                    <h3 className="font-bold text-primary flex items-center gap-2">
                      {!n.lida && (
                        <span className="w-2 h-2 bg-indigo-600 rounded-full shrink-0" />
                      )}
                      {n.titulo}
                    </h3>
                    <time
                      className="text-[11px] text-slate-500 shrink-0"
                      title={date(n.criado_em)}
                    >
                      {hora(n.criado_em)}
                    </time>
                  </div>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap break-words">
                    {n.mensagem}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className={secondary}
                      disabled={loading}
                      onClick={() => void markRead(n, true)}
                    >
                      Abrir ocorrência
                      <ArrowRight size={14} />
                    </button>
                    {!n.lida && (
                      <button
                        className={secondary}
                        disabled={loading}
                        onClick={() => void markRead(n, false)}
                      >
                        Marcar como lida
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </ListaRolavel>
          )}
          {moreNotifs && (
            <button
              className={secondary}
              disabled={loading}
              onClick={() => void loadNotifs(true)}
            >
              Carregar mais notificações
            </button>
          )}
        </>
      )}
      {paraEliminar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Eliminar ocorrência"
          onClick={() => {
            if (!busy) setParaEliminar(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-3 items-start">
              <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
              <div className="space-y-1 min-w-0">
                <h3 className="font-black text-primary">Eliminar ocorrência</h3>
                <p className="text-sm text-slate-600">
                  Esta acção é definitiva. A ocorrência, o histórico, as
                  notificações e as fotografias são removidos e deixam de
                  aparecer nas duas áreas.
                </p>
                <p className="text-xs font-bold text-slate-500 break-words">
                  {protocoloOcorrencia(paraEliminar.numero)} · {paraEliminar.titulo}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                className={secondary}
                disabled={busy}
                onClick={() => setParaEliminar(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void eliminar(paraEliminar)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
              >
                {busy ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
      {action && selected && (
        <ActionDialog
          action={action}
          institutions={institutions}
          current={selected}
          busy={busy}
          error={actionError}
          onClose={() => {
            if (!busy) setAction(null);
          }}
          onSubmit={(d, p) => void perform(d, p)}
        />
      )}
    </section>
  );
}
