# Produtos com variações de beleza — Especificação de design

**Data:** 2026-10-09  
**Status:** versão atualizada, aguardando revisão do usuário  
**Escopo:** catálogo, agendamento e seeds da loja Vitória Moura Beauty

## Objetivo

Organizar os serviços de Vitória Moura Beauty em quatro produtos agendáveis
com opções selecionáveis, em vez de cadastrar cada variação como um produto
separado. A escolha da opção deve atualizar a foto e o preço exibidos. O
servidor deve usar o preço da combinação selecionada para calcular comissão e
registrar o agendamento.

## Requisitos aprovados

- Loja: **Vitória Moura Beauty**.
- Slogan/descrição: **Brilhe através do Seu olhar**.
- Colaboradora: **Vitória Moura**.
- Os quatro produtos devem ser **Sobrancelhas**, **Cílios**, **Manutenção** e
  **Cílios + Sobrancelhas**.
- Cada produto abre uma tela de agendamento com suas opções. A troca de opção
  atualiza a imagem ilustrativa e o preço antes do agendamento.
- Os preços finais são cadastrados explicitamente por opção ou por combinação,
  editáveis no painel administrativo. O cliente não envia um preço confiável:
  o backend valida as seleções e resolve o preço.
- A primeira opção listada em cada atributo deve ser a opção padrão inicialmente
  selecionada.
- Durações fixas por produto: Sobrancelhas 60 min; Cílios 120 min; Manutenção
  60 min; combo 180 min.
- As fotos iniciais serão ilustrativas do Unsplash e poderão ser substituídas
  pelas galerias de imagens do painel.
- As 34 ofertas individuais introduzidas pelo seed anterior devem ser
  desativadas na reaplicação do seed; histórico não deve ser apagado.
- Não criar conta/login para a colaboradora sem e-mail e credenciais fornecidos.

## Catalogo

| Produto | Atributo(s) e opções (preço em R$) | Duração |
| --- | --- | ---: |
| Sobrancelhas | Design 25; Design + Henna 40; Design + Tintura 50; Brow Lamination 80 | 60 min |
| Cílios | Lash Lifting 100; Volume Express 90; Volume Brasileiro 120; Volume intermediário 120; Volume Inglês 140; Volume Fox 140 | 120 min |
| Manutenção | Volume Brasileiro 85; Volume intermediário 85; Volume Inglês 95; Volume Fox 100 | 60 min |
| Cílios + Sobrancelhas | Um atributo de sobrancelha e um atributo de cílios. Combina cada uma das quatro opções de sobrancelha com as cinco opções: Volume Express, Volume Brasileiro, Volume intermediário, Volume Inglês e Volume Fox. Lash Lifting não participa do combo. | 180 min |

O combo tem 20 precos finais explicitos:

| Opção de sobrancelha | Express | Brasileiro | Intermediário | Inglês | Fox |
| --- | ---: | ---: | ---: | ---: | ---: |
| Design | 115 | 145 | 145 | 165 | 165 |
| Design + Henna | 130 | 160 | 160 | 180 | 180 |
| Design + Tintura | 140 | 170 | 170 | 190 | 190 |
| Brow Lamination | 170 | 200 | 200 | 220 | 220 |

Exemplo: no combo, Design + Volume Express custa R$ 115. Os valores acima são
preços finais gravados por combinação, mesmo quando resultam da soma dos
serviços individuais.

## Modelo de dados e fluxo

1. **Preco por selecao:** introduzir um tipo compartilhado de preco de
   variacao, composto por uma lista completa de selecoes de atributos e um
   `priceCents` final. Produtos sem preco variavel continuam usando o
   `priceCents` atual. Quando a tabela estiver presente, deve conter exatamente
   uma entrada para cada combinacao valida, sem selecoes duplicadas ou
   incompletas.
2. **Produto e projecao publica:** persistir a tabela de precos no documento de
   produto e na projecao publica. A validacao do painel verifica inteiros nao
   negativos, opcoes existentes e cobertura completa das combinacoes.
