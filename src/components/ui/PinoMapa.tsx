import React from 'react';

/**
 * 2026-09-11 (T46) — Pino de localização sobreposto aos mapas embutidos.
 *
 * Os mapas embutidos (Google `output=embed` no Detalhe da Correspondência e
 * OpenStreetMap `export/embed.html` no Directório de Órgãos) centram sempre a
 * vista no local pedido, mas não permitem estilizar (ou sequer garantir) o
 * marcador dentro do iframe. Este componente desenha um pino da plataforma
 * exactamente no CENTRO do contentor do mapa — a ponta do pino coincide com o
 * ponto geográfico — sem capturar eventos (o mapa continua interactivo).
 *
 * Deve ser colocado dentro de um elemento `relative` que envolva o iframe.
 */
interface PinoMapaProps {
  /** Rótulo curto por cima do pino (ex.: sigla do órgão). Opcional. */
  rotulo?: string;
  /** Cor do pino (por omissão o vermelho institucional das listas «EXPIRA»). */
  cor?: string;
  /** Oculta o pino (ex.: enquanto o mapa carrega). */
  oculto?: boolean;
  /** Identificador de teste. */
  testId?: string;
}

export const PinoMapa: React.FC<PinoMapaProps> = ({
  rotulo,
  cor = '#e05252',
  oculto = false,
  testId = 'pino-mapa',
}) => (
  <div
    className={`absolute left-1/2 top-1/2 z-10 pointer-events-none select-none transition-opacity duration-300 ${oculto ? 'opacity-0' : 'opacity-100'}`}
    style={{ transform: 'translate(-50%, 0)' }}
    aria-hidden="true"
    data-testid={testId}
  >
    {/* Sombra/anel pulsante no ponto exacto (base do pino) */}
    <span
      className="absolute left-1/2 top-0 block rounded-full"
      style={{
        width: 18,
        height: 8,
        transform: 'translate(-50%, -50%)',
        background: 'rgba(15, 23, 42, 0.28)',
        filter: 'blur(1.5px)',
      }}
    />
    <span
      className="absolute left-1/2 top-0 block rounded-full animate-ping"
      style={{
        width: 22,
        height: 22,
        transform: 'translate(-50%, -50%)',
        background: cor,
        opacity: 0.35,
      }}
    />
    {/* Pino: a ponta (y = 40 do viewBox) fica no ponto do mapa */}
    <svg
      width="34"
      height="44"
      viewBox="0 0 32 42"
      className="relative block drop-shadow-[0_3px_4px_rgba(0,0,0,0.35)]"
      style={{ transform: 'translate(-50%, -100%)', marginLeft: '50%' }}
    >
      <path
        d="M16 1C8.28 1 2 7.2 2 14.9c0 9.6 11.6 22.9 13.1 24.6a1.2 1.2 0 0 0 1.8 0C18.4 37.8 30 24.5 30 14.9 30 7.2 23.72 1 16 1z"
        fill={cor}
        stroke="#ffffff"
        strokeWidth="2"
      />
      <circle cx="16" cy="15" r="5.2" fill="#ffffff" />
    </svg>
    {rotulo && (
      <span
        className="absolute left-1/2 whitespace-nowrap rounded-lg bg-white/95 border border-slate-200 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-800 shadow-md"
        style={{ transform: 'translate(-50%, 0)', top: -66 }}
      >
        {rotulo}
      </span>
    )}
  </div>
);

export default PinoMapa;
