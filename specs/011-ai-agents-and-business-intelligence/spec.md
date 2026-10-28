# Especificação: Agentes de IA, Workflows e Inteligência de Negócio

**Feature Branch**: Não criada; identificador `011-ai-agents-and-business-intelligence`

**Criada**: 2026-10-28

**Status**: Draft — Review Required

**Input**: Solicitação do usuário para especificar análises de crescimento apoiadas por agentes de IA, workflows, métricas internas autorizadas e pesquisa externa.

## Objetivo

Permitir que administradores autorizados de uma empresa analisem métricas agregadas do próprio negócio, consultem evidências públicas de mercado e recebam recomendações estruturadas, rastreáveis e com incertezas explícitas. O sistema também deve permitir acompanhar análises e propor ações para aprovação humana, sem executar efeitos sensíveis com base apenas em uma decisão do modelo.

## Escopo e limites

- Inclui análises sob demanda de indicadores agregados de agendamento, pesquisa externa de mercado quando pertinente, consolidação de evidências, recomendações estruturadas, histórico e acompanhamento pelo backoffice.
- Os indicadores podem incluir total de agendamentos, distribuição por dia/horário, ocupação, cancelamentos e comparação entre períodos equivalentes somente quando os dados necessários forem existentes, confiáveis e suficientes. Ocupação exige dados de capacidade/horários; cancelamentos exigem estados consistentes; comparação exige períodos comparáveis.
- Inclui propostas de ação com ciclo explícito de revisão humana. Aprovação não autoriza operações diferentes da versão exata revisada.
- Dados internos são obtidos somente por operações de leitura autorizadas e limitadas ao tenant autenticado. A pesquisa externa não recebe dados pessoais ou registros individuais do negócio.
- Métricas devem reutilizar definições e dados transacionais autoritativos existentes. A Spec 010 já define indicadores agregados de analytics e agendamento; esta feature não redefine esses indicadores nem os apresenta como causa comprovada.
- Mastra, Tavily, um provedor de LLM e os serviços Firebase existentes são candidatos/limites apresentados pelo solicitante, não uma decisão de arquitetura ou garantia de compatibilidade. A seleção de execução, persistência, modelo e integração fica sujeita às validações listadas em **Validações e decisões para o planejamento**.
- A coleta externa é apenas para pesquisa. Não se permite que conteúdo web seja tratado como instrução confiável nem que a pesquisa consulte dados privados.
- A funcionalidade deve ser desativável sem alterar o comportamento de agendamentos, autenticação ou demais operações atuais.

## Cenários de usuário e testes

### História 1 — Solicitar análise de crescimento autorizada (Prioridade: P1)

Como administrador autorizado de uma empresa, quero solicitar uma análise para um período, para entender a demanda do meu negócio sem expor dados de clientes ao modelo.

**Por que esta prioridade**: A análise só tem valor se as métricas forem úteis e corretamente limitadas ao negócio de quem a solicitou.

**Teste independente**: Preparar agendamentos de duas empresas, solicitar análise como administrador de uma delas e comparar as métricas entregues com os dados de referência permitidos. Repetir com usuário sem permissão e verificar que nenhum dado do tenant alvo é retornado.

**Cenários de aceitação**:

1. **Dado** um administrador autenticado e autorizado, **quando** solicita uma análise para um período válido, **então** a execução é criada e fica associada ao tenant derivado da identidade e das regras de autorização do servidor.
2. **Dado** que o cliente envie um identificador de tenant diferente do escopo autorizado, **quando** a solicitação é processada, **então** o identificador não substitui a autorização do servidor e nenhum dado do outro tenant é consultado.
3. **Dado** que uma métrica não possa ser calculada com os registros existentes, **quando** a análise é produzida, **então** a métrica é omitida ou marcada indisponível com sua limitação, sem valor inventado.
4. **Dado** uma empresa sem registros suficientes no período, **quando** a análise é solicitada, **então** o resultado distingue ausência de dados de falha de execução e não apresenta conclusões sem suporte.

