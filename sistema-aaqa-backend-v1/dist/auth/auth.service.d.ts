import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
export declare class AuthService {
    private usersService;
    private jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    login(email: string, password: string): Promise<{
        success: boolean;
        access_token: string;
        user: {
            id: number;
            nombre: string;
            apellido: string;
            email: string;
            roles: string[];
            temporal: boolean;
            active: boolean;
            isCustom: boolean;
            customRoleId: number;
            editableCategories: string[];
            viewableCategories: string[];
            canEditAll: boolean;
            canOnlyView: boolean;
        };
    }>;
    getUserWithPermissions(userId: number): Promise<{
        id: number;
        nombre: string;
        apellido: string;
        email: string;
        roles: string[];
        temporal: boolean;
        active: boolean;
        isCustom: boolean;
        customRoleId: number;
        editableCategories: string[];
        viewableCategories: string[];
        canEditAll: boolean;
        canOnlyView: boolean;
    }>;
}
