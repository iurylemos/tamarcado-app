# Contrato: catálogo público e criação de agendamento

Este contrato documenta as extensões às superfícies existentes. Não cria endpoint REST, coleção ou serviço de pagamento.

## Projeção pública de negócio

`public_businesses/{tenantId}` e a resposta callable de catálogo devem incluir:

| Campo | Tipo | Observação |
|---|---|---|
| `id`, `name`, `slug`, `segment` | tipos atuais | Identificação pública do tenant. |
| `timezone` | `string` IANA opcional em registros legados | Necessário para a previsão local pré-checkout; projetado do tenant ao habilitar uma estimativa. |
| `description`, `logoUrl` | opcionais | Permanecem como atualmente. |

Nenhum outro campo privado de `TenantDocument` faz parte do contrato público.
Para empresas existentes, a projeção deve receber o fuso do tenant na mesma transação que habilita uma estimativa em um produto; não é necessário backfill global. Se uma previsão for solicitada sem fuso projetado, a UI não calcula usando o fuso do dispositivo e informa que a estimativa não está disponível.

## Produto público

`public_products/{productId}` e `PublicProductSummary` mantêm os campos atuais e podem incluir:

| Campo | Tipo | Observação |
|---|---|---|
| `promotionActive` | `boolean` opcional | Ausente é interpretado como falso. |
| `promotionalPriceCents` | `number` inteiro opcional | Preço promocional de produto sem variações; só é vigente/exibido quando ativo. |
| `estimatedDeliveryEnabled` | `boolean` opcional | Ausente é interpretado como falso. |
| `estimatedDeliveryDays` | `number` inteiro opcional | Prazo de produto sem variações. |
| `variantPrices` | array atual com campos opcionais | Cada combinação pode carregar `promotionalPriceCents` e `estimatedDeliveryDays`, além de `selections` e preço original `priceCents`. |

A consulta da seção de ofertas restringe produtos por `businessSlug`, `active == true`, `published == true` e `promotionActive == true`. A projeção não comunica preço promocional como vigente quando a promoção está desativada. O cliente continua limitado a produtos públicos ativos/publicados do slug solicitado.

## Descoberta de profissionais para pedido com estimativa

O fluxo de estimativa não recebe data escolhida pelo cliente. A descoberta de profissionais usa as associações ativas produto-profissional e disponibilidade no horizonte já adotado pelo serviço. Deve oferecer os profissionais que tenham horário reservável nesse horizonte; o cliente escolhe um se houver mais de um. O horário encontrado durante a descoberta é apenas informação para definir opções, não é uma reserva nem autoridade para a criação final.

No envio, a Function repete a busca com os dados vigentes e escolhe o horário mais próximo para o profissional validado. Não confiar em uma data/horário de descoberta enviado pelo cliente.

## Callable `createPublicAppointment`

### Entrada

```ts
interface CreatePublicAppointmentInput {
  businessSlug: string;
  productId: string;
  professionalId?: string;
  startsAt?: string;
  customerPhone: string;
  customerName: string;
  whatsappOptIn?: boolean;
  customizationSelections?: ProductCustomizationSelection[];
  selectedImageId?: string;
  paymentMethod: 'debit' | 'credit' | 'cash' | 'pix';
  installments?: number;
}
```

O objeto representa a forma conceitual do contrato; os tipos reais permanecem no domínio compartilhado.

### Regras condicionais de entrada

- Sempre validar slug/tenant, produto publicado/ativo, seleção de combinações, imagem pertencente à galeria, profissional ativo/associado e dados de contato no servidor.
- Para produto sem estimativa: `professionalId` e `startsAt` continuam obrigatórios e são validados como hoje.
- Para produto com estimativa: `startsAt` deve ser omitido. O servidor pode resolver profissional omitido apenas se confirmar que existe exatamente um profissional elegível; com mais de um, `professionalId` é obrigatório. A Function revalida o profissional e a associação dentro do tenant.
- Não aceitar preço, desconto, elegibilidade promocional, prazo ou data estimada como autoridade do cliente; resolver tudo da configuração interna atual.
- `paymentMethod` é obrigatório para novo checkout. Com `credit`, `installments` é inteiro entre 1 e 5. Para `debit`, `cash` e `pix`, `installments` deve ser omitido.
- Se não houver horário reservável no horizonte atual ou se não for possível concluir a reserva, responder com erro explícito, sem criar receipt de sucesso.

### Resposta

```ts
interface CreatePublicAppointmentResult {
  appointmentId: string;
  status: 'pending';
  professionalId: string;
  professionalName: string;
  startsAt: string;
  endsAt: string;
  effectivePriceCents: number;
  originalPriceCents: number;
  promotionApplied: boolean;
  estimatedDelivery?: {
    days: number;
    estimatedDate: string; // YYYY-MM-DD no fuso da empresa, data oficial do servidor
    timezone: string;
  };
}
```

A resposta estendida permite ao cliente mostrar o horário efetivamente atribuído e a previsão oficial recalculada. A data oficial é distinta do horário de atendimento reservado. O estado de pagamento não faz parte da resposta porque nenhum pagamento é processado.

## Persistência da criação

O sucesso continua sendo a transação existente, com:

1. `appointments/{appointmentId}` em estado `pending`, com preço efetivo no campo atual, snapshots originais/promocionais, estimativa oficial quando aplicável e dados informativos de pagamento/parcelas;
2. `booking_reservations` para todos os buckets do horário real;
3. `appointment_notification_jobs` como hoje.

As escritas permanecem servidor-servidor. Regras atuais de leitura pública e negação de escrita direta são preservadas. Não é criada coleção `orders`.

## Semântica de erros

Entradas malformadas, combinação inválida, promoção/preço/prazo incompatível, profissional fora do tenant, método/parcelas inválidos, indisponibilidade, colisão de reserva e falha de persistência não podem ser convertidos em sucesso ou estimativa confirmada. A UI apresenta mensagem acionável e permite nova tentativa quando apropriado.
