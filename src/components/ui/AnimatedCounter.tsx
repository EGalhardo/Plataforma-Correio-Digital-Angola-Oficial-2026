/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * AnimatedCounter - Componente de animação numérica OPTIMIZADO
 * Performance máxima com 60fps e baixo consumo de recursos
 */

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';

// ============================================================================
// TIPAGEM
// ============================================================================

interface AnimatedCounterProps {
  from?: number;
  to: number;
  duration?: number;
  decimals?: number;
  currency?: 'AOA' | 'USD' | 'EUR' | 'Kz' | string;
  prefix?: string;
  suffix?: string;
  separator?: string;
  decimalSeparator?: string;
  className?: string;
  delay?: number;
  autoStart?: boolean;
  onComplete?: (finalValue: number) => void;
  triggerOnVisible?: boolean;
  rootMargin?: string;
  'data-testid'?: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const CURRENCY_SYMBOLS: Record<string, string> = {
  AOA: 'Kz',
  KZ: 'Kz',
  USD: '$',
  EUR: '€',
};

const DEFAULT_SEPARATOR = '.';
const DEFAULT_DECIMAL_SEPARATOR = ',';

// ============================================================================
// FUNÇÕES DE EASING
// ============================================================================

const easeOutQuad = (t: number): number => t * (2 - t);

// ============================================================================
// CACHE DE FORMATAÇÃO
// ============================================================================

const formatCache = new Map<string, string>();

function getCachedFormat(value: number, decimals: number, separator: string, decimalSeparator: string): string {
  const valueKey = typeof value === 'number' ? value.toFixed(decimals) : '0';
  const key = `${valueKey}-${decimals}-${separator}-${decimalSeparator}`;
  
  if (formatCache.has(key)) {
    return formatCache.get(key)!;
  }
  
  const parts = valueKey.split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  const decimalPart = parts[1] || '';
  
  const result = decimals > 0 && decimalPart
    ? `${integerPart}${decimalSeparator}${decimalPart.padEnd(decimals, '0')}`
    : integerPart;
  
  if (formatCache.size > 1000) {
    formatCache.clear();
  }
  
  formatCache.set(key, result);
  return result;
}

// ============================================================================
// COMPONENTE PRINCIPAL (MEMOIZADO & IMPLEMENTAÇÃO LIMPA)
// ============================================================================

export const AnimatedCounter: React.FC<AnimatedCounterProps> = memo(({
  from = 0,
  to,
  duration = 1500,
  decimals = 0,
  currency,
  prefix = '',
  suffix = '',
  separator = DEFAULT_SEPARATOR,
  decimalSeparator = DEFAULT_DECIMAL_SEPARATOR,
  className = '',
  delay = 0,
  autoStart = true,
  onComplete,
  triggerOnVisible = true,
  rootMargin = '0px',
  'data-testid': testId,
}) => {
  const [displayValue, setDisplayValue] = useState(from);
  const [isVisible, setIsVisible] = useState(!triggerOnVisible);
  const isAnimatingRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Callback ref para detectar visibilidade de forma extremamente durável e reativa
  const containerRef = useCallback((node: HTMLSpanElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (!triggerOnVisible) {
      setIsVisible(true);
      return;
    }

    if (node) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        },
        { rootMargin }
      );
      observer.observe(node);
      observerRef.current = observer;
    }
  }, [triggerOnVisible, rootMargin]);

  // Limpeza de qualquer observer ativo quando desmontar
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Efeito principal de execução da animação
  useEffect(() => {
    if (!autoStart || !isVisible) {
      setDisplayValue(from);
      return;
    }

    if (from === to) {
      setDisplayValue(to);
      onComplete?.(to);
      return;
    }

    let isCancelled = false;
    let animationFrameId: number;
    let timeoutId: any;

    const runAnimation = () => {
      isAnimatingRef.current = true;
      const startTime = performance.now();
      const difference = to - from;

      const step = (timestamp: number) => {
        if (isCancelled) return;

        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutQuad(progress);

        const currentValue = from + difference * easedProgress;
        setDisplayValue(currentValue);

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(step);
        } else {
          setDisplayValue(to);
          isAnimatingRef.current = false;
          onComplete?.(to);
        }
      };

      animationFrameId = requestAnimationFrame(step);
    };

    if (delay > 0) {
      timeoutId = setTimeout(runAnimation, delay);
    } else {
      runAnimation();
    }

    return () => {
      isCancelled = true;
      cancelAnimationFrame(animationFrameId);
      clearTimeout(timeoutId);
      isAnimatingRef.current = false;
    };
  }, [from, to, duration, delay, autoStart, isVisible, onComplete]);

  // Moeda e Prefixo
  const currencyPrefix = useMemo(() => {
    if (!currency) return '';
    return CURRENCY_SYMBOLS[currency.toUpperCase()] || '';
  }, [currency]);

  const fullPrefix = useMemo(() => `${prefix}${currencyPrefix}`, [prefix, currencyPrefix]);

  const formattedValue = useMemo(() => {
    return getCachedFormat(displayValue, decimals, separator, decimalSeparator);
  }, [displayValue, decimals, separator, decimalSeparator]);

  return (
    <span
      ref={containerRef}
      className={`inline-block ${className}`}
      data-testid={testId}
      data-animating={isAnimatingRef.current}
      data-value={to}
    >
      {fullPrefix}
      <span className="tabular-nums">{formattedValue}</span>
      {suffix}
    </span>
  );
});

AnimatedCounter.displayName = 'AnimatedCounter';

// ============================================================================
// COMPONENTE ALTERNATIVO
// ============================================================================

export const CountingAnimation: React.FC<AnimatedCounterProps> = memo((props) => (
  <AnimatedCounter {...props} />
));

CountingAnimation.displayName = 'CountingAnimation';

// ============================================================================
// UTILITÁRIOS
// ============================================================================

export function formatCurrency(
  value: number,
  currency: 'AOA' | 'USD' | 'EUR' = 'AOA',
  showCents: boolean = true
): string {
  const symbols: Record<string, string> = {
    AOA: 'Kz ',
    KZ: 'Kz ',
    USD: '$ ',
    EUR: '€ ',
  };

  return `${symbols[currency] || ''}${getCachedFormat(value, showCents ? 2 : 0, '.', ',')}`;
}

export function formatAngolaNumber(value: number, decimals: number = 2): string {
  return getCachedFormat(value, decimals, '.', ',');
}

// ============================================================================
// HOOK PARA SUPABASE/WEBSOCKET
// ============================================================================

export function useAnimatedValue(
  initialValue: number,
  options?: {
    duration?: number;
    decimals?: number;
    autoStart?: boolean;
  }
) {
  const [targetValue, setTargetValue] = useState(initialValue);
  
  const updateValue = useCallback((newValue: number) => {
    setTargetValue(newValue);
  }, []);
  
  const AnimatedComponent = useCallback(
    (props?: Partial<AnimatedCounterProps>) => (
      <AnimatedCounter
        to={targetValue}
        duration={options?.duration || 1500}
        decimals={options?.decimals || 0}
        autoStart={options?.autoStart !== false}
        {...props}
      />
    ),
    [targetValue, options]
  );
  
  return { targetValue, updateValue, AnimatedComponent };
}

export default AnimatedCounter;
