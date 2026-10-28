import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { collections } from '../src/config/collections';

const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
const [host, port] = (firestoreHost ?? '127.0.0.1:8080').split(':');
let environment: RulesTestEnvironment;

const aiCollections = [collections.aiAnalysisExecutions, collections.aiAnalysisProposals];

describe.skipIf(!firestoreHost)('AI analysis Firestore rules', () => {
  beforeAll(async () => {
    environment = await initializeTestEnvironment({
      projectId: `demo-ai-rules-${Date.now()}`,
      firestore: {
        host,
        port: Number(port),
        rules: readFileSync(resolve(process.cwd(), '..', 'firestore.rules'), 'utf8'),
      },
    });
    await environment.withSecurityRulesDisabled(async (context) => {
      const database = context.firestore();
      for (const name of aiCollections) {
        await setDoc(doc(database, name, 'doc-a'), { tenantId: 'tenant-a', status: 'queued' });
        await setDoc(doc(database, name, 'doc-b'), { tenantId: 'tenant-b', status: 'queued' });
      }
    });
  });

  afterAll(async () => {
    await environment?.cleanup();
  });

  const clients = [
    ['anonymous', () => environment.unauthenticatedContext()],
    [
      'tenant-a backoffice',
      () =>
        environment.authenticatedContext('admin-a', {
          tenantId: 'tenant-a',
          role: 'backoffice',
          active: true,
        }),
    ],
    [
      'tenant-b collaborator',
      () =>
        environment.authenticatedContext('collab-b', {
          tenantId: 'tenant-b',
          role: 'collaborator',
          active: true,
          professionalId: 'pro-b',
        }),
    ],
  ] as const;

  for (const [label, makeContext] of clients) {
    for (const name of aiCollections) {
      it(`denies ${label} every client access to ${name}`, async () => {
        const database = makeContext().firestore();
        await assertFails(getDoc(doc(database, name, 'doc-a')));
        await assertFails(getDoc(doc(database, name, 'doc-b')));
        await assertFails(getDocs(collection(database, name)));
        await assertFails(
          getDocs(query(collection(database, name), where('tenantId', '==', 'tenant-a'))),
        );
        await assertFails(addDoc(collection(database, name), { tenantId: 'tenant-a' }));
        await assertFails(setDoc(doc(database, name, 'doc-new'), { tenantId: 'tenant-a' }));
        await assertFails(updateDoc(doc(database, name, 'doc-a'), { status: 'succeeded' }));
        await assertFails(deleteDoc(doc(database, name, 'doc-a')));
      });
    }
  }
});
