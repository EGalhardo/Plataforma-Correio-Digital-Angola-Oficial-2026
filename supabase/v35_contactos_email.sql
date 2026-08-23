-- ============================================================================
-- v35 — CONTACTOS: EMAIL OPCIONAL + DIFUSÃO DE EMERGÊNCIA POR EMAIL
-- Data: 2026-08-23
-- ----------------------------------------------------------------------------
-- OBJECTIVO:
--   1) Coluna `email` (opcional) em public.contacts — o cidadão passa a poder
--      registar o email de cada contacto no popup «Novo Contacto» (e editar);
--   2) RPC cda_rede_emergencia_bi passa a DEVOLVER o email de cada membro da
--      rede, para a instituição poder abrir também o cliente de email
--      (mailto:) na difusão de emergência — confirmação manual do agente,
--      igual ao WhatsApp (nunca "email enviado" automático).
--
-- COMPATIBILIDADE (janela pré-aplicação, igual ao v19):
--   * INSERT com a coluna email antes deste pacote → PGRST204 → a app faz
--     retry SEM email (o contacto grava na mesma); nenhum fluxo parte.
--   * RPC antiga (sem email) → a app recebe email=null → botão email oculto.
--
-- APLICAR NO: Supabase Dashboard → SQL Editor → colar tudo → Run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Coluna email (opcional) com validação leve de formato
-- ---------------------------------------------------------------------------
alter table public.contacts
  add column if not exists email text;

alter table public.contacts
  drop constraint if exists contacts_email_format;

alter table public.contacts
  add constraint contacts_email_format
  check (email is null or btrim(email) = '' or btrim(email) ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$');

comment on column public.contacts.email is
  'v35 — email opcional do contacto; usado na difusão de emergência (mailto manual, sem gateway automático)';

-- ---------------------------------------------------------------------------
-- 2) RPC cda_rede_emergencia_bi — passa a devolver `email`
--    (o tipo de retorno muda ⇒ é preciso DROP antes de CREATE)
-- ---------------------------------------------------------------------------
drop function if exists public.cda_rede_emergencia_bi(text);

create function public.cda_rede_emergencia_bi(p_bi text)
returns table (name text, relation text, phone text, whatsapp text, email text,
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
  select c.name::text,
         c.relation::text,
         c.phone::text,
         c.whatsapp::text,
         nullif(btrim(c.email), '')::text,
         case when exists (select 1 from public.profiles pr where upper(pr.bi) = upper(c.bi))
              then upper(c.bi)::text else null end,
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

-- ============================================================================
-- VERIFICAÇÃO (correr depois — esperado sem erros):
--   ① select column_name from information_schema.columns
--      where table_name='contacts' and column_name='email';          → 1 linha
--   ② select proname, prosecdef from pg_proc where proname='cda_rede_emergencia_bi';
--                                                                     → 1 linha, prosecdec=t
--      (prosecdef = security definer)
--   ③ select * from public.contacts where email is not null limit 1;  → 0 linhas (ainda)
--
-- ROLLBACK (se necessário):
--   drop function if exists public.cda_rede_emergencia_bi(text);
--   (recriar a versão anterior a partir do ficheiro v20)
--   alter table public.contacts drop constraint if exists contacts_email_format;
--   alter table public.contacts drop column if exists email;
-- ============================================================================
