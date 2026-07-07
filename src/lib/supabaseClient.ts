import { createClient } from '@supabase/supabase-js';

// Load client-side environment variables - SECURITY FIX: removed hardcoded credentials
// Integração Supabase 2026 - Correio Digital Angola
// Project ID: klrclczcahfycfdxzdqs
const rawUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://klrclczcahfycfdxzdqs.supabase.co';
// Suporta tanto ANON_KEY clássico quanto PUBLISHABLE_KEY novo formato
const supabaseAnonKey = 
  (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 
  (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY || 
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

// Create and export the Supabase Client
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey || 'placeholder-anon-key'
);