### História 2 — Consultar pesquisa e recomendações baseadas em evidências (Prioridade: P1)

Como administrador autorizado, quero receber recomendações que diferenciem métricas internas, fontes públicas, inferências e incertezas, para avaliar oportunidades sem confundir uma hipótese com um fato.

**Por que esta prioridade**: Recomendações confiáveis precisam mostrar de onde vêm as evidências e quais conclusões dependem de interpretação.

**Teste independente**: Executar uma análise com resultados de pesquisa conhecidos e métricas agregadas de teste; validar estrutura, referências, distinção entre fatos e inferências e tratamento de respostas do modelo inválidas.

**Cenários de aceitação**:

1. **Dado** um objetivo que requer contexto de mercado, **quando** a pesquisa é executada, **então** cada fonte apresentada contém título, URL e resumo disponíveis e pode ser aberta pelo usuário.
2. **Dado** que a pesquisa externa seja irrelevante ou não necessária para o objetivo, **quando** o workflow avalia as etapas, **então** a etapa externa pode ser omitida sem impedir a análise interna.
3. **Dado** conteúdo externo que contenha instruções para alterar regras, acessar dados ou ignorar controles, **quando** o agente recebe esse conteúdo, **então** ele é tratado como material não confiável e não altera permissões ou ferramentas disponíveis.
4. **Dado** que as evidências sejam insuficientes ou contraditórias, **quando** recomendações são geradas, **então** a insuficiência ou incerteza é indicada e conclusões não são apresentadas como fatos confirmados.
5. **Dado** uma resposta incompleta ou inválida, **quando** a validação do resultado falha, **então** a resposta não é disponibilizada como relatório válido nem pode iniciar ações sensíveis.

### História 3 — Acompanhar execuções e consultar histórico (Prioridade: P2)

Como administrador autorizado, quero acompanhar o estado de uma análise e consultar seus resultados anteriores, para entender se ela terminou e comparar suas conclusões sem acessar dados de outra empresa.

**Por que esta prioridade**: Pesquisas e geração de recomendações podem ser assíncronas; o usuário precisa de estados compreensíveis e histórico seguro.

**Teste independente**: Iniciar execuções concluídas, em andamento e com falhas para duas empresas; conferir status, histórico, mensagens de erro seguras e isolamento em todas as consultas do backoffice.

**Cenários de aceitação**:

1. **Dado** uma execução iniciada, **quando** o usuário consulta o painel, **então** vê seu status atualizado, período, resultado quando disponível e uma mensagem segura quando houver falha.
2. **Dado** execuções de mais de um tenant, **quando** um usuário lista o histórico, **então** recebe somente registros dentro de seu escopo autorizado.
3. **Dado** timeout ou falha recuperável de uma etapa, **quando** a política limitada de retry é aplicada, **então** o status final e a etapa com falha ficam explícitos e efeitos persistentes não são duplicados.
4. **Dado** uma execução em andamento ou interrompida, **quando** o usuário consulta o painel, **então** o sistema não a apresenta como concluída nem expõe saída parcial não validada.

### História 4 — Revisar e aprovar propostas de ação (Prioridade: P2)

Como administrador autorizado, quero revisar uma proposta antes de qualquer ação que altere dados ou produza efeitos externos, para manter controle humano sobre decisões do negócio.

**Por que esta prioridade**: Recomendações de IA não devem contornar controles do negócio nem executar efeitos sem consentimento explícito e verificável.

**Teste independente**: Criar propostas, aprová-las e rejeitá-las com usuários e tenants distintos; tentar executar sem aprovação, com aprovação de outra versão e com aprovação de outro tenant.

**Cenários de aceitação**:

