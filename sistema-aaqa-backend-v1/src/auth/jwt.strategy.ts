import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET no está definido');
    }
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.userId,
      email: payload.email,
      rolId: payload.rolId,
      rol_id: payload.rolId,
      roles: payload.roles || [],
      editableCategories: payload.editableCategories || [],
      viewableCategories: payload.viewableCategories || [],
      canEditAll: payload.canEditAll === true,
      canOnlyView: payload.canOnlyView === true,
      isCustom: payload.isCustom === true,
      customRoleId: payload.customRoleId || null,
    };
  }
}
