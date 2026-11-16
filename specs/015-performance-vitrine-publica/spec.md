# Especificação: Performance da vitrine pública

**Feature Branch**: não criada; branch atual preservada

**Criada**: 2026-11-15

**Status**: Aprovada em conversa

**Input**: otimização local da vitrine pública orientada pelos diagnósticos de
performance, sem mudanças funcionais, visuais desnecessárias ou deploy.

## Cenários de usuário e testes

### História 1 — Abrir uma vitrine estável e rápida (Prioridade: P1)

Como visitante de um negócio, quero visualizar seus dados e serviços rapidamente,
sem deslocamentos inesperados, para escolher um serviço em qualquer tela.

**Por que esta prioridade**: o carregamento inicial e a estabilidade afetam todo
visitante que chega pelo endereço de uma empresa.

**Teste independente**: abrir uma vitrine com catálogo e imagens em viewport móvel
e desktop, com cache frio, observar a exibição, os recursos transferidos e as
métricas de carregamento e estabilidade.

1. **Dado** um catálogo publicado, **quando** o visitante abre seu link, **então**
   encontra a identidade e os serviços do negócio correto, sem mudança visual
   desnecessária ou conteúdo de outro negócio.
2. **Dado** conteúdo ainda carregando, **quando** os serviços e imagens aparecem,
   **então** o espaço reservado reduz deslocamentos e a página permanece legível
   e utilizável.
3. **Dado** uma imagem candidata ao maior conteúdo visível, **quando** seu endereço
   fica disponível, **então** ela é carregada com prioridade apropriada, sem
   carregamento preguiçoso; imagens fora da primeira dobra mantêm carregamento
   preguiçoso quando aplicável.
4. **Dado** um dispositivo com tela menor, **quando** existem variantes seguras
   da imagem, **então** o navegador pode receber uma variante adequada sem perda
   visual perceptível.

### História 2 — Continuar a navegação e o agendamento (Prioridade: P1)

Como visitante, quero selecionar um serviço e seguir o fluxo de agendamento
existente, para que otimizações de carregamento não interrompam minha experiência.

**Por que esta prioridade**: reduzir recursos iniciais não pode comprometer o
principal fluxo do produto.

**Teste independente**: abrir uma vitrine, escolher um serviço e navegar para o
agendamento e de volta, inclusive por link direto e histórico do navegador.

1. **Dado** um catálogo carregado, **quando** o visitante seleciona um serviço,
   **então** o fluxo existente abre no contexto da empresa e do serviço corretos.
2. **Dado** um acesso direto ou navegação pelo histórico, **quando** a aplicação
   carrega a rota, **então** os estados e controles existentes continuam disponíveis.
3. **Dado** erro de carregamento ou indisponibilidade, **quando** a informação
   não pode ser obtida, **então** o estado de erro existente é preservado sem
   exibir dados de outra empresa.

### História 3 — Validar melhorias sem alterar produção (Prioridade: P2)

Como responsável pela operação, quero comparar medições e resultados de testes,
para entender ganhos e limitações antes de qualquer futura publicação autorizada.

**Por que esta prioridade**: alterações locais não melhoram nem medem a versão
publicada até que exista um deploy separado e autorizado.

**Teste independente**: executar testes, build e medições disponíveis em ambiente
isolado, registrando condições, resultados e eventuais impedimentos.

1. **Dado** um recurso próprio cujo nome muda com o conteúdo, **quando** servido,
   **então** pode ser armazenado por longo prazo; documentos e recursos sem
   versionamento não recebem essa política indiscriminadamente.
2. **Dado** um recurso gerenciado por terceiro, **quando** sua política não estiver
   sob controle da aplicação, **então** a otimização não modifica seu comportamento
   interno nem promete alterar seu prazo de cache.
3. **Dado** uma comparação, **quando** antes e depois forem medidos, **então** o
   relatório identifica versão, dados, viewport, rede, cache e ferramenta; metas não
   verificadas são reportadas como não verificadas.

### Casos extremos

- Catálogo sem produtos, com um único produto, com promoções ou com paginação.
- A maior imagem visível muda com viewport, conteúdo, ordem ou tamanho das imagens.
- URL de imagem externa ou de usuário não oferece variantes redimensionadas ou
  falha; a imagem original e o estado de erro permanecem disponíveis.
