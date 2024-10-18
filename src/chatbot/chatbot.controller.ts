import { Controller, Post, Body } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ChatbotRequestDto } from './dto/chatbot-request.dto';
import { ChatbotResponseDto } from './dto/chatbot-response.dto';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post()
  @ApiOperation({ summary: 'Process chatbot query' })
  @ApiResponse({
    status: 200,
    description: 'Query processed successfully',
    type: ChatbotResponseDto,
  })
  async handleChatbotRequest(
    @Body() chatbotRequestDto: ChatbotRequestDto,
  ): Promise<ChatbotResponseDto> {
    return await this.chatbotService.processQuery(chatbotRequestDto);
  }
}
