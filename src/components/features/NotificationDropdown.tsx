/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { BadgeCheck, ShieldCheck, Info, Bell, Trash2 } from 'lucide-react';
import { AppNotification, Document } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';

interface NotificationDropdownProps {
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
  notifications: AppNotification[];
  setTab: (id: string) => void;
  setSelectedDoc: (doc: Document | null) => void;
  onClickNotification: (notification: AppNotification) => void;
  onDeleteNotification: (id: number) => void;
}

export function NotificationDropdown({ 
  showNotifications, 
  setShowNotifications, 
  notifications, 
  setTab, 
  setSelectedDoc,
  onClickNotification,
  onDeleteNotification
}: NotificationDropdownProps) {
  const { t } = useLanguage();

  return (
    <AnimatePresence>
      {showNotifications && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowNotifications(false)}
            className="fixed inset-0 z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute left-1/2 -translate-x-1/2 md:left-auto md:right-0 md:translate-x-0 top-full mt-3 w-[min(92vw,400px)] sm:w-[320px] md:w-[400px] bg-white border border-line rounded-[24px] md:rounded-[32px] shadow-2xl z-[101] overflow-hidden origin-top-right"
          >
            <div className="p-4 md:p-6 border-b border-line bg-slate-50/50 flex justify-between items-center">
              <h4 className="text-sm md:text-lg font-black text-primary">{t("Notificações")}</h4>
              <div className="p-1 px-2.5 md:px-3 bg-red-100 text-red-600 text-[8px] md:text-[10px] font-black uppercase tracking-widest rounded-full">
                {notifications.length} {t("Alertas")}
              </div>
            </div>
            <div className="max-h-[300px] md:max-h-[380px] overflow-y-auto custom-scrollbar">
              {notifications.length > 0 ? (
                <div className="divide-y divide-line/40">
                  {notifications.map((n) => (
                    <div 
                      key={n.id} 
                      onClick={() => {
                        onClickNotification(n);
                      }}
                      className="p-4 md:p-5 hover:bg-slate-50 transition-colors cursor-pointer group relative"
                    >
                      <div className="flex gap-3 md:gap-4 items-start pr-6 relative">
                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 shadow-sm border ${
                          n.type === 'success' ? 'bg-success/5 text-success border-success/10' :
                          n.type === 'warning' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                          'bg-blue-50 text-blue-600 border-blue-105'
                        }`}>
                          {n.type === 'success' ? <BadgeCheck size={16} className="md:w-5 md:h-5" /> : 
                           n.type === 'warning' ? <ShieldCheck size={16} className="md:w-5 md:h-5" /> : <Info size={16} className="md:w-5 md:h-5" />}
                        </div>
                        <div className="flex-1 space-y-0.5 md:space-y-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-[11px] md:text-sm font-black text-primary tracking-tight line-clamp-1">{t(n.title)}</span>
                            <span className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded shrink-0">{n.time}</span>
                          </div>
                          <p className="text-[10px] md:text-[11px] text-slate-600 leading-tight font-bold group-hover:text-slate-900 transition-colors">
                            {t(n.message)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Eliminate Notification Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteNotification(n.id);
                        }}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 hover:scale-105 transition-all opacity-60 md:opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer border-0 shrink-0"
                        title={t("Eliminar")}
                      >
                        <Trash2 size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 md:p-12 text-center space-y-3">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-100 rounded-2xl md:rounded-3xl flex items-center justify-center text-slate-300 mx-auto">
                    <Bell size={24} className="md:w-8 md:h-8" />
                  </div>
                  <p className="text-slate-400 font-bold text-[10px] md:text-sm uppercase tracking-widest">{t("Sem novas notificações")}</p>
                </div>
              )}
            </div>
            <div className="p-3 md:p-4 bg-slate-50 text-center border-t border-line/40">
              <button 
                onClick={() => {
                  setShowNotifications(false);
                  setTab('notificacoes');
                  setSelectedDoc(null);
                }}
                className="text-[8px] md:text-[10px] font-black text-primary uppercase tracking-[0.2em] hover:opacity-70 transition-opacity cursor-pointer bg-transparent border-0"
              >
                {t("Ver Centro de Notificações")}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

