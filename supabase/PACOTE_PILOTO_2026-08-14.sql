-- ============================================================================
-- CORREIO DIGITAL ANGOLA — PACOTE DE MIGRAÇÕES PARA PILOTO (2026-08-14)
-- ============================================================================
-- Aplicar NO SQL EDITOR do Supabase (Dashboard → SQL Editor → New query → colar
-- TUDO → Run). O editor executa cada statement; as secções são idempotentes
-- (podem ser re-executadas sem efeitos secundários), exceto a v15 que tem
-- transação própria (begin/commit) — se algo falhar nela, nada é aplicado.
--
-- CONTEÚDO (por ordem):
--   SECÇÃO 1 · v15 — Storage privado (documentos_registo e
--            correspondencias_anexos) + RPC cda_prelogin_instituicao + anti-spam
--   SECÇÃO 2 · v16 — RPC cda_prelogin_cidadao (revogação F47)
--   SECÇÃO 3 · v17 — Fila de registo visível ao agente institucional (B-1)
--   SECÇÃO 4 · v18 — Storage privilégio mínimo (instituição deixa de ver BI alheio)
--   SECÇÃO 5 · Funções helper do hardening (current_bi / current_role /
--            current_institution_code) — SEGURAS, sem políticas
--   SECÇÃO 6 · Verificações pós-execução (devem devolver os resultados esperados)
--
-- ⚠️ NOTA IMPORTANTE sobre o production_hardening.sql:
--   As políticas "prod_*" desse template NÃO estão incluídas de propósito:
--     1) usam role='institution' mas a app grava role='instituicao' → ficariam
--        mortas para instituições (as v12/v13/v14 já cobrem com o nome certo);
--     2) duplicariam as políticas já ativas (RLS combina políticas com OR —
--        não quebraria, mas polui e confunde a auditoria);
--     3) prod_audit_insert bloquearia o INSERT anónimo de audit_logs que a
--        app usa por desenho.
--   As funções helper (Secção 5) SÃO úteis e seguras — daí incluídas.
--
-- APÓS EXECUTAR: correr a Secção 6 e depois, localmente:
--   npm run verify:supabase
-- ============================================================================

-- ============================================================================
-- SECÇÃO 1 — v15_storage_privado_e_prelogin.sql (transação própria)
-- ============================================================================
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

-- ============================================================================
-- SECÇÃO 2 — v16_prelogin_cidadao.sql
-- ============================================================================
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

-- ② Grants: anon + authenticated têm EXECUTE (essenciais). As linhas extra
--    grantee = postgres (dono da função) e service_role são os grants por
--    defeito do Supabase e são INOFENSIVAS (service_role já ignora RLS).
--    Esperado: ver pelo menos anon e authenticated (4 linhas no total).
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

-- ============================================================================
-- SECÇÃO 3 — v17_fila_select_instituicao.sql
-- ============================================================================
-- ============================================================================
-- CDA · v17 — FILA VISÍVEL AO AGENTE INSTITUCIONAL (correcção B-1) · RONDA F50+
-- ----------------------------------------------------------------------------
-- Defeito B-1 (confirmado ao vivo em 2026-07-28, ronda F50):
--   Um agente INSTITUCIONAL autenticado não consegue ler a PRÓPRIA linha da
--   fila (solicitacoes_registo). A política `solicitacoes_select_propria_ou_admin`
--   (v12 → reescrita na v14) só cobre:
--       bi_numero = app_metadata.bi          (cidadão titular)
--       app_metadata.role = 'admin'          (admin)
--   Ocorre que agentes institucionais têm claims { role:'instituicao',
--   instituicao:'<CÓDIGO>', bi:null } — nenhum dos dois ramos os deixa passar
--   ⇒ o SELECT devolve sempre zero linhas.
--
--   Consequência (não é falha de segurança — é funcional): a re-hidratação
--   pós-Auth do "pack institucional" (morada, província, dados do pack)
--   introduzida na F44 está morta em produção: tudo o que depende de ler a
--   linha própria cross-device nunca consegue.
--
-- Correcção (padrão já usado na v15 para as políticas de storage):
--   acrescentar um terceiro ramo à política:
--       bi_numero = app_metadata.instituicao   (agente institucional titular)
--
--   Porque `bi_numero` guarda o código institucional em maiúsculas (v15) e o
--   claim `instituicao` também é normalizado em maiúsculas (v14 trigger), a
--   igualdade directa basta; o `upper(...)` defensivo cobre qualquer resíduo
--   em minúsculas sem alterar a semântica das linhas existentes.
--
-- Garantias preservadas (NADA muda para os outros papéis):
--   • anon continua sem ler nada (sem claims);
--   • cidadão continua a ver apenas a sua linha (ramo `bi`);
--   • admin continua a ver tudo (ramo `role='admin'`);
--   • um agente da instituição X NUNCA vê linhas de outra instituição nem de
--     cidadãos — o ramo novo só casa quando bi_numero = SEU código.
--
-- IDEMPOTENTE: pode ser re-executado sem efeitos colaterais.
-- EXECUÇÃO: Supabase → SQL Editor → colar TUDO → Run.
-- ============================================================================

