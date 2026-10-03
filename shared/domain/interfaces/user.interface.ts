export type UserRole = 'collaborator' | 'backoffice';

export interface User {
  id: string;
  tenantId: string;
  role: UserRole;
  professionalId?: string;
  name: string;
  phoneE164: string;
  active: boolean;
}
