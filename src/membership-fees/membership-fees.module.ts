import { Module } from '@nestjs/common';
import { MembershipFeesController } from './membership-fees.controller';
import { MembershipFeesService } from './membership-fees.service';

@Module({
  controllers: [MembershipFeesController],
  providers: [MembershipFeesService],
  exports: [MembershipFeesService],
})
export class MembershipFeesModule {}
