# Plano de Implementação: Analytics por Empresa e Renderização do Cliente

**Branch**: `010-client-analytics-ssr` (planejada; não criada) | **Data**: 2026-10-26 |
**Spec**: [spec.md](./spec.md)

**Entrada**: Especificação aprovada para planejamento em
[`specs/010-client-analytics-ssr/spec.md`](./spec.md).

## Resumo

Migrar o tratamento server-side das rotas públicas do `client` para Vike com o adaptador
React e `vike-react-query`, mantendo a aplicação em React/TypeScript/Vite e o runtime de
Hosting/Functions existente. O adaptador server-side pode continuar implantado em
`functions`, mas só atenderá rotas do Cliente; `collaborator` e `backoffice` permanecem
inalterados quanto a SSR.

Adicionar analytics nativo por empresa com coleta first-party após opt-in explícito,
validação e associação de tenant no backend, mais métricas autoritativas de agendamento no
Firebase. GA4/GTM medem somente aquisição e comportamento em visão global: não recebem
`tenantId`, slug de empresa, identificador de serviço, cliente ou agendamento. O dashboard
por empresa estende a visão de negócio do `backoffice`; o resumo mensal agregado fica
disponível ali, sem envio de e-mail. Looker Studio não faz parte da primeira entrega.

## Contexto técnico

**Linguagem/versões**: TypeScript 6, React 19, Vite 8 e Node.js 24 para Cloud Functions.

**Dependências principais**: `@tanstack/react-query` 5 e Firebase já existentes; adicionar
Vike, `vike-react` e `vike-react-query` após validar versões e resposta SSR no runtime atual.
GA4/GTM são configurados como serviços externos e não como dependências de domínio.

**Armazenamento**: Firestore existente, somente coleções raiz. Agendamentos existentes
continuam como fonte autoritativa para contagens e receita estimada. Propor coleções
server-only separadas para sessões anônimas de analytics e snapshots mensais; não gravar
eventos diretamente do navegador em coleções protegidas.

**Testes**: Vitest/Testing Library, Firebase Emulator Suite, testes SSR de renderização e
hidratação, testes de isolamento por tenant, consentimento e payloads, reconciliação de
métricas e testes de idempotência/falha de geração do resumo mensal. Integrar os
testes/builds aos gates de CI pertencentes à Spec 009; não criar workflow paralelo.

**Plataforma alvo**: Firebase Hosting multisite e Cloud Functions 2nd gen em
`southamerica-east1`, runtime Node 24. A Hosting atual já direciona `/empresa/**` para
`renderStorefront`; o novo adaptador deve atender somente páginas públicas do `client`.

**Tipo de projeto**: Monorepo npm com três frontends, Firebase Functions e domínio
compartilhado independente de UI.

**Metas de desempenho**: Não há SLO ou orçamento de latência aprovado para esta feature.
Medir build, renderização inicial e funções de relatório durante a validação, sem declarar
SLO novo. Confirmar que analytics não bloqueia agendamentos.

**Restrições**:

- Apenas rotas do `client` terão SSR. O adaptador de Hosting/Functions é implantação e
  transporte, não autorização para SSR de `collaborator` ou `backoffice`.
- Renderizar somente projeções públicas; disponibilidade permanece dinâmica e a criação
  continua autoritativa no backend.
- Criar `QueryClient` isolado por requisição server-side. Nenhum `QueryClient`, estado de
  tenant ou dado de sessão pode viver em singleton compartilhado por instância de Function.
- O navegador envia slug público e evento allowlisted; `tenantId` é resolvido e validado no
  servidor. Regras Firestore permanecem deny-by-default para dados privados.
- Eventos first-party e tags GA4/GTM só são ativados após opt-in explícito, independente do
  consentimento de WhatsApp. Retirada interrompe coleta futura.
- Não enviar PII, slug/ID de empresa, serviço, cliente ou agendamento a GA4/GTM; usar
  templates de rota sem identificadores e parâmetros de campanha allowlisted.
