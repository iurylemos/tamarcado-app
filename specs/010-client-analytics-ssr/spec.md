# Especificação: Analytics por Empresa e Renderização do Cliente

**Feature Branch**: Não criada; identificador `010-client-analytics-ssr`

**Criada**: 2026-10-26

**Status**: Approved

**Input**: Ideias em [`ideias.md`](../../ideias.md) e decisões de escopo aprovadas durante a conversa.

## Objetivo

Permitir que cada empresa entenda como clientes chegam ao seu catálogo, quais serviços
despertam interesse, onde o fluxo de agendamento perde visitantes e como os agendamentos
afetam a demanda e a receita estimada. A experiência pública do Cliente também deve entregar
suas rotas com conteúdo disponível na resposta inicial, sem alterar a autoridade do backend
sobre agendamentos.

## Escopo e limites

- Inclui eventos de aquisição e comportamento do catálogo, métricas de agendamento, dashboard
  nativo isolado por empresa, resumo mensal acessível no dashboard e renderização server-side
  das rotas públicas do workspace `client`.
- O dashboard inicial é nativo do Tamarcado. Looker Studio fica fora da primeira entrega e
  poderá ser avaliado quando empresas precisarem de relatórios externos ou mais avançados.
- CI/CD é responsabilidade da Spec 009. Esta feature adiciona seus testes e builds aos gates
  existentes, sem criar um pipeline paralelo nem duplicar a validação, promoção ou rollback
  definidos naquela especificação.
- A Spec 008 continua responsável por erros e logs operacionais; esta feature mede aquisição,
  comportamento e indicadores de negócio, sem adicionar replay de sessão ou APM.
- O fluxo público continua limitado ao negócio identificado pelo slug acessado. Não será
  introduzida uma vitrine, pesquisa ou diretório central de negócios.
- Agendamentos, disponibilidade, status, autorização, regras financeiras e envio de
  notificações existentes permanecem sob as regras e contratos já definidos pelas
  especificações do produto.

## Cenários de usuário e testes

### História 1 — Acessar o catálogo com conteúdo disponível (Prioridade: P1)

Como cliente, quero abrir o catálogo e as etapas de agendamento do negócio a partir do seu
link, para compreender os serviços e prosseguir mesmo quando a aplicação depende de dados
remotos.

**Por que esta prioridade**: O catálogo público e o agendamento são o principal ponto de
entrada do cliente; conteúdo ausente na resposta inicial prejudica acesso, indexação e
compartilhamento.

**Teste independente**: Solicitar diretamente as rotas públicas suportadas para a raiz, um
slug válido e as etapas do catálogo. Verificar conteúdo público correspondente à rota,
resposta de não encontrado para slug inválido e funcionamento da navegação após a página
inicial ser carregada.

**Cenários de aceitação**:

1. **Dado** um link válido de negócio, **quando** o cliente abre uma rota pública do catálogo
   ou agendamento, **então** a resposta inicial contém o conteúdo público esperado para
   aquele slug e a aplicação permanece interativa após a hidratação.
2. **Dado** um slug inexistente ou inativo, **quando** o cliente abre uma rota, **então** a
   aplicação apresenta um estado de não encontrado ou indisponibilidade sem exibir dados de
   outro negócio.
3. **Dado** um acesso à raiz (`/`), **quando** o conteúdo é carregado, **então** a página
   continua sendo uma orientação neutra para obter o link de um negócio e não lista
   empresas.
4. **Dado** que um visitante esteja navegando no catálogo, **quando** solicita um
   agendamento, **então** validação de disponibilidade, autorização e criação permanecem
   sujeitas às regras autoritativas existentes no backend.
5. **Dado** um erro ou indisponibilidade de dados durante a renderização, **quando** a rota é
   atendida, **então** o usuário recebe um estado de erro acionável e não dados de cache ou
   contexto de outro negócio.

### História 2 — Medir aquisição e comportamento do visitante (Prioridade: P1)

Como empresa, quero entender a origem dos visitantes e o progresso deles no fluxo de
agendamento, para identificar canais e etapas que merecem melhoria.

