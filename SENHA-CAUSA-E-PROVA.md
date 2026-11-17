# Mudança de palavra-passe — causa e prova

**Pedido do dono:** «Na área do cidadão no popup *Configuração de Segurança — Identidade Digital de
Angola* não é possível mudar a senha. Na área da instituição no popup *Segurança de Agente do
Estado — Portal de Serviços da Instituição* não é possível mudar a senha. Analisa, corrige e testa
de modo que seja possível mudar a senha.»

**Estado:** corrigido e provado com as contas reais, em produção.

---

## A causa

O servidor recusava a operação e a aplicação escondia o motivo.

```
PUT /auth/v1/user
→ 400 {"code":"current_password_required",
       "message":"Current password required when setting new password."}
```

O projecto Supabase tem **«Secure password change»** activo, pelo que `auth.updateUser({ password })`
só é aceite acompanhado da **palavra-passe actual**. O formulário dos dois popups já recolhia esse
valor (campo «Palavra-passe actual») — mas o código **nunca o enviava**:

```ts
// antes (cloudAuthService.ts)
const { error } = await client.auth.updateUser({ password: newPassword });
```

E o erro devolvido caía no ramo genérico:

```ts
return { outcome: 'error', message: error.message };   // → «Serviço temporariamente indisponível»
```

Daí o sintoma exacto: preencher tudo, carregar em «Actualizar Palavra-passe» e receber sempre
*«Serviço temporariamente indisponível. A sua senha actual mantém-se válida»* — nos dois popups,
em qualquer conta. A senha nunca mudava.

---

## A correcção

1. **`src/services/cloudAuthService.ts`**
   - `cloudChangePassword(client, newPassword, currentPassword?)` passa a enviar
     `current_password` no `updateUser` (suportado pelo `supabase-js` ≥ 2.100; o projecto usa 2.109).
   - Novo resultado `'current_password'` para `current_password_required`, `invalid_password`,
     «current password», «invalid credentials» e «incorrect» — deixa de haver mensagem enganosa.
2. **`src/components/features/ProfileContent.tsx`**
   - passa a `cloudChangePassword(supabase, newPassword, currentPassword)`.
   - mensagem clara: *«A palavra-passe actual está incorrecta. Confirme-a e tente novamente.»*
   - campos e estados identificáveis (`data-testid="campo-senha-actual"`, `campo-senha-nova`,
     `campo-senha-confirmar`, `botao-actualizar-senha`, `senha-erro`, `senha-sucesso`) e
     `autoComplete` correcto nos três campos.

Encerrar as outras sessões (`signOut({ scope: 'others' })`) mantém-se, best-effort: a senha antiga
deixa de reabrir sessões noutros dispositivos e a sessão actual permanece activa.

---

## A prova (`scripts/provar_mudanca_senha_playwright.cjs`)

Para **cada** área (Cidadão e Instituição), pela UI real:

1. senha actual **errada** → erro claro de senha actual (e já não «indisponível»);
2. nova senha com 3 caracteres → recusada;
3. alteração **válida** → «Palavra-passe actualizada…»;
4. **sair e entrar com a NOVA senha** → entra;
5. a senha **antiga já não entra** → recusada;
6. **repor a senha original pela mesma UI** e confirmar que a conta volta a entrar.

```
═══ CIDADÃO — popup de segurança ═══
   ✓ o popup abre (Configuração de Segurança)
   ✓ formulário de palavra-passe presente
   ✓ senha actual errada → «A palavra-passe actual está incorrecta»
   ✓ já não aparece «Serviço temporariamente indisponível»
   ✓ nova senha fraca é recusada
   ✓ alteração válida → sucesso
   ✓ entra com a NOVA palavra-passe
   ✓ a palavra-passe ANTIGA já não entra
   ✓ senha original reposta pela UI
   ✓ conta reposta — entra com a senha original

═══ INSTITUIÇÃO — popup de segurança ═══
   ✓ (as mesmas 10 verificações, todas aprovadas)

RESULTADO: APROVADO
```

Duas execuções consecutivas APROVADAS (20 verificações por execução, 0 falhas).

**Estado das contas reais no fim:** `002399714LA030` / `123456789`, `AGT-LMM-01` / `123456789`,
`ADMIN-0001` / `987654321` (a conta de Administração nunca foi tocada) — todas confirmadas por
início de sessão real.

---

## Verificações de comportamento

- Sem sessão de nuvem → mantém a mensagem «Sessão segura inactiva…» (não regride).
- Contas de demonstração → continuam isentas (nenhuma chamada à nuvem).
- Senha nova igual à actual / < 8 caracteres → recusada antes de chegar ao servidor.
- O erro de senha actual errada vem agora do servidor com resposta própria, não do genérico.
