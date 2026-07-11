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
  appMode: _propsAppMode, setAppMode: _propsSetAppMode, setStage, currentLanguage = 'pt',
  theme = 'light'
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

  return (
    <aside className={`hidden md:flex p-5 md:w-[250px] md:rounded-[36px] shadow-2xl transition-all duration-500 shrink-0 md:sticky md:top-5 md:h-[calc(100vh-2.5rem)] flex-col border border-slate-200 dark:border-[#141d31] ${
      appMode === 'admin' ? 'bg-white text-slate-900 shadow-indigo-900/5' : 
      'bg-white text-slate-900 shadow-slate-200/50'
    }`}>
      <div className="mb-8 px-4">
        <LazyImage
          src={theme === 'dark' 
            ? "https://i.postimg.cc/6pQwXBFQ/Logomarca-Modo-Claro-Escuro.png"
            : "https://i.postimg.cc/Fs8cZJZt/Logomarca-PNG-(1).png"
          } 
          alt="Correio Digital" 
          priority={true}
          placeholder="skeleton"
          style={{ height: '74px', width: 'auto', objectFit: 'contain', backgroundColor: 'transparent' }}
          className="transition-all"
        />
      </div>

      <div className="text-[8px] font-black text-slate-500 tracking-[0.25em] uppercase px-1.5 mb-2 mt-4 md:mt-0">
        {translate(appMode === 'admin' ? 'ADMINISTRAÇÃO CENTRAL' : appMode === 'institution' ? 'INSTITUIÇÃO / PRIVADO' : 'ÁREA DO CIDADÃO')}
      </div>
      <nav className="space-y-0.5">
        {currentItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setTab(id);
              if (id !== 'correspondencias' && id !== 'documentos' && id !== 'mensagem') setSelectedMessage(null);
              if (id !== 'documento') setSelectedDoc(null);
            }}
            className={`w-full flex items-center gap-3 px-2 py-2 rounded-xl font-bold transition-all ${
              tab === id ? 'text-indigo-600' : 'bg-transparent text-slate-700 hover:text-slate-900'
            }`}
          >
            <Icon size={16} className={tab === id ? 'text-indigo-600' : 'text-slate-600'} />
            <span className="text-xs tracking-tight">{translate(label)}</span>
          </button>
        ))}
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
