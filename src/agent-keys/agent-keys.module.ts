import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AgentKeysController } from './agent-keys.controller';

@Module({
  imports: [AuthModule],
  controllers: [AgentKeysController],
})
export class AgentKeysModule {}
