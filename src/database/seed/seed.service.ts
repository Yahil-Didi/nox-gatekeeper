import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { hashPassword } from '../../common/crypto';
import { keyParts } from '../../agent-keys/agent-key.utils';
import { AgentKey, Tenant, User } from '../entities';
import { SEED_TENANTS, SeedTenant } from './seed-data';

/** Loads the demo tenants on the first start, when the database has no tenants yet. */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    if (await this.dataSource.getRepository(Tenant).exists()) return;
    await this.dataSource.transaction(async (em) => {
      for (const tenant of SEED_TENANTS) await this.seedTenant(em, tenant);
    });
    this.logger.log(`Seeded ${SEED_TENANTS.length} tenants`);
  }

  private async seedTenant(em: EntityManager, seed: SeedTenant): Promise<void> {
    const tenant = await em.save(Tenant, { name: seed.name, policy: { rules: seed.rules } });
    for (const { email, password, role } of seed.users) {
      const passwordHash = await hashPassword(password);
      await em.save(User, { tenantId: tenant.id, email, passwordHash, role });
    }
    await em.save(AgentKey, {
      tenantId: tenant.id,
      name: 'Default key',
      ...keyParts(seed.agentKey),
    });
  }
}
