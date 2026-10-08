# Especificação: Plataforma de Catálogos SaaS

**Feature Branch**: `004-saass-catalog-platform`  
**Criada**: 2026-10-08  
**Status**: Pronta para planejamento  
**Escopo desta especificação**: aplicação `client` e sua documentação

## Objetivo

Transformar a experiência pública do cliente de uma vitrine de descoberta de
empresas e serviços em uma plataforma na qual cada negócio tem seu próprio
catálogo público, site e ponto de instalação PWA. O cliente final acessa um link
compartilhado pelo negócio, consulta somente o catálogo daquele negócio e, quando
aplicável, solicita um agendamento sem sair desse contexto.

Esta especificação descreve o comportamento desejado para a aplicação `client`.
Não descreve nem autoriza mudanças no `collaborator`, `backoffice`, backend,
contratos compartilhados ou infraestrutura.

## Contexto e decisões

- Cada catálogo é identificado por um slug e acessível em uma rota como
  `/empresa/{slug}`.
- A raiz `/` não é um catálogo nem uma página de descoberta. Ela apresenta uma
  orientação neutra para que o visitante obtenha e use o link do negócio.
- Não existe busca ou listagem central de empresas, serviços ou produtos para o
  visitante.
- O agendamento continua disponível no catálogo individual e mantém o slug do
  negócio durante todo o fluxo.
- Cada PWA é associado ao catálogo de um único negócio. Sua abertura deve
  iniciar diretamente em `/empresa/{slug}`, nunca na raiz nem em uma página
  geral.
- A rota de início e o escopo de navegação do PWA devem manter a identidade do
  negócio: o escopo abrange o catálogo e as rotas subordinadas desse negócio,
  sem incluir a raiz nem catálogos de outros negócios.
- O caminho com slug é a estratégia de endereço desta especificação. Domínios
  personalizados e subdomínios não fazem parte do escopo.

## Histórias de usuário e testes

### História 1 - Acessar o catálogo de um negócio (Prioridade: P1)

Como cliente final, quero abrir o link de um negócio e ver o catálogo dele, para
conhecer seus serviços sem procurar em uma vitrine de várias empresas.

**Teste independente**: acessar um slug publicado e verificar que a página
apresenta a identidade e os itens públicos daquele negócio, sem dados de outros
negócios.

**Cenários de aceitação**:

1. **Dado** um link com o slug de um negócio publicado, **quando** o visitante
   acessa `/empresa/{slug}`, **então** vê o catálogo público correspondente.
2. **Dado** que o catálogo contém serviços ou produtos ativos, **quando** o
   catálogo é exibido, **então** apresenta apenas itens públicos e ativos do
   negócio identificado na URL.
3. **Dado** um slug inexistente, não publicado ou indisponível, **quando** o
   visitante acessa seu link, **então** recebe um estado claro de catálogo não
   encontrado ou indisponível e não vê dados de outro negócio.
4. **Dado** que o visitante acessa a raiz `/` sem um slug, **quando** a página
   abre, **então** vê uma orientação neutra para usar o link do negócio, sem
   busca, listagem ou seleção de empresas e serviços.

### História 2 - Solicitar agendamento pelo catálogo (Prioridade: P1)

Como cliente final, quero selecionar um serviço e solicitar um horário pelo
catálogo que estou consultando, para concluir o agendamento com o negócio correto.

**Teste independente**: iniciar o agendamento em um catálogo publicado, completar
as etapas disponíveis e verificar que serviço, disponibilidade e solicitação
permanecem associados ao mesmo negócio.

**Cenários de aceitação**:

1. **Dado** um serviço elegível no catálogo de um negócio, **quando** o visitante
   inicia o agendamento, **então** o fluxo mantém o slug e o serviço selecionado.
2. **Dado** um agendamento em andamento, **quando** o visitante seleciona
   profissional, data, horário e informa seus dados, **então** todas as opções
   pertencem ao mesmo negócio e respeitam as regras de disponibilidade existentes.
3. **Dado** um link de agendamento com slug ou serviço inválido, **quando** o
   visitante o abre ou envia uma solicitação, **então** recebe uma mensagem
   acionável e nenhuma solicitação inválida é criada.
4. **Dado** um pedido de agendamento bem-sucedido, **quando** a confirmação é
   apresentada, **então** o resumo corresponde ao catálogo e ao serviço de origem.

### História 3 - Instalar e reabrir o PWA do negócio (Prioridade: P1)

Como cliente final, quero instalar o catálogo de um negócio como PWA e reabri-lo
diretamente, para retornar à experiência daquele negócio sem passar por uma tela
inicial genérica.

**Teste independente**: obter o manifesto associado a um slug, verificar sua
identidade e navegação, e abrir a aplicação instalada para confirmar que ela
inicia no catálogo desse slug.

**Cenários de aceitação**:

1. **Dado** o catálogo publicado de um negócio, **quando** seu PWA é instalado,
   **então** o manifesto identifica aquele catálogo e sua `start_url` abre
   `/empresa/{slug}`.
2. **Dado** um PWA instalado, **quando** o cliente o abre, **então** a primeira
   tela é o catálogo do negócio correspondente, não a raiz nem uma tela de
   descoberta.
3. **Dado** o escopo de navegação do PWA, **quando** o cliente navega para uma
   rota de agendamento do mesmo negócio, **então** permanece no contexto do PWA;
   rotas da raiz ou de outro negócio não passam a representar o catálogo instalado.
