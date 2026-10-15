# Tamarcado - catálogos públicos

O Tamarcado permite que cada negócio divulgue seu próprio catálogo digital e
compartilhe um site/PWA com seus clientes. A experiência pública é individual por
negócio: o visitante acessa o catálogo pelo link daquele negócio, consulta seus
serviços e pode solicitar um agendamento.

## Visão deste aplicativo

O aplicativo `client` deve oferecer:

- um catálogo público identificado pelo slug do negócio, em uma URL como
  `/empresa/nome-do-negocio`;
- uma experiência independente para cada negócio, sem uma vitrine central para
  procurar empresas ou serviços;
- agendamento de serviços dentro do contexto do catálogo acessado;
- um PWA associado ao catálogo do negócio, cuja abertura inicia diretamente
  naquele catálogo;
- uma página neutra na raiz (`/`) que orienta o visitante a acessar o link do
  negócio, sem exibir um catálogo geral.

A especificação da evolução está em
[`specs/004-saass-catalog-platform/spec.md`](../specs/004-saass-catalog-platform/spec.md).
Ela define o comportamento esperado; a criação desta documentação não implementa
nem altera o comportamento da aplicação.

O catálogo deve ser acolhedor, claro e fácil de usar em celulares e computadores.
Informações de preço, duração, disponibilidade e consentimento devem ser
apresentadas com transparência durante o agendamento.

## Rotas públicas e instalação

- A raiz (`/`) explica que o visitante deve pedir o link diretamente ao negócio;
  ela não permite pesquisar ou listar catálogos.
- Cada negócio compartilha seu catálogo pelo slug, em `/empresa/{slug}`. Os links
  de agendamento permanecem dentro desse mesmo slug.
- A instalação do PWA fica disponível no catálogo publicado e identifica o
  negócio. Ao reabrir o app, o cliente retorna diretamente ao catálogo daquele
  negócio, com o escopo limitado às suas rotas de catálogo e agendamento.

## Arquitetura

O repositório é um monorepo com três aplicações frontend independentes e um
backend. Cada frontend é uma aplicação de primeiro nível, com seu próprio
`package.json`, entrada, configuração, estilos e componentes:

```text
tamarcado/
├── client/         # catálogos públicos individuais e agendamento
├── collaborator/   # agenda e ferramentas de colaboradores
├── backoffice/     # administração das empresas
├── functions/      # backend Firebase Cloud Functions
└── shared/         # contratos e regras de domínio compartilhados
```

Cada frontend mantém seu próprio sistema de design baseado em Atomic Design.
Os componentes de interface pertencem à aplicação que os usa; não importamos
componentes de tela de um frontend para outro. Assim, cada experiência pode
evoluir de forma independente sem perder consistência dentro do seu próprio
produto.

No cliente, a organização segue estes níveis:

```text
client/src/
├── components/
│   ├── atoms/       # peças independentes, como Card e MarketBackground
│   ├── molecules/   # combinações reutilizáveis de átomos
│   ├── organisms/   # blocos de interface com comportamento, como BookingForm
│   └── templates/   # estruturas de página reutilizáveis
├── contexts/       # estado e provedores da aplicação, como o loading global
├── pages/          # rotas que compõem templates e componentes
├── services/       # comunicação com Firebase e operações da aplicação
├── interfaces/     # tipos específicos da experiência do cliente
├── utils/          # funções utilitárias do cliente
└── styles/         # tokens e estilos próprios desta aplicação
```

As páginas públicas e os requisitos de isolamento por negócio, navegação e PWA
estão especificados em `../specs/004-saass-catalog-platform/`.

Os níveis de Atomic Design são convenções de composição: átomos formam
moléculas, moléculas e outros componentes formam organismos, e estes são
organizados em templates usados pelas páginas/rotas. Componentes compartilhados
entre páginas continuam dentro do `client`; componentes de UI não são colocados
em `shared/`.

