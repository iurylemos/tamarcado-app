import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { extname, isAbsolute, resolve } from 'node:path';
import type { DocumentData } from 'firebase-admin/firestore';
import { collections } from '../../src/config/collections';
import { professionalProductId } from '../../src/utils/professional-product-id';
import { parseCompanyCsv, type CompanyImportData } from './company-import-csv';

interface ImportArguments {
  projectId: string;
  fileName: string;
}

interface AuthUserInput {
  uid: string;
  email: string;
  password: string;
  displayName: string;
  disabled: boolean;
}

export interface CompanyImportDependencies {
  auth: {
    createUser(input: AuthUserInput): Promise<{ uid: string }>;
    setCustomUserClaims(uid: string, claims: Record<string, unknown>): Promise<void>;
    deleteUser(uid: string): Promise<void>;
  };
  documents: {
    create(collection: string, id: string, data: DocumentData): Promise<void>;
    delete(collection: string, id: string): Promise<void>;
  };
  serverTimestamp(): unknown;
}

type CreatedResource =
  { kind: 'auth'; id: string } | { kind: 'document'; collection: string; id: string };

export interface CompanyImportSummary {
  companySlug: string;
  collaborators: number;
  products: number;
  variants: number;
  documents: number;
  accounts: number;
}

function recordId(prefix: string, stableId: string): string {
  const digest = createHash('sha256').update(stableId).digest('hex').slice(0, 32);
  return `${prefix}_${digest}`;
}

function errorCode(error: unknown): string | number | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  const code = error.code;
  return typeof code === 'string' || typeof code === 'number' ? code : undefined;
}

function isConflict(error: unknown): boolean {
  const code = errorCode(error);
  return (
    code === 6 ||
    code === '6' ||
    code === 'already-exists' ||
    code === 'auth/email-already-exists' ||
    code === 'auth/uid-already-exists'
  );
}

function safeWriteError(kind: string, id: string, error: unknown): Error {
  const status = isConflict(error) ? 'conflito com registro existente' : 'falha ao criar registro';
  return new Error(`${status}: ${kind} "${id}".`);
}

async function rollback(
  resources: CreatedResource[],
  dependencies: CompanyImportDependencies,
): Promise<{ accountsRemoved: number; documentsRemoved: number; failures: number }> {
  let accountsRemoved = 0;
  let documentsRemoved = 0;
  let failures = 0;
  for (const resource of [...resources].reverse()) {
    try {
      if (resource.kind === 'auth') {
        await dependencies.auth.deleteUser(resource.id);
        accountsRemoved += 1;
      } else {
        await dependencies.documents.delete(resource.collection, resource.id);
        documentsRemoved += 1;
      }
    } catch {
      failures += 1;
    }
  }
  return { accountsRemoved, documentsRemoved, failures };
}

