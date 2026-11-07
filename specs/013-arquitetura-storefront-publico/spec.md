# Especificação: Arquitetura do Storefront Público

**Feature Branch**: não criada; branch atual `feat/implements-new-css`  
**Criada**: 2026-11-07  
**Status**: Desenho aprovado em conversa; aguardando revisão desta especificação  
**Input**: avaliação da entrega das páginas públicas do `client` diretamente pelo Hosting.

## Escopo e limites

Esta especificação implementa geração estática com Vite e React, sem adotar outro
framework. A raiz e cada catálogo autorizado em `/empresa/{slug}` serão gerados
como HTML durante o build, incluindo metadados próprios por empresa. As rotas
profundas de agendamento usarão o shell estático do cliente e continuarão carregando
e validando dados pelos serviços existentes no navegador.

O renderizador `renderStorefront` deixa de atender todas as rotas públicas. Para
permitir isso sem novas consultas de produtos ou profissionais no build, as rotas
profundas não terão conteúdo, metadados ou status HTTP específicos na resposta
HTML inicial. Links compartilháveis, navegação, histórico, validação e isolamento
multi-tenant devem continuar funcionando depois do carregamento do cliente.

A lista de slugs será obtida da coleção pública `public_businesses`, filtrada por
`published == true`. O build emitirá somente campos públicos permitidos, validará
slugs e duplicidade, e falhará explicitamente diante de dados ausentes ou
inconsistentes. Não serão criadas consultas de produtos, profissionais,
disponibilidade ou agendamentos para gerar páginas.

Atualizações e remoções serão publicadas no próximo build e deploy autorizado do
Hosting. Não será criada infraestrutura nem gatilho por alteração no Firestore;
portanto, não há propagação automática nem SLA entre uma alteração cadastral e a
próxima publicação. O Hosting servirá a raiz e os catálogos como arquivos estáticos
e direcionará somente as rotas profundas ao shell estático. Nenhuma Function será
invocada para entregar HTML público.

O escopo de implementação limita-se ao `client` e à configuração do site client em
`firebase.json`. Não altera `collaborator`, `backoffice`, Functions, regras do
Firestore ou lógica autoritativa de agendamento.

## Cenários de usuário e testes

### História 1 — Abrir e compartilhar o endereço de uma empresa (Prioridade: P1)

Como visitante ou empresa, quero abrir e compartilhar um link individual que
identifique a empresa na resposta inicial, para encontrar o negócio correto e
gerar prévias úteis.

**Teste independente**: acessar diretamente dois slugs publicados e inspecionar
resposta HTML, prévia e identidade de cada empresa sem executar scripts; abrir e
atualizar uma rota profunda e verificar seu funcionamento após o carregamento do
cliente.

1. **Dado** um slug publicado contemplado na publicação, **quando** o link é
   aberto diretamente, **então** a resposta inicial contém a identidade pública
   e os metadados apropriados somente daquela empresa.
2. **Dado** o compartilhamento desse link, **quando** um consumidor de prévias lê
   a resposta inicial, **então** encontra título, descrição e imagem adequados,
   com alternativas públicas seguras quando campos opcionais não existirem.
3. **Dado** o acesso à raiz, **quando** a página é carregada, **então** ela
   orienta a obter o link da empresa sem listar ou pesquisar empresas.
4. **Dado** um link profundo de agendamento, **quando** ele é aberto ou atualizado,
   **então** o shell estático carrega e os serviços existentes validam os dados no
   cliente; seu HTML inicial não promete metadados nem status HTTP específicos
   daquela rota.
5. **Dado** que o visitante navegue entre catálogo e agendamento, **quando** usa
   os controles internos ou voltar/avançar do navegador, **então** a navegação SPA
   preserva a URL e reutiliza dados já carregados sem recarregar o documento.

### História 2 — Distinguir ausência de falha (Prioridade: P1)

Como visitante, quero entender quando um link não existe ou quando a informação
está indisponível, sem receber dados de outro negócio.

**Teste independente**: exercitar slug inexistente, inválido e falha de dados,
verificando mensagem, código de resposta aplicável e ausência de dados alheios.

