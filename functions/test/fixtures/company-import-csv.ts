import type { BusinessSegment } from '../../../shared/domain/interfaces/tenant.interface';
import type {
  ProductCustomizationAttribute,
  ProductCustomizationSelection,
  ProductVariantPrice,
} from '../../../shared/domain/interfaces/product.interface';
import { normalizeBrazilianPhone } from '../../../shared/domain/phone';

export const MAX_IMPORT_RECORDS = 500;

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

type CsvHeader = (typeof headers)[number];
type CsvRecordType =
  'empresa' | 'colaborador' | 'produto' | 'variacao' | 'atributo' | 'opcao' | 'preco_combinacao';
type CsvRow = { line: number; values: Record<CsvHeader, string> };

export interface CompanyImportStaff {
  id: string;
  name: string;
  phoneE164: string;
  email: string;
  password: string;
}

export interface CompanyImportVariant {
  id: string;
  name: string;
  priceCents: number;
}

export interface CompanyImportProduct {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  durationMinutes: number;
  variants: CompanyImportVariant[];
  customizationAttributes?: ProductCustomizationAttribute[];
  variantPrices?: ProductVariantPrice[];
}

export interface CompanyImportData {
  company: {
    id: string;
    name: string;
    slug: string;
    segment: BusinessSegment;
    description?: string;
    phoneE164?: string;
    emailDomain: string;
    timezone: string;
    bookingIntervalMinutes: number;
    daysOfWeek: number[];
    startLocalTime: string;
    endLocalTime: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
  };
  staff: CompanyImportStaff[];
  products: CompanyImportProduct[];
}

function invalid(line: number, field: string, reason: string): never {
  throw new Error(`Linha ${line}, campo "${field}": ${reason}`);
}

function required(row: CsvRow, field: CsvHeader, label = field): string {
  const value = row.values[field].trim();
  if (!value) invalid(row.line, label, 'campo obrigatório.');
  return value;
}

function optional(row: CsvRow, field: CsvHeader): string | undefined {
  return row.values[field].trim() || undefined;
}

function validId(value: string, row: CsvRow): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(value)) {
    invalid(row.line, 'id', 'use de 1 a 120 letras, números, hífens ou sublinhados.');
  }
  return value;
}

function validEmail(value: string, row: CsvRow, field: CsvHeader): string {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    invalid(row.line, field, 'informe um e-mail válido.');
  }
  return email;
}

function validPassword(value: string, row: CsvRow, field: CsvHeader): string {
  if (value.length < 8 || value.length > 128) {
    invalid(row.line, field, 'a senha deve ter de 8 a 128 caracteres.');
  }
  return value;
}

function requiredPassword(row: CsvRow, field: CsvHeader): string {
  const value = row.values[field];
  if (!value.trim()) invalid(row.line, field, 'campo obrigatório.');
  return validPassword(value, row, field);
}

function integer(
  value: string,
  row: CsvRow,
  field: CsvHeader,
  minimum: number,
  maximum: number,
): number {
  if (!/^\d+$/.test(value)) invalid(row.line, field, 'informe um número inteiro válido.');
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    invalid(row.line, field, `informe um número inteiro entre ${minimum} e ${maximum}.`);
  }
  return parsed;
}

function validUrl(value: string, row: CsvRow): string {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('invalid protocol');
  } catch {
    invalid(row.line, 'imagem_url', 'informe uma URL HTTP ou HTTPS válida.');
  }
  return value;
}

function parsePrice(value: string, row: CsvRow): number {
  const match = /^(\d+)(?:,(\d{1,2}))?$/.exec(value);
  if (!match)
    invalid(
      row.line,
      'preco',
      'use reais inteiros, como 350, ou até duas casas decimais, como 350,00.',
    );
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0') || '0');
  if (!Number.isSafeInteger(cents) || cents <= 0) {
    invalid(row.line, 'preco', 'o preço deve ser positivo e válido em centavos.');
  }
  return cents;
}

