import { randomUUID } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { collections } from '../src/config/collections';
import { firestore } from '../src/services/firestore.service';

export const emulatorAvailable = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

export function assertLocalEmulator(): void {
  const host = process.env.FIRESTORE_EMULATOR_HOST ?? '';
  if (!/^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(host)) {
    throw new Error('AI analysis tests only run against a local Firestore emulator.');
  }
}

export interface TestTenant {
  tenantId: string;
  uid: string;
}

export async function seedTenantWithBackoffice(
  timezone = 'America/Sao_Paulo',
  overrides: { role?: 'backoffice' | 'collaborator'; active?: boolean } = {},
): Promise<TestTenant> {
  const tenantId = `ai-tenant-${randomUUID()}`;
  const uid = `ai-user-${randomUUID()}`;
  await firestore.collection(collections.tenants).doc(tenantId).set({ name: 'Test', timezone });
  await firestore
    .collection(collections.users)
    .doc(uid)
    .set({
      tenantId,
      role: overrides.role ?? 'backoffice',
      name: 'Admin',
      phoneE164: '+5511999990000',
      active: overrides.active ?? true,
    });
  return { tenantId, uid };
}

export function callableRequest(
  tenant: TestTenant,
  data: unknown,
  token: Record<string, unknown> = {},
) {
  return {
    data,
    auth: {
      uid: tenant.uid,
      token: { tenantId: tenant.tenantId, role: 'backoffice', active: true, ...token },
    },
    rawRequest: {},
    acceptsStreaming: false,
  } as never;
}

export async function seedAppointment(
  tenantId: string,
  startsAt: Date,
  overrides: Record<string, unknown> = {},
): Promise<void> {
  await firestore.collection(collections.appointments).add({
    tenantId,
    customerPhoneE164: '+5511988887777',
    customerName: 'Cliente Privado',
    productId: 'product-a',
    professionalId: 'pro-a',
    professionalNameSnapshot: 'Profissional Privado',
    startsAt: Timestamp.fromDate(startsAt),
    endsAt: Timestamp.fromDate(new Date(startsAt.getTime() + 1_800_000)),
    status: 'completed',
    productNameSnapshot: 'Corte',
    productPriceCentsSnapshot: 10_000,
    commissionTypeSnapshot: 'fixed',
    commissionValueSnapshot: 1_000,
    ...overrides,
  });
}

export async function cleanupTenants(tenantIds: readonly string[]): Promise<void> {
  for (const tenantId of tenantIds) {
    for (const name of [
      collections.aiAnalysisExecutions,
      collections.appointments,
      collections.users,
    ]) {
      const snapshot = await firestore.collection(name).where('tenantId', '==', tenantId).get();
      await Promise.all(snapshot.docs.map((document) => document.ref.delete()));
    }
    await firestore.collection(collections.tenants).doc(tenantId).delete();
  }
}
