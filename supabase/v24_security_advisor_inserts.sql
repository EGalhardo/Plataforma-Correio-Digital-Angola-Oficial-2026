-- ============================================================================
-- CDA · v24 · SECURITY ADVISOR (2.º passe) — fechar os 2 INSERT "always true"
-- ----------------------------------------------------------------------------
-- ANALISADOS CONTRA O CÓDIGO (regra: não quebrar nada):
--   · audit_logs(action, username, action_type) — trigger cda_guard_audit_bi
--     (anti-rajada) fica INTACTO; a policy passa a exigir limites reais de
--     tamanho (defesa em profundidade: lixo/vazio/agregados gigantes morrem à
--     porta RLS, antes do trigger).
--   · solicitacoes_registo — a policy passa a espelhar EXACTAMENTE a validação
--     do trigger cda_guard_insert_solicitacao (bi ^[A-Za-z0-9-]{3,30}$; nome
--     >= 3; e-mail formato ou nulo). Qualquer insert que hoje passa no trigger
--     continua a passar; comportamento idêntico, aviso 0024 eliminado.
--
-- EXCEPÇÕES INTENCIONAIS RESTANTES (não corrigíveis sem redesign — explicado
-- no relatório; o lint 0028/0029 acende para QUALQUER security definer
-- executável, mesmo quando a exposição é o desenho aprovado):
--   · cda_prelogin_cidadao / cda_prelogin_instituicao (anon+auth) — pré-login
--     exact-match (v15/v16), aprovação prévia do dono nesses ficheiros.
--   · cda_cidadao_lookup_bi / cda_rede_emergencia_bi / cda_instituicao_existe
--     (authenticated) — v20/v22 com gates internos auditados.
--   · auth_leaked_password_protection — NÃO é SQL: Dashboard → Authentication
--     → Settings → Security → "Leaked Password Protection" (toggle).
--
-- APLICAÇÃO (dono): colar TODO o conteúdo no SQL Editor do Supabase → Run.
-- ============================================================================

-- 1) audit_logs — INSERT deixa de ser "always true" ----------------------------
drop policy if exists "audit_insert_aberta" on public.audit_logs;
create policy "audit_insert_aberta"
  on public.audit_logs for insert
  with check (
    length(trim(username)) between 1 and 100
    and length(trim(action)) between 1 and 390
    and (action_type is null or length(action_type) between 1 and 30)
  );

-- 2) solicitacoes_registo — INSERT espelha a validação do trigger guarda -----
drop policy if exists "solicitacoes_insert_publica" on public.solicitacoes_registo;
create policy "solicitacoes_insert_publica"
  on public.solicitacoes_registo for insert
  with check (
    bi_numero ~ '^[A-Za-z0-9-]{3,30}$'
    and length(trim(nome)) >= 3
    and (email is null or email = '' or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
  );

-- 3) VERIFICAÇÃO (correr à mão depois do Run) ----------------------------------
-- select polname, polqual, with_check from pg_policies
--  where tablename in ('audit_logs','solicitacoes_registo') and cmd = 'INSERT';
--   esperado: NENHUMA with_check '(true)'
-- Teste funcional (deve falhar com 42501/RLS — bi inválido):
--   insert into public.solicitacoes_registo (nome, bi_numero) values ('Teste','X');
-- Teste funcional (deve passar — linha de auditoria legítima):
--   insert into public.audit_logs (username, action, action_type)
--   values ('verificacao-v24', 'v24 aplicado: policies INSERT com validacao real', 'info');

-- ROLLBACK (se necessário):
-- drop policy if exists "audit_insert_aberta" on public.audit_logs;
-- create policy "audit_insert_aberta" on public.audit_logs for insert with check (true);
-- drop policy if exists "solicitacoes_insert_publica" on public.solicitacoes_registo;
-- create policy "solicitacoes_insert_publica" on public.solicitacoes_registo for insert with check (true);
