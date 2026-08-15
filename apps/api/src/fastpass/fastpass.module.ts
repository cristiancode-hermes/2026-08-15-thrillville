import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attraction, CheckIn, FastPassReservation, Slot } from '../entities/entities';
import { AuthModule } from '../auth/auth.module';
import { GamificationModule } from '../gamification/gamification.module';
import { FastPassController } from './fastpass.controller';
import { FastPassService } from './fastpass.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([FastPassReservation, Slot, Attraction, CheckIn]),
    AuthModule,
    GamificationModule,
  ],
  controllers: [FastPassController],
  providers: [FastPassService],
  exports: [FastPassService],
})
export class FastPassModule {}