4. **Dado** que o slug é inválido ou está ausente, **quando** um manifesto é
   solicitado, **então** a configuração não associa silenciosamente o PWA à raiz
   ou a outro negócio.

## Requisitos

### Requisitos funcionais

- **FR-001**: A aplicação MUST disponibilizar cada catálogo por um identificador
  de negócio na URL pública.
- **FR-002**: A aplicação MUST exibir, no catálogo, apenas dados públicos
  pertencentes ao negócio identificado na URL.
- **FR-003**: A aplicação MUST NOT oferecer uma busca ou listagem geral de
  empresas, serviços ou produtos para descoberta pelo cliente final.
- **FR-004**: A rota raiz MUST apresentar uma orientação neutra para usar o link
  do negócio e MUST NOT se comportar como catálogo ou marketplace.
- **FR-005**: O fluxo de agendamento MUST ser iniciado pelo catálogo individual e
  MUST preservar a associação ao mesmo negócio em todas as etapas.
- **FR-006**: A aplicação MUST apresentar estados distintos e compreensíveis
  para carregamento, erro, catálogo não encontrado e catálogo indisponível, sem
  substituir o conteúdo por dados de outro negócio.
- **FR-007**: Cada PWA MUST ser configurado para o slug do negócio cujo catálogo
  originou a instalação.
- **FR-008**: A `start_url` do PWA MUST apontar diretamente para
  `/empresa/{slug}` e MUST NOT apontar para `/` ou para uma tela geral.
- **FR-009**: O escopo do PWA MUST cobrir o catálogo e as rotas de agendamento do
  mesmo negócio, sem incluir a raiz nem rotas de outros negócios.
- **FR-010**: A identidade do PWA (incluindo nome e metadados disponíveis) MUST
  corresponder ao negócio do catálogo, sem apresentar outro negócio como
  identidade da instalação.
- **FR-011**: Slug ausente, inválido ou não publicado MUST produzir erro ou estado
  explícito; a aplicação MUST NOT usar fallback silencioso para outro catálogo.
- **FR-012**: As regras já existentes de validação de agendamento, disponibilidade,
  consentimento e confirmação MUST continuar aplicáveis dentro do catálogo
  individual.

### Requisitos de experiência

- **UX-001**: Catálogo, agendamento, estados de erro e instalação devem continuar
  utilizáveis em telas móveis e de computador.
- **UX-002**: O visitante deve conseguir identificar qual negócio é responsável
  pelo catálogo que está consultando e pelo PWA que instalou.
- **UX-003**: A raiz neutra deve explicar a ausência de catálogo sem induzir o
  visitante a procurar negócios dentro da plataforma.

## Entidades

- **Negócio**: unidade identificada por slug que possui dados públicos de
  catálogo, identidade visual disponível e configuração de publicação.
- **Catálogo público**: visão dos itens ativos e publicáveis pertencentes a um
  único negócio.
- **PWA do catálogo**: instalação identificada e iniciada pelo catálogo de um
  único negócio, com escopo restrito às rotas públicas daquele negócio.
- **Agendamento**: solicitação iniciada a partir de um serviço do catálogo e
  associada ao mesmo negócio durante o fluxo.

## Casos limite

- Slug vazio, inválido, desconhecido ou associado a negócio não publicado.
- Um serviço desativado ou que pertença a outro negócio é acessado por URL
  direta.
- O visitante atualiza ou compartilha uma rota intermediária de agendamento; o
  negócio e o serviço de origem devem ser revalidados.
- A requisição do catálogo falha ou não retorna itens publicáveis.
- O navegador abre uma rota interna do PWA ou não oferece suporte à instalação.
- Dois negócios possuem nomes semelhantes; slug e identidade do catálogo
  permanecem inequívocos.

## Critérios de sucesso

- **SC-001**: Um cliente consegue abrir um catálogo publicado pelo link direto e
  não encontra navegação de descoberta de múltiplos negócios.
- **SC-002**: Em todas as rotas de catálogo e agendamento, os dados exibidos e
  enviados pertencem ao negócio do slug atual.
- **SC-003**: A raiz não apresenta resultados de empresas, serviços ou produtos
  e orienta claramente o uso do link do negócio.
- **SC-004**: Para cada slug válido, o PWA abre diretamente o catálogo associado;
  testes verificam que `start_url` não é a raiz e que o escopo não inclui outros
  negócios.
- **SC-005**: Slugs inválidos ou catálogos indisponíveis geram estado explícito,
  sem expor conteúdo de outro negócio.
- **SC-006**: Os fluxos existentes de disponibilidade, validação e confirmação
  de agendamento permanecem cobertos por testes da aplicação `client`.

## Fora de escopo

- Alterar APIs, regras de domínio compartilhadas, backend, `backoffice` ou
  `collaborator`.
- Configurar domínios personalizados, subdomínios ou provisionamento de DNS.
- Implementar cobrança, planos, analytics ou administração de assinaturas.
- Criar ou alterar o catálogo administrativo e as ferramentas de gestão do
  negócio.
- Implementar mudanças de código como parte desta especificação documental.

## Premissas

- O slug é a identidade pública usada para carregar o catálogo e gerar a
  configuração do PWA.
- As regras e os dados necessários para agendamento continuam sendo fornecidos
  pelos serviços existentes; esta especificação não altera sua autoridade ou
  persistência.
- O PWA deve representar um negócio por instalação, mesmo que vários negócios
  compartilhem a mesma origem web.
