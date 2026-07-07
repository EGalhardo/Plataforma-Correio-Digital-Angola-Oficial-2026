import React, { useState, useEffect } from 'react';

interface Props {
  children: React.ReactNode;
}

export function ErrorBoundary({ children }: Props) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Ignorar erros benignos de WebSocket, conexões recusadas, Vite ou Supabase de chave duplicada
      const msg = String(event?.message || '').toLowerCase();
      const errStack = String(event?.error?.stack || '').toLowerCase();
      if (
        msg.includes('websocket') || 
        msg.includes('failed to connect') ||
        msg.includes('vite') ||
        msg.includes('failed to fetch') ||
        msg.includes('profiles_nif_key') ||
        msg.includes('duplicate key') ||
        errStack.includes('profiles_nif_key') ||
        errStack.includes('duplicate key')
      ) {
        event.preventDefault();
        return;
      }

      console.error('ErrorBoundary apanhou um erro global:', event.error);
      setHasError(true);
      setError(event.error || new Error(event.message));
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const msg = String(event?.reason?.message || event?.reason || '').toLowerCase();
      const reasonStr = String(event?.reason?.stack || '').toLowerCase();
      // Ignorar WebSocket / HMR amigável e restrições de chave do Supabase
      if (
        msg.includes('websocket') || 
        msg.includes('failed to connect') ||
        msg.includes('vite') ||
        msg.includes('failed to fetch') ||
        msg.includes('profiles_nif_key') ||
        msg.includes('duplicate key') ||
        reasonStr.includes('profiles_nif_key') ||
        reasonStr.includes('duplicate key')
      ) {
        event.preventDefault();
        return;
      }
      
      console.error('ErrorBoundary apanhou uma rejeição assíncrona:', event.reason);
      setHasError(true);
      setError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-8 max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-rose-50 border border-rose-100 text-rose-650 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Algo correu mal</h2>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Ocorreu um erro inesperado na interface. Mas não se preocupe! Pode recuperar a sua sessão recarregando a página ou voltando ao painel principal.
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-150 p-3 rounded-2xl text-left max-h-[140px] overflow-y-auto">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Informação de Diagnóstico (React Error)</span>
            <p className="text-[10px] font-mono text-rose-700 font-extrabold leading-normal whitespace-pre-wrap break-all">
              {error?.stack || error?.message || 'Erro de Execução Desconhecido'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => {
                localStorage.removeItem('correio_digital_theme');
                window.location.reload();
              }}
              className="py-3 bg-slate-100 hover:bg-slate-205 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all cursor-pointer border border-slate-250 animate-none"
            >
              Recarregar App
            </button>
            <button
              onClick={() => {
                setHasError(false);
                setError(null);
                window.location.href = '/';
              }}
              className="py-3 bg-[#0E2B64] hover:bg-[#081a3d] text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all cursor-pointer border-none shadow-md shadow-blue-900/10 animate-none"
            >
              Painel Principal
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
export default ErrorBoundary;
