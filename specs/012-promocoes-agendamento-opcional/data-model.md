# Modelo de dados — Spec 012

Este modelo estende documentos existentes. Não cria coleção nem requer migração. Campos novos são opcionais no tipo de leitura para que registros antigos permaneçam válidos; as Functions exigem os campos pertinentes ao criar/atualizar registros novos.

## Produto

**Persistência atual**: `products/{productId}` e projeção `public_products/{productId}`.

| Campo | Escopo | Tipo planejado | Regra |
|---|---|---|---|
| `tenantId` | documento interno/público | `string` | Tenant proprietário; backend sempre valida associação com o ator/empresa do slug. |
| `priceCents` | produto | `number` inteiro | Preço original/base existente; não muda de significado. |
| `promotionActive` | produto | `boolean` opcional | Ausente equivale a `false` para documentos legados. Quando `true`, exige preço promocional válido para o produto ou para todas as combinações. |
| `promotionalPriceCents` | produto sem combinações | `number` inteiro opcional | Menor estritamente que `priceCents`; projetado ao público somente como preço vigente quando a promoção está ativa. |
| `estimatedDeliveryEnabled` | produto | `boolean` opcional | Ausente equivale a `false`. Quando `true`, exige prazo inteiro positivo no produto sem variações ou em todas as combinações. |
| `estimatedDeliveryDays` | produto sem combinações | `number` inteiro opcional | Dias corridos, no calendário local da empresa; obrigatório quando a estimativa está habilitada e não há combinações. |
| `variantPrices` | produto com atributos | `ProductVariantPrice[] \| null \| undefined` | Combinações existentes; preço original continua em `priceCents` dentro de cada item. |

### Combinação `ProductVariantPrice`

| Campo | Tipo planejado | Regra |
|---|---|---|
| `selections` | `ProductCustomizationSelection[]` | Exatamente uma opção existente de cada atributo; chave completa e única. |
| `priceCents` | `number` inteiro | Preço original da combinação; continua sendo a fonte do preço normal atual. |
| `promotionalPriceCents` | `number` inteiro opcional | Obrigatório para todas as combinações com `promotionActive`; deve ser menor que o `priceCents` da própria combinação. |
| `estimatedDeliveryDays` | `number` inteiro opcional | Obrigatório para todas as combinações com `estimatedDeliveryEnabled`; valor maior que zero. |

Quando produto com atributos ainda não tiver `variantPrices` e ativar promoção/estimativa, o backoffice materializa as combinações válidas existentes, inicializando cada preço original com o preço base atual antes de editar os novos campos. Sem ativação de recurso, documentos existentes mantêm sua forma e resolução de preço atual.

No registro interno, valores promocionais inativos podem ser mantidos para edição futura, mas nunca são tratados como vigentes. A projeção pública omite ou neutraliza preço promocional enquanto `promotionActive` for falso. Produto publicado, ativo e com promoção ativa é candidato à seção pública de ofertas.

### Validação do produto

- IDs e seleções devem corresponder às definições atuais de atributos/opções e às combinações válidas existentes.
- `priceCents` e `promotionalPriceCents` são inteiros não negativos dentro do limite numérico validado pelo projeto.
- Promoção ativa: preço promocional obrigatório e estritamente menor que o original em cada combinação.
- Estimativa habilitada: quantidade de dias é um inteiro positivo e deve produzir data gregoriana válida; produto com combinações exige prazo para todas as combinações.
- Ausência de `promotionActive`/`estimatedDeliveryEnabled` e dos campos novos preserva sem promoção/estimativa, sem mudança do fluxo legado.
- A validação confiável é feita por `validateProductInput`/`saveProduct` em Functions; validações no editor servem apenas para resposta imediata.

## Empresa pública

**Persistência**: `public_businesses/{tenantId}`.

Adicionar `timezone?: string` ao documento e ao tipo público para permitir a leitura de projeções legadas. O valor vem do tenant e deve ser um fuso IANA validado; é divulgado apenas para cálculo de datas locais no catálogo. Ao ativar uma estimativa em produto existente, garantir a projeção do fuso na mesma transação que salva o produto; não fazer backfill geral. Produtos sem fuso projetado não podem mostrar uma data estimada calculada no fuso do dispositivo. Não expor outros campos internos do tenant.

## Agendamento/pedido

