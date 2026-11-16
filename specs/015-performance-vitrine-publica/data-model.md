# Modelo: Performance da vitrine pública

Não há alteração de persistência, esquema de dados ou contratos de domínio.

## Identidade pública

O snapshot da empresa contém os campos públicos já autorizados e é associado ao
slug. Não inclui produtos ou profissionais. Cada página usa somente o snapshot
do slug correspondente.

## Imagem apresentada

Uma imagem usa a URL cadastrada do produto ou a imagem padrão existente. Suas
variantes, quando comprovadamente suportadas, são derivados de exibição: não
modificam nem substituem os dados cadastrados. Prioridade depende da posição
visível e dos dados disponíveis; imagens posteriores permanecem diferidas.

## Estado da vitrine

Os estados existentes de carregamento, pronta, vazia, não encontrada,
indisponível e erro permanecem semanticamente inalterados. Placeholders são
substituídos quando o carregamento termina.

## Medição

Cada amostra identifica versão, URL, dados, viewport, rede, cache, ferramenta e
métricas disponíveis. Amostras publicadas e locais são identificadas
separadamente; INP observado em laboratório não equivale automaticamente ao
INP de campo.
