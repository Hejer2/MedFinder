// backend/src/auth/interfaces/jwt-payload.interface.ts
export interface JwtPayload {
  sub: string; // user id
  role: string;
  iat?: number;
  exp?: number;
}
