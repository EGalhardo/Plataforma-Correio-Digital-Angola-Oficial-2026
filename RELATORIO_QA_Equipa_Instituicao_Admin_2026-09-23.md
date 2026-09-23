# Relatório QA — Equipa (Instituição + Administração)

**Data:** 2026-09-23 · **Duração do teste final:** 74,3 s · **Resultado geral: 100% VERDE (18/18 verificações)**

Testado com **contas reais de produção** (portal institucional + área de Administração), contra o servidor dev local ligado à **mesma base de dados central Supabase** usada pelo site em produção. Todas as escritas foram **reversíveis e verificadas na UI e na base de dados**. As credenciais são fornecidas ao teste por variáveis de ambiente (`QA_INST`, `QA_INST_PASS`, `QA_ADMIN`, `QA_ADMIN_PASS`, `QA_TEST_PASS` — ver `scripts/e2e_equipa_instituicao_admin.mjs`) e **nunca ficam em ficheiros do repositório**.

---

## 1. Resumo executivo

| Fase | Âmbito | Verificações | Resultado |
|---|---|---|---|
| **E1** | Equipa da Instituição | 9 | ✅ 9/9 |
| **E2** | Equipa da Administração | 9 | ✅ 9/9 |

Ambos os ciclos completos — **abrir página → listar membros reais → adicionar membro de teste (aparece na UI e na base central) → eliminar (some da UI, da base central e do Auth)** — passaram limpos nas duas áreas.

## 2. Anomalia encontrada na 1.ª volta (configuração de desenvolvimento, não do produto)

**Sintoma:** a página Equipa da instituição mostrava «Ainda não existem membros na equipa», apesar de a base central ter um membro real activo.

**Investigação (com evidência):**
1. Endpoint `/api/equipa-membro` testado directamente com o token real da instituição → **200 OK** com o membro → o servidor estava correcto.
2. Sonda no browser (login real): a página aberta **1.ª e 2.ª vez** mostrava sempre lista vazia e **nenhum pedido de rede** saía do componente → excluída corrida de sessão/dados.
3. **Causa-raiz:** o `.env.local` **de desenvolvimento** tinha `VITE_ENABLE_MOCK_FALLBACK=true`; a guarda em `refrescarMembrosCloudInst` (`GovContactsContent.tsx`) abortava a leitura da nuvem nesse modo. Em produção a variável não existe e o padrão do código é **false** (`config/runtime.ts`) — o site público carrega a equipa correctamente.
4. **Correcção:** `VITE_ENABLE_MOCK_FALLBACK=false` no `.env.local` local (ficheiro ignorado pelo git) e reinício do dev server.

**Após a correcção:** a lista real apareceu de imediato na 1.ª abertura e os ciclos seguintes passaram a 100%.

## 3. E1 — Equipa da Instituição (sessão real de portal institucional)

| # | Verificação | Resultado |
|---|---|---|
| 1 | Login institucional rápido | ✅ |
| 2 | Página Equipa abriu; membro real nº **-02** visível com nome, cargo, telefone e Nº de credencial | ✅ |
| 3 | Lista coincide com a base central (`profiles.role='instituicao'`) | ✅ |
| 4 | Modal «REGISTAR NOVO MEMBRO DA EQUIPA» abriu via «Adicionar à Equipa» | ✅ |
| 5 | Registo do operador de teste → atribuído nº **-03** (numeração com leitura da base central e protecção anti-colisão antes da gravação) | ✅ |
| 6 | Novo operador aparece na tabela (UI) e na base central (PostgREST) | ✅ |
| 7 | Eliminação: botão «Eliminar» da linha → modal «Eliminar Definitivamente» → confirmar | ✅ |
| 8 | Operador desapareceu da tabela (UI) | ✅ |
| 9 | `profiles` sem o perfil; conta **Auth** também removida pelo servidor | ✅ |

## 4. E2 — Equipa da Administração (sessão real do Admin Alfa ADMIN-0001)

| # | Verificação | Resultado |
|---|---|---|
| 1 | Login admin | ✅ |
| 2 | Página Equipa abriu com a lista real | ✅ |
| 3 | **Admin Alfa ADMIN-0001** presente | ✅ |
| 4 | Membro real **ADMIN-0003** presente — ⚠️ **não foi tocado** (é um agente real da plataforma, não dado de teste) | ✅ |
| 5 | Modal de registo abriu | ✅ |
| 6 | Agente de teste criado → **ADMIN-0002**; visível na UI e em `profiles.role='admin'` | ✅ |
| 7 | Eliminação via linha («Eliminar») + confirmação «Eliminar Definitivamente» | ✅ |
| 8 | Agente desapareceu da lista (UI) | ✅ |
| 9 | Base central limpa (profiles e Auth) | ✅ |

### Observação positiva: anti-colisão de numeração
Numa volta anterior, ao criar um admin enquanto o nº local sugeria já estava ocupado na base central, o sistema **avançou automaticamente para o próximo livre** e registou sem sobrescrever ninguém (v37.78.6). A numeração resiliente funciona como projectado.

## 5. Limpeza e estado final da base central

Verificação final por service-role após o último run:

```
profiles (instituição + admin): apenas os 3 membros reais pré-existentes
auth.users:                     zero contas de teste
perfis QA:                      zero
```

**A base de dados ficou exactamente como antes dos testes** — nenhum membro real foi alterado ou removido.

## 6. Evidências e regressão

- Driver E2E reutilizável (env-driven, sem credenciais): `scripts/e2e_equipa_instituicao_admin.mjs`
  - `node --env-file=.env --env-file=.env.local scripts/e2e_equipa_instituicao_admin.mjs`
- Evidências brutas (logs, dumps DOM, capturas de ecrã e traço de rede real de `/api/equipa-membro`): recolhidas no ambiente de QA local do agente.

## 7. Recomendações

1. **Vercel/produção:** confirmar que `VITE_ENABLE_MOCK_FALLBACK` **não** está definida nas variáveis de ambiente do deploy (o padrão do código já é seguro, `false`).
2. `.env.local` é apenas local e contém segredos — **nunca commitar** (o `.gitignore` já cobre).
3. Executar `scripts/e2e_equipa_instituicao_admin.mjs` como regressão sempre que a página Equipa ou o endpoint `/api/equipa-membro` forem alterados.
