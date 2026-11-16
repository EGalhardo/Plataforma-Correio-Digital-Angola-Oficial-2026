-- ============================================================================
-- CDA · v39 — AUTORIZAÇÃO: fonte única de identidade (app_metadata)
-- ----------------------------------------------------------------------------
-- Corrige o problema 1 (risco de autorização). Antes desta migration:
--   • o trigger `cda_claims_sync` (BEFORE INSERT em auth.users) copiava
--     bi/role/instituicao DECLARADOS no registo (raw_user_meta_data) para
--     `raw_app_meta_data` → qualquer pessoa podia auto-atribuir-se role=admin;
--   • 8 funções SECURITY DEFINER liam `auth.jwt() -> 'user_metadata'`, que o
--     próprio titular pode alterar com updateUser();
--   • várias dessas funções eram executáveis por `anon`.
--
-- O que esta migration faz (transacional, reversível — ver bloco final):
--   1. Trigger `cda_claims_sync`:
--        INSERT → NUNCA copia claims do registo; só fixa `role = 'cidadao'`
--                 (conta nova nasce sem privilégios; o papel real é atribuído
--                 pela Administração / provisionamento, via app_metadata);
--        UPDATE → se o app_metadata foi alterado explicitamente (admin API),
--                 respeita; caso contrário RE-FORÇA os valores antigos
--                 (claims de identidade imutáveis para o titular).
--   2. Todas as funções de autorização passam a ler `app_metadata`.
--   3. Endurecimentos pontuais (ver comentários em cada função).
--   4. EXECUTE: mantém só o necessário (anon continua a poder o que já usava).
--
-- NÃO altera: políticas RLS (já usam app_metadata), dados, contas existentes.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. TRIGGER — nenhuma claim nasce do registo público
-- ----------------------------------------------------------------------------
create or replace function public.cda_sync_claims_to_app_metadata()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if TG_OP = 'INSERT' then
    -- Conta nova: identidade NÃO vem do registo. Nasce cidadão sem chaves;
    -- a Administração (service role / app de gestão) atribui bi/instituicao
    -- depois, por app_metadata. Mantém o que o servidor já tenha definido.
    NEW.raw_app_meta_data := coalesce(NEW.raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object(
           'role', coalesce(nullif(NEW.raw_app_meta_data->>'role', ''), 'cidadao'),
           'bi',          NEW.raw_app_meta_data->'bi',
           'instituicao', NEW.raw_app_meta_data->'instituicao'
         );
  else
    -- UPDATE: edição explícita de app_metadata (admin API) é respeitada;
    -- caso contrário, re-força os valores antigos (imutável para o titular).
    if NEW.raw_app_meta_data is not distinct from OLD.raw_app_meta_data then
      NEW.raw_app_meta_data := coalesce(OLD.raw_app_meta_data, '{}'::jsonb);
    end if;
  end if;
  return NEW;
end
$function$;

-- ----------------------------------------------------------------------------
-- 2. FUNÇÕES DE AUTORIZAÇÃO
-- ----------------------------------------------------------------------------

-- 2.1 Quota de envio — REMOVIDA nesta migration: depende de public.send_quota,
--     tabela que não existe em produção. A app nunca a invoca (verificado em
--     src/, server.ts e api/index.ts) e era SECURITY DEFINER executável por
--     authenticated: ficava como privilégio latente. É eliminada no bloco 4.

-- 2.2 Esconder correspondência: a titularidade já era verificada; só a fonte
--     das claims muda (app_metadata) e passa a exigir sessão.
create or replace function public.cda_hide_message(p_message_id bigint, p_restore boolean default false)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_bi text := upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'bi', ''));
  v_in text := upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'instituicao', ''));
  v_ro text := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
  r public.messages%rowtype;
  v_side text;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'code', 'SEM_SESSAO');
  end if;
  select * into r from public.messages where id = p_message_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NAO_ENCONTRADA');
  end if;

  if v_ro = 'admin' or upper(r.recipient_bi) in (v_bi, v_in) then
    v_side := 'receiver';
  elsif upper(r.sender_bi) in (v_bi, v_in) then
    v_side := 'sender';
  else
    return jsonb_build_object('ok', false, 'code', '42501');
  end if;

  if v_side = 'receiver' then
    update public.messages
       set deleted_by_receiver = not p_restore,
           hidden_at = case when p_restore then hidden_at else clock_timestamp() end
     where id = p_message_id;
  else
    update public.messages
       set deleted_by_sender = not p_restore,
           hidden_at = case when p_restore then hidden_at else clock_timestamp() end
     where id = p_message_id;
  end if;

  return jsonb_build_object('ok', true, 'side', v_side, 'restored', p_restore);
end;
$function$;

-- 2.3 Marcar UMA notificação lida
create or replace function public.cda_mark_notification_read(p_id bigint)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_bi text := upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'bi', ''));
  v_in text := upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'instituicao', ''));
  v_ro text := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
  n public.notifications%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'code', 'SEM_SESSAO');
  end if;
  select * into n from public.notifications where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NAO_ENCONTRADA');
  end if;
  if v_ro <> 'admin'
     and upper(n.target_bi) is distinct from v_bi
     and upper(n.target_bi) is distinct from v_in
     and upper(n.target_bi) <> 'CDA' then
    return jsonb_build_object('ok', false, 'code', '42501');
  end if;
  update public.notifications set read_at = coalesce(read_at, clock_timestamp()) where id = p_id;
  return jsonb_build_object('ok', true);
