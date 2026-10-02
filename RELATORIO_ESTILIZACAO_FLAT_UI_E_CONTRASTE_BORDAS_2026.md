# Relatório Técnico: Refatoração Estrutural Flat UI, Zero Sombras e Contraste Nítido de Bordas (2026)

**Data de Emissão:** 02 de Outubro de 2026  
**Ambiente:** Plataforma Oficial Correio Digital Angola (CDA)  
**Módulos Refatorados:** `Sidebar.tsx`, `App.tsx`, `Header.tsx`, `MobileNavBar.tsx`, `HomeContent.tsx`, `MailContent.tsx`, `ListaParticipacaoContent.tsx`  
**Bateria de Testes:** Playwright E2E (`scripts/e2e_flat_ui_estrutural_contraste_e_bordas.mjs`, `scripts/e2e_crud_7_tipos_e_sintonia_painel.mjs`, `scripts/e2e_exclusao_mutua_e_dropdown_avatar.mjs`)  
**Resultado Global:** 100% de Sucesso (65/65 asserções aprovadas, 0 erros TypeScript)

---

## 1. Sumário Executivo

Em cumprimento às diretrizes de modernização visual e acessibilidade estrutural, foi implementada a refatoração completa dos elementos estruturais da interface (Layout, Barra Lateral, Painel Central de Conteúdo e Cartões Temáticos), adotando o paradigma **Flat UI de Alto Contraste**:

1. **Eliminação de Sombras Difusas (`shadow-none`)**:
   - Remoção de classes de elevação com sombras difusas (`shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`) de todos os containers principais e cartões de conteúdo.
2. **Contraste Estrutural e Paridade Modo Claro / Escuro (`border-2`)**:
   - Uniformização das bordas estruturais com espessura de 2px (`border-2`), garantindo paridade estética entre modo claro (`border-slate-300`) e modo escuro (`dark:border-slate-700`).
   - Linhas divisórias internas de alto contraste (`border-b-2`, `border-t-2`).
3. **Preservação de Todas as Funcionalidades e Reatividade**:
   - Mantida 100% da integridade da exclusão mútua de leitura, sincronização de badges, modais de confirmação, e navegação responsiva em Desktop e Mobile (390x844).

---

## 2. Detalhe das Alterações por Ficheiro

### 2.1 `src/components/layout/Sidebar.tsx`
- Container `<aside>`: substituído `border border-slate-200/90 shadow-xs dark:border-[#141d31]` por `border-2 border-slate-300 dark:border-slate-700 shadow-none`.
- Divisor de rodapé da sidebar: `border-t-2 border-slate-300 dark:border-slate-700`.
- Botão "Sair do Canal": `shadow-none`.

### 2.2 `src/App.tsx`
- Container Central de Conteúdo (`.flex-1.md:bg-white`): substituído `md:shadow-xl md:border-2 md:border-[#E2E8F0] dark:md:border-[#141d31]` por `shadow-none md:border-2 md:border-slate-300 dark:md:border-slate-700`.

### 2.3 `src/components/layout/Header.tsx`
- Mobile AppBar: `border-b-2 border-slate-300 dark:border-slate-700 shadow-none`.
- Desktop Greeting Header: `border-b-2 border-slate-300 dark:border-slate-700 shadow-none`.
- Dropdown Menu Perfil/Notificações (`UnreadMessagesMenu`): `shadow-none border-2 border-slate-300 dark:border-slate-700`, com divisores `border-b-2` e `border-t-2`.
- Dropdown de Idiomas (`LanguageSelectorDropdown`): `shadow-none border-2 border-slate-300 dark:border-slate-700`.

### 2.4 `src/components/layout/MobileNavBar.tsx`
- Barra de navegação inferior mobile: `border-t-2 border-slate-300 dark:border-slate-700 shadow-none`.

