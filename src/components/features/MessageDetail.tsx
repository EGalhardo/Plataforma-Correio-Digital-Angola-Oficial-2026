/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Fragment } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  LogOut,
  Calendar, 
  Clock, 
  MapPin, 
  Check, 
  ShieldCheck, 
  FileText, 
  Info,
  Fingerprint,
  QrCode,
  Tag,
  UserCheck,
  ShieldAlert,
  AlertTriangle,
  Hash,
  Inbox,
  Eye,
  CheckCircle,
  MessageSquare,
  Search,
  CheckSquare,
  XCircle,
  AlertOctagon,
  Archive,
  CornerUpRight,
  GitCommit,
  History,
  Bell,
  Scroll,
  Receipt,
  Megaphone,
  FolderOpen,
  Landmark,
  Key,
  Award,
  User,
  Coins,
  Scale,
  Lock,
  EyeOff,
  Share2,
  Paperclip,
  Send,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Plus,
  Trash2,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Eraser,
  Download
} from 'lucide-react';
import { Message, SENSITIVITY_LEVELS, SensitivityConfig, PRIORITY_CONFIGS } from '../../types';
import { generateProtocol, generateTimelineEvents, getCategoryMetadata } from '../../utils/protocolGenerator';
import { GovernmentAIPanel } from './GovernmentAIPanel';
import { VideoSessionPanel } from './VideoSessionPanel';
import { useLanguage } from '../../hooks/useLanguage';

