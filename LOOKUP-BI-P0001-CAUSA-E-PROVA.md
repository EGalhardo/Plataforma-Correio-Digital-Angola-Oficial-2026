# «Não foi possível consultar o BI (Erro real: P0001)» — causa e correção

**Data:** 2026-11-17 · **Deploy:** `a1d6a64` (READY) · `correio-digital-angola-oficial.vercel.app`

---

## O que se viu

Na página **Nova Mensagem** (conta institucional), ao escrever o BI do cidadão
Edlasio (`002399714LA030`) no destinatário, aparecia:

> **Não foi possível consultar o BI (Erro real: P0001).**

## Causa raiz

`P0001` é um código **da base de dados**, não do browser. A função
`cda_cidadao_lookup_bi` só o devolve numa situação: quando o pedido **não traz a
marca da instituição no token** (`app_metadata.instituicao` vazio).

```
if v_role <> 'admin' and v_inst = '' then
  raise exception 'ACESSO_NEGADO_INSTITUICAO_APENAS' using errcode = 'P0001';
```

O gate lia **apenas** o token, nunca o perfil do agente. Assim, qualquer sessão
de instituição cujo token não tivesse essa marca — token emitido antes de a
marca ser gravada, conta criada sem `app_metadata.instituicao`, sessão antiga
restaurada — era recusada, mesmo com o cidadão bem registado. O cidadão existia;
faltava a identificação do lado de quem perguntava.

O registo de auditoria confirma o momento da falha reportada:
`Pesquisa de cidadão por BI falhou (Erro real: P0001)` às **14:43:39**, na
sessão `Administração Geral Tributária — Luanda Maianga (AGT-LMM)`.

## Correção (base de dados)

`cda_cidadao_lookup_bi` e `cda_rede_emergencia_bi` passam a **completar a
identidade pelo perfil** quando o token não a traz:

1. se o token não traz `role`, procura o perfil pelo `agent`, pelo `bi` ou pelo
   e-mail do token;
2. se continua sem instituição, resolve-a **só a partir de perfis com papel
   `instituicao`/`institution`** (o `AGT-LMM-01` → `AGT-LMM`);
3. cidadãos, anónimos e chamadas de serviço continuam **barrados** — a
   restrição de papel mantém-se.

A correção foi endurecida durante os testes: a primeira versão deixava passar o
cidadão. Corrigido e revalidado antes do deploy.

## Prova

| Cenário | Antes | Depois |
|---|---|---|
| Instituição **sem** a marca no token → consultar `002399714LA030` | `P0001` | **`200` → «Edlasio Galhardo»** |
| Cidadão → consultar BI | — | `P0001` (barrado) ✓ |
| Sem sessão (chave anónima) | — | `401` `42501` (barrado) ✓ |
| Compositor real (conta `AGT-LMM-01`, Playwright) | «Erro real: P0001» | «Edlasio Galhardo — BI 002399714LA030» ✓ |

Reprodução e validação: contas de teste criadas e apagadas pelos próprios
scripts (as 3 contas reais ficaram intactas). As provas estão em
`scripts/provar_lookup_bi_playwright.cjs`.

## Melhoria de mensagem (front-end)

O compositor deixou de mostrar só o código técnico. Para `P0001`:

> **A consulta do BI foi recusada: a sua sessão não está identificada como instituição.**
> Volte a entrar no portal institucional e repita a consulta. O envio não é
> bloqueado por isto: pode indicar o BI e enviar.

Para `P0002` (limite anti-abuso): «Limite de consultas por hora atingido para
esta instituição. Tente mais tarde.»

## Nota sobre o que ficou provado e o que não ficou

- **Provado em produção:** a conta real localiza o cidadão no compositor, e um
  token de instituição **sem** a marca — a condição exata do erro — já devolve
  `200` com o cidadão.
- **Não reproduzido na sessão real de hoje:** o login da app repõe a marca no
  token a partir do perfil, pelo que a falha já não se consegue repetir por essa
  via. A reprodução foi feita com o token nessas condições, que é o que a
  mensagem de erro original indicava.
