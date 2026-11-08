# Implementation Plan: Personalização de Cores do Cliente

**Branch**: `014-personalizacao-cores` | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/014-personalizacao-cores/spec.md`

**Status**: Plano para revisão; implementação não iniciada.

## Summary

Permitir que a empresa ativa escolha cores primária e secundária no backoffice,
salvando-as nos documentos de empresa já existentes e projetando somente esses
valores públicos para as páginas do client. O plano estende o fluxo autorizado
`saveTenantSettings`, valida e normaliza cores hexadecimais, e aplica o tema em
escopo por empresa usando os tokens CSS existentes. Empresas sem personalização
mantêm o tema atual. Como o storefront é gerado estaticamente, a alteração salva
aparece no próximo ciclo já existente de build e publicação do client; nenhum
deploy faz parte desta feature.

## Technical Context

**Language/Version**: TypeScript 6, React 19 e Vite 8 nos workspaces existentes.

**Primary Dependencies**: Firebase existente, React, Tailwind CSS 4 e Vitest;
nenhuma dependência nova planejada.

**Storage**: Campos opcionais `primaryColor` e `secondaryColor` nos documentos
existentes `tenants` e `public_businesses`, atualizados pelo fluxo já existente.
Sem nova collection/subcollection, migração ou alteração de regras.

**Testing**: Vitest e Testing Library; testes de serviço do Functions usando o
emulador quando exigido pela configuração existente; builds de `backoffice` e
`client`.

**Target Platform**: Backoffice web autenticado e páginas públicas web do client,
incluindo HTML gerado pelo processo estático existente, em mobile e desktop.

**Project Type**: Monorepo web com workspaces separados para `backoffice`,
`client`, `functions` e `shared/domain`.

**Performance Goals**: Nenhuma consulta adicional durante navegação pública;
resolução de cores local a partir da configuração já entregue à página.

**Constraints**: Manter autorização e tenant derivados do ator autenticado no
backend. Publicar somente cores validadas na projeção pública. Não alterar
agendamento, catálogo, regras Firestore, collections ou workspaces não
autorizados. Alterações salvas refletem-se no storefront estático após o próximo
ciclo existente de build/publicação. Não executar deploy.

**Scale/Scope**: Duas cores por empresa, usadas nas páginas públicas existentes;
mudanças restritas a `backoffice`, `client`, `functions` pelo callable existente
e `shared/domain` para tipos/validação compartilhados.

## Constitution Check

**Gate pré-design: PASS.** O escopo e as fronteiras abaixo cumprem a constituição:

| Princípio | Verificação |
|---|---|
| I — fluxo e domínio | Mantém cada página associada ao slug e à empresa atual; não cria diretório ou fallback entre empresas. |
| II — agendamento | Nenhuma regra, disponibilidade, reserva ou transição de agendamento será alterada. |
| III — segurança e autorização | O callable mantém o tenant derivado do ator autorizado; valida entradas e expõe somente cores públicas na projeção. |
| IV — finanças | Preços, comissões, relatórios e exportações não são alterados. |
| V — testabilidade e qualidade | Cobertura focada para validação, salvamento, contraste, fallback, SSR e isolamento, além dos testes de regressão. |
| VI — fronteiras de aplicação | UI de configuração no backoffice, apresentação no client, gravação no fluxo existente de Functions e regras/tipos puros em `shared/domain`. |
| VII — UX e acessibilidade | Controles rotulados e operáveis por teclado, estados de erro/sucesso, contraste especificado e layouts mobile/desktop. |
| VIII — simplicidade | Reutiliza callable, documentos, tokens CSS, SSR/SSG e ferramentas de teste existentes; sem serviço ou dependência nova. |

**Gate pós-design: PASS condicionado à revisão do plano.** A autorização do
usuário permite somente campos opcionais nos documentos existentes. Não há
violação constitucional enquanto a implementação preservar essa fronteira e as
verificações de tenant atuais. A extensão de `saveTenantSettings` é necessária
para gravar os novos valores mantendo a autorização server-side já existente.

## Project Structure

### Documentation (this feature)

```text
specs/014-personalizacao-cores/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── company-theme.md
└── checklists/
    └── requirements.md
```

`tasks.md` será criado somente pela etapa `/speckit-tasks`, após aprovação deste
plano.

### Source Code

```text
shared/domain/
├── color.ts                                      # validação/normalização pura de cores
└── interfaces/tenant.interface.ts                # campos opcionais da empresa/projeção pública

functions/src/
├── model/tenant.model.ts                         # campos dos documentos existentes
├── services/backoffice.service.ts                # validação e escrita transacional existente
└── functions/backoffice/manage-company.spec.ts   # cobertura do callable existente

backoffice/src/
├── interfaces/admin.interface.ts                 # dados/configuração da empresa
├── interfaces/company.interface.ts               # payload existente de configurações
└── pages/
    ├── CompanySettingsPage.tsx                    # seletor, hexadecimal, prévia e salvamento
    └── CompanySettingsPage.spec.tsx               # interação, fallback e erros

client/
├── scripts/
│   ├── public-business-snapshot.ts                # projeção pública validada
│   └── public-business-snapshot.spec.ts
└── src/
    ├── app/                                       # tema isolado por empresa em SSR e navegação
    ├── interfaces/company.interface.ts            # cores da projeção pública
    ├── styles/theme.css                           # consumo dos tokens existentes
    └── entry-server.spec.tsx                      # SSR, fallback e isolamento
```

**Structure Decision**: Manter a separação atual do monorepo. O helper de cor em
`shared/domain` será puro, sem dependência de UI, e reutilizado onde for
necessário para que parsing e normalização não se desviem entre backoffice,
backend e client. Nenhum arquivo de `collaborator`, regras Firestore ou
configuração de deploy precisa ser alterado.

## Complexity Tracking

Não há violações constitucionais ou abstrações adicionais a justificar.

## Phase 0 — Research

Não há escolhas de tecnologia ou perguntas pendentes que exijam pesquisa
externa. A pesquisa foi feita sobre a arquitetura e o código existente; as
decisões verificadas estão registradas em [research.md](research.md).

## Phase 1 — Design

- [Modelo de dados](data-model.md): campos opcionais e projeção pública mínima,
  validação hex e compatibilidade com registros existentes.
- [Contrato interno](contracts/company-theme.md): extensão do payload do callable
  existente e dos dados públicos, sem novo endpoint.
- [Guia de validação](quickstart.md): testes direcionados, builds e verificação
  local com emulador, sem publicação em produção.

## Implementation Gate

A revisão deste plano é obrigatória antes de `/speckit-tasks` e da
implementação. Após aprovação, as tarefas devem incluir testes antes das
alterações de comportamento e cobrir, no mínimo, salvamento por tenant, cores
malformadas, fallback, contraste, SSR de duas empresas, atualização após build
e regressão dos fluxos existentes. Nenhum comando de deploy ou alteração em
produção é permitido nesta execução.
