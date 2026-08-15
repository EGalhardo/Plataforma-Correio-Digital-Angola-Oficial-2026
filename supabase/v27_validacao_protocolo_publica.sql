-- ============================================================================
-- v27 (2026-08-09) — QR REAL: validação PÚBLICA mínima de protocolos
-- ----------------------------------------------------------------------------
-- Pedido do dono: "Funcionalidade real do QR Code". Hoje o botão «CLIQUE PARA
-- VALIDAR» abre um modal que NÃO confirma nada na nuvem: a RLS de
-- digital_protocols (v13 B4) só deixa ler a instituição emissora e o admin —
-- nem o cidadão titular do documento nem um terceiro (empregador, tribunal,
-- balcão) consegue confirmar que o protocolo existe de facto na plataforma.
--
-- SOLUÇÃO: função SECURITY DEFINER de leitura pública que devolve APENAS o
-- mínimo necessário para verificar autenticidade — número, emissor, data de
-- emissão, estado e se o documento tem hash selado. NUNCA devolve: BI de
-- cidadão, assunto, corpo da correspondência, anexos, prioridade ou prazos.
-- A tabela digital_protocols permanece com RLS restritivo; só esta janela
-- mínima e auditável fica pública (como qualquer validador de certidão do
-- Estado: quem tem o número confirma autenticidade, e mais nada).
--
-- §1) função public.cda_validar_protocolo(text)
-- §2) grants mínimos (anon + authenticated) + comentário de auditoria
--
-- EXECUÇÃO: SQL Editor → colar TUDO → Run. Esperado: Success.
-- ROLLBACK: última secção (comentada).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- §1) FUNÇÃO
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- VERIFICAÇÃO (corre à mão depois do Run):
--   -- 1) a função existe e devolve zero linhas para lixo:
--   select * from public.cda_validar_protocolo('XXX');
--   -- 2) número real devolve 1 linha com emissor/data:
--   select * from public.cda_validar_protocolo('<PROTOCOLO-REAL>');
--   -- 3) confirma que NÃO expõe colunas sensíveis:
--   select * from public.cda_validar_protocolo('<PROTOCOLO-REAL>')
--   --   → colunas esperadas: protocolo, emissor, data_emissao, estado, selado
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- ROLLBACK (executar só para reverter TUDO):
--   revoke execute on function public.cda_validar_protocolo(text) from anon, authenticated;
--   drop function if exists public.cda_validar_protocolo(text);
-- ----------------------------------------------------------------------------