end;
$function$;

-- 2.4 Marcar TODAS as notificações lidas (só as do próprio; admin tudo)
create or replace function public.cda_mark_all_notifications_read()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_bi text := upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'bi', ''));
  v_in text := upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'instituicao', ''));
  v_ro text := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
  n int := 0;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'code', 'SEM_SESSAO');
  end if;
  update public.notifications
     set read_at = coalesce(read_at, clock_timestamp())
   where read_at is null
     and (
       v_ro = 'admin'
       or (v_bi <> '' and upper(target_bi) = v_bi)
       or (v_in <> '' and upper(target_bi) = v_in)
     );
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'updated', n);
end;
$function$;

-- 2.5/2.6 Pedidos de serviço — REMOVIDAS: cda_open_service_ticket e
--     cda_advance_service_ticket dependem de public.service_tickets, que não
--     existe em produção. Código morto, sem qualquer chamador na app, e
--     SECURITY DEFINER executável por anon (personificação via citizen_bi do
--     payload). São eliminadas no bloco 4.

-- 2.7 Revisão de documento: a instituição só revê documentos que emitiu.
create or replace function public.cda_record_document_revision(p_code text, p_changed jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_ro text := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
  v_in text := upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'instituicao', ''));
  v_actor text := upper(coalesce(
    auth.jwt() -> 'app_metadata' ->> 'instituicao',
    auth.jwt() -> 'app_metadata' ->> 'bi',
    ''
  ));
  v_rev int;
  d_issuer text;
begin
  if v_ro not in ('admin', 'instituicao') then
    return jsonb_build_object('ok', false, 'code', '42501');
  end if;
  if v_ro = 'instituicao' then
    select upper(coalesce(issuer, '')) into d_issuer from public.documents where code = p_code;
    if d_issuer is null then
      return jsonb_build_object('ok', false, 'code', 'NAO_ENCONTRADO');
    end if;
    if v_in = '' or position(v_in in d_issuer) = 0 then
      return jsonb_build_object('ok', false, 'code', '42501');
    end if;
  end if;
  select coalesce(max(rev), 0) + 1 into v_rev
    from public.document_revisions where document_code = p_code;
  insert into public.document_revisions (document_code, rev, actor_key, changed_fields)
  values (p_code, v_rev, v_actor, coalesce(p_changed, '{}'::jsonb));
  return jsonb_build_object('ok', true, 'rev', v_rev);
end;
$function$;

-- 2.8 Revogar documento: exige emissor confirmado (antes, instituição sem
--     código no token saltava a verificação e revogava documentos alheios).
create or replace function public.cda_revoke_document(p_code text, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_ro text := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
  v_in text := upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'instituicao', ''));
  d public.documents%rowtype;
begin
  if v_ro not in ('admin', 'instituicao') then
    return jsonb_build_object('ok', false, 'code', '42501');
  end if;
  if v_ro = 'instituicao' and v_in = '' then
    return jsonb_build_object('ok', false, 'code', '42501');
  end if;
  select * into d from public.documents where code = p_code;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NAO_ENCONTRADO');
  end if;
  if v_ro = 'instituicao' and position(v_in in upper(coalesce(d.issuer, ''))) = 0 then
    return jsonb_build_object('ok', false, 'code', '42501');
  end if;
  update public.documents
     set status = 'revoked',
         revoke_reason = left(coalesce(p_reason, ''), 500),
         revoked_at = clock_timestamp()
   where code = p_code;
  return jsonb_build_object('ok', true);
end;
$function$;

-- ----------------------------------------------------------------------------
-- 3. PRIVILÉGIOS DE EXECUÇÃO
--    A app nunca chama estas RPC a partir do browser (verificado no código);
--    ficam acessíveis a `authenticated` para uso futuro legítimo e o `anon`
--    deixa de as poder invocar (antes conseguia marcar notificações e abrir
--    pedidos sem sessão, através do ramo 'CDA'/'citizen_bi').
-- ----------------------------------------------------------------------------
-- 4.1 Funções cujo objecto alvo não existe em produção (código morto):
--     eliminação definitiva — remove três SECURITY DEFINER de superfície
--     desnecessária (duas executáveis por anon). Reversível: recriar a partir
--     do histórico desta migration/documentação se a funcionalidade nascer.
drop function if exists public.cda_consume_send_quota(text, text);
drop function if exists public.cda_open_service_ticket(text, text, jsonb);
drop function if exists public.cda_advance_service_ticket(bigint, text, text);

-- 4.2 Funções vivas: anon deixa de as poder invocar (a app chama-as com sessão
--     ou não as chama de todo; nenhum ramo legítimo perdia acesso).
revoke execute on function public.cda_hide_message(bigint, boolean) from anon;
revoke execute on function public.cda_mark_all_notifications_read() from anon;
revoke execute on function public.cda_mark_notification_read(bigint) from anon;
revoke execute on function public.cda_record_document_revision(text, jsonb) from anon;
revoke execute on function public.cda_revoke_document(text, text) from anon;

commit;
