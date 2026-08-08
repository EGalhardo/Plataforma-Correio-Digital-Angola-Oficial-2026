-- ============================================================================
-- v26 (2026-08-08) — PAGAMENTOS: camada frontend + registo (SEM gateway)
-- ----------------------------------------------------------------------------
-- Decisão do dono: o frontend de pagamentos entra JÁ; o backend/gateway
-- (EMIS/Multicaixa/bancos) só será implementado depois da validação do
-- projecto pelo INAPEM. Consequência de desenho:
--   §1) a tabela guarda APENAS cobranças informativas (quem cobra, a quem,
--       quanto, porquê, até quando e que métodos a instituição PREVÊ aceitar);
--   §2) NÃO existe estado 'pago' — sem gateway ninguém pode marcar pagamento;
--       estados possíveis: 'pendente' | 'cancelada'. Nenhuma simulação.
--   §3) RLS na convenção provada v14/v19/v25:
--         - cidadão LÊ as cobranças no PRÓPRIO BI (claim app_metadata.bi);
--         - instituição LÊ/CRIA/ATUALIZA apenas na PRÓPRIA sigla
--           (claim app_metadata.instituicao, comparação case-insensitive);
--         - admin global (app_metadata.role = 'admin') lê e gere tudo;
--   §4) SEM política DELETE — cobrança errada CANCELA-SE (fica o rasto);
--   §5) checks de qualidade: valor > 0 e com teto; descrição 8..300;
--       métodos limitados aos 4 canais angolanos previstos; BI mínimo;
--   §6) trigger de updated_at (idempotente).
--
-- EXECUÇÃO: SQL Editor → colar TUDO → Run. Esperado: Success.
-- ROLLBACK: última secção (comentada).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- §1) TABELA
-- ----------------------------------------------------------------------------
create table if not exists public.pagamentos (
  id                uuid primary key default gen_random_uuid(),
  instituicao_sigla text not null check (char_length(btrim(instituicao_sigla)) between 2 and 40),
  destinatario_bi   text not null check (char_length(btrim(destinatario_bi)) >= 5),
  descricao         text not null check (char_length(btrim(descricao)) between 8 and 300),
  valor             numeric(12,2) not null check (valor > 0 and valor <= 99999999.99),
  metodos           text[] not null check (
                      array_length(metodos, 1) >= 1
                      and metodos <@ array['multicaixa_express','referencia_atm','tpa','transferencia']::text[]
                    ),
  referencia        text check (referencia is null or char_length(referencia) <= 80),
  documento_ref     text check (documento_ref is null or char_length(documento_ref) <= 300),
  prazo             date,
  estado            text not null default 'pendente' check (estado in ('pendente','cancelado')),
  autor             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists pagamentos_destinatario_idx
  on public.pagamentos (destinatario_bi);
create index if not exists pagamentos_instituicao_idx
  on public.pagamentos (instituicao_sigla);

-- ----------------------------------------------------------------------------
-- §2) RLS
-- ----------------------------------------------------------------------------
alter table public.pagamentos enable row level security;

-- leitura: o cidadão vê as suas; a instituição vê as que ela própria emitiu;
-- admin vê tudo.
drop policy if exists "pag_select_dono_ou_emissor_ou_admin" on public.pagamentos;
create policy "pag_select_dono_ou_emissor_ou_admin"
  on public.pagamentos for select
  using (
    upper(destinatario_bi) = upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'bi',''))
    or upper(instituicao_sigla) = upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'instituicao',''))
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- escrita: instituição APENAS na própria sigla (ou admin). O cidadão NUNCA
-- cria cobranças — defesa contra auto-cobranças falsas.
drop policy if exists "pag_insert_emissor_ou_admin" on public.pagamentos;
create policy "pag_insert_emissor_ou_admin"
  on public.pagamentos for insert
  with check (
    upper(instituicao_sigla) = upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'instituicao',''))
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- atualização (cancelar): instituição na própria sigla (ou admin)
drop policy if exists "pag_update_emissor_ou_admin" on public.pagamentos;
create policy "pag_update_emissor_ou_admin"
  on public.pagamentos for update
  using (
    upper(instituicao_sigla) = upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'instituicao',''))
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    upper(instituicao_sigla) = upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'instituicao',''))
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- SEM política DELETE de propósito (§4 do cabeçalho): anon e titulares não
-- apagam cobranças — cancelam-nas, ficando o rasto auditável.

-- ----------------------------------------------------------------------------
-- §3) trigger updated_at (idempotente)
-- ----------------------------------------------------------------------------
create or replace function public.pagamentos_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$;

drop trigger if exists pagamentos_touch on public.pagamentos;
create trigger pagamentos_touch
  before update on public.pagamentos
  for each row execute function public.pagamentos_touch_updated_at();

-- ----------------------------------------------------------------------------
-- VERIFICAÇÃO (corre à mão depois do Run):
--   select tablename, policyname from pg_policies where tablename = 'pagamentos';
--   → 3 políticas listadas (select/insert/update) e NENHUMA delete;
--   anónimo NÃO escreve nem lê nada:
--   select count(*) from public.pagamentos;  -- (anon) tem de dar 0
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- ROLLBACK (última secção — executar só para reverter TUDO):
--   drop trigger if exists pagamentos_touch on public.pagamentos;
--   drop function if exists public.pagamentos_touch_updated_at();
--   drop table if exists public.pagamentos;
-- ----------------------------------------------------------------------------
