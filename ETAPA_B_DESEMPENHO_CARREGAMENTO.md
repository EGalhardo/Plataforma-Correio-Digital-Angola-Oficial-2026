# Etapa — Desempenho de carregamento (2026-08-05)

Aprovada pela mensagem do dono "Passa para as próximas etapas" (dívida
técnica do backlog: `bundle 1,9 MB code-split/React.lazy`).

## Problema

Todo o código da aplicação vinha num único ficheiro inicial de
**~1.887 KB** (`index-DNz5sutE.js` medido em produção) — incluía painéis
pesados (GovContacts 139 KB minificado, MessageDetail 152 KB, ProfileContent
113 KB, Gov*… ) que a maioria dos cidadãos **nunca abre** numa sessão.
Em rede móvel lenta, o primeiro desenho da página era castigado.

## Solução (sem mudar nenhuma funcionalidade)

- `src/App.tsx`: 12 painéis pesados passaram de import estático para
  **`React.lazy` + `Suspense`** (`PainelSuspense` com indicador a rodar como
  fallback instantâneo): MessageDetail, ProfileContent, GovDashboard,
  GovContactsContent (3 pontos de uso), GovInteroperabilidadeContent,
  GovCorrespondenciasContent, GovRelatorioContent, GovIaContent,
  InstQrCodeContent, InstAiAssistantContent, SolicitarDocumentoContent,
  RegisterStepper.
- Uso/JSX/Props inalterados (bateria 77/77 garante).

## Medidas (build após a mudança, `vite build`)

| | Antes | Depois |
|---|---|---|
| Ficheiro inicial (entry) | ~1.887 KB | **~925 KB** (-51%) |
| Painéis pesados | todos no entry | 12 chunks sob procura (ex.: `MessageDetail-*.js` 152 KB, `GovContactsContent-*.js` 139 KB, `ProfileContent-*.js` 113 KB)|
| Chunks só de gráficos/modelos | no entry | `charts` 268 KB e `graph_model` 598 KB deixaram de ser referenciados no index.html inicial |

O HTML inicial pré-carrega apenas: entry + vendor (React & libs) + motion +
icons + supabase. Os painéis descem apenas quando o utilizador os abre.

## Verificação

- `tsc --noEmit` limpo; bateria **77/77 PASS** (os asserts de integração em
  JSX mantêm-se válidos — o JSX/props não mudou);
- Em produção (pós-deploy `index-` novo): página 200, chunks sob procura
  existem (verificado por URL), comportamento idêntico.

## Não mexido / backlog futuro

- `MailContent` e `DocumentsContent` (ecrãs centrais) ficaram estáticos de
  propósito — carregamento imediato após o login;
- 168 ocorrências de `:any` (tipagem gradual) — dívida por agendar;
- possível nova ronda de divisão fina dentro dos próprios painéis, se se
  justificar.
