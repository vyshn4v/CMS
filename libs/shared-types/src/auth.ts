/**
 * User & Authentication contracts.
 */

export interface UserDto {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

export interface AuthSessionResponse {
  user: UserDto;
  token?: string;
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
  }>;
}