O diretório de raiz `shared/` é para contratos e regras de domínio neutros em
relação à interface (por exemplo, tipos e validações usados por aplicações e
backend). O código que acessa serviços e dados fica em `services/`; as páginas
coordenam esse código com a interface. Cada frontend também mantém seus próprios
tokens de design e estilos globais, evitando dependência visual entre
aplicações.

Os comandos de desenvolvimento e build de cada workspace são definidos no
`package.json` da raiz e nos manifests de cada aplicação.

## Sentry no cliente

O cliente envia erros e traces de navegação/requisições ao Sentry somente quando
há uma DSN adequada ao modo de execução. O valor de `VITE_SENTRY_DSN` é usado
apenas em builds de produção. No modo de desenvolvimento, o app usa
`VITE_SENTRY_DSN_DEV`; se ela não estiver definida, o Sentry fica desativado.
Assim, uma DSN de produção presente no `.env` geral não recebe eventos locais.

### Configuração por ambiente

- **Produção:** configure `VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT=production`
  e `VITE_SENTRY_RELEASE` (de preferência, o SHA do commit) no ambiente de build.
- **Desenvolvimento:** opcionalmente configure `VITE_SENTRY_DSN_DEV` em
  `client/.env.development.local`, sempre com uma DSN de projeto não produtivo.
  Esse arquivo local não deve ser commitado.
- **Source maps:** `SENTRY_AUTH_TOKEN` é um segredo de build para o plugin do
  Sentry. Ele nunca deve usar o prefixo `VITE_` nem ser incluído no bundle.
  Quando esse token está disponível, os mapas ocultos são enviados ao Sentry e
  removidos dos arquivos públicos de `dist/`. Sem o token, o build de produção
  não gera mapas públicos; os stack traces ficam minificados até a configuração
  segura de upload estar disponível.

O tracing usa amostragem padrão de 10%. O cliente cria spans identificados como
`client.availability_search` e `client.appointment_registration` e registra a
distribuição `client.request.duration` em milissegundos. Eles reutilizam a
medição já existente em `booking.performance`; não adicionam outra chamada nem
alteram a resposta do backend. Os atributos enviados limitam-se à operação,
etapa, método HTTP e status. URLs completas, query strings, conteúdo da
requisição/resposta, identificadores e dados de clientes são removidos.

Em produção, a propagação de trace é limitada ao endpoint de Cloud Functions
derivado de `southamerica-east1` e `VITE_FIREBASE_PROJECT_ID`. Em desenvolvimento,
quando houver uma DSN separada, ela se limita ao emulador em
`127.0.0.1:5001`; não são enviados cabeçalhos de trace ao endpoint de produção.

### Teste local seguro

1. Confirme que `client/.env.development.local` seleciona os emuladores com
   `VITE_USE_EMULATORS=true` e inicie o app com `npm run dev:client`.
2. Use o botão **Testar diagnóstico Sentry (dev)** para disparar o log, a métrica
   e o erro de diagnóstico. Sem `VITE_SENTRY_DSN_DEV`, o evento não é enviado ao
   Sentry; a validação automatizada usa mocks e não faz chamadas de rede.
3. Para medir a latência real dos emuladores, percorra a busca de disponibilidade
   e o envio de agendamento. O console do navegador mostra `booking.performance`
   com a operação e `durationMs`. Com uma DSN não produtiva configurada, essas
   chamadas também aparecem como spans e métricas no projeto de desenvolvimento.

Sem uma DSN não produtiva, não é possível confirmar a chegada de um evento no
painel do Sentry sem gerar um evento no projeto de produção. Não use a DSN de
produção para smoke tests locais. A suíte focada pode ser executada com:

```sh
npm run test --workspace client -- src/monitoring/__tests__/init.spec.tsx src/services/booking-performance.spec.ts src/components/organisms/SentryDiagnosticButton/SentryDiagnosticButton.spec.tsx
```