export async function executeCompanyImport(
  data: CompanyImportData,
  dependencies: CompanyImportDependencies,
): Promise<CompanyImportSummary> {
  const resources: CreatedResource[] = [];
  const company = data.company;
  const timestamp = () => dependencies.serverTimestamp();

  const createDocument = async (
    collection: string,
    id: string,
    recordType: string,
    document: DocumentData,
  ): Promise<void> => {
    try {
      await dependencies.documents.create(collection, id, document);
      resources.push({ kind: 'document', collection, id });
    } catch (error) {
      throw safeWriteError(recordType, id, error);
    }
  };

  const createAccount = async (
    input: AuthUserInput,
    claims: Record<string, unknown>,
    recordType: string,
    stableId: string,
  ): Promise<string> => {
    let uid: string;
    try {
      const created = await dependencies.auth.createUser(input);
      uid = created.uid;
      resources.push({ kind: 'auth', id: uid });
    } catch (error) {
      throw safeWriteError(recordType, stableId, error);
    }
    try {
      await dependencies.auth.setCustomUserClaims(uid, claims);
    } catch (error) {
      throw safeWriteError(`${recordType} claims`, stableId, error);
    }
    return uid;
  };

  try {
    await createDocument(collections.tenants, company.id, 'empresa', {
      name: company.name,
      slug: company.slug,
      segment: company.segment,
      ...(company.description ? { description: company.description } : {}),
      ...(company.phoneE164 ? { phoneE164: company.phoneE164 } : {}),
      emailDomain: company.emailDomain,
      timezone: company.timezone,
      bookingIntervalMinutes: company.bookingIntervalMinutes,
      active: true,
      createdAt: timestamp(),
      updatedAt: timestamp(),
    });
    await createDocument(collections.publicBusinesses, company.id, 'empresa pública', {
      tenantId: company.id,
      name: company.name,
      slug: company.slug,
      segment: company.segment,
      ...(company.description ? { description: company.description } : {}),
      published: true,
    });

    const adminId = await createAccount(
      {
        uid: recordId('backoffice', company.id),
        email: company.adminEmail,
        password: company.adminPassword,
        displayName: company.adminName,
        disabled: false,
      },
      { tenantId: company.id, role: 'backoffice', active: true },
      'administrador',
      company.id,
    );
    await createDocument(collections.users, adminId, 'usuário backoffice', {
      tenantId: company.id,
      role: 'backoffice',
      name: company.adminName,
      phoneE164: company.phoneE164 ?? '',
      email: company.adminEmail,
      active: true,
    });

    for (const member of data.staff) {
      const staffUid = recordId('collaborator', member.id);
      await createDocument(collections.professionals, member.id, 'colaborador', {
        tenantId: company.id,
        name: member.name,
        phoneE164: member.phoneE164,
        active: true,
      });
      await createAccount(
        {
          uid: staffUid,
          email: member.email,
          password: member.password,
          displayName: member.name,
          disabled: false,
        },
        {
          tenantId: company.id,
          role: 'collaborator',
          active: true,
          professionalId: member.id,
        },
        'conta de colaborador',
        member.id,
      );
      await createDocument(collections.users, staffUid, 'usuário colaborador', {
        tenantId: company.id,
        role: 'collaborator',
        professionalId: member.id,
        name: member.name,
        phoneE164: member.phoneE164,
        email: member.email,
        active: true,
      });

      for (const dayOfWeek of company.daysOfWeek) {
        await createDocument(
          collections.workingHours,
          `${company.id}__${member.id}__${dayOfWeek}`,
          'horário de atendimento',
          {
            tenantId: company.id,
            professionalId: member.id,
            dayOfWeek,
            startLocalTime: company.startLocalTime,
            endLocalTime: company.endLocalTime,
            active: true,
          },
        );
      }
    }

    for (const product of data.products) {
      const attributeId = 'variacao';
      const customizationAttributes = product.customizationAttributes ?? [
        {
          id: attributeId,
          label: 'Variacao',
          options: product.variants.map(({ id, name }) => ({ id, label: name })),
          defaultOptionId: product.variants[0]!.id,
        },
      ];
      const variantPrices =
        product.variantPrices ??
        product.variants.map(({ id, priceCents }) => ({
          selections: [{ attributeId, optionId: id }],
          priceCents,
        }));
      const priceCents = Math.min(...variantPrices.map(({ priceCents: price }) => price));
      const productDocument: DocumentData = {
        tenantId: company.id,
        name: product.name,
        ...(product.description ? { description: product.description } : {}),
        imageUrl: product.imageUrl,
        customizationAttributes,
        variantPrices,
        priceCents,
        durationMinutes: product.durationMinutes,
        commissionType: 'fixed',
        commissionValue: 0,
        active: true,
      };
      await createDocument(collections.products, product.id, 'produto', productDocument);
      await createDocument(collections.publicProducts, product.id, 'produto público', {
        tenantId: company.id,
        businessSlug: company.slug,
        name: product.name,
        ...(product.description ? { description: product.description } : {}),
        imageUrl: product.imageUrl,
        customizationAttributes,
        variantPrices,
        priceCents,
        durationMinutes: product.durationMinutes,
        active: true,
        published: true,
      });

      for (const member of data.staff) {
        await createDocument(
          collections.professionalProducts,
          professionalProductId(company.id, member.id, product.id),
          'associação de produto',
          {
            tenantId: company.id,
            professionalId: member.id,
            productId: product.id,
            active: true,
          },
        );
      }
    }

    return {
      companySlug: company.slug,
      collaborators: data.staff.length,
      products: data.products.length,
      variants: data.products.reduce(
        (total, product) => total + (product.variantPrices?.length ?? product.variants.length),
        0,
      ),
      documents: resources.filter((resource) => resource.kind === 'document').length,
      accounts: resources.filter((resource) => resource.kind === 'auth').length,
    };
  } catch (error) {
    const failedOperation = error instanceof Error ? error.message : 'falha não identificada';
    const recovery = await rollback(resources, dependencies);
    throw new Error(
      `Importação interrompida em ${failedOperation}. Recuperação: ${recovery.documentsRemoved} documentos e ${recovery.accountsRemoved} contas removidos; ${recovery.failures} falhas na recuperação.`,
    );
  }
}

