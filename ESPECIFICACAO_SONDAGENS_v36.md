# ESPECIFICAÇÃO — SONDAGENS (v36)
## Prompt original analisado e melhorado · Correio Digital Angola · 2026-08-23

> Este documento é o **prompt melhorado, pronto a implementar**, da funcionalidade
> «Sondagem» (enquete estilo WhatsApp). Resulta da análise do prompt original do
> dono, do exemplar anexado (ecrã «Criar enquete» do WhatsApp) e do conhecimento
> completo da base de código (componentes, tabelas, RLS, padrões de popup,
> auditoria, i18n e filosofia Modo Real).

---

## 0. Parecer técnico sobre o prompt original

**Pontos fortes** (mantidos integralmente):
1. Jornada completa e coerente: criar → enviar → responder → validar → ver resultados.
2. Referência de UX correcta (WhatsApp) — o exemplar anexado confirma o modelo mental.
3. Locais de inserção bem escolhidos e compatíveis com o código existente:
   - criação dentro de «Nova Mensagem» (área Instituição, página Correio — `MailContent.tsx`);
   - resposta no fim do container «Assistência do Documento» (`AssistenteDocumento` embutido em `MessageDetail.tsx`);
   - listagem/resultados ao lado de «Validação QR» (botão `cda-link-text` em `MailContent.tsx:1292`).

**Lacunas e ambiguidades que esta especificação resolve**:
1. **Terminologia**: o prompt mistura «Enquete» e «Sondagem». → Termo canónico do
   projecto: **Sondagem** (pt-AO). Título do popup: **«Criar Sondagem»**.
2. **«Permitir várias respostas»** no WhatsApp (e no exemplar anexado) significa
   **multi-selecção numa única votação** (o cidadão pode marcar várias opções de
   uma vez), *não* votar várias vezes. → Implementado como multi-select;
   **1 voto por cidadão**, re-votável (alterar o voto) enquanto a sondagem está
   activa — paridade WhatsApp.
3. **«Enviar a todos os cidadãos registados»** não definia escala nem canal. →
   Fan-out pelo canal institucional já existente (mesmo padrão da difusão de
   emergência v20: insert em `messages` pela sessão da instituição), com o corpo
   da sondagem guardado **uma única vez** na tabela `sondagens` e referenciado
   por `sondagens.id` (não duplicar o payload N vezes).
4. **Regras em falta**: quem pode criar, encerramento, validação exacta do
   formulário, mensagens de erro exactas, agregação de resultados em tempo útil,
   permissões de colaboradores, auditoria, RLS, comportamento sem nuvem. → Todas
   definidas abaixo.
5. **Risco de quebra evitado**: nada nesta especificação altera fluxos existentes
   (mensagens normais, QR, emergência); tudo é aditivo (nova tabela + nova coluna
   nullable + novos botões/componentes).

---

## 1. Modelo de dados — migração `supabase/v36_sondagens.sql`

```sql
-- 1) Sondagens (cabeçalho único; o payload NÃO é duplicado no fan-out)
create table if not exists public.sondagens (
  id               bigserial primary key,
  instituicao_code varchar(20)  not null,          -- ex.: 'INAPEM-LLMM'
  instituicao_nome text         not null,
  pergunta         text         not null,
  opcoes           jsonb        not null,          -- [{"id":"a","texto":"..."}] 2..10
  permitir_varias  boolean      not null default false, -- multi-selecção num voto
  status           varchar(20)  not null default 'ativa', -- 'ativa' | 'encerrada'
  criada_por       varchar(40)  not null,          -- Nº Agente (ex.: INAPEM-LLMM-01)
  created_at       timestamptz  not null default now()
);

-- 2) Respostas: 1 voto por cidadão; re-voto = upsert (paridade WhatsApp)
create table if not exists public.sondagem_respostas (
  id          bigserial primary key,
  sondagem_id bigint       not null references public.sondagens(id) on delete cascade,
  cidadao_bi  varchar(20)  not null,
  escolhas    jsonb        not null,               -- ["a","c"] ids das opções
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now(),
  unique (sondagem_id, cidadao_bi)
);

-- 3) Ligação ao correio: mensagem de difusão referencia a sondagem
alter table public.messages
  add column if not exists sondagem_id bigint null
  references public.sondagens(id) on delete set null;

-- RLS (mesmo espírito das políticas existentes: cada papel vê só o seu lado)
alter table public.sondagens enable row level security;
alter table public.sondagem_respostas enable row level security;
-- sondagens: instituição lê/cria as suas; cidadão lê as que lhe foram entregues
-- (via messages.sondagem_id); admin lê todas.
-- sondagem_respostas: cidadão insere/actualiza APENAS as suas (cidadao_bi = sessão);
-- instituição lê agregados das suas sondagens; admin lê todas.
-- (políticas completas no ficheiro de migração, a par do padrão v20/v25.)
```

