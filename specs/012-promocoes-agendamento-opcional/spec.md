# Especificação: Promoções, experiência de compra e agendamento opcional

**Feature Branch**: `012-promocoes-agendamento-opcional`  
**Criada**: 2026-11-02  
**Status**: Draft  
**Input**: Solicitação do usuário para especificar promoções por produto, agendamento opcional e melhorias na visualização e seleção de produtos.

## Contexto e motivação

O Tamarcado permite que cada empresa publique seu catálogo e receba solicitações de agendamento. O backoffice cadastra produtos ou serviços com preço, duração, comissão, disponibilidade e, quando aplicável, opções de personalização. No cliente, a vitrine apresenta cards de serviços e a página de agendamento mostra o resumo do produto, as opções disponíveis e o fluxo de escolha de horário.

Negócios precisam divulgar preços promocionais sem apresentar valores diferentes daqueles usados na solicitação. Também há produtos cuja entrega ou execução ocorre dentro de um prazo estimado, sem que o cliente marque um horário. Por fim, a apresentação atual não permite comparar claramente os preços das combinações antes de escolher uma opção.

Esta especificação registra o comportamento desejado e as regras que ainda dependem de decisão. Ela não autoriza implementação, alteração de dados ou reestruturação da aplicação.

## Clarifications

### Session 2026-11-02

- Q: Quando um produto tiver prazo estimado e não exigir que o cliente escolha um dia, o que deve acontecer ao prosseguir? → A: Criar a solicitação como um agendamento normal, atribuindo e reservando automaticamente o horário disponível mais próximo para o profissional escolhido; esta decisão substitui a resposta inicial de não enviar solicitação nesta etapa.
- Q: Como a promoção deve funcionar quando as variações de um produto têm preços diferentes? → A: Configurar preço original e promocional para cada variação.
- Q: Em um produto com vários atributos, como o cliente deve selecionar a variação usando os controles no estilo checkbox? → A: Selecionar uma opção em cada atributo e formar uma combinação.
- Q: Que condição deve ser obrigatória para aceitar um preço promocional? → A: O preço promocional deve ser menor que o preço original da mesma variação.
- Q: Quando uma solicitação usar uma promoção, quais valores devem ser preservados no histórico? → A: Preço efetivo, preço original e dados da promoção aplicada.

### Session 2026-11-02 (segunda rodada)

- Q: Para um produto com prazo estimado, como deve ser definido o profissional? → A: O cliente escolhe entre os profissionais elegíveis; quando houver somente um, ele é selecionado automaticamente.
- Q: Para um produto com prazo estimado, o cliente também deverá escolher um horário? → A: Não. O servidor atribui e reserva o horário disponível mais próximo para o profissional escolhido.
- Q: O prazo estimado deve ser contado em dias corridos ou em dias úteis? → A: Dias corridos, incluindo fins de semana.
- Q: Em qual dia deve começar a contagem do prazo estimado, considerando a data local da empresa? → A: No dia seguinte à data local de criação do pedido (checkout), mesmo que o horário reservado seja futuro.
- Q: O prazo estimado deve variar conforme a variação selecionada do produto? → A: Sim, configurar um prazo para cada variação.

### Session 2026-11-02 (terceira rodada)

- Q: O que deve acontecer quando o cliente prosseguir com um produto com estimativa? → A: Registrar um pedido como agendamento normal, com profissional selecionado (ou selecionado automaticamente quando só houver um), horário mais próximo atribuído pelo servidor e reserva de disponibilidade.
- Q: O que o checkout deve registrar sobre pagamento? → A: Apenas a forma escolhida — débito, crédito, dinheiro ou Pix — e, para crédito, o número de parcelas de 1 a 5 sem juros; não haverá integração com provedor, cobrança ou processamento do pagamento.
- Q: Como apresentar a data estimada antes de existir pedido? → A: Mostrar uma previsão provisória calculada a partir do dia seguinte à data local atual da empresa; no envio, recalcular e apresentar a data oficial a partir do dia seguinte à data local efetiva de criação do pedido.

### Session 2026-11-12

- Q: Como apresentar uma combinação de opções e seu preço? → A: Cada combinação válida aparece como um único controle selecionável, com os rótulos combinados (por exemplo, “Cílios + Sobrancelhas”) e seu preço efetivo; selecionar outra combinação substitui a anterior.
- Q: Qual deve ser o intervalo entre os horários iniciais? → A: Usar a duração do serviço como intervalo entre inícios, ancorado no começo de cada período de expediente; manter as demais verificações atuais de expediente, intervalos, bloqueios, agendamentos e reservas.
- Q: Como apresentar estimativas diferentes por combinação na vitrine? → A: Mostrar o prazo em dias no card quando for único ou igual em todas as combinações; se variar, indicar que o prazo depende da opção, e apresentar o prazo exato no agendamento após a seleção.
- Q: Como identificar a busca de profissionais? → A: Durante a busca, mostrar indicador visual e a mensagem “Buscando profissionais, aguarde...”, distinguindo-a do carregamento inicial e do envio do agendamento.
- Q: O que fazer com o aviso da estimativa de entrega? → A: Manter o texto e as informações funcionais atuais, adicionando emoji de aviso e destaque visual.
- Q: O nome deve ser opcional para concluir o agendamento? → A: Não. O nome permanece obrigatório; desconsiderar o critério inicial conflitante que permitia concluir sem informá-lo.

### Session 2026-11-13 — Edição agrupada de prazo no backoffice

