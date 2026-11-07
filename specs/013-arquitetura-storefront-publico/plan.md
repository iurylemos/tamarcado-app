# Plano de implementação: Storefront público Vite + React SSG

**Branch**: `013-arquitetura-storefront-publico` (planejada; sem troca de branch nesta etapa)  
**Data**: 2026-11-07 | **Spec**: [spec.md](spec.md)  
**Status**: plano aprovado; usuário autorizou gerar tarefas e parar antes da implementação.

## Resumo

Gerar HTML estático para `/`, e para cada empresa publicada em
`/empresa/{slug}`, usando a aplicação Vite + React existente. O build lê somente
`public_businesses` publicado, valida o snapshot e renderiza os metadados
individuais da empresa. O HTML estático serve também como shell para as rotas
profundas de agendamento; estas carregam seus dados nos serviços existentes do
cliente e não terão metadados ou status HTTP individualizados na resposta inicial.

Trocar navegação interna por roteamento SPA com suporte a History API, voltar,
avançar e acesso direto. Reaproveitar o estado do React Query e os dados de
produto já carregados, sem novas consultas de produtos/profissionais para SSG.
Remover os rewrites do Hosting para `renderStorefront`; reescrever somente os
caminhos profundos de agendamento para o shell estático. Não alterar a Function,
outros workspaces ou regras Firestore.

## Contexto técnico

- **Linguagem/versões**: TypeScript 6, React 19, Vite 8, Firebase JS SDK 12.
- **Dependências principais**: reutilizar React Router e React Query existentes;
  não adotar framework ou infraestrutura nova. Se React Router for necessário
  no bundle de produção, ajustar sua classificação no `client/package.json`.
- **Armazenamento**: Firestore `public_businesses`, consultado com
  `published == true`; páginas e snapshot em arquivos sob `client/dist/client`.
- **Testes**: Vitest/Testing Library, Firebase Emulator Suite e Firebase Hosting
  Emulator. Testes de navegador para links, histórico, ausência de navegação de
  documento e tempo de transição.
- **Plataforma alvo**: Firebase Hosting multisite estático; leitura de catálogo
  e agendamento no navegador permanece nos serviços existentes.
- **Tipo de projeto**: aplicação web React no monorepo npm.
- **Metas de desempenho**: p75 do LCP móvel no máximo 105% da linha de base e p75
  do TTFB não maior que a linha de base; p75 de transição SPA menor que a linha
  de base comparável. Registrar valores absolutos, amostra, rede e cache frio/quente.
- **Restrições**: nenhuma Function para entregar HTML público; nenhum deploy em
  produção nesta execução; nenhuma nova consulta de produtos/profissionais para
  SSG; sem alteração de regras, Functions, `collaborator` ou `backoffice`.
- **Atualização**: alterações cadastrais aparecem após o próximo build/deploy
  autorizado. Não existe gatilho automático por escrita no Firestore nem SLA de
  propagação. Após retirada, não reverter para snapshot que possa republicar o tenant.
- **Escala**: cada empresa publicada gera um documento estático; o custo do build
  cresce com o número de empresas. Quantidade atual e duração aceitável devem ser
  medidas em ambiente demo antes da publicação.

## Verificação da Constituição

| Princípio | Verificação |
|---|---|
| I — fluxo e domínio | Mantém entrada por slug, raiz neutra, links diretos e catálogo/agendamento associados ao slug atual; não cria diretório. |
| II — agendamento | Disponibilidade e criação continuam usando os serviços e validações autoritativos existentes; nenhuma regra de agendamento é alterada. |
| III — segurança | Build lê somente documentos públicos publicados; valida slug/tenant, emite projeção mínima e não enfraquece regras Firestore. |
| IV — finanças | Valores, relatórios e regras financeiras não são alterados. |
| V — qualidade | Testes cobrem HTML/SEO, rotas, erros, isolamento, navegação, build, Hosting e desempenho. |
| VI — fronteiras | Alterações limitadas a `client/` e ao Hosting client em `firebase.json`; nenhum código de outros workspaces. |
| VII — UX | Estados de carregamento/erro, links compartilháveis, teclado, histórico e fluxo mobile são preservados. |
| VIII — simplicidade | Reutiliza Vite, React Router, React Query e Firebase existentes; sem framework ou serviço novo. |

**Resultado**: sem violação constitucional. A Spec 010 continua atendida quanto
ao fluxo funcional e à autoridade do backend; para esta etapa, o usuário aprovou
explicitamente a substituição do SSR, dos metadados por URL profunda e do status
HTTP individualizado por um shell estático e validação no cliente.

## Decisões de arquitetura

1. **Snapshot de empresas**: o build consulta a coleção pública
   `public_businesses` com `where('published', '==', true)`. Regras atuais permitem
   a leitura porque a condição da consulta garante o predicado de publicação.
   Validar todos os slugs, duplicidade, `tenantId` interno e campos obrigatórios
   antes de gerar qualquer HTML. Não emitir `tenantId` nem campos não autorizados.