- Fonte externa indisponível ou carregada lentamente; texto permanece legível.
- Dados do catálogo chegam após o HTML inicial; a aplicação não inventa URLs nem
  anuncia previamente várias imagens como prioritárias.
- Acesso direto ao agendamento, navegação entre empresas, histórico e reabertura
  do aplicativo instalado.
- Falha de autenticação ou monitoramento; otimizações não removem os serviços nem
  ocultam erros.

## Requisitos

### Requisitos funcionais

- **FR-001**: A solução MUST limitar alterações de produto à performance do
  cliente público e às configurações do seu Hosting, sem modificar outros
  aplicativos, regras do Firestore, lógica de agendamento ou dados reais.
- **FR-002**: O catálogo MUST preservar identidade da empresa, conteúdo cadastrado,
  responsividade, acessibilidade, navegação, agendamento e aparência existente.
- **FR-003**: Imagens MUST reservar dimensões previsíveis; a candidata a maior
  conteúdo visível MUST ser carregada com prioridade alta, sem carregamento
  preguiçoso, e imagens fora da primeira dobra MUST continuar diferidas quando
  aplicável.
- **FR-004**: A solução MUST evitar transferir imagens maiores que o necessário
  quando o provedor oferecer variantes verificáveis, mantendo qualidade visual e
  sem alterar ou remover imagens dos usuários.
- **FR-005**: A solução MUST reduzir deslocamentos na transição entre carregamento
  e catálogo sem esconder conteúdo ou alterar estados funcionais.
- **FR-006**: Fontes e estilos MUST preservar legibilidade e aparência; sua
  estratégia de carregamento MUST ser avaliada contra o caminho crítico e
  deslocamentos observados.
- **FR-007**: Recursos necessários apenas em fluxos posteriores SHOULD ser
  adiados quando isso preservar navegação e não duplicar dependências ou comprometer
  autenticação, monitoramento e tratamento de erros.
- **FR-008**: Somente recursos próprios comprovadamente versionados por conteúdo
  MUST ser elegíveis a cache longo e imutável; HTML e arquivos não versionados
  MUST permanecer atualizáveis. Recursos internos gerenciados pelo provedor de
  autenticação MUST NOT ser modificados para controlar seu cache.
- **FR-009**: A geração da página MUST continuar seguindo a
  [Spec 013](../013-arquitetura-storefront-publico/spec.md): o snapshot de build
  usa apenas a projeção de empresas públicas e não adiciona consultas de
  produtos ou profissionais. A disponibilidade tardia de imagens de produtos
  MUST ser registrada como limite quando não puder ser removida nesse escopo.
- **FR-010**: Testes existentes do cliente, build de produção e funcionamento da
  vitrine MUST ser verificados; falhas e limitações MUST ser registradas.
- **FR-011**: Não MUST ser feito deploy, alteração de dados reais ou adição de
  dependências sem justificativa técnica. A medição da URL publicada MUST NOT
  ser apresentada como medição da implementação local.

## Critérios de sucesso

### Resultados mensuráveis

- **SC-001**: Meta de referência em medição móvel comparável: pontuação de
  performance de pelo menos 90, maior conteúdo visível em até 2,5 s,
  deslocamento cumulativo de layout de no máximo 0,1 e interação em até 200 ms.
  Cada meta só é declarada atingida mediante medição apropriada.
- **SC-002**: Registrar bytes de imagens e JavaScript inicial antes e depois, sob
  as mesmas condições, e identificar reduções e regressões observadas.
- **SC-003**: Em testes dos cenários de catálogo e agendamento, 100% dos fluxos
  verificados preservam empresa, produto, navegação e estados funcionais.
- **SC-004**: O relatório identifica comandos executados, resultados, condições
  das medições e limitações; não há publicação ou escrita em dados reais.

## Premissas

- A URL de referência publicada é a linha de base disponível; sem deploy, ela
  permanece na versão anterior e não representa o resultado local.
- A geração estática atual inclui a identidade pública da empresa, mas não
  produtos; imagens de serviços dependem da busca de catálogo no navegador.
- A configuração existente já atribui cache imutável a `/assets/**`; a elegibilidade
  dos arquivos efetivamente emitidos precisa ser verificada antes de alterá-la.
- Firebase Storage não é presumido como serviço de redimensionamento de imagens;
  uma variante só será usada quando sua disponibilidade estiver comprovada.
- Os diagnósticos fornecidos são referência inicial, não evidência de que as metas
  foram atingidas pela implementação local.
