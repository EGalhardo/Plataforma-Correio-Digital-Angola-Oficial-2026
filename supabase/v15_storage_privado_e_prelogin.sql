-- ============================================================================
-- CDA · v15 — STORAGE PRIVADO + F44 (PRÉ-LOGIN INSTITUCIONAL) + ANTI-SPAM
-- ----------------------------------------------------------------------------
-- Fecha as frentes abertas da Auditoria F42:
--   (a) #4/P2 STORAGE — `documentos_registo` e `correspondencias_anexos`
--       passam a PRIVADOS (URL pública morre; a app lê por URL ASSINADO —
--       código F45 já em produção, com fallback durante a janela de deploy).
--       `fotos_perfil` MANTÉM-SE público (avatar = dado auto-publicado; selar
--       exigiria refactor de dezenas de <img> sem ganho proporcional) MAS o
--       delete/update anónimo é fechado (estava FOR ALL — qualquer anónimo
--       podia APAGAR fotos).
--   (b) F44 — RPC security-definer `cda_prelogin_instituicao`: devolve APENAS
--       {nome, status} para um código EXACTO (sem listagem, sem dados
--       sensíveis) — repõe o reconhecimento pré-Auth da instituição que morreu
--       com o selo RLS (login cross-device).
--   (c) Médio#2 — guarda anti-spam silenciosa nos 2 INSERT-abertas
--       (solicitacoes_registo e audit_logs continuam inseríveis por anónimo
--       mas com validação mínima e travão de rajada).
--
-- PRE-REQUISITOS: v12/v13/v14 aplicadas (RLS selada + app_metadata).
-- IDEMPOTENTE · com secção de VERIFICAÇÃO e ROLLBACK no fim.
-- Como correr: Supabase → SQL Editor → colar tudo → Run (transacção única:
-- ou aplica tudo, ou não aplica nada).
-- ============================================================================

begin;

-- ============================================================================
-- 1) BUCKETS — selar os 2 sensíveis (fotos_perfil mantém-se público)
-- ============================================================================
update storage.buckets set public = false where id in ('documentos_registo', 'correspondencias_anexos');

-- ============================================================================
-- 2) POLICIES storage.objects — substituir as "Permitir …" abertas do setup
-- ============================================================================
drop policy if exists "Permitir leitura pública em documentos_registo"   on storage.objects;
drop policy if exists "Permitir upload/modificação em documentos_registo" on storage.objects;
drop policy if exists "Permitir leitura pública em correspondencias_anexos"   on storage.objects;
drop policy if exists "Permitir upload/modificação em correspondencias_anexos" on storage.objects;
drop policy if exists "Permitir leitura pública em fotos_perfil"   on storage.objects;
drop policy if exists "Permitir upload/modificação em fotos_perfil" on storage.objects;
-- (idempotência desta v15)
drop policy if exists "docreg_insert_publico"   on storage.objects;
drop policy if exists "docreg_select_dono_admin_inst" on storage.objects;
drop policy if exists "docreg_update_admin_inst" on storage.objects;
drop policy if exists "docreg_delete_admin_inst" on storage.objects;
drop policy if exists "anexos_insert_autenticado"  on storage.objects;
drop policy if exists "anexos_select_autenticado"  on storage.objects;
drop policy if exists "anexos_update_dono_ou_admin" on storage.objects;
drop policy if exists "anexos_delete_dono_ou_admin" on storage.objects;
drop policy if exists "fotos_select_publico"       on storage.objects;
drop policy if exists "fotos_insert_autenticado"   on storage.objects;
drop policy if exists "fotos_update_autenticado"   on storage.objects;
drop policy if exists "fotos_delete_autenticado"   on storage.objects;

-- ---- documentos_registo ---------------------------------------------------
-- INSERT aberto a TODOS (o registo cidadão PRÉ-LOGIN faz upload de BI/selfie)
-- mas só ficheiros do padrão "<identificador>/(frente|verso|selfie)_<n>.<ext>".
create policy "docreg_insert_publico" on storage.objects for insert
with check (
  bucket_id = 'documentos_registo'
  and lower(name) ~ '^[a-z0-9_-]+/(frente|verso|selfie)_[0-9]+[a-z0-9_]*\.(jpg|jpeg|png|webp|pdf)$'
);

