import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { config } from '../config';
import { AuthedRequest } from './auth.types';
import { SessionsService } from './sessions.service';

/** Lets in only a signed-in person, and attaches their tenant and role to the request. */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly sessions: SessionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const cookies = request.cookies as Record<string, string | undefined>;
    const token = cookies[config.session.cookieName];
    const signedIn = token ? await this.sessions.findActive(token) : null;
    if (!signedIn) throw new UnauthorizedException('Sign in first.');
    request.signedIn = signedIn;
    return true;
  }
}
