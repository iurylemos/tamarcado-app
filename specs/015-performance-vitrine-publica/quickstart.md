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
- CSS e Google Fonts continuam no caminho inicial: as alternativas avaliadas
  não foram alteradas sem evidência de ganho e segurança visual. O iframe de
  autenticação e Sentry em tempo de execução não tiveram seu comportamento
  interno alterado. O maior chunk de catálogo continua acima de 500 kB
  minificados; ganhos adicionais requerem investigação.
