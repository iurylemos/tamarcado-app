import { describe, expect, it } from 'vitest';
import { MAX_IMPORT_RECORDS, parseCompanyCsv } from './company-import-csv';

const headers = [
  'tipo',
  'id',
  'nome',
  'slug',
  'segmento',
  'descricao',
  'telefone',
  'email',
  'senha_inicial',
  'dominio_email',
  'fuso',
  'intervalo_agendamento',
  'dias_semana',
  'inicio',
  'fim',
  'produto_id',
  'duracao_minutos',
  'imagem_url',
  'variacao',
  'preco',
  'nome_admin',
  'email_admin',
  'senha_admin',
] as const;

function row(values: Partial<Record<(typeof headers)[number], string>>): string {
  return headers.map((header) => values[header] ?? '').join(';');
}

function company(overrides: Partial<Record<(typeof headers)[number], string>> = {}): string {
  return row({
    tipo: 'empresa',
    id: 'soft-stylus',
    nome: 'Soft Stylus',
    slug: 'soft-stylus',
    segmento: 'home',
    dominio_email: 'softstylus.com',
    fuso: 'America/Fortaleza',
    intervalo_agendamento: '30',
    dias_semana: '1,2,3,4,5,6',
    inicio: '09:00',
    fim: '18:00',
    nome_admin: 'Gestor Soft Stylus',
    email_admin: 'admin@softstylus.com',
    senha_admin: 'initial-password',
    ...overrides,
  });
}

function staff(overrides: Partial<Record<(typeof headers)[number], string>> = {}): string {
  return row({
    tipo: 'colaborador',
    id: 'italo',
    nome: 'Italo',
    telefone: '(85) 99999-0000',
    email: 'italo@softstylus.com',
    senha_inicial: 'staff-password',
    ...overrides,
  });
}

function product(overrides: Partial<Record<(typeof headers)[number], string>> = {}): string {
  return row({
    tipo: 'produto',
    id: 'cabec',
    nome: 'Cabeceira',
    duracao_minutos: '30',
    imagem_url: 'https://example.com/cabec.jpg',
    ...overrides,
  });
}

function variant(name: string, price: string, productId = 'cabec'): string {
  return row({ tipo: 'variacao', produto_id: productId, variacao: name, preco: price });
}

function attribute(id: string, label: string, productId = 'cabec'): string {
  return row({ tipo: 'atributo', id, nome: label, produto_id: productId });
}

function option(id: string, label: string, attributeId: string, productId = 'cabec'): string {
  return row({ tipo: 'opcao', id, nome: label, produto_id: productId, variacao: attributeId });
}

function combination(productId: string, selections: string, price: string): string {
  return row({
    tipo: 'preco_combinacao',
    produto_id: productId,
    variacao: selections,
    preco: price,
  });
}

function csv(...records: string[]): string {
  return [headers.join(';'), ...records].join('\n');
}