1. **Dado** uma recomendação que sugira uma ação sensível, **quando** ela é apresentada, **então** fica como proposta e não altera dados nem produz efeito externo.
2. **Dado** uma proposta pendente, **quando** um usuário autorizado aprova ou rejeita pelo backoffice, **então** a decisão e o usuário ficam registrados e associados ao tenant e à versão revisada.
3. **Dado** uma solicitação de execução sem aprovação válida para a versão exata, **quando** o backend a valida, **então** a ação é negada e nenhum efeito é produzido.
4. **Dado** uma proposta aprovada, **quando** sua execução termina, **então** o resultado ou a falha pode ser consultado e a aprovação não pode ser reutilizada para conteúdo alterado.

### História 5 — Operar a funcionalidade com limites observáveis (Prioridade: P3)

Como responsável pela operação, quero acompanhar falhas, latência, uso de ferramentas e estimativas de custo, para manter a funcionalidade dentro de limites aprovados e desativá-la sem afetar as operações existentes.

**Por que esta prioridade**: Chamadas a modelos e pesquisa externa têm custo, limites e falhas que precisam ser operáveis antes de ampliar o uso.

**Teste independente**: Exercitar caminho de sucesso, erros de ferramentas e provedor, timeout, limite de uso e funcionalidade desativada em ambiente de teste; conferir correlação, métricas e comportamento das operações não relacionadas.

**Cenários de aceitação**:

1. **Dado** uma execução iniciada, **quando** ela termina, **então** é possível correlacionar suas etapas por um identificador opaco e consultar duração, resultado e chamadas realizadas sem incluir dados pessoais ou segredos.
2. **Dado** que o provedor informe tokens ou uso, **quando** a execução é registrada, **então** esses valores e a estimativa de custo ficam disponíveis; campos não fornecidos pelo provedor são identificados como indisponíveis, não estimados como zero.
3. **Dado** que a funcionalidade esteja desativada ou que um limite aprovado seja atingido, **quando** um novo pedido é recebido, **então** ele é recusado de forma explícita e agendamentos e demais operações existentes continuam funcionando.

## Casos de borda

- Período inválido, invertido, excessivamente amplo ou fora dos limites aprovados.
- Fuso horário da empresa ausente, inválido ou alterado entre a solicitação e a consulta posterior.
- Dados incompletos, duplicados ou insuficientes para uma métrica; status de agendamento desconhecido ou sem histórico suficiente para comparação.
- Tenant sem movimento, sem capacidade/horários cadastrados ou sem dados históricos equivalentes.
- Pesquisa sem resultados, resultados duplicados, conteúdo desatualizado, URL inválida, timeout, limite de uso ou resposta malformada.
- Texto externo que tente induzir acesso a dados privados, revelar instruções ou executar uma ferramenta não permitida.
- Provedor de LLM indisponível, saída inválida, resposta parcial, limite de tokens/custo ou cancelamento do usuário.
- Reexecução após timeout, entrega repetida de evento ou tentativa de criar duas vezes a mesma execução/proposta.
- Acesso concorrente à mesma proposta, edição após aprovação ou mudança de permissão antes de executar.
- Registros históricos expirados, muito grandes ou indisponíveis durante a consulta do backoffice.
- Falha de observabilidade: o registro de telemetria não deve impedir nem alterar uma operação autorizada.

## Requisitos

### Requisitos funcionais