drop policy if exists "solicitacoes_select_propria_ou_admin" on solicitacoes_registo;

create policy "solicitacoes_select_propria_ou_admin"
  on solicitacoes_registo for select
  using (
    -- 1) cidadão titular (inalterado desde v14)
    bi_numero = (auth.jwt() -> 'app_metadata' ->> 'bi')
    -- 2) admin vê tudo (inalterado desde v14)
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    -- 3) NOVO (v17): agente institucional titular vê a(s) sua(s) linha(s)
    or upper(bi_numero) = upper(coalesce(
          auth.jwt() -> 'app_metadata' ->> 'instituicao', ''))
  );

-- (UPDATE/DELETE continuam admin-only — v14, não se toca;
--  INSERT continua público com anti-spam v15, não se toca.)

-- ============================================================================
-- VERIFICAÇÕES pós-execução (devem bater certo):
-- ----------------------------------------------------------------------------
-- ① A política existe e contém os TRÊS ramos (bi, admin, instituicao):
--    Esperado: 1 linha; coluna `qual` contém 'bi', 'admin' e 'instituicao'.
select pol.polname as politica, pg_get_expr(pol.polqual, pol.polrelid) as qual
from pg_policy pol
join pg_class cls on cls.oid = pol.polrelid
join pg_namespace ns on ns.oid = cls.relnamespace
where ns.nspname = 'public'
  and cls.relname = 'solicitacoes_registo'
  and pol.polname = 'solicitacoes_select_propria_ou_admin';

-- ② Fumo semântico com um JWT simulado (sem tocar em dados reais):
--    Simula o agente 'TST-V17' e verifica que a regra casa com bi_numero.
--    Esperado: CASA_INSTITUICAO = true · CASA_OUTRA = false
with jwt_agente as (
  select '{"role":"instituicao","instituicao":"TST-V17","bi":null}'::jsonb as app
)
select
  (select upper('TST-V17') = upper(coalesce(
     app ->> 'instituicao', '')) from jwt_agente) as casa_instituicao,
  (select upper('OUTRA-XX') = upper(coalesce(
     app ->> 'instituicao', '')) from jwt_agente) as casa_outra;

-- ③ Fumo real (opcional, fora do SQL Editor — com chave anon via REST):
--    agente TST autenticado → GET /rest/v1/solicitacoes_registo?select=bi_numero
--    Esperado: a(s) linha(s) com bi_numero = código do agente; mais nada.

-- ============================================================================
-- ROLLBACK (se necessário) — repõe exactamente o texto v14 (2 ramos):
-- ----------------------------------------------------------------------------
-- drop policy if exists "solicitacoes_select_propria_ou_admin" on solicitacoes_registo;
-- create policy "solicitacoes_select_propria_ou_admin"
--   on solicitacoes_registo for select
--   using (
--     bi_numero = (auth.jwt() -> 'app_metadata' ->> 'bi')
--     or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
--   );
-- (Com o rollback, o B-1 regressa: a re-hidratação F44 do pack institucional
--  volta a morrer silenciosamente — recomenda-se NÃO fazer rollback.)
-- ============================================================================

