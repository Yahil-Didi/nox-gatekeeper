import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Repository } from 'typeorm';
import { AdminOnlyGuard } from '../auth/admin-only.guard';
import { CurrentUser, SignedInUser } from '../auth/auth.types';
import { SessionGuard } from '../auth/session.guard';
import { AgentKey } from '../database/entities';
import { keyParts, newAgentKey } from './agent-key.utils';

class CreateKeyDto {
  /** What the key is for, e.g. "Laptops" or "CI". */
  @MaxLength(100)
  @IsString()
  @IsNotEmpty()
  name: string;
}

/** Shown in lists: never the key or its hash. */
const toView = ({ id, name, prefix, createdAt }: AgentKey) => ({ id, name, prefix, createdAt });

/**
 * The tenant's agent keys. Everyone signed in can list them; only admins can create or revoke.
 * Every query is scoped to the caller's tenant.
 */
@Controller('api/v1/agent-keys')
@UseGuards(SessionGuard)
export class AgentKeysController {
  constructor(@InjectRepository(AgentKey) private readonly keys: Repository<AgentKey>) {}

  @Get()
  async list(@CurrentUser() user: SignedInUser) {
    const keys = await this.keys.find({
      where: { tenantId: user.tenantId },
      order: { createdAt: 'ASC' },
    });
    return keys.map(toView);
  }

  /** Returns the key once. Only its hash is stored, so it can't be shown again. */
  @Post()
  @UseGuards(AdminOnlyGuard)
  async create(@CurrentUser() user: SignedInUser, @Body() body: CreateKeyDto) {
    const key = newAgentKey();
    const saved = await this.keys.save({
      tenantId: user.tenantId,
      name: body.name,
      ...keyParts(key),
    });
    return { ...toView(saved), key };
  }

  /** Revoking deletes the key, so the next request with it gets 401. */
  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AdminOnlyGuard)
  async revoke(@CurrentUser() user: SignedInUser, @Param('id', ParseUUIDPipe) id: string) {
    const { affected } = await this.keys.delete({ id, tenantId: user.tenantId });
    if (!affected) throw new NotFoundException('No such key in your organization.');
  }
}
