import { BadRequestException, PipeTransform } from '@nestjs/common';
import { isUUID } from 'class-validator';

export class ParseIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isUUID(value)) {
      throw new BadRequestException(`Invalid id: ${value}`);
    }
    return value;
  }
}