- **FR-001**: O sistema DEVE permitir que um usuário autenticado e autorizado solicite uma análise para um período definido, determinando no servidor o tenant e o escopo de acesso a partir da identidade e das regras existentes.
- **FR-002**: O sistema DEVE obter métricas internas somente por ferramentas de leitura próprias, limitadas ao tenant autorizado e aos campos necessários à análise; NÃO DEVE enviar ao modelo nomes, telefones, mensagens, identificadores pessoais ou registros individuais de clientes.
- **FR-003**: As métricas DEVEM ser calculadas apenas quando os dados autoritativos existentes permitirem; definições, períodos, status e fuso horário DEVEM ser explícitos, e ausência ou insuficiência de dados NÃO DEVE ser substituída por valores inferidos.
- **FR-004**: A leitura de indicadores DEVE reutilizar definições existentes, inclusive as aplicáveis da Spec 010, sem redefinir métricas ou alterar o modelo de dados sem justificativa aprovada.
- **FR-005**: A pesquisa externa DEVE validar objetivo e parâmetros, limitar resultados e duração, preservar referências disponíveis e tratar timeout, erro, limite de uso e resposta inválida sem expor chaves ou dados internos.
- **FR-006**: O sistema DEVE distinguir fatos ou resultados de fontes, métricas internas, inferências e recomendações; cada conclusão externa apresentada DEVE poder ser associada a uma referência e incerteza quando as evidências forem insuficientes.
- **FR-007**: Conteúdo externo DEVE ser tratado como entrada não confiável e NÃO DEVE alterar instruções de segurança, autorização, tenant, limites ou ferramentas habilitadas.
- **FR-008**: O workflow DEVE executar etapas determinísticas de identidade, autorização, leitura, validação, persistência e controle de limites fora da autonomia do agente; a seleção de ferramenta pelo agente DEVE permanecer dentro de um conjunto limitado e autorizado.
- **FR-009**: Cada execução DEVE seguir os estados `queued`, `running` e um estado terminal: `succeeded`, `failed`, `timed_out` ou `cancelled`. Só pode terminar como `succeeded` quando todas as etapas obrigatórias terminarem e o relatório passar pela validação; falha e timeout DEVEM identificar a etapa sem expor conteúdo sensível.
- **FR-010**: O sistema PODE repetir uma etapa no máximo duas vezes após a tentativa inicial, somente para falhas transitórias de rede ou indisponibilidade/limite temporário do provedor, usando espera progressiva. Erros de autorização, entrada inválida, violação de política ou saída inválida NÃO DEVEM ser repetidos automaticamente. Cada etapa e a execução total DEVEM ter timeout configurável; ao excedê-lo, a execução termina como `timed_out`, sem apresentar resultado parcial como sucesso. Os valores de timeout DEVEM ser aprovados no planejamento conforme limites verificados dos provedores.
- **FR-011**: Todo relatório DEVE validar contra um schema versionado que inclua, no mínimo, identificador da execução, período, resumo, métricas utilizadas, insights, recomendações priorizadas, justificativas, evidências/fontes, confiança ou insuficiência de evidência e próximas ações sugeridas.
- **FR-012**: Resultado ausente, incompleto ou inválido DEVE ser identificado explicitamente; conteúdo não validado NÃO DEVE ser apresentado como relatório concluído nem acionar qualquer ação.
- **FR-013**: O sistema DEVE permitir ao usuário autorizado iniciar análises, ver status, consultar resultados e fontes, consultar histórico, visualizar falhas em formato seguro e acompanhar propostas e resultados no backoffice existente.
- **FR-014**: Propostas de ação DEVEM seguir os estados `draft`, `pending_approval`, `approved`, `rejected`, `executing`, `completed` ou `failed`; a execução de ações com efeitos DEVE exigir validação no backend da autorização, tenant, versão exata e decisão de aprovação.
- **FR-015**: O usuário DEVE poder aprovar ou rejeitar uma proposta autorizada; o sistema DEVE registrar a decisão e impedir execução sem aprovação válida. Aprovar uma proposta NÃO DEVE autorizar conteúdo diferente nem uma ação fora do escopo aprovado.
- **FR-016**: Envio automático de mensagens, publicação de campanhas e alterações irreversíveis NÃO DEVEM ser implementados nesta feature sem requisitos e aprovação explícitos posteriores.
- **FR-017**: O sistema DEVE persistir o mínimo necessário para estado, relatório, aprovação e histórico, respeitando a convenção do projeto de evitar subcoleções ou justificando e aprovando qualquer exceção.
- **FR-018**: Os registros DEVEM ter regras explícitas de retenção, acesso e limpeza, limites de tamanho e tratamento de expiração; conteúdo web completo, segredos, prompts sensíveis e dados pessoais desnecessários NÃO DEVEM ser armazenados.
- **FR-019**: Cada execução DEVE poder ser correlacionada por identificador opaco entre as etapas e fornecer estado, duração total e por etapa, resultado, erros categorizados, contagem de chamadas ao modelo e à pesquisa, tokens de entrada/saída e uso/custo quando disponibilizados pelos provedores.
- **FR-020**: A telemetria DEVE aproveitar os mecanismos existentes de Sentry e logs do Firebase quando adequados, evitando duplicação; logs NÃO DEVEM conter segredos, dados pessoais, conteúdo de mensagens ou prompts sensíveis.
- **FR-021**: O sistema DEVE aplicar limites configuráveis de duração, chamadas, tokens e custo por execução e tenant; limites aprovados DEVEM ser verificados antes e durante a execução quando a informação estiver disponível.
- **FR-022**: A funcionalidade DEVE poder ser desativada por configuração sem comprometer autenticação, agendamento, disponibilidade, notificações ou demais fluxos existentes.
- **FR-023**: Testes automatizados DEVEM cobrir resultados válidos e inválidos, erros e timeouts de ferramentas, autorização, isolamento multi-tenant, transições de aprovação, idempotência, limites e funcionalidade desativada.
- **FR-024**: A solução DEVE incluir documentação de arquitetura escolhida, configuração, proteção de segredos, habilitação/desativação, limites de uso/custo, operação, tratamento de falhas e consulta de observabilidade, baseada nas decisões aprovadas no planejamento.

