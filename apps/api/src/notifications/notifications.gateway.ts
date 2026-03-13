import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

const realtimeOrigins = (
  process.env.CORS_ORIGINS ??
  process.env.FRONTEND_URL ??
  'http://localhost:3000,http://localhost:3001'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: realtimeOrigins, credentials: true },
})
export class NotificationsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    const token =
      (client.handshake.auth?.token as string) ||
      (client.handshake.query?.token as string);
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const payload = this.jwt.verify(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }) as { sub: string };
      client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  /** Appelé depuis les services pour pousser une notif au bon salon */
  pushToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  @SubscribeMessage('ping')
  ping(@ConnectedSocket() client: Socket, @MessageBody() data: unknown) {
    client.emit('pong', data);
  }
}
