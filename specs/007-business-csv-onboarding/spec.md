# Feature Specification: Importacao de empresas por CSV

**Feature Branch**: `007-business-csv-onboarding`  
**Criada**: 2026-10-10  
**Status**: Aprovada para planejamento  
**Input**: Criar uma forma reutilizavel de cadastrar empresas, colaboradores e catalogos a partir de CSV; iniciar com a Soft Stylus como exemplo para o segmento de colchao, cabeceiras e estofados.

## Objective

Permitir que um operador prepare uma empresa e seu backoffice em uma unica
importacao, sem preencher manualmente cada cadastro. O resultado deve incluir
uma conta administrativa, contas e perfis dos colaboradores, catalogo com
precos por variacao e disponibilidade para agendamentos. A primeira empresa de
exemplo e a Soft Stylus, em Fortaleza.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Cadastrar uma empresa a partir de um arquivo (Priority: P1)

Como operador do Tamarcado, quero importar um CSV de uma empresa para criar seus
dados basicos e o acesso do administrador, para que o backoffice esteja pronto
para configuracao sem cadastrar tudo manualmente.

**Why this priority**: a criacao repetivel de empresas e o objetivo
principal desta funcionalidade.

**Independent Test**: importar um arquivo valido com dados de empresa e
administrador e verificar que o administrador acessa o backoffice associado a
essa empresa.

**Acceptance Scenarios**:

1. **Dado** um CSV valido com exatamente uma empresa e um administrador,
   **quando** o operador confirmar a importacao, **entao** a empresa e publicada
   e o administrador recebe acesso vinculado a ela.
2. **Dado** um CSV com duas linhas de empresa ou sem uma linha de empresa,
   **quando** o operador tentar importar, **entao** a importacao e recusada com
   uma indicacao do problema e sem criar dados.
3. **Dado** um slug ja utilizado por outra empresa, **quando** o operador
   importar o arquivo, **entao** os dados existentes permanecem intactos e a
   importacao e recusada.

---

### User Story 2 - Importar colaboradores com seus acessos (Priority: P1)

Como administrador ou operador, quero incluir cada colaborador com nome,
telefone, e-mail e senha inicial, para que ele tenha um perfil de trabalho e
possa entrar no sistema.

**Why this priority**: colaboradores precisam estar associados aos
produtos e aos horarios para que a empresa possa receber agendamentos.

**Independent Test**: importar uma empresa com Italo como colaborador,
verificar seus dados de perfil, o acesso correspondente e a associacao aos
produtos da empresa.

**Acceptance Scenarios**:

1. **Dado** um colaborador com identificador, nome, telefone brasileiro, e-mail
   compativel com o dominio da empresa e senha inicial valida, **quando** o CSV
   for importado, **entao** seu perfil e acesso ficam vinculados a empresa.
2. **Dado** um colaborador sem telefone, e-mail, senha ou identificador valido,
   **quando** o CSV for importado, **entao** a importacao e recusada antes de
   criar dados.
3. **Dado** um arquivo com e-mails repetidos ou e-mail de colaborador fora do
   dominio configurado, **quando** o operador importar, **entao** recebe um erro
   acionavel e nenhum dado da empresa e alterado.

---

### User Story 3 - Importar um catalogo com variacoes e precos (Priority: P1)

Como empresa, quero importar produtos com opcoes e precos proprios para cada
variacao, para que clientes vejam a oferta correta e possam solicitar um
agendamento.

**Why this priority**: o catalogo e a principal informacao comercial da
Soft Stylus e do exemplo para futuros clientes.

**Independent Test**: importar os oito produtos e conferir no catalogo
publico todos os nomes, as 33 variacoes legadas e as 432 combinacoes
precificadas do produto `Sofá + Poltronas`.

**Acceptance Scenarios**:

1. **Dado** um produto com variacoes declaradas e precos validos, **quando** o
   arquivo for importado, **entao** cada opcao e publicada com seu preco exato.
2. **Dado** uma variacao que referencia um produto inexistente, um nome de
   variacao duplicado ou um preco invalido, **quando** o operador importar,
   **entao** o arquivo e recusado antes de qualquer gravacao.
3. **Dado** uma variacao valida, **quando** um cliente a selecionar no fluxo
   existente, **entao** o preco correspondente e usado no resumo e no
   agendamento.

---

### User Story 4 - Rejeitar importacoes inseguras sem afetar dados existentes (Priority: P1)

Como operador, quero que o sistema valide todo o arquivo antes de gravar e nunca
substitua dados existentes, para que erros de importacao nao danifiquem outras
empresas nem exponham credenciais.

**Why this priority**: a importacao cria contas e dados em ambiente de
producao; falhas precisam ser seguras e identificaveis.

**Independent Test**: tentar importar arquivos malformados e arquivos com
conflitos, verificar que nao ha alteracoes e confirmar que erros e resultados
nao mostram senhas.

