/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, memo } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  placeholder?: 'blur' | 'skeleton';
  blurDataUrl?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  style?: React.CSSProperties;
  id?: string;
  'data-testid'?: string;
  onClick?: () => void;
}

/**
 * Componente de imagem otimizado com lazy loading nativo
 * - Lazy loading automático para imagens fora da viewport
 * - Placeholder durante carregamento
 * - Suporte para blur placeholder
 * - Prioridade para imagens above-the-fold
 */
export const LazyImage = memo(function LazyImage({
  src,
  alt,
  className = '',
  width,
  height,
  placeholder = 'skeleton',
  blurDataUrl,
  priority = false,
  onLoad,
  onError,
  style,
  id,
  'data-testid': testId,
  onClick,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isInView, setIsInView] = useState(priority); // Imagens priority carregam imediatamente
  const imgRef = useRef<HTMLDivElement>(null);

  // Intersection Observer para lazy loading
  useEffect(() => {
    if (priority) return; // Imagens priority não precisam de observer

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px', // Carrega 100px antes de entrar na viewport
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setIsError(true);
    onError?.();
  };

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    width: width || '100%',
    height: height || 'auto',
    backgroundColor: '#f1f5f9',
    ...style,
  };

  // Skeleton placeholder
  const skeletonStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  };

  // Blur placeholder
  const blurStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    filter: 'blur(20px)',
    transform: 'scale(1.1)', // Evita bordas brancas no blur
    transition: 'opacity 0.3s ease',
    opacity: isLoaded ? 0 : 1,
  };

  return (
    <div 
      ref={imgRef} 
      style={containerStyle} 
      className={`lazy-image-container ${className}`}
      id={id}
      data-testid={testId}
      onClick={onClick}
    >
      {/* CSS Animation para shimmer */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .lazy-image-container img {
          transition: opacity 0.3s ease;
        }
      `}</style>

      {/* Skeleton placeholder */}
      {!isLoaded && !isError && placeholder === 'skeleton' && (
        <div style={skeletonStyle} />
      )}

      {/* Blur placeholder */}
      {!isLoaded && !isError && placeholder === 'blur' && blurDataUrl && (
        <img src={blurDataUrl} alt="" style={blurStyle} />
      )}

      {/* Imagem real - só carrega quando entra na viewport */}
      {isInView && (
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          style={{
            width: '100%',
            height: '100%',
            objectFit: style?.objectFit || 'cover',
            transform: style?.transform,
            transition: style?.transition || 'opacity 0.3s ease',
            opacity: isLoaded ? 1 : 0,
            display: 'block',
          }}
        />
      )}

      {/* Fallback para erro */}
      {isError && (
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f1f5f9',
            color: '#94a3b8',
            fontSize: '0.75rem',
            fontWeight: '600',
          }}
        >
          Imagem não disponível
        </div>
      )}
    </div>
  );
});