- Receita estimada usa snapshots históricos de preço e status não cancelado. Não alterar a
  semântica existente de vendas concluídas em `shared/domain/reporting.ts` ou
  `monthly_reports`.
- Os textos de privacidade/consentimento e as configurações de propriedade/container não
  estão confirmados. Não inventar credenciais, fazer deploy ou alterar estado de produção;
  tratá-los como pré-requisitos explícitos.

**Escala/escopo**: rotas públicas e analytics da aplicação Cliente; dashboard de empresa no
Backoffice; métricas e geração mensal em Functions. Sem mudanças de SSR em outros frontends,
pagamentos, replay de sessão, APM, envio de e-mail, integração inicial com Looker Studio ou
novo pipeline CI/CD.

## Verificação da Constituição

### Gate pré-design: PASS

- **I. Integridade de domínio e fluxo**: mantém o catálogo por slug e o fluxo de agendamento;
  não cria diretório de empresas ou fallback de dados entre tenants.
- **II. Integridade de agendamento e disponibilidade**: SSR não substitui disponibilidade,
  transação, status nem validação do backend.
- **III. Segurança e autorização**: a leitura do dashboard deriva `tenantId` de
  `authorizeActor`; ingestão pública resolve o slug no servidor; nenhum dado privado é
  entregue pela resposta SSR ou a analytics externo.
- **IV. Consistência financeira e reporting**: valor estimado é distinto de venda concluída
  e de pagamento recebido; usa preço histórico e período no fuso da empresa.
- **V. Testabilidade e qualidade**: prevê testes observáveis para renderização, hidratação,
  consentimento, eventos, autorização e reconciliação.
- **VI. Separação de aplicações**: SSR fica restrito ao Cliente; dashboard fica no
  Backoffice; domínio compartilhado contém somente cálculos/contratos neutros de UI.
- **VII. UX e acessibilidade**: inclui escolha acessível de consentimento, estados de
  carregamento/erro/vazio e não bloqueia agendamento.
- **VIII. Simplicidade e manutenção**: reutiliza os limites existentes de Functions,
  reporting e validação; Looker e CI paralelo ficam fora.

Não há violação constitucional que exija exceção.

## Decisões de arquitetura

### Renderização e rotas do Cliente

1. Usar Vike com o renderer React oficial e o plugin `vike-react-query`; migrar o roteamento
   de `react-router-dom` somente no `client`. Reutilizar os componentes e serviços existentes
   quando compatíveis, mantendo as URLs públicas `/`, `/empresa/:slug` e
   `/empresa/:slug/agendar/:productId`.
2. Preservar a função HTTP existente como adaptador de Hosting para o servidor Vike, ou
   renomeá-la somente se a alteração coordenada no rewrite mantiver o contrato. Requisições
   de catálogo usam `findPublicBusiness` e projeções públicas de produtos em Functions;
   nunca passam `commissionValue`, telefone, dados de cliente ou documentos privados ao
   renderer.
3. O SSR do agendamento pode incluir catálogo e serviço público, mas não disponibilidade
   cacheada; horários são consultados novamente no cliente e revalidados no backend ao
   confirmar.
4. Construir o bundle server do Cliente junto aos assets estáticos e empacotá-lo no artefato
   Functions implantável. Preservar o rewrite estático de assets, PWA e regras atuais de
   cache público; validar rotas para root, slug válido/inválido e booking.
5. O `QueryClient` de cada render server-side é criado no escopo da requisição e descartado
   após a resposta. O cliente hidratado tem seu próprio estado. Usar dados públicos e
   `queryKey` que incluam o slug e identificadores de recurso necessários.

