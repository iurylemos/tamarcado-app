import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AuthorizedActor } from '../../services/authorization.service';
import {
  listAppointments,
  listEligibleAppointmentProfessionals,
  updateAppointment,
  updateAppointmentStatus,
} from '../../services/appointment-operations.service';
import { createSeedDocuments } from '../../../test/fixtures/seed-data';
import { localDateTimeToUtc } from '../../../../shared/domain/timezone';
import { fiveMinuteBucketStarts } from '../../../../shared/domain/interval';
import { reservationDocumentId } from '../../services/booking.service';

const emulatorOnly = describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST);
let db: Firestore;
const ana: AuthorizedActor = {
  uid: 'test-collaborator-ana',
  tenantId: 'tenant-aurora',
  role: 'collaborator',
  professionalId: 'professional-ana',
  name: 'Ana Souza',
  phoneE164: '+5511999990001',
  active: true,
};
const manager: AuthorizedActor = {
  uid: 'test-collaborator-manager',
  tenantId: 'tenant-aurora',
  role: 'collaborator',
  name: 'Colaborador',
  phoneE164: '+5511999990099',
  active: true,
};

async function resetFirestore() {
  for (const collection of await db.listCollections()) {
    const documents = await collection.get();
    const batch = db.batch();
    documents.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();
  }
  const batch = db.batch();
  createSeedDocuments().forEach((document) => {
    batch.set(db.collection(document.collection).doc(document.id), document.data);
  });
  await batch.commit();
}

function nextBusinessDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  while (date.getDay() === 0) date.setDate(date.getDate() + 1);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

emulatorOnly('collaborator appointment operations on the Firestore emulator', () => {
  beforeAll(() => {
    const app =
      getApps()[0] ?? initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'demo-tamarcado' });
    db = getFirestore(app);
  });

  beforeEach(async () => resetFirestore());

  it('limits appointments to tenant/professional scope and filters by the business-local date', async () => {
    const date = nextBusinessDate();
    const startsAt = localDateTimeToUtc(date, '09:00', 'America/Sao_Paulo');
    await db
      .collection('appointments')
      .doc('appointment-future-ana')
      .set({
        tenantId: 'tenant-aurora',
        customerPhoneE164: '+5511999990011',
        productId: 'service-corte',
        professionalId: 'professional-ana',
        professionalNameSnapshot: 'Ana Souza',
        startsAt: Timestamp.fromDate(startsAt),
        endsAt: Timestamp.fromMillis(startsAt.getTime() + 60 * 60_000),
        durationMinutes: 60,
        status: 'pending',
        productNameSnapshot: 'Corte',
        productPriceCentsSnapshot: 12000,
      });
    await db
      .collection('appointments')
      .doc('appointment-future-other')
      .set({
        tenantId: 'tenant-horizonte',
        customerPhoneE164: '+5521999990011',
        productId: 'service-consulta',
        professionalId: 'professional-horizonte',
        professionalNameSnapshot: 'Marina Reis',
        startsAt: Timestamp.fromDate(startsAt),
        endsAt: Timestamp.fromMillis(startsAt.getTime() + 45 * 60_000),
        durationMinutes: 45,
        status: 'pending',
        productNameSnapshot: 'Consulta',
        productPriceCentsSnapshot: 18000,
      });

    const result = await listAppointments(ana, { date, statuses: ['pending'] });
    expect(result.timezone).toBe('America/Sao_Paulo');
    expect(result.appointments.map((appointment) => appointment.id)).toEqual([
      'appointment-future-ana',
    ]);
  });

  it('enforces transitions and releases reservations when an appointment becomes terminal', async () => {
    const start = Timestamp.fromDate(
      localDateTimeToUtc(nextBusinessDate(), '09:00', 'America/Sao_Paulo'),
    );
    const bucket = fiveMinuteBucketStarts({
      startsAt: start.toMillis(),
      endsAt: start.toMillis() + 60 * 60_000,
    })[0]!;
    const reservationId = reservationDocumentId('tenant-aurora', 'professional-ana', bucket);
    await db
      .collection('booking_reservations')
      .doc(reservationId)
      .set({
        tenantId: 'tenant-aurora',
        professionalId: 'professional-ana',
        appointmentId: 'appointment-pending',
        bucketStartAt: Timestamp.fromMillis(bucket),
        createdAt: Timestamp.now(),
      });

    await expect(updateAppointmentStatus(ana, 'appointment-pending', 'completed')).rejects.toThrow(
      'não é permitida',
    );
    await updateAppointmentStatus(ana, 'appointment-pending', 'cancelled');
    expect((await db.collection('booking_reservations').doc(reservationId).get()).exists).toBe(
      false,
    );
    await expect(
      updateAppointmentStatus(ana, 'appointment-confirmed', 'completed'),
    ).rejects.toThrow('não tem acesso');
    await updateAppointmentStatus(manager, 'appointment-confirmed', 'completed');
    await expect(
      updateAppointmentStatus(manager, 'appointment-confirmed', 'cancelled'),
    ).rejects.toThrow('não é permitida');
  });

  it('rejects overlapping edits and atomically reassigns an eligible booking with its reservations', async () => {
    const date = nextBusinessDate();
    const startsAt = localDateTimeToUtc(date, '10:00', 'America/Sao_Paulo');
    await db
      .collection('appointments')
      .doc('appointment-conflict')
      .set({
        tenantId: 'tenant-aurora',
        customerPhoneE164: '+5511999990012',
        productId: 'service-corte',
        professionalId: 'professional-bruna',
        professionalNameSnapshot: 'Bruna Lima',
        startsAt: Timestamp.fromDate(startsAt),
        endsAt: Timestamp.fromMillis(startsAt.getTime() + 60 * 60_000),
        durationMinutes: 60,
        status: 'confirmed',
        productNameSnapshot: 'Corte',
        productPriceCentsSnapshot: 12000,
      });

    await expect(
      updateAppointment(manager, {
        appointmentId: 'appointment-pending',
        startsAt: startsAt.toISOString(),
        professionalId: 'professional-bruna',
      }),
    ).rejects.toThrow('reservado');

    const freeStart = localDateTimeToUtc(date, '12:00', 'America/Sao_Paulo');
    const updated = await updateAppointment(manager, {
      appointmentId: 'appointment-pending',
      startsAt: freeStart.toISOString(),
      professionalId: 'professional-bruna',
    });
    expect(updated.professionalId).toBe('professional-bruna');
    expect(
      (await db.collection('appointments').doc('appointment-pending').get()).data(),
    ).toMatchObject({
      professionalId: 'professional-bruna',
      professionalNameSnapshot: 'Bruna Lima',
      startsAt: Timestamp.fromDate(freeStart),
    });
    const reservations = await db
      .collection('booking_reservations')
      .where('appointmentId', '==', 'appointment-pending')
      .get();
    expect(reservations.size).toBeGreaterThan(0);
    expect(
      reservations.docs.every(
        (reservation) => reservation.data().professionalId === 'professional-bruna',
      ),
    ).toBe(true);
  });

  it('returns only eligible professionals within the collaborator scope', async () => {
    expect(await listEligibleAppointmentProfessionals(ana, 'appointment-pending')).toEqual([
      { id: 'professional-ana', name: 'Ana Souza' },
    ]);
    await expect(
      updateAppointment(ana, {
        appointmentId: 'appointment-pending',
        startsAt: localDateTimeToUtc(
          nextBusinessDate(),
          '12:00',
          'America/Sao_Paulo',
        ).toISOString(),
        professionalId: 'professional-bruna',
      }),
    ).rejects.toThrow('não permite atribuir');
  });
});
