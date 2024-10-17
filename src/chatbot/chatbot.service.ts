// src/chatbot/chatbot.service.ts
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { OpenAI } from 'openai';
import { AxiosResponse } from 'axios';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { ChatbotResponseDto } from './dto/chatbot-response.dto';
import { TokenUsageDto } from './dto/token-usage.dto';
import { CsvService } from 'src/csv/csv.service';
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
    );

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not defined in environment variables');
    }

    if (!organizationId) {
      this.logger.warn(
        'OPENAI_ORGANIZATION_ID is not defined in environment variables',
      );
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
      organization: organizationId || '',
    });
  }

  async processQuery(
    queryRequest: ChatbotRequestDto,
  ): Promise<ChatbotResponseDto> {
    try {
      const { query } = queryRequest;
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo-0125',
        messages: [{ role: 'user', content: query }],
        function_call: 'auto',
        functions: [
          {
            name: 'searchProducts',
            description:
              'Search for products by name and retrieve specific characteristics such as price or other features (e.g., availability, color). If the user requests a product and asks for the price, return the product name and set "price" to true. If the user requests another characteristic (such as availability or color), set "caracteristica" to true. For queries involving prices in different currencies, identify the currency if mentioned and rely on a currency conversion function if necessary.',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      description:
                        'The name of the product being searched for. Example: "watch".',
                    },
                    price: {
                      type: 'boolean',
                      description:
                        'Set to true if the user is asking for the price of the product.',
                    },
                    actions: {
                      type: 'string',
                      description:
                        'Set to true if the user is asking about of the currency in the query.',
                    },
                  },
                  required: ['name'],
                  description:
                    'An object that identifies the product name and whether the user is asking for the price or other characteristics. Example: { name: "watch", price: true, caracteristica: false }.',
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
                amount: {
                  type: 'number',
                  description: 'Amount to convert',
                },
                fromCurrency: {
                  type: 'string',
                  description: 'Source currency code (e.g., USD)',
                },
                toCurrency: {
                  type: 'string',
                  description: 'Target currency code (e.g., EUR)',
                },
              },
              required: ['amount', 'fromCurrency', 'toCurrency'],
            },
          },
        ],
      });
      const message = response.choices[0].message;
      const tokenUsage: TokenUsageDto = {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      };

      let result: string;

      if (message?.function_call) {
        const { name, arguments: args } = message.function_call;
        const parsedArgs = JSON.parse(args);
        switch (name) {
          case 'searchProducts':
            const products = await this.searchProducts(parsedArgs.query);
            result = `Products found: ${products}`;
            break;

          case 'convertCurrencies':
            const convertedAmount = await this.convertCurrencies(parsedArgs);
            result = `${message.content} Converted amount: ${convertedAmount.toFixed(2)}`;
            break;

          default:
            throw new Error(`Unknown function: ${name}`);
        }
      } else {
        result = message.content || 'No response generated';
      }

      this.logger.log(
        `Token usage - Prompt: ${tokenUsage.promptTokens}, Completion: ${tokenUsage.completionTokens}, Total: ${tokenUsage.totalTokens}`,
      );

      return {
        response: result,
      };
    } catch (error) {
      this.logger.error(
        `Error processing query: ${error.message}`,
        error.stack,
      );

      if (error.status === 429) {
        throw new HttpException(
          'API quota exceeded. Please try again later or check your OpenAI account balance.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      if (error.status === 401) {
        throw new HttpException(
          'Invalid API key. Please check your OpenAI credentials.',
          HttpStatus.UNAUTHORIZED,
        );
      }

      if (error.status === 404) {
        throw new HttpException(
          'The requested AI model is not available. Please contact support.',
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
        'An error occurred while processing your request. Please try again later.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async searchProducts(query: string): Promise<string> {
    try {
      const products = await this.csvService.searchProducts(query);
      return products;
    } catch (error) {
      this.logger.error(`Error searching products: ${error.message}`);
      throw new HttpException(
        'Error searching products',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async convertCurrencies({
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
      this.logger.error(`Error converting currencies: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error converting currencies',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
