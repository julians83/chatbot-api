// src/chatbot/chatbot.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { CsvService } from 'src/csv/csv.service';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [ChatbotController],
  providers: [ChatbotService, CsvService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
