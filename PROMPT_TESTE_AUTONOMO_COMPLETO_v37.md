# PROMPT — TESTE AUTÓNOMO COMPLETO DE TODAS AS PÁGINAS (v37)

## Detecção, Correcção e Reporte de Erros — Correio Digital Angola (Plataforma-Correio-Digital-Angola-Oficial-2026)

> Prompt melhorado e adaptado à arquitectura REAL desta aplicação (React+Vite+TSX,
> servidor próprio `server.ts`, Supabase em Modo Real, três áreas: Cidadão,
> Instituição e Administração). Usa as contas reais, as chaves do `.env`
> (Supabase/Groq/Gemini), o PAT de push fornecido na sessão e o deploy Vercel —
> **sem nunca gravar segredos no repositório**.

---

## MODO DE EXECUÇÃO

```
AUTÓNOMO — SEM INTERVENÇÃO HUMANA

Lês o código.
Analisas o código.
Testas no browser (Playwright, sem cabeça) contra o build de produção local.
Validas os dados contra a nuvem (Supabase REST, service role do .env).
Detectas os erros.
CORRIGES os erros (cirúrgico, sem quebrar funcionalidades existentes).
Re-testas até ficar verde.
Reportas tudo num único relatório final.

Não perguntas nada ao utilizador.
Não pedes para abrir o browser.
Não pedes verificações manuais.
Não apresentas resultados parciais.
Só apresentas o relatório quando TODAS as páginas estiverem analisadas
e o critério «100% funcional» (ver §VEREDICTO) estiver verificado.
```

---

## §0 — REGRAS DE OURO (não negociáveis)

```
R1.  Correcções CIRÚRGICAS: nunca reescrever módulos inteiros; tocar só nas
     linhas necessárias; preservar comentários/ideologia existente (F28, F32,
     F45, F47, v37...).
R2.  NUNCA cometer no repositório: senhas reais das contas (123456789 etc.),
     chaves Supabase/Groq/Gemini, PAT do GitHub, tokens Vercel. Segredos vivem
     apenas em `.env` (gitignored) e em scripts FORA do repo
     (/home/user/e2e_contas_reais.mjs).
R3.  Não criar funcionalidades que não existam no código («nao cria nada que
     nao esteja no codigo»). Não repor versões REVERTIDAS pelo dono
     (v37.8, v37.19, v37.21).
R4.  Ideologia de segurança: qualquer falha TÉCNICA da IA/PVI ⇒ REVISAO ⇒
     cadastro PENDENTE de homologação manual (NUNCA aprovar por erro técnico,
     NUNCA bloquear o cidadão com «corrija e repita» salvo divergência REAL
     formulário↔B.I.).
R5.  Anti-fuga entre contas: uma sessão NUNCA mostra dados/fotos de outro
     utilizador; foto vazia ⇒ fundo azul com a inicial do nome.
R6.  Cada correcção ⇒ `tsc --noEmit` 0 erros + varrimentos verdes + commit +
     push (Vercel re-deploya sozinho) + entrada no RELATORIO_TESTES_COMPLETO.md.
R7.  Memória do sandbox é curta: parar o dev server ANTES de `tsc`/`npm run
     build`; usar NODE_OPTIONS="--max-old-space-size=2048" no tsc; se faltar
     node_modules/playwright ⇒ `npm ci` + `npx playwright install chromium` +
     `npx playwright install-deps chromium`.
```

---

## §1 — CONTEXTO E CREDENCIAIS (ler do ambiente, nunca do repo)

```
REPOSITÓRIO : ~/Plataforma-Correio-Digital-Angola-Oficial-2026 (branch main)
DEPLOY      : Vercel (push ⇒ rebuild automático); alias de produção visível na
              API Vercel com o token fornecido na sessão.
NUVEM       : Supabase — URL + anon + service_role em `.env`
              (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY). Tabelas chave:
              profiles, messages, sondagens, solicitacoes_registo,
              digital_protocols, user_requests, documents, contacts,
              notifications, video_sessions, audit_logs.
IA          : endpoints PVI/assistente no server.ts (modelos Groq/Gemini via
              chaves do .env).

CONTAS DE TESTE (as reais vivem em /home/user/e2e_contas_reais.mjs — NÃO copiar
senhas para ficheiros do repo):
  • Cidadão demo ......... 009874562LA041 / 123456        (foto canónica)
  • Instituição demo ..... AGT-9921-SR   / 000000
  • Admin demo ........... ADM-8812-OP   / GALHARDO
  • Cidadão real ......... 002399714LA030 (senha só no script externo)
  • Instituição real ..... INAPEM-LLMM-01 (senha só no script externo)
  • Admin real ........... ADMIN-0001     (senha só no script externo)
  • Cidadãos reais p/ audiência: perfis em `profiles` (ler da nuvem).

FERRAMENTAS PRONTAS:
  • scripts/e2e_paginas.mjs      → 51 verificações (demo, build produção)
  • /home/user/e2e_contas_reais.mjs → 41 verificações (contas reais)
  • BASE=http://127.0.0.1:4173 node <script> para apontar ao build local.
```

