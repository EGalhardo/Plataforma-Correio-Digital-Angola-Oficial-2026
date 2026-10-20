/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, memo } from 'react';

interface BackgroundImageProps {
  src: string;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
  children?: React.ReactNode;
}

/**
 * Componente de background image otimizado
 * Carrega a imagem apenas quando visível na viewport
 */
export const BackgroundImage = memo(function BackgroundImage({
  src,
  className = '',
  style = {},
  priority = false,
  children,
}: BackgroundImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(priority);

  useEffect(() => {
    if (priority || !src) return;

    // Para imagens de background, usamos um observer mais permissivo
    // A imagem carrega quando o elemento está prestes a entrar na viewport
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px', threshold: 0 }
    );

    // Observa o elemento pai mais próximo
    const element = document.querySelector(`[data-bg="${src}"]`);
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [priority, src]);

  useEffect(() => {
    if (!isVisible || !src) return;

    const img = new Image();
    img.onload = () => setIsLoaded(true);
    img.onerror = () => setIsLoaded(false);
    img.src = src;
  }, [isVisible, src]);

  return (
    <div
      data-bg={src}
      className={className}
      style={{
        ...style,
        backgroundImage: isLoaded ? `url(${src})` : 'none',
        backgroundColor: isLoaded ? 'transparent' : '#f1f5f9',
        transition: 'background-image 0.3s ease',
      }}
    >
      {!isLoaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
            backgroundSize: '200% 100%',
            animation: 'bg-shimmer 1.5s infinite',
          }}
        />
      )}
      {children}
      <style>{`
        @keyframes bg-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
});