-- SELECT: admin/instituição (homologação) ou o PRÓPRIO titular (1ª pasta =
-- número de B.I. / código institucional gravado no token v14).
create policy "docreg_select_dono_admin_inst" on storage.objects for select
using (
  bucket_id = 'documentos_registo'
  and (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'instituicao')
    or (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'bi')
    or (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'instituicao')
  )
);

-- UPDATE/DELETE: só admin/instituição (limpeza de contas, homologação).
create policy "docreg_update_admin_inst" on storage.objects for update
using (
  bucket_id = 'documentos_registo'
  and (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'instituicao')
)
with check (
  bucket_id = 'documentos_registo'
  and (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'instituicao')
);

create policy "docreg_delete_admin_inst" on storage.objects for delete
using (
  bucket_id = 'documentos_registo'
  and (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'instituicao')
);

-- ---- correspondencias_anexos ----------------------------------------------
-- INSERT: utilizadores autenticados, na PRÓPRIA pasta (1ª pasta = BI/código do
-- remetente). A pasta de conveniência 'geral' (fallback de demo) é tolerada.
create policy "anexos_insert_autenticado" on storage.objects for insert
with check (
  bucket_id = 'correspondencias_anexos'
  and auth.role() = 'authenticated'
  and (
    (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'bi')
    or (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'instituicao')
    or (storage.foldername(name))[1] = 'geral'
  )
);

-- SELECT: qualquer utilizador AUTENTICADO da plataforma (o destinatário tem de
-- ler anexos do remetente — não há FK mensagem→objecto). O mundo exterior não
-- lê NADA (bucket privado + URL assinado obrigatório).
create policy "anexos_select_autenticado" on storage.objects for select
using (
  bucket_id = 'correspondencias_anexos'
  and auth.role() = 'authenticated'
);

-- UPDATE/DELETE: dono da pasta (remetente) ou admin.
create policy "anexos_update_dono_ou_admin" on storage.objects for update
using (
  bucket_id = 'correspondencias_anexos'
  and (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    or (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'bi')
    or (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'instituicao')
  )
)
with check (
  bucket_id = 'correspondencias_anexos'
  and (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    or (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'bi')
    or (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'instituicao')
  )
);

create policy "anexos_delete_dono_ou_admin" on storage.objects for delete
using (
  bucket_id = 'correspondencias_anexos'
  and (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    or (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'bi')
    or (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'instituicao')
  )
);

-- ---- fotos_perfil (bucket mantém-se PÚBLICO — avatares) --------------------
-- Leitura pública (qualquer visitante pode ver um avatar — dano nulo); a
-- ESCRITA passa a exigir sessão (hoje um anónimo podia até APAGAR tudo).
create policy "fotos_select_publico" on storage.objects for select
using (bucket_id = 'fotos_perfil');

create policy "fotos_insert_autenticado" on storage.objects for insert
with check (
  bucket_id = 'fotos_perfil'
  and auth.role() = 'authenticated'
);

create policy "fotos_update_autenticado" on storage.objects for update
using (
  bucket_id = 'fotos_perfil'
  and auth.role() = 'authenticated'
)
with check (
  bucket_id = 'fotos_perfil'
  and auth.role() = 'authenticated'
);

create policy "fotos_delete_autenticado" on storage.objects for delete
using (
  bucket_id = 'fotos_perfil'
  and auth.role() = 'authenticated'
);

