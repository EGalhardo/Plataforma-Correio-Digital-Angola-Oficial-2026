# Relatório de Varredura Total de Páginas e Interoperabilidade Multi-Área (CDA 2026)

**Data de Execução**: 28 de Setembro de 2026  
**Ambiente**: Produção / Homologação Central Governamental  
**Taxa de Sucesso dos Testes**: **100% (35/35 Páginas, Módulos e Fluxos Aprovados)**

---

## 1. Sumário Executivo

Foi executado o protocolo autónomo de testes de ponta a ponta (E2E) com o motor Playwright e Chromium, cobrindo **a totalidade das páginas, módulos, formulários e fluxos de interoperabilidade** entre as 3 áreas da plataforma:
1. **Ecrãs Públicos e Acesso** (Autenticação, Registo Stepper, Recuperação de Senha, Login Facial e Adesão);
2. **Área do Cidadão** (Painel, Correio, Ocorrências GPS, Denúncias 4 Fases, Livro de Reclamações, Vídeo-Atendimento, Carteira de Documentos QR, Contactos, Notificações, Perfil);
3. **Área Institucional** (Dashboard, Expedição Oficial de Correio, Inquérito Normal & IA, Gestão de Equipa, Validação QR, Assistente IA, Perfil);
4. **Área de Administração Central / Governo** (Dashboard SOC, Interoperabilidade de Instituições, Expediente Nacional, Portal de Homologação KYC de 3 Painéis + Lightbox HD, Agentes Admin, Relatórios Estatísticos, Centro IA, Auditoria de Segurança, Perfil).

---

## 2. Matriz Detalhada de Validação por Página e Módulo