- Q: O cálculo de vários produtos deve alterar o cliente ou o agendamento? → A: Não. Esta etapa é restrita ao backoffice; o total de vários produtos existe apenas em um simulador administrativo e não altera pedidos reais.
- Q: Como tratar prazos existentes diferentes para combinações de uma mesma característica? → A: Mostrar os valores e o conflito, preservar todos os valores existentes e exigir confirmação explícita antes de unificá-los.
- Q: O atributo principal de prazo é persistido como nova configuração? → A: Não. O contrato atual armazena prazos por combinação completa; o agrupamento é uma facilidade de edição e sua escolha deve ser reconstruída quando possível ou solicitada novamente.

## Problemas a resolver

- O cadastro de produto não oferece estado e preço promocional.
- A vitrine não reúne promoções ativas em uma seção própria nem destaca preço original e preço promocional.
- O fluxo público exige que o cliente escolha data e horário; produtos com estimativa precisam permitir a atribuição confiável do horário mais próximo sem essa escolha manual.
- O card de catálogo apresenta o preço base, enquanto os preços de combinações são conhecidos na tela de agendamento após configurar as opções.
- A forma de representar a seleção de opções precisa respeitar os produtos existentes, que podem ter vários atributos e preços por combinação.
- O histórico de agendamentos ainda não preserva os valores e dados da promoção aplicada.
- A vitrine não informa no card o prazo estimado do serviço, e os controles de escolha não reúnem o nome da combinação e seu preço.
- A cadência atual dos horários iniciais usa o intervalo configurado pela empresa, em vez da duração do serviço selecionado.

## Objetivos

1. Permitir que o backoffice configure uma promoção por produto e que a vitrine apresente ofertas ativas com preços claros.
2. Garantir que o valor apresentado ao cliente seja compatível com o valor validado e registrado no envio da solicitação.
3. Manter o agendamento como regra para os produtos; quando houver prazo estimado de entrega, não exigir que o cliente escolha data ou horário e reservar automaticamente o horário disponível mais próximo.
4. Apresentar informações do produto, opções e preços correspondentes antes de o cliente concluir uma seleção, com controles de seleção no estilo checkbox.
5. Preservar os produtos existentes, as regras de tenant, a validação confiável no servidor e o fluxo atual para produtos que exigem agendamento.

## Escopo

### Incluído

- Cadastro, edição e ativação ou desativação de promoção em cada produto.
- Apresentação de produtos em promoção numa seção anterior à listagem convencional da vitrine.
- Exibição de nome, descrição, imagens, preço e opções com seus preços correspondentes antes da seleção.
- Seleção visual de opções com comportamento de escolha única, mantendo a associação ao produto.
- Apresentação de prazo em dias e de uma data estimada; quando houver estimativa de entrega, o cliente não precisa escolher data ou horário.
- Checkout para registrar forma de pagamento e parcelas escolhidas, sem processar cobrança ou integrar provedor.
- Atribuição e reserva, pelo servidor, do horário disponível mais próximo para o profissional escolhido no fluxo com estimativa.
- Exibição antecipada das variações e respectivos preços, com seleção visual no estilo checkbox.
- Apresentação de cada combinação válida em um único controle com rótulos e preço efetivo, mantendo uma única combinação selecionada por vez.
- Apresentação do prazo estimado nos cards da vitrine e destaque acessível do aviso de estimativa no agendamento.
- Estado visual específico para busca de profissionais, com mensagem explícita e tratamento separado de erro e ausência de resultados.
- Cadência dos horários iniciais igual à duração do serviço, aplicada igualmente à busca, criação e reagendamento, sem alterar as demais restrições de disponibilidade.
- Compatibilidade com produtos e registros preexistentes.

### Fora do escopo desta especificação

- Integração com provedores, autorização/captura de pagamento, cobrança, frete ou criação de pedido sem agendamento. Os pedidos desta especificação continuam sendo agendamentos registrados no fluxo existente.
- Alteração das regras de confirmação, cancelamento ou transição de status de agendamentos existentes. A única alteração de disponibilidade incluída é a cadência por duração descrita nesta especificação; as demais restrições atuais permanecem.
- Implementação, migração, alteração de regras Firestore, publicação, deploy ou mudança de dados.
- Reestruturação do catálogo, do modelo multi-tenant ou da persistência atual sem justificativa decorrente das decisões em aberto.

## Cenários de usuário e testes

### História 1 — Configurar e divulgar uma promoção (Prioridade: P1)

Como usuário autorizado do backoffice, quero configurar o estado da promoção e os preços original e promocional do produto ou de cada variação, para divulgar ofertas que o cliente consiga identificar e comparar.

**Por que esta prioridade**: A promoção precisa ser configurável e correta tanto na vitrine quanto no processo que registra a solicitação.

**Teste independente**: Criar e editar produtos com e sem variações, com promoção ativa, inativa e ausente; comparar os preços exibidos por variação e o preço usado ao enviar uma solicitação.

**Cenários de aceitação**:

1. **Dado** um produto com promoção ativa e preços promocionais válidos, **quando** o cliente abre a vitrine da empresa, **então** o produto aparece na seção de promoções antes da listagem convencional, com o preço original riscado e destacado em vermelho, o preço promocional em destaque e indicação visual de promoção; em produtos com variações, esses preços correspondem a cada variação.
2. **Dado** um produto sem promoção, **quando** o cliente consulta a vitrine, **então** o produto mantém a apresentação atual e não recebe indicação de promoção.
3. **Dado** um produto com promoção inativa, **quando** o cliente consulta a vitrine, **então** ele não aparece como oferta e o valor da promoção não é apresentado como preço vigente.
4. **Dado** que o backoffice altera ou desativa uma promoção, **quando** uma nova consulta ou solicitação usa os dados vigentes, **então** a apresentação e o valor validado correspondem à mesma configuração atual.
5. **Dado** um usuário sem autorização ou de outro tenant, **quando** tenta configurar a promoção, **então** a operação é rejeitada e não altera produto de outra empresa.
6. **Dado** uma promoção com valor ausente, inválido ou igual ou superior ao preço original da mesma variação, **quando** o backoffice tenta salvá-la, **então** o sistema apresenta erro e não a comunica como salva.