**Por que esta prioridade**: Sem uma linha de base de aquisição e conversão por etapa, a
empresa não consegue distinguir tráfego de interesse real ou localizar abandono.

**Teste independente**: Simular uma sessão de catálogo com origem conhecida, avançar por
etapas selecionadas e comparar eventos, origem e abandono observados com os eventos esperados,
sem enviar dados pessoais.

**Cenários de aceitação**:

1. **Dado** um acesso com referência ou parâmetros de campanha reconhecidos, **quando** a
   visita é registrada, **então** sua origem é classificada como Google, Instagram,
   anúncio, acesso direto ou outra/não identificada, conforme os dados disponíveis.
2. **Dado** um visitante que visualiza ou seleciona serviços, **quando** essas ações são
   registradas, **então** o interesse por serviço pode ser comparado com os agendamentos
   efetivamente criados.
3. **Dado** um visitante que inicia o agendamento e percorre etapas, **quando** deixa de
   avançar antes da criação do agendamento, **então** o funil identifica a última etapa
   alcançada e o abandono, sem coletar o conteúdo dos campos de contato.
4. **Dado** que eventos de analytics estejam bloqueados, desativados ou indisponíveis,
   **quando** o visitante usa o catálogo, **então** o fluxo de agendamento continua
   disponível e não tenta contornar as preferências ou bloqueios do navegador.
5. **Dado** que o visitante ainda não tenha aceitado analytics ou tenha retirado seu
   consentimento, **quando** navega ou agenda, **então** eventos de jornada não são enviados
   ao GA4/GTM nem ao agregado first-party.
6. **Dado** que o visitante escolha aceitar ou retirar analytics, **quando** essa escolha é
   registrada, **então** ela é separada do opt-in de WhatsApp, pode ser alterada e não muda
   a capacidade de agendar.

### História 3 — Consultar indicadores operacionais e financeiros da empresa (Prioridade: P1)

Como administrador autorizado de uma empresa, quero consultar um dashboard com indicadores
confiáveis do meu catálogo e dos meus agendamentos, para organizar a oferta e a agenda.

**Por que esta prioridade**: Os eventos de navegação explicam o interesse; registros
transacionais autorizados são necessários para medir demanda e valor sem tratar intenção
como venda ou pagamento.

**Teste independente**: Preparar dados de várias empresas com serviços, horários,
agendamentos, cancelamentos e histórico de clientes; acessar o dashboard com diferentes
perfis autorizados e comparar seus resultados com os registros de origem.

**Cenários de aceitação**:

1. **Dado** um administrador autenticado, **quando** abre os indicadores da empresa
   autorizada, **então** vê aquisição, interesse e agendamentos associados somente a essa
   empresa.
2. **Dado** interesse e agendamentos para diferentes serviços, **quando** o dashboard é
   consultado, **então** serviços mais procurados e serviços com mais agendamentos aparecem
   como indicadores distintos, calculados no período selecionado.
3. **Dado** agendamentos em diferentes dias e horários, **quando** a demanda por horário é
   consultada, **então** os horários mais procurados refletem os horários dos agendamentos
   no fuso horário configurado para a empresa.
4. **Dado** clientes que retornam para novos atendimentos, **quando** o indicador de retorno
   é consultado, **então** ele apresenta somente contagens agregadas e não revela nomes,
   telefones ou histórico individual de clientes.
5. **Dado** agendamentos pendentes, confirmados, concluídos ou cancelados, **quando** a
   receita estimada é calculada, **então** são somados os preços históricos dos não
   cancelados, e cancelamentos são excluídos.
6. **Dado** que o sistema não registra pagamentos recebidos, **quando** valores financeiros
   são exibidos, **então** a estimativa de valor de agendamentos é identificada claramente e
   não é apresentada como faturamento recebido.
7. **Dado** um usuário sem autorização para uma empresa ou com acesso a outra empresa,
   **quando** tenta consultar seus indicadores, **então** os dados são negados no servidor e
   não há exposição por troca de identificador ou contexto no cliente.
8. **Dado** um preço histórico ausente ou inconsistente, **quando** os valores são
   calculados, **então** o sistema não inventa um valor e sinaliza a limitação de qualidade
   dos dados no resultado ou na operação de suporte.

