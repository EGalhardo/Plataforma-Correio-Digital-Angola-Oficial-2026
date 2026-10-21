# PROMPT DE AUDITORIA E VALIDAÇÃO: BADGES DE NOTIFICAÇÃO E CORRESPONDÊNCIAS NÃO LIDAS (ÁREAS DO CIDADÃO E DA INSTITUIÇÃO)

---

## 🎯 Instrução Principal / Prompt para Execução:

```markdown
Você é o engenheiro especialista responsável pela auditoria e homologação da plataforma oficial do Correio Digital Angola (CDA).

Sua missão é realizar uma verificação rigorosa, ponta a ponta e sem quebras, de TODAS as notificações, contadores e badges de correspondências não lidas nas páginas do Painel da Área do Cidadão e da Área da Instituição.

---

### 📋 ESCOPO E PÁGINAS A AUDITAR

#### 1. Área do Cidadão:
- **Painel Principal (`#/home`):**
  - Cartões de resumo de correspondências (Enviadas, Não Lidas / Pendentes, Lidas).
  - Pílulas e marcadores de status nas listas rápidas de correspondências recentes.
- **Cabeçalho / Header Superior (`Header.tsx`):**
  - Ícone de sino de notificações e respectivo badge numérico flutuante.
  - Dropdown do centro de notificações (listagem categorizada: Alertas, Avisos, Atualizações).
- **Barra de Navegação / Sidebar:**
  - Contador na aba "Correspondências" / "Caixa de Entrada".
  - Contador na aba "Denúncias", "Ocorrências", "Inquéritos" e "Vídeo-Atendimento".
- **Páginas de Serviços:**
  - Detalhe de correspondência aberta (`status === 'lida'` com decremento em tempo real).
  - Listas de Denúncias (`nova-denuncia`) e Ocorrências (`ocorrencias`).

#### 2. Área da Instituição:
- **Painel Principal Institucional (`#/institution-home` ou `#/painel-instituicao`):**
  - Contadores de correspondências recebidas, expedidas e pendentes de resposta.
  - Tabela de correspondências recentes com badges de estado (Não Lida, Lida, Em Análise, Concluída).
- **Cabeçalho Institucional:**
  - Badge de notificações institucionais e alertas de novos pedidos de cidadãos.
- **Menu Lateral / Sidebar Institucional:**
  - Badges de itens não lidos nas abas Correspondências, Reclamações/Denúncias, Ocorrências e Equipa.
- **Caixa de Entrada Institucional:**
  - Abertura de ofícios/requerimentos e transição de estado para "Lida".

---

### ⚖️ REGRAS DE NEGÓCIO E CRITÉRIOS DE CONFORMIDADE

1. **Exatidão e Paridade de Contagem:**
   - O valor numérico exibido no badge do sino e no menu DEVE coincidir exatamente com a quantidade real de itens com `unread === true` ou `status !== 'lida'`.
   - Não podem existir "contagens fantasmas" ou números desatualizados após navegação entre páginas.

2. **Decremento e Atualização Imediata (Zero Latência):**
   - Ao clicar e abrir uma correspondência, denúncia ou notificação não lida, o status deve transitar imediatamente para "Lida" na base de dados (Supabase/local).
   - O contador do badge correspondente deve decrementar de forma atómica e instantânea, sem necessidade de recarregar a página (`F5`).

3. **Ocultação Automática no Limite Zero:**
   - Quando todos os itens forem lidos (contagem igual a 0), o badge visual deve desaparecer completamente (nunca exibir `0` ou bolhas vazias residuais).

4. **Sincronização em Tempo Real e Persistência:**
   - As alterações de estado devem persistir após recarregamento da página e refletir-se de forma consistente tanto na Área do Cidadão quanto na Área da Instituição.

5. **Acessibilidade e Contraste (Modo Claro e Modo Escuro):**
   - Os badges e contadores numéricos devem ser 100% legíveis com alto contraste em ambos os temas (`light` e `dark`), sem sobreposição de cores ou texto invisível.

---

### 🧪 METODOLOGIA DE TESTES AUTOMATIZADOS EXIGIDA

1. Criar e executar script E2E Playwright (`scripts/e2e_badges_cidadao_instituicao.mjs`) que execute:
   - Login com credenciais do Cidadão e leitura de correspondência pendente, validando o decremento imediato do badge.
   - Login com credenciais da Instituição e leitura de denúncia/ofício, validando a atualização do badge institucional.
   - Validação da ocultação do badge ao zerar os itens não lidos.
   - Teste no Modo Claro e no Modo Escuro com captura de screenshots de comprovação.
2. Executar compilação estática (`npm run lint` / `tsc --noEmit`) para garantir 0 erros de tipagem.
3. Gerar relatório de homologação `RELATORIO_AUDITORIA_BADGES_CIDADAO_INSTITUICAO.md`.
```