### História 2 — Escolher produto, opção e preço com clareza (Prioridade: P1)

Como cliente, quero conferir os dados do produto e os preços das opções antes de selecioná-las, para comparar as alternativas e entender o valor aplicável.

**Por que esta prioridade**: O preço e as opções fazem parte da decisão de compra e devem estar visíveis antes da interação que define a combinação.

**Teste independente**: Abrir produtos com e sem atributos e com preços por combinação; verificar os dados apresentados antes da seleção, alterar uma opção e conferir o preço correspondente.

**Cenários de aceitação**:

1. **Dado** um produto publicado, **quando** o cliente abre sua visualização, **então** vê nome, descrição quando cadastrada, imagem, preço e opções disponíveis.
2. **Dado** que uma opção ou combinação tenha preço próprio, **quando** o cliente ainda não selecionou uma opção, **então** cada variação e seu preço correspondente estão visíveis antes da seleção.
3. **Dado** um produto com opções, **quando** o cliente escolhe uma delas, **então** a seleção é apresentada com controle visual no estilo checkbox, somente uma opção compatível fica selecionada dentro do grupo correspondente e o preço exibido reflete a seleção válida.
4. **Dado** que o produto possua mais de um atributo, **quando** o cliente escolhe valores, **então** as escolhas permanecem associadas ao produto e respeitam as combinações e a disponibilidade atuais.
5. **Dado** um produto sem variações, **quando** o cliente abre sua visualização, **então** o produto continua apresentando seu preço atual sem controles de seleção desnecessários.
6. **Dado** um produto ou combinação que deixou de estar disponível enquanto a página estava aberta, **quando** o cliente prossegue, **então** a solicitação é revalidada e não é registrada com opção ou preço obsoleto.

### História 3 — Consultar estimativa sem escolher o dia (Prioridade: P1)

Como cliente, quero consultar o prazo e a data estimada de um produto sem precisar escolher o dia, para entender a previsão de entrega ou conclusão.

**Por que esta prioridade**: A estimativa deve informar o cliente sem exigir a escolha de um dia.

**Teste independente**: Configurar estimativas por variação, abrir a página pública do produto, selecionar uma variação e confirmar que seu prazo e previsão provisória são apresentados, que é necessário escolher um profissional quando houver mais de um, que não é exigido dia ou horário e que o servidor reserva o horário mais próximo ao prosseguir.

**Cenários de aceitação**:

1. **Dado** um produto sem estimativa de entrega, **quando** o cliente o seleciona, **então** permanece disponível o fluxo atual de escolha de data, profissional e horário, com suas regras de disponibilidade e validação.
2. **Dado** um produto com estimativa de entrega configurada, **quando** o cliente abre sua visualização, **então** vê uma mensagem de prazo, por exemplo “Prazo estimado: até 15 dias”, uma data provisória calculada a partir do dia seguinte à data local atual da empresa e escolhe um profissional quando houver mais de um elegível, sem precisar escolher data ou horário.
3. **Dado** um produto com estimativa de entrega, **quando** o cliente prossegue, **então** o servidor atribui e reserva o horário disponível mais próximo para o profissional escolhido, registra o agendamento pendente com a forma de pagamento selecionada e apresenta a data oficial recalculada a partir do dia seguinte à data local de criação do pedido.
4. **Dado** um produto com configuração de prazo ausente ou inválida, **quando** o cliente o consulta, **então** o sistema não inventa uma data e comunica de forma explícita que a estimativa não está disponível, sem apresentar o produto como tendo um prazo calculado.
5. **Dado** um produto preexistente sem estimativa de entrega, **quando** é consultado, **então** mantém o comportamento atual de exigir agendamento.

### História 4 — Configurar prazo estimado de entrega (Prioridade: P1)

Como usuário autorizado do backoffice, quero editar o prazo em dias por produto e característica relevante, para evitar preencher repetidamente variações que não afetam o prazo e informar ao cliente a previsão de entrega ou conclusão.

**Por que esta prioridade**: O prazo estimado pode variar conforme a variação selecionada e deve refletir a operação específica de cada opção.

**Teste independente**: Criar e editar produtos com e sem estimativa, validar os dados no backoffice e conferir a apresentação pública e o fluxo de agendamento aplicável.

**Cenários de aceitação**:

