-- ============================================================================
-- v1.1 (2026-07-27) — correcção validada contra o esquema REAL em produção:
--   user_requests.bi NÃO existe → a coluna real é user_requests.user_bi
--   (erro 42703 da 1.ª execução; o SQL Editor fez rollback total — nada aplicado).
-- Colunas confirmadas ao vivo: profiles.bi · solicitacoes_registo.bi_numero ·
--   messages.sender_bi/recipient_bi · notifications.target_bi · user_requests.user_bi
-- ============================================================================

-- ============================================================================
-- Correio Digital Angola — Prompt v12 (F-c): Row Level Security (RLS)
-- ----------------------------------------------------------------------------
-- RASCUNHO PARA REVISÃO + EXECUÇÃO MANUAL no Supabase Dashboard (SQL Editor).
-- NÃO é executado pela aplicação. Só aplicar DEPOIS de:
--   1) F-a/F-b (autenticação na nuvem) publicadas e testadas;
--   2) "Confirm email" DESACTIVADO (Authentication → Providers → Email);
--   3) Backup/export das tabelas actuais (precaução).
--
-- Como funciona a identidade nas políticas:
--   · Contas reais entram por Supabase Auth com metadados no JWT:
--       user_metadata.bi            → B.I. do cidadão
--       user_metadata.instituicao   → Código da instituição (agentes -NN)
--       user_metadata.role          → 'cidadao' | 'instituicao' | 'admin'
--   · auth.jwt() -> 'user_metadata' ->> 'bi' etc. lê esses valores.
--
-- ⚠️ EFEITOS CONHECIDOS AO ACTIVAR (aceites no prompt v12):
--   · Contas DEMO nunca têm sessão Auth ⇒ a sincronização nuvem dos conteúdos
--     demo deixa de funcionar (o demo é local-first — ideologia v7 intacta);
--   · A leitura anónima das tabelas MORRE (é o objectivo — risco documentado).
-- Rollback: última secção deste ficheiro.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. solicitacoes_registo (fila oficial de registo — a tabela real em uso)
--    · INSERT aberto (anon+auth): o registo acontece ANTES de existir sessão;
--    · SELECT/UPDATE/DELETE: só admin (role='admin'); o titular lê a sua linha.
-- ----------------------------------------------------------------------------
alter table solicitacoes_registo enable row level security;
-- idempotente: permite re-execução segura
drop policy if exists "solicitacoes_insert_publica" on solicitacoes_registo;
drop policy if exists "solicitacoes_select_propria_ou_admin" on solicitacoes_registo;
drop policy if exists "solicitacoes_update_admin" on solicitacoes_registo;
drop policy if exists "solicitacoes_delete_admin" on solicitacoes_registo;

create policy "solicitacoes_insert_publica"
  on solicitacoes_registo for insert
  with check (true);

