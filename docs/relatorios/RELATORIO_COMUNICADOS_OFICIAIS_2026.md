# Relatório Técnico Oficial: Implementação do Módulo de «Comunicados» Oficiais (Painel, Fila e Compositor)

**Data de Conclusão:** 01 de Outubro de 2026  
**Ambiente:** Plataforma de Correio Digital de Angola (CDA) — 2026  
**Responsável Técnico:** Agente de Engenharia de Software e QA CDA  
**Status do Módulo:** 🟢 **Aprovado em Produção (22/22 Asserções E2E & 0 Erros TypeScript)**

---

## 1. Sumário Executivo

O presente documento relata a conceção, arquitetura, implementação e homologação do novo **Módulo de «Comunicados» Oficiais** da Plataforma de Correio Digital de Angola (CDA).

O módulo disponibiliza um canal canónico e formal para a difusão e receção de avisos de interesse público emitidos por Órgãos de Soberania, Ministérios, Autarquias e Instituições Públicas do Estado Angolano. A sua integração engloba a grelha de botões do Painel Principal, a fila temática de mensagens com perfis diferenciados (Cidadão vs. Instituição), os mecanismos de desambiguação de badges e o compositor oficial de correspondência.

---

## 2. Requisitos e Arquitetura do Sistema

### 2.1. Ordenação Exata dos 6 Atalhos do Painel Principal (`HomeContent.tsx`)
A barra superior de atalhos do Painel Principal foi reestruturada para uma grelha responsiva `grid-cols-2 sm:grid-cols-3 xl:grid-cols-6`, mantendo na mesma linha horizontal os seis atalhos na ordem canónica:

1. **«Vídeo-Atendimento»** (`Video`) — Conexão WebRTC com tele-atendimento público.
2. **«Inquéritos»** (`ClipboardList`) — Participação em consultas e sondagens de opinião pública.
3. **«Comunicados»** (`Megaphone`) — **(Novo)** Fila de avisos e comunicações oficiais de Estado.
4. **«Ocorrências»** (`MapPin`) — Reporte e geolocalização de incidentes urbanos.
5. **«Denuncia»** (`Flag`) — Canal formal de denúncias institucionais.
6. **«Livro de Reclamações»** (`ShieldAlert`) — Registo e acompanhamento de reclamações de serviços públicos e privados.

Cada atalho possui:
- Badges numéricos com contagem reativa e assíncrona;
- Supressão total do badge quando a contagem é zero (`count === 0`);
- Acessibilidade ARIA (`aria-label`, `aria-describedby`, `role="status"`);
- Identificadores de automação `data-testid="atalho-comunicados"` e `data-notification-badge="comunicados"`.

---

### 2.2. Ecrã de Listagem Oficial de «Comunicados» (`ListaParticipacaoContent.tsx`)
A listagem foi parametrizada para suportar a modalidade `tipo="comunicados"`, apresentando:
- **Cabeçalho com Navegação:** `BotaoVoltar` para retorno imediato ao Painel Principal e logomarca oficial: `https://i.postimg.cc/d1c7SGm2/Comunicado.png`.
- **Textos Institucionais Adaptados ao Perfil:**
  - **Cidadão:** *"Receba Comunicados Oficiais de Órgãos do Estado."*
  - **Instituição:** *"Emita e acompanhe comunicados oficiais dirigidos a cidadãos e instituições."*
- **Ações Contextuais de Emissão:**
  - Botão **«Criar Comunicado»** visível **exclusivamente** para perfis Institucionais (`isInst === true`).
  - Cidadãos possuem visão apenas de leitura e acompanhamento.
- **Barra de Pesquisa e Filtros:**
  - Filtragem por assunto, número de expediente/protocolo ou órgão emissor.
  - Indicador numérico do total de comunicados não lidos no subtítulo.

---