### Requisitos não funcionais

- **NFR-001 — Isolamento multi-tenant**: Toda leitura, persistência, listagem, aprovação e execução DEVE validar o escopo do tenant no backend. Um identificador enviado pelo navegador NÃO DEVE ser evidência suficiente de autorização.
- **NFR-002 — Segurança de agentes**: Cada agente DEVE receber somente as ferramentas necessárias; ferramentas genéricas de administração, acesso irrestrito ao banco e execução arbitrária de código NÃO DEVEM ser disponibilizadas.
- **NFR-003 — Privacidade**: Dados enviados a modelos, pesquisa, observabilidade ou persistência DEVEM ser minimizados; dados pessoais e informações confidenciais DEVEM ser removidos antes de qualquer transmissão não necessária.
- **NFR-004 — Human-in-the-loop**: Nenhum efeito sensível pode ocorrer sem decisão humana válida verificada no backend e vinculada ao tenant, usuário autorizado e versão exata aprovada.
- **NFR-005 — Confiabilidade**: Timeouts, retries e idempotência DEVEM ter limites definidos conforme FR-009 e FR-010. Falha de execução, ausência de dados e evidência insuficiente DEVEM ser estados distintos.
- **NFR-006 — Integridade de recomendações**: O modelo NÃO DEVE substituir regras determinísticas de negócio; inferências NÃO DEVEM ser rotuladas como fatos nem transformar conteúdo externo em instruções.
- **NFR-007 — Custo e uso**: O plano de uso DEVE permitir limitar chamadas e custo por execução e tenant, medir consumo observável e interromper novas execuções quando limites aprovados forem atingidos.
- **NFR-008 — Observabilidade segura**: Eventos operacionais DEVEM permitir diagnosticar etapa e falha sem registrar payloads sensíveis, segredos, conteúdo pessoal ou saídas não sanitizadas.
- **NFR-009 — Acessibilidade e compatibilidade de interface**: O backoffice DEVE reutilizar os padrões de interface existentes e expor estados de carregamento, vazio, sucesso, falha e indisponibilidade de forma compreensível e acessível.
- **NFR-010 — Continuidade**: Indisponibilidade ou desativação dos recursos de IA NÃO DEVE alterar a capacidade de autenticar, agendar, consultar disponibilidade ou executar fluxos existentes.

### Critérios de verificação

