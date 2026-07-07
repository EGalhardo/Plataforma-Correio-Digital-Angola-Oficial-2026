/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo } from 'react';

/**
 * Hook para preload de imagens críticas
 * Usado para imagens above-the-fold ou essenciais
 */
export function useImagePreload(srcs: string[]) {
  useEffect(() => {
    srcs.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [srcs]);
}

/**
 * Preload de imagem única
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Preload de múltiplas imagens com progresso
 */
export async function preloadImages(
  srcs: string[],
  onProgress?: (loaded: number, total: number) => void
): Promise<void[]> {
  const total = srcs.length;
  let loaded = 0;

  const promises = srcs.map(
    (src) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          loaded++;
          onProgress?.(loaded, total);
          resolve();
        };
        img.onerror = () => {
          loaded++;
          onProgress?.(loaded, total);
          resolve(); // Não rejeita, apenas continua
        };
        img.src = src;
      })
  );

  return Promise.all(promises);
}

/**
 * Hook para gerar URL de imagem otimizada com cache busting
 */
export function useOptimizedImageSrc(src: string | undefined, params?: Record<string, string | number>): string {
  return useMemo(() => {
    if (!src) return '';
    
    try {
      // Para URLs com parâmetros, adiciona cache busting
      const url = new URL(src, window.location.origin);
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.set(key, String(value));
        });
      }
      
      // Adiciona timestamp para evitar cache do browser
      url.searchParams.set('_t', Date.now().toString());
      
      return url.toString();
    } catch {
      // Se a URL for inválida, retorna a original
      return src;
    }
  }, [src, JSON.stringify(params)]);
}