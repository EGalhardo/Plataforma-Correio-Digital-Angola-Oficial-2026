/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LazyImage } from '../ui/LazyImage';
import { 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  CreditCard, 
  Award, 
  ShieldCheck, 
  ChevronRight, 
  ChevronLeft, 
  Download, 
  QrCode, 
  RefreshCw, 
  AlertTriangle, 
  X, 
  File, 
  AlertCircle, 
  Trash2, 
  Clock, 
  ArrowUpRight, 
  Check,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  History,
  Landmark,
  Receipt,
  Smartphone,
  Wallet
} from 'lucide-react';
import { Document, DigitalProtocol } from '../../types';
import { generateProtocol } from '../../utils/protocolGenerator';
import { useLanguage } from '../../hooks/useLanguage';

export interface FinancialTransaction {
  id: string;
  docType: string;
  category: string;
  amount: string;
  paymentMethod: 'EXPRESS' | 'DUC' | 'UNITEL_MONEY' | 'TRANSFER' | 'ISENTO';
  reference: string;
  status: 'PENDENTE' | 'CONFIRMADO' | 'PAGO' | 'RECUSADO' | 'ISENTO';
  date: string;
  time: string;
  receiptCode: string;
  holder: string;
}

interface SolicitarDocumentoContentProps {
  setTab: (tab: string) => void;
  bi: string;
  nif: string;
  onEmitDocument: (doc: Document, notification: any) => void;
  isOnline: boolean;
  addAuditLog: (action: string, type: 'info' | 'warning' | 'critical' | 'success') => void;
}

type Step = 'solicitacao' | 'upload' | 'validacao' | 'pagamento' | 'aprovacao' | 'emissao_final';

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  id: string;
}