### 2.5 `src/components/features/HomeContent.tsx`
- Hero Banner: `border-2 border-slate-300 dark:border-slate-700 shadow-none`.
- Cartões de Sumário Rápido (ID Digital e Novas Mensagens): `border-2 border-slate-300 dark:border-slate-700 shadow-none`.
- 6 Botões de Atalhos do Painel: `border-2 border-slate-300 dark:border-slate-700 shadow-none hover:border-slate-400 dark:hover:border-slate-600`.
- Secção de Instituições Conectadas: `border-2 border-slate-300 dark:border-slate-700 shadow-none`, cabeçalho `border-b-2 border-slate-300 dark:border-slate-700`.
- Containers de Correspondências (`container-lidas`, `container-nao-lidas`, `container-enviadas`, `container-eliminadas`): `border-2 border-slate-300 dark:border-slate-700 shadow-none`, itens `border-b-2 border-slate-200 dark:border-slate-700`.

### 2.6 `src/components/features/MailContent.tsx`
- Container de Filtros e Abas: `border-2 border-slate-300 dark:border-slate-700 shadow-none`.
- Abas de Leitura (`lidas`, `naoLidas`, `enviadas`, `excluidas`): `border-2 border-slate-300 dark:border-slate-700 shadow-none`.
- Campo de Busca: `border-2 border-slate-300 dark:border-slate-700 shadow-none`.
- Container da Lista de Correspondências: `border-2 border-slate-300 dark:border-slate-700 shadow-none`.
- Cards de Visualização Mobile: `border-2 border-slate-300 dark:border-slate-700 shadow-none hover:border-slate-400 dark:hover:border-slate-600`.

### 2.7 `src/components/features/ListaParticipacaoContent.tsx`
- Container da Logomarca Temática: `border-2 border-slate-300 dark:border-slate-700 shadow-none`.
- Divisor de Abas de Inquéritos: `border-b-2 border-slate-300 dark:border-slate-700`.
- Campo de Pesquisa: `border-2 border-slate-300 dark:border-slate-700 shadow-none`.
- Itens da Lista e Estado Vazio: `border-2 border-slate-300 dark:border-slate-700 shadow-none`.

---

## 3. Matriz de Homologação E2E Playwright

| Teste | Descrição da Asserção | Resolução | Estado |
|---|---|---|---|
| **PASS 1** | Sidebar sem sombras difusas (`shadow-none`) | Desktop (1440x900) | ✅ Aprovado |
| **PASS 2** | Sidebar com bordas estruturais reforçadas `border-2` | Desktop (1440x900) | ✅ Aprovado |
| **PASS 3** | Painel Central sem sombras difusas `md:shadow-xl` | Desktop (1440x900) | ✅ Aprovado |
| **PASS 4** | Painel Central com bordas estruturais `md:border-2` | Desktop (1440x900) | ✅ Aprovado |
| **PASS 5** | Header Desktop sem sombras difusas | Desktop (1440x900) | ✅ Aprovado |
| **PASS 6** | Header Desktop com divisor `border-b-2` | Desktop (1440x900) | ✅ Aprovado |
| **PASS 7** | Container «Lidas» com borda `border-2` | Desktop (1440x900) | ✅ Aprovado |
| **PASS 8** | Container «Lidas» com `shadow-none` | Desktop (1440x900) | ✅ Aprovado |
| **PASS 9** | Container «Não Lidas» com borda `border-2` | Desktop (1440x900) | ✅ Aprovado |
| **PASS 10** | Container «Não Lidas» com `shadow-none` | Desktop (1440x900) | ✅ Aprovado |
| **PASS 11** | Tabs de Correspondência com bordas `border-2` | Desktop (1440x900) | ✅ Aprovado |
| **PASS 12** | Mobile AppBar com `border-b-2` nítido | Mobile (390x844) | ✅ Aprovado |
| **PASS 13** | Mobile AppBar com `shadow-none` | Mobile (390x844) | ✅ Aprovado |
| **PASS 14** | Mobile NavBar com `border-t-2` nítido | Mobile (390x844) | ✅ Aprovado |
| **PASS 15** | Mobile NavBar com `shadow-none` | Mobile (390x844) | ✅ Aprovado |

---

## 4. Conclusão

A interface da Plataforma Correio Digital de Angola opera agora sob uma arquitetura visual Flat UI nítida, moderna e com alto contraste, eliminando o efeito embaçado das sombras difusas e garantindo clareza e legibilidade absolutas tanto no modo claro como no modo escuro.