**Persistência**: `appointments/{appointmentId}` (mantém a entidade e o estado `pending`) mais os documentos já existentes em `booking_reservations` e `appointment_notification_jobs`.

| Campo | Tipo planejado | Regra |
|---|---|---|
| `tenantId`, `productId`, `professionalId`, `startsAt`, `endsAt`, `status` | campos existentes | Horário real atribuído e reservado; continuam obrigatórios para todo agendamento novo. |
| `productPriceCentsSnapshot` | `number` inteiro existente | Mantém o significado atual: preço efetivo usado no agendamento, promocional quando elegível. |
| `productOriginalPriceCentsSnapshot` | `number` inteiro opcional | Preço original da combinação no momento do pedido; igual ao efetivo sem promoção. |
| `promotionSnapshot` | objeto opcional | Presente somente quando aplicada; guarda o preço promocional usado e estado aplicado. Associado à combinação preservada em `customizationSnapshot`. |
| `estimatedDeliveryDaysSnapshot` | `number` inteiro opcional | Prazo da combinação vigente no momento do pedido. |
| `estimatedDeliveryDateSnapshot` | `string` `YYYY-MM-DD` opcional | Data local oficial estimada, calculada no servidor no momento da criação. Não é `startsAt` nem confirmação de entrega. |
| `estimatedDeliveryTimezoneSnapshot` | `string` opcional | Fuso IANA efetivo usado para a data estimada; permite interpretar o snapshot histórico. |
| `paymentMethodSnapshot` | `'debit' \| 'credit' \| 'cash' \| 'pix'` opcional | Valor informativo selecionado no checkout; não indica pagamento recebido. |
| `installmentsSnapshot` | `number` inteiro opcional | Obrigatório entre 1 e 5 quando método for `credit`; ausente para débito, dinheiro e Pix. |

### Criação e compatibilidade

- A Function define `createdAt` no servidor. A data oficial usa a data local empresarial de `createdAt` mais `estimatedDeliveryDays` dias de calendário, começando no dia seguinte (o dia de criação não conta como dia 1).
- Para produto com estimativa habilitada, `startsAt` não vem do cliente. O servidor procura o horário mais próximo do profissional escolhido e cria o appointment e todos os buckets de reserva usando a proteção transacional atual.
- Para produto sem estimativa, `professionalId` e `startsAt` continuam sendo enviados/selecionados pelo fluxo atual.
- A escolha do profissional pode ser omitida somente quando o servidor confirmar que há exatamente um profissional elegível; com mais de um, é obrigatória.
- A forma de pagamento é validada pelo backend. `installmentsSnapshot` não pode existir para forma diferente de crédito, e crédito exige número inteiro de 1 a 5.
- Campos comerciais e de pagamento são snapshots imutáveis para explicar o pedido mesmo após edição do produto.
- Documentos históricos sem snapshots novos continuam sendo lidos; não preencher valores retroativamente.

## Resolução de preço e previsão

Para a seleção válida, a regra compartilhada resolve a combinação exata. Com promoção ativa, retorna preço original e preço efetivo promocional; sem promoção, ambos equivalem ao preço normal. O servidor repete a resolução em dados internos vigentes antes de registrar.

A previsão provisória do catálogo calcula `data local atual da empresa + prazo em dias` e é rotulada como provisória. No envio, o servidor usa `createdAt` e recalcula a previsão oficial. A adição é por data civil, não por milissegundos, para manter o dia correto em transições de fuso.

## Estados relevantes

| Estado/configuração | Comportamento |
|---|---|
| Produto legado sem campos | Preço e agendamento atuais; requer data/horário escolhido no cliente. |
| Promoção ausente/inativa | Preço normal e nenhuma oferta no topo. |
| Promoção ativa e completa | Preço promocional é exibido/aplicado e os snapshots são registrados. |
| Promoção ativa incompleta/inválida | Backoffice rejeita salvamento; servidor nunca cria pedido com valor parcial. |
| Estimativa ausente/desabilitada | Fluxo existente de escolha de data/horário. |
| Estimativa habilitada e completa | Cliente vê previsão; backend atribui/reserva horário mais próximo e registra estimativa oficial. |
| Estimativa habilitada sem prazo válido para combinação | Erro explícito; não gerar data nem criar agendamento. |
| Sem horário reservável ou colisão irrecuperável | Erro explícito; não criar sucesso sem reserva. |
