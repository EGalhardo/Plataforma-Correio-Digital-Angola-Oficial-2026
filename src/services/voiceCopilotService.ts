/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppMode } from '../types';
import { aplicarVozPt } from '../utils/vozTts';
import { PAGE_PRESENTATIONS } from './voicePresentations';

export type VoiceActionType = 
  | 'theme_dark'
  | 'theme_light'
  | 'theme_toggle'
  | 'read_screen'
  | 'compose_mail'
  | 'increase_font'
  | 'decrease_font'
  | 'high_contrast'
  | 'help'
  | 'logout'
  | 'close';

export interface VoiceCommandIntent {
  type: 'navigate' | 'action' | 'query';
  targetTab?: string;
  label?: string;
  action?: VoiceActionType;
  query?: string;
  confidence?: number;
}

export interface VoiceNavRoute {
  tab: string;
  label: string;
  keywords: string[];
  roles: AppMode[];
}

// Catálogo completo de rotas e sinónimos para as 29 páginas da plataforma CDA 2026
export const VOICE_NAV_ROUTES: VoiceNavRoute[] = [
  // CIDADÃO & COMUNS
  {
    tab: 'home',
    label: 'Painel Principal',
    keywords: ['painel', 'inicio', 'início', 'home', 'principal', 'pagina inicial', 'página inicial', 'dashboard'],
    roles: ['user', 'institution']
  },
  {
    tab: 'correspondencias',
    label: 'Caixa de Correio',
    keywords: ['correio', 'correspondencias', 'correspondências', 'mensagens', 'caixa de entrada', 'expediente', 'emails', 'minhas mensagens'],
    roles: ['user', 'institution']
  },
  {
    tab: 'contatos',
    label: 'Contactos e Círculo de Confiança',
    keywords: ['contactos', 'contatos', 'circulo de confianca', 'círculo de confiança', 'familia', 'família', 'emergencia', 'emergência', 'parentes'],
    roles: ['user']
  },
  {
    tab: 'perfil',
    label: 'Perfil e Segurança',
    keywords: ['perfil', 'minha conta', 'dados pessoais', 'segurança', 'seguranca', 'configuracoes', 'configurações', 'meu perfil'],
    roles: ['user', 'institution']
  },
  {
    tab: 'qr-code',
    label: 'Carteira Digital / Documentos',
    keywords: ['carteira digital', 'carteira', 'documentos digitais', 'qr code', 'meus documentos', 'certidoes', 'certidões'],
    roles: ['user']
  },
  {
    tab: 'solicitar-documento',
    label: 'Solicitar Documento Digital',
    keywords: ['solicitar documento', 'pedir documento', 'requerer bilhete', 'emitir documento', 'novo documento', 'solicitar certidao', 'solicitar certidão'],
    roles: ['user']
  },
  {
    tab: 'historico',
    label: 'Histórico Operacional',
    keywords: ['historico', 'histórico', 'linha do tempo', 'minhas atividades', 'registo de atividades', 'auditoria pessoal'],
    roles: ['user', 'institution', 'admin']
  },
  {
    tab: 'notificacoes',
    label: 'Centro de Notificações',
    keywords: ['notificacoes', 'notificações', 'avisos', 'alertas', 'mensagens do sistema', 'centro de notificacoes', 'meus alertas'],
    roles: ['user', 'institution', 'admin']
  },
  {
    tab: 'video-atendimento',
    label: 'Vídeo-Atendimento',
    keywords: ['video atendimento', 'vídeo atendimento', 'videochamada', 'videoconferencia', 'videoconferência', 'sala de video', 'atendimento por video', 'chamada'],
    roles: ['user', 'institution', 'admin']
  },
  {
    tab: 'inqueritos',
    label: 'Inquéritos e Sondagens IA',
    keywords: ['inqueritos', 'inquéritos', 'perguntas', 'questionarios', 'questionários', 'pesquisas', 'consultas publicas', 'consultas públicas'],
    roles: ['user', 'institution']
  },
  {
    tab: 'ocorrencias',
    label: 'Ocorrências Locais e GPS',
    keywords: ['ocorrencias', 'ocorrências', 'problemas do bairro', 'reportar problema', 'gps', 'iluminacao', 'iluminação', 'saneamento', 'vias'],
    roles: ['user', 'institution']
  },
  {
    tab: 'denuncias',
    label: 'Livro de Reclamações',
    keywords: ['livro de reclamacoes', 'livro de reclamações', 'reclamacoes', 'reclamações', 'fazer reclamacao', 'fazer reclamação', 'queixas'],
    roles: ['user', 'institution']
  },
  {
    tab: 'nova-denuncia',
    label: 'Canal de Denúncias',
    keywords: ['denuncia', 'denúncia', 'fazer denuncia', 'fazer denúncia', 'canal de denuncias', 'canal de denúncias', 'denuncias'],
    roles: ['user', 'institution']
  },
  {
    tab: 'directorio-orgaos',
    label: 'Directório de Órgãos do Estado',
    keywords: ['directorio', 'directório', 'orgaos', 'órgãos', 'ministerios', 'ministérios', 'instituicoes', 'instituições', 'entidades', 'lista de orgaos'],
    roles: ['user']
  },

  // INSTITUIÇÃO
  {
    tab: 'gov-contatos',
    label: 'Gestão de Equipa Institucional',
    keywords: ['equipa institucional', 'colaboradores', 'funcionarios', 'funcionários', 'minha equipa', 'agentes'],
    roles: ['institution']
  },
  {
    tab: 'inst-qrcode',
    label: 'Validação e Scanner QR Code',
    keywords: ['validacao qr', 'validação qr', 'scanner', 'ler qr', 'gerar qr', 'autenticidade', 'validar documento'],
    roles: ['institution']
  },
  {
    tab: 'inst-ai-assistant',
    label: 'Assistente de IA Institucional',
    keywords: ['assistente ia', 'inteligencia artificial', 'inteligência artificial', 'base de conhecimento', 'configurar ia', 'chat teste'],
    roles: ['institution']
  },
  {
    tab: 'documentos',
    label: 'Expediente e Arquivos',
    keywords: ['expediente', 'arquivos', 'documentos institucionais', 'repositorio', 'repositório', 'submeter documento'],
    roles: ['institution']
  },
  {
    tab: 'qr-code',
    label: 'Controle de Emissão Documental',
    keywords: ['emissao documental', 'emissão documental', 'documentos emitidos', 'controle de emissao', 'controle de emissão'],
    roles: ['institution']
  },
  {
    tab: 'sondagens',
    label: 'Gestão de Sondagens',
    keywords: ['sondagens', 'votacoes', 'votações', 'enquetes', 'consultas'],
    roles: ['institution']
  },

  // ADMINISTRAÇÃO CENTRAL (SOC)
  {
    tab: 'gov-dashboard',
    label: 'Painel Nacional e SOC',
    keywords: ['painel nacional', 'soc', 'dashboard nacional', 'centro de operacoes', 'centro de operações', 'visao geral', 'visão geral', 'painel admin'],
    roles: ['admin']
  },
  {
    tab: 'gov-interoperabilidade',
    label: 'Gestão e Interoperabilidade de Instituições',
    keywords: ['interoperabilidade', 'gestao de instituicoes', 'gestão de instituições', 'solicitacoes de registo', 'solicitações de registo', 'redes governamentais'],
    roles: ['admin']
  },
  {
    tab: 'gov-correspondencias',
    label: 'Registo Global de Correspondências',
    keywords: ['correspondencias globais', 'correspondências globais', 'trafego nacional', 'tráfego nacional', 'todas as mensagens', 'auditoria de correio'],
    roles: ['admin']
  },
  {
    tab: 'gov-contatos',
    label: 'Cadastros Nacionais de Cidadãos',
    keywords: ['cadastros nacionais', 'cidadaos', 'cidadãos', 'cadastro geral', 'homologacao', 'homologação', 'utilizadores'],
    roles: ['admin']
  },
  {
    tab: 'gov-trabalhadores',
    label: 'Gestão da Equipa Central',
    keywords: ['equipa central', 'administradores', 'operadores soc', 'equipa nacional'],
    roles: ['admin']
  },
  {
    tab: 'gov-emissao',
    label: 'Correio Oficial da Administração',
    keywords: ['correio oficial', 'emissao oficial', 'emissão oficial', 'mensagens admin', 'comunicados oficiais'],
    roles: ['admin']
  },
  {
    tab: 'gov-docs',
    label: 'Controlo Central de Documentos',
    keywords: ['controlo documental', 'pedidos de certidoes', 'pedidos de certidões', 'homologar documentos', 'emissao central'],
    roles: ['admin']
  },
  {
    tab: 'gov-relatorio',
    label: 'Relatórios e Análise Estratégica',
    keywords: ['relatorios', 'relatórios', 'metricas', 'métricas', 'estatisticas', 'estatísticas', 'analise estrategica', 'análise estratégica', 'graficos', 'gráficos'],
    roles: ['admin']
  },
  {
    tab: 'gov-ia',
    label: 'Assistência de IA Nacional',
    keywords: ['ia nacional', 'assistencia ia', 'assistência ia', 'modelos de ia', 'arquitectura ia', 'redes neurais'],
    roles: ['admin']
  },
  {
    tab: 'gov-seguranca',
    label: 'Auditoria, Logs e Segurança Cibernética',
    keywords: ['seguranca', 'segurança', 'auditoria central', 'logs', 'ciberseguranca', 'cibersegurança', 'alertas de seguranca', 'alertas de segurança'],
    roles: ['admin']
  },
  {
    tab: 'gov-perfil',
    label: 'Perfil do Administrador',
    keywords: ['perfil admin', 'conta administrador', 'seguranca admin', 'segurança admin'],
    roles: ['admin']
  }
];

