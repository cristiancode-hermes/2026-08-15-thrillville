import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attraction, CheckIn, FastPassReservation } from '../entities/entities';
import { AuthModule } from '../auth/auth.module';
import { AttractionsController } from './attractions.controller';
import { AttractionsService } from './attractions.service';
import { WaitService } from './wait.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attraction, CheckIn, FastPassReservation]),
    AuthModule,
  ],
  controllers: [AttractionsController],
  providers: [AttractionsService, WaitService],
  exports: [WaitService],
})
export class AttractionsModule {}
