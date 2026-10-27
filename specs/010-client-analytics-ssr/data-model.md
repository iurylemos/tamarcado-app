# Modelo de Dados: Analytics por Empresa e Renderização do Cliente

Este é um modelo lógico de planejamento, não uma migração executada. As coleções novas são
raiz e server-only; as regras Firestore permanecem deny-by-default para clientes não
autorizados.

## Convenções

- O `tenantId` é resolvido pelo servidor a partir de slug público publicado ou de ator
  autorizado. O cliente nunca o escolhe como prova de autorização.
- Eventos first-party só são aceitos após opt-in explícito. Não incluir PII, conteúdo de
  formulário, URL integral ou identificador de agendamento em eventos ou agregados.
- Valores BRL permanecem inteiros em centavos. Datas de agendamento são instantes; períodos
  de relatório usam IANA timezone da empresa.
- A coleção atual `monthly_reports` continua contendo somente projeções existentes de
  vendas concluídas/comissões.

## Fontes existentes reutilizadas

### `appointments`

Usar `AppointmentDocument` como fonte de contagem, status, serviço, horário marcado, preço
histórico e histórico de atendimento. Cada leitura de relatório filtra por `tenantId` e
período. O telefone E.164 pode ser comparado apenas em memória no backend para contar
retorno; não é copiado para novas entidades analytics nem retornado ao Backoffice.

### `public_businesses` e `public_products`

Usar projeções públicas para SSR e para validar o slug/serviço recebido em eventos.
Projeções publicadas não incluem dados financeiros internos, telefones, usuário ou
autorização.

## Entidades propostas

### `analytics_sessions`

Documento temporário de estado de jornada após consentimento explícito. Um documento
representa uma sessão aleatória curta, não uma pessoa.

| Campo | Tipo | Regra |
|---|---|---|
| `tenantId` | string | Obrigatório; atribuído pelo servidor após resolver slug publicado |
| `sessionId` | string | Opaque/aleatório; não derivado de usuário, telefone ou appointment ID |
| `startedAt` | timestamp | Primeiro evento consentido |
| `lastEventAt` | timestamp | Atualizado em evento válido; usado para detectar abandono |
| `sourceCategory` | enum | `google`, `instagram`, `ads`, `direct`, `other` ou `unknown` |
| `campaign` | string opcional | Somente valor sanitizado/allowlisted; sem query string ou dado livre |
| `lastStep` | enum | Última etapa allowlisted do funil |
| `interestedProductIds` | string[] | IDs públicos de serviços visualizados/selecionados |
| `bookingCreated` | boolean | Atualizado pelo backend somente após criação válida do appointment |
| `expiresAt` | timestamp | Expira 90 dias após o início; aprovado e sujeito a exclusão por TTL |

**Regras**: O endpoint público não aceita `tenantId`; valida slug, sessão, etapa, serviço,
payload e frequência. A escrita é apenas por Function/Admin SDK. Nenhum nome, telefone,
e-mail, conteúdo de campos, valor de pagamento ou ID de appointment é armazenado.
Abandono é contado após 30 minutos sem atividade e sem conclusão. A sessão de analytics não
é usada para autorização, booking ou identidade persistente. O endpoint público de eventos
não pode marcar `bookingCreated`; a callable de booking só atualiza a sessão correspondente
após confirmar a transação do appointment e nunca falha o booking por indisponibilidade de
analytics.

### `monthly_analytics_reports`

Snapshot agregado idempotente para uma empresa/período, separado da coleção de vendas.

| Campo | Tipo | Regra |
|---|---|---|
| `tenantId` | string | Obrigatório; sempre escrito pelo servidor |
| `year`, `month` | integer | Chave do período civil no timezone da empresa |
| `timezone` | string | IANA timezone usada na geração |
| `generatedAt` | timestamp | Instante server-side da geração/reconciliação |
| `sourceCounts` | map | Contagens agregadas por categoria; apenas visitantes consentidos |
| `serviceInterest` | map | Contagem agregada por ID público de serviço |
| `funnelCounts` | map | Sessões agregadas por etapa, abandono e conclusão |
| `bookingsByService` | map | Contagem de agendamentos não cancelados por serviço/data marcada |
| `popularStartHours` | map | Contagem por horário local no período |
| `returningCustomerCount` | integer | Somente contagem; nunca lista ou chave de cliente |
| `estimatedRevenueCents` | integer | Soma de snapshots de não cancelados; não é pagamento recebido |
| `opportunities` | object[] | Regras e métricas de suporte; sem inferência causal ou IA |

**ID determinístico**: tenant + ano + mês. Geração repetida substitui apenas o snapshot do
mesmo período, respeitando a política de retificação. A falha de geração deve ser registrada
para tratamento e não pode ser apresentada como snapshot concluído. O snapshot é consultado
no dashboard autenticado; envio e notificação por e-mail não fazem parte do modelo.

### Preferência de analytics no Cliente

Escolha explícita, separada do opt-in de WhatsApp. O estado local indica se a interface pode
inicializar GTM e emitir eventos first-party. Padrão `denied`; `granted` somente após ação
afirmativa; retirada bloqueia chamadas futuras e encerra a sessão client-side. A
implementação não infere consentimento de configuração de WhatsApp ou de login.

## Cálculos derivados

- **Interesse por serviço**: sessões consentidas com visualização/seleção do serviço, contadas
  uma vez por regra de sessão definida no contrato.
- **Agendamentos por serviço**: appointments não cancelados no mês da data marcada, agrupados
  por `productId`.
- **Abandono**: sessão consentida sem `bookingCreated`, inativa por pelo menos 30 minutos;
  usar `lastStep` para atribuir a etapa.
- **Horário mais procurado**: início marcado agrupado pela hora local da empresa e excluindo
  cancelamentos.
- **Retorno**: cliente com appointment `completed` anterior ao início do período e outro
  `completed` dentro dele; computar sem persistir uma chave estável de cliente.
- **Receita estimada**: soma de `productPriceCentsSnapshot` para appointments `pending`,
  `confirmed` ou `completed` cuja data marcada cai no período; excluir `cancelled`.
- **Oportunidades**: regras determinísticas só quando há suporte quantitativo suficiente;
  referenciar a métrica de origem e usar linguagem de observação, não causalidade.
