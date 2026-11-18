import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThan, Repository } from 'typeorm';
import { hashPassword, randomToken, sha256, verifyPassword } from '../common/crypto';
import { config } from '../config';
import { Session, Tenant, User } from '../database/entities';
import { SignedInUser } from './auth.types';

const BAD_CREDENTIALS = 'Email or password is incorrect.';

@Injectable()
export class SessionsService {
  /** Compared against when the email is unknown, so a wrong email takes as long as a wrong password. */
  private readonly dummyHash = hashPassword('not-a-real-password');

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
  ) {}

  /** Checks the password and starts a session. Returns the raw token for the cookie. */
  async signIn(email: string, password: string): Promise<{ token: string; expiresAt: Date }> {
    const user = await this.users.findOneBy({ email: email.toLowerCase() });
    const valid = await verifyPassword(password, user?.passwordHash ?? (await this.dummyHash));
    if (!user || !valid) throw new UnauthorizedException(BAD_CREDENTIALS);

    await this.sessions.delete({ expiresAt: LessThan(new Date()) });
    const token = randomToken();
    const expiresAt = new Date(Date.now() + config.session.ttlMs);
    await this.sessions.insert({ tokenHash: sha256(token), userId: user.id, expiresAt });
    return { token, expiresAt };
  }

  /** The person behind a cookie token, or null if the session is unknown or expired. */
  async findActive(token: string): Promise<SignedInUser | null> {
    const tokenHash = sha256(token);
    const session = await this.sessions.findOneBy({ tokenHash, expiresAt: MoreThan(new Date()) });
    if (!session) return null;
    const user = await this.users.findOneByOrFail({ id: session.userId });
    return { userId: user.id, tenantId: user.tenantId, role: user.role, tokenHash };
  }

  async signOut(tokenHash: string): Promise<void> {
    await this.sessions.delete({ tokenHash });
  }

  async describe(signedIn: SignedInUser) {
    const user = await this.users.findOneByOrFail({ id: signedIn.userId });
    const tenant = await this.tenants.findOneByOrFail({ id: signedIn.tenantId });
    return { email: user.email, tenant: tenant.name, role: user.role };
  }
}
