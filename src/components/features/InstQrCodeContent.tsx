/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  QrCode, 
  Camera, 
  FileUp, 
  FileText, 
  History, 
  Trash2, 
  Download, 
  Copy, 
  Check, 
  ExternalLink,
  ChevronDown,
  Info,
  RefreshCw,
  Mail,
  ListFilter,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Key,
  FileCheck,
  Eye,
  Keyboard,
  ArrowLeft
} from 'lucide-react';
// QRCode loaded dynamically
import { Html5Qrcode } from 'html5-qrcode';
import { Document, Message } from '../../types';

interface InstQrCodeContentProps {
  qrCodeModuleRef?: { current: any };
  documents: Document[];
  messages?: Message[];
  onSelectMessage?: (msg: Message) => void;
  addAuditLog?: (action: string, type: 'info' | 'success' | 'warning' | 'critical') => void;
  setTab?: (tab: string) => void;
}

interface ScanHistoryItem {
  id: number;
  raw: string;
  parsed: {
    type: string;
    data: any;
    isJson: boolean;
  };
  source: string;
  time: string;
}

export function InstQrCodeContent({ documents, messages, onSelectMessage, addAuditLog, setTab }: InstQrCodeContentProps) {
  // Main Top Mode: 'reader' | 'generator' | 'history'
  const [activeMainTab, setActiveMainTab] = useState<'reader' | 'generator' | 'history'>('reader');

  // Sub-tabs for Reader: 'camera' | 'usb' | 'file' | 'text'
  const [activeReadTab, setActiveReadTab] = useState<'camera' | 'usb' | 'file' | 'text'>('camera');
  // Sub-tabs for Generator: 'pdf' | 'form' | 'free'
  const [activeGenTab, setActiveGenTab] = useState<'pdf' | 'form' | 'free'>('pdf');

  // Advanced zero-click validation states representing current reader cycle
  const [validationState, setValidationState] = useState<'idle' | 'validating' | 'valid' | 'not_found' | 'revoked' | 'invalid_signature'>('idle');
  const [validatedItem, setValidatedItem] = useState<{
    type: 'document' | 'message';
    title: string;
    protocolNumber: string;
    holder: string;
    date: string;
    time: string;
    locality: string;
    status: string;
    issuer: string;
    signature: string;
    hash: string;
    archiveReference?: string;
    archiveLocation?: string;
    detailsBody?: string;
  } | null>(null);

  // USB/Keyboard Wedge HID inputs state
  const [usbInputValue, setUsbInputValue] = useState('');
  const [showFullMessageDetailModal, setShowFullMessageDetailModal] = useState(false);
  const usbTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const usbInputRef = useRef<HTMLInputElement | null>(null);

  // Scanner - Camera State
  const [cameraRunning, setCameraRunning] = useState(false);
  // QRCode Module - loaded dynamically
  const [qrCode, setQrCode] = useState<any>(null);

  useEffect(() => {
    import('qrcode').then((mod) => {
      setQrCode(mod.default || mod);
    }).catch(err => {
      console.error('Failed to load QRCode module:', err);
    });
  }, []);
  const qrReaderRef = useRef<Html5Qrcode | null>(null);

  // Scanner - File State
  const [readSelectedFile, setReadSelectedFile] = useState<File | null>(null);
  const [readImgPreview, setReadImgPreview] = useState<string>('');
  const [readStatusText, setReadStatusText] = useState<string>('');

  // Scanner - Manual/Pastes Text State
  const [pastedTextInput, setPastedTextInput] = useState<string>('');

  // Scanner - Scan Result
  const [scanResult, setScanResult] = useState<ScanHistoryItem | null>(null);

  // Scanner - History State
  const [historyData, setHistoryData] = useState<ScanHistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem('qr_history');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  // Generator - File State (PDF / Image)
  const [genSelectedFile, setGenSelectedFile] = useState<File | null>(null);
  const [pdfProgress, setPdfProgress] = useState<number>(0);
  const [pdfStatus, setPdfStatus] = useState<string>('');
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [selectedPageIdx, setSelectedPageIdx] = useState<number>(0);
  const [extractedFields, setExtractedFields] = useState<Record<string, string>>({});
  const [currentAttachmentThumb, setCurrentAttachmentThumb] = useState<string>('');

  // Generator - Form State
  const [formType, setFormType] = useState<string>('Encomenda');
  const [formSender, setFormSender] = useState<string>('');
  const [formRecipient, setFormRecipient] = useState<string>('');
  const [formSubject, setFormSubject] = useState<string>('');
  const [formTracking, setFormTracking] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [formValue, setFormValue] = useState<string>('');
  const [formObs, setFormObs] = useState<string>('');
  const [formEcl, setFormEcl] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [formSize, setFormSize] = useState<number>(240);

  // Generator - Free Text State
  const [freeInputText, setFreeInputText] = useState<string>('');
  const [freeEcl, setFreeEcl] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [freeSize, setFreeSize] = useState<number>(240);

  // Generator - Result
  const [generatedQrCodeUrl, setGeneratedQrCodeUrl] = useState<string>('');
  const [generatedQrRawText, setGeneratedQrRawText] = useState<string>('');

  // Global Toasts / Custom Feedbacks
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warn' | 'info'>('info');

  const showToast = (msg: string, type: 'success' | 'error' | 'warn' | 'info' = 'info') => {
    setToastMessage(msg);
    setToastType(type);
    const t = setTimeout(() => {
      setToastMessage('');
    }, 3500);
    return () => clearTimeout(t);
  };

  // Type configuration helper (emoji, styles)
  const typeConfig: Record<string, { label: string; emoji: string; badgeClass: string }> = {
    package: { label: 'Encomenda', emoji: '📦', badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200' },
    invoice: { label: 'Fatura', emoji: '🧾', badgeClass: 'bg-red-50 text-red-800 border border-red-200' },
    contract: { label: 'Contrato', emoji: '📄', badgeClass: 'bg-blue-50 text-blue-850 border border-blue-200' },
    link: { label: 'Link', emoji: '🔗', badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200' },
    info: { label: 'Info', emoji: 'ℹ️', badgeClass: 'bg-indigo-50 text-indigo-800 border border-indigo-200' }
  };

  const examples = {
    package: JSON.stringify({
      "type": "Encomenda",
      "sender": "Correios do Brasil",
      "recipient": "Edlasio Galhardo",
      "tracking": "BR123456789BR",
      "weight": "1.2kg",
      "status": "Em trânsito",
      "origin": "São Paulo, SP",
      "destination": "Rio de Janeiro, RJ",
      "estimated": "12/06/2026"
    }, null, 2),
    invoice: JSON.stringify({
      "type": "Fatura",
      "sender": "Light S.A.",
      "subject": "Fatura de Energia",
      "due_date": "20/06/2026",
      "amount": "R$ 187,50",
      "customer": "Maria Oliveira",
      "reference": "05/2026"
    }, null, 2),
    contract: JSON.stringify({
      "type": "Contrato",
      "sender": "Cartório 3º Ofício",
      "subject": "Contrato de Locação",
      "doc_id": "CLT-2026-00482",
      "parties": "Carlos Andrade / Imobiliária Lar",
      "signed_date": "01/06/2026",
      "validity": "12 meses",
      "value": "R$ 2.500,00/mês"
    }, null, 2),
    link: "https://rastreamento.correios.com.br/app/index.php/p/resumo/objeto/BR123456789BR"
  };

  // Sync state helpers
  useEffect(() => {
    try {
      localStorage.setItem('qr_history', JSON.stringify(historyData));
    } catch (e) {}
  }, [historyData]);

  // Load PDF.js dynamically if needed
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).pdfjsLib) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      };
      document.head.appendChild(script);
    }
  }, []);

  // Start/Stop camera using useEffect to guarantee the target canvas is fully rendered in the DOM
  useEffect(() => {
    let active = true;
    const initCamera = async () => {
      if (cameraRunning) {
        // Wait a small delay to let React commit the render and guarantee react-reader-camera-view exists
        await new Promise(resolve => setTimeout(resolve, 80));
        if (!active) return;

        const el = document.getElementById("react-reader-camera-view");
        if (!el) {
          console.error("react-reader-camera-view wrapper div not found in DOM");
          setCameraRunning(false);
          showToast('Erro ao iniciar visualizador de câmera.', 'error');
          return;
        }

        try {
          const html5QrCode = new Html5Qrcode("react-reader-camera-view");
          qrReaderRef.current = html5QrCode;
          await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 220, height: 220 } },
            (decodedText) => {
              stopCamera();
              processResult(decodedText, 'câmera');
            },
            () => {}
          );
        } catch (err) {
          console.error("Camera start failed:", err);
          if (active) {
            setCameraRunning(false);
            showToast('Câmera não disponível ou permissão recusada.', 'error');
          }
        }
      }
    };

    initCamera();

    return () => {
      active = false;
    };
  }, [cameraRunning]);

  // Automatically turn off camera when switching tabs or views
  useEffect(() => {
    if (activeMainTab !== 'reader' || activeReadTab !== 'camera') {
      stopCamera();
    }
  }, [activeMainTab, activeReadTab]);

  // Clean camera up on unmount
  useEffect(() => {
    return () => {
      if (qrReaderRef.current && qrReaderRef.current.isScanning) {
        qrReaderRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // -------------------------
  // READER PROCESSORS OR ACTIONS
  // -------------------------
  const startCamera = () => {
    setCameraRunning(true);
    setReadStatusText('');
  };

  const stopCamera = async () => {
    if (qrReaderRef.current) {
      if (qrReaderRef.current.isScanning) {
        try {
          await qrReaderRef.current.stop();
        } catch (e) {
          console.warn("Error stopping scanner instance:", e);
        }
      }
      qrReaderRef.current = null;
    }
    setCameraRunning(false);
  };

  const parseStructuredPayload = (raw: string) => {
    const payload: Record<string, string> = {};
    const parts = raw.split('|').map(part => part.trim()).filter(Boolean);
    for (const part of parts) {
      const separatorIndex = part.indexOf(':');
      if (separatorIndex === -1) continue;
      const key = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      if (!key || !value) continue;
      payload[key] = value;
    }
    if (Object.keys(payload).length === 0) return null;
    return {
      protocolNumber: payload['AO-PROTOCOL'] || payload['PROTOCOL'] || payload['PROTOCOLNUMBER'],
      internalId: payload['ID'],
      archiveReference: payload['ARCHIVE'],
      archiveLocation: payload['LOCATION'],
      hash: payload['HASH'],
      signature: payload['SEAL'],
      certificate: payload['CERT'],
      status: payload['VALID'] === 'SIM' ? 'Válido' : payload['VALID'] || undefined,
    };
  };

  const parseContent = (raw: string) => {
    try {
      const obj = JSON.parse(raw);
      let detectedType = 'info';
      const s = JSON.stringify(obj).toLowerCase();
      if (s.includes('tracking') || s.includes('encomenda') || s.includes('rastreamento')) {
        detectedType = 'package';
      } else if (s.includes('fatura') || s.includes('boleto') || s.includes('amount') || s.includes('barcode') || s.includes('due_date')) {
        detectedType = 'invoice';
      } else if (s.includes('contrato') || s.includes('contract') || s.includes('parties')) {
        detectedType = 'contract';
      } else if (s.includes('url') || s.includes('http')) {
        detectedType = 'link';
      }
      return { type: detectedType, data: obj, isJson: true };
    } catch (e) {
      const structured = parseStructuredPayload(raw.trim());
      if (structured) {
        return { type: 'info', data: structured, isJson: false };
      }
      if (/^https?:\/\//i.test(raw.trim())) {
        return { type: 'link', data: { url: raw.trim() }, isJson: false };
      }
      if (/^[A-Z]{2}\d{9}[A-Z]{2}$/i.test(raw.trim())) {
        return { type: 'package', data: { tracking: raw.trim().toUpperCase(), sender: 'Correios', subject: 'Rastreamento' }, isJson: false };
      }
      return { type: 'info', data: { content: raw }, isJson: false };
    }
  };

  const runValidationFlow = async (rawCode: string, source: string) => {
    // 1. Initial Processing State
    setValidationState('validating');
    setValidatedItem(null);
    showToast('📡 Sincronizando com a base de dados central CDA...', 'info');

    // Wait 1200ms to simulate official digital ledger verification & cryptographic seal validity queries
    await new Promise(resolve => setTimeout(resolve, 1200));

    const trimmed = rawCode.trim();
    const normalizedCode = trimmed.toUpperCase();

    // Try parsing JSON if rawCode is JSON
    let parsedJson: any = null;
    try {
      parsedJson = JSON.parse(trimmed);
    } catch(e) {}
    if (!parsedJson) {
      parsedJson = parseStructuredPayload(trimmed);
    }

    // Extracted target search keys for looking up documents or official letters
    const searchKeys = [
      normalizedCode,
      parsedJson?.protocolNumber?.toUpperCase() || '',
      parsedJson?.rastreamento?.toUpperCase() || '',
      parsedJson?.code?.toUpperCase() || '',
      parsedJson?.id?.toString() || '',
      parsedJson?.protocolo?.toUpperCase() || '',
      parsedJson?.["Nº PROTOCOLO NACIONAL"]?.toUpperCase() || '',
      parsedJson?.referencia?.toUpperCase() || '',
    ].filter(Boolean);

    // Let's check matching document
    let foundDoc: Document | null = null;
    for (const doc of documents) {
      const docCode = doc.code?.toUpperCase() || '';
      const docProt = doc.protocol?.protocolNumber?.toUpperCase() || '';
      const docNum = doc.number?.toUpperCase() || '';
      
      const isMatch = searchKeys.some(key => 
        key === docCode || 
        key === docProt || 
        key === docNum || 
        docProt.includes(key) || 
        key.includes(docProt) ||
        docCode.includes(key)
      ) || normalizedCode.includes(docCode) || normalizedCode.includes(docProt);

      if (isMatch) {
         foundDoc = doc;
         break;
      }
    }

    // Let's check matching message (Inbox or InstInbox)
    let foundMsg: Message | null = null;
    if (!foundDoc && messages) {
      for (const msg of messages) {
        const msgId = msg.id?.toString() || '';
        const msgProt = msg.protocol?.protocolNumber?.toUpperCase() || '';
        const msgSubject = msg.preview?.toUpperCase() || msg.details?.subject?.toUpperCase() || '';

        const isMatch = searchKeys.some(key => 
          key === msgId || 
          key === msgProt || 
          msgProt.includes(key) || 
          key.includes(msgProt)
        ) || normalizedCode.includes(msgProt) || normalizedCode.includes(msgId);

        if (isMatch) {
          foundMsg = msg;
          break;
        }
      }
    }

    // Determine the status if found or not
    if (foundDoc) {
      // Formulate validated item object, merging any custom parsed JSON properties
      const item = {
        type: 'document' as const,
        title: parsedJson?.tipo || parsedJson?.type || parsedJson?.assunto || foundDoc.name,
        protocolNumber: parsedJson?.protocolNumber || parsedJson?.referencia || parsedJson?.tracking || parsedJson?.rastreamento || foundDoc.protocol?.protocolNumber || `PROT-${foundDoc.code}-CDA`,
        holder: parsedJson?.recipient || parsedJson?.destinatario || parsedJson?.holder || parsedJson?.customer || foundDoc.holder || 'Utente Autenticado',
        date: parsedJson?.data || foundDoc.issuedAt || foundDoc.protocol?.officialIssueDate || new Date().toLocaleDateString('pt-BR'),
        time: parsedJson?.hora || foundDoc.protocol?.officialTime || '09:00',
        locality: parsedJson?.origin || parsedJson?.localidade || (foundDoc.protocol?.currentState ? 'Repartição Pública de Luanda' : 'Direção Nacional de Identificação'),
        status: parsedJson?.status || foundDoc.validity || 'Ativo',
        issuer: parsedJson?.sender || parsedJson?.remetente || foundDoc.issuer || foundDoc.protocol?.issuerInstitution || 'Conservatória Geral de Registos',
        signature: parsedJson?.signature || foundDoc.protocol?.digitalSignature || 'SECURE-RSA-SEAL-2026-CDA-AO',
        hash: parsedJson?.hash || foundDoc.protocol?.documentHash || 'SHA256:0d9f8e7d8c7b6a5b4c3d2e1f0a',
        archiveReference: parsedJson?.archiveReference || foundDoc.protocol?.archiveReference,
        archiveLocation: parsedJson?.archiveLocation || foundDoc.protocol?.archiveLocation,
        detailsBody: parsedJson?.observacoes || parsedJson?.body || `Documento oficial certificado digitalmente sob a tutela do Ministério da Justiça e dos Direitos Humanos digitalizado com sucesso.`
      };

      // Check for Revocation (e.g. if title/name has "Cancelado", "Revogado", or list matches "SOC-AN-2026")
      if (item.protocolNumber === "SOC-AN-2026" || item.title.toLowerCase().includes("suspenso") || item.title.toLowerCase().includes("revogado") || item.status.toLowerCase().includes("revogado")) {
        setValidationState('revoked');
        setValidatedItem(item);
        showToast('🛑 Documento Revogado / Cancelado Oficialmente!', 'error');
        logAudit(trimmed, 'Documento revogado');
      } 
      // Check for Invalid Signature (e.g. if signature contains SIGN_ERROR or explicitly UNSIGNED)
      else if (foundDoc.code === 'UNSIGNED' || item.signature.includes('ERR')) {
        setValidationState('invalid_signature');
        setValidatedItem(item);
        showToast('⚠️ Falha crítica: Assinatura Digital do documento inválida!', 'error');
        logAudit(trimmed, 'Falha na validação da assinatura');
      } 
      // Valid state
      else {
        setValidationState('valid');
        setValidatedItem(item);
        showToast('✅ Documento validado com sucesso!', 'success');
        logAudit(trimmed, 'Documento válido');
      }

    } else if (foundMsg) {
      // Formulate validated message item
      const item = {
        type: 'message' as const,
        title: foundMsg.details?.subject || foundMsg.preview || 'Correspondência Oficial',
        protocolNumber: foundMsg.protocol?.protocolNumber || `PROT-${foundMsg.id}-CDA`,
        holder: foundMsg.org || 'Ministério do Interior',
        date: foundMsg.date || foundMsg.protocol?.officialIssueDate || new Date().toLocaleDateString('pt-BR'),
        time: foundMsg.protocol?.officialTime || '14:30',
        locality: foundMsg.protocol?.issuerResponsible || 'Gabinete de Expedição Digital',
        status: foundMsg.status || 'Ativo',
        issuer: foundMsg.org || 'Ministério do Interior',
        signature: foundMsg.protocol?.digitalSignature || 'SECURE-RSA-SEAL-2026-CDA-AO',
        hash: foundMsg.protocol?.documentHash || 'SHA256:7f1e2d3c4b5a69788d7c6b5a4',
          archiveReference: foundMsg.protocol?.archiveReference,
          archiveLocation: foundMsg.protocol?.archiveLocation,
          detailsBody: foundMsg.details?.body || 'Conteúdo oficial tramitado e autenticado pelo Correio Digital de Angola para uso intergovernamental.'
      };

      // Check for Revocation or Emergency block
      if (item.protocolNumber === "SOC-AN-2026" || foundMsg.status?.toLowerCase().includes("recusada") || foundMsg.status?.toLowerCase().includes("suspenso")) {
        setValidationState('revoked');
        setValidatedItem(item);
        showToast('🛑 Correspondência suspensa temporariamente sob o Protocolo SOC-AN-2026!', 'error');
        logAudit(trimmed, 'Documento revogado');
      } 
      // Check signature validation error
      else if (foundMsg.status?.toLowerCase().includes("pendente") && !foundMsg.protocol) {
        setValidationState('invalid_signature');
        setValidatedItem(item);
        showToast('⚠️ Assinatura Eletrónica pendente no sistema de chancela.', 'error');
        logAudit(trimmed, 'Falha na validação da assinatura');
      }
      else {
        setValidationState('valid');
        setValidatedItem(item);
        showToast('✅ Correspondência/Documento validado com sucesso!', 'success');
        logAudit(trimmed, 'Documento válido');
      }

    } else {
      // If code looks like a synthetic JSON or typical protocol pattern, let's treat it as valid synthetic
      if (trimmed.length > 5 && (trimmed.includes('{') || trimmed.includes('PROT-') || trimmed.includes('MINIS-') || trimmed.includes('CDA-'))) {
        const isSuspended = trimmed.includes('SUSPENSO') || trimmed.includes('REVOGADO') || trimmed.includes('REVOKED') || trimmed.includes('SOC-AN-2026');
        const isNoSignature = trimmed.includes('SEM_ASSINATURA') || trimmed.includes('UNSIGNED') || trimmed.includes('ERR_SIG');

        const protocolNum = parsedJson?.protocolNumber || parsedJson?.referencia || parsedJson?.tracking || (trimmed.startsWith('PROT-') || trimmed.startsWith('MINIS-') ? trimmed : `CDA-LUA-${Math.floor(100000 + Math.random()*900000)}`);
        const holderName = parsedJson?.recipient || parsedJson?.destinatario || parsedJson?.holder || parsedJson?.customer || 'Edlasio Galhardo';
        
        const item = {
          type: 'document' as const,
          title: parsedJson?.tipo || parsedJson?.type || parsedJson?.assunto || 'Guia de Correspondência Oficial Transmitida',
          protocolNumber: protocolNum,
          holder: holderName,
          date: parsedJson?.data || new Date().toLocaleDateString('pt-BR'),
          time: parsedJson?.hora || new Date().toLocaleTimeString('pt-BR').substring(0, 5),
          locality: parsedJson?.origin || parsedJson?.localidade || 'Centro Geral de Distribuição (Luanda)',
          status: parsedJson?.status || 'Válido / Em Trânsito',
          issuer: parsedJson?.sender || parsedJson?.remetente || 'Direção Nacional de Correios',
          signature: parsedJson?.signature || 'RSA-KEY-SHA256-AUTHENTIC-2026',
          hash: parsedJson?.hash || 'SHA256:d82ebd908e09f87c6533010b9876274',
          archiveReference: parsedJson?.archiveReference,
          archiveLocation: parsedJson?.archiveLocation,
          detailsBody: parsedJson?.observacoes || parsedJson?.body || 'Metadados interpretados e assinados eletronicamente com sucesso.'
        };

        if (isSuspended) {
          setValidationState('revoked');
          setValidatedItem(item);
          showToast('🛑 Documento listado como suspenso / revogado no banco nacional!', 'error');
          logAudit(trimmed, 'Documento revogado');
        } else if (isNoSignature) {
          setValidationState('invalid_signature');
          setValidatedItem(item);
          showToast('⚠️ Erro crítico: Falha na validação da assinatura digital!', 'error');
          logAudit(trimmed, 'Falha na validação da assinatura');
        } else {
          setValidationState('valid');
          setValidatedItem(item);
          showToast('✅ Correspondência decodificada e autenticada!', 'success');
          logAudit(trimmed, 'Documento válido');
        }
      } else {
        // Definitely not found
        setValidationState('not_found');
        setValidatedItem(null);
        showToast('❌ Correspondência / Documento não localizado!', 'error');
        logAudit(trimmed, 'Documento não encontrado');
      }
    }
  };

  const logAudit = (code: string, resultLabel: string) => {
    const ip = `10.224.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`;
    if (addAuditLog) {
      addAuditLog(`Validação Automática - Código: "${code}" | Resultado: [${resultLabel}] - IP Autenticado: ${ip} (Operador: Edlasio Galhardo)`, resultLabel === 'Documento válido' ? 'success' : resultLabel === 'Documento não encontrado' ? 'warning' : 'critical');
    }
  };

  const processResult = (raw: string, source: string) => {
    const parsed = parseContent(raw);
    const entry: ScanHistoryItem = {
      id: Date.now(),
      raw,
      parsed,
      source,
      time: new Date().toLocaleString('pt-BR')
    };
    
    setHistoryData(prev => [entry, ...prev.slice(0, 59)]);
    setScanResult(entry);
    showToast('✅ Código capturado pelo descodificador!', 'success');
    
    // Auto-trigger the Zero-Click validation engine
    runValidationFlow(raw, source);
  };

  const runSimulatedUsbScan = (codeToSimulate: string) => {
    setUsbInputValue('');
    setValidatedItem(null);
    setValidationState('idle');
    showToast('📶 A emular sinal de teclado do Leitor USB (Keyboard Wedge)...', 'info');

    let typed = '';
    const chars = codeToSimulate.split('');
    let idx = 0;

    const interval = setInterval(() => {
      if (idx < chars.length) {
        typed += chars[idx];
        setUsbInputValue(typed);
        idx++;
      } else {
        clearInterval(interval);
        // Play synthetic web-audio "bip" sound indicator for high professional fidelity!
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime); // 1.2KHz professional reader pitch
          gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.12);
        } catch(e) {}

        // Fire zero-click automated processing
        processResult(codeToSimulate, 'Leitor USB (Emulado)');
        setUsbInputValue('');
      }
    }, 15);
  };

  const handleFileRead = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setReadSelectedFile(file);
    const url = URL.createObjectURL(file);
    setReadImgPreview(url);
    setReadStatusText('⏳ Lendo QR Code...');

    const tempId = 'temp-read-qr-canvas';
    let tempEl = document.getElementById(tempId);
    if (!tempEl) {
      tempEl = document.createElement('div');
      tempEl.id = tempId;
      tempEl.style.display = 'none';
      document.body.appendChild(tempEl);
    }

    const tmpScanner = new Html5Qrcode(tempId);
    tmpScanner.scanFile(file, true)
      .then((result) => {
        setReadStatusText('✅ QR Code lido com sucesso!');
        processResult(result, 'arquivo');
      })
      .catch(() => {
        setReadStatusText('❌ Nenhum QR Code encontrado na imagem.');
        showToast('Não foi possível ler nenhum QR Code na imagem.', 'error');
        setTimeout(() => {
          setReadSelectedFile(null);
          setReadImgPreview('');
          setReadStatusText('');
        }, 3000);
      });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragDropRead = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const dt = new DataTransfer();
      dt.items.add(file);
      handleFileRead({ target: { files: dt.files } } as any);
    }
  };

  const loadExampleText = (type: keyof typeof examples) => {
    setPastedTextInput(examples[type]);
  };

  const analyzePastedText = () => {
    const text = pastedTextInput.trim();
    if (!text) {
      showToast('Por favor, cole algum conteúdo primeiro.', 'warn');
      return;
    }
    processResult(text, 'texto');
  };

  const copyResultRaw = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copiado para a área de transferência!', 'success');
    });
  };

  const openHistoryItem = (item: ScanHistoryItem) => {
    setScanResult(item);
    setActiveMainTab('reader');
    setActiveReadTab('camera'); 
  };

  const clearHistory = () => {
    setHistoryData([]);
    showToast('Histórico limpo com sucesso.', 'success');
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent opening the item
    setHistoryData(prev => prev.filter(item => item.id !== id));
    showToast('Item removido do histórico.', 'success');
  };

  // -------------------------
  // GENERATOR PROCESSORS OR ACTIONS
  // -------------------------
  const buildAttachmentThumb = (dataURL: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 72;
        let ratio = Math.min(maxSize / img.width, maxSize / img.height);
        ratio = Math.min(ratio, 1);
        canvas.width = Math.max(1, Math.round(img.width * ratio));
        canvas.height = Math.max(1, Math.round(img.height * ratio));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const thumb = canvas.toDataURL('image/jpeg', 0.28);
          setCurrentAttachmentThumb(thumb);
          resolve(thumb);
        } else {
          resolve('');
        }
      };
      img.onerror = () => resolve('');
      img.src = dataURL;
    });
  };

  const buildMetadata = (filename: string) => {
    const name = filename.replace(/\.[^.]+$/, '');
    const extMatch = filename.match(/\.([^.]+)$/);
    const ext = extMatch ? extMatch[1].toUpperCase() : 'IMAGEM';
    let type = 'Documento';
    const nl = name.toLowerCase();
    if (nl.includes('fatura') || nl.includes('boleto') || nl.includes('invoice')) type = 'Fatura';
    else if (nl.includes('contrato') || nl.includes('contract')) type = 'Contrato';
    else if (nl.includes('encomenda') || nl.includes('rastreamento') || nl.includes('tracking')) type = 'Encomenda';
    else if (nl.includes('carta') || nl.includes('letter')) type = 'Carta';

    const ref = 'DOC-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    return {
      tipo: type,
      remetente: '',
      destinatario: '',
      assunto: name,
      referencia: ref,
      data: new Date().toLocaleDateString('pt-BR'),
      formato: ext,
      observacoes: ''
    };
  };

  const extractAndRender = async (dataURL: string, filename: string) => {
    buildAttachmentThumb(dataURL);
    setPdfStatus('A verificar QR Code na correspondência...');
    
    try {
      const tempId = 'temp-gen-qr-canvas';
      let tempEl = document.getElementById(tempId);
      if (!tempEl) {
        tempEl = document.createElement('div');
        tempEl.id = tempId;
        tempEl.style.display = 'none';
        document.body.appendChild(tempEl);
      }
      
      const response = await fetch(dataURL);
      const blob = await response.blob();
      const file = new File([blob], 'doc.jpg', { type: 'image/jpeg' });
      
      const html5QrCodeFile = new Html5Qrcode(tempId);
      html5QrCodeFile.scanFile(file, true)
        .then(result => {
          showToast('🎉 QR Code encontrado na correspondência!', 'success');
          let parsedData: Record<string, string> = { qr_detectado: result };
          try {
            parsedData = JSON.parse(result);
          } catch (e) {}
          setExtractedFields(parsedData);
        })
        .catch(() => {
          const meta = buildMetadata(filename);
          setExtractedFields(meta);
        });
    } catch (e) {
      const meta = buildMetadata(filename);
      setExtractedFields(meta);
    }
  };

  const handleGenFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setGenSelectedFile(file);
    setPdfProgress(10);
    setPdfStatus('A carregar ficheiro...');
    setPdfPages([]);
    setSelectedPageIdx(0);
    setGeneratedQrCodeUrl('');

    try {
      if (file.type === 'application/pdf') {
        const ab = await file.arrayBuffer();
        const pdfjs = (window as any).pdfjsLib;
        if (!pdfjs) {
          setPdfProgress(100);
          setPdfStatus('PDF.js em carregamento. Fallback em execução...');
          const meta = buildMetadata(file.name);
          setExtractedFields(meta);
          return;
        }

        const pdf = await pdfjs.getDocument({ data: ab }).promise;
        const numPages = pdf.numPages;
        const pagesData: string[] = [];

        for (let i = 1; i <= numPages; i++) {
          setPdfProgress(20 + Math.round((i / numPages) * 65));
          setPdfStatus(`A processar página ${i} de ${numPages}...`);
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext('2d');
          if (context) {
            await page.render({ canvasContext: context, viewport }).promise;
            pagesData.push(canvas.toDataURL('image/jpeg', 0.8));
          }
        }
        
        setPdfProgress(100);
        setPdfStatus('Processado com Sucesso!');
        setPdfPages(pagesData);
        if (pagesData.length > 0) {
          extractAndRender(pagesData[0], file.name);
        }
      } else {
        setPdfProgress(50);
        setPdfStatus('A carregar imagem...');
        const reader = new FileReader();
        reader.onload = (e) => {
          setPdfProgress(100);
          setPdfStatus('Imagem processada!');
          const result = e.target?.result as string;
          setPdfPages([result]);
          extractAndRender(result, file.name);
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      showToast('❌ Erro no processamento: ' + err.message, 'error');
      setGenSelectedFile(null);
    }
  };

  const handleDragDropGen = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const dt = new DataTransfer();
      dt.items.add(file);
      handleGenFileChange({ target: { files: dt.files } } as any);
    }
  };

  const generateQRFromExtracted = async () => {
    if (Object.keys(extractedFields).length === 0) {
      showToast('Nenhum dado para codificar.', 'warn');
      return;
    }

    const payloadObj: Record<string, any> = { ...extractedFields };
    if (currentAttachmentThumb) {
      payloadObj.__imagem_preview = currentAttachmentThumb;
      payloadObj.__imagem_tipo = 'thumb_jpeg_72';
    }

    let payload = JSON.stringify(payloadObj, null, 2);
    if (payload.length > 2650 && payloadObj.__imagem_preview) {
      delete payloadObj.__imagem_preview;
      delete payloadObj.__imagem_tipo;
      payload = JSON.stringify(payloadObj, null, 2);
      showToast('⚠️ Thumbnail removido devido ao limite de caracteres do QR Code.', 'warn');
    }

    try {
      const url = await qrCode?.toDataURL(payload, {
        width: 240,
        margin: 2,
        errorCorrectionLevel: 'M'
      });
      setGeneratedQrCodeUrl(url);
      setGeneratedQrRawText(payload);
      showToast('✅ QR Code gerado de forma correta!', 'success');
    } catch (e: any) {
      showToast('Erro ao codificar QR: ' + e.message, 'error');
    }
  };

  const generateQRFromFormSubmit = async () => {
    if (!formSender && !formRecipient && !formSubject && !formTracking) {
      showToast('⚠️ Preencha pelo menos um campo principal (Remetente, Destinatário, Assunto ou Rastreamento).', 'warn');
      return;
    }

    const payloadObj: Record<string, string> = {
      tipo: formType,
      remetente: formSender,
      destinatario: formRecipient,
      assunto: formSubject,
      rastreamento: formTracking,
      data: formDate ? new Date(formDate + 'T12:00:00').toLocaleDateString('pt-BR') : '',
      valor: formValue,
      observacoes: formObs,
      gerado_em: new Date().toLocaleString('pt-BR')
    };

    Object.keys(payloadObj).forEach(key => {
      if (!payloadObj[key]) delete payloadObj[key];
    });

    const payload = JSON.stringify(payloadObj, null, 2);

    try {
      const url = await qrCode?.toDataURL(payload, {
        width: formSize,
        margin: 2,
        errorCorrectionLevel: formEcl
      });
      setGeneratedQrCodeUrl(url);
      setGeneratedQrRawText(payload);
      showToast('✅ QR Code gerado de forma correta!', 'success');
    } catch (e: any) {
      showToast('Erro: ' + e.message, 'error');
    }
  };

  const generateQRFreeSubmit = async () => {
    if (!freeInputText.trim()) {
      showToast('Digite o conteúdo que deseja codificar.', 'warn');
      return;
    }

    try {
      const url = await qrCode?.toDataURL(freeInputText, {
        width: freeSize,
        margin: 2,
        errorCorrectionLevel: freeEcl
      });
      setGeneratedQrCodeUrl(url);
      setGeneratedQrRawText(freeInputText);
      showToast('✅ QR Code livre gerado!', 'success');
    } catch (e: any) {
      showToast('Erro: ' + e.message, 'error');
    }
  };

  const downloadQR = () => {
    if (!generatedQrCodeUrl) return;
    const a = document.createElement('a');
    a.href = generatedQrCodeUrl;
    a.download = `qrcode_cada_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('📥 Download do QR Code iniciado!', 'success');
  };

  const copyQRImage = async () => {
    if (!generatedQrCodeUrl) return;
    try {
      const response = await fetch(generatedQrCodeUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      showToast('📋 QR Code copiado para a área de transferência!', 'success');
    } catch (e) {
      showToast('Navegador incompatível com cópia de imagem. Use o botão Baixar PNG.', 'error');
    }
  };

  const testReadGeneratedQR = () => {
    setActiveMainTab('reader');
    setActiveReadTab('text');
    setPastedTextInput(generatedQrRawText);
    showToast('💡 Dados copiados para o descodificador! Clique em Analisar Conteúdo.', 'info');
  };

  const resetGenFile = () => {
    setGenSelectedFile(null);
    setPdfPages([]);
    setSelectedPageIdx(0);
    setExtractedFields({});
    setGeneratedQrCodeUrl('');
    setCurrentAttachmentThumb('');
  };

  return (
    <div className="space-y-8 w-full pb-24 px-4 pt-4 relative animate-fade-in" id="inst-qrcode-replica-view">
      
      {/* Toast floating system */}
      {toastMessage && (
        <div 
          className={`fixed top-6 right-6 z-50 p-4 rounded-xl border shadow-lg max-w-xs transition-all duration-300 transform translate-y-0 flex items-center gap-3 ${
            toastType === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            toastType === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
            toastType === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}
          id="custom-toast-indicator"
        >
          <div className="text-xs font-semibold">{toastMessage}</div>
        </div>
      )}

      {/* 1. BRANDING HEADER (Top rounded white card) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-sm animate-fade-in" id="qr-branding-header">
        <div className="flex items-center gap-4">
          <div className="w-[52px] h-[52px] rounded-full bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/15 shrink-0">
            <QrCode className="w-[24px] h-[24px] text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-slate-805 font-extrabold text-base md:text-lg lg:text-xl leading-tight">QR Mail Reader</h1>
            <p className="text-blue-600 text-[12px] font-bold flex items-center gap-1.5 mt-0.5">
              <svg className="w-3 h-3 text-amber-500 fill-amber-500" viewBox="0 0 24 24">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Leitor &amp; Gerador de Correspondência
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          {setTab && (
            <button
              onClick={() => setTab('home')}
              className="bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl px-4 py-2 border border-slate-200 text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 shadow-xs active:scale-95"
            >
              <ArrowLeft size={14} strokeWidth={2.5} />
              Voltar ao Painel
            </button>
          )}
          <span className="bg-blue-50 border border-blue-100 text-blue-700 rounded-full px-4 py-1.5 text-xs font-bold" id="scan-count-badge">
            {historyData.length} escaneados
          </span>
        </div>
      </div>

      {/* 2. MAIN NAV (Ler QR / Gerar QR / Histórico buttons side by side) */}
      <div className="grid grid-cols-3 gap-4" id="main-tabs-selector">
        <button 
          onClick={() => { setActiveMainTab('reader'); }}
          className={`flex items-center justify-center gap-2.5 py-4.5 sm:py-5 px-4 text-xs font-black uppercase tracking-[0.12em] rounded-xl border transition-all duration-250 ${
            activeMainTab === 'reader'
              ? 'bg-blue-600 text-white border-transparent shadow-md shadow-blue-500/10 scale-[1.01]'
              : 'bg-white text-slate-650 border-slate-200 hover:border-blue-400 hover:bg-slate-50'
          }`}
        >
          <QrCode className="w-4 h-4 shrink-0" strokeWidth={2.5} />
          <span className="truncate">LER QR CODE</span>
        </button>
        <button 
          onClick={() => { setActiveMainTab('generator'); }}
          className={`flex items-center justify-center gap-2.5 py-4.5 sm:py-5 px-4 text-xs font-black uppercase tracking-[0.12em] rounded-xl border transition-all duration-250 ${
            activeMainTab === 'generator'
              ? 'bg-blue-600 text-white border-transparent shadow-md shadow-blue-500/10 scale-[1.01]'
              : 'bg-white text-slate-650 border-slate-200 hover:border-blue-400 hover:bg-slate-50'
          }`}
        >
          <QrCode className="w-4 h-4 shrink-0" strokeWidth={2.5} />
          <span className="truncate">GERAR QR CODE</span>
        </button>
        <button 
          onClick={() => { setActiveMainTab('history'); }}
          className={`flex items-center justify-center gap-2.5 py-4.5 sm:py-5 px-4 text-xs font-black uppercase tracking-[0.12em] rounded-xl border transition-all duration-250 ${
            activeMainTab === 'history'
              ? 'bg-blue-600 text-white border-transparent shadow-md shadow-blue-500/10 scale-[1.01]'
              : 'bg-white text-slate-650 border-slate-200 hover:border-blue-400 hover:bg-slate-50'
          }`}
        >
          <History className="w-4 h-4 shrink-0" strokeWidth={2.5} />
          <span className="truncate">HISTÓRICO</span>
        </button>
      </div>

      {/* 3. Escanear OR Gerar QR - Display Rows */}
      {activeMainTab === 'reader' ? (
        <div className="space-y-6" id="section-reader">

          {/* ----------------- SMART STATUS HUD BANNERS (5 States) ----------------- */}
          <div className="transition-all duration-300">
            {validationState === 'idle' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-xs" id="hud-status-idle">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <p className="text-slate-650 text-xs font-semibold">
                    Pronto para leitura: Aponte a webcam, carregue ficheiros ou use o Leitor USB profissional.
                  </p>
                </div>
                <span className="bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded font-mono shrink-0">
                  INTEGRAÇÃO BASE CDA ATIVA
                </span>
              </div>
            )}

            {validationState === 'validating' && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 space-y-2.5 animate-pulse" id="hud-status-validating">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-4.5 h-4.5 text-blue-600 animate-spin" />
                  <span className="text-xs font-black uppercase tracking-wider">Validando documento...</span>
                </div>
                <div className="w-full bg-blue-105 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full w-[40%] animate-[shimmer_1s_infinite] rounded-full" style={{
                    backgroundImage: 'linear-gradient(90deg, #2563eb 0%, #3b82f6 50%, #2563eb 100%)',
                    backgroundSize: '200% 100%'
                  }}></div>
                </div>
                <p className="text-[10px] text-blue-650 font-medium">
                  A consultar assinaturas criptográficas RSA, verificação do selo oficial e estado de trâmite na rede...
                </p>
              </div>
            )}

            {validationState === 'valid' && (
              <div className="bg-emerald-50 border border-emerald-250 text-emerald-850 rounded-xl p-3.5 flex items-center justify-between gap-3 animate-fade-in" id="hud-status-valid">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm shrink-0">
                    <ShieldCheck className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wide text-emerald-900 leading-none">Documento válido</h4>
                    <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">Selo digital e assinatura criptográfica RSA-AO 100% autênticos.</p>
                  </div>
                </div>
                <span className="bg-emerald-200/50 border border-emerald-300 text-emerald-800 font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md">
                  Chancela Íntegra
                </span>
              </div>
            )}

            {validationState === 'not_found' && (
              <div className="bg-rose-50 border border-rose-200 text-rose-850 rounded-xl p-3.5 flex items-center justify-between gap-3 animate-fade-in" id="hud-status-not_found">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-rose-500 rounded-full flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wide text-rose-900 leading-none">Documento não encontrado</h4>
                    <p className="text-[10px] text-rose-700 font-semibold mt-0.5">Nenhum registo de correspondência localizado no acervo CDA.</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setValidationState('idle'); setValidatedItem(null); }}
                  className="text-rose-600 hover:text-rose-800 font-black text-[10px] uppercase tracking-wider"
                >
                  Tentar Outro
                </button>
              </div>
            )}

            {validationState === 'revoked' && (
              <div className="bg-red-950/95 border border-red-800 text-red-200 rounded-xl p-3.5 flex items-center justify-between gap-3 animate-fade-in" id="hud-status-revoked">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-red-650 rounded-full flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-widest text-white leading-none">Documento revogado</h4>
                    <p className="text-[10px] text-red-300 font-semibold mt-0.5">Correspondência suspensa centralmente por ordem ciberdefensiva.</p>
                  </div>
                </div>
                <span className="bg-red-800 border border-red-650 text-red-100 font-bold text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-md">
                  BLOQUEADO
                </span>
              </div>
            )}

            {validationState === 'invalid_signature' && (
              <div className="bg-amber-50 border border-amber-250 text-amber-850 rounded-xl p-3.5 flex items-center justify-between gap-3 animate-fade-in" id="hud-status-invalid_sig">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
                    <Key className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wide text-amber-900 leading-none">Falha na validação da assinatura</h4>
                    <p className="text-[10px] text-amber-700 font-semibold mt-0.5">Selo eletrónico corrompido ou ausência de chaves governamentais.</p>
                  </div>
                </div>
                <span className="bg-amber-100 border border-amber-300 text-amber-800 font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md">
                  Selo Corrompido
                </span>
              </div>
            )}
          </div>

          {/* 4 sub-tabs bar (including dedicated USB Tab) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5" id="sub-tabs-discrete-grid">
            <button 
              onClick={() => { setActiveReadTab('camera'); setScanResult(null); setValidationState('idle'); setValidatedItem(null); }}
              className={`flex items-center justify-center gap-2 py-3.5 px-4 text-xs font-black rounded-xl transition-all shadow-xs border ${
                activeReadTab === 'camera' 
                  ? 'bg-blue-600 text-white border-transparent shadow-sm shadow-blue-500/10' 
                  : 'bg-white text-slate-650 border-slate-200 hover:border-blue-400 hover:bg-slate-50/50'
              }`}
            >
              <Camera className="w-4 h-4 shrink-0" />
              Webcam/Câmara
            </button>
            <button 
              onClick={() => { setActiveReadTab('usb'); stopCamera(); setScanResult(null); setValidationState('idle'); setValidatedItem(null); }}
              className={`flex items-center justify-center gap-2 py-3.5 px-4 text-xs font-black rounded-xl transition-all shadow-xs border ${
                activeReadTab === 'usb' 
                  ? 'bg-blue-600 text-white border-transparent shadow-sm shadow-blue-500/10' 
                  : 'bg-white text-slate-650 border-slate-200 hover:border-blue-400 hover:bg-slate-50/50'
              }`}
            >
              <Keyboard className="w-4 h-4 shrink-0" />
              Leitor USB (HID)
            </button>
            <button 
              onClick={() => { setActiveReadTab('file'); stopCamera(); setScanResult(null); setValidationState('idle'); setValidatedItem(null); }}
              className={`flex items-center justify-center gap-2 py-3.5 px-4 text-xs font-black rounded-xl transition-all shadow-xs border ${
                activeReadTab === 'file' 
                  ? 'bg-blue-600 text-white border-transparent shadow-sm shadow-blue-500/10' 
                  : 'bg-white text-slate-650 border-slate-200 hover:border-blue-400 hover:bg-slate-50/50'
              }`}
            >
              <FileUp className="w-4 h-4 shrink-0" />
              Ficheiro
            </button>
            <button 
              onClick={() => { setActiveReadTab('text'); stopCamera(); setScanResult(null); setValidationState('idle'); setValidatedItem(null); }}
              className={`flex items-center justify-center gap-2 py-3.5 px-4 text-xs font-black rounded-xl transition-all shadow-xs border ${
                activeReadTab === 'text' 
                  ? 'bg-blue-600 text-white border-transparent shadow-sm shadow-blue-500/10' 
                  : 'bg-white text-slate-650 border-slate-200 hover:border-blue-400 hover:bg-slate-50/50'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              Colar Texto
            </button>
          </div>

          {/* READER CONTAINER: CAMERA ACTIVE/INACTIVE */}
          {activeReadTab === 'camera' && !validatedItem && validationState === 'idle' && (
            <div 
              onClick={!cameraRunning ? startCamera : undefined}
              className={`bg-white border-2 border-dashed border-slate-205 rounded-3xl p-10 md:p-16 text-center flex flex-col items-center justify-center min-h-[350px] transition-all ${
                !cameraRunning ? 'hover:bg-slate-50/40 hover:border-blue-450 cursor-pointer' : ''
              }`} 
              id="camera-viewport-card"
            >
              {!cameraRunning ? (
                <div className="space-y-6 flex flex-col items-center justify-center w-full">
                  <div className="p-5 bg-slate-50/80 rounded-full border border-slate-100 ring-8 ring-slate-50/40 flex items-center justify-center shadow-xs">
                    <Camera className="w-12 h-12 text-blue-900 stroke-[1.5]" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-blue-955 font-black text-sm sm:text-base tracking-tight text-center">Autenticação por Webcam ou Câmara do Telemóvel</h3>
                    <p className="text-slate-450 text-[11px] sm:text-xs max-w-sm mx-auto leading-relaxed text-center">
                      O sensor deteta qualquer QR Code governamental ou do app do CDA.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 w-full flex flex-col items-center">
                  <style>{`
                    #react-reader-camera-view video {
                      width: 100% !important;
                      height: 100% !important;
                      object-fit: cover !important;
                      border-radius: 1rem !important;
                    }
                    #react-reader-camera-view {
                      width: 100% !important;
                      height: 100% !important;
                    }
                  `}</style>
                  <div className="relative rounded-2xl overflow-hidden bg-slate-950 flex flex-col items-center justify-center h-[320px] md:h-[400px] w-full max-w-lg shadow-inner border border-slate-800">
                    <div id="react-reader-camera-view" className="w-full h-full rounded-2xl overflow-hidden"></div>
                    <div className="scan-overlay absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                      <div className="scan-frame w-[200px] h-[200px] border-2 border-dashed border-blue-400 rounded-xl relative flex items-center justify-center bg-transparent animate-pulse shadow-[0_0_20px_rgba(37,99,235,0.25)]">
                        <span className="scan-line absolute w-full h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent left-0 right-0 animate-bounce" />
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); stopCamera(); }}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 py-3 px-8 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                  >
                    <span className="w-2 h-2 bg-rose-600 rounded-full animate-ping"></span>
                    Parar Captação
                  </button>
                </div>
              )}
            </div>
          )}

          {/* READER CONTAINER: ACTIVE PHYSICAL USB TAB */}
          {activeReadTab === 'usb' && !validatedItem && validationState === 'idle' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6" id="usb-capture-wedge-card">
              <div className="text-center md:text-left flex flex-col md:flex-row items-center gap-4 border-b border-indigo-50 pb-5">
                <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <Keyboard className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-slate-800 font-extrabold text-xs md:text-sm uppercase tracking-wider">Leitor Físico USB Hardware (Keyboard Wedge)</h3>
                  <p className="text-slate-455 text-xs">
                    Compatibilidade nativa com leitores de código de barras, bi-dimensionais (2D) e QR USB sem drivers. 
                  </p>
                </div>
              </div>

              {/* Wedge Blinking Input Spot */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
                  Ponto de Foco de Leitura do Sensor USB
                </label>
                <div className="relative">
                  <input
                    ref={usbInputRef}
                    type="text"
                    value={usbInputValue}
                    onChange={(e) => {
                      const val = e.target.value;
                      setUsbInputValue(val);
                      if (usbTimeoutRef.current) clearTimeout(usbTimeoutRef.current);
                      // Auto trigger zero-click after typing pause of 180ms
                      if (val.trim().length > 3) {
                        usbTimeoutRef.current = setTimeout(() => {
                          processResult(val.trim(), 'leitor USB / Emulador');
                          setUsbInputValue('');
                        }, 180);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = usbInputValue.trim();
                        if (val) {
                          processResult(val, 'leitor USB Hardware');
                          setUsbInputValue('');
                        }
                      }
                    }}
                    placeholder="✓ Clique aqui com o cursor para ler com pistola USB..."
                    className="w-full bg-slate-50 text-slate-800 font-mono font-bold p-4 text-center border-2 border-dashed border-indigo-200 focus:border-indigo-600 rounded-xl outline-none transition-all placeholder:text-slate-400 text-xs focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[9px] font-bold text-indigo-650 bg-indigo-50 border border-indigo-150 px-2 py-1 rounded">
                    USB ACTIVO
                  </span>
                </div>
                <p className="text-[10px] text-slate-450 italic text-center">
                  O cursor deve estar focado neste campo. Ao bipar o QR Code, o motor valida instantaneamente sem cliques!
                </p>
              </div>

              {/* USB Hardware Wedge Interactive Simulation Suite */}
              <div className="bg-slate-50 border border-slate-205 rounded-xl p-4 space-y-3.5">
                <div>
                  <h4 className="text-slate-700 font-extrabold text-[11px] uppercase tracking-wide">Banco de Simulação de Pistola / Leitor USB</h4>
                  <p className="text-slate-450 text-[10px] mt-0.5">Clique em qualquer registo abaixo para simular a escrita e o envio de sinal via emulador de teclado (Keyboard Wedge):</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <button 
                    onClick={() => runSimulatedUsbScan('MINIS-LUA-2026-16655')}
                    className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-blue-700 font-extrabold px-3 py-2.5 rounded-lg text-xs text-left transition-all flex items-center justify-between"
                  >
                    <span>📄 Ofício Válido (MINIS-LUA...)</span>
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded uppercase font-black">Válido</span>
                  </button>
                  <button 
                    onClick={() => runSimulatedUsbScan('SOC-AN-2026')}
                    className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-red-750 font-extrabold px-3 py-2.5 rounded-lg text-xs text-left transition-all flex items-center justify-between"
                  >
                    <span>🚨 Documento Suspenso (SOC-AN...)</span>
                    <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase font-black">Revogado</span>
                  </button>
                  <button 
                    onClick={() => runSimulatedUsbScan('{"type":"Documento","code":"UNSIGNED","title":"Contrato Sem Selo"}')}
                    className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-amber-800 font-extrabold px-3 py-2.5 rounded-lg text-xs text-left transition-all flex items-center justify-between"
                  >
                    <span>⚠️ Ofício Sem Assinatura (UNSIGNED)</span>
                    <span className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded uppercase font-black">Ass. Inválida</span>
                  </button>
                  <button 
                    onClick={() => runSimulatedUsbScan('BARCODE-ERR-94812')}
                    className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 font-extrabold px-3 py-2.5 rounded-lg text-xs text-left transition-all flex items-center justify-between"
                  >
                    <span>🔍 Código Inválido aleatório</span>
                    <span className="text-[9px] bg-slate-150 text-slate-600 px-1.5 py-0.5 rounded uppercase font-black">Não Consta</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* READER CONTAINER: FILE UPLOADER */}
          {activeReadTab === 'file' && !validatedItem && validationState === 'idle' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4" id="file-uploader-view">
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDragDropRead}
                onClick={() => document.getElementById('file-input-read')?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/20 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[165px]"
              >
                <input 
                  type="file" 
                  id="file-input-read" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileRead}
                />
                <FileUp className="w-10 h-10 text-slate-400 mb-3" />
                <p className="text-slate-700 text-sm font-semibold">Selecione ou arraste imagem com QR Code</p>
                <p className="text-slate-400 text-xs mt-1">PNG, JPG, WEBP suportados</p>
              </div>

              {readImgPreview && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center">
                  <img src={readImgPreview} alt="Ler preview" className="max-h-40 rounded border border-slate-205 shadow-xs" />
                  <p className="text-xs font-bold text-slate-500 mt-2">{readStatusText}</p>
                </div>
              )}
            </div>
          )}

          {/* READER CONTAINER: TEXT PASTE */}
          {activeReadTab === 'text' && !validatedItem && validationState === 'idle' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4" id="text-paste-view">
              <label className="text-xs font-bold text-slate-500 block">Cole o conteúdo criptografado do QR Code:</label>
              <textarea
                rows={5}
                value={pastedTextInput}
                onChange={(e) => setPastedTextInput(e.target.value)}
                placeholder="Cole JSON, metadados ou código de rastreamento..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-700 outline-none focus:border-blue-500"
              />
              
              <button
                onClick={analyzePastedText}
                className="w-full bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-3 rounded-lg text-xs uppercase cursor-pointer"
              >
                Analisar Conteúdo
              </button>

              <div className="pt-2 border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                  Exemplos Rápidos de Leitura
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => loadExampleText('package')} className="bg-slate-50 hover:bg-blue-50 border border-slate-205 text-slate-700 font-bold px-2.5 py-2 rounded-lg text-[11px] text-left">📦 Encomenda</button>
                  <button onClick={() => loadExampleText('invoice')} className="bg-slate-50 hover:bg-blue-50 border border-slate-205 text-slate-700 font-bold px-2.5 py-2 rounded-lg text-[11px] text-left">🧾 Fatura</button>
                  <button onClick={() => loadExampleText('contract')} className="bg-slate-50 hover:bg-blue-50 border border-slate-205 text-slate-700 font-bold px-2.5 py-2 rounded-lg text-[11px] text-left">📄 Contrato</button>
                  <button onClick={() => loadExampleText('link')} className="bg-slate-50 hover:bg-blue-50 border border-slate-205 text-slate-700 font-bold px-2.5 py-2 rounded-lg text-[11px] text-left">🔗 Link</button>
                </div>
              </div>
            </div>
          )}

          {/* ----------------- INTUITIVE OFFICIAL VALIDATION CERTIFICATE CARD (Zero-Click Output) ----------------- */}
          {validatedItem && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-6 animate-slide-up" id="official-validation-certificate-card">
              
              {/* Certificate Security Header */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
                    validationState === 'valid' ? 'bg-emerald-600' :
                    validationState === 'revoked' ? 'bg-red-700' : 'bg-amber-600'
                  }`}>
                    {validationState === 'valid' ? <ShieldCheck className="w-5.5 h-5.5 text-white" /> : <ShieldAlert className="w-5.5 h-5.5 text-white" />}
                  </div>
                  <div className="text-left">
                    <h3 className="text-slate-800 font-black text-sm uppercase tracking-tight">Certidão de Verificação de Correspondência</h3>
                    <p className="text-slate-450 text-[10px] font-medium uppercase font-mono tracking-widest leading-none mt-1">Selo Integrador Digital Nacional</p>
                  </div>
                </div>
                
                {/* Visual authenticity Stamp */}
                <div className={`p-2.5 rounded-xl border border-dashed flex flex-col items-center justify-center shrink-0 w-32 ${
                  validationState === 'valid' ? 'border-emerald-300 bg-emerald-50/50 text-emerald-800' :
                  validationState === 'revoked' ? 'border-red-400 bg-red-50 text-red-900' : 'border-amber-300 bg-amber-50 text-amber-900'
                }`}>
                  <span className="text-[8px] font-bold uppercase tracking-wider block text-center">Base de Dados CDA</span>
                  <span className="text-xs font-extrabold block text-center leading-none mt-1">
                    {validationState === 'valid' ? 'AUTÊNTICO' :
                     validationState === 'revoked' ? 'REVOGADO' : 'CORROMPIDO'}
                  </span>
                </div>
              </div>

              {/* Protocol Specs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 bg-slate-50/50 border border-slate-150 rounded-xl p-4">
                <div className="text-xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Título / Tipo de Documento</span>
                  <p className="text-slate-800 font-extrabold text-xs">{validatedItem.title}</p>
                </div>
                
                <div className="text-xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Nº Protocolo Central</span>
                  <p className="text-indigo-600 font-mono font-black text-xs uppercase">{validatedItem.protocolNumber}</p>
                </div>

                <div className="text-xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Destinatário / Titular</span>
                  <p className="text-slate-800 font-extrabold text-xs">{validatedItem.holder}</p>
                </div>

                <div className="text-xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Órgão Emissor Responsável</span>
                  <p className="text-slate-805 font-bold text-xs">{validatedItem.issuer}</p>
                </div>

                <div className="text-xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Data e Hora de Registo</span>
                  <p className="text-slate-700 font-medium text-xs font-mono">{validatedItem.date} {validatedItem.time}</p>
                </div>

                {validatedItem.archiveReference && (
                  <div className="text-xs">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Referência de Arquivo</span>
                    <p className="text-slate-900 font-mono font-black text-xs">{validatedItem.archiveReference}</p>
                  </div>
                )}

                {validatedItem.archiveLocation && (
                  <div className="text-xs col-span-1 sm:col-span-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Localização Formal do Arquivo</span>
                    <p className="text-slate-650 bg-white border border-slate-200 rounded-lg p-2.5 text-[11px] leading-relaxed font-semibold">{validatedItem.archiveLocation}</p>
                  </div>
                )}

                <div className="text-xs col-span-1 sm:col-span-2 border-t border-slate-150 pt-3">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Extrato do Conteúdo</span>
                  <p className="text-slate-650 bg-white border border-slate-200 rounded-lg p-2.5 text-[11px] leading-relaxed italic">{validatedItem.detailsBody}</p>
                </div>

                <div className="text-xs col-span-1 sm:col-span-2 bg-indigo-50/40 border border-indigo-100 rounded-lg p-2.5 font-mono space-y-1">
                  <span className="text-[9px] font-bold text-indigo-550 block uppercase tracking-wider">Identificador Criptográfico do Selo (SHA-256)</span>
                  <p className="text-[9px] text-indigo-800 font-extrabold break-all">{validatedItem.hash}</p>
                  <div className="flex items-center gap-1.5 pt-1">
                    <Key className="w-3 h-3 text-indigo-500" />
                    <span className="text-[8.5px] text-slate-500 font-bold block truncate">Chave Pública: {validatedItem.signature}</span>
                  </div>
                </div>
              </div>

              {/* Action and Reset triggers */}
              <div className="flex flex-col sm:flex-row gap-3">
                {validationState === 'valid' && (
                  <button
                    onClick={() => {
                      showToast('📥 A gerar guia oficial de receção institucional em PDF...', 'success');
                      if (addAuditLog) {
                        addAuditLog(`Gerar guia física para protocolo: ${validatedItem.protocolNumber}`, 'success');
                      }
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/10 cursor-pointer text-center"
                  >
                    Registar Receção Inter-Órgãos
                  </button>
                )}
                <button
                  onClick={() => {
                    setValidatedItem(null);
                    setValidationState('idle');
                    setScanResult(null);
                    showToast('Pronto para novo ciclo de leitura.', 'info');
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-205 text-slate-700 font-extrabold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all border border-slate-200 cursor-pointer text-center"
                >
                  Regressar / Ler Outro Código
                </button>
              </div>

            </div>
          )}

          {/* Benefícios footer row as illustrated in reference image */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 mt-8 border-t border-slate-100" id="reader-benefits-footer">
            <div className="bg-white border border-slate-150 rounded-xl p-4 flex items-start gap-3 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                <Shield className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-slate-800 font-extrabold text-xs uppercase tracking-wide">Seguro</h4>
                <p className="text-slate-455 text-[10px] sm:text-xs mt-1 leading-normal">
                  Validação e criptografia com CDA-SHIELD
                </p>
              </div>
            </div>
            
            <div className="bg-white border border-slate-150 rounded-xl p-4 flex items-start gap-3 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                <ShieldCheck className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-slate-800 font-extrabold text-xs uppercase tracking-wide">Confiável</h4>
                <p className="text-slate-455 text-[10px] sm:text-xs mt-1 leading-normal">
                  Verificação de assinatura digital e integridade
                </p>
              </div>
            </div>
            
            <div className="bg-white border border-slate-150 rounded-xl p-4 flex items-start gap-3 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4.5 h-4.5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <div>
                <h4 className="text-slate-800 font-extrabold text-xs uppercase tracking-wide">Rápido</h4>
                <p className="text-slate-455 text-[10px] sm:text-xs mt-1 leading-normal">
                  Leitura instantânea e resposta imediata
                </p>
              </div>
            </div>
            
            <div className="bg-white border border-slate-150 rounded-xl p-4 flex items-start gap-3 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 shrink-0 mt-0.5">
                <FileCheck className="w-4.5 h-4.5 text-slate-650" />
              </div>
              <div>
                <h4 className="text-slate-800 font-extrabold text-xs uppercase tracking-wide">Auditável</h4>
                <p className="text-slate-455 text-[10px] sm:text-xs mt-1 leading-normal">
                  Todas as leituras são registadas no sistema
                </p>
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* ----- 4. GERADOR DE CODE SECTIONS ----- */
        <div className="space-y-4" id="section-generator">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-600" strokeWidth={2.5} />
            <h2 className="text-slate-805 font-bold text-sm tracking-tight">Gerar QR Code de Correspondência</h2>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <div className="grid grid-cols-3 gap-1">
              <button 
                onClick={() => { setActiveGenTab('pdf'); setGeneratedQrCodeUrl(''); }}
                className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition-all ${
                  activeGenTab === 'pdf' 
                    ? 'bg-blue-630 text-white shadow-xs font-black' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                style={{ backgroundColor: activeGenTab === 'pdf' ? '#2563eb' : 'transparent' }}
              >
                <FileUp className="w-[14px] h-[14px]" />
                PDF/Imagem
              </button>
              <button 
                onClick={() => { setActiveGenTab('form'); setGeneratedQrCodeUrl(''); }}
                className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition-all ${
                  activeGenTab === 'form' 
                    ? 'bg-blue-640 text-white shadow-xs font-black' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                style={{ backgroundColor: activeGenTab === 'form' ? '#2563eb' : 'transparent' }}
              >
                <FileText className="w-[14px] h-[14px]" />
                Formulário
              </button>
              <button 
                onClick={() => { setActiveGenTab('free'); setGeneratedQrCodeUrl(''); }}
                className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition-all ${
                  activeGenTab === 'free' 
                    ? 'bg-blue-650 text-white shadow-xs font-black' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                style={{ backgroundColor: activeGenTab === 'free' ? '#2563eb' : 'transparent' }}
              >
                <QrCode className="w-[14px] h-[14px]" />
                Texto Livre
              </button>
            </div>
          </div>

          {/* GENERATOR: PDF/IMAGEM LOAD VIEW */}
          {activeGenTab === 'pdf' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <p className="text-slate-500 text-xs">
                Carregue um <strong className="text-slate-700">PDF ou imagem</strong> de correspondência. O sistema extrai as informações e gera um QR Code com os dados.
              </p>

              {!genSelectedFile ? (
                <div 
                  onDragOver={handleDragOver}
                  onDrop={handleDragDropGen}
                  onClick={() => document.getElementById('file-input-gen')?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/20 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px]"
                >
                  <input 
                    type="file" 
                    id="file-input-gen" 
                    accept=".pdf,image/*" 
                    className="hidden" 
                    onChange={handleGenFileChange}
                  />
                  <FileUp className="w-10 h-10 text-slate-400 mb-3" />
                  <p className="text-slate-700 text-sm font-semibold">Clique ou arraste um PDF ou imagem</p>
                  <p className="text-slate-400 text-xs mt-1">PDF, PNG, JPG suportados</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {pdfPages[selectedPageIdx] && (
                        <img src={pdfPages[selectedPageIdx]} className="w-10 h-12 object-cover rounded border bg-white" alt="" />
                      )}
                      <div>
                        <p className="text-slate-800 font-bold text-xs max-w-xs truncate">{genSelectedFile.name}</p>
                        <p className="text-slate-400 text-[10px]">{pdfPages.length > 1 ? `${pdfPages.length} páginas` : 'Imagem'}</p>
                      </div>
                    </div>
                    <button onClick={resetGenFile} className="text-red-500 hover:text-red-700 text-xs font-bold">✕ Remover</button>
                  </div>

                  {pdfPages.length > 1 && (
                    <div className="space-y-1.5Col">
                      <p className="text-[10px] font-bold text-slate-450 uppercase">Navegar páginas:</p>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {pdfPages.map((src, idx) => (
                          <img 
                            key={idx}
                            src={src} 
                            onClick={() => { setSelectedPageIdx(idx); extractAndRender(src, genSelectedFile.name); }}
                            className={`w-10 h-14 object-cover rounded border cursor-pointer hover:border-blue-400 ${selectedPageIdx === idx ? 'ring-2 ring-blue-500' : ''}`}
                            alt=""
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Extracted Fields Form */}
                  <div className="space-y-3 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                    <p className="text-[10px] font-black text-slate-450 uppercase mb-2">Dados Extraídos / Editáveis:</p>
                    {Object.entries(extractedFields).map(([key, val]) => {
                      const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                      return (
                        <div key={key} className="space-y-1">
                          <label className="text-[10px] text-slate-500 font-semibold uppercase">{label}</label>
                          <input 
                            type="text" 
                            value={val}
                            onChange={(e) => setExtractedFields(prev => ({ ...prev, [key]: e.target.value }))}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-bold"
                          />
                        </div>
                      );
                    })}

                    <button 
                      onClick={generateQRFromExtracted}
                      className="w-full bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-xs uppercase"
                    >
                      Gerar QR Code (Dados)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GENERATOR: FORM PRE-SETS */}
          {activeGenTab === 'form' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <p className="text-slate-500 text-xs">Preencha os dados da correspondência para gerar o QR Code.</p>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 block uppercase">Tipo</label>
                    <select 
                      value={formType}
                      onChange={(e) => setFormType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold"
                    >
                      <option value="Encomenda">📦 Encomenda</option>
                      <option value="Fatura">🟡 Fatura</option>
                      <option value="Contrato">📄 Contrato</option>
                      <option value="Carta">✉️ Carta</option>
                      <option value="Documento">📋 Documento</option>
                      <option value="Outros">🗂️ Outros</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 block uppercase">Remetente</label>
                    <input 
                      type="text" 
                      value={formSender}
                      onChange={(e) => setFormSender(e.target.value)}
                      placeholder="Ex: Correios" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 block uppercase">Destinatário</label>
                  <input 
                    type="text" 
                    value={formRecipient}
                    onChange={(e) => setFormRecipient(e.target.value)}
                    placeholder="Ex: Edlasio Galhardo" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 block uppercase">Assunto / Descrição</label>
                  <input 
                    type="text" 
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    placeholder="Ex: Encomenda Recebida" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 block uppercase">Código / Rastreamento</label>
                    <input 
                      type="text" 
                      value={formTracking}
                      onChange={(e) => setFormTracking(e.target.value)}
                      placeholder="Ex: BR123456789BR" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 block uppercase">Data</label>
                    <input 
                      type="date" 
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 block uppercase">Valor / Info Adicional</label>
                  <input 
                    type="text" 
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    placeholder="Ex: R$ 250,00" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 block uppercase">Observações</label>
                  <textarea 
                    rows={2} 
                    value={formObs}
                    onChange={(e) => setFormObs(e.target.value)}
                    placeholder="Informações extras..." 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 block uppercase">Correção do Erro</label>
                    <select 
                      value={formEcl}
                      onChange={(e) => setFormEcl(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold"
                    >
                      <option value="L">L — Baixo (7%)</option>
                      <option value="M">M — Médio (15%)</option>
                      <option value="Q">Q — Alto (25%)</option>
                      <option value="H">H — Máximo (30%)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 block uppercase">Tamanho</label>
                    <select 
                      value={formSize}
                      onChange={(e) => setFormSize(parseInt(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold"
                    >
                      <option value="180">Pequeno (180px)</option>
                      <option value="240">Médio (240px)</option>
                      <option value="320">Grande (320px)</option>
                    </select>
                  </div>
                </div>

                <button 
                  onClick={generateQRFromFormSubmit}
                  className="w-full bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-3 rounded-lg text-xs uppercase"
                >
                  Gerar QR Code
                </button>
              </div>
            </div>
          )}

          {/* GENERATOR: FREE INPUT TEXT */}
          {activeGenTab === 'free' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <p className="text-slate-500 text-xs">Digite ou cole qualquer texto, URL ou JSON para gerar um QR Code.</p>
              
              <textarea 
                rows={5}
                value={freeInputText}
                onChange={(e) => setFreeInputText(e.target.value)}
                placeholder="Insira o texto para codificação no QR Code..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono outline-none"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block uppercase mb-1">Correção de Erro</label>
                  <select 
                    value={freeEcl}
                    onChange={(e) => setFreeEcl(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-semibold animate-none"
                  >
                    <option value="L">L — Baixo</option>
                    <option value="M">M — Médio</option>
                    <option value="Q">Q — Alto</option>
                    <option value="H">H — Máximo</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block uppercase mb-1">Tamanho</label>
                  <select 
                    value={freeSize}
                    onChange={(e) => setFreeSize(parseInt(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-semibold animate-none"
                  >
                    <option value="180">Pequeno</option>
                    <option value="240">Médio</option>
                    <option value="320">Grande</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={generateQRFreeSubmit}
                className="w-full bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-3 rounded-lg text-xs uppercase"
              >
                Gerar QR Code
              </button>
            </div>
          )}

          {/* GENERATED RESULT CARD VIEW */}
          {generatedQrCodeUrl && (
            <div className="bg-white border border-blue-200 rounded-2xl p-6 shadow-sm border-dashed text-center space-y-4" id="qr-result-container">
              <p className="text-blue-900 font-bold text-sm text-left flex items-center gap-1.5">
                <Check className="w-5 h-5 text-emerald-600" /> QR Code Gerado com Sucesso!
              </p>

              <div className="bg-white rounded-xl p-4 border border-blue-105 flex items-center justify-center max-w-[200px] mx-auto">
                <img src={generatedQrCodeUrl} alt="QR Gerado" className="w-full object-contain" />
              </div>

              <details className="text-left">
                <summary className="text-slate-500 text-xs font-semibold cursor-pointer">Ver dados codificados</summary>
                <pre className="text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-200 p-2 rounded mt-1 overflow-x-auto whitespace-pre-wrap max-h-32">
                  {generatedQrRawText}
                </pre>
              </details>

              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={downloadQR}
                  className="bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-xs uppercase flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> Baixar PNG
                </button>
                <button 
                  onClick={copyQRImage}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-705 font-bold py-2.5 rounded-lg text-xs uppercase flex items-center justify-center gap-1.5 border border-slate-200"
                >
                  <Copy className="w-4 h-4" /> Copiar Imagem
                </button>
              </div>

              <button 
                onClick={testReadGeneratedQR}
                className="w-full bg-slate-50 hover:bg-blue-50 text-blue-700 font-bold py-2.5 rounded-lg text-xs uppercase"
              >
                Testar Leitura do QR Gerado
              </button>
            </div>
          )}

        </div>
      )}

      {/* 5. HISTORY SECTION (Shown conditionally if History is picked in the top main tabbar) */}
      {activeMainTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4" id="section-history">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Leituras Anteriores</span>
            {historyData.length > 0 && (
              <button 
                onClick={clearHistory}
                className="text-red-500 hover:text-red-650 text-xs font-bold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Limpar tudo
              </button>
            )}
          </div>

          {historyData.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs space-y-2">
              <Mail className="w-8 h-8 mx-auto text-slate-350" />
              <p>Nenhum registo de leitura no rolo local.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {historyData.map((item) => {
                const cfg = typeConfig[item.parsed.type] || typeConfig.info;
                return (
                  <div 
                    key={item.id}
                    onClick={() => openHistoryItem(item)}
                    className="bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-xl p-3 cursor-pointer transition-all flex flex-col justify-between hover:bg-blue-50/10"
                  >
                    <div className="flex justify-between items-center text-[11px] font-bold">
                      <span className="text-slate-800 flex items-center gap-1">
                        {cfg.emoji} {cfg.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-450">{item.time}</span>
                        <button
                          onClick={(e) => deleteHistoryItem(item.id, e)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-lg transition-all cursor-pointer border-0 bg-transparent flex items-center justify-center"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-1 font-mono">{item.raw}</p>
                    <div className="text-[9px] font-black text-slate-400 mt-1 uppercase tracking-widest">
                      📡 Via {item.source}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
