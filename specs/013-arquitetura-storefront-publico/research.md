# Pesquisa: Vite + React SSG do storefront

**Status**: decisões técnicas aprovadas para planejamento; medições de desempenho
e validação no Hosting Emulator permanecem gates de implementação.

## Estado real observado

- `client` usa React 19, Vite 8, Firebase JS SDK 12, React Query e React Router
  7. A aplicação não usa um router: `entry-client.tsx` seleciona a página apenas
  uma vez pelo `window.location.pathname`.
- Links internos de catálogo/agendamento são `<a href>`, causando navegação de
  documento completo. O bundle de cada página também é carregado dinamicamente
  na inicialização.
- `entry-server.tsx` renderiza HTML e metadados; `vite.config.ts` renomeia o
  `index.html` para `storefront-template.html`, gera `dist/client` e `dist/server`.
- `firebase.json` direciona `/` e `/empresa/**` ao `renderStorefront`; o Hosting
  publica `client/dist/client`. O handler também carrega dados de produto para
  links profundos.
- `getCompanyCatalog` lê empresa, produtos e, para booking, galerias. Esse serviço
  deve continuar como fonte existente do navegador; o gerador SSG não o reutiliza,
  pois isso adicionaria consultas de produtos ao build.
- Regras Firestore permitem `read` em `public_businesses` somente quando
  `published == true`; não exigem mudança para consultar essa coleção filtrada.
- Não há workflow `.github/workflows` encontrado. A atualização por evento de
  escrita no Firestore não está disponível neste escopo e não será simulada por
  infraestrutura nova.

## Decisões e justificativas

### Vite/React atual em vez de migração

Usar a build SSR atual do Vite como renderer de rotas conhecidas, gravando HTML
por slug durante o build. Isso evita migração de páginas, novas dependências ou
runtime por requisição. Vike e Astro foram considerados, mas não reduzem o
requisito de obter uma lista conhecida de rotas e republicar snapshots.

### Origem da lista e segurança

Obter o snapshot com consulta `public_businesses.where('published', '==', true)`.
A documentação oficial do Firestore explica que regras são avaliadas para todos
os resultados e que um predicado de consulta que satisfaz a regra permite a
leitura. A regra atual do projeto já aplica esse predicado. Validar duplicidade
de slug e descartar campos internos antes da serialização; nenhum dado privado
ou de outros domínios é consultado para geração.

### Rotas profundas e navegação

Firebase Hosting responde nesta ordem: arquivo estático exato antes de rewrite,
rewrite antes do 404 customizado. Um rewrite deve apontar para um arquivo que
existe e a primeira regra correspondente é aplicada. Portanto, páginas SSG de
catálogo podem ter precedência e um rewrite limitado a booking pode servir o
shell profundo; o padrão definitivo deve ser verificado no Hosting Emulator.
O destino do rewrite é um HTML shell separado e vazio, não o `index.html` da raiz
que contém markup SSR e causaria incompatibilidade de hidratação.

React Router `BrowserRouter` usa History API; `Link` habilita navegação client-side
mantendo comportamento progressivamente aprimorado. Isso endereça o reload
observado nos links internos. React Query já existe e deve manter o estado entre
rotas; a implementação deve seed/reusar os dados já carregados, sem novas queries
de produtos/profissionais na geração.

### Atualização, cache e reversão

SSG é snapshot: cada novo slug, edição ou retirada aparece no próximo build e
deploy. O escopo não possui gatilho Firestore existente nem mecanismo aprovado
para automatizar deploy a cada alteração. Usar HTML revalidável e assets com hash
imutáveis; caches de prévias de terceiros não são controláveis. Um rollback antigo
pode republicar conteúdo removido, portanto após retirada a recuperação é
roll-forward a partir da fonte atual.

## Comparativo resumido

| Critério | Vite + React SSG escolhido | Vike + React | Astro + React |
|---|---|---|---|
| Migração | Reutiliza app, renderer e build | Adoção e convenções novas | Migração maior de roteamento/páginas |
| SSG por slug | Gerador pequeno para lista do build | Prerender de URLs conhecidas | `getStaticPaths` para rotas conhecidas |
| Rotas booking | Shell estático + serviços/client router existente | Mesmo limite sem runtime/produtos no build | Mesmo limite sem runtime/produtos no build |
| Navegação SPA | Router existente no manifest, atualmente sem uso | Suporta router novo | Requer integração React e desenho de islands |
| Hosting/ciclo | Publicação estática; precisa rebuild | Publicação estática; precisa rebuild | Publicação estática; precisa rebuild |
| Novas dependências | Nenhuma necessária | Sim | Sim |

## Referências oficiais consultadas

- [Firebase Hosting: full configuration](https://firebase.google.com/docs/hosting/full-config) —
  precedência de arquivos, rewrites, 404, ordem das regras e cache headers.
- [Firestore: secure and query documents based on a field](https://firebase.google.com/docs/firestore/enterprise/security/rules-query) —
  consultas precisam garantir que todo documento retornado satisfaça a regra.
- [Vite: SSR guide](https://vite.dev/guide/ssr) — rotas/dados conhecidos podem ser
  prerenderizados usando a mesma lógica da renderização SSR de produção.
- [React Router: BrowserRouter](https://reactrouter.com/api/declarative-routers/BrowserRouter)
  e [Link](https://reactrouter.com/api/components/Link) — History API e navegação
  client-side progressivamente aprimorada.

## Medições pendentes

Nenhum benchmark ou teste de emulador foi executado durante a fase de pesquisa.
O quickstart define as condições para comparar HTML inicial, LCP, TTFB e
transições entre rotas, e para confirmar rewrites e 404 antes de qualquer deploy.
