import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Message, Role } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../auth/auth.types';

const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',').map((origin) => origin.trim());

function extractCookieToken(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

@Injectable()
@WebSocketGateway({ cors: { origin: corsOrigins, credentials: true } })
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    const payload = this.authenticate(client);
    if (!payload) {
      client.disconnect(true);
      return;
    }
    if (payload.role === Role.admin) {
      client.join('admin');
    } else if (payload.memberId) {
      client.join(`member:${payload.memberId}`);
    } else {
      client.disconnect(true);
    }
  }

  handleDisconnect() {
    // Odalar Socket.IO tarafından bağlantı kapanınca otomatik temizlenir.
  }

  private authenticate(client: Socket): JwtPayload | null {
    const cookieToken = extractCookieToken(client.handshake.headers.cookie, 'access_token');
    const bearerToken = client.handshake.auth?.token as string | undefined;
    const token = cookieToken ?? bearerToken;
    if (!token) return null;
    try {
      return this.jwtService.verify<JwtPayload>(token, { secret: this.config.get<string>('JWT_SECRET') });
    } catch {
      return null;
    }
  }

  emitNewMessage(message: Message, recipientMemberId: string) {
    this.server.to(`member:${recipientMemberId}`).emit('new-message', message);
    this.server.to('admin').emit('new-message', message);
  }

  emitUnreadCountChanged(memberId: string) {
    this.server.to(`member:${memberId}`).emit('unread-count-changed');
  }

  emitAdminUnreadCountChanged() {
    this.server.to('admin').emit('unread-count-changed');
  }
}