-- ============================================================================
-- 3) F44 — RPC DE PRÉ-LOGIN INSTITUCIONAL (security definer, mínimos)
-- ----------------------------------------------------------------------------
-- Devolve NO MÁXIMO 1 linha {nome, status} para um código EXACTO. Não expõe
-- observacoes, e-mails, fotos nem password_hash; não permite LISTAR a tabela
-- (código completo obrigatório). A re-hidratação completa (InstPack) acontece
-- PÓS-Auth no cliente (a linha passa a ser visível pela própria RLS).
-- ============================================================================
create or replace function public.cda_prelogin_instituicao(p_codigo text)
returns table (nome text, status text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_codigo is null or length(trim(p_codigo)) < 3 or length(trim(p_codigo)) > 30 then
    return;
  end if;
  return query
    select s.nome::text, s.status::text
    from public.solicitacoes_registo s
    where upper(s.bi_numero) = upper(trim(p_codigo))
    limit 1;
end;
$$;

revoke all on function public.cda_prelogin_instituicao(text) from public;
grant execute on function public.cda_prelogin_instituicao(text) to anon, authenticated;

-- ============================================================================
-- 4) ANTI-SPAM nos 2 INSERT-abertas (Auditoria F42 · Médio#2)
-- ----------------------------------------------------------------------------
-- As políticas de insert abertas (solicitacoes_insert_publica e
-- audit_insert_aberta) SÃO NECESSÁRIAS (registo pré-login / auditoria da app).
-- Em vez de as fechar, adiciona-se validação mínima + travão de rajada.
-- ============================================================================
create or replace function public.cda_guard_insert_solicitacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if NEW.bi_numero is null or NEW.bi_numero !~ '^[A-Za-z0-9-]{3,30}$' then
    raise exception 'CDA-VALIDACAO: identificador (B.I./código) inválido.';
  end if;
  if NEW.nome is null or length(trim(NEW.nome)) < 3 then
    raise exception 'CDA-VALIDACAO: nome em falta ou demasiado curto.';
  end if;
  if NEW.email is not null and NEW.email <> '' and NEW.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'CDA-VALIDACAO: e-mail inválido.';
  end if;
  -- Rajada: mesmo identificador ou mesmo e-mail inserido há < 60s.
  -- (Um re-envio legítimo já falha por 23505 na chave única do bi_numero.)
  if exists (
    select 1 from public.solicitacoes_registo s
    where s.criado_em > now() - interval '60 seconds'
      and (
        upper(s.bi_numero) = upper(NEW.bi_numero)
        or (NEW.email is not null and NEW.email <> '' and s.email = NEW.email)
      )
  ) then
    raise exception 'CDA-ANTISPAM: pedido idêntico recebido há menos de 60 segundos.';
  end if;
  return NEW;
end;
$$;

drop trigger if exists cda_guard_solicitacao_bi on public.solicitacoes_registo;
create trigger cda_guard_solicitacao_bi
  before insert on public.solicitacoes_registo
  for each row execute function public.cda_guard_insert_solicitacao();

create or replace function public.cda_guard_insert_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Rajada idêntica: a 6.ª ocorrência igual (mesmo username+action) dentro do
  -- mesmo segundo é descartada SILENCIOSAMENTE (sem erro para o cliente).
  if exists (
    select 1 from (
      select 1 from public.audit_logs a
      where a.username = NEW.username and a.action = NEW.action
        and a."timestamp" > now() - interval '1 second'
      limit 5
    ) five
    having count(*) >= 5
  ) then
    return null;
  end if;
  return NEW;
end;
$$;

drop trigger if exists cda_guard_audit_bi on public.audit_logs;
create trigger cda_guard_audit_bi
  before insert on public.audit_logs
  for each row execute function public.cda_guard_insert_audit_log();

commit;

-- ============================================================================
-- 5) VERIFICAÇÃO (corre cada SELECT por baixo e confere os valores esperados)
-- ============================================================================

-- ① Buckets: documentos_registo=false, correspondencias_anexos=false, fotos_perfil=true
select id, public from storage.buckets where id in ('documentos_registo','correspondencias_anexos','fotos_perfil') order by id;
-- esperado:
-- correspondencias_anexos | false
-- documentos_registo      | false
-- fotos_perfil            | true

