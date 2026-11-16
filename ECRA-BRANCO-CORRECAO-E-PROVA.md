# Ecrã branco ao mudar de página — causa, correcção e prova

**Data:** 16 de Novembro de 2026 · **Estado:** corrigido, publicado e provado em produção
**Produção:** https://correio-digital-angola-oficial.vercel.app · commits `96478bb` → `064b54f`

---

## 1. O sintoma

«Às vezes, ao mudar de página, em vez da página aparece um ecrã branco.»

Reproduzido em produção com Playwright: depois do login, clicando em **Perfil**,
**Contactos** ou **Correio**, o `#root` ficava **sem filhos** (`raiz_filhos: 0`),
o texto do ecrã era vazio (`len: 0`) e **não havia qualquer erro de JavaScript**
na consola. Nada explicava ao utilizador o que se tinha passado.

## 2. A causa

Os painéis da aplicação são carregados **a pedido** (code-splitting): o ficheiro
`.js` de cada página só é pedido quando se abre essa página. Quando esse pedido
falha, o React lança o erro, **não havia nenhuma fronteira de erro a apanhá-lo**
e a árvore inteira era desmontada → `#root` vazio → ecrã branco.

O pedido pode falhar por motivos banais e do dia-a-dia:

| Motivo | Quando acontece |
|---|---|
| Rede instável / Wi-Fi fraco | em qualquer sítio, sobretudo em móvel |
| Deploy novo a meio da sessão | o deploy troca os nomes dos ficheiros; a página aberta pede um nome que já não existe |
| Cache/CDN antigo | o ficheiro em cache aponta para um ficheiro que já foi substituído |
| Separador deixado aberto durante horas | sessão longa, muitos deploys pelo meio |

Havia ainda **duas falhas de fundo** no `ErrorBoundary`:

1. **Não era uma fronteira de erro do React** — só ouvia eventos globais de
   `window`, por isso **erros de render nunca eram apanhados**.
2. **Desmontava a aplicação inteira por qualquer promessa rejeitada** — um
   `fetch` falhado num canto qualquer da aplicação atirava o utilizador para o
   ecrã «Algo correu mal», perdendo a página onde estava.

## 3. A correcção

**Novo `src/components/ui/FronteiraDePagina.tsx`** — fronteira de erro do React
(`getDerivedStateFromError` + `componentDidCatch`) que envolve cada painel:

- **reconhece a falha de carregamento** (texto do erro: *«Failed to fetch
  dynamically imported module»* e equivalentes em português);
- **recarrega automaticamente uma única vez**, dentro de uma janela de 30
  segundos, para o browser pedir os ficheiros actuais;
- **impede a tempestade de recargas**: a primeira fronteira marca a tentativa e
  todas as outras desistem. *(Na primeira versão cada fronteira recarregava por
  sua conta: uma página com oito painéis disparava oito recargas seguidas e o
  browser ficava sem página nenhuma — exactamente o ecrã branco que se queria
  eliminar. Detalhe importante, corrigido e provado.)*
- se o problema persistir, mostra um **cartão de recuperação** com o nome da
  área, **«Tentar novamente»**, **«Voltar ao painel»** e o detalhe técnico
  recolhido — em vez de uma página em branco.

**`src/App.tsx`** — `lazyPainel(factory, area)` e `PainelSuspense({children, area})`
passam a envolver **todos** os painéis na fronteira (antes só havia um spinner).

**`src/components/ui/ErrorBoundary.tsx`** — reforçado: passou a delegar os erros
de render na fronteira de página e **deixou de desmontar a aplicação** por
promessas rejeitadas (regista e mantém o utilizador onde está).

## 4. A prova (`scripts/test_paginas_brancas_playwright.cjs`)

Contra a produção real, com as três contas reais. **Aprovado em 200 s.**

### A. Navegação normal — 37 navegações, 0 brancas

Todas as entradas de menu das três contas, incluindo os módulos que só aparecem
no painel (Vídeo-atendimento, Inquéritos, Comunicados, Ocorrências locais,
Denúncia, Livro de Reclamações, INAPEM, SME, AGT, ENDE, Emissão documental).

### B. Falha passageira (rede instável / deploy a meio) — recupera sozinha

| | Resultado |
|---|---|
| Ficheiros bloqueados | 1 |
| Recargas automáticas | **1** (sem ciclo) |
| Ecrã final | página **Perfil** normal, 164 palavras |

### C. Falha persistente (ficheiro que já não vem) — cartão de recuperação

| Página | `#root` | Recargas | Cartão |
|---|---|---|---|
| Correio | com conteúdo | 1 | **sim** |
| Contactos | com conteúdo | 1 | **sim** |
| Perfil | com conteúdo | 1 | **sim** |

**Nenhum dos cenários produz ecrã branco.** Antes da correcção, B e C davam
`len: 0`, `raiz_filhos: 0`.

### Não-regressão

`scripts/test_interop_contas_reais_playwright.cjs` — **aprovado**, `erros_js: []`:
aviso ao remetente nos três canais (ocorrência, denúncia, reclamação),
envio/comprovativo, contadores e isolamento entre cidadãos continuam a funcionar.

## 5. Como repetir os testes

```bash
node scripts/test_paginas_brancas_playwright.cjs            # A + B + C (2 ciclos)
node scripts/test_paginas_brancas_playwright.cjs --ciclos=1 # mais rápido
node scripts/test_interop_contas_reais_playwright.cjs       # não-regressão funcional
```

As capturas de cada cenário ficam em `test-artifacts/branco-*.png`.

## 6. Nota sobre a base de dados

Os dados efémeros das provas são sempre criados com o selo próprio e removidos
por `scripts/limpar_provas_interop.cjs`. No fecho desta intervenção:
`residuo: 0`, mensagens `41`, ocorrências `[186, 212]`.

Os 7 registos recentes que restam na base (entre 18:36 e 19:11 UTC de 16/11) são
**dados de sessões de teste manuais anteriores** — por exemplo «Denuncia teste
AGT», «Denuncia 12345», «Video-atendimento agendado: teste 1234». Não têm marca
de prova, não foram criados por estes ensaios e **não foram apagados**: a remoção
de dados sem marca exige autorização explícita do dono. Ficam listados para
decisão.
