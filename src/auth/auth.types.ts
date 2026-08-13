import { Role } from '../common/enums/role.enum';

export interface JwtPayload {
  sub: string;
  role: Role;
  memberId?: string;
}

export interface AuthenticatedUser {
  userId: string;
  role: Role;
  memberId?: string;
}
