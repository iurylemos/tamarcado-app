# Especificação: Personalização dinâmica de produtos no agendamento

**Feature Branch**: `006-product`  
**Criada**: 2026-10-08  
**Status**: Aprovada pelo usuário  
**Escopo**: cadastro de produtos no `backoffice`, catálogo e agendamento no
`client`, persistência no backend e exibição nas telas existentes de agenda do
`collaborator`, incluindo armazenamento e apresentação das galerias de imagens.

## Objetivo

Permitir que cada produto ou serviço tenha atributos de personalização
configuráveis, como cor e tecido. O backoffice define os atributos, as opções
válidas e a opção padrão de cada produto. Durante o agendamento, o cliente
seleciona os valores daquele pedido, confere-os no resumo do serviço e envia as
escolhas junto com a solicitação. As escolhas devem ser validadas e preservadas
no agendamento para consulta pela equipe.

A descrição do produto continua sendo mantida pelo backoffice. O cliente pode
consultá-la, mas não a altera nem altera o cadastro compartilhado do produto.

Cada produto também possui uma galeria padrão obrigatória. O backoffice pode
cadastrar galerias adicionais para combinações exatas das opções do produto.
Durante o agendamento, a galeria acompanha as opções selecionadas; quando não
houver galeria específica para a combinação, a galeria padrão é usada.

## Contexto e decisões

- Nesta especificação, “categoria” ou “variação” refere-se a um atributo e às
  opções que o cliente pode selecionar para um produto, como Cor: Preto/Branco
  ou Tamanho: Casal/King; não é uma categoria global para organizar produtos.
- A tela de cadastro de produto já permite ao backoffice editar a descrição.
  Essa continua sendo a fonte de verdade da descrição apresentada ao cliente.
- Produtos podem ter zero ou mais atributos configurados. Produtos sem atributos
  mantêm o fluxo atual de agendamento.
- Os atributos são dinâmicos por produto: o backoffice pode cadastrar nomes,
  como “Cor”, “Tecido” ou outros, e definir uma lista de opções para cada um.
- A configuração de atributos é opcional por produto. Quando um produto possui
  atributos, cada atributo oferece pelo menos duas opções cadastradas e é
  obrigatório no agendamento. A opção padrão definida pelo backoffice aparece
  selecionada inicialmente; o cliente pode substituí-la por outra opção
  cadastrada.
- A opção padrão é um valor real da lista, não um fallback especial do sistema.
  Caso o negócio queira representar “não informado”, pode cadastrar esse texto
  como opção e defini-lo como padrão.
- A galeria padrão do produto é obrigatória e possui de uma a dez imagens. Ela
  também funciona como fallback visual para combinações sem galeria própria.
- Para produtos existentes, a imagem atual do produto deve ser preservada e
  tratada como a primeira imagem da galeria padrão até que o backoffice a
  substitua ou adicione outras imagens.
- O backoffice pode cadastrar de uma a dez imagens para uma combinação exata de
  opções. Combinações não são geradas automaticamente; o usuário cadastra
  somente as galerias específicas que possui.
- Imagens são enviadas como arquivos JPEG, PNG ou WebP, com até 5 MB cada, pelo
  backoffice. O catálogo publicado pode ler as imagens e apenas o backoffice
  autenticado da empresa pode adicionar ou remover arquivos do escopo daquela
  empresa.
- Remover uma imagem da galeria também apaga o arquivo do armazenamento de
  imagens. Como consequência aceita, uma imagem removida pode deixar de
  carregar em agendamentos históricos que apontem para ela.
- No catálogo, os cards usam a primeira imagem da galeria padrão. No agendamento,
  a primeira imagem da galeria efetiva é apresentada em destaque no topo do
  resumo e as imagens restantes em um carrossel com miniaturas. A galeria efetiva
  é a da combinação exata selecionada, ou a padrão como fallback.
- As opções e descrições configuradas no produto não são alteradas pelo cliente.
  As escolhas do cliente pertencem somente ao agendamento correspondente.
- O backend valida as escolhas contra a configuração atual do produto e grava
  uma cópia dos rótulos e valores selecionados no agendamento. Alterações
  posteriores no cadastro não reescrevem os agendamentos existentes.
- Os agendamentos históricos sem escolhas personalizadas continuam válidos e
  devem continuar sendo exibidos sem erro.
- Não será criada uma nova tela administrativa de agenda. As escolhas serão
  exibidas nas superfícies de agendamento já existentes para a equipe, incluindo
  a agenda do colaborador.

