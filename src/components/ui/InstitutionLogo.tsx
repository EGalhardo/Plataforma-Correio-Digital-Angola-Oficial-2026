/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================================
// InstitutionLogo — logomarca institucional DINÂMICA (Ficha Institucional)
// ----------------------------------------------------------------------------
// Componente 100% genérico e reutilizável:
//   • Se a instituição tem `logoUrl` (catálogo INSTITUTION_LOGOS, dados da
//     instituição ou registo local) → apresenta a logomarca oficial com
//     `object-fit: contain`, proporções originais respeitadas, sem distorção
//     nem corte, com dimensões máximas (não domina o layout).
//   • Se NÃO tem logomarca → apresenta um placeholder institucional elegante
//     com a sigla (data-URI SVG gerado dinamicamente) — nunca imagem quebrada,
//     nunca espaço vazio exagerado, layout sempre alinhado.
//   • Transição suave (opacity/transform) ao mudar de instituição.
//   • Responsivo: desktop à esquerda da identificação; mobile adapta-se.
// ============================================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  derivarSiglaInstituicao,
  gerarPlaceholderInstituicao,
} from '../../config/institutionLogos';

interface InstitutionLogoProps {
  /** Nome/chave da instituição selecionada (ex.: 'AGT', 'SME'). */
  name: string;
  /** URL da logomarca oficial (opcional — vinda do catálogo/dados). */
  logoUrl?: string;
  /** Tamanho da moldura (px). Default 64. */
  size?: number;
  /** Classes adicionais (margens, etc.). */
  className?: string;
  /** Teste automatizado. */
  'data-testid'?: string;
}

export const InstitutionLogo: React.FC<InstitutionLogoProps> = ({
  name,
  logoUrl,
  size = 64,
  className = '',
  'data-testid': testId,
}) => {
  const [imgError, setImgError] = useState(false);

  // Logomarca válida? (URL presente e a imagem não falhou ao carregar)
  const temLogomarca = !!logoUrl && !imgError;
  const placeholder = gerarPlaceholderInstituicao(name);
  const sigla = derivarSiglaInstituicao(name);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={temLogomarca ? `logo-${name}` : `placeholder-${name}`}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className={`shrink-0 flex items-center justify-center select-none ${className}`}
        data-testid={testId}
        style={{ width: size, height: size }}
      >
        {temLogomarca ? (
          <img
            src={logoUrl!}
            alt={`Logomarca da instituição ${name}`}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-contain drop-shadow-sm"
            style={{ maxWidth: size, maxHeight: size }}
          />
        ) : (
          <img
            src={placeholder}
            alt={`${sigla} — instituição do Correio Digital de Angola`}
            className="w-full h-full object-contain"
            style={{ maxWidth: size, maxHeight: size }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default InstitutionLogo;
