# Feature Specification: Personalização de Cores do Cliente

**Feature Branch**: `014-personalizacao-cores` (não criada nesta etapa)

**Created**: 2026-11-07

**Status**: Draft — aguardando revisão do usuário antes do plano

**Input**: Solicitação do usuário para permitir que cada empresa personalize as cores da página pública por meio do backoffice. Foi autorizado adicionar campos opcionais de cores aos documentos existentes, sem criar collections ou subcollections, alterar regras de segurança ou executar migrações.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configurar a identidade visual da empresa (Priority: P1)

Como responsável por uma empresa, quero escolher e pré-visualizar suas cores primária e secundária nas configurações, para reconhecer a identidade visual da empresa em sua página pública.

**Why this priority**: A personalização só é útil se a empresa puder selecionar, revisar e salvar suas próprias cores com segurança.

**Independent Test**: Selecionar duas cores válidas para uma empresa de teste, verificar seus valores e a prévia, salvar e reabrir as configurações para confirmar que os valores foram mantidos para a mesma empresa.

**Acceptance Scenarios**:

1. **Given** que o usuário autorizado abriu as configurações da empresa ativa, **When** escolhe as cores primária e secundária, **Then** os valores hexadecimais e a prévia refletem imediatamente as escolhas.
2. **Given** que as cores selecionadas são válidas, **When** o usuário salva as configurações, **Then** elas são atualizadas apenas para a empresa ativa e aparecem ao reabrir as configurações.
3. **Given** que uma cor está em formato inválido, **When** o usuário tenta salvá-la, **Then** recebe uma mensagem acionável e os valores salvos anteriormente permanecem inalterados.

### User Story 2 - Ver a página pública com as cores da empresa (Priority: P1)

Como cliente, quero que a página pública da empresa use as cores que ela escolheu, para reconhecer sua identidade durante a navegação e o agendamento.

**Why this priority**: A identidade configurada precisa alcançar o público sem comprometer a legibilidade ou o fluxo existente.

**Independent Test**: Abrir páginas públicas de duas empresas com cores diferentes e verificar que cada uma apresenta apenas suas próprias cores; repetir com uma empresa sem personalização e confirmar o tema padrão.

**Acceptance Scenarios**:

1. **Given** uma empresa com cores personalizadas válidas, **When** sua página pública é apresentada, **Then** a cor primária aparece nos destaques e ações interativas e a secundária nos elementos complementares.
2. **Given** duas empresas com configurações distintas, **When** as respectivas páginas públicas são abertas ou renderizadas, **Then** cada página usa exclusivamente as cores da empresa correspondente.
3. **Given** uma empresa sem uma ou ambas as cores personalizadas, **When** sua página pública é apresentada, **Then** a cor ausente usa a identidade padrão atual sem alterar o comportamento existente.
4. **Given** qualquer combinação de cores aceita, **When** textos e controles são exibidos, **Then** permanecem legíveis e distinguíveis nos tamanhos de tela suportados.
5. **Given** que as cores da empresa foram salvas, **When** a publicação existente do site cliente for atualizada, **Then** as páginas públicas geradas passam a refletir os valores salvos sem expor cores de outra empresa.

### Edge Cases

