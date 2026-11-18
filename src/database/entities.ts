import { Column, CreateDateColumn, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';
import type { Rule } from '../policy/policy.types';

/** Every table except tenants has a tenant_id, and every query filters by it. */

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  name: string;

  /** The tenant's one policy, in the brief's format. */
  @Column({ type: 'jsonb' })
  policy: { rules: Rule[] };
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ type: 'text', unique: true })
  email: string;

  /** scrypt hash with its salt; the password itself is never stored. */
  @Column({ name: 'password_hash', type: 'text' })
  passwordHash: string;

  @Column({ type: 'text' })
  role: Role;
}

/** admin: sees and changes. viewer: sees everything, changes nothing. */
export type Role = 'admin' | 'viewer';

/** An admin's sign-in. Only the SHA-256 of the cookie token is stored. */
@Entity('sessions')
export class Session {
  @PrimaryColumn({ name: 'token_hash', type: 'char', length: 64 })
  tokenHash: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;
}

/** An agent key. Only its SHA-256 is stored; the key itself is shown once, when it's created. */
@Entity('agent_keys')
export class AgentKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ type: 'text' })
  name: string;

  /** The first characters, e.g. "nox_3f9c2b7e", so admins can tell keys apart. */
  @Column({ type: 'text' })
  prefix: string;

  @Column({ name: 'key_hash', type: 'char', length: 64, unique: true })
  keyHash: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

/** One answer to an agent. The URL is kept only as scheme, host and port. */
@Entity('decisions')
export class DecisionRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ type: 'text' })
  agent: string;

  @Column({ name: 'user_email', type: 'text' })
  userEmail: string;

  @Column({ type: 'text' })
  workspace: string;

  @Column({ type: 'text' })
  program: string;

  @Column({ type: 'text' })
  method: string;

  @Column({ type: 'text' })
  destination: string;

  @Column({ type: 'text' })
  outcome: string;

  @Column({ name: 'rule_id', type: 'text', nullable: true })
  ruleId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

/** One row per problem: retries of the same denied action raise `count`, not new rows. */
@Entity('findings')
export class Finding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ type: 'text' })
  agent: string;

  @Column({ name: 'user_email', type: 'text' })
  userEmail: string;

  @Column({ type: 'text' })
  workspace: string;

  @Column({ type: 'text' })
  program: string;

  @Column({ type: 'text' })
  destination: string;

  @Column({ name: 'rule_id', type: 'text', nullable: true })
  ruleId: string | null;

  /** The message the agent got, so the admin reads the same reason. */
  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'int' })
  count: number;

  @Column({ name: 'last_seen', type: 'timestamptz' })
  lastSeen: Date;
}

export const ENTITIES = [Tenant, User, Session, AgentKey, DecisionRecord, Finding];