function parseCsvRows(source: string): CsvRow[] {
  const normalized = source.replace(/^\uFEFF/, '');
  const lines = normalized.split(/\r?\n/);
  while (lines.length > 0 && lines[lines.length - 1]?.trim() === '') lines.pop();
  if (lines.length < 1 || !lines[0]?.trim())
    throw new Error('O CSV deve conter o cabeçalho obrigatório.');
  const bareCarriageReturn = lines.findIndex((line) => line.includes('\r'));
  if (bareCarriageReturn >= 0)
    invalid(bareCarriageReturn + 1, 'CSV', 'quebras de linha dentro de campos não são suportadas.');
  if (lines.some((line) => line.includes('"'))) {
    const line = lines.findIndex((item) => item.includes('"')) + 1;
    invalid(line, 'CSV', 'aspas não são suportadas; use valores sem aspas ou quebras de linha.');
  }

  const actualHeaders = lines[0]!.split(';').map((header) => header.trim());
  while (actualHeaders.length > 0 && actualHeaders[actualHeaders.length - 1] === '') {
    actualHeaders.pop();
  }
  if (actualHeaders.some((header) => !header)) {
    invalid(1, 'cabeçalho', 'há uma coluna sem nome entre os cabeçalhos.');
  }
  const seenHeaders = new Set<string>();
  for (const header of actualHeaders) {
    if (seenHeaders.has(header)) invalid(1, header || 'cabeçalho', 'cabeçalho duplicado.');
    seenHeaders.add(header);
  }
  for (const header of headers) {
    if (!seenHeaders.has(header)) invalid(1, header, 'cabeçalho obrigatório ausente.');
  }
  const unexpected = actualHeaders.find((header) => !headers.includes(header as CsvHeader));
  if (unexpected) invalid(1, unexpected, 'cabeçalho não reconhecido.');

  const dataLines = lines.slice(1).filter((line) => line.trim() !== '');
  if (dataLines.length > MAX_IMPORT_RECORDS) {
    throw new Error(`O CSV excede o limite de ${MAX_IMPORT_RECORDS} registros.`);
  }

  return dataLines.map((line, index) => {
    const values = line.split(';');
    const lineNumber = index + 2;
    while (values.length > headers.length && values[values.length - 1]?.trim() === '') {
      values.pop();
    }
    if (values.length !== headers.length) {
      invalid(lineNumber, 'CSV', `quantidade de colunas inválida (esperado ${headers.length}).`);
    }
    const rowValues = Object.fromEntries(
      headers.map((header, offset) => [header, values[offset] ?? '']),
    ) as Record<CsvHeader, string>;
    return { line: lineNumber, values: rowValues };
  });
}

