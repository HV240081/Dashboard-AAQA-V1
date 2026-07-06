import { EntityManager, Repository } from 'typeorm';
import { User } from './user.entity';
export declare class UsersService {
    private usersRepository;
    private entityManager;
    constructor(usersRepository: Repository<User>, entityManager: EntityManager);
    private readonly baseRoleIds;
    private readonly managedAreas;
    ensureUserPermissionSchema(): Promise<void>;
    private isAdminUser;
    assertAdminUser(user: any): void;
    private normalizePermissionInput;
    private saveRolePermissions;
    private mapCustomRoleRow;
    getCustomRoleWithPermissions(roleId: number): Promise<{
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
    findAllCustomRoles(): Promise<any>;
    findByEmail(email: string): Promise<User | null>;
    findById(id: number): Promise<User | null>;
    findAll(options: {
        page: number;
        limit: number;
    }): Promise<{
        users: User[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    create(data: {
        nombre: string;
        apellido: string;
        email: string;
        password_hash: string;
        rol_id: number;
        temporal: boolean;
    }): Promise<User>;
    update(id: number, data: Partial<User>): Promise<User>;
    delete(id: number): Promise<{
        success: boolean;
    }>;
    updatePassword(id: number, password_hash: string): Promise<{
        success: boolean;
    }>;
    createCustomRole(body: any): Promise<{
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
    updateCustomRole(id: number, body: any): Promise<{
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
    deleteCustomRole(id: number): Promise<{
        success: boolean;
    }>;
    createCustomUser(body: any): Promise<{
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
    updateManagedUser(id: number, body: any): Promise<{
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
    setUserActive(id: number, active: boolean): Promise<{
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
    deleteManagedUser(id: number): Promise<{
        success: boolean;
    }>;
    private getManagedUserById;
    private mapManagedUser;
    private getFixedRoleName;
    getPermissionManagementData(): Promise<{
        users: any;
        customRoles: any;
        areas: string[];
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
