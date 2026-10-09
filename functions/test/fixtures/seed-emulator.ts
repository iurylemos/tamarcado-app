import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { emulatorUsers } from './emulator-users';
import { createSeedDocuments, seedUserClaims } from './seed-data';

const projectId = process.env.GCLOUD_PROJECT ?? 'demo-tamarcado';
if (!projectId.startsWith('demo-')) {
  throw new Error(
    `Refusing to seed non-emulator Firebase project "${projectId}". Use a demo-* project ID.`,
  );
}

const emulatorHosts = {
  auth: process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099',
  firestore: process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080',
  storage: process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? '127.0.0.1:9199',
};

function assertLocalEmulatorHost(service: string, host: string): void {
  const match = /^(\[[^\]]+\]|[^:]+):(\d+)$/.exec(host);
  const hostname = match?.[1]?.replace(/^\[|\]$/g, '');
  const port = Number(match?.[2]);
  if (
    !hostname ||
    !(hostname === 'localhost' || hostname === '::1' || /^127(?:\.\d{1,3}){3}$/.test(hostname)) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65_535
  ) {
    throw new Error(`Refusing to reset ${service} at non-local emulator host "${host}".`);
  }
}

Object.entries(emulatorHosts).forEach(([service, host]) => assertLocalEmulatorHost(service, host));
process.env.FIRESTORE_EMULATOR_HOST = emulatorHosts.firestore;
process.env.FIREBASE_AUTH_EMULATOR_HOST = emulatorHosts.auth;
process.env.FIREBASE_STORAGE_EMULATOR_HOST = emulatorHosts.storage;

const app = getApps()[0] ?? initializeApp({ projectId });
const db = getFirestore(app);
const auth = getAuth(app);

async function verifyEmulatorsAreReachable(): Promise<void> {
  await Promise.all(
    Object.values(emulatorHosts).map(async (host) => {
      try {
        await fetch(`http://${host}/`, { signal: AbortSignal.timeout(5_000) });
      } catch (error: unknown) {
        throw new Error(`Cannot reach the local Firebase emulator at ${host}.`, { cause: error });
      }
    }),
  );
}

async function clearEmulatorData(): Promise<void> {
  await verifyEmulatorsAreReachable();

  const bucketName =
    process.env.VITE_FIREBASE_STORAGE_BUCKET ??
    process.env.FIREBASE_STORAGE_BUCKET ??
    `${projectId}.appspot.com`;
  await getStorage(app).bucket(bucketName).deleteFiles({ force: true });

  for (const collection of await db.listCollections()) {
    await db.recursiveDelete(collection);
  }

  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1_000, pageToken);
    for (let offset = 0; offset < page.users.length; offset += 1_000) {
      const usersToDelete = page.users.slice(offset, offset + 1_000);
      const result = await auth.deleteUsers(usersToDelete.map((user) => user.uid));
      if (result.failureCount > 0) {
        throw new Error(
          `Failed to clear ${result.failureCount} Firebase Auth emulator users: ${result.errors
            .map(
              (error) => `${usersToDelete[error.index]?.uid ?? error.index} (${error.error.code})`,
            )
            .join(', ')}`,
        );
      }
    }
    pageToken = page.pageToken;
  } while (pageToken);
}

async function writeSeedDocuments(): Promise<number> {
  const documents = createSeedDocuments();
  for (let offset = 0; offset < documents.length; offset += 450) {
    const batch = db.batch();
    for (const item of documents.slice(offset, offset + 450)) {
      batch.set(db.collection(item.collection).doc(item.id), item.data, { merge: true });
    }
    await batch.commit();
  }
  return documents.length;
}

async function seed(): Promise<void> {
  await clearEmulatorData();
  const documentCount = await writeSeedDocuments();
  for (const user of emulatorUsers) {
    try {
      await auth.getUser(user.uid);
      await auth.updateUser(user.uid, {
        email: user.email,
        password: user.password,
        emailVerified: true,
      });
    } catch (error) {
      if (
        typeof error !== 'object' ||
        error === null ||
        !('code' in error) ||
        error.code !== 'auth/user-not-found'
      ) {
        throw error;
      }
      await auth.createUser({
        uid: user.uid,
        email: user.email,
        password: user.password,
        emailVerified: true,
      });
    }
    await auth.setCustomUserClaims(user.uid, seedUserClaims(user));
  }
  console.info(
    `Reset local Auth, Firestore, and Storage emulators; seeded ${documentCount} documents and ${emulatorUsers.length} users in ${projectId}.`,
  );
}

seed().catch((error: unknown) => {
  console.error('Emulator seed failed.', error);
  process.exitCode = 1;
});