-- ============================================================================
-- SECÇÃO 4 — v18_storage_privilegio_minimo.sql
-- ============================================================================
-- ============================================================================
-- CDA · v18 — STORAGE: PRIVILÉGIO MÍNIMO EM documentos_registo · RONDA F52
-- ----------------------------------------------------------------------------
-- Defeito confirmado AO VIVO (ronda pós-v17, 2026-07-28):
--   Qualquer agente INSTITUCIONAL autenticado consegue pedir URL ASSINADO de
--   documentos de registo de QUALQUER cidadão (frente/verso/selfie do B.I.):
--     POST /storage/v1/object/sign/documentos_registo/<BI-ALHEIO>/<ficheiro>
--       → 200 {"signedURL": ...}
--   Causa: as políticas de storage da v15 incluem o ramo
--       (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','instituicao')
--   OU SEJA: 'instituicao' foi tratada como papel quase-admin no bucket
--   `documentos_registo` — desenhado para "homologação", mas a homologação é
--   função do ADMIN; a instituição nunca precisa de ver B.I.s de terceiros.
--
--   NOTA DE CORRECÇÃO HONESTA à leitura inicial da ronda: o problema NÃO é
--   reconstrução/forja de claims — provou-se ao vivo que o Storage lê o
--   app_metadata ASSINADO do JWT (user_metadata forjado não passa; o cenário
--   "forja admin" continua fechado desde a v14). É um defeito de DESENHO
--   (excesso de privilégio), não de criptografia — e corrige-se retirando
--   'instituicao' dos ramos privilegiados deste bucket.
--
-- Correcção (privilégio mínimo, sem quebrar os fluxos legítimos):
--   • documentos_registo SELECT/UPDATE/DELETE: role='admin' APENAS
--     (+ ramo de dono: 1.ª pasta = BI/código do próprio token — inalterado);
--   • INSERT público (upload no registo): INALTERADO (anon continua a poder
--     submeter frente/verso/selfie da sua própria pasta conforme v15);
--   • correspondencias_anexos e fotos_perfil: INALTERADOS (o papel
--     'instituicao' nunca teve ali ramo privilegiado; select de anexos
--     continua "qualquer autenticado" por exigência do circuito de correio).
--
-- Impacto funcional revisto (com código-fonte da app):
--   • Consola Admin real (agente ADMIN-NNNN, role='admin'): vê tudo ✓
--   • Cidadão vê os seus próprios documentos (pasta = seu BI) ✓
--   • Instituição vê APENAS a sua própria pasta (pasta = seu código) ✓
--   • Instituição a ver B.I. de terceiros: FECHADO ✓
--
-- BÓNUS DE AUDITORIA: RPC pública `cda_policy_check(p_tabela, p_politica)`
-- (security definer, SELECT-only) — devolve o texto vigente de UMA política
-- para verificação contínua sem SQL Editor; não expõe dados de utilizadores.
--
-- IDEMPOTENTE: pode ser re-executado sem efeitos colaterais.
-- EXECUÇÃO: Supabase → SQL Editor → colar TUDO → Run. (Aplicar DEPOIS da v16.)
-- ============================================================================

-- ---- documentos_registo: SELECT -------------------------------------------
drop policy if exists "docreg_select_dono_admin_inst" on storage.objects;
create policy "docreg_select_dono_admin_inst" on storage.objects for select
using (
  bucket_id = 'documentos_registo'
  and (
    -- admin (homologação) — papel exclusivamente do app_metadata ASSINADO
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    -- dono cidadão (1.ª pasta = BI do token)
    or (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'bi')
    -- dono institucional (1.ª pasta = código da própria instituição)
    or (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'instituicao')
  )
);

-- ---- documentos_registo: UPDATE --------------------------------------------
drop policy if exists "docreg_update_admin_inst" on storage.objects;
create policy "docreg_update_admin_inst" on storage.objects for update
using (
  bucket_id = 'documentos_registo'
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  bucket_id = 'documentos_registo'
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- ---- documentos_registo: DELETE --------------------------------------------
drop policy if exists "docreg_delete_admin_inst" on storage.objects;
create policy "docreg_delete_admin_inst" on storage.objects for delete
using (
  bucket_id = 'documentos_registo'
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- (docreg_insert_publico, anexos_* e fotos_*: sem alteração.)

-- ---- RPC pública de auditoria de políticas ---------------------------------
create or replace function public.cda_policy_check(p_tabela text, p_politica text)
returns table (politica text, texto text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
    select pol.polname::text, pg_get_expr(pol.polqual, pol.polrelid)::text
    from pg_policy pol
    join pg_class cls on cls.oid = pol.polrelid
    join pg_namespace ns on ns.oid = cls.relnamespace
    where ns.nspname in ('public', 'storage')
      and cls.relname = p_tabela
      and pol.polname = p_politica;
end;
$$;
revoke all on function public.cda_policy_check(text, text) from public;
grant execute on function public.cda_policy_check(text, text) to anon, authenticated;

-- ============================================================================
-- VERIFICAÇÕES pós-execução (devem bater certo):
-- ----------------------------------------------------------------------------
-- ① As 3 políticas de documentos_registo já NÃO contêm 'instituicao' com
--    privilégio global — o ramo 'role' só pode casar 'admin'; 'instituicao'
--    só pode aparecer como DONO (comparação com foldername):
--    Esperado: 3 linhas; em cada `texto`, "role ... in ('admin','instituicao')"
--    deixou de existir — apenas = 'admin' (select: + ramos de dono intactos).
select pol.polname as politica, pg_get_expr(pol.polqual, pol.polrelid) as texto
from pg_policy pol
join pg_class c on c.oid = pol.polrelid
join pg_namespace ns on ns.oid = c.relnamespace
where ns.nspname = 'storage' and c.relname = 'objects'
  and pol.polname in ('docreg_select_dono_admin_inst',
                      'docreg_update_admin_inst',
                      'docreg_delete_admin_inst');

-- ② Fumo real B ANTES/DEPOIS (fora do SQL Editor, com chave anon):
--    agente institucional autenticado →
--      POST /storage/v1/object/sign/documentos_registo/<BI-DE-CIDADÃO>/<ficheiro>
--    Esperado DEPOIS: 404 {"error":"not_found"} (antes: 200 signedURL).
--    Controlo: o mesmo pedido com JWT de agente ADMIN real → 200 signedURL;
--    cidadão dono da pasta → 200 signedURL.

-- ③ A RPC devolve a política pedida e NADA de dados pessoais:
--    POST /rest/v1/rpc/cda_policy_check
--      {"p_tabela":"solicitacoes_registo","p_politica":"solicitacoes_select_propria_ou_admin"}
--    Esperado: 1 linha [nome, texto].

-- ============================================================================
-- ROLLBACK (se necessário — volta a abrir a porta; NÃO recomendado):
-- ----------------------------------------------------------------------------
-- drop policy if exists "docreg_select_dono_admin_inst" on storage.objects;
-- create policy "docreg_select_dono_admin_inst" on storage.objects for select
-- using (
--   bucket_id = 'documentos_registo'
--   and (
--     (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'instituicao')
--     or (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'bi')
--     or (storage.foldername(name))[1] = (auth.jwt() -> 'app_metadata' ->> 'instituicao')
--   )
-- );
-- drop policy if exists "docreg_update_admin_inst" on storage.objects;
-- create policy "docreg_update_admin_inst" on storage.objects for update
-- using (bucket_id='documentos_registo' and (auth.jwt()->'app_metadata'->>'role') in ('admin','instituicao'))
-- with check (bucket_id='documentos_registo' and (auth.jwt()->'app_metadata'->>'role') in ('admin','instituicao'));
-- drop policy if exists "docreg_delete_admin_inst" on storage.objects;
-- create policy "docreg_delete_admin_inst" on storage.objects for delete
-- using (bucket_id='documentos_registo' and (auth.jwt()->'app_metadata'->>'role') in ('admin','instituicao'));
-- drop function if exists public.cda_policy_check(text, text);
-- ============================================================================

-- ============================================================================
-- SECÇÃO 5 — Funções helper do production_hardening (SEGURAS — sem políticas)
-- ----------------------------------------------------------------------------
-- Estas 3 funções lêem as claims JWT de forma centralizada e são usadas por
-- políticas futuras. CREATE OR REPLACE → idempotentes. Não alteram o RLS atual.
-- ============================================================================
create or replace function public.current_bi()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'bi', auth.jwt() ->> 'bi', '');
$$;

create or replace function public.current_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() ->> 'role', '');
$$;

create or replace function public.current_institution_code()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'institution_code', auth.jwt() ->> 'institution_code', '');
$$;

-- ============================================================================
-- SECÇÃO 6 — VERIFICAÇÕES PÓS-EXECUÇÃO
-- ----------------------------------------------------------------------------
-- Executar cada bloco e confirmar o resultado esperado. Se algum devolver
-- algo inesperado, parar e rever antes de continuar o piloto.
-- ============================================================================

-- 6.1 · Os buckets sensíveis devem estar PRIVADOS (public = false)
--      e fotos_perfil PÚBLICO (public = true)
select id, public from storage.buckets order by id;

-- 6.2 · As RPCs devem existir (1 linha cada)
select proname from pg_proc where proname in ('cda_prelogin_instituicao', 'cda_prelogin_cidadao', 'current_bi', 'current_role', 'current_institution_code')
order by proname;

-- 6.3 · As funções prelogin devem ser security definer (prosecdef = true)
select p.proname, p.prosecdef
from pg_proc p
where p.proname in ('cda_prelogin_instituicao', 'cda_prelogin_cidadao');

-- 6.4 · Sem políticas permissivas de SELECT/ALL com USING(true) restantes
--      (esperado: ZERO linhas — ou apenas as "solicitacoes_insert_publica" que
--      não é SELECT/ALL)
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and cmd in ('SELECT', 'ALL')
  and qual = 'true'
order by tablename;

-- 6.5 · Storage: políticas de documentos_registo devem exigir admin/dono
--      (esperado: docreg_insert_publico permite INSERT; SELECT é admin/dono)
select policyname, cmd
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;

-- 6.6 · Teste funcional das RPCs (devem devolver sem erro; com dados de
--      demonstração devolvem 0 linhas ou o estado — nunca erro)
select * from public.cda_prelogin_cidadao('009874562LA041');
select * from public.cda_prelogin_instituicao('AGT-9921-SR');
