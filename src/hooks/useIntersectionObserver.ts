/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  freezeOnceVisible?: boolean;
}

interface UseIntersectionObserverReturn {
  ref: React.RefObject<HTMLElement | null>;
  isIntersecting: boolean;
  entry?: IntersectionObserverEntry;
}

/**
 * Hook para Intersection Observer - detecta quando elemento entra na viewport
 */
export function useIntersectionObserver({
  threshold = 0,
  root = null,
  rootMargin = '0px',
  freezeOnceVisible = false,
}: UseIntersectionObserverOptions = {}): UseIntersectionObserverReturn {
  const ref = useRef<HTMLElement | null>(null);
  const [entry, setEntry] = useState<IntersectionObserverEntry>();
  const frozen = useRef(false);

  const isIntersecting = entry?.isIntersecting ?? false;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (frozen.current && freezeOnceVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setEntry(entry);
        if (freezeOnceVisible && entry.isIntersecting) {
          frozen.current = true;
        }
      },
      { threshold, root, rootMargin }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [JSON.stringify(threshold), root, rootMargin, freezeOnceVisible]);

  return { ref, isIntersecting, entry };
}

/**
 * Hook para lazy loading de múltiplos elementos
 */
export function useLazyLoad<T extends HTMLElement>(
  options: UseIntersectionObserverOptions = {}
) {
  const { ref, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px',
    freezeOnceVisible: true,
    ...options,
  });

  return { containerRef: ref as React.RefObject<T>, shouldLoad: isIntersecting };
}