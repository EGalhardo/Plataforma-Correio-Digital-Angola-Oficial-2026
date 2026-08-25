import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

// Load client-side environment variables - SECURITY FIX: removed hardcoded credentials
// Integração Supabase 2026 - Correio Digital Angola
// Project ID: klrclczcahfycfdxzdqs
// NOTA (correção 2026-08-14): usar `import.meta.env?.VITE_*` (SEM `?` entre
// `import.meta` e `env`). Com `import.meta?.env` o esbuild produz `import.meta?.env`,
// que o Vite NÃO reconhece (o detector procura a string exata `import.meta.env`) →
// o objeto de env nunca é injetado no módulo → a chave anon fica vazia e o cliente
// caía no placeholder 'placeholder-anon-key' (401 Invalid API key em produção).
const rawUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://klrclczcahfycfdxzdqs.supabase.co';
// Suporta tanto ANON_KEY clássico quanto PUBLISHABLE_KEY novo formato
const supabaseAnonKey = 
  import.meta.env?.VITE_SUPABASE_ANON_KEY || 
  import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || 
  '';

// Fallback warning in console if keys are missing during development
if (!rawUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase integration: Missing VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY. ' +
    'Please set these environment variables to connect to your database. ' +
    'Veja .env.example para configuração.' +
    '\nProject: Correio Digital Angola (klrclczcahfycfdxzdqs)'
  );
} else {
  console.info('[CDA] Supabase client inicializado:', rawUrl);
}

// Ensure the URL is valid, otherwise use placeholder
let supabaseUrl = 'https://placeholder-url.supabase.co';
try {
  if (rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))) {
    new URL(rawUrl); // validate URL format
    supabaseUrl = rawUrl;
  }
} catch (e) {
  console.warn('Supabase URL is invalid, using fallback placeholder.', e);
}

const clientOptions: Record<string, unknown> = typeof window === 'undefined' 
  ? { auth: { persistSession: false }, realtime: { transport: ws as any } } 
  : {};

// Create and export the Supabase Client
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey || 'placeholder-anon-key',
  clientOptions
);
