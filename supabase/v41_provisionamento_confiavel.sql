-- ============================================================================
-- CDA · v41 — PROVISIONAMENTO CONFIÁVEL (o registo deixa de dar privilégios)
-- ----------------------------------------------------------------------------
-- Depois da v39, uma conta nova nasce SEM identidade (role=cidadao, bi null).
-- É o correcto do ponto de vista de segurança, mas deixa dois fluxos sem
-- identidade: (a) o registo de cidadão (o utilizador fica sem acesso no dia
-- seguinte) e (b) a migração JIT de agentes institucionais.
--
-- Esta migration cria a via LEGÍTIMA de provisão, assente na fila oficial de
-- registo (`solicitacoes_registo`), que é escrita publicamente mas só é lida
-- pela Administração e pelo próprio (RLS). O utilizador autenticado, cuja
-- conta nasceu com o e-mail sintético `bi.<bi>@cidadao.correiodigital.ao`,
-- pede a identidade; a função:
--   • deriva o B.I. do e-mail da PRÓPRIA sessão (nunca de um parâmetro),
--   • exige uma linha em `solicitacoes_registo` com esse B.I. em estado
--     'Aprovado'/'Aprovada'/'aprovado' (a Administração aprova; a aprovação
--     automática por PVI já existe no fluxo actual e grava o mesmo estado),
--   • exige que a claim bi ainda esteja vazia (idempotente, não sobrepõe),
--   • grava bi + role='cidadao' em raw_app_meta_data (via service role; o
--     titular não consegue escrever aí — v39 bloqueia e re-força).
-- Resultado: a auto-atribuição deixa de existir; o único caminho é a aprovação
-- administrativa registada na base.
--
-- Instituições NÃO são auto-provisionadas por esta via: exigem convite/código
-- institucional e ficam para a Administração (a migração JIT institucional
-- passa a ser recusada até esse fluxo estar desenhado).
-- ============================================================================

begin;

create or replace function public.cda_reclamar_identidade_cidadao()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid   uuid := auth.uid();
  v_email text;
  v_bi    text;
  v_estado text;
  v_role  text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'SEM_SESSAO');
  end if;

  select lower(coalesce(u.email, '')), lower(coalesce(u.raw_app_meta_data->>'role', ''))
    into v_email, v_role
    from auth.users u where u.id = v_uid;

  -- Só cidadãos; e só se ainda não tiverem identidade atribuída.
  if v_role not in ('', 'cidadao') then
    return jsonb_build_object('ok', false, 'code', 'NAO_APLICAVEL');
  end if;
  if exists (select 1 from auth.users u where u.id = v_uid and coalesce(u.raw_app_meta_data->>'bi', '') <> '') then
    return jsonb_build_object('ok', false, 'code', 'JA_PROVISIONADO');
  end if;

  -- O B.I. vem do e-mail sintético da própria conta (formato do registo).
  if v_email !~ '^bi\.[a-z0-9.\-]+@cidadao\.correiodigital\.ao$' then
    return jsonb_build_object('ok', false, 'code', 'EMAIL_NAO_ELEGIVEL');
  end if;
  -- bi.<bi>@cidadao... → tudo entre «bi.» e o «@», sem espaços.
  v_bi := upper(regexp_replace(substr(v_email, 4, position('@' in v_email) - 4), '\s+', '', 'g'));
  if length(v_bi) < 3 or length(v_bi) > 30 then
    return jsonb_build_object('ok', false, 'code', 'BI_INVALIDO');
  end if;

  -- Prova de aprovação na fila oficial (escrita pública, leitura restrita).
  select upper(coalesce(s.status, '')) into v_estado
    from public.solicitacoes_registo s
   where upper(regexp_replace(coalesce(s.bi_numero, ''), '\s+', '', 'g')) = v_bi
   order by s.criado_em desc
   limit 1;

  if v_estado is null then
    return jsonb_build_object('ok', false, 'code', 'SEM_REGISTO');
  end if;
  if v_estado not in ('APROVADO', 'APROVADA') then
    return jsonb_build_object('ok', false, 'code', 'NAO_APROVADO', 'estado', v_estado);
  end if;

  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
         || jsonb_build_object('bi', v_bi, 'role', 'cidadao')
   where id = v_uid;

  return jsonb_build_object('ok', true, 'bi', v_bi, 'role', 'cidadao');
end;
$function$;

revoke all on function public.cda_reclamar_identidade_cidadao() from public;
revoke all on function public.cda_reclamar_identidade_cidadao() from anon;
grant execute on function public.cda_reclamar_identidade_cidadao() to authenticated;

commit;