**Acceptance Scenarios**:

1. **Dado** um CSV malformado ou incompleto, **quando** o operador tentar
   importa-lo, **entao** recebe uma mensagem que identifica a linha ou o campo
   incorreto, sem que qualquer conta ou documento seja criado.
2. **Dado** um e-mail ou identificador que ja exista, **quando** o operador
   importar, **entao** nenhum cadastro existente e sobrescrito.
3. **Dado** uma falha durante a criacao das contas ou dos cadastros, **quando**
   a importacao for interrompida, **entao** contas criadas por essa tentativa
   sao removidas e nenhuma conta preexistente e removida.
4. **Dado** uma senha presente no CSV, **quando** a importacao tiver sucesso ou
   falhar, **entao** a senha nao aparece em mensagens, logs ou relatorios.

### Edge Cases

- Uma coluna contem ponto e virgula, aspas ou quebra de linha escapada.
- O arquivo possui marcadores de codificacao ou cabecalhos duplicados.
- Um produto tem menos de duas variacoes ou duas variacoes com o mesmo nome.
- Existem colaborador ou produto sem associacao valida na empresa.
- O telefone nao pode ser normalizado como telefone brasileiro com DDD.
- Uma conta ou identificador existe antes da importacao.
- O arquivo ultrapassa o limite de registros que pode ser criado sem risco de
  gravacao parcial.
- Uma conta e criada, mas uma etapa posterior falha; a recuperacao nao deve
  excluir contas que nao pertencem a tentativa atual.
- O arquivo de exemplo tem senha ou telefone obrigatorios vazios e, portanto,
  nao pode ser importado ate que esses dados sejam preenchidos.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O operador DEVE poder importar um arquivo delimitado por ponto e
  virgula, com uma unica empresa descrita por linhas tipadas como empresa,
  colaborador, produto, variacao, atributo, opcao e preco_combinacao.
- **FR-002**: A importacao DEVE exigir uma confirmacao explicita antes de
  gravar dados em producao e DEVE recusar projetos de demonstracao/emulador.
- **FR-003**: O sistema DEVE validar todo o arquivo, as referencias entre linhas
  e as restricoes dos dados antes de criar contas ou cadastros. A validacao
  previa DEVE ser local ao arquivo e NAO DEVE consultar dados existentes no
  Firebase.
- **FR-004**: Para cada empresa, o sistema DEVE criar uma empresa publicada e
  uma conta de administrador com acesso limitado a essa empresa.
- **FR-005**: Para cada colaborador, o sistema DEVE criar perfil e conta
  vinculados a empresa; nome, telefone brasileiro, identificador, e-mail e senha
  inicial sao obrigatorios. O e-mail DEVE pertencer ao dominio da empresa.
- **FR-006**: As senhas iniciais DEVEM ser fornecidas no CSV, uma por conta, e
  satisfazer a politica minima de senha vigente. O sistema NAO DEVE incluir
  senhas no template de exemplo nem exibi-las em respostas, erros ou logs.
- **FR-007**: O arquivo preenchido com credenciais DEVE ser tratado como dado
  privado, fora do controle de versao, e removido com seguranca depois do uso.
- **FR-008**: Cada produto DEVE ter imagem, duracao, identificador estavel e ao
  menos duas opcoes precificadas. Os precos no CSV usam decimal brasileiro, por
  exemplo `350,00`, e DEVEM ser preservados exatamente em centavos.
- **FR-009**: O importador DEVE manter o tipo legado `variacao` como um unico
  atributo e DEVE aceitar multiplos atributos por meio de `atributo` e `opcao`.
  Para precos por combinacao, `preco_combinacao` DEVE cobrir cada combinacao
  possivel exatamente uma vez; `*` pode agrupar opcoes com o mesmo preco. A
  primeira variacao/opcao declarada e a selecao inicial do atributo.
- **FR-010**: A empresa importada DEVE associar todos os produtos a todos os
  colaboradores importados e criar para eles horarios de atendimento validos.
- **FR-011**: A duracao, o fuso e a agenda padrao DEVEM ser configuraveis no CSV.
  Os valores iniciais da Soft Stylus sao 30 minutos por produto, `America/Fortaleza`,
  de segunda a sabado, das 09:00 as 18:00.
- **FR-012**: O segmento `home` DEVE ser aceito e exibido nas configuracoes da
  empresa e na listagem publica de empresas.
- **FR-013**: A importacao DEVE tentar criar cada registro sem sobrescrever
  registros existentes. Se Auth ou Firestore rejeitar uma duplicidade, a
  importacao DEVE parar e informar o conflito sem consultar previamente o
  Firebase.
- **FR-014**: Se uma falha ocorrer depois da criacao de contas novas, o sistema
  DEVE remover somente as contas criadas pela tentativa atual e apresentar o
  resultado da recuperacao sem dados sensiveis.