## Histórias de usuário e testes

### História 1 - Configurar atributos de um produto (Prioridade: P1)

Como usuário do backoffice, quero configurar os atributos, as opções e uma opção
padrão para cada produto, para que o cliente possa informar os detalhes
necessários ao serviço.

**Teste independente**: Criar ou editar um produto, cadastrar atributos com
opções diferentes, definir um padrão para cada atributo e verificar que a
configuração é exibida no produto e disponibilizada ao catálogo público.

**Cenários de aceitação**:

1. **Dado** um produto em edição, **quando** o backoffice adiciona um atributo,
   **então** pode definir o nome, pelo menos duas opções disponíveis e
   exatamente uma opção padrão para esse atributo.
2. **Dado** um produto com atributos, **quando** o backoffice atualiza ou remove
   uma opção ou atributo, **então** o cadastro passa a refletir a configuração
   atual sem alterar os valores já registrados em agendamentos anteriores.
3. **Dado** um produto sem atributos, **quando** o backoffice salva o produto,
   **então** o produto continua disponível sem exigir configurações de
   personalização.
4. **Dado** um produto com descrição, **quando** o backoffice edita e salva a
   descrição, **então** o catálogo e o resumo do serviço apresentam a descrição
   salva; o cliente não dispõe de controles para alterá-la.
5. **Dado** um atributo com menos de duas opções ou sem uma opção padrão válida,
   **quando** o backoffice tenta salvar o produto, **então** o cadastro é
   rejeitado com uma mensagem que identifica o atributo inválido.

### História 2 - Personalizar o serviço durante o agendamento (Prioridade: P1)

Como cliente, quero selecionar os valores disponíveis para o serviço que estou
agendando e conferi-los no resumo, para que o negócio receba os detalhes
específicos da minha solicitação.

**Teste independente**: Abrir um serviço com atributos, alterar uma ou mais
opções padrão, verificar o resumo e concluir a solicitação. Confirmar também que
um serviço sem atributos continua agendável pelo fluxo atual.

**Cenários de aceitação**:

1. **Dado** um produto com atributos configurados, **quando** o cliente inicia o
   agendamento, **então** cada atributo apresenta suas opções e inicia com o
   padrão cadastrado pelo backoffice selecionado.
2. **Dado** um atributo com pelo menos duas opções e um padrão selecionado,
   **quando** o cliente escolhe outra opção válida, **então** o resumo mostra o
   valor escolhido, sem alterar o cadastro do produto.
3. **Dado** um produto com mais de um atributo, **quando** o cliente seleciona
   os valores, **então** o resumo identifica cada atributo e seu valor
   correspondente.
4. **Dado** um produto sem atributos, **quando** o cliente agenda o serviço,
   **então** não são apresentados controles de personalização e o fluxo atual
   permanece disponível.
5. **Dado** um produto inativo, **quando** o cliente tenta iniciar ou enviar um
   agendamento para ele, **então** a solicitação é rejeitada conforme as regras
   existentes, mesmo que um link ou estado anterior ainda esteja aberto.

### História 3 - Receber e preservar as escolhas do agendamento (Prioridade: P1)

Como colaborador que atende o agendamento, quero ver os atributos escolhidos
para aquele pedido, para preparar o serviço de acordo com o que o cliente
informou.

**Teste independente**: Enviar um agendamento com atributos personalizados,
consultá-lo na agenda da equipe e confirmar que os valores registrados
continuam iguais após uma edição posterior das opções do produto.

**Cenários de aceitação**:

1. **Dado** um agendamento válido com personalizações, **quando** o backend o
   registra, **então** salva os valores selecionados e seus rótulos como uma
   cópia associada àquele agendamento.
2. **Dado** um agendamento registrado, **quando** o colaborador o consulta nas
   telas existentes de agenda, **então** pode identificar os atributos e valores
   personalizados recebidos.
3. **Dado** que o backoffice alterou ou removeu uma opção após um agendamento,
   **quando** a equipe consulta esse agendamento, **então** continua vendo os
   rótulos e valores que foram registrados originalmente.
4. **Dado** um agendamento histórico sem personalizações, **quando** ele é
   consultado ou atualizado pelas telas existentes, **então** continua
   funcionando sem exigir os novos campos.
5. **Dado** um envio com atributo obrigatório ausente, opção inexistente,
   atributo que não pertence ao produto ou produto de outro negócio,
   **quando** o backend valida a solicitação, **então** rejeita o envio e não
   cria o agendamento.