3. **Painel:** ao editar um produto com preco por variacao, mostrar uma tabela
   de todas as combinacoes validas com um campo de preco final em reais. Manter
   os valores no carregamento e salvamento, permitindo edicao independente das
   galerias. Produtos sem tabela permanecem com preco fixo.
4. **Vitrine e reserva:** a selecao inicial usa as opcoes padrao. A tela resolve
   o preco para a selecao atual e atualiza o resumo. A reserva continua usando a
   duracao fixa do produto. O backend valida as selecoes, resolve o preco na
   tabela persistida, calcula comissao sobre esse preco e grava preco e
   comissao finais no snapshot imutavel do agendamento. Se uma tabela de
   variacoes existe mas nao contem a selecao, rejeitar a reserva; nao usar o
   preco base como fallback.
5. **Fotos:** reutilizar `product_image_galleries` e
   `public_product_galleries`. Criar uma galeria por selecao completa: 4 para
   Sobrancelhas, 6 para Cilios, 4 para Manutencao e 20 para o combo (34 ao
   todo), com imagens ilustrativas distintas do Unsplash. Com a galeria
   selecionada, o fluxo existente da reserva troca imagem; o painel permite
   substituir imagens.
6. **Seeds:** substituir os 34 produtos anteriores por quatro produtos
   estaveis e ativos, com precos, atributos, imagens, galerias e atribuicoes a
   Vitoria. Na reaplicacao em producao, emitir documentos de desativacao para
   cada ID antigo (`service-vitoria-brow-*`, `service-vitoria-lash-*`,
   `service-vitoria-maintenance-*` e `service-vitoria-combo-*`), tanto no
   catalogo interno como na projecao publica e atribuicoes, sem apagar
   agendamentos historicos.

## Responsabilidades de implementacao

- **Shared domain:** tipo de preco por variacao e resolucao deterministica do
  preco para uma lista de selecoes.
- **Functions:** validar e persistir a tabela em `saveProduct`; incluir a tabela
  na projecao publica; resolver o preco no servidor antes de calcular comissao
  e criar o agendamento.
- **Client:** exibir o preco da selecao corrente no resumo da reserva, sem
  alterar os servicos de duracao fixa nem a busca de disponibilidade.
- **Backoffice:** ler/escrever os precos por combinacao sem perde-los ao salvar;
  permitir editar o preco final de cada opcao/combinacao e continuar gerindo
  suas galerias.
- **Seed e testes:** criar os quatro produtos, 34 precos/opcoes e galerias;
  aposentar os IDs anteriores de forma compativel com o seed de producao.

## Validacao e testes

- Testes de seed verificam loja, profissional, os quatro produtos, 34 precos
  de variacao, precos de cada opcao, matriz completa do combo, duracoes,
  imagens e atribuicoes.
- Testes do painel verificam leitura e salvamento da tabela, edicao de preco,
  combinacoes incompletas/invalidas e preservacao das galerias.
- Testes da vitrine verificam que mudar uma opcao muda preco e imagem.
- Testes do backend verificam rejeicao de selecao invalida/sem preco e que
  agendamento, comissao e snapshot usam o preco final do servidor.
- Testes de disponibilidade confirmam que a duracao fixa de cada produto
  continua sendo usada.
- Build e testes direcionados dos workspaces afetados validam a mudanca.

## Fora do escopo

- Criar credenciais ou usuario de autenticacao para Vitoria.
- Alterar a duracao individualmente por variacao.
- Apagar documentos ou historico dos produtos antigos.
- Criar variacoes ou precos para outras lojas.

## Revisao de consistencia

- Os quatro produtos combinam com as quatro duracoes informadas.
- A matriz de combo tem 4 x 5 = 20 pares; exclui Lash Lifting, conforme a lista
  de opcoes enviada para combo.
- As opcoes unitarias totalizam 4 + 6 + 4; com os combos, sao 34 precos.
- O preco do cliente e o preco validado pelo backend tem uma unica fonte
  autoritativa: a tabela persistida de precos por selecao.
- As galerias de imagem usam a selecao completa, alinhada ao mecanismo de
  galeria ja existente.
- A desativacao dos produtos anteriores evita duplicacao apos uma reaplicacao
  de seed sem destruir historico.