create policy "solicitacoes_select_propria_ou_admin"
  on solicitacoes_registo for select
  using (
    bi_numero = (auth.jwt() -> 'user_metadata' ->> 'bi')
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

create policy "solicitacoes_update_admin"
  on solicitacoes_registo for update
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "solicitacoes_delete_admin"
  on solicitacoes_registo for delete
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ----------------------------------------------------------------------------
-- 2. profiles (ficha oficial do cidadão)
--    · titular lê/actualiza/cria a sua ficha; admin lê todas.
-- ----------------------------------------------------------------------------
alter table profiles enable row level security;
drop policy if exists "profiles_select_propria_ou_admin" on profiles;
drop policy if exists "profiles_insert_propria_ou_admin" on profiles;
drop policy if exists "profiles_update_propria" on profiles;

create policy "profiles_select_propria_ou_admin"
  on profiles for select
  using (
    bi = (auth.jwt() -> 'user_metadata' ->> 'bi')
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

create policy "profiles_insert_propria_ou_admin"
  on profiles for insert
  with check (
    bi = (auth.jwt() -> 'user_metadata' ->> 'bi')
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

create policy "profiles_update_propria"
  on profiles for update
  using (bi = (auth.jwt() -> 'user_metadata' ->> 'bi'))
  with check (bi = (auth.jwt() -> 'user_metadata' ->> 'bi'));

-- ----------------------------------------------------------------------------
-- 3. messages (correspondência) — leitura apenas da PRÓPRIA caixa
--    Nota: a correspondência institucional usa o código no campo de destino
--    (recipient_bi). Ajustar se o esquema real usar coluna própria (recipient_inst).
-- ----------------------------------------------------------------------------
alter table messages enable row level security;
drop policy if exists "messages_select_propria_caixa" on messages;
drop policy if exists "messages_insert_remetente_valido" on messages;

create policy "messages_select_propria_caixa"
  on messages for select
  using (
    recipient_bi = (auth.jwt() -> 'user_metadata' ->> 'bi')
    or recipient_bi = (auth.jwt() -> 'user_metadata' ->> 'instituicao')
    or sender_bi    = (auth.jwt() -> 'user_metadata' ->> 'bi')
    or sender_bi    = (auth.jwt() -> 'user_metadata' ->> 'instituicao')
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

create policy "messages_insert_remetente_valido"
  on messages for insert
  with check (
    sender_bi = (auth.jwt() -> 'user_metadata' ->> 'bi')
    or sender_bi = (auth.jwt() -> 'user_metadata' ->> 'instituicao')
    or (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'instituicao')
  );

-- ----------------------------------------------------------------------------
-- 4. notifications — leitura apenas dos próprios avisos
-- ----------------------------------------------------------------------------
alter table notifications enable row level security;
drop policy if exists "notifications_select_proprias" on notifications;
drop policy if exists "notifications_insert_papeis" on notifications;

create policy "notifications_select_proprias"
  on notifications for select
  using (
    target_bi = (auth.jwt() -> 'user_metadata' ->> 'bi')
    or target_bi = (auth.jwt() -> 'user_metadata' ->> 'instituicao')
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

create policy "notifications_insert_papeis"
  on notifications for insert
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'instituicao', 'cidadao'));

-- ----------------------------------------------------------------------------
-- 5. user_requests — pedidos do próprio utilizador; admin gere tudo
-- ----------------------------------------------------------------------------
alter table user_requests enable row level security;
drop policy if exists "user_requests_select_proprios_ou_admin" on user_requests;
drop policy if exists "user_requests_insert_proprio" on user_requests;
drop policy if exists "user_requests_update_admin" on user_requests;

create policy "user_requests_select_proprios_ou_admin"
  on user_requests for select
  using (
    user_bi = (auth.jwt() -> 'user_metadata' ->> 'bi')
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

create policy "user_requests_insert_proprio"
  on user_requests for insert
  with check (
    user_bi = (auth.jwt() -> 'user_metadata' ->> 'bi')
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

create policy "user_requests_update_admin"
  on user_requests for update
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ----------------------------------------------------------------------------
-- 6. audit_logs — escrita aberta (trilha de auditoria), leitura só admin
-- ----------------------------------------------------------------------------
alter table audit_logs enable row level security;
drop policy if exists "audit_insert_aberta" on audit_logs;
drop policy if exists "audit_select_admin" on audit_logs;

create policy "audit_insert_aberta"
  on audit_logs for insert
  with check (true);

create policy "audit_select_admin"
  on audit_logs for select
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ============================================================================
-- CHECKLIST PÓS-APLICAÇÃO (executar com a chave ANON — deve FALHAR tudo):
--   select * from messages limit 1;          -- esperado: erro/0 linhas (RLS)
--   select * from profiles limit 1;          -- esperado: erro/0 linhas (RLS)
--   select * from user_requests limit 1;     -- esperado: erro/0 linhas (RLS)
--
-- ============================================================================
-- ROLLBACK (se algo correr mal — volta exactamente ao estado anterior):
--   alter table solicitacoes_registo disable row level security;
--   alter table profiles           disable row level security;
--   alter table messages           disable row level security;
--   alter table notifications      disable row level security;
--   alter table user_requests      disable row level security;
--   alter table audit_logs         disable row level security;
-- ============================================================================
