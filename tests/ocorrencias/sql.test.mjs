// Instalar PGlite isoladamente, conforme docs/ocorrencias.md.
const { PGlite } =
  await import("../../.local/ocorrencias/sql-test/node_modules/@electric-sql/pglite/dist/index.js");
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
let n = 0;
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
CREATE TABLE storage.objects(id uuid,bucket_id text); ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.solicitacoes_registo(bi_numero text,nome text,status text,observacoes text,criado_em timestamptz DEFAULT now());
INSERT INTO public.solicitacoes_registo VALUES('INST-A','Instituição A','Aprovado','[INST:{}]',now()),('INST-B','Instituição B','Aprovado','[INST:{}]',now()),('INST-C','Instituição C','Pendente','[INST:{}]',now());
INSERT INTO auth.users VALUES('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002'),('00000000-0000-4000-8000-000000000003');`);
const sql = readFileSync("sql/ocorrencias/001_ocorrencias_locais.sql", "utf8");
await db.exec(sql);
n++;
await db.exec(sql);
n++;
const citizen = {
  id: "00000000-0000-4000-8000-000000000001",
  papel: "cidadao",
  identificador: "TESTE-001",
  nome: "Cidadão Teste",
};
const inst = {
  id: "00000000-0000-4000-8000-000000000002",
  papel: "instituicao",
  instituicao: "INST-A",
  nome: "Equipa A",
};
const instB = {
  id: "00000000-0000-4000-8000-000000000003",
  papel: "instituicao",
  instituicao: "INST-B",
  nome: "Equipa B",
};
const payload = {
  instituicao_codigo: "INST-A",
  categoria: "Iluminação pública",
  titulo: "Poste apagado",
  descricao: "Poste apagado há três dias.",
  provincia: "Luanda",
  municipio: "Luanda",
  bairro: "Bairro Teste",
  referencia: "Junto da escola",
};
const uuid = () => crypto.randomUUID();
async function create(p = payload, actor = citizen, key = uuid(), photos = []) {
  return (
    await db.query(
      "SELECT * FROM public.cda_ocorrencias_criar($1::jsonb,$2::jsonb,$3::uuid[],$4::uuid)",
      [JSON.stringify(actor), JSON.stringify(p), photos, key],
    )
  ).rows[0];
}
async function act(
  v,
  acao,
  actor = inst,
  dados = { descricao: "Justificação técnica do teste." },
  key = uuid(),
) {
  return (
    await db.query(
      "SELECT * FROM public.cda_ocorrencias_actuar($1::jsonb,$2::uuid,$3::integer,$4::text,$5::jsonb,$6::uuid)",
      [JSON.stringify(actor), v.id, v.versao, acao, JSON.stringify(dados), key],
    )
  ).rows[0];
}
const expectError = async (fn, code) => {
  try {
    await fn();
    assert.fail("Esperava erro");
  } catch (e) {
    assert.equal(e.code, code);
  }
  n++;
};
await expectError(
  () => create({ ...payload, instituicao_codigo: "INST-C" }),
  "22023",
);
await expectError(() => create(payload, inst), "42501");
const mainPhoto = uuid();
await db.query(
  "INSERT INTO public.cda_ocorrencias_fotos(id,autor_id,caminho,nome,mime,tamanho) VALUES ($1,$2,$3,$4,$5,$6)",
  [mainPhoto, citizen.id, "main.jpg", "main.jpg", "image/jpeg", 500],
);
const key = uuid();
let v = await create(payload, citizen, key, [mainPhoto]);
assert.equal(v.estado, "submetida");
n++;
assert.equal((await create(payload, citizen, key)).id, v.id);
n++;
await expectError(() => act(v, "receber", instB), "42501");
await expectError(() => act(v, "resolver"), "22023");
const old = v;
v = await act(v, "receber");
assert.equal(v.estado, "recebida");
n++;
await expectError(() => act(old, "analisar"), "40001");
v = await act(v, "analisar");
v = await act(v, "atribuir", inst, { responsavel: "Equipa de Iluminação" });
assert.equal(v.responsavel, "Equipa de Iluminação");
n++;
v = await act(v, "pedir_esclarecimento");
assert.equal(v.estado, "aguarda_informacao");
n++;
v = await act(v, "esclarecer", citizen);
v = await act(v, "analisar");
v = await act(v, "iniciar_resolucao");
v = await act(v, "resolver");
assert.equal(v.estado, "resolvida");
n++;
v = await act(v, "solicitar_reabertura", citizen);
assert.equal(v.estado, "reabertura_solicitada");
n++;
v = await act(v, "analisar");
v = await act(v, "encaminhar", inst, {
  instituicao_codigo: "INST-B",
  descricao: "Encaminhada para equipa com competência.",
});
assert.equal(v.estado, "encaminhada");
assert.equal(v.instituicao_codigo, "INST-B");
n++;
assert.equal(v.responsavel, null);
n++;
assert.equal(
  (
    await db.query(
      "SELECT ocorrencia_id FROM public.cda_ocorrencias_fotos WHERE id=$1",
      [mainPhoto],
    )
  ).rows[0].ocorrencia_id,
  v.id,
);
n++;
assert.ok(
  (
    await db.query(
      "SELECT id FROM public.cda_ocorrencias_notificacoes WHERE ocorrencia_id=$1 AND destinatario_tipo='instituicao' AND destinatario_chave='INST-B'",
      [v.id],
    )
  ).rows.length,
);
n++;
await expectError(() => act(v, "receber", inst), "42501");
v = await act(v, "receber", instB);
v = await act(v, "analisar", instB);
v = await act(v, "iniciar_resolucao", instB);
v = await act(v, "resolver", instB);
v = await act(v, "confirmar_resolucao", citizen);
assert.equal(v.estado, "encerrada");
n++;
assert.ok(
  (
    await db.query(
      "SELECT count(*)::int AS n FROM public.cda_ocorrencias_eventos WHERE ocorrencia_id=$1",
      [v.id],
    )
  ).rows[0].n >= 16,
);
n++;
assert.ok(
  (
    await db.query(
      "SELECT count(*)::int AS n FROM public.cda_ocorrencias_notificacoes WHERE destinatario_tipo=$1",
      ["cidadao"],
    )
  ).rows[0].n > 0,
);
n++;
await db.exec("SET ROLE authenticated");
await expectError(
  () => db.query("SELECT * FROM public.cda_ocorrencias"),
  "42501",
);
await expectError(() => create(), "42501");
await db.exec("RESET ROLE");
const photo = uuid();
await db.query(
  "INSERT INTO public.cda_ocorrencias_fotos(id,autor_id,caminho,nome,mime,tamanho) VALUES ($1,$2,$3,$4,$5,$6)",
  [photo, inst.id, "x.jpg", "x.jpg", "image/jpeg", 500],
);
await expectError(() => create(payload, citizen, uuid(), [photo]), "22023");
const tables = (
  await db.query(
    "SELECT relname FROM pg_class WHERE relrowsecurity AND relname LIKE 'cda_ocorrencias%'",
  )
).rows;
assert.equal(tables.length, 5);
n++;
console.log(
  n +
    " verificações SQL aprovadas (migração/reexecução, RLS, transições, encaminhamento, notificações, idempotência, versão e fotografias).",
);
await db.close();
