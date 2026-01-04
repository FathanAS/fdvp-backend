import { Controller, Post, Body, BadRequestException, Get, Param } from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';

@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) { }

  @Post()
  async create(@Body() createRegistrationDto: CreateRegistrationDto) {
    try {
      return await this.registrationsService.create(createRegistrationDto);
    } catch (error: any) {
      // Tangkap error jika user sudah daftar
      throw new BadRequestException(error.message);
    }
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.registrationsService.findByUser(userId);
  }

  @Get('event/:eventId')
  findByEvent(@Param('eventId') eventId: string) {
    return this.registrationsService.findByEvent(eventId);
  }

  @Post('check-in')
  async checkIn(@Body('registrationId') registrationId: string) {
    try {
      return await this.registrationsService.validateCheckIn(registrationId);
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('validate')
  async validate(@Body() body: { qrCode: string }) {
    try {
      return await this.registrationsService.validateCheckIn(body.qrCode);
    } catch (error: any) {
      // Return format error yang rapi ke frontend
      return { valid: false, message: error.message };
    }
  }
}