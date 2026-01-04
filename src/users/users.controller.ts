import { Controller, Post, Body, Param, Patch, Get, Query, Delete } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  // Endpoint Update Profil
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  // Endpoint Cari Teman (POST agar bisa kirim lat/long kita)
  @Post('nearby')
  findNearby(@Body() body: { lat: number; long: number; userId: string }) {
    return this.usersService.findNearby(body.lat, body.long, body.userId);
  }

  @Get('public/list')
  getPublicMembers(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 100; // Default 100 untuk Map
    return this.usersService.getPublicMembers(limitNum);
  }

  @Get('public/count')
  countTotal() {
    return this.usersService.countTotal();
  }

  @Get('search')
  searchUsers(
    @Query('q') q: string,
    @Query('role') role: string
  ) {
    return this.usersService.search(q || '', role || '');
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Query('viewerId') viewerId?: string) {
    return this.usersService.findOne(id, viewerId);
  }

  // Admin endpoints for user management
  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  @Patch(':id/role')
  async updateRole(@Param('id') id: string, @Body('role') role: string) {
    return this.usersService.updateRole(id, role);
  }

  @Post('fcm-token')
  saveFcmToken(@Body() body: { userId: string; token: string }) {
    return this.usersService.saveFcmToken(body.userId, body.token);
  }
}