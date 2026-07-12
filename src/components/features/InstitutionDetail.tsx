/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Mail, 
  Send, 
  FileText, 
  Clock, 
  Receipt, 
  ShieldCheck, 
  AlertCircle,
  TrendingUp,
  Inbox,
  FileCheck,
  X,
  Download,
  Printer,
  Copy,
  Check,
  QrCode,
  ChevronDown,
  Building
} from 'lucide-react';
import { Message } from '../../types';

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

interface InstitutionDetailProps {
  institutionName: string;
  inbox: Message[];
  sentMessages: Message[];
  docInbox: Message[];
  onBack: () => void;
  onSelectMessage: (msg: Message) => void;
}

const INSTITUTION_FULL_NAMES: Record<string, { full: string; desc: string; category: string }> = {
  SME: { 
    full: "SME - Serviço de Migração e Estrangeiros", 
    desc: "Controle de entrada, permanência, saída e emissão de vistos, passaportes e documentos migratórios.",
    category: "Defesa e Segurança" 
  },
  AGT: { 
    full: "AGT - Administração Geral Tributária", 
    desc: "Gestão de impostos, taxas aduaneiras e controle de conformidade fiscal e aduaneira da República de Angola.",
    category: "Finanças e Fiscalidade" 
  },
  ENDE: { 
    full: "ENDE - Empresa Nacional de Distribuição de Electricidade", 
    desc: "Distribuição, manutenção operacional e comercialização de energia elétrica em todo o território nacional.",
    category: "Infraestruturas e Energia" 
  },
  EPAL: { 
    full: "EPAL - Empresa Pública de Águas de Luanda", 
    desc: "Abastecimento de água potável, tratamento, canalização e saneamento básico na Província de Luanda.",
    category: "Infraestruturas e Recursos Hídricos" 
  },
  Tribunal: { 
    full: "Tribunal de Comarca de Luanda", 
    desc: "Órgão do poder judicial responsável por dirimir conflitos civis, criminais e aplicar as leis no território.",
    category: "Justiça e Direitos Humanos" 
  },
  Hospital: { 
    full: "Hospital Geral de Luanda", 
    desc: "Unidade hospitalar de referência para prestação de cuidados de saúde especializados e atendimento clínico.",
    category: "Saúde e Bem-Estar" 
  },
  Ministerios: { 
    full: "Ministérios Governamentais de Angola", 
    desc: "Canais centrais integrados de governação eletrónica, serviços administrativos e regulação do Estado.",
    category: "Administração Central" 
  },
  "Polícia Nacional": { 
    full: "Polícia Nacional de Angola", 
    desc: "Garantia da ordem pública, segurança dos cidadãos, combate à criminalidade e policiamento comunitário.",
    category: "Defesa e Segurança" 
  },
  Notário: { 
    full: "Cartório Notarial de Títulos de Luanda", 
    desc: "Autenticação legal de documentos, escrituras públicas, certidões e garantia de fé pública jurídica.",
    category: "Justiça e Registos" 
  },
  "Registo Civil": { 
    full: "Conservatória do Registo Civil de Luanda", 
    desc: "Emissão e controlo do estado civil do cidadão, desde registo de nascimento, casamentos a óbitos.",
    category: "Justiça e Registos" 
  },
  "Seguro Social": { 
    full: "INSS - Instituto Nacional de Segurança Social", 
    desc: "Gestão dos regimes de previdência, pensões por invalidez ou velhice e abonos dos trabalhadores.",
    category: "Previdência e Emprego" 
  },
  Administradoras: { 
    full: "Administração Municipal de Luanda", 
    desc: "Serviços comunitários descentralizados, saneamento municipal, licenciamento de obras e alvarás locais.",
    category: "Administração Local" 
  },
  INE: { 
    full: "INE - Instituto Nacional de Estatística", 
    desc: "Produção e difusão de informação estatística oficial e demográfica da República de Angola.",
    category: "Planeamento e Estatística" 
  }
};

const getOrgBadgeStyles = (org: string) => {
  const o = org.toUpperCase();
  if (o.includes('SOC') || o.includes('EMERG')) {
    return 'bg-red-50 text-red-700 border-red-200';
  } else if (o === 'AGT' || o.includes('TRIBUT') || o.includes('FINAN')) {
    return 'bg-amber-50 text-amber-800 border-amber-200';
  } else if (o === 'SME' || o.includes('MIGRA')) {
    return 'bg-blue-50 text-blue-800 border-blue-200';
  } else if (o === 'MINJUS' || o.includes('REGISTO') || o.includes('CIVIL')) {
    return 'bg-teal-50 text-teal-800 border-teal-200';
  } else if (o.includes('TRIBUNAL') || o.includes('JUDIC')) {
    return 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200';
  } else if (o === 'ENDE' || o.includes('ELECTRIC') || o.includes('ENERG')) {
    return 'bg-orange-50 text-orange-850 border-orange-200';
  } else if (o === 'EPAL' || o.includes('AGUA')) {
    return 'bg-sky-50 text-sky-850 border-sky-200';
  }
  return 'bg-slate-50 text-slate-700 border-slate-200';
};

