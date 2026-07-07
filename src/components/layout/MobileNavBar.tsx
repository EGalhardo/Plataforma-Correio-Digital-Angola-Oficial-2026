/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Home, Mail, QrCode, Users, User, BarChart3, Shield, FileText, Landmark, Settings, Bot } from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { Message, Document, AppMode, LanguageCode } from '../../types';
import { useSession } from '../../services/sessionStore';
import { useLanguage } from '../../hooks/useLanguage';

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface MobileNavBarProps {
  tab: string;
  setTab: (id: string) => void;
  setSelectedMessage: (msg: Message | null) => void;
  setSelectedDoc: (doc: Document | null) => void;
  appMode: AppMode;
  currentLanguage?: LanguageCode;
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
  { id: 'gov-contatos', label: 'Trabalhadores', icon: Users },
  { id: 'inst-qrcode', label: 'QR Code', icon: QrCode },
  { id: 'inst-ai-assistant', label: 'IA', icon: Bot },
  { id: 'perfil', label: 'Perfil', icon: User },
];

const adminItems: MenuItem[] = [
  { id: 'gov-dashboard', label: 'Painel', icon: BarChart3 },
  { id: 'gov-interoperabilidade', label: 'Instituições', icon: Landmark },
  { id: 'gov-correspondencias', label: 'Correios', icon: Mail },
  { id: 'gov-contatos', label: 'Cidadãos', icon: User },
  { id: 'gov-trabalhadores', label: 'Trabalhadores', icon: Users },
  { id: 'gov-relatorio', label: 'Relatórios', icon: FileText },
  { id: 'gov-ia', label: 'IA', icon: Bot },
  { id: 'gov-seguranca', label: 'Auditoria', icon: Shield },
  { id: 'gov-perfil', label: 'Perfil', icon: Settings },
];

export function MobileNavBar({ 
  tab, setTab, setSelectedMessage, setSelectedDoc,
  appMode: _propsAppMode, currentLanguage = 'pt'
}: MobileNavBarProps) {
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
  const isAdminOrInst = appMode === 'admin' || appMode === 'institution';

  return (
    <nav className={`md:hidden fixed bottom-0 left-0 right-0 h-16 border-t flex items-center px-2 z-50 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] transition-colors bg-white border-[#D1D5DB] ${
      isAdminOrInst ? 'overflow-x-auto justify-start gap-2 scrollbar-none snap-x snap-mandatory' : 'justify-around'
    }`}>
      {currentItems.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => {
            setTab(id);
            if (id !== 'correspondencias' && id !== 'documentos' && id !== 'mensagem') setSelectedMessage(null);
            if (id !== 'documento') setSelectedDoc(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center gap-0.5 transition-all px-2.5 h-full relative shrink-0 ${
            isAdminOrInst ? 'min-w-[72px] snap-start' : 'flex-1'
          } ${tab === id ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <div className={`transition-all duration-300 ${tab === id ? 'scale-110' : 'scale-100'}`}>
            <Icon size={19} strokeWidth={tab === id ? '2.5' : '2'} />
          </div>
          <span className={`text-[8px] font-black uppercase tracking-tight transition-all ${tab === id ? 'opacity-100' : 'opacity-60'}`}>
            {translate(label)}
          </span>
          {tab === id && (
            <motion.div layoutId="activeTab" className="absolute -top-px left-1/2 -translate-x-1/2 w-6 h-1 rounded-b-full bg-indigo-600" />
          )}
        </button>
      ))}
    </nav>
  );
}
