import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { RequestUser } from '../decorators/current-user.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<T>(
    err: Error,
    user: T,
    _info: unknown,
    context: ExecutionContext,
  ): T {
    if (err || !user) {
      throw new UnauthorizedException(
        'Invalid or missing authentication token',
      );
    }

    const requestUser = user as unknown as RequestUser;
    if (requestUser.mustChangePassword) {
      const request = context.switchToHttp().getRequest<{ url: string }>();
      if (!request.url.includes('/auth/change-password')) {
        throw new ForbiddenException(
          'Your password was reset. Please change it before continuing.',
        );
      }
    }

    return user;
  }
}
