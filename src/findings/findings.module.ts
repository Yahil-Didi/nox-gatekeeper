import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Finding } from '../database/entities';
import { FindingsController } from './findings.controller';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Finding])],
  controllers: [FindingsController],
})
export class FindingsModule {}
