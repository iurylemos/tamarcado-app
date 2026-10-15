# Tamarcado

<p align="center">
  <strong>Descoberta de serviços, agendamentos e gestão para negócios de diferentes segmentos.</strong>
</p>

<p align="center">
  <img alt="React 19" src="https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white">
  <img alt="TypeScript 6" src="https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white">
  <img alt="Vite 8" src="https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white">
  <img alt="Firebase" src="https://img.shields.io/badge/Firebase-Hosting%20%7C%20Functions%20%7C%20Firestore-dd2c00?logo=firebase&logoColor=white">
  <img alt="Tailwind CSS 4" src="https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss&logoColor=white">
  <img alt="Vitest 5" src="https://img.shields.io/badge/Vitest-5-6e9f18?logo=vitest&logoColor=white">
</p>

> **Em uma frase:** o Tamarcado ajuda pessoas a encontrar um serviço e solicitar
> um horário, e ajuda empresas a organizar o catálogo, a equipe e os
> agendamentos em um só lugar.

Este repositório contém as três experiências web do produto e seu backend,
organizados em um monorepo npm. A aplicação pública para clientes tem uma visão
mais detalhada em [client/README.md](./client/README.md).

## O que o produto busca resolver

O fluxo central conecta quem procura um serviço ao negócio que o oferece:

1. **Cliente:** encontra uma empresa, explora os serviços e consulta preço e
   disponibilidade.
2. **Cliente:** escolhe um profissional quando necessário, seleciona um horário
   e solicita o agendamento.
3. **Colaborador:** acompanha a agenda e atende os agendamentos dentro das
   permissões da empresa.
4. **Empresa:** administra seu catálogo e sua operação; a plataforma também prevê
   relatórios e acompanhamento de contatos.

O foco do projeto é tornar esse fluxo simples e confiável para negócios de
segmentos diferentes, sem perder o isolamento dos dados de cada empresa. As
especificações em `specs/` definem cenários, requisitos e critérios de aceite;
consulte-as para saber o escopo planejado de cada funcionalidade. A presença de
uma funcionalidade na especificação não significa, por si só, que ela já esteja
implementada.

### Onde cada parte do produto é desenvolvida

| Área                  | Responsabilidade                                                      | Workspace        |
| --------------------- | --------------------------------------------------------------------- | ---------------- |
| Experiência pública   | Descoberta de empresas, catálogo e solicitação de agendamento         | `client/`        |
| Área do colaborador   | Agenda e operações permitidas para a equipe                           | `collaborator/`  |
| Administração         | Configuração e gestão da empresa                                      | `backoffice/`    |
| Operações confiáveis  | Regras do servidor, persistência e integrações                        | `functions/`     |
| Regras compartilhadas | Tipos, validações e conceitos de domínio sem dependência de interface | `shared/domain/` |

## Arquitetura e workspaces

```text
tamarcado/
├── client/         # Aplicação pública para clientes
├── collaborator/   # Agenda e ferramentas para colaboradores
├── backoffice/     # Administração das empresas
├── functions/      # Backend Firebase Cloud Functions
├── shared/         # Contratos e regras de domínio compartilhados
├── specs/          # Especificações, planos e tarefas de funcionalidades
├── .github/skills/ # Skills do fluxo Spec Kit
└── .agents/skills/ # Skills adicionais para agentes
```

Um **monorepo** mantém projetos relacionados no mesmo repositório. `client`,
`collaborator`, `backoffice` e `functions` são **workspaces npm**: cada um tem
seu próprio `package.json`, scripts e dependências, enquanto a raiz centraliza a
instalação e os comandos comuns. Assim, as aplicações podem evoluir
separadamente e compartilhar contratos sem virar um único frontend.

O fluxo principal é:

1. Os três frontends React usam Firebase para acessar os recursos da plataforma.
2. As Cloud Functions executam operações confiáveis do backend e integram
   serviços, incluindo o provedor Twilio para WhatsApp.
3. O Firestore armazena os dados; suas regras e as funções do servidor aplicam
   limites de acesso por empresa e por papel.
4. `shared/domain/` contém tipos, validações e regras de negócio neutras em
   relação à interface, reutilizáveis pelas aplicações e pelo backend. Não é o
   lugar para compartilhar componentes visuais.
5. Cada frontend mantém sua própria interface, componentes e estilos. No
   `client`, a composição de componentes segue Atomic Design; consulte
   [client/README.md](./client/README.md) para os detalhes dessa aplicação.

