import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attraction, CheckIn, FastPassReservation, Ticket } from '../entities/entities';
import { AuthModule } from '../auth/auth.module';
import { AttractionsModule } from '../attractions/attractions.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CheckIn, Ticket, FastPassReservation, Attraction]),
    AuthModule,
    AttractionsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
