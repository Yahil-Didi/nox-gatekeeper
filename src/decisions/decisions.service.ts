import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AgentCaller } from '../auth/auth.types';
import { DecisionRecord, Tenant } from '../database/entities';
import { evaluate, InvalidUrlError } from '../policy/evaluate';
import { Decision } from '../policy/policy.types';
import { DecisionRequestDto } from './decision-request.dto';

/**
 * A finding is one row per who + what + why (the unique key in the migration). A retry hits the
 * same key, so it raises the count instead of adding a row.
 */
const UPSERT_FINDING = `
  INSERT INTO findings (tenant_id, user_email, agent, workspace, program, destination, rule_id,
                        message, count, last_seen)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, now())
  ON CONFLICT (tenant_id, user_email, agent, workspace, program, destination, rule_id)
  DO UPDATE SET count = findings.count + 1, last_seen = now(), message = EXCLUDED.message`;

@Injectable()
export class DecisionsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
  ) {}

  /** Evaluates with the caller's own policy, records the decision, and raises a finding if denied. */
  async decide(caller: AgentCaller, body: DecisionRequestDto) {
    const tenant = await this.tenants.findOneByOrFail({ id: caller.tenantId });
    const decision = this.evaluate(tenant, body);
    const record = toRecord(caller, body, decision);

    const saved = await this.dataSource.transaction(async (em) => {
      const row = await em.save(DecisionRecord, record);
      if (decision.outcome === 'denied') {
        const { tenantId, userEmail, agent, workspace, program, destination, ruleId } = row;
        const key = [tenantId, userEmail, agent, workspace, program, destination, ruleId];
        await em.query(UPSERT_FINDING, [...key, decision.message]);
      }
      return row;
    });
    return {
      id: saved.id,
      outcome: decision.outcome,
      ruleId: decision.ruleId,
      message: decision.message,
    };
  }

  /** A URL we can't evaluate is the caller's mistake: 400, not 500. */
  private evaluate(tenant: Tenant, body: DecisionRequestDto): Decision {
    try {
      return evaluate(tenant.policy, body);
    } catch (err) {
      if (err instanceof InvalidUrlError) throw new BadRequestException(err.message);
      throw err;
    }
  }
}

/** What an admin needs, and nothing more: the URL is kept as scheme, host and port only. */
const toRecord = (caller: AgentCaller, body: DecisionRequestDto, decision: Decision) => ({
  tenantId: caller.tenantId,
  agent: body.agent,
  userEmail: body.user,
  workspace: body.workspace,
  program: decision.target.program,
  method: body.method.toUpperCase(),
  destination: `${decision.target.scheme}://${decision.target.hostLabel}`,
  outcome: decision.outcome,
  ruleId: decision.ruleId,
});
