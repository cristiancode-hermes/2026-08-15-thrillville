import { Module } from '@nestjs/common';
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
} from '../entities/entities';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Attraction, CheckIn, Ticket, FastPassReservation, Badge, UserBadge, Slot]),
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
