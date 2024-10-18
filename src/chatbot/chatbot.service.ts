import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { OpenAI } from 'openai';
import { AxiosResponse } from 'axios';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { ChatbotResponseDto } from './dto/chatbot-response.dto';
import { TokenUsageDto } from './dto/token-usage.dto';
import { CsvService } from '../csv/csv.service';
import { CurrencyConversionInterface } from './interfaces/currencyConversion.interface';
import { ChatbotRequestDto } from './dto/chatbot-request.dto';

@Injectable()
export class ChatbotService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly csvService: CsvService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const organizationId = this.configService.get<string>(
      'OPENAI_ORGANIZATION_ID',
      '',
    );

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not defined in environment variables');
    }

    if (!organizationId) {
      this.logger.warn(
        'OPENAI_ORGANIZATION_ID is not defined in environment variables',
      );
    }

    this.openai = new OpenAI({ apiKey, organization: organizationId });
  }

  async processQuery(
    queryRequest: ChatbotRequestDto,
  ): Promise<ChatbotResponseDto> {
    const { query } = queryRequest;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo-0125',
        messages: [{ role: 'user', content: query }],
        function_call: 'auto',
        functions: [
          {
            name: 'searchProducts',
            description:
              'Search for products by name and retrieve specific characteristics...',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Product name' },
                    price: {
                      type: 'boolean',
                      description: 'Set to true for price inquiries',
                    },
                  },
                  required: ['name'],
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'convertCurrencies',
            description: 'Convert currencies using exchange rates',
            parameters: {
              type: 'object',
              properties: {
                amount: { type: 'number', description: 'Amount to convert' },
                fromCurrency: {
                  type: 'string',
                  description: 'Source currency',
                },
                toCurrency: { type: 'string', description: 'Target currency' },
              },
              required: ['amount', 'fromCurrency', 'toCurrency'],
            },
          },
        ],
      });

      const message = response.choices[0].message;
      const usage = response.usage;
      const tokenUsage: TokenUsageDto = {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      };

      let result: string;

      if (message?.function_call) {
        const { name, arguments: args } = message.function_call;
        const parsedArgs = JSON.parse(args);

        if (name === 'searchProducts') {
          const products = await this.searchProducts(parsedArgs.query);
          result = `Products found: ${products}`;
        } else if (name === 'convertCurrencies') {
          const convertedAmount = await this.convertCurrencies(parsedArgs);
          result = `Converted amount: ${convertedAmount.toFixed(2)}`;
        } else {
          throw new Error(`Unknown function: ${name}`);
        }
      } else {
        result = message?.content || 'No response generated';
      }

      this.logger.log(
        `Token usage - Prompt: ${tokenUsage.promptTokens}, Completion: ${tokenUsage.completionTokens}, Total: ${tokenUsage.totalTokens}`,
      );

      return { response: result };
    } catch (error) {
      this.handleErrors(error);
    }
  }

  private async searchProducts(query: string): Promise<string> {
    try {
      return await this.csvService.searchProducts(query);
    } catch (error) {
      this.logger.error(`Error searching products: ${error?.message}`);
      throw new HttpException(
        'Error searching products',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async convertCurrencies({
    amount,
    fromCurrency,
    toCurrency,
  }: CurrencyConversionInterface): Promise<number> {
    try {
      const apiKey = this.configService.get<string>('EXCHANGE_API_KEY');
      if (!apiKey) {
        throw new HttpException(
          'Exchange rate service is not configured',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      const response: AxiosResponse = await lastValueFrom(
        this.httpService.get('http://api.exchangeratesapi.io/v1/latest', {
          params: {
            access_key: apiKey,
            base: fromCurrency,
            symbols: toCurrency,
          },
        }),
      );

      const rate = response.data?.rates?.[toCurrency];
      if (!rate) {
        throw new HttpException(
          `Exchange rate not found for ${toCurrency}`,
          HttpStatus.NOT_FOUND,
        );
      }

      return amount * rate;
    } catch (error) {
      this.logger.error(`Error converting currencies: ${error?.message}`);
      this.handleErrors(error);
    }
  }

  private handleErrors(error: any) {
    if (error.status === 429) {
      throw new HttpException(
        'API quota exceeded. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (error.status === 401) {
      throw new HttpException(
        'Invalid API key. Check your OpenAI credentials.',
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (error.status === 404) {
      throw new HttpException(
        'AI model not found. Contact support.',
        HttpStatus.NOT_FOUND,
      );
    }
    if (error.response?.data?.error?.message) {
      throw new HttpException(
        error.response.data.error.message,
        error.response.status || HttpStatus.BAD_REQUEST,
      );
    }
    throw new HttpException(
      'An error occurred. Try again later.',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
