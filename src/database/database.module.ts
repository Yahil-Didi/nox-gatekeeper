import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { config } from '../config';
import { ENTITIES } from './entities';
import { InitialSchema1763460000000 } from './migrations/1763460000000-InitialSchema';
import { SeedService } from './seed/seed.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...config.db,
      entities: ENTITIES,
      migrations: [InitialSchema1763460000000],
      migrationsRun: true,
      synchronize: false,
    }),
  ],
  providers: [SeedService],
})
export class DatabaseModule {}
