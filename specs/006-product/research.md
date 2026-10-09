# Research: Personalização dinâmica de produtos

**Feature**: `006-product`  
**Status**: Concluído

## Decision 1: Armazenar atributos como parte do produto

**Decision**: Representar os atributos opcionais como uma lista tipada no
documento do produto e copiar a mesma configuração pública para a projeção
`public_products`.

**Rationale**: O cadastro, a leitura do backoffice e a publicação já operam por
produto. `saveProduct` grava o documento interno e a projeção pública na mesma
transação do Firestore, mantendo os dados consistentes. Produtos antigos podem
omitir a lista sem migração.

**Alternatives considered**:

- Criar uma coleção separada para atributos/opções: rejeitada por introduzir
  leituras adicionais e sincronização para uma configuração pequena e
  diretamente pertencente ao produto.
- Codificar campos fixos de Cor e Tecido: rejeitada porque cada produto pode
  possuir nomes e opções diferentes.
- Criar um mecanismo genérico de formulários: rejeitado por ser maior que o
  domínio atualmente exigido.

## Decision 2: Reutilizar tipos compartilhados para configuração, entrada e snapshot

**Decision**: Colocar as definições de atributo, opção, seleção e snapshot no
domínio compartilhado e reutilizá-las nos tipos de produto, entrada pública de
agendamento e resposta de agenda.

**Rationale**: Backoffice, client, collaborator e Functions trabalham com os
mesmos dados em limites diferentes. O domínio compartilhado já fornece tipos
para produtos e agendamentos; reutilizá-lo evita contratos divergentes sem
transferir lógica de UI ou persistência.

**Alternatives considered**:

- Manter interfaces independentes em cada aplicação: rejeitada por aumentar a
  chance de divergência nos IDs, nos rótulos e nos dados históricos.
- Usar `Record<string, string>` sem definição de atributo: rejeitada porque
  perde validação de pertencimento, identidade estável e rótulo histórico.

## Decision 3: Enviar IDs e derivar rótulos no servidor

**Decision**: O client envia apenas um `attributeId` e `optionId` para cada
atributo; Functions valida o conjunto contra o documento de produto
tenant-scoped e deriva os rótulos usados no snapshot.

**Rationale**: O client é entrada não confiável. Validar no callable evita
opções fabricadas, duplicadas, desatualizadas ou pertencentes a outro produto.
Derivar os rótulos do cadastro confiável preserva a interpretação histórica.

**Alternatives considered**:

- Enviar nomes e valores como texto autoritativo do client: rejeitada por
  permitir inconsistência ou falsificação.
- Criar um callable por atributo: rejeitada por adicionar round-trips e estados
  de falha sem necessidade.

## Decision 4: Persistir um snapshot opcional no agendamento existente

**Decision**: Guardar IDs e rótulos de atributo/opção como um campo opcional no
documento e nas respostas de agendamento existentes.

**Rationale**: A equipe precisa ler escolhas mesmo após o cadastro ser editado,
e registros antigos não possuem esse campo. As operações existentes já leem e
serializam os campos do documento do agendamento.

**Alternatives considered**:

- Consultar o produto atual ao abrir um agendamento: rejeitada porque alterações
  posteriores mudariam o significado dos pedidos passados.
- Criar uma coleção independente para escolhas: rejeitada por separar dados que
  têm ciclo de vida e acesso iguais aos do agendamento.

## Decision 5: Isolar fixtures específicas da seeding de produção

**Decision**: Criar fixtures de personalização para testes, derivadas dos
registros existentes, sem inserir incondicionalmente o novo negócio/produto de
tecido em `createSeedDocuments()`.

**Rationale**: `createSeedDocuments()` também é importada por
`functions/test/fixtures/seed-production.ts`. Colocar exemplos exclusivamente
de teste no gerador compartilhado poderia semear esses dados ao executar o
seed explícito de produção. Os testes ainda podem reutilizar os mesmos
identificadores e dados-base, aplicando configurações isoladas no ambiente de
teste.

**Alternatives considered**:

- Acrescentar todos os exemplos ao seed compartilhado: rejeitada para evitar
  mistura acidental de dados demonstrativos novos na seeding de produção.
- Não acrescentar exemplos de tecido: rejeitada porque não cobriria o segundo
  atributo pedido nem demonstraria que a configuração é dinâmica.

## Decision 6: Reutilizar o catálogo público existente, incluindo SSR

**Decision**: Acrescentar as escolhas públicas ao formato atual do produto
retornado pelo catálogo e mapear o campo tanto no client quanto na renderização
server-side.

**Rationale**: O client já carrega os dados públicos do catálogo, e o servidor
renderiza o mesmo `CompanyCatalog` para HTML inicial. Reutilizar os dois
caminhos evita uma chamada adicional e mantém SSR/hidratação consistentes.

**Alternatives considered**:

- Carregar opções depois que o formulário abre: rejeitada por adicionar
  carregamento, estado de erro e round-trip por produto.
- Embutir opções no client: rejeitada por impedir configuração por empresa e
  produto.

## Decision 7: Upload direto ao armazenamento de arquivos

