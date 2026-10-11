# Research: Importacao de empresas por CSV

## Decisoes

- Reutilizar TypeScript, Node.js e `firebase-admin` ja presentes nos scripts
  locais de seed; nao adicionar dependencia para este importador.
- Manter um CSV simples delimitado por `;`, com uma linha por registro. Os
  valores nao podem conter `;` nem quebras de linha; rejeitar linhas com numero
  incorreto de colunas. Remover BOM UTF-8 do inicio, quando presente.
- Validar todas as linhas, campos obrigatorios, referencias produto/variacao,
  precos, e-mails, telefones e senhas antes de qualquer escrita.
- Nao consultar Firebase para verificar conflitos. Criar usuarios Auth e
  documentos Firestore sem merge; em conflito, a propria criacao falha e a
  importacao para.
- Registrar apenas os UIDs e IDs efetivamente criados nesta execucao para que
  uma falha posterior possa tentar remover somente os novos registros.
- Nao alterar o script `seed:production`, nao limpar dados e nao acessar
  Firebase Storage.

## Racional

O escopo solicitado e um script de cadastro direto, nao um sincronizador ou
ferramenta de auditoria. A validacao local evita chamadas de leitura
desnecessarias. Operacoes create-only evitam substituir dados por acidente.
Manter o formato do CSV restrito permite uma implementacao pequena, adequada ao
arquivo tabular de onboarding.

## Alternativas consideradas

- Consultar Firebase antes de inserir: rejeitada pelo usuario por adicionar
  leitura desnecessaria. A duplicidade sera sinalizada pela tentativa de
  criacao.
- Reutilizar o seed de producao: rejeitada porque ele limpa Auth, Firestore e
  Storage.
- Introduzir parser ou importador generico multi-empresa: rejeitado para manter
  uma empresa por arquivo e o fluxo simples.