1. **Dado** um slug de catálogo comprovadamente inexistente ou não publicado na
   publicação vigente, **quando** `/empresa/{slug}` é solicitado, **então** recebe
   resposta 404 e uma página de não encontrado. Em rota profunda, ausência de
   produto ou empresa é apresentada pelo cliente após o carregamento do shell.
2. **Dado** falha na obtenção de dados, **quando** o conteúdo não puder ser
   carregado, **então** o erro é identificado como falha, não como inexistência,
   com orientação de nova tentativa e sem dados de outro negócio.
3. **Dado** dados inválidos, duplicados ou inconsistentes, **quando** são
   preparados para publicação, **então** a publicação falha de forma explícita
   em vez de escolher um negócio arbitrariamente.

### História 3 — Atualizar e manter páginas públicas (Prioridade: P2)

Como responsável pela operação, quero que publicação, alteração e retirada de
uma empresa tenham comportamento verificável, para que links não exponham dados
indevidos nem permaneçam incorretos indefinidamente.

**Teste independente**: em ambiente isolado, publicar, alterar e retirar dados
de duas empresas e verificar a propagação, isolamento, falhas e reversão.

1. **Dado** um cadastro novo ou alterado, **quando** a publicação aplicável for
   concluída, **então** a resposta inicial reflete a versão publicada correta.
2. **Dado** um cadastro retirado, **quando** a retirada for concluída, **então**
   sua página deixa de expor o cadastro e retorna 404 após a invalidação aplicável.
3. **Dado** falha na preparação ou publicação, **quando** o processo termina,
   **então** ela é comunicada e não é tratada como sucesso. Uma versão anterior
   só pode ser restaurada se não republicar conteúdo retirado; depois de uma
   retirada, deve-se gerar uma nova publicação a partir da fonte atual.

### Casos extremos

- Slug vazio, codificação inválida, caracteres fora da regra e rotas desconhecidas.
- Cadastro ausente, não publicado, slug duplicado, troca de slug ou campos obrigatórios inválidos.
- Cadastro criado após o último build; retirada antes da próxima publicação.
- Fonte indisponível durante build ou após publicação; respostas e prévias em cache.
- Acesso direto ou refresh de subrotas existentes, com e sem JavaScript.
- Produto inválido em rota profunda, navegação voltar/avançar e dados do catálogo já em cache.
- Falha de hidratação, imagens externas indisponíveis e reabertura do PWA.

## Requisitos

### Requisitos funcionais

- **FR-001**: O endereço `/empresa/{slug}` MUST identificar somente a empresa
  pública correspondente ao slug publicado.
- **FR-002**: O HTML inicial de cada empresa publicada contemplada MUST conter
  nome e metadados específicos suficientes para indexação e compartilhamento,
  sem depender da execução de JavaScript.
- **FR-002a**: Rotas profundas de agendamento MUST ser atendidas pelo shell
  estático e MUST NOT depender do renderizador por requisição. Seu HTML inicial
  não terá metadados ou status HTTP específicos por empresa/produto; dados e
  estados de produto inválido serão resolvidos depois do carregamento do cliente.
- **FR-003**: A raiz MUST continuar neutra, sem diretório, busca ou listagem.
- **FR-004**: O build MUST obter slugs somente de `public_businesses` com
  `published == true` e emitir apenas a projeção pública necessária. MUST NOT
  consultar produtos, profissionais, disponibilidade ou agendamentos para SSG;
  dados privados e de outros tenants MUST NOT ser expostos.
- **FR-005**: Slugs de catálogo inválidos ou ausentes da publicação vigente MUST
  receber 404 estático; falha de build MUST ser diferenciada de ausência. Rotas
  profundas respondem com o shell estático e mostram estados de não encontrado
  ou erro no cliente, sem prometer status HTTP dinâmico.
- **FR-006**: O processo MUST especificar como slugs novos, alterações, remoções,
  falhas, caches e reversões serão propagados e verificados. Uma alteração ou
  retirada só aparecerá após o próximo build/deploy; não haverá gatilho automático
  por alteração no Firestore nem SLA de propagação.
- **FR-007**: A entrega da raiz, dos catálogos e do shell de agendamento MUST NOT
  depender de `renderStorefront` ou de outra Function. Arquivos estáticos MUST ter
  precedência sobre rewrites e as rotas profundas MUST resolver para o shell.
