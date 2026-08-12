import { Controller, Get } from '@nestjs/common';
import { MembersService } from '../members/members.service';
import { EventsService } from '../events/events.service';
import { SECTORS } from '../common/constants/sector.constant';

@Controller('stats')
export class StatsController {
  constructor(
    private readonly membersService: MembersService,
    private readonly eventsService: EventsService,
  ) {}

  @Get()
  async get() {
    const [approvedMembersCount, eventsCount] = await Promise.all([
      this.membersService.countApproved(),
      this.eventsService.count(),
    ]);

    return {
      approvedMembersCount,
      sectorsCount: SECTORS.length,
      eventsCount,
    };
  }
}