**Gate técnico inicial**: antes da migração de todas as rotas, demonstrar no Emulator Suite
uma página Vike renderizada por Function, com hidratação React Query, isolamento entre duas
requisições/tenants em instância reutilizada e build de produção Vite 8. `vike-react-query`
usa streaming; a compatibilidade de streaming do caminho atual Firebase Hosting → Functions
não está documentada de forma conclusiva. Se o smoke test falhar, parar e solicitar decisão
em vez de substituir silenciosamente a tecnologia escolhida.

### Analytics first-party e dashboard

1. Criar uma camada de consentimento no `client`, sem acoplar ao opt-in de WhatsApp. Por
   padrão, analytics está desativado; GTM não carrega e o cliente não chama a ingestão
   first-party antes do aceite.
2. Após consentimento, o Cliente envia eventos allowlisted a uma callable pública, com
   `businessSlug`, ID de sessão aleatório por sessão, etapa e identificadores públicos de
   serviço quando necessários. O servidor valida o evento, resolve `tenantId` por slug
   publicado e atualiza somente um documento de sessão server-only. O browser nunca envia
   `tenantId`; nenhum dado de contato ou agendamento compõe esse documento. O evento de
   conclusão é atualizado somente pelo backend após a transação real de agendamento; falha
   de analytics pós-commit nunca reverte nem falha a reserva.
3. Guardar o mínimo necessário para calcular interesse e abandono; abandono é uma sessão sem
   agendamento e sem atividade por 30 minutos. Configurar exclusão TTL para sessões após 90
   dias. Dados de origem são normalizados em categorias e valores de campanha aprovados; não
   armazenar URLs ou query strings integrais.
4. As tags GA4/GTM usam apenas eventos globais e rotas normalizadas, sem slug, `tenantId`,
   serviço, identificador de cliente ou agendamento. Escolher uma única fonte para page
   views em navegação Vike e testar que a página inicial e as transições não geram eventos
   duplicados.
5. O dashboard adiciona indicadores ao fluxo existente de `backoffice/src/pages/DashboardPage.tsx`.
   Um callable autenticado com papel `backoffice` deriva `tenantId` do ator, carrega apenas
   agendamentos e sessões daquele tenant e retorna agregados sem contato/identificadores
   pessoais.
6. Calcular interesse, serviços agendados, horários e funil como métricas distintas.
   Calcular retorno no servidor comparando telefones E.164 somente em memória dentro de
   consultas tenant-scoped a agendamentos concluídos; não persistir hash estável de cliente
   nem retornar a identidade. Marcar dados de jornada como baseados apenas em visitantes
   consentidos.
7. Gerar oportunidades por regras determinísticas e explicáveis; cada observação aponta para
   um indicador e nunca afirma causalidade. Suprimir oportunidades quando a amostra não
   sustentar uma observação.

### Resumo mensal no dashboard

1. Criar um snapshot mensal de analytics separado da coleção `monthly_reports`, pois essa
   coleção representa vendas concluídas e comissões. O snapshot inclui indicadores agregados,
   período/fuso e oportunidades fundamentadas, sem dados individuais.
2. Usar execução agendada idempotente para o mês encerrado. Calcular período pela timezone
   da empresa e usar `startsAt` para métricas de agenda/valor; eventos de jornada usam a data
   da sessão.
3. Expor o snapshot no dashboard por callable autenticada; a consulta deriva o tenant do
   ator autorizado e não aceita destinatários nem `tenantId` escolhido pelo cliente.
4. Registrar falhas de geração de forma sanitizada e não apresentar snapshot parcial como
   sucesso. Reexecução do mesmo período deve ser idempotente. Não implementar envio,
   notificação ou integração de e-mail.

## Fases de implementação previstas

1. **Prova de compatibilidade**: Vike/Vite 8/React 19 e streaming/hidratação em Function
   local; validar empacotamento dos bundles e rewrite sem tocar produção.
2. **Migração SSR do Cliente**: substituir roteamento client-only pelas rotas Vike, adicionar
   carregamento/hidratação de dados públicos e atualizar PWA, Sentry e testes afetados.
