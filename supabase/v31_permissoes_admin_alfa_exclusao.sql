-- CDA v31 — Permissões reais do Admin Alfa para exclusão definitiva
-- PRÉ-REQUISITO: executar v30_exclusao_definitiva_admin.sql primeiro.
-- Execute este ficheiro no Supabase SQL Editor com privilégios de proprietário.

-- 1. Marca a conta Auth específica do Admin Alfa com claims administrativos.
-- Execute novamente após recriar ADMIN-0001, se a conta Auth for nova.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', 'admin', 'agent', 'ADMIN-0001')
where lower(email) = 'agente.admin-0001@admin.correiodigital.ao';

-- 2. Verificação inequívoca do Alfa autenticado. O JWT é a fonte de autorização;
-- localStorage, UI e parâmetros recebidos do browser nunca concedem permissão.
create or replace function public.cda_admin_alfa_autorizado()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
     and upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'agent', '')) = 'ADMIN-0001';
$$;

-- 3. Endpoint RPC para o frontend autenticado. A função v30 executa a limpeza
-- relacional; Storage/Auth devem ser removidos pelo endpoint backend com service_role.
create or replace function public.cda_admin_alfa_eliminar_registo(p_identificador text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.cda_admin_alfa_autorizado() then
    raise exception 'ADMIN_ALFA_REQUIRED' using errcode = '42501';
  end if;

  -- Reutiliza a função transacional central. A função v30 aceita role=admin,
  -- que este JWT do Alfa possui após o update acima.
  return public.cda_eliminar_registo_definitivamente(p_identificador);
end;
$$;

revoke all on function public.cda_admin_alfa_autorizado() from public, anon;
revoke all on function public.cda_admin_alfa_eliminar_registo(text) from public, anon;
grant execute on function public.cda_admin_alfa_eliminar_registo(text) to authenticated;

-- 4. Verificação manual, depois de o Admin Alfa terminar sessão e entrar novamente:
-- select public.cda_admin_alfa_autorizado(); -- esperado: true
-- select public.cda_admin_alfa_eliminar_registo('CODIGO-TESTE');
