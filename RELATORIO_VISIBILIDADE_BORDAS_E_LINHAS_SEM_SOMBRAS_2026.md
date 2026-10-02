# Relatório Técnico: Visibilidade de Bordas e Linhas Estruturais (Mesma Espessura do Modo Escuro) e Remoção de Sombras (2026)

**Data de Emissão:** 02 de Outubro de 2026  
**Ambiente:** Plataforma Oficial Correio Digital Angola (CDA)  
**Módulos Refatorados:** `Sidebar.tsx`, `App.tsx`, `Header.tsx`, `MobileNavBar.tsx`, `HomeContent.tsx`, `MailContent.tsx`, `ListaParticipacaoContent.tsx`  
**Bateria de Testes:** Playwright E2E (`scripts/e2e_visibilidade_bordas_e_linhas_sem_sombras.mjs`, `scripts/e2e_crud_7_tipos_e_sintonia_painel.mjs`, `scripts/e2e_exclusao_mutua_e_dropdown_avatar.mjs`)  
**Resultado Global:** 100% de Sucesso (65/65 asserções aprovadas, 0 erros TypeScript)

---

## 1. Sumário Executivo

Em cumprimento às diretrizes estruturais de design da plataforma, foi executada a otimização de contraste, visibilidade de limites geométricos e remoção de sombras na Área Central de Conteúdo e na Barra Lateral:

1. **Remoção Completa de Sombras (`shadow-none`)**:
   - Barra Lateral (`Sidebar.tsx`), Painel Central de Conteúdo (`App.tsx`), Cabeçalho (`Header.tsx`), Navbar Mobile (`MobileNavBar.tsx`) e cartões de conteúdo sem qualquer sombra difusa.
2. **Aumento de Visibilidade e Contraste das Bordas e Linhas**:
   - Aplicação de bordas de alta visibilidade e nitidez (`border-slate-300` / `border-slate-400` no modo claro e `dark:border-slate-700` no modo escuro).
3. **Paridade de Espessura com o Modo Escuro (`border-2`)**:
   - Todas as bordas perimetrais e linhas divisórias internas (`border-2`, `border-b-2`, `border-t-2`) possuem espessura uniforme correspondente à espessura de referência do modo escuro.

---

## 2. Detalhe das Implementações

| Ficheiro | Elemento | Alteração Realizada |
|---|---|---|
| `src/components/layout/Sidebar.tsx` | Barra Lateral `<aside>` | `border-2 border-slate-300 dark:border-slate-700 shadow-none` |
| `src/components/layout/Sidebar.tsx` | Divisor de Rodapé | `border-t-2 border-slate-300 dark:border-slate-700` |
| `src/App.tsx` | Painel Central de Conteúdo | `md:border-2 md:border-slate-300 dark:md:border-slate-700 shadow-none` |
| `src/components/layout/Header.tsx` | Mobile AppBar & Greeting Header | `border-b-2 border-slate-300 dark:border-slate-700 shadow-none` |
| `src/components/layout/Header.tsx` | Menus Dropdown (Perfil / Idioma) | `border-2 border-slate-300 dark:border-slate-700 shadow-none` |
| `src/components/layout/MobileNavBar.tsx` | Barra Inferior Mobile | `border-t-2 border-slate-300 dark:border-slate-700 shadow-none` |
| `src/components/features/HomeContent.tsx` | Cards e Containers | `border-2 border-slate-300 dark:border-slate-700 shadow-none` |
| `src/components/features/MailContent.tsx` | Filtros, Abas e Listagem | `border-2 border-slate-300 dark:border-slate-700 shadow-none` |
| `src/components/features/ListaParticipacaoContent.tsx` | Header, Abas e Lista | `border-2 border-slate-300 dark:border-slate-700 shadow-none` |

---

## 3. Matriz de Homologação E2E Playwright

| Teste | Descrição da Asserção | Resolução | Estado |
|---|---|---|---|
| **PASS 1** | Barra lateral sem sombras difusas (`shadow-none`) | Desktop (1440x900) | ✅ Aprovado |
| **PASS 2** | Barra lateral com bordas nítidas `border-2 border-slate-300` | Desktop (1440x900) | ✅ Aprovado |
| **PASS 3** | Área central sem sombras difusas (`shadow-none`) | Desktop (1440x900) | ✅ Aprovado |
| **PASS 4** | Área central com bordas nítidas `md:border-2 md:border-slate-300` | Desktop (1440x900) | ✅ Aprovado |
| **PASS 5** | Header Desktop sem sombras | Desktop (1440x900) | ✅ Aprovado |
| **PASS 6** | Divisor do Header com `border-b-2 border-slate-300` | Desktop (1440x900) | ✅ Aprovado |
| **PASS 7** | Container «Lidas» com borda nítida `border-2` | Desktop (1440x900) | ✅ Aprovado |
| **PASS 8** | Container «Lidas» sem sombras (`shadow-none`) | Desktop (1440x900) | ✅ Aprovado |
| **PASS 9** | Container «Não Lidas» com borda nítida `border-2` | Desktop (1440x900) | ✅ Aprovado |
| **PASS 10** | Container «Não Lidas» sem sombras (`shadow-none`) | Desktop (1440x900) | ✅ Aprovado |
| **PASS 11** | Tabs de Correspondência com bordas `border-2` | Desktop (1440x900) | ✅ Aprovado |
| **PASS 12** | Mobile AppBar com linha divisória nítida `border-b-2` | Mobile (390x844) | ✅ Aprovado |
| **PASS 13** | Mobile AppBar sem sombras (`shadow-none`) | Mobile (390x844) | ✅ Aprovado |
| **PASS 14** | Mobile NavBar com linha divisória nítida `border-t-2` | Mobile (390x844) | ✅ Aprovado |
| **PASS 15** | Mobile NavBar sem sombras (`shadow-none`) | Mobile (390x844) | ✅ Aprovado |

---

## 4. Conclusão

Todas as bordas e linhas da Área Central de Conteúdo e da Barra Lateral encontram-se agora com visibilidade e contraste nítidos, uniforme espessura de 2px (paritária com o modo escuro) e sem qualquer presença de sombras difusas.
