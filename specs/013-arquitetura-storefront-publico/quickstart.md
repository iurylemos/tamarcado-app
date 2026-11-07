# Validação: storefront público SSG

Este roteiro aplica-se após aprovação do plano e implementação. Usar somente
Firestore/Hosting Emulator e cadastros sintéticos; não fazer deploy de produção.

## Pré-requisitos

- Node/npm e dependências do monorepo instaladas.
- Firebase Emulator Suite no projeto `demo-tamarcado`.
- Dois documentos públicos sintéticos em `public_businesses`, publicados e com
  slugs distintos; preparar também slug ausente, produto inexistente, duplicidade
  e estado de erro sem usar dados de produção.
- O build SSG deve apontar explicitamente ao Firestore Emulator para testes.

## Build e arquivos estáticos

1. Iniciar emuladores necessários:
   `firebase emulators:start --project demo-tamarcado --only firestore,hosting`
2. Executar o build do client com a configuração de emulator documentada pelo
   script SSG:
   `npm run build --workspace client`
3. Confirmar no diretório de saída:
   - `index.html` neutro;
   - um arquivo de catálogo por slug publicado;
   - `booking-shell.html` para links profundos, com container React vazio e sem
     dados ou metadados individualizados;
   - nenhum HTML para slug não publicado e nenhum artefato antigo após a
     regeneração completa.
4. Induzir Firestore indisponível, cadastro inválido e slug duplicado. Cada caso
   deve falhar o build explicitamente e impedir que o comando seguinte de
   publicação seja considerado sucesso.

## Hosting Emulator e rotas

1. Servir o build pelo Hosting Emulator e inspecionar HTML bruto com
   `curl.exe -i http://127.0.0.1:5000/` e
   `curl.exe -i http://127.0.0.1:5000/empresa/slug-de-teste`.
2. Para dois slugs diferentes, verificar status 200, nome, description,
   canonical e Open Graph próprios; o HTML não pode conter dados ou `tenantId`
   de outro negócio.
3. Consultar um slug inválido/ausente. Esperar 404 real do Hosting, sem rewrite
   para Function e sem fallback SPA global.
4. Consultar `/empresa/slug-de-teste/agendar/produto-de-teste` e atualizar a
   página. Esperar shell estático 200, sem dados nem metadados específicos no
   HTML inicial, e depois comportamento do cliente.
5. Testar produto inexistente, falha/indisponibilidade e validação de dados de
   agendamento. Estados de erro devem ser acessíveis e distintos, sem dados de
   outro tenant; a autoridade de disponibilidade/criação continua no backend.
6. Examinar os logs dos emuladores e confirmar zero invocações de
   `renderStorefront` para raiz, catálogo e agendamento.

## Navegação SPA e dados

1. No browser, navegar catálogo → agendamento → catálogo e usar voltar/avançar.
   A URL deve acompanhar cada tela e nenhuma transição interna pode criar
   navegação de documento.
2. Abrir diretamente e atualizar um link profundo; ambos devem iniciar o shell
   e resolver dados via serviços existentes do cliente.
3. Com dados do produto e empresa já carregados no catálogo, abrir booking e
   verificar que não se repetem leituras equivalentes. Consultas existentes de
   dados complementares ainda necessários podem ocorrer uma vez.
4. Confirmar links externos (WhatsApp/e-mail) continuam com comportamento nativo.

## Atualização, retirada e desempenho

1. Alterar um dos documentos publicados, regenerar e confirmar nome/metadados
   novos no HTML; retirar o documento, regenerar e confirmar remoção do HTML.
   Repetir em build de teste completo para verificar remoção de arquivos órfãos.
2. Demonstrar que rollback para snapshot anterior pode republicar uma retirada;
   validar como procedimento seguro apenas roll-forward gerado da fonte atual.
3. Medir a arquitetura atual e a implementação nas mesmas condições de navegador,
   rede e dados. Registrar amostras e valores absolutos de LCP/TTFB e mediana/p75
   do tempo entre clique e tela de destino, separando cache frio e quente.
4. Aprovar somente se p75 de LCP móvel for no máximo 105% da linha de base,
   TTFB não piorar e p75 da transição SPA for estritamente inferior à linha de
   base. Não substituir medição por tamanho de bundle ou contagem de requests.

## Comandos de regressão

- `npm run test --workspace client`
- `npm run build --workspace client`
- Testes de Hosting Emulator para precedência de arquivos, rewrites, 404 e
  refresh. Nenhum comando de deploy de produção faz parte desta validação.
