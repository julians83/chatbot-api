import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as csvParser from 'csv-parser';
import { promisify } from 'util';
import { pipeline } from 'stream';

@Injectable()
export class CsvService {
  private readonly logger = new Logger(CsvService.name);

  async searchProducts(query: any): Promise<any> {
    const products: any[] = [];

    try {
      const pipelineAsync = promisify(pipeline);
      await pipelineAsync(
        fs.createReadStream('./src/data/products_list.csv'),
        csvParser(),
        async (source) => {
          for await (const row of source) {
            if (
              row.displayTitle
                ?.toLowerCase()
                .includes(query?.name?.toLowerCase())
            ) {
              products.push(row);
            }
          }
        },
      );
      const productNames = products
        .slice(0, 2)
        .map((p) => {
          if (query?.price) {
            return `${p.displayTitle} - ${p.price}`;
          } else {
            return p.displayTitle;
          }
        })
        .join(', ');

      return productNames || 'No products found';
    } catch (error) {
      this.logger.error(`Error reading CSV: ${error.message}`);
      throw new HttpException(
        'Error reading product database',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