**Notas de segurança**: sem `service_role` no browser; RLS garante que um cidadão
nunca lê respostas de outro nem sondagens de outra instituição; agregação feita
no cliente institucional a partir de `sondagem_respostas` da própria instituição.

---

## 2. UX — Área INSTITUIÇÃO (responsável ou colaborador autorizado)

### 2.1 Criação (página Correio → «Nova Mensagem», `MailContent.tsx`)
- Novo botão secundário **«Criar Sondagem»** no compositor de nova mensagem
  (ao lado das acções existentes, sem deslocar o envio normal).
- Ao clicar abre **popup padrão `CdaModal`** (padrão único de popups do app,
  commit 82cf4fb) com título **«Criar Sondagem»** e, por ordem:
  1. Campo **«Pergunta»** (obrigatório, máx. 280 chars);
  2. Campo **«Texto A»** e **«Texto B»** (obrigatórios, não vazios, sem duplicados);
  3. Botão **«+ Adicionar opção»** (até 10 opções) e ícone de remover por opção;
  4. Interruptor (toggle) **«Permitir várias respostas»** (default OFF = voto único);
  5. Rodapé: «Cancelar» e «Criar Sondagem».
- **Validação** (espelho do pedido original): pergunta vazia, <2 opções válidas ou
  opções duplicadas ⇒ o sistema **não regista** e mostra popup `CdaModal`:
  *«Na sua sondagem está a faltar preencher alguns campos.»* + lista curta do que falta.
- **Criação bem-sucedida**: insert em `sondagens` (status `ativa`) ⇒
  **fan-out** de uma mensagem por cidadão registado (`profiles`, papel cidadão)
  pelo canal institucional existente (assunto: `Sondagem: <pergunta truncada>`,
  preview, `sondagem_id` preenchido) ⇒ `addAuditLog('Sondagem criada e difundida
  a N cidadãos', 'success')` ⇒ notificação ao cidadão (mesmo padrão do aviso de
  agendamento: correspondência não lida + notificação com texto oficial).
- **Botão «Enviar Sondagem»** no rodapé do popup confirma a difusão (a sondagem
  só existe após envio — tal como no WhatsApp, criar = enviar).

### 2.2 Consulta de resultados (página Correio, barra de atalhos)
- Novo botão `cda-link-text` **«Sondagens»** imediatamente **à direita** do botão
  «Validação QR» (`MailContent.tsx` linha ~1292, bloco `isInst`).
- Abre painel/página com **lista** das sondagens da instituição (pergunta, data,
  estado, nº de respostas). Clique numa sondagem ⇒ **expande** (accordion) com:
  - **Gráfico de barras recharts** (dependência já presente; chunk `charts`):
    contagem e % por opção; total de votantes / total entregue.
  - Lista de opções com barras horizontais e valores (acessível sem gráfico).
  - Botão **«Encerrar sondagem»** (status `encerrada`; cidadãos passam a ver o
    resultado como fechado; audit log).
- Respeita `paginasPermitidas`: colaboradores só vêem/criam se a página lhes
  estiver permitida (mesmo gate das restantes páginas institucionais).

---

## 3. UX — Área CIDADÃO (página Correio)

