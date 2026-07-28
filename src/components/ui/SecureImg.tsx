// ============================================================================
// F45 — <SecureImg> / hook de URL assinado (Auditoria F42 · P2 Storage Privado)
// ----------------------------------------------------------------------------
// Substitui <img src={urlPublica}> em tudo o que vem do Storage: resolve
// marcadores "storage:<bucket>/<path>" e URLs públicas legadas para um URL
// ASSINADO de curta duração. Referências externas (data:, unsplash, ícones)
// passam intactas. Enquanto o SQL v15 não for aplicado (bucket ainda público),
// o fallback do resolvedor mantém tudo visível.
// ============================================================================

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { isStorageRef, resolveStorageUrl } from '../../lib/secureStorage';

/** Hook: resolve uma referência (marcador/legada/externa) para src utilizável. */
export const useResolvedStorageUrl = (raw?: string | null): string => {
  const [resolved, setResolved] = useState<string>(() =>
    raw && !isStorageRef(raw) ? raw : ''
  );

  useEffect(() => {
    let alive = true;
    const val = raw || '';
    if (!val) { setResolved(''); return; }
    if (!isStorageRef(val)) { setResolved(val); return; } // externo/data — directo
    resolveStorageUrl(supabase, val)
      .then(u => { if (alive) setResolved(u); })
      .catch(() => { if (alive) setResolved(''); });
    return () => { alive = false; };
  }, [raw]);

  return resolved;
};

interface SecureImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Referência gravada (marcador storage:, URL pública legada, data-URL ou externo). */
  storageRef?: string | null;
  /** src clássico — usado tal qual quando não é referência de storage. */
  src?: string | null;
  /** Mostrado enquanto resolve / em falha total (ex.: ícone neutro). */
  fallback?: string;
}

/** <img> que sabe resolver referências de Storage selado. */
export const SecureImg: React.FC<SecureImgProps> = ({ storageRef, src, fallback, alt, ...rest }) => {
  const raw = (storageRef ?? src ?? '') || '';
  const resolved = useResolvedStorageUrl(raw);
  const finalSrc = resolved || fallback || '';
  if (!finalSrc) return null;
  return <img src={finalSrc} alt={alt ?? ''} {...rest} />;
};

export default SecureImg;
