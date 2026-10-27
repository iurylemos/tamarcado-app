# Validação local: Analytics por Empresa e Renderização do Cliente

Este guia será completado com os comandos finais quando as tarefas de implementação forem
criadas. Ele usa apenas builds, dados e serviços locais/de teste. Não use credenciais,
propriedades de analytics ou dados de produção.

## Pré-requisitos

- Node.js 24 e npm.
- Dependências instaladas com `npm ci`.
- Firebase Emulator Suite disponível para o projeto de demonstração `demo-tamarcado`.
- Fixtures com duas empresas, serviços, admins Backoffice e appointments em estados/períodos
  diferentes.
- IDs de GTM/GA4 não produtivos para qualquer teste de integração de tags.

## Build e testes automatizados

Da raiz do repositório:

```powershell
npm run build --workspace client
npm run build --workspace functions
npm run test --workspace client
npm run test --workspace client -- src/entry-server.spec.tsx
npm run test --workspace functions
npm run lint
npm run format:check
```

Para as regras/integrações que exigem emuladores:

```powershell
npm run test:emulator
```

Executar também `npm test` e `npm run build` ao validar a suíte completa antes de incluir os
gates existentes da Spec 009.

## Verificação de renderização

1. Iniciar Auth, Firestore, Functions e Hosting no modo demo, sem projeto de produção.
2. Abrir diretamente `/`, `/empresa/<slug-publicado>` e
   `/empresa/<slug-publicado>/agendar/<serviceId>`.
3. Confirmar que a resposta HTML inicial contém conteúdo público da rota, que o slug
   inexistente recebe estado de não encontrado e que navegação/hidratação continuam
   interativas.
4. Fazer requests simultâneos para slugs distintos na mesma instância local e verificar que
   nenhum HTML, cache React Query ou metadado contém dados da outra empresa.
   O smoke test `src/entry-server.spec.tsx` executa renderização concorrente com Vike e
   verifica que a hidratação React Query contém somente o catálogo da rota correspondente.
5. Confirmar que assets, o service worker sem fallback SPA para `index.html` inexistente,
   metadados públicos, erro de renderer e rota booking funcionam sem cachear disponibilidade
   ou dados privados.

## Verificação de consentimento e analytics

1. Sem escolha explícita ou após retirada: observar ausência de chamadas a GTM/GA4 e à
   callable de ingestão; confirmar que o booking válido continua funcionando.
2. Após aceite: confirmar que a preferência é separada do opt-in WhatsApp e que as chamadas
   usam apenas o schema allowlisted.
3. Inspecionar requests simulados: nenhum nome, telefone, conteúdo de formulário,
   `tenantId`, slug, service ID ou appointment ID chega a GA4/GTM; page views usam rota
   normalizada sem query string.
4. Enviar evento de sessão para empresa A e consultar como admin da empresa B; confirmar que
   payloads não selecionam tenant e que dados A nunca aparecem na resposta B.
5. Repetir eventos, enviar schema inválido, serviço de outro tenant e slug inativo; confirmar
   rejeição/contagem idempotente e ausência de alterações em appointments.

## Reconciliação do dashboard e relatório

1. Comparar contagens de interesse, etapas e abandono com sessões consentidas de fixture;
   validar abandono somente após 30 minutos de inatividade e verificar expiração TTL de 90
   dias.
2. Comparar agenda e receita com appointments por `startsAt`/fuso e preço histórico; incluir
   pending, confirmed e completed, excluir cancelled, e não modificar o relatório de vendas
   concluídas.
3. Verificar retorno de clientes a partir de appointments concluídos anteriores/durante o
   período, confirmando que a response contém somente a contagem.
4. Gerar novamente o mesmo mês; confirmar que o snapshot é idempotente.
5. Simular falha de geração; o erro deve ser exposto para tratamento, o dashboard continua
   acessível e nenhum snapshot parcial é exibido como concluído.
6. Confirmar oportunidades ligadas a indicadores e ausência de recomendações quando a
   amostra for insuficiente.

## Promoção/produção

Não faz parte deste plano validar um deploy ou alterar Firebase/GTM/GA4 de produção. Essa
etapa exigirá autorização explícita, credenciais aprovadas, consent text revisado e um
ambiente não produtivo comprovado. Envio de e-mail não faz parte da feature.
