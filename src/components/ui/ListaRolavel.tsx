import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  count: number;
  label: string;
  className?: string;
}

/** Mantém todos os registos acessíveis; limita apenas a janela de visualização. */
export function ListaRolavel({children, count, label, className = ''}: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  const scrollable = count > 10;

  useLayoutEffect(() => {
    if (viewport.current) viewport.current.scrollTop = 0;
  }, [count]);

  useLayoutEffect(() => {
    const root = content.current;
    if (!root || !scrollable) { setHeight(null); return; }
    const rows = Array.from(root.children) as HTMLElement[];
    const measure = () => {
      const gap = parseFloat(getComputedStyle(root).rowGap) || 0;
      const heights = rows.map(row => row.getBoundingClientRect().height);
      if (heights.length < 10) return;
      // A menor janela de dez linhas impede que cartões mais pequenos no fim
      // da lista façam aparecer mais de dez registos após deslocar a rolagem.
      let sum = heights.slice(0, 10).reduce((a, b) => a + b, 0);
      let minimum = sum;
      for (let i = 10; i < heights.length; i++) {
        sum += heights[i] - heights[i - 10];
        minimum = Math.min(minimum, sum);
      }
      const next = Math.floor(minimum + gap * 9);
      if (next > 0) setHeight(previous => previous === next ? previous : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    rows.forEach(row => observer.observe(row));
    observer.observe(root);
    return () => observer.disconnect();
  }, [children, scrollable]);

  return <div
    ref={viewport}
    role={scrollable ? 'region' : undefined}
    aria-label={scrollable ? label : undefined}
    tabIndex={scrollable ? 0 : undefined}
    data-list-scroll={scrollable ? 'true' : 'false'}
    className={`min-w-0 custom-scrollbar rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${className}`}
    style={scrollable ? {maxHeight: height ? `min(${height}px, 70vh)` : '70vh', overflowY: 'auto', scrollbarGutter: 'stable'} : undefined}
  >
    <div ref={content} data-list-content className="flex flex-col gap-3">{children}</div>
  </div>;
}
