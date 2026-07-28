// ============================================================================
// F45 — Armazenamento Selado (Auditoria F42 · P2 Storage Privado)
// ----------------------------------------------------------------------------
// A partir da v15 os buckets `documentos_registo` e `correspondencias_anexos`
// são PRIVADOS: as URL públicas deixam de servir e toda a leitura é feita por
// URL ASSINADO de curta duração (createSignedUrl).
//
// Formato de referência gravado na base (retro-compatível):
//   · NOVO  — marcador "storage:<bucket>/<path>"  (ex.: storage:documentos_registo/006.../frente_1.jpg)
//   · LEGADO — URL pública inteira  ".../storage/v1/object/public/<bucket>/<path>"
//   · EXTERNO — data:image/..., https://images.unsplash.com/... passam INTACTOS
//
// O resolvedor tem cache em memória (evita re-assinar a cada render) e FALLBACK
// para URL pública: enquanto o SQL v15 não for aplicado (bucket ainda público)
// continua tudo a funcionar — janela de deploy sem quebra.
// ============================================================================

export const STORAGE_REF_PREFIX = 'storage:';

export interface StorageRef {
  bucket: string;
  path: string;
}

/** Constrói o marcador canonico gravado na base em vez da URL pública. */
export const buildStorageRef = (bucket: string, path: string): string =>
  `${STORAGE_REF_PREFIX}${bucket}/${path}`;

/**
 * Interpreta uma referência gravada (marcador novo OU URL pública legada OU
 * URL assinada antiga). Devolve null se não for referência de storage
 * (data-URL, URL externo, vazio, lixo).
 */
export const parseStorageRef = (raw?: string | null): StorageRef | null => {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;

  // 1) Marcador novo: storage:<bucket>/<path>
  if (s.startsWith(STORAGE_REF_PREFIX)) {
    const rest = s.slice(STORAGE_REF_PREFIX.length);
    const sep = rest.indexOf('/');
    if (sep <= 0 || sep === rest.length - 1) return null;
    return { bucket: rest.slice(0, sep), path: rest.slice(sep + 1) };
  }

  // 2) URL do Storage (pública legada ou assinada antiga):
  //    https://<proj>.supabase.co/storage/v1/object/(public|sign)/<bucket>/<path>[?token=...]
  const m = s.match(/^https?:\/\/[^/]+\.supabase\.(?:co|in)\/storage\/v1\/object\/(?:public|sign)\/([^/?]+)\/(.+?)(?:\?.*)?$/i);
  if (m && m[1] && m[2]) {
    let path = m[2];
    try { path = decodeURIComponent(m[2]); } catch { /* mantém cru */ }
    return { bucket: m[1], path };
  }

  return null;
};

/** Verdadeiro se a referência é de storage (marcador ou URL supabase). */
export const isStorageRef = (raw?: string | null): boolean => parseStorageRef(raw) !== null;

// ----------------------------------------------------------------------------
// Cache de URLs assinados (memória do separador): evita re-assinar em cada
// render de lista. Margem de segurança de 30s antes da expiração.
// ----------------------------------------------------------------------------
interface CacheEntry { url: string; expiresAt: number; }
const signedCache = new Map<string, CacheEntry>();
const CACHE_SAFETY_MS = 30_000;
const DEFAULT_TTL_SECONDS = 3600; // 1h — renovado transparentemente pela cache

/** Esvazia a cache (útil nos testes e no logout). */
export const clearSignedUrlCache = (): void => { signedCache.clear(); };

/** Tamanho actual da cache (introspecção para suites). */
export const signedUrlCacheSize = (): number => signedCache.size;

/**
 * Resolve uma referência (marcador/URL legada) para um URL utilizável em
 * <img>/<a>/download:
 *   · referências não-storage → devolvidas INTACTAS (data:, http externo, '')
 *   · storage → URL assinado (cache hit ou createSignedUrl)
 *   · falha total (ex.: SQL v15 ainda não aplicado e SDK antigo) → URL pública
 *     (ainda funciona enquanto o bucket estiver público — janela de deploy)
 */
export const resolveStorageUrl = async (
  supabase: any,
  raw?: string | null,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<string> => {
  if (!raw || typeof raw !== 'string') return '';
  const s = raw.trim();
  if (!s) return '';

  const ref = parseStorageRef(s);
  if (!ref) return s; // data-URL / URL externo / texto — passa intacto

  const key = `${ref.bucket}/${ref.path}`;
  const hit = signedCache.get(key);
  if (hit && hit.expiresAt - CACHE_SAFETY_MS > Date.now()) return hit.url;

  if (supabase?.storage?.from) {
    try {
      const { data, error } = await supabase.storage
        .from(ref.bucket)
        .createSignedUrl(ref.path, ttlSeconds);
      if (!error && data?.signedUrl) {
        signedCache.set(key, { url: data.signedUrl, expiresAt: Date.now() + ttlSeconds * 1000 });
        return data.signedUrl;
      }
    } catch { /* segue para fallback */ }

    // Fallback de janela de deploy: bucket ainda público → URL pública serve.
    try {
      const { data } = supabase.storage.from(ref.bucket).getPublicUrl(ref.path);
      if (data?.publicUrl) return data.publicUrl;
    } catch { /* nada a fazer */ }
  }

  return '';
};

/** Resolve uma lista em paralelo, mantendo a ordem (posições vazias → ''). */
export const resolveStorageUrls = async (
  supabase: any,
  raws: (string | null | undefined)[],
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<string[]> => Promise.all(raws.map(r => resolveStorageUrl(supabase, r, ttlSeconds)));

/**
 * Bucket da referência (para componentes que só precisam de saber se devem
 * tratar a imagem como segura). Conveniência para <SecureImg>.
 */
export const storageRefBucket = (raw?: string | null): string | null => parseStorageRef(raw)?.bucket ?? null;
