# Plano de Implementação: Promoções, experiência de compra e agendamento opcional

**Branch**: `012-promocoes-agendamento-opcional` | **Data**: 2026-11-02 | **Spec**: [spec.md](./spec.md)

**Entrada**: Especificação de funcionalidade em `specs/012-promocoes-agendamento-opcional/spec.md`.

## Resumo

Estender o cadastro e a projeção pública dos produtos para suportar promoções e prazos por combinação, mantendo `priceCents` como preço original e calculando o preço efetivo no domínio compartilhado. O cliente apresentará ofertas, preços por combinação e uma previsão provisória de entrega. No envio, o backend lerá novamente produto, tenant e profissional, resolverá o preço e a estimativa vigentes e, para produto com prazo, atribuirá e reservará o horário disponível mais próximo sem receber dia/horário escolhido pelo cliente. O resultado continuará sendo um agendamento pendente nas coleções e fluxos atuais, incluindo snapshots comerciais, previsão oficial e dados informativos da forma de pagamento.

Não haverá coleção `orders`, integração/cobrança de pagamento, provedor novo, migração de dados ou alteração das regras de leitura/escrita do Firestore. Produtos e agendamentos antigos permanecem válidos sem os campos opcionais novos.

## Contexto técnico

**Linguagem/versão**: TypeScript 6.x; Node.js 24 para Firebase Functions; React 19 nas aplicações web.

**Dependências principais**: React, Vite, Firebase Web SDK, Firebase Functions v2, Firestore, Vitest e Firebase Emulator Suite já existentes. Nenhuma dependência nova prevista.

**Persistência**: Cloud Firestore, nos documentos existentes `products`, `public_products`, `public_businesses`, `appointments`, `booking_reservations` e `appointment_notification_jobs`. A escrita de produto continua atualizando documento interno e projeção pública na transação já existente; o agendamento continua usando a transação e reservas existentes.

**Testes**: Vitest em cada workspace; testes de Functions com Firebase Emulator Suite quando dependem de Firestore/Auth/Functions; builds TypeScript/Vite por workspace. Os testes críticos cobrirão validação financeira, autorização/tenant, projeção, resolução de combinação, agendamento automático e concorrência de reserva.

**Plataforma**: Aplicações web separadas (`client`, `backoffice`, `collaborator`) e Firebase Functions v2 em Node.js 24. O cliente tem catálogo renderizado por Vike/SSR e leitura pública do catálogo no navegador.

**Tipo de projeto**: Monorepo npm com três aplicações web, backend confiável compartilhado e domínio TypeScript independente da UI.

**Metas de desempenho**: Preservar os padrões atuais de consulta e disponibilidade. A listagem de promoções precisa usar consulta pública indexada; a atribuição do horário deve reutilizar a janela/horizonte existente de busca (31 dias), sem varredura ilimitada ou nova infraestrutura.

**Restrições**:
- Valores monetários permanecem inteiros em centavos; o cliente nunca é autoridade de preço/desconto.
- Promoção, estimativa, profissional, preço, forma de pagamento e parcelas são validados no servidor.
- O horário automático é uma reserva real e deve manter a proteção contra conflito e dupla marcação.
- A estimativa usa dias de calendário no fuso IANA da empresa; a data provisória pré-checkout usa a data local atual e a data oficial é recalculada no instante de criação do pedido.
- Forma de pagamento e parcelas são informativas; não há cobrança, tokenização, integração ou confirmação de pagamento.
- Campos novos são opcionais ao ler documentos antigos. Não se exige backfill nem migração.
- A estimativa válida precisa corresponder ao produto/combinação selecionada. Se não existir horário reservável ou a reserva concorrente falhar, a operação falha explicitamente sem resposta de sucesso.

**Escopo técnico**: Backoffice, domínio compartilhado, projeções/validação no Functions, catálogo/fluxo público, leitura operacional de agendamentos no colaborador e índice composto da consulta pública promocional. O workspace `collaborator` só recebe os novos dados históricos necessários para que a equipe consulte o registro; as regras de status e reagendamento não mudam.

## Verificação da Constituição

**Gate inicial — aprovado**:

