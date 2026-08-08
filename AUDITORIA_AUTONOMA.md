# Auditoria Autónoma da Plataforma — runbook
*(2026-08-08, a pedido do dono: «criar um prompt para verificar todas as funcionalidades e testar de forma autónoma»)*

## 1. O que é e o que cobre

`scripts/auditoria_autonoma.sh` testa **tudo o que é verificável sem sessões
privilegiadas**, diretamente contra produção, em ~1 minuto:

| Bloco | Verificações (14 atualmente) |
|---|---|
| **A. Produção viva** | health da API (estado + chaves IA), página 200 com entry do bundle, chunks de pagamentos referenciados, selo honesto de gateway + 4 métodos no bundle partilhado, self-service KB no bundle institucional |
| **B. API de IA** | explicar genérico; KB INE (fonte oficial censo2024.ine.gov.ao); KB BNA (Provedor do Cliente Bancário/contactos); traduzir EN **não** é tocado pelas guardas; umbundu → embrulho honesto com o texto original (ou tradução diferenciada curta via modelo principal) |
| **C. RLS / base de dados** | tabelas v25 (`kb_fontes_instituicao`) e v26 (`pagamentos`) existem; escrita anónima **bloqueada** nas duas (401/42501) — falhar a inserção é o comportamento correto |

Resultado esperado: `AUDITORIA: 14 PASS / 0 FAIL` (código de saída 0).

## 2. O prompt para me chamar (copiar/colar a qualquer momento)

> **Executa a auditoria autónoma completa:**
> 1) corre `bash scripts/auditoria_autonoma.sh` no repo;
> 2) corre a bateria local `bash /home/user/cda_test/run_all.sh` (esperado: 80 PASS / 0 FAIL);
> 3) confirma `node node_modules/typescript/bin/tsc --noEmit` limpo (reinstala
>    node_modules se o ambiente tiver sido reposto);
> 4) reporta tudo numa tabela com PASS/FAIL e evidências, sem declarar sucesso
>    sem provas;
> 5) se algo falhar, investiga a causa e propõe a correção antes de a aplicar.

## 3. O que FICA FORA do alcance autónomo (por desenho, não por preguiça)

Estes fluxos exigem **JWT real com claims `app_metadata`** (imutáveis pelo
titular desde v14 — ninguém, nem eu, os pode forjar com a chave anónima):

- compositor/envio de correio oficial e confirmação de leitura;
- self-service KB (criar/desativar fontes como instituição);
- pagamentos: criar/cancelar cobrança como instituição e vê-la como cidadão;
- homologação de instituições, videochamada, SOS/emergência (claims `bi`).

**Como desbloquear 100% de autonomia sobre estes fluxos:** criar duas contas de
teste (uma instituição homologada + uma cidadã) e partilhar as credenciais
comigo — acrescento uma secção §D ao script que faz o circuito completo via
API oficial (login → claims → inserção → leitura → cancelamento), deixando só
o rasto auditável. Depois pode mudar as palavras-passe por precaução.

## 4. Execução manual rápida

```bash
# auditoria de produção (sem credenciais; ~1 min)
bash scripts/auditoria_autonoma.sh

# bateria local de regressão (80 suites; precisa de node_modules)
bash /home/user/cda_test/run_all.sh

# tipagem
cd <repo> && node node_modules/typescript/bin/tsc --noEmit
```

## 5. Quando correr

- Depois de cada deploy (a Vercel demora ~2 min a propagar — o script já
  pressupõe produção estabilizada; corra-o 2–3 min após o push);
- Antes de qualquer demonstração (ex.: INAPEM);
- Periodicamente (o script é idempotente e não escreve nada na base).
