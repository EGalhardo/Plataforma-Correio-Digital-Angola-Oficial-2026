# MANUAL DE UTILIZAÇÃO OFICIAL — CORREIO DIGITAL ANGOLA (CDA — 2026)
**Plataforma Oficial de Correspondência, Documentação, Atendimento e Governação Digital da República de Angola**  
**Versão do Documento:** 3.0 (Edição Completa com Levantamento Integral e Exemplos Práticos CRUD)  
**Data de Emissão:** 12 de Agosto de 2026 (Fuso Horário: África/Luanda)  
**Público-Alvo:** Cidadãos, Operadores de Instituições Públicas e Privadas, Empresas e Administradores do Sistema Central (SOC).

---

## ÍNDICE GERAL DO MANUAL
1. [Introdução & Filosofia de Funcionamento](#1-introdução--filosofia-de-funcionamento)
2. [Levantamento Completo da Aplicação (Índice de Todas as Páginas detectadas)](#2-levantamento-completo-da-aplicação)
3. [Como Aceder à Plataforma & Endereços de Cada Área](#3-como-aceder-à-plataforma--endereços-de-cada-área)
4. [Registo, Autenticação & Recuperação de Palavra-Passe](#4-registo-autenticação--recuperação-de-palavra-passe)
5. [Área do Cidadão — Explicação Detalhada por Página](#5-área-do-cidadão--explicação-detalhada-por-página)
6. [Área das Instituições Públicas e Setores — Os 22 Setores da República](#6-área-das-instituições-públicas-e-setores)
7. [Área de Administração Central (SOC) — Supervisão Governamental](#7-área-de-administração-central-soc)
8. [Funcionalidades CRUD em Detalhe com Exemplos Práticos](#8-funcionalidades-crud-em-detalhe-com-exemplos-práticos)
   * 8.1. [CRUD 1: Gestão de Correspondências e Ofícios (`correspondencias`)](#81-crud-1-gestão-de-correspondências-e-ofícios)
   * 8.2. [CRUD 2: Círculo de Confiança e Contactos de Emergência (`contactos`)](#82-crud-2-círculo-de-confiança-e-contactos-de-emergência)
   * 8.3. [CRUD 3: Base de Conhecimento Institucional Self-Service (`inst-ai-assistant`)](#83-crud-3-base-de-conhecimento-institucional-self-service)
   * 8.4. [CRUD 4: Gestão e Homologação de Cidadãos pelo Admin (`gov-contatos`)](#84-crud-4-gestão-e-homologação-de-cidadãos-pelo-admin)
   * 8.5. [CRUD 5: Edição de Perfil na Página Conta (Cidadão, Instituição e Admin)](#85-crud-5-edição-de-perfil-na-página-conta)
9. [Assistente Inteligente por IA & Acessibilidade por Comandos de Voz](#9-assistente-inteligente-por-ia--acessibilidade-por-comandos-de-voz)
10. [Mensagens de Erro e Resolução de Problemas Comuns](#10-mensagens-de-erro-e-resolução-de-problemas-comuns)
11. [Perguntas Frequentes (FAQ)](#11-perguntas-frequentes-faq)
12. [Boas Práticas de Utilização e Segurança](#12-boas-práticas-de-utilização-e-segurança)

---

## 1. INTRODUÇÃO & FILOSOFIA DE FUNCIONAMENTO
O **Correio Digital Angola (CDA)** é a infraestrutura nacional de comunicação governamental encriptada, autenticada e com eficácia legal da República de Angola. Foi desenhado com três garantias fundamentais:

* **Soberania e Privacidade (Row Level Security - RLS):** As tabelas da base de dados relacional (Supabase PostgreSQL) aplicam regras ao nível da linha. Nenhum cidadão consegue visualizar ofícios ou certidões de outro titular, e nenhuma instituição acede a processos de siglas alheias.
* **Prova Criptográfica e Rastreabilidade (`CDA-xxxxxx`):** Todo o requerimento, ofício, certidão ou despacho gera de forma automática um Número de Protocolo Nacional imutável, carimbo de tempo na tabela `message_state_history` e um **QR Code verificável**.
* **Inclusão Digital nas Línguas Nacionais:** O assistente inteligente de IA traduz termos burocráticos para Português simples e para **Umbundu, Kimbundu, Kikongo, Cokwe e Kwanyama**, com narração por síntese de voz e comandos vocais nativos.

---

## 2. LEVANTAMENTO COMPLETO DA APLICAÇÃO
Abaixo apresenta-se o inventário exato e testado de **100% das páginas e módulos existentes no sistema**, ordenado por área de perfil:

```
==========================================================================================
                 INVENTÁRIO COMPLETO DE ROTAS E PÁGINAS DO CDA (32 ROTAS)
==========================================================================================
ÁREA PÚBLICA (4 Páginas)
  1. [/]                  — Página de Login Principal & Seletor de Perfis (Cidadão / Instituição / Admin)
  2. [/#registo]          — Página de Registo de Cidadão (RegisterStepper civil com verificação B.I./NIF)
  3. [/#registo-inst]     — Página de Registo / Adesão Institucional (RegisterStepper para os 22 setores)
  4. [/#reset-password]   — Página de Redefinição de Palavra-Passe (ResetPasswordStepper com prova civil)

ÁREA DO CIDADÃO (11 Páginas — appMode: 'user')
  5. [/#home]             — Painel Principal do Cidadão (Dashboard executivo & estado de homologação)
  6. [/#correspondencias] — Correio Digital (Caixas de Entrada, Saída, Urgentes, Arquivadas e Lixeira)
  7. [/#documentos]       — Documentos e Certificados Digitais (Certidões, diplomas escolares e títulos)
  8. [/#pasta-digital]    — Pasta Digital do Cidadão (Arquivos organizados por instituição emissora)
  9. [/#qr-code]          — QR Code Segura & Carteira Digital (Apresentação e leitura de selos oficiais)
 10. [/#historico]        — Histórico de Atividades e Transações (Trilha imutável de acessos)
 11. [/#notificacoes]     — Central de Notificações Governamentais (Alertas em tempo real)
 12. [/#contactos]        — Círculo de Confiança & Rede de Emergência (Contactos familiares e Botão SOS)
 13. [/#pagamentos]       — Pagamentos & Taxas de Serviço (Simulação de emolumentos por Multicaixa Express)
 14. [/#video-atendimento]— Videoatendimento Oficial (Acesso a sala segura Jitsi Meet agendada pelo Estado)
 15. [/#perfil]           — Meu Perfil & Segurança (Edição de telemóvel, morada, e-mail, temas e biometria)

ÁREA DAS INSTITUIÇÕES PÚBLICAS E SETORES (8 Páginas — appMode: 'institution')
 16. [/institucional#/home]              — Painel Institucional (Indicadores da organização e carta de serviços)
 17. [/institucional#/correspondencias]  — Correio Institucional (Receção de requerimentos e emissão de despachos)
 18. [/institucional#/inst-qrcode]       — Validador Institucional por QR Code (Verificação imediata de certidões)
 19. [/institucional#/inst-ai-assistant] — Assistente IA & Base de Conhecimento Self-Service (CRUD KB da instituição)
 20. [/institucional#/inst-pagamentos]   — Pagamentos e Cobranças (Emissão de simulações de emolumentos e taxas)
 21. [/institucional#/gov-contatos]      — Equipa Institucional (Gestão de operadores e funcionários da entidade)
 22. [/institucional#/documentos]        — Gestão Documental Institucional (Minutas e normas padrão)
 23. [/institucional#/perfil]            — Perfil Institucional & Credenciais (Edição direta de conta do agente)

ÁREA DE ADMINISTRAÇÃO CENTRAL — SOC (9 Páginas — appMode: 'admin')
 24. [/admin#/gov-dashboard]     — Painel Principal SOC (Centro de Operações Central e telemetria nacional)
 25. [/admin#/gov-interop]       — Interoperabilidade Institucional (Testes ao vivo, SGE e aprovação de adesões)
 26. [/admin#/gov-correspond]    — Supervisão de Correspondências (Auditoria de 100% das mensagens da República)
 27. [/admin#/gov-contatos]      — Gestão de Cidadãos / Homologação B.I. (Auditoria documental e provisão na nuvem)
 28. [/admin#/gov-trabalhadores] — Gestão de Equipa Central (Supervisão global de operadores do sistema)
 29. [/admin#/gov-relatorio]     — Relatórios Estatísticos & Exportação (Emissão de relatórios em PDF e CSV)
 30. [/admin#/gov-ia]            — IA Governamental (Monitorização de latência e consumo Google Gemini e Groq)
 31. [/admin#/gov-seguranca]     — Auditoria de Segurança (Inspeção legal dos 5.806+ registos de audit_logs)
 32. [/admin#/gov-perfil]        — Perfil Admin (Edição direta de dados do administrador e senha na nuvem)
==========================================================================================
```

---

## 3. COMO ACEDER À PLATAFORMA & ENDEREÇOS DE CADA ÁREA
O Correio Digital Angola utiliza **Hash Routing com Prefixos de Rota Diferenciados (`/`, `/institucional`, `/admin`)**, permitindo guardar marcadores nos favoritos e garantindo proteção visual contra *phishing*:

* **Cidadão:** Aceda por `https://correio-digital-angola-oficial.vercel.app/#/home` (raiz limpa).
* **Instituição:** Aceda por `https://correio-digital-angola-oficial.vercel.app/institucional#/home`. Ao abrir este URL, o sistema seleciona automaticamente o perfil institucional no login.
* **Administrador SOC:** Aceda por `https://correio-digital-angola-oficial.vercel.app/admin#/gov-dashboard`.

---

## 4. REGISTO, AUTENTICAÇÃO & RECUPERAÇÃO DE PALAVRA-PASSE

### 4.1. Página de Login Principal (`/`)
* **Objectivo:** Porta de entrada central para autenticar utilizadores civis, institucionais e administrativos.
* **Quem pode utilizar:** Todos os titulares de contas válidas na República de Angola.
* **Campos existentes:**
  * **Identificador:** Número do B.I. para cidadão (`00xxxxxxxLAxx`), Sigla Institucional (`AGT-xxxx-SR`) ou Identificador Operacional do Admin (`ADM-xxxx-OP`).
  * **Palavra-passe:** Campo protegido por criptografia para inserção da senha.
* **Botões e funções:**
  * `[ Cidadão ]` / `[ Instituição ]` / `[ Admin ]` — Alterna o perfil ativo no seletor do topo.
  * `[ Entrar no Portal ]` — Autentica as credenciais na nuvem Supabase e redireciona para o painel correspondente.
  * `[ Auto Preencher Demonstração ]` — Preenche dados de teste homologados para demonstração institucional.
  * `[ Login Facial ]` — Abre a câmara de biometria facial para reconhecimento instantâneo.
  * `[ Esqueci Palavra-Passe ]` — Direciona para a recuperação segura da conta.
  * `[ Registar ]` — Abre o processo de criação de conta.
* **Resultados esperados:** Autenticação imediata e redirecionamento para `#/home` (ou para o endereço guardado em deep-link).
* **Mensagens relevantes:**  
  * *Sucesso:* `Acesso autorizado com sucesso. Bem-vindo ao Correio Digital Angola.`  
  * *Erro:* `Credenciais inválidas ou acesso revogado pela Administração.`

### 4.2. Página de Registo do Cidadão (`/#registo`)
* **Objectivo:** Cadastrar o cidadão no banco de dados central (`public.profiles`) e criar a sua identidade civil.
* **Quem pode utilizar:** Qualquer cidadão nacional com Bilhete de Identidade válido.
* **Campos existentes:** B.I. angolano, Nome Completo, NIF (opcional no ato), E-mail, Telemóvel e Palavra-Passe (com confirmação).
* **Regra importante:** O B.I. e o E-mail são **únicos**. Contas eliminadas por motivo de revogação exigem um novo registo, que nasce com o estado `Pendente` de homologação.

### 4.3. Página de Redefinição de Palavra-Passe (`/#reset-password`)
* **Objectivo:** Permitir ao utilizador recuperar o acesso à sua conta por verificação de dados de identificação civil ou ligação segura por e-mail.

---

## 5. ÁREA DO CIDADÃO — EXPLICAÇÃO DETALHADA POR PÁGINA

### 5.1. Painel Principal do Cidadão (`/#home`)
* **Objectivo:** Central de comando que consolida as notificações pendentes, certidões recebidas e o estado legal da sua identidade.
* **Quem pode utilizar:** O cidadão autenticado.
* **Principais funcionalidades:**  
  * Resumo executivo em tempo real de correspondências não lidas e alertas SOS.  
  * **Indicador de Homologação Civil:** Apresentado no cabeçalho:
    * 🟢 **Verificado / Ativo:** A conta está homologada e os ofícios têm força executiva.
    * 🟡 **Pendente / Em Correção:** A conta está a ser inspecionada pela Administração.
    * 🔴 **Bloqueada / Revogada:** Acesso suspenso por irregularidade cadastral.
* **Botões e funções:**  
  * `[ Aceder ao Correio ]` / `[ Abrir Pasta Digital ]` — Navegação rápida para as tarefas prioritárias.

### 5.2. Correio Digital (`/#correspondencias`)
* **Objectivo:** Enviar requerimentos para órgãos públicos, receber ofícios do Estado e gerir a cadeia de custódia com valor legal.
* **Quem pode utilizar:** Cidadão autenticado.
* **Principais funcionalidades:**  
  * Filtros de caixas: **Recebidas**, **Enviadas**, **Urgentes**, **Arquivadas** e **Lixeira**.
  * **Detalhe de Ofício (`MessageDetail`)**: Exibe o texto formal, carimbo temporal, **Número de Protocolo (`CDA-xxxxxx`)**, QR Code verificável e a **Linha de Vida do Protocolo** (os estados por onde a mensagem passou: `Enviada` → `Recebida` → `Visualizada` → `Respondida`).
* **Botões e funções:**  
  * `[ Nova Mensagem ]` — Abre o formulário de expedição oficial.
  * `[ Responder ]` — Emite uma resposta que vincula automaticamente o novo ofício ao protocolo de origem.
  * `[ Assistente IA ]` — Abre o analisador inteligente de documentos no modal.
  * `[ Arquivar ]` / `[ Eliminar ]` — Gere a retenção dos ofícios.

### 5.3. Documentos e Certificados Digitais (`/#documentos`)
* **Objectivo:** Repositório permanente de certidões, laudos, declarações fiscais e títulos escolares do cidadão.
* **Como utilizar:** Consulte os seus documentos na lista principal, verifique a data de validade e faça o download do PDF autenticado com QR Code em 1 clique.

### 5.4. Pasta Digital do Cidadão (`/#pasta-digital`)
* **Objectivo:** Organizar os processos e certidões por instituição pública emissora (ex.: *Dossier AGT*, *Dossier MINED*, *Dossier EPAL*).
* **Funcionalidade-chave:** Permite consultar o histórico consolidado de relacionamento civil entre o cidadão e cada ministério ou empresa estatal.

### 5.5. QR Code Segura & Carteira Digital (`/#qr-code`)
* **Objectivo:** Substituir a apresentação de papel em repartições públicas ou verificar se um documento oficial é legítimo.
* **Botões e funções:**  
  * `[ O Meu QR Code ]` — Apresenta no ecrã o código QR com os dados do cidadão e carimbo de autenticidade.
  * `[ Ler QR Code ]` — Abre a câmara do telemóvel para verificar assinaturas e protocolos oficiais do Estado angolano.

### 5.6. Histórico de Atividades e Transações (`/#historico`)
* **Objectivo:** Garantir transparência militar ao titular através de uma trilha cronológica imutável.
* **O que mostra:** Cada início de sessão, leitura de carta, certidão visualizada ou simulação de pagamento realizada pelo seu perfil, acompanhada de data, hora e endereço IP.

### 5.7. Central de Notificações (`/#notificacoes`)
* **Objectivo:** Avisos urgentes do Governo, alertas de manutenção da ENDE/EPAL ou campanhas do MINSA.
* **Funcionalidade:** Sinaliza visualmente avisos não lidos e permite marcar todos como lidos em bloco.

### 5.8. Círculo de Confiança & Rede de Emergência (`/#contactos`)
* **Objectivo:** Gerir até 5 familiares ou vizinhos de confiança e acionar emergências.
* **Funcionalidade SOS:** Ao clicar em **[ Acionar SOS de Emergência ]**, o sistema transmite instantaneamente a sua localização GPS para a Polícia Nacional, Bombeiros, INEMA e para a sua rede de confiança na tabela `public.emergency_alerts`.

### 5.9. Pagamentos & Taxas de Serviço (`/#pagamentos`)
* **Objectivo:** Permite simular e testar pagamentos de emolumentos, multas e custas judiciais emitidos pelas instituições.
* **Selo de Transparência:** A página exibe obrigatoriamente o aviso:  
  `«Integração com o gateway prevista para depois da validação do projeto pelo INAPEM.»`  
  *O utilizador pode testar o fluxo de Multicaixa Express ou Referência ATM sem risco de cobrança financeira real nesta fase.*

### 5.10. Videoatendimento Institucional (`/#video-atendimento`)
* **Objectivo:** Realizar consultas e reuniões por vídeo em salas seguras **Jitsi Meet** agendadas pelo Estado.
* **Regra de Soberania:** O cidadão pode solicitar o atendimento por vídeo vinculando o pedido a um ofício, **mas o agendamento formal e a criação da sala virtual é privilégio exclusivo de funcionários de instituições públicas**.

### 5.11. Meu Perfil & Segurança (`/#perfil`)
* **Objectivo:** Gerir as credenciais da conta, atualizar o número de telemóvel registado, morada residencial e e-mail de recuperação.
* **Segurança e Privacidade:** Permite ativar biometria facial, assinar PIN de segurança 2FA, alternar temas (Claro/Escuro) e revogar sessões abertas em outros computadores.

---

## 6. ÁREA DAS INSTITUIÇÕES PÚBLICAS E SETORES
A plataforma integra os **22 Setores da República de Angola** definidos na **PARTE I** com cartas de serviços completas em `src/constants/catalogoInstituicoes.ts`:

```
==========================================================================================
                      OS 22 SETORES DA REPÚBLICA E CARTA DE SERVIÇOS
==========================================================================================
 1. INAPEM         — Certificados MPME à distância (~3 dias), linhas de crédito, Meu Gestor e incubação TWENDY.
 2. MINSA          — Consultas, exames, receitas digitais, lembretes de vacinas e alertas epidemiológicos.
 3. Hospitais      — Altas médicas, marcação de cirurgia, filas, teleconsulta e prontuário do paciente.
 4. EPAL (Águas)   — Faturas digitais, aviso de corte/manutenção, fugas de água, ligações e pagamentos.
 5. ENDE (Energia) — Faturas, interrupções programadas, religação, pedidos técnicos e consumo.
 6. Conservatórias — Certidões civis autenticadas, agendamento de atendimento e renovações.
 7. Tribunais / TS — Citações, notificações judiciais, jurisprudência do Tribunal Supremo e custas.
 8. Polícia / PN   — Convocações, denúncias, perda de documentos e agendamentos.
 9. SME            — Renovação de vistos, agendamentos, estado do processo e notificações.
10. AGT            — Impostos (IPU, IAC, IVA), declarações, certidões fiscais e multas com assinatura digital.
11. INSS           — Declarações de descontos, pensões, subsídios e atualização cadastral.
12. INE            — Inquéritos (Censo 2024 / RGPH), questionários digitais e estatísticas.
13. Ensino/MINED   — Matrículas, propinas, certificados escolares e diplomas digitais.
14. Bancos / BNA   — Contratos de crédito, avisos bancários e Provedoria do Cliente Bancário BNA.
15. Seguradoras    — Apólices, regulação de sinistros e reembolsos.
16. Telecom/INACOM — Africell, Unitel e Movicel: Faturas, portabilidade e reclamações reguladas (Linha 15555).
17. Privadas       — Substituição de atendimento presencial, recursos humanos e contratos.
18. Municípios     — Editais, licenciamentos, obras e orçamento participativo.
19. Bombeiros      — Alertas de catástrofes, evacuações e campanhas preventivas.
20. SOS / CISP     — Sistema Nacional de Emergência: gestão integrada de despacho de emergência.
21. Distribuição   — Rastreio de entregas e prova de entrega com assinatura eletrónica.
22. ONGs           — Convocatórias, eventos, donativos, comunicação com membros e gestão documental.
==========================================================================================
```

### 6.1. Painel Institucional (`/institucional#/home`)
* Apresenta métricas da instituição ativa, tempo médio de despacho e indicadores de cidadãos atendidos.

### 6.2. Correio Institucional (`/institucional#/correspondencias`)
* **Funcionalidade:** Permite receber requerimentos do cidadão com B.I. verificado, consultar anexos e emitir **Respostas Oficiais** que assinam o protocolo nacional e atualizam a linha do tempo do requerente.

### 6.3. Validador Institucional QR Code (`/institucional#/inst-qrcode`)
* Permite digitalizar o QR Code apresentado pelo cidadão em repartições públicas para comprovar a autenticidade jurídica de certidões e ofícios na base central do Estado em segundos.

### 6.4. Assistente IA & Base de Conhecimento Self-Service (`/institucional#/inst-ai-assistant`)
* **CRUD de Base de Conhecimento (`InstKbSelfService`):** O funcionário autorizado gere a tabela `public.kb_fontes_instituicao`. Os regulamentos, leis ou FAQs cadastrados são isolados pela sigla (RLS) e alimentam em tempo real a inteligência artificial do portal cidadão.

### 6.5. Cobranças & Gateway (`/institucional#/inst-pagamentos`)
* Gestão de ordens de pagamento e emolumentos estatais por B.I. de cidadão em modo simulação.

### 6.6. Equipa Institucional (`/institucional#/gov-contatos`)
* Cadastro, controlo de permissões operacionais e revogação de acessos dos colaboradores da instituição.

### 6.7. Perfil Institucional & Credenciais (`/institucional#/perfil`)
* Permite a edição direta do nome do operador, função, departamento e contactos no painel.

---

## 7. ÁREA DE ADMINISTRAÇÃO CENTRAL — SOC (`/admin#/gov-dashboard`)

### 7.1. Painel Principal SOC (`/admin#/gov-dashboard`)
* Mapa de telemetria nacional com tráfego por província, saúde das instituições federadas e ativação de alertas.

### 7.2. Interoperabilidade Institucional (`/admin#/gov-interoperabilidade`)
* **Testar Conexão:** Botão de verificação ao vivo da latência relacional na base Supabase.
* **Gestão de Adesões (`solicitacoes_registo`):** Aprovar ou rejeitar pedidos de entrada de novas instituições.
* **Expedientes Centrais:** Expedir ofícios e avisos em nome do Sistema Central (`CDA`).

### 7.3. Supervisão de Correio Digital (`/admin#/gov-correspondencias`)
* Inspecionar, auditar e pesquisar qualquer mensagem trafegada na República por número de protocolo.

### 7.4. Gestão de Cidadãos / Homologação B.I. (`/admin#/gov-contatos`)
* **Auditoria Documental:** Inspecionar ficheiros civis do registo (`urlSelfie`, `urlFrente`, `urlVerso`).
* **Homologação Civil:** Clicar em **[ Aprovar Identidade Civil ]** para criar a conta na nuvem Supabase (`provisionCloudAccount`).
* **Revogação/Eliminação:** Suspender ou remover registos em caso de irregularidade.

### 7.5. Relatórios Estatísticos (`/admin#/gov-relatorio`)
* Geração e exportação oficial em formatos **PDF** e **CSV** do tráfego e conformidade nacional.

### 7.6. IA Governamental (`/admin#/gov-ia`)
* Telemetria ao vivo dos motores Google Gemini AI Studio (`v1beta`) e Groq SDK (consumo, quotas, latência e ambiente de teste/sandbox regulamentar).

### 7.7. Auditoria de Segurança (`/admin#/gov-seguranca`)
* Trilha imutável dos **5.806+ registos** da tabela `public.audit_logs`.

### 7.8. Perfil de Administrador (`/admin#/gov-perfil`)
* Edição direta de credenciais administrativas e palavra-passe na nuvem.

---

## 8. FUNCIONALIDADES CRUD EM DETALHE COM EXEMPLOS PRÁTICOS

Nesta secção demonstramos as **5 operações CRUD fundamentais da plataforma**, detalhando como criar, consultar, atualizar e eliminar registos, com exemplos práticos no formato:  
`Acção → Dados introduzidos → Botão utilizado → Resultado esperado`

---

### 8.1. CRUD 1: Gestão de Correspondências e Ofícios (`correspondencias`)

```
==========================================================================================
                     CRUD COMPLETO: EXPEDIÇÃO DE OFÍCIO OFICIAL
==========================================================================================
```

#### CRIAR (Expedir Novo Requerimento)
* **Como fazer:** Aceda ao separador **Correio** e prima **Nova Mensagem**. Preencha a instituição destinatária, assunto, teor, anexe certidões de suporte e escolha a prioridade.
* **Exemplo Prático:**
  * **Acção:** Enviar solicitação fiscal para a Administração Geral Tributária.
  * **Dados introduzidos:**  
    * Destinatário: `AGT — Administração Geral Tributária`  
    * Assunto: `Reclamação de Liquidação do Imposto Predial Urbano`  
    * Conteúdo: `Solicito a revisão do aviso de cobrança n.º IPU/2026/099 por erro na avaliação patrimonial...`  
    * Prioridade: `Normal`
  * **Botão utilizado:** Clique em **`[ Enviar Expediente Oficial ]`**.
  * **Resultado esperado:** O modal fecha-se, a mensagem é salva na tabela `public.messages`, um **Número de Protocolo Oficial** (ex.: `AGT-2026-BGO-0014587`) é gerado e o ofício aparece na **Caixa de Saída** com o estado `Enviada`.

#### CONSULTAR (Acompanhar Ofício e Linha do Tempo)
* **Como fazer:** Na sua **Caixa de Saída** ou **Caixa de Entrada**, clique na linha da mensagem desejada para abrir os detalhes do protocolo.
* **Exemplo Prático:**
  * **Acção:** Consultar os dados oficiais e verificar se a AGT já leu a reclamação.
  * **Dados introduzidos:** Selecionar na listagem o ofício `Reclamação de Liquidação do Imposto Predial Urbano`.
  * **Botão utilizado:** Clique sobre o card da correspondência na tabela.
  * **Resultado esperado:** Abre-se a página **Detalhe de Ofício (`MessageDetail`)**, apresentando o **QR Code do Protocolo**, o carimbo temporal de expedição e a **Linha de Vida Governamental** (mostrando visualmente os passos: `1. Enviada por Remetente` → `2. Recebida na Caixa AGT` → `3. Visualizada por Destinatário`).

#### ACTUALIZAR (Emitir Resposta Oficial / Marcar como Lida)
* **Como fazer:** Quando uma instituição pública recebe uma carta na **Caixa de Entrada**, pode emitir um despacho que se vincula ao protocolo original.
* **Exemplo Prático:**
  * **Acção:** O operador da AGT responde oficialmente à reclamação do cidadão.
  * **Dados introduzidos:**  
    * Corpo da resposta: `Após revisão patrimonial, deferimos a reclamação e retificamos a liquidação do IPU para o exercício 2026.`
  * **Botão utilizado:** Clique em **`[ Responder ]`** no rodapé do ofício e, após escrever, prima **`[ Enviar Resposta Criptográfica ]`**.
  * **Resultado esperado:** O sistema emite uma notificação em tempo real ao cidadão, grava a resposta no histórico da tabela `message_state_history` e atualiza o estado geral do ofício para **`Respondida`**.

#### ELIMINAR / ARQUIVAR (Retenção e Limpeza da Caixa)
* **Como fazer:** Para manter a caixa limpa sem violar a lei de custódia, o utilizador pode **Arquivar** ou **Eliminar** (movendo para a Lixeira) mensagens obsoletas.
* **Exemplo Prático:**
  * **Acção:** Remover um aviso antigo já respondido.
  * **Dados introduzidos:** Selecionar a mensagem na listagem.
  * **Botão utilizado:** Clique no ícone **`[ Eliminar / Lixeira ]`** (ícone de balde do lixo).
  * **Resultado esperado:** O sistema apresenta um modal de confirmação. Ao confirmar, o ofício desaparece da lista principal e transita para o separador **Lixeira / Arquivo**.

---

### 8.2. CRUD 2: Círculo de Confiança e Contactos de Emergência (`contactos`)

```
==========================================================================================
              CRUD COMPLETO: CONTACTOS CIVIS E REDE DE EMERGÊNCIA (SOS)
==========================================================================================
```

#### CRIAR (Adicionar Contacto de Emergência)
* **Como fazer:** Aceda a **Contactos** (`#/contactos`) e prima o botão para adicionar uma pessoa de confiança à sua rede de contingência do Estado.
* **Exemplo Prático:**
  * **Acção:** Cadastrar um familiar para ser acionado automaticamente pelo Botão SOS.
  * **Dados introduzidos:**  
    * Nome Completo: `Maria Baptista Galhardo`  
    * Número do B.I. (opcional): `009998888LA012`  
    * Relação: `Familiar (Irmã)`  
    * Telefone / WhatsApp: `+244 923 111 222`
  * **Botão utilizado:** Clique em **`[ Guardar Contacto de Emergência ]`**.
  * **Resultado esperado:** O contacto é validado, armazenado em `public.contacts` e exibido imediatamente no cartão principal do **Círculo de Confiança**.

#### CONSULTAR (Listar e Pesquisar Rede de Confiança)
* **Como fazer:** A página **Contactos** exibe a tabela dos seus contactos registados (até 5 titulares), com distintivo de verificação e atalhos rápidos de chamada.
* **Exemplo Prático:**
  * **Acção:** Pesquisar pelo número ou nome da sua irmã.
  * **Dados introduzidos:** Digite `Maria Baptista` na caixa de pesquisa.
  * **Botão utilizado:** Digitação na barra de pesquisa.
  * **Resultado esperado:** A tabela filtra instantaneamente os contactos, mostrando o registo de *Maria Baptista Galhardo* com o estado `Ativo`.

#### ACTUALIZAR (Editar Relação ou Número de Telemóvel)
* **Como fazer:** Na lista do seu Círculo de Confiança, prima o ícone de edição associado a um contacto existente para corrigir os seus dados.
* **Exemplo Prático:**
  * **Acção:** Atualizar o número de telemóvel registado da sua irmã.
  * **Dados introduzidos:** Alterar o campo Telefone para `+244 923 111 333`.
  * **Botão utilizado:** Clique no botão **`[ Editar ]`** (ícone de lápis) do cartão e prima **`[ Atualizar Contacto ]`**.
  * **Resultado esperado:** O número do contacto é atualizado na base de dados relacional e exibido com a nova numeração.

#### ELIMINAR (Remover Contacto de Emergência)
* **Como fazer:** Selecione um contacto obsoleto na lista para o desvincular da sua rede de alerta SOS.
* **Exemplo Prático:**
  * **Acção:** Excluir um contacto antigo da rede de contingência.
  * **Dados introduzidos:** Selecionar a linha do contacto `Maria Baptista Galhardo`.
  * **Botão utilizado:** Clique em **`[ Eliminar Contacto ]`** (ícone vermelho de balde do lixo) e prima **`[ Confirmar Remoção ]`** no modal de alerta.
  * **Resultado esperado:** O contacto é apagado da tabela `public.contacts` e deixa de constar nos alertas automáticos do **Botão SOS**.

---

### 8.3. CRUD 3: Base de Conhecimento Institucional Self-Service (`inst-ai-assistant`)

```
==========================================================================================
              CRUD COMPLETO: BASE DE CONHECIMENTO INSTITUCIONAL (KB SELF-SERVICE)
==========================================================================================
```

#### CRIAR (Adicionar Nova Norma, Lei ou FAQ à IA)
* **Como fazer:** Na área Institucional, aceda a **Assistente IA** (`/institucional#/inst-ai-assistant`), clique no separador **Base de Conhecimento** e prima **Adicionar Norma / Regulamento**.
* **Exemplo Prático:**
  * **Acção:** O operador do **INAPEM** cadastra uma nova regra oficial sobre a certificação MPME para alimentar a IA pública.
  * **Dados introduzidos:**  
    * Título: `Regulamento do Certificado Digital MPME 2026`  
    * Tipo de Fonte: `Regulamento / Lei`  
    * URL da Fonte Oficial: `https://www.inapem.gov.ao/certificacao-mpme-2026`  
    * Texto / Conteúdo: `O Certificado MPME é o título oficial que classifica as Micro, Pequenas e Médias Empresas em Angola. A submissão à distância através da plataforma emite o título em aproximadamente 3 dias úteis...`
  * **Botão utilizado:** Clique em **`[ Adicionar Fonte à KB ]`**.
  * **Resultado esperado:** O registo é validado (título ≥ 8 caracteres, texto ≥ 200 caracteres), inserido na tabela `public.kb_fontes_instituicao` vinculado à sigla `INAPEM` por RLS e fica visível na listagem de fontes ativas.

#### CONSULTAR (Inspecionar Fontes de Conhecimento da Sigla)
* **Como fazer:** No painel da **Base de Conhecimento**, a listagem exibe todos os regulamentos cadastrados pela sua instituição, com indicador de estado (`Ativo` / `Inativo`), data de atualização e URL oficial.
* **Exemplo Prático:**
  * **Acção:** Verificar quantas normas o INAPEM possui cadastradas no sistema.
  * **Dados introduzidos:** Consultar o cartão de estatísticas e a tabela de fontes.
  * **Botão utilizado:** Clique na barra de pesquisa da KB e digite `Certificado MPME`.
  * **Resultado esperado:** O sistema exibe o cartão da norma `Regulamento do Certificado Digital MPME 2026` com o selo verde `Ativo`.

#### ACTUALIZAR (Ativar / Desativar Norma na Memória da IA)
* **Como fazer:** Se uma circular legislativa for revogada ou alterada, o operador institucional pode suspender a norma ou editar o seu texto para impedir que a IA responda com informações desatualizadas.
* **Exemplo Prático:**
  * **Acção:** Desativar temporariamente uma norma de financiamento em revisão.
  * **Dados introduzidos:** Alternar o interruptor de estado `Ativo` de `Sim` para `Não`.
  * **Botão utilizado:** Clique no **Interruptor de Estado (`Toggle Ativo/Inativo`)** na linha da norma.
  * **Resultado esperado:** O campo `ativo` é atualizado para `false` na base Supabase. Na consulta seguinte do cidadão, o servidor `/api/chat` exclui imediatamente essa fonte do contexto da IA.

#### ELIMINAR (Remover Norma da Base de Conhecimento)
* **Como fazer:** Exclua definitivamente documentos obsoletos do repositório relacional.
* **Exemplo Prático:**
  * **Acção:** Apagar uma norma revogada em definitivo da tabela de conhecimento.
  * **Dados introduzidos:** Selecionar o registo da norma legislativa obsoleto.
  * **Botão utilizado:** Clique em **`[ Eliminar Fonte ]`** (ícone de lixo) e prima **`[ Confirmar Exclusão ]`**.
  * **Resultado esperado:** O registo é removido da tabela `public.kb_fontes_instituicao` por permissão RLS e o indicador de total de fontes diminui em 1 unidade.

---

### 8.4. CRUD 4: Gestão e Homologação de Cidadãos pelo Admin (`gov-contatos`)

```
==========================================================================================
               CRUD COMPLETO: AUDITORIA E HOMOLOGAÇÃO CIVIL PELO SOC (ADMIN)
==========================================================================================
```

#### CRIAR / APROVAR (Homologação de Identidade Civil na Nuvem)
* **Como fazer:** O Administrador Central (SOC) acede a **Cidadãos** (`/admin#/gov-contatos`), audita os ficheiros enviados no registo e emite a ativação civil na nuvem.
* **Exemplo Prático:**
  * **Acção:** Homologar o registo civil de um novo requerente angolano.
  * **Dados introduzidos:**  
    * Selecionar cidadão com B.I.: `009991332LA018` (*Ana Baptista*)  
    * Inspecionar imagens do registo: `urlSelfie`, `urlFrente` e `urlVerso` do B.I.
  * **Botão utilizado:** Clique em **`[ Aprovar e Homologar Cidadão ]`** no cartão de inspeção do requerente.
  * **Resultado esperado:** O sistema executa o serviço `provisionCloudAccount`, cria uma conta segura autenticada no Supabase Auth e atualiza o estado civil da conta para **`Verificado`** na tabela `public.profiles`.

#### CONSULTAR (Pesquisar Cidadãos Registados na República)
* **Como fazer:** O painel de gestão de cidadãos exibe uma tabela paginada e pesquisável com todos os titulares da plataforma.
* **Exemplo Prático:**
  * **Acção:** Consultar o nível de homologação civil do cidadão *Edlasio Galhardo*.
  * **Dados introduzidos:** Digitar na caixa de pesquisa por B.I. `009874562LA041` ou nome `Edlasio`.
  * **Botão utilizado:** Digitação direta na barra de pesquisa.
  * **Resultado esperado:** A listagem exibe a ficha civil completa com o selo verde `Totalmente Verificado`, número de telemóvel e histórico de acessos.

#### ACTUALIZAR (Corrigir Estatuto de Segurança ou Suspender Conta)
* **Como fazer:** O administrador pode aplicar bloqueios de salvaguarda nacional em contas que apresentem atividade anómala.
* **Exemplo Prático:**
  * **Acção:** Suspender temporariamente o acesso biométrico de uma conta em auditoria judicial.
  * **Dados introduzidos:** Alterar o estado de segurança da conta selecionada para `Acesso Biométrico Suspenso / Chaves Bloqueadas`.
  * **Botão utilizado:** Clique em **`[ Alterar Estado / Suspender Conta ]`**.
  * **Resultado esperado:** A coluna de verificação em `profiles` é atualizada e o cidadão recebe um aviso de restrição administrativa ao tentar iniciar sessão.

#### ELIMINAR / REVOGAR (Exclusão Administrativa de Registo Civil)
* **Como fazer:** Em cumprimento de decisão soberana ou revogação por fraude, o administrador pode eliminar o cadastro de um titular na base central.
* **Exemplo Prático:**
  * **Acção:** Revogar o registo civil de um cadastro irregular.
  * **Dados introduzidos:** Selecionar a conta com B.I. alvo da medida administrativa.
  * **Botão utilizado:** Clique em **`[ Eliminar / Revogar Registo ]`** e confirme no modal vermelho de segurança soberana.
  * **Resultado esperado:** A conta é removida das tabelas `profiles`, `user_requests` e `notifications`. Uma tentativa posterior de login desse B.I. é interceptada em `App.tsx` com o aviso:  
    `«Este registo foi ELIMINADO pela Área de Administração. Para voltar a usar a plataforma, efectue um NOVO registo — a conta só ficará activa após nova aprovação...»`

---

### 8.5. CRUD 5: Edição de Perfil na Página Conta (Cidadão, Instituição e Admin)

```
==========================================================================================
                 CRUD COMPLETO: EDIÇÃO EM LINHA DA CONTA E CREDENCIAIS
==========================================================================================
```

#### CONSULTAR E ACTUALIZAR (Edição Direta e Sincronização na Nuvem)
* **Como fazer:** Em qualquer um dos 3 papéis de acesso (Cidadão em `#/perfil`, Instituição em `/institucional#/perfil` ou Admin em `/admin#/gov-perfil`), a secção **Informações da Conta** permite edição direta com 1 clique.
* **Exemplo Prático — Cidadão:**
  * **Acção:** Atualizar o número de telemóvel registado e a morada residencial do cidadão no sistema central.
  * **Dados introduzidos:**  
    * Telemóvel Registado: `+244 923 000 111`  
    * Morada Residencial: `Centralidade do Kilamba, Bloco T22, Luanda`
  * **Botão utilizado:** Clique em **`[ Editar Perfil ]`**, preencha os novos dados nas caixas de texto e prima **`[ Gravar Alterações ]`** (ou `[ Guardar ]`).
  * **Resultado esperado:** O serviço `syncProfileToCloud` emite um comando SQL `UPDATE profiles SET phone = ..., morada = ... WHERE bi = bi` na nuvem Supabase, fecha os campos de edição e exibe o aviso oficial:  
    `🟢 «Perfil atualizado com sucesso! As suas informações pessoais foram guardadas e sincronizadas no sistema central.»`
* **Exemplo Prático — Instituição / Admin:**
  * **Acção:** O Administrador do Estado altera o seu nome operacional na conta central.
  * **Dados introduzidos:** Nome Completo: `Carlos Afonso Alberto`
  * **Botão utilizado:** Clique em **`[ Editar Perfil ]`** em `/admin#/gov-perfil`, insira o novo nome e prima **`[ Gravar ]`**.
  * **Resultado esperado:** O sistema atualiza em tempo real o estado de sessão (`sessionStore.ts`) e grava o novo nome na base de dados, atualizando instantaneamente o cabeçalho e os ofícios administrativos expedidos.

---

## 9. ASSISTENTE INTELIGENTE POR IA & ACESSIBILIDADE POR COMANDOS DE VOZ
O Correio Digital Angola integra um **Assistente Inteligente Transversal** disponível no botão de ícone de robô no canto inferior direito de **100% das páginas**:

```
==========================================================================================
                    FUNCIONALIDADES AVANÇADAS DA INTELIGÊNCIA ARTIFICIAL
==========================================================================================
```

### 9.1. Análise, Explicação e Redação de Ofícios (`api/index.ts` + Gemini v1beta)
* **Explicação de Documentos (`explain`):** Abra qualquer ofício na sua caixa de correio e peça à IA: *"Explique esta notificação em linguagem simples"*. A IA remove a terminologia burocrática e indica os seus direitos e deveres em linguagem acessível.
* **Orientação de Prazos (`urgency` / `passos`):** Peça: *"Quais são os prazos e passos a seguir?"*. A IA analisa a carta e elenca as etapas obrigatórias.
* **Geração de Minutas e Rascunhos (`rascunho`):** Escolha no menu da IA uma das 4 minutas automáticas:
  1. *Confirmação de receção*
  2. *Pedido de esclarecimentos*
  3. *Manifestação de intenção de recurso*
  4. *Pedido de prorrogação de prazo*
  * O texto gerado já inclui a referência correta do ofício e fica pronto para a sua revisão.

### 9.2. Suporte Multilingue e Línguas Nacionais Angolanas
* **Tradução Fiel:** A IA traduz qualquer carta para Português simples (`pt-simples`), Inglês (`en`), Francês (`fr`) e para **5 Línguas Nacionais de Angola**:
  * **Umbundu** (`umbundu`) — *«Ukombe uwa weya ko Correio Digital Angola...»*
  * **Kimbundu** (`kimbundu`) — *«Uayiza kiambote ko Correio Digital Angola...»*
  * **Kikongo** (`kikongo`) — *«Tukayidi kiambote o Correio Digital Angola...»*
  * **Cokwe** (`cokwe`) — *«Tambulenu hano tawa ko Correio Digital Angola...»*
  * **Kwanyama** (`kwanyama`) — *«Ouye muwa ko Correio Digital Angola...»*
* **Honestidade por Construção:** Se um documento técnico complexo não puder ser traduzido com exatidão gramatical para um dialeto, a plataforma **admite com honestidade** em vez de alucinar palavras, oferecendo o texto em Português simples.

### 9.3. Narração de Página por Síntese de Voz (`voicePresentations.ts`)
* Clique no botão **`[ Apresentações Disponíveis ]`** no chat da IA para ouvir o resumo oficial em voz alta explicando o propósito e funcionamento exato da página em que se encontra. Estão catalogadas narrações oficiais para **todas as 32 páginas da plataforma**.

### 9.4. Navegação por Comandos de Voz (`Web Speech API`)
* Cidadãos com baixa literacia digital ou mobilidade reduzida podem navegar por microfone sem tocar na tela.
* **Exemplo Prático de Comando de Voz:**
  * **Acção:** Mudar da página Correio para a Pasta Digital usando apenas a voz.
  * **Dados introduzidos (Fala no Microfone):** Diga em alto e bom som:  
    * *«Ir para pasta digital»* (ou *«Abrir minha pasta»*, *«Mostrar histórico de atividades»*, *«Abre central de notificações»*, *«Mostrar pagamentos»*).
  * **Botão utilizado:** Clique no botão do **Microfone (`Ativar Voz / Escuta`)** no assistente IA.
  * **Resultado esperado:** O assistente transcreve a sua fala, emite uma mensagem de confirmação de segurança e aciona de imediato a navegação para a página solicitada (`#/pasta-digital`).

---

## 10. MENSAGENS DE ERRO E RESOLUÇÃO DE PROBLEMAS COMUNS

| Mensagem ou Erro Exibido | Causa Provável | Procedimento de Resolução |
| :--- | :--- | :--- |
| **`"Perfil guardado apenas neste dispositivo."`** | Falha de ligação temporária à nuvem Supabase ou problemas de rede local. | Verifique a sua conexão de internet. O sistema mantém os seus dados salvos localmente e sincronizará automaticamente assim que a nuvem estiver acessível. |
| **`"Este registo foi ELIMINADO pela Área de Administração..."`** | A sua conta anterior teve o cadastro administrativo revogado pela inspeção governamental. | Deverá efetuar um novo registo na plataforma. A conta nascerá com o estado `Pendente` e será avaliada na próxima sessão de homologação civil. |
| **`"Acesso negado: Por motivos regulamentares de soberania administrativa..."`** | Um utilizador civil (`user`) tentou criar ou agendar uma conferência de Videoatendimento. | O agendamento formal de conferências de vídeo é privilégio exclusivo de operadores de instituições públicas. O cidadão deve aguardar o convite oficial. |
| **`"Por favor, conclua a digitalização biométrica facial antes de avançar."`** | Tentativa de fechar o passo de verificação civil no registo sem realizar a captura biométrica da câmara. | Autorize o acesso à câmara do seu dispositivo e posicione o rosto na moldura para autenticar o perfil. |
| **`"Erro de validação: B.I. ou NIF já cadastrado na plataforma."`** | O número de Bilhete de Identidade ou NIF introduzido no registo já pertence a um utilizador existente. | Verifique se digitou o número corretamente. Se já possuir conta, utilize a opção **Esqueci Palavra-Passe** na tela inicial. |

---

## 11. PERGUNTAS FREQUENTES (FAQ)
1. **Os pagamentos na plataforma cobram dinheiro real à minha conta bancária?**  
   **Não.** Em conformidade com as diretrizes do INAPEM, a secção de pagamentos opera em modo de **Simulação Segura**, sem transações financeiras bancárias reais. O selo oficial exibido na página atesta essa transparência.
2. **Como posso comprovar que enviei uma carta a um Ministério?**  
   Ao enviar qualquer requerimento, o CDA gera um **Número de Protocolo Nacional (`CDA-xxxxxx`)** e um **QR Code**. Pode imprimir ou partilhar esse QR Code, que tem validade de prova criptográfica do Estado.
3. **O que faço se não receber notificações de novas mensagens?**  
   Aceda a **Conta / Perfil (`#/perfil`)**, abra o modal de **Configurações / Preferências** e certifique-se de que os interruptores de **Notificação Push**, **E-mail** e **SMS** estão ativados no separador *Notificações*.
4. **Um funcionário de outra instituição pode ver as minhas mensagens fiscais da AGT?**  
   **Não.** A base de dados relacional utiliza *Row Level Security (RLS)*. Os dados são isolados militarmente pela sigla da instituição e pelo seu Bilhete de Identidade.

---

## 12. BOAS PRÁTICAS DE UTILIZAÇÃO E SEGURANÇA
* **Verifique sempre o URL:** Certifique-se de que se encontra no endereço oficial do Governo angolano:  
  `https://correio-digital-angola-oficial.vercel.app`
* **Não partilhe o seu PIN ou Senha:** Os funcionários do Correio Digital Angola nunca solicitarão a sua palavra-passe por e-mail ou chamada telefónica.
* **Encerrar Sessão em Computadores Públicos:** Se aceder à plataforma num computador partilhado, clique sempre no botão **`[ Sair do Canal / Logout ]`** na barra lateral ao terminar as suas tarefas.

---
*República de Angola — Correio Digital Angola (CDA — 2026)*  
*Modernização, Soberania e Desburocratização ao Serviço do Cidadão.*
