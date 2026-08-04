-- ============================================================================
-- CDA · v22 · P0-B — ROTEAMENTO LIGADO AO REGISTO INSTITUCIONAL (spec aprovada)
-- ----------------------------------------------------------------------------
-- PROBLEMA (confirmado em código): isRealInstitutionalCode era apenas regex de
-- formato SIGLA-XXXX → qualquer código inventado contava como "instituição
-- real" e o envio para código inexistente era VOID-DELIVERY silenciosa
-- (mensagem "entregue" numa caixa que ninguém possui — família do erro F61).
--
-- CORRECÇÃO (decisões do dono de 2026-08-04):
--   §0.1 = BLOQUEAR envio para código não registado (com aviso honesto);
--   demo = SEED real. Daí:
--   1) RPC cda_instituicao_existe(p_codigo) → boolean: exact-match, só linhas
--      APROVADAS, security definer, executável APENAS por authenticated
--      (pré-login continua na RPC v15 cda_prelogin_instituicao — intocada).
--   2) SEED DEMO: AGT-9921-SR passa a existir como linha APROVADA do registo
--      oficial → a demo exercita o caminho real e correio endereçado à AGT
--      demo deixa de cair no vazio. (Login demo local-first não depende desta
--      linha — ideologia v7 mantida.)
--
-- APLICAÇÃO (dono): colar TODO o conteúdo no SQL Editor do Supabase → Run.
-- ============================================================================

-- 1) RPC ----------------------------------------------------------------------
create or replace function public.cda_instituicao_existe(p_codigo text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_codigo is null or length(trim(p_codigo)) < 3 or length(trim(p_codigo)) > 30 then
    return false;
  end if;
  return exists (
    select 1
    from public.solicitacoes_registo s
    where upper(s.bi_numero) = upper(trim(p_codigo))
      and lower(s.status) = 'aprovado'
  );
end;
$$;

revoke all on function public.cda_instituicao_existe(text) from public;
revoke all on function public.cda_instituicao_existe(text) from anon;
grant execute on function public.cda_instituicao_existe(text) to authenticated;

-- 2) SEED DEMO (idempotente) ---------------------------------------------------
-- Passa no trigger cda_guard_insert_solicitacao (bi_numero ^[A-Za-z0-9-]{3,30}$,
-- nome >= 3 chars, sem e-mail → sem validação de formato/rajada por e-mail).
insert into public.solicitacoes_registo (nome, bi_numero, status, observacoes)
values (
  'Administração Geral Tributária (Demonstração)',
  'AGT-9921-SR',
  'Aprovado',
  'Seed demo P0-B (v22): instituição de demonstração registada como aprovada, por decisão do dono em 2026-08-04.'
)
on conflict (bi_numero) do nothing;

-- 3) VERIFICAÇÃO (correr à mão depois do Run) ----------------------------------
-- select proname, prosecdef as security_definer from pg_proc where proname = 'cda_instituicao_existe';
--   esperado: cda_instituicao_existe | true
-- select public.cda_instituicao_existe('AGT-9921-SR');  -- esperado: true  (após seed)
-- select public.cda_instituicao_existe('ZZ-9999');      -- esperado: false
-- Via API com a ANON KEY: erro 42501 (permission denied) — é o esperado.
-- Via API autenticada: true/false conforme o registo.

-- ROLLBACK (se necessário):
-- drop function if exists public.cda_instituicao_existe(text);
-- delete from public.solicitacoes_registo where bi_numero = 'AGT-9921-SR' and observacoes like 'Seed demo P0-B%';
