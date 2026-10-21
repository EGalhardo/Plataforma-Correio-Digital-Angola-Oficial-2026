# Regressão — Correio e Contactos

Teste isolado dos componentes originais, sem contas reais, escrita no Supabase ou envio de mensagens.

## Executar

1. `npm ci`
2. `npx playwright install --with-deps chromium`
3. `npx vite --host 0.0.0.0 --port 3010`
4. Noutro terminal: `node testes/pesquisa/browser.mjs`

O harness usa apenas dados fictícios em memória. Pedidos do navegador a serviços externos são bloqueados pelo teste. Não integra o build de produção.

## Resultado desta execução

28 verificações aprovadas em Chromium: 14 em desktop (1440 px) e 14 em mobile (390 px). Nenhum erro JavaScript.

Cobertura: pesquisa pessoal (acentos, espaços, email, vazio de resultados), separação pessoal/institucional, pesquisa no directório, instituições adicionadas, formulário contextual, validação de telefone, adição institucional com telefone fixo, retorno ao formulário pessoal, pesquisa do Correio por assunto/corpo e reposição da lista ao limpar a procura.

`npm run lint`: aprovado.
`npm run build`: aprovado com `NODE_OPTIONS=--max-old-space-size=1150`, após a primeira tentativa ser terminada por falta de memória. Avisos de chunks grandes mantidos, sem alterações fora do âmbito.

## Limites

Actualização de validação: foram executados testes com contas reais autorizadas (dois cidadãos e duas instituições). Foram confirmados a gravação de ambos os tipos de contacto no Supabase, a classificação institucional e a leitura após recarregar. Os dois registos de teste foram eliminados. Foram verificadas as pesquisas do Correio nos quatro separadores e com correspondências reais, sem abrir mensagens nem alterar o estado de leitura. Não foi necessário usar a conta de administrador. A criação institucional adiciona um contacto à agenda do utilizador, através da persistência de contactos já existente; não regista nem homologa uma entidade na plataforma. O discriminador institucional usa `relation = 'Instituição'`, já persistido pela aplicação, sem migração de schema.

## Repetir a validação real (requer autorização)

`CDA_REAL_TEST=1 CDA_TEST_BI=... CDA_TEST_PASSWORD=... node testes/pesquisa/real.mjs`

Usa as variáveis Supabase do `.env` local para verificar a persistência e remover **apenas** os registos identificados pelo teste. O fluxo cria dois contactos temporários e limpa-os num bloco `finally`. Não guardar credenciais no script, no relatório ou no Git. `CDA_TEST_BASE` permite seleccionar a origem da aplicação (por omissão, local).
