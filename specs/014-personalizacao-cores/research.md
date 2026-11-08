# Pesquisa: Personalização de Cores do Cliente

## Decisões

### Persistir no fluxo e nos documentos já existentes

**Decisão**: Adicionar `primaryColor` e `secondaryColor` como valores opcionais
nos documentos existentes `tenants` e `public_businesses`, atualizados pela
operação `saveTenantSettings` já disponível.

**Racional**: `CompanySettingsPage` já salva as configurações por meio de
`saveCompany`, que invoca `saveTenantSettings`. A função obtém `tenantId` do
ator autenticado e grava o documento privado e sua projeção pública em uma
transação. Isso preserva isolamento e autorização sem criar endpoint, collection,
regra ou migração.

**Evidência no repositório**:

- `backoffice/src/pages/CompanySettingsPage.tsx` é o formulário atual.
- `backoffice/src/services/admin.service.ts` chama o callable existente.
- `functions/src/functions/backoffice/manage-company.ts` fornece o callable.
- `functions/src/services/backoffice.service.ts` grava `tenants` e
  `public_businesses` na mesma transação.
- `functions/src/model/tenant.model.ts` e `shared/domain/interfaces/tenant.interface.ts`
  declaram os tipos atuais.

**Alternativas consideradas**:

- Nova collection: rejeitada pelas restrições aprovadas.
- Mapa local ou arquivo versionado por slug: não permite gerenciar as cores da
  própria empresa pelo backoffice.
- Persistência apenas no navegador: não sincroniza para clientes nem para outros
  dispositivos e não fornece configuração pública por tenant.

### Preservar o ciclo de publicação do storefront

**Decisão**: Incluir cores válidas na projeção pública e no snapshot estático já
existente; não introduzir atualização ou publicação automática.

**Racional**: `client/scripts/public-business-snapshot.ts` lê
`public_businesses` publicado e `client/scripts/generate-storefront.mts` gera as
páginas por slug. O spec 013 documenta que alterações públicas são refletidas
após o próximo build/publicação existente. Essa fronteira é mantida e nenhum
deploy é executado.

**Alternativas consideradas**:

- Buscar uma configuração adicional durante cada visita: adicionaria uma leitura
  em runtime e não atualizaria a renderização estática inicial.
- Adicionar publicação automática: requer nova automação e está fora do escopo.

### Usar tokens existentes e manter fallback exato

**Decisão**: Consumir os tokens CSS de marca existentes por propriedades
customizadas escopadas à empresa atual. Quando os campos não existirem, não
aplicar substituições e manter os tokens padrão atuais. Determinar primeiro plano
contrastante para texto sobre superfícies coloridas.

**Racional**: `client/src/styles/design-tokens.css` e `client/src/styles/theme.css`
já concentram a identidade e os estilos interativos. Escopar o tema ao contexto
da empresa evita estado global mutável entre renderizações SSR e navegações.

**Alternativas consideradas**:

- Valores hard-coded por slug: não suportam escolha no backoffice nem a escala
  multi-tenant.
- Nova biblioteca de temas: não é necessária para duas cores e acrescentaria
  dependência.

### Validar e normalizar cores uma única vez

**Decisão**: Aceitar apenas RGB hexadecimal de seis dígitos, com `#` opcional na
entrada; normalizar o valor antes de persistir e antes de expô-lo ao client.
Compartilhar a validação pura entre aplicações, sem dependência de UI.

**Racional**: O formato é explícito na spec, compatível com picker HTML e seguro
para uso como valor de cor CSS. A validação server-side permanece autoritativa;
um valor ausente em registros antigos mantém o fallback existente.

Payloads antigos do backoffice que não incluam os campos opcionais devem
preservar valores de cor já existentes. Um valor presente, mas inválido, não
deve ser tratado como ausência: a operação deve falhar explicitamente e a
geração do snapshot deve apontar o registro inválido, em vez de ocultar a
inconsistência com o tema padrão.

**Alternativas consideradas**:

- Aceitar qualquer string CSS: permite sintaxes inesperadas e amplia a superfície
  de validação sem valor para esta funcionalidade.
- Validar somente no navegador: não protege a persistência contra chamadas não
  originadas pelo formulário.

## Dependências

- O callable `saveTenantSettings` continua sendo a autoridade de escrita.
- A leitura pública segue limitada a `public_businesses` com
  `published == true`.
- Build e testes devem usar configuração local/emulador conforme os scripts
  existentes; nenhuma consulta ou deploy de produção é necessário.

## Pontos de verificação

- O backend associa as cores ao tenant do ator, nunca a um `tenantId` enviado pelo
  cliente.
- A projeção pública contém somente os dois valores de cor adicionais e não
  serializa `tenantId`.
- A renderização de duas empresas no mesmo processo não compartilha cores.
- Configurações antigas sem cores conservam a aparência padrão.
