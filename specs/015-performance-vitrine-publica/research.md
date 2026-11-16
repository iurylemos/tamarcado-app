# Pesquisa: Performance da vitrine pública

## Entrega inicial

**Decisão**: preservar a geração estática atual de identidade da empresa e a
leitura de produtos no navegador.

**Motivo**: a [Spec 013](../013-arquitetura-storefront-publico/spec.md) proíbe
consultas adicionais de produtos e profissionais no build. O HTML estático não
contém as URLs dos produtos, portanto não pode antecipá-las com segurança.

**Alternativa**: incluir produtos no snapshot; rejeitada por contrariar o escopo.

## Imagens e estabilidade

**Decisão**: verificar o LCP por viewport e conteúdo; priorizar apenas candidato
identificável quando os dados estiverem disponíveis, preservar lazy loading para
conteúdo fora da primeira dobra e comparar dimensões reais dos esqueletos.

**Motivo**: o template usa lazy loading em imagens de promoções e serviços;
promoções podem aparecer antes da grade. A imagem LCP não é necessariamente o
primeiro produto em todas as telas. Cartões e promoções já usam proporções CSS,
que devem ser consideradas antes de acrescentar novas regras.

**Alternativa**: preloads de várias imagens; rejeitada por competição na rede e
por não haver URLs de produtos no HTML inicial.

## Variantes

**Decisão**: gerar variantes apenas quando o fornecedor e o contrato da URL
suportarem transformações de forma verificável. Preservar URLs originais de
Storage e de fontes desconhecidas quando não houver serviço de transformação.

**Motivo**: adicionar parâmetros arbitrários não transforma imagens do Firebase
Storage e pode invalidar URLs ou imagens cadastradas.

## JavaScript, autenticação e monitoramento

**Decisão**: medir imports e chunks reais antes de mover dependências. A entrada
já carrega páginas por rota; a configuração Firebase inicializa autenticação,
Firestore e Functions no mesmo módulo, enquanto o layout envolve Sentry.
Qualquer separação deve preservar inicialização, emuladores, diagnóstico de
erros, roteamento e comportamento de agendamento.

**Alternativa**: remover Sentry ou autenticação do carregamento sem avaliação;
rejeitada por reduzir cobertura ou alterar comportamento.

## Cache e fontes

**Decisão**: auditar a saída antes de mudar cache. O Hosting já aplica um ano de
cache imutável a `/assets/**`; arquivos de nome fixo e documentos não podem
receber o mesmo tratamento indiscriminadamente. O HTML já faz preconnect para
os dois domínios de fontes e carrega Plus Jakarta Sans com `display=swap`.

**Alternativa**: mudar o cache do iframe de autenticação ou carregar a fonte
assincronamente sem medir troca de layout; rejeitada por falta de controle ou
risco à experiência visual.

**Fonte**: [Firebase Hosting: cache](https://firebase.google.com/docs/hosting/manage-cache)
e [configuração de cabeçalhos](https://firebase.google.com/docs/hosting/full-config).
