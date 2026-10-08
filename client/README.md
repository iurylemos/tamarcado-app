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