- **I. Integridade de domínio e fluxo**: cada catálogo continua sob o slug da empresa; cliente mantém seleção de produto, profissional quando aplicável e criação de agendamento. No fluxo de estimativa, só a escolha de dia/horário sai da UI: o backend atribui e reserva o horário.
- **II. Integridade de agendamento/disponibilidade**: produto sem estimativa permanece no fluxo atual; o novo fluxo usa validação de disponibilidade e reserva transacional existentes, sem criar um caminho de confirmação fora do agendamento.
- **III. Segurança/autorização**: persistência administrativa continua mediada por Function autenticada e escopada ao tenant; a criação pública resolve os dados atuais no servidor e não confia em preços/horários fornecidos pelo navegador.
- **IV. Consistência financeira**: preço vigente, preço original, desconto aplicado, comissão calculada sobre o preço efetivo, forma de pagamento e parcelas ficam explícitos e preservados no histórico.
- **V. Testabilidade/qualidade**: validação, cálculo de data, projeção, criação e concorrência terão testes de domínio, UI e Functions; os campos opcionais mantêm compatibilidade.
- **VI. Fronteiras de aplicação**: regra de preço/data no domínio compartilhado; persistência/autorização em Functions; UI em seus workspaces responsáveis.
- **VII. UX/acessibilidade**: seleção por combinação com controles agrupados e estado único por atributo; estados explícitos para sem profissional/horário, erro e confirmação; o prazo provisório não será apresentado como data confirmada.
- **VIII. Simplicidade**: extensões aos documentos e funções existentes, sem nova coleção, provedor, pacote ou serviço de pedidos.

**Gate pós-design — aprovado**: o modelo mantém os invariantes acima, inclui compatibilidade de leitura com documentos legados e não exige exceção à Constituição.

## Estrutura do projeto

### Documentação desta funcionalidade

```text
specs/012-promocoes-agendamento-opcional/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── catalogo-e-agendamento.md
```

`tasks.md` pertence à fase seguinte (`/speckit-tasks`) e não é criado por este planejamento.

### Código-fonte a ser afetado

```text
shared/domain/
├── interfaces/
│   ├── product.interface.ts
│   ├── appointment.interface.ts
│   ├── availability.interface.ts
│   └── tenant.interface.ts
├── product-price.ts
└── timezone.ts

backoffice/src/
├── components/organisms/ProductEditor/ProductEditor.tsx
├── interfaces/product.interface.ts
└── services/admin.service.ts

client/src/
├── interfaces/{company,appointment,booking,professional}.interface.ts
├── services/{catalog,appointment,availability,professional}.service.ts
├── pages/{CompanyCatalogPage,BookingPage}.tsx
├── components/templates/CompanyCatalogTemplate/CompanyCatalogTemplate.tsx
├── components/organisms/{BookingReady,BookingServiceSummary,BookingAvailability,BookingCustomerDetails,BookingReceiptDialog}/
└── utils/date.util.ts

functions/src/
├── model/{product,appointment,tenant}.model.ts
├── interfaces/availability.interface.ts
├── services/{backoffice,public-catalog,availability,booking,appointment-operations}.service.ts
└── functions/catalog/get-public-catalog.ts

collaborator/src/
├── interfaces/appointment.interface.ts
└── components/organisms/AppointmentCard/AppointmentCard.tsx

firestore.indexes.json
```

**Decisão de estrutura**: Manter cada alteração no workspace proprietário e reaproveitar tipos/regras em `shared/domain`. Não criar workspace, endpoint separado de pedidos ou coleção de pedidos.

## Arquivos e superfícies planejadas

### Backoffice e domínio do produto

- `shared/domain/interfaces/product.interface.ts`, `backoffice/src/interfaces/product.interface.ts` e `functions/src/model/product.model.ts`: representar `promotionActive`, preço promocional e prazo, com dados por combinação em `ProductVariantPrice` e campos de topo para produto sem atributos.
- `backoffice/src/components/organisms/ProductEditor/ProductEditor.tsx`: editar ativação da promoção, preço original/promocional e prazo por combinação; validar e exibir erros claros antes do envio.
- `backoffice/src/services/admin.service.ts` e `functions/src/services/backoffice.service.ts`: propagar os novos campos; validar no servidor a ativação e os preços em centavos; manter verificação de tenant/propriedade e salvar documento/projeção dentro da transação existente.

### Catálogo e seleção pública

- `functions/src/services/backoffice.service.ts`, `functions/src/model/tenant.model.ts`, `shared/domain/interfaces/tenant.interface.ts`, `client/src/interfaces/company.interface.ts`, `functions/src/functions/catalog/get-public-catalog.ts` e `client/src/services/catalog.service.ts`: incluir no contrato público apenas a informação necessária, inclusive fuso IANA da empresa para cálculo da previsão local. Ao ativar estimativa num produto existente, atualizar a projeção pública do fuso na mesma transação, sem backfill geral.
- `functions/src/services/public-catalog.service.ts` e `client/src/services/catalog.service.ts`: carregar campos promocionais/estimativa na projeção pública; campos promocionais inativos não devem aparecer como valor vigente. A consulta promocional pública usará `businessSlug`, `active`, `published` e `promotionActive`.
- `client/src/pages/CompanyCatalogPage.tsx` e `client/src/components/templates/CompanyCatalogTemplate/CompanyCatalogTemplate.tsx`: apresentar a seção de ofertas antes da listagem convencional, sem substituir a paginação atual.
- `shared/domain/product-price.ts`: consolidar resolução de preço original, preço efetivo e preço promocional para a combinação exata, reutilizada pelo resumo público e pelo backend.
- `client/src/components/organisms/BookingServiceSummary/BookingServiceSummary.tsx`: mostrar atributos/combinações e valores correspondentes antes da escolha; manter uma escolha por atributo com controles acessíveis no estilo checkbox e atualizar a combinação/preço sem perder a associação ao produto.

