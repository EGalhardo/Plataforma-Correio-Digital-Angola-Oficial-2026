# Auditoria Autónoma da Plataforma — runbook
*(2026-08-08, a pedido do dono: «criar um prompt para verificar todas as funcionalidades e testar de forma autónoma»)*
*Última execução verificada: **26 PASS / 0 FAIL** (blocos A–C + §D com sessões reais).*

## 1. O que é e o que cobre

`scripts/auditoria_autonoma.sh` testa diretamente contra produção, em ~1 min:

| Bloco | Verificações (26 atualmente) |
|---|---|
| **A. Produção viva** | health da API; página 200 com entry; chunks de pagamentos/self-service KB no bundle; selo honesto de gateway + 4 métodos; **integridade de TODOS os 22 chunks lazy** (nota 6 do dono — cada página da SPA é um chunk; um chunk partido = página em branco) |
| **B. API de IA** | explicar genérico; KB INE; KB BNA; traduzir EN intacto; umbundu com embrulho honesto (ou tradução diferenciada curta) |
| **C. RLS / base (anónimo)** | tabelas v25 + v26 existem; escrita anónima **bloqueada** nas duas (401/42501) |
| **§D. Sessões reais (test account)** | login das duas contas de teste; claims oficiais no JWT (`bi` / `instituicao`); instituição regista cobrança → cidadão vê → cidadão **não** pode forjar cobranças → instituição cancela (linha afetada comprovada); KB self-service: criar → público vê (ativa) → desativar → público deixa de ver → dono ainda vê → apagar (linha comprovada) |
| **E. Todas as páginas (browser real)** | `scripts/e2e_paginas.mjs`: Chromium headless entra com as 3 identidades demo nativas (cidadão/instituição/admin) e verifica — por papel — **(a)** ecrãs públicos de acesso: login, «Auto Preencher Demonstração» (funcional: enche mesmo o campo), **página de Registo** (RegisterStepper cidadão · Adesão instituição · Credencial Operacional admin — render; **nunca submete**, ver fronteira honesta no script), **página Redefinir Senha** (ResetPasswordStepper) e Login Facial (cidadão); **(b)** TODA a navegação lateral + páginas secundárias — **23 páginas autenticadas** (7+7+9); **(c)** fluxos funcionais: detalhe de mensagem (ABRIR/ANALISAR), selo de gateway em Pagamentos, formulário de cobrança (abre com «Nova cobrança») e **logout** («Sair do Canal» volta ao login) = **49 verificações**. Esperado: **49 PASS / 0 FAIL** (~100 s). Descoberta registada: a página gov-correspondencias chama-se «Correspondências» no desktop e «Correios» no mobile (inconsistência cosmética no backlog). |
| **F. Fluxos de ESCRITA reais (browser)** | `scripts/e2e_fluxos_escrita.mjs`: submissões reais em Chromium com dados únicos-descartáveis e **limpeza total comprovada no fim** — **Fluxo A**: Registo de cidadão pelos 3 passos + biometria simulada + PVIC; prova no Auth que a conta nasce com claims oficiais (`app_metadata.bi`/`role`) e apaga (Auth + solicitacao). **Fluxo B**: Adesão institucional pelo formulário (15 campos, Código + Nº Agente gerados no ecrã) → homologação pelo arnês (passo assinalado HARNESS — a decisão em si cabe ao admin) → **login real no UI com o Nº Agente gerado** → cobrança Kz 25,50 submetida pelo formulário de pagamentos ao cidadão de teste (RLS real) → prova cruzada na tabela `pagamentos` (colunas exatas) → **cancelamento pela própria UI** → zero resíduos. **Env-gate**: exige `SUPABASE_SERVICE_ROLE_KEY` no ambiente (só para limpeza/homologação); sem ela recusa escrever (exit 2 = SKIP). Esperado: **10 PASS / 0 FAIL** (~40 s). Descobertas incorporadas: Auth do cidadão usa e-mail sintético `bi.<bi>@…` (procura por `app_metadata.bi`); o 4.º campo do formulário de cobrança grava em `referencia` e o 5.º («Assunto/protocolo») em `documento_ref`; claim `instituicao` da instituição = código completo (ex.: UTCEC-LTBB). |

