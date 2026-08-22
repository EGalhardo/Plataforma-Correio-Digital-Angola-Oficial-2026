-- ============================================================================
-- v30 — IA Base de Conhecimento: 20.000 caracteres + ficheiros sem limite
-- (2026-08-22 · idempotente — pode ser corrido quantas vezes quiser)
-- ----------------------------------------------------------------------------
-- 1) O campo "Conteúdo que a IA pode usar" passa de 4.000 para 20.000
--    caracteres (a aplicação já aceita 20.000; este script remove o
--    constraint antigo da tabela que rejeitava > 4.000 com erro 23514).
-- 2) O bucket kb_ficheiros passa a aceitar ficheiros de QUALQUER tamanho
--    (antes: 10 MB) — Word (.doc/.docx), TXT e PDF.
--
-- Executar no SQL Editor do Supabase (como os scripts v25/v28 anteriores).
-- Depois de correr, validar com:  npm run verify:v28
-- ============================================================================

-- ----------------------------------------------------------------------------
-- §1) Constraint de tamanho do texto: 4.000 → 20.000
-- ----------------------------------------------------------------------------
alter table public.kb_fontes_instituicao
  drop constraint if exists kb_fontes_instituicao_texto_check;

alter table public.kb_fontes_instituicao
  add constraint kb_fontes_instituicao_texto_check
  check (char_length(btrim(texto)) >= 200 and char_length(texto) <= 20000);

-- ----------------------------------------------------------------------------
-- §2) Bucket kb_ficheiros — sem limite de tamanho + tipos alargados
--     (file_size_limit = NULL significa SEM limite)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kb_ficheiros',
  'kb_ficheiros',
  true,
  null, -- SEM limite de tamanho (antes 10 MB)
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
