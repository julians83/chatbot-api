import { Test, TestingModule } from '@nestjs/testing';
import { ChatbotService } from './chatbot.service';
import { CsvService } from '../csv/csv.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { OpenAI } from 'openai';
import { AxiosResponse, AxiosHeaders } from 'axios';

describe('ChatbotService', () => {
  let service: ChatbotService;
  let csvService: CsvService;
  let httpService: HttpService;
  let configService: ConfigService;
  let openai: OpenAI;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatbotService,
        {
          provide: CsvService,
          useValue: {
            searchProducts: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('fake-api-key'),
          },
        },
      ],
    }).compile();

    service = module.get<ChatbotService>(ChatbotService);
    csvService = module.get<CsvService>(CsvService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchProducts', () => {
    it('should return products from the CSV service', async () => {
      const query = 'reloj';
      const mockProducts = 'Producto A, Producto B';
      jest.spyOn(csvService, 'searchProducts').mockResolvedValue(mockProducts);

      const result = await service['searchProducts'](query);
      expect(result).toBe(mockProducts);
      expect(csvService.searchProducts).toHaveBeenCalledWith(query);
    });
  });

  describe('convertCurrencies', () => {
    it('should convert currency using the exchange rate API', async () => {
      const mockApiResponse: AxiosResponse = {
        data: {
          rates: { EUR: 0.85 },
        },
        status: 200,
        statusText: 'OK',
        headers: new AxiosHeaders(), // Usar una instancia de AxiosHeaders
        config: { headers: new AxiosHeaders() }, // Agregar headers como una instancia válida
      };
      jest.spyOn(httpService, 'get').mockReturnValue(of(mockApiResponse));
      const result = await service['convertCurrencies']({
        amount: 100,
        fromCurrency: 'USD',
        toCurrency: 'EUR',
      });

      expect(result).toBe(85);
      expect(httpService.get).toHaveBeenCalledWith(
        'http://api.exchangeratesapi.io/v1/latest',
        {
          params: { access_key: 'fake-api-key', base: 'USD', symbols: 'EUR' },
        },
      );
    });
  });
});
