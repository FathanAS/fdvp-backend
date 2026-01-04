import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async checkHealth() {
    return this.appService.checkHealth();
  }

  @Get('visitors')
  async getVisitors() {
    return this.appService.getDataVisitor();
  }
}
