import { Module } from '@nestjs/common';
import { AgentKeysModule } from './agent-keys/agent-keys.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { DecisionsModule } from './decisions/decisions.module';
import { FindingsModule } from './findings/findings.module';

@Module({
  imports: [DatabaseModule, AuthModule, DecisionsModule, FindingsModule, AgentKeysModule],
})
export class AppModule {}
