# Relatório de Execução e Validação: Fluxo de Contactos e Mensagem de Emergência

**Data de Execução:** 25 de Setembro de 2026  
**Ambiente:** Plataforma Oficial Correio Digital Angola (CDA) 2026  
**Resultado Global:** **100% FUNCIONAL E APROVADO COM SUCESSO**

---

## 1. Objectivos do Teste

1. **Autenticação do Cidadão:** Iniciar sessão na conta do cidadão **Edlásio Galhardo** (`002399714LA030`).
2. **Criação de Contactos de Emergência:** Aceder à secção «Contactos» e registar 2 novos contactos com a classificação obrigatória de **«Emergência»**, incluindo números válidos no formato nacional de Angola (`+244 9XX XXX XXX`), nomes e graus de parentesco.
3. **Encerramento de Sessão:** Terminar a sessão do cidadão de forma segura.
4. **Autenticação Institucional:** Iniciar sessão na conta institucional da **INAPEM** (`INAPEM-LMM-01`).
5. **Composição e Difusão de Emergência:** Compor nova mensagem oficial endereçada ao B.I. do cidadão, selecionar a modalidade prioritária **«Mensagem de Emergência»**, carregar os contactos da rede familiar de emergência associados e disparar o envio multicanal (Plataforma CDA + WhatsApp Oficial wa.me).

---

## 2. Etapas Executadas e Resultados

| Etapa | Ação Realizada | Detalhes / Registo | Estado |
| :--- | :--- | :--- | :---: |
| **1. Login Cidadão** | Autenticação no Portal | B.I.: `002399714LA030`<br>Perfil: Edlásio Galhardo | **SUCESSO ✓** |
| **2. Contacto Emergência 1** | Criação no Círculo de Confiança | **Nome:** Teresa Galhardo Silva<br>**Grau:** Pai/Mãe<br>**Telefone:** +244 923 297 098<br>**Tipo:** Emergência | **SUCESSO ✓** |
| **3. Contacto Emergência 2** | Criação no Círculo de Confiança | **Nome:** Joaquim Galhardo Neto<br>**Grau:** Pai/Mãe<br>**Telefone:** +244 931 519 254<br>**Tipo:** Emergência | **SUCESSO ✓** |
| **4. Logout Cidadão** | Encerramento de Sessão | Limpeza de sessão local e desautenticação | **SUCESSO ✓** |
| **5. Login Institucional** | Autenticação no Portal INAPEM | Utilizador: `INAPEM-LMM-01`<br>Perfil: INAPEM Oficial | **SUCESSO ✓** |
| **6. Composição da Mensagem** | Endereçamento e Conteúdo | **Destinatário:** `002399714LA030`<br>**Assunto:** Convocatória Prioritária<br>**Corpo:** Notificação Urgente | **SUCESSO ✓** |
| **7. Modalidade Emergência** | Seleção no Popup de Envio | Acionamento da modalidade «Mensagem de Emergência» | **SUCESSO ✓** |
| **8. Difusão Multicanal** | Disparo para a Rede de Emergência | • Disparo para Teresa Galhardo Silva (Concluído ✓)<br>• Disparo para Joaquim Galhardo Neto (Concluído ✓) | **SUCESSO ✓** |

---

## 3. Script Automatizado E2E de Validação

O script completo de testes foi desenvolvido e guardado em:
- `scripts/e2e_test_emergency_contacts_flow.mjs`

### Registo da Execução Playwright:
```text
================================================================
🧪 TESTE COMPLETO DO FLUXO DE CONTACTOS E MENSAGEM DE EMERGÊNCIA
1. Entrar na conta do Cidadão Edlásio Galhardo (002399714LA030)
2. Aceder à página Contactos e criar 2 Contactos de Emergência
3. Sair da conta do Cidadão
4. Entrar na conta da Instituição INAPEM-LMM-01
5. Enviar Mensagem de Emergência para os contactos de emergência
================================================================

--- ETAPA 1: Login Cidadão Edlásio Galhardo ---
✓ Login Cidadão concluído com sucesso.
--- ETAPA 2: Aceder a Contactos e criar 2 Contactos de Emergência ---
> A adicionar contacto de emergência: Teresa Galhardo Silva (Pai/Mãe, +244 923 297 098)...
✓ Contacto Teresa Galhardo Silva adicionado com sucesso.
> A adicionar contacto de emergência: Joaquim Galhardo Neto (Pai/Mãe, +244 931 519 254)...
✓ Contacto Joaquim Galhardo Neto adicionado com sucesso.
✓ 2 Contactos de emergência criados e confirmados no perfil.
--- ETAPA 3: Logout Cidadão ---
--- ETAPA 4: Login Instituição INAPEM-LMM-01 ---
✓ Login INAPEM efetuado com sucesso.
--- ETAPA 5: Envio de Mensagem de Emergência para o Cidadão e Rede de Emergência ---
✓ Modalidade "Mensagem de Emergência" selecionada.
✓ Painel de Difusão de Mensagem de Emergência aberto: true
> A disparar alerta para o 1º contacto de emergência...
✓ 1º Alerta enviado (Estado: CONCLUÍDO).
> A disparar alerta para o 2º contacto de emergência...
✓ 2º Alerta enviado (Estado: CONCLUÍDO).

================================================================
🎉 RESULTADO: FLUXO DE CONTACTOS E DIFUSÃO DE EMERGÊNCIA 100% FUNCIONAL!
================================================================
```

---

## 4. Conclusão

Todos os requisitos solicitados foram testados de ponta a ponta e estão **100% operacionais**, garantindo que:
1. O cidadão consegue gerir a sua rede de segurança familiar e contactos de emergência;
2. As instituições governamentais e públicas (como o INAPEM) conseguem localizar a rede de emergência vinculada ao cidadão através do B.I. e proceder à difusão prioritária com feedback imediato de envio.
