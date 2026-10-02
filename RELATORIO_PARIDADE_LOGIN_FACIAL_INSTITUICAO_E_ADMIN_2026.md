# Relatório Técnico: Paridade Estrita de Dados e Foto de Perfil no Login Facial (Instituição e Administração Central)

**Data de Homologação:** 02 de Outubro de 2026  
**Ambiente:** Plataforma de Correio Digital de Angola (CDA) — Versão Oficial 2026  
**Responsável Técnico:** Agente de Engenharia de Software e QA CDA  
**Status do Sistema:** 🟢 **100% Homologado e Estável (0 Erros TypeScript / 0 Falhas E2E)**

---

## 1. Sumário Executivo e Diagnóstico

Foi identificado e corrigido o comportamento divergente no fluxo de **Login Facial (Biometria Facial)** nas áreas de **Instituição** e **Administração Central**.

### 1.1. Causas Raízes Identificadas:
1. **Restrição Exclusiva de Hidratação ao Cidadão:**  
   A função central de resolução e hidratação de identidade pós-login (`applyIdentityForLoggedUser`) possuía a guarda `if (appMode !== 'user') return;`. Com isso, ao concluir a validação biométrica facial em sessões de Instituição ou Admin, os campos de perfil (`name`, `phone`, `nif`, `email`, `avatarUrl`, `verificationStatus`, `institutionName`, `role`) não eram hidratados nem sincronizados com os dados canónicos ou editados da conta.
2. **Ausência de Hidratação Demo e Nuvem no Login Facial Institucional e Administrativo:**  
   - Na via Institucional demo (`AGT-9921-SR`), o login facial ativava o gate (`setInstGate('full')`), mas não carregava o perfil local/nuvem nem o avatar correspondente.
   - Na via Administrativa (`ADMIN-0001` / `ADM-8812-OP`), o login facial não consultava a tabela de perfis nem restaurava o avatar do administrador (`fotoAdminLocal` / `lerAvatarLocal('admin')`), deixando o estado visual com resíduos da sessão anterior ou valores padrão de cidadão.

---

## 2. Solução Técnica Implementada

### 2.1. Unificação da Resolução de Identidade (`applyIdentityForLoggedUser` em `src/App.tsx`)
A função foi expandida e adaptada para suportar de forma unificada e simétrica os três perfis da plataforma:

1. **Área Institucional (`appMode === 'institution'`):**
   - Para a conta demo (`AGT-9921-SR`): consulta o perfil persistido na nuvem e o espelho local (`lerPerfilLocal`), restaura a foto/avatar oficial (`lerAvatarLocal('institution', code)`), define os dados completos (NIF, telefone, email, cargo de Responsável) e limpa campos pessoais do cidadão.
   - Para contas de adesão institucional real ou membros de equipa: executa `resolveInstitutionFaceLogin` e `applyInstitutionSessionIdentity`, aplicando o nome do órgão, número do agente e permissões específicas.

2. **Área da Administração Central (`appMode === 'admin'`):**
   - Para a conta de Administrador Geral (`ADMIN-0001` / `ADM-8812-OP`): consulta a nuvem (`supabaseService.getProfile`) e o armazenamento local (`lerPerfilLocal`), restaura o avatar oficial do admin (`lerAvatarLocal('admin')`), fixa o nome oficial (`Edlásio Galhardo`), credenciais, contactos e o status `'Administrador Geral / Central'`.
   - Para agentes reais (`ADMIN-NNNN`): carrega as permissões, dados do agente e avatar institucional correspondente.

3. **Área do Cidadão (`appMode === 'user'`):**
   - Mantida a resolução com fallback e verificação de integridade biométrica/nuvem.

### 2.2. Transição Facial Sincronizada
No `useEffect` de conclusão da validação facial (`faceProgress === 100`), os fluxos das três áreas acionam agora `applyIdentityForLoggedUser` de modo assíncrono e coordenado com a abertura da câmara e redirecionamento de tela (`gov-dashboard` para Admin e `home` para Instituição/Cidadão).

---

## 3. Homologação e Resultados dos Testes E2E

### 3.1. Bateria Dedicada de Paridade Facial (`scripts/e2e_login_facial_paridade_instituicao_e_admin.mjs`)
- ✅ `1.1` - Registo facial institucional concluído na página Perfil
- ✅ `1.2` - Entrada com sucesso no Portal Institucional via Login Facial
- ✅ `1.3` - Paridade de Saudação/Identidade no Header Institucional (`Olá, Edlasio`)
- ✅ `1.4` - Dados do Perfil Institucional preservados (NIF / Telefone / Instituição)
- ✅ `2.1` - Registo facial de Administrador concluído na página Perfil
- ✅ `2.2` - Entrada com sucesso na Administração Central via Login Facial
- ✅ `2.3` - Paridade de Saudação/Identidade no Header Administrativo (`Olá, Edlásio`)
- ✅ `2.4` - Dados do Perfil Administrativo preservados (Admin / Geral)
- **Falhas:** 0

### 3.2. Regressão Global das Demais Funcionalidades
- `e2e_ocorrencias_integracao_e_eliminacao.mjs`: **0 falhas** ✅
- `e2e_exclusao_mutua_e_dropdown_avatar.mjs` (12/12): **0 falhas** ✅
- `e2e_gov_dashboard_indicador_verde.mjs` (11/11): **0 falhas** ✅
- `e2e_crud_7_tipos_e_sintonia_painel.mjs` (38/38): **0 falhas** ✅
- `npm run lint` (`tsc --noEmit`): **0 erros** ✅

---

## 4. Conclusão

O Login Facial nas áreas de Instituição e Administração Central agora mantém rigorosamente 100% de paridade com o Login Normal, preservando integralmente a foto de perfil, os dados cadastrais, cargos e identificações de sistema.
