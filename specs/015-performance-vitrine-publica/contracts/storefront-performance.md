# Contrato: Vitrine pública e performance

- `/empresa/{slug}` preserva identidade, catálogo e estados de erro do negócio
  correspondente; links e histórico de agendamento continuam funcionando.
- Imagens de usuários mantêm URL ou variante comprovadamente equivalente, texto
  alternativo e qualidade visual; conteúdo fora da primeira dobra pode ser
  carregado sob demanda.
- A imagem identificada como candidata a LCP não usa carregamento preguiçoso e
  recebe prioridade alta quando disponível; a estratégia não inventa URLs nem
  prioriza indiscriminadamente todas as imagens.
- A página mantém dimensões previsíveis durante o carregamento, fonte legível,
  navegação por teclado e suporte a telas móveis.
- Apenas recursos próprios comprovadamente versionados recebem cache imutável;
  conteúdo dinâmico e arquivos sem versão permanecem atualizáveis.
- Erros, autenticação, monitoramento e a instalação do PWA não são removidos ou
  tratados como sucesso quando falharem.
