# PROMPT MELHORADO — FUNCIONALIDADE «SONDAGEM» (v36.1)
### Correio Digital Angola · pronto a implementar · 2026-08-23
### UX de referência: enquete do WhatsApp (exemplar anexado pelo dono)

És um programador especialista do projecto **Correio Digital Angola**
(React + Vite + TypeScript, Supabase, Vercel). Implementa a funcionalidade
«Sondagem» **sem quebrar nem danificar nenhum fluxo existente**, usando apenas
os padrões reais do código: popups via `CdaModal` (padrão único do app),
auditoria via `addAuditLog`, i18n via `translationService`/`translateText`,
gráficos via `recharts` (já nas dependências) e migração `supabase/v36_sondagens.sql`
com RLS por papel. Tudo o que abaixo se descreve é **aditivo**.

---

## 1 · CRIAÇÃO (área Instituição, página Correio, «Nova Mensagem»)

1.1. Acrescenta um botão **«Criar Sondagem»** no compositor de nova mensagem
(`MailContent.tsx`), ao lado das acções existentes, sem deslocar o envio normal.

1.2. Ao clicar, abre um popup `CdaModal` com o título **«Criar Sondagem»** e,
por esta ordem: campo **«Pergunta»**; campo **«Texto A»**; campo **«Texto B»**
com a opção **«+ Adicionar opção»** (até 10 opções, com ícone de remover);
interruptor (Sim/Não) **«Permitir várias respostas»** — que significa, como no
WhatsApp, **marcar várias opções num único voto** (não votar várias vezes);
e, por cima do botão de envio, a **linha de âmbito/audiência** definida no §3.

1.3. Validação: pergunta vazia, menos de 2 opções válidas ou opções duplicadas
⇒ o sistema **não regista** e mostra popup `CdaModal` com a mensagem
*«Na sua sondagem está a faltar preencher alguns campos.»*

1.4. Rodapé do popup: «Cancelar» e **«Enviar Sondagem»** — criar = enviar
(a sondagem só existe após o envio, tal como no WhatsApp).

## 2 · ENVIO E ENTREGA

2.1. Ao enviar: grava a sondagem na tabela `sondagens` (status `ativa`) e faz
**fan-out** de uma mensagem por cidadão da audiência (§3), pelo canal
institucional já existente (mesmo padrão da difusão de emergência v20), com
badge **«Sondagem»** na caixa do cidadão e `sondagem_id` na mensagem — o corpo
da sondagem fica guardado **uma única vez**, nunca duplicado por cidadão.

2.2. Escreve auditoria (`addAuditLog`: criação/envio, resposta, alteração de
voto, encerramento) e notifica os cidadãos (mesmo padrão do aviso de
agendamento: correspondência não lida + notificação com texto oficial).

## 3 · ÂMBITO DE DIFUSÃO — quem recebe (regra v36.1)

3.1. **ÂMBITO NACIONAL** — órgãos do Governo responsáveis por todos os cidadãos
(Presidência da República, Ministérios, INE, INAPEM e demais órgãos centrais):
a sondagem é enviada a **TODOS os cidadãos registados na plataforma**.

3.2. **ÂMBITO LOCAL** — instituições com público próprio (Conservatórias,
Cartórios, Municípios/Governos Provinciais, hospitais, escolas, etc.):
a sondagem é enviada **APENAS aos cidadãos registados no sistema dessa
instituição** — os que já têm relação pré-existente com ela nas tabelas actuais
(`document_requests`/`user_requests` dirigidos ao código da instituição +
`messages` trocadas), resolvidos pelos lookups existentes de `supabaseService`
ou por nova RPC de leitura no espírito da v20.

3.3. O âmbito fica gravado na sondagem (`abrangencia: 'nacional' | 'local'`),
com default sugerido pela categoria do directório institucional existente e
**correção possível pela Administração na aprovação** (override explícito e
auditado) — porque dentro da mesma categoria podem coexistir órgãos nacionais
e unidades locais (ex.: Saúde: MINSA nacional vs. hospital provincial).

3.4. O popup mostra antes do envio: *«Âmbito: Nacional — será enviada a todos
os N cidadãos registados»* ou *«Âmbito: Local — será enviada aos M cidadãos
registados no sistema da instituição»*.

