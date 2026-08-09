-- ============================================================================
-- v29 (2026-08-09) — ITEM 5 / Pagamentos: fluxo completo de SIMULAÇÃO (frontend)
-- ----------------------------------------------------------------------------
-- Aprovado pelo dono ("5. paginas de pagamentos apenas frontend com todos os
-- fluxos."). A decisão v26 (nenhuma simulação) é SUPERADA POR ESTA — mas o
-- espírito anti-fraude mantém-se e é REFORÇADO:
--
--   * O gateway REAL continua por existir (selo INAPEM permanece na UI).
--   * O estado NUNCA é 'pago' puro: é 'paga_simulada' — qualquer leitor da
--     base de dados percebe de imediato que nenhum valor foi cobrado.
--   * A simulação regista-se na MESMA tabela real (histórico consistente
--     entre dispositivos), com transições vigiadas por trigger.
--
--   §1) alarga o check de estado p/ 'paga_simulada' + colunas pago_em e
--       metodo_simulado;
--   §2) trigger de integridade: estado final não volta atrás; a transição
--       para 'paga_simulada' NÃO pode alterar valor/descrição/BI/sigla
--       (defesa contra "simular pago" com valor adulterado via API);
--   §3) policy de update para o CIDADÃO: só a SUA cobrança, só de
--       'pendente' para 'paga_simulada' (cancelar continua exclusivo da
--       instituição emissora/admin — policy v26 intacta);
--   §4) VERIFICAÇÃO (corre à mão depois do Run);
--   §5) ROLLBACK (executar só para reverter TUDO).
--
-- PRÉ-REQUISITO: v26 aplicada (tabela public.pagamentos + policies base).
-- EXECUÇÃO: Supabase → SQL Editor → colar TUDO → Run (como v25..v28).
-- O frontend falha ABERTO enquanto isto não for aplicado: o update é
-- recusado pela constraint antiga/RLS e a UI diz que a simulação ainda não
-- está activa — nunca finge um pagamento que não ficou registado.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- §1) Estado 'paga_simulada' + carimbo da simulação
-- ----------------------------------------------------------------------------
alter table public.pagamentos drop constraint if exists pagamentos_estado_check;
alter table public.pagamentos
  add constraint pagamentos_estado_check
  check (estado in ('pendente','cancelado','paga_simulada'));

alter table public.pagamentos add column if not exists pago_em timestamptz;
alter table public.pagamentos add column if not exists metodo_simulado text;

alter table public.pagamentos drop constraint if exists pagamentos_metodo_simulado_check;
alter table public.pagamentos
  add constraint pagamentos_metodo_simulado_check
  check (metodo_simulado is null or metodo_simulado in ('multicaixa_express','referencia_atm','tpa','transferencia'));

comment on column public.pagamentos.pago_em is 'v29 — carimbo da SIMULAÇÃO de pagamento (nunca uma cobrança real).';
comment on column public.pagamentos.metodo_simulado is 'v29 — método escolhido na SIMULAÇÃO (ids estáveis de v26).';

-- ----------------------------------------------------------------------------
-- §2) Trigger de integridade das transições
-- ----------------------------------------------------------------------------
create or replace function public.pagamentos_guard_transicoes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- estados finais não voltam atrás (cancelado/paga_simulada são terminais)
  if OLD.estado <> 'pendente' and NEW.estado <> OLD.estado then
    raise exception 'pag_estado_final_sem_transicao';
  end if;
  -- a simulação não pode alterar o conteúdo económico da cobrança
  if NEW.estado = 'paga_simulada' and (
       NEW.valor <> OLD.valor
    or NEW.descricao <> OLD.descricao
    or NEW.destinatario_bi <> OLD.destinatario_bi
    or NEW.instituicao_sigla <> OLD.instituicao_sigla
  ) then
    raise exception 'pag_simulacao_campos_imutaveis';
  end if;
  return NEW;
end;
$$;

drop trigger if exists pagamentos_guard on public.pagamentos;
create trigger pagamentos_guard
  before update on public.pagamentos
  for each row execute function public.pagamentos_guard_transicoes();

-- ----------------------------------------------------------------------------
-- §3) Policy do cidadão: simular pagamento SÓ da sua cobrança pendente
-- ----------------------------------------------------------------------------
drop policy if exists "pag_update_cidadao_simulacao" on public.pagamentos;
create policy "pag_update_cidadao_simulacao"
  on public.pagamentos for update
  using (
    upper(destinatario_bi) = upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'bi',''))
    and estado = 'pendente'
  )
  with check (
    upper(destinatario_bi) = upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'bi',''))
    and estado = 'paga_simulada'
  );

-- ----------------------------------------------------------------------------
-- §4) VERIFICAÇÃO (corre à mão depois do Run)
-- ----------------------------------------------------------------------------
-- select conname, pg_get_constraintdef(oid) from pg_constraint
--  where conrelid = 'public.pagamentos'::regclass and conname like 'pagamentos_%check';
--   → estado com 3 valores (pendente/cancelado/paga_simulada); metodo_simulado com 4 ids;
-- select tgname from pg_trigger where tgrelid = 'public.pagamentos'::regclass;
--   → pagamentos_touch (v26) e pagamentos_guard (v29);
-- select policyname from pg_policies where tablename = 'pagamentos';
--   → as 3 de v26 + pag_update_cidadao_simulacao (sem nenhuma delete).

-- ----------------------------------------------------------------------------
-- §5) ROLLBACK (executar só para reverter TUDO)
-- ----------------------------------------------------------------------------
-- drop policy if exists "pag_update_cidadao_simulacao" on public.pagamentos;
-- drop trigger if exists pagamentos_guard on public.pagamentos;
-- drop function if exists public.pagamentos_guard_transicoes();
-- alter table public.pagamentos drop column if exists metodo_simulado;
-- alter table public.pagamentos drop column if exists pago_em;
-- alter table public.pagamentos drop constraint if exists pagamentos_estado_check;
-- ATENÇÃO: antes de repor a constraint antiga, é preciso "des-simular" as linhas:
-- update public.pagamentos set estado = 'pendente', pago_em = null, metodo_simulado = null
--  where estado = 'paga_simulada';
-- alter table public.pagamentos add constraint pagamentos_estado_check
--   check (estado in ('pendente','cancelado'));