- Uma empresa tem somente a cor primária ou somente a secundária configurada.
- Um valor salvo anteriormente está ausente, malformado ou fora do formato hexadecimal aceito.
- O usuário troca a empresa ativa antes de abrir ou salvar as configurações.
- As duas empresas têm valores idênticos para uma cor, mas diferentes para a outra.
- Uma cor selecionada exige texto claro ou escuro para manter contraste adequado.
- A gravação falha ou a sessão do usuário deixa de estar autorizada; a interface não deve apresentar o salvamento como concluído.
- O client é acessado em tela estreita e em tela ampla, com preferências e valores diferentes por empresa.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O usuário autorizado deve poder selecionar uma cor primária e uma cor secundária nas configurações da empresa.
- **FR-002**: O backoffice deve exibir os valores hexadecimais das cores e uma prévia que atualiza conforme a seleção.
- **FR-003**: O usuário deve poder salvar e atualizar as cores da empresa ativa; entradas inválidas devem ser rejeitadas com mensagem acionável, sem substituir valores válidos já salvos.
- **FR-004**: A personalização deve permanecer isolada por empresa e respeitar a empresa ativa em leitura e gravação.
- **FR-005**: As páginas públicas devem aplicar a cor primária em ações principais, seleções, etapas, links e outros destaques interativos.
- **FR-006**: As páginas públicas devem aplicar a cor secundária em fundos de destaque, cards selecionados e detalhes complementares.
- **FR-007**: A combinação de cores deve preservar legibilidade para qualquer cor válida: o texto sobre superfícies coloridas deve usar a opção de primeiro plano com maior contraste, atingindo no mínimo 4,5:1 para texto normal; os limites e indicadores visuais essenciais de controles interativos devem atingir 3:1.
- **FR-008**: Empresas sem valores personalizados devem manter a identidade visual padrão atual. Se apenas uma das cores estiver configurada, a cor ausente deve manter o padrão correspondente.
- **FR-009**: As cores devem ser consistentes nas páginas públicas da mesma empresa e não podem contaminar a renderização ou navegação de outra empresa.
- **FR-010**: Os controles de configuração, a prévia e as páginas públicas devem permanecer utilizáveis em dispositivos móveis e desktops.
- **FR-011**: A mudança não deve alterar os fluxos existentes de catálogo, agendamento, profissionais ou produtos.
- **FR-012**: A persistência fica limitada a campos opcionais de cores nos documentos existentes da empresa e de sua projeção pública, conforme autorização do usuário. Não devem ser criadas collections ou subcollections, alteradas regras de segurança ou executadas migrações.
- **FR-013**: A leitura e gravação devem preservar as verificações de autenticação, autorização e isolamento por tenant existentes.

### Key Entities *(include if feature involves data)*

- **Empresa**: Empresa identificada pelo tenant ativo, com cores primária e secundária opcionais associadas à sua identidade visual.
- **Identidade visual pública**: Cores disponíveis à página pública da empresa correspondente; valores ausentes usam o tema padrão atual.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em todos os testes de configuração com valores válidos, a prévia e os valores exibidos correspondem às duas cores selecionadas antes e depois de salvar.
- **SC-002**: Em testes com pelo menos duas empresas, há zero ocorrências de cores de uma empresa exibidas na página pública da outra.
- **SC-003**: Em testes com empresas sem personalização e com personalização parcial, todas as cores ausentes correspondem ao tema padrão atual.
- **SC-004**: Todo texto normal nas combinações aceitas alcança contraste mínimo de 4,5:1; todo limite ou indicador visual essencial de controle interativo alcança 3:1.
- **SC-005**: Backoffice e páginas públicas podem ser usados em larguras de viewport de 320 px a 1920 px sem rolagem horizontal causada pelos controles de personalização.
- **SC-006**: Os testes de regressão dos fluxos existentes de catálogo e agendamento passam sem mudança no comportamento observado.

## Assumptions

- A configuração pertence à empresa ativa no backoffice e segue a autorização já existente para salvar os dados dessa empresa.
- As cores são valores hexadecimais RGB de seis dígitos, com `#` opcional na entrada; valores salvos e exibidos são normalizados com `#`.
- A página pública mantém as cores atuais do produto quando não houver configuração compatível.
- O client gera páginas públicas a partir do snapshot estático já existente. Assim, cores salvas tornam-se visíveis nas páginas publicadas após o próximo ciclo existente de build e publicação do client; esta especificação não autoriza deploy.
- A atualização usa as operações existentes de configuração e publicação da empresa, sem introduzir um processo de migração ou publicação automática.