2. **SSG com stack atual**: manter o build cliente e bundle SSR já existentes.
   Usar o template HTML do Vite e o renderer React existente para gerar a raiz e
   cada página `/empresa/{slug}`; gravar saídas intermediárias e promovê-las ao
   diretório Hosting somente após o snapshot inteiro passar validação. Canonicals
   absolutos usam `VITE_PUBLIC_SITE_URL`, com o domínio Firebase Hosting atual
   como fallback público.
3. **Rotas profundas**: emitir `booking-shell.html` separado, com container React
   vazio, para URLs de agendamento por meio de rewrite de Hosting limitado ao
   padrão profundo. Caminhos de catálogo ausentes não terão rewrite de SPA e
   receberão 404 estático. O shell separado evita hidratar HTML da página raiz
   como se fosse uma página de booking. A resposta profunda é 200; produto,
   empresa e estados de agendamento inválidos são exibidos pelo cliente após usar
   os serviços existentes.
4. **Roteamento SPA e dados**: integrar React Router ao app que hidrata páginas
   de catálogo SSG e monta o shell de agendamento. Links internos usam navegação
   client-side; links externos continuam nativos. Preservar QueryClient entre
   navegações, sem desmontar a aplicação inteira. Seed/reutilizar dados de
   catálogo/produto já carregados e limitar buscas existentes ao dado que ainda
   não estiver disponível (por exemplo, detalhes que o serviço já carrega para
   a página de booking). Back/forward e refresh são gates.
5. **Firebase Hosting**: arquivos estáticos têm precedência sobre rewrites. Retirar
   rewrites para a Function na raiz e em `/empresa/**`; adicionar rewrite somente
   para rotas profundas de agendamento apontando a `booking-shell.html`. Configurar
   HTML para revalidação e assets com hash para cache imutável. Não adicionar
   fallback global que transforme slug de catálogo inexistente em resposta 200.
6. **Atualização e rollback**: geração completa acontece no build de Hosting
   autorizado após alterações públicas. Build inválido falha e bloqueia promoção;
   Hosting publica uma versão consistente. Uma retirada fica efetiva após a
   próxima publicação. Reversão para versão anterior não é segura após remoção;
   o procedimento seguro é corrigir e publicar novamente a partir da fonte atual.
   Sem pipeline ou gatilho existente, não prometer publicação automática ou SLA.
7. **Falhas**: erro de Firestore, slug malformado/duplicado ou cadastro incompleto
   interrompe o build com erro explícito e sem dados sensíveis nos logs. No browser,
   erro de leitura permanece distinto de não encontrado e apresenta retry acessível.

## Validação de desempenho e compatibilidade

- Comparar versão anterior e nova no mesmo navegador, máquina, rede, dados e
  condições de cache; registrar LCP, TTFB e tempo de transição mediano/p75.
- Confirmar que navegação interna não causa request de documento e que voltar/
  avançar restaura o estado/URL esperado.
- Confirmar que o produto e o cadastro já carregados no catálogo não geram uma
  segunda leitura equivalente ao abrir o agendamento. Consultas de dados
  complementares já existentes continuam permitidas.
- Testar acesso direto e refresh para raiz, catálogo, booking válido e booking
  inválido no Hosting Emulator; confirmar ausência de invocações de
  `renderStorefront`.
- Testar dois tenants, slug não publicado, slug duplicado, alteração e retirada
  somente em emuladores/dados de teste.
- Build de produção pode ser executado localmente, mas nenhum comando de deploy
  para projeto de produção faz parte deste plano.

## Estrutura do projeto

```text
client/
  scripts/                    # gerador do snapshot SSG
  dist/client/booking-shell.html # shell vazio usado pelo rewrite de agendamento
  src/app/                    # rotas SPA e metadados
  src/pages/                  # catálogo e agendamento existentes
  src/services/               # serviços existentes; sem novas queries de domínio
  src/entry-client.tsx        # hidratação/montagem com History API
  src/entry-server.tsx        # renderização estática do catálogo/root
  vite.config.ts
  package.json
firebase.json                 # somente Hosting do site client
specs/013-arquitetura-storefront-publico/
  spec.md  plan.md research.md data-model.md quickstart.md
  contracts/storefront.md tasks.md
```

**Decisão de estrutura**: reutilizar o renderer existente para o SSG e introduzir
roteamento no `client`, sem editar a Function legada. A configuração compartilhada
de Hosting é a única exceção ao escopo de workspace; suas alterações restringem-se
ao site client. O mapa de arquivos final será ajustado às convenções encontradas
durante implementação, sem ampliar o escopo.

## Gates de aprovação

1. A especificação revisada foi aprovada pelo usuário.
2. O plano foi aprovado pelo usuário.
3. O usuário selecionou atualizar `tasks.md` e parar; nenhuma implementação de
   código/configuração está autorizada nesta etapa.
4. Não fazer deploy de produção sem autorização explícita adicional.

## Complexidade

Sem exceções constitucionais. O custo de geração é linear no número de cadastros
públicos; se o tempo de build ou o volume de saída não atenderem ao ambiente demo,
parar e reavaliar em vez de adicionar infraestrutura ou consultar outros domínios.
