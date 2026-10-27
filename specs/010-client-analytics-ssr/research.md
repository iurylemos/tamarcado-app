# Pesquisa: Analytics por Empresa e Renderização do Cliente

**Data**: 2026-10-26
**Escopo**: Pesquisa de planejamento. Nenhuma dependência foi instalada e nenhum serviço ou
ambiente de produção foi alterado.

## Decisões

### 1. Vike e integração React Query

- **Decisão**: Usar Vike com `vike-react` e a extensão oficial `vike-react-query`, sujeita a
  uma prova de compatibilidade no ambiente local antes da migração de rotas.
- **Evidência**: `vike-react-query` está listado no catálogo de extensões Vike e mantido no
  monorepo oficial `vikejs/vike-react`. A documentação informa suporte a SSR com TanStack
  Query, busca no nível do componente e dependência de streaming HTML.
- **Compatibilidade observada**: a versão consultada `vike-react-query@0.1.13` declara
  peer dependencies para React 18+, TanStack Query 5+, Vike 0.4.252+ e `vike-react` 0.6.8+.
  `vike-react@0.6.31` declara React 19+, e Vike 0.4.268 declara Vite 7.1+. Vite 8 está
  dentro do range de Vike, mas não foi encontrada certificação explícita do conjunto Vike +
  Vite 8.
- **Isolamento**: `pageContext` é criado por requisição/navegação; `globalContext` e
  singletons de módulo duram a vida do processo. O `QueryClient` de SSR deve ser criado por
  render/requisição para evitar estado cruzado em instâncias quentes de Cloud Functions.
- **Risco**: `vike-react-query` usa `react-streaming`; a compatibilidade de streaming no
  caminho Firebase Hosting → Cloud Functions não ficou comprovada em documentação
  oficial. O plano exige smoke test local de ponta a ponta e não substitui a biblioteca sem
  nova aprovação.
- **Alternativas consideradas**: usar só o hook `+data` do Vike não satisfaz o pedido de
  usar `vike-react-query`; trocar o framework ou runtime altera a direção explícita; manter
  o renderer SSR customizado não entrega o Vike solicitado.

### 2. Integração do Vike com Hosting e Functions

- **Decisão**: Manter Firebase Hosting e o adaptador HTTP em Functions para servir apenas
  rotas públicas do Cliente; gerar/empacotar o bundle server do Vike com o build do Cliente.
- **Evidência**: o código atual já encaminha `/empresa/**` para `renderStorefront`, que busca
  o catálogo público no backend, injeta HTML e mantém metadados. Rotas de agendamento
  recebem atualmente o `index.html` sem conteúdo SSR. Hosting também usa fallback estático
  para outras rotas.
- **Limite oficial**: Vike declara não possuir uma extensão Firebase oficial; documenta
  integração manual como middleware. A documentação Firebase fornece integração genérica
  Express/HTTP e exige que o artefato server esteja incluído no bundle Functions.
- **Decisão de segurança**: a camada Vike no `client` não recebe Firebase Admin nem dados
  privados. Functions carrega a projeção pública e a passa ao renderer; disponibilidade e
  criação de agendamento continuam nos serviços atuais.
- **Alternativas consideradas**: exportação pré-renderizada depende de atualização de
  conteúdo e não cobre dinamicamente todos os slugs; um runtime externo como Cloud Run
  adiciona serviço e custo não solicitados; integração framework-aware automática não
  documenta Vike.

### 3. Origem dos indicadores e isolamento por tenant

- **Decisão**: alimentar o dashboard empresarial com sessões/eventos first-party
  tenant-scoped no Firebase, além dos registros autoritativos de agendamento. GA4/GTM ficam
  restritos a uma visão global, sem `tenantId`, slug, serviço, cliente ou agendamento.
- **Justificativa**: uma propriedade GA4 compartilhada por tenant exigiria uma dimensão de
  alta cardinalidade e filtragem server-side. A documentação GA4 alerta para limites de
  cardinalidade e o Data API opera sobre a propriedade, não sobre um limite de autorização
  por empresa. A decisão evita depender de filtro externo como controle de acesso.
- **Consentimento**: não existe consent manager de analytics no cliente; há somente
  consentimento específico de WhatsApp. O Cliente terá uma preferência explícita e separada.
  Tags e ingestão first-party não são chamados sem opt-in; a retirada interrompe eventos
  futuros. Não se usa modo avançado que envie pings sem consentimento.
