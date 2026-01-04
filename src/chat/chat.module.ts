import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [ChatGateway, ChatService],
})
export class ChatModule { }
