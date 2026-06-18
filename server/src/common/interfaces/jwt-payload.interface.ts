import { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  mustChangePassword?: boolean;
  iat?: number;
  exp?: number;
}
