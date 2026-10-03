import type { UserRole } from '../../../shared/domain/interfaces/user.interface';

export interface UserDocument {
  tenantId: string;
  role: UserRole;
  professionalId?: string;
  name: string;
  phoneE164: string;
  active: boolean;
}
