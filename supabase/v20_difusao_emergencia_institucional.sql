-- ============================================================================
-- v20 — Difusão Institucional para Rede de Emergência (spec aprovada em chat)
-- ----------------------------------------------------------------------------
-- APLICAR NO SQL EDITOR DO SUPABASE (único caminho de DDL disponível).
--
-- O que este ficheiro faz:
--   1) emergency_alerts: acrescenta metadados do emissor INSTITUCIONAL
--      (sender_kind / sender_instituicao / sender_agent_bi / message_text /
--       channel_detail) — o cidadão NÃO ganha qualquer capacidade nova (F57).
--   2) RLS de emergency_alerts: ramo instituição (insert/select apenas o que
--      A PRÓPRIA instituição emitiu; cidadão e admin inalterados; apêndice-only).
--   3) RPC cda_cidadao_lookup_bi(p_bi): lookup EXACTO por BI — gate duro para
--      agentes de instituição/admin, anti-abuso por hora, auditoria best-effort.
--      NUNCA devolve familiares/telefones.
--   4) RPC cda_rede_emergencia_bi(p_bi): devolve SÓ a rede de emergência do
--      cidadão (tipo 'Emergência') para a página de difusão — mesmo gate.
--
-- A entrega CDA da mensagem NÃO tem RPC: usa o canal institucional já existente
-- (insert em messages via sessão da instituição — fluxo P0 confirmado no app).
--
-- NÃO toca nas políticas da tabela contacts (a rede é lida SÓ via RPC §4).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) emergency_alerts: metadados do emissor institucional
-- ---------------------------------------------------------------------------
alter table public.emergency_alerts add column if not exists sender_kind text not null default 'cidadao';
alter table public.emergency_alerts add column if not exists sender_instituicao text null;
alter table public.emergency_alerts add column if not exists sender_agent_bi text null;
alter table public.emergency_alerts add column if not exists message_text text null;
-- channel_detail por linha de envio:
-- {"contacto_bi","nome","plataforma":"enviado|sem_conta|falhou:<code>","whatsapp_link":true|false,"at":timestamptz}
alter table public.emergency_alerts add column if not exists channel_detail jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- 2) RLS de emergency_alerts: ramo instituição (claims app_metadata, padrão v14-v19)
-- ---------------------------------------------------------------------------
drop policy if exists "emergalerts_insert_proprio" on public.emergency_alerts;
create policy "emergalerts_insert_proprio_ou_inst"
  on public.emergency_alerts for insert
  with check (
    (sender_kind = 'cidadao' and citizen_bi = (auth.jwt() -> 'app_metadata' ->> 'bi'))
    or (sender_kind = 'instituicao'
        and sender_instituicao <> ''
        and upper(sender_instituicao) = upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'instituicao','')))
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists "emergalerts_select_proprio_ou_admin" on public.emergency_alerts;
create policy "emergalerts_select_proprio_inst_ou_admin"
  on public.emergency_alerts for select
  using (
    citizen_bi = (auth.jwt() -> 'app_metadata' ->> 'bi')
    or (sender_kind = 'instituicao'
        and sender_instituicao <> ''
        and upper(sender_instituicao) = upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'instituicao','')))
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
-- (sem políticas de update/delete: apêndice-only mantido)

