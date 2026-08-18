import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MembershipFeesController } from './membership-fees.controller';
import { MembershipFeesService } from './membership-fees.service';
import { MembershipFee, MembershipFeeSchema } from './schemas/membership-fee.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: MembershipFee.name, schema: MembershipFeeSchema }])],
  controllers: [MembershipFeesController],
  providers: [MembershipFeesService],
  exports: [MembershipFeesService],
})
export class MembershipFeesModule {}
