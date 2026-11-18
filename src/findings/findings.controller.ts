import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser, SignedInUser } from '../auth/auth.types';
import { SessionGuard } from '../auth/session.guard';
import { Finding } from '../database/entities';

/** The signed-in person's findings: only their tenant's, most recent first. Viewers too. */
@Controller('api/v1/findings')
@UseGuards(SessionGuard)
export class FindingsController {
  constructor(@InjectRepository(Finding) private readonly findings: Repository<Finding>) {}

  @Get()
  async list(@CurrentUser() signedIn: SignedInUser) {
    const rows = await this.findings.find({
      where: { tenantId: signedIn.tenantId },
      order: { lastSeen: 'DESC' },
      take: 200,
    });
    return rows.map(({ id, agent, userEmail, workspace, program, destination, ...row }) => ({
      id,
      who: { user: userEmail, agent, workspace },
      what: { program, destination },
      why: { ruleId: row.ruleId, byDefault: row.ruleId === null, message: row.message },
      count: row.count,
      lastSeen: row.lastSeen,
    }));
  }
}
