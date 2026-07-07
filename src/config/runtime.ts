export const RUNTIME_FLAGS = {
  supabaseAutoSeed: ((import.meta as any).env.VITE_ENABLE_SUPABASE_AUTO_SEED || 'false') === 'true',
  localBootstrap: ((import.meta as any).env.VITE_ENABLE_LOCAL_BOOTSTRAP || 'true') !== 'false',
  // SECURITY: mockFallback agora default FALSE para produção segura
  mockFallback: ((import.meta as any).env.VITE_ENABLE_MOCK_FALLBACK || 'false') !== 'false',
};

export const shouldUseLocalBootstrap = () => RUNTIME_FLAGS.localBootstrap;
export const shouldUseMockFallback = () => RUNTIME_FLAGS.mockFallback;
export const shouldAutoSeedSupabase = () => RUNTIME_FLAGS.supabaseAutoSeed;
