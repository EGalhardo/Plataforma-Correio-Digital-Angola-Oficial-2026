/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { useInstitutions } from '../../services/institutionStore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Send, 
  ShieldCheck, 
  Folder, 
  Plus, 
  Search, 
  Bell,
  Scroll,
  ShieldAlert,
  Receipt,
  Megaphone,
  FolderOpen,
  Landmark,
  CheckSquare,
  Key,
  Award,
  User,
  Coins,
  Scale,
  FileText,
  Building2,
  CheckCircle2,
  XCircle,
  Info,
  CreditCard,
  Smartphone,
  Check,
  HelpCircle,
  Copy,
  RotateCcw,
  Building,
  Printer
} from 'lucide-react';
import { Message, LanguageCode } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';

const safeCopyToClipboard = (text: string): boolean => {
  try {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {}

  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    return true;
  } catch (err) {
    console.error('Failed to copy: ', err);
    return false;
  }
};

function renderCategoryIcon(iconName: string, size = 10) {
  switch (iconName) {
    case 'Bell': return <Bell size={size} />;
    case 'Scroll': return <Scroll size={size} />;
    case 'ShieldAlert': return <ShieldAlert size={size} />;
    case 'Receipt': return <Receipt size={size} />;
    case 'Megaphone': return <Megaphone size={size} />;
    case 'FolderOpen': return <FolderOpen size={size} />;
    case 'Landmark': return <Landmark size={size} />;
    case 'CheckSquare': return <CheckSquare size={size} />;
    case 'Key': return <Key size={size} />;
    case 'Award': return <Award size={size} />;
    case 'User': return <User size={size} />;
    case 'Coins': return <Coins size={size} />;
    case 'Scale': return <Scale size={size} />;
    default: return <FileText size={size} />;
  }
}

interface DocumentsContentProps {
  isComposing: boolean;
  setIsComposing: (composing: boolean) => void;
  composeData: { to: string; subject: string; body: string };
  setComposeData: (data: { to: string; subject: string; body: string }) => void;
  handleSendMessage: () => void;
  unreadTotal: number;
  correspondenciaTab: string;
  setCorrespondenciaTab: (tab: string) => void;
  inbox: Message[];
  sentMessages: Message[];
  searchMail: string;
  setSearchMail: (search: string) => void;
  filteredMessages: Message[];
  handleSelectMessage: (msg: Message) => void;
  setTab: (tab: string) => void;
  bi: string;
  isInst?: boolean;
  /** F12 — facturas/carteira simuladas apenas nas contas de demonstração. */
  sessionDemo?: boolean;
  currentLanguage?: LanguageCode;
}

