/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LanguageCode } from '../../types';
import { translateText, updateDynamicCache } from '../../services/translationService';
import { 
  MOCK_CORRESPONDENCES, 
  MOCK_INSTITUTIONAL_INBOX, 
  MOCK_SENT_MESSAGES, 
  MOCK_DOCUMENTS, 
  MOCK_CONTACTS, 
  MOCK_NOTIFICATIONS 
} from '../../constants/mocks';
import { 
  HIGHLIGHT_SLIDES,
  GOV_HIGHLIGHT_SLIDES,
  INST_HIGHLIGHT_SLIDES
} from '../../constants/data';

interface LanguageContextType {
  currentLanguage: LanguageCode;
  setCurrentLanguage: (lang: LanguageCode) => void;
  t: (text: string) => string;
  isTranslating: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Gather all dynamic app data/mock strings to execute full translation via AI
function extractTranslatableStrings(): string[] {
  const strings = new Set<string>();

  // 1. Highlight Slides
  [...HIGHLIGHT_SLIDES, ...GOV_HIGHLIGHT_SLIDES, ...INST_HIGHLIGHT_SLIDES].forEach(s => {
    if (s.title) strings.add(s.title);
    if (s.subtitle) strings.add(s.subtitle);
    if (s.btn) strings.add(s.btn);
  });

  // 2. Messages
  [...MOCK_CORRESPONDENCES, ...MOCK_INSTITUTIONAL_INBOX, ...MOCK_SENT_MESSAGES].forEach(m => {
    if (m.org) strings.add(m.org);
    if (m.preview) strings.add(m.preview);
    if (m.status) strings.add(m.status);
    if (m.details) {
      if (m.details.subject) strings.add(m.details.subject);
      if (m.details.body) strings.add(m.details.body);
      if (m.details.state) strings.add(m.details.state);
    }
  });

  // 3. Documents
  MOCK_DOCUMENTS.forEach(d => {
    if (d.name) strings.add(d.name);
    if (d.validity) strings.add(d.validity);
    if (d.holder) strings.add(d.holder);
    if (d.issuer) strings.add(d.issuer);
  });

  // 4. Notifications
  MOCK_NOTIFICATIONS.forEach(n => {
    if (n.title) strings.add(n.title);
    if (n.message) strings.add(n.message);
  });

  // 5. Contacts
  MOCK_CONTACTS.forEach(c => {
    if (c.name) strings.add(c.name);
    if (c.relation) strings.add(c.relation);
    if (c.status) strings.add(c.status);
  });

  // 6. Common interface labels - expanded list
  const extraUI = [
    "Olá",
    // Navigation & Tabs
    "Painel", "Correio", "Contactos", "Conta", "Trabalhadores", "Equipa", "QR Code", "IA",
    "Instituições", "Correspondências", "Cidadãos", "Relatórios", "Auditoria",
    "ÁREA DO CIDADÃO", "ADMINISTRAÇÃO CENTRAL", "INSTITUIÇÃO / PRIVADO",
    
    // Dashboard metrics
    "Arquivos Processados", "Documentos Emitidos", "Alertas Ativos", "Nível de Segurança",
    
    // UI Labels
    "Destaques & Novidades", "Correio Oficial", "QR Code", 
    "Solicitar Documento", "Notificações",
    "O que pretende consultar hoje?",
    "Pesquisar correspondência oficial...",
    "PESQUISA POR VOZ", "Ouvir Mensagem", "Histórico de Atividade",
    "ID Digital", "Cidadão Verificado", "Agente AGT Verificado",
    "Não Lidas", "Ver Histórico",
    "Instituições Conectadas", "Governação Electrónica",
    "Abrir Pasta Digital", "Novas Mensagens", "Documentos Ativos",
    "Segurança CDA", "Ver Correspondências",
    "Ocultar solicitações", "Ver solicitações",
    "Expedientes e Arquivos", "Facturas Recebidas",
    "novos arquivados", "faturas aguardando pagamento",
    "Submeter Documento", "mensagens por ler", "Nova Mensagem",
    "Lidas", "Enviadas", "Arquivadas",
    "Lida", "Não Lida", "Arquivada",
    "Pendente", "Pago", "Vencido", "Em processamento",
    
    // Login
    "A carregar plataforma oficial...",
    "O seu novo endereço digital oficial",
    "Receba, assine e despache correspondência governamental com validade jurídica do Estado da República de Angola.",
    "Infraestrutura Oficial Segura SME & AGT",
    "Cidadão", "Instituição", "Admin",
    "Login", "Número de Agente", "Número de BI de Cidadão", "Senha de Acesso",
    "Entrar com BI e Senha",
    
    // Document Content
    "Pagamento Pendente IPU", "Levantamento de BI",
    "Fatura de Energia", "Factura de Energia",
    "Factura e Ajuste de Consumo", "Notificação Judicial",
    "Resultado Clínico", "Auditoria Fiscal Geral",
    "Requerimento Fiscal", "Notificação Digital",
    
    // Table Headers & Actions
    "Cidadão / Requerente", "Órgão Emissor",
    "Assunto / Tema", "Conteúdo / Detalhe",
    "Data de Expiração", "Hora / Data",
    "Prioridade", "Ações",
    "Cidadão / Requerente", "Órgão Emissor",
    "Tipo de Documento / Assunto", "Conteúdo / Detalhe",
    "Prazo de Validade", "Emissão (Hora / Data)",
    "Nível de Restrição", "Ações",
    "Expira", "Requerimento de Certidão", "Prova de Vida Digital",
    "Analisar Documento", "Abrir Documento",
    
    // Payment & Invoice
    "Liquidar Fatura Agora", "PAGAR FATURA", "VER DOCUMENTO",
    "IMPOSTO PREDIAL URBANO", "EMOLUMENTOS REGISTO",
    "TAXA MODERADORA", "PRÉ-PAGO LUANDA",
    "CONSUMO RESIDENCIAL DE ÁGUA",
    "Liquidada", "Aguardando",
    
    // Empty states
    "Sem Documentos Registados", "Sem Facturas Emitidas",
    "Todas as Cobranças & Facturas Recebidas", "Cobranças & Facturas Recebidas",
    "Repositório de Documentos", "Expediente de Entrada",
    "Pasta Digital de Documentos Homologados",
    "Gestão unificada de liquidações", "Gestão ativa de liquidações",
    "Não possui faturas emitidas", "Nenhum documento localizado",
    
    // Invoice details
    "Serviço de Pagamento Digital Integrado",
    "Liquidando Fatura Oficial",
    "Total a Liquidar", "Vencimento",
    "Método de Liquidação",
    "Telemóvel Multicaixa Express",
    "Débito do Saldo Virtual CDA",
    "Saldo Disponível",
    "Coordenadas de Pagamento Multicaixa",
    "Entidade", "Referência", "Montante",
    "Copiar Referência", "Copiado",
    "Confirmar & Liquidar Agora",
    "Simular Autenticação Bancária",
    "Cobrança Liquidada",
    "Ver Recibo Integral", "Fechar Janela",
    
    // Receipt
    "República de Angola", "Recibo Eletrónico Digital",
    "Assinado com Sucesso CDA v4.1",
    "Identificador Oficial", "Nº da Factura",
    "Referência Utilizada", "NIF / Contribuinte Utente",
    "Data Autenticação", "Montante Liquidado",
    
    // Form labels
    "Destinatário do Documento", "Destinatário Institucional",
    "Assunto / Título do Documento",
    "Conteúdo principal / Teor do Documento",
    "Submeter Documento Oficial", "Descartar",
    
    // Wallet
    "Saldo QR Code",
    
    // Filter labels
    "Criptografia e Assinatura Militar do Estado",
    
    // Slide titles and subtitles
    "Seu BI é o seu endereço digital",
    "Aceda a correspondências e documentos oficiais de forma segura e centralizada em qualquer lugar.",
    "Segurança de Nível Estatal",
    "Dados protegidos por criptografia de ponta a ponta e biometria para garantir a total privacidade do cidadão.",
    "Configurar Segurança",
    "Notificações em Tempo Real",
    "Receba alertas instantâneos sobre multas, impostos e agendamentos governamentais.",
    "Ver Alertas",
    "Contactos de Emergência",
    "Mantenha a sua rede de confiança atualizada para situações críticas.",
    "Gerir Contactos",
    "Assistência por IA Oficial",
    "Tire dúvidas sobre processos burocráticos e receba orientações personalizadas.",
    "Abrir Conversa",
    "Angola Digital em Movimento",
    "A modernização dos serviços públicos ao serviço de todos os angolanos.",
    "Saber Mais",
    "Ver Correspondências"
  ];
  extraUI.forEach(s => strings.add(s));

  return Array.from(strings).filter(s => s && s.trim().length > 1 && isNaN(Number(s)));
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem('cda_current_language');
    return (saved as LanguageCode) || 'pt';
  });

  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    localStorage.setItem('cda_current_language', currentLanguage);
  }, [currentLanguage]);

  // Translate dynamic data in the background when language changes
  useEffect(() => {
    if (currentLanguage === 'pt') return;

    setIsTranslating(true);
    
    const loadTranslations = async () => {
      try {
        const textsToTranslate = extractTranslatableStrings();
        
        // Split into batches to avoid API timeout
        const batchSize = 50;
        const batches: string[][] = [];
        
        for (let i = 0; i < textsToTranslate.length; i += batchSize) {
          batches.push(textsToTranslate.slice(i, i + batchSize));
        }
        
        const allTranslations: Record<string, string> = {};
        
        for (const batch of batches) {
          try {
            const response = await fetch('/api/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ texts: batch, targetLanguage: currentLanguage })
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data && Array.isArray(data.translations)) {
                batch.forEach((originalText, index) => {
                  const translatedVal = data.translations[index];
                  if (translatedVal && translatedVal !== originalText) {
                    allTranslations[originalText.trim()] = translatedVal;
                  }
                });
              }
            }
          } catch (err) {
            console.warn('Translation batch failed, continuing with next batch:', err);
          }
        }
        
        // Update the global translation service
        if (Object.keys(allTranslations).length > 0) {
          updateDynamicCache(currentLanguage, allTranslations);
        }
        
      } catch (err) {
        console.error("Failed to automatically translate app data:", err);
      } finally {
        setIsTranslating(false);
      }
    };

    loadTranslations();
  }, [currentLanguage]);

  const t = (text: string): string => {
    if (!text) return text;
    
    // Use the centralized translation service that handles both static and dynamic translations
    return translateText(text, currentLanguage);
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, setCurrentLanguage, t, isTranslating }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}