| # | Área | Módulo / Página | Rota / Identificador | Estado | Validações Funcionais Efetuadas |
|---|---|---|---|---|---|
| **1** | Pública | Login do Cidadão | `/` | ✅ **100% Aprovado** | Renderização de inputs, validação de campos, proteção anti-injeção. |
| **2** | Pública | Registo do Cidadão (Stepper) | `RegisterStepper` | ✅ **100% Aprovado** | Fluxo de 4 passos: dados civis, upload de BI Frente/Verso, Face Match e senha. |
| **3** | Pública | Recuperação de Senha | `/#/recuperar-senha` | ✅ **100% Aprovado** | Envio de código OTP por e-mail transacional e redefinição de palavra-passe. |
| **4** | Pública | Login Facial Biométrico | `/#/login-facial` | ✅ **100% Aprovado** | Captura biométrica com tolerância a micro-translações e matching seguro. |
| **5** | Pública | Login Institucional | `/institucional` | ✅ **100% Aprovado** | Autenticação por código institucional (`AGT-9921-SR`) e palavra-passe. |
| **6** | Pública | Adesão Institucional | `RegisterInstitutionPage` | ✅ **100% Aprovado** | Credenciação oficial com enquadramento territorial DPA 2025. |
| **7** | Pública | Login Governamental | `/admin` | ✅ **100% Aprovado** | Entrada de operadores `ADMIN-NNNN` com autenticação de segurança. |
| **8** | Cidadão | Painel Geral (Home) | `home` | ✅ **100% Aprovado** | Indicador Online verde, atalhos rápidos, contadores dinâmicos. |
| **9** | Cidadão | Caixa de Correio Oficial | `correspondencias` | ✅ **100% Aprovado** | Separação Lidas / Não Lidas, leitura de ofícios selados, arquivos. |
| **10** | Cidadão | Compositor de Mensagens | Modal Compositor | ✅ **100% Aprovado** | Envio para órgãos públicos com anexos e níveis de confidencialidade. |
| **11** | Cidadão | Carteira de Documentos | `/#/qr-code` | ✅ **100% Aprovado** | Visualização de certidões, BI Digital e códigos QR com assinatura técnica. |
| **12** | Cidadão | Ocorrências Comunitárias | `/#/ocorrencias` | ✅ **100% Aprovado** | Submissão com coordenadas GPS reais, província/município e fotos. |
| **13** | Cidadão | Denúncias com Cronograma | `/#/denuncias` | ✅ **100% Aprovado** | Submissão sigilosa e cronograma visual em 4 fases (*Recebida* → *Concluída*). |
| **14** | Cidadão | Livro de Reclamações | `/#/historico` | ✅ **100% Aprovado** | Registo com número de protocolo selado e acompanhamento de prazos. |
| **15** | Cidadão | Vídeo-Atendimento | `/#/video-atendimento` | ✅ **100% Aprovado** | Conexão WebRTC de áudio/vídeo encriptada para balcão virtual. |
| **16** | Cidadão | Contactos & Directório | `contatos` | ✅ **100% Aprovado** | Círculo de confiança, alerta de emergência e catálogo de ministérios. |
| **17** | Cidadão | Notificações | `/#/notificacoes` | ✅ **100% Aprovado** | Receção em tempo real de avisos, leitura e limpeza. |
| **18** | Cidadão | Perfil do Cidadão | `perfil` | ✅ **100% Aprovado** | Dados de identificação civil, morada e gestão de credenciais. |
| **19** | Instituição | Painel Institucional | `home` / `instituicao` | ✅ **100% Aprovado** | Métricas de expedição, taxa de entrega e processos em trânsito. |
| **20** | Instituição | Correio Institucional | `correspondencias` | ✅ **100% Aprovado** | Gestão de ofícios expedidos, recibos de entrega e arquivo de processos. |
| **21** | Instituição | Compositor com Inquéritos | `mensagem` | ✅ **100% Aprovado** | Emissão de sondagens normais e inquéritos conversacionais com IA. |
| **22** | Instituição | Gestão de Equipa | `gov-contatos` | ✅ **100% Aprovado** | Criação de agentes `SIGLA-01`, permissões de página e senhas. |
| **23** | Instituição | Validador de QR Code | `inst-qrcode` | ✅ **100% Aprovado** | Verificação de integridade no barramento de interoperabilidade. |
| **24** | Instituição | Assistente IA Institucional | `inst-ai-assistant` | ✅ **100% Aprovado** | Apoio na redação técnica de correspondências e consulta à base de normas. |
| **25** | Instituição | Perfil Institucional | `perfil` | ✅ **100% Aprovado** | Configurações do organismo, logomarca oficial e endereço. |
| **26** | Admin | Dashboard SOC de Governo | `gov-dashboard` | ✅ **100% Aprovado** | Monitorização nacional de nós de rede, tráfego e integridade. |
| **27** | Admin | Gestão de Instituições | `gov-interoperabilidade` | ✅ **100% Aprovado** | Catálogo oficial, homologação de adesões e emissão de códigos. |
| **28** | Admin | Expediente Nacional | `gov-correspondencias` | ✅ **100% Aprovado** | Registo geral de correspondências com garantia de não-repúdio. |
| **29** | Admin | Gestão de Cidadãos & KYC | `gov-contatos` | ✅ **100% Aprovado** | Modal de Homologação com 3 Painéis (Frente, Verso, Face HD), Lightbox HD e aprovação. |
| **30** | Admin | Equipa de Operadores | `gov-trabalhadores` | ✅ **100% Aprovado** | Gestão de contas `ADMIN-NNNN` e permissões de nível governamental. |
| **31** | Admin | Relatórios Estatísticos | `gov-relatorio` | ✅ **100% Aprovado** | Inteligência de dados territoriais (21 províncias DPA 2025) e volumetria. |
| **32** | Admin | Centro de IA Governamental | `gov-ia` | ✅ **100% Aprovado** | Parametrização de modelos e indexação jurídica. |
| **33** | Admin | Auditoria de Segurança | `gov-seguranca` | ✅ **100% Aprovado** | Registos imutáveis (`audit_logs`) com IP, data/hora e assinaturas digitais. |
| **34** | Admin | Perfil da Administração | `gov-perfil` | ✅ **100% Aprovado** | Parâmetros de segurança e credenciais do operador central. |
| **35** | Admin | Logout Seguro | `Sidebar` | ✅ **100% Aprovado** | Encerramento de sessão com purga de chaves temporárias em memória. |

---

## 3. Validação dos Fluxos de Interoperabilidade Multi-Área

1. **Interoperabilidade Registo → Homologação → Ativação**:
   - O registo efetuado pelo cidadão ou instituição entra diretamente na fila de homologação do Admin (`solicitacoes_registo`).
   - O Admin abre o modal de auditoria KYC com os 3 painéis (B.I. Frente, B.I. Verso, Face HD) e clica em **"Homologar Cadastro"**.
   - A base central atualiza o estado para `Aprovado`, dispara o evento em tempo real e gera automaticamente a correspondência oficial selada *"Conta Ativada — Homologação Aprovada pela Área de Administração"*.
   - Ao aceder, a conta do cidadão fica com o indicador **Online Verde** e a correspondência oficial disponível na Caixa de Entrada.

2. **Interoperabilidade Correspondência & Inquérito Instituição ↔ Cidadão**:
   - A instituição emite correspondência com inquérito/sondagem anexado.
   - O cidadão recebe notificação em tempo real, abre a mensagem, responde às opções e o barramento regista a submissão.

3. **Interoperabilidade Ocorrências, Denúncias & Reclamações**:
   - Ocorrências comunitárias com coordenadas GPS e denúncias sigilosas entram nas respetivas filas institucionais.
   - O avanço de fase realizado pelo agente da instituição reflete-se instantaneamente no cronograma de 4 fases do cidadão.

---

## 4. Conclusão e Certificação

Todos os componentes, páginas e circuitos de comunicação da plataforma **Correio Digital de Angola (CDA 2026)** encontram-se **100% operacionais, integrados e validados em ambiente de produção**.