function parseCompany(row: CsvRow): CompanyImportData['company'] {
  const id = validId(required(row, 'id'), row);
  const name = required(row, 'nome');
  if (name.length > 100) invalid(row.line, 'nome', 'use até 100 caracteres.');
  const slug = required(row, 'slug').toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
    invalid(row.line, 'slug', 'use até 80 letras minúsculas, números e hífens.');
  }
  if (id !== slug) invalid(row.line, 'id', 'o identificador da empresa deve ser igual ao slug.');
  const segment = required(row, 'segmento');
  if (!['beauty', 'health', 'fitness', 'automotive', 'other', 'home'].includes(segment)) {
    invalid(row.line, 'segmento', 'segmento não reconhecido.');
  }
  const description = optional(row, 'descricao');
  if (description && description.length > 1000)
    invalid(row.line, 'descricao', 'use até 1000 caracteres.');

  const phone = optional(row, 'telefone');
  const phoneE164 = phone ? normalizeBrazilianPhone(phone) : undefined;
  if (phone && !phoneE164)
    invalid(row.line, 'telefone', 'informe um telefone brasileiro válido com DDD.');

  const emailDomain = required(row, 'dominio_email').toLowerCase().replace(/^@/, '');
  if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(emailDomain)) {
    invalid(row.line, 'dominio_email', 'informe um domínio de e-mail válido.');
  }
  const timezone = required(row, 'fuso');
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone: timezone });
  } catch {
    invalid(row.line, 'fuso', 'informe um fuso horário IANA válido.');
  }

  const bookingIntervalMinutes = integer(
    required(row, 'intervalo_agendamento'),
    row,
    'intervalo_agendamento',
    5,
    120,
  );
  if (bookingIntervalMinutes % 5 !== 0) {
    invalid(row.line, 'intervalo_agendamento', 'o intervalo deve ser múltiplo de 5 minutos.');
  }

  const daysText = required(row, 'dias_semana');
  const daysOfWeek = daysText.split(',').map((day) => {
    if (!/^[0-6]$/.test(day))
      invalid(row.line, 'dias_semana', 'use dias únicos de 0 (domingo) a 6 (sábado).');
    return Number(day);
  });
  if (new Set(daysOfWeek).size !== daysOfWeek.length) {
    invalid(row.line, 'dias_semana', 'não repita dias da semana.');
  }
  const startLocalTime = required(row, 'inicio');
  const endLocalTime = required(row, 'fim');
  const validTime = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!validTime.test(startLocalTime)) invalid(row.line, 'inicio', 'use o formato HH:mm.');
  if (!validTime.test(endLocalTime)) invalid(row.line, 'fim', 'use o formato HH:mm.');
  if (startLocalTime >= endLocalTime) {
    invalid(row.line, 'fim', 'o horário final deve ser posterior ao inicial.');
  }
  const adminName = required(row, 'nome_admin');
  if (adminName.length > 100) invalid(row.line, 'nome_admin', 'use até 100 caracteres.');

  return {
    id,
    name,
    slug,
    segment: segment as BusinessSegment,
    ...(description ? { description } : {}),
    ...(phoneE164 ? { phoneE164 } : {}),
    emailDomain,
    timezone,
    bookingIntervalMinutes,
    daysOfWeek,
    startLocalTime,
    endLocalTime,
    adminName,
    adminEmail: validEmail(required(row, 'email_admin'), row, 'email_admin'),
    adminPassword: requiredPassword(row, 'senha_admin'),
  };
}

