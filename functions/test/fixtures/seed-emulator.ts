import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createSeedDocuments, emulatorUsers } from './seed-data';

const projectId = process.env.GCLOUD_PROJECT ?? 'demo-tamarcado';
if (!projectId.startsWith('demo-')) {
  throw new Error(`Refusing to seed non-emulator Firebase project "${projectId}". Use a demo-* project ID.`);
}

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';

const app = getApps()[0] ?? initializeApp({ projectId });
const db = getFirestore(app);
const auth = getAuth(app);

async function seed() {
  const batch = db.batch();
  for (const item of createSeedDocuments()) {
    batch.set(db.collection(item.collection).doc(item.id), item.data, { merge: true });
  }
  await batch.commit();

  for (const user of emulatorUsers) {
    try {
      await auth.getUser(user.uid);
      await auth.updateUser(user.uid, { email: user.email, password: user.password, emailVerified: true });
    } catch (error) {
      if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== 'auth/user-not-found') {
        throw error;
      }
      await auth.createUser({
        uid: user.uid,
        email: user.email,
        password: user.password,
        emailVerified: true,
      });
    }
    await auth.setCustomUserClaims(user.uid, { tenantId: user.tenantId, role: user.role, active: true });
  }
  console.info(`Seeded ${createSeedDocuments().length} documents and ${emulatorUsers.length} emulator users in ${projectId}.`);
}

seed().catch((error: unknown) => {
  console.error('Emulator seed failed.', error);
  process.exitCode = 1;
});
