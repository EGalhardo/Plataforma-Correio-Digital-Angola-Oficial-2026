# Ocorrências Locais

Módulo isolado, sem alterações ao envio de correspondência, pagamentos ou IA.

## Entrada

- Cidadão: Painel → **Ocorrências Locais** (`/#/ocorrencias`).
- Instituição: Painel → **Ocorrências recebidas** (`/institucional/#/ocorrencias`).
- As notificações deste módulo estão dentro destas páginas, não no centro de notificações legado.

O cidadão indica manualmente a localização e escolhe uma instituição habilitada. Não se solicita GPS. Há revisão e confirmação antes do envio, até cinco fotografias opcionais, histórico, esclarecimentos, confirmação de resolução e pedido de reabertura.

A instituição pode pesquisar/filtrar, confirmar recepção, analisar, atribuir responsável/equipa por nome, pedir esclarecimentos, justificar mudanças de estado, resolver, encerrar ou encaminhar para outra instituição habilitada. Listas com mais de dez registos usam rolagem interna; a paginação permite obter os restantes registos sem os descartar.

**Submetida não significa Recebida.** A recepção exige confirmação da instituição. Este canal não é um serviço de emergência.

## Instalação / operação

1. Aplicar `sql/ocorrencias/001_ocorrencias_locais.sql` no SQL Editor do projecto Supabase. A migração é aditiva e reexecutável; deve mostrar cinco tabelas com RLS activo. Foi aplicada pelo proprietário antes da publicação do módulo.
2. O servidor requer `SUPABASE_URL` (ou `VITE_SUPABASE_URL`) e `SUPABASE_SERVICE_ROLE_KEY` (ou `SUPABASE_SECRET_KEY`). Nunca colocar a chave privilegiada em variáveis `VITE_*` ou no cliente. Não há fallback para chave anónima.
3. O cliente usa a sessão Supabase existente. Sessões locais/de demonstração não podem submeter ocorrências.
4. Express e Vercel encaminham `POST /api/ocorrencias` para o mesmo handler em `server/ocorrencias.ts`.

Não são necessárias chaves de GPS, pagamentos, IA ou e-mail. As notificações são persistidas na aplicação, não enviadas por e-mail/SMS. O contador de não lidas é actualizado a cada 30 segundos enquanto esta página está visível; listas e detalhes têm actualização explícita.

## Segurança e consistência

- O servidor verifica o token junto do Supabase Auth; deriva a identidade do e-mail sintético confirmado, do perfil e do registo institucional. Não confia em `user_metadata` editável nem em identidades recebidas no pedido.
- O cidadão só consulta as suas ocorrências. A instituição só consulta processos cujo destinatário actual é o seu código. Os membros são validados no perfil da equipa; a conta responsável `-01` é validada contra o registo aprovado.
- Tabelas/RPCs não acessíveis directamente a `anon` ou `authenticated`; o backend aplica autorização e os RPCs voltam a verificar o actor/transição.
- Os RPCs transaccionais preservam o histórico e geram notificações com a alteração. Pedidos UUID fornecem idempotência; versões e bloqueios de linha impedem sobreposição silenciosa de tratamentos.
- Encaminhar muda o destinatário actual, limpa a atribuição e mantém fotografias/histórico. A instituição anterior perde acesso ao detalhe. As suas notificações históricas permanecem; abrir uma ocorrência já encaminhada informa que deixou de estar disponível.
- A leitura de notificações é individual por conta, mesmo dentro de uma instituição.
- Fotografias são verificadas, redimensionadas e recodificadas em JPEG no servidor, removendo metadados EXIF. Storage privado; ligações de detalhe válidas por cinco minutos e renováveis por **Actualizar detalhes**.
- Fotografias não submetidas deixam de ser elegíveis após 24 horas. A limpeza dos temporários expirados é oportunista, no próximo upload da mesma conta; não existe tarefa agendada de eliminação global. Rascunhos textuais ficam apenas em memória no navegador.
- Em falhas de submissão, a revisão e o UUID são preservados para repetir sem duplicação. Após um conflito de versão, fechar o diálogo e actualizar o detalhe antes de tratar novamente. Se a resposta de um encaminhamento se perder, consultar a lista: a perda de acesso pode significar que o encaminhamento já concluiu.

## API

Todos os pedidos: JSON com `acao` e `Authorization: Bearer <sessão>`; respostas `{ok:true,...}` ou `{ok:false,erro}` e `Cache-Control: no-store`.

| Acção | Parâmetros / resultado |
| --- | --- |
| `inicio` | Actor e directório de instituições habilitadas |
| `listar` | `procura`, `estado`, `categoria`, `localidade`, `offset`; lista/total/mais (50 por página) |
| `detalhe` | `id`; ocorrência, fotografias e últimos 100 eventos |
| `historico` | `id`, `offset`; eventos mais antigos |
| `fotografia` | `base64` JPEG/PNG/WebP até 2 MB, `nome`; anexo temporário próprio |
| `remover_fotografia` | `id`; só remove anexo próprio ainda não vinculado |
| `criar` | `dados`, `fotos` UUID[], `pedido` UUID, `confirmado:true` |
| `actuar` | `id`, `versao`, `operacao`, `dados`, `pedido` UUID |
| `notificacoes` | `naoLidas`, `offset`; notificações da conta/instituição com leitura individual |
| `ler_notificacao` | `id`; marcação individual |

## Verificação

Testes sem contas reais:

```sh
npx tsx tests/ocorrencias/model-auth.test.ts
npm install --prefix .local/ocorrencias/sql-test --no-save @electric-sql/pglite
node tests/ocorrencias/sql.test.mjs
npm run lint
npm run build
```

- 39 verificações do modelo e da autorização (incluindo metadados falsificados, membros removidos, contas não confirmadas e instituição não habilitada).
- 26 verificações SQL em PostgreSQL embebido: migração/reexecução, RLS, transições, encaminhamento entre duas instituições, preservação de fotografias, nova notificação, idempotência e versão.
- Testes adicionais autorizados com quatro contas existentes: API, privacidade, fotografias reais, leitura individual, revisão/submissão, tratamento, esclarecimento, reabertura, confirmação de resolução, falha de rede simulada, pesquisa, paginação e apresentação desktop/mobile.
- Regressão dos botões de criação de inquéritos/denúncias e do encaminhamento para o formulário legado de correspondência, sem enviar mensagens.

Os testes reais usam títulos temporários identificados e removem apenas os seus próprios registos e fotografias. As credenciais, sessões e scripts privados não são versionados. O encaminhamento entre instituições diferentes é testado transaccionalmente no ambiente SQL isolado; as contas institucionais fornecidas pertencem à mesma instituição, pelo que não se enviam testes a instituições de terceiros.