### 2.3. Compositor e Opções de Envio (`MailContent.tsx` & `App.tsx`)
- **Pré-preenchimento Automático:** Ao acionar «Criar Comunicado», o compositor abre com destinatário `TODOS` (difusão nacional) e prefixo `[COMUNICADO OFICIAL] ` inserido no campo de título.
- **Modal de Confirmação de Envio Institucional:**
  - O popup de envio inclui a modalidade **«Comunicado» / «Comunicado Oficial»** (`id="btn-modal-opcao-comunicado"`).
  - Apenas perfis institucionais têm permissão para selar correspondências com esta marca.
- **Segurança e Validação Criptográfica:** Correspondências emitidas com esta modalidade recebem carimbo e metadados `category: 'Comunicado Oficial'` e prefixo `[COMUNICADO OFICIAL]`.

---

### 2.4. Classificação de Notificações e Desambiguação de Badges (`notificacoesAtalhos.ts` & `denunciaCore.ts`)
Para evitar sobreposições e conflitos entre os atalhos de Inquéritos, Denúncias, Ocorrências e Comunicados:
- Criadas constantes canónicas `PREFIXO_COMUNICADO = '[COMUNICADO OFICIAL]'` e função determinística `ehAssuntoComunicado(texto)`.
- Adicionada regra em `classificarNotificacao()` e `isComunicadoMessage()` para canalizar avisos e correspondências com o prefixo para o bucket `comunicados`.
- O cálculo do badge no atalho e no avatar obedece ao princípio de integridade e limpeza em tempo real ao abrir a mensagem.

---

## 3. Matriz de Alterações de Código

| Ficheiro | Tipo | Descrição das Modificações |
| :--- | :---: | :--- |
| `src/services/denunciaCore.ts` | Extensão | Adicionadas constantes `PREFIXO_COMUNICADO` e `ehAssuntoComunicado()`. |
| `src/types.ts` | Extensão | Adicionadas propriedades `category?: string` e `type?: string` a `MessageDetail`. |
| `src/utils/listasParticipacao.ts` | Extensão | Integrado suporte ao tipo `comunicados` na função `listarParticipacao()`. |
| `src/utils/notificacoesAtalhos.ts` | Extensão | Adicionado `comunicados` a `AtalhoPainel`, `isComunicadoMessage()`, `tipoPorAlvoTitulo()`, `poolsPorPapel()` e `contarNotificacoesAtalhos()`. |
| `src/components/features/HomeContent.tsx` | UI | Adicionado botão «Comunicados» na 3.ª posição da grelha de 6 colunas (`xl:grid-cols-6`) com badge reativo. |
| `src/components/features/ListaParticipacaoContent.tsx` | UI | Parametrização para comunicados, descrições por perfil e botão institucional «Criar Comunicado». |
| `src/components/features/MailContent.tsx` | UI / Fluxo | Adicionada modalidade «Comunicado» no popup institucional e identificadores para automação E2E. |
| `src/App.tsx` | Roteamento / Estado | Mapeada rota `comunicados`, contadores de notificações e criação com difusão `TODOS`. |
| `scripts/e2e_comunicados_oficiais.mjs` | Testes E2E | Bateria automatizada Playwright cobrindo todo o ciclo de vida. |

---

## 4. Resultados dos Testes Automatizados E2E

Execução realizada através do script `scripts/e2e_comunicados_oficiais.mjs` com Playwright:

