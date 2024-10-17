import { ApiProperty } from '@nestjs/swagger';

export class ChatbotResponseDto {
  @ApiProperty()
  response: string;
}
