# Diretrizes Críticas de Estabilidade: Perfil Institucional vs. Cidadão

Para evitar regressões e quebras na aplicação ao alternar entre o Modo Cidadão e o Modo Institucional, todas as implementações e refatorações devem seguir estritamente as regras de programação defensiva abaixo:

### 1. Tratamento Defensivo do `activeProfile`
O objeto `activeProfile` (retornado pelo hook de sessão `useSession()`) pode estar indefinido ou nulo quando o utilizador está no modo Cidadão ou em transições de estado de login.
- **PROIBIDO**: Aceder diretamente a propriedades de `activeProfile` sem verificação (ex: `activeProfile.role`, `activeProfile.institutionName`).
- **OBRIGATÓRIO**: Usar encadeamento opcional (Optional Chaining) ou fallbacks seguros em toda a árvore de componentes:
  ```typescript
  const editRole = activeProfile?.role || '';
  const editDepartment = activeProfile?.departmentName || '';
  const editInstitution = activeProfile?.institutionName || '';
  ```

### 2. Validação e Fallbacks no Componente `InstitutionProfile`
O componente `InstitutionProfile` (`/src/components/features/InstitutionProfile.tsx`) recebe dados institucionais via propriedades (props). Estas propriedades devem sempre ser validadas defensivamente contra tipos inválidos, valores nulos ou vazios.
- **Garantia de Tipos**: Use validações explícitas de tipo e operadores lógicos para atribuir fallbacks robustos:
  ```typescript
  const profileName = typeof originalProfileName === 'string' && originalProfileName ? originalProfileName : "Edlasio Galhardo";
  const bi = typeof originalBi === 'string' && originalBi ? originalBi : "009874562LA041";
  const nif = typeof originalNif === 'string' && originalNif ? originalNif : "5401329188";
  const phone = typeof originalPhone === 'string' && originalPhone ? originalPhone : "+244 923 111 222";
  const email = typeof originalEmail === 'string' && originalEmail ? originalEmail : "edlasio.galhardo@gmail.com";
  ```
- **Manipulação Segura de Strings**: Funções de tratamento de texto (como `.match()`, `.split()` ou `.map()`) aplicadas a dados institucionais (como o nome da instituição para gerar a sigla) devem garantir que o alvo é de fato uma string antes de executar:
  ```typescript
  const normalizedInstitution = institution;
  const institutionAcronymMatch = typeof normalizedInstitution === 'string' ? normalizedInstitution.match(/\(([^)]+)\)/) : null;
  const institutionAcronym = institutionAcronymMatch?.[1] || (typeof normalizedInstitution === 'string' ? normalizedInstitution.split(' ').map(word => word ? word[0] : '').join('').slice(0, 8).toUpperCase() : 'AGT');
  ```

### 3. Sincronização em Modos de Edição
Dentro de `useEffect`s que sincronizam estados locais de formulários ao abrir abas de preferências ou configurações, certifique-se de reatribuir os valores de forma segura:
- Atualize sempre os estados usando `activeProfile?.prop` para garantir que o formulário de edição de perfil institucional não cause falhas se o perfil estiver em transição.
