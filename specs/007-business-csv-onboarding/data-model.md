# Data Model: Importacao de empresas por CSV

## Company

Representa uma empresa criada a partir de uma linha `empresa`.

| Campo                  | Regra                                                          |
| ---------------------- | -------------------------------------------------------------- |
| name                   | Obrigatorio                                                    |
| slug                   | Obrigatorio, identificador publico estavel e unico por criacao |
| segment                | Obrigatorio; Soft Stylus usa `home`                            |
| description            | Texto publico                                                  |
| phoneE164              | Opcional                                                       |
| emailDomain            | Obrigatorio para validar e-mails de colaboradores              |
| timezone               | Fuso IANA valido; exemplo `America/Fortaleza`                  |
| bookingIntervalMinutes | Inteiro valido, multiplo de cinco                              |
| active                 | Criada ativa                                                   |

Uma linha de empresa tambem declara o nome, telefone opcional, e-mail e senha
inicial do usuario backoffice.

## Staff Account and User

Representa o administrador ou o acesso de um colaborador.

| Campo          | Regra                                                                   |
| -------------- | ----------------------------------------------------------------------- |
| uid            | Derivado de identificador estavel do negocio/colaborador                |
| email          | Obrigatorio, valido e unico entre contas do arquivo                     |
| password       | Obrigatoria segundo a politica existente; nunca persistida em Firestore |
| tenantId       | Aponta para a empresa importada                                         |
| role           | `backoffice` para administrador ou `collaborator` para colaborador      |
| professionalId | Obrigatorio para colaborador; ausente para administrador                |
| active         | `true` na importacao                                                    |

## Professional

Representa cada colaborador que pode atender produtos.

| Campo     | Regra                                   |
| --------- | --------------------------------------- |
| id        | Estavel e obrigatorio no CSV            |
| tenantId  | Aponta para a empresa                   |
| name      | Obrigatorio                             |
| phoneE164 | Telefone brasileiro com DDD normalizado |
| active    | `true` na importacao                    |

Cada profissional e associado a todos os produtos do arquivo e recebe os dias
e periodos de disponibilidade configurados na linha da empresa.

## Product and Variant

Cada linha `produto` declara um produto agendavel e uma imagem HTTPS/HTTP. As
linhas `variacao` continuam declarando opcoes precificadas de um unico atributo.
Produtos com varias dimensoes usam linhas `atributo`, `opcao` e
`preco_combinacao`; cada linha de preco pode usar `*` para agrupar opcoes que
compartilham o mesmo valor.

| Campo                            | Regra                                                           |
| -------------------------------- | --------------------------------------------------------------- |
| id                               | Estavel e obrigatorio                                           |
| name                             | Obrigatorio                                                     |
| durationMinutes                  | Positivo; Soft Stylus usa 30 minutos por produto                |
| imageUrl                         | Obrigatoria                                                     |
| customizationAttributes          | Um atributo `Variacao` ou os atributos independentes declarados |
| variantPrices                    | Um preco inteiro em centavos para cada combinacao completa      |
| priceCents                       | Menor preco de variacao/combinacao como preco base              |
| commissionType / commissionValue | `fixed` / zero por padrao                                       |
| active / published               | `true`                                                          |

Cada produto deve ter ao menos duas variacoes/opcoes. Em produtos com um atributo,
a primeira variacao e a selecao padrao. Em produtos com atributos independentes,
a primeira opcao declarada para cada atributo e seu padrao, e cada combinacao
precisa ter um preco exato. O CSV Soft Stylus conserva 33 variacoes legadas e
define 432 precos para o combo `Sofá + Poltronas`.

## Working Hours

Criado para cada combinacao de profissional e dia configurado.

| Campo                         | Regra                                        |
| ----------------------------- | -------------------------------------------- |
| tenantId                      | Empresa importada                            |
| professionalId                | Profissional associado                       |
| dayOfWeek                     | Dias da semana selecionados no CSV           |
| startLocalTime / endLocalTime | Horas locais validas, inicio anterior ao fim |
| active                        | `true`                                       |

Padrao Soft Stylus: segunda a sabado, 09:00–18:00 no fuso da empresa.

## Relationships and constraints

- Uma empresa possui um administrador, zero ou mais colaboradores e produtos.
- Um colaborador pertence a uma empresa e pode atender um ou mais produtos.
- Cada produto pertence a uma empresa e tem uma lista completa de combinacoes
  precificadas.
- Cada documento criado usa operacao sem merge. IDs em conflito interrompem a
  importacao, sem ler previamente o Firebase nem sobrescrever o documento.
- Senhas existem somente durante o processo de criacao Auth e nao sao gravadas
  em documentos.
