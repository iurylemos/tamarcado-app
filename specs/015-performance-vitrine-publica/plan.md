# Plano: Performance da vitrine pública

**Branch atual**: `main` | **Data**: 2026-11-15 |
**Spec**: [spec.md](spec.md)

## Resumo

Otimizar o carregamento inicial e a estabilidade do catálogo existente com
alterações verificáveis no `client` e, quando justificadas, no Hosting do
cliente. Medir a origem dos custos antes de selecionar otimizações; não alterar
fluxos, visual ou arquitetura do snapshot público da Spec 013.

## Contexto técnico

- **Stack**: TypeScript, React, Vite, Firebase, React Query e Vitest existentes.
- **Origem**: páginas estáticas por empresa são geradas com identidade pública;
  os produtos são consultados no navegador. Nenhuma nova leitura de produtos ou
  profissionais é permitida no build.
- **Testes**: Vitest/Testing Library, build de produção e navegação real quando
  houver ambiente local isolado e dados de teste disponíveis.
- **Alvo**: navegadores móveis e desktop; Firebase Hosting do `client`.
- **Referências**: Lighthouse >= 90, LCP <= 2,5 s, CLS <= 0,1 e INP <= 200 ms;
  registrar valores realmente medidos, não presumir cumprimento.
- **Limites**: sem deploy, seed, alterações em dados reais, regras, outros
  aplicativos ou lógica de negócio. Não adicionar dependências sem justificativa.

## Verificação da Constituição

| Princípio | Aplicação |
|---|---|
| I e II | Preservar isolamento por slug, seleção, disponibilidade e agendamento. |
| III e IV | Não alterar autorização, dados sensíveis, preços ou regras financeiras. |
| V | Cobrir alterações e fluxos críticos; executar testes e build do cliente. |
| VI | Manter alterações na aplicação pública e no Hosting correspondente. |
| VII | Preservar estados acessíveis, legibilidade, navegação e responsividade. |
| VIII | Reutilizar mecanismos existentes e evitar otimizações não verificadas. |

Resultado antes e depois do desenho: sem exceções planejadas.

## Estrutura

- `client/src/components/templates/CompanyCatalogTemplate/`: imagens, áreas
  reservadas e transições de conteúdo.
- `client/src/styles/`: dimensões de placeholders e cartões, quando necessário.
- `client/src/pages/`, `client/src/app/`, `client/src/config/` e
  `client/src/services/`: investigar dependências e separar somente o que for
  seguro adiar, preservando captura de erros e autenticação.
- `client/index.html`, `client/vite.config.ts` e `firebase.json`: investigar
  fontes, CSS, saída versionada e cache do site público.
- Testes próximos aos componentes, navegação, geração estática e serviços
  afetados; documentação diretamente relacionada quando aplicável.
- [research.md](research.md), [data-model.md](data-model.md),
  [contrato](contracts/storefront-performance.md) e [quickstart.md](quickstart.md)
  descrevem decisões e validação.

## Estratégia de implementação

1. Registrar linha de base reproduzível: rota, viewport, dispositivo/rede,
   condições de cache, componente LCP, fontes de CLS, bytes e dependências do
   bundle; distinguir a URL publicada dos artefatos locais.
2. Cobrir com testes o carregamento de imagem prioritária, promoções, imagens
   posteriores, dados sem variantes, placeholders e rotas críticas.
3. Ajustar prioridade e dimensões com base no elemento de fato visível. Usar
   variantes responsivas somente em provedores com transformação comprovada;
   manter URL original quando isso não existir. Não prever URLs de produtos que
   não constem do HTML inicial.
4. Corrigir diferenças verificadas entre o espaço de skeletons e conteúdo,
   incluindo telas móveis e promoções, sem esconder informações ou introduzir
   espaços permanentes arbitrários.
5. Examinar imports e bundles; diferir apenas código cuja inicialização tardia
   não prejudique captura de erros, autenticação, navegação ou PWA. Medir se há
   redução real e verificar dependências compartilhadas.
6. Examinar CSS e fontes; manter ou ajustar a estratégia apenas se medições e
   verificação visual indicarem melhoria sem degradação. Validar nomes de assets
   antes de alterar cache e manter documentos e arquivos não versionados
   revalidáveis. Não tentar alterar TTL do iframe de autenticação.
7. Executar testes do cliente, build, validação de navegação e medições
   reproduzíveis disponíveis; relatar separadamente falhas, indisponibilidades
   e metas não verificadas.

## Limites de medição

Uma análise posterior da URL pública sem deploy mede novamente a versão
publicada, não o código local. Comparações da implementação exigem servidor local
ou ambiente isolado com dados equivalentes e condições registradas; dados reais
não podem ser alterados nem semear ambientes sem autorização.
