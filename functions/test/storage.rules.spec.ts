import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { deleteApp, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const projectId = process.env.GCLOUD_PROJECT ?? 'demo-tamarcado';
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
const storageHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
const bucketName =
  process.env.VITE_FIREBASE_STORAGE_BUCKET ??
  process.env.FIREBASE_STORAGE_BUCKET ??
  `${projectId}.appspot.com`;

const testUsers = [
  {
    uid: 'storage-rules-backoffice-a',
    email: 'storage-backoffice-a@rules.test',
    tenantId: 'storage-tenant-a',
    role: 'backoffice',
    active: true,
  },
  {
    uid: 'storage-rules-backoffice-b',
    email: 'storage-backoffice-b@rules.test',
    tenantId: 'storage-tenant-b',
    role: 'backoffice',
    active: true,
  },
  {
    uid: 'storage-rules-backoffice-inactive',
    email: 'storage-backoffice-inactive@rules.test',
    tenantId: 'storage-tenant-a',
    role: 'backoffice',
    active: false,
  },
] as const;
const testPassword = 'StorageRulesTest123!';
const testObjects = new Set<string>();
const tokens = new Map<string, string>();
const storageRulesTests = describe.skipIf(!storageHost);
let app: App | undefined;

function isAuthUserNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'auth/user-not-found'
  );
}