### História 4 — Consultar o resumo mensal da empresa (Prioridade: P2)

Como administrador autorizado, quero consultar no dashboard um resumo mensal dos indicadores
e oportunidades de melhoria, para acompanhar a evolução sem precisar analisar cada indicador
separadamente.

**Por que esta prioridade**: Um resumo recorrente torna os indicadores acionáveis e reduz a
necessidade de montar relatórios manualmente. O resumo fica disponível no dashboard; envio
por e-mail não faz parte do escopo.

**Teste independente**: Gerar o resumo para um período fechado e uma empresa de teste,
consultá-lo como administrador autorizado e comparar indicadores, oportunidades e fuso
horário com os dados de referência.

**Cenários de aceitação**:

1. **Dado** um período mensal encerrado, **quando** o resumo é gerado, **então** ele inclui
   origem, interesse e agendamentos por serviço, abandono por etapa, horários procurados,
   retorno agregado e receita estimada separada de valor recebido, além de oportunidades
   de melhoria relacionadas aos indicadores observados.
2. **Dado** um administrador autenticado e autorizado, **quando** consulta o resumo mensal,
   **então** recebe somente os agregados da própria empresa por meio do dashboard.
3. **Dado** que a geração do resumo falhe, **quando** o período é consultado, **então** a
   falha fica visível para tratamento e não é apresentada como relatório gerado com sucesso.
4. **Dado** qualquer resumo mensal, **quando** é exibido no dashboard, **então** não contém
   listagem ou identificadores de clientes, telefones ou dados individuais de agendamento.
5. **Dado** que um indicador não tenha dados suficientes para sustentar uma oportunidade,
   **quando** o resumo é gerado, **então** ele informa que não há recomendação fundamentada
   para esse indicador, sem inventar causas ou resultados.

## Casos de borda

- A origem da visita não pode ser inferida com certeza por falta de referrer, parâmetros de
  campanha, bloqueio de cookies ou configurações de privacidade; nesses casos deve ser
  classificada como outra/não identificada.
- O usuário pode mudar de rota, atualizar a página, retornar após uma interrupção ou abrir
  mais de uma aba; a medição do funil não deve transformar uma sessão incompleta em
  agendamento criado.
- Uma empresa sem visitas ou agendamentos no período recebe estados vazios explícitos, não
  rankings ou taxas fabricados.
- Empresas com poucos atendimentos devem ver apenas agregados; não se deve permitir inferir
  identidade de cliente a partir de uma listagem individual.
- Alterações futuras no preço do serviço não podem reescrever valores estimados de
  agendamentos históricos.
- Falhas de renderização, coleta, consulta de indicadores ou geração do resumo devem ser distinguíveis
  de resultados vazios e não podem afetar a criação válida de agendamentos.
- Um serviço, empresa ou perfil inativo não deve receber novos eventos de negócio como se
  fosse uma entidade ativa.

## Requisitos

### Requisitos funcionais

- **FR-001**: O workspace Cliente DEVE entregar conteúdo inicial das rotas públicas do
  catálogo e agendamento para o slug solicitado, mantendo a raiz neutra e sem diretório de
  empresas.
- **FR-002**: O Cliente DEVE manter navegação funcional após a carga inicial e DEVE exibir
  estados explícitos para slug inválido, dados indisponíveis, carregamento, vazio e erro.
- **FR-003**: A renderização pública DEVE manter cada resposta vinculada ao slug requisitado
  e NÃO DEVE usar dados privados, conteúdo de outro tenant ou cache compartilhado de dados
  específicos de empresa.
- **FR-004**: A renderização NÃO DEVE substituir validações de disponibilidade,
  autorização, transações e criação de agendamento realizadas no backend.
- **FR-005**: O sistema DEVE registrar eventos de visualização/interesse e etapas do
  agendamento suficientes para distinguir aquisição, interesse por serviço, avanço no
  funil, abandono e agendamento criado.
- **FR-006**: A classificação de origem DEVE distinguir Google, Instagram, anúncios,
  acesso direto e outra/não identificada; dados ausentes ou ambíguos DEVEM permanecer
  explicitamente não identificados.