- **FR-008**: Navegação SPA, links profundos, voltar/avançar, interatividade,
  acessibilidade e instalação/reabertura do PWA MUST ser preservados. A navegação
  interna MUST NOT recarregar o documento e MUST reutilizar dados já carregados
  quando disponíveis. Qualquer regressão dos fluxos existentes bloqueia a mudança.
- **FR-009**: A proposta MUST comparar alternativas e registrar limitações de
  renderização, atualização, custos, build, publicação e reversão; a decisão é
  Vite + React SSG sem framework adicional.
- **FR-010**: Preparação e publicação MUST falhar explicitamente diante de dados
  inválidos, inconsistentes ou indisponíveis, sem revelar dados sensíveis nos logs.
- **FR-011**: A proposta MUST definir testes observáveis para respostas,
  metadados, isolamento, desempenho e ausência de invocações do renderizador.

### Entidades principais

- **Cadastro público de empresa**: identidade publicada associada a um único
  slug e tenant; contém somente dados autorizados para divulgação.
- **Página publicada**: representação pública de uma versão de cadastro para um
  slug, com seus metadados e estado de publicação.
- **Publicação**: conjunto consistente de páginas, arquivos e versão recuperável;
  mantém evidência de criação, atualização e retirada.

## Critérios de sucesso

- **SC-001**: 100% de uma amostra de pelo menos dois slugs publicados diferentes
  apresenta identidade e metadados próprios no HTML inicial, com scripts desativados.
- **SC-002**: 100% dos testes de slug inválido, inexistente e retirado após
  propagação para rotas de catálogo recebe 404 e não exibe dados de outro negócio.
  Rotas profundas recebem o shell estático; produto inválido aparece como estado
  de não encontrado após o carregamento do cliente.
- **SC-003**: Em todos os testes de indisponibilidade, ausência e falha são
  diferenciadas; nenhum erro é apresentado como sucesso.
- **SC-004**: Acesso direto, refresh, navegação SPA e histórico do navegador
  funcionam para todos os padrões de rota existentes. A Spec 010 permanece
  preservada quanto ao fluxo funcional, mas sua expectativa de SSR/metadados e
  status específicos em rotas profundas é explicitamente substituída nesta etapa.
- **SC-005**: Em medição comparativa repetível no mesmo ambiente e com os mesmos
  dados, o p75 de LCP móvel não piora em mais de 5% e o p75 de TTFB não piora;
  registrar valores absolutos, amostra e condições, não apenas porcentagens.
- **SC-006**: 100% dos acessos de teste à raiz e às páginas estáticas contempladas
  e às rotas profundas são atendidos sem invocações do renderizador atual.
- **SC-007**: Criação, edição e retirada de dois tenants são demonstradas na versão
  de teste do Hosting após novo build/deploy; HTML reflete somente a publicação
  mais recente.
- **SC-008**: 100% das transições internas entre catálogo e agendamento ocorrem
  sem navegação de documento. Quando os dados necessários já estiverem carregados,
  não são repetidas consultas correspondentes a esses dados. A mediana e p75 do
  tempo de transição serão medidos antes/depois nas mesmas condições e o p75
  deverá ser inferior à linha de base.

## Premissas e dependências

- `public_businesses` com `published == true` é a fonte autorizada da lista de
  slugs. A consulta é limitada a essa coleção pública; nenhum outro domínio de
  dados é enumerado pelo build.
- Uma alteração cadastral só se propaga no próximo build/deploy do Hosting.
  Não existe neste escopo gatilho automático para alterações do Firestore.
- Uma publicação do Hosting é consistente para os arquivos da versão. Cache de
  HTML não será prolongado; assets com hash podem ser cacheados como imutáveis.
  Caches de terceiros para prévias sociais não são controláveis.
- Reverter para uma versão antiga pode republicar uma empresa retirada. Após uma
  retirada, a recuperação segura é um novo build/deploy com a fonte atual; rollback
  de snapshot antigo não é seguro.
- Para rotas profundas, a Spec 010 continua como referência do fluxo funcional e
  da autoridade do backend, mas esta etapa aprova a remoção do SSR e dos metadados
  e status HTTP individualizados na resposta inicial.