---

## §2 — PASSO 1: MAPEAMENTO AUTOMÁTICO (descobrir lendo o código)

```
EXECUTAR AGORA:
1.  Ler package.json, server.ts e src/App.tsx (router por hash #/... e o
    switch de páginas por `currentPage`).
2.  Extrair TODAS as páginas/âncoras por área (não assumir — descobrir):

    ÁREA PÚBLICA
      /                      Login (tabs Cidadão/Instituição/Admin,
                                 AUTO PREENCHER DEMONSTRAÇÃO, LOGIN FACIAL,
                                 REGISTAR, ESQUECI SENHA)
      #/registar             Registo Cidadão (RegisterStepper, 3 passos +
                                 popup de credenciais no fim)
      Registo Instituição    Adesão oficial (RegisterInstitutionPage)
      Registo Admin          Credencial Operacional (RegisterAdminAgentPage)
      Redefinir senha        ResetPasswordStepper
      Login facial           ecrã de captura/reconhecimento

    ÁREA CIDADÃO (nav + extras)
      home Painel · correspondencias Correio · contatos Contactos ·
      perfil Perfil · historico Ver Histórico · notificacoes Notificações ·
      pagamentos Pagamentos · (Documentos/Carteira via painel)

    ÁREA INSTITUIÇÃO
      home Painel · correspondencias Correio · gov-contatos Equipa ·
      inst-qrcode QR Code · inst-ai-assistant IA · perfil Perfil ·
      inst-pagamentos Pagamentos/Cobrança

    ÁREA ADMINISTRATIVA
      gov-dashboard Painel · gov-interoperabilidade Instituições ·
      gov-correspondencias Correspondências · gov-contatos Cidadãos ·
      gov-trabalhadores Equipa · gov-relatorio Relatórios · gov-ia IA ·
      gov-seguranca Auditoria · gov-perfil Perfil

3.  Extrair TODOS os modais/popups a exercer (abrir + fechar + acção):
      Registar Novo Membro da Equipa (Instituição E Admin) · Confirmar
      Respostas às Sondagens · Resposta Registada · Eliminar Cadastro ·
      Eliminar Instituição · Eliminar/Arquivar correspondência · popup
      «Registo Concluído» (credenciais) · popup «Aprovado» · detalhe de
      mensagem (ABRIR/ANALISAR/Responder à Sondagem) · editar perfil/foto.
4.  Criar a lista interna completa; NENHUMA página fica por testar.
```

---

## §3 — PASSO 2: TESTES POR PÁGINA (A–L, adaptados)

Para CADA página da lista:

```
A ESTRUTURA — ficheiro existe; export correcto; TSX válido; imports reais;
  rota/âncora definida; parâmetros dinâmicos tratados.
B COMPONENTES — existem, importados, props tipadas; sem null inesperado.
C DADOS/API — chamadas ao proxy do server.ts e/ou Supabase com filtros
  correctos; loading/erro/vazio tratados; SEM dados estáticos onde devem ser
  dinâmicos; SEM useEffect em loop; try/catch em promises;
  C15 CRÍTICO: a query NUNCA devolve dados de outro utilizador
  (verificar com duas contas reais distintas na mesma máquina).
D FORMULÁRIOS — required, validação pré-submit, mensagens claras, botão com
  loading, sucesso/erro visíveis, gravação REAL na nuvem (confirmar por REST
  com service role), type=password/email/tel, labels presentes, duplicados
  rejeitados (B.I./e-mail/senha única).
E BOTÕES — todos com handler real; destrutivos com confirmação; loading e
  disabled durante processamento; cancelar fecha; sem sobreposições.
F NAVEGAÇÃO — links internos válidos; Voltar funciona; sidebar/navbar correctas
  por papel; dropdowns abrem/fecham; externos com rel="noopener noreferrer".
G MODAIS — abrem no trigger; fecham no X/fora/concluído; conteúdo completo;
  formulário interno funcional; scroll de fundo bloqueado.
H ESTADOS — loading termina; erro visível; vazio informativo; nunca página em
  branco; refresh mantém estado; acesso directo por URL funciona.
I AUTH/PERMISSÕES — sem sessão ⇒ login; papel errado ⇒ bloqueio; dados só do
  titular (I4/I5 CRÍTICO: login novo ⇒ zero dados de outras contas; foto
  vazia ⇒ azul + inicial); acções proibidas bloqueadas NO SERVIDOR (escopos
  de server.ts), não só ocultadas.
J QUALIDADE — tsc por ficheiro 0 erros; sem `any` a esconder; sem imports/
  vars mortos; sem console.log esquecido; sem segredos no cliente; listeners
  com cleanup.
K RESPONSIVO — 375/768/1440 sem overflow horizontal; tabelas com scroll;
  modais e forms usáveis; toques ≥44px; sidebar colapsa.
L UX — propósito claro; labels claras; confirmação em irreversíveis; toasts
  visíveis; pesquisa em listas longas.
```

---

