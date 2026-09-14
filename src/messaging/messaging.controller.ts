import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { AdminSendMessageDto } from './dto/admin-send-message.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { Role } from '@prisma/client';

function requireOwnMemberId(user: AuthenticatedUser): string {
  if (!user.memberId) throw new ForbiddenException('Bu hesaba bağlı bir üyelik kaydı yok');
  return user.memberId;
}

@Controller('messaging')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post('messages')
  sendMessage(@CurrentUser() user: AuthenticatedUser, @Body() dto: SendMessageDto) {
    return this.messagingService.sendMessage(requireOwnMemberId(user), dto);
  }

  @Get('conversations')
  listConversations(@CurrentUser() user: AuthenticatedUser) {
    return this.messagingService.listConversations(requireOwnMemberId(user));
  }

  @Get('conversations/:id/messages')
  getMessages(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIdPipe) id: string) {
    return this.messagingService.getMessages(requireOwnMemberId(user), id);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.messagingService.getUnreadCountForMember(requireOwnMemberId(user));
  }

  @Post('admin/messages')
  @Roles(Role.admin)
  sendMessageAsAdmin(@Body() dto: AdminSendMessageDto) {
    return this.messagingService.sendMessageAsAdmin(dto.memberId, dto.body);
  }

  @Get('admin/conversations')
  @Roles(Role.admin)
  listConversationsForAdmin() {
    return this.messagingService.listConversationsForAdmin();
  }

  @Get('admin/conversations/:id/messages')
  @Roles(Role.admin)
  getMessagesForAdmin(@Param('id', ParseIdPipe) id: string) {
    return this.messagingService.getMessagesForAdmin(id);
  }

  @Get('admin/unread-count')
  @Roles(Role.admin)
  getUnreadCountForAdmin() {
    return this.messagingService.getUnreadCountForAdmin();
  }

  @Get('notifications')
  listNotifications(@CurrentUser() user: AuthenticatedUser) {
    return this.messagingService.listNotifications(requireOwnMemberId(user));
  }

  @Patch('notifications/:id/read')
  markNotificationRead(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIdPipe) id: string) {
    return this.messagingService.markNotificationRead(requireOwnMemberId(user), id);
  }

  @Get('admin/notifications')
  @Roles(Role.admin)
  listNotificationsForAdmin() {
    return this.messagingService.listNotificationsForAdmin();
  }

  @Patch('admin/notifications/:id/read')
  @Roles(Role.admin)
  markNotificationReadForAdmin(@Param('id', ParseIdPipe) id: string) {
    return this.messagingService.markNotificationReadForAdmin(id);
  }
}
