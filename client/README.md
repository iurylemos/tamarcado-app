# Tamarcado - experiência do cliente

O Tamarcado quer tornar o agendamento simples e acessível para qualquer tipo de
empresa. Um circo, um lava-jato, um estúdio de estética ou qualquer outro negócio
deve poder divulgar seu catálogo, organizar seus horários e, no futuro, controlar
suas finanças em um só lugar.

## Visão do projeto

Queremos que cada empresa possa começar a usar a plataforma gratuitamente e
compartilhar seus serviços com seus clientes. O Tamarcado conecta empresas e
pessoas: ajuda o público a encontrar, conhecer e agendar serviços, enquanto abre
caminho para que os negócios acompanhem seus resultados e entendam o que seus
clientes consideram positivo ou precisa melhorar.

A ideia é divulgar a plataforma para que empresas de diferentes segmentos possam
experimentá-la sem custo inicial. Se essa proposta gerar valor e conquistar
usuários, o Tamarcado poderá crescer de forma sustentável como um negócio de
sucesso.

## Este aplicativo

Este projeto contém a experiência pública usada pelos clientes para:

- descobrir empresas e serviços;
- consultar o catálogo de cada estabelecimento;
- escolher um profissional, uma data e um horário disponível;
- solicitar um agendamento e receber um resumo da solicitação.

O aplicativo deve ser acolhedor, claro e fácil de usar em celulares e
computadores. As informações de preço, duração, disponibilidade e consentimento
devem ser apresentadas com transparência durante o agendamento.

## Arquitetura

O repositório é um monorepo com três aplicações frontend independentes e um
backend. Cada frontend é uma aplicação de primeiro nível, com seu próprio
`package.json`, entrada, configuração, estilos e componentes:

```text
tamarcado/
├── client/         # experiência pública para clientes
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
