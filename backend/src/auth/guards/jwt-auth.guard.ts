// backend/src/auth/guards/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard that validates JWT using the "jwt" strategy defined in JwtStrategy.
 * It attaches the decoded payload to `request.user`.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
