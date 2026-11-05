# Validação local — Spec 012

Este roteiro será usado na implementação. Executar somente em ambiente local/emulador; não executar deploy, seed/import de produção ou alteração de dados reais.

## Pré-requisitos

- Node.js e npm conforme os requisitos do monorepo.
- Dependências já instaladas na raiz.
- Para testes que exercitam Firestore/Functions, Firebase Emulator Suite disponível e configurado pelo projeto.
- Nenhuma chave de provedor de pagamento: a funcionalidade apenas registra forma e parcelas, sem integração.

## Cenários de validação

### 1. Cadastro e projeção administrativa

Executar:

```powershell
npm run test --workspace backoffice -- src/pages/ProductsPage.spec.tsx
npm run test --workspace functions -- src/functions/products/manage-product.spec.ts
```

Cobrir criação/edição de produto simples e com combinações; ativar/desativar promoção; exigir preço promocional menor que o original em cada combinação; validar estimativa positiva por combinação; rejeitar configuração parcial/inválida; verificar que salvamento atualiza `products` e `public_products` sem perder valores de produto legado ou de tenant diferente.

### 2. Catálogo e seleção de variação

Executar:

```powershell
npm run test --workspace client -- src/pages/CompanyCatalogPage.spec.tsx src/services/catalog.service.spec.ts
```

Validar que promoções ativas de produtos publicados/ativos aparecem na seção anterior à listagem normal, inativas/ausentes não são apresentadas como oferta, cada combinação mostra seus preços originais/promocionais correspondentes e paginação e produtos legados continuam funcionando. Verificar que o fuso público é o da empresa e que os controles acessíveis mantêm uma opção por atributo e formam uma combinação válida.

### 3. Agendamento normal e checkout com estimativa

Executar:

```powershell
npm run test --workspace client -- src/pages/BookingPage.spec.tsx
npm run test --workspace functions -- src/functions/appointments/create-public-appointment.spec.ts
npm run test:emulator
```

Validar ambos os caminhos:

- **Sem estimativa/legado**: o cliente continua selecionando data, profissional e horário; backend revalida disponibilidade, preço e imagem e impede reserva duplicada.
- **Com estimativa**: página apresenta prazo e data provisória no fuso da empresa; profissional é escolhido quando há mais de um (único profissional é automático); o cliente não seleciona data/horário; a Function resolve o horário mais próximo dentro do horizonte vigente, revalida e cria appointment, reservas e notificação numa transação. A resposta/receipt usa o horário atribuído e a data oficial recalculada na criação.
- Uma corrida pelo slot deve resultar em reavaliação do próximo horário ou erro explícito, nunca em receipt falso nem appointment sem reserva.
- Verificar preço efetivo/original, promoção aplicada, preço por combinação, comissão sobre valor efetivo, prazo/data/fuso oficiais e snapshots de forma de pagamento.
- Testar métodos débito, crédito (1 e 5 parcelas), dinheiro e Pix; rejeitar parcelas fora de 1–5, parcelas para outro método e qualquer tentativa de tratar a escolha como pagamento recebido.
- Sem horário dentro do horizonte ou configuração de prazo inválida, a operação não cria sucesso.

### 4. Leitura operacional e compatibilidade

Executar:

```powershell
npm run test --workspace collaborator -- src/pages/AppointmentsPage.spec.tsx
```

Verificar que a equipe consegue ler os novos dados do agendamento; documentos antigos sem snapshots de promoção, estimativa ou pagamento continuam sendo exibidos sem erro e sem valores inventados.

### 5. Build dos workspaces

Executar:

```powershell
npm run build --workspace functions
npm run build --workspace client
npm run build --workspace backoffice
npm run build --workspace collaborator
```

Os quatro comandos devem concluir sem erros de TypeScript ou build. Validar o índice de consulta de promoções no Emulator Suite; não publicar o índice ou executar deploy como parte desta etapa.

## Resultado esperado

Todos os cenários observáveis acima passam; o fluxo com agendamento explícito mantém seu comportamento, o fluxo com estimativa cria somente um agendamento real com reserva e snapshots completos, e nenhum teste depende de serviços de pagamento externos.
