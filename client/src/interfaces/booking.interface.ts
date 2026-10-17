export type BookingFormValues = {
  customerName: string;
  customerPhone: string;
  whatsappOptIn: boolean;
};

export type BookingReceipt = {
  appointmentId: string;
  customerName: string;
  customerPhone: string;
  startsAt: string;
  endsAt: string;
};