const STATE_STYLING: Record<string, { bg: string; text: string; border: string; bgDot: string; textIcon: string }> = {
  'Recebida': { bg: 'bg-slate-50', text: 'text-slate-800', border: 'border-slate-200', bgDot: 'bg-slate-150', textIcon: 'text-slate-600' },
  'Entregue': { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-100', bgDot: 'bg-blue-100/60', textIcon: 'text-blue-600' },
  'Visualizada': { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-100', bgDot: 'bg-teal-100/60', textIcon: 'text-teal-600' },
  'Confirmada': { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-100', bgDot: 'bg-indigo-100/60', textIcon: 'text-indigo-600' },
  'Respondida': { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-100', bgDot: 'bg-purple-100/60', textIcon: 'text-purple-600' },
  'Em análise': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-100', bgDot: 'bg-amber-150', textIcon: 'text-amber-600' },
  'Aprovada': { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-100', bgDot: 'bg-emerald-100/65', textIcon: 'text-emerald-600' },
  'Rejeitada': { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-100', bgDot: 'bg-red-100/60', textIcon: 'text-red-650' },
  'Contestada': { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-100', bgDot: 'bg-rose-100/60', textIcon: 'text-rose-650' },
  'Expirada': { bg: 'bg-zinc-50', text: 'text-zinc-800', border: 'border-zinc-200', bgDot: 'bg-zinc-150', textIcon: 'text-zinc-600' },
  'Arquivada': { bg: 'bg-neutral-50', text: 'text-neutral-800', border: 'border-neutral-200', bgDot: 'bg-neutral-155', textIcon: 'text-neutral-600' },
  'Encaminhada': { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-100', bgDot: 'bg-sky-110', textIcon: 'text-sky-600' },
};

const CATEGORY_STYLING: Record<string, {
  bg: string;
  text: string;
  border: string;
  badge: string;
  circleBg: string;
  circleBorder: string;
}> = {
  'Notificação': {
    bg: 'bg-indigo-50 border-indigo-100 text-indigo-800',
    text: 'text-indigo-800',
    border: 'border-indigo-200',
    badge: 'bg-indigo-100/70 text-indigo-850',
    circleBg: 'bg-indigo-600 text-white',
    circleBorder: 'border-indigo-600 ring-indigo-100',
  },
  'Ofício': {
    bg: 'bg-slate-50 border-slate-200 text-slate-800',
    text: 'text-slate-800',
    border: 'border-slate-300',
    badge: 'bg-slate-100/70 text-slate-850',
    circleBg: 'bg-slate-600 text-white',
    circleBorder: 'border-slate-500 ring-slate-100',
  },
  'Multa': {
    bg: 'bg-rose-50 border-rose-100 text-rose-800',
    text: 'text-rose-800',
    border: 'border-rose-200',
    badge: 'bg-rose-100/75 text-rose-850 border-rose-200',
    circleBg: 'bg-rose-600 text-white',
    circleBorder: 'border-rose-500 ring-rose-100',
  },
  'Fatura': {
    bg: 'bg-amber-50 border-amber-100 text-amber-800',
    text: 'text-amber-805',
    border: 'border-amber-200',
    badge: 'bg-amber-100/70 text-amber-800',
    circleBg: 'bg-amber-650 text-white',
    circleBorder: 'border-amber-500 ring-amber-100',
  },
  'Convocatória': {
    bg: 'bg-purple-50 border-purple-100 text-purple-800',
    text: 'text-purple-800',
    border: 'border-purple-200',
    badge: 'bg-purple-100/70 text-purple-850',
    circleBg: 'bg-purple-600 text-white',
    circleBorder: 'border-purple-500 ring-purple-100',
  },
  'Processo Administrativo': {
    bg: 'bg-cyan-50 border-cyan-100 text-cyan-800',
    text: 'text-cyan-800',
    border: 'border-cyan-200',
    badge: 'bg-cyan-100/70 text-cyan-850',
    circleBg: 'bg-cyan-600 text-white',
    circleBorder: 'border-cyan-500 ring-cyan-100',
  },
  'Documento Bancário': {
    bg: 'bg-emerald-50 border-emerald-100 text-emerald-800',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100/70 text-emerald-850',
    circleBg: 'bg-emerald-600 text-white',
    circleBorder: 'border-emerald-500 ring-emerald-100',
  },
  'Declaração': {
    bg: 'bg-teal-50 border-teal-150 text-teal-800',
    text: 'text-teal-805',
    border: 'border-teal-200',
    badge: 'bg-teal-100/70 text-teal-850',
    circleBg: 'bg-teal-600 text-white',
    circleBorder: 'border-teal-500 ring-teal-100',
  },
  'Licença': {
    bg: 'bg-lime-50 border-lime-150 text-lime-900',
    text: 'text-lime-900',
    border: 'border-lime-200',
    badge: 'bg-lime-100/70 text-lime-900',
    circleBg: 'bg-lime-600 text-white',
    circleBorder: 'border-lime-500 ring-lime-100',
  },
  'Certificado': {
    bg: 'bg-orange-50 border-orange-100 text-orange-800',
    text: 'text-orange-805',
    border: 'border-orange-200',
    badge: 'bg-orange-100/70 text-orange-850',
    circleBg: 'bg-orange-605 text-white',
    circleBorder: 'border-orange-500 ring-orange-100',
  },
  'Petição do Cidadão': {
    bg: 'bg-fuchsia-50 border-fuchsia-100 text-fuchsia-800',
    text: 'text-fuchsia-800',
    border: 'border-fuchsia-200',
    badge: 'bg-fuchsia-100/65 text-fuchsia-850',
    circleBg: 'bg-fuchsia-600 text-white',
    circleBorder: 'border-fuchsia-500 ring-fuchsia-100',
  },
  'Documento Fiscal': {
    bg: 'bg-pink-50 border-pink-100 text-pink-800',
    text: 'text-pink-805',
    border: 'border-pink-200',
    badge: 'bg-pink-100/70 text-pink-850',
    circleBg: 'bg-pink-600 text-white',
    circleBorder: 'border-pink-500 ring-pink-100',
  },
  'Documento Judicial': {
    bg: 'bg-zinc-100 border-zinc-200 text-zinc-900',
    text: 'text-zinc-900',
    border: 'border-zinc-300',
    badge: 'bg-zinc-200 text-zinc-900',
    circleBg: 'bg-zinc-600 text-white',
    circleBorder: 'border-zinc-500 ring-zinc-100',
  }
};

function renderCategoryIcon(iconName: string, size = 16) {
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

function renderStateIcon(state: string, size = 14) {
  switch (state) {
    case 'Recebida': return <Inbox size={size} />;
    case 'Entregue': return <Check size={size} />;
    case 'Visualizada': return <Eye size={size} />;
    case 'Confirmada': return <CheckCircle size={size} />;
    case 'Respondida': return <MessageSquare size={size} />;
    case 'Em análise': return <Search size={size} />;
    case 'Aprovada': return <CheckSquare size={size} />;
    case 'Rejeitada': return <XCircle size={size} />;
    case 'Contestada': return <AlertOctagon size={size} />;
    case 'Expirada': return <Clock size={size} />;
    case 'Arquivada': return <Archive size={size} />;
    case 'Encaminhada': return <CornerUpRight size={size} />;
    default: return <GitCommit size={size} />;
  }
}

interface MessageDetailProps {
  selectedMessage: Message;
  setSelectedMessage: (msg: Message | null) => void;
  setTab: (tab: string) => void;
  handleReply: (msg: Message) => void;
  onUpdateMessage?: (msg: Message) => void;
  onDeleteMessage?: (id: number) => void;
  onRestoreMessage?: (id: number) => void;
  isDeleted?: boolean;
  backTab?: string;
}

export function MessageDetail({
  selectedMessage,
  setSelectedMessage,
  setTab,
  handleReply,
  onUpdateMessage,
  onDeleteMessage,
  onRestoreMessage,
  isDeleted,
  backTab,
}: MessageDetailProps) {
  const { t } = useLanguage();
  const messageDate = selectedMessage.date && selectedMessage.date.includes('/')
    ? selectedMessage.date
    : (selectedMessage.protocol?.officialIssueDate || '02/06/2026');

  const messageTime = selectedMessage.date && selectedMessage.date.includes(':')
    ? selectedMessage.date
    : (selectedMessage.protocol?.officialTime || '10:45');

  const getMessageLocality = (msg: Message) => {
    return 'Rua Deolinda Rodrigues, n-227, Benfica, Luanda';
  };
  const messageLocality = getMessageLocality(selectedMessage);

  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [showLocationPage, setShowLocationPage] = useState(false);
  const [mapQuery, setMapQuery] = useState('');
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [mapLoading, setMapLoading] = useState(true);

  useEffect(() => {
    if (showLocationPage) {
      setMapQuery(messageLocality);
      setMapLoading(true);
    }
  }, [showLocationPage, messageLocality]);

  useEffect(() => {
    if (showLocationPage) {
      setMapLoading(true);
    }
  }, [mapQuery, mapType, showLocationPage]);

  const [showQRValidation, setShowQRValidation] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showAdvancedData, setShowAdvancedData] = useState(false);
  const [detailReplyText, setDetailReplyText] = useState('');
  const [isReplyingInDetails, setIsReplyingInDetails] = useState(false);
  const [detailReplySuccess, setDetailReplySuccess] = useState<{
    protocolNumber: string;
    timestamp: string;
    text: string;
    digitalSeal: string;
    documentHash: string;
    files?: { name: string; size: string }[];
  } | null>(null);

  const [previewFile, setPreviewFile] = useState<{ name: string; size: string; content?: string; type?: string } | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<{ id: number; isPermanent: boolean } | null>(null);

  const handleDownloadFile = (fileName: string) => {
    if (previewFile && previewFile.content && (previewFile.content.startsWith('http://') || previewFile.content.startsWith('https://'))) {
      const link = document.createElement('a');
      link.href = previewFile.content;
      link.download = fileName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const org = selectedMessage.org;
    const protocolNumber = selectedMessage.protocol?.protocolNumber || 'PRT-' + selectedMessage.id;
    const signatureDate = selectedMessage.protocol?.signatureDate || messageDate;
    const officialTime = selectedMessage.protocol?.officialTime || '10:45';
    const documentHash = selectedMessage.protocol?.documentHash || '3e7a5c9d4b6f2a8e1c9d0f7a3b5e8c2d9f1a6b3c';
    const digitalSignature = selectedMessage.protocol?.digitalSignature || 'RSA-CDA-INTEGRITY-SIGNATURE-KEY-AO';

    const lowerName = fileName.toLowerCase();
    
    if (lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
      // Generate a real openable high-quality certified image file
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Background linear gradient
        const grad = ctx.createLinearGradient(0, 0, 0, 600);
        grad.addColorStop(0, '#0c2340');
        grad.addColorStop(1, '#1e293b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 800, 600);

        // Frame borders
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 6;
        ctx.strokeRect(20, 20, 760, 560);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1;
        ctx.strokeRect(26, 26, 748, 548);

        // Watermark text rotation
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.font = 'bold 50px sans-serif';
        ctx.save();
        ctx.translate(400, 300);
        ctx.rotate(-Math.PI / 6);
        ctx.textAlign = 'center';
        ctx.fillText('GOVERNO DE ANGOLA', 0, -40);
        ctx.fillText('DOCUMENTO AUTENTICADO', 0, 40);
        ctx.restore();

        // Header Texts
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('REPÚBLICA DE ANGOLA', 400, 70);
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#fbbf24';
        ctx.fillText('GOVERNO DIGITAL - CORREIO DIGITAL DE ANGOLA (CDA)', 400, 95);
        ctx.font = '11px monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('PLATAFORMA NACIONAL DE INTEROPERABILIDADE E EXPEDIENTES', 400, 118);

        // Separator line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(50, 135);
        ctx.lineTo(750, 135);
        ctx.stroke();

        if (lowerName.includes('localizacao') || lowerName.includes('mapa')) {
          // Dynamic Visual Map rendering for location attachments
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(50, 155, 420, 320);
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 2;
          ctx.strokeRect(50, 155, 420, 320);

          // Render simulated roads/routes
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(50, 240); ctx.lineTo(470, 300);
          ctx.moveTo(160, 155); ctx.lineTo(160, 475);
          ctx.moveTo(330, 155); ctx.lineTo(330, 475);
          ctx.moveTo(50, 410); ctx.lineTo(470, 390);
          ctx.stroke();

          // Highlight route
          ctx.strokeStyle = '#4f46e5';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(160, 410); ctx.lineTo(160, 310); ctx.lineTo(330, 310);
          ctx.stroke();

          // Greenery zones (Parks)
          ctx.fillStyle = '#065f46';
          ctx.fillRect(75, 175, 70, 50);
          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText('ZONA VERDE', 110, 205);

          // Hospital Pin
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(330, 310, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(330, 310, 5, 0, Math.PI * 2);
          ctx.fill();

          // Tooltip on Map
          ctx.fillStyle = '#0f172a';
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 1.5;
          ctx.fillRect(200, 205, 230, 48);
          ctx.strokeRect(200, 205, 230, 48);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('HOSPITAL GERAL DE LUANDA', 212, 224);
          ctx.fillStyle = '#818cf8';
          ctx.font = '9px monospace';
          ctx.fillText('LAT: 8.8383° S | LON: 13.2658° E', 212, 238);

          // Info sidebar panel
          ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
          ctx.fillRect(490, 155, 260, 320);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.strokeRect(490, 155, 260, 320);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('INFORMAÇÃO DE LOCALIZAÇÃO', 505, 185);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '10px sans-serif';
          ctx.fillText('INSTITUIÇÃO RESPONSÁVEL', 505, 215);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText(org, 505, 228);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '10px sans-serif';
          ctx.fillText('ENDEREÇO OFICIAL', 505, 258);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText('Distrito da Camama, Luanda, Angola', 505, 271);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '10px sans-serif';
          ctx.fillText('REFERÊNCIA DE PROTOCOLO', 505, 301);
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 11px monospace';
          ctx.fillText(protocolNumber, 505, 314);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '10px sans-serif';
          ctx.fillText('DATA DA CERTIFICAÇÃO', 505, 344);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText(`${signatureDate} às ${officialTime}`, 505, 357);

          // Authenticity validation seal
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 1;
          ctx.strokeRect(505, 395, 230, 65);
          ctx.fillStyle = 'rgba(16, 185, 129, 0.05)';
          ctx.fillRect(505, 395, 230, 65);
          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText('✓ CERTIFICAÇÃO JURÍDICA ATIVA', 515, 413);
          ctx.fillStyle = '#a7f3d0';
          ctx.font = '8px monospace';
          ctx.fillText(`HASH: ${documentHash.substring(0, 24)}...`, 515, 428);
          ctx.fillText('SISTEMA INTEGRADO DE CHAVES PÚBLICAS AO', 515, 442);
        } else {
          // General certified file screenshot placeholder
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(80, 160, 640, 310);
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(80, 160, 640, 310);

          ctx.fillStyle = '#0c2340';
          ctx.font = 'bold 15px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('RECONHECIMENTO E AUTENTICAÇÃO DIGITAL DE ANEXO', 400, 200);

          ctx.strokeStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.moveTo(110, 220); ctx.lineTo(690, 220);
          ctx.stroke();

          ctx.fillStyle = '#334155';
          ctx.font = '11px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`Declaramos e certificamos formalmente que o documento anexo registado sob o nome:`, 110, 250);
          ctx.fillStyle = '#4f46e5';
          ctx.font = 'bold 12px monospace';
          ctx.fillText(fileName, 110, 270);

          ctx.fillStyle = '#334155';
          ctx.font = '11px sans-serif';
          ctx.fillText(`Faz parte integrante da correspondência emitida pela instituição oficial:`, 110, 305);
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText(org, 110, 320);

          ctx.font = '11px sans-serif';
          ctx.fillText(`Assunto do expediente:`, 110, 355);
          ctx.font = 'bold 11px italic sans-serif';
          ctx.fillText(selectedMessage.details?.subject || selectedMessage.preview, 110, 370);

          // Integrity box
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(110, 395, 580, 55);
          ctx.strokeStyle = '#cbd5e1';
          ctx.strokeRect(110, 395, 580, 55);

          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(`PROTOCOLO: ${protocolNumber}`, 120, 412);
          ctx.fillText(`DATA: ${signatureDate} ${officialTime}`, 120, 426);
          ctx.fillStyle = '#059669';
          ctx.fillText(`HASH DE INTEGRIDADE (SHA256): ${documentHash}`, 120, 440);
        }

        // Footer block
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`ASSINATURA DIGITAL CDA: ${digitalSignature}`, 400, 515);
        ctx.font = 'italic 9px sans-serif';
        ctx.fillText('Este documento digital possui validade jurídica ao abrigo da regulamentação do Governo de Angola.', 400, 535);

        // Download PNG Blob
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }
        }, 'image/png');
      }
    } else if (lowerName.endsWith('.pdf')) {
      // Create a valid, fully openable PDF on the fly!
      const pdfString = [
        "%PDF-1.4",
        "1 0 obj",
        "<< /Type /Catalog /Pages 2 0 R >>",
        "endobj",
        "2 0 obj",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "endobj",
        "3 0 obj",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        "endobj",
        "4 0 obj",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
        "endobj",
        "5 0 obj",
        "<< /Length 1000 >>",
        "stream",
        "BT",
        "/F1 16 Tf",
        "50 720 Td",
        "(GOVERNO DA REPUBLICA DE ANGOLA) Tj",
        "0 -25 Td",
        "/F1 12 Tf",
        "(CORREIO DIGITAL DE ANGOLA - CERTIFICADO LEGAL) Tj",
        "0 -40 Td",
        "/F1 10 Tf",
        "(Nome do Ficheiro Anexo: " + fileName + ") Tj",
        "0 -20 Td",
        "(Entidade Oficial Emissora: " + org + ") Tj",
        "0 -20 Td",
        "(Numero do Protocolo Nacional: " + protocolNumber + ") Tj",
        "0 -20 Td",
        "(Data de Registo: " + signatureDate + " as " + officialTime + ") Tj",
        "0 -40 Td",
        "/F1 11 Tf",
        "(ASSUNTO DA CORRESPONDENCIA EMITIDA:) Tj",
        "0 -20 Td",
        "/F1 10 Tf",
        "(" + (selectedMessage.details?.subject || selectedMessage.preview).substring(0, 60) + ") Tj",
        "0 -40 Td",
        "/F1 11 Tf",
        "(CONTEUDO CERTIFICADO E GARANTIDO:) Tj",
        "0 -20 Td",
        "/F1 10 Tf",
        "(O presente documento atesta legalmente a integridade e veracidade do anexo) Tj",
        "0 -15 Td",
        "(" + fileName + " arquivado e custodiado sob os sistemas seguros do CDA.) Tj",
        "0 -15 Td",
        "(Em conformidade com a Lei de Desmaterializacao da Administracao Publica.) Tj",
        "0 -40 Td",
        "/F1 10 Tf",
        "(ASSINADO ELETRONICAMENTE - SEGURANÇA INTEGRAL) Tj",
        "0 -15 Td",
        "(Chave: " + digitalSignature.substring(0, 36) + ") Tj",
        "0 -15 Td",
        "(SHA-256 Hash: " + documentHash + ") Tj",
        "ET",
        "endstream",
        "endobj",
        "xref",
        "0 6",
        "0000000000 65535 f ",
        "0000000009 00000 n ",
        "0000000056 00000 n ",
        "0000000111 00000 n ",
        "0000000250 00000 n ",
        "0000000326 00000 n ",
        "trailer",
        "<< /Size 6 /Root 1 0 R >>",
        "startxref",
        "1375",
        "%%EOF"
      ].join("\n");

      const blob = new Blob([pdfString], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // Download as text or other registered formats directly without appending extra extensions
      const contentText = `
================================================================================
                    REPÚBLICA DE ANGOLA
         GOVERNO DIGITAL - CORREIO DIGITAL DE ANGOLA (CDA)
================================================================================
                  CERTIFICADO DIGITAL DE EXPEDIENTE

IDENTIFICADOR ÚNICO DO DOCUMENTO:
👉 ${selectedMessage.id}

CÓDIGO DE PROTOCOLO NACIONAL:
👉 ${protocolNumber}

EMISSOR OFICIAL:
🏛️ ${org}

NOME DO FICHEIRO SEGURO ANEXADO:
📄 ${fileName}

DATA DE CERTIFICAÇÃO:
📅 ${signatureDate} às ${officialTime}

ESTADO DE VALIDAÇÃO:
✅ VERIFICADO E ASSINADO (ICP-ANGOLA - INFRAESTRUTURA DE CHAVES PÚBLICAS)

ASSINATURA DIGITAL DO SISTEMA CDA:
🔑 ${digitalSignature}

HASH CRIPTOGRÁFICO DE INTEGRIDADE (SHA-256):
🔒 ${documentHash}

ASSUNTO DO EXPEDIENTE ASSOCIADO:
📝 ${selectedMessage.details?.subject || selectedMessage.preview}

VALIDADE JURÍDICA:
O presente documento é assinado e certificado digitalmente nos termos da lei de
Desmaterialização da Administração Pública e de Governação Digital da República
de Angola. Possui a mesma eficácia e valor probatório que um documento impresso
com assinatura presencial.

--------------------------------------------------------------------------------
         ESTE DOCUMENTO FOI EMITIDO PELO PORTAL OFICIAL DE GOVERNO
             REPÚBLICA DE ANGOLA - TODOS OS DIREITOS RESERVADOS
================================================================================
`.trim();

      const blob = new Blob([contentText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const [inlineAttachedFiles, setInlineAttachedFiles] = useState<{ name: string; size: string }[]>([]);

  const handleInlineFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const isFileExist = (name: string) => inlineAttachedFiles.some(f => f.name === name);
      const newFiles: { name: string; size: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!isFileExist(file.name)) {
          const sz = file.size;
          let sizeStr = '';
          if (sz < 1024) {
            sizeStr = `${sz} B`;
          } else if (sz < 1024 * 1024) {
            sizeStr = `${(sz / 1024).toFixed(1)} KB`;
          } else {
            sizeStr = `${(sz / (1024 * 1024)).toFixed(1)} MB`;
          }
          newFiles.push({ name: file.name, size: sizeStr });
        }
      }
      setInlineAttachedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleInlineFileRemove = (name: string) => {
    setInlineAttachedFiles(prev => prev.filter(f => f.name !== name));
  };

  // States for the 8 official government actions requested
  const [activeOfficialAction, setActiveOfficialAction] = useState<string | null>(null);
  const [successProtocol, setSuccessProtocol] = useState<{
    protocolNumber: string;
    actionName: string;
    details: string;
    timestamp: string;
    digitalSeal: string;
    documentHash: string;
  } | null>(null);

  const [replyText, setReplyText] = useState('');
  const [editorBold, setEditorBold] = useState(false);
  const [editorItalic, setEditorItalic] = useState(false);
  const [editorUnderline, setEditorUnderline] = useState(false);
  const [editorFont, setEditorFont] = useState('sans-serif');
  const [editorFontSize, setEditorFontSize] = useState('base');
  const [editorAlignment, setEditorAlignment] = useState('left');
  const [editorColor, setEditorColor] = useState('#1e293b');
  const [editorIsQuote, setEditorIsQuote] = useState(false);
  const [editorListType, setEditorListType] = useState<string | null>(null);

  const [textHistory, setTextHistory] = useState<string[]>(['']);
  const [historyIndex, setHistoryIndex] = useState(0);

  const updateReplyText = (newText: string) => {
    setReplyText(newText);
    const updatedHistory = textHistory.slice(0, historyIndex + 1);
    if (updatedHistory[updatedHistory.length - 1] !== newText) {
      const nextHistory = [...updatedHistory, newText];
      if (nextHistory.length > 25) {
        nextHistory.shift();
      }
      setTextHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setReplyText(textHistory[prevIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < textHistory.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setReplyText(textHistory[nextIndex]);
    }
  };

  const clearFormatting = () => {
    setEditorBold(false);
    setEditorItalic(false);
    setEditorUnderline(false);
    setEditorFont('sans-serif');
    setEditorFontSize('base');
    setEditorAlignment('left');
    setEditorColor('#1e293b');
    setEditorIsQuote(false);
    setEditorListType(null);
  };

  const [detailEditorBold, setDetailEditorBold] = useState(false);
  const [detailEditorItalic, setDetailEditorItalic] = useState(false);
  const [detailEditorUnderline, setDetailEditorUnderline] = useState(false);
  const [detailEditorFont, setDetailEditorFont] = useState('sans-serif');
  const [detailEditorFontSize, setDetailEditorFontSize] = useState('base');
  const [detailEditorAlignment, setDetailEditorAlignment] = useState('left');
  const [detailEditorColor, setDetailEditorColor] = useState('#1e293b');
  const [detailEditorIsQuote, setDetailEditorIsQuote] = useState(false);
  const [detailEditorListType, setDetailEditorListType] = useState<string | null>(null);

  const [detailTextHistory, setDetailTextHistory] = useState<string[]>(['']);
  const [detailHistoryIndex, setDetailHistoryIndex] = useState(0);

  const updateDetailReplyText = (newText: string) => {
    setDetailReplyText(newText);
    const updatedHistory = detailTextHistory.slice(0, detailHistoryIndex + 1);
    if (updatedHistory[updatedHistory.length - 1] !== newText) {
      const nextHistory = [...updatedHistory, newText];
      if (nextHistory.length > 25) {
        nextHistory.shift();
      }
      setDetailTextHistory(nextHistory);
      setDetailHistoryIndex(nextHistory.length - 1);
    }
  };

  const handleDetailUndo = () => {
    if (detailHistoryIndex > 0) {
      const prevIndex = detailHistoryIndex - 1;
      setDetailHistoryIndex(prevIndex);
      setDetailReplyText(detailTextHistory[prevIndex]);
    }
  };

  const handleDetailRedo = () => {
    if (detailHistoryIndex < detailTextHistory.length - 1) {
      const nextIndex = detailHistoryIndex + 1;
      setDetailHistoryIndex(nextIndex);
      setDetailReplyText(detailTextHistory[nextIndex]);
    }
  };

  const clearDetailFormatting = () => {
    setDetailEditorBold(false);
    setDetailEditorItalic(false);
    setDetailEditorUnderline(false);
    setDetailEditorFont('sans-serif');
    setDetailEditorFontSize('base');
    setDetailEditorAlignment('left');
    setDetailEditorColor('#1e293b');
    setDetailEditorIsQuote(false);
    setDetailEditorListType(null);
  };

  const [confirmReadCheckbox, setConfirmReadCheckbox] = useState(false);
  const [signatureMethod, setSignatureMethod] = useState('BI-DIGITAL');
  const [signaturePin, setSignaturePin] = useState('');
  const [signatureDraw, setSignatureDraw] = useState(false);
  const [revisionReason, setRevisionReason] = useState('Divergência de Valores');
  const [revisionJustification, setRevisionJustification] = useState('');
  const [contestJustification, setContestJustification] = useState('');
  const [contestCategory, setContestCategory] = useState('Atos Administrativos');
  const [attachedFileName, setAttachedFileName] = useState('');
  const [attachedFileBase64, setAttachedFileBase64] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState('2026-05-25');
  const [scheduleMode, setScheduleMode] = useState('Videoconferência');
  const [scheduleLocation, setScheduleLocation] = useState('Posto Central AGT (Luanda)');
  const [forwardTarget, setForwardTarget] = useState('Ministério das Finanças');
  const [forwardJustification, setForwardJustification] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const handleOfficialActionSubmit = (actionName: string) => {
    setIsSubmittingAction(true);
    
    setTimeout(() => {
      const newProtocol = generateProtocol(
        selectedMessage.org,
        'message',
        selectedMessage.id,
        `${actionName}: ${selectedMessage.details?.subject || selectedMessage.preview}`
      );
      const now = new Date();
      const timestampStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const dmyStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
      const fullTimestamp = `${dmyStr} ${timestampStr}`;

      let detailsText = '';
      let auditLogAction = '';
      let newState = selectedMessage.details?.state || 'Recebida';

      if (actionName === 'Responder') {
        detailsText = `Resposta oficial enviada com o seguinte teor: "${replyText.substring(0, 80)}${replyText.length > 80 ? '...' : ''}"`;
        auditLogAction = `Resposta Oficial submetida via Plataforma (Prot: ${newProtocol.protocolNumber})`;
        newState = 'Respondida';
        setReplyText('');
      } else if (actionName === 'Confirmar leitura') {
        detailsText = `Leitura confirmada oficialmente sob termo de responsabilidade civil e administrativa.`;
        auditLogAction = `Aviso de Receção e Leitura Confirmada (Prot: ${newProtocol.protocolNumber})`;
        newState = 'Visualizada';
        setConfirmReadCheckbox(false);
      } else if (actionName === 'Assinar documento') {
        detailsText = `Documento assinado digitalmente com sucesso usando credenciais ${signatureMethod} (PIN autenticado).`;
        auditLogAction = `Assinatura Digital Qualificada aposta (Prot: ${newProtocol.protocolNumber})`;
        newState = 'Aprovada';
        setSignaturePin('');
        setSignatureDraw(false);
      } else if (actionName === 'Solicitar revisão') {
        detailsText = `Solicitada revisão de conteúdo pelo motivo: ${revisionReason}. Justificação: "${revisionJustification.substring(0, 70)}..."`;
        auditLogAction = `Pedido de Revisão Administrativa: ${revisionReason} (Prot: ${newProtocol.protocolNumber})`;
        newState = 'Em análise';
        setRevisionJustification('');
      } else if (actionName === 'Contestação') {
        detailsText = `Contestação formal interposta na categoria: ${contestCategory}. Fundamentação: "${contestJustification.substring(0, 70)}..."`;
        auditLogAction = `Contestação e Impugnação Administrativa registada (Prot: ${newProtocol.protocolNumber})`;
        newState = 'Contestada';
        setContestJustification('');
      } else if (actionName === 'Anexar documento') {
        detailsText = `Documento "${attachedFileName || 'comprovativo_oficial.pdf'}" anexado e armazenado com custódia segura do Estado.`;
        auditLogAction = `Documento Anexo submetido: ${attachedFileName || 'comprovativo_oficial.pdf'} (Prot: ${newProtocol.protocolNumber})`;
        setAttachedFileName('');
        setAttachedFileBase64(null);
      } else if (actionName === 'Agendar atendimento') {
        detailsText = `Atendimento agendado para o dia ${scheduleDate} por via ${scheduleMode} em ${scheduleLocation}.`;
        auditLogAction = `Agendamento de Atendimento Oficial registado para ${scheduleDate} - ${scheduleLocation} (Prot: ${newProtocol.protocolNumber})`;
      } else if (actionName === 'Encaminhar pedido') {
        detailsText = `Processo/Correspondência encaminhada formalmente para: ${forwardTarget}. Nota de despacho: "${forwardJustification.substring(0, 60)}..."`;
        auditLogAction = `Encaminhamento de Pedido deferido para ${forwardTarget} (Prot: ${newProtocol.protocolNumber})`;
        newState = 'Encaminhada';
        setForwardJustification('');
      }

      const logEntry = `${timestampStr} - ${auditLogAction}`;
      const updatedLogs = [...(selectedMessage.auditLogs || []), logEntry];

      if (onUpdateMessage) {
        onUpdateMessage({
          ...selectedMessage,
          details: selectedMessage.details ? {
            ...selectedMessage.details,
            state: newState
          } : undefined,
          auditLogs: updatedLogs
        });
      }

      setSuccessProtocol({
        protocolNumber: newProtocol.protocolNumber,
        actionName,
        details: detailsText,
        timestamp: fullTimestamp,
        digitalSeal: newProtocol.digitalSeal,
        documentHash: newProtocol.documentHash
      });

      setIsSubmittingAction(false);
      setActiveOfficialAction(null);
    }, 1500);
  };

  const sensitivityLevel = selectedMessage.sensitivity || 'Público';
  const sensConfig = SENSITIVITY_LEVELS[sensitivityLevel];

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [isReauthenticating, setIsReauthenticating] = useState(false);
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [shareBlockedNotice, setShareBlockedNotice] = useState<string | null>(null);

  const messagePriority = selectedMessage.priorityScale || 'Normal';
  const prioConfig = PRIORITY_CONFIGS[messagePriority];
  const [deadlineSecondsLeft, setDeadlineSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (selectedMessage.deadlineHoursRemaining !== undefined) {
      setDeadlineSecondsLeft(selectedMessage.deadlineHoursRemaining * 3600);
    } else {
      setDeadlineSecondsLeft(null);
    }
  }, [selectedMessage.id, selectedMessage.deadlineHoursRemaining]);

  useEffect(() => {
    if (deadlineSecondsLeft === null) return;
    if (deadlineSecondsLeft <= 0) return;

    const interval = setInterval(() => {
      setDeadlineSecondsLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [deadlineSecondsLeft]);

  const formatDeadlineRemaining = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    
    // Satisfy exact requested phrase "Prazo restante: 48 horas" when minutes & seconds are 0
    if (mins === 0 && secs === 0) {
      return `Prazo restante: ${hrs} horas`;
    }
    return `Prazo restante: ${hrs} horas, ${mins}m e ${secs}s`;
  };

  useEffect(() => {
    const handleFocus = () => setIsWindowFocused(true);
    const handleBlur = () => setIsWindowFocused(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const addAuditLogToMessage = (actionName: string) => {
    if (!onUpdateMessage) return;
    const now = new Date();
    const formattedTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const logText = `${formattedTime} - ${actionName}`;
    const currentLogs = selectedMessage.auditLogs || [];
    if (currentLogs.includes(logText)) return;
    const updatedMsg = {
      ...selectedMessage,
      auditLogs: [...currentLogs, logText]
    };
    onUpdateMessage(updatedMsg);
  };

  useEffect(() => {
    setIsSessionExpired(false);
    setIsReauthenticating(false);
    setShareBlockedNotice(null);
    
    if (sensConfig && sensConfig.sessionTimeoutSeconds > 0) {
      setTimeLeft(sensConfig.sessionTimeoutSeconds);
    } else {
      setTimeLeft(null);
    }
  }, [selectedMessage.id, sensitivityLevel]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      setIsSessionExpired(true);
      const now = new Date();
      const formattedTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const logText = `${formattedTime} - Sessão expirada (${sensConfig.level})`;
      if (onUpdateMessage) {
        const currentLogs = selectedMessage.auditLogs || [];
        if (!currentLogs.some(log => log.includes('Sessão expirada'))) {
          onUpdateMessage({
            ...selectedMessage,
            auditLogs: [...currentLogs, logText]
          });
        }
      }
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, selectedMessage.id]);

  const handleReauthenticate = () => {
    setIsReauthenticating(true);
    setTimeout(() => {
      setIsReauthenticating(false);
      setIsSessionExpired(false);
      if (sensConfig && sensConfig.sessionTimeoutSeconds > 0) {
        setTimeLeft(sensConfig.sessionTimeoutSeconds);
      }
      addAuditLogToMessage(`Acesso renovado via BI Digital (${sensConfig.level})`);
    }, 2000);
  };

  useEffect(() => {
    const hasVisualized = selectedMessage.auditLogs?.some(log => log.includes('Documento visualizado'));
    if (!hasVisualized) {
      addAuditLogToMessage('Documento visualizado');
    }
  }, [selectedMessage.id]);

  const triggerVerification = () => {
    setShowQRValidation(true);
    setIsValidating(true);
    setTimeout(() => {
      setIsValidating(false);
    }, 850);
  };

  const protocol = selectedMessage.protocol || generateProtocol(
    selectedMessage.org,
    'message',
    selectedMessage.id,
    selectedMessage.details?.subject || selectedMessage.preview
  );

  const generatePreviewDataUrl = (fileName: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const protocolNumber = protocol.protocolNumber;
    const signatureDate = protocol.signatureDate || messageDate;
    const officialTime = protocol.officialTime || '10:45';
    const documentHash = protocol.documentHash;
    const digitalSignature = protocol.digitalSignature || 'RSA-CDA-INTEGRITY-SIGNATURE-KEY-AO';

    const lowerName = fileName.toLowerCase();

    // Background linear gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 600);
    grad.addColorStop(0, '#0c2340');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 600);

    // Frame borders
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, 760, 560);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    ctx.strokeRect(26, 26, 748, 548);

    // Watermark text rotation
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.font = 'bold 50px sans-serif';
    ctx.save();
    ctx.translate(400, 300);
    ctx.rotate(-Math.PI / 6);
    ctx.textAlign = 'center';
    ctx.fillText('GOVERNO DE ANGOLA', 0, -40);
    ctx.fillText('DOCUMENTO AUTENTICADO', 0, 40);
    ctx.restore();

    // Header Texts
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('REPÚBLICA DE ANGOLA', 400, 70);
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('GOVERNO DIGITAL - CORREIO DIGITAL DE ANGOLA (CDA)', 400, 95);
    ctx.font = '11px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('PLATAFORMA NACIONAL DE INTEROPERABILIDADE E EXPEDIENTES', 400, 118);

    // Separator line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(50, 135);
    ctx.lineTo(750, 135);
    ctx.stroke();

    if (lowerName.includes('localizacao') || lowerName.includes('mapa')) {
      // Dynamic Visual Map rendering for location attachments
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(50, 155, 420, 320);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 155, 420, 320);

      // Render simulated roads/routes
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(50, 240); ctx.lineTo(470, 300);
      ctx.moveTo(160, 155); ctx.lineTo(160, 475);
      ctx.moveTo(330, 155); ctx.lineTo(330, 475);
      ctx.moveTo(50, 410); ctx.lineTo(470, 390);
      ctx.stroke();

      // Highlight route
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(160, 410); ctx.lineTo(160, 310); ctx.lineTo(330, 310);
      ctx.stroke();

      // Greenery zones (Parks)
      ctx.fillStyle = '#065f46';
      ctx.fillRect(75, 175, 70, 50);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('ZONA VERDE', 110, 205);

      // Hospital Pin
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(330, 310, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(330, 310, 5, 0, Math.PI * 2);
      ctx.fill();

      // Tooltip on Map
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 1.5;
      ctx.fillRect(200, 205, 230, 48);
      ctx.strokeRect(200, 205, 230, 48);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('HOSPITAL GERAL DE LUANDA', 212, 224);
      ctx.fillStyle = '#818cf8';
      ctx.font = '9px monospace';
      ctx.fillText('LAT: 8.8383° S | LON: 13.2658° E', 212, 238);

      // Info sidebar panel
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.fillRect(490, 155, 260, 320);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.strokeRect(490, 155, 260, 320);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('INFORMAÇÃO DE LOCALIZAÇÃO', 505, 185);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.fillText('INSTITUIÇÃO RESPONSÁVEL', 505, 215);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(selectedMessage.org, 505, 228);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.fillText('ENDEREÇO OFICIAL', 505, 258);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('Distrito da Camama, Luanda, Angola', 505, 271);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.fillText('REFERÊNCIA DE PROTOCOLO', 505, 301);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(protocolNumber, 505, 314);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.fillText('DATA DA CERTIFICAÇÃO', 505, 344);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`${signatureDate} às ${officialTime}`, 505, 357);

      // Authenticity validation seal
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1;
      ctx.strokeRect(505, 395, 230, 65);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.05)';
      ctx.fillRect(505, 395, 230, 65);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('✓ CERTIFICAÇÃO JURÍDICA ATIVA', 515, 413);
      ctx.fillStyle = '#a7f3d0';
      ctx.font = '8px monospace';
      ctx.fillText(`HASH: ${documentHash.substring(0, 24)}...`, 515, 428);
      ctx.fillText('SISTEMA INTEGRADO DE CHAVES PÚBLICAS AO', 515, 442);
    } else {
      // General certified file screenshot placeholder
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(80, 160, 640, 310);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(80, 160, 640, 310);

      ctx.fillStyle = '#0c2340';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('RECONHECIMENTO E AUTENTICAÇÃO DIGITAL DE ANEXO', 400, 200);

      ctx.strokeStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(110, 220); ctx.lineTo(690, 220);
      ctx.stroke();

      ctx.fillStyle = '#334155';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Declaramos e certificamos formalmente que o documento anexo registado sob o nome:`, 110, 250);
      ctx.fillStyle = '#4f46e5';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(fileName, 110, 270);

      ctx.fillStyle = '#334155';
      ctx.font = '11px sans-serif';
      ctx.fillText(`Faz parte integrante da correspondência emitida pela instituição oficial:`, 110, 305);
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(selectedMessage.org, 110, 320);

      ctx.font = '11px sans-serif';
      ctx.fillText(`Assunto do expediente:`, 110, 355);
      ctx.font = 'bold 11px italic sans-serif';
      ctx.fillText(selectedMessage.details?.subject || selectedMessage.preview, 110, 370);

      // Integrity box
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(110, 395, 580, 55);
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(110, 395, 580, 55);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`PROTOCOLO: ${protocolNumber}`, 120, 412);
      ctx.fillText(`DATA: ${signatureDate} ${officialTime}`, 120, 426);
      ctx.fillStyle = '#059669';
      ctx.fillText(`HASH DE INTEGRIDADE (SHA256): ${documentHash}`, 120, 440);
    }

    // Footer block
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`ASSINATURA DIGITAL CDA: ${digitalSignature}`, 400, 515);
    ctx.font = 'italic 9px sans-serif';
    ctx.fillText('Este documento digital possui validade jurídica ao abrigo da regulamentação do Governo de Angola.', 400, 535);

    return canvas.toDataURL('image/png');
  };

  const parsedAttachments = React.useMemo(() => {
    const rawAttachments = selectedMessage.details?.attachments;
    if (!rawAttachments || !Array.isArray(rawAttachments)) return [];
    
    return rawAttachments.map(att => {
      if (!att) return { name: 'documento.pdf', size: '1.2 MB', content: '' };
      if (typeof att === 'object') {
        const anyAtt = att as any;
        return { 
          name: anyAtt.name || 'documento.pdf', 
          size: anyAtt.size || '1.2 MB',
          content: anyAtt.content || ''
        };
      }
      const attString = String(att);
      if (attString.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(attString);
          return {
            name: parsed.name || 'documento.pdf',
            size: parsed.size || '1.2 MB',
            content: parsed.content || '',
            type: parsed.type || ''
          };
        } catch (e) {
          console.error('Error parsing attachment JSON in MessageDetail:', e);
        }
      }
      const match = attString.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
      if (match) {
        return { name: match[1], size: match[2], content: '' };
      }
      return { name: attString, size: '1.2 MB', content: '' };
    });
  }, [selectedMessage.details?.attachments]);

  if (showLocationPage) {
    const currentQuery = mapQuery || messageLocality;
    const isSatellite = mapType === 'satellite';
    const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(currentQuery)}&t=${isSatellite ? 'k' : ''}&z=16&ie=UTF8&iwloc=&output=embed`;
    const openInNewTabUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentQuery)}`;
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(currentQuery)}`;
    
    // Split address for the Google Maps mockup overlay:
    const addressParts = currentQuery.split(',');
    const mainAddressLine = addressParts[0] ? addressParts[0].trim() : currentQuery;
    const secondaryAddressLine = addressParts.slice(1).join(',').trim();

    return (
      <motion.div
        initial={{ opacity: 0, x: -15 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6 pt-2 pb-6 text-left"
      >
        {/* Header with Back Arrow and Title */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowLocationPage(false)}
              className="text-[#384e6e] hover:text-slate-900 hover:bg-slate-100/60 p-2.5 rounded-full transition-all cursor-pointer flex items-center justify-center border border-slate-200 shadow-3xs bg-white"
              title="Voltar ao Detalhe"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest leading-none block mb-1">
                {t("Tramitação de Correspondência")}
              </span>
              <h1 className="text-xl md:text-3xl font-extrabold text-primary tracking-tight leading-none">
                {t("Ver Localização")}
              </h1>
            </div>
          </div>
        </div>

        {/* Map Container and Layout */}
        <div className="bg-white rounded-[28px] md:rounded-[36px] border border-slate-250 p-4 md:p-6 shadow-md relative overflow-hidden flex flex-col gap-6">
          
          {/* Top Search Bar & Map Options */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 z-10">
            <div className="relative flex-1 max-w-lg">
              <input
                type="text"
                placeholder="Pesquisar localidade..."
                value={mapQuery}
                onChange={(e) => setMapQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-2xl py-3 pl-11 pr-4 text-xs font-semibold focus:outline-none focus:border-indigo-505 transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    // Trigger map update
                  }
                }}
              />
              <Search size={14} className="text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              {mapQuery && mapQuery !== messageLocality && (
                <button
                  onClick={() => setMapQuery(messageLocality)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border-0 cursor-pointer"
                >
                  Repor Original
                </button>
              )}
            </div>

            {/* Satellite/Roadmap selectors & Outer Links */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => setMapType('roadmap')}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border cursor-pointer ${
                  !isSatellite 
                    ? 'bg-primary text-white border-primary shadow-3xs' 
                    : 'bg-white text-slate-600 border-slate-250 hover:bg-slate-50'
                }`}
              >
                Mapa
              </button>
              <button
                onClick={() => setMapType('satellite')}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border cursor-pointer ${
                  isSatellite 
                    ? 'bg-primary text-white border-primary shadow-3xs' 
                    : 'bg-white text-slate-600 border-slate-250 hover:bg-slate-50'
                }`}
              >
                Satélite
              </button>
            </div>
          </div>

          {/* Interactive Map Wrapper with custom Float Overlay */}
          <div className="w-full h-[400px] md:h-[520px] rounded-[24px] md:rounded-[30px] overflow-hidden relative border border-slate-250/80 shadow-inner bg-slate-100 z-0">
            
            {/* Beautiful, High-Performance Skeletal Spinner overlay */}
            {mapLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/95 dark:bg-[#091124] z-10 space-y-4 animate-pulse">
                <div className="relative flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-650 animate-spin" />
                  <MapPin size={24} className="text-indigo-650 absolute animate-pulse" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest leading-none">A carregar mapa oficial...</p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-2">Sincronizando coordenadas geográficas via GPS de Luanda</p>
                </div>
              </div>
            )}

            {/* The Actual Interactive Embed Iframe */}
            <iframe
              src={embedUrl}
              className={`w-full h-full border-0 z-0 relative transition-opacity duration-300 ${mapLoading ? 'opacity-0' : 'opacity-100'}`}
              allowFullScreen={true}
              loading="eager"
              onLoad={() => setMapLoading(false)}
              referrerPolicy="no-referrer-when-downgrade"
              title="Google Maps Location"
            />

            {/* FLOATING ADDRESS OVERLAY CARD: Exactly matching Image 2 style */}
            <div className="absolute top-4 left-4 z-10 w-[240px] sm:w-[320px] bg-white rounded-2xl p-4 shadow-xl border border-slate-100/60 translate-y-0 transition-transform">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs sm:text-sm font-black text-slate-800 truncate block tracking-tight leading-snug">
                    {mainAddressLine}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-500 font-semibold truncate leading-relaxed mt-0.5">
                    {secondaryAddressLine || "Luanda, Angola"}
                  </p>
                </div>
                
                {/* Visual Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* External Share Link */}
                  <a
                    href={openInNewTabUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-150 flex items-center justify-center text-indigo-650 hover:text-indigo-850 transition-all cursor-pointer outline-none"
                    title="Abrir no Google Maps"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="7" y1="17" x2="17" y2="7"></line>
                      <polyline points="7 7 17 7 17 17"></polyline>
                    </svg>
                  </a>

                  {/* Turn-by-turn Direction Blue Circle Button */}
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] flex items-center justify-center text-white transition-all shadow-md cursor-pointer outline-none hover:scale-105"
                    title="Como Chegar (Rotas)"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.4 10.8L13.2 1.6C12.4 0.8 11.1 0.8 10.3 1.6L1.1 10.8C0.3 11.6 0.3 12.9 1.1 13.7L10.3 22.9C11.1 23.7 12.4 23.7 13.2 22.9L22.4 13.7C23.2 12.9 23.2 11.6 22.4 10.8ZM16.3 11H13V8H11V11.5C11 11.8 11.2 12 11.5 12H16.3V14L19.3 11.5L16.3 9V11Z" fill="currentColor"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Custom Interactive Scale / Help Badge */}
            <div className="absolute bottom-3 left-4 z-10 bg-white/95 backdrop-blur-xs text-[7.5px] font-black text-slate-500 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-widest leading-none pointer-events-none">
              MÉTRICA REAL-TIME GPS
            </div>
          </div>

          {/* Quick recommendations / Official Details */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-650 flex items-center justify-center border border-indigo-100 shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider leading-none mb-1">
                  Localização Autêntica Registada
                </h4>
                <p className="text-[10px] md:text-xs text-slate-500 font-semibold leading-relaxed">
                  Esta coordenada geográfica define a repartição oficial emissora e tramitadora certificada de acordo com o protocolo de identificação nacional do documento.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (activeAction === 'Ver detalhes') {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        className="space-y-6 pt-2 pb-6 text-left"
      >
        <div className="flex items-center">
          <button 
            type="button"
            onClick={() => setActiveAction(null)}
            className="text-[#384e6e] hover:text-slate-900 hover:bg-slate-100/60 p-2 rounded-full transition-all cursor-pointer flex items-center justify-center border-0 outline-none"
            title="Voltar"
          >
            <ArrowLeft size={24} />
          </button>
        </div>

        <div className="bg-white p-8 md:p-11 rounded-[24px] border border-slate-300 shadow-[0_8px_30px_rgb(0,0,0,0.03)] selection:bg-indigo-100 select-text">
          <div className="flex items-center gap-3 mb-8 text-[#0c2340]">
            <FileText size={24} className="text-[#0c2340]" />
            <span className="font-sans font-extrabold text-[#0c2340] text-base md:text-lg">Conteúdo do Documento</span>
          </div>
          {selectedMessage.details?.body && selectedMessage.details.body.trim().length > 0 ? (
            <div className="space-y-6 text-slate-700 text-sm md:text-[15px] leading-relaxed tracking-wide font-sans">
              {selectedMessage.details.body.split('\n\n').map((paragraph, bgIdx) => {
                const lines = paragraph.split('\n');
                return (
                  <p key={bgIdx} className="font-medium text-slate-700">
                    {lines.map((line, lineIdx) => (
                      <React.Fragment key={lineIdx}>
                        {t(line)}
                        {lineIdx < lines.length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </p>
                );
              })}
            </div>
          ) : (
            <div className="space-y-6 text-slate-700 text-sm md:text-[15px] leading-relaxed tracking-wide font-sans">
              <p className="font-medium text-slate-700">
                {t("Exmo(a) Cidadão(ã),")}<br /><br />
                {selectedMessage.preview || t("Informamos que foi registada uma nova correspondência oficial associada à sua identidade digital no Correio Digital de Angola.")}<br /><br />
                {t("Para mais informações sobre esta correspondência, por favor contacte a instituição emissora diretamente ou aceda ao balcão de atendimento mais próximo.")}<br /><br />
                {t("Nota: Este é um documento oficial do Estado angolano. Para qualquer esclarecimento adicional, contacte o número de suporte do Correio Digital de Angola.")}<br /><br />
                {t("Atenciosamente,")}<br />
                {t("Secretaria do Correio Digital Angola")}
              </p>
            </div>
          )}

          {/* Incoming Document Attachments */}
          {parsedAttachments.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-150 text-left">
              <h4 className="font-sans font-extrabold text-[#0c2340] text-xs uppercase tracking-widest mb-3.5 flex items-center gap-1.5">
                <Paperclip size={14} className="text-indigo-600" />
                {t("Ficheiros / Anexos Oficiais Recebidos")}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {parsedAttachments.map((file, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-2xl transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate" title={file.name}>
                          {file.name}
                        </p>
                        <span className="text-[10px] font-mono text-slate-400 font-medium">
                          {file.size}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const fileWithContent = {
                            ...file,
                            content: file.content || generatePreviewDataUrl(file.name)
                          };
                          setPreviewFile(fileWithContent);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-xl transition-all border-0 bg-transparent cursor-pointer flex items-center justify-center"
                        title={t("Visualizar documento")}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleDownloadFile(file.name);
                        }}
                        className="p-2 text-slate-400 hover:text-[#0c2340] hover:bg-slate-100 rounded-xl transition-all border-0 bg-transparent cursor-pointer flex items-center justify-center"
                        title={t("Descarregar ficheiro")}
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Divider and Reply Section */}
          <div className="mt-8 pt-8 border-t border-slate-200">
            {detailReplySuccess ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-4"
              >
                <div className="flex items-center gap-2.5 text-emerald-800">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                    <Check size={16} strokeWidth={3} />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-sm uppercase tracking-wide leading-none">Resposta Enviada com Sucesso</h5>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest font-mono">Registo Criptográfico Selado</span>
                  </div>
                </div>

                <div className="bg-white border border-emerald-100 p-4 rounded-xl space-y-3 text-xs text-slate-700">
                  <div>
                    <span className="text-[9px] font-black text-slate-450 block uppercase">Protocolo de Resposta</span>
                    <span className="font-mono font-bold text-primary block text-[13px]">{detailReplySuccess.protocolNumber}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-450 block uppercase">Teor Enviado</span>
                    <p className="bg-slate-50 border border-slate-150 p-2.5 rounded-lg font-mono text-slate-700 leading-relaxed max-h-32 overflow-y-auto">
                      {detailReplySuccess.text}
                    </p>
                  </div>
                  {detailReplySuccess.files && detailReplySuccess.files.length > 0 && (
                    <div>
                      <span className="text-[9px] font-black text-slate-450 block uppercase mb-1">Ficheiros Oficiais Anexados ({detailReplySuccess.files.length})</span>
                      <div className="space-y-1 bg-slate-50 border border-slate-150 p-2.5 rounded-lg">
                        {detailReplySuccess.files.map((file, fIdx) => (
                          <div key={fIdx} className="flex items-center gap-2 text-[10.5px] font-mono text-slate-600 leading-none">
                            <span className="text-emerald-500 font-extrabold text-xs">✓</span>
                            <span className="font-semibold truncate max-w-[200px] md:max-w-xs">{file.name}</span>
                            <span className="text-slate-400 text-[9.5px]">({file.size})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-dashed border-slate-150">
                    <div>
                      <span className="text-[9px] font-black text-slate-450 block uppercase">Data & Hora Registo</span>
                      <span className="font-bold text-slate-850 font-mono">{detailReplySuccess.timestamp}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-slate-450 block uppercase">Estado Operacional</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200 leading-none inline-block">
                        Respondida
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-450 block uppercase">Selo Digital Institucional</span>
                    <span className="font-mono text-[8px] text-slate-500 break-all block truncate">{detailReplySuccess.digitalSeal}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDetailReplySuccess(null)}
                  className="px-4 py-2 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-all cursor-pointer active:scale-95 border border-emerald-300"
                >
                  Criar Nova Resposta
                </button>
              </motion.div>
            ) : isReplyingInDetails ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black tracking-widest text-[#0c2340] uppercase font-mono block">
                    Elaboração de Resposta Oficial
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsReplyingInDetails(false);
                      setDetailReplyText('');
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>

                {sensConfig.level === 'Ultra Restrito' ? (
                  <div className="bg-red-50 border border-red-200 text-red-00 p-4 rounded-xl flex items-start gap-2 text-xs font-bold">
                    <Lock size={16} className="text-red-500 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <span>Este documento possui sensibilidade crítica de nível <strong>Ultra Restrito</strong>.</span>
                      <p className="text-[10px] text-red-700 mt-1 font-semibold leading-relaxed">
                        A resposta a este documento está bloqueada por motivos regulamentares e de confidencialidade de Estado.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      {/* Rich text Toolbar for details view, styled exactly like the attached image */}
                      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-white border border-slate-200 rounded-2xl mb-2 shadow-sm">
                        {/* Undo / Redo */}
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={handleDetailUndo}
                            disabled={detailHistoryIndex === 0}
                            title="Desfazer (Undo)"
                            className={`p-2 rounded-xl hover:bg-slate-200/80 active:scale-95 transition-all ${
                              detailHistoryIndex === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-650 hover:text-slate-900'
                            }`}
                          >
                            <Undo size={14} className="stroke-[2.5]" />
                          </button>
                          <button
                            type="button"
                            onClick={handleDetailRedo}
                            disabled={detailHistoryIndex >= detailTextHistory.length - 1}
                            title="Refazer (Redo)"
                            className={`p-2 rounded-xl hover:bg-slate-200/80 active:scale-95 transition-all ${
                              detailHistoryIndex >= detailTextHistory.length - 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-650 hover:text-slate-900'
                            }`}
                          >
                            <Redo size={14} className="stroke-[2.5]" />
                          </button>
                        </div>

                        <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

                        {/* Font Family Selector Dropdown */}
                        <div className="relative">
                          <select
                            value={detailEditorFont}
                            onChange={(e) => setDetailEditorFont(e.target.value)}
                            className="bg-transparent text-slate-700 text-xs font-semibold py-1 pl-2 pr-5 border border-transparent rounded-xl hover:bg-slate-200/60 cursor-pointer focus:outline-none appearance-none font-sans"
                          >
                            <option value="sans-serif">Sans Serif</option>
                            <option value="serif">Serif (Editorial)</option>
                            <option value="monospace">Monospace</option>
                          </select>
                          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[8px] font-black">▼</div>
                        </div>

                        <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

                        {/* Font Size Selector Dropdown "tT" */}
                        <div className="relative flex items-center">
                          <span className="text-[10px] font-black mr-1 text-slate-500">tT</span>
                          <select
                            value={detailEditorFontSize}
                            onChange={(e) => setDetailEditorFontSize(e.target.value)}
                            className="bg-transparent text-slate-700 text-xs font-semibold py-1 pl-1.5 pr-4 border border-transparent rounded-xl hover:bg-slate-200/60 cursor-pointer focus:outline-none appearance-none font-sans"
                          >
                            <option value="sm">Pequeno</option>
                            <option value="base">Normal</option>
                            <option value="lg">Grande</option>
                            <option value="xl">Título</option>
                          </select>
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-slate-405 text-[8px] font-black">▼</div>
                        </div>

                        <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

                        {/* Inline formatting styles B, I, U */}
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => setDetailEditorBold(!detailEditorBold)}
                            title="Negrito (Bold)"
                            className={`p-1.5 rounded-xl active:scale-95 transition-all font-black text-xs min-w-[28px] flex items-center justify-center ${
                              detailEditorBold 
                                ? 'bg-indigo-100/80 text-indigo-700 border border-indigo-200/30' 
                                : 'text-slate-655 hover:bg-slate-200/60 hover:text-slate-900'
                            }`}
                          >
                            <Bold size={13} className="stroke-[3]" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDetailEditorItalic(!detailEditorItalic)}
                            title="Itálico (Italic)"
                            className={`p-1.5 rounded-xl active:scale-95 transition-all font-black text-xs min-w-[28px] flex items-center justify-center ${
                              detailEditorItalic 
                                ? 'bg-indigo-100/80 text-indigo-700 border border-indigo-200/30' 
                                : 'text-slate-655 hover:bg-slate-200/60 hover:text-slate-900'
                            }`}
                          >
                            <Italic size={13} className="stroke-[3]" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDetailEditorUnderline(!detailEditorUnderline)}
                            title="Sublinhado (Underline)"
                            className={`p-1.5 rounded-xl active:scale-95 transition-all font-black text-xs min-w-[28px] flex items-center justify-center ${
                              detailEditorUnderline 
                                ? 'bg-indigo-100/80 text-indigo-700 border border-indigo-200/30' 
                                : 'text-slate-655 hover:bg-slate-200/60 hover:text-slate-900'
                            }`}
                          >
                            <Underline size={13} className="stroke-[3]" />
                          </button>
                        </div>

                        <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

                        {/* Font Color Selection */}
                        <div className="relative group">
                          <button
                            type="button"
                            title="Cor do Texto"
                            className="p-1.5 rounded-xl text-slate-650 hover:bg-slate-200/60 hover:text-slate-900 active:scale-95 transition-all flex items-center gap-1"
                          >
                            <span className="font-extrabold text-xs border-b-2 leading-none" style={{ borderColor: detailEditorColor }}>A</span>
                            <span className="text-[6px]">▼</span>
                          </button>
                          <div className="absolute left-0 top-8 hidden group-hover:flex group-focus-within:flex flex-col bg-white border border-slate-200 rounded-xl p-2 shadow-xl z-20 min-w-[130px] gap-1">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest px-1">Cor da Fonte</span>
                            <div className="grid grid-cols-5 gap-1 pt-1">
                              {[
                                { label: 'Slate', value: '#1e293b', bgClass: 'bg-slate-800' },
                                { label: 'Red', value: '#dc2626', bgClass: 'bg-red-600' },
                                { label: 'Blue', value: '#2563eb', bgClass: 'bg-blue-600' },
                                { label: 'Green', value: '#16a34a', bgClass: 'bg-green-600' },
                                { label: 'Gold', value: '#ca8a04', bgClass: 'bg-yellow-600' }
                              ].map((color) => (
                                <button
                                  key={color.value}
                                  type="button"
                                  onClick={() => setDetailEditorColor(color.value)}
                                  title={color.label}
                                  className={`w-3.5 h-3.5 rounded-full border transition-all ${color.bgClass} ${
                                    detailEditorColor === color.value ? 'ring-2 ring-indigo-500 ring-offset-1 border-white' : 'border-black/5'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

                        {/* Paragraph Alignment Selector Button Row */}
                        <div className="flex items-center gap-0.5">
                          {[
                            { val: 'left', icon: <AlignLeft size={13} />, title: 'Alinhar à Esquerda' },
                            { val: 'center', icon: <AlignCenter size={13} />, title: 'Alinhar ao Centro' },
                            { val: 'right', icon: <AlignRight size={13} />, title: 'Alinhar à Direita' },
                            { val: 'justify', icon: <AlignJustify size={13} />, title: 'Justificar' }
                          ].map((align) => (
                            <button
                              key={align.val}
                              type="button"
                              onClick={() => setDetailEditorAlignment(align.val)}
                              title={align.title}
                              className={`p-1.5 rounded-xl active:scale-95 transition-all text-slate-655 ${
                                detailEditorAlignment === align.val 
                                  ? 'bg-indigo-100/85 text-indigo-700 border border-indigo-200/30' 
                                  : 'hover:bg-slate-200/60 hover:text-slate-900'
                              }`}
                            >
                              {align.icon}
                            </button>
                          ))}
                        </div>

                        <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

                        {/* List Type Bullet/Ordered Toggles */}
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (detailEditorListType === 'bullet') {
                                setDetailEditorListType(null);
                              } else {
                                setDetailEditorListType('bullet');
                                if (!detailReplyText.trim().startsWith('•') && !detailReplyText.trim().startsWith('-')) {
                                  updateDetailReplyText(`• ` + detailReplyText);
                                }
                              }
                            }}
                            title="Lista de Marcadores (Bullets)"
                            className={`p-1.5 rounded-xl active:scale-95 transition-all ${
                              detailEditorListType === 'bullet'
                                ? 'bg-indigo-100/85 text-indigo-700 border border-indigo-200/30'
                                : 'text-slate-605 hover:bg-slate-200/60 hover:text-slate-900'
                            }`}
                          >
                            <List size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (detailEditorListType === 'ordered') {
                                setDetailEditorListType(null);
                              } else {
                                setDetailEditorListType('ordered');
                                if (!/^\d+\./.test(detailReplyText.trim())) {
                                  updateDetailReplyText(`1. ` + detailReplyText);
                                }
                              }
                            }}
                            title="Lista Numerada"
                            className={`p-1.5 rounded-xl active:scale-95 transition-all ${
                              detailEditorListType === 'ordered'
                                ? 'bg-indigo-100/85 text-indigo-700 border border-indigo-200/30'
                                : 'text-slate-605 hover:bg-slate-200/60 hover:text-slate-900'
                            }`}
                          >
                            <ListOrdered size={13} />
                          </button>
                        </div>

                        <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

                        {/* Blockquote Quote */}
                        <button
                          type="button"
                          onClick={() => setDetailEditorIsQuote(!detailEditorIsQuote)}
                          title="Formatar como Citação (Blockquote)"
                          className={`p-1.5 rounded-xl active:scale-95 transition-all ${
                            detailEditorIsQuote
                              ? 'bg-indigo-100/85 text-indigo-700 border border-indigo-200/30'
                              : 'text-slate-605 hover:bg-slate-200/60 hover:text-slate-900'
                          }`}
                        >
                          <Quote size={13} />
                        </button>

                        {/* Clear formatting Eraser */}
                        <button
                          type="button"
                          onClick={clearDetailFormatting}
                          title="Limpar Formatação"
                          className="p-1.5 rounded-xl text-slate-600 hover:bg-slate-250 hover:text-red-650 hover:bg-red-50/70 active:scale-95 transition-all ml-auto"
                        >
                          <Eraser size={13} />
                        </button>
                      </div>

                      <textarea
                        value={detailReplyText}
                        onChange={(e) => updateDetailReplyText(e.target.value)}
                        placeholder="Escreva aqui a sua resposta oficial..."
                        rows={12}
                        className={`w-full bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-xs md:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0c2340]/20 focus:border-[#0c2340] shadow-inner transition-all min-h-[260px] ${
                          detailEditorFont === 'serif' ? 'font-serif' : detailEditorFont === 'monospace' ? 'font-mono' : 'font-sans'
                        } ${
                          detailEditorFontSize === 'sm' ? 'text-xs' : detailEditorFontSize === 'lg' ? 'text-base md:text-lg' : detailEditorFontSize === 'xl' ? 'text-lg md:text-xl font-bold' : 'text-sm'
                        } ${
                          detailEditorAlignment === 'center' ? 'text-center' : detailEditorAlignment === 'right' ? 'text-right' : detailEditorAlignment === 'justify' ? 'text-justify' : 'text-left'
                        }`}
                        style={{
                          fontWeight: detailEditorBold ? 'bold' : 'normal',
                          fontStyle: detailEditorItalic ? 'italic' : 'normal',
                          textDecoration: detailEditorUnderline ? 'underline' : 'none',
                          color: detailEditorColor,
                          borderLeft: detailEditorIsQuote ? '4px solid #6366f1' : undefined,
                          paddingLeft: detailEditorIsQuote ? '1rem' : undefined,
                        }}
                      />
                    </div>

                    <div className="flex flex-col gap-3">
                      {inlineAttachedFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-205 rounded-2xl">
                          {inlineAttachedFiles.map((file, fIdx) => (
                            <div 
                              key={fIdx} 
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-xs text-[11px] font-bold text-slate-700"
                            >
                              <FileText size={13} className="text-[#0c2340]/80 shrink-0" />
                              <span className="truncate max-w-[160px] select-none">{file.name}</span>
                              <span className="text-[9px] text-slate-400 font-mono select-none">({file.size})</span>
                              <button 
                                type="button"
                                onClick={() => handleInlineFileRemove(file.name)}
                                className="p-0.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors cursor-pointer ml-1"
                                title="Remover anexo"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!detailReplyText.trim()) return;

                            const newProtocol = generateProtocol(
                              selectedMessage.org,
                              'message',
                              selectedMessage.id,
                              `Resposta: ${selectedMessage.details?.subject || selectedMessage.preview}`
                            );
                            const now = new Date();
                            const timestampStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
                            const dmyStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
                            const fullTimestamp = `${dmyStr} ${timestampStr}`;

                            const filesListLog = inlineAttachedFiles.length > 0 
                              ? ` contendo ${inlineAttachedFiles.length} anexo(s) [${inlineAttachedFiles.map(f => f.name).join(', ')}]`
                              : '';
                            const auditLogAction = `Resposta Oficial submetida via Conteúdo do Documento (Prot: ${newProtocol.protocolNumber})${filesListLog}`;
                            const logEntry = `${timestampStr} - ${auditLogAction}`;
                            const updatedLogs = [...(selectedMessage.auditLogs || []), logEntry];

                            if (onUpdateMessage) {
                              onUpdateMessage({
                                ...selectedMessage,
                                details: selectedMessage.details ? {
                                  ...selectedMessage.details,
                                  state: 'Respondida'
                                } : {
                                  subject: selectedMessage.preview,
                                  body: selectedMessage.preview,
                                  state: 'Respondida'
                                },
                                auditLogs: updatedLogs
                              });
                            }

                            setDetailReplySuccess({
                              protocolNumber: newProtocol.protocolNumber,
                              timestamp: fullTimestamp,
                              text: detailReplyText,
                              digitalSeal: newProtocol.digitalSeal,
                              documentHash: newProtocol.documentHash,
                              files: inlineAttachedFiles
                            });

                            setDetailReplyText('');
                            setInlineAttachedFiles([]);
                            setIsReplyingInDetails(false);
                          }}
                          disabled={!detailReplyText.trim()}
                          className="flex items-center gap-2 px-5 py-2.5 bg-[#0c2340] text-white font-extrabold text-xs md:text-sm rounded-full shadow-md hover:bg-[#152e4d] transition-all hover:scale-[1.02] active:scale-95 cursor-pointer disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                        >
                          <Send size={14} className="text-white" />
                          <span>Enviar Resposta Oficial</span>
                        </button>

                        <label 
                          className="flex items-center justify-center p-2.5 bg-transparent hover:bg-slate-100/70 text-[#0c2340] hover:text-indigo-700 rounded-full transition-all cursor-pointer active:scale-95 border border-slate-300 relative group"
                          title="Anexar múltiplos ficheiros"
                        >
                          <Paperclip size={16} className="stroke-[2.5]" />
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx"
                            className="hidden"
                            onChange={handleInlineFileAdd}
                          />
                          {inlineAttachedFiles.length > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-[#0c2340] text-white font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                              {inlineAttachedFiles.length}
                            </span>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="text-left">
                  <h5 className="font-extrabold text-sm text-slate-900 leading-none">Precisa responder a este documento?</h5>
                  <p className="text-xs text-slate-550 font-semibold mt-1">Envie uma resposta formal assinada registando um protocolo associado.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReplyingInDetails(true)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full font-black text-xs md:text-sm shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${
                    sensConfig.level === 'Ultra Restrito'
                      ? 'bg-slate-100 text-slate-400 border border-slate-205 cursor-not-allowed'
                      : 'bg-[#0c2340] text-white hover:bg-[#152e4d]'
                  }`}
                  disabled={sensConfig.level === 'Ultra Restrito'}
                >
                  <Send size={14} className="text-white" />
                  <span>{sensConfig.level === 'Ultra Restrito' ? 'Resposta Bloqueada' : 'Responder ao Documento'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between gap-3">
        <button 
          onClick={() => {
            setTab(backTab || 'correspondencias');
            setSelectedMessage(null);
          }}
          className="text-[#384e6e] hover:text-slate-900 hover:bg-slate-100/60 p-2 rounded-full transition-all cursor-pointer flex items-center justify-center border-0 outline-none"
          title="Voltar ao Correio"
        >
          <ArrowLeft size={24} />
        </button>
        
        <div className="flex items-center gap-2">
          {isDeleted ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (onRestoreMessage) {
                    onRestoreMessage(selectedMessage.id);
                    setTab('correspondencias');
                    setSelectedMessage(null);
                  }
                }}
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-sm rounded-xl transition-all active:scale-95 flex items-center gap-1.5 border-0 cursor-pointer"
              >
                Restaurar
              </button>
              <button
                onClick={() => {
                  setMessageToDelete({ id: selectedMessage.id, isPermanent: true });
                }}
                className="px-4 py-2 bg-red-50 hover:bg-red-105 text-red-650 font-extrabold text-sm rounded-xl transition-all active:scale-95 flex items-center gap-1.5 border-0 cursor-pointer"
              >
                <Trash2 size={14} />
                Eliminar Permanentemente
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setMessageToDelete({ id: selectedMessage.id, isPermanent: false });
              }}
              className="px-4 py-2 bg-red-50 hover:bg-red-105 text-red-650 font-extrabold text-sm rounded-xl transition-all active:scale-95 flex items-center gap-1.5 border-0 cursor-pointer"
            >
              <Trash2 size={14} />
              Eliminar
            </button>
          )}

          <button 
            onClick={() => {
              if (sensConfig.level === 'Ultra Restrito') {
                setShareBlockedNotice('Bloqueado: Política de Controle de Compartilhamento proíbe reencaminhar ou responder a documentos de nível Ultra Restrito.');
                setTimeout(() => setShareBlockedNotice(null), 5000);
                return;
              }
              addAuditLogToMessage('Resposta enviada');
              handleReply(selectedMessage);
            }}
            className={`px-4 py-2 rounded-xl font-extrabold text-sm transition-all active:scale-95 flex items-center gap-1.5 border-0 cursor-pointer ${
              sensConfig.level === 'Ultra Restrito' 
                ? 'text-red-500 bg-red-50 hover:bg-red-100/30' 
                : 'text-primary hover:bg-primary/5 bg-transparent'
            }`}
          >
            {sensConfig.level === 'Ultra Restrito' && <Lock size={14} />}
            {sensConfig.level === 'Ultra Restrito' ? 'Responder Bloqueado' : 'Responder'}
          </button>
        </div>
      </div>

      {shareBlockedNotice && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold"
        >
          <Lock size={16} className="text-red-500 shrink-0 animate-pulse" />
          <span>{shareBlockedNotice}</span>
        </motion.div>
      )}



      <section className={`border border-line rounded-2xl p-5 bg-white shadow-sm relative overflow-hidden select-none print:hidden ${sensConfig.screenshotProtection ? 'selection:bg-transparent' : ''}`}>
        <AnimatePresence mode="wait">
          {activeOfficialAction ? (
            <motion.div
              key="official-action-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 text-left"
            >
              {/* Header */}
              <div className="flex items-center gap-3 pb-4 border-b border-slate-150">
                <button
                  type="button"
                  onClick={() => {
                    setActiveOfficialAction(null);
                  }}
                  className="flex items-center justify-center w-10 h-10 bg-white border-2 border-[#d1dbe5] rounded-full text-[#384e6e] hover:bg-slate-50 transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95"
                  title="Voltar"
                >
                  <ArrowLeft size={16} className="text-[#384e6e]" />
                </button>
                <div className="text-left">
                  <h4 className="font-extrabold text-[#111A2E] text-sm md:text-base flex items-center gap-1.5 uppercase tracking-wide">
                     Trâmite Oficial: {activeOfficialAction}
                  </h4>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black leading-none mt-0.5">
                     Formalização Digital com Validade Jurídica
                  </p>
                </div>
              </div>

              {/* Responder Form */}
              {activeOfficialAction === 'Responder' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs text-slate-600 leading-relaxed font-semibold">
                    Configure a sua resposta formal. O envio deste formulário regista automaticamente um novo protocolo governamental associado ao seu processo.
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">Corpo do Ofício de Resposta</label>
                    
                    {/* Rich text Toolbar styled exactly like the attached image */}
                    <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-white border border-slate-200 rounded-2xl mb-2 shadow-sm">
                      {/* Undo / Redo */}
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={handleUndo}
                          disabled={historyIndex === 0}
                          title="Desfazer (Undo)"
                          className={`p-2 rounded-xl hover:bg-slate-200/80 active:scale-95 transition-all ${
                            historyIndex === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-650 hover:text-slate-900'
                          }`}
                        >
                          <Undo size={14} className="stroke-[2.5]" />
                        </button>
                        <button
                          type="button"
                          onClick={handleRedo}
                          disabled={historyIndex >= textHistory.length - 1}
                          title="Refazer (Redo)"
                          className={`p-2 rounded-xl hover:bg-slate-200/80 active:scale-95 transition-all ${
                            historyIndex >= textHistory.length - 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-650 hover:text-slate-900'
                          }`}
                        >
                          <Redo size={14} className="stroke-[2.5]" />
                        </button>
                      </div>

                      <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

                      {/* Font Family Selector Dropdown */}
                      <div className="relative">
                        <select
                          value={editorFont}
                          onChange={(e) => setEditorFont(e.target.value)}
                          className="bg-transparent text-slate-700 text-xs font-semibold py-1 pl-2 pr-5 border border-transparent rounded-xl hover:bg-slate-200/60 cursor-pointer focus:outline-none appearance-none font-sans"
                        >
                          <option value="sans-serif">Sans Serif</option>
                          <option value="serif">Serif (Editorial)</option>
                          <option value="monospace">Monospace</option>
                        </select>
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[8px] font-black">▼</div>
                      </div>

                      <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

                      {/* Font Size Selector Dropdown "tT" */}
                      <div className="relative flex items-center">
                        <span className="text-[10px] font-black mr-1 text-slate-500">tT</span>
                        <select
                          value={editorFontSize}
                          onChange={(e) => setEditorFontSize(e.target.value)}
                          className="bg-transparent text-slate-700 text-xs font-semibold py-1 pl-1.5 pr-4 border border-transparent rounded-xl hover:bg-slate-200/60 cursor-pointer focus:outline-none appearance-none font-sans"
                        >
                          <option value="sm">Pequeno</option>
                          <option value="base">Normal</option>
                          <option value="lg">Grande</option>
                          <option value="xl">Título</option>
                        </select>
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[8px] font-black">▼</div>
                      </div>

                      <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

                      {/* Inline formatting styles B, I, U */}
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => setEditorBold(!editorBold)}
                          title="Negrito (Bold)"
                          className={`p-1.5 rounded-xl active:scale-95 transition-all font-black text-xs min-w-[28px] flex items-center justify-center ${
                            editorBold 
                              ? 'bg-indigo-100/80 text-indigo-700 border border-indigo-200/30' 
                              : 'text-slate-655 hover:bg-slate-200/60 hover:text-slate-900'
                          }`}
                        >
                          <Bold size={13} className="stroke-[3]" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditorItalic(!editorItalic)}
                          title="Itálico (Italic)"
                          className={`p-1.5 rounded-xl active:scale-95 transition-all font-black text-xs min-w-[28px] flex items-center justify-center ${
                            editorItalic 
                              ? 'bg-indigo-100/80 text-indigo-700 border border-indigo-200/30' 
                              : 'text-slate-655 hover:bg-slate-200/60 hover:text-slate-900'
                          }`}
                        >
                          <Italic size={13} className="stroke-[3]" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditorUnderline(!editorUnderline)}
                          title="Sublinhado (Underline)"
                          className={`p-1.5 rounded-xl active:scale-95 transition-all font-black text-xs min-w-[28px] flex items-center justify-center ${
                            editorUnderline 
                              ? 'bg-indigo-100/80 text-indigo-700 border border-indigo-200/30' 
                              : 'text-slate-655 hover:bg-slate-200/60 hover:text-slate-900'
                          }`}
                        >
                          <Underline size={13} className="stroke-[3]" />
                        </button>
                      </div>

                      <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

                      {/* Font Color Selection */}
                      <div className="relative group">
                        <button
                          type="button"
                          title="Cor do Texto"
                          className="p-1.5 rounded-xl text-slate-650 hover:bg-slate-200/60 hover:text-slate-900 active:scale-95 transition-all flex items-center gap-1"
                        >
                          <span className="font-extrabold text-xs border-b-2 leading-none" style={{ borderColor: editorColor }}>A</span>
                          <span className="text-[6px]">▼</span>
                        </button>
                        <div className="absolute left-0 top-8 hidden group-hover:flex group-focus-within:flex flex-col bg-white border border-slate-200 rounded-xl p-2 shadow-xl z-20 min-w-[130px] gap-1">
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest px-1">Cor da Fonte</span>
                          <div className="grid grid-cols-5 gap-1 pt-1">
                            {[
                              { label: 'Slate', value: '#1e293b', bgClass: 'bg-slate-800' },
                              { label: 'Red', value: '#dc2626', bgClass: 'bg-red-600' },
                              { label: 'Blue', value: '#2563eb', bgClass: 'bg-blue-600' },
                              { label: 'Green', value: '#16a34a', bgClass: 'bg-green-600' },
                              { label: 'Gold', value: '#ca8a04', bgClass: 'bg-yellow-600' }
                            ].map((color) => (
                              <button
                                key={color.value}
                                type="button"
                                onClick={() => setEditorColor(color.value)}
                                title={color.label}
                                className={`w-3.5 h-3.5 rounded-full border transition-all ${color.bgClass} ${
                                  editorColor === color.value ? 'ring-2 ring-indigo-500 ring-offset-1 border-white' : 'border-black/5'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

                      {/* Paragraph Alignment Selector Button Row */}
                      <div className="flex items-center gap-0.5">
                        {[
                          { val: 'left', icon: <AlignLeft size={13} />, title: 'Alinhar à Esquerda' },
                          { val: 'center', icon: <AlignCenter size={13} />, title: 'Alinhar ao Centro' },
                          { val: 'right', icon: <AlignRight size={13} />, title: 'Alinhar à Direita' },
                          { val: 'justify', icon: <AlignJustify size={13} />, title: 'Justificar' }
                        ].map((align) => (
                          <button
                            key={align.val}
                            type="button"
                            onClick={() => setEditorAlignment(align.val)}
                            title={align.title}
                            className={`p-1.5 rounded-xl active:scale-95 transition-all text-slate-655 ${
                              editorAlignment === align.val 
                                ? 'bg-indigo-100/85 text-indigo-700 border border-indigo-200/30' 
                                : 'hover:bg-slate-200/60 hover:text-slate-900'
                            }`}
                          >
                            {align.icon}
                          </button>
                        ))}
                      </div>

                      <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

                      {/* List Type Bullet/Ordered Toggles */}
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (editorListType === 'bullet') {
                              setEditorListType(null);
                            } else {
                              setEditorListType('bullet');
                              if (!replyText.trim().startsWith('•') && !replyText.trim().startsWith('-')) {
                                updateReplyText(`• ` + replyText);
                              }
                            }
                          }}
                          title="Lista de Marcadores (Bullets)"
                          className={`p-1.5 rounded-xl active:scale-95 transition-all ${
                            editorListType === 'bullet'
                              ? 'bg-indigo-100/85 text-indigo-700 border border-indigo-200/30'
                              : 'text-slate-605 hover:bg-slate-200/60 hover:text-slate-900'
                          }`}
                        >
                          <List size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (editorListType === 'ordered') {
                              setEditorListType(null);
                            } else {
                              setEditorListType('ordered');
                              if (!/^\d+\./.test(replyText.trim())) {
                                updateReplyText(`1. ` + replyText);
                              }
                            }
                          }}
                          title="Lista Numerada"
                          className={`p-1.5 rounded-xl active:scale-95 transition-all ${
                            editorListType === 'ordered'
                              ? 'bg-indigo-100/85 text-indigo-700 border border-indigo-200/30'
                              : 'text-slate-605 hover:bg-slate-200/60 hover:text-slate-900'
                          }`}
                        >
                          <ListOrdered size={13} />
                        </button>
                      </div>

                      <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

                      {/* Blockquote Quote */}
                      <button
                        type="button"
                        onClick={() => setEditorIsQuote(!editorIsQuote)}
                        title="Formatar como Citação (Blockquote)"
                        className={`p-1.5 rounded-xl active:scale-95 transition-all ${
                          editorIsQuote
                            ? 'bg-indigo-100/85 text-indigo-700 border border-indigo-200/30'
                            : 'text-slate-605 hover:bg-slate-200/60 hover:text-slate-900'
                        }`}
                      >
                        <Quote size={13} />
                      </button>

                      {/* Clear formatting Eraser */}
                      <button
                        type="button"
                        onClick={clearFormatting}
                        title="Limpar Formatação"
                        className="p-1.5 rounded-xl text-slate-600 hover:bg-slate-250 hover:text-red-650 hover:bg-red-50/70 active:scale-95 transition-all ml-auto"
                      >
                        <Eraser size={13} />
                      </button>
                    </div>

                    <textarea
                      value={replyText}
                      onChange={(e) => updateReplyText(e.target.value)}
                      placeholder="Introduza a sua mensagem de resposta formal aqui..."
                      rows={6}
                      className={`w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs md:text-sm font-semibold focus:outline-none focus:border-indigo-500 shadow-inner h-44 resize-y transition-all ${
                        editorFont === 'serif' ? 'font-serif' : editorFont === 'monospace' ? 'font-mono' : 'font-sans'
                      } ${
                        editorFontSize === 'sm' ? 'text-xs' : editorFontSize === 'lg' ? 'text-base md:text-lg' : editorFontSize === 'xl' ? 'text-lg md:text-xl font-bold' : 'text-sm'
                      } ${
                        editorAlignment === 'center' ? 'text-center' : editorAlignment === 'right' ? 'text-right' : editorAlignment === 'justify' ? 'text-justify' : 'text-left'
                      }`}
                      style={{
                        fontWeight: editorBold ? 'bold' : 'normal',
                        fontStyle: editorItalic ? 'italic' : 'normal',
                        textDecoration: editorUnderline ? 'underline' : 'none',
                        color: editorColor,
                        borderLeft: editorIsQuote ? '4px solid #6366f1' : undefined,
                        paddingLeft: editorIsQuote ? '1rem' : undefined,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Confirmar leitura Form */}
              {activeOfficialAction === 'Confirmar leitura' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs text-slate-600 leading-relaxed font-semibold">
                     A confirmação de leitura oficial constitui um documento oficial de <strong className="text-slate-900">Aviso de Receção (AR)</strong> que comprova legalmente perante o órgão emissor que tomou conhecimento integral dos termos deste documento.
                  </div>

                  <label className="flex items-start gap-3 bg-indigo-50/40 border border-indigo-150 p-4 rounded-2xl cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={confirmReadCheckbox}
                      onChange={(e) => setConfirmReadCheckbox(e.target.checked)}
                      className="mt-1 w-4.5 h-4.5 rounded text-primary focus:ring-0 active:scale-95 transition-all text-xs"
                    />
                    <div className="text-xs font-bold text-slate-700 leading-relaxed">
                       Declaro formalmente, para todos os efeitos de lei civil e administrativa, que efetuei a leitura integral e compreendi todos os prazos, obrigações e termos jurídicos descritos nesta correspondência oficial emitida por <strong className="text-primary">{selectedMessage.org}</strong>.
                    </div>
                  </label>
                </div>
              )}

              {/* Assinar documento Form */}
              {activeOfficialAction === 'Assinar documento' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs text-slate-650 leading-relaxed font-semibold">
                     Aplique a sua assinatura digital qualificada ao documento em conformidade com as normas regulamentares de identidade digital de Angola.
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Canal Chave de Identidade</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSignatureMethod('BI-DIGITAL')}
                        className={`p-3 rounded-2xl border text-xs font-black uppercase flex flex-col items-center justify-center gap-1.5 transition-all ${
                          signatureMethod === 'BI-DIGITAL' 
                            ? 'bg-primary border-primary text-white shadow shadow-primary/25' 
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Fingerprint size={16} /> Key Móvel BI Digital
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignatureMethod('ICP-AO')}
                        className={`p-3 rounded-2xl border text-xs font-black uppercase flex flex-col items-center justify-center gap-1.5 transition-all ${
                          signatureMethod === 'ICP-AO' 
                            ? 'bg-primary border-primary text-white shadow shadow-primary/25' 
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Lock size={16} /> Certificado ICP-AO
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block text-center">Código PIN Governamental (4 dígitos)</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={signaturePin}
                      onChange={(e) => setSignaturePin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center text-sm font-black font-mono tracking-[0.5em] w-32 focus:outline-none focus:border-indigo-500 block mx-auto"
                    />
                  </div>

                  <div className="border border-slate-200 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center bg-slate-50/50">
                    <div className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest mb-1">Rubricar Assinatura Criptográfica</div>
                    <div 
                      onClick={() => setSignatureDraw(true)}
                      className="w-full h-20 bg-white border border-slate-200 rounded-xl flex items-center justify-center cursor-crosshair text-[11px] text-slate-500 font-semibold"
                    >
                      {signatureDraw ? (
                        <span className="font-mono text-[10px] text-slate-800 font-extrabold flex items-center gap-1.5">
                          ✍︎ {selectedMessage.org.replace(/[^a-zA-Z ]/g, "").substring(0, 10)}... Rubrica Eletrónica Ativa
                        </span>
                      ) : (
                        <span>Clique para autenticar rubrica manuscrita digitalizada</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Solicitar revisão Form */}
              {activeOfficialAction === 'Solicitar revisão' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs text-slate-650 leading-relaxed font-semibold">
                     Submeta um pedido de revisão administrativa caso identifique dados incorretos, valores em divergência ou erros fundamentais de processamento de facto.
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Motivo Fundamental</label>
                    <select
                      value={revisionReason}
                      onChange={(e) => setRevisionReason(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs md:text-sm font-bold text-slate-700 focus:outline-none"
                    >
                      <option value="Divergência de Valores">Divergência de Valores / Montantes</option>
                      <option value="Dados de Identificação Incorretos">Dados de Identificação Incorretos</option>
                      <option value="Inconformidade Legal Fundamentada">Inconformidade Legal Fundamentada</option>
                      <option value="Duplicidade de Notificação Tributária">Duplicidade de Notificação Tributária</option>
                      <option value="Outro Motivo Administrativo">Outro Motivo Administrativo</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Exposição dos Factos Fundamentados</label>
                    <textarea
                      value={revisionJustification}
                      onChange={(e) => setRevisionJustification(e.target.value)}
                      placeholder="Descreva minuciosamente a sua reclamação fundamentada..."
                      rows={4}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-3 text-xs md:text-sm font-semibold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Contestação Form */}
              {activeOfficialAction === 'Contestação' && (
                <div className="space-y-4">
                  <div className="bg-red-50/50 border border-red-200 p-4 rounded-2xl text-xs text-red-855 leading-relaxed font-semibold flex gap-2.5 items-start">
                    <AlertTriangle size={18} className="text-red-500 shrink-0" />
                    <span>
                      A interposição de contestação oficial perante atos administrativos suspende os prazos de execução sob as leis de contencioso fiscal em vigor. Os seus dados e termos de fundamentação serão enviados diretamente à Procuradoria Geral.
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Enquadramento Especial Jurídico</label>
                    <select
                      value={contestCategory}
                      onChange={(e) => setContestCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs md:text-sm font-bold text-slate-705 focus:outline-none"
                    >
                      <option value="Atos Administrativos Legais">Atos Administrativos Legais / Desoneração</option>
                      <option value="Sanções e Multas Pecuniárias">Sanções e Multas Pecuniárias / Coimas</option>
                      <option value="Cobrança Fiscal Coativa AGT">Cobrança Fiscal Coativa AGT</option>
                      <option value="Decisões de Titularidade Pública">Decisões de Titularidade Pública / Caducidades</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Substanciação da Defesa</label>
                    <textarea
                      value={contestJustification}
                      onChange={(e) => setContestJustification(e.target.value)}
                      placeholder="Indique as irregularidades ou vícios de forma que anulam o ato administrativo..."
                      rows={4}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-3 text-xs md:text-sm font-semibold focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Anexar documento Form */}
              {activeOfficialAction === 'Anexar documento' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs text-slate-650 leading-relaxed font-semibold">
                    Anexe documentos comprovativos adicionais de sustentação da sua correspondência oficial em formato digital certificado.
                  </div>

                  <div className="border border-slate-200 border-dashed rounded-2xl p-6 bg-slate-50/50 text-center flex flex-col items-center justify-center hover:border-indigo-400 hover:bg-indigo-50/[0.05] transition-all cursor-pointer relative">
                    <input
                      type="file"
                      id="gov-file-uploader-nested"
                      accept=".pdf,.jpeg,.jpg,.png"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAttachedFileName(file.name);
                        }
                      }}
                    />
                    <Paperclip size={22} className="text-slate-400 mb-2 animate-bounce" />
                    <span className="text-[11px] font-black text-slate-700 block uppercase">Selecionar Ficheiro Oficial</span>
                    <span className="text-[10px] text-slate-400 mt-1 block">PDF, JPG ou PNG em custódia até 15MB</span>
                    
                    {attachedFileName && (
                      <div className="mt-4 bg-emerald-50 text-emerald-800 text-xs font-black uppercase inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-100 shadow-3xs">
                        <Check size={12} /> {attachedFileName} (Carregado com Sucesso)
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Agendar atendimento Form */}
              {activeOfficialAction === 'Agendar atendimento' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs text-slate-650 leading-relaxed font-semibold md:col-span-2">
                     Agende uma sessão presencial ou virtual assistida com o técnico representativo designado pelo órgão correspondente.
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Data Escolhida</label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs md:text-sm font-bold text-slate-700 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Modo de Sessão</label>
                    <select
                      value={scheduleMode}
                      onChange={(e) => setScheduleMode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs md:text-sm font-bold text-slate-700"
                    >
                      <option value="Videoconferência">Videoconferência Segura SEPE</option>
                      <option value="Presencial Assistido">Presencial Físico Assistido</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Posto Avançado / Balcão</label>
                    <select
                      value={scheduleLocation}
                      onChange={(e) => setScheduleLocation(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs md:text-sm font-bold text-slate-700"
                    >
                      <option value="Posto Central AGT (Luanda)">Posto Central AGT (Luanda)</option>
                      <option value="Balcão Único do Cidadão - Talatona">Balcão Único do Cidadão - Talatona</option>
                      <option value="Gabinete de Atendimento Provincial de Benguela">Gabinete de Atendimento Provincial de Benguela</option>
                      <option value="Atendimento Digital Exclusivo">Atendimento Virtual Presencial (Câmaras SEPE)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Encaminhar pedido Form */}
              {activeOfficialAction === 'Encaminhar pedido' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl text-xs text-slate-600 leading-relaxed font-semibold">
                    Despache e delegue a responsabilidade de análise desta correspondência oficial para outra entidade ou representante legal.
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Destinação Governamental</label>
                    <select
                      value={forwardTarget}
                      onChange={(e) => setForwardTarget(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs md:text-sm font-bold text-slate-700"
                    >
                      <option value="Ministério das Finanças">Ministério das Finanças (MINFIN)</option>
                      <option value="Procuradoria Geral da República">Procuradoria Geral da República (PGR)</option>
                      <option value="Gabinete do Governador de Luanda">Gabinete do Governador de Luanda</option>
                      <option value="Direção Geral da AGT">Direção Geral de Auditoria AGT</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Despacho de Encaminhamento</label>
                    <textarea
                      value={forwardJustification}
                      onChange={(e) => setForwardJustification(e.target.value)}
                      placeholder="Redija as notas de justificação e responsabilidade..."
                      rows={4}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-3 text-xs md:text-sm font-semibold focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Form buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setActiveOfficialAction(null)}
                  className="flex-1 py-3 bg-slate-100 font-extrabold text-xs text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-200 active:scale-95 transition-all uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSubmittingAction || (activeOfficialAction === 'Responder' && !replyText) || (activeOfficialAction === 'Confirmar leitura' && !confirmReadCheckbox) || (activeOfficialAction === 'Assinar documento' && !signaturePin)}
                  onClick={() => handleOfficialActionSubmit(activeOfficialAction)}
                  className="flex-1 py-3 bg-primary font-black text-xs text-white rounded-xl shadow-lg hover:bg-primary/95 active:scale-95 transition-all text-center flex items-center justify-center gap-2 uppercase disabled:opacity-50 disabled:scale-100"
                >
                  {isSubmittingAction ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      A PROCESSAR...
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      Submeter Trâmite
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ) : successProtocol ? (
            <motion.div
              key="official-action-success"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6 text-left"
            >
              <div className="flex flex-col items-center text-center p-6 bg-emerald-50 border border-emerald-200 rounded-3xl relative overflow-hidden">
                <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-4 shadow-lg shadow-emerald-250 animate-bounce">
                  <Check size={26} strokeWidth={3} />
                </div>
                <h3 className="text-emerald-900 font-black text-sm uppercase tracking-wider leading-none">Trâmite Registado</h3>
                <p className="text-emerald-850 text-[9px] font-black mt-1 uppercase tracking-widest leading-none">Auto-Protocolo Governamental Ativo</p>
                <p className="text-slate-500 text-[10.5px] mt-2 max-w-sm leading-relaxed">
                  A sua ação de <strong>"{successProtocol.actionName}"</strong> foi registada e selada legalmente de forma imutável nos servidores centrais do Estado angolano.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-rose-100">
                  <div>
                    <span className="text-[9.5px] font-black tracking-widest text-slate-450 uppercase font-mono">REGISTO DE PROTOCOLO</span>
                    <div className="text-primary font-black text-sm font-mono tracking-tight mt-0.5">{successProtocol.protocolNumber}</div>
                  </div>
                  <span className="bg-emerald-100 text-emerald-850 text-[8px] font-black px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wider font-mono">
                    VERIFICADO
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-xs font-semibold text-slate-700">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 block uppercase mb-0.5">Ação Efetuada</span>
                    <span className="font-extrabold text-slate-800 uppercase text-[10.5px]">{successProtocol.actionName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 block uppercase mb-0.5">Data Registro Oficial</span>
                    <span className="font-extrabold text-slate-800 font-mono text-[10.5px]">{successProtocol.timestamp}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[10px] font-black text-slate-400 block uppercase mb-0.5">Detalhes da Transação</span>
                    <p className="text-[11px] text-slate-600 font-bold mt-0.5 leading-relaxed bg-white border border-slate-150 p-2.5 rounded-lg font-mono">
                      {successProtocol.details}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[10px] font-black text-slate-400 block uppercase mb-0.5">Assinatura Digital de Validação (Selo)</span>
                    <div className="bg-slate-900 text-slate-300 p-2 rounded-lg font-mono text-[8.5px] break-all border border-slate-850 truncate leading-none mt-0.5 flex items-center gap-1.5">
                      <Fingerprint size={10} className="text-emerald-400 shrink-0" />
                      {successProtocol.digitalSeal}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[10px] font-black text-slate-400 block uppercase mb-0.5">Hash SHA-256 de Autoria</span>
                    <span className="font-mono text-[8.5px] text-slate-500 bg-white/70 p-1 rounded border border-slate-150 block break-all leading-none mt-0.5 truncate select-all">{successProtocol.documentHash}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSuccessProtocol(null)}
                className="w-full py-3.5 bg-primary hover:opacity-90 text-white font-black text-xs uppercase rounded-xl transition-all shadow-lg active:scale-95"
              >
                Concluir e Voltar
              </button>
            </motion.div>
          ) : activeAction ? (
            <motion.div 
              key="action-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 pb-4 border-b border-line">
                <button 
                  onClick={() => setActiveAction(null)}
                  className="flex items-center justify-center w-10 h-10 bg-white border-2 border-[#d1dbe5] rounded-full text-[#384e6e] hover:bg-slate-50 transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95"
                  title="Voltar"
                >
                  <ArrowLeft size={16} className="text-[#384e6e]" />
                </button>
                <div>
                  <h4 className="font-bold text-primary">{activeAction}</h4>
                  <p className="text-sm text-slate-600 uppercase tracking-wider">{selectedMessage.org}</p>
                </div>
              </div>

              {['Ler notificacao', 'Ler boletim', 'Abrir resultado', 'Ler resultado', 'Mais informacoes'].includes(activeAction) ? (
                <div className="space-y-6">
                  <div className="bg-white p-8 md:p-10 rounded-3xl border border-line shadow-sm">
                    <div className="flex items-center gap-3 mb-6 text-[#0c2340]">
                      <FileText size={22} className="text-[#0c2340]" />
                      <span className="font-sans font-extrabold text-[#0c2340] text-base md:text-lg">Conteúdo do Documento</span>
                    </div>
                    {selectedMessage.details?.body && selectedMessage.details.body.trim().length > 0 ? (
                      <div className="space-y-6 text-[#334155] text-sm md:text-[15px] leading-relaxed tracking-wide">
                        {selectedMessage.details.body.split('\n\n').map((paragraph, bgIdx) => {
                          const lines = paragraph.split('\n');
                          return (
                            <p key={bgIdx} className="font-medium text-slate-700">
                              {lines.map((line, lineIdx) => (
                                <React.Fragment key={lineIdx}>
                                  {t(line)}
                                  {lineIdx < lines.length - 1 && <br />}
                                </React.Fragment>
                              ))}
                            </p>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-6 text-slate-700 text-sm md:text-[15px] leading-relaxed tracking-wide font-sans">
                        <p className="font-medium text-slate-700">
                          {t("Exmo(a) Cidadão(ã),")}<br /><br />
                          {selectedMessage.preview || t("Informamos que foi registada uma nova correspondência oficial associada à sua identidade digital no Correio Digital de Angola.")}<br /><br />
                          {t("Para mais informações sobre esta correspondência, por favor contacte a instituição emissora diretamente ou aceda ao balcão de atendimento mais próximo.")}<br /><br />
                          {t("Nota: Este é um documento oficial do Estado angolano. Para qualquer esclarecimento adicional, contacte o número de suporte do Correio Digital de Angola.")}<br /><br />
                          {t("Atenciosamente,")}<br />
                          {t("Secretaria do Correio Digital Angola")}
                        </p>
                      </div>
                    )}

                    {/* Incoming Document Attachments */}
                    {parsedAttachments.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-slate-150 text-left">
                        <h4 className="font-sans font-extrabold text-[#0c2340] text-xs uppercase tracking-widest mb-3.5 flex items-center gap-1.5">
                          <Paperclip size={14} className="text-indigo-600" />
                          {t("Ficheiros / Anexos Oficiais Recebidos")}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {parsedAttachments.map((file, idx) => (
                            <div 
                              key={idx} 
                              className="flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-2xl transition-all group"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                  <FileText size={16} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-800 truncate" title={file.name}>
                                    {file.name}
                                  </p>
                                  <span className="text-[10px] font-mono text-slate-400 font-medium">
                                    {file.size}
                                  </span>
                                </div>
                              </div>
                               <div className="flex items-center gap-1 shrink-0">
                                 <button
                                   type="button"
                                   onClick={() => {
                                     const fileWithContent = {
                                        ...file,
                                        content: file.content || generatePreviewDataUrl(file.name)
                                      };
                                      setPreviewFile(fileWithContent);
                                   }}
                                   className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-xl transition-all border-0 bg-transparent cursor-pointer flex items-center justify-center"
                                   title={t("Visualizar documento")}
                                 >
                                   <Eye size={14} />
                                 </button>
                                 <button
                                   type="button"
                                   onClick={() => {
                                     handleDownloadFile(file.name);
                                   }}
                                   className="p-2 text-slate-400 hover:text-[#0c2340] hover:bg-slate-100 rounded-xl transition-all border-0 bg-transparent cursor-pointer flex items-center justify-center"
                                   title={t("Descarregar ficheiro")}
                                 >
                                   <Download size={14} />
                                 </button>
                               </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 13 MANDATORY DIGITAL PROTOCOL FIELDS */}
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-rose-100">
                      <div>
                        <h4 className="font-black text-[10px] tracking-widest text-slate-400 uppercase font-mono">
                          REGISTRO DE PROTOCOLO GOVERNAMENTAL
                        </h4>
                        <div className="text-primary font-black text-lg font-mono tracking-tight mt-1">
                          {protocol.protocolNumber}
                        </div>
                      </div>
                      <div className="bg-primary/10 border border-primary/20 px-3 py-1 rounded-full text-primary text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                        <Fingerprint size={12} className="animate-pulse" />
                        PROTOCOLO VALIDADE DIGITAL
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-5 gap-x-6 text-left">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">ID Interno</span>
                        <span className="text-xs font-mono font-bold text-slate-700">{protocol.internalId}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Número de Protocolo</span>
                        <span className="text-xs font-mono font-black text-indigo-700">{protocol.protocolNumber}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Instituição Emissora</span>
                        <span className="text-xs font-bold text-slate-800">{protocol.issuerInstitution}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Data Oficial de Emissão</span>
                        <span className="text-xs font-bold text-slate-800">{protocol.officialIssueDate}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Hora Oficial</span>
                        <span className="text-xs font-mono font-bold text-slate-800">{protocol.officialTime}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Responsável Emissor</span>
                        <span className="text-xs font-bold text-slate-800">{protocol.issuerResponsible}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Categoria</span>
                        <span className="text-xs font-bold text-primary">{protocol.category}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Tipo de Documento</span>
                        <span className="text-xs font-bold text-slate-800">{protocol.documentType}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Estado Atual</span>
                        <span className="text-xs font-bold text-slate-800">{protocol.currentState}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Prioridade</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md inline-block ${
                          protocol.priority === 'Alta' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'
                        }`}>{protocol.priority}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Data Limite</span>
                        <span className="text-xs font-bold text-slate-800">{protocol.deadlineDate}</span>
                      </div>
                      {protocol.archiveReference && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Referência de Arquivo</span>
                          <span className="text-xs font-mono font-black text-slate-800">{protocol.archiveReference}</span>
                        </div>
                      )}
                      {protocol.archiveLocation && (
                        <div className="md:col-span-2 lg:col-span-3">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Localização Formal do Arquivo</span>
                          <span className="text-xs font-bold text-slate-800 break-words">{protocol.archiveLocation}</span>
                        </div>
                      )}
                    </div>

                    {/* INFO ADICIONAL DE CONTROLO DE PRAZO & CONSEQUÊNCIA */}
                    <div className="mt-6 p-4 bg-amber-50/50 border border-amber-200/60 rounded-2xl flex flex-col gap-3 text-xs text-slate-700 text-left">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-[10px] uppercase font-black tracking-widest text-slate-650 flex items-center gap-1">
                          <AlertTriangle size={13} className="text-amber-600" /> Prioridade & Prazos Oficiais ({prioConfig.priority})
                        </span>
                        {deadlineSecondsLeft !== null && (
                          <span className="font-mono text-[10px] font-black text-rose-650 animate-pulse bg-white border border-rose-100 px-2 py-0.5 rounded-md shadow-3xs uppercase">
                            {formatDeadlineRemaining(deadlineSecondsLeft)}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 block uppercase">Consequência Administrativa</span>
                          <p className="text-[11px] leading-relaxed font-semibold italic text-slate-650 mt-0.5">"{prioConfig.consequence}"</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 block uppercase">Notificações por Atraso</span>
                          <div className="space-y-0.5 mt-0.5">
                            {prioConfig.escalationLevels.map((lvl, idx) => (
                              <div key={idx} className="text-[10px] font-medium text-slate-600">• {lvl}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SEÇÃO DOCUMENTO VERIFICADO */}
                    <div className="pt-5 border-t border-slate-200 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-200">
                          <ShieldCheck size={18} />
                        </div>
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-[0.05em] text-slate-900 leading-none">Documento Verificado</h4>
                          <p className="text-[10px] text-emerald-800 font-medium mt-0.5">Assinatura Digital Institucional Completa</p>
                        </div>
                        <span className="ml-auto bg-emerald-500 text-white font-mono text-[8px] font-black px-2 py-0.5 rounded uppercase leading-none tracking-wider font-bold">
                          AUTÊNTICO & INTEGRAL
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium bg-emerald-50/40 p-4 border border-emerald-100/80 rounded-2xl">
                        <div>
                          <span className="text-slate-400 text-[9px] font-black uppercase block tracking-wider mb-0.5">Selo Digital Institucional</span>
                          <span className="font-mono text-slate-800 break-all">{protocol.digitalSeal}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[9px] font-black uppercase block tracking-wider mb-0.5">Certificado Digital Emissor</span>
                          <span className="text-slate-850 font-bold">{protocol.institutionalCertificate}</span>
                        </div>
                        <div className="md:col-span-2">
                          <span className="text-slate-400 text-[9px] font-black uppercase block tracking-wider mb-0.5">Hash de Integridade do Documento</span>
                          <span className="font-mono text-[10px] text-slate-700 bg-white/80 p-1.5 border border-emerald-100/50 rounded block break-all">{protocol.documentHash}</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-5 items-center justify-between bg-white p-4 border border-slate-200 rounded-2xl">
                        <div className="flex-1 min-w-0 space-y-1.5 text-left">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Assinatura Criptográfica Emissora</span>
                          <div className="bg-slate-900 text-slate-350 p-2.5 rounded-xl text-[10px] font-mono break-all border border-slate-850 flex items-center gap-2">
                            <Fingerprint size={14} className="text-emerald-400 shrink-0" />
                            <span className="text-slate-400">{protocol.digitalSignature}</span>
                          </div>
                        </div>
                        <div 
                          onClick={triggerVerification}
                          className="flex flex-col items-center shrink-0 border border-slate-200 bg-emerald-50/20 p-2 text-center rounded-xl shadow-sm cursor-pointer hover:bg-emerald-50/50 hover:border-emerald-300 active:scale-95 transition-all group"
                        >
                          <img 
                            src={protocol.qrCodeUrl} 
                            alt="QR Protocolo"
                            className="w-16 h-16 object-contain transition-transform group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                          <span className="text-[7.5px] font-mono text-emerald-700 uppercase mt-1.5 tracking-wider font-black flex items-center gap-1 leading-none">
                            <QrCode size={8} /> VALIDAR QR
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* VIDEOATENDIMENTO OFICIAL COMPLEMENTAR */}
                  <VideoSessionPanel message={selectedMessage} />

                  {/* AUTOMATIC TIMELINE OF CORRESPONDENCE EVENTS */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5 text-left">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-750">
                          <History size={16} />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900 leading-snug">Cronologia & Estado da Correspondência</h4>
                          <p className="text-[10px] text-slate-400 font-bold leading-normal">Linha de vida governamental qualificada pelo protocolo</p>
                        </div>
                      </div>
                      <span className="bg-indigo-55 border border-indigo-110 px-2.5 py-0.5 rounded-full text-indigo-700 font-mono text-[9px] font-black">
                        {(selectedMessage.stateHistory || generateTimelineEvents(selectedMessage, protocol)).length} Estados
                      </span>
                    </div>

                    <div className="pl-1 pt-2 relative">
                      {/* Vertical line connecting all points */}
                      <div className="absolute left-[17px] top-6 bottom-6 w-0.5 border-l-2 border-dashed border-slate-200" />

                      <div className="space-y-6">
                        {(selectedMessage.stateHistory || generateTimelineEvents(selectedMessage, protocol)).map((evt, idx) => {
                          const config = STATE_STYLING[evt.state] || {
                            bg: 'bg-slate-50',
                            text: 'text-slate-800',
                            border: 'border-slate-200',
                            bgDot: 'bg-slate-150',
                            textIcon: 'text-slate-500'
                          };

                          return (
                            <div key={idx} className="relative pl-10 flex flex-col items-start text-left group">
                              {/* Left icon bubble */}
                              <div className={`absolute left-0 top-0 w-8 h-8 rounded-full border-2 border-white ${config.bgDot} flex items-center justify-center ${config.textIcon} shadow-sm z-10 transition-transform duration-300 group-hover:scale-110`}>
                                {renderStateIcon(evt.state, 13)}
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                {/* State chip */}
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border leading-none tracking-tight uppercase ${config.bg} ${config.text} ${config.border}`}>
                                  {evt.state}
                                </span>

                                {/* Timestamp */}
                                <span className="text-[9px] font-mono font-bold text-slate-400">
                                  {evt.date} às {evt.time}
                                </span>
                              </div>

                              {/* Responsible */}
                              <div className="mt-1 flex items-center gap-1.5 text-slate-600">
                                <UserCheck size={11} className="text-slate-450 shrink-0" />
                                <span className="text-[10px] font-bold text-slate-700 leading-none">
                                  {evt.responsible}
                                </span>
                              </div>

                              {/* Description */}
                              <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed max-w-xl">
                                {evt.description}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* COMPLETENESS AUDIT TRAIL LOGS */}
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
                    <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 text-left">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                        <History size={16} className="text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 leading-snug">Registo Geral de Auditoria Governamental</h4>
                        <p className="text-[10px] text-slate-400 font-bold leading-normal">Histórico cronológico detalhado por ações operacionais</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-left bg-white p-4 border border-slate-150 rounded-2xl font-mono text-xs text-slate-700 shadow-sm max-h-48 overflow-y-auto">
                      {(selectedMessage.auditLogs || []).map((log, lIdx) => (
                        <div key={lIdx} className="flex items-start gap-2 py-1 border-b border-dashed border-slate-100 last:border-0 leading-relaxed">
                          <span className="text-emerald-650 font-black">▶</span>
                          <span>{log}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-5 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-4">
                    <ShieldCheck size={24} className="text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-base font-bold text-primary mb-1">Documento Autenticado</p>
                      <p className="text-sm text-primary/70 leading-tight">
                        Este conteúdo foi extraído diretamente da base oficial do Estado Angolano e possui plena validade jurídica como prova digital.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-5 rounded-2xl border border-line">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Info size={20} className="text-primary" />
                      </div>
                      <div className="font-bold text-primary">Processando Solicitação</div>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      A funcionalidade <strong>"{activeAction}"</strong> está a carregar os dados seguros da base governamental. 
                      Este processo garante que toda a informação apresentada é oficial e verificada em tempo real.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    <div className="p-4 border border-line rounded-xl flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-700">Estado do Pedido</div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100">Verificado</span>
                    </div>
                    <div className="p-4 border border-line rounded-xl flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-700">Autenticação Digital</div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">Encriptado</span>
                    </div>
                  </div>
                </div>
              )}

              <button 
                onClick={() => setActiveAction(null)}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                {['Ver detalhes', 'Ler notificacao', 'Ler boletim', 'Abrir resultado', 'Ler resultado', 'Mais informacoes'].includes(activeAction) ? 'Fechar Leitura' : 'OK, Entendi'}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="detail-view"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="pb-4 border-b border-line mb-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm md:text-lg font-bold text-primary uppercase tracking-tight">{selectedMessage.org}</h3>
                  <div className="text-slate-600 text-[10px] md:text-xs font-semibold uppercase tracking-wider mt-0.5">
                    Canal oficial de correspondência verificado
                  </div>
                </div>
                
                {/* Metadados obrigatórios do correio: Data, Hora e Localidade */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-705 bg-white border border-slate-300 rounded-[18px] p-2.5 px-4 shadow-3xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Calendar size={13} className="text-indigo-650 shrink-0" />
                    <div>
                      <span className="text-[8px] font-black text-slate-400 block uppercase tracking-wider font-display leading-none">Data</span>
                      <span className="text-xs font-bold text-slate-800 font-mono mt-0.5 block leading-none">{messageDate}</span>
                    </div>
                  </div>
                  <div className="w-[1px] h-5 bg-slate-200 hidden sm:block" />
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock size={13} className="text-indigo-650 shrink-0" />
                    <div>
                      <span className="text-[8px] font-black text-slate-400 block uppercase tracking-wider font-display leading-none">Hora</span>
                      <span className="text-xs font-bold text-slate-800 font-mono mt-0.5 block leading-none">{messageTime}</span>
                    </div>
                  </div>
                  <div className="w-[1px] h-5 bg-slate-200 hidden sm:block" />
                  <div 
                    onClick={() => {
                      setShowLocationPage(true);
                    }}
                    className="flex items-center gap-2 min-w-0 hover:bg-slate-50 p-1.5 px-2.5 rounded-lg cursor-pointer transition-colors group"
                    title="Clique para ver no mapa"
                  >
                    <MapPin size={13} className="text-indigo-650 shrink-0 group-hover:scale-110 transition-transform" />
                    <div>
                      <span className="text-[8px] font-black text-slate-400 block uppercase tracking-wider font-display leading-none group-hover:text-indigo-600">Localidade</span>
                      <span className="text-xs font-bold text-slate-850 mt-0.5 block md:max-w-md leading-relaxed underline decoration-dotted decoration-indigo-500/40 group-hover:text-indigo-700">{messageLocality}</span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-slate-700 mb-6 leading-relaxed font-medium text-[11px] md:text-base">{t(selectedMessage.preview)}</p>
              
              {selectedMessage.details && (
                <div className="space-y-6">
                  <div className="bg-white rounded-3xl border border-line p-5 md:p-8 shadow-sm flex flex-col lg:flex-row gap-8 items-stretch text-left">
                    {/* Informações do Protocolo (Lado Esquerdo) */}
                    <div className="flex-1 flex flex-col justify-between items-start">
                      <div className="w-full">
                        <div className="flex items-center gap-4 mb-6">
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-lg transition-transform hover:scale-105 ${
                            (selectedMessage.details.state?.toLowerCase().includes('pendente') ?? false) 
                            ? 'bg-orange-500 shadow-orange-100' 
                            : 'bg-green-500 shadow-green-100'
                          }`}>
                            {(selectedMessage.details.state?.toLowerCase().includes('pendente') ?? false) ? (
                              <Clock className="text-white w-7 h-7" />
                            ) : (
                              <Check className="text-white w-7 h-7" strokeWidth={3} />
                            )}
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">{t("Guia de Benefícios")}</h3>
                            <h2 className="text-base md:text-2xl font-extrabold text-primary leading-tight">
                              {t(selectedMessage.details.subject)}
                            </h2>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 w-full">
                          <div className="flex items-center gap-3 text-slate-700">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                              <Fingerprint size={16} className="text-indigo-600" />
                            </div>
                            <div>
                              <small className="text-indigo-600 text-[9px] md:text-xs font-black uppercase tracking-[0.15em] block leading-none mb-1">Nº Protocolo Nacional</small>
                              <div className="text-xs md:text-sm font-mono font-black text-indigo-700 truncate">{protocol.protocolNumber}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-slate-700">
                            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 border border-blue-600">
                              <Calendar size={16} className="text-white" />
                            </div>
                            <div>
                              <small className="text-slate-500 text-[9px] md:text-xs font-black uppercase tracking-[0.15em] block leading-none mb-1">Data de Emissão (Data)</small>
                              <div className="text-xs md:text-sm font-bold text-primary">{messageDate}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-slate-700">
                            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 border border-blue-600">
                              <Clock size={16} className="text-white" />
                            </div>
                            <div>
                              <small className="text-slate-500 text-[9px] md:text-xs font-black uppercase tracking-[0.15em] block leading-none mb-1">Hora de Registo (Hora)</small>
                              <div className="text-xs md:text-sm font-bold text-primary">{messageTime}</div>
                            </div>
                          </div>

                          <div 
                            onClick={() => {
                              setShowLocationPage(true);
                            }}
                            className="flex items-center gap-3 text-slate-700 hover:bg-slate-50/80 p-2 -m-2 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-slate-100 group relative"
                            title="Clique para ver no mapa"
                          >
                            <div className="relative">
                              {/* Glowing pulsate ripple around the marker */}
                              <span className="absolute inset-0 rounded-xl bg-indigo-500/30 animate-ping opacity-75 pointer-events-none" />
                              
                              <div className="w-8 h-8 rounded-xl bg-blue-600 group-hover:bg-blue-700 flex items-center justify-center shrink-0 border border-blue-600 relative z-10 transition-colors">
                                <MapPin size={16} className="text-white" />
                              </div>
                            </div>
                            <div>
                              <small className="text-slate-500 text-[9px] md:text-xs font-black uppercase tracking-[0.15em] block leading-none mb-1 group-hover:text-indigo-600 transition-colors uppercase">{t("Localidade de Tramitação")}</small>
                              <div className="text-xs md:text-sm font-bold text-primary flex items-center gap-1.5 leading-snug">
                                <span className="underline decoration-indigo-500/40 group-hover:decoration-indigo-600">{t(messageLocality)}</span>
                                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md font-mono font-medium opacity-0 group-hover:opacity-100 transition-opacity">VER MAPA</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-slate-700">
                            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 border border-blue-600">
                              <Calendar size={16} className="text-white" />
                            </div>
                            <div>
                              <small className="text-slate-500 text-[9px] md:text-xs font-black uppercase tracking-[0.15em] block leading-none mb-1">{t("Prazo Limite Regulamentar")}</small>
                              <div className="text-xs md:text-sm font-bold text-primary">{t(selectedMessage.details.deadline || '')}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-slate-700">
                            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 border border-blue-600">
                              <Clock size={16} className="text-white" />
                            </div>
                            <div>
                              <small className="text-slate-500 text-[9px] md:text-xs font-black uppercase tracking-[0.15em] block leading-none mb-1">{t("Estado do Documento")}</small>
                              <div className="text-xs md:text-sm font-bold text-orange-700 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                                {t(selectedMessage.details.state || '')}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-slate-700">
                            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 border border-blue-600">
                              <MapPin size={16} className="text-white" />
                            </div>
                            <div>
                              <small className="text-slate-500 text-[9px] md:text-xs font-black uppercase tracking-[0.15em] block leading-none mb-1">{t("Entidade Emissora")}</small>
                              <div className="text-xs md:text-sm font-bold text-primary leading-tight">{t(selectedMessage.org)}</div>
                            </div>
                          </div>

                          {/* Tipo de Correspondência Oficial */}
                          {(() => {
                            const meta = getCategoryMetadata(protocol.category);
                            const style = CATEGORY_STYLING[meta.name] || CATEGORY_STYLING['Ofício'];
                            return (
                              <div className="flex items-start gap-4 text-slate-700 md:col-span-2">
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border bg-blue-600 border-blue-600 text-white">
                                  {renderCategoryIcon(meta.icon, 16)}
                                </div>
                                <div>
                                  <small className="text-slate-505 text-[9px] md:text-xs font-black uppercase tracking-[0.15em] block leading-none mb-1">Tipo de Correspondência</small>
                                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                    <span className={`text-xs md:text-sm font-bold leading-none ${style.text}`}>{meta.name}</span>
                                    <span className="bg-red-50 px-1.5 py-0.5 rounded text-[8px] font-bold text-red-650 tracking-wider font-mono uppercase">Prioridade: {meta.priority}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Botão de Ver detalhes Completos */}
                      <div className="w-full pt-6 border-t border-slate-150 flex justify-start mt-6">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveAction('Ver detalhes');
                            addAuditLogToMessage('Visualizou detalhes completos do documento');
                          }}
                          className="text-xs font-black uppercase tracking-wider text-white bg-blue-950 hover:bg-blue-900 px-5 py-3 rounded-full shadow-md flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-95 font-bold"
                        >
                          <Eye size={13} className="text-white" />
                          Ver detalhes Completos
                        </button>
                      </div>
                    </div>

                    {/* QR Code de Protocolo (Lado Direito) */}
                    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-line/60 lg:w-[280px] shrink-0 self-center lg:self-stretch">
                      <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.2em] mb-4">QR CODE DE PROTOCOLO</div>
                      <div 
                        onClick={triggerVerification}
                        className="p-3 bg-white border border-line/40 rounded-2xl shadow-md group relative overflow-hidden text-center w-full cursor-pointer hover:border-emerald-350 hover:bg-emerald-50/10 transition-all active:scale-95 flex flex-col items-center justify-center"
                      >
                        <motion.img 
                          src={protocol.qrCodeUrl} 
                          alt="QR Code Seguro" 
                          className="w-32 h-32 md:w-36 md:h-36 object-contain transition-transform duration-500 group-hover:scale-105 mx-auto"
                          referrerPolicy="no-referrer"
                        />
                        <div className="text-[9px] font-mono text-indigo-700 font-extrabold uppercase mt-3 tracking-widest break-all">
                          {protocol.protocolNumber}
                        </div>
                        <span className="text-[8px] font-mono text-emerald-700 uppercase mt-2 tracking-wider font-extrabold flex items-center gap-1 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded">
                          <QrCode size={9} /> CLIQUE PARA VALIDAR
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* WATERMARK SECURE OVERLAY */}
        {sensConfig.screenshotProtection && (
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] select-none grid grid-cols-2 sm:grid-cols-3 gap-8 p-4 overflow-hidden z-25" style={{ transform: 'rotate(-12deg) scale(1.15)' }}>
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="font-mono text-[9px] font-black uppercase text-slate-900 whitespace-nowrap text-center tracking-widest leading-none">
                009874562LA041<br/>
                GOV_CORREIO_COPIAPROIBIDA<br/>
                {sensConfig.level} LEVEL
              </div>
            ))}
          </div>
        )}

        {/* SCREENSHOT BLUR Defocus Guard */}
        {!isWindowFocused && sensConfig.screenshotProtection && (
          <div className="absolute inset-0 bg-slate-200/90 backdrop-blur-lg z-40 flex flex-col items-center justify-center p-6 text-center select-none pointer-events-auto transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mb-3 shadow-md">
              <EyeOff size={22} className="text-red-500" />
            </div>
            <h3 className="text-slate-900 font-mono font-black text-sm uppercase tracking-wider">Visualização Suspensa</h3>
            <p className="text-slate-500 text-xs mt-1 max-w-xs leading-relaxed">Proteção ativa contra captura de ecrã para documentos {sensConfig.level}. Volte a focar a janela para continuar.</p>
          </div>
        )}

        {/* EXPIRATION SESSION LOCK OVERLAY */}
        {isSessionExpired && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center select-none pointer-events-auto">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mb-4 animate-bounce">
              <Lock size={32} />
            </div>
            <h3 className="text-white font-mono font-black text-base uppercase tracking-wider">Sessão Documental Expirada</h3>
            <p className="text-slate-400 text-xs max-w-sm mt-2 leading-relaxed">
              Este documento possui sensibilidade <span className="text-red-400 font-extrabold">{sensConfig.level}</span>. Por segurança regulamentar, a sessão ativa fechou após {sensConfig.sessionTimeout}.
            </p>
            
            <button 
              onClick={handleReauthenticate}
              disabled={isReauthenticating}
              className="mt-6 font-mono font-black text-xs uppercase bg-red-600 hover:bg-red-500 text-white rounded-xl py-3 px-6 active:scale-95 transition-all shadow-lg flex items-center gap-2"
            >
              {isReauthenticating ? (
                <>
                  <div className="w-4.5 h-4.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  A REAUTENTICAR COM BI...
                </>
              ) : (
                <>
                  <UserCheck size={14} />
                  REAUTENTICAR COM BI DIGITAL
                </>
              )}
            </button>
          </div>
        )}
      </section>

      {/* MODAL DE VALIDAÇÃO DE QR CODE */}
      <AnimatePresence>
        {showQRValidation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowQRValidation(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white rounded-3xl border border-slate-150 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <QrCode size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xs uppercase tracking-wider">Verificador de Autenticidade</h3>
                    <p className="text-[9px] text-slate-400 font-mono tracking-tight">{protocol.protocolNumber}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowQRValidation(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/25 transition-all text-white/80 text-xs font-bold font-mono"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
                {isValidating ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-emerald-500 animate-spin" />
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm">Consultando Infraestrutura de Chaves Públicas</h4>
                      <p className="text-xs text-slate-400 mt-1 font-medium">Validando carimbo de tempo & certificado da entidade emissora...</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Status badge and description */}
                    <div className="bg-emerald-50 border border-emerald-150 p-4 rounded-2xl flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
                        <Check size={16} strokeWidth={3} />
                      </div>
                      <div>
                        <span className="bg-emerald-600 text-white text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase leading-none inline-block">
                          ASSINATURA CÔNJUGE VALIDADE
                        </span>
                        <h4 className="font-black text-slate-900 text-xs mt-1 leading-snug">Autenticidade e Integridade Confirmadas</h4>
                        <p className="text-[11px] text-slate-600 font-medium leading-relaxed mt-1">
                          Este documento foi assinado digitalmente por um certificado de assinatura qualificada associado ao cargo oficial da República de Angola e não sofreu modificações desde a sua emissão.
                        </p>
                      </div>
                    </div>

                    {/* Verification Details List */}
                    <div className="space-y-3.5 divide-y divide-slate-100">
                      <div className="pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">Emissor Autorizado</span>
                        <span className="text-slate-850 text-xs font-black text-right">
                          {protocol.issuerInstitution}
                        </span>
                      </div>

                      <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">Responsável Técnico</span>
                        <span className="text-slate-700 text-xs font-bold text-right">
                          {protocol.issuerResponsible}
                        </span>
                      </div>

                      <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">Data de Assinatura</span>
                        <span className="text-slate-850 font-mono text-xs font-bold text-right">
                          {protocol.signatureDate}
                        </span>
                      </div>

                      <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">Selo Digital Institucional</span>
                        <span className="text-slate-850 font-mono text-xs font-bold text-right">
                          {protocol.digitalSeal}
                        </span>
                      </div>

                      <div className="pt-3">
                        <span className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider block mb-1">Hash Criptográfico (SHA-256)</span>
                        <span className="text-slate-700 font-mono text-[10px] break-all block leading-relaxed bg-slate-50 p-2 border border-slate-100 rounded-lg">
                          {protocol.documentHash}
                        </span>
                      </div>

                      <div className="pt-3">
                        <span className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider block mb-1">Certificado Qualificado</span>
                        <span className="text-slate-700 font-mono text-[10px] break-all block leading-relaxed bg-slate-50 p-2 border border-slate-100 rounded-lg">
                          {protocol.institutionalCertificate}
                        </span>
                      </div>

                      <div className="pt-3">
                        <span className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider block mb-1.5">Validade Jurídica Regulamentar</span>
                        <p className="text-slate-655 text-[11px] font-medium leading-relaxed bg-indigo-50/40 p-2.5 border border-indigo-100/50 rounded-lg text-left">
                          {protocol.legalValidity}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-slate-50 border-t border-slate-100 p-5 flex justify-end">
                <button
                  onClick={() => setShowQRValidation(false)}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-5 py-2.5 rounded-xl active:scale-95 transition-all shadow-md"
                >
                  Fechar Validação
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setPreviewFile(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white rounded-3xl border border-slate-150 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-[#0c2340] p-5 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <FileText size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xs uppercase tracking-wider">Visualizador de Ficheiro Oficial</h3>
                    <p className="text-[10px] text-slate-300 font-mono tracking-tight">{previewFile.name} ({previewFile.size})</p>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/25 transition-all text-white/80 text-xs font-bold font-mono"
                >
                  ✕
                </button>
              </div>

              {/* Document Container */}
              <div className="p-6 overflow-y-auto flex-1 min-h-0 bg-slate-50/50">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden font-sans text-slate-800">
                  {/* Decorative Watermark */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
                    <div className="text-4xl font-black uppercase tracking-widest rotate-12 text-center">
                      CÓPIA INTEGRAL<br/>CERTIFICADA<br/>GOVERNO DE ANGOLA
                    </div>
                  </div>

                  {/* Top Emblem and Title */}
                  <div className="text-center border-b border-slate-100 pb-5 mb-5">
                    <div className="w-14 h-14 mx-auto mb-2 flex items-center justify-center rounded-full bg-amber-50 border border-amber-200 text-amber-600 shadow-sm font-bold text-sm tracking-widest font-sans">
                      CDA
                    </div>
                    <h4 className="font-extrabold text-[11px] uppercase tracking-widest text-slate-400 font-mono">
                      REPÚBLICA DE ANGOLA
                    </h4>
                    <h3 className="font-black text-[#0c2340] text-sm uppercase mt-0.5">
                      Correio Digital de Angola (CDA)
                    </h3>
                    <div className="inline-block mt-2 px-3 py-1 bg-indigo-50 border border-indigo-150 rounded-full">
                      <span className="text-[9px] font-extrabold tracking-widest text-indigo-700 uppercase">
                        Selo de Autenticidade Ativo
                      </span>
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-150 p-4 rounded-xl text-xs mb-5">
                    <div>
                      <span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-0.5">Instituição Emissora</span>
                      <strong className="text-slate-800">{selectedMessage.org}</strong>
                    </div>
                    <div>
                      <span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-0.5">Protocolo Eletrónico</span>
                      <strong className="text-slate-800 font-mono">{protocol.protocolNumber}</strong>
                    </div>
                    <div>
                      <span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-0.5">Data de Certificação</span>
                      <strong className="text-slate-800 font-mono">{protocol.signatureDate} às {protocol.officialTime || '10:45'}</strong>
                    </div>
                    <div>
                      <span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-0.5">Nome do Ficheiro</span>
                      <strong className="text-slate-800 truncate block">{previewFile.name}</strong>
                    </div>
                  </div>

                  {/* File Body Content Previews */}
                  <div className="space-y-4 pt-1 border-t border-slate-100 min-h-[150px]">
                    <h5 className="font-bold text-xs uppercase text-[#0c2340] tracking-wider mb-2">Conteúdo do Documento</h5>
                    
                    {previewFile.name.toLowerCase().includes('localizacao') || previewFile.name.toLowerCase().includes('mapa') ? (
                      <div className="space-y-4 text-xs text-left">
                        <p className="font-medium text-slate-700">
                          Este ficheiro de imagem contém as coordenadas oficiais e o mapa de localização georreferenciado anexado ao expediente:
                        </p>
                        
                        {/* Interactive Styled Map Component */}
                        <div className="flex flex-col md:flex-row gap-4 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                          {/* Map Visual Sandbox */}
                          <div className="relative w-full md:w-2/3 h-56 bg-slate-900 overflow-hidden flex items-center justify-center select-none shadow-inner">
                            {/* Grid overlay */}
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:16px_16px]" />
                            
                            {/* Simulated Roads/Grid SVGs */}
                            <svg className="absolute inset-0 w-full h-full text-slate-800 opacity-60" xmlns="http://www.w3.org/2000/svg">
                              <line x1="10%" y1="0%" x2="40%" y2="100%" stroke="currentColor" strokeWidth="8" />
                              <line x1="0%" y1="45%" x2="100%" y2="55%" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
                              <line x1="55%" y1="0%" x2="55%" y2="100%" stroke="currentColor" strokeWidth="6" />
                              <line x1="80%" y1="0%" x2="15%" y2="100%" stroke="currentColor" strokeWidth="4" />
                              <line x1="0%" y1="85%" x2="100%" stroke="currentColor" strokeWidth="6" />
                            </svg>
                            
                            {/* Simulated Navigation Route */}
                            <svg className="absolute inset-0 w-full h-full text-indigo-500 opacity-90" xmlns="http://www.w3.org/2000/svg">
                              <path d="M 40,110 L 210,120 L 210,165" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>

                            {/* Green park area */}
                            <div className="absolute top-4 left-4 w-28 h-12 rounded-lg bg-emerald-950/45 border border-emerald-800/30 flex items-center justify-center">
                              <span className="text-[8px] font-black text-emerald-400 tracking-wider uppercase">Parque Camama</span>
                            </div>

                            {/* Nearby Lake/Water area */}
                            <div className="absolute bottom-2 right-4 w-24 h-10 rounded-lg bg-sky-950/40 border border-sky-800/20 flex items-center justify-center">
                              <span className="text-[8px] font-black text-sky-400 tracking-wider uppercase">Lagoa</span>
                            </div>

                            {/* Location Pin of Hospital */}
                            <div className="absolute flex flex-col items-center" style={{ top: '62.5%', left: '42%' }}>
                              {/* Pulsing beacon */}
                              <span className="absolute w-6 h-6 rounded-full bg-red-500/30 animate-ping -mt-1.5" />
                              <MapPin size={22} className="text-red-500 drop-shadow-md animate-bounce fill-red-100" />
                            </div>

                            {/* Stylish Map Pin Label */}
                            <div className="absolute bg-slate-950/95 border border-amber-500/40 px-2.5 py-1.5 rounded-xl shadow-2xl flex flex-col text-left max-w-[170px]" style={{ top: '24%', left: '26%' }}>
                              <span className="text-[7.5px] font-extrabold text-amber-500 uppercase tracking-widest leading-none">Hospital Emissor</span>
                              <span className="text-[9.5px] font-black text-white leading-tight mt-0.5">Hospital Geral Luanda</span>
                              <span className="text-[8px] font-mono text-slate-400 leading-none mt-0.5">8.8383° S | 13.2658° E</span>
                            </div>
                          </div>

                          {/* Map metadata info */}
                          <div className="flex-1 p-4 flex flex-col justify-between">
                            <div>
                              <h4 className="font-extrabold text-xs text-[#0c2340] uppercase tracking-wider mb-2">Instruções de Acesso</h4>
                              <div className="space-y-2 text-slate-600 text-[11px]">
                                <p>📍 <strong>Endereço:</strong> Distrito Urbano da Camama, Benfica, Município de Talatona, Luanda.</p>
                                <p>🚗 <strong>Rotas recomendadas:</strong> Acesso facilitado via Avenida Pedro de Castro Van-Dúnem Loy ou via Expressa Fidel Castro.</p>
                                <p>⏱️ <strong>Tempo estimado:</strong> Cerca de 12 minutos a partir do centro cívico de Talatona.</p>
                              </div>
                            </div>
                            
                            <div className="pt-3 border-t border-slate-150 flex items-center justify-between gap-1 mt-3">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Serviço CDA Maps</span>
                              <button
                                type="button"
                                onClick={() => {
                                  window.open(`https://www.google.com/maps/search/?api=1&query=Hospital+Geral+de+Luanda`, '_blank');
                                }}
                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg font-bold text-[10px] uppercase transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                              >
                                🗺️ Abrir Mapa Externo
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (previewFile.type?.startsWith('image/') || previewFile.name.toLowerCase().endsWith('.png') || previewFile.name.toLowerCase().endsWith('.jpg') || previewFile.name.toLowerCase().endsWith('.jpeg') || previewFile.name.toLowerCase().endsWith('.gif') || previewFile.name.toLowerCase().endsWith('.webp')) ? (
                      <div className="space-y-4 text-xs text-left">
                        {previewFile.content && (previewFile.content.startsWith('http') || previewFile.content.startsWith('data:')) ? (
                          <div className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
                            <img 
                              src={previewFile.content} 
                              alt={previewFile.name} 
                              className="max-h-[50vh] max-w-full object-contain rounded-xl shadow-md border border-slate-100" 
                              referrerPolicy="no-referrer" 
                            />
                            <p className="mt-3 text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
                              Visualização de Anexo Digital Recebido
                            </p>
                          </div>
                        ) : (
                          /* Fallback mock styled tax document for AGT or other institutions if the content is not a real URL */
                          <div className="border border-slate-200 rounded-2xl p-6 bg-white relative overflow-hidden shadow-inner text-left">
                            {/* Decorative Watermark */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none select-none">
                              <div className="text-4xl font-black uppercase tracking-widest rotate-12 text-center">
                                DOCUMENTO OFICIAL AGT
                              </div>
                            </div>
                            
                            {/* Header with AGT Logo styling */}
                            <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-md">
                                  AGT
                                </div>
                                <div>
                                  <h4 className="font-extrabold text-xs text-slate-800 tracking-wide">ADMINISTRAÇÃO GERAL TRIBUTÁRIA</h4>
                                  <p className="text-[9px] text-slate-400 font-mono">REPÚBLICA DE ANGOLA</p>
                                </div>
                              </div>
                              <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[9px] font-black uppercase px-2.5 py-1 rounded-full shrink-0">
                                COMPROVATIVO CERTIFICADO
                              </span>
                            </div>

                            {/* Body details */}
                            <div className="space-y-3.5 text-xs">
                              <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 space-y-2 font-sans">
                                <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-bold">
                                  <span>Tipo de Documento:</span>
                                  <span className="text-slate-800">Recibo Eletrónico de Liquidação Fiscal</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-bold">
                                  <span>Contribuinte (Nome):</span>
                                  <span className="text-slate-800 font-black">Edlasio Galhardo</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-bold">
                                  <span>Identificação (BI):</span>
                                  <span className="text-slate-800 font-mono">009874562LA041</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-bold">
                                  <span>NIF do Emissor:</span>
                                  <span className="text-slate-800 font-mono">5401329188</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-bold">
                                  <span>Código do Ficheiro:</span>
                                  <span className="text-slate-800 font-mono">{previewFile.name}</span>
                                </div>
                              </div>

                              <div className="space-y-2 text-[11px] text-slate-600 leading-relaxed font-sans">
                                <p>A <strong>Administração Geral Tributária (AGT)</strong> certifica para efeitos legais a recepção e processamento com sucesso deste documento digital de arrecadação fiscal, sob responsabilidade do titular portador.</p>
                                <p className="text-[10px] text-slate-400 font-mono italic">Documento integrado no ecossistema digital do Correio Digital de Angola (CDA).</p>
                              </div>

                              {/* Footer with barcode and QR */}
                              <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-4">
                                {/* Simulated barcode */}
                                <div className="flex flex-col gap-1">
                                  <div className="h-7 w-28 bg-[repeating-linear-gradient(90deg,black,black_1px,transparent_1px,transparent_4px,black_4px,black_6px,transparent_6px,transparent_8px)] opacity-80" />
                                  <span className="text-[8px] font-mono text-slate-400">NIF5401329188</span>
                                </div>
                                {/* QR Code placeholder */}
                                <div className="w-10 h-10 border border-slate-200 bg-slate-50 p-1 rounded-lg flex items-center justify-center">
                                  <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black rounded-sm" />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : previewFile.name.toLowerCase().includes('comprovativo') || previewFile.name.toLowerCase().includes('recibo') ? (
                      <div className="space-y-3.5 text-xs text-left">
                        <p className="font-medium text-slate-700">O Governo Digital de Angola certifica, para efeitos legais, que foi efetuada com sucesso a transação eletrónica com os seguintes dados:</p>
                        <div className="bg-slate-50 border border-slate-150 rounded-lg p-3 space-y-2 divide-y divide-slate-150 font-mono text-[11px]">
                          <div className="flex justify-between py-1">
                            <span>ID Transação:</span>
                            <span className="font-bold">TX-{(selectedMessage.id * 1234).toString(16).toUpperCase()}</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span>Estado de Envio:</span>
                            <span className="text-emerald-600 font-bold">SUCESSO (ENTREGUE)</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span>Tipo de Atendimento:</span>
                            <span className="font-bold">Digital Direto Integrado</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span>Assunto de Registro:</span>
                            <span className="font-bold truncate max-w-[250px]">{selectedMessage.details?.subject || selectedMessage.preview}</span>
                          </div>
                        </div>
                      </div>
                    ) : previewFile.name.toLowerCase().includes('referencia') || previewFile.name.toLowerCase().includes('arquivistica') ? (
                      <div className="space-y-3 text-xs text-left">
                        <p className="font-medium">Índice de Acervo e Referenciamento de Arquivo Nacional Eletrónico de Angola:</p>
                        <div className="bg-slate-50 border border-slate-150 rounded-lg p-3 space-y-2 font-mono text-[11px]">
                          <p><strong className="text-indigo-600">Ref. Arquivística:</strong> {protocol.archiveReference || 'CDA-ARQ-' + selectedMessage.id}</p>
                          <p><strong className="text-indigo-600">Custódia:</strong> Arquivo Geral do Ministério Emissor</p>
                          <p><strong className="text-indigo-600">Nível de Classificação:</strong> {selectedMessage.sensitivity || 'Público'}</p>
                          <p><strong className="text-indigo-600">Hash de Validação:</strong> {protocol.documentHash}</p>
                          <p className="text-[10px] text-slate-400 mt-2">Este código de referência arquivística permite a recuperação integral do documento original a qualquer momento no Balcão de Atendimento do CDA.</p>
                        </div>
                      </div>
                    ) : (
                      /* Elegant official letterhead document sheet preview for general PDF/Docs matching the message context */
                      <div className="space-y-4 text-xs text-left">
                        <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50">
                          <div className="border-b border-dashed border-slate-200 pb-3 mb-3 flex justify-between items-start">
                            <div>
                              <h4 className="font-black text-slate-800 text-[11px] uppercase tracking-wide">{selectedMessage.org}</h4>
                              <span className="text-[9px] text-slate-400 block font-mono">{protocol.protocolNumber}</span>
                            </div>
                            <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                              Documento Autenticado
                            </span>
                          </div>

                          <div className="space-y-2 text-slate-700 leading-relaxed text-[11.5px]">
                            <p className="font-bold text-[#0c2340] mb-1">RE: {selectedMessage.details?.subject || selectedMessage.preview}</p>
                            
                            {previewFile.content ? (
                              <div className="space-y-2">
                                {previewFile.type?.startsWith('image/') || previewFile.content.startsWith('data:image/') || (previewFile.content.startsWith('http') && (previewFile.name.toLowerCase().endsWith('.png') || previewFile.name.toLowerCase().endsWith('.jpg') || previewFile.name.toLowerCase().endsWith('.jpeg') || previewFile.name.toLowerCase().endsWith('.gif'))) ? (
                                  <div className="flex justify-center p-2 bg-white rounded-xl border border-slate-200">
                                    <img src={previewFile.content} alt={previewFile.name} className="max-h-80 object-contain rounded-lg shadow-sm" referrerPolicy="no-referrer" />
                                  </div>
                                ) : (
                                  <div className="bg-white border border-slate-200 rounded-xl p-4 font-sans text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto selection:bg-indigo-100 select-text">
                                    {previewFile.content.startsWith('http') ? (
                                      <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
                                        <FileText size={48} className="text-indigo-500 mb-3 animate-pulse" />
                                        <p className="font-bold text-slate-800 text-sm mb-1">{previewFile.name}</p>
                                        <p className="text-xs text-slate-500 mb-4">{previewFile.size} • Ficheiro Digital Guardado</p>
                                        <a 
                                          href={previewFile.content} 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
                                        >
                                          Ver / Descarregar Ficheiro Original
                                        </a>
                                      </div>
                                    ) : (
                                      previewFile.content
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : selectedMessage.preview.toLowerCase().includes('consulta') || selectedMessage.preview.toLowerCase().includes('hospital') ? (
                              <div className="space-y-2">
                                <p>Certificamos que a ficha de agendamento de consulta médica associada ao cidadão foi devidamente atualizada nos servidores de saúde pública.</p>
                                <p className="font-medium text-slate-800">DADOS DO AGENDAMENTO:</p>
                                <ul className="list-disc pl-5 font-mono text-[10.5px] text-slate-600 space-y-1">
                                  <li><strong>Paciente:</strong> Portador do Bilhete de Identidade Associado</li>
                                  <li><strong>Especialidade:</strong> Consulta Geral Resendada</li>
                                  <li><strong>Estado:</strong> REAGENDADA (Próxima Semana)</li>
                                  <li><strong>Justificação:</strong> Reajuste técnico e operacional na escala médica</li>
                                </ul>
                              </div>
                            ) : (
                              <p>Este ficheiro anexo constitui cópia digitalizada e certificada oficial de correspondência enviada pelo emissor administrativo. O seu conteúdo é protegido por lei e destina-se única e exclusivamente ao cidadão portador da chave de autenticação correspondente.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Certificate Seal */}
                  <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                        <Check size={15} strokeWidth={3} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-[#0c2340] uppercase tracking-wide text-[10px] leading-tight">Assinatura Digital Válida</p>
                        <span className="text-[9px] font-mono text-emerald-600 font-bold uppercase tracking-wider block">ICP-Angola Credenciado</span>
                      </div>
                    </div>
                    <div className="text-right font-mono text-[9px] text-slate-400">
                      ID: {protocol.digitalSeal}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 border-t border-slate-150 p-4 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
                <span className="text-[10px] font-mono text-slate-400 text-center sm:text-left">
                  Visualização em canal seguro encriptado TLS 1.3
                </span>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => {
                      handleDownloadFile(previewFile.name);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl active:scale-95 transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                  >
                    <Download size={13} />
                    Descarregar
                  </button>
                  <button
                    onClick={() => setPreviewFile(null)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl active:scale-95 transition-all"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {messageToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMessageToDelete(null)}
              className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[28px] md:rounded-[32px] p-5 sm:p-6 md:p-8 shadow-2xl max-w-md w-full text-center max-h-[92vh] overflow-y-auto"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} className="text-red-600" />
              </div>
              <h3 className="text-xl font-black text-primary mb-3">
                {messageToDelete.isPermanent ? t("Eliminar Permanentemente?") : t("Eliminar Correspondência?")}
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-8">
                {messageToDelete.isPermanent 
                  ? t("Deseja eliminar permanentemente esta correspondência oficial? Ela não será mais visível no seu portal, mas continuará registada no sistema do Estado.")
                  : t("Tem a certeza que deseja eliminar esta correspondência oficial? Ela será movida para as Eliminadas.")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button"
                  onClick={() => setMessageToDelete(null)}
                  className="py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors cursor-pointer border-0 outline-none"
                >
                  {t("Cancelar")}
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    if (onDeleteMessage) {
                      onDeleteMessage(messageToDelete.id);
                      setTab('correspondencias');
                      setSelectedMessage(null);
                    }
                    setMessageToDelete(null);
                  }}
                  className="py-4 bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-colors cursor-pointer border-0 outline-none"
                >
                  {t("Eliminar")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
