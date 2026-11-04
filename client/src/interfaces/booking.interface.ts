import type {
  ProductCustomizationSelection,
  ProductImage,
} from '@shared/interfaces/product.interface';
import type { CompanyCatalog, PublicProductSummary } from './company.interface';
import type {
  AvailableProfessional,
  AvailableSlot,
} from '@shared/interfaces/availability.interface';
import type { PaymentMethod } from '@shared/interfaces/appointment.interface';

export type BookingFormValues = {
  customerName: string;
  customerPhone: string;
  whatsappOptIn: boolean;
  paymentMethod: PaymentMethod;
  installments?: number;
};

export type BookingEstimatedDelivery = {
  days: number;
  estimatedDate: string;
  timezone: string;
};

export type BookingReceipt = {
  appointmentId: string;
  customerName: string;
  customerPhone: string;
  startsAt: string;
  endsAt: string;
  professionalName: string;
  estimatedDelivery?: BookingEstimatedDelivery;
  paymentMethod: PaymentMethod;
  installments?: number;
};

export type BookingTemplateProps =
  | {
      status: 'loading';
      slug: string;
    }
  | { status: 'error'; slug: string; error: string }
  | { status: 'not-found'; slug: string }
  | {
      status: 'ready';
      slug: string;
      catalog: CompanyCatalog;
      product: PublicProductSummary;
      customizationSelections: ProductCustomizationSelection[];
      onCustomizationChange: (attributeId: string, optionId: string) => void;
      effectiveImages: ProductImage[];
      selectedImageId: string;
      onImageSelect: (imageId: string) => void;
      date: string;
      minimumDate: string;
      onDateChange: (date: string) => void;
      estimatedCheckout: boolean;
      estimatedDeliveryDays?: number;
      provisionalEstimatedDate?: string;
      estimateUnavailableMessage?: string;
      professionals: AvailableProfessional[];
      selectedProfessionalId: string;
      onProfessionalChange: (professionalId: string) => void;
      availabilityLoading: boolean;
      slots: AvailableSlot[];
      visibleSlots: AvailableSlot[];
      selectedStartsAt: string;
      onTimeChange: (startsAt: string) => void;
      searchingNextDate: boolean;
      nextDateSearchComplete: boolean;
      nextDateSearchError: string;
      error: string;
      busy: boolean;
      canSubmit: boolean;
      receipt: BookingReceipt | null;
      shareError: string;
      appointmentShareText: string;
      onSubmit: (values: BookingFormValues) => Promise<void>;
      onShare: () => Promise<void>;
      onCloseReceipt: () => void;
    };
