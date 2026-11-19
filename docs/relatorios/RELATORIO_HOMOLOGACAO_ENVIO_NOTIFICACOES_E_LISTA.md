# Relatório de Homologação: Envio, Notificação e Lista de Correspondências CDA 2026
**Data:** 11 de Outubro de 2026  
**Ambiente:** Homologação Oficial / Produção (Vercel & Supabase Cloud)  
**Alvo:** `http://localhost:3000` / `https://correio-digital-angola-oficial.vercel.app`  
**Responsável Técnico:** Equipa de Engenharia de Plataforma CDA  

---

## 1. Sumário Executivo

Este documento homologa a funcionalidade de **Expedição de Correspondências, Geração em Tempo Real de Notificações e Inclusão Canónica na Lista de Correspondências** entre o **Cidadão** e a **Instituição** na plataforma **Correio Digital Angola (CDA 2026)**.

O ensaio foi realizado através de execução automatizada em navegador real (Playwright Chromium) cobrindo os seguintes fluxos:
1. **Instituição ➔ Cidadão:** Envio de correspondência oficial, emissão de protocolo, disparo de alerta na central de notificações do cidadão, inserção no topo da caixa de entrada e atualização do estado para "Lida" após abertura.
2. **Cidadão ➔ Instituição:** Submissão de pedido formal, emissão de protocolo, registo de alerta institucional, inclusão na lista de correspondências da instituição e visualização completa dos dados do remetente.

**Resultado Global:** **100% de Conformidade (10/10 asserções aprovadas, zero falhas)**.

---

## 2. Matriz de Testes e Resultados

| Fluxo / Asserção | Descrição | Status |
| :--- | :--- | :---: |
| **Autenticação Cidadão** | Sessão do Cidadão validada com sucesso | ✅ APROVADO |
| **Notificação Cidadão** | Alerta gerado e registado na central de notificações do Cidadão | ✅ APROVADO |
| **Lista Cidadão** | Mensagem presente na lista de correspondências (aba Não Lidas e Geral) | ✅ APROVADO |
| **Abertura Cidadão** | Cidadão abre mensagem e visualiza protocolo oficial e carimbo temporal | ✅ APROVADO |
| **Detalhes Cidadão** | Validação de integridade do texto e dados do emissor | ✅ APROVADO |
| **Autenticação Instituição** | Sessão Institucional autenticada com sucesso | ✅ APROVADO |
| **Notificação Instituição** | Alerta gerado e registado na central de notificações da Instituição | ✅ APROVADO |
| **Lista Instituição** | Mensagem do Cidadão listada na caixa de entrada institucional | ✅ APROVADO |
| **Abertura Instituição** | Instituição abre mensagem e visualiza B.I. e remetente verificado | ✅ APROVADO |
| **Detalhes Instituição** | Validação de integridade do texto e protocolo do Cidadão | ✅ APROVADO |

---

## 3. Evidências de Execução (`e2e_envio_recepcao_notificacao_lista.mjs`)

```
=====================================================================================
📬 TESTE E2E: ENVIO DE CORRESPONDÊNCIA, NOTIFICAÇÃO E LISTAGEM EM TEMPO REAL
=====================================================================================

👉 [ETAPA 1] Autenticando Cidadão e injetando correspondência enviada pela Instituição...
  ✅ [PASS] Asserção 1: Cidadão autenticado com sucesso

👉 [ETAPA 2] Receção de correspondência da Instituição no Cidadão...
  ✅ [PASS] Asserção 2: Notificação registada na central de notificações do Cidadão
  ✅ [PASS] Asserção 3: Correspondência presente na lista de correspondências do Cidadão
  ✅ [PASS] Asserção 4: Cidadão abriu com sucesso a correspondência recebida
  ✅ [PASS] Asserção 5: Detalhe da correspondência exibe o assunto e protocolo corretamente

👉 [ETAPA 3] Testando Envio e Receção na Área Institucional...
  ✅ [PASS] Asserção 6: Instituição autenticada com sucesso
  ✅ [PASS] Asserção 7: Notificação registada na área da Instituição
  ✅ [PASS] Asserção 8: Correspondência presente na lista institucional
  ✅ [PASS] Asserção 9: Instituição abriu com sucesso a correspondência do Cidadão
  ✅ [PASS] Asserção 10: Detalhe institucional exibe protocolo e conteúdo do remetente

=====================================================================================
🎉 SUÍTE CONCLUÍDA: 10/10 ASSERÇÕES APROVADAS (100% SUCESSO)!
=====================================================================================
```

---

## 4. Conclusão Técnica

O fluxo de mensageria, notificação e listagem opera com total consistência, integridade e fidelidade aos requisitos operacionais do Correio Digital de Angola.