- Testes com pelo menos dois tenants DEVEM demonstrar que 100% das tentativas de acesso fora do escopo são negadas sem revelar dados do tenant alvo.
- 100% dos relatórios apresentados como concluídos DEVEM passar pela validação de schema; resultados inválidos DEVEM permanecer indisponíveis como relatório válido e não executar ações.
- 100% das recomendações apresentadas como fatos externos DEVEM conter referência utilizável; conclusões sem evidência suficiente DEVEM ser identificadas como incertas ou indisponíveis.
- 100% das ações sensíveis testadas DEVEM ser negadas quando não houver aprovação válida da versão exata por usuário autorizado.
- Cada execução testada DEVE expor estado final, duração e falhas por etapa; chamadas e custo DEVEM ser apresentados quando disponíveis, e indisponibilidade desses dados deve ser explícita.
- O início de uma execução DEVE tornar seu estado consultável no backoffice em até 5 segundos em pelo menos 95% das solicitações válidas no ambiente de validação acordado.
- Ao desativar a funcionalidade, 100% dos testes de regressão dos fluxos existentes de autenticação e agendamento DEVEM continuar passando.
- Antes da habilitação para usuários, os responsáveis DEVEM aprovar limites de uso/custo e política de retenção; valores desconhecidos NÃO DEVEM ser substituídos por suposições.

## Entidades principais

- **Solicitação de análise**: Pedido autorizado com objetivo e período, associado ao tenant e solicitante definidos pelo servidor.
- **Execução de análise**: Registro rastreável de uma solicitação, com estado, etapas, horários, resultado ou erro categorizado e consumo disponível.
- **Métrica agregada**: Valor calculado de registros autorizados, com período, definição, unidade e indicação de disponibilidade/limitação.
- **Evidência**: Referência a fonte externa ou indicador interno que sustenta uma afirmação, incluindo origem e contexto suficiente para auditoria.
- **Relatório de recomendações**: Resultado estruturado associado à execução, contendo resumo, métricas, insights, recomendações, justificativas, evidências e confiança.
- **Proposta de ação**: Ação sugerida com conteúdo versionado, estado de aprovação, decisor autorizado e resultado de execução, quando houver.

## Critérios de sucesso

### Resultados mensuráveis

- **SC-001**: Em testes com múltiplos tenants, nenhuma análise ou consulta de histórico retorna dados fora do escopo autorizado.
- **SC-002**: Todos os relatórios apresentados como concluídos atendem ao schema definido; relatórios inválidos ou incompletos são identificados e não permitem execução de ações.
- **SC-003**: Usuários conseguem identificar, para cada recomendação, quais métricas e fontes a sustentam e quando a evidência é insuficiente.
- **SC-004**: Nenhuma ação sensível de teste produz efeito sem aprovação backend da versão exata por usuário autorizado.
- **SC-005**: Em pelo menos 95% das solicitações válidas no ambiente acordado, o estado da execução fica consultável no backoffice em até 5 segundos.
- **SC-006**: Toda execução avaliada possui estado final e duração por etapa; quando disponíveis, também apresenta chamadas e estimativa de custo, sem dados pessoais ou segredos na telemetria.
- **SC-007**: A desativação da funcionalidade não causa falha nos testes de autenticação, disponibilidade e agendamento existentes.
- **SC-008**: Limites de custo/uso e retenção são aprovados antes da habilitação; execuções que excedem limites definidos são recusadas ou interrompidas de modo observável.
- **SC-009**: Antes da habilitação, operadores encontram documentação aprovada para configuração, segurança de segredos, limites, desativação, tratamento de falhas e consulta de observabilidade.

## Premissas

