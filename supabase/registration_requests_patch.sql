-- Patch opcional para suportar o fluxo de registo civil usado pelo frontend atual
-- Aplicar apenas se pretender manter a fila administrativa de registo no Supabase.

CREATE TABLE IF NOT EXISTS solicitacoes_registo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  password_hash TEXT,
  bi_numero VARCHAR(20) UNIQUE NOT NULL,
  url_frente TEXT,
  url_verso TEXT,
  url_selfie TEXT,
  status VARCHAR(50) DEFAULT 'Pendente',
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_registo_bi ON solicitacoes_registo(bi_numero);

ALTER TABLE solicitacoes_registo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo para solicitacoes_registo" ON solicitacoes_registo;
CREATE POLICY "Permitir tudo para solicitacoes_registo" ON solicitacoes_registo FOR ALL USING (true) WITH CHECK (true);
