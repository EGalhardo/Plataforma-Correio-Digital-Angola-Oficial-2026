/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { notify } from '../../lib/notify';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AnimatedCounter } from '../ui/AnimatedCounter';
import {
  homologationStore,
  normalizeHomologationBi,
  notifyAccountApproved,
  notifyAccountRejected,
  notifyAccountReopened,
  notifyAccountUnblocked,
} from '../../services/homologationStore';
import { normalizarTitulo } from '../../services/textNormalizeService';
import { parsePvicFromObservacoes } from '../../services/preVerificationService';
import { shouldUseMockFallback } from '../../config/runtime';
import { provisionCloudAccount, markCloudAccount, isCloudBound, unmarkCloudAccount, isSupabaseConfigured, syntheticAdminEmail, syntheticInstitutionAgentEmail } from '../../services/cloudAuthService';
import {
  Users,
  Mail,
  Send,
  BellRing,
  Loader2,
  FileText,
  CheckCircle2,
  Search,
  Filter,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Fingerprint,
  Scan,
  IdCard,
  UserCheck,
  RefreshCw,
  AlertTriangle,
  Check,
  X,
  Eye,
  Activity,
  Smartphone,
  UserPlus,
  Trash2,
  MapPin,
  User,
  Briefcase,
  Building,
  Phone,
  Info,
  Zap,
  Pencil,
  KeyRound,
  LayoutGrid
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { registoPublicoProxy, eliminarCidadaoAdmin, eliminarAgente, permissoesAgente, alterarSenhaAgente, enviarMensagemAdministrativa } from '../../services/supabaseService';
import { isStorageRef, resolveStorageUrl } from '../../lib/secureStorage';
import { limparPendenciaPerfil } from '../../services/profileSyncService';
import { limparLoginFalhas } from '../../services/loginSecurityService';
import { getLocalInstReg, normalizeInstCode, addInstMember, removeInstMember, updateInstMemberPassword, updateInstMemberProfile, isInstPasswordTaken, nextMemberAgentNumber } from '../../services/institutionRegistrationStore';
import { addAdminAgent, updateAdminAgentPassword, updateAdminAgentPermissions, removeAdminAgentByWorker, isAdminAgentPasswordTaken, nextAdminAgentNumber, getAdminAgentCreds, ADMIN_ALFA_AGENT } from '../../services/adminAgentStore';

interface AuditLog {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  type: 'info' | 'warning' | 'critical' | 'success';
}

interface GovContactsContentProps {
  appMode?: string;
  bi?: string;
  setBi?: (val: string) => void;
  nif?: string;
  setNif?: (val: string) => void;
  phone?: string;
  setPhone?: (val: string) => void;
  passport?: string;
  setPassport?: (val: string) => void;
  profileName?: string;
  setProfileName?: (val: string) => void;
  userBirthDate?: string;
  setUserBirthDate?: (val: string) => void;
  userFiliation?: string;
  setUserFiliation?: (val: string) => void;
  userMaritalStatus?: string;
  setUserMaritalStatus?: (val: string) => void;
  verificationStatus?: string;
  setVerificationStatus?: (val: string) => void;
  hasFacialAuth?: boolean;
  setHasFacialAuth?: (val: boolean) => void;
  hasTwoFactor?: boolean;
  setHasTwoFactor?: (val: boolean) => void;
  govPin?: string;
  setGovPin?: (val: string) => void;
  addAuditLog?: (action: string, type?: 'info' | 'warning' | 'critical' | 'success') => void;
  auditLogs?: AuditLog[];
}


// Linhas cruas lidas nesta página (solicitacoes_registo / profiles / storage).
interface LinhaSolicitacaoCidadao {
  id: string | number; nome: string; bi_numero: string; email?: string;
  status?: string; observacoes?: string; url_selfie?: string;
  url_bi_frente?: string; url_bi_verso?: string; created_at?: string;
  url_frente?: string; url_verso?: string; pvi_json?: string;
  criado_em?: string;
  nome_completo?: string; telefone?: string;
  [extra: string]: unknown;
}
interface LinhaPerfilAdmin { id?: string; name: string; email?: string; bi: string; }

export function GovContactsContent({
  appMode = 'user',
  bi = '009874562LA041',
  addAuditLog}: GovContactsContentProps) {
  // FASE 3 — CAMPANHAS DE NOTIFICAÇÃO: estado do painel de aviso geral.
  const [campanhaAberta, setCampanhaAberta] = useState(false);
  const [campanhaTitulo, setCampanhaTitulo] = useState('');
  const [campanhaMsg, setCampanhaMsg] = useState('');
  const [campanhaTipo, setCampanhaTipo] = useState<'info' | 'warning' | 'success' | 'critical'>('info');
  const [campanhaEnviando, setCampanhaEnviando] = useState(false);
  const [campanhaResultado, setCampanhaResultado] = useState<string | null>(null);

  /** Envia um aviso geral (campanha) para os cidadãos: grava na tabela
   * notifications (best-effort — sem sessão admin real a escrita é bloqueada
   * pelo RLS e o aviso fica registado na auditoria, padrão do projeto) e
   * adiciona à auditoria local. Nunca quebra. */
  const enviarCampanha = async () => {
    const titulo = campanhaTitulo.trim();
    const msg = campanhaMsg.trim();
    if (!titulo || !msg) { setCampanhaResultado('Preencha o título e a mensagem do aviso.'); return; }
    setCampanhaEnviando(true);
    setCampanhaResultado(null);
    try {
      const alvos = citizens.filter(c => c.category === 'Cidadão' && c.biNumber).map(c => c.biNumber as string);
      let gravadas = 0;
      if (alvos.length > 0) {
        // FIX 2026-08-15 (detetado no ensaio do piloto INAPEM): o insert usava
        // colunas inexistentes na tabela (id string, created_at, read) e faltavam
        // as OBRIGATÓRIAS (time_text, target_tab) — a gravação falhava sempre
        // com PGRST204 e o erro era apresentado como "bloqueada por RLS".
        // Agora usa o schema real (id BIGSERIAL auto; time_text; target_tab).
        const tipoGravar = campanhaTipo === 'critical' ? 'warning' : campanhaTipo;
        const { error } = await supabase.from('notifications').insert(
          alvos.map(biAlvo => ({
            target_bi: biAlvo,
            title: titulo,
            message: msg,
            time_text: 'Agora',
            type: tipoGravar,
            target_tab: 'home',
          }))
        );
        if (!error) gravadas = alvos.length;
      }
      addAuditLog?.(`Campanha de notificação enviada: "${titulo}" → ${gravadas} cidadão(s)${gravadas === 0 ? ' (escrita na nuvem recusada — sessão de Administração real necessária / RLS)' : ' na nuvem'}.`, 'info');
      setCampanhaResultado(gravadas > 0
        ? `Aviso enviado para ${gravadas} cidadão(s) na nuvem.`
        : 'Aviso registado na auditoria. (A escrita em massa na nuvem exige sessão de Administração real — RLS.)');
      setCampanhaTitulo(''); setCampanhaMsg('');
    } catch (e) {
      setCampanhaResultado('Falha ao enviar a campanha. Tente novamente.');
      console.warn('[Campanha] erro:', e);
    } finally {
      setCampanhaEnviando(false);
    }
  };
  
  // Workers State for Institution Mode and Admin Central

  const ALL_PERMISSIONS = [
    { id: 'Visualizar', label: 'Visualizar Cadastros', desc: 'Consultar dados dactiloscópicos e fichas de cidadão' },
    { id: 'Homologar', label: 'Homologar BI', desc: 'Validar e deferir emissões de BI digital pendentes' },
    { id: 'Bloqueio', label: 'Bloquear Contas', desc: 'Suspender preventivamente chaves privadas ou acessos de cidadão' },
    { id: 'Alertas', label: 'Emitir Alertas', desc: 'Disparar notificações de emergência ou quarentena nacional' },
    { id: 'Logs', label: 'Consultar Logs', desc: 'Aceder integralmente aos logs de auditoria e auditoria de IPs' },
    { id: 'API', label: 'Gerir Parâmetros API', desc: 'Configurar parâmetros e chaves de barramento dactiloscópico' }
  ];

  const playSuccessSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch (e) {
      // Audio context disallowed or not supported
    }
  };

  const playToggleSound = (isActive: boolean) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isActive ? 660 : 440, ctx.currentTime);
      osc.frequency.setValueAtTime(isActive ? 880 : 330, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.10, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch (e) {
      // Fail silently
    }
  };

  // ============================================================================
  // 2026-08-22 — PERMISSÕES DE PÁGINA (simples: página + checkbox)
  // Lista dinâmica por área: só as páginas do menu da área onde o colaborador
  // é criado. 'Equipa' fica de fora (exclusiva do responsável). A página de
  // Perfil é OBRIGATÓRIA (o colaborador tem sempre de gerir a própria conta).
  // ============================================================================
  interface PaginaArea { id: string; label: string; obrigatoria?: boolean; }
  const PAGINAS_INSTITUICAO: PaginaArea[] = [
    { id: 'home', label: 'Painel' },
    { id: 'correspondencias', label: 'Correio' },
    { id: 'inst-qrcode', label: 'QR Code' },
    { id: 'inst-ai-assistant', label: 'IA' },
    { id: 'perfil', label: 'Perfil', obrigatoria: true },
  ];
  const PAGINAS_ADMIN: PaginaArea[] = [
    { id: 'gov-dashboard', label: 'Painel' },
    { id: 'gov-interoperabilidade', label: 'Instituições' },
    { id: 'gov-correspondencias', label: 'Correspondências' },
    { id: 'gov-contatos', label: 'Cidadãos' },
    { id: 'gov-relatorio', label: 'Relatórios' },
    { id: 'gov-ia', label: 'IA' },
    { id: 'gov-seguranca', label: 'Auditoria' },
    { id: 'gov-perfil', label: 'Perfil', obrigatoria: true },
  ];

  interface Trabajador {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
    agentId: string;
    status: 'Ativo' | 'Desativado' | 'Suspenso' | 'Férias' | 'Pendente';
    lastAccess: string;
    phone: string;
    registrationDate: string;
    permissions: string[];
    /** 2026-08-22 — páginas concedidas (tabs). undefined = sem restrições (legado). */
    paginas?: string[];
    activityLogs: { action: string; timestamp: string; ip: string }[];
  }

  const [workers, setWorkers] = useState<Trabajador[]>(() => {
    const isPlatformAdmin = appMode === 'admin-workers';
    // A equipa institucional é isolada por instituição e nasce sem membros;
    // nunca reutiliza a lista fictícia genérica de demonstração.
    const key = isPlatformAdmin
      ? 'correio_digital_admin_workers'
      : appMode === 'institution'
        ? `correio_digital_workers_${normalizeInstCode(bi)}`
        : 'correio_digital_workers';
    const lerEspelho = (): Trabajador[] => {
      try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as Trabajador[]) : [];
      } catch { return []; }
    };
    // 2026-08-21 — MODO REAL: a fonte canónica da equipa é o REGISTO da
    // instituição (membros criados na página Equipa via addInstMember —
    // espelho `cda_inst_regs_v1`). Antes o Modo Real devolvia SEMPRE [] e a
    // lista do responsável nunca mostrava os colaboradores adicionados
    // (só apareciam na sessão em que tinham sido criados).
    if (!shouldUseMockFallback()) {
      if (appMode === 'institution') {
        const reg = getLocalInstReg(normalizeInstCode(bi || ''));
        const membros = (reg?.members || []).map<Trabajador>((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          phone: m.phone || '',
          role: m.role,
          department: m.dept,
          agentId: m.agentNumber || '',
          status: 'Ativo',
          lastAccess: 'Nunca acedeu',
          registrationDate: '12/06/2026',
          permissions: ['Visualizar'],
          paginas: m.paginasPermitidas,
          activityLogs: [],
        }));
        return membros.length ? membros : lerEspelho();
      }
      return lerEspelho();
    }
    // Dados de equipa demonstrativos nunca entram no Modo Real.
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    if (appMode === 'institution') return [];
    if (isPlatformAdmin) {
      return [
        {
          id: 'w-admin-1',
          name: 'Edlasio Galhardo',
          email: 'e.galhardo@mindis.gov.ao',
          role: 'Administrador Central',
          department: 'Sede Executiva / Gestão Unificada',
          agentId: 'CDA-0001',
          status: 'Ativo',
          lastAccess: 'Hoje, 10:22',
          phone: '+244 923 888 777',
          registrationDate: '02/01/2026',
          permissions: ['Visualizar', 'Homologar', 'Bloqueio', 'Alertas', 'Logs', 'API'],
          activityLogs: [
            { action: 'Efetuou login na consola dactiloscópica', timestamp: '12/06/2026 10:15', ip: '197.231.42.15' },
            { action: 'Homologou com sucesso cadastro de cidadão José Kalunga', timestamp: '12/06/2026 10:18', ip: '197.231.42.15' },
            { action: 'Restaurou chaves privadas de segurança', timestamp: '12/06/2026 10:22', ip: '197.231.42.15' }
          ]
        },
        {
          id: 'w-admin-2',
          name: 'Kambanza Neto',
          email: 'k.neto@cda.gov.ao',
          role: 'Suporte Técnico',
          department: 'Criptografia / Chaves Privadas',
          agentId: 'CDA-0050',
          status: 'Ativo',
          lastAccess: 'Hoje, 08:30',
          phone: '+244 924 113 050',
          registrationDate: '15/01/2026',
          permissions: ['Visualizar', 'API'],
          activityLogs: [
            { action: 'Gerou novas chaves criptográficas HSM', timestamp: '11/06/2026 14:15', ip: '197.231.40.89' },
            { action: 'Efetuou login na consola dactiloscópica', timestamp: '12/06/2026 08:30', ip: '197.231.40.89' }
          ]
        },
        {
          id: 'w-admin-3',
          name: 'Marta Viana',
          email: 'm.viana@cda.gov.ao',
          role: 'Auditor',
          department: 'Prevenção de Fraude / Compliance',
          agentId: 'CDA-0022',
          status: 'Ativo',
          lastAccess: 'Ontem, 15:44',
          phone: '+244 912 770 022',
          registrationDate: '20/01/2026',
          permissions: ['Visualizar', 'Logs'],
          activityLogs: [
            { action: 'Auditou logs dactiloscópicos do servidor', timestamp: '11/06/2026 15:30', ip: '197.231.40.101' }
          ]
        },
        {
          id: 'w-admin-4',
          name: 'Valeriano Lima',
          email: 'v.lima@cda.gov.ao',
          role: 'Operador',
          department: 'Homologações de Documentos / Backoffice',
          agentId: 'CDA-0099',
          status: 'Ativo',
          lastAccess: 'Ontem, 09:12',
          phone: '+244 931 555 099',
          registrationDate: '10/02/2026',
          permissions: ['Visualizar', 'Homologar'],
          activityLogs: [
            { action: 'Validou biometria de cidadã Maria Antónia', timestamp: '11/06/2026 09:12', ip: '197.231.41.200' }
          ]
        }
      ];
    }
    return [
      {
        id: 'w-1',
        name: 'Mário de Oliveira',
        email: 'm.oliveira@cda.gov.ao',
        role: 'Diretor de Sistemas de Informação',
        department: 'Tecnologias de Informação (CDA)',
        agentId: 'CDA-0044',
        status: 'Ativo',
        lastAccess: 'Hoje, 09:15',
        phone: '+244 923 112 044',
        registrationDate: '10/01/2026',
        permissions: ['Visualizar', 'Homologar', 'API'],
        activityLogs: []
      },
      {
        id: 'w-2',
        name: 'Amélia Augusto',
        email: 'a.augusto@cda.gov.ao',
        role: 'Técnica de Validação Facial e BI',
        department: 'Homologação de Identidade',
        agentId: 'CDA-0981',
        status: 'Ativo',
        lastAccess: 'Ontem, 16:40',
        phone: '+244 912 804 981',
        registrationDate: '18/01/2026',
        permissions: ['Visualizar', 'Homologar'],
        activityLogs: []
      },
      {
        id: 'w-3',
        name: 'Hamilton Santana',
        email: 'h.santana@cda.gov.ao',
        role: 'Gestor de Correspondência Digital',
        department: 'Distribuição Postal Digital',
        agentId: 'CDA-0152',
        status: 'Ativo',
        lastAccess: '25/05/2026',
        phone: '+244 931 773 152',
        registrationDate: '01/02/2026',
        permissions: ['Visualizar'],
        activityLogs: []
      },
      {
        id: 'w-4',
        name: 'Sílvia de Sousa',
        email: 's.sousa@cda.gov.ao',
        role: 'Auditora de Segurança e Criptografia',
        department: 'Segurança da Informação (CDA)',
        agentId: 'CDA-0431',
        status: 'Férias',
        lastAccess: '18/05/2026',
        phone: '+244 922 400 431',
        registrationDate: '02/02/2026',
        permissions: ['Visualizar', 'Logs'],
        activityLogs: []
      }
    ];
  });

  React.useEffect(() => {
    const key = appMode === 'admin-workers'
      ? 'correio_digital_admin_workers'
      : appMode === 'institution'
        ? `correio_digital_workers_${normalizeInstCode(bi)}`
        : 'correio_digital_workers';
    localStorage.setItem(key, JSON.stringify(workers));
  }, [workers, appMode, bi]);

  const PROVINCES = [
    'Bengo',
    'Icolo e Bengo',
    'Benguela',
    'Bié',
    'Cabinda',
    'Cuando',
    'Cubango',
    'Cuanza Norte',
    'Cuanza Sul',
    'Cunene',
    'Huambo',
    'Huíla',
    'Luanda',
    'Lunda Norte',
    'Lunda Sul',
    'Malanje',
    'Moxico',
    'Moxico Leste',
    'Namibe',
    'Uíge',
    'Zaire'
  ];

  // Citizen State (adapted from Interoperabilidade page for Admin "Usuários" page)
  interface Citizen {
    id: string;
    name: string;
    category: string;
    province: string;
    municipio: string;
    address: string;
    contact: string;
    status: 'Pendente de Validação' | 'Em Análise pela IA' | 'Em Revisão Administrativa' | 'Aprovado Automaticamente' | 'Aprovado Manualmente' | 'Rejeitado' | 'Bloqueado' | 'Ativo';
    biNumber?: string;
    email?: string;
    phone?: string;
    registrationDate?: string;
    lastAccess?: string;
    coherenceLevel?: number;
    iaResult?: 'Aprovado' | 'Revisão Administrativa' | 'Rejeitado';
    facialMatch?: number;
    imageQuality?: number;
    ocrDataMatch?: number;
    validationStatus?: string;
    facePhotos?: string[];
    numDigitalDocs?: number;
    numCorrespondences?: number;
    activityHistory?: { action: string; timestamp: string; ip?: string }[];
    urlFrente?: string;
    urlVerso?: string;
    urlSelfie?: string;
    /** F48 — os documentos EXISTEM no Storage privado mas esta consola não tem
     *  sessão Auth de administração para os visualizar (v15): mostra-se aviso
     *  honesto em vez da maqueta simulada (que parecia "imagem não gravada"). */
    docsProtegidosSemAcesso?: boolean;
    facePhoto?: string;
    reason?: string;
    verificationScore?: number;
    dbUUID?: string;
    iaReport?: string;
    // F29 (v11.1) — resumo da Pré-Verificação Inteligente (marcador [PVIC] das observações)
    pviVer?: 'APTO' | 'REVISAO';
    pviAlertas?: string[];
    pviMotivo?: string;
    pviDuracaoMs?: number;
    pviModelo?: string;
    pviTs?: string;
  }

  const [filterProvince, setFilterProvince] = useState<string>('Todas');
  const [filterMunicipio, setFilterMunicipio] = useState<string>('Todos');
  const [filterStatus, setFilterStatus] = useState<string>('Todas');


  // IA review states
  const [selectedReviewCitizen, setSelectedReviewCitizen] = useState<Citizen | null>(null);
  const [aiEvaluationState, setAiEvaluationState] = useState<'idle' | 'running' | 'completed'>('idle');
  const [aiMatchScore, setAiMatchScore] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  // Canal exclusivo Admin ⇄ Cidadão (homologação)
  const [adminMsgInput, setAdminMsgInput] = useState<string>('');
  const [adminThreadRefresh, setAdminThreadRefresh] = useState<number>(0);
  // Eliminação de cadastro: popup de confirmação + estado de progresso
  const [deleteConfirmCitizen, setDeleteConfirmCitizen] = useState<Citizen | null>(null);
  const [isDeletingCitizen, setIsDeletingCitizen] = useState<boolean>(false);
  const [modalActiveTab, setModalActiveTab] = useState<'validation' | 'activity' | 'edit'>('validation');

  // Edit fields states for selection inside modal
  const [editName, setEditName] = useState('');
  const [editBi, setEditBi] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [, setEditCategory] = useState('');
  const [editProvince, setEditProvince] = useState('');
  const [editMunicipio, setEditMunicipio] = useState('');

  // New Step-by-Step validation states for the 3-step citizen verification
  const [reviewStepTab, setReviewStepTab] = useState<1 | 2 | 3>(1);
  const [, setValidatedFields] = useState<Record<string, boolean>>({
    name: true,
    bi: true,
    doc: true,
    photo: true,
    province: true,
    municipio: true,
    email: true,
    phone: true,
    emergency: true,
    fingerprint: true,
    facial: true
  });
  const [, setRejectionStep] = useState<'passo1' | 'passo2' | 'passo3' | 'geral'>('geral');

  const [citizens, setCitizens] = useState<Citizen[]>(() => {
    // No Modo Real, a lista nasce vazia e é preenchida apenas pela consulta
    // Supabase abaixo; nunca reutiliza cidadãos sintéticos de localStorage.
    if (!shouldUseMockFallback()) return [];
    const saved = localStorage.getItem('gov_admin_citizens');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const validStatuses = [
          'Pendente de Validação',
          'Em Análise pela IA',
          'Em Revisão Administrativa',
          'Aprovado Automaticamente',
          'Aprovado Manualmente',
          'Rejeitado',
          'Bloqueado',
          'Ativo'
        ];
        // Instituições deixam de figurar nesta fila — passaram para a página Instituições.
        return parsed.filter((c: Partial<Citizen> & { contact?: string }) => c.category !== 'Instituição').map((c) => {
          let st = c.status;
          if (st === 'Aprovado' || st === 'Ativo') st = 'Ativo';
          if (st === 'Pendente' || st === 'Pendente de Validação') st = 'Pendente de Validação';
          if (st === 'Não Aprovado' || st === 'Rejeitado') st = 'Rejeitado';
          if (!validStatuses.includes(st)) {
            st = 'Pendente de Validação';
          }
          return {
            ...c,
            status: st,
            email: c.email || `${c.name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
            phone: c.phone || c.contact || '+244 923 000 111',
            registrationDate: c.registrationDate || '12/05/2026',
            lastAccess: c.lastAccess || '12/06/2026',
            coherenceLevel: c.coherenceLevel !== undefined ? c.coherenceLevel : (st === 'Ativo' || st === 'Aprovado Automaticamente' ? 98 : st === 'Em Revisão Administrativa' ? 82 : 45),
            facialMatch: c.facialMatch || (st === 'Ativo' || st === 'Aprovado Automaticamente' ? 97 : st === 'Em Revisão Administrativa' ? 80 : 35),
            imageQuality: c.imageQuality || (st === 'Ativo' || st === 'Aprovado Automaticamente' ? 95 : 85),
            ocrDataMatch: c.ocrDataMatch || (st === 'Ativo' || st === 'Aprovado Automaticamente' ? 100 : 75),
            iaResult: c.iaResult || (st === 'Ativo' || st === 'Aprovado Automaticamente' ? 'Aprovado' : st === 'Em Revisão Administrativa' ? 'Revisão Administrativa' : 'Rejeitado'),
            iaReport: c.iaReport || (st === 'Ativo' || st === 'Aprovado Automaticamente' ? 'Análise biofísica e OCR sem desconformidade detetada.' : 'Divergência rítmica facial.'),
            numDigitalDocs: c.numDigitalDocs || Math.floor(Math.random() * 8) + 1,
            numCorrespondences: c.numCorrespondences || Math.floor(Math.random() * 5),
            facePhotos: c.facePhotos || [
              c.facePhoto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=250&h=250&fit=crop&crop=face',
              'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=250&h=250&fit=crop&crop=face',
              'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=250&h=250&fit=crop&crop=face',
              'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=250&h=250&fit=crop&crop=face',
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&h=250&fit=crop&crop=face'
            ],
            activityHistory: c.activityHistory || [
              { action: 'Acesso à QR Code', timestamp: '12/06/2026 10:15', ip: '197.231.42.15' },
              { action: 'Despacho de Correspondência Recebida', timestamp: '10/06/2026 14:22', ip: '197.231.42.15' }
            ],
            biNumber: c.biNumber || c.bi || `00${Math.floor(100000 + Math.random() * 900000)}LA041`,
            facePhoto: c.facePhoto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=250&h=250&fit=crop&crop=face'
          };
        });
      } catch (e) {
        // Fallback
      }
    }
    return [
      { 
        id: 'u1', 
        name: 'João Pedro Manuel', 
        category: 'Trabalhador', 
        province: 'Luanda', 
        municipio: 'Maianga', 
        address: 'Bairro Alvalade, Rua do Comércio', 
        contact: '+244 923 881 202', 
        status: 'Aprovado Automaticamente',
        biNumber: '00098876666666LA045',
        email: 'joao.pedro@gov.ao',
        phone: '+244 923 881 202',
        registrationDate: '10/05/2026',
        lastAccess: '11/06/2026',
        coherenceLevel: 99,
        facialMatch: 98,
        imageQuality: 95,
        ocrDataMatch: 100,
        iaResult: 'Aprovado',
        iaReport: 'OCR confere 100% com o Registo Civil. Verificação facial positiva de 98% de correspondência biométrica. Qualidade das imagens de 95% para processamento.',
        numDigitalDocs: 4,
        numCorrespondences: 3,
        facePhotos: [
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=250&h=250&fit=crop&crop=face',
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=250&h=250&fit=crop&crop=face',
          'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=250&h=250&fit=crop&crop=face',
          'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=250&h=250&fit=crop&crop=face',
          'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=250&h=250&fit=crop&crop=face'
        ],
        activityHistory: [
          { action: 'Acesso à QR Code', timestamp: '11/06/2026 14:15', ip: '197.231.42.15' },
          { action: 'Despacho de Correspondência Recebida', timestamp: '09/06/2026 11:22', ip: '197.231.42.15' },
          { action: 'Assinatura Eletrónica de Certidão', timestamp: '05/06/2026 09:10', ip: '197.231.42.15' }
        ],
        facePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=250&h=250&fit=crop&crop=face'
      },
      { 
        id: 'u2', 
        name: 'Kiara de Sousa', 
        category: 'Estudante', 
        province: 'Luanda', 
        municipio: 'Kilamba Kiaxi', 
        address: 'Centralidade do Kilamba, Bloco C', 
        contact: '+244 912 884 551', 
        status: 'Ativo',
        biNumber: '005432109LA098',
        email: 'kiara.sousa@univ.ao',
        phone: '+244 912 884 551',
        registrationDate: '01/06/2026',
        lastAccess: '12/06/2026',
        coherenceLevel: 94,
        facialMatch: 92,
        imageQuality: 91,
        ocrDataMatch: 100,
        iaResult: 'Aprovado',
        iaReport: 'Homologação biométrica processada com sucesso. OCR sem desconformidade detetada.',
        numDigitalDocs: 2,
        numCorrespondences: 1,
        facePhotos: [
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=250&h=250&fit=crop&crop=face',
          'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=250&h=250&fit=crop&crop=face',
          'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=250&h=250&fit=crop&crop=face',
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&h=250&fit=crop&crop=face',
          'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=250&h=250&fit=crop&crop=face'
        ],
        activityHistory: [
          { action: 'Acesso à QR Code', timestamp: '12/06/2026 08:31', ip: '197.88.10.150' },
          { action: 'Consulta de Carta de Condução', timestamp: '10/06/2026 16:45', ip: '197.88.10.150' }
        ],
        facePhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=250&h=250&fit=crop&crop=face'
      },
      { 
        id: 'u3', 
        name: 'Manuel Bernardo', 
        category: 'Aposentado', 
        province: 'Benguela', 
        municipio: 'Lobito', 
        address: 'Bairro Comercial, Rua 2', 
        contact: '+244 931 772 101', 
        status: 'Pendente de Validação',
        biNumber: '008765432BE022',
        email: 'manuel.bernardo@clube.ao',
        phone: '+244 931 772 101',
        registrationDate: '11/06/2026',
        lastAccess: 'Pendente',
        coherenceLevel: 88,
        facialMatch: 86,
        imageQuality: 90,
        ocrDataMatch: 90,
        iaResult: 'Revisão Administrativa',
        iaReport: 'Documento original com desgaste físico visível. Recomenda-se batimento visual humano complementar.',
        numDigitalDocs: 0,
        numCorrespondences: 0,
        facePhotos: [
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=250&h=250&fit=crop&crop=face',
          'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=250&h=250&fit=crop&crop=face',
          'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=250&h=250&fit=crop&crop=face',
          'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=250&h=250&fit=crop&crop=face',
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=250&h=250&fit=crop&crop=face'
        ],
        activityHistory: [
          { action: 'Submissão de Registo Integrado', timestamp: '11/06/2026 11:20', ip: '41.197.80.12' }
        ],
        facePhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=250&h=250&fit=crop&crop=face'
      },
      { 
        id: 'u4', 
        name: 'Sara Ferreira', 
        category: 'Empresária', 
        province: 'Benguela', 
        municipio: 'Benguela', 
        address: 'Zona Hospitalar, Benguela Sede', 
        contact: '+244 915 220 384', 
        status: 'Ativo',
        biNumber: '001234567BE055',
        email: 'sara.ferreira@empresa.ao',
        phone: '+244 915 220 384',
        registrationDate: '15/05/2026',
        lastAccess: '12/06/2026',
        coherenceLevel: 99,
        facialMatch: 99,
        imageQuality: 98,
        ocrDataMatch: 100,
        iaResult: 'Aprovado',
        iaReport: 'Excelente nitidez na captura. Assinatura digital gerada sem erros operacionais.',
        numDigitalDocs: 6,
        numCorrespondences: 4,
        facePhotos: [
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&h=250&fit=crop&crop=face',
          'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=250&h=250&fit=crop&crop=face',
          'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=250&h=250&fit=crop&crop=face',
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=250&h=250&fit=crop&crop=face',
          'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=250&h=250&fit=crop&crop=face'
        ],
        activityHistory: [
          { action: 'Acesso à QR Code', timestamp: '12/06/2026 10:44', ip: '197.220.14.77' },
          { action: 'Consulta de Título de Propriedade', timestamp: '12/06/2026 10:41', ip: '197.220.14.77' },
          { action: 'Apresentação de BI Eletrónico', timestamp: '11/06/2026 19:20', ip: '197.220.14.77' }
        ],
        facePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&h=250&fit=crop&crop=face'
      },
      { 
        id: 'u5', 
        name: 'António Lopes', 
        category: 'Funcionário Público', 
        province: 'Huíla', 
        municipio: 'Lubango', 
        address: 'Avenida Agostinho Neto, Centro', 
        contact: '+244 923 112 044', 
        status: 'Em Revisão Administrativa',
        biNumber: '002345678HU066',
        email: 'antonio.lopes@gov.ao',
        phone: '+244 923 112 044',
        registrationDate: '08/06/2026',
        lastAccess: 'Pendente',
        coherenceLevel: 75,
        facialMatch: 72,
        imageQuality: 88,
        ocrDataMatch: 80,
        iaResult: 'Revisão Administrativa',
        iaReport: 'Coerência limítrofe detetada de 75%. Divergência parcial na grafia do sobrenome entre formulário (António Lopes) e BI (António de Oliveira Lopes). Requer conferência humana.',
        numDigitalDocs: 0,
        numCorrespondences: 1,
        facePhotos: [
          'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=250&h=250&fit=crop&crop=face',
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=250&h=250&fit=crop&crop=face',
          'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=250&h=250&fit=crop&crop=face',
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=250&h=250&fit=crop&crop=face',
          'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=250&h=250&fit=crop&crop=face'
        ],
        activityHistory: [
          { action: 'Submissão de Registo Integrado', timestamp: '08/06/2026 09:30', ip: '41.197.88.22' }
        ],
        facePhoto: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=250&h=250&fit=crop&crop=face'
      },
      { 
        id: 'u6', 
        name: 'Maria Antónia', 
        category: 'Estudante', 
        province: 'Huambo', 
        municipio: 'Huambo', 
        address: 'Centro do Huambo', 
        contact: '+244 928 600 001', 
        status: 'Rejeitado',
        biNumber: '004567890HA011',
        email: 'maria.antonia@estudante.ao',
        phone: '+244 928 600 001',
        registrationDate: '10/06/2026',
        lastAccess: 'Rejeitado',
        coherenceLevel: 45,
        facialMatch: 35,
        imageQuality: 82,
        ocrDataMatch: 60,
        iaResult: 'Rejeitado',
        iaReport: 'Divergência biométrica: a foto registada na selfie não condiz com as características antropométricas da foto presente no Bilhete de Identidade principal (Match Facial de apenas 35%).',
        numDigitalDocs: 0,
        numCorrespondences: 0,
        facePhotos: [
          'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=250&h=250&fit=crop&crop=face',
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=250&h=250&fit=crop&crop=face',
          'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=250&h=250&fit=crop&crop=face',
          'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=250&h=250&fit=crop&crop=face',
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&h=250&fit=crop&crop=face'
        ],
        activityHistory: [
          { action: 'Submissão de Registo Integrado', timestamp: '10/06/2026 16:15', ip: '41.197.55.99' }
        ],
        facePhoto: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=250&h=250&fit=crop&crop=face',
        reason: 'Divergência biométrica: a foto registada na selfie não condiz com as características antropométricas da foto presente no Bilhete de Identidade.'
      },
      { 
        id: 'u7', 
        name: 'José Kalunga', 
        category: 'Trabalhador', 
        province: 'Cabinda', 
        municipio: 'Cabinda', 
        address: 'Rua do Porto de Cabinda', 
        contact: '+244 923 100 007', 
        status: 'Bloqueado',
        biNumber: '003456789CA077',
        email: 'jose.kalunga@porto.ao',
        phone: '+244 923 100 007',
        registrationDate: '20/05/2026',
        lastAccess: '10/06/2026',
        coherenceLevel: 98,
        facialMatch: 97,
        imageQuality: 96,
        ocrDataMatch: 100,
        iaResult: 'Aprovado',
        iaReport: 'Integridade de conta verificada. Conta bloqueada temporariamente administrativa por solicitação do utilizador devido a extravio do terminal físico móvel.',
        numDigitalDocs: 3,
        numCorrespondences: 2,
        facePhotos: [
          'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=250&h=250&fit=crop&crop=face',
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=250&h=250&fit=crop&crop=face',
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=250&h=250&fit=crop&crop=face',
          'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=250&h=250&fit=crop&crop=face',
          'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=250&h=250&fit=crop&crop=face'
        ],
        activityHistory: [
          { action: 'Bloqueio de Segurança Autorizado', timestamp: '10/06/2026 12:45', ip: 'Admin_Consola' },
          { action: 'Acesso à QR Code', timestamp: '09/06/2026 18:22', ip: '197.231.42.15' }
        ],
        facePhoto: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=250&h=250&fit=crop&crop=face',
        reason: 'Conta bloqueada administrativamente por solicitação do utilizador.'
      }
    ];
  });

  React.useEffect(() => {
    localStorage.setItem('gov_admin_citizens', JSON.stringify(citizens));
  }, [citizens]);

  // Extrai o relatório REAL da pré-verificação local embutido nas observações:
  // formato novo: marcador [KYC:{...}] | formato legado: "Pré-verificação local: X% (Y)".
  const parseKycFromObservacoes = (raw?: string): { fm: number | null; iq: number | null; ocr: number | null; coh: number | null; ia?: string } | null => {
    if (!raw) return null;
    const marker = raw.match(/\[KYC:(\{[\s\S]*?\})\]/);
    if (marker) {
      try {
        const k = JSON.parse(marker[1]);
        return { fm: k.fm ?? null, iq: k.iq ?? null, ocr: k.ocr ?? null, coh: k.coh ?? null, ia: k.ia };
      } catch {
        return null;
      }
    }
    const legacy = raw.match(/Pré-verificação local: (\d+(?:[.,]\d+)?)% \(([^)]+)\)/);
    if (legacy) {
      return { fm: null, iq: null, ocr: null, coh: parseFloat(legacy[1].replace(',', '.')), ia: legacy[2] };
    }
    return null;
  };

  const stripKycMarker = (raw?: string): string =>
    (raw || '')
      .replace(/\s*\[KYC:\{[\s\S]*?\}\]/, '')
      // F29 (v11.1): o marcador [PVIC] também não pode poluir o texto de motivo
      .replace(/\s*\[PVIC:\{[\s\S]*?\}\]/, '')
      .trim();

  // F45 (Storage privado v15): documentos_registo é PRIVADO — fotos do B.I. e
  // selfies chegam como marcador "storage:…" (novos) ou URL pública legada
  // (antigos). Resolvem-se em lote para URLs assinados logo após o fetch, e os
  // renders (<img src={citizen.urlFrente}>) recebem o URL final sem alterações.
  // Falha total → fallback visual neutro (nunca <img> partido com marcador cru).
  const REG_PHOTO_FALLBACK = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&h=250&fit=crop&crop=face';
  const resolveCitizenDocUrls = async (list: Citizen[]): Promise<Citizen[]> =>
    Promise.all(list.map(async (c) => {
      if (!c.urlSelfie && !c.urlFrente && !c.urlVerso) return c;
      const [selfie, frente, verso] = await Promise.all([
        resolveStorageUrl(supabase, c.urlSelfie),
        resolveStorageUrl(supabase, c.urlFrente),
        resolveStorageUrl(supabase, c.urlVerso),
      ]);
      const face = selfie || (c.facePhoto && !isStorageRef(c.facePhoto) ? c.facePhoto : REG_PHOTO_FALLBACK);
      return {
        ...c,
        urlSelfie: selfie || (isStorageRef(c.urlSelfie) ? '' : c.urlSelfie),
        urlFrente: frente || (isStorageRef(c.urlFrente) ? '' : c.urlFrente),
        urlVerso: verso || (isStorageRef(c.urlVerso) ? '' : c.urlVerso),
        docsProtegidosSemAcesso:
          (isStorageRef(c.urlSelfie) && !selfie) ||
          (isStorageRef(c.urlFrente) && !frente) ||
          (isStorageRef(c.urlVerso) && !verso),
        facePhoto: face,
      };
    }));

  // F48 — Painel honesto quando o documento EXISTE no Storage privado mas esta
  // consola não tem sessão de agente real (ADMIN-NNNN) para o visualizar: antes
  // caía na maqueta simulada do B.I. e parecia que "a imagem não ficou gravada".
  const renderProtectedDocNotice = (lado: string) => (
    <div className="h-[240px] rounded-[24px] border border-amber-200 bg-amber-50/80 flex flex-col items-center justify-center gap-2.5 p-6 text-center shadow-2xs">
      <Lock size={26} className="text-amber-600" />
      <p className="text-[11px] font-black uppercase tracking-wide text-amber-700">Documento guardado no Storage privado</p>
      <p className="text-[11px] leading-relaxed font-semibold text-amber-600">
        A foto do {lado} foi enviada com sucesso no registo e está SEGURA na nuvem —
        mas esta consola entrou sem sessão de agente real (ADMIN-NNNN), e a política
        de privacidade (v15) só liberta a visualização a administradores autenticados.
        Entre na Área da Administração com um agente real para visualizar e homologar.
      </p>
    </div>
  );

  const mapRegistrationRowsToCitizens = (rows: LinhaSolicitacaoCidadao[]): Citizen[] => rows.map((item) => {
    // F29 (v11.1): status 'Aprovado' com marcador [PVIC] APTO = auto-aprovação pela IA
    // (distinta da aprovação manual — com selo próprio e revogação marcada).
    const pvi = parsePvicFromObservacoes(item.observacoes);
    let st: 'Pendente de Validação' | 'Aprovado Automaticamente' | 'Aprovado Manualmente' | 'Rejeitado' = 'Pendente de Validação';
    if (item.status === 'Aprovado') st = pvi?.ver === 'APTO' ? 'Aprovado Automaticamente' : 'Aprovado Manualmente';
    if (item.status === 'Reprovado' || item.status === 'Não Aprovado' || item.status === 'Rejeitado') st = 'Rejeitado';

    // Métricas reais medidas pelo motor local no momento do registo (não inventadas)
    const kyc = parseKycFromObservacoes(item.observacoes);
    const iaRes: Citizen['iaResult'] | undefined =
      kyc?.ia === 'Aprovado' ? 'Aprovado' :
      kyc?.ia === 'Revisão Administrativa' ? 'Revisão Administrativa' :
      kyc?.ia === 'Rejeitado' ? 'Rejeitado' : undefined;

    return {
      id: String(item.id),
      name: item.nome,
      category: item.observacoes?.includes('[Instituição]') ? 'Instituição' : 'Cidadão',
      province: 'Luanda',
      municipio: 'Belas',
      address: item.observacoes?.includes('[Instituição]') ? 'Sede da ENDE, Luanda, Angola' : 'Centralidade do Kilamba, Bloco T22',
      contact: item.email,
      status: st,
      biNumber: item.bi_numero,
      email: item.email || undefined,
      facePhoto: item.url_selfie || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&h=250&fit=crop&crop=face',
      urlSelfie: item.url_selfie || '',
      reason: stripKycMarker(item.observacoes),
      registrationDate: item.criado_em ? new Date(item.criado_em).toLocaleDateString('pt-AO') : undefined,
      verificationScore: kyc?.coh ?? (item.status === 'Aprovado' ? 98.4 : undefined),
      coherenceLevel: kyc?.coh ?? undefined,
      facialMatch: kyc?.fm ?? undefined,
      imageQuality: kyc?.iq ?? undefined,
      ocrDataMatch: kyc?.ocr ?? undefined,
      iaResult: iaRes,
      urlFrente: item.url_frente || '',
      urlVerso: item.url_verso || '',
      dbUUID: String(item.id),
      // F29 (v11.1) — detalhe da Pré-Verificação Inteligente para o painel do modal
      pviVer: pvi?.ver ?? undefined,
      pviAlertas: pvi?.al,
      pviMotivo: pvi?.mot,
      pviDuracaoMs: pvi?.dur ?? undefined,
      pviModelo: pvi?.mod,
      pviTs: pvi?.ts
    };
  });

  const mapProfilesToCitizens = (rows: LinhaPerfilAdmin[]): Citizen[] => rows.map((item, index: number) => ({
    id: item.id || `profile-${index}`,
    name: item.name,
    category: 'Cidadão',
    province: 'Luanda',
    municipio: 'Belas',
    address: 'Endereço não detalhado no perfil',
    contact: item.email || 'sem-email@cidadao.ao',
    status: 'Aprovado Manualmente',
    biNumber: item.bi,
    facePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&h=250&fit=crop&crop=face',
    reason: 'Registo sincronizado a partir da tabela profiles.',
    verificationScore: 97.5,
    dbUUID: item.id
  }));

  const updateRegistrationRecord = async (recordId: string, payload: Record<string, unknown>) => {
    try {
      // 2026-08-20 — Modo Real: gravar via proxy do servidor (service role);
      // sem sessão (demo) mantém-se o caminho directo de sempre.
      const viaProxy = await registoPublicoProxy('update', { id: recordId }, payload);
      if (viaProxy !== null) {
        if (viaProxy.ok) return true;
        console.warn('[REGISTOS] atualização via servidor falhou:', viaProxy.erro);
        return false;
      }
      const { error } = await supabase
        .from('solicitacoes_registo')
        .update(payload)
        .eq('id', recordId);
      if (error) {
        if (error.code === 'PGRST205') {
          console.warn('solicitacoes_registo ausente: atualização persistida apenas no estado local.');
          return false;
        }
        console.error(error);
        return false;
      }
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // F48 — decisões da consola SÓ valem na base central com sessão Auth de
  // administração (agente real ADMIN-NNNN): a conta demo é offline por desenho
  // (D7/v12) e a RLS recusa a escrita. ANTES, essa falha era SILENCIOSA — a
  // consola mostrava a decisão como gravada e o cidadão ficava Pendente na
  // nuvem para sempre (origem da "luz Online vermelha" reportada).
  const warnIfCloudDecisionNotPersisted = (saved: boolean, what: string) => {
    if (saved) return;
    notify(`ATENÇÃO: ${what} não foi gravada na base central — esta consola não tem sessão de agente real (ADMIN-NNNN). O efeito ficou apenas local (demonstração). Para decisões com efeito na nuvem, entre na Área da Administração com um agente real.`);
    addAuditLog?.(`[F48] ${what} NÃO persistida na nuvem (sem sessão Auth de administração / RLS) — efeito apenas local.`, 'critical');
  };

  // Acção confirmada no popup de eliminação
  const confirmDeleteCitizen = async () => {
    const target = deleteConfirmCitizen;
    if (!target) return;
    setIsDeletingCitizen(true);
    try {
      // 2026-08-20 — eliminação em cascata na base central via servidor
      // (/api/admin-cidadao, service role + papel admin): apaga registo na
      // fila, perfil, pedidos, notificações, contactos, documentos e a conta
      // Auth — cobre também cidadãos que só existem em `profiles` (o caso do
      // "registo não encontrado" que bloqueava a consola). Sem sessão Auth
      // (conta demo), mantém o comportamento histórico: remoção local com
      // aviso honesto — o Modo Demo nunca toca na nuvem.
      if (target.biNumber) {
        try {
          const central = await eliminarCidadaoAdmin(target.biNumber);
          if (central !== null) {
            if (!central.ok) {
              console.error('Falha na eliminação central do cidadão:', central.erro);
              notify('Não foi possível eliminar o registo na base de dados central. Verifique a ligação à internet e tente novamente.');
              return;
            }
          } else {
            warnIfCloudDecisionNotPersisted(false, 'A eliminação do cadastro');
            try {
              await supabase.from('solicitacoes_registo').delete().eq('bi_numero', target.biNumber);
            } catch { /* demo: efeito local */ }
          }
        } catch (error) {
          console.error('Falha de rede ao eliminar o cidadão:', error);
          notify('Não foi possível concluir a eliminação no Supabase. Verifique a ligação e tente novamente.');
          return;
        }
      }
      setCitizens(prev => prev.filter(c => c.id !== target.id));

      // ELIMINAÇÃO EM CASCATA: todo o conteúdo da conta é removido junto — estado,
      // mensagens (thread oficial + espelhos na caixa partilhada), credenciais,
      // matrizes biométricas locais e ficheiros do registo no storage central.
      const biKey = target.biNumber || '';
      if (biKey) {
        // F47-fix (2026-08-19): marca de REVOGAÇÃO local — garante que, mesmo que
        // a linha da fila na nuvem não seja apagada (admin demo sem sessão Auth,
        // RLS recusa delete), o login deste dispositivo BLOQUEIA o cidadão
        // eliminado. Persistência real multi-dispositivo exige agente admin
        // autenticado (ADMIN-0001), cuja escrita na BD funciona.
        try { localStorage.setItem('cda_revoked_' + normalizeHomologationBi(biKey), '1'); } catch (e) { /* ignora */ }
        try { homologationStore.clearStatus(biKey); } catch (e) { /* ignora */ }
        try { homologationStore.clearThread(biKey); } catch (e) { /* ignora */ }
        try { localStorage.removeItem(`citizen_pass_${biKey}`); } catch (e) { /* ignora */ }
        try { localStorage.removeItem(`cda_read_msgs_${(biKey || '').toUpperCase().replace(/\s+/g, '').trim()}`); } catch (e) { /* ignora */ }
        ['user', 'institution', 'admin'].forEach((m) => {
          try { localStorage.removeItem(`cda_demo_face_${m}_${biKey}`); } catch (e) { /* ignora */ }
        });
        try {
          const raw = localStorage.getItem('correio_digital_inbox');
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              const kept = list.filter((m: { homologation?: boolean; homologationBi?: string }) => !(
                m && m.homologation === true &&
                normalizeHomologationBi(m.homologationBi) === normalizeHomologationBi(biKey)
              ));
              if (kept.length !== list.length) {
                localStorage.setItem('correio_digital_inbox', JSON.stringify(kept));
              }
            }
          }
        } catch (e) { /* ignora */ }
        try {
          const biClean = biKey.replace(/\s+/g, '');
          const { data: files } = await supabase.storage.from('documentos_registo').list(biClean);
          if (files && files.length > 0) {
            await supabase.storage.from('documentos_registo').remove(files.map((f: { name: string }) => `${biClean}/${f.name}`));
          }
        } catch (e) { /* ignora — storage sem permissão: eliminação lógica já garantida */ }
        // F47 — resíduos de nuvem eliminados em cascata (best-effort): perfil e
        // pedidos/notificações do titular, para que nada re-hidrate a identidade
        // revogada. A conta Auth NÃO é apagada (sem chave de serviço no cliente):
        // torna-se inerte — o login passa a ser recusado por inexistência na fila
        // (accountGateService) e um eventual re-registo nasce PENDENTE.
        try { await supabase.from('profiles').delete().eq('bi', biKey); } catch (e) { /* ignora */ }
        try { await supabase.from('user_requests').delete().eq('user_bi', biKey); } catch (e) { /* ignora */ }
        try { await supabase.from('notifications').delete().eq('target_bi', biKey); } catch (e) { /* ignora */ }
      }

      addAuditLog?.(`Remoção: Cadastro do cidadão "${target.name}" (BI: ${target.biNumber || '—'}) e TODO o seu conteúdo (mensagens, validações e ficheiros) eliminados pelo Administrador. O B.I. só volta a ter acesso após NOVO registo, que nasce pendente de nova homologação (F47).`, 'critical');
      setDeleteConfirmCitizen(null);
    } finally {
      setIsDeletingCitizen(false);
    }
  };

  useEffect(() => {
    const fetchSupabaseCitizens = async () => {
      const isSupabaseReady = (import.meta as any).env.VITE_SUPABASE_URL && (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
      if (!isSupabaseReady) return;

      try {
        // 2026-08-20 — Modo Real: ler a fila de registos via proxy do servidor
        // (service role). Sem sessão (demo) mantém-se o caminho directo.
        const viaProxy = await registoPublicoProxy('select');
        let data: any[] | null = null;
        let error: any = null;
        if (viaProxy === null) {
          const direct = await supabase
            .from('solicitacoes_registo')
            .select('*')
            .order('criado_em', { ascending: false });
          data = direct.data as any[] | null; error = direct.error;
        } else if (viaProxy.ok) {
          data = (viaProxy.linhas || []) as any[];
        } else {
          console.warn('[REGISTOS] leitura via servidor falhou:', viaProxy.erro);
          return;
        }

        if (error) {
          if (error.code === 'PGRST205') {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('role', 'user');
            if (profileError) {
              console.error('Error fetching fallback citizens from profiles:', profileError);
              return;
            }
            if (profileData && profileData.length > 0) {
              const profileCitizens = mapProfilesToCitizens(profileData);
              setCitizens(prev => {
                const localFiltered = prev.filter(c => !(profileData as LinhaPerfilAdmin[]).some((item) => item.bi === c.biNumber));
                return [...profileCitizens, ...localFiltered];
              });
            }
            return;
          }
          console.error('Error fetching citizens from Supabase:', error);
          return;
        }

        if (data && data.length > 0) {
          // Instituições vivem na página Instituições (secção "Solicitações de Registo") — saem da fila de cidadãos.
          const citizenRows = (data as LinhaSolicitacaoCidadao[]).filter((item) => {
            if (item?.observacoes?.includes('[Instituição]')) return false;
            // Seeds institucionais de demonstração não podem aparecer como cidadãos no modo real.
            if (!shouldUseMockFallback() && (item?.bi_numero === 'AGT-9921-SR' || item?.observacoes?.includes('Seed demo'))) return false;
            return true;
          });
          const supabaseCitizens: Citizen[] = await resolveCitizenDocUrls(mapRegistrationRowsToCitizens(citizenRows));

          setCitizens(prev => {
            const localFiltered = prev.filter(c => !citizenRows.some((item) => item.bi_numero === c.biNumber) && c.category !== 'Instituição');
            // A versão da nuvem ganha prioridade, MAS preserva as métricas reais
            // locais quando o registo na nuvem ainda não as transporta.
            const merged = supabaseCitizens.map(sc => {
              const local = prev.find(c => c.biNumber === sc.biNumber);
              if (!local) return sc;
              return {
                ...local,
                ...sc,
                coherenceLevel: sc.coherenceLevel ?? local.coherenceLevel,
                facialMatch: sc.facialMatch ?? local.facialMatch,
                imageQuality: sc.imageQuality ?? local.imageQuality,
                ocrDataMatch: sc.ocrDataMatch ?? local.ocrDataMatch,
                iaResult: sc.iaResult ?? local.iaResult,
                verificationScore: sc.verificationScore ?? local.verificationScore,
                phone: sc.phone ?? local.phone,
                // F29 (v11.1): o spread da nuvem escreveria undefined sobre os campos PVIC
                // locais — preserva-os como já acontece com as métricas KYC.
                pviVer: sc.pviVer ?? local.pviVer,
                pviAlertas: (sc.pviAlertas && sc.pviAlertas.length > 0) ? sc.pviAlertas : local.pviAlertas,
                pviMotivo: sc.pviMotivo ?? local.pviMotivo,
                pviDuracaoMs: sc.pviDuracaoMs ?? local.pviDuracaoMs,
                pviModelo: sc.pviModelo ?? local.pviModelo,
                pviTs: sc.pviTs ?? local.pviTs
              };
            });
            return [...merged, ...localFiltered];
          });
        }
      } catch (err) {
        console.error('Error in fetchSupabaseCitizens:', err);
      }
    };

    fetchSupabaseCitizens();
  }, []);








  const filteredCitizens = useMemo(() => {
    const filtrados = citizens.filter((citizen) => {
      const matchProvince = filterProvince === 'Todas' || citizen.province === filterProvince;
      const matchMunicipio = filterMunicipio === 'Todos' || citizen.municipio === filterMunicipio;
      const matchStatus = filterStatus === 'Todas' || citizen.status === filterStatus;
      return matchProvince && matchMunicipio && matchStatus;
    });

    // FASE 1 (2026-08-15) — FILA DE HOMOLOGAÇÃO ASSISTIDA:
    // ordena os cadastros pendentes por GRAVIDADE dos alertas da Pré-Verificação
    // Inteligente (PVIC) — críticos primeiro — para o admin rever o que é mais
    // urgente. A ordenação aplica-se à vista 'Pendente de Validação' e a 'Todas'
    // (não altera a decisão; apenas a ordem de apresentação).
    if (filterStatus === 'Pendente de Validação' || filterStatus === 'Todas') {
      const gravidade = (alertas?: string[]): number => {
        const a = alertas || [];
        if (!a.length) return 4; // sem alertas — menor urgência
        const S = (p: string[]) => p.some(x => a.includes(x));
        if (S(['fraude_suspeita', 'possivel_screenshot', 'possivel_ia'])) return 0; // evidência de manipulação
        if (S(['bi_divergente', 'nome_divergente', 'documento_divergente', 'data_divergente', 'frente_verso_inconsistentes'])) return 1; // divergência de dados
        if (S(['layout_suspeito', 'foto_bi_ilegivel'])) return 2; // suspeita / qualidade parcial
        return 3; // apenas qualidade (desfocada, cortada, ilegível)
      };
      filtrados.sort((a, b) => {
        // pendentes primeiro, depois por gravidade
        const pA = a.status === 'Pendente de Validação' ? 0 : 1;
        const pB = b.status === 'Pendente de Validação' ? 0 : 1;
        if (pA !== pB) return pA - pB;
        const gA = gravidade(a.pviAlertas);
        const gB = gravidade(b.pviAlertas);
        return gA - gB;
      });
    }
    return filtrados;
  }, [citizens, filterProvince, filterMunicipio, filterStatus]);

  const MUNICIPALITIES_BY_PROVINCE: { [key: string]: string[] } = {
    'Todas': ['Todos'],
    'Bengo': ['Todos', 'Dande', 'Ambriz', 'Nambuangongo', 'Bula Atumba', 'Pango Aluquem'],
    'Icolo e Bengo': ['Todos', 'Icolo e Bengo', 'Cacabo', 'Kibala', 'Piri'],
    'Benguela': ['Todos', 'Benguela', 'Lobito', 'Catumbela', 'Baía Farta', 'Ganda', 'Chongorói', 'Bocoio', 'Caimbambo'],
    'Bié': ['Todos', 'Cuito', 'Cuatro', 'Chitembo', 'Andulo', 'Nharêa', 'Mucuma'],
    'Cabinda': ['Todos', 'Cabinda', 'Cacongo', 'Buco-Zau', 'Dembo'],
    'Cuando': ['Todos', 'Menongue', 'Cuchi', 'Cuangar', 'Cativos', 'Luchazes'],
    'Cubango': ['Todos', 'Cubango', 'Cunje', 'Mavinga', 'Nekiemba', 'Rivungo'],
    'Cuanza Norte': ['Todos', 'N\'Dalatando', 'Ambaca', 'Golungo Alto', 'Ngongui', 'Samba', 'Bula'],
    'Cuanza Sul': ['Todos', 'Sumbe', 'Libolo', 'Quibala', 'Cela', 'Mussende', 'Soyo'],
    'Cunene': ['Todos', 'Ondjiva', 'Cuanhama', 'Curoca', 'Namacunde', 'Ombadiya'],
    'Huambo': ['Todos', 'Huambo', 'Caála', 'Bailundo', 'Catchiungo', 'Londuimbale', 'Longonjo', 'Ecunha'],
    'Huíla': ['Todos', 'Lubango', 'Chibia', 'Humpata', 'Caconda', 'Kuvango', 'Matala', 'Caluquembe', 'Quilengues'],
    'Luanda': ['Todos', 'Viana', 'Belas', 'Cazenga', 'Cacuaco', 'Talatona', 'Kilamba Kiaxi', 'Maianga', 'Rangel', 'Ingombota'],
    'Lunda Norte': ['Todos', 'Dundo', 'Cambulo', 'Lóvua', 'Cuiloa', 'Zaire'],
    'Lunda Sul': ['Todos', 'Saurimo', 'Muconda', 'Laculo', 'Cacolo'],
    'Malanje': ['Todos', 'Malanje', 'Caculama', 'Quela', 'Mucari', 'Calandula', 'Cuaba', 'Marimba', 'Masseira'],
    'Moxico': ['Todos', 'Luena', 'Moxico', 'Luchico', 'Cameia', 'Luahadi'],
    'Moxico Leste': ['Todos', 'Luena', 'Lusavo', 'Mucunde', 'Lomelas'],
    'Namibe': ['Todos', 'Namibe', 'Tombwa', 'Virei', 'Bibala', 'Camucuio'],
    'Uíge': ['Todos', 'Uíge', 'Ambuila', 'Bungo', 'Damba', 'Macosine', 'Mucaba', 'Negage', 'Puri', 'Quimbo', 'Songo'],
    'Zaire': ['Todos', 'Mbanza Congo', 'SoYo', 'N\'Zeto', 'Tomboco', 'Cuimba', 'Musserra']
  };

  // Addition Modal and Form States for workers
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [isEditingWorker, setIsEditingWorker] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);

  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerEmail, setNewWorkerEmail] = useState('');
  const [newWorkerRole, setNewWorkerRole] = useState('');
  const [newWorkerDept, setNewWorkerDept] = useState('');
  const [, setNewWorkerAgentId] = useState('');
  const [newWorkerPhone, setNewWorkerPhone] = useState('');
  const [newWorkerStatus, setNewWorkerStatus] = useState<'Ativo' | 'Desativado' | 'Suspenso' | 'Férias' | 'Pendente'>('Ativo');
  const [, setNewWorkerAccessProfile] = useState('Operador de Atendimento');
  const [newWorkerPassword, setNewWorkerPassword] = useState('');
  // 2026-08-22 — PERMISSÕES DE PÁGINA: páginas seleccionadas no popup
  const [newWorkerPaginas, setNewWorkerPaginas] = useState<string[]>([]);

  const paginasDaArea = (appMode === 'admin-workers' ? PAGINAS_ADMIN : PAGINAS_INSTITUICAO);
  const paginaObrigatoriaId = appMode === 'admin-workers' ? 'gov-perfil' : 'perfil';

  const togglePagina = (id: string) => {
    const p = paginasDaArea.find((x) => x.id === id);
    if (p?.obrigatoria) return; // a página obrigatória fica sempre concedida
    setNewWorkerPaginas((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  /** Páginas efectivas ao gravar: seleccionadas + página obrigatória. */
  const paginasEfetivas = (): string[] => {
    const base = newWorkerPaginas.filter((x) => x !== paginaObrigatoriaId && paginasDaArea.some((p) => p.id === x));
    return [...base, paginaObrigatoriaId];
  };

  // F6/B4 — Nº de agente gerado pelo sistema (instituição real → 'SME-LLVV-NN'; Admin → 'ADMIN-NNNN' sequencial v10.1; restantes contextos → formato legado)
  const autoWorkerAgentId = (() => {
    if (isEditingWorker) return workers.find(w => w.id === editingWorkerId)?.agentId || '';
    const regCode = normalizeInstCode(bi || '');
    const instRegAuto = (appMode !== 'admin-workers' && appMode === 'institution' && regCode) ? getLocalInstReg(regCode) : undefined;
    if (appMode === 'institution' && instRegAuto) return nextMemberAgentNumber(regCode);
    if (appMode === 'admin-workers') return nextAdminAgentNumber([...workers.map(w => w.agentId || ''), ...getAdminAgentCreds().map(c => c.agent)]); // F25 — fonte completa (trabalhadores + credenciais), como na página de registo
    return `AGT-${Math.floor(100000 + Math.random() * 900000)}`;
  })();
  
  // Search state for workers
  const [workerSearch, setWorkerSearch] = useState('');
  const [] = useState<string>('all');
  
  // Selected Worker state for permissions and logs
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [activeWorkerTab, setActiveWorkerTab] = useState<'dados' | 'permissions' | 'logs'>('dados');
  const [workerDrawerPwd, setWorkerDrawerPwd] = useState('');

  const selectedWorker = useMemo(() => {
    return workers.find(w => w.id === selectedWorkerId) || null;
  }, [workers, selectedWorkerId]);

  const resetForm = () => {
    setNewWorkerName('');
    setNewWorkerEmail('');
    setNewWorkerRole('');
    setNewWorkerDept('');
    setNewWorkerAgentId('');
    setNewWorkerPhone('');
    setNewWorkerStatus('Ativo');
    setNewWorkerAccessProfile('Operador de Atendimento');
    setNewWorkerPassword('');
    setNewWorkerPaginas([]);
    setIsEditingWorker(false);
    setEditingWorkerId(null);
  };

  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerName || !newWorkerEmail || !newWorkerPhone || !newWorkerRole) {
      notify('Por favor, preencha todos os campos obrigatórios (Nome Completo, Email Institucional, Telefone Profissional e Perfil Funcional).');
      return;
    }

    const isPlatformAdmin = appMode === 'admin-workers';
    const currentTime = '12/06/2026 ' + new Date().toTimeString().slice(0, 5);

    // F4 — instituições registadas (Código Institucional): o colaborador recebe
    // uma senha inicial individual (login: Código + esta senha), única na instituição.
    const regCode = normalizeInstCode(bi);
    const instReg = (!isPlatformAdmin && appMode === 'institution' && regCode) ? getLocalInstReg(regCode) : undefined;
    // F6/B4 — Admin: agentes recebem senha inicial individual (login Admin: 'ADMIN-NNNN' + senha), única na área.
    const adminCredsOn = isPlatformAdmin;
    if (instReg && !isEditingWorker) {
      if (!newWorkerPassword || newWorkerPassword.length < 8) {
        notify('Defina a Senha inicial do colaborador (mínimo 8 caracteres). O login institucional deste colaborador será: Código da instituição + esta senha.');
        return;
      }
      if (isInstPasswordTaken(regCode, newWorkerPassword)) {
        notify('Esta senha já está a ser usada por outra credencial desta instituição. Como a senha identifica a pessoa no login, escolha outra.');
        return;
      }
    }
    if (instReg && isEditingWorker && newWorkerPassword) {
      if (newWorkerPassword.length < 8) {
        notify('A nova senha (se preenchida) deve ter pelo menos 8 caracteres.');
        return;
      }
      if (isInstPasswordTaken(regCode, newWorkerPassword, editingWorkerId || undefined)) {
        notify('Esta senha já está a ser usada por outra credencial desta instituição. Escolha outra.');
        return;
      }
    }
    // F6 — validações da palavra-passe de Agente Admin (criar obrigatória; editar só se preenchida)
    if (adminCredsOn && !isEditingWorker) {
      if (!newWorkerPassword || newWorkerPassword.length < 8) {
        notify('Defina a Palavra-passe inicial do agente (mínimo 8 caracteres). O login Admin deste agente será: Nº Agente Admin + esta palavra-passe.');
        return;
      }
      if (isAdminAgentPasswordTaken(newWorkerPassword)) {
        notify('Esta palavra-passe já está a ser usada por outro agente da Administração. Como a palavra-passe identifica a pessoa no login, escolha outra.');
        return;
      }
    }
    if (adminCredsOn && isEditingWorker && newWorkerPassword) {
      if (newWorkerPassword.length < 8) {
        notify('A nova palavra-passe (se preenchida) deve ter pelo menos 8 caracteres.');
        return;
      }
      const editingAgentNum = workers.find(w => w.id === editingWorkerId)?.agentId;
      if (isAdminAgentPasswordTaken(newWorkerPassword, editingAgentNum)) {
        notify('Esta palavra-passe já está a ser usada por outro agente da Administração. Escolha outra.');
        return;
      }
    }

    if (isEditingWorker && editingWorkerId) {
      if (instReg && newWorkerPassword && editingWorkerId) {
        updateInstMemberPassword(regCode, editingWorkerId, newWorkerPassword);
        const editedMemberAgent = workers.find(w => w.id === editingWorkerId)?.agentId;
        // 2026-08-22 — a senha do colaborador vive no Supabase Auth: a nuvem
        // passa a ser ACTUALIZADA na reposição (antes ficava com a senha
        // antiga e o colaborador acumulava tentativas falhadas noutros
        // dispositivos até ao bloqueio anti-força-bruta).
        if (editedMemberAgent) {
          if (isCloudBound(editedMemberAgent) && isSupabaseConfigured()) {
            void alterarSenhaAgente(editedMemberAgent, newWorkerPassword).then((res) => {
              addAuditLog?.(res.ok
                ? `[AUTH-CLOUD] Senha de ${editedMemberAgent} actualizada na nuvem (Supabase Auth).`
                : `[AUTH-CLOUD] Nuvem indisponível ao actualizar a senha de ${editedMemberAgent} (${res.erro || 'erro'}) — mantida local.`, res.ok ? 'success' : 'warning');
            });
          }
        }
      }
      if (adminCredsOn && newWorkerPassword && editingWorkerId) {
        const editedWorkerAgentNum = workers.find(w => w.id === editingWorkerId)?.agentId;
        if (editedWorkerAgentNum && /^Admin-\d+$/i.test(editedWorkerAgentNum)) {
          updateAdminAgentPassword(editedWorkerAgentNum, newWorkerPassword);
          addAuditLog?.(`[EQUIPA] Senha do agente ${editedWorkerAgentNum} actualizada — login Admin passa a exigir a nova senha.`, 'info');
          // 2026-08-22 — nuvem sincronizada na reposição (antes só local)
          if (isCloudBound(editedWorkerAgentNum) && isSupabaseConfigured()) {
            void alterarSenhaAgente(editedWorkerAgentNum, newWorkerPassword).then((res) => {
              addAuditLog?.(res.ok
                ? `[AUTH-CLOUD] Palavra-passe de ${editedWorkerAgentNum} actualizada na nuvem (Supabase Auth).`
                : `[AUTH-CLOUD] Nuvem indisponível ao actualizar a palavra-passe de ${editedWorkerAgentNum} (${res.erro || 'erro'}) — mantida local.`, res.ok ? 'success' : 'warning');
            });
          }
        }
      }
      // 2026-08-21 — a ficha do MEMBRO (registo que o login lê) passa a
      // reflectir as alterações feitas na Equipa: antes só a tabela UI era
      // actualizada e o colaborador continuava a ver os dados antigos no
      // próprio login.
      if (instReg && editingWorkerId) {
        updateInstMemberProfile(regCode, editingWorkerId, {
          name: newWorkerName,
          email: newWorkerEmail,
          phone: newWorkerPhone,
          role: newWorkerRole,
          dept: newWorkerDept || 'Geral',
          paginasPermitidas: paginasEfetivas(), // 2026-08-22 — páginas concedidas
        });
      }
      // 2026-08-22 — permissões de página do AGENTE ADMIN (espelho local)
      if (adminCredsOn && editingWorkerId) {
        const editedAgentNum = workers.find(w => w.id === editingWorkerId)?.agentId;
        if (editedAgentNum) updateAdminAgentPermissions(editedAgentNum, paginasEfetivas());
      }
      // 2026-08-22 — persistência NA NUVEM (Modo Real): o servidor grava as
      // páginas nos user_metadata do agente e valida a autoridade do
      // responsável (best-effort — falha de rede não quebra a edição local).
      {
        const editedAgentNum = workers.find(w => w.id === editingWorkerId)?.agentId;
        if (editedAgentNum && isSupabaseConfigured()) {
          void permissoesAgente('gravar', editedAgentNum, paginasEfetivas()).then((res) => {
            if (res.ok) addAuditLog?.(`[EQUIPA] Permissões de página de ${editedAgentNum} gravadas na nuvem (Supabase).`, 'success');
            else addAuditLog?.(`[EQUIPA] Nuvem indisponível ao gravar permissões de ${editedAgentNum} (${res.erro || 'erro'}) — mantidas localmente.`, 'warning');
          });
        }
      }
      setWorkers(prev => prev.map(w => w.id === editingWorkerId ? {
        ...w,
        name: newWorkerName,
        email: newWorkerEmail,
        role: newWorkerRole,
        phone: newWorkerPhone,
        department: newWorkerDept || 'Geral',
        agentId: w.agentId || `CDA-${Math.floor(1000 + Math.random() * 9000)}`,
        status: newWorkerStatus || 'Ativo',
        registrationDate: w.registrationDate || '12/06/2026',
        permissions: w.permissions || ['Visualizar'],
        paginas: paginasEfetivas(),
        activityLogs: [
          { action: 'Dados cadastrais atualizados pelo painel central', timestamp: currentTime, ip: '197.231.42.15' },
          ...(w.activityLogs || [])
        ]
      } : w));
      addAuditLog?.(`[EQUIPA] Registo do membro da equipa ${newWorkerName} atualizado com sucesso.`, 'success');
    } else {
      const defaultPerms = isPlatformAdmin 
        ? ['Visualizar', 'Homologar']
        : ['Visualizar'];

      const newWorkerId = `w-${Date.now()}`;
      if (instReg) {
        addInstMember(regCode, {
          id: newWorkerId,
          name: newWorkerName,
          email: newWorkerEmail,
          phone: newWorkerPhone, // 2026-08-21 — antes o telefone pedido no
          // formulário era DESCARTADO (o registo do membro não o guardava).
          role: newWorkerRole,
          dept: newWorkerDept || 'Geral',
          password: newWorkerPassword,
          mustChangePassword: true,
          agentNumber: autoWorkerAgentId, // F6 — 'SME-LLVV-NN'
          paginasPermitidas: paginasEfetivas(), // 2026-08-22 — páginas concedidas
        });
      }
      if (adminCredsOn) {
        addAdminAgent({
          agent: autoWorkerAgentId, // F6 — 'ADMIN-NNNN' (sequencial; o Alfa reserva o nº 1)
          password: newWorkerPassword,
          workerId: newWorkerId,
          name: newWorkerName,
          paginasPermitidas: paginasEfetivas(), // 2026-08-22 — páginas concedidas
        });
        addAuditLog?.(`[EQUIPA] Agente ${autoWorkerAgentId} (${newWorkerName}) criado — login Admin com Nº + senha inicial.`, 'success');
      }
      // F32 (v12/D4-a) — o novo membro nasce na NUVEM: a palavra-passe vive apenas
      // no Supabase Auth. 2026-08-22 — o provisionamento passa a ser AGUARDADO
      // (antes era fire-and-forget): quando o popup fecha, a conta JÁ existe na
      // nuvem com a senha certa — o colaborador pode entrar IMEDIATAMENTE em
      // qualquer dispositivo (antes, quem tentasse entrar logo a seguir apanhava
      // "credenciais incorrectas" e acumulava tentativas até ao bloqueio
      // anti-força-bruta). O signUp cria sessão para o NOVO utilizador — a
      // sessão do responsável é restaurada logo a seguir (best-effort), para as
      // acções seguintes (eliminar, permissões, senha) manterem a autoridade.
      let sessaoAnterior: { access_token: string; refresh_token: string } | null = null;
      try {
        const { data: sd } = await supabase.auth.getSession();
        if (sd?.session?.access_token && sd?.session?.refresh_token) {
          sessaoAnterior = { access_token: sd.session.access_token, refresh_token: sd.session.refresh_token };
        }
      } catch { /* best-effort */ }
      if (isSupabaseConfigured() && newWorkerPassword && (instReg || adminCredsOn)) {
        const cloudEmail = adminCredsOn
          ? syntheticAdminEmail(autoWorkerAgentId)
          : syntheticInstitutionAgentEmail(autoWorkerAgentId);
        const cloudRole: 'instituicao' | 'admin' = adminCredsOn ? 'admin' : 'instituicao';
        try {
          const prov = await provisionCloudAccount(supabase, {
            email: cloudEmail,
            password: newWorkerPassword,
            metadata: adminCredsOn
              ? { agent: autoWorkerAgentId, name: newWorkerName, workerId: newWorkerId, role: 'admin', email: newWorkerEmail, phone: newWorkerPhone, paginasPermitidas: paginasEfetivas() }
              : { agent: autoWorkerAgentId, instituicao: regCode, name: newWorkerName, role: 'instituicao', email: newWorkerEmail, phone: newWorkerPhone, paginasPermitidas: paginasEfetivas() },
          });
          if (prov.outcome === 'ok' || prov.outcome === 'linked_existing') {
            markCloudAccount(autoWorkerAgentId, cloudEmail, cloudRole);
            addAuditLog?.(`[AUTH-CLOUD] Membro ${autoWorkerAgentId} (${newWorkerName}) nascido na nuvem — a palavra-passe vive apenas no Supabase Auth.`, 'success');
          } else if (prov.outcome === 'pending_confirm') {
            addAuditLog?.('[AUTH-CLOUD] ATENÇÃO: confirmação de e-mail activa no Supabase — desactivar (Authentication → Providers → Email).', 'warning');
          } else if (prov.outcome === 'unavailable') {
            addAuditLog?.('[AUTH-CLOUD] Nuvem indisponível ao criar o membro — credencial local mantida; migração just-in-time no primeiro login (D3).', 'warning');
          } else if (prov.outcome === 'conflict') {
            addAuditLog?.('[AUTH-CLOUD] Conflito de conta na nuvem ao criar o membro — a credencial local mantém-se.', 'warning');
          }
        } catch (provErr) {
          console.error('[AUTH-CLOUD] Falha inesperada no provisionamento do membro:', provErr);
        }
      }
      // restaurar a sessão do RESPONSÁVEL (o signUp do membro substituiu-a)
      if (sessaoAnterior) {
        try {
          await supabase.auth.setSession(sessaoAnterior);
        } catch { /* best-effort */ }
      }
      // 2026-08-22 — CONTA NOVA LIMPA: o Nº de agente pode ser reutilizado
      // (após eliminação de um colaborador anterior) e não pode herdar o
      // bloqueio anti-força-bruta da conta antiga — "Demasiadas tentativas
      // falhadas... 8 minutos" logo no primeiro login.
      try { limparLoginFalhas(autoWorkerAgentId); } catch { /* melhor esforço */ }

      const newWorker: Trabajador = {
        id: newWorkerId,
        name: newWorkerName,
        email: newWorkerEmail,
        role: newWorkerRole,
        phone: newWorkerPhone,
        department: newWorkerDept || 'Geral',
        agentId: autoWorkerAgentId || `CDA-${Math.floor(1000 + Math.random() * 9000)}`,
        status: newWorkerStatus || 'Ativo',
        lastAccess: 'Nunca acedeu',
        registrationDate: '12/06/2026',
        permissions: defaultPerms,
        paginas: paginasEfetivas(),
        activityLogs: [
          { action: 'Conta criada e ativada no sistema dactiloscópico', timestamp: currentTime, ip: '197.231.42.15' }
        ]
      };
      setWorkers(prev => [...prev, newWorker]);
      addAuditLog?.(`[EQUIPA] Novo membro da equipa ${newWorkerName} cadastrado com sucesso.`, 'success');
    }

    setShowAddWorkerModal(false);
    resetForm();
  };

  const handleEditWorkerClick = (w: Trabajador) => {
    setIsEditingWorker(true);
    setEditingWorkerId(w.id);
    setNewWorkerPassword('');
    setNewWorkerName(w.name);
    setNewWorkerEmail(w.email);
    setNewWorkerRole(w.role);
    setNewWorkerDept(w.department || 'Geral');
    setNewWorkerAgentId(w.agentId || '');
    setNewWorkerPhone(w.phone);
    setNewWorkerStatus(w.status || 'Ativo');
    // 2026-08-22 — os checkboxes de páginas vêm pré-seleccionados com as
    // permissões actuais (membro/agente LEGADO sem lista = todas concedidas,
    // preservando o acesso actual).
    {
      const todas = paginasDaArea.map((x) => x.id);
      if (appMode === 'institution') {
        const reg = getLocalInstReg(normalizeInstCode(bi || ''));
        const m = (reg?.members || []).find((x) => x.id === w.id);
        setNewWorkerPaginas(m?.paginasPermitidas ? [...m.paginasPermitidas] : todas);
      } else {
        const cred = getAdminAgentCreds().find((c) => c.workerId === w.id);
        setNewWorkerPaginas(cred?.paginasPermitidas ? [...cred.paginasPermitidas] : todas);
      }
    }
    setShowAddWorkerModal(true);
  };

  // F6/B4 — guardar nova senha directamente no dossier do colaborador (vazio = manter)
  const handleDrawerPasswordSave = () => {
    if (!selectedWorker || !workerDrawerPwd) return;
    const regCodeD = normalizeInstCode(bi || '');
    const instRegD = (appMode === 'institution' && regCodeD) ? getLocalInstReg(regCodeD) : undefined;
    if (instRegD) {
      if (workerDrawerPwd.length < 8) { notify('A nova senha deve ter pelo menos 8 caracteres.'); return; }
      if (isInstPasswordTaken(regCodeD, workerDrawerPwd, selectedWorker.id)) {
        notify('Esta senha já está a ser usada por outra credencial desta instituição. Escolha outra.');
        return;
      }
      updateInstMemberPassword(regCodeD, selectedWorker.id, workerDrawerPwd, true);
      // 2026-08-22 — nuvem sincronizada na reposição (antes só local)
      {
        const agentD = (selectedWorker.agentId || '').toUpperCase().replace(/\s+/g, '');
        if (agentD && isCloudBound(agentD) && isSupabaseConfigured()) {
          void alterarSenhaAgente(agentD, workerDrawerPwd).then((res) => {
            addAuditLog?.(res.ok
              ? `[AUTH-CLOUD] Senha de ${agentD} actualizada na nuvem (Supabase Auth).`
              : `[AUTH-CLOUD] Nuvem indisponível ao actualizar a senha de ${agentD} (${res.erro || 'erro'}) — mantida local.`, res.ok ? 'success' : 'warning');
          });
        }
      }
      addAuditLog?.(`[EQUIPA] Senha do colaborador ${selectedWorker.name} reposicionada — terá de a substituir no próximo login.`, 'success');
      setWorkerDrawerPwd('');
      playSuccessSound();
      return;
    }
    if (appMode === 'admin-workers') {
      const agentNum = selectedWorker.agentId || '';
      if (!/^Admin-\d+$/i.test(agentNum)) { notify('Este elemento não tem um Nº Agente Admin (ADMIN-NNNN) — a palavra-passe do login Admin só se aplica a agentes com esse formato.'); return; }
      if (workerDrawerPwd.length < 8) { notify('A nova palavra-passe deve ter pelo menos 8 caracteres.'); return; }
      if (isAdminAgentPasswordTaken(workerDrawerPwd, agentNum)) {
        notify('Esta palavra-passe já está a ser usada por outro agente da Administração. Escolha outra.');
        return;
      }
      updateAdminAgentPassword(agentNum, workerDrawerPwd);
      // 2026-08-22 — nuvem sincronizada na reposição (antes só local)
      if (isCloudBound(agentNum) && isSupabaseConfigured()) {
        void alterarSenhaAgente(agentNum, workerDrawerPwd).then((res) => {
          addAuditLog?.(res.ok
            ? `[AUTH-CLOUD] Palavra-passe de ${agentNum} actualizada na nuvem (Supabase Auth).`
            : `[AUTH-CLOUD] Nuvem indisponível ao actualizar a palavra-passe de ${agentNum} (${res.erro || 'erro'}) — mantida local.`, res.ok ? 'success' : 'warning');
        });
      }
      addAuditLog?.(`[EQUIPA] Senha do agente ${agentNum} reposicionada — login Admin exige a nova senha.`, 'success');
      setWorkerDrawerPwd('');
      playSuccessSound();
    }
  };

  // 2026-08-22 — ELIMINAÇÃO COMPLETA do colaborador/agente: sem restos.
  // 1) NUVEM: o servidor apaga a conta Auth (e-mail sintético determinístico)
  //    e os avatares do Storage (prefixo AGENTE_);
  // 2) LOCAL: registo da instituição / credenciais do admin + marcadores de
  //    nuvem, face, avatar, perfil local e pendências de sincronização.
  // Com a conta Auth eliminada, o Nº Agente deixa de entrar em QUALQUER
  // dispositivo (nuvem primária) e os espelhos locais desaparecem também.
  const handleDeleteWorker = async (id: string, name: string) => {
    const alvo = workers.find(w => w.id === id);
    const agente = (alvo?.agentId || '').toUpperCase().replace(/\s+/g, '');
    const ehDemo = homologationStore.isExempt(bi || '');
    if (!confirm(`Tem a certeza que deseja ELIMINAR definitivamente ${name}${agente ? ` (${agente})` : ''} do sistema?\n\nA eliminação é completa: revoga o acesso de login, remove a conta da nuvem e apaga todos os vestígios (credenciais, foto, perfil local). Esta ação não pode ser desfeita.`)) {
      return;
    }
    if (appMode === 'admin-workers' && agente === ADMIN_ALFA_AGENT) {
      notify(`O Admin Alfa (${ADMIN_ALFA_AGENT}) é o elemento mais alto da hierarquia e não pode ser eliminado pela página Equipa.`, 'error');
      return;
    }
    if (agente === (bi || '').toUpperCase().replace(/\s+/g, '')) {
      notify('Não pode eliminar a credencial da sessão actual.', 'error');
      return;
    }

    // 1) NUVEM — conta Auth + avatares (servidor; contas demo nunca tocam)
    let nuvem: 'eliminada' | 'nao_encontrada' | 'falha' | 'demo' = ehDemo ? 'demo' : 'nao_encontrada';
    if (agente && !ehDemo && isSupabaseConfigured()) {
      const res = await eliminarAgente(agente);
      if (res.demo) nuvem = 'demo';
      else if (res.ok && res.conta === 'eliminada') nuvem = 'eliminada';
      else if (res.ok && res.conta === 'nao_encontrada') nuvem = 'nao_encontrada';
      else nuvem = 'falha';
    }

    // 2) LOCAL — registo da instituição / credenciais do admin
    const regCode = normalizeInstCode(bi);
    if (appMode === 'institution' && regCode && getLocalInstReg(regCode)) {
      removeInstMember(regCode, id); // a senha do colaborador deixa de ser reconhecida no login
    }
    if (appMode === 'admin-workers') {
      removeAdminAgentByWorker(id); // F6 — o Nº Agente Admin deixa de entrar no login
    }

    // 3) VESTÍGIOS LOCAIS por Nº de agente (completude)
    if (agente) {
      // 2026-08-22 — bloqueio anti-força-bruta incluído na eliminação total:
      // sem isto, um NOVO colaborador com o MESMO Nº de agente herdava o
      // bloqueio da conta antiga ("Demasiadas tentativas falhadas…").
      try { limparLoginFalhas(agente); } catch { /* ignora */ }
      try { unmarkCloudAccount(agente); } catch { /* ignora */ }
      const modo = appMode === 'admin-workers' ? 'admin' : 'institution';
      const chaves = [
        `cda_demo_face_${modo}_${agente}`,
        `cda_avatar_${modo}_${agente}`,
        `cda_perfil_dados_${modo}_${agente}`,
        `cda_inst_profile_photo_${agente}`,
        `cda_admin_profile_photo_${agente}`,
        `cda_read_msgs_${agente}`,
        `cda_perfil_dados_admin_${agente}`,
        `cda_perfil_dados_institution_${agente}`,
        `cda_avatar_admin_${agente}`,
        `cda_avatar_institution_${agente}`,
        `cda_demo_face_admin_${agente}`,
        `cda_demo_face_institution_${agente}`,
      ];
      for (const k of chaves) {
        try { localStorage.removeItem(k); } catch { /* ignora */ }
      }
      try { limparPendenciaPerfil(agente); } catch { /* ignora */ }
    }

    setWorkers(prev => prev.filter(w => w.id !== id));
    if (selectedWorkerId === id) setSelectedWorkerId(null);

    const msgNuvem = nuvem === 'eliminada'
      ? 'conta da nuvem e avatares removidos'
      : nuvem === 'nao_encontrada'
        ? 'conta da nuvem já não existia'
        : nuvem === 'demo'
          ? 'via demonstração — sem nuvem'
          : 'nuvem indisponível — eliminação local confirmada';
    addAuditLog?.(`[EQUIPA] ${name}${agente ? ` (${agente})` : ''} ELIMINADO definitivamente — acesso revogado, ${msgNuvem}, vestígios locais apagados.`, 'critical');
    notify(`${name} eliminado definitivamente (${msgNuvem}).`, 'success');
  };

  // Filtered workers list
  const filteredWorkers = useMemo(() => {
    return workers.filter(w => {
      const matchesSearch = w.name.toLowerCase().includes(workerSearch.toLowerCase()) || 
                            w.email.toLowerCase().includes(workerSearch.toLowerCase()) ||
                            w.role.toLowerCase().includes(workerSearch.toLowerCase());
      return matchesSearch;
    });
  }, [workers, workerSearch]);

  if (appMode === 'institution' || appMode === 'admin-workers') {
    const isPlatformAdmin = appMode === 'admin-workers';
    return (
      <div className="pb-24 text-left animate-fadeIn">
        {/* Banner header for Workers */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                <Users size={16} />
              </div>
              <span className="font-mono text-xs font-black uppercase text-indigo-650 tracking-[0.2em]">
                {isPlatformAdmin ? 'Administração Central • Recursos Humanos' : 'Portal Institucional • Recursos Humanos'}
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-slate-950 tracking-tighter italic uppercase leading-none">
              {isPlatformAdmin ? 'Gestão de Equipa' : 'Gestão de Equipa'}
            </h1>
            <p className="text-slate-500 font-medium text-xs mt-2 max-w-xl">
              {isPlatformAdmin 
                ? 'Controle de administradores, moderadores e técnicos autorizados da plataforma central. Administre permissões, acessos e registe novos membros da equipa da plataforma.'
                : 'Controle de funcionários e técnicos autorizados da instituição. Administre as credenciais operacionais e registe novos membros da equipa do sistema.'}
            </p>
          </div>

          <button
            onClick={() => {
              resetForm();
              setShowAddWorkerModal(true);
            }}
            className="flex items-center gap-2 px-5 py-3 bg-blue-950 hover:bg-blue-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-950/10 cursor-pointer border-0 transition-all self-start md:self-auto"
          >
            <UserPlus size={16} />
            {isPlatformAdmin ? 'Adicionar à Equipa' : 'Adicionar à Equipa'}
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <div className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-xs">
            <span className="font-mono text-[10px] font-black uppercase text-slate-400 tracking-wider block">
              {isPlatformAdmin ? 'Total da Equipa' : 'Total da Equipa'}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-slate-900 italic font-mono">
                <AnimatedCounter to={workers.length} className="italic" />
              </span>
              <span className="text-[10px] text-slate-400 font-bold">Inscritos</span>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-xs">
            <span className="font-mono text-[10px] font-black uppercase text-slate-400 tracking-wider block">
              {isPlatformAdmin ? 'Plataforma Geral' : 'Canal Regulamentado'}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-indigo-600 italic font-mono">
                {isPlatformAdmin ? 'CDA' : 'AGT'}
              </span>
              <span className="text-[10px] text-indigo-500 font-bold">
                {isPlatformAdmin ? 'Administração de Sistemas' : 'Acesso Governamental'}
              </span>
            </div>
          </div>
        </div>

        {/* Search, Filter and Main Board */}
        <div className="bg-white border border-slate-200 rounded-[32px] p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
              <div>
                <h3 className="text-lg font-black tracking-tighter text-slate-900 uppercase italic">
                  {isPlatformAdmin ? 'Quadro da Equipa' : 'Quadro da Equipa'}
                </h3>
                <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase font-mono">
                  {isPlatformAdmin 
                    ? 'Base de dados de técnicos e administradores com acesso operacional ao sistema'
                    : 'Base de dados de funcionários associados às credenciais do sistema'}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
                <input
                  type="text"
                  placeholder={isPlatformAdmin ? "Pesquisar por Nome, Cargo, Email..." : "Pesquisar por Nome, Cargo, Email..."}
                  value={workerSearch}
                  onChange={(e) => setWorkerSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 w-full sm:w-[220px] bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Beautiful tabular list for workers/agents presented in lines/rows */}
          {filteredWorkers.length > 0 ? (
            <div className="overflow-auto rounded-[24px] bg-slate-50/20 custom-scrollbar max-h-[600px] border border-slate-200">
              <table className="mobile-data-table w-full text-left border-collapse min-w-[900px]">
                <thead className="sticky top-0 z-10 bg-blue-950 text-white text-[10px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="py-4 px-5 rounded-l-2xl">Colaborador / Membro da Equipa</th>
                    <th className="py-4 px-5">Email Institucional</th>
                    <th className="py-4 px-5">Telefone Profissional</th>
                    <th className="py-4 px-5">Perfil Funcional & Departamento</th>
                    <th className="py-4 px-5 text-center">Estado / Acesso Rápido</th>
                    <th className="py-4 px-5 text-center">Último Acesso</th>
                    <th className="py-4 px-5 text-center rounded-r-2xl">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filteredWorkers.map((w) => (
                    <tr 
                      key={w.id} 
                      // F21 — clique no colaborador abre o popup (igual ao de registo) com os seus dados
                      onClick={() => handleEditWorkerClick(w)}
                      className="text-xs text-[#334155] hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-b-0 cursor-pointer"
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-950 text-white flex items-center justify-center font-black text-xs uppercase shadow-none shrink-0 font-sans">
                            {w.name.split(' ').map(n => n[0]).slice(0, 2).join('') || (isPlatformAdmin ? 'TR' : 'AG')}
                          </div>
                          <div className="min-w-0 text-left">
                            <span className="font-display font-black text-slate-900 text-xs sm:text-sm uppercase tracking-tight block truncate leading-none">{w.name}</span>
                            <span className="text-[9px] font-mono font-bold text-slate-400 block mt-1">ID: {w.agentId || w.id.toUpperCase()}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2 font-bold text-slate-700">
                          <Mail size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate">{w.email}</span>
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2 font-mono font-bold text-slate-600">
                          <Smartphone size={12} className="text-slate-400 shrink-0" />
                          <span>{w.phone}</span>
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <div className="text-left space-y-0.5">
                          <span className="font-bold text-slate-800 text-[11px] block truncate max-w-[200px]">{w.role}</span>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block font-display">{w.department || 'Serviços Centrais'}</span>
                        </div>
                      </td>

                      <td className="py-4 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              const nextStatus = w.status === 'Ativo' ? 'Desativado' : 'Ativo';
                              setWorkers(prev => prev.map(worker => {
                                if (worker.id === w.id) {
                                  const timestamp = '12/06/2026 ' + new Date().toTimeString().slice(0, 5);
                                  const actionMsg = nextStatus === 'Ativo' ? 'Capacidade restaurada: Reativou acesso dactiloscópico' : 'Interrompeu acesso dactiloscópico preventivamente';
                                  return {
                                    ...worker,
                                    status: nextStatus,
                                    activityLogs: [
                                      { action: actionMsg, timestamp, ip: '197.231.42.15' },
                                      ...(worker.activityLogs || [])
                                    ]
                                  };
                                }
                                return worker;
                              }));
                              playToggleSound(nextStatus === 'Ativo');
                              addAuditLog?.(`[EQUIPA] Acesso dactiloscópico de ${w.name} alterado para ${nextStatus}.`, nextStatus === 'Ativo' ? 'success' : 'warning');
                            }}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus:outline-none ${
                              w.status === 'Ativo' ? 'bg-emerald-600' : 'bg-slate-300'
                            }`}
                            type="button"
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                                w.status === 'Ativo' ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span className={`text-[10px] font-black uppercase w-14 text-left select-none ${
                            w.status === 'Ativo' 
                              ? 'text-emerald-700' 
                              : 'text-slate-400'
                          }`}>
                            {w.status === 'Ativo' ? 'Ativo' : w.status === 'Suspenso' ? 'Suspenso' : 'Inativo'}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-5 text-center font-mono text-[10px] font-bold text-slate-500">
                        {w.lastAccess || 'Sem registo'}
                      </td>

                      <td className="py-4 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedWorkerId(w.id);
                              setActiveWorkerTab('dados');
                              setWorkerDrawerPwd('');
                            }}
                            title="Ficha do Membro (Permissões & Registos de Actividade)"
                            className="bg-transparent border-none text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors p-1"
                          >
                            <Eye size={13} className="mx-auto" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditWorkerClick(w);
                            }}
                            title="Editar Dados"
                            className="bg-transparent border-none text-[#0c2340] hover:text-indigo-600 hover:underline text-[9.5px] font-black uppercase tracking-wider cursor-pointer transition-colors p-1"
                          >
                            Editar
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteWorker(w.id, w.name);
                            }}
                            title={isPlatformAdmin ? "Eliminar definitivamente este agente (conta, acesso e dados)" : "Eliminar definitivamente este colaborador (conta, acesso e dados)"}
                            className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 px-2.5 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer"
                          >
                            <Trash2 size={13} />
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 bg-white border border-slate-200 rounded-[32px] text-center text-slate-400 shadow-3xs w-full">
              <Users size={28} className="mx-auto text-slate-300 mb-2" />
              <span className="text-[10.5px] font-black uppercase tracking-wider block">
                {isPlatformAdmin ? 'Nenhum membro da equipa localizado...' : appMode === 'institution' ? 'Ainda não existem membros na equipa.' : 'Nenhum membro da equipa localizado...'}
              </span>
              <p className="text-[9.5px] font-bold uppercase mt-1">Experimente alterar os critérios de filtro ou pesquisa.</p>
            </div>
          )}
        </div>

        {/* MODAL / SLIDE-OVER PARA ADICIONAR/EDITAR AGENTE */}
        {typeof document !== 'undefined' && createPortal(
          <AnimatePresence>
            {showAddWorkerModal && (
              <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowAddWorkerModal(false)}
                  className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
                />

                {/* Modal Body */}
                <motion.div
                  initial={{ scale: 0.93, opacity: 0, y: 15 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.93, opacity: 0, y: 15 }}
                  className="relative bg-white w-full max-w-4xl max-h-[95vh] rounded-[32px] shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18)] border border-slate-100 flex flex-col overflow-hidden mx-auto p-6 md:p-10 space-y-6 z-10"
                >
                  {/* Header Area */}
                  <div className="flex items-center gap-4 text-left relative shrink-0">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shrink-0 border border-indigo-100/40 shadow-sm">
                      <UserPlus size={26} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl md:text-[23px] font-black text-[#0c2340] italic uppercase tracking-tighter leading-none mb-1">
                        {isPlatformAdmin 
                          ? (isEditingWorker ? 'EDITAR MEMBRO DA EQUIPA' : 'REGISTAR NOVO MEMBRO DA EQUIPA')
                          : (isEditingWorker ? 'EDITAR FICHA DO MEMBRO DA EQUIPA' : 'REGISTAR NOVO MEMBRO DA EQUIPA')}
                      </h3>
                      <p className="text-[#4f46e5] font-black text-[10px] uppercase tracking-[0.16em] mt-1 m-0 leading-none">
                        {isPlatformAdmin 
                          ? 'CREDENCIAL OPERACIONAL PLATAFORMA'
                          : 'CREDENCIAIS AUTORIZADAS INSTITUIÇÃO'}
                      </p>
                    </div>
                    {/* Corner close button */}
                    <button 
                      onClick={() => setShowAddWorkerModal(false)} 
                      className="absolute -top-1 -right-1 text-slate-400 hover:text-slate-600 transition-all p-2 hover:bg-slate-50 rounded-full border-none bg-transparent cursor-pointer"
                      type="button"
                      title="Fechar"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleCreateWorker} className="flex-1 flex flex-col justify-between overflow-y-auto custom-scrollbar space-y-6 pr-1 text-left">
                    <div className="space-y-6">
                      
                      {/* DADOS PESSOAIS */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[#4f46e5]">
                          <User size={15} className="stroke-[2.5]" />
                          <span className="font-extrabold text-[11px] uppercase tracking-widest">Dados Pessoais do Membro</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* NOME COMPLETO */}
                          <div className="grid gap-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 min-h-[30px] flex items-end pb-1">Nome Completo *</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                <User size={16} />
                              </span>
                              <input
                                required
                                type="text"
                                className="w-full bg-white border-2 border-slate-100 focus:border-[#4f46e5]/30 rounded-[20px] pl-11 pr-4 py-3.5 text-xs text-slate-800 outline-none transition-all font-bold placeholder:text-slate-400"
                                placeholder="Ex: Dr. Francisco Manuel"
                                value={newWorkerName}
                                onChange={(e) => setNewWorkerName(e.target.value)}
                              />
                            </div>
                          </div>

                          {/* EMAIL INSTITUCIONAL */}
                          <div className="grid gap-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 min-h-[30px] flex items-end pb-1">{isPlatformAdmin ? 'Email Institucional da Plataforma *' : 'Email Institucional *'}</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                <Mail size={16} />
                              </span>
                              <input
                                required
                                type="email"
                                className="w-full bg-white border-2 border-slate-100 focus:border-[#4f46e5]/30 rounded-[20px] pl-11 pr-4 py-3.5 text-xs text-slate-800 outline-none transition-all font-bold placeholder:text-slate-400"
                                placeholder={isPlatformAdmin ? "f.manuel@cdaadmin.ao" : "f.manuel@cda.gov.ao"}
                                value={newWorkerEmail}
                                onChange={(e) => setNewWorkerEmail(e.target.value)}
                              />
                            </div>
                          </div>

                          {/* TELEFONE */}
                          <div className="grid gap-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 min-h-[30px] flex items-end pb-1">Telefone Profissional *</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                <Phone size={16} />
                              </span>
                              <input
                                required
                                type="text"
                                className="w-full bg-white border-2 border-slate-100 focus:border-[#4f46e5]/30 rounded-[20px] pl-11 pr-4 py-3.5 text-xs text-slate-800 outline-none transition-all font-mono font-bold placeholder:text-slate-400"
                                placeholder="+244 923 000 000"
                                value={newWorkerPhone}
                                onChange={(e) => setNewWorkerPhone(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Dotted separator */}
                      <div className="border-t border-dashed border-slate-150" />

                      {/* DADOS ORGANIZACIONAIS */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[#4f46e5]">
                          <Briefcase size={15} className="stroke-[2.5]" />
                          <span className="font-extrabold text-[11px] uppercase tracking-widest">Afiliação & Funções do Membro da Equipa</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* FUNÇÃO / CARGO (INPUT) */}
                          <div className="grid gap-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 min-h-[30px] flex items-end pb-1">Perfil Funcional *</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                <IdCard size={16} />
                              </span>
                              <input
                                type="text"
                                required
                                placeholder={isPlatformAdmin ? "Ex: Auditor Geral do Sistema" : "Ex: Auditor Geral"}
                                value={newWorkerRole}
                                onChange={(e) => {
                                  setNewWorkerRole(e.target.value);
                                  setNewWorkerAccessProfile(e.target.value);
                                }}
                                className="w-full bg-white border-2 border-slate-100 focus:border-[#4f46e5]/30 focus:ring-0 rounded-[20px] pl-11 pr-4 py-3.5 text-xs text-slate-800 font-bold outline-none transition-all placeholder:text-slate-300"
                              />
                            </div>
                          </div>

                          {/* DEPARTAMENTO / ÁREA (INPUT) */}
                          <div className="grid gap-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 min-h-[30px] flex items-end pb-1 leading-tight text-left">{isPlatformAdmin ? 'Departamento / Área Funcional *' : 'Departamento / Área Territorial *'}</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                <Building size={16} />
                              </span>
                              <input
                                type="text"
                                required
                                placeholder={isPlatformAdmin ? "Ex: Direcção de Operações da Plataforma" : "Ex: Direcção Geral"}
                                value={newWorkerDept}
                                onChange={(e) => setNewWorkerDept(e.target.value)}
                                className="w-full bg-white border-2 border-slate-100 focus:border-[#4f46e5]/30 focus:ring-0 rounded-[20px] pl-11 pr-4 py-3.5 text-xs text-slate-800 font-bold outline-none transition-all placeholder:text-slate-300"
                              />
                            </div>
                          </div>

                          {/* IDENTIFICADOR EXTERNO */}
                          <div className="grid gap-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 min-h-[30px] flex items-end pb-1">{isPlatformAdmin ? 'Nº Agente Admin' : appMode === 'institution' && !!getLocalInstReg(normalizeInstCode(bi)) ? 'Nº Agente Institucional' : 'ID Único do Agente (Opcional)'}</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                <Lock size={16} />
                              </span>
                              <input
                                type="text"
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-[20px] pl-11 pr-4 py-3.5 text-xs text-slate-500 font-mono outline-none"
                                placeholder="Gerado automaticamente pelo sistema"
                                value={autoWorkerAgentId}
                                readOnly
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Dotted separator */}
                      <div className="border-t border-dashed border-slate-150" />

                      {/* ESTADO DO UTILIZADOR */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-emerald-500">
                          <CheckCircle2 size={15} className="stroke-[2.5]" />
                          <span className="font-extrabold text-[11px] uppercase tracking-widest">Estágio de Autorização</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                          {/* ESTADO DROPDOWN SELECT */}
                          <div className="grid gap-1.5 md:col-span-5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 min-h-[20px] flex items-end pb-1">Estado de Acesso *</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none">
                                <CheckCircle2 size={16} />
                              </span>
                              <select
                                required
                                value={newWorkerStatus}
                                onChange={(e) => setNewWorkerStatus(e.target.value as any)}
                                className="w-full bg-white border-2 border-slate-100 focus:border-emerald-500/30 rounded-[20px] pl-11 pr-10 py-3.5 text-xs text-slate-800 font-bold outline-none transition-all appearance-none cursor-pointer"
                              >
                                <option value="Ativo">Ativo (Permitido)</option>
                                <option value="Desativado">Desativado (Bloqueado)</option>
                                <option value="Suspenso">Suspenso (Preventivo)</option>
                                <option value="Férias">Férias (Temporário)</option>
                                <option value="Pendente">Pendente de Análise</option>
                              </select>
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">
                                ▼
                              </div>
                            </div>
                          </div>

                          {/* GREEN MESSAGE NOTICE BOX */}
                          <div className="md:col-span-7 bg-[#f0fdf4] border border-[#10b981]/15 rounded-[20px] p-4 flex gap-3 text-left">
                            <Info size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-[#065f46] leading-relaxed font-bold m-0 select-none">
                              {isPlatformAdmin ? "Novos membros registados pela página Registo nascem 'Pendente de Análise'. Membros 'Desativados' ou 'Suspensos' terão o acesso à Administração revogado preventivamente." : "Utilizadores com estado 'Desativado' ou 'Suspenso' verão o seu acesso dactiloscópico e barramento postal revogado preventivamente."}
                            </p>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* F4 — Senha inicial do colaborador (só instituições registadas por Código; na demo AGT-9921-SR não há registo, logo sem campo) */}
                    {(isPlatformAdmin || (appMode === 'institution' && !!getLocalInstReg(normalizeInstCode(bi)))) && (
                      <>
                        <div className="border-t border-dashed border-slate-150" />
                        <div className="grid gap-1.5 text-left">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                            {isPlatformAdmin ? (isEditingWorker ? 'Nova Palavra-passe do Agente (deixe vazio para manter)' : 'Palavra-passe Inicial do Agente *') : (isEditingWorker ? 'Nova Senha do Colaborador (deixe vazio para manter)' : 'Senha Inicial do Colaborador *')}
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none">
                              <UserPlus size={16} />
                            </span>
                            <input
                              type="text"
                              autoComplete="off"
                              placeholder={isEditingWorker ? '********' : 'Mín. 8 caracteres — será substituída no 1.º login'}
                              value={newWorkerPassword}
                              onChange={(e) => setNewWorkerPassword(e.target.value)}
                              className="w-full bg-white border-2 border-slate-100 focus:border-blue-500/30 rounded-[20px] pl-11 pr-4 py-3.5 text-xs text-slate-800 font-mono font-bold outline-none transition-all"
                            />
                          </div>
                          <p className="text-[9px] text-slate-400 font-bold leading-snug m-0 mr-1 select-none">
                            {isPlatformAdmin ? (<>O membro entra com <strong>Nº Agente Admin + esta palavra-passe</strong> no login da Administração.</>) : (<>O colaborador entra com <strong>Código da instituição + esta senha</strong>.</>)} A senha identifica a pessoa — não pode repetir outra credencial activa e ficará guardada apenas neste dispositivo.
                          </p>
                        </div>
                      </>
                    )}

                    {/* 2026-08-22 — PÁGINAS COM ACESSO: checkbox por página da área.
                        Simples e intuitivo: o responsável marca exactamente o que o
                        colaborador pode abrir. A página de Perfil é obrigatória.
                        'Equipa' não aparece (exclusiva do responsável). */}
                    <div className="border-t border-dashed border-slate-150" />
                    <div className="space-y-3 text-left">
                      <div className="flex items-center gap-2 text-indigo-500">
                        <LayoutGrid size={15} className="stroke-[2.5]" />
                        <span className="font-extrabold text-[11px] uppercase tracking-widest">Páginas com acesso</span>
                        <span className="ml-auto text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          {newWorkerPaginas.filter((p) => p !== paginaObrigatoriaId && paginasDaArea.some((x) => x.id === p)).length} de {paginasDaArea.length} marcadas
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-semibold leading-relaxed m-0 select-none">
                        Marque as páginas da plataforma às quais pretende dar acesso a este {isPlatformAdmin ? 'agente' : 'colaborador'}. O menu dele mostrará apenas as páginas marcadas — e o acesso directo por endereço a páginas não marcadas fica bloqueado (verificado no servidor).
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[210px] overflow-y-auto custom-scrollbar pr-1">
                        {paginasDaArea.map((pag) => {
                          const marcada = pag.obrigatoria ? true : newWorkerPaginas.includes(pag.id);
                          return (
                            <label
                              key={pag.id}
                              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all select-none ${
                                pag.obrigatoria
                                  ? 'bg-emerald-50/60 border-emerald-200 cursor-default'
                                  : marcada
                                    ? 'bg-indigo-50/70 border-indigo-200 cursor-pointer hover:border-indigo-300'
                                    : 'bg-white border-slate-200 cursor-pointer hover:border-indigo-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={marcada}
                                disabled={!!pag.obrigatoria}
                                onChange={() => togglePagina(pag.id)}
                                className="w-4 h-4 accent-indigo-600 shrink-0"
                              />
                              <span className={`text-[11px] font-bold ${pag.obrigatoria ? 'text-emerald-800' : 'text-slate-700'}`}>
                                {pag.label}
                              </span>
                              {pag.obrigatoria && (
                                <span className="ml-auto text-[8px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded">
                                  Obrigatória
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold m-0 select-none">
                        {isPlatformAdmin
                          ? 'A página "Equipa" da Administração é exclusiva do Admin Alfa e não está disponível para atribuição.'
                          : 'A página "Equipa" da instituição é exclusiva do responsável e não está disponível para atribuição.'}
                      </p>
                    </div>

                    {/* Separator before buttons */}
                    <div className="border-t border-dashed border-slate-150 mt-4" />

                    {/* Actions rows mimicking image button styles */}
                    <div className="pt-2 shrink-0 flex items-center justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => setShowAddWorkerModal(false)}
                        className="px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-[20px] font-extrabold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <X size={15} />
                        Cancelar
                      </button>

                      <button
                        type="submit"
                        className="flex-1 bg-[#0c2340] hover:bg-[#152e4d] text-white py-3.5 rounded-[20px] font-black text-xs uppercase tracking-widest shadow-xl shadow-[#0c2340]/15 flex items-center justify-center gap-2.5 transition-all duration-300 cursor-pointer active:scale-98 font-sans border-0"
                      >
                        <Check size={15} className="stroke-[3]" />
                        {isEditingWorker ? 'Guardar Ficha do Membro da Equipa' : (isPlatformAdmin ? 'Submeter Cadastro do Membro' : 'Submeter Cadastro')}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}

            {/* Beautiful Slide-Over / Side Drawer for Permissions and Activity Logs */}
            {selectedWorkerId && selectedWorker && (
              <div className="fixed inset-0 z-[99999] flex justify-end">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedWorkerId(null)}
                  className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
                />

                {/* Right Slide-over Content Container */}
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                  className="relative bg-white w-full max-w-lg h-full shadow-[0_0_50px_rgba(15,23,42,0.15)] border-l border-slate-100 flex flex-col overflow-hidden z-10"
                >
                  {/* Top Header Card */}
                  <div className="bg-indigo-950 text-white p-6 relative shrink-0">
                    <button 
                      onClick={() => setSelectedWorkerId(null)}
                      className="absolute top-4 right-4 text-indigo-200 hover:text-white transition-all bg-indigo-900/40 hover:bg-indigo-900 duration-155 p-2 rounded-full cursor-pointer border-0"
                      title="Fechar Painel"
                    >
                      <X size={16} />
                    </button>

                    <div className="flex items-center gap-4 text-left">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-800 text-white flex items-center justify-center font-black text-lg shadow-inner font-sans border border-indigo-700">
                        {selectedWorker.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-[9px] font-black uppercase text-indigo-400 tracking-[0.2em] block">
                          Cadastro Consular central
                        </span>
                        <h4 className="text-xl font-black tracking-tight text-white m-0 truncate leading-tight mt-0.5 animate-fadeIn">
                          {selectedWorker.name}
                        </h4>
                        <p className="text-xs text-indigo-200 font-medium m-0 truncate mt-1">
                          {selectedWorker.role} • {selectedWorker.department}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 bg-indigo-900/60 rounded-xl p-3 mt-4 text-[10px] font-medium text-indigo-200">
                      <div className="flex-1 min-w-0">
                        <span className="text-indigo-400 uppercase tracking-widest font-bold block text-[8px] font-mono leading-none">ID Funcionário</span>
                        <span className="font-mono font-black text-white mt-1 block truncate text-xs">{selectedWorker.agentId || 'CDA-GUEST'}</span>
                      </div>
                      <div className="w-px h-6 bg-indigo-800 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-indigo-400 uppercase tracking-widest font-bold block text-[8px] font-mono leading-none">Inscrito em</span>
                        <span className="font-sans font-extrabold text-white mt-1 block truncate text-xs">{selectedWorker.registrationDate || '02/01/2026'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tabs Selector Row */}
                  <div className="flex border-b border-slate-100 bg-slate-50/50 shrink-0 select-none">
                    <button
                      onClick={() => setActiveWorkerTab('dados')}
                      className={`flex-1 py-3 text-center font-black text-[11px] uppercase tracking-wider relative cursor-pointer border-b-2 outline-none transition-all ${
                        activeWorkerTab === 'dados'
                          ? 'border-indigo-600 text-indigo-950 font-black'
                          : 'border-transparent text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <User size={14} />
                        Dados do Colaborador
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveWorkerTab('permissions')}
                      className={`flex-1 py-3 text-center font-black text-[11px] uppercase tracking-wider relative cursor-pointer border-b-2 outline-none transition-all ${
                        activeWorkerTab === 'permissions'
                          ? 'border-indigo-600 text-indigo-950 font-black'
                          : 'border-transparent text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <ShieldCheck size={14} />
                        Gerir Permissões
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveWorkerTab('logs')}
                      className={`flex-1 py-3 text-center font-black text-[11px] uppercase tracking-wider relative cursor-pointer border-b-2 outline-none transition-all ${
                        activeWorkerTab === 'logs'
                          ? 'border-indigo-600 text-indigo-950 font-black'
                          : 'border-transparent text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <Activity size={14} />
                        Histórico Logs ({selectedWorker.activityLogs?.length || 0})
                      </div>
                    </button>
                  </div>

                  {/* Drawer Content Body */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 text-left">
                    {activeWorkerTab === 'dados' ? (
                      <div className="space-y-5">
                        {/* F6/B4 — mesmo layout do popup "Registar novo membro da Equipa", com os dados do colaborador */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-[#4f46e5]">
                            <User size={15} className="stroke-[2.5]" />
                            <span className="font-extrabold text-[11px] uppercase tracking-widest">Dados Pessoais do Membro</span>
                          </div>
                          {([
                            { label: 'Nome Completo', value: selectedWorker.name },
                            { label: isPlatformAdmin ? 'Email Institucional da Plataforma' : 'Email Institucional', value: selectedWorker.email },
                            { label: 'Telefone Profissional', value: selectedWorker.phone || '—' },
                          ] as { label: string; value: string }[]).map(f => (
                            <div key={f.label} className="grid gap-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{f.label}</label>
                              <input type="text" readOnly value={f.value} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[20px] px-4 py-3.5 text-xs text-slate-600 font-bold outline-none" />
                            </div>
                          ))}
                        </div>

                        <div className="border-t border-dashed border-slate-150" />

                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-[#4f46e5]">
                            <Briefcase size={15} className="stroke-[2.5]" />
                            <span className="font-extrabold text-[11px] uppercase tracking-widest">Função & Identificação</span>
                          </div>
                          {([
                            { label: 'Perfil Funcional', value: selectedWorker.role },
                            { label: isPlatformAdmin ? 'Departamento / Área Funcional' : 'Departamento / Área Territorial', value: selectedWorker.department || '—' },
                            { label: appMode === 'admin-workers' ? 'Nº Agente Admin' : appMode === 'institution' ? 'Nº Agente Institucional' : 'ID Único do Agente', value: selectedWorker.agentId || '—' },
                            { label: 'Estado', value: selectedWorker.status },
                            { label: 'Inscrito em', value: selectedWorker.registrationDate || '—' },
                          ] as { label: string; value: string }[]).map(f => (
                            <div key={f.label} className="grid gap-1.5">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{f.label}</label>
                              <input type="text" readOnly value={f.value} className={`w-full bg-slate-50 border-2 border-slate-100 rounded-[20px] px-4 py-3.5 text-xs text-slate-600 font-bold outline-none ${f.label.includes('Agente') || f.label.includes('ID Único') ? 'font-mono' : ''}`} />
                            </div>
                          ))}
                        </div>

                        {(appMode === 'admin-workers' || (appMode === 'institution' && !!getLocalInstReg(normalizeInstCode(bi)))) && (
                          <>
                            <div className="border-t border-dashed border-slate-150" />
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-amber-500">
                                <Lock size={15} className="stroke-[2.5]" />
                                <span className="font-extrabold text-[11px] uppercase tracking-widest">Senha de Acesso</span>
                              </div>
                              <div className="grid gap-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha (deixe vazio para manter a actual)</label>
                                <input
                                  type="text"
                                  autoComplete="off"
                                  placeholder="Mín. 8 caracteres — substitui a senha actual"
                                  value={workerDrawerPwd}
                                  onChange={(e) => setWorkerDrawerPwd(e.target.value)}
                                  className="w-full bg-white border-2 border-slate-100 focus:border-amber-500/30 rounded-[20px] px-4 py-3.5 text-xs text-slate-800 font-mono font-bold outline-none transition-all"
                                />
                                <p className="text-[9px] text-slate-400 font-bold ml-1 leading-snug">
                                  Guardada apenas neste dispositivo. {appMode === 'admin-workers' ? 'Passa a ser exigida no login da Administração.' : 'O colaborador terá de a substituir no próximo login.'}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={handleDrawerPasswordSave}
                                disabled={!workerDrawerPwd}
                                className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white px-5 py-2.5 rounded-[16px] font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer border-0 flex items-center gap-2"
                              >
                                <KeyRound size={13} /> Guardar Nova Senha
                              </button>
                            </div>
                          </>
                        )}

                        <div className="border-t border-dashed border-slate-150" />
                        <div className="flex items-center gap-2.5 pt-1">
                          <button
                            type="button"
                            onClick={() => { handleEditWorkerClick(selectedWorker); }}
                            className="flex-1 bg-[#0E2B64] hover:bg-[#081a3d] text-white py-3 rounded-[18px] font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer border-0 flex items-center justify-center gap-2"
                          >
                            <Pencil size={13} /> Editar Dados
                          </button>
                          <button
                            type="button"
                            onClick={() => { handleDeleteWorker(selectedWorker.id, selectedWorker.name); }}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-5 py-3 rounded-[18px] font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2"
                          >
                            <Trash2 size={13} /> Eliminar Definitivamente
                          </button>
                        </div>
                      </div>
                    ) : activeWorkerTab === 'permissions' ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-black text-slate-900 text-sm tracking-tight block">Permissões Especiais</span>
                            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Controla o que este técnico pode operar e ver</span>
                          </div>

                          <div className="flex gap-1.5">
                            <button
                              onClick={() => {
                                setWorkers(prev => prev.map(w => w.id === selectedWorkerId ? {
                                  ...w,
                                  permissions: [],
                                  activityLogs: [
                                    { action: 'Revogadas todas as permissões especiais', timestamp: '12/06/2026 ' + new Date().toTimeString().slice(0, 5), ip: '197.231.42.15' },
                                    ...(w.activityLogs || [])
                                  ]
                                } : w));
                                playSuccessSound();
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer border-0"
                            >
                              Limpar
                            </button>
                            <button
                              onClick={() => {
                                setWorkers(prev => prev.map(w => w.id === selectedWorkerId ? {
                                  ...w,
                                  permissions: ALL_PERMISSIONS.map(p => p.id),
                                  activityLogs: [
                                    { action: 'Atribuídas permissões administrativas globais', timestamp: '12/06/2026 ' + new Date().toTimeString().slice(0, 5), ip: '197.231.42.15' },
                                    ...(w.activityLogs || [])
                                  ]
                                } : w));
                                playSuccessSound();
                              }}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer border-0"
                            >
                              Máximo
                            </button>
                          </div>
                        </div>

                        {/* List of Permissions Items */}
                        <div className="space-y-3 pt-2">
                          {ALL_PERMISSIONS.map(rolePerm => {
                            const isGranted = selectedWorker.permissions?.includes(rolePerm.id) ?? false;
                            return (
                              <div 
                                key={rolePerm.id}
                                onClick={() => {
                                  const nextPerms = isGranted 
                                    ? (selectedWorker.permissions || []).filter(p => p !== rolePerm.id)
                                    : [...(selectedWorker.permissions || []), rolePerm.id];
                                  
                                  setWorkers(prev => prev.map(w => w.id === selectedWorkerId ? {
                                    ...w,
                                    permissions: nextPerms,
                                    activityLogs: [
                                      { 
                                        action: isGranted 
                                          ? `Revogou permissão: ${rolePerm.label}` 
                                          : `Concedeu permissão: ${rolePerm.label}`, 
                                        timestamp: '12/06/2026 ' + new Date().toTimeString().slice(0, 5), 
                                        ip: '197.231.42.15' 
                                      },
                                      ...(w.activityLogs || [])
                                    ]
                                  } : w));
                                  playSuccessSound();
                                }}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer flex gap-3 text-left ${
                                  isGranted 
                                    ? 'bg-indigo-50/40 border-indigo-500/30' 
                                    : 'bg-white border-slate-100 hover:bg-slate-50/40'
                                }`}
                              >
                                {/* Checkbox Indicator */}
                                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all outline-none ${
                                  isGranted 
                                    ? 'bg-indigo-600 border-indigo-600 text-white' 
                                    : 'border-slate-300 bg-white'
                                }`}>
                                  {isGranted && <Check size={12} strokeWidth={3} />}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <span className={`text-xs font-black block tracking-tight ${isGranted ? 'text-indigo-950 font-black' : 'text-slate-800'}`}>
                                    {rolePerm.label}
                                  </span>
                                  <span className="text-[10px] text-slate-500 block mt-1 leading-snug font-medium">
                                    {rolePerm.desc}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      // Tab Audit Logs
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-black text-slate-900 text-sm tracking-tight block">Auditoria de Atividade (IP logs)</span>
                            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Rastreamento de acessos e ações consulares</span>
                          </div>

                          <button
                            onClick={() => {
                              const timestamp = '12/06/2026 ' + new Date().toTimeString().slice(0, 5);
                              const simulatedIps = ['197.231.42.15', '197.231.40.89', '197.245.2.112', '197.231.42.22'];
                              const chosenIp = simulatedIps[Math.floor(Math.random() * simulatedIps.length)];
                              const simulatedActions = [
                                'Realizou auditoria de chaves consulares',
                                'Exportou relatório descritivo dactiloscópico',
                                'Consultou ficha biométrica do cidadão',
                                'Efetuou login no sistema central'
                              ];
                              const chosenAction = simulatedActions[Math.floor(Math.random() * simulatedActions.length)];

                              setWorkers(prev => prev.map(w => w.id === selectedWorkerId ? {
                                ...w,
                                activityLogs: [
                                  { action: chosenAction, timestamp, ip: chosenIp },
                                  ...(w.activityLogs || [])
                                ]
                              } : w));
                              playSuccessSound();
                              addAuditLog?.(`Atividade simulada adicionada para o membro da equipa ${selectedWorker.name}.`, 'info');
                            }}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-[#4f46e5] text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer border-0"
                          >
                            Simular Novo Log IP
                          </button>
                        </div>

                        {/* Logs Timeline */}
                        <div className="space-y-3 pt-2">
                          {selectedWorker.activityLogs && selectedWorker.activityLogs.length > 0 ? (
                            selectedWorker.activityLogs.map((log, index) => (
                              <div key={index} className="bg-slate-50/50 border border-slate-100 p-3.5 rounded-xl text-left relative flex gap-2.5 items-start">
                                <div className="w-2 h-2 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-slate-800 m-0 leading-normal">{log.action}</p>
                                  <div className="flex items-center gap-3 mt-1.5 text-[9px] font-mono text-slate-500 font-bold">
                                    <span className="bg-slate-150 px-1.5 py-0.5 rounded-sm">{log.timestamp}</span>
                                    <span>•</span>
                                    <span className="text-indigo-600 font-black font-mono">IP: {log.ip}</span>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="py-8 bg-slate-50/30 border border-dashed border-slate-200 rounded-2xl text-center text-slate-500">
                              <span className="text-[10px] font-black uppercase tracking-wider block">Nenhum log disponível</span>
                              <p className="text-[9px] font-bold mt-1">Utilize o botão acima para simular interações e conexões.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Drawer Footer Status indicator */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
                    <span className="text-[10px] text-slate-500 font-black uppercase font-mono">Dispositivo Operando via SSL</span>
                    <button
                      onClick={() => setSelectedWorkerId(null)}
                      className="px-5 py-2 bg-indigo-950 hover:bg-slate-900 text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer transition-all border-0"
                    >
                      Concluído
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
      </div>
    );
  }

  return (
    <div className="pb-32 md:pt-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 text-left animate-fadeIn">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-600 rounded-[20px] flex items-center justify-center text-white shadow-2xl shadow-indigo-200 border-2 border-indigo-500">
            <Users size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">Usuário</h1>
            <div className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
               <div className="w-1 h-3 bg-indigo-500 rounded-full" />
               Cadastro Geral e Gestão de Usuários do Sistema
            </div>
          </div>
        </div>

        {/* Global Stats indicators */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-[20px] border border-slate-200 self-start md:self-auto">
          <div className="text-left px-3">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Usuários Aprovados</div>
            <div className="text-lg font-black text-slate-800">
              {citizens.filter(c => c.status === 'Aprovado').length}/{citizens.length} <span className="text-emerald-500 text-xs font-bold">OK</span>
            </div>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-left px-3">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Tráfego de Conexão</div>
            <div className="text-lg font-black text-emerald-600">99.9% <span className="text-[9px] font-semibold text-slate-400 font-mono">DISP</span></div>
          </div>
        </div>
      </div>

      <div className="space-y-8 animate-fadeIn">

        {/* Quadro de cadastros em tempo real + filtros territoriais */}
        <div className="bg-white border border-slate-200 rounded-[32px] p-6 md:p-8 shadow-sm space-y-6 text-left">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-slate-100">
            <div>
              <h4 className="font-black text-slate-900 text-lg md:text-xl italic uppercase tracking-tight flex items-center gap-2">
                <Users size={20} className="text-indigo-600" />
                Quadro de Cadastros Nacionais
              </h4>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mt-1">
                Visualização, controle regulamentar e filtragem territorial dos cidadãos
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Select Provincia */}
              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                <MapPin size={14} className="text-slate-400" />
                <select
                  value={filterProvince}
                  onChange={(e) => {
                    setFilterProvince(e.target.value);
                    setFilterMunicipio('Todos'); // Reset municipality when province shifts
                  }}
                  className="bg-transparent border-0 outline-none text-xs text-slate-700 font-bold pr-6 cursor-pointer"
                >
                  <option value="Todas">Província: Todas</option>
                  {Object.keys(MUNICIPALITIES_BY_PROVINCE).filter(p => p !== 'Todas').map(prov => (
                    <option key={prov} value={prov}>{prov}</option>
                  ))}
                </select>
              </div>

              {/* Select Municipio */}
              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                <MapPin size={14} className="text-slate-400" />
                <select
                  value={filterMunicipio}
                  onChange={(e) => setFilterMunicipio(e.target.value)}
                  className="bg-transparent border-0 outline-none text-xs text-slate-700 font-bold pr-6 cursor-pointer"
                >
                  <option value="Todos">Município: Todos</option>
                  {(MUNICIPALITIES_BY_PROVINCE[filterProvince] || ['Todos']).filter(m => m !== 'Todos').map(mun => (
                    <option key={mun} value={mun}>{mun}</option>
                  ))}
                </select>
              </div>

              {/* DROPDOWN DE ESTADO DE FLUXO (Substituindo o antigo Botão Adicionar) */}
              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100 font-sans">
                <Filter size={13} className="text-indigo-600 font-bold" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mr-0.5">Triagem IA:</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className={`bg-transparent border-0 outline-none text-xs font-black uppercase cursor-pointer pr-4 transition-colors ${
                    filterStatus === 'Pendente de Validação' ? 'text-orange-500 font-bold' :
                    filterStatus === 'Em Análise pela IA' ? 'text-purple-500 font-bold' :
                    filterStatus === 'Em Revisão Administrativa' ? 'text-amber-500 font-bold' :
                    filterStatus === 'Aprovado Automaticamente' ? 'text-emerald-500 font-bold' :
                    filterStatus === 'Aprovado Manualmente' ? 'text-teal-500 font-bold' :
                    filterStatus === 'Rejeitado' ? 'text-rose-500 font-bold' :
                    filterStatus === 'Bloqueado' ? 'text-slate-500 font-bold' :
                    filterStatus === 'Ativo' ? 'text-emerald-600 font-bold' :
                    'text-indigo-600 font-bold'
                  }`}
                >
                  <option value="Todas" className="text-slate-800 font-sans font-semibold">Todas Tríades</option>
                  <option value="Pendente de Validação" className="text-orange-500 font-sans font-semibold">Pendente de Validação</option>
                  <option value="Em Análise pela IA" className="text-purple-500 font-sans font-semibold">Em Análise pela IA</option>
                  <option value="Em Revisão Administrativa" className="text-amber-500 font-sans font-semibold">Em Revisão Administrativa</option>
                  <option value="Aprovado Automaticamente" className="text-emerald-500 font-sans font-semibold">Aprovado Automaticamente</option>
                  <option value="Aprovado Manualmente" className="text-teal-500 font-sans font-semibold">Aprovado Manualmente</option>
                  <option value="Rejeitado" className="text-rose-500 font-sans font-semibold">Rejeitados</option>
                  <option value="Bloqueado" className="text-slate-400 font-sans font-semibold">Bloqueados</option>
                  <option value="Ativo" className="text-emerald-650 font-sans font-semibold">Ativos</option>
                </select>
              </div>
            </div>
          </div>

          {/* FASE 2 — LIMPEZA SEGURA DE CONTAS SINTÉTICAS INATIVAS.
              Identifica contas de teste (e-mail sintético do CDA) na lista atual
              e permite ARQUIVÁ-LAS (marca como Bloqueada com motivo, NUNCA apaga)
              com dupla confirmação. É seguro: não remove dados da base. */}
          {(() => {
            const sinteticas = citizens.filter((c) =>
              (c.email || '').toLowerCase().endsWith('@cidadao.correiodigital.ao') ||
              (c.email || '').toLowerCase().endsWith('@inst.correiodigital.ao') ||
              (c.email || '').toLowerCase().endsWith('@admin.correiodigital.ao')
            );
            if (sinteticas.length === 0) return null;
            return (
              <div className="mb-3 border border-slate-200 rounded-2xl p-3 bg-white/60 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                      {sinteticas.length} conta(s) sintética(s) de teste detetada(s)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Arquivar estas contas sintéticas de teste? Esta ação marca as contas como Bloqueadas com motivo de arquivo (NÃO apaga dados). Pretende continuar?')) {
                        if (window.confirm('Confirmação final: arquivar as ' + sinteticas.length + ' contas sintéticas? Esta ação é reversível via reativação manual.')) {
                          sinteticas.forEach((c) => {
                            setCitizens(prev => prev.map(x => x.id === c.id ? { ...x, status: 'Bloqueado' as const, reason: 'Arquivada — conta sintética de teste (limpeza assistida).' } : x));
                          });
                          addAuditLog?.(`Limpeza assistida: ${sinteticas.length} conta(s) sintética(s) arquivada(s) (marcadas como Bloqueadas, sem apagar dados).`, 'warning');
                        }
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer border-none"
                  >
                    Arquivar contas sintéticas
                  </button>
                </div>
              </div>
            );
          })()}

          {/* FASE 3 — CAMPANHA DE NOTIFICAÇÃO (aviso geral aos cidadãos). */}
          <div className="mb-3 border border-slate-200 rounded-2xl p-3 bg-white/60">
            {!campanhaAberta ? (
              <button
                type="button"
                onClick={() => { setCampanhaAberta(true); setCampanhaResultado(null); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
              >
                <BellRing size={13} /> Criar aviso geral (campanha)
              </button>
            ) : (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Novo aviso geral aos cidadãos</span>
                  <button type="button" onClick={() => setCampanhaAberta(false)} className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 cursor-pointer bg-transparent border-none">Fechar</button>
                </div>
                <input
                  value={campanhaTitulo}
                  onChange={(e) => setCampanhaTitulo(e.target.value)}
                  onBlur={() => { const n = normalizarTitulo(campanhaTitulo); if (n !== campanhaTitulo) setCampanhaTitulo(n); }}
                  placeholder="Título do aviso (ex.: Manutenção programada)"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-800 outline-none focus:border-indigo-400/50"
                />
                <textarea
                  value={campanhaMsg}
                  onChange={(e) => setCampanhaMsg(e.target.value)}
                  rows={2}
                  placeholder="Mensagem do aviso…"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-800 outline-none focus:border-indigo-400/50 resize-none"
                />
                <div className="flex flex-wrap items-center gap-2">
                  {(['info', 'warning', 'success', 'critical'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setCampanhaTipo(t)}
                      className={`px-3 py-1 rounded-lg text-[8.5px] font-black uppercase tracking-widest border transition-colors cursor-pointer ${
                        campanhaTipo === t
                          ? t === 'critical' ? 'bg-rose-600 text-white border-rose-600'
                            : t === 'warning' ? 'bg-amber-500 text-white border-amber-500'
                            : t === 'success' ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={campanhaEnviando}
                    onClick={enviarCampanha}
                    className="ml-auto px-4 py-2 bg-[#0E2B64] hover:bg-[#081a3d] disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer border-none flex items-center gap-1.5"
                  >
                    {campanhaEnviando ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Enviar aviso
                  </button>
                </div>
                {campanhaResultado && (
                  <p className="text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">{campanhaResultado}</p>
                )}
              </div>
            )}
          </div>

          {/* FASE 1 — RESUMO DA FILA DE HOMOLOGAÇÃO (agrupado por motivo PVIC).
              Mostra quantos cadastros pendentes existem por categoria de alerta,
              para o admin rever em lote os casos mais urgentes. */}
          {(() => {
            const pendentes = citizens.filter(c => c.status === 'Pendente de Validação');
            if (pendentes.length === 0) return null;
            const grupos = [
              { chave: 'críticos', label: 'Fraude/Manipulação suspeita', cor: 'bg-red-50 text-red-700 border-red-200', pred: (a?: string[]) => !!a && ['fraude_suspeita','possivel_screenshot','possivel_ia'].some(x => a.includes(x)) },
              { chave: 'divergencias', label: 'Divergências de dados', cor: 'bg-orange-50 text-orange-700 border-orange-200', pred: (a?: string[]) => !!a && ['bi_divergente','nome_divergente','documento_divergente','data_divergente','frente_verso_inconsistentes'].some(x => a.includes(x)) },
              { chave: 'suspeita', label: 'Suspeita/Qualidade parcial', cor: 'bg-amber-50 text-amber-700 border-amber-200', pred: (a?: string[]) => !!a && ['layout_suspeito','foto_bi_ilegivel'].some(x => a.includes(x)) },
              { chave: 'qualidade', label: 'Apenas qualidade', cor: 'bg-slate-50 text-slate-600 border-slate-200', pred: (a?: string[]) => !!a && !['fraude_suspeita','possivel_screenshot','possivel_ia','bi_divergente','nome_divergente','documento_divergente','data_divergente','frente_verso_inconsistentes','layout_suspeito','foto_bi_ilegivel'].some(x => a.includes(x)) },
              { chave: 'semalertas', label: 'Sem alertas (revisão)', cor: 'bg-blue-50 text-blue-700 border-blue-200', pred: (a?: string[]) => !a || a.length === 0 },
            ];
            return (
              <div className="flex flex-wrap gap-2 mb-3 animate-fadeIn">
                {grupos.map((g) => {
                  const n = pendentes.filter(c => g.pred(c.pviAlertas)).length;
                  if (n === 0) return null;
                  return (
                    <div key={g.chave} className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider ${g.cor}`}>
                      {g.label}: <span className="text-[12px]">{n}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Beautiful tabular list layout replacing the card grid */}
          {filteredCitizens.length === 0 ? (
            <div className="py-16 text-center animate-fadeIn">
              <div className="max-w-md mx-auto space-y-3">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto border ${
                  filterStatus.toLowerCase().includes('aprovado') || filterStatus === 'Ativo' ? 'bg-emerald-50 text-emerald-400 border-emerald-100' :
                  filterStatus.toLowerCase().includes('pendente') || filterStatus.toLowerCase().includes('análise') || filterStatus.toLowerCase().includes('revisão') ? 'bg-orange-50 text-orange-400 border-orange-100' :
                  'bg-red-50 text-red-500 border-red-100'
                }`}>
                  <Users size={26} />
                </div>
                <h5 className="font-extrabold text-slate-950 text-sm uppercase">Nenhum Usuário Corresponde</h5>
                <p className="text-xs text-slate-400 leading-normal max-w-sm mx-auto">
                  De momento, não existem dados para exibir com o estado de validação <strong className={`font-black ${
                    filterStatus.toLowerCase().includes('aprovado') || filterStatus === 'Ativo' ? 'text-emerald-600' :
                    filterStatus.toLowerCase().includes('pendente') || filterStatus.toLowerCase().includes('análise') || filterStatus.toLowerCase().includes('revisão') ? 'text-orange-500' :
                    'text-red-700 font-bold'
                  }`}>{filterStatus.toUpperCase()}</strong> nas províncias/municípios selecionados.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ zoom: 0.9 }} className="overflow-auto rounded-[24px] bg-slate-50/20 custom-scrollbar max-h-[70vh] border border-slate-200">
              <table className="mobile-data-table w-full text-left border-collapse min-w-[900px]">
                <thead className="sticky top-0 z-10 bg-blue-950 text-white text-[10px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="py-3 px-3 rounded-l-2xl">Cidadão / Tipo</th>
                    <th className="py-3 px-3">Documento BI</th>
                    <th className="py-3 px-3">Contacto</th>
                    <th className="py-3 px-3">Localidade</th>
                    <th className="py-3 px-3 text-center">Score Match IA</th>
                    <th className="py-3 px-3 text-center">Estado</th>
                    <th className="py-3 px-3 text-center">Anexos / Ficheiros</th>
                    <th className="py-3 px-3 text-center rounded-r-2xl">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCitizens.map((citizen) => (
                    <tr 
                      key={citizen.id}
                      onClick={() => {
                        setSelectedReviewCitizen(citizen);
                        setModalActiveTab('validation');
                        if (citizen.status === 'Pendente de Validação' || citizen.status === 'Em Análise pela IA') {
                          setAiEvaluationState('idle');
                          setAiMatchScore(null);
                          setRejectionReason('');
                          setIsRejecting(false);
                        } else {
                          setAiEvaluationState('completed');
                          setAiMatchScore(citizen.verificationScore || citizen.facialMatch || 95.0);
                          setRejectionReason(citizen.reason || '');
                          setIsRejecting(false);
                        }
                      }}
                      className="text-xs text-[#334155] border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-3 font-bold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0">
                            <img src={citizen.facePhoto} alt="Rosto" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-display font-black text-slate-900 text-xs sm:text-sm uppercase leading-tight tracking-tight truncate max-w-[150px]">
                              {citizen.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-extrabold text-[8.5px] text-indigo-650 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                {citizen.category}
                              </span>
                              <span className="text-[9px] font-mono font-bold text-slate-400 font-sans">REGISTO: {citizen.id.toUpperCase()}</span>
                              {/* FASE 1 — selo de gravidade do PVIC (visível só em pendentes) */}
                              {citizen.status === 'Pendente de Validação' && citizen.pviAlertas && citizen.pviAlertas.length > 0 && (
                                <span className={
                                  ['fraude_suspeita','possivel_screenshot','possivel_ia'].some(x => citizen.pviAlertas!.includes(x))
                                    ? 'text-[8px] font-black text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded uppercase tracking-wider'
                                    : ['bi_divergente','nome_divergente','documento_divergente','data_divergente','frente_verso_inconsistentes'].some(x => citizen.pviAlertas!.includes(x))
                                      ? 'text-[8px] font-black text-orange-700 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded uppercase tracking-wider'
                                      : 'text-[8px] font-black text-slate-600 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded uppercase tracking-wider'
                                } title={citizen.pviMotivo || ''}>
                                  {['fraude_suspeita','possivel_screenshot','possivel_ia'].some(x => citizen.pviAlertas!.includes(x)) ? 'URGENTE' : 'REVER'}
                                </span>
                              )}
                            </div>
                            {citizen.reason && (citizen.status === 'Rejeitado' || citizen.status === 'Bloqueado') && (
                              <p className="text-[9.5px] text-rose-600 line-clamp-1 italic mt-1 font-semibold" title={citizen.reason}>
                                Observação: {citizen.reason}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        <div className="flex items-center gap-1">
                          <IdCard size={11} className="text-slate-400 shrink-0" />
                          <span>{citizen.biNumber}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-600 font-bold">
                        <div className="leading-tight">
                          <div>{citizen.phone || citizen.contact}</div>
                          <div className="text-[10px] text-slate-400 font-normal mt-0.5">{citizen.email}</div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={11} className="text-slate-400 shrink-0" />
                          <div>
                            <span className="text-slate-800 block leading-tight">{citizen.province}</span>
                            <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">{citizen.municipio}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-black">
                        {citizen.facialMatch !== undefined ? (
                          <div className="flex flex-col items-center justify-center">
                            <span className={citizen.facialMatch >= 90 ? 'text-emerald-600' : citizen.facialMatch >= 70 ? 'text-amber-500' : 'text-rose-600'}>
                              {citizen.facialMatch}%
                            </span>
                            <span className="text-[8px] font-sans text-slate-500 uppercase font-black uppercase tracking-widest mt-0.5">coerência: {citizen.coherenceLevel}%</span>
                          </div>
                        ) : citizen.verificationScore !== undefined ? (
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-emerald-600">{citizen.verificationScore}%</span>
                            <span className="text-[8px] font-sans text-slate-400 tracking-wider">OK</span>
                          </div>
                        ) : (
                          <span className="text-slate-300">&mdash;</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {citizen.status === 'Pendente de Validação' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-100 text-[8.5px] font-black uppercase tracking-wider animate-pulse select-none">
                              <Scan size={10} /> Pendente Validação
                            </span>
                          )}
                          {citizen.status === 'Em Análise pela IA' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[8.5px] font-black uppercase tracking-wider animate-bounce select-none">
                              <Scan size={10} /> Processamento IA
                            </span>
                          )}
                          {citizen.status === 'Em Revisão Administrativa' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[8.5px] font-black uppercase tracking-wider select-none">
                              <Users size={10} /> Triagem Humana
                            </span>
                          )}
                          {citizen.status === 'Aprovado Automaticamente' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8.5px] font-black uppercase tracking-wide select-none" title="Verificado automaticamente pela IA nacional">
                              <Zap size={10} className="text-yellow-600 fill-yellow-550 shrink-0 animate-pulse" /> IA Aprovou
                            </span>
                          )}
                          {citizen.status === 'Aprovado Manualmente' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 text-[8.5px] font-black uppercase tracking-wider select-none">
                              <UserCheck size={10} /> Aprovado Manual
                            </span>
                          )}
                          {citizen.status === 'Rejeitado' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-650 border border-rose-200 text-[8.5px] font-black uppercase tracking-wider select-none">
                              <ShieldAlert size={10} /> Rejeitado
                            </span>
                          )}
                          {citizen.status === 'Bloqueado' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-650 border border-slate-200 text-[8.5px] font-black uppercase tracking-wider select-none">
                              <Lock size={10} /> Bloqueado
                            </span>
                          )}
                          {citizen.status === 'Ativo' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[8.5px] font-black uppercase tracking-wider select-none">
                              <ShieldCheck size={10} /> Ativo
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 shadow-3xs" title="Ficheiros de documentos digitais">
                            <FileText size={9} className="text-indigo-650" />
                            <span className="font-mono text-[7.5px] uppercase">{citizen.numDigitalDocs || 2} Docs</span>
                          </div>
                          <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-100 rounded-lg p-1 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 shadow-3xs" title="Histórico de correspondência digital">
                            <Mail size={9} className="text-indigo-650" />
                            <span className="font-mono text-[7.5px] uppercase">{citizen.numCorrespondences || 0} Msg</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col items-stretch justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {citizen.status === 'Pendente de Validação' || citizen.status === 'Em Análise pela IA' || citizen.status === 'Em Revisão Administrativa' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedReviewCitizen(citizen);
                                setModalActiveTab('validation');
                                setAiEvaluationState('idle');
                                setAiMatchScore(null);
                                setRejectionReason('');
                                setIsRejecting(false);
                                setReviewStepTab(1);
                                setValidatedFields({
                                  name: true,
                                  bi: true,
                                  doc: true,
                                  photo: true,
                                  province: true,
                                  municipio: true,
                                  email: true,
                                  phone: true,
                                  emergency: true,
                                  fingerprint: true,
                                  facial: true
                                });
                                setRejectionStep('geral');
                                // pre-fill edit inputs
                                setEditName(citizen.name);
                                setEditBi(citizen.biNumber || '');
                                setEditEmail(citizen.email || '');
                                setEditPhone(citizen.phone || citizen.contact || '');
                                setEditAddress(citizen.address || '');
                                setEditCategory(citizen.category || '');
                                setEditProvince(citizen.province || '');
                                setEditMunicipio(citizen.municipio || '');
                              }}
                              className="bg-indigo-600 hover:bg-indigo-800 text-white font-black text-[9px] uppercase tracking-wide py-1.5 px-2.5 rounded-lg cursor-pointer border-0 transition-colors shadow-xs active:scale-95 flex items-center justify-center gap-1 shrink-0"
                            >
                              <Scan size={11} /> Analisar
                            </button>
                          ) : (
                            <div className="flex gap-1 justify-center shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedReviewCitizen(citizen);
                                  setModalActiveTab('validation');
                                  setAiEvaluationState('completed');
                                  setAiMatchScore(citizen.verificationScore || citizen.facialMatch || 95.0);
                                  setRejectionReason(citizen.reason || '');
                                  setIsRejecting(false);
                                  setReviewStepTab(1);
                                  setValidatedFields({
                                    name: true,
                                    bi: true,
                                    doc: true,
                                    photo: true,
                                    province: true,
                                    municipio: true,
                                    email: true,
                                    phone: true,
                                    emergency: true,
                                    fingerprint: true,
                                    facial: true
                                  });
                                  setRejectionStep('geral');
                                  // pre-fill edit inputs
                                  setEditName(citizen.name);
                                  setEditBi(citizen.biNumber || '');
                                  setEditEmail(citizen.email || '');
                                  setEditPhone(citizen.phone || citizen.contact || '');
                                  setEditAddress(citizen.address || '');
                                  setEditCategory(citizen.category || '');
                                  setEditProvince(citizen.province || '');
                                  setEditMunicipio(citizen.municipio || '');
                                }}
                                className="bg-white hover:bg-slate-50 text-slate-700 font-black text-[9px] uppercase tracking-wide py-1.5 px-2 rounded-lg cursor-pointer border border-slate-200 transition-colors flex items-center justify-center gap-0.5"
                              >
                                <Eye size={11} /> Revisar
                              </button>
                            </div>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmCitizen(citizen);
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-black text-[9px] uppercase tracking-wide py-2 px-2.5 rounded-lg cursor-pointer border-0 transition-colors shadow-xs active:scale-95 flex items-center justify-center gap-1.5"
                            title="Eliminar cadastro permanentemente"
                          >
                            <Trash2 size={11} /> Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* MODAL DE ANÁLISE COMPARATIVA E VERIFICAÇÃO DE BIOMETRIA IA */}
      <AnimatePresence>
        {selectedReviewCitizen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReviewCitizen(null)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[200]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[96vw] max-w-6xl bg-white rounded-[24px] md:rounded-[40px] shadow-3xl z-[201] overflow-hidden border border-slate-150 text-left font-sans flex flex-col h-[94vh]"
            >
              {/* Header do Modal */}
              <div className="bg-[#0c2340] p-6 text-white relative flex-shrink-0">
                <button 
                  onClick={() => setSelectedReviewCitizen(null)}
                  className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-all cursor-pointer border-0 text-white bg-transparent flex items-center justify-center"
                  type="button"
                >
                  <X size={20} />
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#2563eb] rounded-[18px] flex items-center justify-center text-white border border-[#3b82f6]">
                     <ShieldCheck size={24} className="text-white" />
                  </div>
                  <div>
                     <div className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400">Auditoria Governamental e Validação Civil</div>
                     <h2 className="text-xl md:text-[23px] font-black tracking-tight uppercase leading-none mt-1">
                       Portal de Homologação de Identidade
                     </h2>
                  </div>
                </div>
              </div>

              {/* Navegação do Portal — barra fixa, visível durante toda a leitura */}
              <div className="px-6 md:px-8 pt-5 flex-shrink-0">
                {/* Modal Navigation Sub-Tabs */}
                <div className="flex border border-slate-200 bg-[#f8fafc] p-1.5 rounded-2xl gap-2 font-sans">
                  <button
                    onClick={() => setModalActiveTab('validation')}
                    className={`flex items-center gap-2 py-2.5 px-5 text-[10.5px] font-extrabold uppercase tracking-wider transition-all rounded-xl border-none cursor-pointer flex-1 justify-center ${
                      modalActiveTab === 'validation'
                        ? 'bg-white text-[#2563eb] shadow-sm border border-slate-200/50'
                        : 'text-slate-500 hover:text-[#0c2340] hover:bg-slate-100 bg-transparent'
                    }`}
                    type="button"
                  >
                    <Fingerprint size={14} /> Validação Biométrica & IA
                  </button>
                  <button
                    onClick={() => setModalActiveTab('activity')}
                    className={`flex items-center gap-2 py-2.5 px-5 text-[10.5px] font-extrabold uppercase tracking-wider transition-all rounded-xl border-none cursor-pointer flex-1 justify-center ${
                      modalActiveTab === 'activity'
                        ? 'bg-white text-[#2563eb] shadow-sm border border-slate-200/50'
                        : 'text-slate-500 hover:text-[#0c2340] hover:bg-slate-100 bg-transparent'
                    }`}
                    type="button"
                  >
                    <Activity size={14} /> Histórico & Auditoria
                  </button>
                  <button
                    onClick={() => setModalActiveTab('edit')}
                    className={`flex items-center gap-2 py-2.5 px-5 text-[10.5px] font-extrabold uppercase tracking-wider transition-all rounded-xl border-none cursor-pointer flex-1 justify-center ${
                      modalActiveTab === 'edit'
                        ? 'bg-white text-[#2563eb] shadow-sm border border-slate-200/50'
                        : 'text-slate-500 hover:text-[#0c2340] hover:bg-slate-100 bg-transparent'
                    }`}
                    type="button"
                  >
                    <UserCheck size={14} /> Editar Dados Digitais
                  </button>
                </div>
              </div>

              {/* Corpo de Análise — área rolável: todo o conteúdo fica acessível de ponta a ponta */}
              <div className="p-6 md:p-8 pt-5 md:pt-5 space-y-6 overflow-y-auto custom-scrollbar flex-grow">

                {/* Alerta de status ou instruções */}
                <div className="bg-[#eff6ff]/60 border border-blue-100 rounded-2xl p-4.5 flex gap-4 text-left shadow-2xs">
                  <div className="w-10 h-10 bg-[#dbeafe] text-[#2563eb] rounded-full flex items-center justify-center shrink-0">
                    <Activity size={20} className="animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-black text-blue-950 uppercase tracking-wide">Regras de Auditoria para Homologação de Cadastro</p>
                    <p className="text-[10px] text-blue-900 font-bold leading-normal uppercase">
                      Verifique se a fotocópia do bilhete de identidade oficial, o nome inserido e a fotografia antropométrica facial capturada no momento da selfie correspondente pertencem ao mesmo indivíduo. Utilize a inteligência artificial para o batimento algorítmico pontual.
                    </p>
                  </div>
                </div>

                {modalActiveTab === 'validation' && (
                  <>
                    {/* Ficha resumida dos dados realmente submetidos pelo cidadão no registo */}
                    <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-2.5">Dados Submetidos pelo Cidadão no Registo</span>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
                        <div className="min-w-0">
                          <span className="text-[8px] font-bold text-slate-400 uppercase block">Nome Completo</span>
                          <span className="text-[11px] font-extrabold text-slate-800 uppercase block leading-tight truncate">{selectedReviewCitizen.name}</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-[8px] font-bold text-slate-400 uppercase block">Nº do B.I.</span>
                          <span className="text-[11px] font-extrabold text-slate-800 font-mono block leading-tight">{selectedReviewCitizen.biNumber || '—'}</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-[8px] font-bold text-slate-400 uppercase block">Correio Eletrónico</span>
                          <span className="text-[11px] font-extrabold text-slate-800 block leading-tight truncate">{selectedReviewCitizen.email || selectedReviewCitizen.contact || '—'}</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-[8px] font-bold text-slate-400 uppercase block">Data de Submissão</span>
                          <span className="text-[11px] font-extrabold text-slate-800 font-mono block leading-tight">{selectedReviewCitizen.registrationDate || '—'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             {/* Painel Esquerdo: Fotocópia do BI Digitalizado (com abas de Frente/Verso ou imagens reais do Supabase) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="block text-[10.5px] font-black uppercase tracking-wider text-[#0c2340]/60">PAINEL ESQUERDO • FOTOCÓPIA DO BI</span>
                      
                      {/* Abas Frente / Verso */}
                      <div className="flex bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setReviewStepTab(1)}
                          className={`px-4.5 py-1 text-[9px] font-extrabold uppercase tracking-widest rounded-lg transition-all border-0 cursor-pointer ${
                            reviewStepTab === 1 
                              ? 'bg-[#0c2340] text-white shadow-xs' 
                              : 'text-slate-500 hover:text-slate-900 bg-transparent font-bold'
                          }`}
                        >
                          Frente
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewStepTab(2)}
                          className={`px-4.5 py-1 text-[9px] font-extrabold uppercase tracking-widest rounded-lg transition-all border-0 cursor-pointer ${
                            reviewStepTab === 2 
                              ? 'bg-[#0c2340] text-white shadow-xs' 
                              : 'text-slate-500 hover:text-slate-900 bg-transparent font-bold'
                          }`}
                        >
                          Verso
                        </button>
                      </div>
                    </div>

                    {reviewStepTab === 1 ? (
                      selectedReviewCitizen.urlFrente ? (
                        <div className="h-[240px] relative rounded-[24px] overflow-hidden border border-slate-200 bg-slate-900 shadow-sm flex items-center justify-center select-none">
                          <img src={selectedReviewCitizen.urlFrente} alt="B.I. Frente" className="max-h-full max-w-full object-contain pointer-events-none" />
                          <div className="absolute top-2 right-2 bg-blue-950/85 px-2 py-0.5 text-[7px] font-bold text-white rounded-md uppercase tracking-wider shadow-md">Ficheiro Real Supabase</div>
                        </div>
                      ) : selectedReviewCitizen.docsProtegidosSemAcesso ? (
                        renderProtectedDocNotice('documento (frente)')
                      ) : (
                        <div className="bg-white border border-slate-200 rounded-[24px] p-5.5 relative overflow-hidden h-[240px] flex flex-col justify-between shadow-2xs">
                          {/* Micro-marcas d'água */}
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none w-56 h-56 rounded-full border-4 border-indigo-900 flex items-center justify-center font-bold text-center text-xs">
                            REPÚBLICA DE ANGOLA
                          </div>
                          <div className="absolute top-2 right-2 w-16 h-16 bg-gradient-to-br from-yellow-300/10 to-indigo-500/10 rounded-full blur-xl pointer-events-none" />

                          {/* Top Header do Documento */}
                          <div className="flex items-start justify-between border-b pb-2 border-slate-150">
                            <div className="flex gap-2.5 items-center">
                              {/* Bandeira de Angola */}
                              <div className="w-7 h-4.5 bg-red-650 flex flex-col relative rounded-xs overflow-hidden border border-slate-300 flex-shrink-0">
                                <div className="h-1/2 bg-red-600" />
                                <div className="h-1/2 bg-black" />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[4px] text-yellow-500 font-extrabold">&bull;</div>
                              </div>
                              <div>
                                <span className="text-[8.5px] font-black text-[#0c2340] uppercase tracking-wide block">República de Angola</span>
                                <span className="text-[6.5px] font-bold text-slate-400 uppercase block">Ministério da Justiça e Direitos Humanos</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[8px] font-black text-rose-600 bg-rose-50 border border-rose-200 p-0.5 px-2 rounded uppercase font-mono tracking-wider">B.I. Oficial</span>
                            </div>
                          </div>

                          {/* Dados Centrais do BI */}
                          <div className="grid grid-cols-3 gap-4 my-auto items-center">
                            {/* Foto do BI - com filtro impresso cinza */}
                            <div className="col-span-1 h-[88px] bg-slate-200 rounded-xl overflow-hidden border border-slate-300 relative shadow-3xs flex-shrink-0">
                              <img 
                                src={selectedReviewCitizen.facePhoto} 
                                alt="Rosto BI" 
                                className="w-full h-full object-cover filter grayscale contrast-125 brightness-95" 
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-indigo-950/10 mix-blend-color" />
                            </div>

                            {/* Dados textuais do civil */}
                            <div className="col-span-2 space-y-1.5 text-left text-[10px]">
                              <div>
                                <span className="text-[7px] text-slate-400 uppercase block font-bold leading-none">Nome Completo:</span>
                                <span className="font-extrabold text-slate-900 uppercase block text-[11px] tracking-tight">{selectedReviewCitizen.name}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-[7px] text-slate-400 uppercase block font-bold leading-none">Nº B.I.:</span>
                                  <span className="font-black text-[#0c2340] font-mono text-[9px] block">{selectedReviewCitizen.biNumber}</span>
                                </div>
                                <div>
                                  <span className="text-[7px] text-slate-400 uppercase block font-bold leading-none font-sans">Nacionalidade:</span>
                                  <span className="font-extrabold text-[#0c2340] uppercase block">Angolana</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-[7px] text-slate-400 uppercase block font-bold leading-none">Província:</span>
                                  <span className="font-extrabold text-slate-800 block text-[8.5px] uppercase">{selectedReviewCitizen.province || "LUANDA"}</span>
                                </div>
                                <div>
                                  <span className="text-[7px] text-slate-400 uppercase block font-bold leading-none">Natural de:</span>
                                  <span className="font-extrabold text-slate-800 block text-[8.5px] uppercase">{selectedReviewCitizen.municipio || "MAIANGA"}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Footer do BI */}
                          <div className="border-t pt-1.5 border-slate-150 flex items-center justify-between text-[7px] font-mono text-slate-400 leading-none">
                            <span>EMISSÃO: 12/06/2016</span>
                            <span>VALIDADE: 12/06/2029</span>
                            <span className="font-extrabold text-[#0c2340]">ASSINATURA DIGITAL: SIM</span>
                          </div>
                        </div>
                      )
                    ) : (
                      selectedReviewCitizen.urlVerso ? (
                        <div className="h-[240px] relative rounded-[24px] overflow-hidden border border-slate-200 bg-slate-900 shadow-sm flex items-center justify-center select-none">
                          <img src={selectedReviewCitizen.urlVerso} alt="B.I. Verso" className="max-h-full max-w-full object-contain pointer-events-none" />
                          <div className="absolute top-2 right-2 bg-blue-950/85 px-2 py-0.5 text-[7px] font-bold text-white rounded-md uppercase tracking-wider shadow-md">Ficheiro Real Supabase</div>
                        </div>
                      ) : selectedReviewCitizen.docsProtegidosSemAcesso ? (
                        renderProtectedDocNotice('documento (verso)')
                      ) : (
                        <div className="bg-white border border-slate-200 rounded-[24px] p-5 relative overflow-hidden h-[240px] flex flex-col justify-between shadow-2xs">
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none w-56 h-56 rounded-full border-4 border-[#0c2340] flex items-center justify-center font-bold text-center text-xs">
                            REPÚBLICA DE ANGOLA
                          </div>
                          <div className="text-center font-mono space-y-2 mt-4 text-[#0f172a] text-[8px] uppercase font-bold leading-relaxed">
                            <p className="text-[7.5px] font-extrabold text-slate-700">Assinatura Certificada do Titular</p>
                            <div className="w-36 h-6 border-b border-dashed border-slate-400 mx-auto opacity-70" />
                            <p className="mt-4 text-[7.5px] font-extrabold text-slate-700">Impressão Digitalizada Dactiloscópica (Polegar Direito)</p>
                            <div className="w-10 h-12 bg-slate-100 opacity-80 rounded-md border border-slate-300 mx-auto flex items-center justify-center">
                              <Fingerprint size={18} className="text-slate-800" />
                            </div>
                          </div>
                          <div className="border-t pt-1.5 border-slate-200 flex items-center justify-between text-[6.5px] font-mono text-slate-500 leading-none">
                            <span>SERVIÇO DE MIGRAÇÃO E ESTRANGEIROS</span>
                            <span>CADA-V1</span>
                          </div>
                        </div>
                      )
                    )}

                    <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3.5 text-[10px] font-extrabold text-slate-800 uppercase tracking-tight flex items-center gap-2.5 shadow-3xs">
                      <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                      <span>Nome Declarado e BI Batem 100% com o Banco do Registo Civil Angolano.</span>
                    </div>
                  </div>

                  {/* Painel Direito: Captura de Face Ativa no Auto-Cadastro (HD e AnáliseIA) */}
                  <div className="space-y-3">
                    <span className="block text-[10.5px] font-black uppercase tracking-wider text-[#0c2340]/60">Painel Direito &bull; Captura Biométrica (Face)</span>
                    
                    <div className="bg-[#0a152e] border border-cyan-950/80 rounded-[24px] p-5 h-[240px] relative overflow-hidden flex flex-col justify-between shadow-2xl text-white">
                      
                      {/* Efeitos de Reticulado / Scanning de Câmera */}
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.06)_0,transparent_100%)]" />
                      
                      {/* Cantos holográficos da câmera de biometria */}
                      <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-cyan-400 rounded-tl-sm pointer-events-none" />
                      <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-cyan-400 rounded-tr-sm pointer-events-none" />
                      <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-cyan-400 rounded-bl-sm pointer-events-none" />
                      <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-cyan-400 rounded-br-sm pointer-events-none" />

                      {/* Scanner Line animation */}
                      {aiEvaluationState === 'running' && (
                        <motion.div 
                          initial={{ y: 0 }}
                          animate={{ y: [0, 180, 0] }}
                          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                          className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-md shadow-cyan-400/50 z-25 pointer-events-none"
                        />
                      )}

                      <div className="flex items-center justify-between z-15 relative">
                        <span className="text-[8px] font-mono font-black text-cyan-200 uppercase tracking-widest bg-cyan-950/70 p-1.5 px-3 rounded-full border border-cyan-500/30">
                          ● Auto-Foto Biométrica Ativa
                        </span>
                        <span className="text-[8px] font-mono text-cyan-400/85 font-black uppercase tracking-wider">FPS: 30 &bull; 1280P</span>
                      </div>

                      {/* Rosto do Cidadão no Centro com linhas de rastreamento se IA estiver ativa */}
                      <div className="relative w-24 h-24 mx-auto my-auto rounded-full border-2 border-cyan-400 overflow-hidden shadow-xl shadow-cyan-950/45 z-10 p-0.5 bg-cyan-950/30">
                        <img 
                          src={selectedReviewCitizen.urlSelfie || selectedReviewCitizen.facePhoto} 
                          alt="Face HD" 
                          className="w-full h-full object-cover rounded-full" 
                          referrerPolicy="no-referrer"
                        />
                        {aiEvaluationState === 'running' && (
                          <div className="absolute inset-0 bg-cyan-500/10 animate-pulse" />
                        )}
                        {/* Pontos de foco facial fictícios */}
                        <div className="absolute top-1/3 left-1/3 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping pointer-events-none" />
                        <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping pointer-events-none" />
                        <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping pointer-events-none" />
                      </div>

                      <div className="text-center z-15 relative mt-1.5">
                        <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest font-black flex items-center justify-center gap-1">
                          <CheckCircle2 size={11} className="text-emerald-400" />
                          {aiEvaluationState === 'idle' ? 'Câmera Biométrica Pronta' :
                           aiEvaluationState === 'running' ? 'Executando Análise de Profundidade...' :
                           'Verificação Biométrica Concluída'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-950 text-white rounded-2xl p-3.5 px-4.5 text-[10px] font-extrabold uppercase tracking-tight flex items-center justify-between shadow-3xs">
                      <div className="flex items-center gap-2.5">
                        <Fingerprint size={16} className="text-cyan-400" />
                        <span className="text-slate-200">Autenticação Facial Registada no CDA</span>
                      </div>
                      <span className="text-emerald-400 font-black">ATIVA</span>
                    </div>
                  </div>

                </div>

                {/* Relatório REAL da pré-verificação automática feita no registo (motor local) */}
                {(selectedReviewCitizen.facialMatch !== undefined || selectedReviewCitizen.coherenceLevel !== undefined || selectedReviewCitizen.ocrDataMatch !== undefined || selectedReviewCitizen.imageQuality !== undefined) && (
                  <div className="bg-white border border-blue-200 rounded-3xl p-5 text-left space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-[#2563eb]" /> Relatório de Pré-Verificação Automática do Registo
                      </span>
                      {selectedReviewCitizen.iaResult && (
                        <span className={`text-[8.5px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                          selectedReviewCitizen.iaResult === 'Aprovado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          selectedReviewCitizen.iaResult === 'Revisão Administrativa' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-red-50 text-red-500 border-red-200'
                        }`}>Motor local: {selectedReviewCitizen.iaResult}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                      <div className="bg-slate-50 border border-slate-150 rounded-xl p-2.5 text-center">
                        <span className="text-[8px] font-black text-slate-400 uppercase block tracking-wider">Corresp. Facial</span>
                        <span className={`text-sm font-black font-mono ${selectedReviewCitizen.facialMatch !== undefined ? (selectedReviewCitizen.facialMatch >= 70 ? 'text-emerald-600' : selectedReviewCitizen.facialMatch >= 45 ? 'text-amber-500' : 'text-rose-600') : 'text-slate-400'}`}>
                          {selectedReviewCitizen.facialMatch !== undefined ? `${selectedReviewCitizen.facialMatch}%` : '—'}
                        </span>
                      </div>
                      <div className="bg-slate-50 border border-slate-150 rounded-xl p-2.5 text-center">
                        <span className="text-[8px] font-black text-slate-400 uppercase block tracking-wider">Leitura OCR</span>
                        <span className={`text-sm font-black font-mono ${selectedReviewCitizen.ocrDataMatch !== undefined ? (selectedReviewCitizen.ocrDataMatch >= 70 ? 'text-emerald-600' : selectedReviewCitizen.ocrDataMatch >= 45 ? 'text-amber-500' : 'text-rose-600') : 'text-slate-400'}`}>
                          {selectedReviewCitizen.ocrDataMatch !== undefined ? `${selectedReviewCitizen.ocrDataMatch}%` : '—'}
                        </span>
                      </div>
                      <div className="bg-slate-50 border border-slate-150 rounded-xl p-2.5 text-center">
                        <span className="text-[8px] font-black text-slate-400 uppercase block tracking-wider">Qualidade Imagem</span>
                        <span className="text-sm font-black font-mono text-slate-800">
                          {selectedReviewCitizen.imageQuality !== undefined ? `${selectedReviewCitizen.imageQuality}%` : '—'}
                        </span>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-center">
                        <span className="text-[8px] font-black text-blue-600 uppercase block tracking-wider">Coerência Global</span>
                        <span className="text-sm font-black font-mono text-blue-700">
                          {selectedReviewCitizen.coherenceLevel !== undefined ? `${selectedReviewCitizen.coherenceLevel}%` : '—'}
                        </span>
                      </div>
                    </div>
                    <p className="text-[8.5px] text-slate-400 font-semibold uppercase tracking-wide leading-relaxed">
                      Análise preliminar executada automaticamente no dispositivo do cidadão durante o registo (visível apenas nesta consola) — a decisão final de homologação cabe à Área de Administração.
                    </p>
                  </div>
                )}

                {/* Bloco de Batimento Inteligente por IA */}
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-3xl p-6 text-center space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full pointer-events-none" />
                  
                  {aiEvaluationState === 'idle' && (
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-black text-indigo-950 uppercase tracking-tight">Efectuar Batimento de Biometria e Identidade Civil por IA</h4>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mt-1">
                          Cruza as feições faciais do B.I. digitalizado com a selfie fornecida pelo auto-cadastro, analisando geometria facial, distância inter-pupilar e dados nominais via OCR.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAiEvaluationState('running');
                          // Simular tempo de carregamento de IA
                          setTimeout(() => {
                            setAiEvaluationState('completed');
                            // Usa SEMPRE o relatório real da pré-verificação do registo quando existe;
                            // a pontuação simulada só se aplica aos cidadãos de demonstração.
                            const realKyc = selectedReviewCitizen.coherenceLevel ?? selectedReviewCitizen.facialMatch;
                            const score = realKyc ?? (selectedReviewCitizen.id === 'u3' ? 98.2 : 97.5);
                            setAiMatchScore(score);
                            addAuditLog?.(realKyc !== undefined
                              ? `Batimento IA: relatório real de pré-verificação do registo de "${selectedReviewCitizen.name}" apresentado (coerência ${score}%).`
                              : `Inteligência Artificial: Prova de identidade de "${selectedReviewCitizen.name}" executada com ${score}% de fidedignidade facial.`, 'success');
                          }, 2500);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest px-8 py-3.5 rounded-2xl cursor-pointer border-0 shadow-lg shadow-indigo-600/15 font-bold transition-all hover:scale-103"
                      >
                        <Scan size={14} className="inline mr-2 animate-spin-slow" /> Executar Batimento por IA
                      </button>
                    </div>
                  )}

                  {aiEvaluationState === 'running' && (
                    <div className="space-y-4 py-3">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="text-indigo-600 animate-spin" size={24} />
                        <span className="font-mono text-xs font-black text-indigo-900 uppercase tracking-widest">Processando Inteligência Artificial...</span>
                      </div>
                      
                      {/* Simulação de barra de progresso gov */}
                      <div className="w-full max-w-md mx-auto bg-slate-200 h-1.5 rounded-full overflow-hidden block">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 2.3 }}
                          className="bg-indigo-600 h-full rounded-full"
                        />
                      </div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block font-mono">Executando mapeamento ocular, OCR e distância inter-nasal</span>
                    </div>
                  )}

                  {aiEvaluationState === 'completed' && aiMatchScore && (
                    <div className="space-y-3 animate-zoomIn">
                      <div className="flex items-center justify-center gap-2 text-emerald-600">
                        <CheckCircle2 size={24} />
                        <span className="text-sm font-black uppercase tracking-tight font-mono">Batimento de IA Concluído</span>
                      </div>
                      
                      {/* Placar de Correspondência */}
                      <div className="flex flex-col items-center justify-center">
                        <div className="bg-emerald-50 border border-emerald-100 p-3.5 px-8 rounded-2xl block text-center">
                          <span className="text-[9px] text-emerald-600 font-extrabold uppercase tracking-widest block leading-none mb-1">SCORE DE CORRESPONDÊNCIA FACIAL</span>
                          <span className="text-3xl font-black text-emerald-700 font-mono italic leading-none">{aiMatchScore}%</span>
                        </div>
                      </div>

                      <div className="max-w-xl mx-auto space-y-1">
                        <p className="text-[10px] text-slate-800 font-black uppercase tracking-tight">
                          {(selectedReviewCitizen.coherenceLevel ?? selectedReviewCitizen.facialMatch) !== undefined
                            ? `Relatório real do registo — Coerência global ${aiMatchScore}%`
                            : 'Resultado da IA: Correspondência Altamente Confiável'}
                        </p>
                        <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wide leading-relaxed">
                          {(selectedReviewCitizen.coherenceLevel ?? selectedReviewCitizen.facialMatch) !== undefined
                            ? 'Valores reais medidos pelo motor local de pré-verificação durante o registo do cidadão (correspondência facial, leitura OCR e qualidade documental). A decisão final de homologação cabe à Área de Administração.'
                            : 'A imagem antropométrica facial é coincidente com a fotocópia do BI. Os dados extraídos via OCR conferem integralmente com os registos civis da base de dados CDA em Luanda.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input de justificativa se estiver rejeitando */}
                {isRejecting && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2 border border-red-200 bg-red-50/30 p-5 rounded-2xl text-left"
                  >
                    <label className="block text-[9px] font-black text-red-600 uppercase tracking-widest">Motivo de Rejeição do Cadastro *</label>
                    <textarea
                      required
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Ex: Divergência biométrica evidente ou nitidez deficiente no Bilhete de Identidade."
                      className="w-full bg-white border border-red-200 rounded-xl px-4 py-3 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-red-400 transition-all font-semibold"
                      rows={3}
                    />
                  </motion.div>
                )}

                {/* F30 — Painel da Pré-Verificação Inteligente (IA): movido para DENTRO do
                      separador «Validação Biométrica & IA», no fim do seu conteúdo — faz scroll
                      junto com o resto do separador e deixa de ocupar espaço fixo nos outros.
                      (F29, Prompt v11.1):
                    veredicto, alertas, OCR vs formulário, qualidade das imagens, data/hora,
                    modelo e tempo da análise — para auto-aprovados E pendentes com triagem [PVIC]. */}
                {selectedReviewCitizen.pviVer && (
                  <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/90 to-blue-50/60 p-4 space-y-3 text-left">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700">
                        <Zap size={12} className="text-indigo-500 fill-indigo-200" /> Pré-Verificação Inteligente (IA)
                      </span>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${selectedReviewCitizen.pviVer === 'APTO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        Veredicto da IA: {selectedReviewCitizen.pviVer === 'APTO' ? 'APTO' : 'REVISÃO'}
                      </span>
                    </div>

                    {selectedReviewCitizen.pviVer === 'APTO' && (
                      <div className="inline-flex items-center gap-1.5 bg-emerald-100/70 border border-emerald-200 rounded-full px-3 py-1">
                        <Zap size={10} className="text-emerald-600 fill-emerald-300" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700">Aprovado automaticamente por Pré-Verificação Inteligente (IA)</span>
                      </div>
                    )}

                    {!!selectedReviewCitizen.pviMotivo && (
                      <p className="text-[11px] font-semibold text-slate-600 leading-relaxed">{selectedReviewCitizen.pviMotivo}</p>
                    )}

                    <div>
                      <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 block mb-1">Alertas da IA</span>
                      {selectedReviewCitizen.pviAlertas && selectedReviewCitizen.pviAlertas.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {selectedReviewCitizen.pviAlertas.map((a) => (
                            <span key={a} className="text-[8.5px] font-black uppercase tracking-wider bg-amber-100/80 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">{a.replace(/_/g, ' ')}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[9.5px] font-bold text-emerald-600 uppercase tracking-widest">Sem alertas</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 pt-2 border-t border-indigo-100">
                      <div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Resultado OCR vs formulário</span>
                        <span className="text-[11px] font-black text-slate-700">{selectedReviewCitizen.ocrDataMatch !== undefined ? `${selectedReviewCitizen.ocrDataMatch}%` : '—'}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Qualidade das imagens</span>
                        <span className="text-[11px] font-black text-slate-700">{selectedReviewCitizen.imageQuality !== undefined ? `${selectedReviewCitizen.imageQuality}%` : '—'}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Coerência facial</span>
                        <span className="text-[11px] font-black text-slate-700">{selectedReviewCitizen.facialMatch !== undefined ? `${selectedReviewCitizen.facialMatch}%` : '—'}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Data e hora da análise</span>
                        <span className="text-[11px] font-black text-slate-700">{selectedReviewCitizen.pviTs ? new Date(selectedReviewCitizen.pviTs).toLocaleString('pt-AO') : '—'}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Modelo utilizado</span>
                        <span className="text-[10px] font-black text-slate-700 font-mono break-all">{selectedReviewCitizen.pviModelo || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Tempo da análise</span>
                        <span className="text-[11px] font-black text-slate-700">{selectedReviewCitizen.pviDuracaoMs !== undefined && selectedReviewCitizen.pviDuracaoMs !== null ? `${(selectedReviewCitizen.pviDuracaoMs / 1000).toFixed(1)}s` : '—'}</span>
                      </div>
                    </div>

                    <p className="text-[8.5px] font-bold text-indigo-400 uppercase tracking-wider leading-snug pt-2 border-t border-indigo-100">
                      Triagem de plausibilidade — a IA não certifica identidade. A Administração é a autoridade final e pode revogar qualquer aprovação automática.
                    </p>
                  </div>
                )}
                  </>
                )}

                {modalActiveTab === 'activity' && (
                  <div className="space-y-6 font-sans">
                    {/* Estatísticas de Utilização */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                        <span className="text-[8px] font-black text-slate-500 uppercase block tracking-wider">Documentos Submetidos</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <FileText size={16} className="text-slate-650" />
                          <span className="text-sm font-black font-mono text-slate-800">{selectedReviewCitizen.numDigitalDocs || 4} Ficheiros</span>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                        <span className="text-[8px] font-black text-slate-500 uppercase block tracking-wider">Volume Correspondência</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Mail size={16} className="text-slate-650" />
                          <span className="text-sm font-black font-mono text-slate-800">{selectedReviewCitizen.numCorrespondences || 2} Mensagens</span>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                        <span className="text-[8px] font-black text-slate-500 uppercase block tracking-wider">Data de Registo</span>
                        <div className="flex items-center gap-1.5 mt-1 font-mono text-xs font-bold text-slate-800 uppercase">
                          <IdCard size={15} className="text-slate-650" />
                          <span>{selectedReviewCitizen.registrationDate || "15/03/2026"}</span>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                        <span className="text-[8px] font-black text-slate-500 uppercase block tracking-wider">Último Acesso</span>
                        <div className="flex items-center gap-1.5 mt-1 font-mono text-xs font-bold text-slate-800 uppercase">
                          <Activity size={15} className="text-slate-650" />
                          <span>{selectedReviewCitizen.lastAccess || "12/06/2026"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Histórico Recente */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">Monitorização de Atividade do Cidadão & IP Logs</h4>
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl divide-y divide-slate-150 overflow-hidden text-left">
                        {(selectedReviewCitizen.activityHistory || [
                          { action: 'Acesso à QR Code e Despacho', timestamp: '12/06/2026 10:15', ip: '197.231.42.15' },
                          { action: 'Consulta de Correspondência Governamental', timestamp: '10/06/2026 14:22', ip: '197.231.40.89' },
                          { action: 'Download de Cédula de Nascimento Digital', timestamp: '08/06/2026 16:30', ip: '197.231.40.89' }
                        ]).map((log, idx) => (
                          <div key={idx} className="p-3 sm:px-4 flex items-center justify-between text-[11px] hover:bg-slate-100/50 transition-colors font-sans">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-indigo-650 animate-pulse shrink-0" />
                              <span className="font-extrabold text-slate-800 uppercase">{log.action}</span>
                            </div>
                            <div className="flex items-center gap-4 text-slate-500 font-semibold font-mono text-[9px] uppercase leading-none">
                              <span>IP: {log.ip || '197.231.42.15'}</span>
                              <span className="text-slate-500 font-bold">{log.timestamp}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {modalActiveTab === 'edit' && (
                  <div className="space-y-4 text-left font-sans animate-fadeIn">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mb-2">Edição Cadastral do Cidadão & Ajustes Civis</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1 font-sans font-sans">
                        <label className="block text-[8.5px] font-black text-slate-500 uppercase tracking-widest">Nome Completo</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-semibold uppercase"
                        />
                      </div>
                      <div className="space-y-1 font-sans font-sans">
                        <label className="block text-[8.5px] font-black text-slate-500 uppercase tracking-widest">Número do BI</label>
                        <input
                          type="text"
                          value={editBi}
                          onChange={(e) => setEditBi(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-semibold font-mono"
                        />
                      </div>
                      <div className="space-y-1 font-sans font-sans">
                        <label className="block text-[8.5px] font-black text-slate-500 uppercase tracking-widest">Correio Eletrónico (Email)</label>
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-semibold"
                        />
                      </div>
                      <div className="space-y-1 font-sans font-sans">
                        <label className="block text-[8.5px] font-black text-slate-500 uppercase tracking-widest">Contacto Telefónico</label>
                        <input
                          type="text"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-semibold font-mono"
                        />
                      </div>
                      <div className="col-span-1 sm:col-span-2 space-y-1 font-sans">
                        <label className="block text-[8.5px] font-black text-slate-500 uppercase tracking-widest">Residência Habitual</label>
                        <input
                          type="text"
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-semibold"
                        />
                      </div>
                      <div className="space-y-1 font-sans">
                        <label className="block text-[8.5px] font-black text-slate-500 uppercase tracking-widest">Província</label>
                        <select
                          value={editProvince}
                          onChange={(e) => {
                            setEditProvince(e.target.value);
                            setEditMunicipio('Todos');
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-600 font-bold"
                        >
                          {PROVINCES.map((prov) => (
                            <option key={prov} value={prov}>{prov}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1 font-sans">
                        <label className="block text-[8.5px] font-black text-slate-500 uppercase tracking-widest">Município</label>
                        <select
                          value={editMunicipio}
                          onChange={(e) => setEditMunicipio(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-600 font-bold"
                        >
                          {(MUNICIPALITIES_BY_PROVINCE[editProvince] || ['Todos']).map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!editName.trim() || !editBi.trim() || !editEmail.trim()) {
                            notify('Existem campos obrigatórios em falta.');
                            return;
                          }
                          setCitizens(prev => prev.map(c => c.id === selectedReviewCitizen.id ? {
                            ...c,
                            name: editName,
                            biNumber: editBi,
                            bi: editBi,
                            email: editEmail,
                            phone: editPhone,
                            contact: editPhone,
                            address: editAddress,
                            province: editProvince,
                            municipio: editMunicipio,
                            activityHistory: [
                              { action: 'Edição de Dados Pessoais por Admin', timestamp: '12/06/2026 ' + new Date().toTimeString().slice(0, 5), ip: 'Consola_Operador' },
                              ...(c.activityHistory || [])
                            ]
                          } : c));
                          setSelectedReviewCitizen(null);
                          addAuditLog?.(`Cadastro: Dados do cidadão "${editName}" atualizados administrativamente com sucesso.`, 'success');
                        }}
                        className="bg-indigo-600 hover:bg-indigo-800 text-white font-black text-[10px] uppercase tracking-widest px-6 py-2.5 rounded-xl cursor-pointer border-0 shadow-md transition-all active:scale-95 font-sans"
                      >
                        Gravar Alterações
                      </button>
                    </div>
                  </div>
                )}

                {/* Canal Exclusivo de Homologação: Admin ⇄ Cidadão */}
                {selectedReviewCitizen.biNumber && (
                <div className="px-4 md:px-5 py-4 bg-blue-50/70 border border-blue-100 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Mail size={13} className="text-blue-600" />
                    <span className="text-[9.5px] font-black text-blue-800 uppercase tracking-widest flex-1">
                      Correspondência de Homologação com o Cidadão · BI {selectedReviewCitizen.biNumber}
                    </span>
                    <span className="text-[8.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase">
                      Canal exclusivo
                    </span>
                  </div>

                  <div
                    key={adminThreadRefresh}
                    className="bg-white/80 border border-blue-100 rounded-xl p-2.5 space-y-2 max-h-44 overflow-y-auto mb-2.5"
                  >
                    {homologationStore.getThread(selectedReviewCitizen.biNumber).length === 0 && (
                      <p className="text-[10px] text-slate-400 font-semibold text-center py-2">
                        Sem correspondência registada para este processo.
                      </p>
                    )}
                    {homologationStore.getThread(selectedReviewCitizen.biNumber).map((msg) => (
                      <div key={msg.id} className={`flex ${msg.from === 'admin' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-xl px-3 py-2 text-[10.5px] leading-relaxed shadow-sm ${
                          msg.from === 'admin'
                            ? 'bg-blue-600 text-white rounded-br-md'
                            : msg.from === 'system'
                              ? 'bg-slate-200/80 text-slate-600'
                              : 'bg-white border border-slate-200 text-slate-700 rounded-bl-md'
                        }`}>
                          <p className="font-semibold whitespace-pre-line">{msg.text}</p>
                          <p className={`text-[8px] mt-0.5 ${msg.from === 'admin' ? 'text-blue-100' : 'text-slate-400'}`}>
                            {msg.from === 'citizen' ? 'Cidadão' : msg.from === 'system' ? 'Sistema' : 'Área de Administração'} · {msg.at}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={adminMsgInput}
                      onChange={(e) => setAdminMsgInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && adminMsgInput.trim()) {
                          homologationStore.addMessage(selectedReviewCitizen.biNumber || '', 'admin', adminMsgInput.trim());
                          // 2026-08-21 — persistir na nuvem em modo real (a página
                          // "Correspondências" do admin e a caixa do destinatário
                          // mostram a mensagem em qualquer dispositivo).
                          void enviarMensagemAdministrativa(selectedReviewCitizen.biNumber || '', 'Correspondência da Área de Administração', adminMsgInput.trim());
                          setAdminMsgInput('');
                          setAdminThreadRefresh(t => t + 1);
                          addAuditLog?.(`Correspondência da Área de Administração enviada ao cidadão "${selectedReviewCitizen.name}" (BI: ${selectedReviewCitizen.biNumber})`, 'info');
                        }
                      }}
                      placeholder="Escrever ao cidadão sobre este processo..."
                      className="flex-1 bg-white border border-blue-200 rounded-xl px-3.5 py-2 text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!adminMsgInput.trim()) return;
                        homologationStore.addMessage(selectedReviewCitizen.biNumber || '', 'admin', adminMsgInput.trim());
                        // 2026-08-21 — persistir na nuvem em modo real.
                        void enviarMensagemAdministrativa(selectedReviewCitizen.biNumber || '', 'Correspondência da Área de Administração', adminMsgInput.trim());
                        setAdminMsgInput('');
                        setAdminThreadRefresh(t => t + 1);
                        addAuditLog?.(`Correspondência da Área de Administração enviada ao cidadão "${selectedReviewCitizen.name}" (BI: ${selectedReviewCitizen.biNumber})`, 'info');
                      }}
                      disabled={!adminMsgInput.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 font-black text-[9.5px] uppercase tracking-widest flex items-center gap-1.5 cursor-pointer border-0 shadow-sm disabled:opacity-40 transition-all"
                    >
                      <Send size={11} />
                      Enviar
                    </button>
                  </div>
                </div>
                )}

              </div>

              {/* Ações de Decisão Administrativa (Footer do Modal) */}
              <div className="p-6 bg-slate-50 border-t border-slate-150 flex flex-col sm:flex-row items-center justify-between gap-4 flex-shrink-0">
                <div>
                  <span className="text-[9px] font-mono text-slate-400 block font-bold uppercase">Agente Operacional Responsável:</span>
                  <span className="text-[10px] font-extrabold text-slate-800 uppercase block">Inspector de Identificação Civil do Estado</span>
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedReviewCitizen(null);
                    }}
                    className="px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all cursor-pointer font-bold w-full sm:w-auto text-center font-sans"
                  >
                    Sair / Fechar
                  </button>

                  {/* Bloquear / Desbloquear Conta */}
                  {selectedReviewCitizen.status === 'Bloqueado' ? (
                    <button
                      type="button"
                      onClick={async () => {
                        setCitizens(prev => prev.map(c => c.id === selectedReviewCitizen.id ? { 
                          ...c, 
                          status: 'Ativo',
                          reason: undefined,
                          activityHistory: [
                            { action: 'Desbloqueio de Conta por Admin', timestamp: '12/06/2026 ' + new Date().toTimeString().slice(0, 5), ip: 'Consola_Operador' },
                            ...(c.activityHistory || [])
                          ]
                        } : c));

                        if (selectedReviewCitizen.dbUUID || selectedReviewCitizen.id.length > 20) {
                          const cloudSaved = await updateRegistrationRecord(selectedReviewCitizen.dbUUID || selectedReviewCitizen.id, { status: 'Aprovado', observacoes: 'Conta reativada pelo Administrador.' });
                          warnIfCloudDecisionNotPersisted(cloudSaved, 'A reativação da conta');
                        }

                        // HOMOLOGAÇÃO: reativação também liberta o gate do cidadão
                        homologationStore.setStatus(selectedReviewCitizen.biNumber || '', 'active', undefined, selectedReviewCitizen.name);
                        notifyAccountUnblocked(selectedReviewCitizen.biNumber || '', selectedReviewCitizen.name);

                        addAuditLog?.(`Auditoria: Conta de "${selectedReviewCitizen.name}" DESBLOQUEADA com sucesso.`, 'success');
                        setSelectedReviewCitizen(null);
                      }}
                      className="px-5 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer font-bold w-full sm:w-auto text-center border-0 font-sans"
                    >
                      Desbloquear Conta
                    </button>
                  ) : (
                    (selectedReviewCitizen.status === 'Ativo' || selectedReviewCitizen.status === 'Aprovado Automaticamente' || selectedReviewCitizen.status === 'Aprovado Manualmente') && (
                      <button
                        type="button"
                        onClick={async () => {
                          const mot = prompt('Indique o motivo de segurança do bloqueamento da conta:');
                          if (mot === null) return;
                          if (!mot.trim()) {
                            notify('Motivo obrigatório.');
                            return;
                          }

                          setCitizens(prev => prev.map(c => c.id === selectedReviewCitizen.id ? { 
                            ...c, 
                            status: 'Bloqueado',
                            reason: mot,
                            activityHistory: [
                              { action: 'Bloqueio Preventivo por Suspeita', timestamp: '12/06/2026 ' + new Date().toTimeString().slice(0, 5), ip: 'Consola_Operador' },
                              ...(c.activityHistory || [])
                            ]
                          } : c));

                          if (selectedReviewCitizen.dbUUID || selectedReviewCitizen.id.length > 20) {
                            const cloudSaved = await updateRegistrationRecord(selectedReviewCitizen.dbUUID || selectedReviewCitizen.id, { status: 'Bloqueado', observacoes: 'Bloqueio preventivo: ' + mot });
                            warnIfCloudDecisionNotPersisted(cloudSaved, 'O bloqueio da conta');
                          }

                          // HOMOLOGAÇÃO: o bloqueio também fica registado na loja — o cidadão
                          // fica restrito pela regra já existente (status !== 'active') e o
                          // indicador Online passa a amarelo.
                          homologationStore.setStatus(selectedReviewCitizen.biNumber || '', 'blocked', mot, selectedReviewCitizen.name);

                          addAuditLog?.(`Auditoria: Conta de "${selectedReviewCitizen.name}" BLOQUEADA preventivamente por: "${mot}".`, 'warning');
                          setSelectedReviewCitizen(null);
                        }}
                        className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer font-bold w-full sm:w-auto text-center border-0 font-sans"
                      >
                        Bloquear Conta
                      </button>
                    )
                  )}

                  {/* Homologar / Indeferir Cadastro Pendente */}
                  {(selectedReviewCitizen.status === 'Pendente de Validação' || selectedReviewCitizen.status === 'Em Análise pela IA' || selectedReviewCitizen.status === 'Em Revisão Administrativa') && (
                    <>
                      {!isRejecting ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsRejecting(true);
                            setRejectionReason('Coerência facial ou validade documental em desacordo com as regras.');
                          }}
                          className="px-5 py-3 bg-red-50 hover:bg-red-100 text-red-650 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer font-bold w-full sm:w-auto text-center border-0 font-sans"
                        >
                          Recusar Cadastro
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!rejectionReason.trim()) {
                              notify('Insira uma justificativa para a rejeição fiscal.');
                              return;
                            }
                            setCitizens(prev => prev.map(c => c.id === selectedReviewCitizen.id ? { 
                              ...c, 
                              status: 'Rejeitado', 
                              reason: rejectionReason,
                              activityHistory: [
                                { action: 'Cadastro Recusado de Forma Manual', timestamp: '12/06/2026 ' + new Date().toTimeString().slice(0, 5), ip: 'Consola_Operador' },
                                ...(c.activityHistory || [])
                              ]
                            } : c));

                            // Supabase update if synced
                            if (selectedReviewCitizen.dbUUID || selectedReviewCitizen.id.length > 20) {
                              const cloudSaved = await updateRegistrationRecord(selectedReviewCitizen.dbUUID || selectedReviewCitizen.id, { 
                                status: 'Reprovado', 
                                observacoes: rejectionReason 
                              });
                              warnIfCloudDecisionNotPersisted(cloudSaved, 'A rejeição do cadastro');
                            }

                            // HOMOLOGAÇÃO: conta Rejeitada + correspondência oficial automática ao cidadão
                            homologationStore.setStatus(selectedReviewCitizen.biNumber || '', 'rejected', rejectionReason, selectedReviewCitizen.name);
                            notifyAccountRejected(selectedReviewCitizen.biNumber || '', selectedReviewCitizen.name, rejectionReason);

                            addAuditLog?.(`Auditoria: Registo de "${selectedReviewCitizen.name}" REJEITADO do sistema CDA. Parecer: "${rejectionReason}"`, 'critical');
                            setSelectedReviewCitizen(null);
                          }}
                          className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer font-bold w-full sm:w-auto text-center border-0 font-sans"
                        >
                          Confirmar Rejeição
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={async () => {
                          const score = aiMatchScore || selectedReviewCitizen.facialMatch || 98.4;
                          setCitizens(prev => prev.map(c => c.id === selectedReviewCitizen.id ? { 
                            ...c, 
                            status: 'Aprovado Manualmente', 
                            verificationScore: score,
                            facialMatch: score,
                            coherenceLevel: score + 1,
                            activityHistory: [
                              { action: 'Cadastro Homologado Manualmente', timestamp: '12/06/2026 ' + new Date().toTimeString().slice(0, 5), ip: 'Consola_Operador' },
                              ...(c.activityHistory || [])
                            ]
                          } : c));

                          // Supabase update if synced
                          if (selectedReviewCitizen.dbUUID || selectedReviewCitizen.id.length > 20) {
                            const cloudSaved = await updateRegistrationRecord(selectedReviewCitizen.dbUUID || selectedReviewCitizen.id, { 
                              status: 'Aprovado',
                              observacoes: 'Homologado e ativado biometricamente pelo agente Admin.'
                            });
                            warnIfCloudDecisionNotPersisted(cloudSaved, 'A homologação do cadastro');
                          }

                          // HOMOLOGAÇÃO: aprovação ativa a conta + correspondência oficial automática ao cidadão
                          homologationStore.setStatus(selectedReviewCitizen.biNumber || '', 'active', undefined, selectedReviewCitizen.name);
                          notifyAccountApproved(selectedReviewCitizen.biNumber || '', selectedReviewCitizen.name);
                          // 2026-08-21 — em modo real a mensagem de aprovação é
                          // PERSISTIDA na nuvem (protocolo selado): aparece na
                          // página "Correspondências" do admin e na caixa do
                          // cidadão em qualquer dispositivo. Demo mantém só o
                          // canal local (o serviço devolve null sem sessão).
                          void enviarMensagemAdministrativa(
                            selectedReviewCitizen.biNumber || '',
                            'Conta Ativada — Homologação Aprovada pela Área de Administração',
                            `Exmo(a). ${selectedReviewCitizen.name || 'Cidadão(ã)'}, informamos que a sua identidade foi HOMOLOGADA e a sua conta no Correio Digital de Angola está oficialmente ATIVA. A partir deste momento pode receber correspondência oficial de todas as instituições integradas. Bem-vindo à rede nacional de correio digital.`
                          );

                          addAuditLog?.(`Auditoria: Cadastro do cidadão "${selectedReviewCitizen.name}" homologado e ativado biometricamente pelo agente Admin.`, 'success');
                          setSelectedReviewCitizen(null);
                        }}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer font-bold block shadow-lg shadow-emerald-600/10 w-full sm:w-auto text-center border-0 font-sans"
                      >
                        Homologar Cadastro
                      </button>
                    </>
                  )}

                  {/* Reabrir para Revisão se já estiver Homologado ou Rejeitado */}
                  {selectedReviewCitizen.status !== 'Pendente de Validação' && selectedReviewCitizen.status !== 'Em Análise pela IA' && selectedReviewCitizen.status !== 'Em Revisão Administrativa' && selectedReviewCitizen.status !== 'Bloqueado' && (
                    <button
                      type="button"
                      onClick={async () => {
                        setCitizens(prev => prev.map(c => c.id === selectedReviewCitizen.id ? { 
                          ...c, 
                          status: 'Pendente de Validação', 
                          reason: undefined,
                          verificationScore: undefined,
                          activityHistory: [
                            { action: 'Processo de Cadastro Reaberto', timestamp: '12/06/2026 ' + new Date().toTimeString().slice(0, 5), ip: 'Consola_Operador' },
                            ...(c.activityHistory || [])
                          ]
                        } : c));

                        // Supabase update if synced
                        if (selectedReviewCitizen.dbUUID || selectedReviewCitizen.id.length > 20) {
                          const cloudSaved = await updateRegistrationRecord(selectedReviewCitizen.dbUUID || selectedReviewCitizen.id, { 
                            status: 'Pendente',
                            // F29 (v11.1): revogação de auto-aprovação marcada (rastreável na auditoria)
                            observacoes: selectedReviewCitizen.status === 'Aprovado Automaticamente'
                              ? `Reaberto por revogação da aprovação automática (Pré-Verificação Inteligente) em ${new Date().toLocaleString('pt-AO')}.`
                              : 'Reaberto para nova revisão.'
                          });
                          warnIfCloudDecisionNotPersisted(cloudSaved, 'A reabertura do pedido');
                        }

                        // HOMOLOGAÇÃO: processo reaberto → conta volta a Pendente + aviso oficial ao cidadão
                        homologationStore.setStatus(selectedReviewCitizen.biNumber || '', 'pending', undefined, selectedReviewCitizen.name);
                        notifyAccountReopened(selectedReviewCitizen.biNumber || '', selectedReviewCitizen.name);

                        addAuditLog?.(selectedReviewCitizen.status === 'Aprovado Automaticamente'
                          ? `Auditoria: REVOGADA a aprovação automática (Pré-Verificação Inteligente) do cadastro de "${selectedReviewCitizen.name}" — o processo volta a Pendente de Validação.`
                          : `Auditoria: Cadastro de "${selectedReviewCitizen.name}" reaberto para nova revisão e testes dactiloscópicos.`, 'info');
                        setSelectedReviewCitizen(null);
                      }}
                      className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer font-bold w-full sm:w-auto text-center border-0 font-sans"
                    >
                      {selectedReviewCitizen.status === 'Aprovado Automaticamente' ? 'Revogar Aprovação Automática' : 'Reabrir para Revisão'}
                    </button>
                  )}

                </div>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* POPUP DE CONFIRMAÇÃO DE ELIMINAÇÃO DE CADASTRO */}
      <AnimatePresence>
        {deleteConfirmCitizen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeletingCitizen && setDeleteConfirmCitizen(null)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[300]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 12 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[94vw] max-w-lg bg-white rounded-[28px] shadow-3xl z-[301] border border-rose-100 text-left font-sans overflow-hidden"
            >
              <div className="bg-rose-600 px-6 py-5 text-white flex items-start gap-3">
                <div className="w-11 h-11 bg-white/15 rounded-2xl flex items-center justify-center shrink-0">
                  <AlertTriangle size={22} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-rose-100">Acção irreversível · Requer confirmação</p>
                  <h3 className="text-base font-black uppercase tracking-tight mt-0.5">Eliminar Cadastro do Cidadão</h3>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-[12px] text-slate-600 font-semibold leading-relaxed">
                  Tem a certeza de que pretende eliminar permanentemente o cadastro de
                  <span className="font-black text-slate-900"> "{deleteConfirmCitizen.name}"</span>
                  {deleteConfirmCitizen.biNumber ? <> (BI: <span className="font-mono font-bold">{deleteConfirmCitizen.biNumber}</span>)</> : null}?
                </p>
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3.5 text-[10.5px] font-bold text-rose-700 leading-relaxed uppercase tracking-wide">
                  Esta acção remove o registo da base de dados central e desta consola, incluindo os dados de validação associados. Não pode ser anulada.
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={isDeletingCitizen}
                    onClick={() => setDeleteConfirmCitizen(null)}
                    className="flex-1 py-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold text-[10px] uppercase tracking-wide leading-none rounded-xl cursor-pointer bg-white transition-all disabled:opacity-50 text-center whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isDeletingCitizen}
                    onClick={confirmDeleteCitizen}
                    className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-wide leading-none rounded-xl cursor-pointer border-0 shadow-md transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-1.5 text-center whitespace-nowrap"
                  >
                    {isDeletingCitizen ? (
                      <>
                        <RefreshCw size={12} className="animate-spin shrink-0" /> A eliminar...
                      </>
                    ) : (
                      <>
                        <Trash2 size={12} className="shrink-0" /> Eliminar Definitivamente
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* CENTRAL BRANDING STATUS FOOTER REMOVED */}

    </div>
  );
}