As aplicações são publicadas em sites Firebase Hosting separados. As regras e
índices do Firestore estão na raiz do projeto; as funções ficam em
`functions/`. A configuração de Hosting, Functions e emuladores está em
`firebase.json`.

## Tecnologias

| Tecnologia                            | Uso neste projeto                                                   |
| ------------------------------------- | ------------------------------------------------------------------- |
| React 19                              | Interfaces das aplicações web.                                      |
| TypeScript 6                          | Tipos estáticos no frontend, no backend e no domínio compartilhado. |
| Vite 8                                | Desenvolvimento local e build dos frontends.                        |
| Tailwind CSS 4                        | Estilização das aplicações React.                                   |
| Firebase Authentication               | Autenticação dos usuários e colaboradores.                          |
| Cloud Firestore                       | Persistência dos dados e regras de acesso.                          |
| Firebase Cloud Functions (Node.js 24) | Lógica confiável executada no servidor.                             |
| Firebase Hosting                      | Publicação independente dos três frontends.                         |
| Firebase Emulator Suite               | Execução local dos serviços Firebase para desenvolvimento e testes. |
| Vitest                                | Testes automatizados das aplicações e do backend.                   |
| Twilio                                | Integração de mensagens pelo WhatsApp.                              |

As versões indicadas nos badges são as versões principais declaradas nos
manifests do projeto. A configuração exata das dependências está nos
`package.json` e no `package-lock.json`.

## Especificações e tarefas em `specs/`

`specs/` registra o que uma funcionalidade deve fazer e como ela será planejada e
implementada. Cada funcionalidade deve ter sua própria pasta numerada e
descritiva, por exemplo:

```text
specs/
├── 001-saas-appointment-platform/
│   ├── spec.md
│   ├── plan.md
│   ├── tasks.md
│   ├── research.md
│   ├── data-model.md
│   ├── quickstart.md
│   ├── contracts/
│   └── checklists/
└── 002-nome-da-proxima-funcionalidade/
    └── ...
```

- **`spec.md`** descreve o problema, os usuários e seus cenários, prioridades,
  critérios de aceite, requisitos funcionais, casos-limite e resultados
  esperados. Escreva os requisitos como comportamentos observáveis; evite começar
  pela solução técnica.
- **`plan.md`** registra a abordagem técnica escolhida para atender à
  especificação.
- **`tasks.md`** divide o trabalho do plano em tarefas implementáveis,
  ordenadas por dependências e, quando útil, agrupadas por história de usuário.
  Aqui entram as tarefas de implementação e validação — não o código da
  aplicação.
- **`research.md`, `data-model.md`, `quickstart.md`, `contracts/` e
  `checklists/`** documentam decisões técnicas, dados, instruções de verificação,
  contratos e listas de revisão, quando forem necessários.

A funcionalidade existente está em
[`specs/001-saas-appointment-platform/`](./specs/001-saas-appointment-platform/).
Ela é um exemplo do formato e contém a especificação, os artefatos de
planejamento e as tarefas do produto.

### Fluxo recomendado para uma nova funcionalidade

1. Descreva a necessidade em linguagem de produto e peça ao agente para usar a
   skill `speckit-specify`; ela cria ou atualiza a especificação em `specs/`.
2. Revise os cenários e critérios de aceite. Use `speckit-clarify` se houver
   requisitos ambíguos.
3. Use `speckit-plan` para registrar a abordagem técnica e gerar os documentos
   de apoio necessários.
4. Use `speckit-tasks` para criar ou atualizar `tasks.md` com tarefas
   verificáveis e dependências.
5. Revise a consistência dos documentos com `speckit-analyze` e, se o plano já
   estiver parcialmente implementado, `speckit-converge`.
6. Use `speckit-implement` para executar as tarefas. Atualize as caixas de
   seleção de `tasks.md` conforme o trabalho for concluído.

Uma tarefa bem definida indica o resultado esperado, os arquivos ou áreas
envolvidas e como validar a mudança. Não coloque código de produção dentro de
`specs/`; esse diretório guarda os artefatos do processo de desenvolvimento.

## Agentes e skills do projeto

Um **agente** é o assistente que interpreta o pedido, examina o repositório e
executa o trabalho. Uma **skill** é um conjunto de instruções especializadas que
orienta o agente sobre um fluxo ou domínio. As skills deste repositório ficam em
`.github/skills/` e `.agents/skills/`:

