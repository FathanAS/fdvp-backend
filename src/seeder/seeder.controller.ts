
import { Controller, Post, Delete, Query } from '@nestjs/common';
import { SeederService } from './seeder.service';

@Controller('seed')
export class SeederController {
    constructor(private readonly seederService: SeederService) { }

    @Post('users')
    async seedUsers(@Query('count') count: string) {
        const num = parseInt(count) || 50; // Default 50
        return this.seederService.seedUsers(num);
    }

    @Delete('users')
    async deleteDummyUsers() {
        return this.seederService.deleteDummyUsers();
    }
}
