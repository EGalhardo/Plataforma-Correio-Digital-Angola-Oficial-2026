# REGRAS DE UX — PROCESSAMENTO EM SEGUNDO PLANO E FEEDBACK IMEDIATO
### Correio Digital Angola · Padrão geral da plataforma

> **Regra principal:** o utilizador nunca deve ficar bloqueado numa página à espera
> de um processo demorado (validação de dados, análise por IA, aprovação de
> registos, processamento de documentos, difusões). Sempre que tecnicamente
> possível: confirma-se a acção de imediato, o processamento continua em segundo
> plano e o resultado chega por notificação dentro da aplicação.

---

## 1. Padrão obrigatório (os 6 passos)

Sempre que uma operação puder demorar mais do que alguns segundos, o sistema deve:

1. **Confirmar imediatamente a acção** → «Pedido recebido com sucesso.»
2. **Informar que está a processar** → «O sistema está a analisar os dados.»
3. **Não bloquear a navegação** → o utilizador continua a usar o app normalmente.
4. **Processar em segundo plano** → IA, validações, verificações, envios, difusões.
5. **Notificar quando houver resultado** → Aprovado / Rejeitado / Concluído / Erro / Acção necessária.
6. **Permitir consultar depois** → pelo sino de notificações, pelo menu «Mensagens não
   lidas» na foto de perfil, pelo Centro de Actividade ou pela página correspondente.

**Distinção obrigatória entre «pedido recebido» e «processamento concluído»** —
a interface confirma a recepção; o estado de processamento evolui separadamente
e é comunicado.

---

## 2. Exemplo base — Registo de Cidadão (RegisterStepper)

Depois de o cidadão preencher os 3 passos e tocar em **«VALIDAR COM IA E CONCLUIR»**:

- O sistema guarda os dados e submete a validação **em segundo plano**;
- Apresenta **de imediato** o popup de confirmação (padrão visual da plataforma —
  faixa escura `#111A2E`, ícone em chip):

```
┌──────────────────────────────────────────────────┐
│  REGISTO CONCLUÍDO                               │
│  Processo de Adesão · SME                        │
├──────────────────────────────────────────────────┤
│  O seu registo foi recebido com sucesso e está   │
│  a ser analisado pelo sistema.                   │
│                                                  │
│  As suas credenciais de acesso:                  │
│  ┌────────────────────────────────────────────┐  │
│  │ Nº DE ACESSO (UTILIZADOR)                  │  │
│  │ 002399714LA030                             │  │
│  │ SENHA INICIAL                              │  │
│  │ (a senha que definiu no passo 1)           │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Pode entrar na aplicação enquanto a análise é   │
│  concluída. O sistema irá notificá-lo assim que  │
│  o resultado estiver disponível.                 │
│                                                  │
│                                     [ OK ]       │
└──────────────────────────────────────────────────┘
```

- Ao tocar em **OK** o popup fecha e o cidadão pode fazer **login imediatamente**
  com o nº de acesso (o seu BI) e a senha definida — sem esperar pela análise;
- A conta nasce com estado próprio de homologação (a plataforma já distingue
  «pendente» de «activa»); enquanto pendente, o cidadão entra e vê o estado honesto
  do seu processo, nunca um bloqueio cego;
- A análise/validação (pré-verificação IA + homologação) continua em segundo plano.

**Quando a análise termina → notificação dentro da aplicação:**

Aprovado:
> ✅ **Registo aprovado**
> O seu registo foi analisado e aprovado. Já pode utilizar todos os serviços
> disponíveis. **[Ver detalhes]**

Não aprovado (correcções necessárias):
> ⚠️ **Registo com correcções necessárias**
> A análise do seu registo foi concluída, mas foram identificados dados que
> precisam de correcção. **[Ver detalhes] · [Corrigir dados]**

---

## 3. Aplicação a TODOS os fluxos da plataforma

### 3.1 Registo / contas
| Fluxo | Estados |
|---|---|
| Registo de cidadão (IA/homologação) | Recebido → Em análise → Aprovado / Correcções necessárias |
| Registo de instituição | Submetido → Em homologação → Aprovado / Rejeitado |
| Convite/criação de membro de equipa (Equipa) | Criado → Em activação → Activo |

### 3.2 Correspondências (Correio · cidadão e instituição)
| Fluxo | Estados (por utilizador, independentes — regras R1–R6) |
|---|---|
| Envio de correspondência | **Remetente:** Enviada (sempre) · **Destinatário:** Não Lida → Lida |
| Envio múltiplo / difusão «TODOS» (sondagens, emergência) | Expedida → A distribuir → Distribuída (N destinatários) |
| Resposta com anexos | Enviada → Entregue → Visualizada |