- A identidade autenticada e os mecanismos atuais de autorização de staff/empresa são a autoridade para determinar o tenant; detalhes e compatibilidade devem ser confirmados no planejamento.
- Métricas iniciais limitam-se ao que os registros e definições existentes suportam. Distribuição por horário, ocupação, cancelamento e comparação entre períodos não são garantidas se dados necessários não existirem ou forem insuficientes.
- As métricas transacionais da Spec 010 são referência para evitar divergência; analytics de comportamento não serão enviados a um LLM como substituto de dados transacionais.
- Pesquisa externa só é executada quando necessária ao objetivo; resultados podem estar incompletos, desatualizados ou enviesados.
- Provedores podem não fornecer uso, tokens ou custo para todas as chamadas; o sistema deve declarar essa limitação.
- A interface permanece no backoffice já existente; não se presume novo aplicativo ou nova experiência independente.
- Nenhum envio, publicação ou efeito irreversível está autorizado nesta fase.
- Limites concretos de retenção, duração, chamadas, tokens, custo e volume serão propostos e aprovados no planejamento com base nas capacidades e custos verificados.

## Validações e decisões para o planejamento

Antes de escolher a arquitetura e decompor tarefas, o planejamento deve validar documentação oficial atual e registrar fontes, versões e resultados:

- **Mastra**: requisitos de runtime Node.js e sistema de módulos; suporte às versões aplicáveis ao Node.js 24; compatibilidade com Firebase Cloud Functions de 2ª geração e com o modelo de execução/deploy escolhido; APIs suportadas para agentes, tools, workflows, estado, pausa/retomada para aprovação humana, validação de saída, tracing/observabilidade e limites de execução.
- **Firebase**: runtimes Node.js atualmente suportados por Functions v2; limites de duração, concorrência, memória e execução assíncrona; gerenciamento de secrets; autenticação/autorização e integração com Firestore para execução e persistência. Confirmar também o módulo efetivamente produzido pelo build atual, sem presumir ESM ou CommonJS.
- **Tavily**: API oficial de pesquisa, parâmetros e limites de resultados; campos de fonte disponíveis; limites de uso, erros, timeout, autenticação, tratamento de conteúdo não confiável e política de armazenamento/cache.
- **Provedor(es) de LLM**: suporte a saída estruturada, limites de contexto e taxa, medição de tokens/custo, timeout, privacidade/retenção dos dados enviados e disponibilidade de modelos para comparação de qualidade, latência e custo.
- **Alternativa de execução**: se a combinação Mastra/Functions v2 não atender aos requisitos, comparar serviço dedicado de workflows com Functions v2 em segurança, latência, disponibilidade, operação, observabilidade, custo fixo/variável e complexidade de manutenção. Não adotar serviço dedicado sem justificativa.
- **Decisões de produto/operacionais**: confirmar papéis autorizados, limite de período, política de retenção, limiares por tenant, objetivos de latência/custo, volume esperado, política de cache e quais ações propostas poderão ser persistidas/executadas inicialmente.

## Fora de escopo

- Envio automático de campanhas ou mensagens, publicação de conteúdo ou alteração irreversível de dados.
- Acesso do agente a dados pessoais ou listagens individuais de clientes.
- Pesquisa de mercado que envie dados privados ou identificadores do negócio a um serviço externo.
- Diretório público de negócios, recomendação para consumidores ou mudança dos fluxos de booking.
- Substituição do modelo de autorização, das regras de Firestore, dos cálculos oficiais de analytics ou da arquitetura Firebase existente.
- Decisão definitiva de framework, provedor de LLM, infraestrutura dedicada, esquema de coleções, APIs ou estratégia de deploy nesta fase.
- Migrações, alterações de produção, deploy, seed ou importação de dados.

## Referências

- [Constituição do Tamarcado](../../.specify/memory/constitution.md): isolamento, autorização, privacidade, simplicidade e limites entre especificação e plano.
- [Spec 001 — Plataforma de agendamentos SaaS](../001-saas-appointment-platform/spec.md): integridade e autorização dos agendamentos.
- [Spec 008 — Observabilidade e logs](../008-observability-and-logs/spec.md): privacidade e responsabilidade da telemetria operacional.
- [Spec 009 — Prontidão operacional e confiabilidade](../009-operational-readiness-reliability/spec.md): limites de operação e custos.
- [Spec 010 — Analytics por empresa e renderização do cliente](../010-client-analytics-ssr/spec.md): definições de indicadores agregados e limites de analytics.