- **FR-015**: Ao concluir, o sistema DEVE informar a empresa e as contagens de
  cadastros criados, sem repetir senhas ou telefones pessoais.
- **FR-016**: A funcionalidade NAO DEVE criar checkout, pedidos, pagamentos ou
  estoque; os produtos permanecem no fluxo atual de agendamento.
- **FR-017**: O sistema DEVE fornecer um CSV de exemplo preenchido com os dados
  da Soft Stylus, o administrador Gestor Soft Stylus (`admin@softstylus.com`),
  o colaborador Italo (`italo@softstylus.com`) e os oito produtos, incluindo o
  combo `Sofá + Poltronas` configurado por tecido, cor, lugares, modelo e
  quantidade. Seus precos devem derivar dos valores existentes de sofa e
  poltrona; tecidos e cores demonstrativos nao alteram o preco. Senhas e telefone
  do colaborador devem ficar vazios no exemplo.

### Catalogo inicial da Soft Stylus

| Produto          | Variacao e preco (R$)                                                                                                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cabeceira        | Solteiro Padrão Rosa 350; Casal Preta 450; Casal Bege 450; Casal Cinza 450; Casal Rosa 450; Queen Size Preta 550; Queen Size Bege 550; Queen Size Rosa 550; Queen Size Cinza 550; King Size 750; Sob Medida 900 |
| Cama Box + Baú   | Solteiro 950; Casal 1250; Queen Size 1650; King Size 2100                                                                                                                                                       |
| Cama Box         | Solteiro 350; Casal 450; Queen Size 600; King Size 800                                                                                                                                                          |
| Baú              | Solteiro 700; Casal 950; Queen Size 1200; King Size 1500                                                                                                                                                        |
| Sofá + Poltronas | Tecido/cor/lugares do sofá e tecido/cor/modelo/quantidade das poltronas. Preço = sofá escolhido + (poltrona escolhida × quantidade); tecido/cor não alteram o preço.                                            |
| Sofá             | 2 Lugares 1700; 3 Lugares 2300; Retrátil e Reclinável 3200                                                                                                                                                      |
| Poltrona         | Individual Estofada 650; Decorativa 850; Couríssimo Branco 700                                                                                                                                                  |
| Puff             | Redondo 250; Quadrado 280; Retangular 350; Baú Estofado 400                                                                                                                                                     |

### Key Entities _(include if feature involves data)_

- **Empresa**: nome, endereco publico, segmento, descricao, dominio de e-mail,
  telefone opcional, fuso, agenda e estado de publicacao.
- **Conta de acesso**: nome, telefone, e-mail, senha inicial, papel e empresa
  associada.
- **Colaborador**: identificador, dados de contato, empresa, produtos atendidos
  e horarios disponiveis.
- **Produto**: nome, descricao, imagem, duracao, preco base e estado de
  publicacao.
- **Variacao precificada**: produto, nome da opcao e preco final.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Um operador consegue preparar uma empresa com administrador,
  colaboradores e catalogo usando um unico arquivo e uma unica importacao.
- **SC-002**: A importacao valida da Soft Stylus produz exatamente 8 produtos,
  preserva 33 variacoes legadas e publica 432 precos completos para o combo
  `Sofá + Poltronas`, com os totais calculados conforme as opcoes selecionadas.
- **SC-003**: Todas as contas e todos os produtos criados pertencem a empresa
  indicada no arquivo; nenhum cadastro preexistente e alterado.
- **SC-004**: 100% dos arquivos invalidos sao recusados antes de qualquer
  gravacao, e arquivos com conflito nunca sobrescrevem dados existentes.
- **SC-005**: Nenhuma senha do arquivo aparece em mensagens de sucesso, erro ou
  relatorios da importacao.
- **SC-006**: A empresa `home` aparece na listagem publica e pode abrir o
  catalogo no fluxo publico existente.

## Assumptions

- Cada execucao trata uma empresa; um operador pode importar arquivos distintos
  para empresas distintas.
- O login por e-mail e senha segue o fluxo de acesso existente para backoffice
  e colaboradores.
- As senhas no CSV sao texto legivel para o operador. O operador protege o
  arquivo e o remove apos a importacao; o sistema nao envia convites por e-mail
  nem forca troca de senha no primeiro acesso.
- A agenda e duracao padrao representam atendimento/consulta para compra; nao
  indicam fabricacao, entrega ou venda direta.
- O telefone de Italo nao foi fornecido. O template deve deixa-lo em branco e a
  importacao exige que o operador informe um telefone valido.
- O administrador usa `admin@softstylus.com`; imagens do template sao
  ilustrativas e devem ser substituidas pelas fotos reais antes da importacao.
- A politica de comissao nao foi fornecida; os produtos importados usam comissao
  fixa zero.
- Uma empresa pode ter no maximo o numero de registros que o importador consegue
  criar sem permitir gravacao parcial; arquivos maiores sao rejeitados antes de
  criar contas.
