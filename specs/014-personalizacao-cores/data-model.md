# Modelo de dados: Personalização de Cores do Cliente

## Campos opcionais em documentos existentes

Não serão criados documentos ou coleções para esta feature. Os campos abaixo
serão adicionados aos tipos dos documentos existentes e escritos pelo fluxo
`saveTenantSettings`.

| Campo | Tipo | Presença | Validação | Uso |
|---|---|---|---|---|
| `primaryColor` | string | Opcional | RGB hexadecimal de seis dígitos; entrada aceita `#` opcional; persistência normalizada com `#` | Destaques e ações principais da empresa |
| `secondaryColor` | string | Opcional | RGB hexadecimal de seis dígitos; entrada aceita `#` opcional; persistência normalizada com `#` | Fundos e detalhes complementares da empresa |

Os valores não contêm canal alfa. A ausência de cada campo é válida e não deve
ser preenchida por migração. Empresa sem valor usa o tema padrão atual; se apenas
um valor existir, o outro permanece no padrão.

## Documentos e projeções

### Documento `tenants` existente

- Fonte autoritativa da configuração privada da empresa.
- Recebe os campos opcionais validados na operação existente.
- A identidade do documento e do tenant vem do ator autorizado no servidor.

### Documento `public_businesses` existente

- Projeção pública correspondente, sincronizada na mesma transação do salvamento.
- Recebe somente `primaryColor` e `secondaryColor` validados, além dos campos
  públicos já sincronizados.
- Continua marcado `published` de acordo com o comportamento existente.
- O `tenantId` necessário à consistência interna não é exposto no estado
  serializado da página.

### Tipos de aplicação

- `CompanyRecord` e `InputCompany` no backoffice representam a configuração da
  empresa ativa e o payload do formulário.
- `TenantDocument`, `Tenant` e `PublicBusiness` refletem os campos opcionais
  existentes em Firestore e no domínio.
- `CompanySummary` representa somente a projeção pública necessária ao client.

## Regras de validação e projeção

1. A entrada deve corresponder a `^#?[0-9A-Fa-f]{6}$`.
2. O valor persistido deve começar com `#` e usar uma representação
   hexadecimal normalizada.
3. O backend é a autoridade de validação; entrada inválida falha com erro
   explícito e não substitui valores válidos já salvos.
4. Campos omitidos por payloads antigos preservam os valores opcionais já
   armazenados.
5. Um campo presente com valor inválido deve falhar explicitamente na validação
   ou geração do snapshot, não ser silenciosamente tratado como ausente.
6. A projeção usada pelo client inclui apenas valores opcionais reconhecidos e
   válidos; não copiar o documento por spread.
7. O tema é determinado pelos dados da empresa da rota atual; nunca usar dados
   de outra empresa como fallback.
8. Campos ausentes em documentos antigos não alteram a projeção nem a identidade
   padrão.

## Ciclo de atualização

`edição autorizada` → `validação` → `gravação transacional dos documentos existentes`
→ `próximo build/publicação do client` → `página pública com as cores`.

Não há migração, nova collection, alteração de regras ou publicação automática.
