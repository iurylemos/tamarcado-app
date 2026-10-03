export interface ProfessionalDocument {
  tenantId: string;
  name: string;
  phoneE164: string;
  photoUrl?: string;
  active: boolean;
}

export interface ProfessionalProductDocument {
  tenantId: string;
  professionalId: string;
  productId: string;
  active: boolean;
}
