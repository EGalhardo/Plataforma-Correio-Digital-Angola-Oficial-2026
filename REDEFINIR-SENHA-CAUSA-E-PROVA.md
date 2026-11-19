# Redefinir senha — causa, correção e prova (2026-11-15)

Reportado pelo dono: **«Não é possível redefinir a senha no popup Configuração de
Segurança / Identidade Digital de Angola e na página Redefinir Senha».**

Investigado e corrigido com as contas reais em produção e Playwright.

---

## 1. O que estava errado (duas causas reais, ambas fora do ecrã)

### Causa A — o link de recuperação ia para `localhost`

Configuração do Supabase Auth do projecto `klrclczcahfycfdxzdqs`:

| Campo | Antes | Depois |
|---|---|---|
| `site_url` | `http://localhost:3000` | `https://correio-digital-angola-oficial.vercel.app` |
| `uri_allow_list` | *(vazia)* | produção + previews `*.vercel.app` + `localhost:5173/3000` |

Consequência medida (link gerado pelo próprio Supabase):

```
https://…supabase.co/auth/v1/verify?token=…&type=recovery&redirect_to=http://localhost:3000
```

Abrir esse link num browser de produção dava `ERR_CONNECTION_REFUSED` — a página
«Redefinir Senha» **nunca podia abrir**, porque o `redirectTo` enviado pela app era
descartado (não havia allowlist). O `app_metadata` mostra que o
`recovery_sent_at` era gravado, mas o link era inútil.

### Causa B — o mailer do Supabase recusa os e-mails técnicos

As contas reais não têm e-mail real: são `bi.<bi>@cidadao.correiodigital.ao`,
`agente.*@inst.correiodigital.ao` e `agente.*@admin.correiodigital.ao` — um domínio
que não tem MX (não recebe correio). O servidor Auth recusa explicitamente:

```
POST /auth/v1/recover  →  400 {"error_code":"email_address_invalid",
                                "msg":"Email address \"bi.002399714la030@cidadao.correiodigital.ao\" is invalid"}
```

(pelo contrário, `naoexiste@gmail.com` devolve 200 — o problema é o domínio, não a conta)

E o `/api/enviar-email-recuperacao` **respondia `ok:true` sem enviar nada** quando
não havia chave Resend — um falso sucesso, com o utilizador à espera de um e-mail
que nunca chegava.

---

## 2. O que foi corrigido

1. **Supabase Auth (configuração do projecto)**: Site URL de produção + allowlist de
   redireccionamentos. Isto sozinho já faz o link do e-mail abrir a página certa.
2. **`/api/enviar-email-recuperacao`** (`api/index.ts` e `server.ts`): quando o Resend
   não envia (ou não está configurado), cai no mailer do próprio Supabase Auth; a
   resposta mantém-se **neutra** (anti-enumeração) mas passa a dizer a verdade no campo
   `enviado`.
3. **Popup «Configuração de Segurança» / «Segurança de Agente do Estado»**:
   - botão **«Não sabe a palavra-passe actual? Recuperar por e-mail →»** — antes, quem
     não sabia a senha actual ficava sem qualquer saída (o servidor exige-a);
   - botão **«Sair e entrar com a nova palavra-passe»** depois do sucesso;
   - o erro de senha actual errada passa a indicar a recuperação;
   - o espelho local `citizen_pass_{BI}` passa a ser gravado com o **B.I. normalizado**
     (o login facial lia sempre a forma normalizada e podia reabrir a sessão com a senha velha).
4. **Reposição assistida pela Administração** (a via que a app prometia e não existia):
   - nova rota `POST /api/repor-senha` — **só** `ADMIN-0001`, repõe no Supabase Auth via
     service role e audita em `audit_logs`;
   - botão **«Repor senha»** em *Área de Administração → Segurança → Utilizadores*, com
     modal de senha temporária;
   - o ecrã «Recuperar Senha» indica agora este caminho.

---

## 3. Prova executada (produção, contas reais)

### `scripts/provar_redefinir_senha_playwright.cjs` → **RESULTADO: APROVADO**

Cidadão (`002399714LA030`) e Instituição (`AGT-LMM-01`), em cada área:

| Verificação | Cidadão | Instituição |
|---|---|---|
| popup abre com o formulário | ✓ | ✓ |
| existe a saída «Recuperar por e-mail» | ✓ | ✓ |
| senha actual errada → erro claro (não «indisponível») | ✓ | ✓ |
| erro indica a recuperação | ✓ | ✓ |
| nova senha fraca recusada | ✓ | ✓ |
| alteração válida → sucesso | ✓ | ✓ |
| aparece «Sair e entrar com a nova palavra-passe» | ✓ | ✓ |
| **entra com a NOVA senha** | ✓ | ✓ |
| **a senha ANTIGA já não entra** | ✓ | ✓ |
| senha reposta pela própria UI | ✓ | ✓ |

Página «Redefinir Senha»:
- «Esqueci Senha» abre a página ✓
- pedido aceite → ecrã «Verifique o seu e-mail» ✓
- o link gerado aponta para **produção** (não localhost) ✓
- o link abre `/#/recuperar-senha` com sessão de recuperação válida ✓
- **nova senha gravada na plataforma** ✓
- **entra no portal com a senha definida pela recuperação** ✓
- senha original reposta no fim ✓

### `scripts/provar_reposicao_assistida_playwright.cjs` → **RESULTADO: APROVADO**

- Admin entra e abre *Segurança → Utilizadores* ✓
- botão «Repor senha» do cidadão real presente ✓
- senha curta recusada ✓
- reposição aceite, modal fecha ✓
- **cidadão entra com a senha temporária** ✓
- **a senha antiga já não entra** ✓
- rota sem sessão recusa (HTTP 401) ✓
- senha original reposta ✓

---

## 4. Notas honestas (limites que a plataforma não resolve por código)

- **Conta só com B.I. não recebe e-mail**: o domínio técnico não tem MX e o Supabase
  recusa-o. Para essas contas a via real é a **reposição assistida** (Admin) ou o
  titular associar um e-mail entregável no Perfil → Segurança (a partir daí o
  «Esqueci Senha» funciona nesse endereço).
- **Entrega de e-mail depende do Resend**: o fallback do mailer Supabase usa o SMTP
  interno do projecto, sujeito ao limite de envios do plano.

## 5. Alterações no repositório

- `08c8fa6` — Site URL/allowlist + fallback do mailer + saídas no popup + espelho normalizado
- `c5d3944` — reposição assistida (rota + botão na consola de Segurança)
- `scripts/provar_redefinir_senha_playwright.cjs`, `scripts/provar_reposicao_assistida_playwright.cjs`