export function SolicitarDocumentoContent({
  setTab,
  bi,
  nif,
  onEmitDocument,
  isOnline,
  addAuditLog
}: SolicitarDocumentoContentProps) {
  const { currentLanguage, t } = useLanguage();
  // Current step in the request flow
  const [currentStep, setCurrentStep] = useState<Step>('solicitacao');
  
  // Selection details
  const [docCategory, setDocCategory] = useState<'BI' | 'Certidao' | 'Licenca' | 'Declaracao' | 'Fiscal'>('BI');
  const [docType, setDocType] = useState('BI Digital - Documento Nacional');
  const [holderName, setHolderName] = useState('Edlasio Galhardo');
  const [identityCode, setIdentityCode] = useState(bi);
  const [purpose, setPurpose] = useState('Apresentação Orgão Público');
  const [urgency, setUrgency] = useState<'Alta' | 'Média'>('Média');

  // Drag and Drop simulation
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([
    { id: 'f-1', name: 'Assento_Nascimento_Oficial_Amostra.pdf', size: 104523, type: 'application/pdf' }
  ]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation Simulation State
  const [validationStage, setValidationStage] = useState(0);
  const [validationLog, setValidationLog] = useState<string[]>([]);
  const [validationSuccess, setValidationSuccess] = useState(false);

  // Payment State
  const [paymentOption, setPaymentOption] = useState<'EXPRESS' | 'DUC' | 'UNITEL_MONEY' | 'TRANSFER' | 'NOT_PAID'>('NOT_PAID');
  const [paymentPhone, setPaymentPhone] = useState('923456789');
  const [unitelPhone, setUnitelPhone] = useState('923985112');
  const [paymentRefCode, setPaymentRefCode] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  // Bank Transfer Specifics
  const [selectedBank, setSelectedBank] = useState<'BAI' | 'BFA' | 'BIC' | 'SOL'>('BAI');
  const [transferSlipUploaded, setTransferSlipUploaded] = useState(false);
  const [activeSlipName, setActiveSlipName] = useState('');

  // Automatic Confirmation Simulation
  const [isAutomaticConfirming, setIsAutomaticConfirming] = useState(false);
  const [automaticConfirmationProgress, setAutomaticConfirmationProgress] = useState(0);
  const [automaticConfirmationMessage, setAutomaticConfirmationMessage] = useState('');

  // Financial History State (Persisted)
  const [transactions, setTransactions] = useState<FinancialTransaction[]>(() => {
    const saved = localStorage.getItem('correio_digital_payments_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading financial history:', e);
      }
    }
    return [
      {
        id: 'TX-938201',
        docType: 'BI Digital - Documento Nacional',
        category: 'BI',
        amount: '2.450,00 AOA',
        paymentMethod: 'EXPRESS',
        reference: '938551012',
        status: 'CONFIRMADO',
        date: '10/05/2026',
        time: '14:23',
        receiptCode: 'REC-EX-948201',
        holder: 'Edlasio Galhardo'
      },
      {
        id: 'TX-938150',
        docType: 'Certidão de nascimento permanente',
        category: 'Certidao',
        amount: '4.100,00 AOA',
        paymentMethod: 'DUC',
        reference: '938551001',
        status: 'CONFIRMADO',
        date: '02/05/2026',
        time: '09:15',
        receiptCode: 'REC-DUC-938150',
        holder: 'Edlasio Galhardo'
      }
    ];
  });

  const [activeReceipt, setActiveReceipt] = useState<FinancialTransaction | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('correio_digital_payments_history', JSON.stringify(transactions));
  }, [transactions]);

  // Helper functions for dynamic fees
  const getEmolumentoOf = (cat: string) => {
    switch (cat) {
      case 'BI': return '2.450,00 AOA';
      case 'Certidao': return '4.100,00 AOA';
      case 'Licenca': return '7.500,00 AOA';
      case 'Declaracao': return '0,00 AOA (Isento)';
      case 'Fiscal': return '0,00 AOA (Isento)';
      default: return '2.450,00 AOA';
    }
  };

  const isCategoryExempt = (cat: string) => {
    return cat === 'Declaracao' || cat === 'Fiscal';
  };

  const activeDocCategoryPrice = getEmolumentoOf(docCategory);
  const isDocExempt = isCategoryExempt(docCategory);
  
  // DUC Details
  const ducEntity = '24401';
  const ducReference = `938551${Math.floor(100 + Math.random() * 900)}`;

  // Created Document and Protocol objects
  const [createdDoc, setCreatedDoc] = useState<Document | null>(null);

  // Available Digital Documents Categories options
  const CATEGORY_OPTIONS = [
    {
      id: 'BI',
      title: 'BI Digital',
      desc: 'Bilhete de Identidade Digital homologado pela Direção Central SME.',
      subtypes: ['BI Digital - Documento Nacional', 'Segunda Via de Bilhete', 'Renovação BI com Urgência'],
      institution: 'SME',
      eta: 'Imediato (Chancela eletrónica)'
    },
    {
      id: 'Certidao',
      title: 'Certidão Narrativa',
      desc: 'Certidões oficiais de casamento, nascimento ou registo paroquial.',
      subtypes: ['Certidão narrativa de casamento civil', 'Certidão de nascimento permanente', 'Cópia integral do assento civil'],
      institution: 'Conservatória',
      eta: '5 minutos (Varredura de livro)'
    },
    {
      id: 'Licenca',
      title: 'Licença / Carta',
      desc: 'Carta de Condução e licenças governamentais comerciais.',
      subtypes: ['Carta de Condução Certificada', 'Licença Industrial Simplificada', 'Alvará comercial de prestação de serviços'],
      institution: 'PNA',
      eta: '10 minutos (Segurança Rodoviária)'
    },
    {
      id: 'Declaracao',
      title: 'Declaração',
      desc: 'Declarações oficiais, isenção predial e atestados camarários.',
      subtypes: ['Declaração de residência digital', 'Declaração de agregado familiar', 'Declaração de isenção de emolumentos'],
      institution: 'Conservatória',
      eta: 'Imediato'
    },
    {
      id: 'Fiscal',
      title: 'Doc. Fiscal',
      desc: 'NIF digital consolidado e conformidades tributárias perante a AGT.',
      subtypes: ['NIF de Contribuinte Singular', 'Certidão de conformidade de IRT', 'Guia comprovativa de regularização predial'],
      institution: 'AGT',
      eta: '2 minutos (Conselho Fiscal)'
    }
  ];

  // Set default document subtype when category changes
  useEffect(() => {
    const activeOpt = CATEGORY_OPTIONS.find(o => o.id === docCategory);
    if (activeOpt) {
      setDocType(activeOpt.subtypes[0]);
    }
  }, [docCategory]);

  // Simulated validation timeline
  useEffect(() => {
    if (currentStep === 'validacao') {
      setValidationStage(0);
      setValidationSuccess(false);
      setValidationLog(['Iniciando protocolo de análise criptográfica do Cidadão...']);

      const timers = [
        setTimeout(() => {
          setValidationLog(prev => [...prev, '✔ Consistência de identidade certificada pela Conservatória Central.']);
          setValidationStage(1);
        }, 800),
        setTimeout(() => {
          setValidationLog(prev => [...prev, `✔ Verificação de uploads concluída: ${uploadedFiles.length} anexo(s) livre de ameaças.`]);
          setValidationStage(2);
        }, 1600),
        setTimeout(() => {
          setValidationLog(prev => [...prev, '✔ Estado tributário do NIF verificado (Contribuinte em conformidade).']);
          setValidationStage(3);
        }, 2400),
        setTimeout(() => {
          setValidationLog(prev => [...prev, '✔ Validação final deferida. Emolumento pronto para liquidação DUC.']);
          setValidationStage(4);
          setValidationSuccess(true);
        }, 3200)
      ];

      return () => {
        timers.forEach(clearTimeout);
      };
    }
  }, [currentStep]);

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files: UploadedFile[] = [];
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        files.push({
          id: `f-${Date.now()}-${i}`,
          name: file.name,
          size: file.size,
          type: file.type
        });
      }
      setUploadedFiles(prev => [...prev, ...files]);
      addAuditLog(`Anexo carregado via drag-and-drop: ${files[0].name}`, 'info');
    }
  };

  const handleManualFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files: UploadedFile[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        files.push({
          id: `f-${Date.now()}-${i}`,
          name: file.name,
          size: file.size,
          type: file.type
        });
      }
      setUploadedFiles(prev => [...prev, ...files]);
      addAuditLog(`Anexo adicionado manualmente: ${files[0].name}`, 'info');
    }
  };

  const handleDeleteFile = (id: string, name: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
    addAuditLog(`Anexo removido da solicitação: ${name}`, 'warning');
  };

  // Payment simulation with multi-channel support and automatic confirmation
  const handleSimulatePayment = (method: 'EXPRESS' | 'DUC' | 'UNITEL_MONEY' | 'TRANSFER') => {
    setIsPaying(true);
    setPaymentOption(method);
    
    const messages = {
      EXPRESS: [
        'Enviando solicitação Push para o Multicaixa Express...',
        'Aguardando inserção de PIN secreto pelo Utente no telemóvel...',
        'Ligação estabelecida com o Switch da EMIS...',
        'Compensação finalizada. Confirmando liquidação de emolumento...'
      ],
      DUC: [
        'Acessando servidor de Guia Única de Cobrança (DUC)...',
        'Verificando referência bancária no Ministério das Finanças...',
        'Validando compensação e liquidação na rede interbancária...',
        'Referência confirmada e liquidada nos canais do Estado!'
      ],
      UNITEL_MONEY: [
        'Iniciando conexão segura com a carteira Unitel Money...',
        'Validando saldo disponível no terminal do utente...',
        'Debitando taxa do emolumento digital governamental...',
        'Transação autorizada pela Unitel Money. Código de recibo emitido.'
      ],
      TRANSFER: [
        'Iniciando processamento OCR inteligente do comprovativo...',
        'Varrendo metadados de autenticação do Banco...',
        'Autenticando assinatura digital da instituição bancária...',
        'Transferência confirmada e validada no extrato da Ministério!'
      ]
    };

    setIsAutomaticConfirming(true);
    setAutomaticConfirmationProgress(5);
    setAutomaticConfirmationMessage(messages[method][0]);

    // Timer step 1
    const t1 = setTimeout(() => {
      setAutomaticConfirmationProgress(35);
      setAutomaticConfirmationMessage(messages[method][1]);
    }, 850);

    // Timer step 2
    const t2 = setTimeout(() => {
      setAutomaticConfirmationProgress(70);
      setAutomaticConfirmationMessage(messages[method][2]);
    }, 1750);

    // Timer step 3 (final confirmation)
    const t3 = setTimeout(() => {
      setAutomaticConfirmationProgress(100);
      setAutomaticConfirmationMessage(messages[method][3]);
      
      const receiptCode = `REC-${method}-${Math.floor(100000 + Math.random() * 900000)}`;
      const txId = `TX-${Math.floor(100000 + Math.random() * 900000)}`;
      
      const newTx: FinancialTransaction = {
        id: txId,
        docType: docType,
        category: docCategory,
        amount: activeDocCategoryPrice,
        paymentMethod: method,
        reference: method === 'DUC' ? ducReference : (method === 'TRANSFER' ? 'Transferência IBAN' : (method === 'UNITEL_MONEY' ? unitelPhone : paymentPhone)),
        status: 'CONFIRMADO',
        date: new Date().toLocaleDateString('pt-AO'),
        time: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
        receiptCode: receiptCode,
        holder: holderName
      };

      setTransactions(prev => [newTx, ...prev]);
      setActiveReceipt(newTx);
      setIsPaying(false);
      setIsAutomaticConfirming(false);
      setPaymentSuccess(true);
      addAuditLog(`Custos de emolumento digital liquidados com sucesso via ${method}. Recibo: ${receiptCode}`, 'success');
    }, 2700);
  };

  // Issue the final digital document
  const handleFinalizeEmission = () => {
    const activeCategoryOpt = CATEGORY_OPTIONS.find(o => o.id === docCategory);
    const inst = activeCategoryOpt ? activeCategoryOpt.institution : 'Conservatória';
    const cleanCode = `CDA-${docCategory.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const protocol: DigitalProtocol = generateProtocol(inst, 'document', cleanCode, docType);
    
    const newDoc: Document = {
      name: docType,
      validity: 'VITALÍCIO',
      code: cleanCode,
      holder: holderName,
      number: identityCode,
      issuer: `${inst} - República de Angola`,
      issuedAt: new Date().toLocaleDateString('pt-AO'),
      protocol: {
        ...protocol,
        deadlineDate: 'Vitalício',
        documentType: docType,
        officialIssueDate: new Date().toISOString().split('T')[0],
        currentState: 'Emitido & Cifrado'
      }
    };

    setCreatedDoc(newDoc);
    setCurrentStep('emissao_final');
    addAuditLog(`Chancela Eletrónica: Documento oficial ${docType} assinado com sucesso pelo Protocolo ${protocol.protocolNumber}`, 'success');
  };

  // Persist to parent documents pool and redirect to Wallet
  const handleAddToWalletAndClose = () => {
    if (!createdDoc) return;
    
    const notif = {
      id: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
      title: 'Novo Documento Oficial',
      message: `A sua solicitação foi processada. O documento "${createdDoc.name}" já está disponível na sua correspondência eletrónica.`,
      time: 'Agora',
      type: 'success',
      targetTab: 'correspondencias'
    };

    onEmitDocument(createdDoc, notif);
    addAuditLog(`DOCUMENT_EMITTED: ${createdDoc.name} emitido com sucesso e enviado para as correspondências do utente.`, 'success');
    setTab('correspondencias');
  };

  const currentCategoryObj = CATEGORY_OPTIONS.find(o => o.id === docCategory);

  return (
    <section className="space-y-6 pb-12" id="solicitacao-documento-central">
      {/* Visual Progress Steps Header */}
      <div className="bg-white border border-slate-150 rounded-[32px] p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 bg-indigo-65 text-indigo-700 rounded-xl flex items-center justify-center">
              <Layers size={20} />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase text-indigo-600 tracking-widest block font-sans">{t("Sistema de Chancela Estatal")}</span>
              <h2 className="text-lg md:text-xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">{t("Solicitar Documento Digital")}</h2>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-150 font-mono text-[10px] font-bold text-slate-500 uppercase px-3.5 py-1.5 rounded-xl">
            {t("Protocolo Descentralizado:")} CDA-v4.2
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 px-1 text-[10px] font-black uppercase tracking-widest mb-4">
          <button onClick={() => setTab('home')} className="text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer flex items-center gap-1 font-extrabold">{t("Voltar ao Painel")}</button>
          <span className="text-slate-300">|</span>
          <button onClick={() => setTab('historico')} className="text-slate-400 hover:text-primary transition-colors cursor-pointer">{t("Ver Histórico")}</button>
          <button onClick={() => setTab('notificacoes')} className="text-slate-400 hover:text-primary transition-colors cursor-pointer">{t("Notificações")}</button>
        </div>

        {/* Steps visual flow bar */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 pt-2 border-t border-slate-100">
          {[
            { id: 'solicitacao', label: t('1. Pedido') },
            { id: 'upload', label: t('2. Anexos') },
            { id: 'validacao', label: t('3. Análise') },
            { id: 'pagamento', label: t('4. Pagamento') },
            { id: 'aprovacao', label: t('5. Despacho') },
            { id: 'emissao_final', label: t('6. Emissão') }
          ].map((item, idx) => {
            const steps = ['solicitacao', 'upload', 'validacao', 'pagamento', 'aprovacao', 'emissao_final'];
            const activeIdx = steps.indexOf(currentStep);
            const thisIdx = steps.indexOf(item.id as Step);
            
            const isCompleted = thisIdx < activeIdx;
            const isActive = thisIdx === activeIdx;

            return (
              <div 
                key={item.id} 
                className={`flex flex-col items-start gap-1 p-2.5 rounded-xl border text-left transition-all ${
                  isActive ? 'bg-indigo-600/5 border-indigo-500 text-indigo-900 shadow-xs' :
                  isCompleted ? 'bg-emerald-50/40 border-emerald-200/80 text-emerald-800' :
                  'bg-slate-50/50 border-slate-100 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {isCompleted ? (
                    <div className="w-3.5 h-3.5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[8px] font-extrabold">
                      ✓
                    </div>
                  ) : (
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black ${
                      isActive ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {idx + 1}
                    </div>
                  )}
                  <span className="text-[10px] font-black tracking-tighter uppercase whitespace-nowrap">
                    {item.label.includes('. ') ? item.label.split('. ')[1] : item.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: SOLICITAÇÃO FORM */}
        {currentStep === 'solicitacao' && (
          <motion.div 
            key="step-solicita"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Category selection list */}
            <div className="lg:col-span-2 space-y-6 text-left">
              <div className="bg-white border border-slate-150 rounded-[32px] p-6 md:p-8 space-y-5 shadow-sm">
                <div>
                  <h4 className="text-slate-800 font-extrabold text-sm md:text-base uppercase tracking-tight">Qual ato governamental pretende requerer?</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Selecione uma categoria de documento digital para carregar as chaves de chancela</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => {
                        setDocCategory(opt.id as any);
                        addAuditLog(`Selecionou categoria de ato: ${opt.title}`, 'info');
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between h-32 group cursor-pointer ${
                        docCategory === opt.id 
                          ? 'bg-indigo-600/5 border-indigo-500 text-indigo-950 shadow-md shadow-indigo-600/5' 
                          : 'bg-slate-50/50 border-slate-150 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-start w-full">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                          docCategory === opt.id ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {opt.institution}
                        </span>
                        <ChevronRight size={14} className={`text-slate-400 group-hover:translate-x-1 transition-transform ${docCategory === opt.id ? 'text-indigo-600' : ''}`} />
                      </div>
                      <div>
                        <span className="font-extrabold text-sm md:text-base block tracking-tight text-slate-900">{opt.title}</span>
                        <span className="text-[10px] text-slate-500 leading-tight block mt-0.5 line-clamp-2">{opt.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Subtype dropdown */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Modalidade Específica do Documento</label>
                  <div className="relative">
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs md:text-sm font-bold text-slate-800 focus:bg-white outline-none cursor-pointer placeholder:text-slate-500"
                    >
                      {currentCategoryObj?.subtypes.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Personal validation form */}
              <div className="bg-white border border-slate-150 rounded-[32px] p-6 md:p-8 space-y-5 shadow-sm">
                <div>
                  <h4 className="text-slate-800 font-extrabold text-sm md:text-base uppercase tracking-tight">Dados de Concessão de Certificação</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Preencha com exatidão as informações do titular para que o despachante estatal legalize o ficheiro</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Nome Completo do Titular</label>
                    <input 
                      type="text" 
                      value={holderName}
                      onChange={(e) => setHolderName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs md:text-sm font-bold text-slate-800 focus:bg-white outline-none"
                      placeholder="e.g. Edlasio Galhardo"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Código de Identificação (BI / NIF)</label>
                    <input 
                      type="text" 
                      value={identityCode}
                      onChange={(e) => setIdentityCode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs md:text-sm font-mono font-bold text-slate-850 focus:bg-white outline-none"
                      placeholder="Identificação Oficial"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Finalidade / Motivo</label>
                    <input 
                      type="text" 
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs md:text-sm font-bold text-slate-800 focus:bg-white outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Prioridade Processual</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Alta', 'Média'].map((pr) => (
                        <button
                          type="button"
                          key={pr}
                          onClick={() => setUrgency(pr as any)}
                          className={`p-3 rounded-2xl border text-xs font-black uppercase tracking-wider text-center transition-all cursor-pointer ${
                            urgency === pr 
                              ? 'bg-slate-900 border-slate-900 text-white shadow-xs' 
                              : 'bg-slate-50 border-slate-200 text-slate-500'
                          }`}
                        >
                          {pr} {pr === 'Alta' && '⏱'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel info card & button right */}
            <div className="space-y-4 text-left">
              <div className="bg-indigo-950 text-white rounded-[32px] p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
                <div className="absolute right-0 bottom-0 w-24 h-24 bg-indigo-800/20 rounded-full blur-xl" />
                
                <div className="space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 block font-sans">Estimativa Ministerial CDA</span>
                  <h5 className="text-lg md:text-xl font-black uppercase italic tracking-tighter text-white">Tempo de Homologação</h5>
                  <div className="bg-white/10 p-3.5 rounded-2xl border border-white/15 inline-block text-white font-mono font-black text-xs">
                    ⏳ {currentCategoryObj?.eta}
                  </div>
                </div>

                <div className="border-t border-white/10 pt-5 space-y-4 text-[11px] text-white/70 font-bold uppercase tracking-wide leading-relaxed">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span>Validade probatória em atos públicos</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                    <span>Conexão interoperável via SME / AGT</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                    <span>Necessário carregar arquivos comprobatórios</span>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep('upload');
                      addAuditLog('Avançou para o upload de documentos de suporte.', 'info');
                    }}
                    className="w-full py-4 bg-white text-indigo-950 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-slate-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border-0 cursor-pointer"
                  >
                    Seguinte: Anexos <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Support Notice */}
              <div className="border border-slate-150 bg-slate-50 p-5 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-slate-700">
                  <ShieldCheck size={16} className="text-indigo-600" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Acordo Presidencial de Certificados</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal uppercase font-bold">
                  A emissão é regulada pela Proteção de Dados de Angola e pelo Ministério da Justiça. Ficheiros falsos ou adulterados implicam suspensão imediata da Carteira Digital.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 2: UPLOAD DOCUMENTS (ATTACHMENTS) */}
        {currentStep === 'upload' && (
          <motion.div 
            key="step-attachments"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-150 rounded-[32px] p-6 md:p-8 space-y-6 shadow-sm">
                <div>
                  <h4 className="text-slate-800 font-extrabold text-sm md:text-base uppercase tracking-tight">Upload de Documentos Comprobativos</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Insira cópias digitalizadas ou fotografias nítidas dos seus documentos de identificação ou justificações</p>
                </div>

                {/* Drag and drop interactive container */}
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-[30px] p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-3.5 select-none ${
                    isDragging 
                      ? 'border-indigo-600 bg-indigo-50/10 scale-[1.01]' 
                      : 'border-slate-250 bg-slate-50 hover:bg-slate-100 hover:border-slate-350'
                  }`}
                >
                  <input 
                    type="file" 
                    id="attachment-file-selector"
                    ref={fileInputRef}
                    onChange={handleManualFileSelect}
                    multiple
                    className="hidden" 
                  />
                  
                  <div className="p-4 bg-indigo-50 border border-indigo-100/60 rounded-full text-indigo-600">
                    <UploadCloud size={30} className={isDragging ? 'animate-bounce' : 'animate-pulse'} />
                  </div>
                  <div>
                    <h5 className="text-xs font-black uppercase tracking-tight text-slate-800">Arraste e Solte os Ficheiros Aqui</h5>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Ou clique para procurar na árvore local (PDF, JPG, PNG até 10MB)</p>
                  </div>
                </div>

                {/* Attachments list count */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block ml-1">Anexos Carregados no Buffer ({uploadedFiles.length})</span>
                  {uploadedFiles.length === 0 ? (
                    <div className="p-6 text-center border border-slate-150 rounded-2xl bg-slate-50 text-slate-400 font-sans text-xs">
                      <File size={20} className="mx-auto text-slate-300 mb-1.5" />
                      Sem documentos anexos de suporte. É altamente recomendado carregar ficheiros comprobatórios.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {uploadedFiles.map((file) => (
                        <div key={file.id} className="p-3 bg-slate-50 border border-slate-155 rounded-2xl flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-55 rounded-xl text-indigo-700">
                              <File size={16} />
                            </div>
                            <div className="max-w-[180px] sm:max-w-xs md:max-w-md">
                              <span className="font-extrabold text-xs text-slate-800 block truncate leading-none uppercase">{file.name}</span>
                              <span className="text-[9px] text-slate-400 font-bold block mt-1 uppercase">{(file.size / 1024).toFixed(1)} KB &bull; PDF ASSINADO</span>
                            </div>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(file.id, file.name)}
                            className="bg-transparent hover:bg-rose-50 text-slate-450 hover:text-rose-600 rounded-lg p-2 transition-all border-0 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar actions upload list */}
            <div className="space-y-4">
              <div className="bg-white border border-slate-150 rounded-[32px] p-6 md:p-8 space-y-6 shadow-sm">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black uppercase text-indigo-600 tracking-widest block font-sans">Segurança de Upload</span>
                  <h5 className="font-extrabold text-slate-800 uppercase text-xs leading-none">Chancela de Documento Físico</h5>
                </div>
                
                <p className="text-[10px] text-slate-500 font-bold leading-normal uppercase">
                  O sistema de certificação de ficheiros do CDA efetua varredura automática em busca do certificado digital do emitente físico original para corroborar validade.
                </p>

                <div className="border-t border-slate-100 pt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep('validacao');
                      addAuditLog('Iniciou protocolo de varredura e consistência técnica.', 'info');
                    }}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/10 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border-0 cursor-pointer"
                  >
                    Seguinte: Varredura <ChevronRight size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentStep('solicitacao')}
                    className="w-full py-3 bg-white border border-slate-205 text-slate-700 rounded-xl font-black text-[10px] tracking-wider uppercase hover:bg-slate-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ChevronLeft size={14} /> Retroceder
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 3: VALIDAÇÃO (AUDIT & SCAN) */}
        {currentStep === 'validacao' && (
          <motion.div 
            key="step-validacao"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left"
          >
            <div className="lg:col-span-2">
              <div className="bg-white border border-slate-150 rounded-[32px] p-6 md:p-8 space-y-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-slate-800 font-extrabold text-sm md:text-base uppercase tracking-tight">Protocolo de Varredura e Consistência Técnica</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Processando verificação automática inteligente em tempo real</p>
                  </div>
                  {!validationSuccess && (
                    <RefreshCw className="animate-spin text-indigo-600" size={20} />
                  )}
                </div>

                {/* Progress Visualizer */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 relative overflow-hidden flex flex-col items-center justify-center text-center space-y-3.5">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    {/* Ring background */}
                    <div className="absolute inset-0 border-4 border-slate-200 rounded-full" />
                    {/* Active ring indicator */}
                    <div className={`absolute inset-0 border-4 border-t-indigo-600 border-r-indigo-600 border-b-indigo-400 rounded-full ${!validationSuccess ? 'animate-spin' : 'border-emerald-500'}`} />
                    
                    <div className="text-slate-800 font-mono font-black text-lg">
                      {validationSuccess ? '100%' : `${validationStage * 25}%`}
                    </div>
                  </div>

                  <div>
                    <h5 className="text-xs font-black uppercase text-slate-800">
                      {validationSuccess ? 'Verificação Concluída com Sucesso' : 'Analisando Estrutura Documental...'}
                    </h5>
                    <p className="text-[10.5px] text-slate-400 font-bold mt-1 uppercase max-w-xs mx-auto">
                      {validationSuccess 
                        ? 'Os metadados coincidem com a base civil nacional. Pronto para o emolumento.' 
                        : 'Varrendo anexo de suporte e buscando certificado raiz de Angola.'
                      }
                    </p>
                  </div>
                </div>

                {/* Micro-logs validation terminal console */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block ml-1">Terminal de Triagem de Protocolo</span>
                  <div className="bg-slate-950 text-emerald-400 p-5 rounded-2xl font-mono text-[10.5px] leading-relaxed space-y-2 max-h-48 overflow-y-auto">
                    {validationLog.map((log, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-indigo-400 font-black">&gt;&gt;</span>
                        <span className="font-bold tracking-tight uppercase leading-snug">{log}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* validation actions */}
            <div className="space-y-4">
              <div className="bg-white border border-slate-150 rounded-[32px] p-6 md:p-8 space-y-6 shadow-sm">
                <div className="space-y-1">
                  <h6 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block font-sans">Estado de Homologação</h6>
                  <span className={`px-2.5 py-1 text-[9px] font-black rounded-lg uppercase tracking-wider border inline-block ${
                    validationSuccess ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                  }`}>
                    {validationSuccess ? 'Validado para Emissão' : 'Triagem Automática'}
                  </span>
                </div>

                <p className="text-[10px] text-slate-500 font-bold leading-normal uppercase">
                  O despacho automático foi gerado e aguarda a quitação do emolumento DUC de expediente estatal do cidadão.
                </p>

                <div className="border-t border-slate-100 pt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={!validationSuccess}
                    onClick={() => {
                      setCurrentStep('pagamento');
                      addAuditLog('Avançou para o pagamento de Emolumentos.', 'info');
                    }}
                    className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 border-0 cursor-pointer transition-all ${
                      validationSuccess 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10 hover:opacity-95' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Seguinte: Pagamento <ChevronRight size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentStep('upload')}
                    className="w-full py-3 bg-white border border-slate-205 text-slate-700 rounded-xl font-black text-[10px] tracking-wider uppercase hover:bg-slate-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ChevronLeft size={14} /> Retroceder
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        {currentStep === 'pagamento' && (
          <motion.div 
            key="step-pagamento"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left"
          >
            <div className="lg:col-span-2 space-y-6">
              {/* Payment central container */}
              <div className="bg-white border border-slate-150 rounded-[32px] overflow-hidden shadow-sm">
                
                {/* Header block with country identity */}
                <div className="p-6 md:p-8 bg-slate-900 text-white flex justify-between items-center relative">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block font-sans">Canal de Arrecadação de Receitas</span>
                    <h4 className="text-base font-black uppercase italic tracking-tighter text-white">
                      {isDocExempt ? 'Isenção de Custos Administrativos' : 'Liquidação de Emolumento Notarial'}
                    </h4>
                  </div>
                  <div className="logo shrink-0 font-mono font-black text-[9px] tracking-wider border border-white/20 rounded px-2.5 py-1 text-slate-300">
                    REPÚBLICA DE ANGOLA
                  </div>
                </div>

                <div className="p-6 md:p-8 space-y-6">
                  {/* Total summary ticket */}
                  <div className="bg-indigo-50/50 border border-indigo-100/60 rounded-2xl p-4 flex justify-between items-center text-xs">
                    <span className="text-indigo-950 font-black uppercase tracking-wider">Ato Notarial: {docType}</span>
                    <span className="text-indigo-600 font-mono font-extrabold text-sm md:text-base leading-none">
                      {activeDocCategoryPrice}
                    </span>
                  </div>

                  {/* If document type is exempt, provide instant activation screen */}
                  {isDocExempt ? (
                    <div className="bg-amber-50/60 border border-amber-150 p-6 rounded-[24px] space-y-4 text-left">
                      <div className="flex gap-3">
                        <ShieldCheck className="text-amber-600 shrink-0 mt-0.5 animate-pulse" size={22} />
                        <div>
                          <h5 className="font-extrabold text-amber-900 uppercase text-xs">Custo Isento ao Cidadão</h5>
                          <p className="text-[10px] text-amber-700 leading-relaxed uppercase font-black mt-1">
                            De acordo com o Simplifica 2.0 e o Regime Geral de Desbancarização Administrativa, atos declarativos e de conformidade tributária simples estão isentos de taxas camarárias ou emolumentares estaduais.
                          </p>
                        </div>
                      </div>

                      {!paymentSuccess ? (
                        <div className="pt-2 border-t border-amber-205/50">
                          <button
                            type="button"
                            onClick={() => {
                              setIsPaying(true);
                              setTimeout(() => {
                                setIsPaying(false);
                                setPaymentSuccess(true);
                                setPaymentOption('NOT_PAID');
                                
                                const txId = `TX-${Math.floor(100000 + Math.random() * 900000)}`;
                                const newTx: FinancialTransaction = {
                                  id: txId,
                                  docType: docType,
                                  category: docCategory,
                                  amount: '0,00 AOA',
                                  paymentMethod: 'ISENTO',
                                  reference: 'CONV-ISENTO-2026',
                                  status: 'ISENTO',
                                  date: new Date().toLocaleDateString('pt-AO'),
                                  time: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
                                  receiptCode: `REC-ISENTO-${Math.floor(100000 + Math.random() * 900000)}`,
                                  holder: holderName
                                };
                                setTransactions(prev => [newTx, ...prev]);
                                addAuditLog(`Ato de ${docType} processado com isenção fiscal sob protocolo automatizado.`, 'success');
                              }, 1000);
                            }}
                            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-755 text-white font-black text-[10px] tracking-widest uppercase rounded-xl border-0 cursor-pointer transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/10"
                          >
                            {isPaying ? <RefreshCw className="animate-spin text-white" size={12} /> : 'Ativar Emissão Isenta / Continuar'}
                          </button>
                        </div>
                      ) : (
                        <div className="bg-emerald-50/70 border border-emerald-150 p-4 rounded-xl flex items-center gap-2.5 text-emerald-800 text-[10.5px] font-black uppercase">
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                          <span>Isenção Validada e Registada no Sistema Notarial Integrado. Pronto para Emissão.</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Active Payment Method Selector block */}
                      {!paymentSuccess && !isAutomaticConfirming && (
                        <div className="space-y-4">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block ml-1">
                            Selecione o Canal de Pagamento Autorizado
                          </span>

                          {/* Grid with 4 payment methods */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                            {[
                              { id: 'EXPRESS', label: 'MC Express', icon: Smartphone, desc: 'Instantâneo' },
                              { id: 'DUC', label: 'Ref. DUC', icon: Layers, desc: 'ATM / Internet' },
                              { id: 'UNITEL_MONEY', label: 'Unitel Money', icon: Wallet, desc: 'Carteira Móvel' },
                              { id: 'TRANSFER', label: 'Transferência', icon: Building2, desc: 'BAI, BFA...' }
                            ].map(method => (
                              <button
                                key={method.id}
                                type="button"
                                onClick={() => {
                                  setPaymentOption(method.id as any);
                                  addAuditLog(`Selecionado canal de liquidação: ${method.label}`, 'info');
                                }}
                                className={`p-4 rounded-2xl flex flex-col items-center text-center justify-center border transition-all cursor-pointer ${
                                  paymentOption === method.id 
                                    ? 'bg-indigo-50 border-indigo-400 text-indigo-950 scale-[1.02] shadow-sm'
                                    : 'bg-slate-50 hover:bg-slate-100 border-slate-150 text-slate-700'
                                }`}
                              >
                                <method.icon size={18} className={paymentOption === method.id ? 'text-indigo-600 mb-1.5' : 'text-slate-400 mb-1.5'} />
                                <span className="font-extrabold text-[10px] uppercase block tracking-tight leading-tight">{method.label}</span>
                                <span className="text-[8px] text-slate-400 block mt-0.5 font-bold uppercase tracking-tight">{method.desc}</span>
                              </button>
                            ))}
                          </div>

                          {/* Render forms according to paymentOptions selections */}
                          <div className="pt-2 border-t border-slate-100">
                            {/* Option 1: Multicaixa Express */}
                            {paymentOption === 'EXPRESS' && (
                              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-50 border border-slate-150 p-5 rounded-[24px] space-y-4 text-left">
                                <div className="space-y-1">
                                  <span className="font-extrabold text-sm text-slate-800 block">Multicaixa Express</span>
                                  <p className="text-[9.5px] text-slate-500 leading-tight block uppercase font-bold">
                                    Insira o número de telemóvel associado ao seu cartão de débito interbancário MC Express. Receberá uma notificação instantânea de liquidação no telemóvel.
                                  </p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3">
                                  <div className="relative flex-1">
                                    <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-bold font-mono">+244</span>
                                    <input 
                                      type="tel"
                                      value={paymentPhone}
                                      onChange={(e) => setPaymentPhone(e.target.value.replace(/\D/g, ''))}
                                      maxLength={9}
                                      className="w-full bg-white border border-slate-205 rounded-xl py-2.5 pl-12 pr-4 text-xs font-mono font-bold outline-none uppercase"
                                      placeholder="Telemóvel Express"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleSimulatePayment('EXPRESS')}
                                    disabled={paymentPhone.length < 9}
                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] tracking-wider uppercase rounded-xl border-0 cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                                  >
                                    Autorizar e Pagar
                                  </button>
                                </div>
                              </motion.div>
                            )}

                            {/* Option 2: Referência de DUC */}
                            {paymentOption === 'DUC' && (
                              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-50 border border-slate-150 p-5 rounded-[24px] space-y-4 text-left">
                                <div className="space-y-1">
                                  <span className="font-extrabold text-sm text-slate-800 block">Emissão de DUC Eletrónico (Multicaixa ATM)</span>
                                  <p className="text-[9.5px] text-slate-500 leading-tight block uppercase font-bold">
                                    Pode liquidar estes dados em qualquer caixa física Multicaixa ou por Internet Banking. Use os dados abaixo:
                                  </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                                  <div className="p-3.5 bg-white border border-slate-150 rounded-xl">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Entidade Destinatária</span>
                                    <span className="text-sm font-mono font-black text-slate-800 block tracking-widest mt-0.5">{ducEntity}</span>
                                  </div>
                                  <div className="p-3.5 bg-white border border-slate-150 rounded-xl">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Referência de Emissão DUC</span>
                                    <span className="text-sm font-mono font-black text-indigo-600 block tracking-widest mt-0.5">{ducReference}</span>
                                  </div>
                                </div>

                                <div className="space-y-2.5 pt-2 border-t border-slate-150">
                                  <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Simular Confirmação e Compensação Automática</span>
                                  <button
                                    type="button"
                                    onClick={() => handleSimulatePayment('DUC')}
                                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] tracking-wider uppercase rounded-xl border-0 cursor-pointer transition-all flex items-center justify-center gap-1.5"
                                  >
                                    Verificar Conciliação Bancária
                                  </button>
                                </div>
                              </motion.div>
                            )}

                            {/* Option 3: Unitel Money */}
                            {paymentOption === 'UNITEL_MONEY' && (
                              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-50 border border-slate-150 p-5 rounded-[24px] space-y-4 text-left">
                                <div className="space-y-1">
                                  <span className="font-extrabold text-sm text-amber-600 block flex items-center gap-1">
                                    Unitel Money <span className="bg-amber-100 text-amber-800 text-[8px] px-1.5 py-0.5 rounded-full">Oficial</span>
                                  </span>
                                  <p className="text-[9.5px] text-slate-500 leading-tight block uppercase font-bold">
                                    Ligue diretamente a sua carteira digital móvel da Unitel. O valor será debitado do saldo corrente após aprovação via código SMS ou USSD.
                                  </p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3">
                                  <div className="relative flex-1">
                                    <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-bold font-mono">+244</span>
                                    <input 
                                      type="tel"
                                      value={unitelPhone}
                                      onChange={(e) => setUnitelPhone(e.target.value.replace(/\D/g, ''))}
                                      maxLength={9}
                                      className="w-full bg-white border border-slate-205 rounded-xl py-2.5 pl-12 pr-4 text-xs font-mono font-bold outline-none uppercase"
                                      placeholder="Telemóvel Unitel Money"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleSimulatePayment('UNITEL_MONEY')}
                                    disabled={unitelPhone.length < 9}
                                    className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-[10px] tracking-wider uppercase rounded-xl border-0 cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                                  >
                                    Autorizar Unitel Money
                                  </button>
                                </div>
                              </motion.div>
                            )}

                            {/* Option 4: Transferência Bancária */}
                            {paymentOption === 'TRANSFER' && (
                              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-50 border border-slate-150 p-5 rounded-[24px] space-y-4 text-left">
                                <div className="space-y-1">
                                  <span className="font-extrabold text-sm text-slate-800 block">Transferência Interbancária Direta (IBAN)</span>
                                  <p className="text-[9.5px] text-slate-500 leading-tight block uppercase font-bold">
                                    Efetue a transferência para o IBAN único do Tesouro Nacional/Correio Digital abaixo e carregue o comprovativo eletrónico. O nosso motor OCR fará a validação em segundos.
                                  </p>
                                </div>

                                <div className="p-4 bg-white border border-slate-200 rounded-2xl text-[10px] space-y-2 uppercase text-slate-700">
                                  <div className="flex justify-between items-center pb-1 border-b border-slate-100">
                                    <span className="font-bold">IBAN Canal Estado:</span>
                                    <span className="font-mono font-black text-slate-800">AO06 0040 0000 9382 1045 2301 2</span>
                                  </div>
                                  <div className="flex justify-between items-center text-[9px]">
                                    <span className="font-bold">Beneficiário:</span>
                                    <span className="font-black text-slate-900">SG CORREIOS REPUBLICA ANGOLA</span>
                                  </div>
                                </div>

                                {/* Drag-and-drop receipt upload file or simulation */}
                                <div className="space-y-2">
                                  <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Anexar Comprovativo de Transferência Bancária</span>
                                  {transferSlipUploaded ? (
                                    <div className="bg-indigo-50/50 border border-indigo-200 p-4 rounded-xl flex items-center justify-between">
                                      <div className="flex items-center gap-2 text-indigo-950 font-bold uppercase text-[10px]">
                                        <File size={16} className="text-indigo-600 shrink-0" />
                                        <span>{activeSlipName}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setTransferSlipUploaded(false);
                                          setActiveSlipName('');
                                        }}
                                        className="text-slate-400 hover:text-slate-600 font-bold outline-none border-0 bg-transparent text-xs hover:underline cursor-pointer"
                                      >
                                        Limpar
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                      {[
                                        { name: 'Comprovativo_BAI_Assinado.pdf' },
                                        { name: 'Transferencia_BFA_Net.pdf' },
                                      ].map((slip, idx) => (
                                        <button
                                          key={idx}
                                          type="button"
                                          onClick={() => {
                                            setTransferSlipUploaded(true);
                                            setActiveSlipName(slip.name);
                                            addAuditLog(`Carregado comprovativo simulado: ${slip.name}`, 'info');
                                          }}
                                          className="p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-400 text-slate-600 hover:text-indigo-950 text-center font-bold text-[9px] uppercase cursor-pointer"
                                        >
                                          + Carregar {slip.name.split('_')[1]}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  
                                  <button
                                    type="button"
                                    onClick={() => handleSimulatePayment('TRANSFER')}
                                    disabled={!transferSlipUploaded}
                                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-755 text-white font-black text-[10px] tracking-wider uppercase rounded-xl border-0 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                                  >
                                    Validar Comprovativo e Concluir
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Render automated integration progress during API processing */}
                      {isAutomaticConfirming && (
                        <div className="bg-slate-50 border border-slate-150 rounded-[24px] p-6 text-center space-y-4">
                          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                            <RefreshCw className="animate-spin text-indigo-600" size={28} />
                          </div>
                          <div>
                            <h5 className="font-extrabold text-slate-800 text-xs uppercase block tracking-wider">Interconexão Interbancária em Tempo Real</h5>
                            <span className="text-[10px] font-mono text-indigo-600 uppercase block font-black mt-1">
                              {automaticConfirmationProgress}% - {automaticConfirmationMessage}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-1.5 transition-all duration-300" style={{ width: `${automaticConfirmationProgress}%` }} />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Render beautiful PDF Digital Receipt if payment completed successfully */}
                  {paymentSuccess && activeReceipt && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.98 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      className="bg-emerald-50/20 border border-emerald-200/60 rounded-[28px] p-6 space-y-6 relative overflow-hidden text-left"
                    >
                      {/* Decorative elements */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none" />

                      {/* Receipt Header */}
                      <div className="flex justify-between items-start border-b border-emerald-100 pb-3">
                        <div className="space-y-0.5">
                          <span className="text-[8px] font-black uppercase text-emerald-600 tracking-wider">Recibo Oficial de Quitação Eletrónica</span>
                          <h5 className="font-black text-xs text-slate-800 uppercase leading-none">Ministério das Finanças de Angola</h5>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[8.5px] font-black rounded uppercase">
                          ✓ QUITADO
                        </span>
                      </div>

                      {/* Receipt Core Data */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs text-slate-700 uppercase">
                        <div>
                          <span className="text-[8px] font-black text-slate-400 block tracking-wider">Código Único do Recibo</span>
                          <span className="font-mono font-black text-slate-800 block mt-0.5">{activeReceipt.receiptCode}</span>
                        </div>
                        <div>
                          <span className="text-[8px] font-black text-slate-400 block tracking-wider">Metadado e Canal de Pagamento</span>
                          <span className="font-extrabold text-slate-800 block mt-0.5">{activeReceipt.paymentMethod}</span>
                        </div>
                        <div>
                          <span className="text-[8px] font-black text-slate-400 block tracking-wider">Destinatário do Expediente</span>
                          <span className="font-extrabold text-slate-900 block mt-0.5">{activeReceipt.holder}</span>
                        </div>
                        <div>
                          <span className="text-[8px] font-black text-slate-400 block tracking-wider">Emolumento Cobrado</span>
                          <span className="font-mono font-black text-indigo-600 block mt-0.5">{activeReceipt.amount}</span>
                        </div>
                      </div>

                      {/* Receipt Footer Certificate validation text */}
                      <div className="border-t border-emerald-100/60 pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                        <div className="text-[9px] text-slate-500 font-bold uppercase leading-relaxed max-w-sm">
                          Gerado de forma autónoma através do Correio Digital de Angola. A autenticidade fiscal deste documento pode ser verificada eletronicamente pelo SIGFE introduzindo o código de referência.
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            alert(`Descarregando o Recibo Digital de Quitação ${activeReceipt.receiptCode} em PDF oficial consolidado pelo SIGFE.`);
                          }}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-[9px] tracking-wider uppercase border-0 cursor-pointer shrink-0 transition-all flex items-center justify-center gap-1.5"
                        >
                          <Download size={11} /> Baixar Recibo PDF
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* Payment checkout sidebar container */}
            <div className="space-y-4">
              <div className="bg-white border border-slate-150 rounded-[32px] p-6 md:p-8 space-y-6 shadow-sm">
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase text-indigo-600 tracking-widest block font-sans">Liquidação Administrativa</span>
                  <h5 className="font-extrabold text-slate-800 uppercase text-xs leading-none">Despacho de Emolumentos</h5>
                </div>
                
                <p className="text-[10px] text-slate-500 font-bold leading-normal uppercase">
                  A emissão legal do documento em formato digital do cidadão depende da confirmação e liquidação em conformidade com o regime civil angolano.
                </p>

                <div className="border-t border-slate-100 pt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={!paymentSuccess && !isDocExempt}
                    onClick={() => {
                      setCurrentStep('aprovacao');
                      addAuditLog('Avançou para despacho final do Conservador.', 'info');
                    }}
                    className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 border-0 cursor-pointer transition-all ${
                      paymentSuccess || isDocExempt
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10 hover:opacity-95' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Seguinte: Despacho <ChevronRight size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentStep('validacao')}
                    className="w-full py-3 bg-white border border-slate-205 text-slate-700 rounded-xl font-black text-[10px] tracking-wider uppercase hover:bg-slate-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ChevronLeft size={14} /> Retroceder
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 5: APROVAÇÃO (TIMELINE & DECISION DESPACHO) */}
        {currentStep === 'aprovacao' && (
          <motion.div 
            key="step-aprovacao"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-150 rounded-[32px] p-6 md:p-8 space-y-6 shadow-sm">
                <div>
                  <h4 className="text-slate-800 font-extrabold text-sm md:text-base uppercase tracking-tight">Decisão e Despacho do Conservador</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Status formal de deferimento do ato digitalizado</p>
                </div>

                {/* Timeline review visualization */}
                <div className="space-y-5 relative pl-6 border-l border-slate-200">
                  <div className="relative">
                    <div className="absolute -left-[30px] top-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center" />
                    <div className="font-sans block text-left">
                      <span className="text-[10px] font-black uppercase text-emerald-600 block">Fase 1: Entrada & Buffer</span>
                      <p className="text-xs font-semibold text-slate-800 uppercase mt-0.5">Dossier civil constituído comuploads autenticados</p>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-[30px] top-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center" />
                    <div className="font-sans block text-left">
                      <span className="text-[10px] font-black uppercase text-emerald-600 block">Fase 2: Consistência Fiscal</span>
                      <p className="text-xs font-semibold text-slate-800 uppercase mt-0.5">NIF e verificação cambial DUC validadas no ERP das Finanças</p>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-[30px] top-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center" />
                    <div className="font-sans block text-left">
                      <span className="text-[10px] font-black uppercase text-emerald-600 block">Fase 3: Parecer Técnico</span>
                      <p className="text-xs font-semibold text-slate-800 uppercase mt-0.5">Emissão automática recomendada e carimbos qualificados ativados</p>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-[30px] top-1 w-4.5 h-4.5 bg-indigo-600 rounded-full border-4 border-white flex items-center justify-center" />
                    <div className="font-sans block text-left">
                      <span className="text-[10px] font-black uppercase text-indigo-600 block">Fase Final: Despacho Estatal</span>
                      <p className="text-xs font-semibold text-slate-800 uppercase mt-0.5">Homologado pelo Diretor Geral com aposição de SHA-256 e selo raiz</p>
                    </div>
                  </div>
                </div>

                {/* Authority official dispatch notice */}
                <div className="border border-slate-150 rounded-2xl p-5 bg-slate-50/50 space-y-3.5">
                  <span className="text-[9px] font-black text-slate-400 block uppercase tracking-widest leading-none">Parecer e Deferimento Formal</span>
                  <p className="text-[11px] text-slate-650 leading-relaxed font-bold uppercase italic block">
                    &quot;Com base nos termos da verificação preliminar e tendo em vista a quitação dos emolumentos por DUC, DEFIRO integralmente a solicitação de emissão de {docType} para {holderName}. Ordeno a aposição da assinatura digital qualificada e incorporação na Sandbox de Custódia.&quot;
                  </p>
                  <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                    <span>Emissor: Dr. Edmilson de Carvalho</span>
                    <span>Data Despacho: Hoje</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar dispatch execution */}
            <div className="space-y-4">
              <div className="bg-white border border-slate-150 rounded-[32px] p-6 md:p-8 space-y-6 shadow-sm">
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase text-indigo-600 tracking-widest block font-sans">Pronto para Emissão</span>
                  <h5 className="font-extrabold text-slate-800 uppercase text-xs leading-none">Chancela Eletrónica</h5>
                </div>
                
                <p className="text-[10px] text-slate-500 font-bold leading-normal uppercase">
                  A assinatura eletrónica com selo raiz do Estado será fundida no documento e o protocolo nacional será associado à sua conta.
                </p>

                <div className="border-t border-slate-100 pt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleFinalizeEmission}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-750 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/10 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border-0 cursor-pointer"
                  >
                    <Sparkles size={16} /> Emitir Documento Digital
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentStep('pagamento')}
                    className="w-full py-3 bg-white border border-slate-205 text-slate-700 rounded-xl font-black text-[10px] tracking-wider uppercase hover:bg-slate-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ChevronLeft size={14} /> Retroceder
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 6: DOCUMENT EMISSION FINAL CERTIFICATE VIEW */}
        {currentStep === 'emissao_final' && createdDoc && (
          <motion.div 
            key="step-final-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left"
          >
            {/* Elegant Document preview card */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-indigo-950 text-white rounded-[40px] shadow-3xl overflow-hidden border border-indigo-800 relative">
                {/* Visual patterns overlays */}
                <div className="absolute inset-0 opacity-5 mix-blend-overlay pointer-events-none">
                  <svg width="100%" height="100%"><pattern id="grid-final" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/></pattern><rect width="100%" height="100%" fill="url(#grid-final)" /></svg>
                </div>

                <div className="p-8 md:p-10 space-y-10 relative">
                  {/* Certificate Top seal line */}
                  <div className="flex justify-between items-start border-b border-white/10 pb-6">
                    <div className="text-left">
                       <div className="h-10 w-auto mb-2 opacity-50">
                         <LazyImage 
                           src="https://i.postimg.cc/Rq5TKbdk/Correio-Digital-Angola.png" 
                           alt="Coat of arms" 
                           style={{ height: '100%', width: 'auto', objectFit: 'contain', filter: 'invert(1)', backgroundColor: 'transparent' }}
                         />
                       </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-300 block">República de Angola</span>
                      <span className="text-[9px] font-bold uppercase text-slate-400 block mt-0.5">Ministério da Justiça e dos Direitos Humanos</span>
                    </div>

                    <div className="text-right">
                      <span className="px-3 py-1 bg-emerald-500/20 backdrop-blur-md text-emerald-400 text-[9px] font-black rounded-lg border border-emerald-500/20 uppercase tracking-[0.15em] flex items-center gap-1.5 shadow-xl inline-block">
                        ✓ ASSINADO
                      </span>
                      <span className="text-white/40 text-[9px] font-mono font-black block mt-2 tracking-widest leading-none">REF: {createdDoc.code}</span>
                    </div>
                  </div>

                  {/* Document Title Header */}
                  <div className="space-y-2">
                    <h3 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-white">{createdDoc.name}</h3>
                    <div className="flex items-center gap-2 text-indigo-200 text-[10px] font-black uppercase tracking-widest mt-0.5">
                      <span>Validade Digital: VITALÍCIO</span>
                      <span>&bull;</span>
                      <span>Emissão em: {createdDoc.issuedAt}</span>
                    </div>
                  </div>

                  {/* Certificate holder and protocol blocks details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t border-white/10">
                    <div>
                      <span className="text-white/40 text-[8px] font-black uppercase tracking-wider block">Nome do Cidadão Registado</span>
                      <span className="text-base md:text-lg font-black italic text-white uppercase mt-1 block tracking-tight leading-none">{createdDoc.holder}</span>
                      <span className="text-[9px] text-indigo-300 font-mono block mt-1.5 uppercase font-bold">Identidade: {createdDoc.number}</span>
                    </div>

                    <div>
                      <span className="text-white/40 text-[8px] font-black uppercase tracking-wider block">Protocolo de Chancela</span>
                      <span className="text-sm md:text-base font-mono font-black text-white block mt-1 leading-none tracking-widest">{createdDoc.protocol?.protocolNumber}</span>
                      <span className="text-[8.5px] text-slate-400 block mt-1.5 uppercase font-bold">Categoria: {createdDoc.protocol?.category}</span>
                    </div>
                  </div>

                  {/* Digital seal signature details */}
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                    <div className="space-y-1 text-left sm:max-w-xs">
                      <span className="text-indigo-300 text-[8px] font-black uppercase tracking-wider block">Assinatura do Responsável</span>
                      <span className="text-[10.5px] font-extrabold text-white uppercase block leading-none">{createdDoc.protocol?.issuerResponsible}</span>
                      <span className="text-[8px] text-slate-400 font-mono tracking-tight block truncate mt-1">HASH: {createdDoc.protocol?.digitalSignature}</span>
                    </div>
                    {/* QR block code */}
                    <div className="logo shrink-0 flex items-center gap-3 bg-white text-slate-900 rounded-xl p-2 md:p-3 border border-white/15">
                      <div className="font-sans block text-left">
                        <span className="text-[7.5px] font-black uppercase text-slate-400 block">Homologado</span>
                        <span className="text-[9px] font-black uppercase text-slate-800 tracking-wider">QR Validação</span>
                      </div>
                      <div className="w-10 h-10 bg-indigo-950 text-white font-mono font-black text-xs flex items-center justify-center rounded">CDA</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* sidebar emission end */}
            <div className="space-y-4">
              <div className="bg-white border border-slate-150 rounded-[32px] p-6 md:p-8 space-y-6 shadow-sm">
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase text-indigo-600 tracking-widest block font-sans">Documentação Incorporável</span>
                  <h5 className="font-extrabold text-slate-800 uppercase text-xs leading-none">Chancela Estatal Concluída</h5>
                </div>
                
                <p className="text-[10px] text-slate-500 font-bold leading-normal uppercase">
                  O ato notarial do cidadão foi processado e chancelado com sucesso no Correio Digital de Angola. Pode descarregar a cópia permanente ou integrá-la na sua carteira digital.
                </p>

                <div className="border-t border-slate-100 pt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleAddToWalletAndClose}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-750 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/15 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border-0 cursor-pointer"
                  >
                    Incorporar na Carteira <ArrowUpRight size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      alert(`Descarregando o ficheiro PDF Chancelado legalmente de acordo com o Protocolo nº ${createdDoc.protocol?.protocolNumber}`);
                    }}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-black text-[10px] tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0"
                  >
                    <Download size={14} /> Baixar PDF Autenticado
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HISTÓRICO FINANCEIRO (COLLAPSIBLE MEU HISTÓRICO DE EMISSÕES) */}
      <div className="mt-8 border border-slate-150 rounded-[32px] bg-white p-6 shadow-sm text-left">
        <button
          type="button"
          onClick={() => {
            setHistoryOpen(!historyOpen);
            addAuditLog(`${historyOpen ? 'Encerrou' : 'Visualizou'} Histórico Financeiro de Atos Notariais`, 'info');
          }}
          className="w-full flex justify-between items-center text-slate-800 hover:text-indigo-950 outline-none border-0 bg-transparent cursor-pointer p-0"
        >
          <div className="flex items-center gap-2.5">
            <History className="text-indigo-600 animate-pulse" size={20} />
            <div>
              <h5 className="font-extrabold text-xs uppercase tracking-tight block">Meu Histórico Financeiro de Expediente</h5>
              <span className="text-[9px] text-slate-400 block font-bold uppercase mt-0.5">
                Histórico interbancário e recibos digitais quitados no SIGFE ({transactions.length} atos)
              </span>
            </div>
          </div>
          <span className={`text-slate-400 text-xs transform transition-transform ${historyOpen ? 'rotate-180' : ''}`}>
            ▲
          </span>
        </button>

        {historyOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            className="mt-6 pt-6 border-t border-slate-100 space-y-4"
          >
            {transactions.length === 0 ? (
              <p className="text-xs text-slate-400 uppercase font-black py-4 text-center">Nenhuma transação financeira registada neste terminal.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="mobile-data-table w-full text-left text-[10.5px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-black uppercase text-[8px] tracking-wider font-semibold">
                      <th className="pb-3.5">ID Transação</th>
                      <th className="pb-3.5">Ato Solicitado</th>
                      <th className="pb-3.5 text-center">Canal</th>
                      <th className="pb-3.5">Data/Hora</th>
                      <th className="pb-3.5 text-right">Taxa Geral</th>
                      <th className="pb-3.5 text-center">Estado</th>
                      <th className="pb-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="text-slate-700 font-bold uppercase font-semibold">
                        <td className="py-3.5 font-mono font-black text-slate-400">{tx.id}</td>
                        <td className="py-3.5">
                          <span className="block text-slate-800 font-extrabold">{tx.docType}</span>
                          <span className="text-[8px] text-slate-400 block mt-0.5">{tx.holder}</span>
                        </td>
                        <td className="py-3.5 text-center">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[8.5px] font-black">{tx.paymentMethod}</span>
                        </td>
                        <td className="py-3.5 font-sans font-medium text-slate-500 text-[10px]">
                          {tx.date} às {tx.time}
                        </td>
                        <td className="py-3.5 font-mono font-black text-slate-900 text-right">{tx.amount}</td>
                        <td className="py-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black border ${
                            tx.status === 'CONFIRMADO' || tx.status === 'ISENTO'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                              : 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveReceipt(tx);
                              if (currentStep !== 'pagamento') {
                                setCurrentStep('pagamento');
                                setPaymentSuccess(true);
                              }
                              addAuditLog(`Re-imprimindo recibo digital: ${tx.receiptCode}`, 'info');
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-indigo-600 rounded font-black text-[9px] hover:underline cursor-pointer border-0"
                          >
                            Recibo PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
}
