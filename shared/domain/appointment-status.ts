export const appointmentStatuses = ['pending', 'confirmed', 'cancelled', 'completed'] as const;

export type AppointmentStatus = (typeof appointmentStatuses)[number];

const allowedTransitions: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed'],
  cancelled: [],
  completed: [],
};

export function canTransitionAppointment(
  current: AppointmentStatus,
  next: AppointmentStatus,
): boolean {
  return allowedTransitions[current].includes(next);
}
