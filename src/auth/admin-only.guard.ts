import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthedRequest } from './auth.types';

/** For actions that change something. Use after SessionGuard. Viewers get 403. */
@Injectable()
export class AdminOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { signedIn } = context.switchToHttp().getRequest<AuthedRequest>();
    if (signedIn?.role !== 'admin') {
      throw new ForbiddenException('Viewers can see everything, but only admins can change it.');
    }
    return true;
  }
}
