-- Correio Digital Angola — Verificação do estado de aprovação da INAPEM
-- Execute no Supabase SQL Editor. Esta consulta é somente de leitura.
-- Mostra todos os registos institucionais cujo código ou nome contém INAPEM.

select
  id,
  bi_numero as codigo_institucional,
  nome as instituicao,
  status,
  criado_em,
  case
    when lower(coalesce(status, '')) in ('aprovado', 'aprovada', 'ativo', 'ativa', 'active', 'approved') then 'APROVADA — Online deve ficar verde'
    when lower(coalesce(status, '')) in ('bloqueado', 'bloqueada', 'blocked') then 'BLOQUEADA — Online deve ficar amarelo'
    when lower(coalesce(status, '')) in ('rejeitado', 'rejeitada', 'reprovado', 'reprovada', 'rejected') then 'REJEITADA — Online deve ficar vermelho'
    else 'PENDENTE/EM CORREÇÃO — Online deve ficar vermelho'
  end as diagnostico_online
from public.solicitacoes_registo
where upper(coalesce(bi_numero, '')) like 'INAPEM%'
   or upper(coalesce(nome, '')) like '%INAPEM%'
order by criado_em desc;

-- Consulta rápida para um código específico, caso seja conhecido:
-- select bi_numero, nome, status
-- from public.solicitacoes_registo
-- where upper(bi_numero) = 'INAPEM-LLMM';
