import { Controller, Get } from '@nestjs/common';
import { SECTORS } from './constants/sector.constant';

@Controller('sectors')
export class SectorsController {
  @Get()
  findAll() {
    return SECTORS;
  }
}
