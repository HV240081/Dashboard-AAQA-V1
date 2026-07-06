import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMe(@Request() req) {
    const user = await this.authService.getUserWithPermissions(req.user.userId);
    return {
      authenticated: true,
      user,
    };
  }

  @Get('generate-hash')
  async generateHash() {
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash('Kriete123', 10);
    return {
      password: 'Kriete123',
      hash: hash,
      message: 'Usa este hash para insertar en la base de datos'
    };
  }
}