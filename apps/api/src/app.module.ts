import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Attraction,
  Badge,
  CheckIn,
  FastPassReservation,
  Slot,
  Ticket,
  User,
  UserBadge,
} from './entities/entities';
import { AuthModule } from './auth/auth.module';
import { AttractionsModule } from './attractions/attractions.module';
import { TicketsModule } from './tickets/tickets.module';
import { FastPassModule } from './fastpass/fastpass.module';
import { GamificationModule } from './gamification/gamification.module';
import { AdminModule } from './admin/admin.module';
import { SeedModule } from './seed/seed.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbType = config.get<string>('DATABASE_TYPE', 'better-sqlite3');
        if (dbType === 'postgres') {
          return {
            type: 'postgres',
            url: config.get<string>('DATABASE_URL'),
            entities: [User, Attraction, CheckIn, Ticket, FastPassReservation, Badge, UserBadge, Slot],
            synchronize: true,
            ssl: { rejectUnauthorized: false },
          } as any;
        }
        return {
          type: 'better-sqlite3',
          database: config.get<string>('DATABASE_PATH', 'data/thrillville.db'),
          entities: [User, Attraction, CheckIn, Ticket, FastPassReservation, Badge, UserBadge, Slot],
          synchronize: true,
        } as any;
      },
    }),
    AuthModule,
    AttractionsModule,
    TicketsModule,
    FastPassModule,
    GamificationModule,
    AdminModule,
    SeedModule,
  ],
})
export class AppModule {}
