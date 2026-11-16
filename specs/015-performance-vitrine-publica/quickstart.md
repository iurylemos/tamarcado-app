# Validação: Performance da vitrine pública

## Pré-requisitos

Dependências existentes instaladas, configuração local segura e dados de teste
disponíveis sem alteração de dados reais. O build completo requer configuração
Firebase e consulta ao snapshot público; se não houver ambiente autorizado,
registrar o impedimento em vez de executar seed ou usar dados de produção
indevidamente.

## Testes e build

No diretório raiz:

```powershell
npm run test --workspace client
npm run build --workspace client
```

Registrar comando, resultado e eventuais falhas preexistentes ou de ambiente.
Executar testes direcionados adicionais para código afetado e, quando aplicável,
lint do escopo modificado com as ferramentas existentes.

## Navegação e layout

Em ambiente local isolado com um catálogo disponível, verificar viewport móvel
e desktop: identidade, imagens, promoções, placeholders, estados de falha,
seleção de serviço, acesso direto ao agendamento e navegação voltar/avançar.
Inspecionar a imagem candidata a LCP, prioridade e dimensões; confirmar que
imagens posteriores permanecem diferidas e que não há erro de hidratação.

## Medições

Registrar URL e versão, tamanho de viewport, emulação de rede e CPU, cache
frio/quente, ferramenta, LCP, CLS, INP quando disponível, bytes de imagens e
JavaScript inicial. Comparar versões sob as mesmas condições e dados. Confirmar
as metas apenas quando as métricas correspondentes forem efetivamente obtidas.

A URL publicada pode ser reanalisada para referência, mas não representa as
alterações locais sem deploy autorizado. Não fazer deploy como parte desta
validação.

## Resultados locais — 2026-11-15

- Antes das alterações, `npm run test --workspace client`: 19 arquivos e 130
  testes passaram. O build de produção também passou, mas a configuração
  existente enviou automaticamente source maps ao Sentry; nenhum deploy do
  site foi executado.
- Após as alterações, `npm run test --workspace client`: 22 arquivos e 135
  testes passaram. O build com `TAMARCADO_SKIP_SENTRY_UPLOAD=true` passou,
  incluindo type-check e geração estática, sem novos uploads. O ESLint nos
  arquivos TypeScript afetados também passou.
- Em builds comparáveis com upload desativado, os chunks necessários ao
  catálogo passaram de aproximadamente 366,58 kB para 351,25 kB gzip,
  redução de 15,33 kB (4,2%). É uma estimativa pela árvore estática de imports,
  não uma medição de transferência em rede. O chunk de booking permanece
  separado; o precache gerado passou de 1.258,91 para 1.261,70 KiB.
- Em uma amostra de uma foto pública do Unsplash com mesma qualidade e corte,
  respostas para 900 e 320 pixels tiveram 75.320 e 16.474 bytes,
  respectivamente. O resultado depende da foto, formato e dispositivo; imagens
  do Firebase Storage não são automaticamente redimensionadas.
- Em navegador local isolado, viewport 390 × 844, sem simulação de rede/CPU e
  sem interação por sete segundos, um observador registrou LCP 3,356 s e CLS 0.
  Na página publicada, sob procedimento similar, registrou LCP 4,180 s e CLS
  0,6005; a origem local tem latência de documento diferente. Uma amostra local
  desktop de 1366 × 768 registrou LCP 3,576 s e CLS 0,0316.
  Estas são amostras exploratórias individuais, não análises Lighthouse ou
  métricas de campo; não comprovam que as metas foram atingidas.
- O navegador confirmou a imagem de oferta como `eager` e alta prioridade;
  navegação local de catálogo para booking e retorno funcionou sem submissão.
  Não foi medido INP nem foram testadas todas as condições de rede.
- A consulta PageSpeed Insights para a URL publicada falhou com HTTP 429.
  Sem deploy, a URL publicada continua servindo a versão anterior.
- O teste automatizado confere a configuração dos cabeçalhos, mas o Hosting
  Emulator não foi iniciado porque a porta 5000 já estava ocupada; os
  cabeçalhos efetivos da configuração local permanecem sem verificação nele.
