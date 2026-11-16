# Ronda de correcções — Ocorrências 403 + escopo de titularidade

Data: 2026-11-16 · Produção: https://correio-digital-angola-oficial.vercel.app
Commit final: `959794d` · Deploy: `dpl_VVQ2sjA6dwkpyZSFafWNJZBZ8sj3` (READY)

---

## 1. O bug das ocorrências (o 403)

**Sintoma que o cidadão via:** escolhia a instituição de destino, enviava a ocorrência
e recebia *«Este módulo está disponível para cidadãos e instituições autenticados»* ou
*«A instituição de destino não está habilitada»*.

**Causa raiz (reproduzida em produção, não é falta de permissões).** O cliente trazia uma
lista de instituições **inventada** — ENDE, EPAL, SME, GPL, MINFIN, ANIESA, INAPEM — usada
sempre que a lista real não chegava. Na base existe **uma só** instituição: `AGT-LMM`.
Quem escolhia ENDE ou EPAL pedia o envio para um destino que não existe, e o servidor
recusava. O 403 genérico aparecia ainda quando o B.I. não tinha o formato
`9 dígitos + 2 letras + 3 dígitos` — o servidor não conseguia sequer reconhecer o cidadão.

**O que mudou**

| Onde | Antes | Agora |
|---|---|---|
| `server/ocorrencias.ts` → lista de destinos | só a fila de registo, filtrada por `observacoes LIKE '%[INST:%'` (a linha da AGT-LMM já não tem esse marcador → lista vazia → cliente caía nos exemplos fictícios) | a tabela `institutions` é a fonte principal; a fila continua a somar |
| `src/features/ocorrencias/client.ts` | devolvia os exemplos fictícios sem sessão | devolve lista vazia — nunca promete destinos que não existem |
| mensagens de erro | «A instituição de destino não está habilitada.» | «A instituição indicada não está habilitada na plataforma. Escolha uma das instituições da lista.» |

**Prova em produção** (cidadão de teste, apagado no fim):

```
inicio   → 200, destinos = [ AGT-LMM — Administração Geral Tributária, Luanda Maianga ]
           instituições fictícias na lista? false
criar    → 200  (ocorrência nº 230)
listar   → 200  (1 ocorrência, estado submetida)
detalhe  → 200  (1 evento no histórico)
```

---

## 2. Escopo de titularidade no proxy `/api/dados`

Auditoria às tabelas que guardam dados pessoais. Nova suite
`scripts/test_producao_escopo_proxy.cjs` cria o seu próprio cidadão efémero, prova três
propriedades e apaga tudo (incluindo o `profiles` que o proxy cria sozinho):

```
contacts  leitura própria                → 200, 0 linhas alheias
documents leitura própria                → 200, 0 linhas alheias
insert com owner_bi forjado              → 200, gravado = BI autenticado  ✓ servidor sobrepõe
pedido de leitura com owner_bi de OUTRO  → só devolve linhas minhas      ✓ escopo vence o filtro
residuo_limpo                            → true
```

O ramo institucional de `contacts` foi revisto e fica documentado no código: uma
instituição **não consegue** cair no B.I. de um cidadão, porque a resolução de identidade
recusa instituições sem código próprio (401 «Identidade incompleta»).

`document_revisions` confirmado com leitura concedida (HTTP 200 pelo anon).

---

## 3. Suite `guardas_admin` — flake de ordem corrigida

O limitador de e-mail é **por IP** e partilhado por todas as suites. A asserção exigia
429 exactamente na 6.ª chamada, o que dependia do tráfego das suites anteriores e falhou
numa ronda em que as outras já o tinham esgotado. A garantia que interessa — «o limite
dispara e mantém-se disparado» — passa a ser a asserção. Já não depende da ordem.

---

## 4. Limpeza de dados

Removidos desta ronda: cidadãos efémeros `002399702LA402`, `0023997FTLA322`,
`002399731LA711` (conta, perfil e fila), ocorrências **#209, #210, #211, #227, #228,
#229, #230** com eventos/fotos/notificações, e contactos de teste.

**Estado final da base de produção:**

```
contas    3 → agente.agt-lmm-01@inst… (instituição) · bi.002399714la030@cidadao… (cidadão) · agente.admin-0001@admin… (admin)
perfis    5 → CDA, AGT-LMM, ADMIN-0001, 002399714LA030, AGT-LMM-01
ocorrências 2 → #186 «Poste de iluminação na estrada» · #212 «Poste de iluminação pública danificado»
mensagens 34 · com marca de teste 0 · sem titular 0
```

Nenhum dado real foi apagado: as ocorrências removidas tinham todas marca de teste
(`E2E-…`, `TESTE-…`) e pertenciam a sessões de auditoria anteriores.

---

## 5. Verificação final (todas verdes, contra produção)

| Suite | Resultado |
|---|---|
| `backend_real_playwright` | aprovado |
| `guardas_admin_playwright` | aprovado |
| `ciclo_cidadao_playwright` | aprovado |
| `envio_comprovativo_playwright` | aprovado |
| `residuo_local_playwright` | aprovado |
| `saude_portal_playwright` | aprovado |
| `escopo_proxy` (nova) | aprovado |
| `offline_replay_motivos` | 10/10 |

`npm run lint` (`tsc --noEmit`) limpo. GitHub `main` = `959794d`.

---

## Recomendação de segurança

Os dois tokens usados nesta ronda (GitHub e Vercel) foram colados na conversa. Devem ser
**rodados** — revogar os actuais e emitir novos — porque ficaram expostos no histórico.
