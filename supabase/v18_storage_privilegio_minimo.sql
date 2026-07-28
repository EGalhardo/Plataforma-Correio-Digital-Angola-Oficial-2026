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
