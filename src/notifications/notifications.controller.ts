import { Body, Controller, Delete, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';
import { UnregisterDeviceTokenDto } from './dto/unregister-device-token.dto';

@Controller('device-tokens')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  register(@Body() dto: RegisterDeviceTokenDto) {
    return this.notificationsService.registerToken(dto);
  }

  @Delete()
  unregister(@Body() dto: UnregisterDeviceTokenDto) {
    return this.notificationsService.unregisterToken(dto.token);
  }
}