1. **Dado** um produto novo ou existente, **quando** o backoffice salva estimativas válidas, **então** elas ficam associadas às variações correspondentes daquele produto.
2. **Dado** um produto sem estimativa de entrega, **quando** o cliente o seleciona, **então** o produto permanece sujeito ao fluxo atual de agendamento.
3. **Dado** um produto com variações e estimativas válidas, **quando** o cliente seleciona uma variação, **então** o prazo correspondente àquela variação fica disponível para apresentação e o cliente não precisa escolher o dia.
4. **Dado** uma estimativa inválida ou não preenchida quando obrigatória, **quando** o backoffice tenta salvar, **então** o sistema rejeita a configuração com uma mensagem clara.
5. **Dado** um usuário sem permissão ou de tenant diferente, **quando** tenta alterar a configuração, **então** a alteração é negada.
6. **Dado** um produto com atributos, **quando** o usuário escolhe a característica relevante e define um prazo para uma opção, **então** o backoffice aplica o valor às combinações compatíveis, sem exigir preenchimento separado para tecido, cor ou outros atributos.
7. **Dado** um grupo cujas combinações possuem prazos diferentes, **quando** o usuário abre ou salva o serviço sem confirmar a unificação, **então** os prazos existentes são preservados e o conflito e seus valores são apresentados.
8. **Dado** um grupo conflitante, **quando** o usuário informa um prazo único e confirma explicitamente a substituição, **então** o prazo é aplicado às combinações do grupo ao salvar.
9. **Dado** o simulador administrativo com um sofá de 3 lugares de 20 dias e duas poltronas de 3 dias, **quando** as quantidades são selecionadas, **então** apresenta 26 dias; com um sofá de 2 lugares de 15 dias e duas poltronas, apresenta 21 dias.
10. **Dado** um produto sem prazo válido ou uma seleção cujo prazo não possa ser identificado, **quando** participa da simulação, **então** o backoffice identifica o problema e não apresenta um total parcial como definitivo.

#### Limites do agrupamento e da simulação

- O prazo geral e os prazos por característica são controles de edição no backoffice. Para produtos com atributos, o salvamento continua expandindo os prazos em `variantPrices`, uma vez por combinação completa, conforme o contrato e as validações existentes.
- A escolha do atributo relevante e a indicação de herança não são novos campos persistidos. Quando não houver evidência suficiente para reconstruí-las a partir dos valores, o usuário deve escolher novamente; a interface não deve apresentar uma inferência ambígua como configuração salva.
- Abrir o editor, alterar dados não relacionados ou mudar a seleção de agrupamento não pode substituir valores legados. Preços, promoções, imagens e dados dos demais produtos devem ser preservados.
- O simulador soma prazo individual multiplicado pela quantidade, não modifica dados nem cria pedidos e identifica explicitamente que não representa o cálculo real do agendamento. Os fluxos existentes de cliente e servidor continuam recebendo um único produto e resolvendo seu prazo pela combinação exata.
- Não há migração, nova coleção, modificação em massa de dados existentes, alteração do cliente, do colaborador, das Functions, do domínio compartilhado ou do fluxo de booking.

## Requisitos funcionais

### Promoções

- **FR-001**: O sistema MUST permitir que um usuário autorizado do backoffice configure por produto o estado ativo ou inativo da promoção e os preços original e promocional; produtos com variações MUST permitir configurar esses preços para cada variação.
- **FR-002**: O preço promocional MUST ser estritamente menor que o preço original da mesma variação. O sistema MUST validar essa regra antes de salvar e apresentar erro explícito para valores ausentes, inválidos ou iguais ou superiores ao preço original.
- **FR-003**: A vitrine pública MUST apresentar, antes da listagem convencional, uma seção contendo produtos publicados, ativos e com promoção ativa.
- **FR-004**: A seção de promoções MUST apresentar o preço original riscado em vermelho, o preço promocional como valor principal e uma indicação visual de promoção.
- **FR-005**: Produto sem promoção ou com promoção inativa MUST manter a apresentação regular e MUST NOT ser divulgado como promocional.
- **FR-006**: O preço comunicado como vigente ao cliente MUST ser o mesmo valor que o servidor valida e usa ao registrar a operação correspondente. O cliente MUST NOT ser autoridade para determinar preço, desconto ou elegibilidade da promoção.
- **FR-007**: Em produtos com variações, os preços original e promocional MUST corresponder à variação selecionada e não podem apresentar um preço sem correspondência com a combinação aplicável.
- **FR-008**: Mudanças de promoção MUST ser isoladas ao tenant autorizado e MUST NOT alterar produtos de outra empresa.

### Visualização e seleção do produto

- **FR-009**: A visualização MUST apresentar nome, descrição disponível, imagem, preço e opções do produto.
- **FR-010**: Quando houver preços diferentes entre opções ou combinações, a visualização MUST mostrar cada variação e seu preço antes da seleção que os determina.
- **FR-011**: A seleção visual MUST usar controles no estilo checkbox e permitir somente uma opção por atributo; a seleção de uma opção em cada atributo MUST formar uma combinação válida, substituindo a opção anteriormente selecionada no mesmo atributo e mantendo a seleção ligada ao produto correto.
- **FR-012**: O valor apresentado após a seleção MUST corresponder às opções selecionadas e às regras de disponibilidade atuais do produto.
- **FR-013**: Produtos sem opções ou sem variação de preço MUST continuar compreensíveis e compráveis pelo comportamento aplicável, sem controles de seleção desnecessários.
- **FR-014**: O sistema MUST validar novamente no servidor que o produto, a opção, a combinação e o preço continuam válidos no momento de prosseguir.

### Agendamento e prazo estimado

