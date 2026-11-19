# Relatório Técnico: Ajuste do Modal de Envio na Área Institucional (Supressão da Opção «Denunciar»)

**Data de Conclusão:** 01 de Outubro de 2026  
**Ambiente:** Plataforma de Correio Digital de Angola (CDA) — 2026  
**Responsável Técnico:** Agente de Engenharia de Software e QA CDA  
**Status do Módulo:** 🟢 **Aprovado em Produção (8/8 Asserções E2E & 0 Erros TypeScript)**

---

## 1. Sumário Executivo

O presente documento relata o ajuste e a parametrização do modal de confirmação de envio de correspondência (`popup-enviar-mensagem`) no compositor oficial (`MailContent.tsx`).

Foi suprimida a opção **«Denunciar» / «Denuncia»** para utilizadores com perfil **Institucional** (`isInst === true`). As opções de denúncia e reclamação pertencem exclusivamente ao canal de cidadania ativa e não compõem as prerrogativas de emissão institucional (onde se aplicam Mensagem Normal, Comunicados Oficiais e Mensagens de Emergência).

---

## 2. Matriz de Modalidades por Perfil de Acesso

| Opção no Modal | Perfil Cidadão (`isInst === false`) | Perfil Institucional (`isInst === true`) | Finalidade |
| :--- | :---: | :---: | :--- |
| **Mensagem Normal** | ✅ Visível (`#btn-modal-opcao-normal`) | ✅ Visível (`#btn-modal-opcao-normal`) | Envio de correspondência oficial digital padronizada. |
| **Comunicado** | ❌ Oculto | ✅ Visível (`#btn-modal-opcao-comunicado`) | Emissão e publicação de comunicado oficial com prefixo canónico `[COMUNICADO OFICIAL]`. |
| **Mensagem de Emergência** | ❌ Oculto | ✅ Visível (`#btn-modal-opcao-emergencia`) | Alerta de emergência com difusão prioritária. |
| **Reclamação** | ✅ Visível (`#btn-modal-opcao-denunciar`) | ❌ **Oculto** | Registo de queixa/reclamação para o Livro de Reclamações. |
| **Denuncia** | ✅ Visível (`#btn-modal-opcao-denuncia`) | ❌ **Oculto (Removido)** | Registo de denúncia formal com marca `[REGISTO DE DENÚNCIA]`. |

---

## 3. Matriz de Alterações de Código

- **`src/components/features/MailContent.tsx`**:
  - Ajustado o array `opcoesEnvio` para que no ramo condicional `isInst === true` sejam apresentadas estritamente as opções permitidas para órgãos do Estado: `normal`, `comunicado` e `emergencia`.
  - A opção `nova-denuncia` permanece ativa e disponível exclusivamente no ramo `isInst === false` (Cidadão).

---

## 4. Resultados da Validação E2E no Navegador

Executada a bateria automatizada `scripts/e2e_popup_envio_instituicao_sem_denuncia.mjs` via Playwright:

```text
🚀 Iniciando Bateria E2E: Validação das Opções do Popup de Envio na Área Institucional (Sem botão Denunciar)...

🏛️ 1. Login na Área Institucional ((QA_INST))...
✍️ 2. Navegando para o Correio Institucional e abrindo Nova Mensagem...
📝 3. Preenchendo campos de correspondência oficial...
🔘 4. Clicando em «Enviar Mensagem Oficial» para validar o popup...
  ✅ [PASS 1] Popup de seleção de modalidade de envio visível na Instituição
  ✅ [PASS 2] Instituição: Opção «Mensagem Normal» presente
  ✅ [PASS 3] Instituição: Opção «Comunicado» presente
  ✅ [PASS 4] Instituição: Opção «Mensagem de Emergência» presente
  ✅ [PASS 5] Instituição: Botão/Opção «Denunciar» / «Denuncia» NÃO ESTÁ PRESENTE no popup (Removido com sucesso)

👤 5. Alternando para a Área do Cidadão para verificar contraprova...
  ✅ [PASS 6] Cidadão: Popup de modalidade visível
  ✅ [PASS 7] Cidadão: Opção «Denuncia» visível legitimamente para o cidadão
  ✅ [PASS 8] Cidadão: Opção «Reclamação» visível legitimamente para o cidadão

======================================================
🎉 BATERIA CONCLUÍDA: 8 de 8 asserções PASSARAM COM 100% DE SUCESSO!
======================================================
```

---

## 5. Sugestão de Prompt Otimizado (Melhoria do Prompt)

Eis a formulação técnica refinada e sem ambiguidades:

```markdown
"Na área Institucional, ao compor uma 'Nova Mensagem' e clicar em 'Enviar Mensagem Oficial', ajustar o modal de opções de envio para suprimir a opção 'Denunciar'/'Denuncia'. A emissão institucional deve disponibilizar exclusivamente as modalidades 'Mensagem Normal', 'Comunicado' e 'Mensagem de Emergência', mantendo as opções de 'Reclamação' e 'Denuncia' restritas à área do Cidadão. Validar as opções de ambos os perfis através de testes E2E automatizados no browser e compilação TypeScript com 0 erros."
```

---

## 6. Conclusão

O comportamento do compositor oficial encontra-se rigorosamente em conformidade com as regras de negócio institucionais da plataforma CDA 2026.