3.5. Audiência local vazia ⇒ **não cria** e mostra popup
*«Não há cidadãos registados no sistema desta instituição.»*

## 4 · RESPOSTA (área Cidadão, página Correio)

4.1. O item «Sondagem» abre um cartão com a pergunta e as opções — *radio* se
voto único, *checkboxes* se «Permitir várias respostas».

4.2. No fim do container **«Assistência do Documento»** (`AssistenteDocumento`
em `MessageDetail.tsx`) existe o botão **«Responder à Sondagem»**, que confirma
o preenchimento.

4.3. Se faltar algum campo (nenhuma opção marcada) ⇒ **não regista** e mostra
popup *«Na sua sondagem está a faltar preencher alguns campos.»*

4.4. Sucesso ⇒ «Resposta registada ✔». **Um voto por cidadão**, re-votável
(alterar o voto) enquanto a sondagem está `ativa`; após `encerrada`, só leitura
dos totais.

## 5 · RESULTADOS (área Instituição, página Correio)

5.1. Acrescenta o botão `cda-link-text` **«Sondagens»** imediatamente **à
direita** do botão «Validação QR» (`MailContent.tsx`).

5.2. Abre a página/lista das sondagens criadas (pergunta, data, estado, nº de
respostas). Ao clicar numa sondagem, o **gráfico de barras** (`recharts`) da
respectiva sondagem **expande/fica visível**: contagem e percentagem por opção
+ total de votantes; e o botão **«Encerrar sondagem»** (fecha novos votos).

5.3. Respeita `paginasPermitidas`: colaboradores só criam/vêem se autorizados.

## 6 · DADOS (migração `supabase/v36_sondagens.sql`)

6.1. `sondagens(id, instituicao_code, instituicao_nome, pergunta, opcoes jsonb,
permitir_varias, status, abrangencia, criada_por, created_at)`.
6.2. `sondagem_respostas(id, sondagem_id FK, cidadao_bi, escolhas jsonb,
created_at, updated_at, UNIQUE(sondagem_id, cidadao_bi))` — re-voto = upsert.
6.3. `alter table messages add column sondagem_id bigint null` (nullable; os
fluxos antigos ignoram-na).
6.4. RLS: instituição lê/cria só as suas sondagens e agregados; cidadão lê as
que lhe foram entregues e insere/actualiza **só as suas** respostas; admin lê
tudo. Sem `service_role` no browser.

## 7 · REGRAS TRANSVERSAIS (não negociáveis)

7.1. Nenhum comportamento existente muda (mensagens normais, QR, emergência,
pagamentos) — tudo aditivo.
7.2. **Fronteira honesta**: sem Supabase configurado, «Criar Sondagem» mostra
selo «Funcionalidade disponível em Modo Real (Supabase)» (mesmo padrão do selo
dos Pagamentos); nunca simular dados de sondagem.
7.3. Limites: máx. 10 opções; pergunta ≤ 280 chars; opção ≤ 120; máx. 3
sondagens ativas em simultâneo por instituição (popup honesto se exceder).
7.4. Todas as strings passam pelo `translationService` (incl. línguas nacionais).

## 8 · CRITÉRIOS DE ACEITAÇÃO (E2E, a juntar à varredura existente)

- [ ] «Criar Sondagem» abre o popup completo (Pergunta, Texto A/B, +opção, toggle).
- [ ] Popup mostra âmbito/audiência antes do envio (INAPEM ⇒ «Nacional — todos os N»).
- [ ] Instituição local ⇒ «Local — M cidadãos do sistema»; audiência vazia ⇒ popup e nada criado.
- [ ] Submissão incompleta ⇒ popup de validação, nada criado.
- [ ] Cidadão: badge «Sondagem», cartão com opções, botão «Responder à Sondagem»
      no fim da Assistência do Documento; voto em falta ⇒ popup; sucesso ⇒ «Resposta registada ✔».
- [ ] «Sondagens» à direita de «Validação QR»; lista + gráfico expandido + «Encerrar».
- [ ] Zero excepções JS; auditoria escrita; nenhum write real na varredura.

**Fora de âmbito (backlog)**: editar opções após envio, exportação CSV,
sondagens anónimas para o Admin, agendamento de abertura/fecho, anexos.