- **FR-015**: O agendamento MUST ser exigido por padrão; quando houver estimativa de entrega configurada, a experiência pública MUST apresentar a estimativa, permitir escolha do profissional quando houver mais de um elegível e não exigir escolha manual de data ou horário.
- **FR-016**: Para produtos sem estimativa de entrega, o sistema MUST preservar o fluxo atual de seleção e validação de disponibilidade, profissional, data e horário.
- **FR-017**: O backoffice MUST poder configurar a quantidade de dias estimados para entrega ou conclusão de cada variação do produto.
- **FR-017A**: O backoffice MUST permitir editar um prazo geral ou por opção de um atributo escolhido e aplicá-lo às combinações compatíveis, preservando o contrato de prazo por combinação.
- **FR-017B**: O backoffice MUST identificar e exibir conflitos legados e seus valores e MUST NOT substituir os prazos conflitantes sem confirmação explícita; o salvamento sem unificação MUST preservá-los.
- **FR-017C**: O backoffice MUST oferecer simulação sem persistência da soma dos prazos individuais multiplicados pelas quantidades, indicar dados ausentes e distinguir a simulação de pedidos reais.
- **FR-018**: Para produto com estimativa válida, a experiência pública MUST apresentar o prazo em dias e a data estimada correspondentes à variação selecionada; o cliente MUST poder escolher o profissional quando houver mais de um elegível, e MUST NOT precisar escolher data ou horário.
- **FR-019**: A apresentação da estimativa MUST distinguir previsão de data confirmada. Antes do envio do pedido, a data provisória MUST ser calculada em dias corridos, incluindo fins de semana, a partir do dia seguinte à data local atual da empresa. Ao criar o pedido, o servidor MUST recalcular a data oficial a partir do dia seguinte à data local do instante de criação, utilizando o fuso horário da empresa; a data estimada MUST ser independente da data futura do horário reservado.
- **FR-020**: Para produto com estimativa, o servidor MUST atribuir o horário disponível mais próximo para o profissional escolhido e criar o agendamento e a reserva de disponibilidade usando as validações e garantias transacionais atuais. O cliente MUST NOT enviar uma data/horário arbitrário para determinar essa atribuição.
- **FR-021**: A estimativa MUST ser configurada para cada variação do produto e isolada entre empresas.
- **FR-022**: Produto legado sem estimativa de entrega MUST preservar o comportamento atual de exigir agendamento.
- **FR-023**: O servidor MUST validar os dados recebidos, a configuração vigente do produto, a associação com o profissional, a disponibilidade e a reserva concorrente. Produto com estimativa MUST criar um agendamento normal com horário atribuído pelo servidor; se não houver horário reservável, a operação MUST falhar explicitamente e MUST NOT apresentar sucesso.
- **FR-024**: O registro histórico da solicitação MUST preservar o preço efetivo, o preço original e os dados da promoção aplicada à variação selecionada.
- **FR-025**: O checkout MUST permitir registrar uma forma de pagamento entre débito, crédito, dinheiro e Pix. Para crédito, MUST permitir registrar de 1 a 5 parcelas sem juros. A forma e a quantidade de parcelas aplicáveis MUST ser preservadas no histórico do agendamento; o sistema MUST NOT processar pagamentos nem integrar provedor.
- **FR-026**: Para pedido com estimativa, o histórico MUST preservar a quantidade de dias estimados, a data oficial estimada calculada no momento da criação e o fuso horário da empresa usado no cálculo.
- **FR-027**: Cada combinação válida de opções MUST ser apresentada como um único controle selecionável, contendo seus rótulos combinados e preço efetivo. A seleção MUST representar uma opção válida por atributo e selecionar outra combinação MUST substituir a combinação anterior.
- **FR-028**: A vitrine MUST apresentar o prazo estimado em dias no card quando o serviço tiver prazo único ou igual em todas as combinações. Quando os prazos variarem entre combinações, o card MUST informar que o prazo depende da opção, e a tela de agendamento MUST apresentar o prazo correspondente à combinação selecionada.
- **FR-029**: Para cada período de expediente, os horários iniciais disponíveis MUST avançar pela duração real do serviço selecionado, a partir do início do período. O horário final de cada opção MUST ser o horário inicial acrescido dessa duração.
- **FR-030**: A mesma regra de cadência e duração MUST ser validada pelo servidor na busca de disponibilidade, criação pública e reagendamento. Expediente, pausas, bloqueios, agendamentos existentes, reservas, fuso horário e proteção contra conflitos MUST continuar sendo respeitados.
- **FR-031**: A interface de horários MUST apresentar início e fim de cada opção no fuso horário da empresa, usando os horários retornados pelo servidor e sem recalcular a disponibilidade no cliente.
- **FR-032**: Durante a busca de profissionais, o cliente MUST apresentar um indicador visual e o texto “Buscando profissionais, aguarde...”. Esse estado MUST ser distinto do carregamento inicial do catálogo e do envio do agendamento; falha e ausência de profissionais MUST continuar distinguíveis.
- **FR-033**: O aviso existente sobre estimativa de entrega MUST manter suas informações funcionais, incluir um emoji de aviso e receber destaque visual suficiente para ser identificado durante o agendamento.
- **FR-034**: O nome do cliente permanece obrigatório para concluir um agendamento; os demais requisitos atuais de contato e consentimento não são alterados por esta especificação.

## Requisitos não funcionais

- **NFR-001 — Isolamento multi-tenant**: Leitura e alteração de produtos, promoções, configuração de agendamento e dados relacionados MUST respeitar o tenant e o papel autorizados; identificadores enviados pelo cliente não substituem a autorização.
- **NFR-002 — Integridade financeira**: Valores monetários MUST manter precisão e significado consistentes entre cadastro, apresentação ao cliente, cálculo de comissão aplicável e registro histórico.
- **NFR-003 — Compatibilidade**: Produtos e agendamentos existentes sem os novos dados MUST continuar sendo lidos sem erro e manter o comportamento anterior.
- **NFR-004 — Integridade de agendamento**: Produtos que exigem agendamento MUST continuar sujeitos às verificações atuais de expediente, pausa, bloqueio, agendamento e reserva contra conflito. A cadência entre inícios MUST seguir a duração do serviço e ser consistente na apresentação, criação e reagendamento. A atribuição automática para produtos com estimativa MUST reservar um horário real pelo mesmo mecanismo transacional e MUST NOT permitir conflito ou duplicidade.
- **NFR-005 — Clareza e acessibilidade**: Preço original, preço vigente, indicação de promoção, opções selecionadas, estimativa e estados de erro MUST ser distinguíveis e compreensíveis em telas móveis e desktop, com controles acessíveis.
- **NFR-006 — Falhas explícitas**: Dados inválidos, preços ou combinações indisponíveis e falhas ao prosseguir MUST ser comunicados como falhas; o sistema MUST NOT indicar sucesso com dados incompletos ou inconsistentes.
- **NFR-007 — Simplicidade arquitetural**: A especificação MUST preservar as fronteiras de responsabilidade existentes e não introduzir infraestrutura ou dependências sem justificativa.