- **FR-007**: Eventos enviados a ferramentas externas NÃO DEVEM conter nome, telefone,
  identificador interno de cliente, conteúdo de campos de contato, ID de agendamento,
  credenciais ou identificador interno `tenantId`.
- **FR-008**: O Cliente DEVE oferecer uma escolha explícita de consentimento para analytics,
  separada do opt-in de WhatsApp, inicialmente desativada; eventos de jornada só podem ser
  enviados após aceite, e a retirada do consentimento deve interromper envios futuros.
- **FR-009**: O sistema NÃO DEVE impedir o agendamento quando analytics estiver indisponível,
  bloqueado ou desativado.
- **FR-010**: Indicadores transacionais DEVEM ser calculados a partir de dados autoritativos
  de agendamento, com escopo de tenant validado no servidor e sem depender de um
  `tenantId` fornecido pelo navegador como autorização.
- **FR-011**: O dashboard DEVE apresentar separadamente interesse por serviço e quantidade
  de agendamentos, além de abandono por etapa, horários procurados, retorno agregado de
  clientes e receita estimada; os indicadores de jornada devem informar que cobrem somente
  visitantes que consentiram.
- **FR-012**: A métrica de retorno DEVE ser agregada e NÃO DEVE expor identidade, contato ou
  histórico individual de clientes.
- **FR-013**: A receita estimada DEVE somar o preço histórico de agendamentos pendentes,
  confirmados ou concluídos, DEVE excluir os cancelados e DEVE ser claramente distinguida
  de faturamento recebido.
- **FR-014**: Relatórios mensais DEVEM usar o fuso horário da empresa e os preços históricos
  registrados; dados ausentes ou inconsistentes NÃO DEVEM ser substituídos por valores
  inventados.
- **FR-015**: O sistema DEVE gerar um resumo mensal acessível pelo dashboard aos
  administradores autorizados da empresa, com indicadores agregados e oportunidades de
  melhoria fundamentadas nesses indicadores; não deve inventar recomendações ou causas
  quando os dados forem insuficientes.
- **FR-016**: Falhas de geração do resumo DEVEM ser expostas para tratamento e NÃO DEVEM ser
  apresentadas como relatório gerado com sucesso; o dashboard continuará disponível.
- **FR-017**: Dados de eventos, consultas, dashboards e relatórios DEVEM respeitar o tenant
  e as permissões do usuário em leitura e processamento, não apenas na interface.
- **FR-018**: Testes de eventos, cálculo de indicadores, autorização, renderização e relatório
  DEVEM ser executáveis nos gates de validação existentes definidos pela Spec 009.
- **FR-019**: Looker Studio NÃO DEVE ser requisito para o dashboard inicial; sua adoção fica
  condicionada a uma necessidade confirmada de relatórios externos ou avançados.

### Entidades principais

- **Evento de jornada**: Ação anônima ou agregada de aquisição, navegação, interesse ou
  progresso no fluxo, sem dados pessoais nem identificador interno de cliente, coletada
  somente após consentimento explícito.
- **Preferência de analytics**: Escolha ativa e alterável do visitante sobre a coleta de
  eventos de jornada, independente do consentimento de WhatsApp.
- **Métrica de agendamento**: Indicador calculado a partir dos registros transacionais,
  período e fuso horário de uma empresa.
- **Resumo mensal**: Conjunto de indicadores agregados de uma empresa em um período mensal,
  acessível no dashboard e com estado de geração.
- **Administrador autorizado**: Usuário com permissão para consultar os indicadores e
  resumos da própria empresa no dashboard.
- **Origem de aquisição**: Categoria atribuída a uma visita com base em referência e
  informações de campanha disponíveis.

## Critérios de sucesso

### Resultados mensuráveis

- **SC-001**: Todas as rotas públicas do Cliente dentro do escopo entregam conteúdo
  correspondente ao slug solicitado na resposta inicial, e slugs inválidos não exibem
  conteúdo de outra empresa.
- **SC-002**: Em testes com origens e jornadas conhecidas, 100% das categorias de origem e
  etapas esperadas são classificadas conforme as regras definidas, com eventos sem dados
  pessoais.
