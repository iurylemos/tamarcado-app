import type { DocumentData } from 'firebase-admin/firestore';
import type { CompanyImportData } from './company-import-csv';
import type { CompanyImportDependencies } from './import-company';

export function validImportData(): CompanyImportData {
  return {
    company: {
      id: 'soft-stylus',
      name: 'Soft Stylus',
      slug: 'soft-stylus',
      segment: 'home',
      description: 'Móveis e estofados.',
      emailDomain: 'softstylus.com',
      timezone: 'America/Fortaleza',
      bookingIntervalMinutes: 30,
      daysOfWeek: [1, 2, 3, 4, 5, 6],
      startLocalTime: '09:00',
      endLocalTime: '18:00',
      adminName: 'Gestor Soft Stylus',
      adminEmail: 'admin@softstylus.com',
      adminPassword: 'admin-secret-password',
    },
    staff: [
      {
        id: 'italo',
        name: 'Italo',
        phoneE164: '+5585999990000',
        email: 'italo@softstylus.com',
        password: 'staff-secret-password',
      },
    ],
    products: [
      {
        id: 'cabec',
        name: 'Cabeceira',
        imageUrl: 'https://example.com/cabec.jpg',
        durationMinutes: 30,
        variants: [
          { id: 'solteiro-rosa', name: 'Solteiro Rosa', priceCents: 35000 },
          { id: 'casal-preta', name: 'Casal Preta', priceCents: 45000 },
        ],
      },
    ],
  };
}

interface FakeDependencyOptions {
  failDocumentCollection?: string;
  existingDocument?: { collection: string; id: string; data: DocumentData };
  existingUser?: { uid: string; email: string; password: string };
}

export function fakeImportDependencies(options: FakeDependencyOptions = {}) {
  const storedDocuments = new Map<string, DocumentData>();
  const storedUsers = new Map<string, { email: string; password: string }>();
  const claims = new Map<string, Record<string, unknown>>();
  const deletedDocuments: string[] = [];
  const deletedUsers: string[] = [];
  const documentKey = (collection: string, id: string) => `${collection}/${id}`;

  if (options.existingDocument) {
    storedDocuments.set(
      documentKey(options.existingDocument.collection, options.existingDocument.id),
      options.existingDocument.data,
    );
  }
  if (options.existingUser) {
    storedUsers.set(options.existingUser.uid, {
      email: options.existingUser.email,
      password: options.existingUser.password,
    });
  }

  const dependencies: CompanyImportDependencies = {
    documents: {
      create: async (collection, id, data) => {
        if (options.failDocumentCollection === collection) {
          throw Object.assign(new Error('provider error must not leak'), { code: 'unavailable' });
        }
        const key = documentKey(collection, id);
        if (storedDocuments.has(key)) {
          throw Object.assign(new Error('duplicate provider detail'), { code: 'already-exists' });
        }
        storedDocuments.set(key, data);
      },
      delete: async (collection, id) => {
        const key = documentKey(collection, id);
        deletedDocuments.push(key);
        storedDocuments.delete(key);
      },
    },
    auth: {
      createUser: async ({ uid, email, password }) => {
        if ([...storedUsers.values()].some((user) => user.email === email)) {
          throw Object.assign(new Error('duplicate email provider detail'), {
            code: 'auth/email-already-exists',
          });
        }
        storedUsers.set(uid, { email, password });
        return { uid };
      },
      setCustomUserClaims: async (uid, userClaims) => {
        claims.set(uid, userClaims);
      },
      deleteUser: async (uid) => {
        deletedUsers.push(uid);
        storedUsers.delete(uid);
        claims.delete(uid);
      },
    },
    serverTimestamp: () => 'server-timestamp',
  };

  return { dependencies, storedDocuments, storedUsers, claims, deletedDocuments, deletedUsers };
}