// Função de normalização para casamento fonético e textual resiliente
export function normalizarComando(texto: string): string {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parser de Intenção de Linguagem Natural
 */
export function parseVoiceIntent(rawText: string, appMode: AppMode): VoiceCommandIntent {
  const norm = normalizarComando(rawText);
  if (!norm) {
    return { type: 'query', query: rawText };
  }

  // 1. Ações de Interface e Acessibilidade Imediatas
  if (
    norm.includes('modo escuro') ||
    norm.includes('tema escuro') ||
    norm.includes('ativar escuro') ||
    norm.includes('mudar para escuro') ||
    norm.includes('noite')
  ) {
    return { type: 'action', action: 'theme_dark', label: 'Ativar Modo Escuro' };
  }

  if (
    norm.includes('modo claro') ||
    norm.includes('tema claro') ||
    norm.includes('ativar claro') ||
    norm.includes('mudar para claro') ||
    norm.includes('dia')
  ) {
    return { type: 'action', action: 'theme_light', label: 'Ativar Modo Claro' };
  }

  if (
    norm.includes('mudar tema') ||
    norm.includes('trocar tema') ||
    norm.includes('alternar tema')
  ) {
    return { type: 'action', action: 'theme_toggle', label: 'Alternar Tema de Cor' };
  }

  if (
    norm.includes('ler ecra') ||
    norm.includes('ler ecrã') ||
    norm.includes('ler tela') ||
    norm.includes('ler pagina') ||
    norm.includes('ler página') ||
    norm.includes('ouvir pagina') ||
    norm.includes('ouvir página') ||
    norm.includes('apresentar pagina') ||
    norm.includes('apresentar página') ||
    norm.includes('descrever ecra') ||
    norm.includes('descrever pagina') ||
    norm.includes('o que tem nesta pagina')
  ) {
    return { type: 'action', action: 'read_screen', label: 'Leitura de Ecrã / Apresentar Página' };
  }

  if (
    norm.includes('nova mensagem') ||
    norm.includes('escrever mensagem') ||
    norm.includes('escrever correio') ||
    norm.includes('enviar mensagem') ||
    norm.includes('novo correio') ||
    norm.includes('compor correio')
  ) {
    return { type: 'action', action: 'compose_mail', label: 'Compor Nova Mensagem' };
  }

  if (
    norm.includes('aumentar fonte') ||
    norm.includes('aumentar letra') ||
    norm.includes('aumentar texto') ||
    norm.includes('letra maior') ||
    norm.includes('texto maior')
  ) {
    return { type: 'action', action: 'increase_font', label: 'Aumentar Tamanho da Letra' };
  }

  if (
    norm.includes('diminuir fonte') ||
    norm.includes('diminuir letra') ||
    norm.includes('diminuir texto') ||
    norm.includes('letra menor') ||
    norm.includes('texto menor')
  ) {
    return { type: 'action', action: 'decrease_font', label: 'Diminuir Tamanho da Letra' };
  }

  if (
    norm.includes('alto contraste') ||
    norm.includes('modo contraste') ||
    norm.includes('modo acessibilidade')
  ) {
    return { type: 'action', action: 'high_contrast', label: 'Modo Alto Contraste' };
  }

  if (
    norm.includes('ajuda') ||
    norm.includes('comandos') ||
    norm.includes('o que posso dizer') ||
    norm.includes('quais os comandos') ||
    norm.includes('o que sabes fazer')
  ) {
    return { type: 'action', action: 'help', label: 'Comandos de Voz Disponíveis' };
  }

  if (
    norm.includes('terminar sessao') ||
    norm.includes('terminar sessão') ||
    norm.includes('encerrar sessao') ||
    norm.includes('encerrar sessão') ||
    norm.includes('fazer logout') ||
    norm.includes('desconectar') ||
    norm.startsWith('sair')
  ) {
    return { type: 'action', action: 'logout', label: 'Terminar Sessão' };
  }

  if (
    norm.includes('fechar copiloto') ||
    norm.includes('fechar assistente') ||
    norm.includes('parar escuta') ||
    norm.includes('cancelar voz') ||
    norm.includes('parar de ouvir') ||
    norm.includes('fechar voz')
  ) {
    return { type: 'action', action: 'close', label: 'Fechar Copiloto' };
  }

  // 2. Intenção de Navegação (Verbos de deslocamento ou menção direta da rota)
  const verbosNav = [
    'ir para', 'ir ao', 'ir a', 'abrir', 'mostrar', 'ver', 'navegar para', 'aceder a',
    'passar para', 'levar me para', 'leva me para', 'quero ver', 'entra em', 'entrar em', 'vai para'
  ];

  const temVerbo = verbosNav.some(v => norm.includes(v));

  // Procurar rota mais adequada permitida no perfil atual
  for (const route of VOICE_NAV_ROUTES) {
    if (!route.roles.includes(appMode)) continue;

    for (const kw of route.keywords) {
      const normKw = normalizarComando(kw);
      if (temVerbo && norm.includes(normKw)) {
        return {
          type: 'navigate',
          targetTab: route.tab,
          label: route.label,
          confidence: 0.95
        };
      }
      // Se não tem verbo mas a fala é quase idêntica à palavra-chave (ex: "correio", "vídeo atendimento")
      if (norm === normKw || norm === `o ${normKw}` || norm === `a ${normKw}` || norm === `os ${normKw}` || norm === `as ${normKw}`) {
        return {
          type: 'navigate',
          targetTab: route.tab,
          label: route.label,
          confidence: 0.90
        };
      }
    }
  }

  // Verificar se o utilizador pediu uma rota que existe noutro papel (dar feedback explicativo)
  for (const route of VOICE_NAV_ROUTES) {
    if (route.roles.includes(appMode)) continue;
    for (const kw of route.keywords) {
      const normKw = normalizarComando(kw);
      if (norm.includes(normKw)) {
        return {
          type: 'query',
          query: `A página de ${route.label} é exclusiva de outros perfis e não está acessível na sua área atual. Posso ajudá-lo com outra consulta ou funcionalidade?`
        };
      }
    }
  }

  // 3. Fallback: Consulta Cívica para a IA do CDA
  return {
    type: 'query',
    query: rawText
  };
}

/**
 * Utilitário de Síntese de Voz Global
 */
export function narrarTexto(texto: string, onEnd?: () => void): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return () => {};
  }

  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
  } catch {}

  const u = new SpeechSynthesisUtterance(texto);
  aplicarVozPt(u, { rate: 1.0, pitch: 1.0 });

  let timer: NodeJS.Timeout | null = null;

  u.onend = () => {
    if (timer) clearTimeout(timer);
    if (onEnd) onEnd();
  };

  u.onerror = () => {
    if (timer) clearTimeout(timer);
    if (onEnd) onEnd();
  };

  // Watchdog de segurança para browsers que perdem o evento onend em falas longas
  timer = setTimeout(() => {
    if (onEnd) onEnd();
  }, Math.max(10000, texto.length * 100));

  try {
    window.speechSynthesis.speak(u);
  } catch (e) {
    if (onEnd) onEnd();
  }

  return () => {
    if (timer) clearTimeout(timer);
    try {
      window.speechSynthesis.cancel();
    } catch {}
  };
}

/**
 * Obter descrição falada de qualquer página da plataforma
 */
export function getDescricaoPaginaVoz(appMode: AppMode, tab: string): string {
  const presentations = PAGE_PRESENTATIONS[appMode];
  if (presentations && tab in presentations) {
    return presentations[tab];
  }
  return `Está na página do Correio Digital de Angola. Pode utilizar comandos de voz para navegar, compor mensagens ou solicitar informações cívicas.`;
}
