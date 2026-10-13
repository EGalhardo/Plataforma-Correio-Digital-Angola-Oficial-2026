# Relatório de Homologação: Auditoria de Enquadramento da IA nas Áreas Institucional e de Administração Central (CDA 2026)

**Data de Execução:** 12 de Outubro de 2026  
**Ambiente:** Plataforma Oficial Correio Digital de Angola (CDA 2026) — Agent Mode  
**Âmbito:** Inteligência Artificial (`/api/chat` e `AIChatAssistant`) — Áreas Institucional e Administração Central  
**Status Global:** ✅ **APROVADO (100% CONFORMIDADE)**

---

## 1. Sumário Executivo

O presente relatório atesta a homologação da capacidade de contextualização e enquadramento de domínio do Assistente de Inteligência Artificial do Correio Digital de Angola (CDA).

Foram submetidas baterias de testes para avaliar a segregação de personas, terminologia técnica e restrição de módulos em duas áreas operacionais críticas:
1. **Área Institucional** (`appMode: 'institution'`)
2. **Administração Central / SOC Governamental** (`appMode: 'admin'`)

---

## 2. Resultados por Área de Atuação

### 2.1. Área Institucional (`institution`)
- **Persona:** Assistente Operacional Institucional.
- **Saudação Oficial:** *"Bom dia, como posso apoiar nas suas operações institucionais hoje?"*
- **Domínio Coberto:**
  - Identificação de todos os 14 módulos institucionais (`home`, `correspondencias`, `gov-contatos`, `inst-qrcode`, `inst-ai-assistant`, `documentos`, `inqueritos`, `ocorrencias`, `denuncias`, `comunicados`, etc.).
  - Emissão de correspondência selada com protocolo único para Bilhetes de Identidade de cidadãos.
  - Validação biométrica e criptográfica via leitor QR Code.
  - Gestão de inquéritos e sondagens públicas com geração assistida de perguntas.
  - Fluxo de resolução de ocorrências e gestão da base de conhecimento da instituição.

### 2.2. Administração Central (`admin`)
- **Persona:** Consultor de Segurança, Governança e Operações do SOC da Administração Central.
- **Saudação Oficial:** *"Bom dia, Administrador. Como posso ser útil na gestão e supervisão do Correio Digital de Angola?"*
- **Domínio Coberto:**
  - Módulos governamentais: Painel Nacional (`gov-dashboard`), Interoperabilidade (`gov-interoperabilidade`), Correspondências Nacionais (`gov-correspondencias`), Cadastros Nacionais (`gov-contatos`), Equipa Central (`gov-trabalhadores`), Relatórios Estratégicos (`gov-relatorio`), IA Nacional (`gov-ia`) e Centro de Segurança (`gov-seguranca`).
  - Procedimentos de credenciamento e homologação de entidades federadas com emissão de certificados X.509.
  - Extração de métricas de interoperabilidade e relatórios estatísticos consolidados.

---

## 3. Matriz de Testes E2E Automatizados

Executada a bateria automatizada via Playwright (`scripts/e2e_auditoria_ia_instituicao_admin.mjs`):

| # | Teste / Domínio | Perfil | Resposta & Enquadramento | Resultado |
|---|---|---|---|:---:|
| 1 | Módulos e Atribuições Operacionais | Instituição | 14 módulos institucionais identificados sem interferência de opções do cidadão | ✅ **PASS** |
| 2 | Emissão de Ofício com Selo e Protocolo | Instituição | Fluxo de envio, selo criptográfico e protocolo formal | ✅ **PASS** |
| 3 | Módulos e Ferramentas do SOC / Gov Dashboard | Admin Central | Apresentação formal da estrutura de cibersegurança e governança | ✅ **PASS** |
| 4 | Métricas e Relatórios de Interoperabilidade | Admin Central | Geração de relatórios consolidados em `gov-relatorio` | ✅ **PASS** |

**Taxa de Sucesso:** 4/4 testes aprovados (100%).

---

## 4. Conclusão

O assistente de IA demonstrou **precisão rigorosa no enquadramento de papéis e regras de acesso**, mantendo o tom e a nomenclatura apropriados a cada perfil de utilizador sem qualquer cruzamento indevido de contextos.