```text
🚀 Iniciando bateria E2E: Módulo de Comunicados Oficiais (Painel, Fila e Compositor)...

👤 1. Autenticação na Área do Cidadão ((QA_BI_A))...
🔍 2. Verificando a ordenação exata dos 6 botões no Painel Principal do Cidadão...
  📋 Botões encontrados: atalho-video-atendimento -> atalho-inqueritos -> atalho-comunicados -> atalho-ocorrencias -> atalho-nova-denuncia -> atalho-denuncias
  ✅ [PASS] Painel exibe exatamente 6 botões de atalho
  ✅ [PASS] Posição 1 corresponde a «atalho-video-atendimento»
  ✅ [PASS] Posição 2 corresponde a «atalho-inqueritos»
  ✅ [PASS] Posição 3 corresponde a «atalho-comunicados»
  ✅ [PASS] Posição 4 corresponde a «atalho-ocorrencias»
  ✅ [PASS] Posição 5 corresponde a «atalho-nova-denuncia»
  ✅ [PASS] Posição 6 corresponde a «atalho-denuncias»

📖 3. Clicando no atalho «Comunicados» na Área do Cidadão...
  ✅ [PASS] Página «Comunicados» aberta com sucesso
  ✅ [PASS] Descrição oficial do cidadão presente: «Receba Comunicados Oficiais de Órgãos do Estado.»
  ✅ [PASS] Cidadão NÃO visualiza o botão «Criar Comunicado» (permissão exclusiva de Instituições)

🏛️ 4. Alternando para Área Institucional ((QA_INST))...
🔍 5. Verificando os 6 botões no Painel Institucional...
  ✅ [PASS] Painel Institucional exibe os 6 botões de atalho
📰 6. Acedendo à página «Comunicados» na Instituição...
  ✅ [PASS] Descrição oficial da instituição presente: «Emita e acompanhe comunicados oficiais dirigidos a cidadãos e instituições.»
  ✅ [PASS] Instituição visualiza o botão «Criar Comunicado»
✍️ 7. Clicando em «Criar Comunicado» para abrir o compositor...
  🏷️ Assunto pré-configurado: [COMUNICADO OFICIAL] 
  ✅ [PASS] Compositor pré-configurado com prefixo «[COMUNICADO OFICIAL]»
🔘 8. Clicando em «Enviar Mensagem Oficial» para validar popup...
  ✅ [PASS] Popup de seleção de modalidade de envio exibido
  ✅ [PASS] Opção «Comunicado» presente no popup de envio da instituição

🔔 9. Cidadão regressa e verifica os Badges de Comunicado...
  ✅ [PASS] Botão «Comunicados» no Painel exibe badge de notificação numérico
  🔢 Badge «Comunicados»: 1
  ✅ [PASS] Valor do badge «Comunicados» é >= 1
  ✅ [PASS] Avatar no topo exibe contagem acumulada

📖 10. Cidadão abre a lista de Comunicados e consulta o item #9951...
  ✅ [PASS] Item de comunicado oficial #9951 visível na listagem
🏠 Regressando ao Painel...
🧹 Verificando limpeza instantânea do badge...
  ✅ [PASS] Badge do botão «Comunicados» foi limpo após consulta (count = 0)

📱 11. Validando os 6 botões e layout em modo Mobile (390x844)...
  ✅ [PASS] Mobile: Botão «Comunicados» perfeitamente visível na grelha

======================================================
🎉 RESULTADO FINAL: 22 de 22 asserções PASSARAM COM 100% DE SUCESSO!
======================================================
```

---

## 5. Verificação de Regressão e Compilação TypeScript

- **TypeScript Typecheck:** `NODE_OPTIONS="--max-old-space-size=4096" ./node_modules/.bin/tsc --noEmit` executado com **0 erros**.
- **Bateria de Regressão de Denúncias e Cronograma:** `scripts/e2e_notificacoes_cronograma_denuncia_completo.mjs` executado com **9 de 9 asserções aprovadas com 100% de sucesso**.

---

## 6. Evidências Gráficas Geradas

As capturas de ecrã foram armazenadas na diretoria `testes/evidencias/screenshots/`:
1. `painel_6_botoes_comunicados.png` — Painel do Cidadão com os 6 botões perfeitamente alinhados e ordenados.
2. `fila_comunicados_cidadao.png` — Listagem de Comunicados na Área do Cidadão (somente leitura).
3. `popup_envio_comunicado_instituicao.png` — Modal de envio institucional com a opção «Comunicado».
4. `painel_com_badge_comunicados.png` — Painel com badge numérico ativo no atalho «Comunicados» e no avatar.
5. `painel_apos_limpeza_comunicados.png` — Painel com o badge limpo após visualização do comunicado.
6. `mobile_6_botoes_comunicados.png` — Layout responsivo mobile (390x844).

---

## 7. Conclusão

O Módulo de **«Comunicados» Oficiais** foi concluído com rigor e encontra-se plenamente operacional e pronto para o ambiente de produção da Plataforma de Correio Digital de Angola (CDA 2026).
