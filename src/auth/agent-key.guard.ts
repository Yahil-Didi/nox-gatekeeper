import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Response } from 'express';
import { Repository } from 'typeorm';
import { sha256 } from '../common/crypto';
import { AgentKey } from '../database/entities';
import { AuthedRequest } from './auth.types';

/** "Bearer <token>". The word "Bearer" is case-insensitive in HTTP. */
const BEARER = /^Bearer\s+(\S+)$/i;

/**
 * The agent key is a bearer token: `Authorization: Bearer <agent key>`. We look it up by its
 * SHA-256 and attach the key's tenant to the request.
 */
@Injectable()
export class AgentKeyGuard implements CanActivate {
  constructor(@InjectRepository(AgentKey) private readonly keys: Repository<AgentKey>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<AuthedRequest>();
    // A 401 for a bearer token tells the client which scheme to use.
    http.getResponse<Response>().setHeader('WWW-Authenticate', 'Bearer');

    const key = BEARER.exec(request.headers.authorization ?? '')?.[1];
    if (!key) {
      throw new UnauthorizedException('Send your agent key as "Authorization: Bearer <key>".');
    }
    const found = await this.keys.findOneBy({ keyHash: sha256(key) });
    if (!found) throw new UnauthorizedException('This agent key is not valid.');
    request.agent = { tenantId: found.tenantId };
    return true;
  }
}
