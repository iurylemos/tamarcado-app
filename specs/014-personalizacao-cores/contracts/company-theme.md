# Contrato interno: identidade visual da empresa

## Salvamento de configurações

O fluxo é a operação Firebase callable `saveTenantSettings` existente,
invocada pelo serviço `saveCompany` do backoffice. Não será criado callable ou
endpoint novo.

### Campos adicionais de entrada

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| `primaryColor` | string opcional | Não | Hex RGB de seis dígitos, `#` opcional; persistido normalizado |
| `secondaryColor` | string opcional | Não | Hex RGB de seis dígitos, `#` opcional; persistido normalizado |

- O servidor deriva o tenant do ator autenticado e autorizado, não do payload.
- Valores inválidos retornam erro de argumento inválido e não são tratados como
  salvamento bem-sucedido.
- Se um payload não enviar os campos opcionais, os valores já armazenados são
  preservados, mantendo compatibilidade com clientes anteriores.
- Valores válidos são gravados no documento `tenants` e na projeção
  `public_businesses` correspondente dentro da transação existente.
- A resposta de sucesso permanece o contrato existente de salvamento.

## Projeção pública

`CompanySummary` pode incluir `primaryColor` e `secondaryColor` somente quando
válidos. São campos públicos de identidade visual, sem informação pessoal ou
identificador adicional de tenant. O snapshot continua filtrado por
`published == true` e por slug/empresa como atualmente.
Um campo de cor ausente é compatível; um campo presente, mas malformado, deve
ser reportado explicitamente durante leitura/geração, não silenciosamente
convertido em uma cor padrão.

## Contrato de apresentação

- Aplicar cores somente à empresa correspondente à rota atual.
- Usar valores padrão existentes quando um ou ambos os campos estiverem
  ausentes.
- Texto normal em superfícies coloridas deve ter contraste mínimo de 4,5:1;
  limites/indicadores essenciais de controles interativos, 3:1.
- Prévia e página pública devem comunicar as cores com nomes acessíveis e sem
  depender apenas de uma amostra visual.

## Compatibilidade e publicação

- Payloads antigos que não contenham cores continuam válidos.
- Documentos antigos sem cores continuam válidos, sem migração.
- A alteração da página estática ocorre no ciclo existente de build/publicação
  do client. Este contrato não inclui deploy nem publicação automática.