describe('parseCompanyCsv', () => {
  it('removes a UTF-8 BOM and parses semicolon-delimited rows', () => {
    const result = parseCompanyCsv(
      `\uFEFF${csv(company(), staff(), product(), variant('Solteiro', '350,00'), variant('Casal', '450,00'))}`,
    );

    expect(result.company.segment).toBe('home');
    expect(result.company.adminEmail).toBe('admin@softstylus.com');
    expect(result.staff[0]?.phoneE164).toBe('+5585999990000');
    expect(result.products[0]?.variants.map(({ priceCents }) => priceCents)).toEqual([
      35000, 45000,
    ]);
  });

  it('imports independent eyebrow and lash options with exact prices per combination', () => {
    const parsed = parseCompanyCsv(
      csv(
        company({
          id: 'vitoria-moura-beauty',
          nome: 'Vitória Moura Beauty',
          slug: 'vitoria-moura-beauty',
          segmento: 'beauty',
          dominio_email: 'vitoriamourabeauty.test',
          email_admin: 'admin@vitoriamourabeauty.test',
        }),
        product({ id: 'combo-vitoria', nome: 'Cílios + Sobrancelhas' }),
        attribute('brow-service', 'Sobrancelhas', 'combo-vitoria'),
        attribute('lash-service', 'Cílios', 'combo-vitoria'),
        option('design', 'Design', 'brow-service', 'combo-vitoria'),
        option('design-henna', 'Design + Henna', 'brow-service', 'combo-vitoria'),
        option('volume-express', 'Volume Express', 'lash-service', 'combo-vitoria'),
        option('volume-brasileiro', 'Volume Brasileiro', 'lash-service', 'combo-vitoria'),
        combination('combo-vitoria', 'brow-service=design|lash-service=volume-express', '115,00'),
        combination(
          'combo-vitoria',
          'brow-service=design|lash-service=volume-brasileiro',
          '145,00',
        ),
        combination(
          'combo-vitoria',
          'brow-service=design-henna|lash-service=volume-express',
          '130,00',
        ),
        combination(
          'combo-vitoria',
          'brow-service=design-henna|lash-service=volume-brasileiro',
          '160,00',
        ),
      ),
    );

    expect(parsed.products[0]).toMatchObject({
      customizationAttributes: [
        {
          id: 'brow-service',
          label: 'Sobrancelhas',
          defaultOptionId: 'design',
          options: [
            { id: 'design', label: 'Design' },
            { id: 'design-henna', label: 'Design + Henna' },
          ],
        },
        {
          id: 'lash-service',
          label: 'Cílios',
          defaultOptionId: 'volume-express',
          options: [
            { id: 'volume-express', label: 'Volume Express' },
            { id: 'volume-brasileiro', label: 'Volume Brasileiro' },
          ],
        },
      ],
      variantPrices: [
        {
          selections: [
            { attributeId: 'brow-service', optionId: 'design' },
            { attributeId: 'lash-service', optionId: 'volume-express' },
          ],
          priceCents: 11500,
        },
        {
          selections: [
            { attributeId: 'brow-service', optionId: 'design' },
            { attributeId: 'lash-service', optionId: 'volume-brasileiro' },
          ],
          priceCents: 14500,
        },
        {
          selections: [
            { attributeId: 'brow-service', optionId: 'design-henna' },
            { attributeId: 'lash-service', optionId: 'volume-express' },
          ],
          priceCents: 13000,
        },
        {
          selections: [
            { attributeId: 'brow-service', optionId: 'design-henna' },
            { attributeId: 'lash-service', optionId: 'volume-brasileiro' },
          ],
          priceCents: 16000,
        },
      ],
    });
  });

  it('expands wildcard price rows and rejects overlapping price groups', () => {
    const records = [
      company(),
      product(),
      attribute('size', 'Tamanho'),
      attribute('color', 'Cor'),
      option('small', 'Pequeno', 'size'),
      option('large', 'Grande', 'size'),
      option('black', 'Preto', 'color'),
      option('white', 'Branco', 'color'),
      combination('cabec', 'size=*|color=black', '10,00'),
      combination('cabec', 'size=*|color=white', '20,00'),
    ];
    const parsed = parseCompanyCsv(csv(...records));
    expect(parsed.products[0]?.variantPrices).toEqual([
      {
        selections: [
          { attributeId: 'size', optionId: 'small' },
          { attributeId: 'color', optionId: 'black' },
        ],
        priceCents: 1000,
      },
      {
        selections: [
          { attributeId: 'size', optionId: 'large' },
          { attributeId: 'color', optionId: 'black' },
        ],
        priceCents: 1000,
      },
      {
        selections: [
          { attributeId: 'size', optionId: 'small' },
          { attributeId: 'color', optionId: 'white' },
        ],
        priceCents: 2000,
      },
      {
        selections: [
          { attributeId: 'size', optionId: 'large' },
          { attributeId: 'color', optionId: 'white' },
        ],
        priceCents: 2000,
      },
    ]);
    expect(() =>
      parseCompanyCsv(csv(...records, combination('cabec', 'size=small|color=black', '30,00'))),
    ).toThrow(/preço duplicado/i);
  });

  it('rejects incomplete, duplicate, or invalid combination prices before import', () => {
    const rows = [
      company(),
      product(),
      attribute('size', 'Tamanho'),
      attribute('color', 'Cor'),
      option('small', 'Pequeno', 'size'),
      option('large', 'Grande', 'size'),
      option('black', 'Preto', 'color'),
      option('white', 'Branco', 'color'),
    ];
    const prices = [
      combination('cabec', 'size=small|color=black', '10,00'),
      combination('cabec', 'size=small|color=white', '11,00'),
      combination('cabec', 'size=large|color=black', '12,00'),
      combination('cabec', 'size=large|color=white', '13,00'),
    ];

    expect(() => parseCompanyCsv(csv(...rows, ...prices.slice(0, 3)))).toThrow(
      /preço para cada.*4 combinações/i,
    );
    expect(() =>
      parseCompanyCsv(
        csv(...rows, ...prices, combination('cabec', 'size=small|color=black', '14,00')),
      ),
    ).toThrow(/preço duplicado/i);
    expect(() =>
      parseCompanyCsv(
        csv(...rows, combination('cabec', 'size=small|color=missing', '10,00'), ...prices.slice(1)),
      ),
    ).toThrow(/opção.*não existe/i);
  });

  it('reports duplicate, missing, unsupported, and malformed headers', () => {
    const valid = csv(company(), product(), variant('A', '1,00'), variant('B', '2,00'));
    const lines = valid.split('\n');
    const head = lines[0]!;
    const body = lines.slice(1);

    expect(() => parseCompanyCsv(`${head};tipo\n${body.join('\n')}`)).toThrow(/linha 1.*tipo/i);
    expect(() => parseCompanyCsv(`${head.replace(';slug', '')}\n${body.join('\n')}`)).toThrow(
      /slug/i,
    );
    expect(() => parseCompanyCsv(`${head};campo_extra\n${body.join('\n')}`)).toThrow(
      /campo_extra/i,
    );
    expect(() => parseCompanyCsv(`${head};"quebrado"\n${body.join('\n')}`)).toThrow(/aspas/i);
  });

  it('ignores only trailing empty columns added by spreadsheet editors', () => {
    const source = csv(company(), product(), variant('A', '350'), variant('B', '450'));
    const editedBySpreadsheet = source
      .split('\n')
      .map((line) => `${line};;;;`)
      .join('\n');

    const result = parseCompanyCsv(editedBySpreadsheet);
    expect(result.products[0]?.variants.map(({ priceCents }) => priceCents)).toEqual([
      35000, 45000,
    ]);
    expect(() => parseCompanyCsv(`${headers.join(';')};;;;\n${company()};unexpected`)).toThrow(
      /colunas/i,
    );
    expect(() =>
      parseCompanyCsv(
        `${headers.slice(0, 4).join(';')};;${headers.slice(4).join(';')}\n${company()}`,
      ),
    ).toThrow(/coluna sem nome/i);
  });

  it('rejects rows with a different number of columns and values with quotes', () => {
    expect(() => parseCompanyCsv(`${headers.join(';')}\n${company()};extra`)).toThrow(
      /linha 2.*colunas/i,
    );
    expect(() =>
      parseCompanyCsv(
        csv(
          company({ nome: 'Soft "Stylus"' }),
          product(),
          variant('A', '1,00'),
          variant('B', '2,00'),
        ),
      ),
    ).toThrow(/aspas/i);
  });

  it('requires exactly one company and valid administrator fields', () => {
    expect(() => parseCompanyCsv(csv())).toThrow(/empresa/i);
    expect(() => parseCompanyCsv(csv(company(), company({ id: 'other', slug: 'other' })))).toThrow(
      /uma empresa/i,
    );
    expect(() => parseCompanyCsv(csv(company({ id: 'different-id' })))).toThrow(/igual ao slug/i);
    expect(() => parseCompanyCsv(csv(company({ email_admin: '' })))).toThrow(/email_admin/i);
    expect(() => parseCompanyCsv(csv(company({ senha_admin: '' })))).toThrow(/senha_admin/i);
  });

  it('validates staff identifiers, phone, email domain, and initial passwords', () => {
    const validTail = [product(), variant('A', '1,00'), variant('B', '2,00')];
    for (const invalid of [
      staff({ id: '' }),
      staff({ telefone: '' }),
      staff({ telefone: '123' }),
      staff({ email: '' }),
      staff({ email: 'italo@outside.com' }),
      staff({ senha_inicial: 'short' }),
    ]) {
      expect(() => parseCompanyCsv(csv(company(), invalid, ...validTail))).toThrow(/linha 3/i);
    }
  });

  it('rejects duplicate account emails and record identifiers', () => {
    expect(() =>
      parseCompanyCsv(
        csv(
          company(),
          staff(),
          staff({ id: 'another', email: 'ITALO@SOFTSTYLUS.COM' }),
          product(),
          variant('A', '1,00'),
          variant('B', '2,00'),
        ),
      ),
    ).toThrow(/email.*duplicado/i);
    expect(() =>
      parseCompanyCsv(
        csv(
          company(),
          staff({ id: 'soft-stylus' }),
          product(),
          variant('A', '1,00'),
          variant('B', '2,00'),
        ),
      ),
    ).toThrow(/identificador.*duplicado/i);
  });

  it('validates company timezone, schedule, and booking interval', () => {
    for (const changes of [
      { fuso: 'Mars/Olympus' },
      { dias_semana: '1,1' },
      { dias_semana: '1,8' },
      { inicio: '18:00', fim: '09:00' },
      { inicio: '9:00' },
      { intervalo_agendamento: '7' },
    ]) {
      expect(() =>
        parseCompanyCsv(
          csv(company(changes), product(), variant('A', '1,00'), variant('B', '2,00')),
        ),
      ).toThrow(/linha 2/i);
    }
  });

  it('converts whole-real and Brazilian decimal prices to exact cents and rejects invalid prices', () => {
    const result = parseCompanyCsv(
      csv(company(), product(), variant('A', '350,01'), variant('B', '0,1')),
    );
    expect(result.products[0]?.variants.map(({ priceCents }) => priceCents)).toEqual([35001, 10]);

    const wholeRealResult = parseCompanyCsv(
      csv(company(), product(), variant('A', '350'), variant('B', '450')),
    );
    expect(wholeRealResult.products[0]?.variants.map(({ priceCents }) => priceCents)).toEqual([
      35000, 45000,
    ]);

    for (const price of ['350.01', '0,001', '-1,00', '1,00x']) {
      expect(() =>
        parseCompanyCsv(csv(company(), product(), variant('A', price), variant('B', '2,00'))),
      ).toThrow(/preco/i);
    }
  });

  it('preserves password characters while validating the minimum policy', () => {
    const source = csv(
      company({ senha_admin: ' admin-secret ' }),
      staff({ senha_inicial: ' staff-secret ' }),
    );
    const parsed = parseCompanyCsv(source);
    expect(parsed.company.adminPassword).toBe(' admin-secret ');
    expect(parsed.staff[0]?.password).toBe(' staff-secret ');
  });

  it('rejects dangling products, duplicate variants, and products with fewer than two variants', () => {
    expect(() =>
      parseCompanyCsv(csv(company(), product(), variant('A', '1,00'), variant('A', '2,00'))),
    ).toThrow(/variacao.*duplicada/i);
    expect(() => parseCompanyCsv(csv(company(), product(), variant('A', '1,00')))).toThrow(
      /ao menos duas/i,
    );
    expect(() =>
      parseCompanyCsv(
        csv(company(), product(), variant('A', '1,00', 'missing'), variant('B', '2,00')),
      ),
    ).toThrow(/produto.*existe/i);
  });

  it('rejects malformed product data and enforces the record limit', () => {
    expect(() =>
      parseCompanyCsv(
        csv(
          company(),
          product({ imagem_url: 'javascript:alert(1)' }),
          variant('A', '1,00'),
          variant('B', '2,00'),
        ),
      ),
    ).toThrow(/imagem_url/i);
    const records = [
      company(),
      ...Array.from({ length: MAX_IMPORT_RECORDS }, (_, index) =>
        staff({ id: `staff-${index}`, email: `staff${index}@softstylus.com` }),
      ),
    ];
    expect(() => parseCompanyCsv(csv(...records))).toThrow(/limite/i);
  });
});
