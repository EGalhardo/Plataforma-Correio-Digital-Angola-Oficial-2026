import assert from "node:assert/strict";
import {
  acoesOcorrencia,
  validarOcorrencia,
  protocoloOcorrencia,
} from "../../src/features/ocorrencias/model";
import { identidadeOcorrencias } from "../../server/ocorrencias";
let count = 0;
const dados = {
  categoria: "Água",
  titulo: "Fuga de água",
  descricao: "Fuga contínua junto à escola.",
  provincia: "Luanda",
  municipio: "Luanda",
  bairro: "Bairro de teste",
  rua: "",
  referencia: "Junto à escola",
  instituicao_codigo: "INST-A",
};
assert.deepEqual(validarOcorrencia(dados), []);
count++;
for (const patch of [
  { titulo: "x" },
  { descricao: "x" },
  { bairro: "" },
  { referencia: "" },
  { instituicao_codigo: "" },
  { categoria: "Inválida" },
  { titulo: {} },
  { rua: {} },
]) {
  assert.ok(validarOcorrencia({ ...dados, ...patch } as any).length);
  count++;
}
assert.equal(protocoloOcorrencia(12), "OC-000012");
count++;
for (const state of [
  "submetida",
  "recebida",
  "em_analise",
  "em_resolucao",
  "aguarda_informacao",
  "resolvida",
  "encerrada",
  "encaminhada",
  "reabertura_solicitada",
]) {
  const citizen = acoesOcorrencia(state, false).map((a) => a.id),
    inst = acoesOcorrencia(state, true).map((a) => a.id);
  assert.ok(
    !citizen.includes("receber") &&
      !citizen.includes("encaminhar") &&
      !citizen.includes("atribuir"),
  );
  count++;
  assert.ok(
    !inst.includes("confirmar_resolucao") && !inst.includes("esclarecer"),
  );
  count++;
}
function fake(
  email: string,
  profile: any = { name: "Conta de teste", role: "user" },
  status = "Aprovado",
  verified = true,
) {
  return {
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: "00000000-0000-4000-8000-000000000001",
            email,
            email_confirmed_at: verified ? "2026-01-01" : null,
            user_metadata: {
              role: "admin",
              bi: "OUTRO-BI",
              instituicao: "OUTRA-INST",
            },
          },
        },
        error: null,
      }),
    },
    from: (table: string) => {
      const data =
        table === "profiles"
          ? profile
          : [
              {
                nome: "Instituição de teste",
                status,
                observacoes: "[INST:{}]",
              },
            ];
      const q: any = {
        select: () => q,
        eq: () => q,
        order: () => q,
        limit: () => q,
        maybeSingle: async () => ({ data, error: null }),
        then: (resolve: any) =>
          Promise.resolve({ data, error: null }).then(resolve),
      };
      return q;
    },
  } as any;
}
let a = await identidadeOcorrencias(
  fake("bi.000000000aa000@cidadao.correiodigital.ao"),
  "token-teste",
);
assert.equal(a.papel, "cidadao");
assert.equal(a.identificador, "000000000AA000");
count++;
a = await identidadeOcorrencias(
  fake("agente.inst-a-01@inst.correiodigital.ao"),
  "token-teste",
);
assert.equal(a.instituicao, "INST-A");
count++;
a = await identidadeOcorrencias(
  fake("agente.inst-a-02@inst.correiodigital.ao", {
    role: "instituicao",
    name: "Membro",
  }),
  "token-teste",
);
assert.equal(a.identificador, "INST-A-02");
count++;
const failures: [any, string, number][] = [
  [fake("bi.000000000aa000@cidadao.correiodigital.ao"), "", 401],
  [fake("bi.000000000aa000@cidadao.correiodigital.ao", null), "token", 403],
  [
    fake("bi.000000000aa000@cidadao.correiodigital.ao", {}, "Bloqueado"),
    "token",
    403,
  ],
  [
    fake("bi.000000000aa000@cidadao.correiodigital.ao", {}, "Aprovado", false),
    "token",
    401,
  ],
  [fake("admin@example.test"), "token", 403],
  [fake("agente.inst-a-02@inst.correiodigital.ao", null), "token", 403],
  [
    fake("agente.inst-a-02@inst.correiodigital.ao", { role: "user" }),
    "token",
    403,
  ],
  [
    fake("agente.inst-a-01@inst.correiodigital.ao", {}, "Pendente"),
    "token",
    403,
  ],
];
for (const [db, token, status] of failures) {
  await assert.rejects(
    () => identidadeOcorrencias(db, token),
    (e: any) => e.status === status,
  );
  count++;
}
console.log(`${count} verificações de modelo/autorização aprovadas.`);