O comprovativo de protocolo continua a aparecer **de imediato** após o envio; a
sincronização na nuvem (mensagens, notificações, histórico) acontece em segundo
plano e nunca segura o utilizador.

### 3.3 Documentos e tramitações
| Fluxo | Estados |
|---|---|
| Envio de documento / tramitação | Enviado → Em processamento → Validado / Rejeitado |
| Análise de documento pela IA | Recebido → A analisar → Concluída (resultado no detalhe) |

### 3.4 Pedidos e serviços
| Fluxo | Estados |
|---|---|
| Pedido a instituição (user_requests) | Submetido → Em processamento → Concluído / Falhou |
| Solicitação de documento | Submetido → Em processamento → Emitido / Rejeitado |

### 3.5 Outras operações longas
- Upload de anexos grandes e envio de fotos de perfil → progresso visível, app utilizável;
- Validação QR / verificação de protocolo → resposta imediata de «em verificação», resultado por notificação;
- Cópias de segurança e sincronizações → sempre em segundo plano, com aviso discreto no histórico de auditoria.

---

## 4. Regras de implementação

1. **Nunca segurar o fluxo por escritas na nuvem** — confirmação local imediata;
   sincronização/escritas depois (padrão já usado no envio: comprovativo primeiro,
   `Promise.allSettled` em segundo plano).
2. **Estados honestos e independentes por utilizador** — o remetente vê «Enviada»,
   o destinatário vê o SEU estado de leitura; nenhuma acção de um muda o estado do outro.
3. **Notificação in-app obrigatória no fim** de cada processamento (tabela
   `notifications` → sino + badge na foto de perfil), com **acções directas**
   quando aplicável ([Ver detalhes] · [Corrigir dados]).
4. **Resultado sempre consultável depois** — notificações, Centro de Actividade,
   histórico de auditoria ou a página do serviço.
5. **Popups no padrão visual único** da plataforma (CdaModal — faixa `#111A2E`,
   título branco uppercase, subtítulo cinza) e textos em português.
6. **Erros em segundo plano também notificam** — «Falhou: [motivo curto]» com
   acção de repetir quando possível; nunca falhar em silêncio.
7. **Auditoria** — cada transição de estado (Recebido/Em análise/Concluído) fica
   registada no histórico (auditoria/estados da correspondência).

---

## 5. Checklist de aceitação (para qualquer fluxo novo)

- [x] Confirmação imediata após a acção (< 1 segundo, sem bloqueio);
- [x] Utilizador consegue navegar/logout/login durante o processamento;
- [x] Estados claramente separados: recebido ≠ em processamento ≠ concluído;
- [x] Notificação in-app no fim, com acções quando aplicável;
- [x] Resultado consultável posteriormente (notificações/centro/página);
- [x] Popup no padrão visual da plataforma, em português;
- [x] Falhas notificadas com motivo e opção de repetir;
- [x] Estados independentes por utilizador (remetente vs destinatário).

> **Estado (v37.78.17/18 · 2026-08-30)** — implementado no fluxo base (Registo de Cidadão + Adesão de Instituição + criação de membros da Equipa) com o novo
> `src/services/registoBgService.ts`. Verificação: `scripts/e2e_regra_ux_registo.mjs`
> (T1-T9) — TODOS PASS local e em produção, incluindo: popup 530ms–1,8s com
> Nº de Acesso + senha; login imediato com conta pendente; correspondência
> oficial de recepção; desfecho notificado (✅ aprovado / ⚠️ correcções /
> pendente de homologação — F28); dup-check síncrono (B.I./e-mail) ANTES do
> popup; RETOMA automática do processamento após fecho/reload da página
> (job persistido) e repetição automática em falha de rede do insert.
> Adesão de instituição: ecrã de conclusão imediato com Código Institucional +
> Nº Agente, entrega à fila em 2.º plano com chip vivo (A entregar → Entregue /
> Falhou + [Tentar novamente]) e proxy ANÓNIMO (v37.78.18-fix: com sessão de
> cidadão aberta, o servidor «carimbava» o bi_numero da adesão com o B.I. da
> sessão — fila corrompida). Equipa: membro nasce local no acto (estado
> «Em activação» visível na lista), modal fecha imediatamente, provisionamento
> + ficha central em 2.º plano → estado «Activo» + notificação; falha notificada
> com motivo e [Tentar novamente] (reactivarMembroCloudBg).
> O Correio/Documentos/Difusões/Pedidos já seguem o padrão (comprovativo
> imediato + `Promise.allSettled`/fire-and-forget), com estados independentes
> por utilizador (R1–R6); a validação QR é local e instantânea.

> **Regra de UX da plataforma:** o utilizador nunca fica preso numa página porque
> o sistema está a processar. Confirma-se, liberta-se, processa-se e notifica-se.