- `.github/skills/` contém as skills Spec Kit: especificação, esclarecimento,
  planejamento, tarefas, implementação, análise, checklists, convergência,
  constituição e conversão de tarefas em issues.
- `.agents/skills/` contém skills adicionais, como `tdd` para desenvolvimento
  orientado por testes e `whatsapp-twilio` para mudanças na integração de
  WhatsApp.

Quando a ferramenta de agente utilizada reconhece essas pastas, ela pode
descobrir e seguir as instruções locais da skill. Na conversa com o agente,
indique explicitamente a skill apropriada, por exemplo:

> Use a skill `speckit-specify` para especificar a funcionalidade de lembretes de
> agendamento. Salve os artefatos em uma nova pasta de `specs/`.

Ou, para uma mudança de código:

> Use a skill `tdd` e implemente a próxima tarefa pendente de
> `specs/001-saas-appointment-platform/tasks.md`.

Para adicionar uma skill, crie uma pasta com nome descritivo no diretório de
skills apropriado e inclua um `SKILL.md` com frontmatter `name` e `description`,
objetivo, escopo, passos, restrições e critérios de validação. Inclua arquivos de
apoio somente quando necessários e mantenha segredos fora das instruções e do
controle de versão. As skills orientam agentes; elas não substituem testes,
revisão humana nem as especificações do produto.

Este repositório contém skills, mas não define uma coleção separada de personas
de agentes em `.github/agents/`. A forma de selecionar ou invocar uma skill pode
variar conforme o editor e a extensão de IA.

### Ao começar uma tarefa de desenvolvimento

1. Localize a funcionalidade e os critérios de aceite em `specs/<feature>/`.
2. Identifique qual workspace é responsável pela mudança; mantenha código de
   interface no frontend correspondente e regras reutilizáveis de domínio em
   `shared/domain/`.
3. Para alterações que atravessem o cliente, as permissões e os dados,
   implemente e valide o fluxo completo. Preserve o isolamento entre empresas.
4. Execute os testes e o build relevantes para os workspaces afetados.
5. Atualize as tarefas concluídas em `tasks.md` e registre mudanças necessárias
   na especificação ou nos contratos.

## Pré-requisitos

- Node.js compatível com o runtime `nodejs24` configurado para Cloud Functions.
- npm.
- Firebase CLI, disponível como dependência do projeto (`firebase-tools`).
- Acesso ao projeto Firebase e credenciais adequadas para publicar.

## Instalação e desenvolvimento local

Na raiz do repositório:

```bash
npm ci
```

Copie e preencha os arquivos `.env.example` da aplicação que será executada.
Para Functions, siga `functions/.env.example`; credenciais de serviços, como as
do Twilio, devem permanecer em arquivos locais ignorados pelo Git ou em Firebase
Secrets, nunca no repositório. Para testes locais integrados, use os emuladores
Firebase em vez de apontar acidentalmente para dados de produção.

Abra um terminal para iniciar Auth, Firestore, Functions e Hosting locais:

```bash
npm run dev:emulators
```

Em outro terminal, inicie uma ou mais aplicações:

```bash
npm run dev:client
npm run dev:collaborator
npm run dev:backoffice
```

Os endereços padrão são `http://127.0.0.1:5173` para o cliente,
`http://127.0.0.1:5174` para colaboradores e `http://127.0.0.1:5175` para o
backoffice. O Hosting do emulador usa a porta `5000`; Auth, Firestore e Functions
usam, respectivamente, `9099`, `8080` e `5001`. Configure os arquivos locais de
ambiente para conectar os frontends aos emuladores quando necessário.

Comandos úteis adicionais:

```bash
npm run build             # Compila todos os workspaces que possuem build
npm run build:hosting     # Compila os três frontends
npm run build:functions   # Compila o backend
npm test                  # Executa os testes Vitest
npm run test:emulator     # Executa os testes de Functions com emulador Firestore
npm run lint              # Executa ESLint
npm run format:check      # Verifica formatação com Prettier
```

Também é possível executar os scripts de um workspace diretamente, por exemplo:
`npm run test --workspace client` ou `npm run build --workspace functions`.

## Deploy no Firebase

O Firebase Hosting publica três sites distintos: cliente, colaborador e
backoffice. Os diretórios de build são `client/dist`, `collaborator/dist` e
`backoffice/dist`. As Cloud Functions usam `nodejs24`; a região configurada para
as funções é `southamerica-east1`.

