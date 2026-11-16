# Interoperabilidade entre contas reais — relatório da ronda

Data: 2026-11-16 · Produção: https://correio-digital-angola-oficial.vercel.app
Commit final: `5cf3ca8` · Deploy: `dpl_…` (READY) · `tsc` limpo · GitHub `main` = `5cf3ca8`

Teste conduzido com **Playwright** em três browsers reais, autenticados por
formulário com as credenciais reais fornecidas:

| Conta | Acesso | Portal |
|---|---|---|
| Cidadão | `002399714LA030` | `/#/login` |
| Instituição | `AGT-LMM-01` | `/institucional#/login` |
| Administração | `ADMIN-0001` | `/admin#/login` |

---

## 1. Resultado do ciclo completo

| Passo | Resultado | Prova |
|---|---|---|
| Login das três contas | ✅ | redireccionamento para `#/home`, `#/institucional#/home`, `#/admin#/gov-dashboard` |
| Cidadão escreve e envia à instituição | ✅ | linha `002399714LA030 → AGT-LMM` na base, estado «Lida» |
| Instituição recebe no expediente | ✅ | linha «NÃO LIDA CIDADÃO: 002399714LA030» na lista |
| Instituição abre (**Analisar**) e responde | ✅ | destinatário pré-preenchido `002399714LA030`, protocolo do original capturado |
| Resposta gravada e visível ao cidadão | ✅ | linha `AGT-LMM → 002399714LA030` |
| Administração observa a correspondência | ✅ | `/admin#/gov-correspondencias` mostra o selo do teste |
| Ocorrência local: cidadão → instituição | ✅ | ocorrência criada (`submetida`), visível em «Ocorrências Recebidas» |
| Denúncia/Reclamação do cidadão | ✅ | `[REGISTO DE DENÚNCIA] …` → AGT-LMM |
| Módulo de Comunicados da Administração | ✅ | abre e lista os comunicados oficiais |

Erros de JavaScript no browser durante todo o ciclo: **nenhum**.

## 2. Correções feitas nesta ronda

### 2.1 Contadores do Correio não somavam (bug real, visível ao utilizador)

Numa conta real: **Todas 18 · Lidas 12 · Não Lidas 10** — um subconjunto maior
que o todo. Na instituição, **Todas 15 · Não Lidas 22**.

**Causa:** a aba «Não Lidas» reutilizava `unreadTotal`, o contador do **sino**,
que soma notificações de outros módulos (ocorrências, vídeo, denúncias).

**Correção** (`src/components/features/MailContent.tsx`): as abas passam a
partilhar um único universo — a caixa visível, sem eliminadas nem ocultas — de
modo que **Lidas + Não Lidas = Todas**, e cada contador corresponde à lista que
abre. O cabeçalho («N mensagens por ler») passou a usar o mesmo número: antes
mostrava 10 acima de uma aba de 6. O sino continua a contar tudo, como deve.

Confirmado em produção depois do deploy: cidadão **18 / 12 / 6** e instituição
**15 / 12 / 3**, com o cabeçalho a concordar.

### 2.2 Suites instáveis (não eram bugs do produto)

Três suites davam falsos negativos por lerem a base imediatamente após a UI
confirmar uma operação, quando a escrita ainda não tinha chegado:

- `test_producao_envio_comprovativo_playwright` — «protocolo no ecrã mas não na base» (1 em 4 rondas);
- `test_interop_contas_reais_playwright` — leitura imediata de mensagens/ocorrências/denúncias;
- `test_producao_guardas_admin_playwright` — exigia 429 exactamente na 6.ª chamada, mas o limitador é por IP, partilhado entre suites e expira por janela.

Todas passaram a **esperar** (até ~12 s, com repetição) e a suite de
interoperabilidade repete o ciclo uma vez e declara em que tentativa passou.
O `envio_comprovativo` ficou com registo das chamadas de rede, para que uma
falha futura se distinga de uma escrita lenta.

## 3. O que foi verificado e não tinha defeito

- **Senha do administrador:** o `987654321.` com ponto era da pontuação da
  mensagem; a senha aceite é `987654321`. Não é bug.
- **Botão «Rever ocorrência» inerte:** em modo GPS o botão fica desactivado
  enquanto o GPS/geocodificação resolve — comportamento correcto, o teste é que
  não esperava. O formulário também exige a caixa «Confirmo os dados e a
  instituição destinatária» antes de «Enviar ocorrência».
- **Entrega de correspondência:** confirmada em todos os sentidos, sem perdas.

## 4. Limpeza — produção ficou como estava

Cada execução marca o que cria com um selo único (`INTEROP-…`), e
`scripts/limpar_provas_interop.cjs` remove tudo no fim.

```
mensagens: 34 (0 com marca de teste)
ocorrências: #186 «Poste de iluminação na estrada» · #212 «Poste de iluminação pública danificada»
perfis: CDA, AGT-LMM, ADMIN-0001, 002399714LA030, AGT-LMM-01
contas: agente.agt-lmm-01 · bi.002399714la030 · agente.admin-0001
```

## 5. Verificação final (9 verificações, todas verdes)

| Suite | Resultado |
|---|---|
| `backend_real_playwright` | aprovado |
| `guardas_admin_playwright` | aprovado |
| `ciclo_cidadao_playwright` | aprovado |
| `envio_comprovativo_playwright` | aprovado |
| `residuo_local_playwright` | aprovado |
| `saude_portal_playwright` | aprovado |
| `escopo_proxy` | aprovado |
| `interop_contas_reais` (nova) | aprovado (1.ª tentativa) |
| `offline_replay_motivos` | 10/10 |

## 6. Nota de segurança

A senha de administração e as credenciais das três contas foram partilhadas na
conversa, tal como os dois tokens de deploy. Recomenda-se **rodar** todos.