6. **Dado** um agendamento com uma combinação que possui imagens próprias,
   **quando** o backend o registra, **então** salva a URL da imagem principal
   efetivamente apresentada como imagem do produto naquele agendamento e as
   telas da equipe a usam no card do agendamento.

### História 4 - Cadastrar e visualizar imagens por variação (Prioridade: P1)

Como usuário do backoffice, quero associar imagens a uma combinação de opções
do produto, para que o cliente veja a versão correta do item ao selecionar suas
variações.

Como cliente, quero ver uma galeria que corresponda às opções selecionadas,
para identificar visualmente o produto ou serviço que estou solicitando.

**Teste independente**: Cadastrar imagens padrão e uma galeria para uma
combinação específica, abrir o produto no catálogo e no agendamento, selecionar
a combinação e verificar a imagem principal e o carrossel. Selecionar uma
combinação sem galeria específica e verificar o fallback para as imagens
padrão.

**Cenários de aceitação**:

1. **Dado** um produto novo ou existente, **quando** o backoffice o salva,
   **então** deve haver de uma a dez imagens na galeria padrão.
2. **Dado** um produto com atributos, **quando** o backoffice cadastra uma
   galeria de variação, **então** seleciona exatamente uma opção existente de
   cada atributo para identificar a combinação e associa de uma a dez imagens a
   ela.
3. **Dado** uma galeria, **quando** o backoffice seleciona arquivos, **então**
   são aceitos apenas JPEG, PNG ou WebP de até 5 MB cada; arquivos incompatíveis
   ou acima do limite são recusados com mensagem clara.
4. **Dado** que o produto possui uma galeria para a combinação selecionada,
   **quando** o cliente escolhe essa combinação, **então** a imagem principal e
   o carrossel do resumo do serviço mostram essa galeria.
5. **Dado** que não existe uma galeria para a combinação selecionada, **quando**
   o cliente muda uma ou mais opções, **então** imagem principal e carrossel
   mostram a galeria padrão.
6. **Dado** um produto sem atributos, **quando** o cliente o vê no catálogo ou
   inicia seu agendamento, **então** a galeria padrão é obrigatória e exibida
   sem controles de variação.
7. **Dado** uma galeria cadastrada, **quando** o cliente abre o card do produto
   no catálogo, **então** o card usa a primeira imagem da galeria padrão.
8. **Dado** que o backoffice remove uma imagem da galeria, **quando** a remoção
   é concluída, **então** o arquivo correspondente é apagado do armazenamento;
   se o arquivo não puder ser apagado, a falha é apresentada e não é reportada
   como sucesso.
9. **Dado** uma conta sem o papel de backoffice ativo ou pertencente a outra
   empresa, **quando** tenta enviar ou remover imagens, **então** a operação é
   negada. As imagens usadas no catálogo publicado permanecem legíveis
   publicamente.

## Requisitos funcionais

- **FR-001**: O backoffice MUST permitir configurar zero ou mais atributos em
  cada produto, sem limitar os nomes dos atributos a “Cor” ou “Tecido”.
- **FR-002**: Cada atributo MUST possuir um nome, pelo menos duas opções
  selecionáveis e exatamente uma opção padrão pertencente à sua própria lista.
- **FR-003**: O cadastro MUST rejeitar atributos com menos de duas opções, com
  opções duplicadas ambíguas ou com opção padrão inexistente.
- **FR-004**: A descrição do produto MUST continuar sob controle do backoffice e
  MUST NOT ser editável pelo cliente durante o agendamento.
- **FR-005**: O catálogo público MUST fornecer ao cliente apenas as
  personalizações configuradas para o produto e negócio atuais.
- **FR-006**: O resumo “RESUMO DO SERVIÇO” MUST apresentar, além dos dados atuais
  do produto, cada atributo e o valor selecionado quando existirem atributos.
- **FR-007**: Atributos MUST ser opcionais por produto. Para cada atributo
  configurado, o cliente MUST escolher exatamente uma opção dentre pelo menos
  duas opções válidas; a opção padrão MUST iniciar selecionada e o cliente MUST
  poder substituí-la por outra opção válida.
- **FR-008**: Um produto sem atributos MUST continuar compatível com o fluxo de
  agendamento existente.
- **FR-009**: O cliente MUST NOT poder adicionar opções arbitrárias nem alterar
  permanentemente o produto; as escolhas enviadas MUST ser limitadas às opções
  configuradas para o produto.
