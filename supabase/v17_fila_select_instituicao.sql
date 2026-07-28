-- ============================================================================
-- CDA · v17 — FILA VISÍVEL AO AGENTE INSTITUCIONAL (correcção B-1) · RONDA F50+
-- ----------------------------------------------------------------------------
-- Defeito B-1 (confirmado ao vivo em 2026-07-28, ronda F50):
--   Um agente INSTITUCIONAL autenticado não consegue ler a PRÓPRIA linha da
--   fila (solicitacoes_registo). A política `solicitacoes_select_propria_ou_admin`
--   (v12 → reescrita na v14) só cobre:
--       bi_numero = app_metadata.bi          (cidadão titular)
--       app_metadata.role = 'admin'          (admin)
--   Ocorre que agentes institucionais têm claims { role:'instituicao',
--   instituicao:'<CÓDIGO>', bi:null } — nenhum dos dois ramos os deixa passar
--   ⇒ o SELECT devolve sempre zero linhas.
--
--   Consequência (não é falha de segurança — é funcional): a re-hidratação
--   pós-Auth do "pack institucional" (morada, província, dados do pack)
--   introduzida na F44 está morta em produção: tudo o que depende de ler a
--   linha própria cross-device nunca consegue.
--
-- Correcção (padrão já usado na v15 para as políticas de storage):
--   acrescentar um terceiro ramo à política:
--       bi_numero = app_metadata.instituicao   (agente institucional titular)
--
--   Porque `bi_numero` guarda o código institucional em maiúsculas (v15) e o
--   claim `instituicao` também é normalizado em maiúsculas (v14 trigger), a
--   igualdade directa basta; o `upper(...)` defensivo cobre qualquer resíduo
--   em minúsculas sem alterar a semântica das linhas existentes.
--
-- Garantias preservadas (NADA muda para os outros papéis):
--   • anon continua sem ler nada (sem claims);
--   • cidadão continua a ver apenas a sua linha (ramo `bi`);
--   • admin continua a ver tudo (ramo `role='admin'`);
--   • um agente da instituição X NUNCA vê linhas de outra instituição nem de
--     cidadãos — o ramo novo só casa quando bi_numero = SEU código.
--
-- IDEMPOTENTE: pode ser re-executado sem efeitos colaterais.
-- EXECUÇÃO: Supabase → SQL Editor → colar TUDO → Run.
-- ============================================================================

drop policy if exists "solicitacoes_select_propria_ou_admin" on solicitacoes_registo;

create policy "solicitacoes_select_propria_ou_admin"
  on solicitacoes_registo for select
  using (
    -- 1) cidadão titular (inalterado desde v14)
    bi_numero = (auth.jwt() -> 'app_metadata' ->> 'bi')
    -- 2) admin vê tudo (inalterado desde v14)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    -- 3) NOVO (v17): agente institucional titular vê a(s) sua(s) linha(s)
    or upper(bi_numero) = upper(coalesce(
          auth.jwt() -> 'app_metadata' ->> 'instituicao', ''))
  );

-- (UPDATE/DELETE continuam admin-only — v14, não se toca;
--  INSERT continua público com anti-spam v15, não se toca.)

-- ============================================================================
-- VERIFICAÇÕES pós-execução (devem bater certo):
-- ----------------------------------------------------------------------------
-- ① A política existe e contém os TRÊS ramos (bi, admin, instituicao):
--    Esperado: 1 linha; coluna `qual` contém 'bi', 'admin' e 'instituicao'.
select pol.polname as politica, pg_get_expr(pol.polqual, pol.polrelid) as qual
from pg_policy pol
join pg_class cls on cls.oid = pol.polrelid
join pg_namespace ns on ns.oid = cls.relnamespace
where ns.nspname = 'public'
  and cls.relname = 'solicitacoes_registo'
  and pol.polname = 'solicitacoes_select_propria_ou_admin';

-- ② Fumo semântico com um JWT simulado (sem tocar em dados reais):
--    Simula o agente 'TST-V17' e verifica que a regra casa com bi_numero.
--    Esperado: CASA_INSTITUICAO = true · CASA_OUTRA = false
with jwt_agente as (
  select '{"role":"instituicao","instituicao":"TST-V17","bi":null}'::jsonb as app
)
select
  (select upper('TST-V17') = upper(coalesce(
     app ->> 'instituicao', '')) from jwt_agente) as casa_instituicao,
  (select upper('OUTRA-XX') = upper(coalesce(
     app ->> 'instituicao', '')) from jwt_agente) as casa_outra;

-- ③ Fumo real (opcional, fora do SQL Editor — com chave anon via REST):
--    agente TST autenticado → GET /rest/v1/solicitacoes_registo?select=bi_numero
--    Esperado: a(s) linha(s) com bi_numero = código do agente; mais nada.

-- ============================================================================
-- ROLLBACK (se necessário) — repõe exactamente o texto v14 (2 ramos):
-- ----------------------------------------------------------------------------
-- drop policy if exists "solicitacoes_select_propria_ou_admin" on solicitacoes_registo;
-- create policy "solicitacoes_select_propria_ou_admin"
--   on solicitacoes_registo for select
--   using (
--     bi_numero = (auth.jwt() -> 'app_metadata' ->> 'bi')
--     or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
--   );
-- (Com o rollback, o B-1 regressa: a re-hidratação F44 do pack institucional
--  volta a morrer silenciosamente — recomenda-se NÃO fazer rollback.)
-- ============================================================================
