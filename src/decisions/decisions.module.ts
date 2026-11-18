import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Tenant } from '../database/entities';
import { DecisionsController } from './decisions.controller';
import { DecisionsService } from './decisions.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Tenant])],
  controllers: [DecisionsController],
  providers: [DecisionsService],
})
export class DecisionsModule {}