Antes do primeiro deploy, autentique-se e confirme o projeto selecionado:

```bash
npm exec -- firebase login
npm exec -- firebase projects:list
```

O alias de produção no `.firebaserc` é `ta-marcado`, associado ao projeto
`tamarcado-dad82`. Os scripts de deploy seletivo e completo usam explicitamente
esse ID de projeto:

```bash
npm run deploy:hosting     # Build e publicação dos três sites Hosting
npm run deploy:functions   # Build e publicação das Cloud Functions
npm run deploy:all         # Build e publicação de Firestore, Functions e Hosting
```

`npm run deploy:all` publica todos esses recursos no projeto de produção; use-o
somente quando essa for a intenção e você tiver revisado as mudanças. O comando
genérico `npm run deploy` não fixa o projeto e usa o projeto Firebase atualmente
selecionado na CLI. Sempre verifique o destino antes de executar comandos de
deploy. Configure variáveis e segredos de produção no Firebase conforme a
integração utilizada, e não inclua credenciais nos arquivos versionados.

### Importar uma empresa por CSV em produção

O projeto Firebase de produção configurado neste repositório é
`tamarcado-dad82` (alias `ta-marcado` em `.firebaserc`). Informe esse ID
explicitamente em `--project`; não use `demo-tamarcado`, que é o projeto do
emulador.

1. Instale as dependências com `npm ci` e configure as credenciais ADC que o
   Firebase Admin usa (por exemplo, `gcloud auth application-default login`).
   A conta precisa ter permissão para criar usuários no Firebase Authentication
   e documentos no Firestore do projeto `tamarcado-dad82`.
2. Copie o template de exemplo para um CSV operacional no mesmo diretório. CSVs
   operacionais nessa pasta são ignorados pelo Git. No PowerShell:

```powershell
Copy-Item functions\test\fixtures\templates\soft-stylus.example.csv functions\test\fixtures\templates\soft-stylus.csv
```

No Git Bash:

```bash
cp functions/test/fixtures/templates/soft-stylus.example.csv functions/test/fixtures/templates/soft-stylus.csv
```

3. Preencha no CSV as senhas iniciais do administrador e do colaborador e o
   telefone real do colaborador. Revise também os dados e as URLs de imagem. Não
   importe o template sem preencher esses campos.
4. No PowerShell, a partir da raiz do repositório, execute:

```powershell
npm run import:company -- --project tamarcado-dad82 --file soft-stylus.csv --confirm-production-import
```

O `--file` recebe apenas o nome do CSV, que será lido de
`functions/test/fixtures/templates/`. O sinalizador `--confirm-production-import`
é obrigatório. O comando valida todo o CSV localmente antes de inicializar o
Firebase e usa operações create-only; em caso de conflito, não sobrescreve dados
existentes e tenta remover somente os registros criados naquela tentativa.
Sucesso e erros não devem expor senhas nem telefones pessoais. Proteja o CSV e as
credenciais ADC durante a operação e remova o arquivo operacional e suas cópias
temporárias com segurança após confirmar o resultado. Nunca use
`seed:production` para importar empresas: esse script é destrutivo.

O importador ignora colunas vazias extras ao final do cabeçalho e das linhas,
comuns ao salvar planilhas. Preços inteiros como `350` são interpretados como
R$ 350,00; o formato decimal brasileiro, como `350,00`, também é aceito.

## Qualidade e testes

Antes de concluir uma mudança, execute os testes relevantes e o build do
workspace afetado. Para conferir o conjunto de verificações do projeto:

```bash
npm test
npm run lint
npm run format:check
npm run build
```

Consulte também [design-system.md](./design-system.md) ao alterar a experiência
visual das aplicações.

## Rodando as Seed de produção

Isso apaga todas as empresas, e deixa apenas as padrões

```bash
$bucket = "tamarcado-dad82.firebasestorage.app"
$env:VITE_FIREBASE_STORAGE_BUCKET = $bucket
npm run seed:production -- --project tamarcado-dad82 --confirm-production-seed
```

Tamarcado is a TypeScript monorepo for public service discovery, appointment booking, and business operations. I inspected the code and Firebase configuration without modifying files.

Architecture

