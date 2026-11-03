---
description: "Tarefas de implementação da Spec 012"
---

# Tasks: Promoções, experiência de compra e agendamento opcional

**Entrada**: artefatos de design em `specs/012-promocoes-agendamento-opcional/`

**Pré-requisitos**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/catalogo-e-agendamento.md` e `quickstart.md`.

**Organização**: fases por história de usuário; as quatro histórias têm prioridade P1. US4 precede US3 porque o fluxo público de estimativa depende da configuração e validação no backoffice.

**Restrições de implementação**: estender apenas documentos e serviços existentes em Firebase/Firestore/Functions v2. Não criar coleção `orders`, coleção de promoções, provedor de pagamento, infraestrutura ou dependência nova. Não fazer backfill ou migração. Manter `firestore.rules` sem alterações.

## Formato

- Toda tarefa usa `- [ ] Tnnn [P?] [USn?] descrição com caminho(s)`.
- `[P]` indica trabalho independente em arquivos distintos, sem dependência de tarefa incompleta.
- Tarefas de histórias carregam a etiqueta `[US1]` a `[US4]`; Setup, Fundacional e Polimento não carregam etiqueta de história.
- Tarefas de testes aparecem separadas e antes das tarefas de implementação correspondentes.

## Fase 1: Setup

**Propósito**: preparar a implementação.

O monorepo já contém os workspaces, dependências, Firebase, Firestore, Functions v2 e scripts de teste descritos no plano. Não há inicialização, infraestrutura ou dependência nova a executar nesta fase.

## Fase 2: Fundacional

**Propósito**: disponibilizar contratos e regras compartilhados necessários às histórias; concluir antes das fases de usuário.

- [ ] T001 [P] Criar ou estender testes unitários de `shared/domain/product-price.spec.ts` para resolução exata da combinação, preço original, preço promocional vigente e promoção ausente/inativa.
- [ ] T002 [P] Estender `shared/domain/interfaces/product.interface.ts` com campos opcionais de promoção e estimativa no produto e em `ProductVariantPrice`, preservando `priceCents` como preço original e tratando flags ausentes como falsos.
- [ ] T003 [P] Estender `shared/domain/interfaces/appointment.interface.ts` com os campos condicionais da entrada/saída de criação e os campos opcionais de snapshots históricos, sem tornar campos novos obrigatórios na leitura de registros legados.
- [ ] T004 [P] Adicionar `timezone?: string` ao tipo público da empresa em `shared/domain/interfaces/tenant.interface.ts` e `client/src/interfaces/company.interface.ts`, sem expor outros campos privados do tenant.
- [ ] T005 Implementar em `shared/domain/product-price.ts` a resolução compartilhada de preço original e efetivo por combinação válida; a promoção só é vigente quando ativa e válida, e a comissão continua baseada no preço efetivo.

**Checkpoint**: contratos compartilhados compiláveis, preço por combinação resolvido em centavos e campos opcionais compatíveis com documentos antigos.

## Fase 3: História 1 — Configurar e divulgar uma promoção (P1)

**Objetivo**: permitir que o tenant configure promoção válida e apresentar ofertas públicas com o mesmo preço vigente que o servidor usará.

**Teste independente**: criar/editar produtos simples e com combinações; verificar promoção ativa/inativa/ausente, rejeição de preço inválido e isolamento de tenant; confirmar seção pública anterior ao catálogo convencional e preço vigente correspondente ao da resolução no servidor.

### Testes da US1

- [ ] T006 [P] [US1] Estender `backoffice/src/pages/ProductsPage.spec.tsx` para criação/edição de promoção ativa e inativa, preço ausente/inválido e preço promocional igual ou superior ao original em produto simples e por combinação.
- [ ] T007 [P] [US1] Estender `functions/src/functions/products/manage-product.spec.ts` para validação autoritativa da promoção, atualização de `products` e `public_products` e rejeição de alteração fora do tenant.
- [ ] T008 [P] [US1] Estender `client/src/pages/CompanyCatalogPage.spec.tsx` e `client/src/services/catalog.service.spec.ts` para ofertas ativas publicadas/ativas, exclusão de ofertas inativas, preço por combinação e preservação de catálogo legado e paginação.

### Implementação da US1

- [ ] T009 [US1] Atualizar `backoffice/src/interfaces/product.interface.ts`, `backoffice/src/components/organisms/ProductEditor/ProductEditor.tsx` e `backoffice/src/services/admin.service.ts` para editar ativação e preços promocionais no produto ou em todas as combinações; ao ativar recurso em produto com atributos sem preços por combinação, materializar combinações válidas sem alterar seus preços-base.
- [ ] T010 [US1] Atualizar `functions/src/model/product.model.ts` e `functions/src/services/backoffice.service.ts` para validar a configuração no servidor e salvar produto/projeção na transação existente, mantendo autorização e propriedade do tenant; promoção ativa exige preço promocional inteiro não negativo e estritamente menor que `priceCents` do produto ou da própria combinação.
- [ ] T011 [P] [US1] Projetar os campos promocionais em `functions/src/services/public-catalog.service.ts` e `functions/src/functions/catalog/get-public-catalog.ts`; omitir ou neutralizar preço promocional quando `promotionActive` for falso.
- [ ] T012 [P] [US1] Estender `client/src/services/catalog.service.ts` e `client/src/pages/CompanyCatalogPage.tsx` com consulta pública de promoções filtrada por slug, `active == true`, `published == true` e `promotionActive == true`, sem substituir a paginação do catálogo normal.
- [ ] T013 [US1] Atualizar `client/src/components/templates/CompanyCatalogTemplate/CompanyCatalogTemplate.tsx` para apresentar ofertas antes da listagem convencional, com preço original riscado em vermelho, preço promocional destacado e identificação visual da promoção, preservando a apresentação regular de produtos sem promoção vigente.
- [ ] T014 [US1] Adicionar em `firestore.indexes.json` o índice composto da consulta promocional usando os filtros e ordenação definidos em `client/src/services/catalog.service.ts`; não alterar `firestore.rules`.

**Checkpoint**: salvamento autorizado e validação confiável no backend, projeção pública sem preço promocional inativo, seção de ofertas indexada e fluxo convencional preservado.

## Fase 4: História 2 — Escolher produto, opção e preço com clareza (P1)

**Objetivo**: exibir opções e preços antes da seleção e manter combinação, produto e preço correspondentes durante o fluxo público.

**Teste independente**: abrir produtos com e sem atributos, verificar preços de todas as combinações antes da seleção, trocar uma opção por atributo e confirmar preço/combinação válidos; a Function rejeita produto ou combinação obsoletos.

### Testes da US2

- [ ] T015 [P] [US2] Estender `client/src/pages/BookingPage.spec.tsx` e `functions/src/functions/appointments/create-public-appointment.spec.ts` para seleção por atributo, preço da combinação válida, ausência de controles desnecessários e rejeição no servidor de combinação/preço que deixou de ser válido.

### Implementação da US2

- [ ] T016 [US2] Atualizar `client/src/components/organisms/BookingServiceSummary/BookingServiceSummary.tsx` para apresentar as opções e preços correspondentes antes da seleção e usar controles acessíveis no estilo checkbox, com somente uma opção selecionada por atributo e preço resolvido pela combinação exata.
- [ ] T017 [US2] Atualizar `client/src/pages/BookingPage.tsx` para manter cada seleção ligada ao produto ativo, formar combinações válidas entre atributos e preservar a apresentação comprável de produtos sem opções ou sem variação de preço.
- [ ] T018 [US2] Atualizar `functions/src/services/booking.service.ts` para revalidar produto publicado/ativo, seleção, combinação e preço interno vigente antes de prosseguir; nunca aceitar preço, desconto ou elegibilidade promocional enviados pelo cliente.

**Checkpoint**: combinações selecionadas e preço apresentado correspondem aos dados atuais; produtos sem variações e produtos legados continuam compráveis.

## Fase 5: História 4 — Configurar prazo estimado de entrega (P1)

**Objetivo**: permitir configuração autorizada de prazo positivo no produto simples ou em cada combinação e disponibilizar somente os dados públicos necessários à estimativa.

**Teste independente**: salvar e editar produto com estimativa habilitada/desabilitada; validar prazo ausente, zero, negativo ou incompleto por combinação; confirmar rejeição por usuário/tenant não autorizado e projeção do fuso sem backfill.

### Testes da US4

- [ ] T019 [P] [US4] Estender `backoffice/src/pages/ProductsPage.spec.tsx` e `functions/src/functions/products/manage-product.spec.ts` para estimativa inteira positiva em produto simples e em todas as combinações, configuração parcial inválida e isolamento multi-tenant.

### Implementação da US4

- [ ] T020 [US4] Atualizar `backoffice/src/components/organisms/ProductEditor/ProductEditor.tsx`, `backoffice/src/interfaces/product.interface.ts` e `backoffice/src/services/admin.service.ts` para configurar estimativa por produto ou combinação; mostrar validação clara e preservar o fluxo legado quando a estimativa estiver ausente/desabilitada.
- [ ] T021 [US4] Atualizar `functions/src/model/product.model.ts`, `functions/src/model/tenant.model.ts` e `functions/src/services/backoffice.service.ts` para validar prazo inteiro positivo no produto ou em todas as combinações e, ao habilitar estimativa, projetar `tenant.timezone` em `public_businesses` na mesma transação que salva o produto; não fazer backfill geral.
- [ ] T022 [P] [US4] Estender `functions/src/services/public-catalog.service.ts`, `functions/src/functions/catalog/get-public-catalog.ts` e `client/src/services/catalog.service.ts` para projetar e ler estimativas e `timezone` IANA da empresa; se o fuso público estiver ausente, não calcular data usando o fuso do dispositivo.

**Checkpoint**: configuração de prazo validada e isolada por tenant/combinação; registros antigos permanecem sem estimativa e sem migração.

## Fase 6: História 3 — Consultar estimativa sem escolher o dia (P1)

**Objetivo**: permitir checkout com estimativa provisória, profissional aplicável e pagamento informativo; o servidor recalcula a previsão oficial e atribui/reserva um horário real.

**Teste independente**: validar o fluxo legado de data/horário e o fluxo estimado sem seleção manual de data/horário; testar profissional único/múltiplo, data local provisória/oficial, pagamento e parcelas, horário indisponível/concorrência e receipt com dados efetivamente criados.

### Testes da US3

- [ ] T023 [P] [US3] Estender `client/src/pages/BookingPage.spec.tsx` para prazo e data provisórios no fuso empresarial, profissional automático quando único, escolha obrigatória quando múltiplos, ausência de seleção de dia/horário, métodos de pagamento e parcelas válidas.
- [ ] T024 [P] [US3] Estender `functions/src/functions/appointments/create-public-appointment.spec.ts` para omissão de `startsAt` somente com estimativa válida, escolha/validação de profissional, atribuição do horário mais próximo, data oficial pelo fuso e `createdAt` do servidor, snapshots e falhas explícitas sem receipt de sucesso.
- [ ] T025 [P] [US3] Estender testes de `shared/domain/timezone.ts` para adição de dias corridos como data civil no fuso IANA, cobrindo virada de dia/mês/ano e transição de offset sem soma fixa de milissegundos.

### Implementação da US3

- [ ] T026 [US3] Implementar em `shared/domain/timezone.ts` cálculo de previsão por data civil, diferenciando a previsão provisória baseada na data local atual da previsão oficial baseada em `createdAt` no servidor.
- [ ] T027 [US3] Estender `functions/src/services/availability.service.ts`, `client/src/services/availability.service.ts`, `client/src/services/professional.service.ts` e `client/src/interfaces/professional.interface.ts` para disponibilizar profissionais ativos associados ao produto com horário no horizonte vigente de 31 dias; não tratar horário descoberto como reserva.
- [ ] T028 [US3] Atualizar `client/src/pages/BookingPage.tsx`, `client/src/components/organisms/BookingReady/index.tsx` e `client/src/components/organisms/BookingAvailability/BookingAvailability.tsx` para, com estimativa válida, dispensar escolha manual de data/horário, apresentar previsão explicitamente provisória e exigir escolha de profissional somente quando houver mais de um elegível; manter o fluxo atual sem estimativa.
- [ ] T029 [US3] Atualizar `client/src/components/organisms/BookingCustomerDetails/BookingCustomerDetails.tsx` para registrar débito, crédito, dinheiro ou Pix e oferecer de 1 a 5 parcelas somente para crédito, comunicando que a informação não representa pagamento processado ou recebido.
- [ ] T030 [US3] Atualizar `client/src/services/appointment.service.ts` para enviar método de pagamento obrigatório, parcelas somente para crédito e `professionalId` aplicável; no caminho estimado, omitir `startsAt` e não enviar preço, prazo, estimativa ou horário como autoridade.
- [ ] T031 [US3] Atualizar `functions/src/functions/appointments/create-public-appointment.ts` e `functions/src/interfaces/booking.interface.ts` para validar entrada condicional: produto normal exige `professionalId` e `startsAt`; produto com estimativa exige omissão de `startsAt`; crédito exige inteiro de 1 a 5 parcelas e os demais métodos rejeitam parcelas.
- [ ] T032 [US3] Atualizar `functions/src/services/booking.service.ts` para reler tenant/produto/profissional vigentes, confirmar associação e configuração da combinação e atribuir o horário mais próximo no horizonte atual; revalidar e usar a transação/reservas/notificação existentes, reavaliando conflito ou falhando explicitamente sem criar sucesso.
- [ ] T033 [US3] Atualizar `functions/src/model/appointment.model.ts` e `functions/src/services/booking.service.ts` para persistir o preço efetivo em `productPriceCentsSnapshot`, preço original e promoção aplicada, comissão sobre preço efetivo, prazo/data/fuso oficiais e snapshots informativos de pagamento/parcelas; preservar `createdAt` e horários reais definidos pelo servidor.
- [ ] T034 [US3] Atualizar `client/src/components/organisms/BookingReceiptDialog/` e `client/src/pages/BookingPage.tsx` para exibir horário/profissional efetivamente atribuídos e previsão oficial retornada pela Function, sem confundir a data estimada com o horário reservado ou indicar pagamento recebido.

**Checkpoint**: criação continua sendo agendamento `pending` com reserva real; fluxo normal permanece intacto e estimativa sem horário disponível ou com falha de reserva não produz sucesso.

## Fase 7: Polimento e preocupações transversais

**Propósito**: concluir leitura operacional, compatibilidade e verificação integrada dos workspaces.

- [ ] T035 [P] Estender `collaborator/src/pages/AppointmentsPage.spec.tsx` para leitura de appointments antigos sem os campos opcionais e exibição dos snapshots novos de promoção, estimativa e pagamento.
- [ ] T036 Atualizar `collaborator/src/interfaces/appointment.interface.ts` e `collaborator/src/components/organisms/AppointmentCard/AppointmentCard.tsx` para apresentar os dados históricos novos sem inventar valores ausentes nem alterar status ou reagendamento.
- [ ] T037 Validar a consulta de ofertas e o índice em `firestore.indexes.json` no Emulator Suite e executar `npm run test:emulator`; garantir que disputa por horário não cria appointment sem reserva ou receipt falso.
- [ ] T038 Executar os testes focados do roteiro em `specs/012-promocoes-agendamento-opcional/quickstart.md`: ProductsPage/manage-product, CompanyCatalogPage/catalog.service, BookingPage/create-public-appointment e AppointmentsPage, incluindo compatibilidade legado e isolamento multi-tenant.
- [ ] T039 Executar os builds dos workspaces `functions`, `client`, `backoffice` e `collaborator` conforme `specs/012-promocoes-agendamento-opcional/quickstart.md`; corrigir erros de tipo/build sem introduzir dependências ou alterar superfícies fora do escopo.

## Dependências e ordem de execução

### Dependências entre fases

- **Setup (Fase 1)**: nenhuma inicialização necessária; a estrutura e as dependências já existem.
- **Fundacional (Fase 2)**: concluir antes de qualquer história; fornece tipos e preço compartilhado.
- **US1 (Fase 3)**: depende da Fase 2; estabelece configuração e projeção de promoção.
- **US2 (Fase 4)**: depende da Fase 2 e usa o preço resolvido da US1 para refletir promoções por combinação.
- **US4 (Fase 5)**: depende da Fase 2; executar depois da US1 para evitar conflito nas alterações do editor e do salvamento de produto.
- **US3 (Fase 6)**: depende de US2 (seleção/combinação), US4 (configuração/projeção de estimativa) e US1 (preço/snapshots promocionais).
- **Polimento (Fase 7)**: leitura colaborador depende dos snapshots da US3; validação integrada depende das quatro histórias.

### Dependências entre histórias

- A Fase 2 libera US1 e US2; elas podem iniciar em paralelo se os arquivos de integração forem coordenados.
- US4 depende da conclusão de US1 por compartilhar `ProductEditor.tsx` e `backoffice.service.ts`.
- US3 depende da conclusão de US1, US2 e US4.
- Polimento depende de US3 e da conclusão das quatro histórias.

### Oportunidades de paralelismo

- Fase Fundacional: T001–T004 podem ocorrer em paralelo; T005 depende de T001/T002.
- US1: T006–T008 em paralelo; após esses testes, as alterações independentes do backoffice, projeção, serviço cliente e índice podem ser divididas sem editar o mesmo arquivo simultaneamente.
- US2: T015 antes da implementação; T016 e T018 podem ser trabalhadas em paralelo após os contratos fundacionais, com integração posterior em T017.
- US4: T019 antes da implementação; T020 e T021 podem ocorrer em paralelo; T022 depende dos campos/projeção definidos na Fase 2.
- US3: T023–T025 em paralelo; T026–T027 podem ser trabalhadas em paralelo; UI, callable e persistência devem integrar-se após contratos e testes.
- Polimento: T035 e T037 podem ocorrer em paralelo; T036 depende de T033; T038 e T039 dependem das implementações integradas.

### Exemplos de execução paralela por história

```text
US1 — executar T006, T007 e T008 em paralelo.
      Após os testes, dividir T009 (backoffice) e T011 (projeção Functions);
      T012 (consulta cliente) pode avançar em paralelo, com T013 após a consulta
      e T014 após a definição da consulta/ordenação.

