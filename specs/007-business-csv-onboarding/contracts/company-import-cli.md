# Company CSV Import CLI Contract

## Command

```text
npm run import:company -- --project <project-id> --file <company.csv> --confirm-production-import
```

The root workspace command forwards arguments to the Functions workspace.
`--file` accepts only the CSV filename (no directory components); the command
resolves it under `functions/test/fixtures/templates/`.

## CSV

- UTF-8, semicolon-delimited, one record per line.
- First row contains unique column names, including `tipo`.
- Header: `tipo;id;nome;slug;segmento;descricao;telefone;email;senha_inicial;dominio_email;fuso;intervalo_agendamento;dias_semana;inicio;fim;produto_id;duracao_minutos;imagem_url;variacao;preco;nome_admin;email_admin;senha_admin`.
- Supported record types: `empresa`, `colaborador`, `produto`, `variacao`,
  `atributo`, `opcao`, and `preco_combinacao`.
- `variacao` remains the shorthand for a product with one attribute and priced
  options. For independent product attributes, `atributo` uses `id`, `nome`, and
  `produto_id`; `opcao` uses `id`, `nome`, `produto_id`, and `variacao` set to
  the attribute ID. The first option declared for an attribute is its default.
- `preco_combinacao` uses `produto_id`, `variacao`, and `preco`. Its `variacao`
  value lists one `atributo=opcao` pair per attribute, separated by `|`. An
  option ID of `*` expands that price row to every option of that attribute.
  Price rows must cover every possible combination exactly once; missing,
  invalid, or overlapping combinations reject the file before writes.
- A product cannot mix `variacao` rows with `atributo`/`opcao`/`preco_combinacao`
  rows.
- A company row uses `id` equal to its stable `slug`, so a duplicate slug collides
  on a create-only tenant document without a Firebase preflight read.
- Values cannot contain semicolons or line breaks. Such input is rejected.
- Extra empty columns after the last header or value are ignored to accommodate
  spreadsheet editors; empty columns within the header are invalid.
- Prices can be whole reais (`350`) or use a Brazilian decimal comma (`350,00`);
  the CSV delimiter remains semicolon.
- The Soft Stylus `Sofá + Poltronas` example uses seven independent attributes
  and wildcard price rows. The importer expands these to exact prices for all
  432 combinations, which the existing booking catalog consumes.
- Required secrets appear only in `senha_inicial` fields; the Soft Stylus
  template leaves these fields blank.
- Operational CSV files in `functions/test/fixtures/templates/` are ignored by
  Git; only `*.example.csv` templates are tracked.

## Execution behavior

- Requires a project ID, input path, and explicit production confirmation.
- Refuses `demo-*` project IDs and Firebase emulator environment variables.
- Uses local application-default credentials.
- Validates the complete file locally before any Auth or Firestore writes.
- Does not query Firebase for existing users, documents, or slugs.
- Creates Auth users and Firestore documents; it never uses merge/overwrite.
- On a duplicate or write failure, stops and reports the failed record type and
  identifier without exposing passwords.
- Attempts to remove only Auth users and Firestore documents created by the
  current invocation if a later step fails.
- Success output contains project ID and aggregate counts only.

## Data written

Creates tenant/public business, staff Auth users/claims and user documents,
professionals, products/public product projections, professional-product
assignments, and working hours. It does not write Storage files, appointments,
contacts, messages, orders, or payments.