async function signInWithPassword(email: string): Promise<string> {
  const response = await fetch(
    `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=storage-rules-test-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: testPassword, returnSecureToken: true }),
    },
  );
  if (!response.ok) {
    throw new Error(`Auth emulator sign-in failed (${response.status}): ${await response.text()}`);
  }
  const result: unknown = await response.json();
  if (
    typeof result !== 'object' ||
    result === null ||
    !('idToken' in result) ||
    typeof result.idToken !== 'string'
  ) {
    throw new Error('Auth emulator response did not include an ID token.');
  }
  return result.idToken;
}

function objectEndpoint(path: string): string {
  if (!storageHost) throw new Error('FIREBASE_STORAGE_EMULATOR_HOST is required.');
  return `http://${storageHost}/v0/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(path)}`;
}

async function uploadObject(
  path: string,
  token: string,
  contentType: string,
  contents: Uint8Array,
): Promise<Response> {
  testObjects.add(path);
  const body = new ArrayBuffer(contents.byteLength);
  new Uint8Array(body).set(contents);
  return fetch(
    `http://${storageHost}/v0/b/${encodeURIComponent(bucketName)}/o?uploadType=media&name=${encodeURIComponent(path)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': contentType,
      },
      body,
    },
  );
}

function newObjectPath(): string {
  return `product-images/storage-tenant-a/rules-test-product/${randomUUID()}`;
}

storageRulesTests('Firebase Storage product image rules', () => {
  beforeAll(async () => {
    if (!projectId.startsWith('demo-')) {
      throw new Error(
        `Storage Rules tests require a demo-* Firebase project, received "${projectId}".`,
      );
    }
    if (!storageHost) throw new Error('FIREBASE_STORAGE_EMULATOR_HOST is required.');

    process.env.FIREBASE_AUTH_EMULATOR_HOST = authHost;
    process.env.FIRESTORE_EMULATOR_HOST = firestoreHost;
    process.env.FIREBASE_STORAGE_EMULATOR_HOST = storageHost;
    app = initializeApp({ projectId }, `storage-rules-${randomUUID()}`);
    const auth = getAuth(app);
    const db = getFirestore(app);

    for (const user of testUsers) {
      try {
        await auth.getUser(user.uid);
        await auth.updateUser(user.uid, {
          email: user.email,
          password: testPassword,
          emailVerified: true,
        });
      } catch (error: unknown) {
        if (!isAuthUserNotFound(error)) throw error;
        await auth.createUser({
          uid: user.uid,
          email: user.email,
          password: testPassword,
          emailVerified: true,
        });
      }
      await auth.setCustomUserClaims(user.uid, {
        tenantId: user.tenantId,
        role: user.role,
        active: user.active,
      });
      await db.collection('users').doc(user.uid).set({
        tenantId: user.tenantId,
        role: user.role,
        active: user.active,
      });
      tokens.set(user.uid, await signInWithPassword(user.email));
    }
  });

  afterAll(async () => {
    if (!app) return;

    const auth = getAuth(app);
    const db = getFirestore(app);
    const bucket = getStorage(app).bucket(bucketName);
    await Promise.all(
      [...testObjects].map((path) => bucket.file(path).delete({ ignoreNotFound: true })),
    );
    await Promise.all(
      testUsers.map(async (user) => {
        await db.collection('users').doc(user.uid).delete();
        try {
          await auth.deleteUser(user.uid);
        } catch (error: unknown) {
          if (!isAuthUserNotFound(error)) throw error;
        }
      }),
    );
    await deleteApp(app);
  });

  it('allows unauthenticated reads of product image objects', async () => {
    const path = newObjectPath();
    const uploaded = await uploadObject(
      path,
      tokens.get(testUsers[0].uid)!,
      'image/jpeg',
      new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
    );
    expect(uploaded.ok).toBe(true);

    const response = await fetch(`${objectEndpoint(path)}?alt=media`);
    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
    );
  });

  it('allows active backoffice users to create and delete images in their tenant', async () => {
    const path = newObjectPath();
    const uploaded = await uploadObject(
      path,
      tokens.get(testUsers[0].uid)!,
      'image/png',
      new Uint8Array([1, 2, 3]),
    );
    expect(uploaded.ok).toBe(true);

    const deleted = await fetch(objectEndpoint(path), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokens.get(testUsers[0].uid)!}` },
    });
    expect(deleted.ok).toBe(true);
  });

  it('denies image creation and deletion across tenant boundaries', async () => {
    const path = newObjectPath();
    const uploaded = await uploadObject(
      path,
      tokens.get(testUsers[0].uid)!,
      'image/jpeg',
      new Uint8Array([1, 2, 3]),
    );
    expect(uploaded.ok).toBe(true);

    const foreignUpload = await uploadObject(
      `product-images/storage-tenant-a/rules-test-product/${randomUUID()}`,
      tokens.get(testUsers[1].uid)!,
      'image/jpeg',
      new Uint8Array([1, 2, 3]),
    );
    expect(foreignUpload.status).toBe(403);

    const foreignDelete = await fetch(objectEndpoint(path), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokens.get(testUsers[1].uid)!}` },
    });
    expect(foreignDelete.status).toBe(403);
  });

  it('denies image writes for an inactive backoffice user', async () => {
    const path = newObjectPath();
    const inactiveUpload = await uploadObject(
      path,
      tokens.get(testUsers[2].uid)!,
      'image/jpeg',
      new Uint8Array([1, 2, 3]),
    );
    expect(inactiveUpload.status).toBe(403);

    const ownerPath = newObjectPath();
    const ownerUpload = await uploadObject(
      ownerPath,
      tokens.get(testUsers[0].uid)!,
      'image/jpeg',
      new Uint8Array([1, 2, 3]),
    );
    expect(ownerUpload.ok).toBe(true);

    const inactiveDelete = await fetch(objectEndpoint(ownerPath), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokens.get(testUsers[2].uid)!}` },
    });
    expect(inactiveDelete.status).toBe(403);
  });

  it('rejects unsupported MIME types and objects larger than 5 MB', async () => {
    const invalidType = await uploadObject(
      newObjectPath(),
      tokens.get(testUsers[0].uid)!,
      'image/gif',
      new Uint8Array([1, 2, 3]),
    );
    expect(invalidType.status).toBe(403);

    const oversized = await uploadObject(
      newObjectPath(),
      tokens.get(testUsers[0].uid)!,
      'image/jpeg',
      new Uint8Array(5 * 1024 * 1024 + 1),
    );
    expect(oversized.status).toBe(403);
  });
});
