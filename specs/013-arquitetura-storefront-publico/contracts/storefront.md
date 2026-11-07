# Contrato: storefront Vite + React SSG

| Requisição / condição | Resposta | Verificação |
|---|---|---|
| `GET /`, build válido | 200, HTML estático neutro | Sem lista de empresas e sem Function |
| `GET /empresa/{slug}`, slug publicado | 200, HTML estático com conteúdo e metadados do slug | HTML bruto correto com JavaScript desligado; testar dois tenants |
| `GET /empresa/{slug}`, slug ausente/inválido | 404 estático do Hosting | Corpo de não encontrado; sem fallback global ou dados alheios |
| `GET /empresa/{slug}/agendar/{productId}` | 200, `booking-shell.html` estático genérico | Nenhuma invocação de Function; validar depois no cliente |
| Produto/empresa inválido em rota profunda | Shell 200; estado de não encontrado após carregar o app | Não prometer 404 HTTP ou metadados próprios na resposta inicial |
| Falha ao consultar dados no cliente | Shell já entregue; erro acessível e retry | Não representar falha como inexistência |
| Firestore indisponível durante build | Build falha e não promove os artefatos | Erro explícito sem PII, IDs internos ou tokens |
| Cadastro novo/alterado/retirado | Refletido no próximo build e deploy autorizado | Testar com Hosting Emulator; sem SLA de propagação |
| Navegação catálogo ↔ agendamento | History API, sem reload de documento | Voltar/avançar, URL compartilhável e reaproveitamento de cache |

## Metadados do catálogo SSG

Cada HTML de empresa inclui title, description, canonical, `og:title`,
`og:description`, `og:url` e imagem `og:image` quando houver URL pública segura.
Usar fallbacks públicos estáveis; escapar texto e atributos. O HTML da raiz mantém
metadados neutros. Rotas profundas não incluem metadados específicos.

## Hosting

Arquivos estáticos têm precedência. Remover rewrites de `/` e `/empresa/**` para
`renderStorefront`. Um rewrite limitado às rotas profundas de agendamento serve o
`booking-shell.html` vazio, não o `index.html` pré-renderizado da raiz; não
adicionar catch-all para rotas de catálogo,
pois isso converteria catálogo ausente em 200. Configurar HTML para revalidação e
assets versionados para cache imutável. Verificar precedência, status e refresh no
Hosting Emulator antes de qualquer deploy.

## Atualização e reversão

Cada build válido representa uma publicação completa da lista Firestore publicada.
Alterações cadastrais só são refletidas na próxima publicação; Hosting mantém uma
versão coerente. Rollback para snapshot anterior não é seguro depois de uma
retirada, pois pode republicar a página. O procedimento seguro é corrigir e
publicar um snapshot novo da fonte atual. Caches externos de prévias sociais não
são controláveis.
