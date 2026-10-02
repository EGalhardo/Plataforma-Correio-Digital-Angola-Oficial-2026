# Relatório Técnico de Homologação: Paridade e Preservação de Foto de Perfil e Notificações no Login Facial (Instituição e Administração Central)

**Data de Emissão:** 02 de Outubro de 2026  
**Ambiente:** Plataforma Oficial do Correio Digital de Angola (CDA) — Governo da República de Angola  
**Status:** ✅ Homologado & Aprovado (0 Erros / 100% dos Testes E2E Concluídos com Sucesso)

---

## 1. Resumo Executivo

O presente relatório atesta a implementação, correção de causa raiz e homologação dos fluxos de autenticação biométrica facial nas áreas **Institucional** (`/institucional`) e de **Administração Central** (`/admin`), garantindo paridade funcional estrita em relação ao modo **Cidadão** e à autenticação normal via credenciais.

Anteriormente identificou-se que o reconhecimento facial no dispositivo comutava indevidamente o portal ou herdava notificações e avatar da área de Cidadão quando o template biométrico correspondia a uma assinatura gravada localmente. 

A arquitetura foi corrigida de forma cirúrgica para que o login facial atue estritamente como mecanismo de validação biométrica de acesso dentro da área ativa, preservando a identidade, fotos de perfil dedicadas (locais, persistidas ou avatares neutros oficiais) e o isolamento completo de notificações por portal e proprietário de sessão.

---

## 2. Correções Estruturais Implementadas

### 2.1 Preservação de Portal e Identidade no Login Facial (`handleDemoFaceCapture`)
- **Fix:** Eliminada a comutação forçada de `appMode` em `handleDemoFaceCapture`. A sessão autenticada permanece estritamente no portal onde o utilizador solicitou a entrada (`/institucional`, `/admin` ou `/`).
- **Resolução de Identidade:** O identificador ativo (`targetIdent`) prioriza o código explicitamente introduzido, a credencial do modo ativo (`DEMO_CREDENTIALS[appMode].identifier`) ou o identificador reconhecido se pertencer à mesma área.

### 2.2 Hidratação de Sessão e Restauração de Sessão em Nuvem
- **Admin:** No login facial da Administração Central, as credenciais locais do agente (`getAdminAgentCred`) realizam `cloudSignIn` transparente para restabelecer a sessão do Supabase Auth e resgatar o avatar da nuvem (`user_metadata.avatar_url` e tabela `profiles`), garantindo que o avatar oficial seja exibido imediatamente.
- **Instituição:** Resolução integral via `resolveInstitutionFaceLogin`, aplicando dados persistidos e foto local/nuvem sem contaminação do cidadão demo.
- **Isolamento de Avatares:** `makeInstNeutralAvatar` e `lerAvatarLocal` mantêm os avatares institucionais e administrativos protegidos contra placeholders de terceiros.

### 2.3 Isolamento Estrito do Centro de Notificações (`currentNotifications`)
- O seletor reativo de notificações `currentNotifications` agora filtra rigorosamente os eventos de demonstração por portal:
  - **Cidadão:** Apenas notificações próprias ou associadas ao perfil de cidadão.
  - **Instituição:** Apenas notificações da conta institucional autenticada.
  - **Admin:** Apenas notificações do canal administrativo central.

---

## 3. Matriz de Resultados dos Testes E2E