## Regras de negócio

- **BR-001**: A promoção é configurada e ativada individualmente por produto; em produtos com variações, os preços original e promocional são definidos por variação.
- **BR-002**: Promoção inativa não altera o preço vigente nem gera identificação visual de promoção.
- **BR-003**: Produto sem promoção permanece na listagem convencional e mantém sua apresentação regular.
- **BR-004**: O preço efetivamente usado ao prosseguir deve ser resolvido a partir da configuração vigente e da combinação de opções válida, nunca de um valor arbitrário enviado pelo cliente.
- **BR-005**: O agendamento é exigido por padrão; quando há estimativa de entrega, o cliente escolhe o profissional se houver mais de um elegível (se houver apenas um, ele é selecionado automaticamente), mas não escolhe data ou horário. O servidor atribui o horário disponível mais próximo e cria a reserva. A configuração da estimativa de um produto não altera outro produto nem o fluxo de outra empresa.
- **BR-006**: A estimativa apresenta prazo previsto de entrega/conclusão, não confirma a entrega ou execução. O horário de atendimento atribuído e reservado é distinto da data estimada.
- **BR-007**: Produto legado sem estimativa de entrega mantém o comportamento atual de exigir agendamento.
- **BR-008**: A seleção atual de personalizações permite uma opção por atributo e admite combinações entre atributos. A nova apresentação não pode invalidar combinações, preços ou escolhas persistidas já suportados sem decisão explícita.
- **BR-009**: O histórico da solicitação preserva o preço efetivo, o preço original e os dados da promoção aplicada à variação selecionada, mesmo que a configuração do produto mude posteriormente.
- **BR-010**: Regras de comissão, preço, disponibilidade e estado de agendamento existentes continuam aplicáveis conforme a configuração e o fluxo definidos para o produto.
- **BR-011**: A forma de pagamento e, para crédito, o número de parcelas são dados informativos do pedido; não representam pagamento autorizado, capturado ou recebido.
- **BR-012**: Cada período de expediente produz horários candidatos iniciando no começo do período e avançando pela duração do serviço; um candidato só é oferecido quando todo o intervalo do atendimento cabe no expediente e não conflita com pausas, bloqueios, agendamentos ou reservas.
- **BR-013**: O nome informado permanece obrigatório no agendamento. A estimativa exibida no card é o número configurado de dias, não uma data de entrega confirmada; combinações com prazos diferentes são identificadas como dependentes da opção.

## Análise arquitetural: implementação atual

Esta seção descreve evidências do código observado para orientar a especificação. Não define a solução técnica da implementação futura.

### Cadastro e atualização no backoffice

- A página de produtos abre e lista produtos através de `backoffice/src/pages/ProductsPage.tsx`; o formulário de criação e edição está em `backoffice/src/components/organisms/ProductEditor/ProductEditor.tsx`.
- O formulário atual configura nome, descrição, imagem, preço, duração, comissão, estado ativo, atributos e preços por combinação. Ele faz verificações locais de valores numéricos, galeria e preços.
- O serviço administrativo chama a função `saveProduct` em `backoffice/src/services/admin.service.ts`. O endpoint de produto é protegido por autorização de backoffice; o processamento confiável e a persistência de produto ficam em `functions/src/services/backoffice.service.ts`.
- `validateProductInput` valida, no servidor, campos, preços em centavos, duração, comissão, estado, atributos e preços das combinações. `saveProduct` verifica o tenant do ator e salva o produto e sua projeção pública na mesma transação.

### Modelo de produto, variações e persistência

- O tipo compartilhado em `shared/domain/interfaces/product.interface.ts` define atributos, opções, seleções, preços de combinação em centavos e produtos.
- O documento interno do produto, em `functions/src/model/product.model.ts`, contém `tenantId`, preço base, duração, comissão, estado e dados opcionais de personalização e preço por combinação. O modelo público contém a projeção dos dados necessários ao catálogo.
- As coleções são nomeadas em `functions/src/config/collections.ts`. Produtos internos e públicos, atributos e galerias são mantidos em coleções de nível superior; o repositório não usa subcollections para esses dados.
- `functions/src/services/backoffice.service.ts` grava o registro interno em `products` e a projeção pública em `public_products`, ambos associados à empresa. Regras em `firestore.rules` permitem leitura pública de projeções publicadas e ativas, mas negam escrita direta; operações administrativas passam por Functions autorizadas.
- Produtos antigos podem não conter os campos opcionais de personalização e preço por combinação. Os fluxos existentes têm compatibilidade com esses campos ausentes.

### Preços e registro histórico

