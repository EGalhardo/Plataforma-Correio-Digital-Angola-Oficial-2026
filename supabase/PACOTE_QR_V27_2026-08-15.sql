-- ============================================================================
-- CORREIO DIGITAL ANGOLA — PACOTE QR REAL (v27) · 2026-08-15
-- ============================================================================
-- APLICAR NO SQL EDITOR do Supabase (Dashboard → SQL Editor → New query →
-- colar TUDO → Run).
--
-- O QUE FAZ: cria a RPC pública `cda_validar_protocolo(p_numero)` — a
-- validação REAL do QR Code na nuvem. Hoje o botão «VALIDAR» no detalhe da
-- mensagem devolve «indisponível» porque esta função nunca foi aplicada
-- (o código da app já a espera — src/services/supabaseService.ts).
--
-- SEGURANÇA: a função é SECURITY DEFINER e devolve APENAS o mínimo para
-- verificar autenticidade (número, emissor, data, estado, se tem hash selado).
-- NUNCA devolve BI, assunto, corpo, anexos ou prazos. A tabela
-- digital_protocols mantém o RLS restritivo.
--
-- IDEMPOTENTE: pode re-executar sem efeitos secundários.
-- ROLLBACK: drop function if exists public.cda_validar_protocolo(text);
-- ============================================================================

create or replace function public.cda_validar_protocolo(p_numero text)
returns table (
  protocolo    text,
  emissor      text,
  data_emissao text,
  estado       text,
  selado       boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_numero text;
begin
  -- Normalização e defesa: aceita números com formato plausível apenas.
  v_numero := upper(btrim(coalesce(p_numero, '')));
  if char_length(v_numero) < 6 or char_length(v_numero) > 64 then
    return; -- entrada inválida → zero linhas (não revela nada)
  end if;

  return query
    select
      upper(dp.protocol_number)::text,
      dp.issuer_institution::text,
      dp.official_issue_date::text,
      dp.current_state::text,
      (dp.document_hash is not null and btrim(dp.document_hash) <> '')::boolean
    from public.digital_protocols dp
    where upper(dp.protocol_number) = v_numero
    limit 1;
end;
$$;

-- ----------------------------------------------------------------------------
-- §2) GRANTS + AUDITORIA
-- ----------------------------------------------------------------------------
revoke all on function public.cda_validar_protocolo(text) from public;
grant execute on function public.cda_validar_protocolo(text) to anon, authenticated;

comment on function public.cda_validar_protocolo(text) is
  'Validação pública MÍNIMA de protocolos (QR): devolve número/emissor/data/estado/selo — nunca BI, assunto ou corpo. v27, 2026-08-09.';

-- ============================================================================
-- VERIFICAÇÃO PÓS-EXECUÇÃO (deve devolver 1 linha)
-- ============================================================================
select * from public.cda_validar_protocolo('CDA-2026-515700');
