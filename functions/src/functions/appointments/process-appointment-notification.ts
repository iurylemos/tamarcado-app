import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { collections } from '../../config/collections';
import { processAppointmentNotification } from '../../services/appointment-notification.service';

export const processAppointmentNotificationCreated = onDocumentCreated(
  {
    document: `${collections.appointmentNotificationJobs}/{jobId}`,
    retry: true,
  },
  async (event) => {
    await processAppointmentNotification(event.params.jobId);
  },
);