- O preço base é persistido como inteiro em centavos. `shared/domain/product-price.ts` resolve o preço de uma combinação a partir das seleções e dos preços por variante.
- O catálogo público carrega o preço base e os preços de combinações em `client/src/services/catalog.service.ts`; o endpoint de catálogo público em `functions/src/functions/catalog/get-public-catalog.ts` também projeta dados públicos para a experiência renderizada.
- A vitrine em `client/src/components/templates/CompanyCatalogTemplate/CompanyCatalogTemplate.tsx` exibe atualmente o preço base no card. O resumo em `client/src/components/organisms/BookingServiceSummary/BookingServiceSummary.tsx` resolve e apresenta o preço da combinação selecionada.
- Ao criar agendamento, `functions/src/services/booking.service.ts` busca novamente o produto interno, valida opções e resolve o preço no servidor. A transação registra `productPriceCentsSnapshot` e os valores de comissão no documento do agendamento. Assim, a implementação atual preserva o preço efetivo registrado, mas não contém campos de preço original ou promoção.

### Vitrine e visualização/seleção de produto

- A vitrine por empresa lista produtos públicos ativos e publicados. `client/src/pages/CompanyCatalogPage.tsx` e `client/src/components/templates/CompanyCatalogTemplate/CompanyCatalogTemplate.tsx` apresentam os cards e direcionam o cliente para a página do produto.
- A visualização usada no fluxo público é a página de agendamento. `client/src/pages/BookingPage.tsx` carrega o catálogo e produto; `BookingReady` em `client/src/components/organisms/BookingReady/index.tsx` organiza o resumo, disponibilidade, dados do cliente e confirmação.
- `BookingServiceSummary` apresenta imagem, descrição, nome e preço selecionado. Cada atributo atualmente usa um `<select>` próprio, permitindo uma opção por atributo; a função `resolveProductPriceCents` escolhe o preço da combinação.
- O modelo existente de variações permite várias dimensões simultâneas, por exemplo cor e tamanho, e guarda preços associados às combinações. A seleção visual no estilo checkbox mantém uma opção por atributo para formar uma combinação válida.

### Agendamento, associação com produto e validação

- O cliente busca disponibilidade e solicita agendamento em `client/src/pages/BookingPage.tsx`, com apresentação do resumo em `client/src/components/organisms/BookingAvailability/BookingAvailability.tsx` e do formulário de contato em `client/src/components/organisms/BookingCustomerDetails/BookingCustomerDetails.tsx`.
- A chamada pública é tratada por `functions/src/functions/appointments/create-public-appointment.ts` e `functions/src/services/booking.service.ts`. O servidor valida o negócio publicado, o produto ativo do tenant, o profissional ativo, a associação profissional-produto, as opções, a imagem, a data/hora, a disponibilidade, a duração e a reserva contra conflito.
- O modelo em `functions/src/model/appointment.model.ts` exige `productId`, `professionalId`, `startsAt`, `endsAt`, estado e snapshots comerciais. O agendamento referencia o produto e o profissional por identificadores e preserva nome, imagem, preço e comissão utilizados no momento da solicitação.
- As reservas de horário são registros separados na coleção de nível superior `booking_reservations`, ligados ao identificador do agendamento. A equipe consulta e atualiza os agendamentos em `functions/src/services/appointment-operations.service.ts`, com filtros e alterações limitados ao tenant autorizado.
- O fluxo atual requer `professionalId` e `startsAt` na entrada validada pelo backend. Não foi identificado um fluxo público de checkout/pedido independente de agendamento que possa ser afirmado como destino dos produtos sem horário.
- O fuso horário da empresa é usado pelo backend de disponibilidade e agendamento. `functions/src/services/booking.service.ts` valida a data local no fuso de `tenant.timezone`; a apresentação de datas no cliente inclui `America/Sao_Paulo` em utilitários existentes. A estimativa usa a data local da empresa e começa no dia seguinte à compra, sem assumir que toda empresa usa o mesmo fuso.

### Validações atuais

- **Frontend de backoffice**: `ProductEditor.tsx` valida números, combinações, imagens e dados do formulário antes do envio.
- **Backend de produto**: `functions/src/services/backoffice.service.ts` valida os dados novamente e garante propriedade do tenant antes de persistir produto e projeção pública.
- **Frontend do cliente**: carrega somente produtos publicados e ativos e apresenta a combinação selecionada; o estado e a navegação controlam escolhas de data, profissional e horário.
- **Backend de catálogo e agendamento**: as Functions resolvem registros no servidor, restringem dados por empresa e revalidam preço, opção, status, autorização, associação e disponibilidade. O valor enviado ou exibido pelo navegador não substitui a resolução autoritativa.
- **Regras Firestore**: `firestore.rules` nega escrita direta às coleções de produtos e agendamentos; os fluxos de escrita são mediados por funções de servidor.

## Restrições arquiteturais

- Firebase continua sendo a infraestrutura principal; Firestore continua sendo o armazenamento de dados.
- As funções existentes são Firebase Functions v2. Novas regras de negócio devem respeitar a separação entre cliente, backoffice, funções confiáveis e domínio compartilhado.
- A aplicação permanece multi-tenant; produtos, promoções, estimativas e solicitações devem manter isolamento obrigatório por empresa e autorização por papel.
- Não introduzir subcollections, novas infraestruturas ou dependências sem justificativa técnica aprovada.
- Preservar compatibilidade com documentos existentes sem os novos campos, mantendo o comportamento atual por padrão.
- Preservar o fluxo e as invariantes atuais de disponibilidade para qualquer produto que exija agendamento.
- A especificação define resultados de negócio. Estrutura final de campos, índices, validações técnicas, fluxos de checkout e decisões de persistência devem ser tratadas em etapa posterior, após resolver as questões abertas.

## Entidades-chave

