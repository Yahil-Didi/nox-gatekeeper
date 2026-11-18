import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AgentKeyGuard } from '../auth/agent-key.guard';
import { AgentCaller, CurrentAgent } from '../auth/auth.types';
import { DecisionRequestDto } from './decision-request.dto';
import { DecisionsService } from './decisions.service';

/** Agents ask here before they act. Every decision is recorded, so it returns 201 Created. */
@Controller('api/v1/decisions')
@UseGuards(AgentKeyGuard)
export class DecisionsController {
  constructor(private readonly decisions: DecisionsService) {}

  @Post()
  decide(@CurrentAgent() caller: AgentCaller, @Body() body: DecisionRequestDto) {
    return this.decisions.decide(caller, body);
  }
}
