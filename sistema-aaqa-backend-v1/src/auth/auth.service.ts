import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (Number((user as any).activo) === 0 || (user as any).activo === false) {
      throw new UnauthorizedException('El usuario se encuentra suspendido. Contacte a Geo o Violeta.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const userWithPermissions = await this.usersService.getUserWithPermissions(user.id);
    if (!userWithPermissions) {
      throw new UnauthorizedException('El usuario se encuentra suspendido. Contacte a Geo o Violeta.');
    }

    const payload = {
      userId: user.id,
      email: user.email,
      rolId: user.rol_id,
      roles: userWithPermissions.roles,
      editableCategories: userWithPermissions.editableCategories,
      viewableCategories: userWithPermissions.viewableCategories,
      canEditAll: userWithPermissions.canEditAll,
      canOnlyView: userWithPermissions.canOnlyView,
      isCustom: userWithPermissions.isCustom,
      customRoleId: userWithPermissions.customRoleId,
    };

    return {
      success: true,
      access_token: this.jwtService.sign(payload),
      user: userWithPermissions,
    };
  }

  async getUserWithPermissions(userId: number) {
    return this.usersService.getUserWithPermissions(userId);
  }
}