-- ② Policies storage.objects (exactamente este conjunto de 12)
select policyname, cmd from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and (policyname like 'docreg_%' or policyname like 'anexos_%' or policyname like 'fotos_%')
order by policyname;
-- esperado (12): anexos_delete_dono_ou_admin | DELETE · anexos_insert_autenticado | INSERT
--  anexos_select_autenticado | SELECT · anexos_update_dono_ou_admin | UPDATE
--  docreg_delete_admin_inst | DELETE · docreg_insert_publico | INSERT
--  docreg_select_dono_admin_inst | SELECT · docreg_update_admin_inst | UPDATE
--  fotos_delete_autenticado | DELETE · fotos_insert_autenticado | INSERT
--  fotos_select_publico | SELECT · fotos_update_autenticado | UPDATE
--  (policies antigas "Permitir …" têm de ter DESAPARECIDO)

-- ③ RPC de pré-login presente
select proname, prosecdef as security_definer from pg_proc where proname = 'cda_prelogin_instituicao';
-- esperado: cda_prelogin_instituicao | true

-- ④ Smoke-test da RPC (substitui pelo código de uma instituição real tua):
-- select * from public.cda_prelogin_instituicao('SME-LLVV');
-- esperado: 1 linha {nome, status} — e ARRAY VAZIO para um código inexistente.

-- ⑤ Triggers anti-spam presentes
select tgname, tgrelid::regclass as tabela, tgenabled from pg_trigger
where tgname in ('cda_guard_solicitacao_bi','cda_guard_audit_bi');
-- esperado: 2 linhas, tgenabled = O

-- ⑥ REGISTO CONTINUA A FUNCIONAR? — teste manual no site: novo registo de
-- cidadão tem de concluir com sucesso (upload frente/verso/selfie OK, INSERT OK).

-- ============================================================================
-- ROLLBACK (SÓ em emergência — volta aos buckets públicos sem policies finas)
-- ----------------------------------------------------------------------------
-- begin;
-- update storage.buckets set public = true where id in ('documentos_registo','correspondencias_anexos');
-- drop policy if exists "docreg_insert_publico" on storage.objects;
-- drop policy if exists "docreg_select_dono_admin_inst" on storage.objects;
-- drop policy if exists "docreg_update_admin_inst" on storage.objects;
-- drop policy if exists "docreg_delete_admin_inst" on storage.objects;
-- drop policy if exists "anexos_insert_autenticado" on storage.objects;
-- drop policy if exists "anexos_select_autenticado" on storage.objects;
-- drop policy if exists "anexos_update_dono_ou_admin" on storage.objects;
-- drop policy if exists "anexos_delete_dono_ou_admin" on storage.objects;
-- drop policy if exists "fotos_select_publico" on storage.objects;
-- drop policy if exists "fotos_insert_autenticado" on storage.objects;
-- drop policy if exists "fotos_update_autenticado" on storage.objects;
-- drop policy if exists "fotos_delete_autenticado" on storage.objects;
-- create policy "Permitir leitura pública em documentos_registo" on storage.objects for select using (bucket_id='documentos_registo');
-- create policy "Permitir upload/modificação em documentos_registo" on storage.objects for all using (bucket_id='documentos_registo') with check (bucket_id='documentos_registo');
-- create policy "Permitir leitura pública em correspondencias_anexos" on storage.objects for select using (bucket_id='correspondencias_anexos');
-- create policy "Permitir upload/modificação em correspondencias_anexos" on storage.objects for all using (bucket_id='correspondencias_anexos') with check (bucket_id='correspondencias_anexos');
-- create policy "Permitir leitura pública em fotos_perfil" on storage.objects for select using (bucket_id='fotos_perfil');
-- create policy "Permitir upload/modificação em fotos_perfil" on storage.objects for all using (bucket_id='fotos_perfil') with check (bucket_id='fotos_perfil');
-- drop function if exists public.cda_prelogin_instituicao(text);
-- drop trigger if exists cda_guard_solicitacao_bi on public.solicitacoes_registo;
-- drop function if exists public.cda_guard_insert_solicitacao();
-- drop trigger if exists cda_guard_audit_bi on public.audit_logs;
-- drop function if exists public.cda_guard_insert_audit_log();
-- commit;
-- ============================================================================
