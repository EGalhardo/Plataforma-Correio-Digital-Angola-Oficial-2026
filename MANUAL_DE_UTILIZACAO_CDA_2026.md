# MANUAL DE UTILIZAÇÃO OFICIAL — CORREIO DIGITAL ANGOLA (CDA 2026)
**Plataforma Oficial de Correspondência, Documentação e Atendimento Digital da República de Angola**  
**Versão do Manual:** 2.0 (Agosto de 2026)  
**Destinatários:** Cidadãos, Instituições Públicas, Empresas Privadas, Organizações e Administradores do Sistema.

---

## ÍNDICE GERAL
1. [Introdução & Filosofia da Plataforma](#1-introdução--filosofia-da-plataforma)
2. [Acesso, Autenticação & Perfis de Utilizador](#2-acesso-autenticação--perfis-de-utilizador)
3. [Guia do Cidadão (Como usar todas as funcionalidades)](#3-guia-do-cidadão)
4. [Guia das Instituições Públicas e Setores (Os 22 Setores)](#4-guia-das-instituições-públicas-e-setores)
5. [Guia da Administração Central / SOC (Supervisão Governamental)](#5-guia-da-administração-central--soc)
6. [Assistente Inteligente por IA & Comandos de Voz](#6-assistente-inteligente-por-ia--comandos-de-voz)
7. [Segurança, Privacidade e Suporte](#7-segurança-privacidade-e-suporte)

---

## 1. INTRODUÇÃO & FILOSOFIA DA PLATAFORMA
O **Correio Digital Angola (CDA)** é a plataforma nacional unificada concebida para modernizar, desburocratizar e aproximar a Administração Pública, as empresas e a cidadania. 

A plataforma substitui grande parte das deslocações presenciais a repartições por **correspondência digital encriptada, autenticada e com validade jurídica**, oferecendo:
* **Soberania e Isolamento de Dados:** Proteção por *Row Level Security (RLS)* no banco de dados, garantindo que nenhum cidadão tem acesso a correspondência ou documentos de terceiros.
* **Protocolo Digital Único:** Todo o requerimento, ofício ou certidão emite um código de rastreabilidade (ex.: `CDA-2026-001458`) e um **código QR verificável**.
* **Inclusão Digital por Inteligência Artificial:** Assistência contínua por IA capaz de explicar documentos, gerar minutas e interagir por **síntese de voz** em Português e nas **Línguas Nacionais Angolanas** (*Umbundu, Kimbundu, Kikongo, Cokwe, Kwanyama*).

---

## 2. ACESSO, AUTENTICAÇÃO & PERFIS DE UTILIZADOR
O CDA está organizado em três grandes portas de entrada com URLs diferenciadas e seguras:

| Perfil de Acesso | Endereço WEB / Hash | Função Principal |
| :--- | :--- | :--- |
| **Cidadão (`user`)** | `https://.../#/home` | Envio de requerimentos, pasta digital, SOS, pagamentos e validador QR. |
| **Instituição (`institution`)** | `https://.../institucional#/home` | Receção e despacho de ofícios, agendamento de vídeo, gestão de Base de Conhecimento (KB). |
| **Administração (`admin`)** | `https://.../admin#/gov-dashboard` | Supervisão nacional, SOC Segurança, aprovação de contas e telemetria de IA. |

### 2.1. Métodos de Autenticação Suportados
* **Palavra-passe Segura:** Autenticação padrão de alta robustez conectada à nuvem Supabase.
* **Biometria Facial:** Autenticação facial para acesso rápido em dispositivos autorizados.
* **Autenticação em 2 Fatores (2FA) & PIN Governamental:** Proteção adicional para operações financeiras ou sigilosas.
* **Recuperação de Conta por E-mail:** Envio de link seguro oficial para redefinição de palavra-passe.

---

## 3. GUIA DO CIDADÃO

### 3.1. Registo e Homologação de Identidade
1. Na página inicial, clique no separador **Cidadão** e prima **Registar**.
2. Preencha o seu **Número de Bilhete de Identidade (B.I.)**, Nome Completo, Número de Identificação Fiscal (NIF) e defina uma palavra-passe.
3. O sistema verificará os seus dados na base civil. Após a homologação, a sua conta assumirá o estado **Verificado**.

### 3.2. Painel Principal (`#/home`)
* O **Painel** apresenta o resumo executivo da sua vida digital: o total de mensagens não lidas, certidões na pasta digital e alertas de emergência.
* **Indicador de Estado da Conta:** No cabeçalho, um indicador de cor sinaliza a situação do seu registo (🟢 *Verificado/Ativo*, 🟡 *Pendente/Bloqueado*, 🔴 *Revogado*).

### 3.3. Correio Digital (`#/correspondencias`)
1. **Enviar Nova Mensagem / Requerimento:**
   * Clique no botão **Nova Mensagem**.
   * Selecione a **Instituição Destinatária** (ex.: *AGT — Administração Geral Tributária* ou *MINED — Ministério da Educação*).
   * Indique o **Assunto** e redija o corpo da mensagem.
   * Pode anexar ficheiros em PDF, DOCX ou JPG (até 10 MB).
   * Escolha a **Prioridade** (*Normal, Alta ou Urgente*).
   * Ao premir **Enviar**, o sistema emite instantaneamente um **Número de Protocolo Oficial** e regista a transição no histórico de segurança.
2. **Acompanhar Estados em Tempo Real:**
   * Cada mensagem exibe carimbos claros de evolução: `Enviada`, `Recebida`, `Lida` e `Respondida`.
3. **Caixas de Entrada, Saída e Arquivo:**
   * Alterne entre **Recebidas**, **Enviadas**, **Urgentes** e **Arquivadas**. O arquivo permite guardar ofícios permanentemente sem poluir a caixa principal.

### 3.4. Documentos e Certificados (`#/documentos`)
* Repositório central para consulta de títulos, laudos médicos, certificados escolares e certidões emitidas pelo Estado.
* Permite descarregar cópias autenticadas, inspecionar a validade e emitir comprovativos de titularidade.

### 3.5. Pasta Digital do Cidadão (`#/pasta-digital`)
* Organiza os seus processos burocráticos por instituição emissora (ex.: *Dossier Fiscal AGT*, *Dossier Escolar MINED*), garantindo acesso rápido em qualquer dispositivo.

### 3.6. Validador QR Code & Carteira Digital (`#/qr-code`)
* **Apresentar Código QR:** Exiba o seu QR Code seguro em repartições para comprovar a sua identidade ou autenticidade de um protocolo sem necessitar de papel.
* **Ler Código QR:** Utilize a câmara do seu dispositivo para ler códigos em documentos do Estado e validar se são legítimos e emitidos pela base central.

### 3.7. Histórico de Atividades (`#/historico`)
* Trilha cronológica imutável que mostra cada início de sessão, leitura de ofício ou documento acedido. Garante total transparência sobre quem e quando acedeu ao seu perfil.

### 3.8. Central de Notificações (`#/notificacoes`)
* Receba alertas em tempo real sobre mudanças de prazos em processos, avisos de vacinação do MINSA ou alertas de corte/manutenção da EPAL e ENDE.

### 3.9. Círculo de Confiança & Rede de Emergência (`#/contactos`)
* **Contactos de Emergência:** Cadastre até 5 familiares ou vizinhos de confiança.
* **Botão SOS (Sistema Nacional de Emergência):** Em caso de acidente ou contingência grave, acione o botão SOS. O sistema envia a sua localização GPS e um aviso simultâneo para a Polícia Nacional, Bombeiros, INEMA e para os seus contactos cadastrados.

### 3.10. Pagamentos & Taxas de Serviço (`#/pagamentos`)
* Permite simular e testar pagamentos de emolumentos, multas e custas judiciais por Multicaixa Express, Referência ATM ou Transferência.
* **Selo de Transparência:** A interface exibe claramente que as operações se encontram em **Modo de Simulação Sem Cobrança Real**, aguardando ativação bancária final em conformidade com o INAPEM.

### 3.11. Videoatendimento Institucional (`#/video-atendimento`)
* Permite aceder a chamadas de vídeo agendadas pelas instituições para conciliação de requerimentos, esclarecimentos de dúvidas ou atendimento à distância por **sala segura Jitsi**.
* *Nota Regulamentar:* O cidadão pode solicitar o atendimento por vídeo vinculando o pedido a um protocolo, mas **o agendamento formal da conferência é competência exclusiva da instituição pública**.

### 3.12. Perfil & Segurança (`#/perfil`)
* Permite atualizar o seu número de telemóvel registado, morada residencial e e-mail de recuperação diretamente na página.
* Permite gerir a sua senha de nuvem, ativar biometria facial, encerrar sessões ativas em outros computadores ou telemóveis e alterar preferências de idioma e notificações.

---

## 4. GUIA DAS INSTITUIÇÕES PÚBLICAS E SETORES
A área institucional (`/institucional#/home`) destina-se a funcionários públicos e gestores de entidades cadastradas nos **22 setores do catálogo nacional**:

### 4.1. Catálogo e Missão dos 22 Setores Integrados
1. **INAPEM:** Certificações digitais MPME à distância (emissão em ~3 dias com QR Code e geolocalização), programas de incentivo, editais e incubação *TWENDY*.
2. **Ministério da Saúde (MINSA):** Marcação de consultas, laudos, receitas digitais, lembretes de vacinação, estatísticas hospitalares e alertas epidemiológicos.
3. **Hospitais:** Consulta de processos clínicos, altas médicas, agendamento de cirurgias, teleconsulta e notificação de familiares.
4. **EPAL (Águas):** Faturas digitais, comunicação de fugas, pedidos de ligação e avisos de corte/manutenção.
5. **ENDE (Energia):** Faturas, interrupções programadas, pedidos técnicos e histórico de consumo.
6. **Conservatórias:** Certidões civis autenticadas, agendamento e renovações.
7. **Tribunais (TS):** Citações, notificações judiciais, jurisprudência do Tribunal Supremo e custas.
8. **Polícia Nacional:** Convocações, denúncias, perda de documentos e agendamentos.
9. **Serviço de Migração e Estrangeiros (SME):** Renovação de vistos, agendamentos e estado do processo.
10. **AGT (Tributária):** Declarações impostas (IPU, IAC, IVA), certidões fiscais e cobranças.
11. **INSS (Segurança Social):** Declarações de descontos, pensões e atualização cadastral.
12. **INE (Estatística):** Questionários digitais, inquéritos (RGPH / Censo 2024) e boletins estatísticos.
13. **Instituições de Ensino:** Matrículas, propinas, certificados escolares e diplomas digitais.
14. **Bancos & BNA:** Contratos de crédito, avisos bancários e Provedoria do Cliente Bancário do BNA.
15. **Seguradoras:** Apólices, regulação de sinistros e reembolsos.
16. **Telecomunicações (INACOM):** Faturas, portabilidade e reclamações reguladas (Linha 15555).
17. **Empresas Privadas:** Substituição de atendimento presencial, recursos humanos e contratos.
18. **Municípios e Governos Provinciais:** Editais, licenciamentos, obras e orçamento participativo.
19. **Bombeiros e Proteção Civil:** Alertas de desastres, evacuações e prevenção.
20. **Sistema Nacional de Emergência (SOS/CISP):** Gestão integrada de despacho de emergência.
21. **Empresas de Distribuição:** Rastreio de entregas e prova de entrega com assinatura eletrónica.
22. **Igrejas, ONGs e Associações:** Convocatórias, gestão documental e comunicados sociais.

### 4.2. Gestão de Correio Institucional (`/institucional#/correspondencias`)
* **Receção de Ofícios:** Consulte requerimentos e solicitações dos cidadãos, com indicação do número de B.I. e protocolo.
* **Emissão de Resposta Oficial:** Ao clicar em **Responder**, redija o despacho oficial e anexe certidões institucionais. O envio atualiza automaticamente o histórico do cidadão para `Respondida`.

### 4.3. Agendamento de Videoatendimento Governamental (`/institucional#/video-atendimento`)
1. No painel de vídeo ou dentro do ofício de um cidadão, preencha o formulário **Agendar Nova Conferência Governamental por Vídeo**.
2. Defina o **Teor / Finalidade da Consulta**, a **Data e Hora** e vincule o **Número de Protocolo**.
3. O sistema cria a sala oficial Jitsi Meet e notifica o cidadão. Na data marcada, ambos clicam em **Entrar no Canal de Atendimento (Jitsi)**.

### 4.4. Validador Institucional QR Code (`/institucional#/inst-qrcode`)
* Permite ao funcionário digitalizar ou digitar códigos de certidões e protocolos apresentados por cidadãos para validar em segundos a sua autenticidade na base de dados central.

### 4.5. Assistente IA & Base de Conhecimento Self-Service (`/institucional#/inst-ai-assistant`)
* **Apoio Operacional:** Pergunte à IA sobre regras de tramitação ou solicite a redação automática de minutas e pareceres.
* **Gestão de Conhecimento (KB):** Os gestores autorizados podem adicionar regulamentos, leis ou FAQs à tabela `public.kb_fontes_instituicao`. As fontes são isoladas pela sigla da instituição (RLS) e alimentam de imediato o conhecimento da IA pública.

### 4.6. Cobranças, DUPLICADO BI & Equipa (`inst-pagamentos` / `gov-contatos`)
* Emitir referências e simular pagamentos de serviços estatais.
* Cadastrar e gerir membros da equipa e operadores autorizados da sua instituição.

---

## 5. GUIA DA ADMINISTRAÇÃO CENTRAL / SOC
O portal administrativo (`/admin#/gov-dashboard`) destina-se aos gestores e supervisores de segurança nacional do sistema:

### 5.1. Painel Central do Governo (SOC) (`/admin#/gov-dashboard`)
* Mapa de telemetria nacional com indicadores por província, tráfego geral, tempo médio de resposta institucional e estado de ativação de alertas nacionais.

### 5.2. Interoperabilidade Institucional (`/admin#/gov-interoperabilidade`)
* **Testar Conexão (`testConnection`):** Verifica a latência e sincronia com a nuvem Supabase em tempo real.
* **Gestão de Adesões (`solicitacoes_registo`):** Aprovar ou rejeitar solicitações de registo de novas instituições no ecossistema, atribuindo-lhes chaves e siglas oficiais.
* **Expedientes Administrativos:** Enviar ofícios e notificações centrais diretamente a instituições públicas ou cidadãos.

### 5.3. Supervisão, Cidadãos e Equipa (`gov-correspondencias` / `gov-contatos` / `gov-trabalhadores`)
* Pesquisar e auditar qualquer mensagem oficial trafegada na plataforma por número de protocolo.
* **Homologação Civil:** Auditar documentos enviados no registo (`urlSelfie`, `urlFrente`, `urlVerso`) e executar a ativação oficial de contas na nuvem (`provisionCloudAccount`).

### 5.4. Relatórios Estatísticos & Auditoria de Segurança (`gov-relatorio` / `gov-seguranca`)
* **Relatórios:** Gerar e exportar relatórios de conformidade e volume de atendimento em formato PDF ou CSV.
* **Trilha Imutável de Auditoria (`audit_logs`):** Consulta imutável dos 5.716+ registos de auditoria gerados pelo sistema, cobrendo cada login, validação, transação e erro de segurança.

### 5.5. IA Governamental (`/admin#/gov-ia`)
* Monitorizar o consumo, custos, quotas e tempo de resposta dos motores de IA em uso no país (Google Gemini AI Studio + Groq SDK).
* Testar prompts governamentais no ambiente de sandbox.

---

## 6. ASSISTENTE INTELIGENTE POR IA & COMANDOS DE VOZ
O CDA integra um assistente inteligente disponível 24/7 em todas as páginas através do botão de **Ícone de IA / Chatbot**:

### 6.1. Como Usar o Assistente de Textos e Documentos
* **Explicação de Documentos:** Abra um ofício e peça: *"Explique esta notificação em termos simples"*. A IA remove a burocracia e indica os seus direitos e deveres.
* **Geração de Minutas:** Peça à IA para criar um rascunho de *Intenção de Recurso*, *Pedido de Esclarecimento*, *Prórroga de Prazo* ou *Confirmação de Receção*.
* **Tradução Automática:** Traduza qualquer correspondência para Português simples, Inglês, Francês ou para as **Línguas Nacionais Angolanas** (*Umbundu, Kimbundu, Kikongo, Cokwe, Kwanyama*).

### 6.2. Comandos de Navegação e Leitura por Voz
O assistente suporta a **Web Speech API** nativa do navegador para total acessibilidade:
1. **Narração de Página:** Clique em **"Apresentações Disponíveis"** no chat de IA para ouvir a leitura e resumo oficial em voz alta sobre o propósito da página atual.
2. **Navegação por Comando de Voz:** Ative o microfone e dite comandos naturais para mudar de ecrã:
   * *"Ir para pasta digital"* ou *"Abrir minha pasta"*
   * *"Mostrar histórico de atividades"*
   * *"Abre central de notificações"*
   * *"Muda para pagamentos"*
   * *"Ir para contactos de emergência"*
   * *"Abrir vídeo atendimento"*
   * *"Ir para emissão de documentos"* (para Admin)
   * *"Abre relatórios e estatísticas"*
   * A IA solicitará uma confirmação de voz (*"Sim"* ou *"Não"*) e navegará de imediato para a página desejada.

---

## 7. SEGURANÇA, PRIVACIDADE E SUPORTE
* **Proteção de Credenciais:** As suas palavras-passe nunca são exibidas na tela e são protegidas por criptografia moderna no Supabase Auth.
* **Segurança contra Phishing:** Verifique sempre o URL no navegador antes de autenticar:
  * `https://correio-digital-angola-oficial.vercel.app`
* **Privacidade e Logs:** Os seus dados de navegação e correspondência são estritamente isolados. Para mais auxílio técnico, aceda às opções de **Ajuda e Suporte** na aba de Perfil.

---
*República de Angola — Correio Digital Angola (CDA 2026)*  
*Modernização, Soberania e Desburocratização ao Serviço do Cidadão.*
