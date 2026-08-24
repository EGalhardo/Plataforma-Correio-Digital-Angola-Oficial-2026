# PROMPT_AJUSTES_UX_v37.5 — POPUPS PADRÃO, NAVEGAÇÃO PÓS-ENVIO/RESPOSTA E PERFORMANCE

> Versão melhorada e accionável do pedido do dono (2026-08-24), adaptada à
> arquitectura real do app (componentes `CdaModal`/`CdaConfirmModal`, tabs por
> `setTab`, varreduras 42/52). Usar como spec de implementação.

## 0. Contexto
Na v37.4 ficaram: popup «Correspondência Enviada» na instituição, expedição
«TODOS» nas Enviadas, e resposta às enquetes via «Responder ao Documento» com
popups «Confirmar Respostas às Sondagens» e «Resposta Registada». Este prompt
uniformiza esses popups ao padrão visual do app, define a navegação após
envio/resposta e estabelece metas concretas de tempo de carregamento.

## 1. Área da Instituição — pós-envio
1.1. O popup de sucesso do envio («Correspondência enviada…») DEVE usar o
padrão oficial de popups do app: componente `CdaModal` com ícone de sucesso
(CheckCircle2 em tom verde `bg-emerald-50 text-emerald-600 border-emerald-100`),
título «Correspondência Enviada», corpo com o resumo (N cidadão(s), âmbito,
registo nas «Enviadas») e UM botão de fecho no rodapé com o mesmo estilo dos
demais popups («Entendi»/«Fechar») — sem botões avulsos nem layout próprio.
1.2. Ao fechar/confirmar esse popup, o compositor fecha e é exibida a página
«Correio» da instituição com a aba **«Enviadas» activa**, para o utilizador ver
de imediato a correspondência expedida.
1.3. A correspondência enviada DEVE aparecer na lista de Enviadas (registo
único com destinatário «TODOS», assunto e corpo da mensagem composta) — a
cache de leitura (`invalidateMessagesReadCache`) é furada no envio para a
linha surgir sem recarregar.
1.4. Manter o comportamento actual de difusão (fan-out pelo âmbito oficial) e
o popup de erro honesto quando a distribuição falha (nada é enviado).

## 2. Área do Cidadão — popups das enquetes
2.1. «Confirmar Respostas às Sondagens» DEVE seguir o padrão `CdaConfirmModal`
do app: título, subtítulo, lista legível das escolhas (pergunta + opção
escolhida, com aviso quando falta escolha) e os dois botões standard do
padrão («Cancelar» e «Confirmar Respostas»), com o mesmo raio/tipografia dos
restantes confirms — remover botões artesanais fora do padrão.
2.2. «Resposta Registada» DEVE usar `CdaModal` de sucesso (CheckCircle2, tom
verde, título «Resposta Registada», corpo «Respostas registadas com sucesso…»
+ botão único «Entendi»).
2.3. Ao fechar o popup «Resposta Registada», o detalhe da mensagem fecha e é
exibida a página «Correio» do cidadão (lista de correspondência), mantendo a
mensagem como lida e o chip «Resposta registada ✔» persistido ao reabrir.
2.4. Sem escolha em alguma sondagem: popup de aviso no padrão `CdaModal`
(AlertTriangle, tom âmbar) — nunca registar parcialmente.

## 3. Performance — «melhorar o tempo de carregamento de todo o app»
3.1. Medir primeiro (linha de base): tempo até ao login visível e até ao
primeiro painel renderizado nas 3 áreas (cidadão/instituição/admin), em build
de produção, antes e depois (registar números no relatório).
3.2. Acções obrigatórias, sem quebrar funcionalidades:
- Estender o code-splitting (`React.lazy` + `Suspense`) a todos os componentes
  pesados ainda importados estaticamente (gráficos, assistentes de IA,
  tradutor, editores) — o padrão lazy já existe para as features principais.
- Diferir trabalho de arranque: não pré-calcular audiências/classificações no
  login; só quando o compositor/modal abre (hoje já é assim — manter).
- Evitar renders pesados nas listas (caixas de correio): memoizar mappers e
  paginar/virtualizar listas longas se excederem ~100 linhas.
- Reduzir o bundle inicial: auditar imports de `lucide-react`/`motion` por
  página e remover dead code; confirmar que ícones são tree-shaken.
- Cache de leitura: manter o micro-cache de mensagens (30 s) e invalidá-lo
  apenas nos pontos de escrita existentes.
3.3. Meta verificável: redução perceptível no primeiro render (painel após
login) e zero regressões nas varreduras (42 contas reais / 52 demo) e no
TypeScript.

## 4. Aceitação (testes com contas reais, sem fan-out nacional real)
4.1. Instituição: compor mensagem + 1 enquete → «Enviar Mensagem Oficial» →
popup de sucesso no padrão → ao fechar, página «Correio» com «Enviadas» activa
e a expedição «TODOS» visível de imediato.
4.2. Cidadão: abrir mensagem com enquete(s) → seleccionar opção → «Responder
ao Documento» → popup de confirmação no padrão → «Confirmar Respostas» →
popup «Resposta Registada» no padrão → ao fechar, página «Correio» do cidadão;
resposta persistida na base e chip ✔ ao reabrir.
4.3. Varreduras finais: 42/0/0 (contas reais) e 52/0/0 (demo); `tsc --noEmit`
limpo; commit + push (Vercel READY).
4.4. Limpeza total dos dados de teste; classificação do INAPEM restaurada a
NACIONAL; sondagens reais do dono intocadas.

## 5. Não quebrar
Fluxos v36 (sondagem única), v37 (blocos multi-sondagem, «Todos», segmentação
nacional/regional/local), painéis Admin/Gov, RLS/RLS-proxies, mensagens
imutáveis (gatilho de protocolo) e o padrão de auditoria (`addAuditLog`).
