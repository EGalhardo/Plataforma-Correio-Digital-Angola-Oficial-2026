# Notificações clicáveis (Cidadão · Instituição · Administração) — causa e prova

**Pedido do dono:** «Quando o utilizador preenche o inquérito e envia para a instituição apenas
aparece uma notificação. Torne possível clicar nas notificações. Ao clicar deverá exibir a
respectiva página. Faz isso nas 3 áreas como cidadão, instituição e Admin.»

**Estado:** corrigido e provado com as contas reais, em produção.

---

## 1. Duas causas distintas

### 1.1 A notificação da instituição era DESCARTADA antes de chegar ao ecrã

A notificação de resposta a inquérito é gravada assim (confirmado por consulta directa à base):

| id    | target_bi | title                           | target_tab    |
|-------|-----------|---------------------------------|---------------|
| 3142  | AGT-LMM   | Resposta ao Inquérito / Sondagem | inqueritos    |

Mas a sessão da instituição usa a chave canónica **`AGT-LMM-01`**. O filtro em `App.tsx` era de
**igualdade exacta**:

```ts
base = notifications.filter(n => n.ownerId === sessionOwnerKey);   // AGT-LMM !== AGT-LMM-01
```

Resultado: a linha existia na nuvem, era lida, e era **descartada** no último passo. A instituição
via «apenas uma notificação» (na prática, nenhuma daquelas) e não havia nada para clicar.

**Correcção** (`src/utils/notificacaoDono.ts`): a propriedade da notificação passa a ser resolvida
pela **família de chaves do próprio titular** — `AGT-LMM-01` → `{AGT-LMM-01, AGT-LMM, AGT}` — a
mesma regra que a leitura da nuvem já usava. Não alarga nada a estranhos: todas as variantes
derivam da chave de quem está autenticado. Cidadão continua a receber, além da sua, as de `TODOS`.

### 1.2 O clique não abria a página respectiva

O clique limitava-se a abrir um popup e a mudar de separador. Passa a haver **um só ponto de
decisão** (`src/utils/resolverNotificacao.ts`), usado pelo menu da foto, pelo dropdown do sino e
pelo Centro de Notificações:

1. **Avisos de página própria** (`inqueritos`, `sondagens`, `notificacoes`, `ocorrencias`, …) →
   abre a **página** com o item em destaque. Era este o caso do pedido do dono.
2. **Ligados a uma correspondência** (vínculo `messageId` gravado, ou assunto citado no texto
   entre « ») → abre a **correspondência** exacta.
3. Sem correspondência → abre a página indicada.

O menu da foto (o «sino» visível nas três áreas) não tinha **nenhuma** lista de notificações —
só correspondências não lidas e registos por homologar. Passou a ter uma secção «Notificações»
clicável e o atalho «Ver Centro de Notificações».

---

## 2. O que o utilizador vê agora

- **Cidadão** — notificação «Nova Correspondência Oficial» → clique abre a correspondência.
- **Instituição** — notificação «Resposta ao Inquérito / Sondagem» → clique abre **Inquéritos**
  com a pasta da correspondência **aberta e realçada** (`data-destaque="sim"`).
- **Administração** — aviso operacional → clique abre a página respectiva; Centro acessível.
- **Centro de Notificações** — o item clicado aparece em cartão de destaque («Notificação
  seleccionada») com atalhos «Abrir inquéritos» e «Ver correspondência».

---

## 3. Prova

Suite: `scripts/provar_notificacoes_clicaveis_playwright.cjs`
(app cria inquérito pela UI da instituição, cidadão responde, instituição clica na notificação;
cria e apaga os seus próprios dados).

```
1. INSTITUIÇÃO — criar inquérito
   mensagem 1794939372066386 «NOTIF-CLIQ 55116» · sondagens [255]

2. CIDADÃO — clicar na notificação da nova correspondência
   ✓ cidadão: menu com notificações abre
   ✓ cidadão: a notificação da mensagem está no menu
   ✓ cidadão: o clique abriu a correspondência

3. CIDADÃO — responder ao inquérito
   ✓ cidadão: resposta registada

4. INSTITUIÇÃO — clicar na notificação «Resposta ao Inquérito»
   ✓ instituição: notificação de resposta gravada (target_bi=AGT-LMM)
   ✓ instituição: menu com notificações abre
   ✓ instituição: notificações clicáveis no menu (6)
   ✓ instituição: VÊ a notificação «Resposta ao Inquérito» (antes era descartada)
   ✓ instituição: o clique abriu a página Inquéritos
   ✓ instituição: o inquérito respondido ficou em destaque
   ✓ instituição: atalho «Ver Centro de Notificações» presente
   ✓ instituição: Centro de Notificações abre pelo atalho
   ✓ instituição: a notificação está listada no Centro
   ✓ instituição: o clique no Centro abriu a página Inquéritos
   ✓ instituição: o inquérito respondido aparece em destaque
   ✓ instituição: «Abrir inquéritos» leva à página correcta

5. ADMINISTRAÇÃO — clicar numa notificação real
   ✓ admin: menu abre
   ✓ admin: a notificação do agente está no menu e é clicável
   ✓ admin: o clique abriu a página respectiva
   ✓ admin: atalho para o Centro de Notificações disponível
   ✓ admin: Centro de Notificações abre

limpeza: ✓ 0 restantes
RESULTADO: APROVADO
```

Duas execuções consecutivas APROVADAS. Não-regressão: `provar_inqueritos_so_em_detalhes` APROVADO;
`test_videochamada_2contas` **3/3**.

---

## 4. Armadilhas encontradas (para não repetir)

- **Portais diferentes:** `#/login` (cidadão), `#/institucional` (instituição), `#/admin`
  (administração). Entrar pelo portal genérico põe a conta institucional no **modo cidadão** e a
  página Inquéritos mostra a lista do cidadão («Ainda não recebeu inquéritos»).
- **Cabeçalho em duplicado:** há duas cópias do menu da foto (desktop e móvel); os testes têm de
  clicar na cópia **visível**.
- **Destaque consumido cedo:** o efeito do destaque desistia no 1.º render (lista ainda vazia) e
  consumia o foco sem mostrar nada; só desiste **depois** da 1.ª carga completa.
