import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentKey, Session, Tenant, User } from '../database/entities';
import { AdminOnlyGuard } from './admin-only.guard';
import { AgentKeyGuard } from './agent-key.guard';
import { SessionGuard } from './session.guard';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [TypeOrmModule.forFeature([AgentKey, Session, Tenant, User])],
  controllers: [SessionsController],
  providers: [SessionsService, SessionGuard, AdminOnlyGuard, AgentKeyGuard],
  exports: [SessionsService, SessionGuard, AdminOnlyGuard, AgentKeyGuard, TypeOrmModule],
})
export class AuthModule {}
