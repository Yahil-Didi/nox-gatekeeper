import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { Role } from '../database/entities';

/** Who called, taken from the agent key. The tenant never comes from the request body. */
export interface AgentCaller {
  tenantId: string;
}

/** The signed-in person (admin or viewer), taken from the session cookie. */
export interface SignedInUser {
  userId: string;
  tenantId: string;
  role: Role;
  tokenHash: string;
}

export type AuthedRequest = Request & { agent?: AgentCaller; signedIn?: SignedInUser };

/** The caller a guard attached to the request. */
export const CurrentAgent = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<AuthedRequest>().agent,
);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<AuthedRequest>().signedIn,
);
