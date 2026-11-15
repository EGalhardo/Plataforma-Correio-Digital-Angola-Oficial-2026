-- ============================================================================
-- PATCH — Instituições persistentes e território dos cidadãos
-- 2026-11-15
--
-- PORQUÊ: as páginas «Instituições» e «Cidadãos» da área admin não conseguem
-- ser funcionais porque lhes falta o suporte na base:
--   · Não existe tabela de instituições — a lista vive em
--     `localStorage['correio_digital_institutions']`, semeada a partir do
--     catálogo do código (MOCK_INSTITUTIONS). Criar/editar/eliminar não sai
--     do browser.
--   · `profiles` só tem `provincia` (todos nulos) e NÃO tem `municipio`.
--   · Não há como ligar um membro à sua instituição: só o prefixo do nº de
--     acesso (AGT-LMM-02 → AGT-LMM), que falha em 3 dos 4 registos reais.
--
-- Este patch cria a tabela `institutions` e acrescenta as duas colunas em
-- `profiles`. É IDEMPOTENTE: pode ser corrido duas vezes sem erro.
--
-- COMO APLICAR: Supabase Dashboard → SQL Editor → colar → Run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. TABELA DE INSTITUIÇÕES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.institutions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identidade
  name                TEXT NOT NULL,              -- sigla (AGT, INAPEM)
  full_name           TEXT,                       -- designação completa
  inst_code           TEXT,                       -- código institucional (AGT-001)
  type_inst           TEXT,                       -- Ministério, Instituto Público…
  category            TEXT,                       -- Finanças, Infraestrutura…

  -- Território
  province            TEXT,
  municipio           TEXT,
  cidade              TEXT,
  comuna              TEXT,
  address             TEXT,

  -- Estado
  status              TEXT NOT NULL DEFAULT 'Ativa',

  -- Contactos e responsável
  contact_email       TEXT,
  contact_phone       TEXT,
  responsible_name    TEXT,
  responsible_role    TEXT,

  -- Indicadores (mantidos para a tabela da consola)
  total_correspondence BIGINT DEFAULT 0,
  total_agents        INTEGER DEFAULT 0,
  ai_usage_rate       TEXT,
  performance_score   TEXT,
  response_rate       TEXT,
  registration_date   TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Um nome (sigla) não pode repetir — é a chave natural da consola.
CREATE UNIQUE INDEX IF NOT EXISTS institutions_name_uniq
  ON public.institutions (lower(name));

-- Filtros da página: província e município.
CREATE INDEX IF NOT EXISTS idx_institutions_territorio
  ON public.institutions (province, municipio);

CREATE INDEX IF NOT EXISTS idx_institutions_status
  ON public.institutions (status);

-- ---------------------------------------------------------------------------
-- 2. TERRITÓRIO E LIGAÇÃO INSTITUCIONAL EM `profiles`
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS municipio   TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instituicao TEXT;

COMMENT ON COLUMN public.profiles.municipio IS
  'Município de residência do cidadão. Usado pelos filtros territoriais da área admin.';
COMMENT ON COLUMN public.profiles.instituicao IS
  'Sigla da instituição a que o membro pertence (ex.: AGT-LMM). Substitui o critério de prefixo do nº de acesso.';

CREATE INDEX IF NOT EXISTS idx_profiles_territorio
  ON public.profiles (provincia, municipio);

CREATE INDEX IF NOT EXISTS idx_profiles_instituicao
  ON public.profiles (instituicao);

-- ---------------------------------------------------------------------------
-- 3. RLS — leitura pública do catálogo institucional, escrita só a autenticados
-- ---------------------------------------------------------------------------
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer utilizador autenticado (e o anon para o diretório público).
DROP POLICY IF EXISTS institutions_leitura ON public.institutions;
CREATE POLICY institutions_leitura
  ON public.institutions
  FOR SELECT
  USING (true);

-- Escrita: apenas sessões autenticadas (agente ADMIN-NNNN com sessão Supabase).
DROP POLICY IF EXISTS institutions_escrita ON public.institutions;
CREATE POLICY institutions_escrita
  ON public.institutions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Os papéis anon/authenticated/service_role existem no Supabase mas não num
-- PostgreSQL limpo; os GRANT são feitos de forma tolerante para o patch poder
-- ser validado fora do Supabase sem rebentar.
DO $$
DECLARE
  r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      IF r = 'anon' THEN
        EXECUTE 'GRANT SELECT ON public.institutions TO anon';
      ELSIF r = 'authenticated' THEN
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.institutions TO authenticated';
      ELSE
        EXECUTE 'GRANT ALL ON public.institutions TO service_role';
      END IF;
      RAISE NOTICE 'GRANT aplicado a %', r;
    ELSE
      RAISE NOTICE 'papel % inexistente neste servidor — GRANT ignorado', r;
    END IF;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. CARIMBO DE actualização
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tocar_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_institutions_updated_at ON public.institutions;
CREATE TRIGGER trg_institutions_updated_at
  BEFORE UPDATE ON public.institutions
  FOR EACH ROW
  EXECUTE FUNCTION public.tocar_updated_at();

-- ---------------------------------------------------------------------------
-- 5. VERIFICAÇÃO
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_tabela   boolean;
  v_munic    boolean;
  v_inst     boolean;
  v_rls      boolean;
  v_politicas int;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'institutions'
  ) INTO v_tabela;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'municipio'
  ) INTO v_munic;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'instituicao'
  ) INTO v_inst;

  SELECT relrowsecurity INTO v_rls
  FROM pg_class WHERE relname = 'institutions' AND relnamespace = 'public'::regnamespace;

  SELECT count(*) INTO v_politicas
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'institutions';

  RAISE NOTICE '';
  RAISE NOTICE '=== PATCH instituições + território ===';
  RAISE NOTICE 'tabela institutions .......... %', CASE WHEN v_tabela THEN 'OK' ELSE 'FALHOU' END;
  RAISE NOTICE 'profiles.municipio ........... %', CASE WHEN v_munic THEN 'OK' ELSE 'FALHOU' END;
  RAISE NOTICE 'profiles.instituicao ......... %', CASE WHEN v_inst THEN 'OK' ELSE 'FALHOU' END;
  RAISE NOTICE 'RLS activa ................... %', CASE WHEN v_rls THEN 'OK' ELSE 'FALHOU' END;
  RAISE NOTICE 'políticas em institutions .... %', v_politicas;
  RAISE NOTICE '';

  IF NOT (v_tabela AND v_munic AND v_inst AND v_rls) THEN
    RAISE EXCEPTION 'O patch não ficou completo — verifique os avisos acima.';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- ROLLBACK (descomentar e correr só se for preciso desfazer)
-- ---------------------------------------------------------------------------
-- DROP TRIGGER IF EXISTS trg_institutions_updated_at ON public.institutions;
-- DROP FUNCTION IF EXISTS public.tocar_updated_at();
-- DROP TABLE IF EXISTS public.institutions;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS municipio;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS instituicao;
