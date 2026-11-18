import type { Role } from '../entities';
import type { Rule } from '../../policy/policy.types';

/**
 * Demo tenants. The passwords and agent keys are demo values, printed in the README so reviewers
 * can try the service. Only their hashes go into the database.
 */
export interface SeedTenant {
  name: string;
  users: { email: string; password: string; role: Role }[];
  agentKey: string;
  rules: Rule[];
}

export const SEED_TENANTS: SeedTenant[] = [
  {
    name: 'Acme',
    users: [
      { email: 'admin@acme.dev', password: 'acme-demo-password', role: 'admin' },
      { email: 'viewer@acme.dev', password: 'acme-viewer-password', role: 'viewer' },
    ],
    agentKey: 'nox_acme_demo_3f9c2b7e41d8a6c05e2f',
    rules: [
      {
        id: 'github',
        action: 'allow',
        hosts: ['github.com', 'api.github.com'],
        programs: ['git', 'gh'],
        reason: 'GitHub, only from git and gh',
      },
      {
        id: 'registries',
        action: 'allow',
        hosts: ['registry.npmjs.org', 'pypi.org'],
        access: 'read',
        reason: 'Install only, publishing is refused',
      },
      {
        id: 'outside',
        action: 'deny',
        hosts: ['pastebin.com', '**.ngrok.io', '169.254.169.254'],
        reason: 'Paste, tunnel and metadata services are never reachable',
      },
    ],
  },
  {
    name: 'Globex',
    users: [
      { email: 'admin@globex.dev', password: 'globex-demo-password', role: 'admin' },
      { email: 'viewer@globex.dev', password: 'globex-viewer-password', role: 'viewer' },
    ],
    agentKey: 'nox_globex_demo_8a1d5e0c97b34f62d1aa',
    rules: [
      {
        id: 'source-control',
        action: 'allow',
        hosts: ['gitlab.com'],
        programs: ['git'],
        reason: 'GitLab, only from git',
      },
      {
        id: 'internal',
        action: 'allow',
        hosts: ['**.globex.internal'],
        reason: 'Internal services',
      },
      {
        id: 'never',
        action: 'deny',
        hosts: ['pastebin.com', '169.254.169.254'],
        reason: 'Paste sites and the cloud metadata service are never reachable',
      },
    ],
  },
];
