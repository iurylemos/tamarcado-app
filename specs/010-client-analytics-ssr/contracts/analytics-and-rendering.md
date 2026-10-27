# Contratos: Analytics e Renderização do Cliente

Contratos planejados para as superfícies desta feature. Não são endpoints implantados.

## Rotas públicas renderizadas

| Rota | Dados incluídos no SSR | Regra |
|---|---|---|
| `/` | Orientação neutra | Não lista empresas |
| `/empresa/:slug` | Projeção pública da empresa e serviços | Slug deve identificar empresa publicada |
| `/empresa/:slug/agendar/:productId` | Projeção pública da empresa e do serviço | Serviço pertence à empresa e está publicado/ativo |
| slug/serviço inválido | Estado público de não encontrado | Nunca usar dados de outro tenant |

O documento HTML pode conter metadados públicos apropriados à rota. Não incluir disponibilidade
cacheada, comissão, dados de staff, informações de cliente ou estado de consentimento de
outro usuário. A Function que hospeda o renderer não altera autoridade do backend de booking.

## Evento de analytics first-party

**Superfície prevista**: callable público no Firebase Functions, invocado apenas pelo Cliente
após opt-in explícito. Writes diretos do navegador nas coleções de analytics permanecem
negados por Firestore Rules.

**Entrada conceitual**:

```json
{
  "businessSlug": "slug-publico",
  "sessionId": "random-session-id",
  "event": "service_selected",
  "productId": "public-product-id",
  "sourceCategory": "instagram",
  "campaign": "campanha-sanitizada"
}
```

Campos opcionais variam por tipo de evento; somente nomes e limites allowlisted são aceitos.
Nenhum campo de `tenantId`, telefone, nome, e-mail, campos de formulário, token, appointment
ID, URL completa ou texto arbitrário é permitido.

**Comportamento**:

- O servidor valida a publicação do slug e associação do produto, resolve `tenantId` e
  atualiza apenas a sessão do mesmo tenant.
- Payload inválido ou origem/serviço não permitido retorna erro de validação explícito, sem
  gravar sessão.
- Erro de analytics não altera resultado do fluxo de booking.
- Consentimento não é inferido pelo endpoint; o cliente deve bloquear chamadas sem opt-in.
- Produção deve aplicar a proteção anti-abuso aprovada para a callable; emulator usa fixture
  controlada.

O evento de conclusão de booking não é aceito desta callable. Quando houver opt-in, a
requisição existente de criação pode incluir um `analyticsSessionId` opcional. A callable de
booking atualiza `bookingCreated` somente depois do commit real; essa atualização é best
effort, validada contra o tenant da reserva, e não pode mudar o resultado de booking.

## Consulta do dashboard

**Superfície prevista**: callable autenticada para papel `backoffice`.

**Entrada conceitual**: ano e mês opcionais/validados; nenhum `tenantId` ou lista de
destinatários é aceito.

**Autorização**: derivar tenant de `authorizeActor`; devolver apenas aggregates do mesmo
tenant. A response não contém telefones, nomes de clientes, sessão individual, IDs de
appointment, usuário, secrets ou campos internos de appointment.

**Resposta conceitual**:

```json
{
  "year": 2026,
  "month": 9,
  "timezone": "America/Sao_Paulo",
  "sourceCounts": {},
  "serviceInterest": [],
  "bookingsByService": [],
  "funnelCounts": {},
  "popularStartHours": [],
  "returningCustomerCount": 0,
  "estimatedRevenueCents": 0,
  "opportunities": [],
  "journeyCoverage": "consented_visitors_only"
}
```

Resultados financeiros usam a definição de receita estimada e período da spec; não são a
response de `calculateSalesReport`.

## GTM/GA4

- Inicializar tags somente depois de consentimento explícito.
- Emitir eventos globais allowlisted e `page_view` sem slug, product ID, `tenantId`,
  appointment ID, dados pessoais ou query string arbitrária.
- Normalizar rotas para templates e escolher uma única fonte de pageview para inicialização
  e navegação Vike, para evitar duplicidade.
- O `dataLayer` não é fonte de autorização, métrica financeira ou dado por tenant; a camada
  first-party Firebase é a fonte dos indicadores empresariais.

## Resumo mensal no dashboard

- Geração idempotente por empresa/período; período é calculado no timezone da empresa.
- O snapshot não contém detalhes individuais de clientes e é consultado por callable
  autenticada no dashboard, com tenant derivado de `authorizeActor`.
- Falhas de geração são registradas de forma sanitizada; snapshot parcial não é apresentado
  como concluído e a consulta do dashboard não deve falhar silenciosamente.
- Não há envio, notificação ou integração de e-mail neste escopo.
