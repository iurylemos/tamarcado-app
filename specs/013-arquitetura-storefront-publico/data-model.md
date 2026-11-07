# Modelo de dados: storefront estático

## Snapshot de publicação

- Fonte: coleção `public_businesses`, consultada no build com o filtro
  `published == true`, compatível com a regra Firestore existente.
- O snapshot é uma lista em memória de registros públicos publicados. Cada slug
  válido e único corresponde a um HTML estático de catálogo. Documento privado,
  não publicado ou proveniente de outra coleção não é elegível.
- Falha de consulta, campo obrigatório inválido ou duplicidade impede gerar/
  promover o snapshot; não escolher um documento arbitrariamente.
- A publicação contém raiz neutra, páginas estáticas por slug e o shell usado
  pelas rotas profundas. Uma retirada remove o HTML correspondente no próximo
  build completo e publicação do Hosting.

## Cadastro público da empresa

- `id`: identificador do documento, obrigatório e usado somente conforme a
  projeção pública atual.
- `name`: texto público obrigatório e não vazio.
- `slug`: texto obrigatório; deve obedecer `^[a-z0-9]+(?:-[a-z0-9]+)*$`, ser
  único no snapshot e identificar exatamente o documento renderizado.
- `segment`: valor público obrigatório compatível com `BusinessSegment`.
- `tenantId`: obrigatório para validação de consistência no build; nunca é
  serializado no HTML, metadados, logs ou links.
- `description`: opcional, texto escapado antes de interpolar em HTML.
- `logoUrl`: opcional; aceitar somente URL pública segura (HTTP/HTTPS), escapar
  atributos HTML e usar fallback público quando ausente/inválida.
- `timezone`: opcional; pode ser projetado apenas se exigido pelo modelo
  existente. Não usar como substituto da validação de disponibilidade.
- Outros campos não são copiados por spread para o snapshot ou para o HTML.

## Página estática de catálogo

- Chave: slug publicado.
- Conteúdo: HTML React renderizado, dados mínimos da empresa, title, description,
  canonical e metadados Open Graph.
- Canonical é URL absoluta composta pelo `VITE_PUBLIC_SITE_URL` do build ou pelo
  domínio Firebase Hosting configurado como fallback, seguida do caminho do slug.
- O estado serializado é limitado à empresa correspondente, escapado para
  contexto HTML e não inclui `tenantId` ou dados de outros domínios.
- A raiz contém apenas orientação neutra; não lista empresas.

## Shell de agendamento e navegação

- Rotas: `/empresa/{slug}/agendar/{productId}` servidas pelo shell estático.
- O arquivo `booking-shell.html` contém o container React vazio e os assets
  client-side; não reutiliza markup pré-renderizado da raiz.
- O shell não inclui dados ou metadados individualizados e a resposta inicial não
  tem status HTTP específico para o produto/empresa solicitado.
- O cliente busca os dados por serviços já existentes. Se empresa/produto não
  existir ou não for publicado, mostra estado de não encontrado; falhas de rede/
  origem são erro acionável distinto.
- React Router mantém a URL e o histórico; o QueryClient mantém estado durante a
  navegação. Dados já presentes no cache de catálogo são reutilizados. Disponibilidade,
  autorização e criação continuam revalidadas pelos serviços/backend existentes.

## Ciclo de vida

`lido` → `validado` → `renderizado` → `publicado`.

Falha de leitura/validação aborta o build. A alteração e remoção tornam-se
efetivas somente na publicação Hosting seguinte. Uma versão antiga pode reintroduzir
cadastro retirado; após retirada, rollback é substituído por roll-forward gerado
da fonte atual.

## Regras de isolamento

Validar o vínculo entre slug e `tenantId` antes de gerar cada página. Criar uma
projeção nova por empresa e nunca compartilhar estado mutável entre renderizações.
Nenhum documento ausente/inválido pode cair em dados de outro tenant. As consultas
de produtos e profissionais do build são proibidas; serviços de leitura que já
existem no navegador permanecem fora do snapshot.
