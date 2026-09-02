/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Home, Mail, QrCode, Users, User, LogOut, Landmark, BarChart3, Shield, Settings, FileText, Bot } from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { Message, Document, AppMode, LanguageCode } from '../../types';
import { useSession } from '../../services/sessionStore';
import { useLanguage } from '../../hooks/useLanguage';
import { LazyImage } from '../ui/LazyImage';
// v37.78.33 — LOGOMARCA ÚNICA (pedido do dono 2026-08-31): a mesma imagem
// oficial («Modo-claro-e-escuro-01.png») é usada no modo claro E no escuro —
// permanece inalterada em qualquer tema.
import logoSidebar from '../../assets/images/logomarca_sidebar_2026.png';

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  color?: string;
}

interface SidebarProps {
  tab: string;
  setTab: (id: string) => void;
  setSelectedMessage: (msg: Message | null) => void;
  setSelectedDoc: (doc: Document | null) => void;
  handleLogout: (clearAll?: boolean) => void;
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  setStage?: (stage: string) => void;
  currentLanguage?: LanguageCode;
  theme?: 'light' | 'dark';
  // 2026-08-21/22 — a página Equipa é exclusiva do RESPONSÁVEL de cada área
  // (instituição: 'gov-contatos'; admin: 'gov-trabalhadores'). Para os demais
  // o item fica VISÍVEL mas INACTIVO (não navega).
  equipaBloqueadaId?: string;
  // 2026-08-22 — PERMISSÕES DE PÁGINA: se definida (colaborador/agente
  // restrito), o menu mostra APENAS as páginas desta lista (fonte: Supabase,
  // revalidada no backend). null/undefined = sem restrições.
  paginasPermitidas?: string[] | null;
}

// Menu citizen SEM QR Code
const userItems: MenuItem[] = [
  { id: 'home', label: 'Painel', icon: Home },
  { id: 'correspondencias', label: 'Correio', icon: Mail },
  { id: 'contatos', label: 'Contactos', icon: Users },
  { id: 'perfil', label: 'Perfil', icon: User },
];

const institutionItems: MenuItem[] = [
  { id: 'home', label: 'Painel', icon: Home },
  { id: 'correspondencias', label: 'Correio', icon: Mail },
  { id: 'gov-contatos', label: 'Equipa', icon: Users },
  { id: 'inst-qrcode', label: 'QR Code', icon: QrCode },
  { id: 'inst-ai-assistant', label: 'IA', icon: Bot },
  { id: 'perfil', label: 'Perfil', icon: User },
];

const adminItems: MenuItem[] = [
  { id: 'gov-dashboard', label: 'Painel', icon: BarChart3 },
  { id: 'gov-interoperabilidade', label: 'Instituições', icon: Landmark },
  { id: 'gov-correspondencias', label: 'Correspondências', icon: Mail },
  { id: 'gov-contatos', label: 'Cidadãos', icon: User },
  { id: 'gov-trabalhadores', label: 'Equipa', icon: Users },
  { id: 'gov-relatorio', label: 'Relatórios', icon: FileText },
  { id: 'gov-ia', label: 'IA', icon: Bot },
  { id: 'gov-seguranca', label: 'Auditoria', icon: Shield },
  { id: 'gov-perfil', label: 'Perfil', icon: Settings },
];

