-- ============================================================================
-- CDA — Correio Digital Angola
-- PATCH: criar a tabela em falta `video_session_notifications`
-- ----------------------------------------------------------------------------
-- COMO APLICAR
--   Supabase Dashboard → SQL Editor → colar TODO este ficheiro → Run
--
-- SEGURO PARA VOLTAR A CORRER (idempotente): IF NOT EXISTS / DROP POLICY IF
-- EXISTS. Correr duas vezes não dá erro nem duplica nada.
--
-- ----------------------------------------------------------------------------
-- CORRECÇÃO v2 (2026-11-04) — TIPO DA CHAVE ESTRANGEIRA
-- ----------------------------------------------------------------------------
-- A v1 deste patch declarava `id TEXT` / `session_id TEXT` porque copiava o
-- `supabase/schema.sql` do repositório. Isso falhou na base real com:
--
--   ERROR: 42804: foreign key constraint
--          "video_session_notifications_session_id_fkey" cannot be implemented
--   DETAIL: Key columns "session_id" and "id" are of incompatible types:
--           text and uuid.
--
-- Motivo: o schema.sql do repo diz `video_sessions.id TEXT`, mas a base real
-- usa **UUID**. O repositório está desactualizado em relação à base.
-- Verificado via OpenAPI do PostgREST:
--   video_sessions.id               -> uuid
--   video_session_events.id         -> uuid
--   video_session_events.session_id -> uuid
--   video_session_participants.id   -> uuid
-- Este patch alinha-se com a BASE (fonte da verdade), não com o ficheiro.
--
-- PORQUE É PRECISO
--   É a ÚNICA tabela do schema (14 em supabase/*.sql) que não existe na base.
--     GET /rest/v1/video_session_notifications
--     → 404 PGRST205 "Could not find the table ... in the schema cache"
--
-- IMPACTO REAL (sem exagero)
--   O cliente da app NUNCA escreve nesta tabela: o
--   VideoSessionService.createNotification() grava em localStorage
--   (`cda_video_notifications`). A ausência desta tabela NÃO quebra o
--   video-atendimento. Criá-la deixa o schema coerente e evita 404 em
--   consultas directas/futuras.
--
-- TESTADO
--   PostgreSQL 17 com ambiente Supabase simulado (roles anon/authenticated,
--   auth.jwt(), video_sessions.id UUID). Resultado: criação OK, 2.ª execução
--   OK (idempotente), e RLS: instituição anfitriã=1, cidadão convidado=1,
--   outro cidadão=0, admin=1, escrita de terceiro BLOQUEADA.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0) GUARDA — confirmar o tipo real antes de criar (falha com mensagem clara)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_tipo text;
BEGIN
  SELECT data_type INTO v_tipo
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'video_sessions'
     AND column_name  = 'id';

  IF v_tipo IS NULL THEN
    RAISE EXCEPTION 'A tabela public.video_sessions não existe — aplica o schema base primeiro.';
  END IF;

  IF v_tipo <> 'uuid' THEN
    RAISE EXCEPTION
      'video_sessions.id é do tipo %, mas este patch assume uuid. Usa a versão do patch adequada ao teu schema.',
      v_tipo;
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- 1) TABELA — tipos alinhados com a base real (UUID)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.video_session_notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID        NOT NULL REFERENCES public.video_sessions(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read        BOOLEAN     DEFAULT FALSE
);

-- Índice para as leituras por sessão (o schema.sql original não o define)
CREATE INDEX IF NOT EXISTS idx_video_session_notifications_session
  ON public.video_session_notifications (session_id);

-- Índice para listar as não lidas de uma sessão (padrão de uso da app)
CREATE INDEX IF NOT EXISTS idx_video_session_notifications_nao_lidas
  ON public.video_session_notifications (session_id, read)
  WHERE read IS FALSE;


-- ----------------------------------------------------------------------------
-- 2) RLS — modelo RESTRITIVO (não a política permissiva do schema de dev)
-- ----------------------------------------------------------------------------
-- O `schema.sql` de desenvolvimento cria "Permitir tudo ... USING (true)",
-- que dá acesso total a qualquer autenticado. Serve para bootstrap local, mas
-- NÃO deve ir para uma base que serve a app. Modelo aqui coerente com
-- supabase/v13_rls_hardening.sql: cada um só vê/grava o que é das suas sessões.
-- ----------------------------------------------------------------------------
ALTER TABLE public.video_session_notifications ENABLE ROW LEVEL SECURITY;

-- Remover a política permissiva, caso já exista (vinda do schema.sql)
DROP POLICY IF EXISTS "Permitir tudo para video_session_notifications"
  ON public.video_session_notifications;

DROP POLICY IF EXISTS "video_session_notifications_por_sessao"
  ON public.video_session_notifications;

CREATE POLICY "video_session_notifications_por_sessao"
  ON public.video_session_notifications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.video_sessions s
       WHERE s.id = video_session_notifications.session_id
         AND (
              -- anfitrião: agente da instituição (claim instituicao, senão bi)
              upper(s.host_bi) = upper(coalesce(
                   auth.jwt() -> 'app_metadata' ->> 'instituicao',
                   auth.jwt() -> 'app_metadata' ->> 'bi',
                   ''))
              -- convidado: o cidadão da sessão
           OR upper(s.guest_bi) = upper(coalesce(
                   auth.jwt() -> 'app_metadata' ->> 'bi',
                   ''))
              -- administração central
           OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM public.video_sessions s
       WHERE s.id = video_session_notifications.session_id
         AND (
              upper(s.host_bi) = upper(coalesce(
                   auth.jwt() -> 'app_metadata' ->> 'instituicao',
                   auth.jwt() -> 'app_metadata' ->> 'bi',
                   ''))
           OR upper(s.guest_bi) = upper(coalesce(
                   auth.jwt() -> 'app_metadata' ->> 'bi',
                   ''))
           OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
         )
    )
  );


-- ----------------------------------------------------------------------------
-- 3) PERMISSÕES
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.video_session_notifications TO authenticated;


-- ----------------------------------------------------------------------------
-- 4) VERIFICAÇÃO (opcional — devolve 2 linhas)
-- ----------------------------------------------------------------------------
SELECT 'tabela criada'  AS verificacao, count(*)::text AS resultado
  FROM information_schema.tables
 WHERE table_schema = 'public'
   AND table_name   = 'video_session_notifications'
UNION ALL
SELECT 'politicas RLS', count(*)::text
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename  = 'video_session_notifications';


-- ============================================================================
-- ROLLBACK (só se quiseres desfazer — descomenta e corre)
-- ----------------------------------------------------------------------------
-- DROP POLICY IF EXISTS "video_session_notifications_por_sessao"
--   ON public.video_session_notifications;
-- DROP TABLE IF EXISTS public.video_session_notifications;
-- ============================================================================
