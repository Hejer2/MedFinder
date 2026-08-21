// backend/src/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../../users/entities/user.entity';

/**
 * Guard that checks if the authenticated user has one of the required roles.
 * Usage: @Roles(Role.DOCTOR, Role.ADMIN) on controller methods.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true; // no role restriction

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException('User not attached to request');

    const hasRole = requiredRoles.some((role) => role === user.role);
    if (!hasRole) throw new ForbiddenException('Insufficient role');
    return true;
  }
}