- **Taxonomia**: eventos são allowlisted, sem nomes, telefones, conteúdo de formulário,
  URLs completas, IDs de agendamento ou IDs internos. Para GTM/GA4, rotas são normalizadas
  sem slug ou ID de serviço. Para Firebase, o backend resolve o slug público a `tenantId`.
- **Alternativas consideradas**: filtrar GA4 por slug tem risco de cardinalidade e não é
  fronteira de autorização; criar uma propriedade GA4 por empresa é operacionalmente pesado
  e não foi pedido; enviar eventos somente a GA4 não dá isolamento transacional ao dashboard.

### 4. Métricas financeiras e de retorno

- **Decisão**: reaproveitar os modelos e timezone existentes, mas manter receita estimada
  separada de vendas concluídas. O preço vem de `productPriceCentsSnapshot`; o período de
  agenda usa `startsAt` no fuso da empresa; entram statuses pendente, confirmado e concluído,
  excluindo cancelado.
- **Evidência**: `AppointmentDocument` já preserva telefone, produto, status, data e preço
  histórico. `shared/domain/reporting.ts` classifica como venda somente `completed`, e
  `monthly_reports` guarda sales/commission. Essa semântica não será alterada nem reutilizada
  como receita prevista.
- **Retorno de clientes**: derivar a contagem em processamento server-side, por tenant,
  comparando atendimentos concluídos anteriores e dentro do período. Não criar hash
  persistente do telefone nem retornar registros individuais.
- **Alternativas consideradas**: adicionar totais financeiros duplicados aos documentos de
  appointment enfraquece auditabilidade; usar dados de GA4 para valores transacionais
  confunde intenção com booking e pagamento; manter um identificador de cliente em analytics
  aumenta risco de privacidade.

### 5. Resumo mensal no dashboard

- **Decisão**: snapshots agregados ficam em coleção própria, sem reutilizar
  `monthly_reports`, que é uma projeção de vendas. A geração/recálculo deve ser idempotente;
  o dashboard fornece acesso autenticado ao resumo mensal.
- **Evidência**: o repositório possui uma callable manual `rebuildMonthlyReport`; a nova
  coleção e a geração de analytics não devem alterar a semântica financeira existente.
- **Escopo confirmado**: não haverá envio, notificação ou integração de e-mail nesta feature.
- **Pendências de implementação**: aprovar texto de consentimento e validar tags em ambiente
  GA4/GTM não produtivo antes de ativá-las.
- **Oportunidades**: regras determinísticas e explicáveis, ligadas aos indicadores; sem IA,
  causalidade inventada ou recomendação quando a amostra não sustentar a observação.

## Fontes

- Vike — SSR e data loading: https://vike.dev/data
- Vike — React: https://vike.dev/vike-react
- Vike — extensões oficiais: https://vike.dev/extensions
- Vike — streaming: https://vike.dev/streaming
- Vike — contexto por requisição/processo: https://vike.dev/pageContext e
  https://vike.dev/globalContext
- Vike — integração Firebase (manual, sem extensão oficial): https://vike.dev/firebase
- Extensão `vike-react-query`: https://github.com/vikejs/vike-react/tree/main/packages/vike-react-query
- Firebase Hosting com app Express/handler: https://firebase.google.com/docs/hosting/frameworks/express
- Boas práticas de execução Functions/Cloud Run:
  https://docs.cloud.google.com/run/docs/tips/functions-best-practices
- GA4 eventos personalizados: https://developers.google.com/analytics/devguides/collection/ga4/events
- GA4 parâmetros de eventos: https://developers.google.com/analytics/devguides/collection/ga4/event-parameters
- GA4 Single Page Applications:
  https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications
- GTM data layer: https://developers.google.com/tag-platform/tag-manager/datalayer
- Google Consent Mode:
  https://developers.google.com/tag-platform/security/guides/consent
- GA4 política de PII: https://support.google.com/analytics/answer/7686480
- GA4 cardinalidade de dimensões personalizadas:
  https://support.google.com/analytics/answer/12229021
- GA4 Data API e filtros:
  https://developers.google.com/analytics/devguides/reporting/data/v1
- GA4 funnel reports (API v1alpha):
  https://developers.google.com/analytics/devguides/reporting/data/v1/funnels
