-- CDA v33 — Métricas reais para Relatórios da Área Admin
-- Este SQL NÃO cria dados fictícios. Lê exclusivamente dados persistidos.
-- Execute no Supabase SQL Editor.

create or replace function public.cda_relatorio_admin_periodo(
  p_inicio timestamptz default date_trunc('month', now()),
  p_fim timestamptz default now()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_result jsonb;
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'periodo_inicio', p_inicio,
    'periodo_fim', p_fim,
    'correspondencias_recebidas', (select count(*) from messages where created_at >= p_inicio and created_at <= p_fim),
    'correspondencias_emitidas', (select count(*) from messages where created_at >= p_inicio and created_at <= p_fim),
    'instituicoes_aprovadas', (select count(*) from solicitacoes_registo where lower(coalesce(status,'')) in ('aprovado','aprovada','ativo','ativa','active','approved') and coalesce(observacoes,'') like '%[Instituição]%'),
    'cidadaos_registados', (select count(*) from profiles where role = 'user'),
    'documentos_emitidos', (select count(*) from documents),
    'logs_auditoria', (select count(*) from audit_logs where timestamp >= p_inicio and timestamp <= p_fim),
    'alertas_criticos', (select count(*) from audit_logs where timestamp >= p_inicio and timestamp <= p_fim and lower(coalesce(action_type,'')) = 'critical'),
    'avisos', (select count(*) from audit_logs where timestamp >= p_inicio and timestamp <= p_fim and lower(coalesce(action_type,'')) = 'warning')
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.cda_relatorio_admin_periodo(timestamptz, timestamptz) from public, anon;
grant execute on function public.cda_relatorio_admin_periodo(timestamptz, timestamptz) to authenticated;

-- Teste depois de entrar como Admin Alfa:
-- select public.cda_relatorio_admin_periodo();