- **Produto**: item pertencente a uma empresa, com preço, estado, atributos/opções, configuração de agendamento e, potencialmente, dados de promoção e estimativa.
- **Promoção**: estado ativo/inativo associado ao produto e preços original e promocional associados ao produto ou, quando houver variações, a cada variação.
- **Atributo e opção do produto**: grupo e valores selecionáveis, atualmente combináveis em mais de um atributo por produto.
- **Seleção do cliente**: conjunto de escolhas válidas que identifica uma opção ou combinação para um produto durante o fluxo público.
- **Agendamento/pedido**: solicitação vinculada ao tenant, produto e profissional, com data/horário reservados e snapshots comerciais, incluindo os valores e dados da promoção aplicados à variação selecionada e a forma de pagamento/parcelamento escolhidos.
- **Estimativa**: prazo em dias corridos para cada variação, contado a partir do dia seguinte à data local de criação do pedido, e data derivada; o prazo, data oficial e fuso usado são preservados no histórico. Antes da criação, a data é provisória e calculada a partir do dia seguinte à data local atual. O horário de atendimento é atribuído automaticamente pelo servidor e reservado como agendamento normal, sem escolha manual de data/horário pelo cliente.

## Critérios de sucesso

- **SC-001**: Em todos os cenários de teste, 100% dos produtos com promoção ativa e válida são identificados na seção de promoções, e nenhum produto com promoção inativa é apresentado como oferta.
- **SC-002**: Em todos os cenários de variação e promoção, o preço exibido para a escolha válida coincide com o preço validado pelo servidor ao prosseguir; nenhum valor arbitrário enviado pelo navegador é usado como preço autoritativo.
- **SC-003**: Em todos os cenários com produto sem variação ou produto legado sem nova configuração, a apresentação e o fluxo permanecem compatíveis com o comportamento atual.
- **SC-004**: Em todos os cenários de produto sem estimativa de entrega, a solicitação continua sujeita a validação de profissional, data, horário e disponibilidade, sem perda de proteção contra reserva duplicada.
- **SC-005**: Em todos os cenários de produto com estimativa de entrega, o cliente consegue visualizar a estimativa da variação selecionada, escolhe um profissional quando houver mais de um elegível, não escolhe data ou horário, e o servidor cria um agendamento pendente no horário disponível mais próximo com uma reserva válida e dados de pagamento informativos.
- **SC-006**: Tentativas de leitura ou alteração fora do tenant autorizado não revelam nem alteram dados de outra empresa.
- **SC-007**: Para cada regra ainda sem definição, o planejamento começa somente após registrar uma decisão explícita, evitando datas, descontos ou fluxos de pedido inventados.
- **SC-008**: Para serviços com durações distintas, os horários apresentados e aceitos pelo servidor avançam pela duração do serviço; cada término corresponde à duração configurada e nenhum candidato conflita com as restrições de disponibilidade vigentes.
- **SC-009**: Os controles de combinação apresentam rótulos e preço efetivo juntos; os cards apresentam prazo único ou indicam claramente quando ele depende da opção.
- **SC-010**: A busca de profissionais, o aviso de estimativa e os estados de erro/ausência são identificáveis e compreensíveis em dispositivos móveis, sem alterar a obrigatoriedade do nome.

## Casos limite e cenários de exceção

- Promoção ativa com preço original ou promocional inválido, ausente ou negativo.
- Promoção alterada ou desativada enquanto o cliente mantém a vitrine ou a página do produto aberta.
- Produto promovido com uma variação sem preço original ou promocional configurado.
- Combinação de atributos sem preço próprio ou removida depois que o cliente abriu a página.
- Produto publicado que deixa de estar ativo ou deixa de pertencer à empresa selecionada antes do envio.
- Produto com estimativa de entrega ausente, zero, negativa ou fora dos limites que vierem a ser definidos.
- Variação selecionada sem prazo estimado próprio ou com configuração de prazo inválida.
- Troca de mês/ano, virada de dia, fuso com mudança de offset e diferença entre data/hora da compra e data local da empresa durante o cálculo estimado.
- Nenhum profissional elegível, nenhum horário dentro do horizonte de disponibilidade atual ou conflito concorrente ao reservar o horário mais próximo.
- Produto com apenas um profissional elegível (seleção automática) e produto com mais de um (escolha obrigatória).
- Forma de pagamento ausente/inválida, parcelas informadas para forma diferente de crédito ou crédito com menos de 1 ou mais de 5 parcelas.
- Produto legado sem campo de promoção, agendamento ou estimativa.
- Falha de comunicação ou de validação do servidor: a interface não deve exibir preço promocional, estimativa confirmada ou sucesso de envio sem confirmação compatível.

## Questões em aberto

Não há questões pendentes entre os pontos tratados nesta rodada de esclarecimento.

## Premissas

- Produtos existentes sem configuração nova continuam exigindo agendamento e conservam preço, disponibilidade e opções atuais.
- O preço cadastrado e os valores promocionais são valores monetários expressos em reais e devem ser mantidos com precisão equivalente à representação atual em centavos.
- A configuração da promoção e das estimativas por variação é gerenciada pelo backoffice autorizado da empresa proprietária do produto.
- A seleção permanece limitada às opções e combinações cadastradas pelo backoffice.
- O pedido é representado por um agendamento normal com horário atribuído automaticamente; a forma de pagamento e as parcelas são somente informativas e não pressupõem integração, cobrança ou confirmação de pagamento.
- As decisões desta rodada estão registradas em Clarifications; novas ambiguidades que alterem o comportamento ou o escopo devem ser esclarecidas antes de avançar.