- A verificação de formatação apontou seis arquivos existentes não formatados;
  os mesmos seis também falharam na revisão correspondente ao `HEAD`. O
  ESLint direcionado passou, sem reformatar arquivos inteiros não relacionados.
- Plus Jakarta Sans agora é servida pelo cliente como WOFF2 Latin local
  (27.348 bytes), pré-carregada no HTML, e Latin-Extended (21.728 bytes) sob
  demanda. Ambas declaram pesos 400–800 e `font-display: swap`. A folha externa
  do Google Fonts (621 bytes transferidos na consulta com user-agent Chrome)
  foi removida. No preview de produção, o navegador carregou a fonte local,
  confirmou os pesos 400 e 800 e não solicitou recursos de
  `fonts.googleapis.com` ou `fonts.gstatic.com`.
- O CSS global continua como stylesheet do Vite no `<head>` para evitar FOUC.
  Não foi adiado nem duplicado inline, pois não houve evidência de CSS removível
  com   segurança. O asset final tem 71.320 bytes, 668 bytes acima dos 70.652
  bytes do asset prévio; o Vite reportou 14,38 kB gzip, não comparável
  diretamente aos 12,7 KiB transferidos pelo PageSpeed. A inspeção visual
  local da página inicial não mostrou regressão perceptível.
- O iframe de autenticação e Sentry em tempo de execução não tiveram seu
  comportamento interno alterado. O maior chunk de catálogo continua acima de
  500 kB minificados; ganhos adicionais requerem investigação.

## CSS inicial por rota — 2026-11-16

- Antes, o build emitia um CSS inicial de 71.324 bytes (71,32 kB; 14,38 kB
  gzip pelo relatório do Vite). Depois da separação, o HTML inicial referencia
  somente `index-BkuAhWKP.css`, com 48.750 bytes (48,75 kB; 10,75 kB gzip):
  redução de 22.574 bytes (31,6%) e 3,63 kB gzip (25,2%). Uma compressão local
  Brotli com Node mediu 12.598 bytes antes e 9.495 bytes depois; isso não
  substitui uma medição de transferência no Hosting.
- O build também emite `BookingPage-CGb4goib.css` (22.859 bytes; 4,64 kB gzip),
  associado ao import dinâmico da página de agendamento. O HTML inicial continua
  com uma folha CSS render-blocking; o CSS de booking só é baixado nessa rota.
  A quantidade de CSS inicial não mudou, mas seu tamanho diminuiu. Não há CSS
  duplicado no HTML inicial, e não foi usado CSS crítico inline.
- O CSS comum, catálogo, tokens e tema permanecem globais para estilizar o HTML
  SSR inicial. Regras exclusivas de agendamento foram movidas sem alterar suas
  declarações para `client/src/styles/booking.css`. O shell de agendamento não
  contém HTML SSR; o import dinâmico resolve após o carregamento dessa folha.
  `hydrateRoot` e a geração de HTML não foram alterados.
- No preview local, sem throttling de rede ou CPU e em uma amostra por variante,
  a home SSR registrou FCP/LCP de 52/52 ms antes e 88/88 ms depois, com CLS 0
  em ambas. A rota de booking de teste registrou FCP 120 ms, LCP 204 ms e CLS
  0. A variação da home não demonstra regressão nem ganho: as amostras não têm
  condições controladas e não representam a vitrine publicada; LCP/FCP e metas
  de campo permanecem não verificados.
- Validação desta rodada: `tsc --noEmit`, build Vite do cliente, build SSR do
  cliente e `npm run test --workspace client` passaram (22 arquivos, 135 testes).
  ESLint passou para `client/src/pages/BookingPage.tsx`; Prettier passou para
  `client/src/styles/booking.css`. O build foi executado sem a etapa final de
  geração do storefront, pois `generate-storefront.mts` consulta a coleção
  `public_businesses` quando não há emulador configurado; dados de produção não
  foram lidos nem importados.
