import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getPermissionManagement(req: any): Promise<{
        users: any;
        customRoles: any;
        areas: string[];
    }>;
    createCustomRole(req: any, body: any): Promise<{
        id: any;
        name: any;
        description: any;
        isReadOnly: boolean;
        active: boolean;
        permissions: {
            area: any;
            canView: boolean;
            canEdit: boolean;
            canUploadProjects: boolean;
            canUploadTracking: boolean;
            canDelete: boolean;
        }[];
    }>;
    updateCustomRole(req: any, id: string, body: any): Promise<{
        id: any;
        name: any;
        description: any;
        isReadOnly: boolean;
        active: boolean;
        permissions: {
            area: any;
            canView: boolean;
            canEdit: boolean;
            canUploadProjects: boolean;
            canUploadTracking: boolean;
            canDelete: boolean;
        }[];
    }>;
    deleteCustomRole(req: any, id: string): Promise<{
        success: boolean;
    }>;
    createCustomUser(req: any, body: {
        nombre: string;
        apellido: string;
        email: string;
        password: string;
        customRoleId: number;
    }): Promise<{
        id: any;
        nombre: any;
        apellido: any;
        email: any;
        rolId: number;
        roleName: string;
        temporal: boolean;
        active: boolean;
        isCustom: boolean;
        customRoleId: number;
        canDelete: boolean;
        canSuspend: boolean;
    }>;
    updateManagedUser(req: any, id: string, body: any): Promise<{
        id: any;
        nombre: any;
        apellido: any;
        email: any;
        rolId: number;
        roleName: string;
        temporal: boolean;
        active: boolean;
        isCustom: boolean;
        customRoleId: number;
        canDelete: boolean;
        canSuspend: boolean;
    }>;
    setManagedUserStatus(req: any, id: string, body: {
        active: boolean;
    }): Promise<{
        id: any;
        nombre: any;
        apellido: any;
        email: any;
        rolId: number;
        roleName: string;
        temporal: boolean;
        active: boolean;
        isCustom: boolean;
        customRoleId: number;
        canDelete: boolean;
        canSuspend: boolean;
    }>;
    deleteManagedUser(req: any, id: string): Promise<{
        success: boolean;
    }>;
    findByEmail(email: string): Promise<{
        success: boolean;
        message: string;
        user?: undefined;
    } | {
        success: boolean;
        user: import("./user.entity").User;
        message?: undefined;
    }>;
    findAll(req: any, page?: string, limit?: string): Promise<{
        users: import("./user.entity").User[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findById(id: string): Promise<{
        success: boolean;
        message: string;
        user?: undefined;
    } | {
        success: boolean;
        user: import("./user.entity").User;
        message?: undefined;
    }>;
    create(req: any, body: {
        nombre: string;
        apellido: string;
        email: string;
        password: string;
        rol_id: number;
        temporal?: boolean;
    }): Promise<import("./user.entity").User>;
    update(req: any, id: string, body: any): Promise<import("./user.entity").User>;
    delete(req: any, id: string): Promise<{
        success: boolean;
    }>;
    resetPassword(req: any, id: string, body: {
        password: string;
    }): Promise<{
        success: boolean;
    }>;
}