- A sondagem chega como item de correspondência com **badge «Sondagem»**.
- Ao abrir (`MessageDetail.tsx`): cartão da sondagem com pergunta e opções
  (radio se voto único; checkboxes se «Permitir várias respostas»).
- **No fim do container «Assistência do Documento»** (`AssistenteDocumento`),
  botão **«Responder à Sondagem»**: submete a selecção.
  - Campos em falta (nenhuma opção marcada) ⇒ **não regista** e mostra popup
    `CdaModal`: *«Na sua sondagem está a faltar preencher alguns campos.»*
  - Sucesso ⇒ upsert em `sondagem_respostas` ⇒ estado «Resposta registada ✔»
    com possibilidade de **alterar o voto** enquanto `ativa` (paridade WhatsApp);
    após `encerrada`, só leitura dos totais.
- Audit log local + sincronização de estado de leitura da mensagem
  (fluxo `unread` existente inalterado).

---

## 4. Regras transversais (não negociáveis)

1. **Nada quebra o existente**: mensagens normais, QR, emergência e pagamentos
   não são tocados; `messages.sondagem_id` é nullable e ignorado pelos fluxos antigos.
2. **Fronteira honesta**: sem Supabase configurado (modo demonstração), o botão
   «Criar Sondagem» mostra selo honesto «Funcionalidade disponível em Modo Real
   (Supabase)» — mesmo padrão do `selo-gateway-pendente` dos Pagamentos.
   Nunca simular dados de sondagem.
3. **Auditoria**: criar/enviar, responder, alterar voto e encerrar ⇒ `addAuditLog`
   (tipos `info`/`success`), com instituição e Nº Agente.
4. **i18n**: todas as strings passam por `translationService`/`translateText`
   (incl. línguas nacionais, padrão existente).
5. **Limites anti-abuso**: máx. 10 opções; máx. 3 sondagens activas em simultâneo
   por instituição (popup honesto se exceder); pergunta ≤ 280 chars; opção ≤ 120.
6. **Escala**: fan-out usa o canal `messages` existente (43 cidadãos hoje); insert
   em lote único transaccional; se a plataforma crescer >10⁴ cidadãos, migrar a
   entrega para leitura por `sondagem_id` sem fan-out (já preparado pelo FK).

---

## 5. Critérios de aceitação (E2E, a acrescentar à varredura)

Instituição (conta real `INAPEM-LLMM-01`, **modo local/demo só para render**):
- [ ] «Criar Sondagem» abre popup `CdaModal` com Pergunta, Texto A/B, +opção e toggle.
- [ ] Submissão incompleta ⇒ popup de validação, nada é criado.
- [ ] Botão «Sondagens» existe à direita de «Validação QR»; lista renderiza.
- [ ] Sondagem expandida mostra barras/gráfico e totais.
Cidadão (conta real `002399714LA030`):
- [ ] Item «Sondagem» na caixa; detalhe mostra opções; botão «Responder à Sondagem»
      no fim da Assistência do Documento.
- [ ] Submissão sem selecção ⇒ popup de campos em falta.
- [ ] Voto registado ⇒ «Resposta registada ✔»; re-voto enquanto ativa.
Geral: zero excepções JS; auditoria escrita; sem writes reais na varredura
(fronteira honesta da suite `e2e_paginas.mjs`).

---

## 6. Fora de âmbito (v36) — backlog

Edição de opções após envio · exportação CSV de resultados · sondagens
anónimas agregadas para o Admin · agendamento de abertura/fecho · anexos na
sondagem.

---

*Ficheiros principais a tocar (só adições): `supabase/v36_sondagens.sql` (novo),
`src/components/features/MailContent.tsx`, `src/components/features/MessageDetail.tsx`,
novo `src/components/features/SondagemContent.tsx` (lista+resultados) e
`src/components/features/SondagemModal.tsx` (criação, via `CdaModal`),
`src/services/supabaseService.ts` (operações sondagem), `scripts/e2e_paginas.mjs`
(verificações). Nenhum ficheiro existente perde comportamento.*
