# Correções e funcionalidades aplicadas — 2026-08-07 («Avança todas»)

Sessão aprovada pelo dono com 5 itens do backlog + 2 defeitos encontrados
AO VIVO durante a verificação. Todos os itens foram verificados em
produção antes de se declarar concluído. Bateria local no fim: **79
suites, 0 falhas**; `tsc --noEmit` limpo.

---

## 1) KB vaga 3 — 4 novas instituições + motor mais justo (17 instituições / 39 fontes)
- Correspondência de siglas por **fronteira de palavra** (regex com
  `[^a-z0-9]` em redor): INE e TS tornaram-se possíveis; «online»,
  «gabinete» e «dtservicos» deixaram de ativar instituições por acidente
  (veto provado ao vivo: «Gabinete do Director Provincial» responde sem KB).
- Casamento por nome da instituição nas **duas direções** («Tribunal
  Supremo — acórdão publicado» passa a encontrar o TS).
- Novas fontes (todas verificadas ao vivo): **BNA** (Portal do Consumidor
  Bancário, Provedoria, Aviso 12/2016, Lei 12/2015 art. 74), **INACOM**
  (LAC 15555), **INE** (Censo 2024: 36,6 M hab., censo2024.ine.gov.ao),
  **TS** (tribunalsupremo.ao + Jurisprudência).
- Sondas ao vivo 5/5 verdes. Commit `89940a1`.

## 2) S6 — camada IA de clareza no compositor (parte opcional da spec, ativada)
- Nova ação `rever_clareza`: a IA devolve observações + marcador + versão
  melhorada; o compositor oferece «Usar versão melhorada» / «Manter o meu
  texto»; fail-safe total — **falha da IA nunca bloqueia o envio** (a caixa
  diz-o ao utilizador). Edição do texto limpa a revisão anterior.
- Verificado ao vivo: API formata 5 observações + sugestão (Gemini) e os
  marcadores existem no bundle servido. Commits `f63fa74`.

## 3) Línguas nacionais (experimental) — com guardas de honestidade PROVADAS AO VIVO
- Tradução para 6 línguas nacionais (Umbundu, Kimbundu, Kikongo, Cokwe,
  Kwanyama + PT simples), painel marcado «(experimental)»; regra 4 do
  prompt mantém EN/FR byte-idênticos.
- **Guarda anti-eco** (`ec1d2f7`): o fallback llama-3.1-8b devolvia o texto
  em Português como se fosse tradução → embrulho honesto «Não consigo
  traduzir com qualidade para X…».
- **Guarda anti-degeneração** (`27c8ccf`, defeito encontrado ao vivo após o
  deploy): o llama entrou em CICLO («Omu ku kala ku kala…», milhares de
  caracteres). Detetor conservador: ≥ 24 palavras com diversidade lexical
  < 30 % ou 10+ palavras iguais seguidas. O embrulho mostra sempre o texto
  ORIGINAL — nunca o lixo. Reprovado ao vivo: Umbundu e Kimbundu embrulhados
  com honestidade; EN intocado (Gemini traduz a sério).

## 4) Robustez (defeito encontrado ao vivo)
- O SDK do Gemini podia ficar pendurado sem responder (pedido > 80 s em
  silêncio) → corrida com timeout de 25 s; expirado, cai no fallback Groq.
- Teto `max_tokens: 4096` no fallback para um ciclo nunca queimar tokens.
- Commit `27c8ccf`.

## 5) Tipagem estrita (dívida técnica)
- `: any`: **191 → 0** em `src/` + `server.ts` (regex
  `: any([^A-Za-z0-9_]|$)`). Interfaces de linhas Supabase, uniões
  estritas, `ReconhecimentoVoz` estrutural para a Web Speech API, catches
  tipados. `api/index.ts` mantém `req: any, res: any` deliberadamente
  (regra da função Vercel). Commit `d5acf5d`.

## 6) E6 — Base de Conhecimento SELF-SERVICE das instituições
- A aba «Base de Conhecimento» do painel institucional **era uma maquete**
  (ficheiros fictícios «Processado» que a IA nunca lia) → CRUD real:
  novo `InstKbSelfService` (listar/criar/ativar-desativar/apagar) contra
  `public.kb_fontes_instituicao`; limites 200–4000 caracteres espelham os
  checks da BD; erros de RLS explicados em linguagem simples.
- **`supabase/v25_kb_instituicao.sql`** (o dono aplica no SQL Editor):
  tabela + RLS na convenção v14/v20 (`app_metadata.instituicao`; admin
  passe-partout; leitura pública só de fontes ativas) + trigger.
- Servidor (api + server, cópias em paridade): fusão **fail-open** — REST
  com timeout de 4 s; sem tabela/sem env/erro ⇒ resposta só com KB
  estática. Selo/auditoria contam as fontes dinâmicas automaticamente.
- Commit `f5b68e6`. Verificado ao vivo: marcadores no chunk servido;
  fusão inerte até o SQL ser aplicado (KB estática continua a responder).

---

## Ação pendente do DONO (5 min) — ativar o self-service
1. Abrir https://supabase.com/dashboard/project/klrclczcahfycfdxzdqs
2. Menu lateral **SQL Editor** → **New query**.
3. Colar TODO o conteúdo de `supabase/v25_kb_instituicao.sql` → **Run**.
   Esperado: `Success. No rows returned`.
4. Verificar (na mesma janela):
   `select tablename, policyname from pg_policies where tablename = 'kb_fontes_instituicao';`
   → deve listar 4 políticas `kbfontes_*`.
5. A partir daí: painel da instituição → IA Institucional → Base de
   Conhecimento → adicionar fontes; entram nas respostas do Assistente de
   Documentos quando o assunto envolve a instituição. Desativar remove
   imediatamente da IA.

## Backlog que segue (não fazia parte dos 5 itens)
- Modal morto `isOfficialConfirmOpen` no MailContent.
- Classificação «disponível vs demonstração» das páginas Gov (S7).
- `checklist_verificacao_paginas.md`.
