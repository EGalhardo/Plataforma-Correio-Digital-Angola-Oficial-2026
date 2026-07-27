-- ============================================================================
-- v1.2-d (2026-07-27) — PATCH FINAL: a 14.ª política permissiva
-- ----------------------------------------------------------------------------
-- Achado na verificação pós-v1.2-c (chave anon): 12/13 tabelas seladas
-- ([], insert 42501 ✓) MAS solicitacoes_registo continuava a devolver dados
-- (nome, email, password_hash, bi_numero, urls de documentos/selfie).
-- Causa: supabase/registration_requests_patch.sql criou a tabela COM a sua
-- própria política permissiva:
--   CREATE POLICY "Permitir tudo para solicitacoes_registo" ... USING (true);
-- Este patch remove-a. As políticas v1.1 da tabela (insert pública para o
-- fluxo de registo + select próprio/admin) NÃO são tocadas.
--
-- EXECUÇÃO: SQL Editor → colar TUDO → Run. Esperado: Success + 1 listagem.
-- ============================================================================

drop policy if exists "Permitir tudo para solicitacoes_registo" on solicitacoes_registo;
alter table solicitacoes_registo enable row level security;

-- ----------------------------------------------------------------------------
-- AUDITORIA FINAL — deve devolver ZERO linhas (qualquer linha aqui é uma
-- política permissiva de SELECT/ALL com USING (true) ainda activa):
-- ----------------------------------------------------------------------------
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and cmd in ('SELECT', 'ALL')
  and qual = 'true'
order by tablename;

-- Políticas que DEVEM restar em solicitacoes_registo (verificação visual):
select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'solicitacoes_registo'
order by policyname;
-- esperado: solicitacoes_delete_admin (DELETE) · solicitacoes_insert_publica
--           (INSERT) · solicitacoes_select_propria_ou_admin (SELECT) ·
--           solicitacoes_update_admin (UPDATE)