### Checkout e agendamento

- `shared/domain/interfaces/appointment.interface.ts`, `functions/src/model/appointment.model.ts`, `functions/src/interfaces/booking.interface.ts` e interfaces do client/collaborator: estender a entrada/saída e os snapshots do agendamento de forma opcional para leitura histórica.
- `client/src/pages/BookingPage.tsx`, `BookingAvailability`, `BookingReady`, `BookingCustomerDetails`, `BookingReceiptDialog` e `client/src/services/appointment.service.ts`: para produtos com estimativa, remover seleção manual de data/horário, permitir escolha do profissional quando houver mais de um, capturar forma de pagamento/parcelas e usar o horário/data oficial devolvidos pelo servidor. O fluxo atual de dia/horário continua para produtos sem estimativa.
- `functions/src/services/availability.service.ts`, `client/src/services/availability.service.ts`, `client/src/services/professional.service.ts` e `client/src/interfaces/professional.interface.ts`: reutilizar os dados de disponibilidade e o horizonte vigente; oferecer opções de profissionais elegíveis sem condicionar a seleção à escolha de uma data e localizar o horário mais próximo do profissional selecionado.
- `functions/src/services/booking.service.ts`: revalidar configuração vigente, combinação, preço, profissional, associação, tenant, forma de pagamento e parcelas; para estimativa, calcular horário no servidor e preservar a reserva/transação/notification job atuais.
- `shared/domain/timezone.ts`: oferecer cálculo de dias de calendário em data local (não soma fixa de milissegundos); cálculo provisório pode ocorrer no client com o fuso público, mas a data oficial e o snapshot são calculados no servidor.
- `collaborator/src/interfaces/appointment.interface.ts` e `collaborator/src/components/organisms/AppointmentCard/AppointmentCard.tsx`: expor à equipe o preço original/efetivo, dados de promoção, previsão e forma de pagamento/parcelas nos registros novos, mantendo leitura dos antigos.

### Firestore e segurança

- `firestore.indexes.json`: adicionar o índice composto necessário à consulta da seção de promoções, incluindo escopo de slug, estado ativo/publicado, promoção ativa e ordenação já usada.
- `firestore.rules`: **sem alteração planejada**. As projeções públicas já são somente leitura e as coleções internas continuam sem escrita direta. A Function é a autoridade de escrita.
- Não criar subcollection, coleção `orders`, nova regra de acesso, backfill, migração ou índice para gravação de pedidos.

### Testes relacionados

- Backoffice: validação/formulário e persistência de produto, cobrindo preço ausente/inválido, preço promocional igual/maior, promoção inativa e estimativa por combinação.
- Domínio/Functions: resolução da combinação, cálculo em centavos e data local; validação multi-tenant; projeção; seleção de profissional; atribuição de próximo horário; colisão de reserva; snapshot de promoção, estimativa, forma e parcelas; regressão do fluxo com dia/horário explícitos.
- Client: seção promocional antes do catálogo, produtos sem promoção/sem variação/legados, estado de previsão provisória, escolha por atributo e receipt com dados oficiais da Function.
- Collaborator: leitura de agendamentos antigos sem os campos e apresentação das snapshots novas.
- Revalidar os testes/builds das quatro aplicações/funções conforme os comandos em [quickstart.md](./quickstart.md).

## Riscos e decisões