## §4 — PASSO 3: FLUXOS E2E OBRIGATÓRIOS (com contas reais)

```
1. Registo cidadão de ponta a ponta (passo1→2→3, VALIDAR COM IA E CONCLUIR):
   conclui com popup «Registo Concluído» (Nº de acesso + senha); falha técnica
   da PVI ⇒ PENDENTE (não bloqueia); divergência real ⇒ «corrija e repita».
   Depois: login da conta nova ⇒ caixa LIMPA + avatar azul/inicial.
   Limpar SEMPRE a nuvem após o teste (fila + Auth + storage).
2. Login dos 3 papéis (reais) ⇒ varredura da nav completa de cada área.
3. Instituição: criar membro da equipa ⇒ Nº Agente = CÓDIGO+índice
   (ex.: INAPEM-LLMM-02), senha+confirmação obrigatórias, membro entra com
   Código+Nº+senha (cloud). Remover credenciais de teste da nuvem no fim.
4. Sondagem: criar (segmentação por âmbito; nacional sem limitar; local sem
   exceder jurisdição) ⇒ difusão chega a TODOS os cidadãos (incl. «TODOS»),
   cidadão responde ⇒ popup Resposta Registada ⇒ admin vê respostas.
5. Correspondência: instituição envia ⇒ cidadão recebe (protocolo QR valida);
   cidadão envia ⇒ instituição recebe; eliminar difusão «TODOS» NÃO some para
   os outros cidadãos.
6. Admin: Painel com números conferidos contra a nuvem (COUNTs por REST);
   homologar/eliminar cadastro com confirmação; auditoria sem excepções JS.
7. Logout ⇒ login de OUTRA conta ⇒ zero resíduos da anterior (localStorage,
   avatar, e-mail, filiação).
```

---

## §5 — PASSO 4: CLASSIFICAÇÃO DE ERROS

```
🔴 CRÍTICO — página não renderiza; fuga de dados entre contas; gravação
   perdida; segurança; bloqueio de fluxo principal.
🟠 ALTO — botão sem função; form não submete; loader infinito; 404; modal
   preso; API falha sempre.
🟡 MÉDIO — estados loading/erro/vazio em falta; validação incompleta;
   chamada duplicada; dependências de useEffect erradas.
🟢 BAIXO — console.log; import morto; alinhamento; rel="noopener" em falta.
```

---

## §6 — PASSO 5: CICLO DE CORRECÇÃO (até 100% funcional)

```
Para cada erro (do 🔴 ao 🟢):
  1. Corrigir cirúrgico (R1).
  2. tsc --noEmit = 0 (dev server PARADO; NODE_OPTIONS heap 2048).
  3. Re-testar a página + fluxo afectado (Playwright).
  4. npm run build = 0; varrimentos 51/0/0 e 41/0/0 (BASE build produção).
  5. Commit + push (PAT da sessão; NUNCA gravar o token) + RELATORIO.
  6. Repor dev server :3000 para pré-visualização do dono.
Repetir até zero 🔴//🟡 e varrimentos verdes.
```

---

## §7 — RELATÓRIO FINAL (apresentar só no fim, formato do dono)

```
RESUMO EXECUTIVO (páginas encontradas/analisadas/sem erro/com erro)
MAPA COMPLETO DE PÁGINAS por área com ✅/⚠️/
TABELA GERAL (Estrutura|Dados|Forms|Botões|Auth|Código|UX|Responsivo)
DETALHE POR PÁGINA (teste, descrição, ficheiro:linha, causa, impacto, correcção)
LISTA CONSOLIDADA ordenada por severidade
PÁGINAS SEM ERROS
PLANO DE CORRECÇÃO POR PRIORIDADE (executado, com commits)
VEREDICTO FINAL:
   Páginas testadas X · sem erros X (XX%)
   🔴 X · 🟠 X · 🟡 X ·  X
   Varrimentos: 51/0/0 e 41/0/0 · tsc 0 · build 0 · Vercel deploy OK
   ESTADO GERAL: [CRÍTICO|INSTÁVEL|FUNCIONAL|ESTÁVEL]
   RECOMENDAÇÃO: [BLOQUEAR|CORRIGIR ANTES|PODE AVANÇAR]
   «100% funcional» = 0 erros 🔴//🟡 por corrigir + varrimentos verdes
   + fluxos do §4 todos ✔ + nuvem limpa de dados de teste.
```

---

## REGRAS DE EXECUÇÃO AUTÓNOMA

```
✅ Ler todos os ficheiros de páginas; testar cada uma (A–L) + fluxos §4;
   classificar; corrigir; re-testar; reportar uma única vez no final.
❌ Pedir browser/verificações/confirmações ao utilizador; saltar páginas;
   assumir correcto sem testar; resultados parciais; inventar ou ignorar erros;
   gravar segredos no repo; repor versões revertidas; quebrar o que funciona.
```

## EXECUTA AGORA

```
INÍCIO → §2 mapeia → §3/§4 testa → §5 classifica → §6 corrige até verde
       → §7 relatório final completo → FIM
```
