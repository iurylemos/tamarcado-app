# Pesquisa técnica — Spec 012

## Contexto observado

- O produto administrativo e sua projeção pública são gravados em `products` e `public_products` pela mesma transação de `saveProduct`; o acesso é limitado ao tenant autenticado. Referências: `functions/src/services/backoffice.service.ts`, `functions/src/model/product.model.ts`, `functions/src/config/collections.ts`.
- A representação compartilhada de combinações já usa `ProductVariantPrice` com preço inteiro em centavos, e `resolveProductPriceCents` resolve uma combinação exata ou devolve `undefined`. Referências: `shared/domain/interfaces/product.interface.ts`, `shared/domain/product-price.ts`.
- A vitrine cliente pagina a consulta Firestore de produtos públicos por empresa e também possui caminho de catálogo callable para SSR. Referências: `client/src/services/catalog.service.ts`, `client/src/pages/CompanyCatalogPage.tsx`, `functions/src/functions/catalog/get-public-catalog.ts`.
- O fluxo atual de agendamento revalida produto, tenant, profissional, preço, disponibilidade e associação no servidor; a transação cria agendamento, reservas de cinco minutos e trabalho de notificação. Referência: `functions/src/services/booking.service.ts`.
- O serviço de disponibilidade procura horários num horizonte de 31 dias e usa regras, bloqueios, agendamentos e reservas existentes. Referência: `functions/src/services/availability.service.ts`.
- `public_businesses` não inclui atualmente o fuso horário, embora o tenant o tenha. Como a previsão provisória deve usar o dia local antes do checkout, o fuso precisa ser acrescentado à projeção pública e ao tipo compartilhado. Referências: `functions/src/model/tenant.model.ts`, `functions/src/services/backoffice.service.ts`, `shared/domain/interfaces/tenant.interface.ts`.
- As regras Firestore permitem leitura apenas das projeções publicadas/ativas e negam escrita direta; operações administrativas e de agendamento passam por Functions. Referência: `firestore.rules`.
- Existem testes Vitest nos workspaces para produto, catálogo, agendamento e operações de agendamento. Nenhum pacote novo é necessário.

## Decisões

### D1. Estender documentos existentes; não criar entidade de promoção/pedido

**Decisão**: Representar promoção e estimativa em campos opcionais do produto e de sua combinação. O pedido criado pelo checkout continua sendo um documento `appointments`, associado a uma reserva real, como determinado pela spec atualizada.

**Racional**: Mantém a fronteira e a transação de produto existentes, preserva o fluxo operacional no colaborador e evita um segundo modelo de venda/ordem. Campos opcionais não exigem migração e mantêm documentos legados interpretáveis.

**Alternativas consideradas**:
- Criar coleção `promotions`: rejeitada porque a configuração pertence ao produto e não requer ciclo de vida ou consulta independente.
- Criar coleção `orders` sem horário: rejeitada porque a decisão registrada determina que todos os pedidos tenham agendamento e reserva.
- Migrar todos os produtos: rejeitada; ausência dos novos campos já representa o comportamento antigo.

### D2. Usar `ProductVariantPrice` para valores e prazo por combinação

**Decisão**: Manter `priceCents` como valor original e permitir os campos opcionais `promotionalPriceCents` e `estimatedDeliveryDays` em cada `ProductVariantPrice`. No produto sem atributos/combinações, usar os campos de topo equivalentes. Ao ativar promoção ou estimativa em produto com atributos sem preços por combinação, representar as combinações cadastradas usando o modelo compartilhado existente, sem mudar os valores-base.

**Racional**: A combinação atual é a identidade estável para preço e seleção. Preço, promoção e estimativa ficam alinhados a uma única chave e podem ser resolvidos com as seleções já validadas.

**Alternativas consideradas**:
- Criar mapas paralelos de preço promocional e prazo: rejeitada porque duplicaria a chave de combinação e permitiria divergência.
- Tratar prazo como propriedade de produto apenas: rejeitada porque a decisão exige prazo por variação.
- Usar moeda decimal: rejeitada porque o domínio atual opera em centavos inteiros.

### D3. Configuração explícita de ativação

**Decisão**: Adicionar `promotionActive?: boolean` e `estimatedDeliveryEnabled?: boolean` no produto. Se a promoção estiver ativa, deve existir preço promocional válido menor que o original em cada combinação. Se a estimativa estiver ativa, deve haver um inteiro positivo para cada combinação. Para produto sem variações, a validação usa os campos de topo. Ausência dos flags equivale a `false`.

**Racional**: Um flag separa configuração desativada de configuração incompleta. O backend pode rejeitar dados incompletos antes de projetar ou comunicar sucesso.

**Alternativas consideradas**:
- Inferir ativação pela existência de um preço/prazo: rejeitada porque não diferencia campo residual inativo de configuração vigente.
- Aplicar promoção a apenas algumas combinações: rejeitada porque a spec exige preço promocional correspondente para cada variação do produto quando a promoção estiver ativa.

### D4. Projeção pública e consulta de promoção

**Decisão**: Propagar dados vigentes à projeção `public_products`; a seção de ofertas consulta produtos `promotionActive == true`, ativos e publicados, ordenados pelo catálogo. A consulta deve ser indexada no Firestore e o catálogo convencional mantém sua paginação. A projeção pública de negócio inclui o `timezone` IANA para a previsão local; ao habilitar uma estimativa em um produto existente, `saveProduct` garante esse campo a partir do tenant na mesma transação.