- **FR-010**: A solicitação de agendamento MUST transportar os identificadores
  das escolhas, e o backend MUST validar que há exatamente uma opção válida para
  cada atributo configurado, sem opções extras ou identificadores repetidos,
  contra o produto ativo do negócio antes de criar o agendamento.
- **FR-011**: O backend MUST derivar os rótulos e valores persistidos a partir da
  configuração confiável do produto, sem confiar em nomes ou descrições enviados
  pelo cliente.
- **FR-012**: O agendamento MUST preservar uma cópia dos atributos e valores
  selecionados e a URL da imagem principal selecionada no momento do pedido,
  para que alterações futuras no produto não modifiquem o histórico. A exclusão
  física da imagem continua podendo torná-la indisponível, conforme FR-021.
- **FR-013**: As telas existentes de agenda da equipe MUST apresentar as escolhas
  persistidas quando houver valores registrados e MUST tolerar registros
  históricos sem esses valores.
- **FR-014**: A validação, disponibilidade, isolamento por negócio, preço,
  duração, comissão, consentimento e transições de status existentes MUST
  continuar aplicáveis sem alteração causada pelas personalizações.
- **FR-015**: Cada produto MUST possuir uma galeria padrão com pelo menos uma e
  no máximo dez imagens; esta galeria MUST ser usada no card de catálogo e como
  fallback de combinações sem galeria própria.
- **FR-016**: O backoffice MUST permitir cadastrar uma galeria opcional por
  combinação exata de opções existentes, com pelo menos uma e no máximo dez
  imagens por galeria. Uma combinação MUST identificar exatamente uma opção
  para cada atributo configurado.
- **FR-017**: O upload MUST aceitar somente arquivos JPEG, PNG ou WebP de até
  5 MB cada e MUST apresentar erro explícito para arquivos inválidos,
  incompletos ou acima do limite.
- **FR-018**: O backoffice MUST poder enviar e remover arquivos de imagem
  somente no escopo da própria empresa. A leitura das imagens publicadas no
  catálogo MUST ser pública.
- **FR-019**: A interface do agendamento MUST exibir a primeira imagem da galeria
  efetiva como imagem principal e as imagens restantes em um carrossel com
  miniaturas. A galeria efetiva MUST corresponder à combinação exata selecionada
  ou à galeria padrão quando essa combinação não tiver galeria cadastrada.
- **FR-020**: O card de catálogo MUST exibir a primeira imagem da galeria padrão;
  produto sem atributos continua exigindo e usando essa galeria.
- **FR-021**: A remoção de uma imagem MUST apagar também seu arquivo no
  armazenamento.
  A interface MUST NOT comunicar sucesso se a remoção do arquivo falhar.

## Dados de mock e cenários de teste

Os mocks e fixtures devem partir dos dados presentes em
`functions/test/fixtures/seed-data.ts` e preservar os casos existentes:

- `Studio Aurora` e `Clínica Horizonte` continuam como negócios de referência.
- `service-corte` e `service-consulta` continuam sem atributos, cobrindo
  compatibilidade e agendamento sem personalização.
- `service-hidratacao` permanece inativo, cobrindo a rejeição de serviços
  inativos.
- `service-coloracao` passa a exemplificar um produto com atributo dinâmico
  “Cor”, opções “Padrão”, “Castanho” e “Loiro”, com “Padrão” definido como
  opção padrão pelo backoffice, galeria padrão e pelo menos uma galeria de cor
  específica.
- Um novo produto de exemplo relacionado a estofados deve exercitar o atributo
  “Tecido”, com opções “Padrão”, “Linho”, “Suede” e “Veludo”, com “Padrão”
  definido como opção padrão pelo backoffice, galeria padrão e ao menos uma
  galeria específica de tecido.
- Um produto de cama deve exercitar o atributo “Tamanho”, com as opções “Casal”
  e “King”, galerias diferentes para as combinações que possuam imagens e
  fallback padrão para uma combinação sem galeria própria.
- Produtos atuais sem atributos devem ter uma galeria padrão, cobrindo o uso da
  imagem atual como primeira imagem e a migração/compatibilidade das URLs
  existentes. Se os novos produtos entrarem no seed integrado de agendamento,
  devem possuir também negócio, profissional, associação e disponibilidade
  suficientes para um fluxo válido.
- Pelo menos um agendamento de teste deve registrar uma escolha personalizada,
  permitindo validar a exibição para o colaborador e a preservação histórica.
- Deve existir também um agendamento legado sem dados de personalização para
  comprovar compatibilidade com documentos antigos.