const ANGOLA_MINISTRIES = [
  {
    acronym: "MINDENVPM",
    name: "Ministério da Defesa Nacional, Antigos Combatentes e Veteranos da Pátria",
    desc: "Defesa do espaço terrestre, marítimo e aéreo nacional, salvaguarda da soberania e assistência aos veteranos de pátria.",
    email: "geral@minden.gov.ao",
    phone: "+244 222 334 455"
  },
  {
    acronym: "MININT",
    name: "Ministério do Interior",
    desc: "Garantia da ordem pública, segurança nacional, migração, proteção civil e investigação criminal.",
    email: "contacto@minint.gov.ao",
    phone: "+244 222 445 566"
  },
  {
    acronym: "MIREX",
    name: "Ministério das Relações Exteriores",
    desc: "Formulação, coordenação e execução da política externa de Angola e representação diplomática internacional.",
    email: "mirex@mirex.gov.ao",
    phone: "+244 222 556 677"
  },
  {
    acronym: "MINFIN",
    name: "Ministério das Finanças",
    desc: "Gestão das finanças públicas, orçamento geral do Estado, tesouro nacional e políticas macro-tributárias.",
    email: "gabinete@minfin.gov.ao",
    phone: "+244 222 667 788"
  },
  {
    acronym: "MINPLAN",
    name: "Ministério do Planeamento",
    desc: "Planeamento estratégico de desenvolvimento económico nacional, coordenação de investimentos e censos.",
    email: "geral@minplan.gov.ao",
    phone: "+244 222 778 899"
  },
  {
    acronym: "MAT",
    name: "Ministério da Administração do Território",
    desc: "Administração local do Estado, organização do território, apoio aos municípios e processos eleitorais.",
    email: "apoio@mat.gov.ao",
    phone: "+244 222 889 900"
  },
  {
    acronym: "MINJUSDH",
    name: "Ministério da Justiça e dos Direitos Humanos",
    desc: "Administração da justiça, registos civis e notariais, promoção dos direitos civis e acesso ao direito.",
    email: "contacto@minjusdh.gov.ao",
    phone: "+244 222 990 011"
  },
  {
    acronym: "MAPTSS",
    name: "Ministério da Administração Pública, Trabalho e Segurança Social",
    desc: "Regulação do funcionalismo público, fomento do emprego, segurança social dos trabalhadores e formação profissional.",
    email: "maptss@maptss.gov.ao",
    phone: "+244 222 112 233"
  },
  {
    acronym: "MINAGRIF",
    name: "Ministério da Agricultura e Florestas",
    desc: "Promoção do sector agrícola, sustentabilidade florestal, segurança alimentar e desenvolvimento rural.",
    email: "contacto@minagrif.gov.ao",
    phone: "+244 222 223 344"
  },
  {
    acronym: "MINPESCAS",
    name: "Ministério das Pescas e Recursos Marinhos",
    desc: "Gestão sustentável das pescas, aquicultura, proteção de recursos marinhos e economia azul.",
    email: "pescas@minpescas.gov.ao",
    phone: "+244 222 334 455"
  },
  {
    acronym: "MINDCOM",
    name: "Ministério da Indústria e Comércio",
    desc: "Industrialização nacional, regulação do comércio interno e externo, protecção da concorrência comercial.",
    email: "geral@mindcom.gov.ao",
    phone: "+244 222 445 566"
  },
  {
    acronym: "MIREMPET",
    name: "Ministério dos Recursos Minerais, Petróleo e Gás",
    desc: "Regulação da exploração geológica-mineira, hidrocarbonetos, refinação de petróleo e gás natural.",
    email: "suporte@mirempet.gov.ao",
    phone: "+244 222 556 677"
  },
  {
    acronym: "MINOPUH",
    name: "Ministério das Obras Públicas, Urbanismo e Habitação",
    desc: "Construção de infraestruturas públicas, ordenamento do território, desenvolvimento urbano e habitação social.",
    email: "obras@minopuh.gov.ao",
    phone: "+244 222 667 788"
  },
  {
    acronym: "MINEA",
    name: "Ministério da Energia e Águas",
    desc: "Produção e distribuição de electricidade, saneamento, abastecimento de água e gestão de bacias hídricas.",
    email: "gabinete@minea.gov.ao",
    phone: "+244 222 778 899"
  },
  {
    acronym: "MINTRANS",
    name: "Ministério dos Transportes",
    desc: "Regulação e modernização dos transportes rodoviários, ferroviários, aéreos e portuários de Angola.",
    email: "transportes@mintrans.gov.ao",
    phone: "+244 222 889 900"
  },
  {
    acronym: "MINTTICS",
    name: "Ministério das Telecomunicações, Tecnologias de Informação e Comunicação Social",
    desc: "Inovação tecnológica, infraestruturas de telecomunicações, governação digital e regulação da imprensa.",
    email: "comunicacao@minttics.gov.ao",
    phone: "+244 222 990 011"
  },
  {
    acronym: "MESCTI",
    name: "Ministério do Ensino Superior, Ciência, Tecnologia e Inovação",
    desc: "Supervisão do subsistema de ensino superior, investigação científica, desenvolvimento tecnológico e bolsas.",
    email: "contacto@mescti.gov.ao",
    phone: "+244 222 112 233"
  },
  {
    acronym: "MED",
    name: "Ministério da Educação",
    desc: "Gestão do ensino pré-escolar, primário e secundário, formação de professores e currículo nacional.",
    email: "geral@med.gov.ao",
    phone: "+244 222 223 344"
  },
  {
    acronym: "MINSA",
    name: "Ministério da Saúde",
    desc: "Políticas nacionais de saúde pública, rede hospitalar primária, controlo epidemiológico e medicamentos.",
    email: "gabinete@minsa.gov.ao",
    phone: "+244 222 334 455"
  },
  {
    acronym: "MINAMB",
    name: "Ministério do Ambiente",
    desc: "Conservação da biodiversidade, combate às alterações climáticas, fiscalização e sustentabilidade ambiental.",
    email: "ambiente@minamb.gov.ao",
    phone: "+244 222 445 566"
  },
  {
    acronym: "MINCTUR",
    name: "Ministério da Cultura e Turismo",
    desc: "Salvaguarda do património histórico-cultural, fomento das artes, indústrias criativas e promoção do turismo.",
    email: "cultura@minctur.gov.ao",
    phone: "+244 222 556 677"
  },
  {
    acronym: "MINJUD",
    name: "Ministério da Juventude e Desportos",
    desc: "Políticas de apoio à juventude, associativismo, infraestruturas desportivas e fomento de alta competição.",
    email: "geral@minjud.gov.ao",
    phone: "+244 222 667 788"
  },
  {
    acronym: "MASFAMU",
    name: "Ministério da Acção Social, Família e Promoção da Mulher",
    desc: "Inclusão social, apoio a famílias vulneráveis, igualdade de género e protecção dos direitos da criança.",
    email: "geral@masfamu.gov.ao",
    phone: "+244 222 778 899"
  }
];

