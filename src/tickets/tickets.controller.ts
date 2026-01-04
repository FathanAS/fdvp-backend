import { Controller, Post, Body, Get, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';

@Controller('tickets')
export class TicketsController {
    constructor(private readonly ticketsService: TicketsService) { }

    @Post()
    create(@Body() createTicketDto: CreateTicketDto) {
        return this.ticketsService.create(createTicketDto);
    }

    @Get()
    @UseGuards(FirebaseAuthGuard)
    findAll(@Request() req) {
        const user = req.user;
        const allowedRoles = ['admin', 'staff', 'superadmin', 'owner'];

        if (!allowedRoles.includes(user.role)) {
            throw new ForbiddenException('Access to restricted leadership data denied.');
        }

        return this.ticketsService.findAll(user.role);
    }
}
