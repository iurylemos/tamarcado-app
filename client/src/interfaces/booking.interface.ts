import type {
  ProductCustomizationSelection,
  ProductImage,
} from '@shared/interfaces/product.interface';
import type { CompanyCatalog, PublicProductSummary } from './company.interface';
import type { EligibleProfessional } from './professional.interface';
import type { AvailableSlot } from '@shared/interfaces/availability.interface';

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

export type BookingTemplateProps =
  | {
      status: 'loading';
      slug: string;
      date: string;
      minimumDate: string;
      onDateChange: (date: string) => void;
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
      professionals: EligibleProfessional[];
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
      receipt: BookingReceipt | null;
      shareError: string;
      appointmentShareText: string;
      onSubmit: (values: BookingFormValues) => Promise<void>;
      onShare: () => Promise<void>;
      onCloseReceipt: () => void;
    };
