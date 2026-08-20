/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Q-1 (backlog) — QR 100% LOCAL.
 * Antes: `qrCodeUrl` era um URL para api.qrserver.com → cada protocolo criado
 * enviava o conteúdo do registo a um serviço externo (fuga de dados) e o URL
 * ficava gravado na tabela digital_protocols.
 * Agora: o valor guardado é o PAYLOAD (`AO-PROTOCOL:…`) e a imagem QR é
 * desenhada offline no cliente pelo pacote local 'qrcode' (data-URI, zero
 * rede). Registos legados com URL externo têm o parâmetro `data=` extraído e
 * são renderizados localmente — NUNCA se contacta o serviço externo.
 */
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** Extrai o payload CDA de um valor guardado. Nunca devolve URL externo de terceiros. */
export function qrPayloadFromStored(stored?: string | null): string | null {
  const v = (stored || '').trim();
  if (!v) return null;
  // Payload directo (formato legado)
  if (v.startsWith('AO-PROTOCOL:')) return v;
  if (/^https?:\/\//i.test(v)) {
    try {
      const u = new URL(v);
      // URL externo legado (api.qrserver.com): resgata o payload do parâmetro
      // data= e renderiza local — nunca contacta o serviço externo.
      const data = u.searchParams.get('data');
      if (data) return data;
      // Q-2 — deep-link da própria plataforma (?correspondencia=...): o QR
      // renderiza o PRÓPRIO URL para o telemóvel abrir a correspondência.
      if (u.searchParams.get('correspondencia')) return v;
      // Qualquer outro domínio: nunca é renderizado (sem fuga de dados).
      return null;
    } catch {
      return null;
    }
  }
  // Valor livre mais antigo: tratar como payload textual
  return v;
}

export function QrCodeImage({
  value,
  size = 160,
  className,
}: {
  value?: string | null;
  size?: number;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const payload = qrPayloadFromStored(value);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    if (!payload) return;
    QRCode.toDataURL(payload, {
      width: size * 2,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => { if (!cancelled) setSrc(url); })
      .catch(() => { if (!cancelled) setSrc(null); });
    return () => { cancelled = true; };
  }, [payload, size]);

  if (!payload || !src) {
    // Estado honesto: nunca aponta para fora nem inventa imagem
    return (
      <div
        className={className}
        style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #cbd5e1', borderRadius: 8, color: '#94a3b8', fontSize: 9, textAlign: 'center', padding: 4 }}
        role="img"
        aria-label="QR indisponível"
      >
        QR indisponível
      </div>
    );
  }
  return <img src={src} width={size} height={size} className={className} alt="Código QR do registo" />;
}
