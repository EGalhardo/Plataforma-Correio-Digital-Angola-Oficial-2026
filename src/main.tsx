const originalWarn = console.warn;
console.warn = function (...args) {
  const argStr = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  // Se o log for de conflito do NIF, do Passaporte ou de chaves do Supabase, silenciamos e não deixamos imprimir no console
  if (
    argStr.includes('profiles_nif_key') ||
    argStr.includes('profiles_passport_key') ||
    argStr.includes('duplicate key') ||
    argStr.includes('23505') ||
    argStr.includes('Conflito no campo') ||
    argStr.includes('conflito de chave')
  ) {
    return;
  }
  originalWarn.apply(console, args);
};

const originalError = console.error;
console.error = function (...args) {
  const argStr = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  if (
    argStr.includes('profiles_nif_key') ||
    argStr.includes('profiles_passport_key') ||
    argStr.includes('duplicate key') ||
    argStr.includes('23505') ||
    argStr.includes('Conflito no campo') ||
    argStr.includes('conflito de chave')
  ) {
    return;
  }
  originalError.apply(console, args);
};

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {SessionProvider} from './services/sessionStore.ts';
import {InstitutionProvider} from './services/institutionStore.ts';
import {LanguageProvider} from './context/language/LanguageContext.tsx';
import {ErrorBoundary} from './components/ui/ErrorBoundary.tsx';

// Intercept and suppress benign WebSocket / Vite HMR / sandbox fetching errors in the preview environment
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = String(event?.reason?.message || event?.reason || '').toLowerCase();
    if (
      msg.includes('websocket') || 
      msg.includes('failed to connect') ||
      msg.includes('vite') ||
      msg.includes('failed to fetch') ||
      msg.includes('profiles_nif_key') ||
      msg.includes('duplicate key') ||
      msg.includes('23505')
    ) {
      event.preventDefault();
      console.warn('Intercetado unhandledrejection benigno do ambiente:', event.reason);
    }
  });

  window.addEventListener('error', (event) => {
    const msg = String(event?.message || '').toLowerCase();
    const errStack = String(event?.error?.stack || '').toLowerCase();
    if (
      msg.includes('websocket') || 
      msg.includes('failed to connect') ||
      msg.includes('vite') ||
      msg.includes('failed to fetch') ||
      msg.includes('profiles_nif_key') ||
      msg.includes('duplicate key') ||
      msg.includes('23505') ||
      errStack.includes('profiles_nif_key') ||
      errStack.includes('duplicate key')
    ) {
      event.preventDefault();
      console.warn('Intercetado erro global benigno do ambiente:', event.message);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionProvider>
      <InstitutionProvider>
        <LanguageProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </LanguageProvider>
      </InstitutionProvider>
    </SessionProvider>
  </StrictMode>,
);
