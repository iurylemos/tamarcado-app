---
description: "Tarefas de implementação da plataforma de catálogos SaaS"
---

# Tasks: Plataforma de Catálogos SaaS

**Input**: `specs/004-saass-catalog-platform/spec.md`

**Escopo**: aplicação `client` e documentação relacionada. Não alterar backend, `collaborator`, `backoffice`, contratos compartilhados ou infraestrutura.

**Contexto técnico existente**: React 19, TypeScript, React Router, React Query, Firebase, Vitest e Testing Library, conforme `client/package.json` e `client/src/`.

**Nota de planejamento**: ainda não existe `plan.md` em `specs/004-saass-catalog-platform/`. Os caminhos e tarefas abaixo foram alinhados à especificação e à estrutura atual de `client/`; decisões de arquitetura adicionais devem permanecer dentro desses limites.

**Testes**: incluídos porque os critérios de sucesso da especificação exigem verificações automatizadas dos catálogos, do PWA e da continuidade dos fluxos de agendamento.

## Phase 1: Setup

**Purpose**: Preparar o projeto e suas ferramentas compartilhadas.

O projeto `client/`, suas dependências e o runner de testes já existem. Não há inicialização nem dependência nova necessária para esta feature.

## Phase 2: Foundational

**Purpose**: Resolver a única decisão de governança que pode bloquear a implementação.

- [X] T001 Revisão concluída: o princípio I da constituição v3 e FR-003/FR-004 já proíbem a descoberta centralizada; a direção está alinhada e registrada, sem necessidade de alterar a especificação ou a constituição

**Checkpoint**: a direção aprovada para remover a descoberta deve estar registrada antes de implementar as histórias.

## Phase 3: User Story 1 - Acessar o catálogo de um negócio (Priority: P1)

**Goal**: Abrir o catálogo diretamente pelo slug, mostrar somente a identidade e os itens públicos daquele negócio e substituir a vitrine da raiz por uma orientação neutra.

**Independent Test**: Acessar `/empresa/{slug}` para um negócio publicado e confirmar identidade e itens daquele negócio; testar slug inválido/indisponível sem dados de outro negócio; abrir `/` e confirmar que não há busca, listagem nem seleção de empresas ou serviços.

### Tests for User Story 1

- [X] T002 [P] [US1] Adicionar testes da rota raiz para confirmar orientação neutra e ausência de busca/listagem em `client/src/App.spec.tsx` e `client/src/pages/HomePage.spec.tsx`
- [X] T003 [P] [US1] Cobrir catálogo por slug, isolamento de negócio, itens ativos/publicados e estados de erro, não encontrado e indisponível em `client/src/pages/CompanyCatalogPage.spec.tsx` e `client/src/services/catalog.service.spec.ts`

### Implementation for User Story 1

- [X] T004 [US1] Criar a página e o template neutros para a raiz em `client/src/pages/HomePage.tsx` e `client/src/components/templates/HomeTemplate/HomeTemplate.tsx`, sem controles ou conteúdo de descoberta
- [X] T005 [P] [US1] Apontar `/` para a orientação neutra e preservar as rotas públicas com slug em `client/src/App.tsx`
- [X] T006 [P] [US1] Garantir que a consulta e a página do catálogo distingam carregamento, erro, não encontrado e indisponível, exibam somente dados públicos do slug atual e nunca recorram a outro negócio em `client/src/services/catalog.service.ts`, `client/src/pages/CompanyCatalogPage.tsx` e `client/src/components/templates/CompanyCatalogTemplate/CompanyCatalogTemplate.tsx`

**Checkpoint**: catálogo direto e raiz neutra funcionam independentemente, sem superfície de descoberta.

## Phase 4: User Story 2 - Solicitar agendamento pelo catálogo (Priority: P1)

**Goal**: Manter negócio e serviço de origem em todas as etapas e impedir solicitação de serviço inválido ou pertencente a outro negócio.

**Independent Test**: Iniciar agendamento pelo catálogo de um slug publicado, avançar por profissional, data, horário e dados do cliente, e confirmar que disponibilidade, envio e confirmação pertencem ao mesmo negócio; abrir ou enviar URL inválida e verificar mensagem acionável sem criar solicitação.

### Tests for User Story 2

- [X] T007 [P] [US2] Cobrir preservação do slug e serviço, revalidação em acesso direto/atualização, rejeição de serviço de outro negócio e continuidade de disponibilidade, validação, consentimento e confirmação em `client/src/pages/BookingPage.spec.tsx` e `client/src/components/organisms/BookingForm/BookingForm.spec.tsx`

### Implementation for User Story 2

- [X] T008 [US2] Revalidar slug e serviço contra o catálogo do negócio antes de exibir disponibilidade e antes de enviar; manter rotas e navegação subordinadas ao mesmo slug em `client/src/pages/BookingPage.tsx`, `client/src/services/availability.service.ts` e `client/src/services/appointment.service.ts`
- [X] T009 [US2] Apresentar estado e mensagem acionável para slug ou serviço inválido sem enviar solicitação, preservando os estados existentes de validação e confirmação em `client/src/pages/BookingPage.tsx` e `client/src/components/templates/BookingTemplate/BookingTemplate.tsx`

**Checkpoint**: agendamento iniciado no catálogo permanece associado ao mesmo negócio do início à confirmação.

## Phase 5: User Story 3 - Instalar e reabrir o PWA do negócio (Priority: P1)

