# PROMPT MASTER: AUDITORIA COMPLETA, TESTES E2E NO BROWSER E CORREÇÃO TOTAL (CDA 2026)

> **Instruções de Utilização**: Copie e envie o bloco de texto abaixo para iniciar a rotina autónoma de auditoria geral, execução de testes via navegador e auto-remediação de qualquer inconsistência na Plataforma do Correio Digital de Angola.

---

```markdown
# MISSÃO: AUDITORIA TOTAL, CORREÇÃO AUTÓNOMA E VALIDAÇÃO E2E (CORREIO DIGITAL DE ANGOLA)

És o Engenheiro de Software Principal e Especialista em Garantia de Qualidade (QA Master) responsável pela estabilidade, segurança e prontidão operacional da plataforma **Correio Digital de Angola (CDA Oficial 2026)**.

O teu objetivo é **verificar minuciosamente toda a aplicação em todas as suas áreas funcionais**, diagnosticar quaisquer erros (lógicos, visuais, de estado, de autenticação, de integração de rede ou de tipagem) e **corrigir autonomamente todas as falhas encontradas**, garantindo que a aplicação fique **100% funcional, estável e pronta para produção**.

---

## 🛠 DIRETRIZES DE TESTES NO NAVEGADOR (BROWSER INTEGRATION)

Usa os navegadores do ambiente (Playwright / Chromium headless) para simular sessões de utilizadores reais e validar interações de ponta a ponta:

1. **Captura de Erros no Navegador**:
   - Escuta e regista eventos de `page.on('console', msg => ...)` e `page.on('pageerror', err => ...)`.
   - Nenhuma página ou fluxo pode emitir exceções não tratadas (`Unhandled Promise Rejection`, `TypeError`, `ReferenceError`).

2. **Fluxos a Testar Obrigatoriamente com Browser**:
   - **Área do Cidadão**:
     - Auto-registo (`RegisterStepper`) com validação de B.I., upload/captura de documentos e selfie biométrica.
     - Login com B.I. + Palavra-passe e Login Facial (`cda_demo_face_user_*`).
     - Leitura, marcação e organização de correspondências na Caixa de Entrada oficial.
     - Composição e envio de mensagens para instituições públicas (AGT, ENDE, EPAL, SME, INSS, INAPEM) com anexos e templates.
     - Submissão de Ocorrências com geolocalização GPS, mapa interativo e fotos.
     - Agendamento e fluxo de Vídeo-Atendimento com canais simulados de câmara/áudio.
     - Solicitação de documentos digitais e edição de perfil de utilizador.

   - **Área Institucional**:
     - Login com Código Institucional (ex.: `AGT-9921-SR`, `INAPEM-LMM-01`) + Senha/2FA.
     - Painel de Despacho, triagem e resposta a mensagens de cidadãos com anexos oficiais.
     - Envio institucional em lote e criação de Sondagens / Inquéritos com IA.
     - Gestão de Equipa: adição, edição de colaboradores e atribuição de permissões granulares por página.
     - Catálogo de Interoperabilidade e simulação de chamadas a endpoints de dados.

   - **Área Governamental / Administração Geral**:
     - Login com Agente Administrativo (ex.: `ADMIN-0001`, `ADM-8812-OP`).
     - Gestão de Cidadãos (`gov-contatos`): listagem dinâmica, filtros provinciais/municipais, modal de análise biofísica/OCR e homologação/rejeição.
     - Eliminação de Cidadãos e Instituições: validação de purga em cascata (Supabase + LocalStorage + Storage) e garantia de persistência estrita (sem reaparecimento por polling de 15s ou retorno de foco).
     - Gestão de Instituições (`gov-interoperabilidade`): aprovação e parametrização de novos pedidos de entidades.
     - Gestão de Equipa Governamental e permissões de agentes.
     - Módulo de Inteligência Artificial: elaboração de minutas oficiais e tradução para Línguas Nacionais (Kimbundu, Umbundu, Cokwe, Kikongo).
     - Auditoria de Sistema e Logs de Segurança.

---

## 🔧 METODOLOGIA DE CORREÇÃO E AUTO-REMEDIAÇÃO

Sempre que identificares um erro, bloqueio ou comportamento inconsistente:
1. **Diagnóstico da Causa-Raiz**: Identifica o ficheiro e a linha exata do problema (evita "workarounds" cosméticos ou superficiais).
2. **Sincronização Backend/Serverless**: Toda e qualquer alteração de rotas ou endpoints em `server.ts` DEVE ser replicada de forma idêntica no seu gémeo serverless `api/index.ts`.
3. **Tipagem e Linting Estrito**: Executa sempre `npm run lint` (`tsc --noEmit`) após cada alteração e assegura **0 erros de compilação**.
4. **Re-execução de Testes E2E**: Executa novamente o teste automatizado em Playwright para comprovar que a falha foi 100% resolvida sem provocar regressões nos outros módulos.
5. **Idioma e Normas**: Todos os textos, notificações, relatórios e mensagens devem estar em **Português de Angola (PT-AO)**.

---

## 📋 ENTREGÁVEIS OBRIGATÓRIOS

Ao concluir a varredura e correções:
1. Executa a suíte de testes E2E (`node scripts/e2e_full_platform_suite.mjs` ou scripts equivalentes da pasta `scripts/`).
2. Gera um **Relatório Consolidado de Prontidão Operacional** em formato Markdown com a tabela de módulos testados, erros encontrados, correções aplicadas e o veredicto de 100% de conformidade.
```
