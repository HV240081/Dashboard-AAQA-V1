import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(body: {
        email: string;
        password: string;
    }): Promise<{
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
    getMe(req: any): Promise<{
        authenticated: boolean;
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
    generateHash(): Promise<{
        password: string;
        hash: any;
        message: string;
    }>;
}