**Decision**: O backoffice envia arquivos diretamente ao Firebase Storage com o
SDK web existente. Storage Rules verificam identidade ativa, papel backoffice,
tenant do caminho, tipo MIME e tamanho; metadados continuam sendo gravados
pelos callables autenticados já usados para produtos.

**Rationale**: O SDK Firebase já é uma dependência das aplicações e fornece
upload, URL de download e remoção de objetos. A autorização não depende de
checagens visuais no client; regras impedem envio ou exclusão no caminho de
outra empresa. O client valida os mesmos limites para feedback rápido.

**Alternatives considered**:

- Enviar bytes por callable/Functions: rejeitada por sobrecarregar as
  operações de negócio e exigir codificação/transporte de arquivos grandes.
- Publicar objetos sem Storage Rules tenant-aware: rejeitada por permitir
  alteração de imagens fora do escopo do usuário.
- Persistir apenas URLs externas informadas: rejeitada porque o usuário pediu
  envio de arquivos e as regras de tamanho/tipo/remoção precisam ser aplicadas.

**Verified SDK capabilities**: Firebase docs reference `uploadBytesResumable`,
`getDownloadURL`, `deleteObject`, and `connectStorageEmulator`; current Firebase
JavaScript SDK dependency already includes the Storage module. Firebase Storage
Rules can inspect authenticated custom claims. The repo itself currently has
no Storage Rules or emulator configuration.

## Decision 8: Separar galerias específicas por combinação

**Decision**: Manter a galeria padrão limitada a dez imagens no produto e
guardar cada galeria de combinação em um documento próprio, com referências
exatas a todos os atributos/opções. Publicar metadados em uma coleção pública
consultável por tenant/slug.

**Rationale**: O número de combinações configuradas não tem limite de negócio
na especificação; embutir todas as galerias e imagens em um único documento
pode atingir o limite de tamanho do Firestore. Documentos separados mantêm
cada registro pequeno e permitem um único query público por negócio, evitando
um read por produto.

**Alternatives considered**:

- Embutir todas as galerias no documento do produto: rejeitada por risco de
  exceder o limite de documento com muitas combinações.
- Consultar subcoleções uma a uma por produto: rejeitada por criar padrão N+1
  de leituras na listagem do catálogo.
- Criar uma imagem por opção individual em vez de por combinação: rejeitada
  porque a mesma opção de Cor pode ter imagens diferentes dependendo também de
  Tamanho, como Casal ou King.

## Decision 9: Ordenar atualizações de metadata e arquivos explicitamente

**Decision**: Fazer upload antes de publicar novas referências; para remoção,
remover a referência da galeria primeiro e então apagar o objeto. Qualquer
falha de limpeza pós-metadata é apresentada como falha parcial explícita.

**Rationale**: Firestore e Storage não compartilham transação. Publicar metadata
só depois que os uploads concluírem evita imagens ativas que nunca chegaram ao
Storage. Remover metadata antes do arquivo evita continuar exibindo uma imagem
com URL quebrada caso a deleção falhe; a possibilidade de objeto órfão fica
explícita para que não seja reportada como uma remoção concluída.

**Alternatives considered**:

- Apagar o objeto antes de remover metadata: rejeitada porque falha da
  atualização no Firestore deixaria a galeria apontando para arquivo ausente.
- Tratar múltiplos serviços Firebase como operação atômica: rejeitada porque
  não há transação distribuída entre Firestore e Storage.

## Decision 10: Preservar a imagem selecionada no agendamento existente

**Decision**: O client envia o ID da imagem principal que está exibindo.
Functions resolve o URL confiável da galeria exata/default e grava-o no campo
existente `productImageUrlSnapshot`.

**Rationale**: O colaborador deve ver a foto da combinação solicitada; o campo
de imagem histórica já é consumido pelo card de agendamento e por mensagens.
O servidor verifica se a imagem pertence à galeria efetiva, sem confiar em URL
fornecida pelo client.

**Alternatives considered**:

- Gravar sempre a primeira imagem padrão: rejeitada porque esconderia a
  combinação visual realmente selecionada.
- Aceitar uma URL arbitrária do client: rejeitada por falsificação de imagem e
  associação entre empresas/produtos.

## Contexto técnico verificado

- Produtos são guardados na coleção `products`; a projeção `public_products` é
  mantida em `functions/src/services/backoffice.service.ts`.
- O catálogo do client lê `public_products`; o renderizador de storefront
  também projeta produtos públicos para o HTML inicial.
- `createPublicAppointment` resolve o produto interno antes de gravar preços,
  duração e comissão; a persistência do agendamento já ocorre na transação das
  reservas.
- A listagem da agenda do collaborator converte e repassa os campos existentes
  do documento, permitindo um snapshot opcional sem nova operação.
- Os quatro workspaces já usam TypeScript/Vitest; testes integrados das
  Functions já usam Firestore Emulator.
- O Firebase Web SDK está instalado, mas a configuração de Firebase não tem
  bucket Storage, e `firebase.json` não tem configuração para Storage Emulator
  ou regras; esses itens precisam entrar na implementação.