export function InstitutionDetail({
  institutionName,
  inbox,
  sentMessages,
  docInbox,
  onBack,
  onSelectMessage
}: InstitutionDetailProps) {
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [previewType, setPreviewType] = useState<'invoice' | 'document' | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [selectedMinistry, setSelectedMinistry] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  React.useEffect(() => {
    setSelectedMinistry(null);
    setIsDropdownOpen(false);
  }, [institutionName]);

  const numericId = previewDoc?.id
    ? (typeof previewDoc.id === 'number'
        ? previewDoc.id
        : parseInt(String(previewDoc.id).replace(/\D/g, ''), 10) || 45)
    : 45;
  const computedHash = `SHA256-AN-${numericId * 17929}-CDG882`;

  const meta = INSTITUTION_FULL_NAMES[institutionName] || {
    full: `${institutionName} - Instituição Oficial`,
    desc: `Serviço integrado no ecossistema Correio Digital para agilizar procedimentos públicos e comunicações oficiais.`,
    category: "Serviço Público"
  };

  // Safe normalize matching key
  const matchesOrg = (orgField: string) => {
    if (!orgField) return false;
    const a = orgField.toLowerCase().trim();
    const b = institutionName.toLowerCase().trim();
    
    // Exact or partial matches
    if (a === b) return true;
    if (a.includes(b) || b.includes(a)) return true;
    
    // Key mappings
    if (b === 'ministerios' && (a.includes('mins') || a.includes('ministerio') || a.includes('ministério'))) return true;
    if (b === 'seguro social' && (a.includes('inss') || a.includes('seguro'))) return true;
    if (b === 'polícia nacional' && (a.includes('pna') || a.includes('policia') || a.includes('polícia'))) return true;
    if (b === 'registo civil' && (a.includes('rciv') || a.includes('registo') || a.includes('civil') || a.includes('id'))) return true;
    
    return false;
  };

  // Filter regular messages (incoming to user / from org)
  const incomingMessages = inbox.filter(m => matchesOrg(m.org));
  
  // Filter sent messages (to org / from user)
  const outgoingMessages = sentMessages.filter(m => matchesOrg(m.org));

  // Load invoices matching this institution from localStorage
  const savedInvoicesRaw = localStorage.getItem('correio_digital_faturas');
  let invoices: any[] = [];
  if (savedInvoicesRaw) {
    try {
      const parsed = JSON.parse(savedInvoicesRaw);
      invoices = parsed.filter((inv: any) => matchesOrg(inv.org));
    } catch (e) {
      invoices = [];
    }
  } else {
    // Basic fallback if first time
    invoices = [];
  }

  // Also read document request records from this institution
  const incomingDocs = docInbox.filter(m => matchesOrg(m.org));

  return (
    <div className="space-y-4">
      {/* Back to Panel Header */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-[20px] p-3 shadow-sm">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-8 h-8 text-slate-800 hover:text-primary hover:bg-slate-50 transition-colors rounded-xl border border-slate-100 shadow-sm cursor-pointer"
          title="Voltar ao Painel"
        >
          <ArrowLeft size={14} />
        </button>
        <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase italic">
          Interconexão Automática
        </span>
      </div>

      {/* Institution Banner block */}
      <section className={`bg-white border border-slate-200 rounded-[24px] md:rounded-[32px] p-6 shadow-sm relative group ${isDropdownOpen ? 'overflow-visible z-20' : 'overflow-hidden'}`}>
        <div className="absolute right-0 top-0 -mr-20 -mt-20 w-80 h-80 bg-primary/2.5 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-1000" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 w-full">
          <div className="space-y-3 max-w-2xl min-w-0 flex-1">
            <div className="flex flex-row items-center justify-between gap-4 w-full">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-blue-900 text-white tracking-wider border border-blue-800 shrink-0">
                <ShieldCheck size={12} className="text-white" />
                {meta.category}
              </span>

              {meta.category === "Administração Central" && (
                <div className="relative inline-block text-left z-30 shrink-0">
                  <div>
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:border-primary/20 transition-all cursor-pointer shadow-xs active:scale-95"
                      id="menu-button"
                      aria-expanded={isDropdownOpen}
                    >
                      <Building size={11} className="text-primary" />
                      <span>{selectedMinistry ? selectedMinistry.acronym : "Ministérios"}</span>
                      <ChevronDown size={11} className={`text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {isDropdownOpen && (
                    <>
                      {/* Overlay */}
                      <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                      
                      <div className="absolute right-0 mt-2 w-72 max-h-72 overflow-y-auto rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/5 focus:outline-none z-50 border border-slate-100 custom-scrollbar">
                        <div className="px-3 py-2 border-b border-slate-100 mb-1.5">
                          <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-400">Ministérios Governamentais de Angola</span>
                        </div>
                        <div className="space-y-0.5">
                          {ANGOLA_MINISTRIES.map((min) => (
                            <button
                              key={min.acronym}
                              onClick={() => {
                                setSelectedMinistry(min);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                                selectedMinistry?.acronym === min.acronym
                                  ? 'bg-blue-50 text-blue-700 font-bold'
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center font-mono text-[7px] font-black uppercase shrink-0 ${
                                selectedMinistry?.acronym === min.acronym
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 text-slate-500'
                              }`}>
                                {min.acronym.slice(0, 3)}
                              </div>
                              <div className="min-w-0">
                                <span className="block font-black text-[8.5px] leading-none truncate">{min.acronym}</span>
                                <span className="block text-[6.5px] text-slate-400 font-bold truncate leading-none mt-1">{min.name}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-tight italic uppercase">
              {selectedMinistry ? selectedMinistry.name : meta.full}
            </h1>
            <p className="text-xs md:text-sm text-slate-600 font-medium leading-relaxed">
              {selectedMinistry ? selectedMinistry.desc : meta.desc}
            </p>

            {selectedMinistry && (
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-150 rounded-lg px-2.5 py-1 text-[10px] font-mono font-bold text-slate-500 shadow-3xs">
                  <Mail size={11} className="text-slate-400" />
                  {selectedMinistry.email}
                </span>
                <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-150 rounded-lg px-2.5 py-1 text-[10px] font-mono font-bold text-slate-500 shadow-3xs">
                  <span className="text-slate-400">📞</span>
                  {selectedMinistry.phone}
                </span>
              </div>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 md:flex gap-4 md:gap-6 shrink-0 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
            <div className="bg-blue-600 border border-blue-500 rounded-2xl p-3 md:px-5 md:py-4 flex flex-col items-center justify-center text-center shadow-sm min-w-[70px] md:min-w-[90px] text-white">
              <Mail className="text-white mb-1" size={16} />
              <div className="text-sm md:text-lg font-black text-white">{incomingMessages.length + outgoingMessages.length}</div>
              <div className="text-[9px] font-black text-white uppercase tracking-wider">Mensagens</div>
            </div>
            <div className="bg-amber-500 border border-amber-400 rounded-2xl p-3 md:px-5 md:py-4 flex flex-col items-center justify-center text-center shadow-sm min-w-[70px] md:min-w-[90px] text-white">
              <Receipt className="text-white mb-1" size={16} />
              <div className="text-sm md:text-lg font-black text-white">
                {invoices.filter(i => i.status === 'Pendente').length}
              </div>
              <div className="text-[9px] font-black text-white uppercase tracking-wider">Facturas</div>
            </div>
            <div className="bg-emerald-600 border border-emerald-500 rounded-2xl p-3 md:px-5 md:py-4 flex flex-col items-center justify-center text-center shadow-sm min-w-[70px] md:min-w-[90px] text-white">
              <FileText className="text-white mb-1" size={16} />
              <div className="text-sm md:text-lg font-black text-white">
                {incomingDocs.length}
              </div>
              <div className="text-[9px] font-black text-white uppercase tracking-wider">Documentos</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Colunas de Correspondência (Fidelidade Visual com a Imagem) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Coluna A: Não Lidas */}
        <section className="bg-white border border-slate-200/80 rounded-[24px] md:rounded-[32px] p-5 md:p-6 shadow-sm flex flex-col min-h-[350px] h-auto pb-6">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <Mail className="text-red-600" size={16} />
              <h3 className="text-slate-900 font-black text-sm italic tracking-tighter uppercase">
                Não Lidas
              </h3>
            </div>
            <span className="text-sm font-black text-red-600">
              {incomingMessages.filter(m => m.unread === 1).length}
            </span>
          </div>

          <div className="space-y-2.5 w-full">
            {incomingMessages.filter(m => m.unread === 1).length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-10 text-slate-400">
                <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-2 shadow-sm">
                  <Inbox size={16} className="text-slate-300" />
                </div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Sem mensagens novas</p>
              </div>
            ) : (
              incomingMessages.filter(m => m.unread === 1).map((msg) => (
                <div
                  key={msg.id}
                  role="button"
                  onClick={() => onSelectMessage(msg)}
                  className="flex justify-between items-center text-xs border border-slate-100 hover:border-red-100 hover:bg-red-50/10 transition-all cursor-pointer px-3.5 py-3 rounded-2xl group/item"
                >
                  <div className="min-w-0 flex-1 truncate mr-3">
                    <span className="font-black text-slate-900">{msg.org}: </span>
                    <span className="text-slate-600 font-medium text-[11px] md:text-xs">
                      {msg.preview}
                    </span>
                  </div>
                  <span className="text-[9px] font-black text-white bg-red-600 px-2.5 py-0.5 rounded-full select-none whitespace-nowrap shadow-sm uppercase">
                    {msg.date}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Coluna B: Lidas */}
        <section className="bg-white border border-slate-200/80 rounded-[24px] md:rounded-[32px] p-5 md:p-6 shadow-sm flex flex-col min-h-[350px] h-auto pb-6">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <Mail className="text-emerald-600" size={16} />
              <h3 className="text-slate-900 font-black text-sm italic tracking-tighter uppercase">
                Lidas
              </h3>
            </div>
            <span className="text-sm font-black text-emerald-600">
              {incomingMessages.filter(m => m.unread !== 1).length}
            </span>
          </div>

          <div className="space-y-2.5 w-full">
            {incomingMessages.filter(m => m.unread !== 1).length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-10 text-slate-400">
                <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-2 shadow-sm">
                  <Inbox size={16} className="text-slate-300" />
                </div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Nenhuma mensagem lida</p>
              </div>
            ) : (
              incomingMessages.filter(m => m.unread !== 1).map((msg) => (
                <div
                  key={msg.id}
                  role="button"
                  onClick={() => onSelectMessage(msg)}
                  className="flex justify-between items-center text-xs border border-slate-100 hover:border-emerald-100 hover:bg-emerald-50/10 transition-all cursor-pointer px-3.5 py-3 rounded-2xl group/item"
                >
                  <div className="min-w-0 flex-1 truncate mr-3">
                    <span className="font-black text-slate-900">{msg.org}: </span>
                    <span className="text-slate-600 font-medium text-[11px] md:text-xs">
                      {msg.preview}
                    </span>
                  </div>
                  <span className="text-[9px] font-black text-white bg-emerald-600 px-2.5 py-0.5 rounded-full select-none whitespace-nowrap shadow-sm uppercase">
                    {msg.date}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Coluna C: Enviadas */}
        <section className="bg-white border border-slate-200/80 rounded-[24px] md:rounded-[32px] p-5 md:p-6 shadow-sm flex flex-col min-h-[350px] h-auto pb-6">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <Send className="text-blue-600" size={16} />
              <h3 className="text-slate-900 font-black text-sm italic tracking-tighter uppercase">
                Enviadas
              </h3>
            </div>
            <span className="text-sm font-black text-blue-600">
              {outgoingMessages.length}
            </span>
          </div>

          <div className="space-y-2.5 w-full">
            {outgoingMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-10 text-slate-400">
                <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-2 shadow-sm">
                  <Inbox size={16} className="text-slate-300" />
                </div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Nenhuma mensagem enviada</p>
              </div>
            ) : (
              outgoingMessages.map((msg) => (
                <div
                  key={msg.id}
                  role="button"
                  onClick={() => onSelectMessage(msg)}
                  className="flex justify-between items-center text-xs border border-slate-100 hover:border-blue-100 hover:bg-blue-50/10 transition-all cursor-pointer px-3.5 py-3 rounded-2xl group/item"
                >
                  <div className="min-w-0 flex-1 truncate mr-3">
                    <span className="font-black text-slate-900">{msg.org}: </span>
                    <span className="text-slate-600 font-medium text-[11px] md:text-xs">
                      {msg.preview}
                    </span>
                  </div>
                  <span className="text-[9px] font-black text-white bg-blue-600 px-2.5 py-0.5 rounded-full select-none whitespace-nowrap shadow-sm uppercase">
                    {msg.date}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Box 2: Facturas, Recibos e Documentos Oficiais */}
      <div className="grid grid-cols-1 gap-4">
        <section className="bg-white border border-slate-200 rounded-[24px] md:rounded-[32px] p-5 md:p-6 shadow-sm flex flex-col min-h-[350px] h-auto pb-6">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
              <h3 className="text-slate-950 font-black text-sm italic tracking-tighter uppercase">
                Facturas, Taxas e Documentos
              </h3>
            </div>
            <span className="text-[9px] font-black text-white bg-emerald-600 border border-emerald-500 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Finanças & Estado
            </span>
          </div>

          <div className="space-y-4 w-full">
            {/* Facturas Section */}
            <div>
              <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-widest px-2.5 mb-2.5 flex items-center gap-1.5">
                <Receipt size={11} />
                Cobranças e Liquidações (Facturas)
              </h4>

              {invoices.length === 0 ? (
                <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-4 text-center text-slate-400 text-xs mb-4">
                  Nenhuma factura ou taxa de pagamento em atraso registada em {institutionName}.
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  {invoices.map((inv) => (
                    <div 
                      key={inv.id}
                      role="button"
                      onClick={() => {
                        setPreviewDoc(inv);
                        setPreviewType('invoice');
                        setDownloadSuccess(false);
                      }}
                      className="border border-slate-200 hover:border-slate-300 hover:bg-slate-50/30 transition-all cursor-pointer rounded-2xl p-3.5 bg-white shadow-xs relative overflow-hidden group/inv"
                    >
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div>
                          <span className="text-[9px] font-black font-mono text-slate-650 bg-slate-100 border border-slate-150 px-1.5 py-0.5 rounded-md">
                            {inv.invoiceNumber}
                          </span>
                          <p className="text-xs font-bold text-slate-800 mt-1.5">
                            {inv.description}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-black block text-slate-900 font-mono">
                            {inv.amount}
                          </span>
                          <span className={`inline-block mt-1 text-[8px] font-black uppercase px-2 py-0.2 rounded-md ${
                            inv.status === 'Pago' 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                              : 'bg-red-50 text-red-600 border border-red-100 animate-pulse'
                          }`}>
                            {inv.status}
                          </span>
                        </div>
                      </div>

                      {/* Payment references */}
                      <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-2 text-[10px] font-medium text-slate-600">
                        <div>
                          <span className="text-slate-400 block text-[8px] uppercase tracking-wider mb-0.5">Entidade</span>
                          <span className="font-mono text-slate-800 font-bold">{inv.entity}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[8px] uppercase tracking-wider mb-0.5">Referência</span>
                          <span className="font-mono text-slate-800 font-bold">{inv.reference}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[8px] uppercase tracking-wider mb-0.5">Vencimento</span>
                          <span className="text-slate-700 font-bold">{inv.deadline}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Official digital documents received */}
            <div>
              <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest px-2.5 mb-2.5 flex items-center gap-1.5">
                <FileCheck size={11} />
                Certidões e Títulos Autorizados
              </h4>

              {incomingDocs.length === 0 ? (
                <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-4 text-center text-slate-400 text-xs">
                  Sem títulos ou certidões oficiais armazenados para {institutionName}.
                </div>
              ) : (
                <div className="space-y-2">
                  {incomingDocs.map((doc) => (
                    <div 
                      key={doc.id}
                      role="button"
                      onClick={() => {
                        setPreviewDoc(doc);
                        setPreviewType('document');
                        setDownloadSuccess(false);
                      }}
                      className="border border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-50/85 transition-all flex items-center justify-between cursor-pointer p-3.5 rounded-2xl"
                    >
                      <div className="min-w-0 flex-1 truncate mr-2">
                        <span className="text-[9px] font-black uppercase text-emerald-600 block mb-0.5">TÍTULO OFICIAL DISPONÍVEL</span>
                        <span className="text-xs font-bold text-slate-800 block truncate">
                          {doc.preview}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-white bg-emerald-600 border border-emerald-500 rounded-lg px-2 py-0.5 shadow-sm">
                        {doc.date}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* EXIBIÇÃO DE DOCUMENTO OFICIAL / FACTURA EM POPUP */}
      {previewDoc && (
        <div className="fixed inset-0 bg-[#020817]/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-[28px] max-w-2xl w-full border border-slate-200 shadow-2xl flex flex-col overflow-hidden max-h-[95vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 shrink-0">
              {previewType === 'invoice' ? (
                <div>
                  <h4 className="text-base md:text-lg font-black text-slate-900 leading-none">
                    Doc {previewDoc.org || "BAI"}
                  </h4>
                  <p className="text-[10px] md:text-xs text-slate-500 font-extrabold mt-1 uppercase tracking-wider">
                    Modelo de extração original
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-slate-100 md:p-2.5 text-slate-800 border border-slate-200/60 block shrink-0">
                    <FileText size={20} className="text-slate-700" />
                  </span>
                  <div>
                    <h4 className="text-base md:text-lg font-black text-slate-900 uppercase tracking-tight leading-none">
                      {institutionName} • Correio Digital de Angola
                    </h4>
                    <p className="text-[10px] text-slate-400 font-extrabold tracking-widest uppercase mt-1">
                      Serviço oficial de chancelaria eletrónica
                    </p>
                  </div>
                </div>
              )}
              <button
                onClick={() => {
                  setPreviewDoc(null);
                  setPreviewType(null);
                  setDownloadSuccess(false);
                }}
                className="w-8 h-8 rounded-full border border-slate-100 hover:border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-center text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Content Viewport */}
            <div className="flex-1 p-6 md:p-8 bg-white overflow-y-auto space-y-4 custom-scrollbar">
              {downloadSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 font-bold flex items-center gap-2 animate-bounce">
                  <span className="w-5 h-5 bg-emerald-500 text-white flex items-center justify-center rounded-full text-[10px]">✓</span>
                  O Ficheiro original {previewType === 'invoice' ? 'GUIA_PAGAMENTO' : 'CERTIDÃO_DIGITAL'}.pdf foi simulado e baixado no seu dispositivo com sucesso!
                </div>
              )}

              {previewType === 'invoice' ? (
                /* Invoice detail - BAIdirecto Authentic Layout */
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 md:p-10 space-y-6 relative overflow-hidden font-sans w-full max-w-xl mx-auto">
                  
                  {/* Logo BAIdirecto */}
                  <div className="flex justify-end items-center mb-4">
                    <div className="flex items-center gap-1.5 select-none">
                      <div className="w-7 h-7 bg-[#004B8F] rounded-md flex items-center justify-center shrink-0">
                        <span className="text-white text-[13px] font-black italic">B</span>
                      </div>
                      <span className="text-[#004B8F] font-black tracking-tighter text-lg italic leading-none">BAI</span>
                      <span className="text-slate-600 font-light text-lg tracking-tight leading-none">directo</span>
                    </div>
                  </div>

                  <p className="text-center text-slate-800 text-[11px] md:text-xs font-semibold leading-normal pb-3 select-none border-b border-slate-105 pb-4">
                    A operação que efectuou foi registada com sucesso através do serviço <span className="font-extrabold text-[#004B8F]">BAIdirecto</span>.
                  </p>

                  {/* Dados do Ordenante */}
                  <div className="space-y-2.5 text-left pt-2">
                    <h4 className="text-[10px] md:text-[11px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-1 select-none">
                      Dados do Ordenante
                    </h4>
                    
                    <div className="space-y-1.5">
                      <div className="flex items-start text-[11px] md:text-xs py-0.5">
                        <div className="w-[140px] text-right font-black text-slate-400 pr-5 uppercase tracking-tight select-none">Nome</div>
                        <div className="flex-1 text-left font-black text-slate-900 uppercase">EDLASIO GALHARDO</div>
                      </div>
                      <div className="flex items-start text-[11px] md:text-xs py-0.5">
                        <div className="w-[140px] text-right font-black text-slate-400 pr-5 uppercase tracking-tight select-none">Conta</div>
                        <div className="flex-1 text-left font-black text-slate-900">050779044 10 001</div>
                      </div>
                      <div className="flex items-start text-[11px] md:text-xs py-0.5">
                        <div className="w-[140px] text-right font-black text-slate-400 pr-5 uppercase tracking-tight select-none">IBAN</div>
                        <div className="flex-1 text-left font-black text-slate-900 font-mono">AO06 00400005077904410130</div>
                      </div>
                    </div>
                  </div>

                  {/* Dados do Pagamento */}
                  <div className="space-y-2.5 text-left pt-2 border-t border-slate-100 pt-4">
                    <h4 className="text-[10px] md:text-[11px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-1 select-none">
                      Dados do Pagamento
                    </h4>
                    
                    <div className="space-y-1.5">
                      <div className="flex items-start text-[11px] md:text-xs py-0.5">
                        <div className="w-[140px] text-right font-black text-slate-400 pr-5 uppercase tracking-tight select-none">Número de Operação</div>
                        <div className="flex-1 text-left font-black text-slate-900 font-mono">
                          {352841000 + Number(previewDoc.reference || 496)}
                        </div>
                      </div>
                      <div className="flex items-start text-[11px] md:text-xs py-0.5">
                        <div className="w-[140px] text-right font-black text-slate-400 pr-5 uppercase tracking-tight select-none">Entidade</div>
                        <div className="flex-1 text-left font-black text-slate-900 font-mono">{previewDoc.entity || "00223"}</div>
                      </div>
                      <div className="flex items-start text-[11px] md:text-xs py-0.5">
                        <div className="w-[140px] text-right font-black text-slate-400 pr-5 uppercase tracking-tight select-none">Tipo de Pagamento</div>
                        <div className="flex-1 text-left font-black text-slate-900 uppercase">{previewDoc.org || "ENDE"}</div>
                      </div>
                      <div className="flex items-start text-[11px] md:text-xs py-0.5">
                        <div className="w-[140px] text-right font-black text-slate-400 pr-5 uppercase tracking-tight select-none">Produto</div>
                        <div className="flex-1 text-left font-black text-slate-900 uppercase">
                          {previewDoc.org === 'ENDE' ? 'PRÉ-PAGO LUANDA' : (previewDoc.org === 'EPAL' ? 'CONSUMO DOMÉSTICO' : 'TAXA RECURSOS')}
                        </div>
                      </div>
                      <div className="flex items-start text-[11px] md:text-xs py-0.5">
                        <div className="w-[140px] text-right font-black text-slate-400 pr-5 uppercase tracking-tight select-none">Serviço</div>
                        <div className="flex-1 text-left font-black text-slate-900">N/A</div>
                      </div>
                      <div className="flex items-start text-[11px] md:text-xs py-0.5">
                        <div className="w-[140px] text-right font-black text-slate-400 pr-5 uppercase tracking-tight select-none">Montante</div>
                        <div className="flex-1 text-left font-black text-slate-900 font-mono text-[#00A859]">
                          {String(previewDoc.amount || "5.000 Kz").replace("Kz", "").trim() + ",00 AKZ"}
                        </div>
                      </div>
                      <div className="flex items-start text-[11px] md:text-xs py-0.5">
                        <div className="w-[140px] text-right font-black text-slate-400 pr-5 uppercase tracking-tight select-none">Referência</div>
                        <div className="flex-1 text-left font-black text-slate-900 font-mono">{previewDoc.reference || "14012150299"}</div>
                      </div>
                      <div className="flex items-start text-[11px] md:text-xs py-0.5">
                        <div className="w-[140px] text-right font-black text-slate-400 pr-5 uppercase tracking-tight select-none">Data do Pagamento</div>
                        <div className="flex-1 text-left font-black text-slate-900">
                          {previewDoc.date === 'Ontem' ? '04/06/2026 18:55:53' : (previewDoc.date === 'Esta Semana' ? '02/06/2026 11:24:10' : `${previewDoc.date} 15:43:12`)}
                        </div>
                      </div>
                      <div className="flex items-start text-[11px] md:text-xs py-0.5">
                        <div className="w-[140px] text-right font-black text-slate-400 pr-5 uppercase tracking-tight select-none">Estado</div>
                        <div className="flex-1 text-left font-black text-emerald-600 uppercase">Sucesso</div>
                      </div>
                      <div className="flex items-start text-[11px] md:text-xs py-0.5">
                        <div className="w-[140px] text-right font-black text-slate-400 pr-5 uppercase tracking-tight select-none">Canal</div>
                        <div className="flex-1 text-left font-black text-slate-900">Internet Banking</div>
                      </div>
                    </div>
                  </div>

                  {/* Dado do Recibo */}
                  <div className="space-y-2.5 text-left pt-2 border-t border-slate-100 pt-4 font-sans">
                    <h4 className="text-[10px] md:text-[11px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-1 select-none">
                      Dado do Recibo
                    </h4>
                    
                    <div className="space-y-1.5">
                      <div className="flex items-start text-[11px] md:text-xs py-0.5">
                        <div className="w-[140px] text-right font-black text-slate-400 pr-5 uppercase tracking-tight select-none">REF:</div>
                        <div className="flex-1 text-left font-bold text-slate-650 truncate font-mono select-all">
                          {(previewDoc.reference || "352841496") + "024d"}
                        </div>
                      </div>
                      <div className="flex items-start text-[11px] md:text-xs py-0.5">
                        <div className="w-[140px] text-right font-black text-slate-400 pr-5 uppercase tracking-tight select-none">Produto</div>
                        <div className="flex-1 text-left font-black text-slate-900 uppercase">
                          {previewDoc.org === 'ENDE' ? 'PRÉ-PAGO LUANDA' : (previewDoc.org === 'EPAL' ? 'CONSUMO DOMÉSTICO' : 'TAXA RECURSOS')}
                        </div>
                      </div>
                      <div className="flex items-start text-[11px] md:text-xs py-0.5">
                        <div className="w-[140px] text-right font-black text-slate-400 pr-5 uppercase tracking-tight select-none">Referência</div>
                        <div className="flex-1 text-left font-black text-slate-900 font-mono">{previewDoc.reference || "14012150299"}</div>
                      </div>
                      <div className="flex items-start text-[11px] md:text-xs py-0.5">
                        <div className="w-[140px] text-right font-black text-slate-400 pr-5 uppercase tracking-tight select-none">Garantia</div>
                        <div className="flex-1 text-left font-black text-slate-900 uppercase">{previewDoc.org || "ENDE"}</div>
                      </div>
                      <div className="flex items-start text-[9px] md:text-[10px] mt-2 pt-2 border-t border-slate-100 italic select-none">
                        <div className="w-[140px] text-right font-black text-slate-400 pr-5 uppercase">Rede</div>
                        <div className="flex-1 text-left font-black text-slate-500">EMIS - Empresa Interbancária de Serviços</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Formal Document body from message */
                <div className="bg-white rounded-2xl border-2 border-slate-350 shadow-lg p-6 md:p-8 space-y-6 relative overflow-hidden font-sans">
                  {/* Guilloché pattern simulated border or header */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-yellow-400 to-red-600" />
                  
                  {/* Republic Seal */}
                  <div className="text-center space-y-1.5 pt-2">
                    <div className="w-12 h-12 bg-amber-50/80 border border-amber-300 rounded-full mx-auto flex items-center justify-center text-amber-700 shadow-sm">
                      <ShieldCheck size={28} />
                    </div>
                    <h2 className="text-xs font-black tracking-widest text-slate-933 uppercase leading-none">República de Angola</h2>
                    <p className="text-[9px] font-bold tracking-wider text-slate-500 uppercase leading-none">Governo de Angola • Chapa Digital Unificada</p>
                    <p className="text-[8px] font-black text-blue-600 font-mono tracking-widest uppercase mt-0.5">INTERCONEXÃO AUTENTICADA</p>
                  </div>

                  <div className="border-t border-b border-dashed border-slate-200 py-3 grid grid-cols-2 gap-4 text-[11px] text-slate-600">
                    <div>
                      <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block">Emissor</span>
                      <span className="font-bold text-slate-800">{meta.full}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block">Destinatário Assinado</span>
                      <span className="font-bold text-slate-800">Cidadão Correio Digital</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block">Certificado Autenticado</span>
                        <span className="text-[9px] font-mono font-bold text-slate-500">{previewDoc.date}</span>
                      </div>
                      
                      <p className="text-[11.5px] text-slate-800 font-medium leading-relaxed text-justify">
                        Certifica-se e faz-se público para todos os devidos efeitos, que se encontra devidamente autenticado e inserido com validação permanente sob a responsabilidade exclusiva do <strong className="text-slate-900">{institutionName}</strong> o seguinte registo em repositório nacional:
                      </p>
                      
                      <p className="text-[12px] text-slate-900 font-black bg-white p-3 border border-slate-200 rounded-lg shadow-xs text-center leading-normal">
                        "{previewDoc.preview}"
                      </p>

                      <p className="text-[10.5px] text-slate-500 leading-relaxed italic text-justify pt-1">
                        Esta certidão oficial está digitalmente gerada e homologada pelo Decreto-Lei de Governação Electrónica da República de Angola, possuindo plena fé pública jurídica nacional e internacional.
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 bg-emerald-50/50 border border-emerald-100 rounded-xl p-3">
                      <span className="text-emerald-600 shrink-0 font-bold">✓</span>
                      <p className="text-[10px] text-emerald-800 font-semibold leading-normal">
                        Selo Digital Activo • Isento de qualquer autenticação física complementar ou taxas administrativas cartoriais.
                      </p>
                    </div>
                  </div>

                  {/* Footer seal with stamp */}
                  <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-slate-500">
                    <div className="space-y-0.5">
                      <span className="uppercase text-[8px] font-black tracking-widest text-slate-400 block">Assinatura Certificada</span>
                      <span className="font-mono font-bold select-all text-slate-800">HASH: {computedHash}</span>
                    </div>

                    {/* Stamp */}
                    <div className="border-2 border-dashed border-blue-500/80 rounded-full px-4 py-1 text-center shrink-0 -rotate-3 bg-blue-50/5 pointer-events-none">
                      <span className="text-[8px] font-black text-blue-600 uppercase tracking-wider block">CORREIO DIGITAL UNIFICADO</span>
                      <span className="text-[7px] font-black text-blue-500 tracking-widest uppercase block">GOVERNO DE ANGOLA</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="px-8 py-5 bg-white flex items-center justify-between shrink-0">
              <button
                onClick={() => {
                  safeCopyToClipboard(computedHash);
                  setCopiedKey(true);
                  setTimeout(() => setCopiedKey(false), 2000);
                }}
                className="flex items-center gap-2 px-4 py-2 text-xs font-black text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                {copiedKey ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                {copiedKey ? 'Chave Copiada!' : 'Copiar Hash'}
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setDownloadSuccess(true);
                    setTimeout(() => setDownloadSuccess(false), 4500);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-black text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <Download size={14} />
                  Baixar JPG/PDF
                </button>
                <button
                  onClick={() => {
                    setPreviewDoc(null);
                    setPreviewType(null);
                    setDownloadSuccess(false);
                  }}
                  className="px-6 py-2.5 bg-[#00A859] hover:bg-[#00924e] text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer border-0 outline-none"
                >
                  Fechar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
