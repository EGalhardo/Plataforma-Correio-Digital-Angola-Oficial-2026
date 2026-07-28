-- ============================================================================
-- CDA · v16 — PRÉ-LOGIN DO CIDADÃO (RPC security-definer) · RONDA F47
-- ----------------------------------------------------------------------------
-- Porquê: a regra de negócio F47 exige que uma conta ELIMINADA pelo Admin
-- fique revogada até a um NOVO registo aprovado de novo. Para distinguir
-- "B.I. nunca registado" de "B.I. cujo registo foi eliminado", o login precisa
-- de saber se a fila oficial (solicitacoes_registo) tem linha para o B.I. —
-- MAS a política SELECT da tabela (v12/v14) só deixa ver a linha ao TITULAR
-- autenticado ou ao admin: um SELECT anónimo devolve sempre zero linhas.
-- (É o mesmo problema que a v15 resolveu para instituições.)
--
-- Solução: RPC `cda_prelogin_cidadao(p_bi)` security definer que devolve
-- APENAS o estado da linha mais recente do B.I. — nunca nome, e-mail, fotos,
-- observações ou qualquer outro campo pessoal. B.I. normalizado (maiúsculas,
-- sem espaços). Gémea da `cda_prelogin_instituicao` (v15).
--
-- IDEMPOTENTE: pode ser re-executado sem efeitos colaterais.
-- EXECUÇÃO: Supabase → SQL Editor → colar TUDO → Run.
-- ============================================================================

create or replace function public.cda_prelogin_cidadao(p_bi text)
returns table (status text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_bi is null or length(trim(p_bi)) < 3 or length(trim(p_bi)) > 30 then
    return;
  end if;
  return query
    select s.status::text
    from public.solicitacoes_registo s
    where upper(regexp_replace(coalesce(s.bi_numero, ''), '\s+', '', 'g'))
        = upper(regexp_replace(trim(p_bi), '\s+', '', 'g'))
    order by s.criado_em desc
    limit 1;
end;
$$;

revoke all on function public.cda_prelogin_cidadao(text) from public;
grant execute on function public.cda_prelogin_cidadao(text) to anon, authenticated;

-- ============================================================================
-- VERIFICAÇÕES pós-execução (devem bater certo):
-- ----------------------------------------------------------------------------
-- ① A função existe e é security definer:
--    Esperado: 1 linha com prosecdef = true
select p.proname, p.prosecdef
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'cda_prelogin_cidadao';

-- ② Grants: anon + authenticated têm EXECUTE; mais ninguém:
--    Esperado: exactamente 2 linhas (anon, authenticated)
select grantee, privilege_type
from information_schema.routine_privileges
where specific_schema = 'public' and routine_name = 'cda_prelogin_cidadao'
order by grantee;

-- ③ Fumo manual (opcional — substituir pelo B.I. real de um registo existente):
--    Esperado: 1 linha com o estado actual ('Pendente'/'Aprovado'/...) ou
--    zero linhas se o B.I. não tiver registo.
-- select * from public.cda_prelogin_cidadao('009874562LA041');

-- ============================================================================
-- ROLLBACK (se necessário):
-- ----------------------------------------------------------------------------
-- drop function if exists public.cda_prelogin_cidadao(text);
-- (A aplicação deixa de distinguir revogação sem sessão viva e cai no
--  comportamento pré-F47 — recomenda-se NÃO fazer rollback em produção.)
-- ============================================================================
