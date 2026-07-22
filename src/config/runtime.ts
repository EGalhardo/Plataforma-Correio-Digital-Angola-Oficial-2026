export const RUNTIME_FLAGS = {
  supabaseAutoSeed: ((import.meta as any).env.VITE_ENABLE_SUPABASE_AUTO_SEED || 'false') === 'true',
  localBootstrap: ((import.meta as any).env.VITE_ENABLE_LOCAL_BOOTSTRAP || 'true') !== 'false',
  // SECURITY: mockFallback agora default FALSE para produção segura
  mockFallback: ((import.meta as any).env.VITE_ENABLE_MOCK_FALLBACK || 'false') !== 'false',
  // F5: acesso à Área de Administração exige validação facial. false = via demo de emergência permitida (com aviso); true = rígido (sem fallback)
  adminFacialStrict: ((import.meta as any).env.VITE_ENABLE_ADMIN_FACIAL_STRICT || 'false') === 'true',
};

export const shouldUseLocalBootstrap = () => RUNTIME_FLAGS.localBootstrap;
export const shouldUseMockFallback = () => RUNTIME_FLAGS.mockFallback;
export const shouldAutoSeedSupabase = () => RUNTIME_FLAGS.supabaseAutoSeed;
export const shouldUseAdminFacialStrict = () => RUNTIME_FLAGS.adminFacialStrict;
