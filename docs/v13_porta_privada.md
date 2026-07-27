# Porta Privada — Especificação P2 (v13/F41)

> **Estado:** ESPECIFICAÇÃO APENAS — zero implementação nesta versão (v13).
> **Regra inviolável:** `service_role` **nunca** no cliente/bundle. Estas
> operações correm exclusivamente em backend (serverless `api/` ou `server.ts`)
> com a chave em variável de ambiente do servidor.

## 1. Porquê

A `anon key` + sessão do próprio utilizador permite (já implementado na v13):
login cloud-first, alteração da **própria** palavra-passe (F40), logout real
(F38) e sincronização do **próprio** perfil (F39).

A `anon key` **nunca** pode:
- repor a senha de **terceiros**;
- eliminar um utilizador do Supabase Auth;
- enviar e-mails de recuperação reais (requer SMTP configurado).

Esses casos exigem a `service_role`, protegida atrás de uma "porta privada"
(endpoints server-side com verificação de sessão de agente/admin).

## 2. Variáveis de ambiente (server-only)

```bash
# NUNCA expor com prefixo VITE_ — isso colocaria a chave no bundle do browser.
SUPABASE_URL=https://klrclczcahfycfdxzdqs.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...   # dashboard Supabase → Settings → API
```

Cliente server-side:

```ts
import { createClient } from '@supabase/supabase-js';
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
```

## 3. Endpoints propostos (backend já existente: `api/index.ts` / `server.ts`)

### POST /api/admin/reset-senha
- **Auth:** sessão de agente Admin válida (JWT verificado server-side com
  `supabaseAdmin.auth.getUser(jwt)` + `user_metadata.role === 'admin'`).
- **Body:** `{ targetBi: string, newPassword: string }`
- **Acção:** localizar o uid pela conta sintética do BI
  (`bi.<bi>@cidadao.correiodigital.ao`) e
  `supabaseAdmin.auth.admin.updateUserById(uid, { password: newPassword })`.
- **Audit (pré-requisito):** linha **antes** da acção em `audit_logs`
  `{ agente, alvo: targetBi, acção: 'reset-senha', ts }`.
- **Resposta:** `{ ok: true }` | `404` (conta não migrada) | `403` (não admin).

### POST /api/admin/eliminar-conta
- **Auth:** sessão de agente Admin.
- **Body:** `{ targetBi: string, justificativa: string }`
- **Acção, por ordem:**
  1. Registo de auditoria **permanente** (não apagável) com a justificativa;
  2. `supabaseAdmin.auth.admin.deleteUser(uid)`;
  3. `DELETE FROM profiles WHERE bi = targetBi`;
  4. Limpeza em cadeia: `messages` / `documents` / `notifications` /
     `document_requests` / `user_requests` do titular (órfãos — P3 detalha).
- **Resposta:** relatório da limpeza (contagens por tabela).

### POST /api/auth/recuperacao-assistida
- **Auth:** fluxo assistido — agente confirma a identidade **presencialmente**
  (ou via videoatendimento já existente) antes de submeter.
- **Acção (uma de):**
  a) token/senha temporária definida via `admin.updateUserById` e entregue ao
     cidadão — login subsequente exige troca (F40);
  b) e-mail real de recuperação — **requer SMTP configurado** no Supabase Auth
     (fora do âmbito enquanto os e-mails forem sintéticos).
- **Audit:** `recuperacao-assistida` com agente + alvo + meio de confirmação.

## 4. Defesa em profundidade (obrigatório quando implementado)

- Rate limit por agente (ex.: 10 resets/hora) + captcha em produção.
- As rotas recusam sempre que `SUPABASE_SERVICE_ROLE_KEY` estiver em falta
  (falham *fechadas*, nunca abertas).
- Nada de *bypass* de RLS no cliente: o browser continua a usar só a anon key;
  a porta privada é o único caminho privilegiado.
- Testes: cliente falso injectado (padrão já usado nas suites f31+).

## 5. Plano de retirada das credenciais locais de transição

| Fase | Marco |
|------|-------|
| 1 | Porta privada implementada e testada em staging |
| 2 | Todas as contas activas com `isCloudBound = true` (migração v12 completa) |
| 3 | Aviso de depreciação (30 dias) para `citizen_pass_*` no localStorage |
| 4 | Remoção do fallback local do fluxo de login (D3 deixa de existir) |

*Documento criado na v13 (F41). A sua implementação = próxima versão (P2).*
