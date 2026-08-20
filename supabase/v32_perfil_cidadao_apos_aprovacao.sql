-- CDA v32 — Perfil canónico após aprovação de cidadão
-- Corrige o caso em que solicitacoes_registo está Aprovado, mas profiles não
-- possui o BI; sem profile, a área institucional considera o cidadão ausente.

-- 1. Repara registos aprovados já existentes que ainda não possuem perfil.
insert into public.profiles (bi, name, role)
select s.bi_numero, s.nome, 'user'
from public.solicitacoes_registo s
where lower(coalesce(s.status, '')) in ('aprovado', 'aprovada', 'ativo', 'ativa', 'active', 'approved')
  and s.bi_numero ~ '^[0-9]{6,}[A-Za-z]{2}[0-9]+$'
on conflict (bi) do update
set name = excluded.name,
    role = 'user';

-- 2. Mantém o profile sincronizado para novas aprovações administrativas.
create or replace function public.cda_criar_perfil_cidadao_aprovado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(new.status, '')) in ('aprovado', 'aprovada', 'ativo', 'ativa', 'active', 'approved')
     and new.bi_numero ~ '^[0-9]{6,}[A-Za-z]{2}[0-9]+$' then
    insert into public.profiles (bi, name, role)
    values (new.bi_numero, new.nome, 'user')
    on conflict (bi) do update set name = excluded.name, role = 'user';
  end if;
  return new;
end;
$$;

drop trigger if exists cda_perfil_cidadao_apos_aprovacao on public.solicitacoes_registo;
create trigger cda_perfil_cidadao_apos_aprovacao
after insert or update of status, nome on public.solicitacoes_registo
for each row execute function public.cda_criar_perfil_cidadao_aprovado();

-- Verificação:
-- select bi, name, role from public.profiles where bi = '002399714LA030';
