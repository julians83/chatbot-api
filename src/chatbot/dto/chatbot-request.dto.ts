import { ApiProperty } from '@nestjs/swagger';
export class ChatbotRequestDto {
  @ApiProperty()
  query: string;
}
