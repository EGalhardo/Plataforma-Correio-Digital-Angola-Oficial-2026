/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BadgeCheck, ShieldAlert, Info, X, ExternalLink, Send } from 'lucide-react';
import { AppNotification } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';

interface NotificationDetailModalProps {
  notification: AppNotification | null;
  onClose: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export function NotificationDetailModal({
  notification,
  onClose,
  onNavigateToTab
}: NotificationDetailModalProps) {
  const { t } = useLanguage();

  if (!notification) return null;

  const getTypeStyles = () => {
    switch (notification.type) {
      case 'success':
        return {
          icon: <BadgeCheck size={28} className="text-emerald-600 animate-pulse" />,
          bg: 'bg-emerald-50 border-emerald-200',
          titleColor: 'text-[#0E2B64]',
          badgeText: t('Sucesso'),
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        };
      case 'warning':
        return {
          icon: <ShieldAlert size={28} className="text-amber-600 animate-pulse" />,
          bg: 'bg-amber-50 border-amber-200',
          titleColor: 'text-[#0E2B64]',
          badgeText: t('Alerta'),
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
        };
      case 'info':
      default:
        return {
          icon: <Info size={28} className="text-blue-600" />,
          bg: 'bg-blue-50/70 border-blue-200/60',
          titleColor: 'text-[#0E2B64]',
          badgeText: t('Informação'),
          badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        />

        {/* Modal body */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-[500px] bg-white border border-slate-200 rounded-[32px] shadow-2xl p-8 overflow-hidden z-10 mx-3"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100/50 transition-all cursor-pointer"
          >
            <X size={20} />
          </button>

          {/* Icon and Type Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 shrink-0 ${styles.bg}`}>
              {styles.icon}
            </div>
            <div>
              <span className={`inline-block px-3 py-1 border text-[10px] font-black uppercase tracking-widest rounded-full leading-none ${styles.badgeClass}`}>
                {styles.badgeText}
              </span>
              <span className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mt-1.5">
                {t("Sincronizado:")} {notification.time}
              </span>
            </div>
          </div>

          {/* Notification Title & Details */}
          <div className="space-y-4 text-left">
            <h3 className={`text-xl md:text-2xl font-black uppercase tracking-tight leading-tight ${styles.titleColor}`}>
              {t(notification.title)}
            </h3>
            
            <div className="bg-[#f4f7fc]/60 border border-[#e2eaf4] rounded-[20px] p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#e0ebfd] text-[#3267e3] flex items-center justify-center shrink-0">
                <Send size={16} className="text-[#3267e3]" />
              </div>
              <p className="text-xs md:text-sm text-slate-700 leading-relaxed font-semibold">
                {t(notification.message)}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100/80 my-6" />

          {/* Footer Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 bg-[#e2eaf4]/60 text-[#0E2B64] hover:bg-[#e2eaf4]/90 font-black text-[11px] md:text-xs uppercase tracking-widest rounded-2xl transition-all cursor-pointer border-0"
            >
              {t("Fechar")}
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onNavigateToTab) {
                  onNavigateToTab(notification.targetTab);
                }
              }}
              className="w-full py-3.5 bg-[#070b19] text-white hover:bg-[#121c3b] font-black text-[11px] md:text-xs uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 shadow-sm"
            >
              <span>{t("Aceder")}</span>
              <ExternalLink size={13} strokeWidth={2.5} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
