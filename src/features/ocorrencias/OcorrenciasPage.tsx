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
} from "lucide-react";
import { ListaRolavel } from "../../components/ui/ListaRolavel";
import {
  ocorrenciasApi,
  prepararFotografia,
  OcorrenciaRequestError,
} from "./client";
import {
  CATEGORIAS_OCORRENCIAS,
  ESTADOS_OCORRENCIAS,
  DADOS_VAZIOS,
  validarOcorrencia,
  protocoloOcorrencia,
  acoesOcorrencia,
  type ActorOcorrencia,
  type InstituicaoOcorrencia,
  type DadosOcorrencia,
  type Ocorrencia,
  type FotoOcorrencia,
  type EventoOcorrencia,
  type NotificacaoOcorrencia,
  type AcaoOcorrencia,
} from "./model";
const date = (s: string) =>
  new Date(s).toLocaleString("pt-AO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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
function Photos({ photos }: { photos: FotoOcorrencia[] }) {
  return photos.length ? (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
            className="w-full h-28 md:h-36 object-cover"
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
    "lista" | "criar" | "rever" | "detalhe" | "notificacoes"
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
  const [query, setQuery] = useState(""),
    [state, setState] = useState(""),
    [category, setCategory] = useState(""),
    [locality, setLocality] = useState("");
  const [data, setData] = useState<DadosOcorrencia>({ ...DADOS_VAZIOS }),
    [photos, setPhotos] = useState<FotoOcorrencia[]>([]),
    [confirmed, setConfirmed] = useState(false),
    [attempted, setAttempted] = useState(false);
  const createRequest = useRef(crypto.randomUUID());
  const [selected, setSelected] = useState<Ocorrencia | null>(null),
    [events, setEvents] = useState<EventoOcorrencia[]>([]),
    [detailPhotos, setDetailPhotos] = useState<FotoOcorrencia[]>([]),
    [moreHistory, setMoreHistory] = useState(false);
  const [action, setAction] = useState<AcaoOcorrencia | null>(null);
  const [notifs, setNotifs] = useState<NotificacaoOcorrencia[]>([]),
    [unreadOnly, setUnreadOnly] = useState(false),
    [unread, setUnread] = useState(0),
    [moreNotifs, setMoreNotifs] = useState(false);
  const notifFetchId = useRef(0);
  const fetchId = useRef(0),
    mounted = useRef(true);
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
          naoLidas: unreadOnly,
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
    [unreadOnly, notifs.length, refreshUnread],
  );
  useEffect(() => {
    if (actor && view === "notificacoes") void loadNotifs();
    return () => {
      notifFetchId.current++;
    };
  }, [actor, view, unreadOnly]);
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
    createRequest.current = crypto.randomUUID();
    setError("");
    setSuccess("");
    setView("criar");
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
      const r = await ocorrenciasApi("criar", {
        dados: data,
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
      else if (unreadOnly) await loadNotifs();
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
    else setView("lista");
  };
  const currentInstitution = institutions.find(
    (i) => i.codigo === data.instituicao_codigo,
  );
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
        <span className="p-3 bg-primary/10 rounded-2xl text-primary">
          <MapPin size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-black text-primary text-xl md:text-2xl">
            {view === "criar"
              ? "Registar ocorrência"
              : view === "rever"
                ? "Rever e enviar"
                : view === "notificacoes"
                  ? "Notificações de Ocorrências"
                  : view === "detalhe" && selected
                    ? `Ocorrência ${protocoloOcorrencia(selected.numero)}`
                    : title}
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            {institutional
              ? "Triagem e acompanhamento das ocorrências dirigidas à sua instituição."
              : "Comunique problemas da sua localidade e acompanhe a resposta."}
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
      {!["criar", "rever"].includes(view) && (
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
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 ${institutional ? "xl:grid-cols-5" : "xl:grid-cols-4"} gap-3`}
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
            <ListaRolavel count={list.length} label={title}>
              {list.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  disabled={loading}
                  onClick={() => void openDetail(o.id)}
                  className={`${panel} !space-y-2 text-left hover:border-primary/40 transition-colors disabled:opacity-60`}
                >
                  <div className="flex flex-wrap gap-2 justify-between">
                    <span className="font-bold text-xs text-slate-500">
                      {protocoloOcorrencia(o.numero)} · {date(o.criado_em)}
                    </span>
                    <Estado value={o.estado} />
                  </div>
                  <h3 className="font-black text-primary text-base break-words">
                    {o.titulo}
                  </h3>
                  <p className="text-xs text-slate-500 flex gap-1.5">
                    <MapPin size={14} className="shrink-0" />
                    {o.bairro} · {o.municipio} · {o.provincia}
                  </p>
                  <p className="text-xs text-slate-500 break-words">
                    {o.categoria} ·{" "}
                    {institutional
                      ? `Responsável: ${o.responsavel || "Por atribuir"}`
                      : o.instituicao_nome}
                  </p>
                  <span className="text-xs text-primary font-bold inline-flex gap-2 items-center">
                    Ver detalhes
                    <ArrowRight size={14} />
                  </span>
                </button>
              ))}
            </ListaRolavel>
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
              Localização manual
            </h3>
            <p className="text-xs text-slate-500">
              Não é necessário autorizar GPS. Indique a localização onde o
              problema ocorre.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(
                [
                  ["provincia", "Província *", 100, 2],
                  ["municipio", "Município *", 100, 2],
                  ["bairro", "Bairro / Localidade *", 160, 2],
                  ["rua", "Rua (opcional)", 180, 0],
                ] as const
              ).map(([key, label, max, min]) => (
                <div key={key}>
                  <Field label={label}>
                    <input
                      className={input}
                      required={min > 0}
                      minLength={min}
                      maxLength={max}
                      value={data[key]}
                      onChange={(e) =>
                        setData({ ...data, [key]: e.target.value })
                      }
                    />
                  </Field>
                </div>
              ))}
            </div>
            <Field label="Ponto de referência *">
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
              Só são apresentadas instituições com registo aprovado no CDA.
              Confirme que a instituição escolhida é responsável pelo problema e
              pela localidade.
            </p>
            <Field label="Instituição habilitada *">
              <select
                required
                className={input}
                value={data.instituicao_codigo}
                onChange={(e) =>
                  setData({ ...data, instituicao_codigo: e.target.value })
                }
              >
                <option value="">Seleccione a instituição responsável</option>
                {institutions.map((i) => (
                  <option key={i.codigo} value={i.codigo}>
                    {i.nome} · {i.codigo}
                    {i.municipio ? ` · ${i.municipio}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            {!institutions.length && (
              <p role="alert" className="text-amber-800 text-sm">
                Não existem instituições habilitadas disponíveis. Não é possível
                enviar neste momento.
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
            <h3 className="font-black text-primary text-xl">{data.titulo}</h3>
            <span className="text-xs font-bold text-indigo-700">
              {data.categoria}
            </span>
            <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">
              {data.descricao}
            </p>
            <div className="border-t pt-3 text-sm text-slate-600 space-y-1">
              <p className="font-bold">Localização manual</p>
              <p>
                {data.bairro} · {data.municipio} · {data.provincia}
              </p>
              {data.rua && <p>{data.rua}</p>}
              <p>{data.referencia}</p>
            </div>
            <Photos photos={photos} />
          </div>
          <div className={panel}>
            <h3 className="font-bold text-primary">Instituição destinatária</h3>
            <p className="text-sm">
              {currentInstitution?.nome} · {data.instituicao_codigo}
            </p>
            <span className="inline-flex gap-1 text-xs text-emerald-700">
              <ShieldCheck size={14} />
              Registada e aprovada no CDA
            </span>
            <p className="text-xs text-slate-500">
              A descrição, as fotografias e a localização serão partilhadas com
              a instituição destinatária.
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
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 space-y-4">
              <div className={panel}>
                <h3 className="text-xl font-black text-primary break-words">
                  {selected.titulo}
                </h3>
                <p className="text-xs font-bold text-indigo-700">
                  {selected.categoria}
                </p>
                <p className="text-sm whitespace-pre-wrap break-words text-slate-700">
                  {selected.descricao}
                </p>
                <div className="text-sm text-slate-600 space-y-1 border-t pt-3">
                  <p className="font-bold">Localização manual</p>
                  <p>
                    {selected.bairro} · {selected.municipio} ·{" "}
                    {selected.provincia}
                  </p>
                  {selected.rua && <p>{selected.rua}</p>}
                  <p>{selected.referencia}</p>
                </div>
                <Photos photos={detailPhotos} />
                <p className="text-[11px] text-slate-400">
                  As ligações das fotografias expiram por segurança. Utilize
                  «Actualizar detalhes» para renová-las.
                </p>
              </div>
              <div className={panel}>
                <h3 className="font-black text-primary flex items-center gap-2">
                  <Clock size={18} />
                  Histórico e comunicações
                </h3>
                <p className="text-xs text-slate-500">
                  Do mais recente para o mais antigo. Cada actualização
                  identifica o autor, a data e a justificação.
                </p>
                <ListaRolavel
                  count={events.length}
                  label="Histórico da ocorrência"
                >
                  {events.map((e) => (
                    <article
                      key={e.id}
                      className="border-l-2 border-indigo-200 pl-4 py-2 space-y-1"
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <Estado value={e.estado_novo} />
                        <time className="text-[11px] text-slate-500">
                          {date(e.criado_em)}
                        </time>
                      </div>
                      <p className="text-xs font-bold text-slate-700">
                        {e.actor_nome}{" "}
                        {e.actor_instituicao ? `· ${e.actor_instituicao}` : ""}
                      </p>
                      <p className="text-sm whitespace-pre-wrap break-words text-slate-600">
                        {e.descricao}
                      </p>
                      {e.destino_codigo && (
                        <p className="text-xs text-indigo-700">
                          Destino: {e.destino_codigo}
                        </p>
                      )}
                    </article>
                  ))}
                </ListaRolavel>
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
                <h3 className="font-black text-primary">Acompanhamento</h3>
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
                <h3 className="font-black text-primary">
                  {institutional ? "Tratar ocorrência" : "A sua participação"}
                </h3>
                {acoesOcorrencia(selected.estado, !!institutional).length ? (
                  acoesOcorrencia(selected.estado, !!institutional).map((a) => (
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
                  ))
                ) : (
                  <p className="text-xs text-slate-500">
                    {["resolvida", "encerrada"].includes(selected.estado)
                      ? "Ocorrência concluída. O histórico permanece disponível."
                      : "Aguarde uma actualização da instituição."}
                  </p>
                )}
              </div>
            </aside>
          </div>
          {!institutional && <Safety />}
        </>
      )}
      {view === "notificacoes" && (
        <>
          <div className="flex flex-wrap justify-between items-center gap-3">
            <label className="text-sm flex gap-2 items-center">
              <input
                type="checkbox"
                checked={unreadOnly}
                disabled={loading}
                onChange={(e) => setUnreadOnly(e.target.checked)}
              />
              Apenas não lidas
            </label>
            <button
              className={secondary}
              onClick={() => void loadNotifs()}
              disabled={loading}
            >
              <RefreshCw size={14} />
              Actualizar notificações
            </button>
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
                    <time className="text-[11px] text-slate-500 shrink-0">
                      {date(n.criado_em)}
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