export function parseCompanyCsv(source: string): CompanyImportData {
  const rows = parseCsvRows(source);
  const records = new Map<CsvRecordType, CsvRow[]>();
  for (const row of rows) {
    const type = required(row, 'tipo');
    if (
      ![
        'empresa',
        'colaborador',
        'produto',
        'variacao',
        'atributo',
        'opcao',
        'preco_combinacao',
      ].includes(type)
    ) {
      invalid(
        row.line,
        'tipo',
        'use empresa, colaborador, produto, variacao, atributo, opcao ou preco_combinacao.',
      );
    }
    const key = type as CsvRecordType;
    records.set(key, [...(records.get(key) ?? []), row]);
  }

  const companyRows = records.get('empresa') ?? [];
  if (companyRows.length !== 1) {
    throw new Error('O CSV deve conter exatamente uma empresa.');
  }
  const company = parseCompany(companyRows[0]!);
  const usedIds = new Set<string>([company.id]);
  const emails = new Set<string>([company.adminEmail]);

  const staff = (records.get('colaborador') ?? []).map((row) => {
    const id = validId(required(row, 'id'), row);
    if (usedIds.has(id)) invalid(row.line, 'id', 'identificador duplicado.');
    usedIds.add(id);

    const name = required(row, 'nome');
    if (name.length > 100) invalid(row.line, 'nome', 'use até 100 caracteres.');
    const phoneText = required(row, 'telefone');
    const phoneE164 = normalizeBrazilianPhone(phoneText);
    if (!phoneE164) invalid(row.line, 'telefone', 'informe um telefone brasileiro válido com DDD.');
    const email = validEmail(required(row, 'email'), row, 'email');
    if (email.split('@')[1] !== company.emailDomain) {
      invalid(row.line, 'email', `o e-mail deve pertencer ao domínio ${company.emailDomain}.`);
    }
    if (emails.has(email)) invalid(row.line, 'email', 'e-mail duplicado no arquivo.');
    emails.add(email);
    return {
      id,
      name,
      phoneE164,
      email,
      password: requiredPassword(row, 'senha_inicial'),
    };
  });

  const products: CompanyImportProduct[] = (records.get('produto') ?? []).map((row) => {
    const id = validId(required(row, 'id'), row);
    if (usedIds.has(id)) invalid(row.line, 'id', 'identificador duplicado.');
    usedIds.add(id);
    const name = required(row, 'nome');
    if (name.length > 100) invalid(row.line, 'nome', 'use até 100 caracteres.');
    const description = optional(row, 'descricao');
    const imageUrl = validUrl(required(row, 'imagem_url'), row);
    const durationMinutes = integer(
      required(row, 'duracao_minutos'),
      row,
      'duracao_minutos',
      1,
      1440,
    );
    return {
      id,
      name,
      ...(description ? { description } : {}),
      imageUrl,
      durationMinutes,
      variants: [] as CompanyImportVariant[],
    };
  });
  const productsById = new Map(products.map((product) => [product.id, product]));
  const variantLines = records.get('variacao') ?? [];

  for (const row of variantLines) {
    const productId = required(row, 'produto_id');
    const product = productsById.get(productId);
    if (!product) invalid(row.line, 'produto_id', `o produto "${productId}" não existe.`);
    const name = required(row, 'variacao');
    if (
      product.variants.some(
        (variant) => variant.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'),
      )
    ) {
      invalid(row.line, 'variacao', 'variação duplicada para este produto.');
    }
    const id = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    if (!id || product.variants.some((variant) => variant.id === id)) {
      invalid(row.line, 'variacao', 'o nome gera um identificador de variação vazio ou duplicado.');
    }
    product.variants.push({ id, name, priceCents: parsePrice(required(row, 'preco'), row) });
  }

  for (const row of records.get('atributo') ?? []) {
    const productId = required(row, 'produto_id');
    const product = productsById.get(productId);
    if (!product) invalid(row.line, 'produto_id', `o produto "${productId}" não existe.`);
    if (product.variants.length > 0) {
      invalid(row.line, 'produto_id', 'não misture variacao com atributos no mesmo produto.');
    }

    const id = validId(required(row, 'id'), row);
    const label = required(row, 'nome');
    const attributes = (product.customizationAttributes ??= []);
    if (
      attributes.some(
        (attribute) =>
          attribute.id === id ||
          attribute.label.toLocaleLowerCase('pt-BR') === label.toLocaleLowerCase('pt-BR'),
      )
    ) {
      invalid(row.line, 'id', 'identificador ou nome de atributo duplicado para este produto.');
    }
    attributes.push({ id, label, options: [], defaultOptionId: '' });
  }

  for (const row of records.get('opcao') ?? []) {
    const productId = required(row, 'produto_id');
    const product = productsById.get(productId);
    if (!product) invalid(row.line, 'produto_id', `o produto "${productId}" não existe.`);
    if (product.variants.length > 0) {
      invalid(row.line, 'produto_id', 'não misture variacao com atributos no mesmo produto.');
    }

    const attributeId = required(row, 'variacao');
    const attribute = product.customizationAttributes?.find((item) => item.id === attributeId);
    if (!attribute) {
      invalid(row.line, 'variacao', `o atributo "${attributeId}" não existe para este produto.`);
    }
    const id = validId(required(row, 'id'), row);
    const label = required(row, 'nome');
    if (
      attribute.options.some(
        (option) =>
          option.id === id ||
          option.label.toLocaleLowerCase('pt-BR') === label.toLocaleLowerCase('pt-BR'),
      )
    ) {
      invalid(row.line, 'id', 'identificador ou nome de opção duplicado para este atributo.');
    }
    if (attribute.options.length === 0) attribute.defaultOptionId = id;
    attribute.options.push({ id, label });
  }

  for (const row of records.get('preco_combinacao') ?? []) {
    const productId = required(row, 'produto_id');
    const product = productsById.get(productId);
    if (!product) invalid(row.line, 'produto_id', `o produto "${productId}" não existe.`);
    if (product.variants.length > 0) {
      invalid(row.line, 'produto_id', 'não misture variacao com atributos no mesmo produto.');
    }

    const attributes = product.customizationAttributes ?? [];
    const selectionsText = required(row, 'variacao');
    const selections = selectionsText.split('|').map((pair) => {
      const parts = pair.split('=');
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        invalid(
          row.line,
          'variacao',
          'use atributo=opcao para cada seleção; * representa todas as opções do atributo.',
        );
      }
      return {
        attributeId: validId(parts[0]!, row),
        optionId: parts[1] === '*' ? '*' : validId(parts[1]!, row),
      };
    });
    if (
      selections.length !== attributes.length ||
      new Set(selections.map(({ attributeId }) => attributeId)).size !== selections.length
    ) {
      invalid(row.line, 'variacao', 'selecione exatamente uma opção para cada atributo.');
    }
    const choices = attributes.map((attribute) => {
      const selection = selections.find((item) => item.attributeId === attribute.id);
      if (!selection) {
        invalid(row.line, 'variacao', `selecione uma opção para o atributo "${attribute.label}".`);
      }
      if (selection.optionId === '*') {
        return attribute.options.map((option) => ({
          attributeId: attribute.id,
          optionId: option.id,
        }));
      }
      if (!attribute.options.some((option) => option.id === selection.optionId)) {
        invalid(
          row.line,
          'variacao',
          `a opção "${selection.optionId}" não existe para o atributo "${attribute.label}".`,
        );
      }
      return [selection];
    });
    const combinations = choices.reduce<ProductCustomizationSelection[][]>(
      (current, options) =>
        current.flatMap((combination) => options.map((selection) => [...combination, selection])),
      [[]],
    );
    const variantPrices = (product.variantPrices ??= []);
    const priceCents = parsePrice(required(row, 'preco'), row);
    const existingKeys = new Set(
      variantPrices.map((variantPrice) =>
        JSON.stringify(
          attributes.map((attribute) => {
            const selection = variantPrice.selections.find(
              (item) => item.attributeId === attribute.id,
            );
            return [selection?.attributeId, selection?.optionId];
          }),
        ),
      ),
    );
    for (const selectionsForCombination of combinations) {
      const combinationKey = JSON.stringify(
        selectionsForCombination.map(({ attributeId, optionId }) => [attributeId, optionId]),
      );
      if (existingKeys.has(combinationKey)) {
        invalid(row.line, 'variacao', 'preço duplicado para esta combinação.');
      }
      existingKeys.add(combinationKey);
      variantPrices.push({ selections: selectionsForCombination, priceCents });
    }
  }

  for (const product of products) {
    const productRow = (records.get('produto') ?? []).find(
      (candidate) => candidate.values.id === product.id,
    )!;
    const attributes = product.customizationAttributes ?? [];
    if (attributes.length > 0 || product.variantPrices !== undefined) {
      if (product.variants.length > 0) {
        invalid(
          productRow.line,
          'produto_id',
          'não misture variacao com atributos no mesmo produto.',
        );
      }
      if (attributes.length === 0) {
        invalid(productRow.line, 'produto_id', 'informe pelo menos um atributo para o produto.');
      }
      for (const attribute of attributes) {
        if (attribute.options.length < 2) {
          invalid(
            productRow.line,
            'produto_id',
            `o atributo "${attribute.label}" deve ter ao menos duas opções.`,
          );
        }
      }
      const expectedPriceCount = attributes.reduce(
        (count, attribute) => count * attribute.options.length,
        1,
      );
      if (product.variantPrices?.length !== expectedPriceCount) {
        invalid(
          productRow.line,
          'produto_id',
          `informe um preço para cada uma das ${expectedPriceCount} combinações.`,
        );
      }
    } else if (product.variants.length < 2) {
      invalid(productRow.line, 'produto_id', 'cada produto deve ter ao menos duas variações.');
    }
  }

  return { company, staff, products };
}
