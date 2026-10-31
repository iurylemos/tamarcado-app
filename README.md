# Tá Marcado — Multi-Tenant Service Booking and Business Management Platform

**A platform that connects customers with service businesses and simplifies appointment scheduling and daily operations.**

**Demos:**

- Customer: https://tamarcado-dad82.web.app/empresa/soft-stylus
- Collaborator: https://tamarcado-dad82-collaborator.web.app/
- Backoffice: https://tamarcado-dad82-backoffice.web.app/

[![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Hosting%20%7C%20Functions%20%7C%20Firestore-dd2c00?logo=firebase&logoColor=white)](https://firebase.google.com/)

[English](#english) | [Português](#português)

---

## English

### Business Problem

Service businesses often manage customer discovery, appointment scheduling, team calendars, and customer communication through disconnected tools and manual conversations.

Tá Marcado brings these workflows together in a multi-tenant SaaS platform, allowing customers to open a business's page and request appointments while businesses manage their catalogs, teams, schedules, and reports.

### Real-World Use Case

Consider a service business that offers multiple services and employs several professionals.

1. A customer opens the business's public link and explores its services.
2. The customer checks availability, selects a professional when required, and requests an appointment.
3. The business manages its catalog and team through an administrative interface.
4. Collaborators confirm or cancel requests and follow up with customers.
5. Business users can open WhatsApp (`wa.me`) with a pre-filled confirmation message and send it manually.
6. The owner can ask the platform's AI assistant for a growth analysis of the business (in development).

Each business has its own link (`/empresa/{business-slug}`). There is no central directory or marketplace: customers always arrive through the business's own page.

### What Is Implemented

- **Public catalog and booking** for each business, with server-side validation. New requests start as _pending_.
- **Backoffice** for products, professionals, collaborator accounts, working hours, blocked periods, product images, and sales reports.
- **Collaborator workspace** for appointments, customer history, messages, and reports.
- **Booking integrity:** availability is checked again on the server, and reservations help prevent double booking.
- **WhatsApp confirmations** through a `wa.me` link that opens a pre-filled message the business sends manually.
- **Reports** with CSV export.
- **AI-assisted analysis** and **server-side rendering** (described below).

### Applied AI: Business Analysis

Business owners can ask for an analysis of their own results in the backoffice. The idea is simple: the system looks at the business's **summary numbers** (not individual customers), optionally searches the web for market context, and produces a written report with recommendations.

- **Mastra** organizes the AI agent that reads the numbers and writes the report.
- **Tavily** provides the optional public web research that adds market context.
- The report separates facts, inferences, and uncertainty, and cites its sources. The AI only **suggests**; it never changes anything in the business.
- Each analysis only sees data from the requesting business, and no personal customer data is sent to the research service.

This feature is still being built. A request-and-report flow works in the code, but history browsing and approval of proposed actions are not finished, and it needs external provider keys (OpenRouter for the language model and Tavily for research). See the [AI specification](./specs/011-ai-agents-and-business-intelligence/spec.md).

### Faster Public Pages with SSR (Vike)

The customer application uses **Vike** to build each business page on the server before it reaches the browser (server-side rendering). In practice:

- The catalog appears quickly, even before the page's scripts finish loading.
- Shared links show a proper title, description, and image, because each page carries its own metadata.
- Pages for unknown businesses return a correct "not found" response.

On Firebase Hosting, the customer site's `/` and `/empresa/**` addresses are served by a Cloud Function (`renderStorefront`); static files are served directly.

### Architecture

Tá Marcado is organized as an npm monorepo with three independent web applications and a shared backend.

| Workspace        | Responsibility                                                      |
| ---------------- | ------------------------------------------------------------------- |
| `client/`        | Public business catalogs and appointment booking (React + Vike SSR) |
| `collaborator/`  | Appointment management and collaborator workflows                   |
| `backoffice/`    | Business administration, reports, and AI analysis                   |
| `functions/`     | Trusted server-side business logic, SSR, WhatsApp, and AI           |
| `shared/domain/` | Shared domain types, validations, and business rules                |

### Technology Stack

| Technology               | Version / Configuration | Purpose                                           |
| ------------------------ | ----------------------- | ------------------------------------------------- |
| React                    | 19.x                    | Web user interfaces                               |
| TypeScript               | 6.x                     | Static typing across applications and backend     |
| Vite                     | 8.x                     | Frontend development and builds                   |
| Vike                     | Customer app            | Server-side rendering of public business pages    |
| Tailwind CSS             | 4.x                     | UI styling                                        |
| Node.js                  | 24                      | Cloud Functions runtime                           |
| Firebase Cloud Functions | 2nd generation          | Server-side operations                            |
| Cloud Firestore          | Firebase-managed        | Data persistence and tenant-aware access controls |
| Firebase Authentication  | Firebase-managed        | Staff authentication                              |
| Firebase Storage         | Firebase-managed        | Product images                                    |
| Firebase Hosting         | Firebase-managed        | Independent frontend deployments                  |
| Firebase Emulator Suite  | Firebase CLI            | Local development and integration testing         |
| Mastra                   | Functions               | AI agent for business analysis                    |
| Tavily                   | Functions               | Optional public market research                   |
| OpenRouter               | Functions               | Language model provider for reports               |
| WhatsApp (wa.me)         | Click to Chat link      | Manual, pre-filled confirmation message           |
| Sentry                   | Frontends               | Error monitoring in the browser                   |
| Vitest                   | 5.x                     | Automated tests                                   |

Exact dependency versions are defined in the workspace manifests and `package-lock.json`. Firebase service versions are managed separately from npm package versions.

### Engineering Highlights

- **Multi-tenant architecture:** Business data access is constrained by tenant, role, and authorization rules.
- **Reliable appointment booking:** Server-side validation and Firestore transactions coordinate appointment creation and time-slot reservations.
- **Separation of concerns:** Independent frontends, server-side business logic, and shared domain contracts.
- **Asynchronous notifications:** Notification jobs and provider integration support appointment communication.
- **Local development:** Firebase emulators support development and testing without intentionally targeting production data.
- **Engineering workflow:** Feature specifications, implementation plans, tasks, automated tests, linting, and formatting checks.

These are architectural capabilities documented in the repository; they should not be interpreted as a guarantee of zero downtime or production-scale performance.

### Getting Started — 3 Steps

**Prerequisites:** Node.js 24, npm, and Java (JDK 11 or later) for the Firebase Emulator Suite.

**1. Install dependencies**

```bash
git clone https://github.com/iurylemos/tamarcado-app.git
cd tamarcado-app
npm ci
```

**2. Configure and start Firebase emulators**

Copy the `.env.example` files of the frontends (`client/`, `collaborator/`, `backoffice/`) to local, git-ignored environment files and set `VITE_USE_EMULATORS=true` and `VITE_FIREBASE_PROJECT_ID=demo-tamarcado` in each one. For the Functions, copy `functions/.env.example` to a local environment file and put the secrets (`OPENROUTER_API_KEY`, `TAVILY_API_KEY`) in the git-ignored `functions/.secret.local` file, which the emulators read. Then build the backend and start the emulators:

```bash
npm run build:functions
npm run dev:emulators
```

Use a separate terminal for the frontend. Optionally, `npm run seed:emulator` loads synthetic demo data into the local emulators.

**3. Start a web application**

Run the desired application from the repository root:

```bash
npm run dev:client
# or
npm run dev:collaborator
# or
npm run dev:backoffice
```

Default frontend addresses:

- Customer application: `http://127.0.0.1:5173` (open `/empresa/{business-slug}` for a catalog)
- Collaborator application: `http://127.0.0.1:5174`
- Business administration: `http://127.0.0.1:5175`

> Use `npm run dev:emulators` for local work. The `npm run emulators` script is configured with the live project ID.

### Environment Variables

Names only; never commit real values. See each workspace's `.env.example`. For local emulators, Functions secrets go in `functions/.secret.local`. For deployment, only the frontends need `.env` files; the Functions do not.

| Variables                                               | Used by         | Purpose                                                                                                   |
| ------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------- |
| `VITE_FIREBASE_*`, `VITE_USE_EMULATORS`                 | Frontends       | Firebase web configuration and emulator switch (`VITE_FIREBASE_STORAGE_BUCKET` is used by the backoffice) |
| `VITE_SENTRY_*`, `SENTRY_*`                             | Frontend builds | Optional error monitoring (`SENTRY_AUTH_TOKEN` is a build secret)                                         |
| `OPENROUTER_API_KEY`, `TAVILY_API_KEY`                  | Functions       | AI analysis secrets (Firebase Secrets)                                                                    |

### Quality Checks

Run the project's automated checks from the repository root:

```bash
npm test
npm run lint
npm run format:check
npm run build
```

Emulator-based Functions tests are available with `npm run test:emulator`.

### Deployment

`npm run deploy:functions`, `npm run deploy:hosting`, and `npm run deploy:all` publish to the live Firebase project `tamarcado-dad82`. Run them only with authorization and after confirming the target project. They are not part of local setup. Deploying does not require a `functions/.env` file; environment files are needed only by the frontends.

### Results and Metrics

Tá Marcado is being developed as a practical software engineering project focused on service booking, multi-tenant access control, and operational workflows.

No verified business outcome metrics, such as conversion improvement, time saved per booking, or production traffic volume, are published in this README. Performance and reliability claims should be added only when supported by reproducible measurements.

### Repository Structure

```text
tamarcado-app/
├── client/
├── collaborator/
├── backoffice/
├── functions/
├── shared/
├── specs/
├── firebase.json
└── package.json
```

### Documentation

- [Customer application README](./client/README.md)
- [Feature specifications and implementation plans](./specs/)
- [Observability runbook](./specs/008-observability-and-logs/runbook.md)
- [Design system](./design-system.md)

### Security

Never commit credentials, API keys, provider secrets, or production environment files. Use Firebase Secrets or other appropriate secret-management mechanisms for production credentials. Staff access is limited by business, role, and active status, and protected operations are checked on the server. Review the target Firebase project and the effects of any destructive command before running deployment or data-management scripts.

---

<a id="português"></a>

## Português

### Problema de Negócio

Negócios de serviços frequentemente gerenciam a descoberta de clientes, os agendamentos, as agendas da equipe e a comunicação por meio de ferramentas desconectadas e conversas manuais.

O Tá Marcado reúne esses fluxos em uma plataforma SaaS multi-tenant, permitindo que clientes acessem a página de um negócio e solicitem horários enquanto as empresas administram seus catálogos, equipes, agendas e relatórios.

### Contexto de Uso Real

Imagine uma empresa de serviços que oferece diferentes serviços e trabalha com vários profissionais.

1. O cliente abre o link público da empresa e explora os serviços.
2. Consulta a disponibilidade, escolhe um profissional quando necessário e solicita um agendamento.
3. A empresa administra seu catálogo e sua equipe pela interface administrativa.
4. Os colaboradores confirmam ou cancelam as solicitações e acompanham os clientes.
5. Usuários do negócio podem abrir o WhatsApp (`wa.me`) com uma mensagem de confirmação pré-preenchida e enviá-la manualmente.
6. O dono do negócio pode pedir ao assistente de IA da plataforma uma análise de crescimento.

Cada negócio tem seu próprio link (`/empresa/{slug-do-negocio}`). Não existe diretório central nem marketplace: o cliente sempre chega pela página do próprio negócio.

### O Que Já Está Implementado

- **Catálogo público e agendamento** para cada negócio, com validação no servidor. Novas solicitações começam como _pendentes_.
- **Backoffice** para produtos, profissionais, contas de colaboradores, horários de trabalho, bloqueios de agenda, imagens de produtos e relatórios de vendas.
- **Área do colaborador** para agendamentos, histórico de clientes, mensagens e relatórios.
- **Agendamento confiável:** a disponibilidade é verificada novamente no servidor e as reservas ajudam a evitar horários duplicados.
- **Confirmações por WhatsApp** via link `wa.me`, que abre uma mensagem pré-preenchida para envio manual pelo negócio.
- **Relatórios** com exportação em CSV.
- **Análise com IA** e **renderização no servidor** (descritas abaixo).

### IA Aplicada: Análise do Negócio

O dono do negócio pode pedir, no backoffice, uma análise dos próprios resultados. A ideia é simples: o sistema olha os **números resumidos** da empresa (não clientes individuais), busca opcionalmente contexto de mercado na internet e entrega um relatório escrito com recomendações.

- O **Mastra** organiza o agente de IA que lê os números e escreve o relatório.
- O **Tavily** faz a pesquisa pública opcional que traz contexto de mercado.
- O relatório separa fatos, inferências e incertezas, e cita suas fontes. A IA apenas **sugere**; ela nunca altera nada no negócio.
- Cada análise enxerga somente os dados da empresa solicitante, e nenhum dado pessoal de clientes é enviado ao serviço de pesquisa.

Essa funcionalidade ainda está em construção. Existe um fluxo de pedido e relatório no código, mas o histórico de análises e a aprovação de ações propostas ainda não foram concluídos, e são necessárias chaves de provedores externos (OpenRouter para o modelo de linguagem e Tavily para a pesquisa). Veja a [especificação de IA](./specs/011-ai-agents-and-business-intelligence/spec.md).

### Páginas Públicas Mais Rápidas com SSR (Vike)

A aplicação do cliente usa o **Vike** para montar a página de cada negócio no servidor antes de ela chegar ao navegador (renderização no servidor, ou SSR). Na prática:

- O catálogo aparece rapidamente, mesmo antes de os scripts da página terminarem de carregar.
- Links compartilhados mostram título, descrição e imagem adequados, pois cada página carrega seus próprios metadados.
- Páginas de negócios inexistentes retornam a resposta correta de "não encontrado".

No Firebase Hosting, os endereços `/` e `/empresa/**` do site do cliente são atendidos por uma Cloud Function (`renderStorefront`); os arquivos estáticos são servidos diretamente.

### Arquitetura

O Tá Marcado utiliza um monorepo npm com três aplicações web independentes e um backend compartilhado.

| Workspace        | Responsabilidade                                             |
| ---------------- | ------------------------------------------------------------ |
| `client/`        | Catálogos públicos e agendamentos (React + Vike SSR)         |
| `collaborator/`  | Gestão de agenda e operações dos colaboradores               |
| `backoffice/`    | Administração da empresa, relatórios e análise com IA        |
| `functions/`     | Regras de negócio confiáveis no servidor, SSR, WhatsApp e IA |
| `shared/domain/` | Tipos, validações e regras de negócio compartilhadas         |

### Stack Tecnológica

| Tecnologia               | Versão / Configuração    | Finalidade                                     |
| ------------------------ | ------------------------ | ---------------------------------------------- |
| React                    | 19.x                     | Interfaces web                                 |
| TypeScript               | 6.x                      | Tipagem estática nas aplicações e no backend   |
| Vite                     | 8.x                      | Desenvolvimento e build do frontend            |
| Vike                     | Aplicação do cliente     | Renderização no servidor das páginas públicas  |
| Tailwind CSS             | 4.x                      | Estilização das interfaces                     |
| Node.js                  | 24                       | Runtime das Cloud Functions                    |
| Firebase Cloud Functions | 2ª geração               | Operações no servidor                          |
| Cloud Firestore          | Gerenciado pelo Firebase | Persistência e controles de acesso por empresa |
| Firebase Authentication  | Gerenciado pelo Firebase | Autenticação da equipe                         |
| Firebase Storage         | Gerenciado pelo Firebase | Imagens de produtos                            |
| Firebase Hosting         | Gerenciado pelo Firebase | Publicação independente dos frontends          |
| Firebase Emulator Suite  | Firebase CLI             | Desenvolvimento e testes locais                |
| Mastra                   | Functions                | Agente de IA para análise do negócio           |
| Tavily                   | Functions                | Pesquisa pública opcional de mercado           |
| OpenRouter               | Functions                | Provedor do modelo de linguagem dos relatórios |
| WhatsApp (wa.me)         | Link Click to Chat       | Mensagem de confirmação manual e pré-preenchida |
| Sentry                   | Frontends                | Monitoramento de erros no navegador            |
| Vitest                   | 5.x                      | Testes automatizados                           |

As versões exatas das dependências estão nos manifests dos workspaces e no `package-lock.json`. As versões dos serviços Firebase são gerenciadas separadamente das dependências npm.

### Destaques de Engenharia

- **Arquitetura multi-tenant:** o acesso aos dados é limitado por empresa, papel e regras de autorização.
- **Agendamento confiável:** validações no servidor e transações no Firestore coordenam a criação do agendamento e a reserva dos horários.
- **Separação de responsabilidades:** frontends independentes, lógica de negócio no servidor e contratos de domínio compartilhados.
- **Notificações assíncronas:** processamento de tarefas de notificação e integração com provedores.
- **Desenvolvimento local:** emuladores Firebase para desenvolvimento e testes sem direcionar intencionalmente as operações aos dados de produção.
- **Processo de engenharia:** especificações, planos de implementação, tarefas, testes automatizados, lint e formatação.

Essas capacidades arquiteturais estão documentadas no repositório e não representam uma garantia de disponibilidade contínua ou de desempenho em escala de produção.

### Como Executar — 3 Passos

**Pré-requisitos:** Node.js 24, npm e Java (JDK 11 ou superior) para o Firebase Emulator Suite.

**1. Instale as dependências**

```bash
git clone https://github.com/iurylemos/tamarcado-app.git
cd tamarcado-app
npm ci
```

**2. Configure e inicie os emuladores Firebase**

Copie os arquivos `.env.example` dos frontends (`client/`, `collaborator/`, `backoffice/`) para arquivos de ambiente locais, ignorados pelo git, e defina `VITE_USE_EMULATORS=true` e `VITE_FIREBASE_PROJECT_ID=demo-tamarcado` em cada um. Para as Functions, copie `functions/.env.example` para um arquivo de ambiente local e coloque os segredos (`OPENROUTER_API_KEY`, `TAVILY_API_KEY`) no arquivo `functions/.secret.local`, ignorado pelo git, que os emuladores leem. Depois, gere o backend e inicie os emuladores:

```bash
npm run build:functions
npm run dev:emulators
```

Utilize outro terminal para executar o frontend. Opcionalmente, `npm run seed:emulator` carrega dados sintéticos de demonstração nos emuladores locais.

**3. Inicie uma aplicação web**

Execute a aplicação desejada a partir da raiz do repositório:

```bash
npm run dev:client
# ou
npm run dev:collaborator
# ou
npm run dev:backoffice
```

Endereços padrão:

- Aplicação do cliente: `http://127.0.0.1:5173` (abra `/empresa/{slug-do-negocio}` para ver um catálogo)
- Aplicação do colaborador: `http://127.0.0.1:5174`
- Administração da empresa: `http://127.0.0.1:5175`

> Use `npm run dev:emulators` no desenvolvimento local. O script `npm run emulators` está configurado com o ID do projeto real.

### Variáveis de Ambiente

Somente os nomes; nunca versione valores reais. Consulte o `.env.example` de cada workspace. Nos emuladores locais, os segredos das Functions ficam em `functions/.secret.local`. Na publicação, apenas os frontends precisam de arquivos `.env`; as Functions não.

| Variáveis                                               | Usadas por           | Finalidade                                                                                                 |
| ------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------- |
| `VITE_FIREBASE_*`, `VITE_USE_EMULATORS`                 | Frontends            | Configuração web do Firebase e chave dos emuladores (`VITE_FIREBASE_STORAGE_BUCKET` é usada no backoffice) |
| `VITE_SENTRY_*`, `SENTRY_*`                             | Builds dos frontends | Monitoramento de erros opcional (`SENTRY_AUTH_TOKEN` é um segredo de build)                                |
| `OPENROUTER_API_KEY`, `TAVILY_API_KEY`                  | Functions            | Segredos da análise com IA (Firebase Secrets)                                                              |

### Verificações de Qualidade

Execute as verificações automatizadas na raiz do repositório:

```bash
npm test
npm run lint
npm run format:check
npm run build
```

Os testes das Functions com emuladores estão disponíveis em `npm run test:emulator`.

### Publicação

`npm run deploy:functions`, `npm run deploy:hosting` e `npm run deploy:all` publicam no projeto Firebase real `tamarcado-dad82`. Execute-os somente com autorização e após conferir o projeto de destino. Eles não fazem parte da configuração local. A publicação não exige um arquivo `functions/.env`; arquivos de ambiente são necessários apenas nos frontends.

### Resultados e Métricas

O Tá Marcado está sendo desenvolvido como um projeto prático de engenharia de software, com foco em agendamento de serviços, controle de acesso multi-tenant e fluxos operacionais.

Este README não apresenta métricas de resultados de negócio verificadas, como aumento de conversão, tempo economizado por agendamento ou volume de tráfego em produção. Indicadores de performance e confiabilidade devem ser incluídos somente quando sustentados por medições reproduzíveis.

### Estrutura do Repositório

```text
tamarcado-app/
├── client/
├── collaborator/
├── backoffice/
├── functions/
├── shared/
├── specs/
├── firebase.json
└── package.json
```

### Documentação

- [README da aplicação do cliente](./client/README.md)
- [Especificações e planos de implementação](./specs/)
- [Runbook de observabilidade](./specs/008-observability-and-logs/runbook.md)
- [Design system](./design-system.md)

### Segurança

Nunca versione credenciais, chaves de API, segredos de provedores ou arquivos de ambiente de produção. Utilize Firebase Secrets ou mecanismos apropriados de gestão de segredos. O acesso da equipe é limitado por empresa, papel e status ativo, e as operações protegidas são verificadas no servidor. Antes de executar scripts de publicação ou gerenciamento de dados, confira o projeto Firebase de destino e os efeitos de qualquer comando destrutivo.
