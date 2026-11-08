# Validação: Personalização de Cores do Cliente

Executar somente em ambiente local/emulador, com empresas de teste. Não executar
deploy, seed ou alterações em produção.

## Pré-requisitos

- Dependências do monorepo instaladas.
- Firestore/Auth Emulator configurados conforme o README e os arquivos locais de
  ambiente.
- Duas empresas sintéticas com slugs diferentes; uma terceira pode permanecer
  sem personalização.
- Emulador de Functions para testar a gravação no callable existente.

## Testes direcionados

Na raiz do repositório:

```powershell
npm run test --workspace backoffice -- src/pages/CompanySettingsPage.spec.tsx
npm run test:emulator
npm run test --workspace client -- scripts/public-business-snapshot.spec.ts src/entry-server.spec.tsx
```

Os testes devem cobrir:

- picker e campo hexadecimal sincronizados, prévia atualizada e estado de erro;
- aceitação/normalização de valores válidos e rejeição de valores inválidos no
  backend;
- gravação vinculada ao tenant autorizado e sincronização da projeção pública;
- leitura de cores válidas sem copiar campos privados ao snapshot;
- fallback por cor ausente e tema padrão para empresas antigas;
- SSR de duas empresas com cores independentes;
- contraste de texto e elementos interativos das superfícies personalizadas.

## Build e smoke test local

```powershell
npm run build --workspace backoffice
npm run build --workspace client
```

Usar somente credenciais sintéticas e o Firestore Emulator para o build do
client. Servir a saída localmente e verificar:

1. Empresa A mostra suas duas cores em catálogo e fluxo público.
2. Empresa B mostra apenas suas cores, sem contaminação por navegação ou SSR da
   empresa A.
3. Empresa sem cores mantém a identidade padrão atual.
4. A seleção de cores e a prévia permanecem utilizáveis em viewport de 320 px e
   em viewport desktop.
5. Nenhum HTML público serializa `tenantId` ou dados privados da empresa.
6. Depois de salvar cores no backoffice em ambiente de teste, a página estática
   as reflete após novo build local do client.

## Regressão e limites

- Executar os testes de catálogo, booking e páginas públicas existentes do client.
- Confirmar que os testes de configurações da empresa continuam aprovados junto
  com os testes de produtos e disponibilidade do backoffice pertinentes.
- Nenhum teste deve escrever em produção.
- O build/teste não deve ser seguido por comando de deploy nesta feature.
