/** Backend único de Ocorrências: partilhado pelo servidor local e pela Vercel. */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import ws from "ws";
import {
  validarOcorrencia,
  acoesOcorrencia,
  type ActorOcorrencia,
  type DadosOcorrencia,
} from "../src/features/ocorrencias/model.js";
const BUCKET = "cda-ocorrencias";
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const APPROVED = [
  "APROVADO",
  "APROVADA",
  "ATIVO",
  "ATIVA",
  "ACTIVE",
  "APPROVED",
];
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const fail = (status: number, message: string): never => {
  throw new HttpError(status, message);
};
const id = (v: unknown) => {
  if (typeof v !== "string" || !UUID.test(v))
    fail(400, "Identificador inválido.");
  return v as string;
};
const text = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
function checked<T>(r: { data: T; error: any }): T {
  if (r.error) throw r.error;
  return r.data;
}
function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) fail(503, "O serviço de Ocorrências não está configurado.");
  const deadline = AbortSignal.timeout(22000);
  return createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws as any },
    db: { timeout: 12000 },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          signal: AbortSignal.any([
            deadline,
            ...(init?.signal ? [init.signal] : []),
          ]),
        }),
    },
  });
}
function instCodeFromEmail(email: string) {
  const m = email.match(
    /^agente\.([a-z0-9-]+)-(\d{2})@inst\.correiodigital\.ao$/i,
  );
  return m
    ? {
        code: m[1].toUpperCase(),
        agent: `${m[1]}-${m[2]}`.toUpperCase(),
        seq: Number(m[2]),
      }
    : null;
}
export async function identidadeOcorrencias(
  db: SupabaseClient,
  token: string,
): Promise<ActorOcorrencia> {
  if (!token) fail(401, "Inicie sessão para aceder às ocorrências.");
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user || !data.user.email_confirmed_at)
    fail(401, "Sessão expirada ou inválida. Volte a entrar.");
  const user = data.user!;
  const email = String(user.email || "").toLowerCase();
  // Não usar user_metadata.role/bi/instituicao como prova de identidade.
  const citizen = email.match(
    /^bi\.(\d{9}[a-z]{2}\d{3})@cidadao\.correiodigital\.ao$/i,
  );
  if (citizen) {
    const bi = citizen[1].toUpperCase();
    const profile = checked(
      await db.from("profiles").select("name,bi").eq("bi", bi).maybeSingle(),
    );
    if (!profile) fail(403, "O perfil do cidadão não está disponível.");
    const reg = checked(
      await db
        .from("solicitacoes_registo")
        .select("status")
        .eq("bi_numero", bi)
        .order("criado_em", { ascending: false })
        .limit(1),
    );
    if (
      reg?.some((r) =>
        ["REJEITADO", "REPROVADO", "BLOQUEADO", "SUSPENSO"].includes(
          String(r.status).toUpperCase(),
        ),
      )
    )
      fail(403, "O registo desta conta não permite aceder a este serviço.");
    return {
      id: user.id,
      papel: "cidadao",
      identificador: bi,
      nome: profile.name || bi,
    };
  }
  const inst = instCodeFromEmail(email);
  if (!inst || inst.seq < 1)
    fail(
      403,
      "Este módulo está disponível para cidadãos e instituições autenticados.",
    );
  const reg = checked(
    await db
      .from("solicitacoes_registo")
      .select("nome,status,observacoes")
      .eq("bi_numero", inst!.code)
      .order("criado_em", { ascending: false })
      .limit(1),
  )?.[0];
  if (
    !reg ||
    !APPROVED.includes(String(reg.status).trim().toUpperCase()) ||
    !String(reg.observacoes || "").includes("[INST:")
  )
    fail(
      403,
      "A instituição não está habilitada ou o seu registo deixou de estar activo.",
    );
  const profile = checked(
    await db
      .from("profiles")
      .select("name,role")
      .eq("bi", inst!.agent)
      .maybeSingle(),
  );
  if (inst!.seq > 1 && (!profile || profile.role !== "instituicao"))
    fail(403, "O membro já não pertence à equipa institucional.");
  return {
    id: user.id,
    papel: "instituicao",
    identificador: inst!.agent,
    instituicao: inst!.code,
    nome: profile?.name || reg.nome || inst!.agent,
  };
}
function scoped(q: any, a: ActorOcorrencia) {
  return a.papel === "cidadao"
    ? q.eq("cidadao_id", a.id)
    : q.eq("instituicao_codigo", a.instituicao!);
}
async function occurrence(db: SupabaseClient, a: ActorOcorrencia, key: string) {
  const row = checked<any>(
    await scoped(
      db.from("cda_ocorrencias").select("*").eq("id", id(key)),
      a,
    ).maybeSingle(),
  );
  if (!row)
    fail(
      404,
      "Ocorrência não encontrada ou já encaminhada para outra instituição.",
    );
  return row;
}
async function institutions(db: SupabaseClient) {
  const result: any[] = [];
  const seen = new Set<string>();
  for (let offset = 0; offset < 20000; offset += 500) {
    const rows =
      checked(
        await db
          .from("solicitacoes_registo")
          .select("bi_numero,nome,status,observacoes")
          .like("observacoes", "%[INST:%")
          .order("bi_numero")
          .order("criado_em", { ascending: false })
          .range(offset, offset + 499),
      ) || [];
    for (const r of rows) {
      const key = String(r.bi_numero).trim().toUpperCase();
      if (seen.has(key)) continue;
      seen.add(key);
      if (!APPROVED.includes(String(r.status).trim().toUpperCase())) continue;
      let pack: any = {};
      try {
        pack = JSON.parse(
          String(r.observacoes).match(/\[INST:(\{.*?\})\]/s)?.[1] || "{}",
        );
      } catch {}
      const codigo = String(r.bi_numero).trim().toUpperCase();
      if (!/^[A-Z0-9][A-Z0-9-]{2,29}$/.test(codigo)) continue;
      result.push({
        codigo,
        nome: String(pack.nomeCompleto || pack.nome || r.nome || codigo),
        provincia: pack.provincia || "",
        municipio: pack.municipio || "",
      });
    }
    if (rows.length < 500)
      return result.sort((a, b) => a.nome.localeCompare(b.nome, "pt"));
  }
  fail(
    503,
    "O directório excedeu o limite de carregamento. Contacte o suporte.",
  );
}
async function signedPhoto(db: SupabaseClient, f: any) {
  const r = await db.storage.from(BUCKET).createSignedUrl(f.caminho, 300);
  if (r.error) throw r.error;
  return { id: f.id, nome: f.nome, tamanho: f.tamanho, url: r.data.signedUrl };
}
async function notifQuery(
  db: SupabaseClient,
  a: ActorOcorrencia,
  key?: string,
) {
  let q = db
    .from("cda_ocorrencias_notificacoes")
    .select("*")
    .eq("destinatario_tipo", a.papel)
    .eq("destinatario_chave", a.papel === "cidadao" ? a.id : a.instituicao!);
  if (key) q = q.eq("id", id(key));
  return q;
}
function safeError(error: any): { status: number; message: string } {
  if (error instanceof HttpError)
    return { status: error.status, message: error.message };
  const code = error?.code;
  if (code === "40001")
    return {
      status: 409,
      message:
        "A ocorrência mudou desde a sua última consulta. Actualize os dados antes de continuar.",
    };
  if (code === "42501")
    return { status: 403, message: "Sem autorização para esta operação." };
  if (code === "P0002")
    return { status: 404, message: "Ocorrência não encontrada." };
  if (code === "22023")
    return {
      status: 400,
      message: String(error.message || "Dados inválidos."),
    };
  if (code === "23505")
    return {
      status: 409,
      message: "Esta operação já foi registada. Actualize os dados.",
    };
  if (code === "23514" || code === "23502" || code === "22P02")
    return {
      status: 400,
      message: "Dados inválidos. Verifique os campos do formulário.",
    };
  if (code === "PGRST205" || code === "42P01" || code === "PGRST202")
    return {
      status: 503,
      message:
        "A estrutura de Ocorrências ainda não está disponível. Contacte o administrador.",
    };
  return {
    status: 503,
    message:
      "Não foi possível concluir a operação na nuvem. Os dados do formulário foram preservados; tente novamente.",
  };
}
export async function handleOcorrencias(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST")
    return res.status(405).json({ ok: false, erro: "Método não permitido." });
  try {
    let b = req.body;
    if (typeof b === "string") {
      try {
        b = JSON.parse(b);
      } catch {
        fail(400, "Pedido inválido.");
      }
    }
    if (!b || typeof b !== "object" || Array.isArray(b))
      fail(400, "Pedido inválido.");
    const token = String(req.headers.authorization || "")
      .replace(/^Bearer\s+/i, "")
      .trim();
    const db = adminClient();
    const a = await identidadeOcorrencias(db, token);
    let result: any;
    const offset =
      Number.isInteger(b.offset) && b.offset >= 0
        ? Math.min(b.offset, 100000)
        : 0;
    switch (b.acao) {
      case "inicio":
        result = { actor: a, instituicoes: await institutions(db) };
        break;
      case "listar": {
        let q = scoped(
          db.from("cda_ocorrencias").select("*", { count: "exact" }),
          a,
        );
        if (b.estado) q = q.eq("estado", text(b.estado, 40));
        if (b.categoria) q = q.eq("categoria", text(b.categoria, 80));
        const search = text(b.procura, 100)
          .replace(/[^\p{L}\p{N}\s-]/gu, " ")
          .trim();
        const number = search.match(/^(?:OC-)?(\d+)$/i);
        if (number) q = q.eq("numero", Number(number[1]));
        else if (search)
          q = q.or(
            `titulo.ilike.%${search}%,bairro.ilike.%${search}%,municipio.ilike.%${search}%`,
          );
        const locality = text(b.localidade, 100)
          .replace(/[^\p{L}\p{N}\s-]/gu, " ")
          .trim();
        if (locality) q = q.ilike("bairro", `%${locality}%`);
        const r = await q
          .order("criado_em", { ascending: false })
          .order("id")
          .range(offset, offset + 49);
        const rows = checked<any[]>(r) || [];
        // 2026-09-14 — contagens por estado (06 · lista institucional): mesmo
        // âmbito e filtros da lista, excepto o filtro de estado.
        let qc = scoped(db.from("cda_ocorrencias").select("estado"), a);
        if (b.categoria) qc = qc.eq("categoria", text(b.categoria, 80));
        if (number) qc = qc.eq("numero", Number(number[1]));
        else if (search)
          qc = qc.or(
            `titulo.ilike.%${search}%,bairro.ilike.%${search}%,municipio.ilike.%${search}%`,
          );
        if (locality) qc = qc.ilike("bairro", `%${locality}%`);
        const rc = await qc.range(0, 1999);
        const contagens: Record<string, number> = {};
        for (const row of checked<any[]>(rc) || []) {
          const e = String((row as any).estado || "");
          if (e) contagens[e] = (contagens[e] || 0) + 1;
        }
        // 2026-09-14 — capa: primeira fotografia de cada ocorrência da página
        // (01 · cartões do cidadão). Falhas de assinatura não quebram a lista.
        const ids = rows.map((x: any) => x.id);
        if (ids.length) {
          const rf =
            checked<any[]>(
              await db
                .from("cda_ocorrencias_fotos")
                .select("id,nome,tamanho,caminho,ocorrencia_id,criado_em")
                .in("ocorrencia_id", ids)
                .order("criado_em"),
            ) || [];
          const primeira = new Map<string, any>();
          for (const f of rf)
            if (!primeira.has(f.ocorrencia_id))
              primeira.set(f.ocorrencia_id, f);
          const chaves = [...primeira.keys()];
          const assinadas = await Promise.all(
            chaves.map((k) => signedPhoto(db, primeira.get(k)).catch(() => null)),
          );
          const porOc = new Map<string, any>();
          chaves.forEach((k, i) => {
            if (assinadas[i]) porOc.set(k, assinadas[i]);
          });
          for (const x of rows as any[]) {
            const c = porOc.get(x.id);
            x.capa_url = c ? c.url : null;
            x.capa_nome = c ? c.nome : null;
          }
        }
        result = {
          lista: rows,
          total: r.count || 0,
          mais: offset + rows.length < (r.count || 0),
          contagens,
        };
        break;
      }
      case "detalhe": {
        const row = await occurrence(db, a, b.id);
        const events =
          checked(
            await db
              .from("cda_ocorrencias_eventos")
              .select(
                "id,ordem,actor_papel,actor_nome,actor_instituicao,acao,estado_anterior,estado_novo,descricao,destino_codigo,criado_em",
                { count: "exact" },
              )
              .eq("ocorrencia_id", row.id)
              .order("ordem", { ascending: false })
              .range(0, 99),
          ) || [];
        const photos =
          checked(
            await db
              .from("cda_ocorrencias_fotos")
              .select("id,nome,tamanho,caminho")
              .eq("ocorrencia_id", row.id)
              .order("criado_em"),
          ) || [];
        const urls = await Promise.all(photos.map((f) => signedPhoto(db, f)));
        const current = await occurrence(db, a, row.id); // Revalidar destinatário após leituras/assinatura.
        result = {
          ocorrencia: current,
          eventos: events,
          fotos: urls,
          maisHistorico: events.length === 100,
        };
        break;
      }
      case "historico": {
        await occurrence(db, a, b.id);
        const r = await db
          .from("cda_ocorrencias_eventos")
          .select(
            "id,ordem,actor_papel,actor_nome,actor_instituicao,acao,estado_anterior,estado_novo,descricao,destino_codigo,criado_em",
            { count: "exact" },
          )
          .eq("ocorrencia_id", b.id)
          .order("ordem", { ascending: false })
          .range(offset, offset + 99);
        const rows = checked(r) || [];
        await occurrence(db, a, b.id);
        result = { lista: rows, mais: offset + rows.length < (r.count || 0) };
        break;
      }
      case "fotografia": {
        if (a.papel !== "cidadao")
          fail(403, "Apenas o cidadão pode anexar fotografias ao registo.");
        const raw = b.base64;
        if (
          typeof raw !== "string" ||
          raw.length > 2800000 ||
          !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(raw)
        )
          fail(400, "Fotografia inválida. Utilize JPEG, PNG ou WebP até 2 MB.");
        const buffer = Buffer.from(
          raw.substring(raw.indexOf(",") + 1),
          "base64",
        );
        if (buffer.length > 2097152) fail(400, "A fotografia excede 2 MB.");
        let image: Buffer;
        try {
          image = await sharp(buffer, {
            limitInputPixels: 20000000,
            animated: false,
          })
            .rotate()
            .resize({
              width: 1600,
              height: 1600,
              fit: "inside",
              withoutEnlargement: true,
            })
            .jpeg({ quality: 82 })
            .toBuffer();
        } catch {
          fail(400, "Não foi possível ler a fotografia. Escolha outra imagem.");
        }
        // Limpeza de anexos temporários expirados da própria conta, nunca de processos.
        const expired =
          checked(
            await db
              .from("cda_ocorrencias_fotos")
              .delete()
              .eq("autor_id", a.id)
              .is("ocorrencia_id", null)
              .lt("criado_em", new Date(Date.now() - 86400000).toISOString())
              .select("caminho"),
          ) || [];
        if (expired.length)
          await db.storage.from(BUCKET).remove(expired.map((f) => f.caminho));
        const pending = await db
          .from("cda_ocorrencias_fotos")
          .select("id", { head: true, count: "exact" })
          .eq("autor_id", a.id)
          .is("ocorrencia_id", null);
        if (pending.error) throw pending.error;
        if ((pending.count || 0) >= 10)
          fail(
            400,
            "Tem fotografias temporárias por utilizar. Remova as que não precisa ou aguarde a expiração (24 horas).",
          );
        const photoId = randomUUID(),
          path = `${a.id}/${photoId}.jpg`;
        const upload = await db.storage
          .from(BUCKET)
          .upload(path, image!, { contentType: "image/jpeg", upsert: false });
        if (upload.error) throw upload.error;
        const ins = await db
          .from("cda_ocorrencias_fotos")
          .insert({
            id: photoId,
            autor_id: a.id,
            caminho: path,
            nome: text(b.nome, 160) || "Fotografia.jpg",
            mime: "image/jpeg",
            tamanho: image!.length,
          })
          .select()
          .single();
        if (ins.error) {
          await db.storage.from(BUCKET).remove([path]);
          throw ins.error;
        }
        result = { foto: await signedPhoto(db, ins.data) };
        break;
      }
      case "remover_fotografia": {
        // DELETE condicional antes do Storage: não remove imagens vinculadas por uma submissão concorrente.
        const rows =
          checked(
            await db
              .from("cda_ocorrencias_fotos")
              .delete()
              .eq("id", id(b.id))
              .eq("autor_id", a.id)
              .is("ocorrencia_id", null)
              .select("caminho"),
          ) || [];
        if (rows.length)
          await db.storage.from(BUCKET).remove(rows.map((f) => f.caminho));
        result = { removida: rows.length > 0 };
        break;
      }
      case "criar": {
        if (a.papel !== "cidadao")
          fail(403, "Apenas o cidadão pode criar ocorrências.");
        const d = b.dados as DadosOcorrencia;
        if (!d || typeof d !== "object")
          fail(400, "Preencha os dados da ocorrência.");
        const errors = validarOcorrencia(d);
        if (errors.length) fail(400, errors.join(" "));
        if (b.confirmado !== true)
          fail(400, "Confirme os dados e a instituição destinatária.");
        if (!Array.isArray(b.fotos) || b.fotos.length > 5)
          fail(400, "Máximo de cinco fotografias.");
        b.fotos.forEach(id);
        result = {
          ocorrencia: checked(
            await db.rpc("cda_ocorrencias_criar", {
              p_actor: a,
              p_dados: d,
              p_fotos: b.fotos,
              p_pedido: id(b.pedido),
            }),
          ),
        };
        break;
      }
      case "eliminar": {
        // 2026-09-20 — Eliminação definitiva: o cidadão elimina as suas
        // ocorrências e a instituição as do seu âmbito (a autorização e o
        // âmbito são os mesmos de todas as outras acções: occurrence()).
        // Remove primeiro os registos dependentes para não deixar órfãos:
        // leituras → notificações → eventos → fotografias (+ Storage) e só no
        // fim a ocorrência. As fotografias temporárias (ocorrencia_id nulo)
        // não são tocadas.
        const row = await occurrence(db, a, b.id);
        const notifs =
          checked(
            await db
              .from("cda_ocorrencias_notificacoes")
              .select("id")
              .eq("ocorrencia_id", row.id),
          ) || [];
        if (notifs.length)
          checked(
            await db
              .from("cda_ocorrencias_leituras")
              .delete()
              .in(
                "notificacao_id",
                notifs.map((n: any) => n.id),
              ),
          );
        checked(
          await db
            .from("cda_ocorrencias_notificacoes")
            .delete()
            .eq("ocorrencia_id", row.id),
        );
        const fotos =
          checked(
            await db
              .from("cda_ocorrencias_fotos")
              .select("caminho")
              .eq("ocorrencia_id", row.id),
          ) || [];
        checked(
          await db
            .from("cda_ocorrencias_eventos")
            .delete()
            .eq("ocorrencia_id", row.id),
        );
        checked(
          await db
            .from("cda_ocorrencias_fotos")
            .delete()
            .eq("ocorrencia_id", row.id),
        );
        if (fotos.length)
          await db.storage
            .from(BUCKET)
            .remove(fotos.map((f: any) => f.caminho));
        const apagadas = checked(
          await db
            .from("cda_ocorrencias")
            .delete()
            .eq("id", row.id)
            .select("id"),
        );
        if (!apagadas || !apagadas.length)
          fail(
            404,
            "Ocorrência não encontrada ou já encaminhada para outra instituição.",
          );
        result = { eliminada: true, numero: row.numero };
        break;
      }
      case "actuar": {
        const row = await occurrence(db, a, b.id);
        const action = text(b.operacao, 50);
        const allowed = acoesOcorrencia(row.estado, a.papel === "instituicao");
        // Idempotência também no pré-check: evita voltar a executar uma acção
        // concluída e devolve conflitos de versão sem retries do transporte.
        const done = checked(
          await db
            .from("cda_ocorrencias_eventos")
            .select("id")
            .eq("ocorrencia_id", row.id)
            .eq("actor_id", a.id)
            .eq("pedido_id", id(b.pedido))
            .maybeSingle(),
        );
        if (done) {
          result = { ocorrencia: row };
          break;
        }
        if (!Number.isInteger(b.versao) || b.versao < 1)
          fail(400, "Versão inválida.");
        if (b.versao !== row.versao)
          fail(
            409,
            "A ocorrência mudou desde a sua última consulta. Actualize os dados antes de continuar.",
          );
        if (!allowed.some((x) => x.id === action))
          fail(
            400,
            "Esta acção não está disponível no estado actual. Actualize a ocorrência.",
          );
        result = {
          ocorrencia: checked(
            await db.rpc("cda_ocorrencias_actuar", {
              p_actor: a,
              p_id: row.id,
              p_versao: b.versao,
              p_acao: action,
              p_dados: b.dados || {},
              p_pedido: id(b.pedido),
            }),
          ),
        };
        break;
      }
      case "notificacoes": {
        let q = db
          .from("cda_ocorrencias_notificacoes")
          .select("*,cda_ocorrencias_leituras!left(actor_id)", {
            count: "exact",
          })
          .eq("destinatario_tipo", a.papel)
          .eq(
            "destinatario_chave",
            a.papel === "cidadao" ? a.id : a.instituicao!,
          )
          .eq("cda_ocorrencias_leituras.actor_id", a.id);
        if (b.naoLidas) q = q.is("cda_ocorrencias_leituras", null);
        const r = await q
          .order("criado_em", { ascending: false })
          .order("id")
          .range(offset, offset + 49);
        const rows = checked(r) || [];
        result = {
          lista: rows.map((n: any) => ({
            id: n.id,
            ocorrencia_id: n.ocorrencia_id,
            titulo: n.titulo,
            mensagem: n.mensagem,
            criado_em: n.criado_em,
            lida: !!n.cda_ocorrencias_leituras?.length,
          })),
          total: r.count || 0,
          mais: offset + rows.length < (r.count || 0),
        };
        break;
      }
      case "ler_notificacao": {
        const r = await notifQuery(db, a, b.id);
        const rows = checked<any[]>(r as any) || [];
        if (!rows.length) fail(404, "Notificação não encontrada.");
        checked(
          await db
            .from("cda_ocorrencias_leituras")
            .upsert(
              {
                notificacao_id: id(b.id),
                actor_id: a.id,
                lida_em: new Date().toISOString(),
              },
              { onConflict: "notificacao_id,actor_id" },
            ),
        );
        result = { lida: true };
        break;
      }
      default:
        fail(400, "Operação desconhecida.");
    }
    return res.status(200).json({ ok: true, ...result });
  } catch (error: any) {
    const safe = safeError(error);
    console.warn("[Ocorrencias]", error?.code || safe.status);
    return res.status(safe.status).json({ ok: false, erro: safe.message });
  }
}