-- ---------------------------------------------------------------------------
-- 3) RPC cda_cidadao_lookup_bi — LOOKUP POR BI EXACTO (instituição/admin only)
-- ---------------------------------------------------------------------------
create or replace function public.cda_cidadao_lookup_bi(p_bi text)
returns table (bi text, name text, emergency_contacts_count int, rede_completa boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_bi    text := upper(trim(p_bi));
  v_inst  text := coalesce(auth.jwt() -> 'app_metadata' ->> 'instituicao', '');
  v_role  text := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
  v_agent text := coalesce(auth.jwt() -> 'app_metadata' ->> 'bi', '');
begin
  -- € Gate duro: só agentes de instituição (claim instituicao) ou admin.
  if v_role <> 'admin' and v_inst = '' then
    raise exception 'ACESSO_NEGADO_INSTITUICAO_APENAS' using errcode = 'P0001';
  end if;

  -- € Anti-abuso: no máximo 200 pesquisas/hora por instituição
  --   (contadas na auditoria — NÃO na tabela de alertas).
  if v_role <> 'admin' and (
    select count(*) from public.audit_logs l
     where l.action = 'EMERGENCIA_LOOKUP_CIDADAO_BI'
       and l.username = upper(v_inst)
       and l.timestamp > now() - interval '1 hour'
  ) >= 200 then
    raise exception 'LIMITE_ANTI_ABUSO_LOOKUP' using errcode = 'P0002';
  end if;

  -- € Auditoria best-effort (nunca bloqueia a pesquisa; id omitted = default)
  begin
    insert into public.audit_logs (action, username, timestamp, action_type)
    values ('EMERGENCIA_LOOKUP_CIDADAO_BI', upper(v_inst), now(), 'difusao_emergencia');
  exception when others then null;
  end;

  -- € Correspondência EXACTA em profiles.bi; nunca devolve familiares/telefones.
  return query
  select p.bi,
         p.name,
         (select count(*)::int from public.contacts c
           where upper(c.owner_bi) = upper(p.bi) and c.type = 'Emergência'),
         ((select count(*) from public.contacts c
           where upper(c.owner_bi) = upper(p.bi) and c.type = 'Emergência') >= 2)
  from public.profiles p
  where upper(p.bi) = v_bi
  limit 1;
end;
$$;

revoke all on function public.cda_cidadao_lookup_bi(text) from public, anon;
grant execute on function public.cda_cidadao_lookup_bi(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) RPC cda_rede_emergencia_bi — REDE DE EMERGÊNCIA (instituição/admin only)
-- ---------------------------------------------------------------------------
create or replace function public.cda_rede_emergencia_bi(p_bi text)
returns table (name text, relation text, phone text, whatsapp text,
               cda_bi text, has_cda_account boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_bi    text := upper(trim(p_bi));
  v_inst  text := coalesce(auth.jwt() -> 'app_metadata' ->> 'instituicao', '');
  v_role  text := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
begin
  if v_role <> 'admin' and v_inst = '' then
    raise exception 'ACESSO_NEGADO_INSTITUICAO_APENAS' using errcode = 'P0001';
  end if;

  return query
  select c.name,
         c.relation,
         c.phone,
         c.whatsapp,
         case when exists (select 1 from public.profiles pr where upper(pr.bi) = upper(c.bi))
              then upper(c.bi) else null end,
         exists (select 1 from public.profiles pr where upper(pr.bi) = upper(c.bi))
        as has_cda_account
  from public.contacts c
  where upper(c.owner_bi) = v_bi
    and c.type = 'Emergência'
  order by c.name;
end;
$$;

revoke all on function public.cda_rede_emergencia_bi(text) from public, anon;
grant execute on function public.cda_rede_emergencia_bi(text) to authenticated;

-- ---------------------------------------------------------------------------
-- VERIFICAÇÃO (correr depois de aplicar — esperado sem erros):
--   ① select column_name from information_schema.columns where table_name='emergency_alerts'
--      and column_name like 'sender_%' or column_name in ('message_text','channel_detail');
--      → 5 linhas
--   ② select polname from pg_policy join pg_class on pg_class.oid = polrelid
--      where relname = 'emergency_alerts'; → 2 políticas recriadas
--   ③ select proname, prosecdef from pg_proc where proname in
--      ('cda_cidadao_lookup_bi','cda_rede_emergencia_bi'); → 2 linhas, prosecdef=t
--   ④ com JWT de CIDADÃO: select * from cda_cidadao_lookup_bi('002399714LA039');
--      → P0001 ACESSO_NEGADO (esperado falhar!)
-- ============================================================================
-- ROLLBACK (se necessário):
--   drop function if exists public.cda_rede_emergencia_bi(text);
--   drop function if exists public.cda_cidadao_lookup_bi(text);
--   (políticas anteriores estão registadas no git — ficheiro v19)
--   alter table public.emergency_alerts drop column if exists channel_detail,
--     drop column if exists message_text, drop column if exists sender_agent_bi,
--     drop column if exists sender_instituicao, drop column if exists sender_kind;
-- ============================================================================