### Suíte 1: Paridade no Login Facial — Instituição e Administração Central (`scripts/e2e_login_facial_paridade_instituicao_e_admin.mjs`)
| # | Asserção / Verificação | Resultado | Detalhes |
|---|------------------------|:---------:|----------|
| 1.1 | Registo facial institucional concluído | ✅ PASS | Captura multi-frame 3/3 |
| 1.2 | Entrada no Portal Institucional via Login Facial | ✅ PASS | Acesso concedido em `/institucional` |
| 1.3 | Paridade de Saudação/Identidade no Header Institucional | ✅ PASS | `"Olá, Edlasio"` preservado |
| 1.4 | Dados do Perfil Institucional preservados (NIF / Telefone) | ✅ PASS | NIF 5401329188 / AGT mantidos |
| 2.1 | Registo facial de Administrador concluído | ✅ PASS | Captura multi-frame 3/3 |
| 2.2 | Entrada na Administração Central via Login Facial | ✅ PASS | Acesso concedido em `/admin` |
| 2.3 | Paridade de Saudação/Identidade no Header Admin | ✅ PASS | `"Olá, Edlásio"` preservado |
| 2.4 | Dados do Perfil Administrativo preservados | ✅ PASS | Administrador Geral / ADMIN-0001 mantidos |

### Suíte 2: Isolamento e Paridade de Notificações e Fotos nas 3 Áreas (`scripts/e2e_login_facial_isolamento_notificacoes_e_fotos.mjs`)
| # | Asserção / Verificação | Resultado | Detalhes |
|---|------------------------|:---------:|----------|
| 1.1 | Face de Cidadão registada com sucesso | ✅ PASS | Registado via página Perfil do Cidadão |
| 1.2 | Paridade de Avatar no Cidadão (Normal vs Facial) | ✅ PASS | Foto de perfil canónica preservada |
| 2.1 | Face Institucional registada com sucesso | ✅ PASS | Registado via página Perfil Institucional |
| 2.2 | Paridade de Avatar na Instituição (Normal vs Facial) | ✅ PASS | Avatar institucional AGT SVG preservado |
| 2.3 | Instituição não herda avatar de Cidadão | ✅ PASS | Isolamento confirmado |
| 3.1 | Face de Administrador registada com sucesso | ✅ PASS | Registado via página Perfil Admin |
| 3.2 | Paridade de Avatar no Admin (Normal vs Facial) | ✅ PASS | Foto oficial do Admin ADMIN-0001 preservada |
| 3.3 | Admin não herda avatar de Cidadão | ✅ PASS | Isolamento confirmado |

### Suíte 3: Validação do Cabeçalho e Indicador Verde do Gov Dashboard (`scripts/e2e_gov_dashboard_indicador_verde.mjs`)
| # | Asserção / Verificação | Resultado | Detalhes |
|---|------------------------|:---------:|----------|
| 01 | Login de Administrador com Sucesso | ✅ PASS | Autenticado |
| 02 | Cabeçalho do Painel Carregado (`#gov-header`) | ✅ PASS | Elemento presente e estilizado |
| 03 | Título Oficial Correto | ✅ PASS | "Painel Nacional de Operações" |
| 04 | Subtítulo Oficial Correto | ✅ PASS | "Correio Digital Angola • Administração Central" |
| 05 | Indicador possui classe de cor verde (`bg-emerald-500`) | ✅ PASS | Verde oficial activo |
| 06 | Indicador NÃO possui classe de cor vermelha (`bg-red-*`) | ✅ PASS | Sem classes residuais |
| 07 | Indicador possui animação de pulsação activa (`animate-pulse`) | ✅ PASS | Animação em tempo real |
| 08 | Badge de Monitoramento Central Activo presente | ✅ PASS | Renderizado |
| 09 | ID Digital do Gestor renderizado | ✅ PASS | Cartão do Gestor activo |
| 10 | Métricas do Painel renderizadas | ✅ PASS | 4 KPIs em tempo real |
| 11 | Auditoria de Vídeo-atendimento presente | ✅ PASS | Tabela e filtros operacionais |

---

## 4. Conformidade e Qualidade de Código
- **TypeScript & Linting:** 0 erros (`npm run lint` / `tsc --noEmit`).
- **Segurança e Privacidade:** Sem fuga de dados biométricos, credenciais ou notificações entre sessões.
- **Resiliência Multi-dispositivo:** Fallback Gracioso de persistência local, Supabase Auth e isolamento por `ownerId`.
