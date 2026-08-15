import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attraction, Badge, CheckIn, UserBadge } from '../entities/entities';
import { AuthModule } from '../auth/auth.module';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CheckIn, Attraction, Badge, UserBadge]),
    AuthModule,
  ],
  controllers: [GamificationController],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
