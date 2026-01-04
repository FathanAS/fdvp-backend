
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseModule } from './firebase/firebase.module';
import { EventsModule } from './events/events.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { UsersModule } from './users/users.module';
import { ChatModule } from './chat/chat.module';
import { ChatGateway } from './chat/chat.gateway';
import { ChatController } from './chat/chat.controller';

import { DashboardModule } from './dashboard/dashboard.module';
import { SeederModule } from './seeder/seeder.module';
import { EmailModule } from './email/email.module';
import { AuthModule } from './auth/auth.module';
import { TicketsModule } from './tickets/tickets.module';
import { ActivityLoggerModule } from './activity-logger/activity-logger.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    FirebaseModule,
    ActivityLoggerModule, // Global activity logger
    EventsModule,
    RegistrationsModule,
    UsersModule,
    ChatModule,
    DashboardModule,
    SeederModule,
    AuthModule,
    EmailModule,
    TicketsModule
  ],
  controllers: [AppController, ChatController],
  providers: [AppService, ChatGateway],
})
export class AppModule { }