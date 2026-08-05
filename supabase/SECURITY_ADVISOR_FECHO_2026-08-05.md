# Security Advisor — Estado Final e Exceções Aceites

Data de fecho: 2026-08-05
Projeto: `klrclczcahfycfdxzdqs` (plano Free)

## Evolução

| Fase | ERROR | WARN |
|---|---|---|
| Início da auditoria | 0 | 21 |
| Após `v23_security_advisor.sql` | 0 | ~10 |
| Após `v24_security_advisor_inserts.sql` | 0 | 8 |
| **Estado final (refresh confirmado pelo dono)** | **0** | **8** |

## Correções aplicadas (todas verificadas ao vivo via REST/RPC)

| Aviso resolvido | Correção |
|---|---|
| `function_search_path_mutable` (set_video_session_updated_at) | v23 — `SET search_path = ''` |
| `rls_policy_always_true` audit_logs | v24 — WITH CHECK real (limites de tamanho alinhados ao schema) |
| `rls_policy_always_true` solicitacoes_registo | v24 — WITH CHECK real (mesmas regras do trigger guard) |
| `public_bucket_allows_listing` fotos_perfil | v23 — policy de listagem removida (app só lê por URL direta) |
| Policies sempre-true video_session_participants | v23 — removida (sem consumidores no código) |
| Definer `cda_policy_check*` executáveis | v23 — EXECUTE revogado |
| Definer de trigger executáveis diretamente | v23 — EXECUTE revogado (triggers não dependem de EXECUTE — provado por sonda com insert rejeitado) |

## Os 8 WARN restantes — todos aceites e documentados

### 7× Exceções intencionais de desenho (lint 0028/0029)

O lint acende para QUALQUER função `SECURITY DEFINER` executável; não distingue contexto.
Eliminar estes avisos exigiria redesenhar o login — reduziria a segurança, não aumentaria.

| # | Função | Papel que a executa | Justificação |
|---|---|---|---|
| 1 | `cda_prelogin_cidadao` | anon + authenticated | É o login do cidadão — tem de ser chamável sem sessão |
| 2 | `cda_prelogin_instituicao` | anon + authenticated | É o login da instituição — idem |
| 3 | `cda_cidadao_lookup_bi` | authenticated | Funcionalidade real da app (v20) |
| 4 | `cda_rede_emergencia_bi` | authenticated | Funcionalidade real da app (v20) |
| 5 | `cda_instituicao_existe` | authenticated | Gate P0-B do compositor (v22) |

Mitigações ativas em todas: correspondência exata (sem listagem/wildcards), retorno mínimo
de colunas, resposta booleana no `cda_instituicao_existe`, `search_path` fixo, e EXECUTE
revogado para anon nas 3 últimas (sonda 2026-08-05: anon → 401/42501; prelogin → 200 OK).

Nota: os lints 0028 e 0029 geram 7 linhas no relatório (2 funções × 2 papéis + 3 funções).

### 1× Limitação de plano: `auth_leaked_password_protection`

- Funcionalidade "Prevent use of leaked passwords" (HaveIBeenPwned) é **exclusiva do plano Pro**.
- Evidência (2026-08-05): ao ativar e gravar, o servidor responde:
  `Failed to update auth configuration: Configuring leaked password protection via HaveIBeenPwned.org is available on Pro Plans and up.`
- Risco residual real: **baixo** — cidadãos e instituições autenticam por fluxos pré-login
  (BI / código institucional), sem password; passwords existem apenas em contas admin/staff.
- Mitigação gratuita recomendada (Authentication → Sign In/Providers → Email):
  - Minimum password length ≥ 8
  - Secure password change: ON
  - Require current password when updating: ON
- Se um dia houver upgrade para Pro: basta ativar o toggle e o 8.º aviso desaparece.

## Conclusão

ERROR 0. WARN 8, com 0 (zero) itens acionáveis pendentes do lado do código/base de dados.
Capítulo Security Advisor fechado; revisitar apenas em caso de upgrade de plano ou
redesenho do sistema de login.
