/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ArrowLeft } from 'lucide-react';
import { useVoltar } from '../../context/navegacao/VoltarContext';

interface BotaoVoltarProps {
  /**
   * Acção específica (ex.: fechar uma sub-vista interna da página). Quando
   * omitida, regressa à página anterior via VoltarContext.
   */
  onClick?: () => void;
  /** Texto acessível / tooltip. Por omissão «Voltar». */
  titulo?: string;
  /** Classes adicionais (posicionamento). */
  className?: string;
  /** Identificador estável para testes/automação. */
  id?: string;
}

/**
 * 2026-09-11 — Seta de voltar ÚNICA de todas as subpáginas: botão circular,
 * à esquerda do título, na área central de conteúdo. Estilo alinhado com o
 * botão de voltar já usado no detalhe de documentos/mensagens.
 */
export function BotaoVoltar({ onClick, titulo = 'Voltar', className = '', id }: BotaoVoltarProps) {
  const { voltar } = useVoltar();
  return (
    <button
      type="button"
      id={id}
      data-cda-voltar=""
      onClick={onClick ?? voltar}
      title={titulo}
      aria-label={titulo}
      className={`cda-btn-voltar flex items-center justify-center w-10 h-10 shrink-0 bg-white border-2 border-[#d1dbe5] rounded-full text-[#384e6e] hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer ${className}`}
    >
      <ArrowLeft size={16} />
    </button>
  );
}
