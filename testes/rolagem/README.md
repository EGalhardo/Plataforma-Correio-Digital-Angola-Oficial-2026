# Limite visual de dez registos

Executar `npx vite --host 0.0.0.0 --port 3010` e, noutro terminal, `node testes/rolagem/browser.mjs`.

76 verificações aprovadas em Chromium (1440 e 390 px): zero, nove, dez, onze e vinte e cinco registos; listas de inquéritos/denúncias; cartões de alturas variáveis; expansão; rolagem por teclado; acesso ao último item; reposição da altura natural ao reduzir para dez. Dados exclusivamente fictícios em memória e pedidos externos bloqueados.

Também foram executadas 42 verificações de navegação com as quatro contas reais autorizadas: listas e pesquisa, recarregamento, layout mobile e presença dos contentores de Agenda e Histórico. Não foram criados atendimentos, denúncias ou inquéritos reais para forçar o limiar.

O componente `ListaRolavel` conserva todos os itens no DOM, mede uma janela de até dez registos e recalcula-a quando a largura/conteúdo muda. Apenas com mais de dez itens limita a altura (também a 70% da altura do ecrã) e permite rolagem vertical com teclado, rato ou toque. O popup de resultados IA permanece fora do contentor de rolagem.

Ocorrências Locais/recebidas ainda não possui página implementada no projecto; não foi criado um módulo novo nesta alteração.