export function Sidebar({ 
  tab, setTab, setSelectedMessage, setSelectedDoc, handleLogout,
  appMode: _propsAppMode, setAppMode: _propsSetAppMode,
  theme = 'light',
  equipaBloqueadaId,
  paginasPermitidas = null
}: SidebarProps) {
  const { appMode } = useSession();
  const { t: translate } = useLanguage();

  const getItemsForMode = () => {
    switch (appMode) {
      case 'admin': return adminItems;
      case 'institution': return institutionItems;
      default: return userItems;
    }
  };

  const currentItems = getItemsForMode();
  // 2026-08-22 — PERMISSÕES DE PÁGINA: o colaborador/agente vê TODOS os itens
  // do menu, mas os não permitidos aparecem com opacidade reduzida e badge
  // "Sem Acesso" (pedido do dono 2026-09-02). null/undefined = sem restrições.
  // A página "Equipa" continua bloqueada para não-responsáveis (equipaBloqueadaId).
  const isPaginaPermitida = (itemId: string): boolean => {
    // Se não há restrições, todas são permitidas
    if (!Array.isArray(paginasPermitidas)) return true;
    return paginasPermitidas.includes(itemId);
  };
  const itensVisiveis = currentItems;

  return (
    <aside className={`hidden md:flex p-5 md:w-[250px] md:rounded-[36px] shadow-2xl transition-all duration-500 shrink-0 md:sticky md:top-5 md:h-[calc(100vh-2.5rem)] flex-col border border-slate-200 dark:border-[#141d31] ${
      appMode === 'admin' ? 'bg-white text-slate-900 shadow-indigo-900/5' : 
      'bg-white text-slate-900 shadow-slate-200/50'
    }`}>
      <div className="mb-8 px-4">
        {/* v37.78.33 — LOGOMARCA ÚNICA: a mesma imagem nos dois temas (claro e
            escuro), a pedido do dono — caixa fixa com rácio preservado
            (1280×349); sem estilos condicionais de tema.
            v37.78.43 — reduzida 20% de forma proporcional a pedido do dono
            (2026-09-01): 48px → 38,4px de altura, largura automática. */}
        <div className="w-full flex items-center" style={{ height: '38.4px' }}>
          <LazyImage
            src={logoSidebar}
            alt="Correio Digital"
            priority={true}
            placeholder="skeleton"
            style={{ height: '100%', width: 'auto', maxWidth: '100%', objectFit: 'contain', objectPosition: 'left center', backgroundColor: 'transparent' }}
            className="transition-all"
          />
        </div>
      </div>

      <div className="text-[8px] font-black text-slate-500 tracking-[0.25em] uppercase px-1.5 mb-2 mt-4 md:mt-0">
        {translate(appMode === 'admin' ? 'ADMINISTRAÇÃO CENTRAL' : appMode === 'institution' ? 'INSTITUIÇÃO / PRIVADO' : 'ÁREA DO CIDADÃO')}
      </div>
      <nav className="space-y-0.5">
        {itensVisiveis.map(({ id, label, icon: Icon }) => {
          const bloqueado = equipaBloqueadaId === id;
          const semPermissao = !bloqueado && !isPaginaPermitida(id);
          const inativo = bloqueado || semPermissao;
          const tituloBloqueio = bloqueado
            ? translate('Apenas o responsável desta área pode aceder à página Equipa.')
            : semPermissao
              ? translate('Não tem permissão para aceder a esta página. Contacte o responsável da instituição.')
              : undefined;
          return (
          <button
            key={id}
            disabled={inativo}
            aria-disabled={inativo}
            title={tituloBloqueio}
            onClick={() => {
              if (inativo) return;
              setTab(id);
              if (id !== 'correspondencias' && id !== 'documentos' && id !== 'mensagem') setSelectedMessage(null);
              if (id !== 'documento') setSelectedDoc(null);
            }}
            className={`w-full flex items-center gap-3 px-2 py-2 rounded-xl font-bold transition-all ${
              inativo
                ? 'opacity-40 cursor-not-allowed text-slate-400 select-none'
                : tab === id ? 'text-indigo-600' : 'bg-transparent text-slate-700 hover:text-slate-900'
            }`}
          >
            <Icon size={16} className={inativo ? 'text-slate-300' : tab === id ? 'text-indigo-600' : 'text-slate-600'} />
            <span className="text-xs tracking-tight flex items-center gap-1 flex-wrap">
              {translate(label)}
              {(semPermissao || bloqueado) && (
                <span className="text-[9px] font-bold text-red-400">
                  (Sem Acesso)
                </span>
              )}
            </span>
          </button>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t space-y-2 border-slate-300/80">
        <button
          onClick={() => handleLogout(false)}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black transition-all bg-[#0E2B64] text-white hover:bg-[#081a3d] border-0 shadow-sm cursor-pointer"
        >
          <LogOut size={20} className="text-white" />
          <span className="text-xs uppercase tracking-widest">{translate("Sair do Canal")}</span>
        </button>
      </div>
    </aside>
  );
}
