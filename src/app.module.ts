import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatbotModule } from './chatbot/chatbot.module';
import { ConfigModule } from '@nestjs/config';
import { CsvService } from './csv/csv.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ChatbotModule,
  ],
  controllers: [AppController],
  providers: [AppService, CsvService],
})
export class AppModule {}
