# Implementation Plan: Importacao de empresas por CSV

**Branch**: `007-business-csv-onboarding` | **Date**: 2026-10-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-business-csv-onboarding/spec.md`

## Summary

Adicionar um script de importacao que le um CSV local com uma empresa,
colaboradores e catalogo e cria os cadastros e contas correspondentes. O
comando valida a estrutura e os valores do proprio arquivo antes de gravar.
Nao busca dados existentes no Firebase: tenta criar os registros sem
sobrescrever e para quando Auth ou Firestore rejeitam uma duplicidade. O seed
destrutivo atual permanece inalterado.

## Technical Context

**Language/Version**: TypeScript, Node.js conforme configuracao existente de Functions  
**Primary Dependencies**: `firebase-admin` ja usado pelos scripts de seed; sem nova dependencia proposta  
**Storage**: Firebase Authentication e Cloud Firestore; sem acesso ao Storage  
**Testing**: Vitest existente em Functions  
**Target Platform**: Script local executado pelo operador em Windows/macOS/Linux  
**Project Type**: Script CLI do workspace Functions  
**Performance Goals**: Importar o CSV de uma empresa com oito produtos e dezenas de variacoes em uma execucao manual  
**Constraints**: Uma empresa por CSV; nao fazer leituras de preflight; criar sem sobrescrita; proteger senhas; nao alterar o seed de producao existente  
**Scale/Scope**: Uma empresa, administrador, colaboradores declarados e catalogo declarado por invocacao

## Constitution Check

- **Domain and User Flow Integrity**: passa. A importacao cria catalogo por
  empresa; os produtos permanecem no fluxo existente de agendamento.
- **Booking and Availability Integrity**: passa. Produtos recebem colaborador e
  horarios validos; intervalo e timezone sao explicitos.
- **Security and Authorization**: passa com a excecao aprovada para login de
  equipe por e-mail/senha. CSV com credenciais e tratado como dado sensivel;
  usuarios recebem papel e empresa corretos.
- **Financial and Reporting Consistency**: passa. Preco de cada variacao e
  importado em centavos e permanece explicito.
- **Testability and Quality**: passa. Parser, conversao, criacao e conflitos
  terao testes automatizados.
- **Separation and Simplicity**: passa. Um script independente reutiliza
  Firebase Admin e os modelos existentes, sem criar novo servico ou UI.
- **Gate result**: aprovado; a excecao de autenticacao da equipe foi registrada
  na constituicao 3.1.0.

## Project Structure

### Documentation

```text
specs/007-business-csv-onboarding/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── company-import-cli.md
└── checklists/
    └── requirements.md
```

### Source Code

```text
functions/test/fixtures/
├── import-company.ts          # CLI de importacao, separado do seed destrutivo
├── company-import-csv.ts      # leitura e validacao do CSV
└── company-import-csv.spec.ts # testes do parser e da conversao

functions/package.json         # comando npm do workspace
package.json                   # comando de conveniencia na raiz
shared/domain/interfaces/
└── tenant.interface.ts        # incluir o segmento home
functions/src/services/
└── backoffice.service.ts      # aceitar home na validacao existente
functions/src/functions/catalog/
└── list-public-businesses.ts  # aceitar home na listagem publica
backoffice/src/pages/
└── CompanySettingsPage.tsx    # rotulo do segmento home
functions/test/fixtures/
└── templates/soft-stylus.example.csv # exemplo sem senha real nem telefone inventado
```

**Structure Decision**: manter o importador perto dos scripts de seed existentes
no workspace Functions, separar parsing do efeito de escrita e nao reutilizar
`seed:production`, que apaga dados.

## Complexity Tracking

Sem violacoes da constituicao que exijam justificativa.