3. **Consentimento e eventos first-party**: preferência acessível, bloqueio pré-opt-in,
   schema de eventos, validação server-side e persistência de sessão tenant-scoped.
4. **Dashboard e métricas**: callable autorizado, cálculos puros compartilhados quando
   reutilizáveis, componentes do Backoffice e testes de isolamento/reconciliação.
5. **Resumo mensal**: snapshot idempotente, oportunidades determinísticas, acesso
   autenticado pelo dashboard, execução agendada e testes de falha de geração.
6. **Validação de release**: incluir testes/build nos gates da Spec 009; executar regressão
   no Emulator Suite e documentar evidências não produtivas.

## Estrutura do projeto

### Artefatos desta feature

```text
specs/010-client-analytics-ssr/
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   └── analytics-and-rendering.md
├── quickstart.md
├── checklists/
│   └── requirements.md
└── tasks.md                 # Criado pela etapa /speckit-tasks, não por este plano
```

### Código existente e fronteiras previstas

```text
client/
├── src/main.tsx                         # bootstrap/hidratação Vike
├── src/entry-server.tsx                 # renderer atual a migrar/remover
├── src/router/                           # roteamento atual a migrar
├── src/pages/                            # páginas e consultas atuais
├── src/config/react-query.config.ts      # remover singleton server-side
├── src/analytics/                         # novo consentimento e eventos
└── vite.config.ts                        # build cliente/SSR

functions/
├── src/functions/catalog/render-storefront.ts  # adaptador de render atual
├── src/functions/analytics/                    # ingestão e callable do dashboard
├── src/functions/reports/                      # execução agendada/resumo
├── src/services/                                # cálculo e autorização
├── src/model/                                   # tipos Firestore server-only
└── src/config/collections.ts                    # coleções raiz novas

backoffice/
├── src/pages/DashboardPage.tsx             # dashboard nativo por empresa
└── src/services/                           # callable autenticado do dashboard

shared/domain/
└── analytics.ts                            # somente cálculos/contratos puros reutilizáveis

firebase.json                               # rewrites do site Cliente, sem alterar outros sites
.github/workflows/                          # pertencem à Spec 009; sem pipeline paralelo
```

**Decisão de estrutura**: manter leitura pública, SSR e ingestão confiável no backend
Firebase; manter interfaces e experiência do dashboard nos respectivos frontends; colocar
no domínio compartilhado apenas regras determinísticas sem dependência de UI ou Firestore.
O `tenantId` é sempre derivado no servidor ou em contexto de actor autorizado.

## Gate constitucional pós-design: PASS

- O renderer usa exclusivamente dados públicos e mantém slug/tenant consistente; não
  modifica regras de catálogo ou navegação.
- Disponibilidade e criação de agendamento permanecem autoritativas em Functions.
- Todas as operações protegidas derivam tenant e papel de `authorizeActor`; ingestão pública
  não concede acesso a dados.
- Preços históricos, período/fuso e status são preservados; receita estimada não substitui o
  relatório financeiro existente.
- Consentimento, PII, chaves de sessão, acesso ao dashboard, testes e estados de falha são
  explícitos.
- As fronteiras de `client`, `backoffice`, `functions` e `shared/domain` seguem a constituição.
- CI/CD permanece na Spec 009; não há exceções ou violações a justificar.

## Decisões confirmadas na revisão

- Não haverá envio nem integração de e-mail; o resumo mensal ficará disponível no dashboard.
- A retenção proposta para sessões anônimas de analytics está aprovada em 90 dias.
- A prova de compatibilidade Vike/`vike-react-query` no caminho de Functions é gate
  obrigatório antes da migração completa; se falhar, parar e solicitar decisão.

## Decisões pendentes para implementação

- Aprovar o texto e a política exibidos na preferência explícita de consentimento; este plano
  não redige texto jurídico.
- Confirmar uma propriedade/container GA4/GTM não produtiva para validar payloads sem dados
  reais.
