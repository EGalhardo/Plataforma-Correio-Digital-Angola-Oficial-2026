# Roteiro de Demonstração ao INAPEM
**Correio Digital Angola — o canal oficial cidadão ↔ Estado com prova criptográfica**
*(preparado a 2026-08-08 · tudo o que aqui consta foi verificado em produção no mesmo dia: auditoria 26/26 + bateria local 80/80)*

---

## 0. Cenário já montado (não mexer — está pronto)

| Peça | Valor real na base de dados |
|---|---|
| Conta cidadã de demonstração | `cda.teste.cidadao.2026@gmail.com` (BI `009999999LA099`) |
| Conta institucional de demonstração | `cda.teste.instituicao.2026@gmail.com` (sigla `CDATST`) |
| **Carta oficial na caixa do cidadão** | «Oficio CDA-TESTE/2026», **Não Lida**, enviada pela CDATST |
| **Cobrança pendente ligada à carta** | Kz 12.500,50 — `documento_ref` = «Oficio CDA-TESTE/2026» (aparece na área Pagamentos E dentro da leitura da carta) |
| 3 cobranças canceladas | rasto de auditoria (provar que nada se apaga — cancela-se) |
| Palavras-passe das contas | ver `/home/user/cda_test/contas_teste.md` (fora do repo) |
| Endereço | https://correio-digital-angola-oficial.vercel.app |

## 1. Preparação (15 min antes)

- [ ] Correr a auditoria autónoma com o assistente (prompt do runbook) — esperado **26/26 PASS**
- [ ] Abrir **dois browsers** (ex.: janela normal + janela anónima):
  - Browser A: login institucional → área **Pagamentos**
  - Browser B: login cidadão → **Caixa de entrada**
- [ ] Ter o hotspot telemóvel de reserva ligado
- [ ] Ter esta folha impressa

## 2. Ato a ato (18–20 min)

### Ato 1 — Abertura (2 min)
> «Hoje um cidadão desloca-se, faz fila, e levanta papel. O Correio Digital Angola transforma cada serviço público num remetente oficial: a carta chega ao telefone do cidadão com **prova de autenticidade** — e a instituição sabe quando foi lida.»

### Ato 2 — A carta soberana (3 min, Browser B)
1. Cidadão → caixa de entrada → abrir **«Oficio CDA-TESTE/2026»**
2. Apontar: remetente oficial, **estado «Não Lida»**, protocolo e selo de integridade da plataforma
3. Frase-chave: «Cada mensagem tem protocolo único e trilha de integridade — não é um SMS que se perde, é um ofício com prova.»

### Ato 3 — A IA que explica (4 min, Browser B)
1. Na área do Assistente de Documentos, colar esta pergunta (resposta real verificada):
   > *«Tenho uma pequena empresa e quero apoio do INAPEM. Como participo nos programas e que documentos preciso?»* com remetente **INAPEM**
2. A resposta explica o **Certificado MPME**, indica **inapem.gov.ao**, e MOSTRA a fonte oficial que fundamentou (KB com 17 instituições e 39 fontes oficiais — INAPEM incluído com 3 fontes)
3. Momento honestidade (muito forte com decisores): traduzir um texto para **umbundu** — se o modelo não sabe a língua, a plataforma **diz que não sabe** em vez de inventar («Não consigo traduzir com qualidade para Umbundu…»)
4. Frase-chave: «A IA é especializada por instituição e **honesta por construção** — nunca blúfa.»

### Ato 4 — Pagamentos: o momento-chave (4 min)
1. **Browser A (instituição)** → Pagamentos → mostrar a lista: a cobrança da demo e as canceladas com rasto
2. Criar UMA cobrança nova em direto (BI `009999999LA099`, ex.: «Taxa de inscrição — demo ao vivo», Kz 1.500,00) → Registar
3. **Browser B (cidadão)** → atalho *Pagamentos* → **Atualizar** → a nova cobrança aparece «**Por pagar**» no instante
4. Abrir o detalhe: valor, referência, prazo e os 4 canais previstos — com o selo:
   > «Integração com o gateway prevista para depois da validação do projeto pelo INAPEM.»
5. **Golpe de efeito**: no cidadão, voltar à carta «Oficio CDA-TESTE/2026» — o **painel da cobrança aparece dentro da leitura do documento**, associado pelo documento de referência
6. Frase-chave: «O cidadão recebe a carta, a cobrança e a explicação da IA — no mesmo canal. O dinheiro propriamente dito entra na fase seguinte, **convosco**.»

### Ato 5 — Segurança e confiança (2 min)
- Na conta do cidadão **só** aparecem as cobranças do BI dele; na instituição, **só** as da sua sigla (RLS com claims imutáveis — provado por sondas: anon 401/42501)
- Cobranças não se apagam — **cancelam-se e ficam no rasto** (mostrar as 3 canceladas)
- Frase-chave: «Arquitetura de confiança zero: cada um vê apenas o seu.»

### Ato 6 — Fecho e pedido (2 min)
1. **Pedido 1:** validação do piloto pelo INAPEM (período sugerido: 30-60 dias com empresas reais)
2. **Pedido 2:** autorização para passar à fase do **gateway de pagamentos** (EMIS/Multicaixa/bancos) — a camada de cobrança já existe e está provada
3. **Pedido 3:** nomear uma equipa do INAPEM para alimentar a **Base de Conhecimento self-service** — a instituição passa a escrever as suas próprias respostas oficiais na IA (sem depender de nós)

## 3. Plano B (se algo falhar ao vivo)

| Sintoma | O que fazer | O que dizer |
|---|---|---|
| IA demora/erro no modelo principal | Aguardar ~25 s — há fallback automático (provado) | «Temos redundância de modelos — estão a ver a resiliência ao vivo.» |
| Tradução umbundu embrulhada | Sorrir — **é uma feature** | «Reparem: prefere dizer que não sabe do que enganar o cidadão.» |
| Internet cai | Hotspot de reserva; se mesmo assim, mostrar a auditoria 26/26 do dia | «As provas ficam registadas — corremos a auditoria pública.» |
| Pedido de funcionalidade inexistente | Anotar com orgulho | «Pagamentos com dinheiro real, dados clínicos e integrações setoriais estão desenhados para as fases seguintes — nunca vendemos vapor.» |

## 4. P&R provável

- **Dados seguros?** PostgreSQL com RLS por claims imutáveis (JWT), chaves em servidor, auditoria append-only. Anexos em storage privado.
- **Custa algo ao cidadão?** Não — canal gratuito; modelos IA com camada leve (Vercel Hobby + Supabase Free hoje; escala com SLA na fase piloto).
- **E quem não tem smartphone?** Web em qualquer browser; fase futura prevê SMS/USSD e agentes físicos.
- **As respostas da IA são oficiais?** Cada resposta cita a fonte oficial que a fundamentou e leva o aviso «confirme sempre na fonte oficial»; a instituição controla as suas fontes no self-service.
- **Privacidade?** Cada entidade só acede ao seu perímetro (provado); sem partilha cruzada; dados em trânsito cifrados.

## 5. Fronteira honesta (NÃO prometer em cena)

1. Movimento de dinheiro (gateway) — fase pós-validação
2. Dados clínicos / saúde assistencial
3. Envio externo SMS/WhatsApp/email (in-app hoje)
4. Integrações diretas com sistemas internos de cada setor
5. Línguas nacionais como tradução certificada (é experimental e honesta)

---
**Última verificação deste roteiro:** 2026-08-08 — carta, cobrança pendente, IA INAPEM (Certificado MPME) e circuito RLS confirmados em produção.