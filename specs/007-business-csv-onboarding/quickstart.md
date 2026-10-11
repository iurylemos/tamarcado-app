# Quickstart: Validar importacao de empresa por CSV

## Pre-requisitos

- Dependencias do repositorio instaladas.
- Acesso ADC ao projeto Firebase de destino.
- CSV operacional preenchido e protegido, incluindo telefone do Italo e uma
  senha inicial por conta.
- URLs de imagens validas para os oito produtos.
- Guarde o CSV operacional em `functions/test/fixtures/templates/`, passando ao
  comando somente seu nome com `--file`. Arquivos CSV operacionais nesse diretório
  são ignorados pelo Git.
- Proteja tambem arquivos de credenciais ADC e nao os coloque no repositorio.
- Copie o template de exemplo nessa pasta com um nome operacional e preencha as
  duas senhas, o telefone do colaborador e quaisquer dados operacionais que
  estejam vazios.
- Nunca execute `seed:production` para importar o CSV; esse comando e destrutivo.

## Validacao local

```powershell
npm run build:functions
npm run test --workspace functions -- test/fixtures/company-import-csv.spec.ts test/fixtures/import-company-catalog.spec.ts
```

Resultado esperado: build aprovado e testes validando parse, precos em centavos,
referencias, atributos independentes, expansao das combinacoes Soft Stylus e
rejeicao de campos obrigatorios vazios.

## Importacao

O ID do projeto de producao deste repositorio e `tamarcado-dad82` (alias
`ta-marcado` no `.firebaserc`). Copie o template para
`functions/test/fixtures/templates/soft-stylus.csv`, preencha as senhas iniciais e
o telefone real do colaborador e revise os dados antes de continuar. O template
`soft-stylus.example.csv` deixa esses campos vazios de propósito.

Configure ADC (por exemplo, com `gcloud auth application-default login`) para
uma conta que possa criar usuarios no Authentication e gravar no Firestore do
projeto. No terminal, a partir da raiz do repositorio:

```powershell
Copy-Item functions\test\fixtures\templates\soft-stylus.example.csv functions\test\fixtures\templates\soft-stylus.csv
```

Ou, no Git Bash:

```bash
cp functions/test/fixtures/templates/soft-stylus.example.csv functions/test/fixtures/templates/soft-stylus.csv
```

Depois de preencher o arquivo, execute:

```bash
npm run import:company -- --project tamarcado-dad82 --file soft-stylus.csv --confirm-production-import
```

Preencha o CSV antes de importar; nao execute o comando imediatamente apos a
copia do template. O `--file` aceita somente o nome de um CSV que exista em
`functions/test/fixtures/templates/`. O comando recusa projetos `demo-*` e
variaveis de emulador; mantenha o CSV e as credenciais protegidos. Resultado
esperado: uma confirmacao com contagens, sem credenciais nem telefones em stdout.
Duplicidades fazem a operacao parar sem sobrescrever documentos. Validacao de
conflito nao consulta previamente o Firebase. Colunas vazias extras no final,
adicionadas por planilhas, sao ignoradas. Precos inteiros como `350` significam
R$ 350,00; tambem e aceito o formato `350,00`.

Nenhum comando de producao deve ser executado durante testes automatizados.

## Protecao e remocao do CSV

Mantenha cada CSV operacional em `functions/test/fixtures/templates/`; esses
arquivos sao excluidos do controle de versao, exceto os arquivos `*.example.csv`.
Restrinja o acesso ao arquivo e ao arquivo local de credenciais ADC durante a
operacao. Depois de confirmar a importacao, remova o
CSV e as copias temporarias com o mecanismo seguro aprovado pela organizacao para
o sistema operacional e o armazenamento usados. O template sem credenciais
`functions/test/fixtures/templates/soft-stylus.example.csv` permanece versionado.