**Goal**: Associar cada manifesto à identidade e ao slug do catálogo de origem, com início direto no catálogo e escopo restrito às rotas daquele negócio.

**Independent Test**: Para slug válido, verificar identidade, `start_url` em `/empresa/{slug}` e escopo que inclua catálogo e agendamento do mesmo negócio, mas exclua raiz e outros slugs; verificar que slug ausente/inválido não recebe manifesto de fallback.

### Tests for User Story 3

- [X] T010 [P] [US3] Cobrir campos de identidade, `start_url`, limites de `scope` e rejeição de slug ausente/inválido em `client/src/services/pwa-manifest.service.spec.ts`

### Implementation for User Story 3

- [X] T011 [P] [US3] Gerar manifesto com identidade do negócio, início no catálogo e escopo com limite de segmento que inclua a rota do catálogo e suas rotas de agendamento, sem raiz ou slugs vizinhos, em `client/src/services/pwa-manifest.service.ts`
- [X] T012 [US3] Vincular o manifesto somente após resolver um catálogo válido, restaurar/remover o link corretamente ao sair da rota e impedir metadados genéricos de marketplace como fallback em `client/src/components/templates/CompanyCatalogTemplate/CompanyCatalogTemplate.tsx` e `client/index.html`

**Checkpoint**: instalar ou reabrir o PWA conduz ao catálogo correto e mantém sua identidade durante a navegação do negócio.

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Remover resíduos da experiência de descoberta e validar qualidade, acessibilidade e responsividade.

- [X] T013 Remover os módulos exclusivos da antiga descoberta após confirmar que não há outros consumidores: `client/src/pages/CompanyListPage.tsx`, `client/src/pages/CompanyListPage.spec.tsx`, `client/src/components/templates/CompanyListTemplate/CompanyListTemplate.tsx`, `client/src/stores/catalog-filters.store.ts`, `client/src/services/company.service.ts` e `client/src/services/product.service.ts`
- [X] T014 Atualizar a documentação de uso do client para explicar o link `/empresa/{slug}`, a raiz neutra e a instalação do PWA por negócio em `client/README.md`
- [X] T015 Executar os testes Vitest de `client/src/App.spec.tsx`, `client/src/pages/HomePage.spec.tsx`, `client/src/pages/CompanyCatalogPage.spec.tsx`, `client/src/services/catalog.service.spec.ts`, `client/src/pages/BookingPage.spec.tsx`, `client/src/components/organisms/BookingForm/BookingForm.spec.tsx` e `client/src/services/pwa-manifest.service.spec.ts`, e validar o build/type-check definido em `client/package.json`

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: já satisfeito pelo projeto e ferramentas existentes.
- **Foundational (Phase 2)**: T001 bloqueia todas as histórias até a divergência entre especificação e constituição ser resolvida.
- **User Stories (Phase 3+)**: dependem de T001. US2 e US3 dependem da resolução de catálogo/slug da US1; depois disso, seus trabalhos podem avançar em paralelo.
- **Polish (Phase 6)**: depende das histórias selecionadas; T015 deve ser executada após as alterações de código.

### User Story Dependencies

- **US1 (P1)**: começa após T001; não depende de outra história.
- **US2 (P1)**: começa após US1, pois usa o catálogo e a identidade do negócio já resolvidos.
- **US3 (P1)**: começa após US1, pois o manifesto precisa dos dados do catálogo válido.
- **US2 e US3**: podem ser implementadas em paralelo após US1; ambas preservam a fronteira de negócio estabelecida.

### Parallel Opportunities

- **US1**: T002 e T003 podem ser escritos em paralelo; depois, T005 e T006 podem ser implementados em paralelo, após T004 e os testes correspondentes.
- **US2/US3**: após US1, T007 e T010 podem ser escritos em paralelo; T008/T009 e T011 podem avançar em paralelo quando seus testes e a resolução da US1 estiverem prontos.
- **Polish**: T014 pode ocorrer em paralelo às tarefas de implementação que não alterem `client/README.md`; T013 e T015 aguardam as histórias concluídas.

## Parallel Example: User Stories 2 and 3

```text
Após concluir US1:
Faixa A: T007 -> T008 -> T009 (agendamento)
Faixa B: T010 -> T011 -> T012 (manifesto e instalação PWA)
```

## Implementation Strategy

### MVP First

1. Resolver T001, alinhando a governança com o comportamento aprovado.
2. Concluir US1: raiz neutra, catálogo por slug, isolamento de dados e estados explícitos.
3. Validar a US1 de forma independente pelos critérios acima.
4. A US1 é o MVP de acesso ao catálogo; concluir US2 e US3 para entregar os demais fluxos P1 especificados.

### Incremental Delivery

1. Fundação aprovada (T001).
2. US1: acesso e apresentação do catálogo individual.
3. US2: solicitação de agendamento dentro do contexto do negócio.
4. US3: instalação e reabertura do PWA daquele negócio.
5. Polish: remover resíduos da descoberta, atualizar documentação e executar validação final.

## Notes

- `[P]` identifica tarefas paralelizáveis em arquivos distintos e sem dependência de tarefa incompleta.
- As tarefas de teste vêm antes das respectivas alterações de comportamento.
- A especificação exclui mudanças fora de `client/` e documentação; não adicionar mudanças de API, backend, outros frontends ou infraestrutura.
- O critério de escopo do PWA deve ser validado também contra slugs com prefixos semelhantes, para não incluir o catálogo de outro negócio.
