-- ============================================================================
-- CDA · v23 · SECURITY ADVISOR (lint WARN) — correcções verificadas no código
-- ----------------------------------------------------------------------------
-- Aplicado a lista de Advisors colada pelo dono (21 WARN). Cada correcção foi
-- confirmada contra o código da app ANTES de mexer (regra: não quebrar nada):
--   · set_video_session_updated_at   → trigger fn; search_path imutável
--   · cda_guard_insert_audit_log()    → FUNÇÃO DE TRIGGER — não precisa de
--   · cda_guard_insert_solicitacao()  →   EXECUTE (o trigger invoca-a sem
--   · cda_sync_claims_to_app_metadata()→  verificar grants); revoke é gratuito
--   · cda_policy_check(text,text)     → diagnóstico de conveniência (v18);
--     sai da API pública — o dono corre-o no SQL Editor quando precisar
--   · fotos_select_publico            → a app NUNCA faz .list() nesse bucket
--     (lê avatares por URL público, que não consulta RLS); drop só nega
--     LISTAGEM via API. Upload/update/delete autenticados ficam intactos.
--   · video_session_participants      → ZERO referências em todo o src/
--     (a app usa apenas video_sessions) → deny-all até a feature existir
--     com escopo próprio.
--
-- EXCEPÇÕES INTENCIONAIS (documentadas, não tocadas neste ficheiro):
--   · cda_prelogin_cidadao / cda_prelogin_instituicao (anon) — pré-login por
--     desenho (v15/v16: exact-match, mínimos, anti-enumeração).
--   · cda_cidadao_lookup_bi / cda_rede_emergencia_bi (authenticated) — v20
--     F58, com gates duros dentro do corpo (instituição/admin + auditoria).
--   · cda_instituicao_existe (authenticated) — v22 P0-B, exact-match boolean.
--   · audit_logs.audit_insert_aberta e solicitacoes_insert_publica (INSERT
--     aberto) — necessários pré-login; mitigados pelos triggers cda_guard_*
--     (validação + anti-rajada 60 s). Risco aceite documentado (v15).
--   · auth_leaked_password_protection — NÃO é SQL: ligar no Dashboard
--     (Authentication → Sign In/Providers → Email → Leaked Password Protection).
--
-- APLICAÇÃO (dono): colar TODO o conteúdo no SQL Editor do Supabase → Run.
-- ============================================================================

-- 1) 0011 · search_path imutável ----------------------------------------------
alter function public.set_video_session_updated_at() set search_path = '';

-- 2) 0028+0029 · funções de trigger: EXECUTE revogado (o trigger dispára-las
--    na mesma — privilégio EXECUTE não é verificado na invocação por trigger) --
revoke all on function public.cda_guard_insert_audit_log() from public, anon, authenticated;
revoke all on function public.cda_guard_insert_solicitacao() from public, anon, authenticated;
revoke all on function public.cda_sync_claims_to_app_metadata() from public, anon, authenticated;

-- 3) 0028+0029 · diagnóstico fora da API pública -------------------------------
revoke all on function public.cda_policy_check(text, text) from public, anon, authenticated;

-- 4) 0025 · fim da listagem pública do bucket de avatares ----------------------
drop policy if exists "fotos_select_publico" on storage.objects;

-- 5) 0024 · tabela sem consumidor: deny-all ------------------------------------
drop policy if exists "Permitir tudo para video_session_participants" on public.video_session_participants;

-- 6) VERIFICAÇÃO (correr à mão depois do Run) ----------------------------------
-- select proname, proconfig from pg_proc where proname = 'set_video_session_updated_at';
--   esperado: {search_path=""}
-- select has_function_privilege('anon','public.cda_policy_check(text,text)','execute');  -- esperado: false
-- select has_function_privilege('anon','public.cda_guard_insert_audit_log()','execute'); -- esperado: false
-- select polname from pg_policy where polname in ('fotos_select_publico','Permitir tudo para video_session_participants');
--   esperado: 0 linhas
-- select has_function_privilege('anon','public.cda_prelogin_cidadao(text)','execute');   -- esperado: true (intencional)

-- ROLLBACK (se necessário):
-- alter function public.set_video_session_updated_at() reset search_path;
-- grant execute on function public.cda_guard_insert_audit_log() to anon, authenticated;
-- grant execute on function public.cda_guard_insert_solicitacao() to anon, authenticated;
-- grant execute on function public.cda_sync_claims_to_app_metadata() to anon, authenticated;
-- grant execute on function public.cda_policy_check(text, text) to anon, authenticated;
-- create policy "fotos_select_publico" on storage.objects for select using (bucket_id = 'fotos_perfil');
-- create policy "Permitir tudo para video_session_participants" on public.video_session_participants for all using (true) with check (true);