- **SC-003**: Em conjuntos de teste com dados conhecidos, cada contagem e valor do dashboard
  coincide com o cálculo de referência, incluindo cancelamentos, preços históricos,
  período e fuso horário.
- **SC-004**: Em testes de autorização entre empresas, 100% das tentativas de leitura fora
  do escopo autorizado são negadas sem retornar dados do tenant alvo.
- **SC-005**: O resumo do mês fechado fica disponível aos administradores autorizados no
  dashboard até o quinto dia útil do mês seguinte, ou a falha de geração é registrada para
  tratamento sem indicar sucesso.
- **SC-006**: Cada oportunidade de melhoria exibida no resumo pode ser relacionada a um
  indicador e dado observável do período; dados insuficientes não geram recomendações.
- **SC-007**: Uma auditoria de eventos confirma ausência de dados pessoais, IDs de
  agendamento, credenciais e `tenantId` interno nas ferramentas externas de analytics.
- **SC-008**: Em testes sem consentimento ou após sua retirada, nenhum evento de jornada
  chega ao GA4/GTM ou aos agregados first-party, sem reduzir a capacidade de agendar.

## Premissas

- Um cliente recorrente é contado de forma agregada quando tem pelo menos um atendimento
  concluído anterior ao período e ao menos um atendimento concluído dentro do período
  consultado; nenhum identificador individual aparece no dashboard ou no resumo.
- A origem é classificada apenas com referência e parâmetros de campanha disponíveis; o
  sistema não promete atribuição completa quando navegador, plataforma ou visitante omitem
  esses dados.
- Eventos de jornada só são coletados após consentimento explícito do visitante; métricas
  transacionais necessárias ao serviço continuam baseadas nos agendamentos autorizados.
- Sessões first-party identificáveis apenas por chave aleatória expiram após 90 dias; os
  snapshots mensais permanecem agregados e não contêm identificadores individuais.
- O período mensal usa o calendário e o fuso horário configurado para cada empresa; o resumo
  fica disponível no dashboard até o quinto dia útil após o encerramento do período.
- Indicadores de agenda e receita estimada são atribuídos ao mês da data marcada do
  atendimento; aquisição e abandono são atribuídos ao período em que a visita e a sessão
  ocorreram.
- O resumo mensal é consultado no dashboard autenticado e contém somente indicadores
  agregados, não exportação de dados individuais.
- Oportunidades de melhoria são observações determinísticas, explicáveis e ligadas a
  indicadores disponíveis; não são diagnósticos causais nem recomendações geradas por IA.
- O envio de e-mail do resumo mensal foi removido do escopo; nenhuma integração ou credencial
  de e-mail será criada para esta feature.
- Como direção técnica explicitamente solicitada, o planejamento deve avaliar e usar Vike e
  `vike-react-query` para o tratamento server-side apenas no workspace `client`, e GA4/GTM
  para analytics global de aquisição e comportamento. O dashboard por empresa deve usar
  agregados first-party tenant-scoped no Firebase, sem enviar `tenantId` ou identificador de
  empresa ao GA4. Detalhes de compatibilidade, contratos, credenciais e implantação
  pertencem ao plano.
- O fluxo de release e CI da feature depende da Spec 009 e não cria workflows concorrentes.
- Looker Studio será considerado em uma evolução posterior se relatórios externos ou
  avançados forem necessários.

## Dependências e referências

- [`ideias.md`](../../ideias.md): pedido original sobre métricas, tecnologias e ordem de
  evolução.
- [`specs/001-saas-appointment-platform/spec.md`](../001-saas-appointment-platform/spec.md):
  contratos de negócio, integridade de agendamento e uso de valores históricos.
- [`specs/004-saass-catalog-platform/spec.md`](../004-saass-catalog-platform/spec.md):
  catálogo por slug, raiz neutra, PWA e limites do Cliente.
- [`specs/008-observability-and-logs/spec.md`](../008-observability-and-logs/spec.md):
  limite entre observabilidade operacional e analytics de produto.
- [`specs/009-operational-readiness-reliability/spec.md`](../009-operational-readiness-reliability/spec.md):
  dono de workflows de CI/CD, validação, release e recuperação.
