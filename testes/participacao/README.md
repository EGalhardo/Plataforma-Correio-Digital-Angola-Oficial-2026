# Listas de Inquéritos e Denúncias

## Testes

- `npx tsx testes/participacao/filtros.test.ts`: 11 verificações de classificação por metadados de inquérito normal/IA (IDs simples e listas), denúncias pelo marcador oficial, pesquisa e exclusão da identidade do remetente da pesquisa institucional.
- `node testes/participacao/real.mjs`: requer `CDA_TEST_ACCOUNTS` com um array JSON de contas autorizadas, cada uma no formato `[institucional, caminho, acesso, senha]`. `CDA_TEST_BASE` selecciona a origem (por omissão, localhost:3000). Nunca guardar credenciais no repositório.

Validação local: 34 verificações aprovadas com dois cidadãos e duas instituições. Incluem acesso às listas, recarregamento, pesquisa sem resultados, adaptação mobile e remoção do atalho de vídeo do Correio, mantendo-o no Painel. Não cria denúncias/inquéritos nem submete respostas ou altera fases. Os testes de lista não abrem correspondências reais para não alterar o estado de leitura.

TypeScript e build aprovados. Em ambientes de memória limitada: `NODE_OPTIONS=--max-old-space-size=950 npm run build`.

## Comportamento

- Cidadão: mensagens recebidas com inquéritos normais/IA; denúncias enviadas.
- Instituição: lista existente de inquéritos criados/resultados; denúncias recebidas.
- Mensagens eliminadas/ocultadas não aparecem nas novas listas.
- A consulta reutiliza o detalhe existente, incluindo cronograma e permissões; o retorno regressa à lista de origem.
- A origem recebida/enviada é passada explicitamente ao abrir um item, preservando a regra de leitura do destinatário mesmo que o separador anterior do Correio fosse diferente.
- Sem tabelas novas, dados duplicados ou alteração do fluxo de envio.