Os testes automatizados devem cobrir, no mínimo:

1. Criação e edição de atributos, opções e padrão no backoffice.
2. Exibição do padrão selecionado, troca de opção e atualização do resumo no
   cliente.
3. Produto sem atributos, produto inativo e produto sem descrição.
4. Rejeição no backend para atributo ausente, opção desconhecida, atributo
   alheio ao produto e produto de outro negócio.
5. Persistência dos rótulos/valores confiáveis e exibição na agenda da equipe.
6. Imutabilidade dos valores históricos após edição do produto e leitura de
   agendamento legado sem personalizações.
7. Upload de arquivos aceitos/recusados, limite de imagens, autorização por
   empresa, remoção de arquivo e falha de remoção.
8. Card público usando a imagem padrão, galeria do resumo acompanhando a
   combinação, fallback padrão e navegação acessível no carrossel.

## Casos limite

- Um atributo é removido enquanto um cliente mantém uma página de agendamento
  aberta.
- Uma opção previamente selecionada é desativada ou removida antes do envio.
- Um atributo possui menos de duas opções ou não contém uma opção padrão válida.
- O cliente envia identificadores extras, repetidos ou pertencentes a outro
  produto.
- A configuração de produto recebida pelo catálogo está ausente ou malformada.
- Um arquivo possui extensão válida mas MIME incompatível, tamanho superior a
  5 MB ou falha no meio do upload.
- A metadata da galeria é salva, mas o upload ou a remoção do arquivo falha; a
  operação não deve ser apresentada como totalmente bem-sucedida.
- Uma combinação de opções ainda não tem galeria própria e deve usar a padrão.
- Uma URL de imagem persistida em um agendamento deixa de carregar após a
  exclusão física aceita do arquivo.
- Um cliente altera a opção padrão no produto enquanto outro agendamento está
  sendo preenchido; cada solicitação deve ser validada contra a configuração
  vigente no momento do envio.
- Um agendamento antigo não possui o campo de personalizações.
- A descrição do produto é atualizada depois de um agendamento já registrado;
  essa edição não altera as escolhas históricas.

## Critérios de sucesso

- **SC-001**: Um usuário autorizado do backoffice consegue configurar atributos
  e opções por produto sem depender de nomes de campos codificados no cliente.
- **SC-002**: Um cliente consegue conferir no resumo os valores selecionados e
  enviar um agendamento válido sem editar o cadastro do produto.
- **SC-003**: O backend rejeita escolhas ausentes ou incompatíveis com o produto
  e negócio, sem criar solicitações inválidas.
- **SC-004**: A equipe consegue consultar as escolhas registradas no agendamento,
  mesmo após mudanças posteriores no cadastro do produto.
- **SC-005**: Produtos e agendamentos antigos sem atributos personalizados
  continuam funcionando.
- **SC-006**: Os testes usam os registros mock atuais como casos de compatibilidade
  e incluem novos casos para cor, tecido, validação e histórico.
- **SC-007**: A galeria do agendamento corresponde à combinação selecionada ou
  usa a galeria padrão quando não há imagens específicas, e o card do catálogo
  mantém a imagem principal padrão.
- **SC-008**: O backoffice só consegue enviar ou remover imagens da própria
  empresa; formatos, tamanhos e quantidade inválidos são recusados com erro
  explícito.

## Fora de escopo

- Permitir que o cliente edite permanentemente um produto, suas opções ou sua
  descrição.
- Permitir que o cliente crie opções livres ou texto personalizado não
  configurado pelo backoffice.
- Alterar preço, duração, comissão ou disponibilidade em função das escolhas,
  salvo se uma especificação futura definir regras comerciais para isso.
- Criar uma nova tela de agenda no backoffice ou alterar relatórios financeiros.
- Implementar o código ou alterar fixtures como parte desta especificação.

## Premissas

- O backoffice continua sendo a autoridade para nome, descrição e configuração
  de atributos/opções de um produto.
- A configuração dos atributos é opcional por produto; quando presente, cada
  atributo possui ao menos duas opções, uma opção padrão cadastrada e exige um
  valor selecionado no agendamento.
- As escolhas pertencem ao agendamento, não ao cliente nem ao produto.
- O backend é a autoridade para validar e produzir os valores históricos
  persistidos.
- Os mocks existentes são os dados de seed em `functions/test/fixtures/seed-data.ts`
  e os mocks específicos dos testes de client, backoffice, collaborator e
  Functions.