export function DocumentsContent({
  isComposing,
  setIsComposing,
  composeData = { to: '', subject: '', body: '' },
  setComposeData,
  handleSendMessage,
  unreadTotal,
  correspondenciaTab,
  setCorrespondenciaTab,
  inbox = [],
  sentMessages = [],
  searchMail,
  setSearchMail,
  filteredMessages = [],
  handleSelectMessage,
  setTab,
  bi,
  isInst,
  sessionDemo,
  currentLanguage = 'pt'
}: DocumentsContentProps) {
  const { institutions } = useInstitutions();
  const { t: translate } = useLanguage();
  const [selectedInst, setSelectedInst] = useState<string>('Todas');
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<any | null>(null);

  // Simulated Wallet Balance for paying invoices
  const [walletBalance, setWalletBalance] = useState<number>(() => {
    if (sessionDemo === false) return 0; // F12 — conta real: sem saldo simulado
    const saved = localStorage.getItem('correio_digital_carteira_saldo');
    return saved ? Number(saved) : 154700; // 154.700 Kz
  });

  const [invoices, setInvoices] = useState<any[]>(() => {
    const saved = localStorage.getItem('correio_digital_faturas');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse correio_digital_faturas:', e);
      }
    }
    return [
      {
        id: 'inv-1',
        org: 'ENDE',
        invoiceNumber: 'FT-ENDE-2026-7781',
        reference: '112358132',
        entity: '00223',
        amount: '11.200 Kz',
        amountVal: 11200,
        date: 'Ontem',
        deadline: '10 Jun 2026',
        status: 'Pendente',
        description: 'Fatura de Fornecimento de Energia Elétrica Residencial - Contador ENDE-77981'
      },
      {
        id: 'inv-2',
        org: 'ENDE',
        invoiceNumber: 'FT-ENDE-2026-3401',
        reference: '555444333',
        entity: '00223',
        amount: '14.150 Kz',
        amountVal: 14150,
        date: '28 Abr 2026',
        deadline: '10 Mai 2026',
        status: 'Pago',
        description: 'Fatura de Fornecimento de Energia Elétrica Residencial - Contador ENDE-77981'
      },
      {
        id: 'inv-3',
        org: 'EPAL',
        invoiceNumber: 'FT-EPAL-2026-5590',
        reference: '987654321',
        entity: '00301',
        amount: '6.430 Kz',
        amountVal: 6430,
        date: 'Esta Semana',
        deadline: '12 Jun 2026',
        status: 'Pendente',
        description: 'Fatura de Fornecimento de Água Canalizada - Ajuste de Leitura Geral'
      },
      {
        id: 'inv-4',
        org: 'EPAL',
        invoiceNumber: 'FT-EPAL-2026-1210',
        reference: '223344556',
        entity: '00301',
        amount: '5.900 Kz',
        amountVal: 5900,
        date: '10 Abr 2026',
        deadline: '12 Mai 2026',
        status: 'Pago',
        description: 'Fatura de Fornecimento de Água Canalizada - Consumo de Março'
      },
      {
        id: 'inv-5',
        org: 'AGT',
        invoiceNumber: 'FT-AGT-2026-3029',
        reference: '456123789',
        entity: '01004',
        amount: '18.400 Kz',
        amountVal: 18400,
        date: '15 Mai 2026',
        deadline: '30 Jun 2026',
        status: 'Pendente',
        description: 'Liquidação de Imposto Predial Urbano (IPU) - Exercício de Interconexão Civil 2025'
      },
      {
        id: 'inv-6',
        org: 'AGT',
        invoiceNumber: 'FT-AGT-2026-1049',
        reference: '789456123',
        entity: '01004',
        amount: '3.200 Kz',
        amountVal: 3200,
        date: '10 Abr 2026',
        deadline: '10 Mai 2026',
        status: 'Pago',
        description: 'DLI - Documento de Liquidação de Impostos (Taxa de Circulação Automóvel)'
      },
      {
        id: 'inv-7',
        org: 'SME',
        invoiceNumber: 'FT-SME-2026-1102',
        reference: '321098765',
        entity: '00902',
        amount: '15.000 Kz',
        amountVal: 15000,
        date: '12 Mai 2026',
        deadline: '15 Jun 2026',
        status: 'Pendente',
        description: 'Emissão de Passaporte Eletrónico Ordinário - Taxa Consular de Homologação'
      },
      {
        id: 'inv-8',
        org: 'Tribunal',
        invoiceNumber: 'FT-TRIB-2026-9041',
        reference: '443221990',
        entity: '00505',
        amount: '25.000 Kz',
        amountVal: 25000,
        date: '08 Mai 2026',
        deadline: '12 Jun 2026',
        status: 'Pendente',
        description: 'Emolumentos de Autenticação Judicial Digital de Documento Matricula'
      },
      {
        id: 'inv-9',
        org: 'Hospital',
        invoiceNumber: 'FT-HOSP-2026-3029',
        reference: '901234567',
        entity: '00888',
        amount: '2.500 Kz',
        amountVal: 2500,
        date: '20 Mai 2026',
        deadline: '20 Jun 2026',
        status: 'Pago',
        description: 'Taxa Moderadora de Consultas Clínicas Gerais de Urgência no Portal Estatal'
      },
      {
        id: 'inv-10',
        org: 'Registo Civil',
        invoiceNumber: 'FT-RCIV-2026-0982',
        reference: '123987456',
        entity: '00112',
        amount: '5.000 Kz',
        amountVal: 5000,
        date: '18 Mai 2026',
        deadline: '22 Jun 2026',
        status: 'Pendente',
        description: 'Emissão Certificada de Segunda Via de Bilhete de Identidade Digital'
      },
      {
        id: 'inv-11',
        org: 'INE',
        invoiceNumber: 'FT-INE-2026-4401',
        reference: '777888999',
        entity: '00707',
        amount: '10.000 Kz',
        amountVal: 10000,
        date: '05 Mai 2026',
        deadline: '05 Jun 2026',
        status: 'Pago',
        description: 'Apoio Estatístico e Fornecimento de Dados Demográficos para Estudo de Viabilidade'
      },
      {
        id: 'inv-12',
        org: 'Ministérios',
        invoiceNumber: 'FT-MINS-2026-8802',
        reference: '334556778',
        entity: '00404',
        amount: '18.500 Kz',
        amountVal: 18500,
        date: '14 Mai 2026',
        deadline: '14 Jun 2026',
        status: 'Pendente',
        description: 'Taxa de Homologação de Carta de Condução Digital e Registo Rodoviário'
      }
    ];
  });

  const [activePayingInvoice, setActivePayingInvoice] = useState<any | null>(null);
  const [payMethod, setPayMethod] = useState<'express' | 'carteira' | 'atm'>('express');
  const [expressPhone, setExpressPhone] = useState<string>('932455120');
  const [isPayingActive, setIsPayingActive] = useState<boolean>(false);
  const [showPaySuccess, setShowPaySuccess] = useState<boolean>(false);
  const [copiedInvoiceId, setCopiedInvoiceId] = useState<string | null>(null);
  const [viewedReceipt, setViewedReceipt] = useState<any | null>(null);

  useEffect(() => {
    localStorage.setItem('correio_digital_carteira_saldo', String(walletBalance));
  }, [walletBalance]);

  useEffect(() => {
    localStorage.setItem('correio_digital_faturas', JSON.stringify(invoices));
  }, [invoices]);

  // F12 — Conta real (cidadão/instituição registada): NÃO herda as facturas
  // simuladas FT-AGT/FT-ENDE… — a lista nasce vazia e a carteira sem saldo.
  const demoScope = sessionDemo !== false;
  const effectiveInvoices = demoScope ? invoices : [];

  const allDocsCombined = useMemo(() => {
    return [...inbox, ...sentMessages];
  }, [inbox, sentMessages]);

  const getCountForInst = (name: string) => {
    if (name === 'Todas') return allDocsCombined.length;
    const term = name.toLowerCase();
    if (!isInst) {
      return effectiveInvoices.filter(item => item.org?.toLowerCase() === term).length;
    } else {
      return allDocsCombined.filter(item => {
        const orgName = item.org?.toLowerCase() || '';
        const subjectText = item.details?.subject?.toLowerCase() || '';
        const categoryText = item.protocol?.category?.toLowerCase() || '';
        return orgName.includes(term) || subjectText.includes(term) || categoryText.includes(term);
      }).length;
    }
  };

  const finalFilteredDocs = useMemo(() => {
    if (selectedInst === 'Todas') return allDocsCombined;
    const term = selectedInst.toLowerCase();
    return allDocsCombined.filter(item => {
      const orgName = item.org?.toLowerCase() || '';
      const subjectText = item.details?.subject?.toLowerCase() || '';
      const categoryText = item.protocol?.category?.toLowerCase() || '';
      return orgName.includes(term) || subjectText.includes(term) || categoryText.includes(term);
    });
  }, [allDocsCombined, selectedInst]);

  const filteredInvoicesForSelectedInst = useMemo(() => {
    if (selectedInst === 'Todas') return effectiveInvoices;
    return effectiveInvoices.filter(item => item.org?.toLowerCase() === selectedInst.toLowerCase());
  }, [effectiveInvoices, selectedInst]);

  const saveInvoicesToStorage = (updatedList: any[]) => {
    localStorage.setItem('correio_digital_faturas', JSON.stringify(updatedList));
    setInvoices(updatedList);
  };

  const handleSimulatePayment = () => {
    if (!activePayingInvoice) return;
    setIsPayingActive(true);

    setTimeout(() => {
      setIsPayingActive(false);

      if (payMethod === 'carteira') {
        if (walletBalance < activePayingInvoice.amountVal) {
          alert("Saldo Insuficiente na QR Code para liquidar esta fatura.");
          return;
        }
        const nextBalance = walletBalance - activePayingInvoice.amountVal;
        setWalletBalance(nextBalance);
      }

      const updated = invoices.map(i => {
        if (i.id === activePayingInvoice.id) {
          return { ...i, status: 'Pago', date: 'Hoje' };
        }
        return i;
      });

      saveInvoicesToStorage(updated);
      setShowPaySuccess(true);
    }, 2000);
  };

  if (isComposing) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-4 mb-2">
          <button 
            onClick={() => setIsComposing(false)}
            className="flex items-center justify-center w-10 h-10 bg-white border-2 border-[#d1dbe5] rounded-full text-[#384e6e] hover:bg-slate-50 transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95 shrink-0"
            aria-label="Voltar"
            title="Voltar aos Documentos"
          >
            <ArrowLeft size={16} className="text-[#384e6e]" />
          </button>
          <div>
            <h3 className="text-base md:text-xl font-black text-primary leading-none">Novo Documento Oficial</h3>
            <p className="text-[9px] md:text-[10px] text-slate-700 font-black uppercase tracking-widest mt-1">Submissão Oficial Homologada</p>
          </div>
        </div>

        <div className="bg-white border border-line rounded-[24px] md:rounded-[32px] p-5 md:p-10 shadow-sm space-y-5 md:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            <div className="space-y-2">
              <label className="text-[10px] md:text-sm font-black text-slate-600 uppercase tracking-widest pl-1">
                {isInst ? 'Destinatário do Documento' : 'Destinatário Institucional'}
              </label>
              <div className="relative">
                {isInst ? (
                  <input 
                    type="text"
                    placeholder="Introduza o N-BI"
                    value={composeData.to}
                    onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                    className="w-full bg-slate-50 border border-line rounded-2xl px-5 py-3.5 md:py-4 text-xs md:text-sm font-mono font-bold text-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                  />
                ) : (
                  <>
                    <select 
                      value={composeData.to}
                      onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                      className="w-full bg-slate-50 border border-line rounded-2xl px-5 py-3.5 md:py-4 text-xs md:text-sm font-bold text-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none appearance-none cursor-pointer"
                    >
                      <option value="">Selecione uma instituição...</option>
                      {institutions.map(inst => (
                        <option key={inst.id} value={inst.name}>{inst.name} - {inst.fullName}</option>
                      ))}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ArrowLeft className="-rotate-90" size={14} />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] md:text-sm font-black text-slate-600 uppercase tracking-widest pl-1">Assunto / Título do Documento</label>
              <input 
                type="text"
                placeholder="Qual o tipo ou assunto do documento?"
                value={composeData.subject}
                onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                className="w-full bg-slate-50 border border-line rounded-2xl px-5 py-3.5 md:py-4 text-xs md:text-sm font-bold text-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] md:text-sm font-black text-slate-600 uppercase tracking-widest pl-1">Conteúdo principal / Teor do Documento</label>
            <textarea 
              rows={8}
              placeholder="Descreva detalhadamente o teor e dados do documento oficial..."
              value={composeData.body}
              onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
              className="w-full bg-slate-50 border border-line rounded-2xl px-5 py-3.5 md:py-4 text-xs md:text-sm font-medium text-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none resize-none leading-relaxed"
            />
          </div>

          <div className="pt-2 md:pt-4 flex flex-col md:flex-row gap-3 md:gap-4">
            <button 
              onClick={handleSendMessage}
              disabled={!composeData.to || !composeData.subject || !composeData.body}
              className="flex-[2] bg-primary text-white py-4 rounded-2xl font-black text-sm md:text-base shadow-xl shadow-primary/25 hover:bg-primary/95 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 md:gap-3"
            >
              <Send size={18} />
              Submeter Documento Oficial
            </button>
            <button 
              onClick={() => {
                if(confirm("Deseja descartar este rascunho de documento?")) setIsComposing(false);
              }}
              className="flex-1 px-8 py-3.5 md:py-4.5 rounded-2xl font-bold text-xs md:text-sm text-slate-500 hover:bg-slate-100 transition-colors"
            >
              Descartar
            </button>
          </div>
        </div>

        <div className="flex gap-3 md:gap-4 p-4 md:p-5 bg-primary/5 rounded-[24px] border border-primary/10 items-start">
          <div className="w-9 h-9 md:w-10 md:h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h4 className="text-primary font-black text-[10px] md:text-sm uppercase tracking-wider mb-1">Criptografia e Assinatura Militar do Estado</h4>
            <p className="text-[11px] md:text-sm text-slate-600 leading-relaxed">
              Este arquivo de documento será assinado digitalmente com o seu BI <strong>{bi}</strong>. O documento possui plena validade regulamentar, encriptação estatal e integridade com carimbo de tempo inviolável.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (selectedInvoiceForDetail) {
    const item = selectedInvoiceForDetail;
    const isPendente = item.status === 'Pendente';
    
    // Get corresponding product name based on organisation
    const getProductForOrg = (org: string) => {
      const o = org?.toUpperCase() || '';
      if (o.includes('ENDE')) return 'PRÉ - PAGO LUANDA';
      if (o.includes('EPAL')) return 'CONSUMO RESIDENCIAL DE ÁGUA';
      if (o.includes('AGT')) return 'IMPOSTO PREDIAL URBANO - DLI';
      if (o.includes('SME')) return 'TAXA DE EMISSÃO DE PASSAPORTE DIGITAL';
      if (o.includes('TRIBUNAL')) return 'TAXAS ACADÉMICAS E EMOLUMENTOS REGISTO';
      if (o.includes('HOSPITAL')) return 'TAXA MODERADORA DE SERVIÇOS MÉDICOS';
      if (o.includes('CIVIL') || o.includes('REGISTO')) return 'CERTIDÃO DE SEGUNDA VIA DE BI';
      if (o.includes('INE')) return 'FORNECIMENTO DE DADOS ESTATÍSTICOS';
      if (o.includes('MINISTÉRIO')) return 'HOMOLOGAÇÃO DE VISTOS / CARTAS DE CONDUÇÃO';
      return 'TAXA INTEGRADA DE PRESTAÇÃO DE SERVIÇO PÚBLICO';
    };

    const productName = getProductForOrg(item.org);
    const formattedAmountVal = item.amountVal ? item.amountVal.toLocaleString('de-DE') : '0';
    const formattedAmount = `${formattedAmountVal},00 AKZ`;
    // Simulated operation number deterministically derived from ref or ID
    const operationNum = item.operationNum || (352841400 + Math.abs(item.id.split('-')[1] ? Number(item.id.split('-')[1]) : 96));
    
    // Receipt random sequence digit
    const receiptRef = item.receiptRef || `67948391${String(120664850 + (item.amountVal || 5000))}`;

    const handlePrint = () => {
      window.print();
    };

    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Style block for clean printing layout */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body {
              background: white !important;
              color: black !important;
            }
            body > * {
              display: none !important;
            }
            #printable-receipt-container {
              display: block !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 1.5cm !important;
              box-shadow: none !important;
              border: none !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}} />

        {/* Action Header / Top Bar (non-printable) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 no-print bg-slate-50 border border-slate-200/80 p-4 rounded-[24px]">
          <button 
            type="button"
            onClick={() => setSelectedInvoiceForDetail(null)}
            className="flex items-center justify-center w-10 h-10 bg-white border border-[#d1dbe5] rounded-full text-[#384e6e] hover:bg-slate-50 transition-all shadow-sm cursor-pointer hover:scale-105 active:scale-95 shrink-0"
            title="Voltar às Facturas"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="flex items-center gap-2">
            {isPendente && (
              <button 
                type="button"
                onClick={() => {
                  setActivePayingInvoice(item);
                  setShowPaySuccess(false);
                  setPayMethod('express');
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-full font-black text-xs flex items-center gap-2 shadow-md shadow-emerald-600/10 hover:scale-105 active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
              >
                <Coins size={15} />
                Liquidar Fatura Agora
              </button>
            )}
            <button 
              type="button"
              onClick={handlePrint}
              className="bg-primary hover:bg-primary/95 text-white px-5 py-2.5 rounded-full font-black text-xs flex items-center gap-2 shadow-md shadow-primary/10 hover:scale-105 active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
            >
              <Printer size={15} />
              Imprimir Documento
            </button>
          </div>
        </div>

        {/* Printable BAI Directo Receipt Card */}
        <div 
          id="printable-receipt-container"
          className="bg-white border border-slate-200/80 rounded-[32px] p-6 sm:p-12 md:p-16 shadow-lg max-w-3xl mx-auto space-y-10 relative overflow-hidden text-left"
        >
          {/* Top Logo banner block */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-slate-100 pb-8">
            <div className="font-serif">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block font-sans">Comprovativo Digital de Operação</span>
              <h2 className="text-xl font-extrabold text-[#023059] uppercase tracking-tighter mt-1 italic font-sans">
                {isPendente ? 'Guia de Pagamento Prévio' : 'Recibo de Liquidação'}
              </h2>
            </div>
            
            {/* Elegant SVG Styled BAIDirecto Logo */}
            <div className="flex items-center gap-2 font-sans self-end sm:self-auto">
              <svg className="w-10 h-10 shrink-0" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="100" height="100" rx="22" fill="#023059" />
                {/* Globe/Bank lines */}
                <circle cx="50" cy="50" r="30" stroke="white" strokeWidth="2" strokeOpacity="0.2" />
                <path d="M20 50H80" stroke="white" strokeWidth="2" strokeOpacity="0.3" />
                <path d="M50 20C62 32 62 68 50 80" stroke="white" strokeWidth="2" strokeOpacity="0.4" />
                <path d="M50 20C38 32 38 68 50 80" stroke="white" strokeWidth="2" strokeOpacity="0.4" />
                <path d="M26 32.5C38 41.5 62 41.5 74 32.5" stroke="white" strokeWidth="1.5" strokeOpacity="0.3" />
                <path d="M26 67.5C38 58.5 62 58.5 74 67.5" stroke="white" strokeWidth="1.5" strokeOpacity="0.3" />
                {/* Bold letters BAI */}
                <text x="50" y="58" fill="white" fontSize="24" fontWeight="900" textAnchor="middle" fontFamily="sans-serif" letterSpacing="-1">BAI</text>
              </svg>
              <div className="flex flex-col -space-y-1">
                <span className="text-xl font-black text-[#023059] tracking-tighter uppercase leading-none">BAI<span className="text-[#3b82f6] lowercase font-light italic">directo</span></span>
                <span className="text-[8px] font-sans font-extrabold tracking-widest text-slate-400 uppercase text-right">Banco de Fomento Angola</span>
              </div>
            </div>
          </div>

          {/* Subtitle Line */}
          <div className="text-center">
            <p className="text-xs text-slate-600 font-medium italic">
              {isPendente 
                ? "A fatura oficial abaixo foi registada no serviço BAIDirecto e encontra-se aguardando autorização de liquidação."
                : "A operação que efectuou foi registada com sucesso através do serviço BAIDirecto."
              }
            </p>
          </div>

          {/* Section 1: Dados do Ordenante */}
          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-1.5 flex items-center justify-between">
              <h3 className="text-[13px] font-extrabold text-slate-500 uppercase tracking-wider font-sans">Dados do Ordenante</h3>
              <span className="text-[9px] font-mono text-slate-400 font-bold">Ref: ORD-50779-{item.id}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-1 gap-y-2.5 text-xs pl-2 sm:pl-8">
              <div className="flex items-start">
                <div className="w-28 sm:w-36 text-slate-500 font-sans font-bold uppercase text-[10px] text-right pr-4 pt-0.5">Nome:</div>
                <div className="flex-1 text-[#1e293b] font-bold font-sans uppercase break-all">
                  ANTONIO JOSE MANUEL MATEUS
                </div>
              </div>
              <div className="flex flex-row items-center">
                <div className="w-28 sm:w-36 text-slate-500 font-sans font-bold uppercase text-[10px] text-right pr-4">Conta:</div>
                <div className="flex-1 text-[#1e293b] font-mono font-bold">050779044 10 001</div>
              </div>
              <div className="flex flex-row items-center">
                <div className="w-28 sm:w-36 text-slate-500 font-sans font-bold uppercase text-[10px] text-right pr-4">IBAN:</div>
                <div className="flex-1 text-[#1e293b] font-mono font-bold">AO06 0040 0000 5077 9044 1013 0</div>
              </div>
            </div>
          </div>

          {/* Section 2: Dados do Pagamento */}
          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-1.5 flex items-center justify-between">
              <h3 className="text-[13px] font-extrabold text-slate-500 uppercase tracking-wider font-sans">Dados do Pagamento</h3>
              <span className={`text-[9px] font-sans font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                isPendente 
                  ? 'bg-amber-50 text-amber-700 border-amber-200' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {isPendente ? 'Pendente' : 'Liquidado'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-y-2.5 text-xs font-medium pl-2 sm:pl-8">
              {/* Número de Operação */}
              <div className="flex flex-row items-center">
                <div className="w-28 sm:w-36 text-slate-500 font-sans font-bold uppercase text-[10px] text-right pr-4">Número de Operação:</div>
                <div className="flex-1 text-[#1e293b] font-mono font-bold">{operationNum}</div>
              </div>

              {/* Entidade */}
              <div className="flex flex-row items-center">
                <div className="w-28 sm:w-36 text-slate-500 font-sans font-bold uppercase text-[10px] text-right pr-4">Entidade:</div>
                <div className="flex-1 text-[#1e293b] font-mono font-bold">{item.entity || '00404'}</div>
              </div>

              {/* Tipo de Pagamento */}
              <div className="flex flex-row items-center">
                <div className="w-28 sm:w-36 text-slate-500 font-sans font-bold uppercase text-[10px] text-right pr-4">Tipo de Pagamento:</div>
                <div className="flex-1 text-[#1e293b] font-sans font-bold uppercase">{item.org}</div>
              </div>

              {/* Produto */}
              <div className="flex items-start">
                <div className="w-28 sm:w-36 text-slate-500 font-sans font-bold uppercase text-[10px] text-right pr-4 pt-0.5">Produto:</div>
                <div className="flex-1 text-[#1e293b] font-sans font-black uppercase italic leading-none">{productName}</div>
              </div>

              {/* Serviço */}
              <div className="flex flex-row items-center">
                <div className="w-28 sm:w-36 text-slate-500 font-sans font-bold uppercase text-[10px] text-right pr-4">Serviço:</div>
                <div className="flex-1 text-slate-400 font-sans font-bold uppercase">N/A</div>
              </div>

              {/* Montante */}
              <div className="flex flex-row items-center">
                <div className="w-28 sm:w-36 text-slate-500 font-sans font-bold uppercase text-[10px] text-right pr-4">Montante:</div>
                <div className="flex-1 text-primary font-mono font-black text-sm md:text-base leading-none">{formattedAmount}</div>
              </div>

              {/* Referência */}
              <div className="flex flex-row items-center">
                <div className="w-28 sm:w-36 text-slate-500 font-sans font-bold uppercase text-[10px] text-right pr-4">Referência:</div>
                <div className="flex-1 text-indigo-700 font-mono font-black">
                  {item.reference.match(/.{1,3}/g)?.join(' ') || item.reference}
                </div>
              </div>

              {/* Data do Pagamento */}
              <div className="flex flex-row items-center">
                <div className="w-28 sm:w-36 text-slate-500 font-sans font-bold uppercase text-[10px] text-right pr-4">Data da Liquidação:</div>
                <div className="flex-1 text-[#1e293b] font-mono font-bold">
                  {isPendente ? 'Aguardando Aprovação' : (item.date === 'Hoje' ? 'Hoje - Autenticação Digital Instantânea' : item.date)}
                </div>
              </div>

              {/* Estado */}
              <div className="flex flex-row items-center">
                <div className="w-28 sm:w-36 text-slate-500 font-sans font-bold uppercase text-[10px] text-right pr-4">Estado:</div>
                <div className={`flex-1 font-sans font-black uppercase text-[11px] flex items-center gap-1.5 ${isPendente ? 'text-amber-600' : 'text-emerald-600'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isPendente ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'} shrink-0`} />
                  {isPendente ? 'REQUERIMENTO PENDENTE' : 'LIQUIDADA COM SUCESSO'}
                </div>
              </div>

              {/* Canal */}
              <div className="flex flex-row items-center">
                <div className="w-28 sm:w-36 text-slate-500 font-sans font-bold uppercase text-[10px] text-right pr-4">Canal:</div>
                <div className="flex-1 text-[#1e293b] font-sans font-bold uppercase text-xs">Internet Banking (CDA v4.2)</div>
              </div>
            </div>
          </div>

          {/* Section 3: Dado do Recibo */}
          {!isPendente && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="border-b border-slate-200 pb-1.5">
                <h3 className="text-[13px] font-extrabold text-slate-500 uppercase tracking-wider font-sans">Dado do Recibo</h3>
              </div>

              <div className="pl-2 sm:pl-8 font-mono text-[11px] text-slate-700 leading-relaxed bg-slate-50 border border-slate-200/50 p-4 rounded-2xl max-w-md">
                <p className="font-bold">REF: {receiptRef}</p>
                <p className="font-bold uppercase">{productName}</p>
                <p className="font-medium text-[10px] text-slate-400 mt-1 uppercase">REFERÊNCIA:</p>
                <p className="font-bold text-indigo-700">{item.reference}</p>
                <p className="font-bold uppercase mt-1">{item.org}</p>
                <div className="border-t border-dashed border-slate-200 my-2 pt-1" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">EMIS - Empresa Interbancaria de serviços</p>
                <p className="text-[9px] font-sans text-slate-400 leading-tight mt-1">Este documento unificado possui assinatura com carimbo militar regulamentar de integridade digital do Estado de Angola.</p>
              </div>
            </div>
          )}

          {/* Prompt action calls if pending */}
          {isPendente && (
            <div className="bg-amber-50/50 border border-amber-200 rounded-3xl p-5 sm:p-8 space-y-4 text-center mt-6 no-print">
              <div className="mx-auto w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                <Info size={20} />
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider">Aguardando Liquidação Financeira</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                  A entidade {item.org} registou este débito de {formattedAmount}. Pode pagar instantaneamente com a sua carteira digital CDA ou através do Multicaixa Express.
                </p>
              </div>
              <div className="pt-2">
                <button 
                  type="button"
                  onClick={() => {
                    setActivePayingInvoice(item);
                    setShowPaySuccess(false);
                    setPayMethod('express');
                  }}
                  className="bg-primary hover:bg-primary/95 text-white rounded-full text-xs font-black uppercase tracking-widest px-6 py-3 cursor-pointer shadow-lg shadow-primary/10 hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-2"
                >
                  <Coins size={15} />
                  Liquidar Fatura Agora
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <section className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            {isInst ? <Folder size={20} className="md:w-6 md:h-6" /> : <Receipt size={20} className="md:w-6 md:h-6" />}
          </div>
          <div>
            <h3 className="text-lg md:text-2xl font-black text-primary leading-tight">
              {isInst ? translate('Expedientes e Arquivos') : translate('Facturas Recebidas')}
            </h3>
            <p className="text-[10px] md:text-sm text-slate-600 font-black uppercase tracking-widest">
              {isInst 
                ? `${unreadTotal} ${translate('novos arquivados')}` 
                : `${effectiveInvoices.filter(i => i.status === 'Pendente').length} ${translate('faturas aguardando pagamento')}`
              }
            </p>
          </div>
        </div>
        {isInst && (
          <button 
            onClick={() => setIsComposing(true)}
            className="bg-primary text-white rounded-2xl px-6 py-3.5 flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-xs md:text-sm font-black"
          >
            <Plus size={18} />
            {translate("Submeter Documento")}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 px-1 text-[10px] font-black uppercase tracking-widest">
        {!isInst && <button onClick={() => setTab('home')} className="cda-link-text">{translate("Painel")}</button>}
        {!isInst && <button onClick={() => setTab('historico')} className="cda-link-text">{translate("Ver Histórico")}</button>}
        <button onClick={() => setTab('notificacoes')} className="cda-link-text">{translate("Notificações")}</button>
        {isInst && <button onClick={() => setTab('inst-qrcode')} className="cda-link-text">{translate("Validação QR")}</button>}
      </div>

       {/* 1. Contentor "Instituições Conectadas" */}
       <section className="bg-white border border-slate-200 rounded-[32px] p-5 md:p-6 shadow-sm overflow-hidden relative group">
         <div className="flex flex-col md:flex-row md:items-center justify-between md:relative gap-2 mb-4 pb-2 border-b border-slate-50">
           <div className="flex items-center gap-2.5">
             <div className="w-1.5 h-6 bg-primary rounded-full" />
             <h3 className="text-slate-950 font-black text-xs md:text-sm italic tracking-tighter uppercase">{translate("Instituições Conectadas")}</h3>
           </div>
           <div className="md:absolute md:left-1/2 md:-translate-x-1/2 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center mt-1 md:mt-0">{translate("Governação Electrónica")}</div>
           <div className="hidden md:block" />
         </div>
        
        <div className="flex flex-nowrap gap-2 md:gap-3 overflow-x-auto custom-scrollbar-h pb-2">
          {["Todas", ...institutions.map(inst => inst.name)].map((name) => {
            const isActive = selectedInst === name;
            const countForInst = getCountForInst(name);
            return (
              <button 
                key={name}
                onClick={() => setSelectedInst(name)}
                className={`px-5 py-3 rounded-2xl text-[11px] md:text-xs font-black uppercase transition-all cursor-pointer shrink-0 text-left flex items-center gap-2.5 border ${
                  isActive 
                    ? 'bg-primary border-primary text-white shadow-lg' 
                    : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-350 shadow-none'
                }`}
              >
                <Building2 size={13} className={isActive ? 'text-white/80' : 'text-slate-400'} />
                <span>{name}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-indigo-950 text-white' : 'bg-red-600 text-white'
                }`}>
                  {countForInst}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Message List */}
      <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6">
          <div>
            <h4 className="font-black text-slate-900 text-lg md:text-xl italic uppercase tracking-tight flex items-center gap-2">
              <FolderOpen size={20} className="text-indigo-600" />
              {!isInst 
                ? (selectedInst === 'Todas' ? 'Todas as Cobranças & Facturas Recebidas' : `Cobranças & Facturas Recebidas: ${selectedInst}`)
                : (isInst ? 'Repositório de Documentos: Expediente de Entrada' : 'Pasta Digital de Documentos Homologados')
              }
            </h4>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mt-1">
              {!isInst 
                ? (selectedInst === 'Todas' ? 'Gestão unificada de liquidações, encargos correntes e histórico de facturas oficiais integradas' : `Gestão ativa de liquidações, taxas administrativas e facturas oficiais integradas para a entidade ${selectedInst}`)
                : (isInst ? 'Gestão de submissões de cidadãos, requerimentos de certidão e documentos para validação administrativa' : 'Consulta e acompanhamento de certidões, autenticações de assinatura, alvarás digitais e termos oficiais')
              }
            </p>
          </div>
          
          {/* Wallet Balance Widget for User mode when viewing invoices */}
          {!isInst && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 flex items-center gap-3 self-start lg:self-center">
              <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                <Coins size={16} />
              </div>
              <div>
                <div className="text-[9px] font-black text-slate-405 uppercase tracking-widest leading-none">Saldo QR Code</div>
                <div className="text-xs md:text-sm font-mono font-black text-emerald-700 mt-1">{walletBalance.toLocaleString('de-DE')} Kz</div>
              </div>
            </div>
          )}
        </div>

        {!isInst ? (
          // --- USER INVOICES TABLE ---
          filteredInvoicesForSelectedInst.length > 0 ? (
            <div className="overflow-auto rounded-[24px] bg-slate-50/20 custom-scrollbar max-h-[500px]">
              <table className="mobile-data-table w-full text-left border-collapse min-w-[900px]">
                <thead className="sticky top-0 z-10 bg-primary">
                  <tr className="bg-primary text-white text-[10px] font-black uppercase tracking-widest">
                    <th className="py-4 px-5 rounded-l-2xl">EMISSOR / IDENTIFICADOR</th>
                    <th className="py-4 px-5">DESCRIÇÃO E HISTÓRICO COBRADO</th>
                    <th className="py-4 px-5 text-center">ENTIDADE & REFERÊNCIA CAIXA</th>
                    <th className="py-4 px-5 text-right">VALOR EM DÉBITO</th>
                    <th className="py-4 px-5 text-center">VENCIMENTO</th>
                    <th className="py-4 px-5 text-center">ESTADO</th>
                    <th className="py-4 px-5 text-center rounded-r-2xl">AÇÕES INTERATIVAS</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filteredInvoicesForSelectedInst.map((item) => {
                    const isPendente = item.status === 'Pendente';
                    return (
                      <tr key={item.id} className="text-xs text-[#334155] hover:bg-slate-50/60 border-b border-slate-100 transition-colors">
                        {/* Emissor / ID */}
                        <td className="py-5 px-5 font-sans">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                isPendente 
                                  ? 'bg-[#fffbeb] text-[#b45309] border border-[#fef3c7]' 
                                  : 'bg-[#ecfdf5] text-[#047857] border border-[#d1fae5]'
                              }`}>
                                {isPendente ? 'Aguardando' : 'Liquidada'}
                              </span>
                              <span className="text-[9.5px] font-mono text-slate-400 font-bold">FAT#{item.id}</span>
                            </div>
                            <div className="font-black italic text-slate-950 text-[11px] md:text-sm uppercase tracking-tight leading-none pt-0.5">
                              {item.org}
                            </div>
                          </div>
                        </td>

                        {/* Descrição */}
                        <td className="py-5 px-5">
                          <div className="text-[#334155] text-[11px] md:text-xs font-semibold max-w-[320px] leading-relaxed break-words whitespace-normal">
                            {item.description}
                          </div>
                        </td>

                        {/* Entidade & Ref */}
                        <td className="py-5 px-5 text-center">
                          <div className="space-y-1 font-mono">
                            <div className="text-[10px] text-slate-500 font-bold">
                              Entidade: <span className="font-extrabold text-[#111827]">{item.entity}</span>
                            </div>
                            <div className="text-[11px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-lg inline-block">
                              Ref: {item.reference.match(/.{1,3}/g)?.join(' ') || item.reference}
                            </div>
                          </div>
                        </td>

                        {/* Valor */}
                        <td className="py-5 px-5 text-right font-mono font-black text-[#1e293b] text-xs md:text-sm">
                          {item.amount}
                        </td>

                        {/* Vencimento */}
                        <td className="py-5 px-5 text-center">
                          <div className="text-slate-800 font-semibold font-mono text-[11px] tracking-tight">
                            {item.deadline}
                            <div className="text-[9.5px] font-bold text-slate-400 font-sans mt-0.5">Emitido: {item.date}</div>
                          </div>
                        </td>

                        {/* Estado */}
                        <td className="py-5 px-5 text-center">
                          <span className={`text-[9.5px] font-black uppercase tracking-widest leading-none inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${
                            !isPendente
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${!isPendente ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'} shrink-0`} />
                            {item.status}
                          </span>
                        </td>

                        {/* Ações */}
                        <td className="py-5 px-5 text-center">
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                            {isPendente ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActivePayingInvoice(item);
                                    setShowPaySuccess(false);
                                    setPayMethod('express');
                                  }}
                                  className="bg-primary hover:bg-primary/95 text-white text-[9.5px] font-black uppercase tracking-widest px-3.5 py-2 rounded-xl cursor-pointer shadow-md shadow-primary/15 hover:scale-105 active:scale-95 transition-all truncate"
                                >
                                  PAGAR FATURA
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedInvoiceForDetail(item)}
                                  className="text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl text-[9.5px] font-black uppercase tracking-widest transition-colors cursor-pointer border border-slate-200/50 hover:scale-105 active:scale-95 transition-all"
                                >
                                  VER DOCUMENTO
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setSelectedInvoiceForDetail(item)}
                                className="text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl text-[9.5px] font-black uppercase tracking-widest transition-colors cursor-pointer border border-emerald-100/50 hover:scale-105 active:scale-95 transition-all"
                              >
                                VER DOCUMENTO
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[24px] md:rounded-[32px] p-12 md:p-20 text-center space-y-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm text-slate-400 border border-slate-200">
                <Receipt size={32} />
              </div>
              <div>
                <h4 className="text-base md:text-lg font-black text-slate-600 uppercase">Sem Facturas Emitidas</h4>
                <p className="text-xs md:text-sm text-slate-600 font-bold">
                  Não possui faturas emitidas ou cobranças pendentes nesta instituição ({selectedInst}). Todos os compromissos encontram-se saldados.
                </p>
              </div>
            </div>
          )
        ) : (
          // --- ORIGINAL DOCUMENTS TABLE ---
          finalFilteredDocs.length > 0 ? (
            <div className="overflow-auto rounded-[24px] bg-slate-50/20 custom-scrollbar max-h-[500px]">
              <table className="mobile-data-table w-full text-left border-collapse min-w-[900px]">
                <thead className="sticky top-0 z-10 bg-primary">
                  <tr className="bg-primary text-white text-[10px] font-black uppercase tracking-widest">
                    <th className="py-4 px-5 rounded-l-2xl">{isInst ? translate('CIDADÃO / REQUERENTE') : translate('ÓRGÃO EMISSOR')}</th>
                    <th className="py-4 px-5">{translate('TIPO DE DOCUMENTO / ASSUNTO')}</th>
                    <th className="py-4 px-5">{translate('CONTEÚDO / DETALHE')}</th>
                    <th className="py-4 px-5">{translate('PRAZO DE VALIDADE')}</th>
                    <th className="py-4 px-5 text-center">{translate('EMISSÃO (HORA / DATA)')}</th>
                    <th className="py-4 px-5 text-center">{translate('NÍVEL DE RESTRICÇÃO')}</th>
                    <th className="py-4 px-5 text-center rounded-r-2xl">{translate('AÇÕES')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {finalFilteredDocs.map((item) => {
                    const isUrgente = item.status === 'Urgente' || item.priorityScale === 'Crítico' || item.priorityScale === 'Urgente';
                    return (
                      <tr key={item.id} className="text-xs text-[#334155] hover:bg-slate-50/60 transition-colors">
                        {/* Cidadão / Órgão Emissor Column */}
                        <td className="py-5 px-5">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                item.unread 
                                  ? 'bg-red-600 text-white border border-red-600' 
                                  : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}>
                                {item.unread ? 'Não Lido' : 'Consultado'}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 font-mono">DOC: #{item.id}</span>
                              {item.unread && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#f87171] inline-block animate-pulse shrink-0" />
                              )}
                            </div>
                            <div className="font-black italic text-slate-900 text-[11px] md:text-sm uppercase tracking-tight leading-none">
                              {isInst 
                                ? `CIDADÃO: ${item.org}` 
                                : (item.org.startsWith('SOC - ') 
                                    ? item.org.replace('SOC - ', '') 
                                    : `ÓRGÃO: ${item.org}`
                                  )
                              }
                            </div>
                          </div>
                        </td>

                        {/* Assunto Tema Column */}
                        <td className="py-5 px-5">
                          <div className="space-y-1 text-left">
                            <div className="font-extrabold text-[#1e293b] text-xs md:text-sm tracking-tight">
                              {translate(item.details?.subject || item.preview.substring(0, 30))}
                            </div>
                            <div className="text-[9px] text-[#94a3b8] font-black uppercase tracking-widest leading-none">
                              {isInst ? translate('REQUERIMENTO DE CERTIDÃO') : translate(item.protocol?.category || 'PROVA DE VIDA DIGITAL')}
                            </div>
                          </div>
                        </td>

                        {/* Conteúdo / Detalhe Column */}
                        <td className="py-5 px-5">
                          <div className="text-[#64748b] text-[11px] font-medium max-w-[280px] break-words whitespace-normal leading-relaxed" title={translate(item.preview)}>
                            {translate(item.preview)}
                          </div>
                        </td>

                        {/* Data de Expiração Column */}
                        <td className="py-5 px-5">
                          <div className="flex items-center">
                            <span className="inline-flex items-center gap-1.5 text-[#e05252] text-[9px] font-semibold tracking-wider font-sans">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#f87171] animate-pulse shrink-0" />
                              {translate('EXPIRA')}: {translate(item.details?.deadline || item.protocol?.deadlineDate || 'UNLIMITED')}
                            </span>
                          </div>
                        </td>

                        {/* Hora / Data Column */}
                        <td className="py-5 px-5 text-center">
                          <div className="text-slate-800 font-bold font-mono text-[11px] tracking-tight">
                            {item.protocol?.officialTime || '11:00'}
                            <div className="text-[9.5px] font-bold text-slate-400 font-sans mt-0.5">{item.date}</div>
                          </div>
                        </td>

                        {/* Prioridade Column */}
                        <td className="py-5 px-5 text-center">
                          <span className={`text-[9px] font-black uppercase tracking-widest leading-none inline-block ${
                            isUrgente
                              ? 'text-[#e05252]'
                              : 'text-indigo-600'
                          }`}>
                            {translate(item.sensitivity || (isUrgente ? 'Restrito' : 'Público'))}
                          </span>
                        </td>

                        {/* Ações Column */}
                        <td className="py-5 px-5 text-center">
                          <button
                            type="button"
                            onClick={() => handleSelectMessage(item)}
                            className="text-[9.5px] font-black uppercase text-indigo-650 hover:text-indigo-850 transition-colors tracking-widest hover:underline cursor-pointer bg-transparent border-0 outline-none"
                          >
                            {isInst ? translate('ANALISAR DOCUMENTO') : translate('ABRIR DOCUMENTO')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[24px] md:rounded-[32px] p-12 md:p-20 text-center space-y-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm text-slate-400 border border-slate-200">
                <Folder size={32} />
              </div>
              <div>
                <h4 className="text-base md:text-lg font-black text-slate-600 uppercase">Sem Documentos Registados</h4>
                <p className="text-xs md:text-sm text-slate-600 font-bold">
                  {selectedInst !== 'Todas' ? `Nenhum documento localizado para "${selectedInst}"` : 'Todas certidões, alvarás, notificações administrativas validadas constam como arquivadas.'}
                </p>
              </div>
            </div>
          )
        )}
      </div>

      {/* --- PAYMENT MODAL SYSTEM --- */}
      <AnimatePresence>
        {activePayingInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => { if (!isPayingActive) setActivePayingInvoice(null); }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            {/* Modal Body */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white rounded-[32px] overflow-hidden shadow-2xl border border-slate-100 z-10 flex flex-col"
            >
              <div className="bg-primary p-6 md:p-8 text-white relative">
                <button 
                  onClick={() => setActivePayingInvoice(null)}
                  disabled={isPayingActive}
                  className="absolute top-5 right-5 text-white/70 hover:text-white hover:scale-105 active:scale-95 transition-all text-xs border border-white/20 rounded-full w-8 h-8 flex items-center justify-center cursor-pointer bg-white/10"
                >
                  ✕
                </button>
                <div className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Serviço de Pagamento Digital Integrado</div>
                <h3 className="text-lg md:text-xl font-black italic uppercase tracking-tight mt-1">Liquidando Fatura Oficial</h3>
                <div className="mt-3 font-mono text-[11px] bg-slate-950/25 inline-block px-3 py-1 rounded-lg">
                  {activePayingInvoice.org} Fatura: #{activePayingInvoice.invoiceNumber}
                </div>
              </div>

              {!showPaySuccess ? (
                <div className="p-6 md:p-8 space-y-6 overflow-y-auto max-h-[75vh]">
                  {/* Summary info card */}
                  <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex justify-between items-center">
                    <div>
                      <div className="text-[10px] font-black uppercase text-slate-400">Total a Liquidar</div>
                      <div className="text-xl md:text-2xl font-black font-mono text-primary tracking-tight mt-0.5">{activePayingInvoice.amount}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Vencimento</div>
                      <div className="text-xs font-black text-rose-600 mt-0.5 font-mono">{activePayingInvoice.deadline}</div>
                    </div>
                  </div>

                  {/* Payment Methods Tabs */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Método de Liquidação</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button 
                        type="button"
                        onClick={() => setPayMethod('express')}
                        disabled={isPayingActive}
                        className={`p-3.5 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer ${
                          payMethod === 'express' 
                            ? 'bg-primary/5 border-primary text-primary font-black shadow-sm' 
                            : 'bg-white border-slate-200 text-slate-500 font-bold hover:bg-slate-50'
                        }`}
                      >
                        <Smartphone size={18} />
                        <span className="text-[10px] uppercase leading-none tracking-tight">Express</span>
                      </button>
                      
                      <button 
                        type="button"
                        onClick={() => setPayMethod('carteira')}
                        disabled={isPayingActive}
                        className={`p-3.5 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer ${
                          payMethod === 'carteira' 
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-black shadow-sm' 
                            : 'bg-white border-slate-200 text-slate-500 font-bold hover:bg-slate-50'
                        }`}
                      >
                        <Coins size={18} />
                        <span className="text-[10px] uppercase leading-none tracking-tight">Carteira</span>
                      </button>

                      <button 
                        type="button"
                        onClick={() => setPayMethod('atm')}
                        disabled={isPayingActive}
                        className={`p-3.5 rounded-2xl border flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer ${
                          payMethod === 'atm' 
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-900 font-black shadow-sm' 
                            : 'bg-white border-slate-200 text-slate-500 font-bold hover:bg-slate-50'
                        }`}
                      >
                        <Copy size={18} />
                        <span className="text-[10px] uppercase leading-none tracking-tight">Referência</span>
                      </button>
                    </div>
                  </div>

                  {/* Payment Method Details */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 min-h-[140px] flex flex-col justify-center">
                    {payMethod === 'express' && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Smartphone size={16} className="text-primary" />
                          <h4 className="text-xs font-black uppercase text-[#1e293b]">Telemóvel Multicaixa Express</h4>
                        </div>
                        <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                          Será enviada uma notificação de débito autorizada para a aplicação do seu telemóvel associada ao seu BI.
                        </p>
                        <div className="relative">
                          <input 
                            type="text"
                            placeholder="Telemóvel associado (e.g. 932455120)"
                            value={expressPhone}
                            onChange={(e) => setExpressPhone(e.target.value)}
                            disabled={isPayingActive}
                            className="w-full bg-white border border-slate-200 font-mono font-bold text-xs md:text-sm px-4 py-3 rounded-xl focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {payMethod === 'carteira' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Coins size={16} className="text-emerald-700" />
                          <h4 className="text-xs font-black uppercase text-emerald-800">Débito do Saldo Virtual CDA</h4>
                        </div>
                        <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                          Desconte o valor diretamente do saldo unificado do cidadão da sua carteira digital. Transação instantânea sem taxas bancárias adicionais.
                        </p>
                        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex justify-between items-center">
                          <span className="text-xs font-extrabold text-emerald-800">Saldo Disponível:</span>
                          <span className="font-mono text-sm font-black text-emerald-700">{walletBalance.toLocaleString('de-DE')} Kz</span>
                        </div>
                        {walletBalance < activePayingInvoice.amountVal && (
                          <div className="text-[10px] text-red-600 font-black uppercase text-center bg-red-50 border border-red-100 rounded-xl py-2 mt-1">
                            ⚠️ SALDO INSUFICIENTE (Necessita de mais {(activePayingInvoice.amountVal - walletBalance).toLocaleString('de-DE')} Kz)
                          </div>
                        )}
                      </div>
                    )}

                    {payMethod === 'atm' && (
                      <div className="space-y-3 font-semibold">
                        <div className="flex items-center gap-2">
                          <Copy size={16} className="text-indigo-800" />
                          <h4 className="text-xs font-black uppercase text-indigo-900">Coordenadas de Pagamento Multicaixa</h4>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5 text-[11px] font-mono">
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-bold font-sans uppercase text-[10px]">Entidade:</span>
                            <span className="text-slate-900 font-black">{activePayingInvoice.entity}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-bold font-sans uppercase text-[10px]">Referência:</span>
                            <span className="text-indigo-700 font-black">
                              {activePayingInvoice.reference.match(/.{1,3}/g)?.join(' ') || activePayingInvoice.reference}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-bold font-sans uppercase text-[10px]">Montante:</span>
                            <span className="text-slate-900 font-black">{activePayingInvoice.amount}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            safeCopyToClipboard(activePayingInvoice.reference);
                            setCopiedInvoiceId(activePayingInvoice.id);
                            setTimeout(() => setCopiedInvoiceId(null), 2000);
                          }}
                          className="w-full bg-white hover:bg-slate-150 text-[10px] uppercase tracking-widest text-[#1e293b] border border-slate-200 rounded-xl py-2 cursor-pointer flex items-center justify-center gap-1.5 font-black"
                        >
                          {copiedInvoiceId === activePayingInvoice.id ? (
                            <>
                              <Check size={14} className="text-emerald-600" /> Copiado!
                            </>
                          ) : (
                            <>
                              <Copy size={12} /> Copiar Referência
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Core Action Button */}
                  <div className="pt-2">
                    {isPayingActive ? (
                      <div className="w-full bg-[#1e293b] text-white font-black text-xs uppercase tracking-widest rounded-2xl py-4 flex items-center justify-center gap-3">
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Comunicando com Sistema Monetário...</span>
                      </div>
                    ) : (
                      <button 
                        type="button"
                        onClick={handleSimulatePayment}
                        disabled={payMethod === 'carteira' && walletBalance < activePayingInvoice.amountVal}
                        className={`w-full py-4 text-xs font-black uppercase tracking-widest rounded-2xl text-center shadow-lg transition-all cursor-pointer ${
                          payMethod === 'carteira' && walletBalance < activePayingInvoice.amountVal
                            ? 'bg-slate-200 border border-slate-350 text-slate-400 cursor-not-allowed'
                            : 'bg-primary hover:bg-primary/95 text-white shadow-primary/20 hover:scale-[1.01]'
                        }`}
                      >
                        {payMethod === 'atm' ? 'Simular Autenticação Bancária' : 'Confirmar & Liquidar Agora'}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                // Success screen
                <div className="p-6 md:p-8 text-center space-y-6">
                  <div className="w-20 h-20 bg-emerald-50 rounded-full border border-emerald-100 flex items-center justify-center mx-auto text-emerald-600">
                    <CheckCircle2 size={42} />
                  </div>
                  <div>
                    <h4 className="text-slate-900 font-black text-lg uppercase tracking-tight">Cobrança Liquidada!</h4>
                    <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-1">
                      A factura <strong>#{activePayingInvoice.invoiceNumber}</strong> de {activePayingInvoice.org} foi com sucesso autenticada e liquidada nos ficheiros do Ministério das Finanças de Angola.
                    </p>
                  </div>
                  
                  {/* Decorative stamp receipt info */}
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 space-y-1.5 text-left text-[11px] font-mono">
                    <div className="text-slate-400 font-sans uppercase text-[9px] font-black tracking-widest text-center mb-1">Comprovativo Digital Homologado</div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span>Valor Pago:</span>
                      <span className="font-bold text-slate-900">{activePayingInvoice.amount}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span>Nº Transação SISP:</span>
                      <span className="font-bold text-indigo-700">TX-{(Math.floor(100000 + Math.random() * 900000))}</span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span>Titular:</span>
                      <span className="font-bold text-slate-700">Utente N-BI: {bi}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => {
                        const receiptObject = activePayingInvoice;
                        setActivePayingInvoice(null);
                        setSelectedInvoiceForDetail(receiptObject);
                      }}
                      className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 py-3.5 rounded-2xl text-[11.5px] font-black uppercase tracking-widest transition-all cursor-pointer text-center"
                    >
                      Ver Recibo Integral
                    </button>
                    <button 
                      type="button"
                      onClick={() => setActivePayingInvoice(null)}
                      className="flex-1 bg-primary hover:bg-primary/95 text-white py-3.5 rounded-2xl text-[11.5px] font-black uppercase tracking-widest transition-all cursor-pointer text-center shadow-md shadow-primary/15"
                    >
                      Fechar Janela
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- RECEIPT MODAL --- */}
      <AnimatePresence>
        {viewedReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setViewedReceipt(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            {/* Receipt Body */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm bg-white rounded-[32px] overflow-hidden shadow-2xl border border-slate-200 z-10 flex flex-col p-6 md:p-8 space-y-6"
            >
              {/* Receipt Header Banner */}
              <div className="text-center pb-4 border-b border-dashed border-slate-200 relative">
                <button 
                  onClick={() => setViewedReceipt(null)}
                  className="absolute top-0 right-0 text-slate-400 hover:text-slate-600 transition-colors w-7 h-7 flex items-center justify-center rounded-full border border-slate-100 hover:bg-slate-50 text-[11px] font-bold cursor-pointer"
                >
                  ✕
                </button>
                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600 mb-2 border border-emerald-100">
                  <ShieldCheck size={24} />
                </div>
                <div className="text-[10px] font-black text-slate-450 uppercase tracking-widest">República de Angola</div>
                <h4 className="text-sm font-black text-slate-900 uppercase italic tracking-tight mt-0.5">Recibo Eletrónico Digital</h4>
                <div className="text-[8.5px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-2 py-0.5 mt-1.5 inline-block font-black uppercase tracking-wider">
                  Assinado com Sucesso CDA v4.1
                </div>
              </div>

              {/* Receipt Main Details */}
              <div className="space-y-4 text-xs font-semibold">
                <div className="flex justify-between items-center text-slate-500 font-mono text-[10px]">
                  <span>Identificador Oficial:</span>
                  <span className="font-bold text-slate-800">REC-{viewedReceipt.id}-{viewedReceipt.reference.substring(0, 4)}</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-450 text-[10.5px]">Órgão Liquidador:</span>
                    <span className="text-slate-900 font-extrabold">{viewedReceipt.org}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-450 text-[10.5px]">Nº da Factura:</span>
                    <span className="text-slate-800 font-bold">{viewedReceipt.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-450 text-[10.5px]">Referência Utilizada:</span>
                    <span className="text-indigo-800 font-bold">
                      {viewedReceipt.reference.match(/.{1,3}/g)?.join(' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450 text-[10.5px]">NIF / Contribuinte Utente:</span>
                    <span className="text-slate-800 font-mono font-bold">{bi}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450 text-[10.5px]">Data Autenticação:</span>
                    <span className="text-slate-800 font-mono font-bold">Hoje - 16:29</span>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl flex justify-between items-center font-mono">
                  <span className="text-emerald-850 font-black uppercase text-[10px] font-sans">Montante Liquidado:</span>
                  <span className="text-[#047857] text-base font-black">{viewedReceipt.amount}</span>
                </div>
              </div>

              {/* Security Watermark Check */}
              <div className="bg-slate-50/50 rounded-2xl p-3 flex gap-2.5 items-start border border-slate-150">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                  Este comprovativo digital constitui prova idêntica à emissão física presencial, possuindo validade probatória legal permanente perante qualquer serviço da Administração do Estado Angolano.
                </p>
              </div>

              <button 
                type="button"
                onClick={() => setViewedReceipt(null)}
                className="w-full bg-primary hover:bg-primary/95 text-white py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer text-center shadow-lg"
              >
                Confirmar & Fechar Recibo
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
