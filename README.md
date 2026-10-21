# Tamarcado — Multi-Tenant Service Booking and Business Management Platform

**A platform that connects customers with service businesses and simplifies appointment scheduling and daily operations.**

[![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Hosting%20%7C%20Functions%20%7C%20Firestore-dd2c00?logo=firebase&logoColor=white)](https://firebase.google.com/)

[English](#english) | [Português](#português)

---

<a id="english"></a>

## English

### Business Problem

Service businesses often manage customer discovery, appointment scheduling, team calendars, and customer communication through disconnected tools and manual conversations.

Tamarcado aims to bring these workflows together in a multi-tenant SaaS platform, allowing customers to discover services and request appointments while businesses manage their catalogs, teams, and schedules.

### Real-World Use Case

Consider a service business that offers multiple services and employs several professionals.

1. A customer visits the business's public page and explores its services.
2. The customer checks availability, selects a professional when required, and requests an appointment.
3. The business manages its catalog and team through an administrative interface.
4. Collaborators access their authorized scheduling workflows.
5. Appointment notifications can be delivered through WhatsApp using a provider integration.

The platform is designed for different service-business segments. The exact capabilities available depend on the implemented features and provider configuration.

### Architecture

Tamarcado is organized as an npm monorepo with three independent web applications and a shared backend.

| Workspace        | Responsibility                                                       |
| ---------------- | -------------------------------------------------------------------- |
| `client/`        | Public business discovery, service catalogs, and appointment booking |
| `collaborator/`  | Appointment management and collaborator workflows                    |
| `backoffice/`    | Business administration, catalog, and team management                |
| `functions/`     | Trusted server-side business logic and integrations                  |
| `shared/domain/` | Shared domain types, validations, and business rules                 |

### Technology Stack

| Technology               | Version / Configuration | Purpose                                           |
| ------------------------ | ----------------------- | ------------------------------------------------- |
| React                    | 19.x                    | Web user interfaces                               |
| TypeScript               | 6.x                     | Static typing across applications and backend     |
| Vite                     | 8.x                     | Frontend development and builds                   |
| Tailwind CSS             | 4.x                     | UI styling                                        |
| Node.js                  | 24                      | Cloud Functions runtime                           |
| Firebase Cloud Functions | 2nd generation          | Server-side operations                            |
| Cloud Firestore          | Firebase-managed        | Data persistence and tenant-aware access controls |
| Firebase Authentication  | Firebase-managed        | User authentication                               |
| Firebase Hosting         | Firebase-managed        | Independent frontend deployments                  |
| Firebase Emulator Suite  | Firebase CLI            | Local development and integration testing         |
| Vitest                   | 5.x                     | Automated tests                                   |
| Twilio                   | Configurable provider   | WhatsApp messaging integration                    |

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

**Prerequisites:** Node.js 24, npm, and a compatible local environment for the Firebase Emulator Suite.

**1. Install dependencies**

```bash
git clone https://github.com/iurylemos/tamarcado-app.git
cd tamarcado-app
npm ci
```

**2. Configure and start Firebase emulators**

Review the relevant `.env.example` files, configure local environment variables, and start the emulators:

```bash
npm run dev:emulators
```

Use a separate terminal for the frontend.

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

- Customer application: `http://127.0.0.1:5173`
- Collaborator application: `http://127.0.0.1:5174`
- Business administration: `http://127.0.0.1:5175`

Ensure the frontend environment variables point to the local emulators and that any required local test data is configured.

### Quality Checks

Run the project's automated checks from the repository root:

```bash
npm test
npm run lint
npm run format:check
npm run build
```

Additional emulator-based tests are available through the repository scripts.

### Results and Metrics

Tamarcado is being developed as a practical software engineering project focused on service booking, multi-tenant access control, and operational workflows.

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
- [Design system](./design-system.md)

### Security

Never commit credentials, API keys, provider secrets, or production environment files. Use Firebase Secrets or other appropriate secret-management mechanisms for production credentials. Review the target Firebase project and the effects of any destructive command before running deployment or data-management scripts.

---

<a id="português"></a>

## Português

### Problema de Negócio

Negócios de serviços frequentemente gerenciam a descoberta de clientes, os agendamentos, as agendas da equipe e a comunicação por meio de ferramentas desconectadas e conversas manuais.

O Tamarcado busca reunir esses fluxos em uma plataforma SaaS multi-tenant, permitindo que clientes encontrem serviços e solicitem horários enquanto as empresas administram seus catálogos, equipes e agendas.

### Contexto de Uso Real

Imagine uma empresa de serviços que oferece diferentes serviços e trabalha com vários profissionais.

1. O cliente acessa a página pública da empresa e explora os serviços.
2. Consulta a disponibilidade, escolhe um profissional quando necessário e solicita um agendamento.
3. A empresa administra seu catálogo e sua equipe pela interface administrativa.
4. Os colaboradores acessam os fluxos de gestão de agenda permitidos para seus perfis.
5. As notificações de agendamento podem ser enviadas pelo WhatsApp por meio de uma integração com um provedor.

A plataforma foi projetada para diferentes segmentos de serviços. As funcionalidades disponíveis dependem do que está implementado e da configuração dos provedores.

### Arquitetura

O Tamarcado utiliza um monorepo npm com três aplicações web independentes e um backend compartilhado.

| Workspace        | Responsabilidade                                        |
| ---------------- | ------------------------------------------------------- |
| `client/`        | Descoberta pública de empresas, catálogo e agendamentos |
| `collaborator/`  | Gestão de agenda e operações dos colaboradores          |
| `backoffice/`    | Administração da empresa, catálogo e equipe             |
| `functions/`     | Regras de negócio confiáveis no servidor e integrações  |
| `shared/domain/` | Tipos, validações e regras de negócio compartilhadas    |

### Stack Tecnológica

| Tecnologia               | Versão / Configuração    | Finalidade                                     |
| ------------------------ | ------------------------ | ---------------------------------------------- |
| React                    | 19.x                     | Interfaces web                                 |
| TypeScript               | 6.x                      | Tipagem estática nas aplicações e no backend   |
| Vite                     | 8.x                      | Desenvolvimento e build do frontend            |
| Tailwind CSS             | 4.x                      | Estilização das interfaces                     |
| Node.js                  | 24                       | Runtime das Cloud Functions                    |
| Firebase Cloud Functions | 2ª geração               | Operações no servidor                          |
| Cloud Firestore          | Gerenciado pelo Firebase | Persistência e controles de acesso por empresa |
| Firebase Authentication  | Gerenciado pelo Firebase | Autenticação                                   |
| Firebase Hosting         | Gerenciado pelo Firebase | Publicação independente dos frontends          |
| Firebase Emulator Suite  | Firebase CLI             | Desenvolvimento e testes locais                |
| Vitest                   | 5.x                      | Testes automatizados                           |
| Twilio                   | Provedor configurável    | Integração de mensagens pelo WhatsApp          |

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

**Pré-requisitos:** Node.js 24, npm e um ambiente local compatível com o Firebase Emulator Suite.

**1. Instale as dependências**

```bash
git clone https://github.com/iurylemos/tamarcado-app.git
cd tamarcado-app
npm ci
```

**2. Configure e inicie os emuladores Firebase**

Consulte os arquivos `.env.example` pertinentes, configure as variáveis locais e inicie os emuladores:

```bash
npm run dev:emulators
```

Utilize outro terminal para executar o frontend.

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

- Aplicação do cliente: `http://127.0.0.1:5173`
- Aplicação do colaborador: `http://127.0.0.1:5174`
- Administração da empresa: `http://127.0.0.1:5175`

Certifique-se de que as variáveis de ambiente apontem para os emuladores locais e que os dados necessários para os testes estejam configurados.

### Verificações de Qualidade

Execute as verificações automatizadas na raiz do repositório:

```bash
npm test
npm run lint
npm run format:check
npm run build
```

O projeto também disponibiliza scripts adicionais para testes com emuladores.

### Resultados e Métricas

O Tamarcado está sendo desenvolvido como um projeto prático de engenharia de software, com foco em agendamento de serviços, controle de acesso multi-tenant e fluxos operacionais.

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
- [Design system](./design-system.md)

### Segurança

Nunca versione credenciais, chaves de API, segredos de provedores ou arquivos de ambiente de produção. Utilize Firebase Secrets ou mecanismos apropriados de gestão de segredos. Antes de executar scripts de publicação ou gerenciamento de dados, confira o projeto Firebase de destino e os efeitos de qualquer comando destrutivo.