Resultado esperado: `TOTAL GERAL: 26 PASS / 0 FAIL` no script + `49 PASS / 0 FAIL` na varredura de páginas + `10 PASS / 0 FAIL` nos fluxos de escrita.

## 2. O prompt para me chamar (copiar/colar a qualquer momento)

> **Executa a auditoria autónoma completa:**
> 1) corre `bash scripts/auditoria_autonoma.sh` no repo com as variáveis §D das contas de teste (vê §3 onde estão);
> 2) corre a bateria local `bash /home/user/cda_test/run_all.sh` (esperado: 80 PASS / 0 FAIL);
> 3) confirma `node node_modules/typescript/bin/tsc --noEmit` limpo (reinstala node_modules se o ambiente tiver sido reposto);
> 4) corre a varredura de TODAS as páginas `node scripts/e2e_paginas.mjs` (Playwright + Chromium com as 3 identidades demo nativas — páginas, ecrãs públicos de acesso e fluxos funcionais; esperado: 49 PASS / 0 FAIL; screenshots ficam em `/home/user/cda_test/screenshots`);
> 4b) corre os fluxos de ESCRITA reais `node scripts/e2e_fluxos_escrita.mjs` com as variáveis do `.env` exportadas (registo cidadão + adesão institucional + cobrança, tudo pelo browser, com limpeza total; esperado: 10 PASS / 0 FAIL; sem SUPABASE_SERVICE_ROLE_KEY sai SKIP por segurança);
> 5) reporta tudo numa tabela com PASS/FAIL e evidências, sem declarar sucesso sem provas;
> 6) se algo falhar, investiga a causa e propõe a correção antes de a aplicar.

## 3. §D — contas de teste e credenciais

Criadas a **2026-08-08 via API oficial de signup** (as claims nasceram oficiais
pela trigger `cda_claims_sync` de v14 — prova de que o registo real funciona):

| Conta | Papel | Claim oficial |
|---|---|---|
| `cda.teste.cidadao.2026@gmail.com` | cidadã | `bi = 009999999LA099` |
| `cda.teste.instituicao.2026@gmail.com` | instituição | `instituicao = CDATST` |

- **As palavras-passe NÃO estão no repo** (nunca se commitam credenciais) —
  estão em `/home/user/cda_test/contas_teste.md` e foram partilhadas no chat.
- A sigla `CDATST` **não** figure no registo KB: nada do circuito de teste
  toca nas respostas públicas da IA.
- A §D deixa de propósito **1 cobrança pendente** (Kz 12.500,50) no nome do
  cidadão de teste → serve a demonstração ao INAPEM; e 1 cancelada (rasto).
- Rodar as passwords: Supabase Dashboard → Authentication → Users.

## 4. O que continua FORA do alcance autónomo

Fluxos de UI com sessão de browser (compositor, caixa de entrada, videochamada,
SOS) — verificam-se nas suites locais e em testes guiados; as **funções de dados
e segurança por trás deles estão cobertas** pela §D e pelos blocos A–C.

## 5. Execução manual rápida

```bash
# auditoria de produção completa (A–C + §D)
CDA_TEST_CID_EMAIL=... CDA_TEST_CID_PASS=... \
CDA_TEST_INST_EMAIL=... CDA_TEST_INST_PASS=... \
bash scripts/auditoria_autonoma.sh

# bateria local de regressão (80 suites)
bash /home/user/cda_test/run_all.sh

# tipagem
cd <repo> && node node_modules/typescript/bin/tsc --noEmit
```

## 6. Quando correr

- Depois de cada deploy (aguardar ~2 min de propagação da Vercel);
- Antes de qualquer demonstração (ex.: INAPEM);
- Periodicamente (idempotente; a §D só escreve cobranças da sigla de teste).
