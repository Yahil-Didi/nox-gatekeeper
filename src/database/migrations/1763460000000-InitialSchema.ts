import { MigrationInterface, QueryRunner } from 'typeorm';

const UP = [
  // A company. Its policy is one JSON document in the brief's format, read whole on every decision.
  `CREATE TABLE tenants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    policy jsonb NOT NULL
  )`,
  `CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    -- admin: sees and changes. viewer: sees everything, changes nothing.
    role text NOT NULL CHECK (role IN ('admin', 'viewer'))
  )`,
  `CREATE TABLE sessions (
    token_hash char(64) PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL
  )`,
  // Only the SHA-256 is stored. The prefix ("nox_3f9c2b7e") lets admins tell keys apart.
  // Revoking a key deletes its row, so it stops working at once.
  `CREATE TABLE agent_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    prefix text NOT NULL,
    key_hash char(64) NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE decisions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_email text NOT NULL,
    agent text NOT NULL,
    workspace text NOT NULL,
    program text NOT NULL,
    method text NOT NULL,
    destination text NOT NULL,
    outcome text NOT NULL,
    rule_id text,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE findings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_email text NOT NULL,
    agent text NOT NULL,
    workspace text NOT NULL,
    program text NOT NULL,
    destination text NOT NULL,
    rule_id text,
    message text NOT NULL,
    count int NOT NULL,
    last_seen timestamptz NOT NULL,
    -- One row per who + what + why. NULLS NOT DISTINCT so default denies (rule_id NULL) group too.
    CONSTRAINT uq_findings_problem UNIQUE NULLS NOT DISTINCT
      (tenant_id, user_email, agent, workspace, program, destination, rule_id)
  )`,
  `CREATE INDEX idx_findings_tenant_last_seen ON findings (tenant_id, last_seen DESC)`,
];

const DOWN = ['findings', 'decisions', 'agent_keys', 'sessions', 'users', 'tenants'].map(
  (table) => `DROP TABLE ${table}`,
);

export class InitialSchema1763460000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    for (const sql of UP) await queryRunner.query(sql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const sql of DOWN) await queryRunner.query(sql);
  }
}
