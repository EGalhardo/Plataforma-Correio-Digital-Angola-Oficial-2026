-- ============================================================================
-- v30 — IA Base de Conhecimento: 20.000 caracteres + ficheiros SEM limite
-- (2026-08-22 · idempotente — pode ser executado quantas vezes quiser)
-- ----------------------------------------------------------------------------
-- Objectivo:
--   1) O campo "Conteúdo que a IA pode usar" passa de 4.000 para 20.000
--      caracteres. A aplicação (frontend) já aceita 20.000; este script
--      remove o constraint antigo da base de dados que rejeitava > 4.000
--      com erro 23514 ("kb_fontes_instituicao_texto_check").
--   2) O bucket kb_ficheiros passa a aceitar ficheiros de QUALQUER tamanho
--      (antes: 10 MB) — Word (.doc/.docx), TXT e PDF.
--
-- COMO APLICAR:
--   Supabase Dashboard → SQL Editor → colar este ficheiro completo → RUN.
--   (Mesmo processo usado para os scripts v25_kb_instituicao.sql e
--   v28_kb_ficheiros_upload.sql.)
--
-- Depois de correr, o script imprime no final duas confirmações:
--   constraint_texto = 20000  |  bucket_sem_limite = true
-- ============================================================================

-- ----------------------------------------------------------------------------
-- §1) Constraint de tamanho do texto: 4.000 → 20.000
--     (nome confirmado em produção: kb_fontes_instituicao_texto_check)
-- ----------------------------------------------------------------------------
alter table public.kb_fontes_instituicao
  drop constraint if exists kb_fontes_instituicao_texto_check;

alter table public.kb_fontes_instituicao
  add constraint kb_fontes_instituicao_texto_check
  check (char_length(btrim(texto)) >= 200 and char_length(texto) <= 20000);

-- ----------------------------------------------------------------------------
-- §2) Bucket kb_ficheiros — SEM limite de tamanho + tipos alargados
--     (file_size_limit = NULL significa SEM limite)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kb_ficheiros',
  'kb_ficheiros',
  true,
  null, -- SEM limite de tamanho (antes: 10 MB)
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'text/rtf',
    'application/rtf',
    'application/octet-stream'
  ]
)
on conflict (id) do update set
  public = true,
  file_size_limit = null,
  allowed_mime_types = array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'text/rtf',
    'application/rtf',
    'application/octet-stream'
  ];

-- ----------------------------------------------------------------------------
-- §3) VERIFICAÇÃO (executa no mesmo RUN e mostra o resultado no painel)
-- ----------------------------------------------------------------------------
select
  (
    select max(cast(substring(pg_get_constraintdef(oid) from '<= (\d+)') as integer))
    from pg_constraint
    where conrelid = 'public.kb_fontes_instituicao'::regclass
      and conname = 'kb_fontes_instituicao_texto_check'
      and pg_get_constraintdef(oid) like '%char_length%'
  ) as constraint_texto_maximo,          -- esperado: 20000
  (
    select (file_size_limit is null)
    from storage.buckets
    where id = 'kb_ficheiros'
  ) as bucket_sem_limite;                 -- esperado: true