**Racional**: A UI pode exibir ofertas antes da lista sem carregar catálogo não publicado/inativo; a projeção e as regras existentes mantêm o isolamento pelo slug/tenant e SSR e navegador podem compartilhar o mesmo dado público. A atualização preguiçosa da projeção de fuso ao salvar o produto evita migração/backfill para empresas existentes.

**Alternativas consideradas**:
- Baixar todas as páginas do catálogo para encontrar promoções: rejeitada porque quebra paginação e aumenta leitura sem necessidade.
- Criar coleção pública de ofertas: rejeitada por duplicar projeções e manter sincronização extra.
- Calcular previsão prévia no fuso do navegador: rejeitada porque diverge do fuso configurado para a empresa.

**Nota sobre índice**: A consulta pública promocional acrescenta `promotionActive` à consulta composta existente. Planejar o índice correspondente em `firestore.indexes.json`; confirmar sua forma no Emulator Suite. Não alterar `firestore.rules`.

### D5. Preço autoritativo e snapshots financeiros

**Decisão**: Compartilhar a resolução do preço original e efetivo por combinação; no backend, reler o documento interno vigente e ignorar valores promocionais ou totais enviados pelo cliente. Manter `productPriceCentsSnapshot` com o preço efetivo já usado hoje, acrescentando snapshots opcionais do preço original e da promoção aplicada. Comissão continua calculada sobre o preço efetivo.

**Racional**: Preserva relatórios atuais baseados no campo existente e permite auditar promoções mesmo após mudança de preço ou desativação.

**Alternativas consideradas**:
- Confiar no total da tela: rejeitada por risco de preço obsoleto/adulterado.
- Renomear ou redefinir `productPriceCentsSnapshot`: rejeitada por incompatibilidade com relatórios e clientes existentes.
- Recalcular histórico pelo preço atual: rejeitada porque viola a consistência financeira histórica.

### D6. Atribuição automática de horário no fluxo com estimativa

**Decisão**: A chamada de criação continua sendo `createPublicAppointment`. Para produto cujo prazo vigente está habilitado, o cliente não envia `startsAt`; o serviço de disponibilidade oferece profissionais associados que tenham horário no horizonte atual e o backend localiza o horário mais próximo para o profissional escolhido, valida-o e cria agendamento/reservas pelo mecanismo transacional existente. O cliente escolhe profissional quando houver mais de um elegível; com um profissional, a seleção é automática. Em corrida de reserva, o backend reavalia o próximo candidato; sem candidato reservável, retorna erro explícito.

**Racional**: O documento final continua satisfazendo o modelo atual de appointment/reservation, não cria fluxo de pedido separado e não permite que o cliente controle a data atribuída.

**Alternativas consideradas**:
- Criar appointment sem `startsAt` e reservar depois: rejeitada porque o modelo e a integridade atual exigem datas e reserva no ato.
- Criar coleção de pedidos sem horário: rejeitada pela decisão de que todo pedido deve ter horário.
- Selecionar horário mais próximo no navegador: rejeitada porque disponibilidade e reserva são autoridade do servidor.

### D7. Captura de forma de pagamento sem processamento

**Decisão**: Adicionar valores de domínio `debit`, `credit`, `cash` e `pix`; para `credit`, validar e armazenar de 1 a 5 parcelas. Guardar somente forma/parcelas como dados informativos do agendamento. Não coletar dados de cartão, integrar provedor ou registrar pagamento como recebido.

**Racional**: Atende o checkout solicitado sem transformar esta funcionalidade em integração financeira ou alterar o estado de pagamento.

**Alternativas consideradas**:
- Integrar processador: explicitamente fora do escopo e desnecessário para registrar a escolha.
- Salvar apenas forma de pagamento no navegador: rejeitada porque o histórico deve estar associado ao agendamento no servidor.
- Criar subsistema de pagamento ou transações: rejeitada porque não há captura/cobrança.

### D8. Estimativa local e data oficial

**Decisão**: Tratar os dias como incremento de data de calendário, não como intervalos fixos de 24 horas. A previsão pré-checkout usa o dia seguinte à data atual no fuso empresarial; após envio, a Function calcula e salva a data oficial a partir do dia seguinte à data local de `createdAt`. A estimativa usa a combinação selecionada e não é igual à data do horário reservado.

**Racional**: Evita erro em mudanças de dia/offset e diferencia previsão visível antes do pedido da referência autoritativa registrada na criação.

**Alternativas consideradas**:
- Somar `N * 86_400_000` milissegundos: rejeitada por divergência em transições de fuso/horário de verão.
- Usar horário do dispositivo: rejeitada por não ser o fuso do negócio.
- Usar `startsAt` futuro como início do prazo: rejeitada pela decisão explícita de iniciar no dia seguinte à criação do pedido.

## Pesquisa externa e dependências

Não foi necessária pesquisa de documentação externa: o plano não adiciona biblioteca, API de terceiro ou serviço Firebase novo. As decisões são compatíveis com os tipos, transações, validações, disponibilidade, timezone e testes já encontrados no repositório.

## Clarificações resolvidas

Não há `NEEDS CLARIFICATION` pendente. As decisões do checkout, atribuição automática, seleção de profissional, parcelamento e data provisória/oficial estão registradas na seção Clarifications de [spec.md](./spec.md).
