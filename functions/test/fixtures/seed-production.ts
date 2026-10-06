import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isUserNotFound(error: unknown): boolean {
  return isRecord(error) && error.code === 'auth/user-not-found';
}

type SeedUser = (typeof seedUsers)[number];

function readSeedPasswords(usersToCreate: readonly SeedUser[]): Record<string, string> {
  if (usersToCreate.length === 0) return {};

  const rawPasswords = process.env.SEED_USER_PASSWORDS_JSON;
  if (!rawPasswords) {
    throw new Error(
      'Set SEED_USER_PASSWORDS_JSON with a unique password for each seed user to create.',
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawPasswords);
  } catch {
    throw new Error('SEED_USER_PASSWORDS_JSON must contain a valid JSON object keyed by user UID.');
  }

  if (!isRecord(parsed) || Array.isArray(parsed)) {
    throw new Error('SEED_USER_PASSWORDS_JSON must contain a JSON object keyed by user UID.');
  }

  const passwords: Record<string, string> = {};
  const uniquePasswords = new Set<string>();
  for (const user of usersToCreate) {
    const password = parsed[user.uid];
    if (typeof password !== 'string' || password.length < 16) {
      throw new Error(
        `Provide a unique password of at least 16 characters for seed user "${user.uid}" in SEED_USER_PASSWORDS_JSON.`,
      );
    }
    if (uniquePasswords.has(password)) {
      throw new Error('Each production seed user must have a different password.');
    }
    uniquePasswords.add(password);
    passwords[user.uid] = password;
  }

  return passwords;
}

async function seedProduction(): Promise<void> {
  const projectId = parseProjectId(process.argv.slice(2));
  if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error('Unset Firebase emulator host variables before running the production seed.');
  }
  const app = initializeApp(
    { credential: applicationDefault(), projectId },
    `production-seed-${projectId}`,
  );
  const db = getFirestore(app);
  const auth = getAuth(app);

  const existingUserIds = new Set<string>();
  for (const user of seedUsers) {
    try {
      const existingUser = await auth.getUser(user.uid);
      if (existingUser.email !== user.email) {
        throw new Error(
          `Seed UID "${user.uid}" already belongs to a different email; refusing to modify it.`,
        );
      }
      existingUserIds.add(user.uid);
    } catch (error: unknown) {
      if (!isUserNotFound(error)) throw error;
      try {
        const existingEmail = await auth.getUserByEmail(user.email);
        throw new Error(
          `Seed email "${user.email}" already belongs to UID "${existingEmail.uid}".`,
        );
      } catch (emailError: unknown) {
        if (!isUserNotFound(emailError)) throw emailError;
      }
    }
  }

  const usersToCreate = seedUsers.filter((user) => !existingUserIds.has(user.uid));
  const passwords = readSeedPasswords(usersToCreate);
  for (const user of seedUsers) {
    if (!existingUserIds.has(user.uid)) {
      await auth.createUser({
        uid: user.uid,
        email: user.email,
        password: passwords[user.uid],
        emailVerified: true,
      });
    }
    await auth.setCustomUserClaims(user.uid, seedUserClaims(user));
  }

  const documents = createSeedDocuments();
  for (let offset = 0; offset < documents.length; offset += 450) {
    const batch = db.batch();
    for (const item of documents.slice(offset, offset + 450)) {
      batch.set(db.collection(item.collection).doc(item.id), item.data, { merge: true });
    }
    await batch.commit();
  }

  console.info(
    `Seeded ${documents.length} documents and ${seedUsers.length} users in ${projectId}. Existing user passwords were not changed.`,
  );
}

seedProduction().catch((error: unknown) => {
  console.error('Production seed failed.', error);
  process.exitCode = 1;
});
