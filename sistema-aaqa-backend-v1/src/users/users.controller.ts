import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, UseInterceptors, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import * as bcrypt from 'bcrypt';
import { AuditInterceptor } from '../audit/audit.interceptor';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
@UseInterceptors(AuditInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('permissions/management')
  async getPermissionManagement(@Request() req) {
    this.usersService.assertAdminUser(req.user);
    return this.usersService.getPermissionManagementData();
  }

  @Post('custom-roles')
  async createCustomRole(@Request() req, @Body() body: any) {
    this.usersService.assertAdminUser(req.user);
    return this.usersService.createCustomRole(body);
  }

  @Put('custom-roles/:id')
  async updateCustomRole(@Request() req, @Param('id') id: string, @Body() body: any) {
    this.usersService.assertAdminUser(req.user);
    return this.usersService.updateCustomRole(parseInt(id), body);
  }

  @Delete('custom-roles/:id')
  async deleteCustomRole(@Request() req, @Param('id') id: string) {
    this.usersService.assertAdminUser(req.user);
    return this.usersService.deleteCustomRole(parseInt(id));
  }

  @Post('custom-users')
  async createCustomUser(@Request() req, @Body() body: {
    nombre: string;
    apellido: string;
    email: string;
    password: string;
    customRoleId: number;
  }) {
    this.usersService.assertAdminUser(req.user);
    const hash = await bcrypt.hash(body.password, 10);
    return this.usersService.createCustomUser({
      ...body,
      password_hash: hash,
    });
  }

  @Put('managed/:id')
  async updateManagedUser(@Request() req, @Param('id') id: string, @Body() body: any) {
    this.usersService.assertAdminUser(req.user);
    return this.usersService.updateManagedUser(parseInt(id), body);
  }

  @Put('managed/:id/status')
  async setManagedUserStatus(@Request() req, @Param('id') id: string, @Body() body: { active: boolean }) {
    this.usersService.assertAdminUser(req.user);
    return this.usersService.setUserActive(parseInt(id), Boolean(body.active));
  }

  @Delete('managed/:id')
  async deleteManagedUser(@Request() req, @Param('id') id: string) {
    this.usersService.assertAdminUser(req.user);
    return this.usersService.deleteManagedUser(parseInt(id));
  }

  @Get('email/:email')
  async findByEmail(@Param('email') email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { success: false, message: 'Usuario no encontrado' };
    }
    return { success: true, user };
  }

  @Get()
  async findAll(@Request() req, @Query('page') page?: string, @Query('limit') limit?: string) {
    this.usersService.assertAdminUser(req.user);
    return this.usersService.findAll({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    });
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const user = await this.usersService.findById(parseInt(id));
    if (!user) {
      return { success: false, message: 'Usuario no encontrado' };
    }
    return { success: true, user };
  }

  @Post()
  async create(@Request() req, @Body() body: {
    nombre: string;
    apellido: string;
    email: string;
    password: string;
    rol_id: number;
    temporal?: boolean;
  }) {
    this.usersService.assertAdminUser(req.user);
    const hash = await bcrypt.hash(body.password, 10);
    return this.usersService.create({
      nombre: body.nombre,
      apellido: body.apellido,
      email: body.email,
      password_hash: hash,
      rol_id: body.rol_id,
      temporal: body.temporal || false,
    });
  }

  @Put(':id')
  async update(@Request() req, @Param('id') id: string, @Body() body: any) {
    this.usersService.assertAdminUser(req.user);
    return this.usersService.update(parseInt(id), body);
  }

  @Delete(':id')
  async delete(@Request() req, @Param('id') id: string) {
    this.usersService.assertAdminUser(req.user);
    return this.usersService.delete(parseInt(id));
  }

  @Post(':id/reset-password')
  async resetPassword(@Request() req, @Param('id') id: string, @Body() body: { password: string }) {
    this.usersService.assertAdminUser(req.user);
    const hash = await bcrypt.hash(body.password, 10);
    return this.usersService.updatePassword(parseInt(id), hash);
  }
}
