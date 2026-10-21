/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext, useContext } from 'react';

/**
 * 2026-09-11 — Navegação «voltar» das subpáginas.
 *
 * O App mantém uma pilha das páginas (tabs) visitadas e expõe `voltar()`,
 * que regressa à página anterior válida (ou ao Painel do portal quando a
 * pilha está vazia). As subpáginas renderizam `<BotaoVoltar />` à esquerda do
 * título e, salvo indicação em contrário, delegam neste contexto.
 */
export interface VoltarContextValue {
  /** Regressa à página anterior (ou ao Painel do portal). */
  voltar: () => void;
}

export const VoltarContext = createContext<VoltarContextValue>({
  voltar: () => { /* sem provider (testes/isolado): sem efeito */ },
});

export function useVoltar(): VoltarContextValue {
  return useContext(VoltarContext);
}
