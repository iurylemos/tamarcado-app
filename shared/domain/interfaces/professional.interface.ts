export interface Professional {
  id: string;
  tenantId: string;
  name: string;
  photoUrl?: string;
  active: boolean;
}

export interface ProfessionalProduct {
  id: string;
  tenantId: string;
  professionalId: string;
  productId: string;
  active: boolean;
}
