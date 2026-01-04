import { Controller, Get, Post, Body, Param, Patch, Delete, Query } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';

@Controller('events') // Ini menentukan rute URL: http://localhost:3001/events
export class EventsController {
  constructor(private readonly eventsService: EventsService) { }

  // Endpoint untuk membuat Event baru (POST)
  @Post()
  create(@Body() createEventDto: CreateEventDto) {
    return this.eventsService.create(createEventDto);
  }

  @Get('health')
  async checkHealth() {
    return this.eventsService.checkHealth();
  }

  // Endpoint untuk mengambil semua Event (GET)
  @Get()
  findAll(
    @Query('search') search: string,
    @Query('status') status: string
  ) {
    return this.eventsService.findAll({ search, status });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    // Pisahkan adminId dari data event
    const { adminId, ...updateData } = body;
    return this.eventsService.update(id, updateData, adminId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('adminId') adminId: string) {
    return this.eventsService.remove(id, adminId);
  }
}