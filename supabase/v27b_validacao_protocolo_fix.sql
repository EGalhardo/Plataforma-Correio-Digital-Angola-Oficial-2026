-- ============================================================================
-- v27b (2026-08-10) — CORRECÇÃO da função de validação pública de protocolos
-- ----------------------------------------------------------------------------
-- DEFEITO APANHADO na verificação comportamental de produção (probe v27):
--   a v27 criou a função com RETURNS TABLE (… text …), mas as colunas reais
--   de digital_protocols NÃO são todas "text" (protocol_number/varchar,
--   official_issue_date/date…). O PL/pgSQL exige correspondência EXACTA de
--   tipos no RETURN QUERY e rebentava com:
--     ERROR 42804: structure of query does not match function result type
--   Os caminhos que não tocam na query (entrada curta) funcionavam, o que
--   mostra que grants/SECURITY DEFINER estavam certos — só faltavam casts.
--
-- CORRECÇÃO: casts explícitos ::text nas 4 colunas de texto (selado já é
-- boolean). Semântica, grants e janela mínima INALTERADOS (CREATE OR REPLACE
-- preserva os grants; reafirmo-os mesmo assim por segurança).
--
-- EXECUÇÃO: SQL Editor → colar TUDO → Run. Esperado: Success.
-- Depois de aplicada, o probe comportamental v27 passa 8/8.
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
      (dp.document_hash is not null and btrim(dp.document_hash) <> '')
    from public.digital_protocols dp
    where upper(dp.protocol_number) = v_numero
    limit 1;
end;
$$;

revoke all on function public.cda_validar_protocolo(text) from public;
grant execute on function public.cda_validar_protocolo(text) to anon, authenticated;

comment on function public.cda_validar_protocolo(text) is
  'Validação pública MÍNIMA de protocolos (QR): devolve número/emissor/data/estado/selo — nunca BI, assunto ou corpo. v27 2026-08-09, corrigida em v27b 2026-08-10 (casts ::text: erro 42804).';

-- ----------------------------------------------------------------------------
-- VERIFICAÇÃO (corre à mão depois do Run):
--   -- 1) lixo curto → zero linhas SEM erro:
--   select * from public.cda_validar_protocolo('XXX');
--   -- 2) número real → 1 linha (já sem o erro 42804):
--   select * from public.cda_validar_protocolo('<PROTOCOLO-REAL>');
--   -- 3) colunas esperadas: protocolo, emissor, data_emissao, estado, selado
-- ----------------------------------------------------------------------------
