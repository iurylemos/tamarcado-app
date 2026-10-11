import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { createSeedDocuments, seedUserClaims, seedUsers } from './seed-data';

function parseProjectId(args: string[]): string {
  let projectId: string | undefined;
  let confirmed = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--project') {
      if (projectId || !args[index + 1]) {
        throw new Error('Provide exactly one project with --project <project-id>.');
      }
      projectId = args[index + 1];
      index += 1;
    } else if (argument === '--confirm-production-seed') {
      if (confirmed) throw new Error('Duplicate --confirm-production-seed flag.');
      confirmed = true;
    } else {
      throw new Error(`Unknown argument "${argument}".`);
    }
  }

  if (!projectId || !confirmed) {
    throw new Error(
      'Usage: npm run seed:production -- --project <project-id> --confirm-production-seed',
    );
  }
  if (projectId.startsWith('demo-')) {
    throw new Error(`Refusing to seed emulator project "${projectId}" with the production script.`);
  }

  return projectId;
}

function readSeedPassword(): string {
  const password = '@Admin123';
  if (password.length < 6) {
    throw new Error('SEED_USER_PASSWORD must contain at least 6 characters.');
  }
  return password;
}

async function seedProduction(): Promise<void> {
  const projectId = parseProjectId(process.argv.slice(2));
  if (
    process.env.FIRESTORE_EMULATOR_HOST ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||
    process.env.FIREBASE_STORAGE_EMULATOR_HOST
  ) {
    throw new Error('Unset Firebase emulator host variables before running the production seed.');
  }
  const password = readSeedPassword();
  const app = initializeApp(
    { credential: applicationDefault(), projectId },
    `production-seed-${projectId}`,
  );
  const db = getFirestore(app);
  const auth = getAuth(app);
  const storage = getStorage(app);
  const bucketName =
    process.env.VITE_FIREBASE_STORAGE_BUCKET ??
    process.env.FIREBASE_STORAGE_BUCKET ??
    `${projectId}.appspot.com`;

  await storage.bucket(bucketName).deleteFiles({ force: true });

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
          `Failed to clear ${result.failureCount} Firebase Auth users: ${result.errors
            .map(
              (error) => `${usersToDelete[error.index]?.uid ?? error.index} (${error.error.code})`,
            )
            .join(', ')}`,
        );
      }
    }
    pageToken = page.pageToken;
  } while (pageToken);

  const documents = createSeedDocuments();
  for (let offset = 0; offset < documents.length; offset += 450) {
    const batch = db.batch();
    for (const item of documents.slice(offset, offset + 450)) {
      batch.set(db.collection(item.collection).doc(item.id), item.data);
    }
    await batch.commit();
  }

  for (const user of seedUsers) {
    await auth.createUser({
      uid: user.uid,
      email: user.email,
      password,
      emailVerified: true,
    });
    await auth.setCustomUserClaims(user.uid, seedUserClaims(user));
  }

  console.info(
    `Reset Auth, Firestore, and Storage; seeded ${documents.length} documents and ${seedUsers.length} users in ${projectId}.`,
  );
}

seedProduction().catch((error: unknown) => {
  console.error('Production seed failed.', error);
  process.exitCode = 1;
});