- client/ is the public React app: customers browse businesses and services, check availability, and request appointments. Its routes include /empresa/:slug and /empresa/:slug/agendar/:productId (client/src/App.tsx:10–14).
- collaborator/ is the authenticated workspace for appointments, customers, messages, and reports (collaborator/src/router/index.tsx:32–38).
- backoffice/ is the authenticated business-admin workspace for the catalog, team, schedule, and company settings (backoffice/src/router/index.tsx:7–15).
- shared/domain/ holds UI-independent domain types and rules reused across workspaces; the root README describes the boundaries (README.md:44–52).
- functions/ contains trusted server-side operations. The frontends are deployed as three separate Firebase Hosting sites; Firebase resource configuration is in firebase.json:16–46.

The frontends initialize Firebase Auth, Firestore, and Functions in the same region, and can connect to local emulators (client/src/config/firebase.config.ts:6–40; backoffice/src/config/firebase.config.ts:7–45). The collaborator app uses both callable Functions and Firestore subscriptions for the live appointment list (collaborator/src/services/appointment.service.ts:34–72).

Firebase Cloud Functions

- functions/src/index.ts:1–41 is the deployment entry point. It exports public catalog and booking operations, collaborator and backoffice operations, reports, WhatsApp message handling, and the storefront renderer.
- Functions are configured for nodejs24 in southamerica-east1 (firebase.json:9–15; functions/src/config/region.ts:1–5). The global options set a 10-instance maximum and a public invoker.
- Most operations are v2 callable Functions. Their handlers are generally thin: they validate or authorize the request, then call domain/service code. Firestore access and business logic are concentrated in functions/src/services/; the Admin SDK is initialized in functions/src/services/firestore.service.ts:13–32.
- Public callables provide business listings, catalogs, availability, and appointment creation. Protected collaborator and backoffice callables use authorizeActor, which checks the Firebase user, the corresponding user document, current status, and that token claims match the document; it also checks allowed roles (functions/src/services/authorization.service.ts:24–61). Collaborator accounts receive tenant, role, active, and professional ID claims (functions/src/services/collaborator-account.service.ts:89–120).
- invoker: 'public' and CORS settings control reachability/browser origins, not user permissions. Protected operations still enforce authorization in their handlers. For example, appointment listing checks for an active collaborator (functions/src/functions/appointments/list-appointments.ts:6–9), while report calculation checks for a backoffice actor (functions/src/functions/reports/calculate-sales-report.ts:6–11).
- Public appointment creation validates the requested service, professional, price/options, and slot availability. It then uses a Firestore transaction to create the pending appointment, reserve its five-minute time buckets, and create a notification job atomically (functions/src/services/booking.service.ts:210–248, 324–429). Reservation IDs are derived from tenant, professional, and time bucket (:200–208), which helps prevent overlapping bookings.
- An onDocumentCreated trigger processes notification jobs with retries (functions/src/functions/appointments/process-appointment-notification.ts:5–13). The notification service sends WhatsApp updates through a provider abstraction; it selects Twilio when configured and has a test double for the emulator (functions/src/services/appointment-notification.service.ts:120–185, 189–224; functions/src/services/whatsapp-provider.service.ts:23–39, 90–114).
- The Twilio webhook is an HTTP Function that accepts POST callbacks, validates Twilio’s signature, maps provider statuses, and applies the resulting event (functions/src/functions/messages/process-provider-webhook.ts:19–52, 54–74).
- Public business pages also use server-side rendering: Firebase Hosting rewrites /empresa/** to renderStorefront; that Function loads published catalog data, renders HTML and metadata, then the client hydrates using the serialized catalog (firebase.json:21–26; functions/src/functions/catalog/render-storefront.ts:90–161; client/src/main.tsx:13–30).

Data access and local development

Firestore rules deny writes from clients and allow only selected reads, including published public records and constrained collaborator access (firestore.rules:26–69). Trusted Functions use the Admin SDK, so server-side operations do not rely on client rules for their own authorization; their handlers must enforce it. Storage permits public reads of product images but restricts uploads to active backoffice users in that tenant, with a 5 MB limit and JPEG/PNG/WebP types (storage.rules:4–20).

The Firebase Emulator Suite is configured for Auth, Functions, Firestore, Storage, and Hosting (firebase.json:48–56); the root scripts include emulator startup and tests (package.json:18–24).

I did not run tests because this was a read-only architecture analysis. The working tree remains as I found it: backoffice/src/components/atoms/MarketBackground/MarketBackground.tsx was already modified, and docker-compose.yml was already untracked.
