-- ============================================================================
-- v1.2-b (2026-07-27) — correcção do erro 42P01 da 1.ª execução:
--   "relation video_session_notifications does not exist" — a tabela está no
--   schema.sql mas NUNCA foi criada em produção. O SQL Editor corre o script
--   inteiro numa transação única → o erro fez ROLLBACK TOTAL (verificado ao
--   vivo com a chave anon: messages/profiles/etc. continuavam legíveis).
--   NADA ficou aplicado; esta versão pode ser executada de imediato.
-- ============================================================================
-- ============================================================================
-- Correio Digital Angola — RLS v1.2 (HARDENING REAL)
-- ----------------------------------------------------------------------------
-- CAUSA-RAIZ ENCONTRADA (2026-07-27, verificado ao vivo com a chave anon):
--   O supabase/schema.sql (executado na criação do projecto) activou RLS mas
--   criou políticas PERMISSIVAS de desenvolvimento em TODAS as tabelas:
--       CREATE POLICY "Permitir tudo para X" ... FOR ALL
--       USING (true) WITH CHECK (true);
--   As políticas permissivas são OU-lógicas: enquanto existirem, TODO o
--   acesso passa. O script v1.1 (tabelas 1-6) só removia as SUAS próprias
--   políticas — as "Permitir tudo" ficaram e mantiveram tudo aberto.
--
--   PROVA ao vivo (anon, DEPOIS da v1.1 aplicada com sucesso):
--     profiles: 40 linhas legíveis · messages: 187 · solicitacoes_registo: 2
--     (com password_hash em claro!) · audit_logs: 3519 · notifications: 132
--     user_requests: 53 · contacts: 4 · documents: 8 · digital_protocols: 19
--     INSERT em messages chegou ao constraint NOT NULL em vez do erro 42501
--     → confirma que o RLS não estava a bloquear NADA.
--
-- O QUE ESTE SCRIPT FAZ:
--   A) REMOVE as 13 políticas "Permitir tudo" (órfãs do schema.sql);
--   B) Fecha as 8 tabelas que a v1.1 NÃO cobria (contacts, documents,
--      document_requests, digital_protocols, message_state_history,
--      video_sessions, video_session_events, video_session_notifications)
--      com políticas mínimas baseadas no mesmo modelo da v1.1:
--        auth.jwt() -> 'user_metadata' ->> 'bi' | 'instituicao' | 'role'
--   C) Re-afirma enable row level security em TODAS as tabelas (idempotente).
--
-- COMPATIBILIDADE (fluxos reais verificados no código — src/services/*):
--   · Cidadão: lê/cria os SEUS contactos, documentos, pedidos, histórico da
--     SUA caixa, sessões de vídeo em que participa. (App.tsx l.1911/3430/3164)
--   · Instituição: lê documentos/pedidos/protocolos do âmbito institucional.
--   · Admin (role='admin'): leitura total; escrita nos fluxos de gestão.
--   · Contas DEMO (sem sessão Auth): acesso nuvem morre — ACEITE desde a v1.1
--     (demo é local-first, ideologia v7 intacta).
--   · message_state_history/digital_protocols: dono inferido via EXISTS em
--      messages (l.461/474/1089/1121 de supabaseService.ts).
--   · video_session_notifications: tabela NÃO usada pelo código (0 referências
--      em src/) → RLS activo SEM políticas = acesso negado a todos.
--
-- EXECUÇÃO: Supabase Dashboard → SQL Editor → colar TUDO → Run.
--   Esperado: "Success. No rows returned". Idempotente (drop if exists —
--   pode re-executar sem erro). Rollback: última secção.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A) REMOVER AS POLÍTICAS PERMISSIVAS HERDADAS DO schema.sql  ← O FURO
-- ----------------------------------------------------------------------------
drop policy if exists "Permitir tudo para profiles" on profiles;
drop policy if exists "Permitir tudo para digital_protocols" on digital_protocols;
drop policy if exists "Permitir tudo para messages" on messages;
drop policy if exists "Permitir tudo para message_state_history" on message_state_history;
drop policy if exists "Permitir tudo para documents" on documents;
drop policy if exists "Permitir tudo para contacts" on contacts;
drop policy if exists "Permitir tudo para notifications" on notifications;
drop policy if exists "Permitir tudo para user_requests" on user_requests;
drop policy if exists "Permitir tudo para document_requests" on document_requests;
drop policy if exists "Permitir tudo para audit_logs" on audit_logs;
drop policy if exists "Permitir tudo para video_sessions" on video_sessions;
drop policy if exists "Permitir tudo para video_session_events" on video_session_events;
-- video_session_notifications: confirmado INEXISTENTE em produção (42P01).
-- Bloco protegido: se um dia for criada, este passo activa RLS e remove a
-- política permissiva; se não existir, é ignorado sem abortar o script.
do $$
begin
  alter table video_session_notifications enable row level security;
  drop policy if exists "Permitir tudo para video_session_notifications" on video_session_notifications;
  raise notice 'video_session_notifications existe — RLS activo, permissiva removida.';
exception when undefined_table then
  raise notice 'video_session_notifications nao existe em producao — passo ignorado.';
end $$;
-- NOTA: só v1.2 remove as "Permitir tudo". Se o schema.sql for re-executado
-- um dia, elas VOLTAM e reabrem tudo → não re-executar schema.sql.

-- ----------------------------------------------------------------------------
-- B1) contacts — o dono gere os seus contactos; admin lê tudo
-- ----------------------------------------------------------------------------
alter table contacts enable row level security;
drop policy if exists "contacts_select_proprios_ou_admin" on contacts;
drop policy if exists "contacts_insert_proprio" on contacts;
drop policy if exists "contacts_update_proprio" on contacts;
drop policy if exists "contacts_delete_proprio" on contacts;

create policy "contacts_select_proprios_ou_admin"
  on contacts for select
  using (
    owner_bi = (auth.jwt() -> 'user_metadata' ->> 'bi')
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

create policy "contacts_insert_proprio"
  on contacts for insert
  with check (
    owner_bi = (auth.jwt() -> 'user_metadata' ->> 'bi')
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

create policy "contacts_update_proprio"
  on contacts for update
  using (owner_bi = (auth.jwt() -> 'user_metadata' ->> 'bi'))
  with check (owner_bi = (auth.jwt() -> 'user_metadata' ->> 'bi'));

create policy "contacts_delete_proprio"
  on contacts for delete
  using (owner_bi = (auth.jwt() -> 'user_metadata' ->> 'bi'));

-- ----------------------------------------------------------------------------
-- B2) documents — titular lê/cria os seus; instituição/admin emitem e consultam
--     (supabaseService.getDocuments(holder_bi) l.804 · insertDocument upsert l.504)
-- ----------------------------------------------------------------------------
alter table documents enable row level security;
drop policy if exists "documents_select_titular_ou_servico" on documents;
drop policy if exists "documents_insert_emissor_ou_titular" on documents;
drop policy if exists "documents_update_emissor_ou_titular" on documents;

create policy "documents_select_titular_ou_servico"
  on documents for select
  using (
    holder_bi = (auth.jwt() -> 'user_metadata' ->> 'bi')
    or (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'instituicao')
  );

create policy "documents_insert_emissor_ou_titular"
  on documents for insert
  with check (
    holder_bi = (auth.jwt() -> 'user_metadata' ->> 'bi')
    or (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'instituicao')
  );

create policy "documents_update_emissor_ou_titular"
  on documents for update
  using (
    holder_bi = (auth.jwt() -> 'user_metadata' ->> 'bi')
    or (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'instituicao')
  )
  with check (
    holder_bi = (auth.jwt() -> 'user_metadata' ->> 'bi')
    or (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'instituicao')
  );

-- ----------------------------------------------------------------------------
-- B3) document_requests — cidadão cria/vê os seus; instituição vê/actualiza
--     os do SEU código; admin tudo.
--     (App l.1945 gov lê sem filtro → RLS faz o corte; l.3430 cidadão cria)
-- ----------------------------------------------------------------------------
alter table document_requests enable row level security;
drop policy if exists "doc_requests_select_escopo" on document_requests;
drop policy if exists "doc_requests_insert_proprio" on document_requests;
drop policy if exists "doc_requests_update_escopo" on document_requests;

create policy "doc_requests_select_escopo"
  on document_requests for select
  using (
    user_bi = (auth.jwt() -> 'user_metadata' ->> 'bi')
    or institution = (auth.jwt() -> 'user_metadata' ->> 'instituicao')
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

create policy "doc_requests_insert_proprio"
  on document_requests for insert
  with check (
    user_bi = (auth.jwt() -> 'user_metadata' ->> 'bi')
    or (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'instituicao')
  );

create policy "doc_requests_update_escopo"
  on document_requests for update
  using (
    user_bi = (auth.jwt() -> 'user_metadata' ->> 'bi')
    or institution = (auth.jwt() -> 'user_metadata' ->> 'instituicao')
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  )
  with check (
    user_bi = (auth.jwt() -> 'user_metadata' ->> 'bi')
    or institution = (auth.jwt() -> 'user_metadata' ->> 'instituicao')
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- ----------------------------------------------------------------------------
-- B4) digital_protocols — leitura: instituições/admin; emissão: qualquer papel
--     autenticado (a app emite protocolo ao enviar correspondência — App l.2836
--     + 3 outros pontos). Sem coluna de cidadão → cidadão não lê (não usa).
-- ----------------------------------------------------------------------------
alter table digital_protocols enable row level security;
drop policy if exists "protocols_select_institucional" on digital_protocols;
drop policy if exists "protocols_insert_autenticado" on digital_protocols;

create policy "protocols_select_institucional"
  on digital_protocols for select
  using (
    issuer_institution = (auth.jwt() -> 'user_metadata' ->> 'instituicao')
    or (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'instituicao')
  );

create policy "protocols_insert_autenticado"
  on digital_protocols for insert
  with check (
    (auth.jwt() -> 'user_metadata' ->> 'role') in ('cidadao', 'instituicao', 'admin')
  );

-- ----------------------------------------------------------------------------
-- B5) message_state_history — trilha visível apenas a quem vê a mensagem
--     (dono = sender/recipient da mensagem referenciada; subconsulta com RLS)
-- ----------------------------------------------------------------------------
alter table message_state_history enable row level security;
drop policy if exists "msg_history_select_da_caixa" on message_state_history;
drop policy if exists "msg_history_insert_da_caixa" on message_state_history;

create policy "msg_history_select_da_caixa"
  on message_state_history for select
  using (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    or exists (
      select 1 from messages m
      where m.id = message_state_history.message_id
        and (
          m.sender_bi    = (auth.jwt() -> 'user_metadata' ->> 'bi')
          or m.recipient_bi = (auth.jwt() -> 'user_metadata' ->> 'bi')
          or m.sender_bi    = (auth.jwt() -> 'user_metadata' ->> 'instituicao')
          or m.recipient_bi = (auth.jwt() -> 'user_metadata' ->> 'instituicao')
        )
    )
  );

create policy "msg_history_insert_da_caixa"
  on message_state_history for insert
  with check (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    or exists (
      select 1 from messages m
      where m.id = message_state_history.message_id
        and (
          m.sender_bi    = (auth.jwt() -> 'user_metadata' ->> 'bi')
          or m.recipient_bi = (auth.jwt() -> 'user_metadata' ->> 'bi')
          or m.sender_bi    = (auth.jwt() -> 'user_metadata' ->> 'instituicao')
          or m.recipient_bi = (auth.jwt() -> 'user_metadata' ->> 'instituicao')
        )
    )
  );

-- ----------------------------------------------------------------------------
-- B6) video_sessions / video_session_events — participantes e admin
--     (videoSessionService: select geral l.211, insert host l.310, update
--      status l.378, eventos insert l.439 / select por sessão l.474)
-- ----------------------------------------------------------------------------
alter table video_sessions enable row level security;
drop policy if exists "video_sessions_select_participante" on video_sessions;
drop policy if exists "video_sessions_insert_host" on video_sessions;
drop policy if exists "video_sessions_update_host_ou_admin" on video_sessions;

create policy "video_sessions_select_participante"
  on video_sessions for select
  using (
    host_bi  = (auth.jwt() -> 'user_metadata' ->> 'bi')
    or guest_bi = (auth.jwt() -> 'user_metadata' ->> 'bi')
    or (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'instituicao')
  );

create policy "video_sessions_insert_host"
  on video_sessions for insert
  with check (
    host_bi = (auth.jwt() -> 'user_metadata' ->> 'bi')
    or (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'instituicao')
  );

create policy "video_sessions_update_host_ou_admin"
  on video_sessions for update
  using (
    host_bi = (auth.jwt() -> 'user_metadata' ->> 'bi')
    or guest_bi = (auth.jwt() -> 'user_metadata' ->> 'bi')
    or (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'instituicao')
  )
  with check (
    host_bi = (auth.jwt() -> 'user_metadata' ->> 'bi')
    or guest_bi = (auth.jwt() -> 'user_metadata' ->> 'bi')
    or (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'instituicao')
  );

alter table video_session_events enable row level security;
drop policy if exists "video_events_select_participante" on video_session_events;
drop policy if exists "video_events_insert_participante" on video_session_events;

create policy "video_events_select_participante"
  on video_session_events for select
  using (
    bi = (auth.jwt() -> 'user_metadata' ->> 'bi')
    or (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'instituicao')
    or exists (
      select 1 from video_sessions vs
      where vs.id = video_session_events.session_id
        and (
          vs.host_bi  = (auth.jwt() -> 'user_metadata' ->> 'bi')
          or vs.guest_bi = (auth.jwt() -> 'user_metadata' ->> 'bi')
        )
    )
  );

create policy "video_events_insert_participante"
  on video_session_events for insert
  with check (
    bi = (auth.jwt() -> 'user_metadata' ->> 'bi')
    or (auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'instituicao')
  );

-- B7) video_session_notifications — SEM USO no código e INEXISTENTE em
--     produção (ver B6/A: tratada no bloco protegido). Se um dia for criada:
--     fica com RLS activo SEM políticas = acesso negado a todos.

-- ----------------------------------------------------------------------------
-- C) RE-AFIRMAR RLS EM TODAS AS TABELAS (idempotente — cobre falhas futuras)
-- ----------------------------------------------------------------------------
alter table profiles enable row level security;
alter table solicitacoes_registo enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;
alter table user_requests enable row level security;
alter table audit_logs enable row level security;
alter table contacts enable row level security;
alter table documents enable row level security;
alter table document_requests enable row level security;
alter table digital_protocols enable row level security;
alter table message_state_history enable row level security;
alter table video_sessions enable row level security;
alter table video_session_events enable row level security;

-- ============================================================================
-- CHECKLIST PÓS-APLICAÇÃO (o assistente executa remotamente com a chave anon —
-- tudo tem de falhar/devolver 0 linhas):
--   select * from messages limit 1;     -- esperado: []
--   select * from profiles limit 1;     -- esperado: []
--   select * from contacts limit 1;     -- esperado: []
--   insert em messages {};               -- esperado: 42501 row-level security
-- Depois: LOGIN com CONTA REAL na app → caixa, perfil, contactos, documentos
-- têm de continuar a funcionar (a app envia o JWT; as políticas leem
-- user_metadata.bi / instituicao / role).
-- ============================================================================
-- ROLLBACK (SÓ EM EMERGÊNCIA — volta a expor tudo ao público):
--   alter table profiles            disable row level security;
--   alter table solicitacoes_registo disable row level security;
--   alter table messages            disable row level security;
--   alter table notifications       disable row level security;
--   alter table user_requests       disable row level security;
--   alter table audit_logs          disable row level security;
--   alter table contacts            disable row level security;
--   alter table documents           disable row level security;
--   alter table document_requests   disable row level security;
--   alter table digital_protocols   disable row level security;
--   alter table message_state_history disable row level security;
--   alter table video_sessions      disable row level security;
--   alter table video_session_events disable row level security;
--   (video_session_notifications NÃO existe — nada a desligar)
-- ============================================================================