1. **Atribuição de horário sem escolha do cliente**: encontrar um candidato e reservá-lo são operações separadas; uma corrida pode consumir o horário mais próximo. Revalidar dentro do fluxo transacional e, se necessário, recalcular o próximo candidato no horizonte vigente; se não for possível reservar, falhar explicitamente sem receipt de sucesso.
2. **Profissionais**: não inferir “profissional único” de slots de uma única data. A disponibilidade deve identificar os profissionais ativos associados ao produto e apresentar opções adequadas; o servidor revalida a associação e só aceita omissão de escolha quando exatamente um profissional aplicável existir.
3. **Data estimada e fuso**: divulgar o fuso da empresa no contrato público não divulga dado pessoal; é necessário para a previsão local antes do checkout. A Function continua sendo autoridade para a data oficial.
4. **Promoção legada/inativa**: campos opcionais ausentes equivalem a sem promoção/estimativa. Preço promocional inativo não altera o preço vigente. Não migrar registros existentes.
5. **Comissão**: calcular sobre o preço efetivo já resolvido (preço promocional quando ativo) usando a regra compartilhada/atual; snapshots existentes de comissão permanecem.
6. **Pagamento**: armazenar apenas método e parcelas. Não coletar dados de cartão, não processar pagamento nem sinalizar pagamento recebido.
7. **Índice de catálogo**: a consulta promocional separada exige validar o índice composto no Emulator Suite antes de publicação; nenhuma publicação/deploy faz parte deste plano.
8. **Compatibilidade de clientes durante a atualização**: a Function e os bundles públicos têm um contrato de entrada ampliado (pagamento e data/horário opcional condicional). A liberação futura deve coordenar os clientes com o backend e só habilitar a estimativa depois que o client compatível estiver disponível; este plano não executa deploy.

## Adendo aprovado em 2026-11-12 — experiência de seleção e cadência

Este adendo registra os requisitos aprovados na revisão da especificação e prevalece sobre as decisões anteriores somente nos comportamentos abaixo. A implementação permanece limitada ao código de `client/` e `functions/`, sem novo endpoint, alteração de schema/collections, regras Firestore, migração ou mudança no nome obrigatório.

### Decisões técnicas

- **Combinações no booking**: em combinações de produto explícitas, o cliente apresenta um único radio por combinação, com rótulos combinados e preço efetivo resolvido por `resolveProductPricing`. Selecionar uma combinação atualiza suas seleções de atributos; nenhuma combinação ou preço enviado pelo browser será autoridade no backend. Produtos sem combinações explícitas preservam os controles por atributo existentes.
- **Geração de horários**: `listAvailableSlots` e `searchAvailability` avançam o início pelo `durationMinutes` do produto, reiniciando no começo de cada período de expediente. O fim continua sendo início + duração. Expediente, pausas, bloqueios, agendamentos, reservas, fuso e proteção contra concorrência permanecem aplicáveis; `bookingIntervalMinutes` e seu armazenamento não são removidos nem migrados.
- **Validação consistente**: `isRequestedSlotAvailable` validará o início conforme a mesma cadência do produto, e `appointment-operations.service.ts` aplicará a regra à alteração de horário usando a duração preservada no agendamento. A criação transacional continua relendo os dados do produto e revalidando conflitos/reservas.
- **Apresentação de disponibilidade**: o `client` usa `startsAt` e `endsAt` retornados pelo backend, formatados no fuso público IANA da empresa; não calcula slots nem duração localmente. Durações em múltiplos valores serão cobertas por testes, inclusive 15, 60 e 120 minutos.
- **Cards de catálogo**: apresentar o prazo em dias quando ele for único ou igual em todas as combinações; se os prazos diferirem, apresentar uma indicação de dependência da opção. A tela de booking permanece a fonte do prazo exato da combinação escolhida. Aplicar a mesma regra nos cards de ofertas e catálogo convencional.
- **Estados e aviso**: reutilizar o estado de busca da disponibilidade, visualmente separado do carregamento inicial e do envio, com spinner e a mensagem aprovada. Destacar o aviso existente com emoji, cores e espaçamento, preservando seu texto funcional.
- **Nome**: permanece obrigatório; telefone, consentimento e pagamento mantêm as validações atuais.

### Superfícies e testes adicionais

- `client/src/components/organisms/BookingServiceSummary/BookingServiceSummary.tsx` e testes: controle único por combinação, preço efetivo, substituição da combinação selecionada e fallback por atributo.
- `client/src/components/templates/CompanyCatalogTemplate/CompanyCatalogTemplate.tsx` e testes de `CompanyCatalogPage`: estimativa nos cards de ofertas e catálogo, incluindo estimativas iguais e diferentes entre combinações.
- `client/src/components/organisms/BookingAvailability/BookingAvailability.tsx`, `client/src/utils/date.util.ts` e testes de `BookingPage`: término vindo do backend, fuso da empresa, estado de busca com texto/indicador, aviso destacado e estados de erro/ausência.
- `functions/src/services/availability.service.ts`, `functions/src/services/booking.service.ts` e `functions/src/services/appointment-operations.service.ts`: geração e validação da mesma cadência por duração, cobrindo expediente, períodos separados, pausas, conflitos e reagendamento.
- Testes focados em `client` e `functions`; não alterar `collaborator`, `backoffice`, `shared/domain`, regras Firestore, collections ou dados existentes.

## Complexidade

Não há violação constitucional que exija justificativa. As alterações se mantêm nos workspaces e documentos Firestore existentes; não se prevê infraestrutura ou dependência adicional.
