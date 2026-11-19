# scripts/arquivo — scripts órfãos

Scripts das rondas de teste antigas que **nenhum** comando `npm run`, script ou documento
referencia. Foram movidos para aqui em 2026-11-19 (auditoria `AUDITORIA-FICHEIROS-2026-11-19.md`)
em vez de apagados, para não se perder o histórico.

- Nada os invoca: não estão no `package.json` nem são mencionados em `docs/` ou nos relatórios.
- As suites de prova que sustentam entregas **não** estão aqui — continuam em `scripts/`.
- Se algum voltar a ser útil, basta mover de volta para `scripts/`.

Nota de segurança (por resolver): alguns destes ficheiros contêm credenciais de teste em claro
(`123456789`, `987654321`, `TesteUx2026!`, `SenhaColab1`, `SenhaAgente1`) e BIs reais. Ver a
auditoria de 2026-11-16, ponto 4.