US2 — após T015, executar T016 (resumo cliente) e T018 (revalidação Functions)
      em paralelo; integrar estado e seleção em T017.

US4 — após T019, executar T020 (editor) e T021 (validação/transação Functions)
      em paralelo; T022 integra os campos públicos após os contratos de projeção.

US3 — executar T023, T024 e T025 em paralelo; depois T026 (datas) e T027
      (profissionais/disponibilidade) em paralelo. T028–T030 podem avançar em
      componentes/serviços distintos; T031 e T032 integram contrato e agendamento
      após os testes. T033 usa a persistência de T032 e T034 apresenta seu resultado.
```

## Estratégia de implementação

### MVP

O MVP recomendado é a **US1**: configuração de promoção no backoffice, validação autoritativa e isolamento no backend, projeção/índice e seção de ofertas com preço original e promocional. Depois do checkpoint, validar a história isoladamente antes de avançar.

### Entrega incremental

1. Concluir contratos compartilhados e resolução de preço.
2. Entregar US1 e validar ofertas/preços autoritativos.
3. Entregar US2 e validar seleção de combinações.
4. Entregar US4 antes da experiência de prazo, para habilitar configurações válidas.
5. Entregar US3 com estimativa, atribuição/reserva, previsão oficial e pagamento apenas informativo.
6. Concluir leitura operacional no colaborador e executar validações integradas e builds locais.

Cada fase deve passar seu teste independente antes de avançar; nenhum passo desta lista autoriza migration, deploy, seed ou alteração de dados de produção.

## Contagem e critérios independentes

- **Total**: 39 tarefas.
- **Fundacional**: 5 tarefas.
- **US1 — Promoção**: 9 tarefas; teste independente descrito na Fase 3.
- **US2 — Seleção e preços**: 4 tarefas; teste independente descrito na Fase 4.
- **US4 — Configurar estimativa**: 4 tarefas; teste independente descrito na Fase 5.
- **US3 — Consultar estimativa/checkout**: 12 tarefas; teste independente descrito na Fase 6.
- **Polimento**: 5 tarefas, incluindo collaborator, emulador, matriz de testes e builds.

Todos os itens de tarefa seguem o formato de checklist com caixa, ID sequencial, `[P]` somente quando aplicável, etiqueta de história nas fases de usuário e caminho(s) dos arquivos. Nenhum teste, build, migration, deploy ou commit foi executado nesta etapa documental.