export function parseImportArguments(
  args: string[],
  environment: NodeJS.ProcessEnv = process.env,
): ImportArguments {
  let projectId: string | undefined;
  let filePath: string | undefined;
  let confirmed = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--project') {
      if (projectId || !args[index + 1] || args[index + 1]!.startsWith('--')) {
        throw new Error('Informe um único projeto com --project <project-id>.');
      }
      projectId = args[index + 1];
      index += 1;
    } else if (argument === '--file') {
      if (filePath || !args[index + 1] || args[index + 1]!.startsWith('--')) {
        throw new Error('Informe um único CSV com --file <nome-do-arquivo.csv>.');
      }
      filePath = args[index + 1];
      index += 1;
    } else if (argument === '--confirm-production-import') {
      if (confirmed) throw new Error('A confirmação --confirm-production-import foi repetida.');
      confirmed = true;
    } else {
      throw new Error('Argumento inválido. Consulte o uso de import:company.');
    }
  }

  if (!projectId) throw new Error('O argumento --project <project-id> é obrigatório.');
  if (!filePath) throw new Error('O argumento --file <nome-do-arquivo.csv> é obrigatório.');
  if (!confirmed) throw new Error('A confirmação --confirm-production-import é obrigatória.');
  if (projectId.toLowerCase().startsWith('demo-')) {
    throw new Error('A importação recusa projetos demo-* ou de emulador.');
  }
  if (
    environment.FIRESTORE_EMULATOR_HOST ||
    environment.FIREBASE_AUTH_EMULATOR_HOST ||
    environment.FIREBASE_STORAGE_EMULATOR_HOST
  ) {
    throw new Error('Remova as variáveis do Firebase Emulator (emulador) antes de importar.');
  }
  return { projectId, fileName: filePath };
}

export function resolveCompanyCsvPath(fileName: string, functionsRoot = process.cwd()): string {
  if (
    !fileName ||
    isAbsolute(fileName) ||
    fileName.includes('/') ||
    fileName.includes('\\') ||
    fileName === '.' ||
    fileName === '..'
  ) {
    throw new Error('Informe somente o nome do arquivo CSV, sem diretórios.');
  }
  if (extname(fileName).toLowerCase() !== '.csv') {
    throw new Error('O arquivo informado em --file deve ter extensão .csv.');
  }
  return resolve(functionsRoot, 'test', 'fixtures', 'templates', fileName);
}

async function createFirebaseDependencies(projectId: string): Promise<CompanyImportDependencies> {
  const [
    { applicationDefault, getApps, initializeApp },
    { getAuth },
    { FieldValue, getFirestore },
  ] = await Promise.all([
    import('firebase-admin/app'),
    import('firebase-admin/auth'),
    import('firebase-admin/firestore'),
  ]);
  const appName = `company-csv-import-${projectId}`;
  const existingApp = getApps().find((app) => app.name === appName);
  const app =
    existingApp ?? initializeApp({ credential: applicationDefault(), projectId }, appName);
  if (app.options.projectId && app.options.projectId !== projectId) {
    throw new Error('O aplicativo Firebase já inicializado aponta para outro projeto.');
  }
  const db = getFirestore(app);
  const auth = getAuth(app);
  return {
    auth: {
      createUser: async (input) => {
        const created = await auth.createUser(input);
        return { uid: created.uid };
      },
      setCustomUserClaims: async (uid, claims) => auth.setCustomUserClaims(uid, claims),
      deleteUser: async (uid) => auth.deleteUser(uid),
    },
    documents: {
      create: async (collection, id, data) => {
        await db.collection(collection).doc(id).create(data);
      },
      delete: async (collection, id) => {
        await db.collection(collection).doc(id).delete();
      },
    },
    serverTimestamp: () => FieldValue.serverTimestamp(),
  };
}

async function main(): Promise<void> {
  const { projectId, fileName } = parseImportArguments(process.argv.slice(2));
  const filePath = resolveCompanyCsvPath(fileName);
  const csvSource = await readFile(filePath, 'utf8');
  const data = parseCompanyCsv(csvSource);
  const dependencies = await createFirebaseDependencies(projectId);
  const summary = await executeCompanyImport(data, dependencies);
  console.info(
    `Importação concluída para ${summary.companySlug} no projeto ${projectId}: ${summary.accounts} contas, ${summary.documents} documentos, ${summary.collaborators} colaboradores, ${summary.products} produtos e ${summary.variants} variações.`,
  );
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Falha na importação.');
    process.exitCode = 1;
  });
}
