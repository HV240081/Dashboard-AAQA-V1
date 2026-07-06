import { Controller, Get, Param } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('ping')
  getPing(): string {
    return 'pong';
  }

  @Get('debug/columns/:table')
  async getColumns(@Param('table') table: string) {
    return this.appService.getColumns(table);
  }
}
