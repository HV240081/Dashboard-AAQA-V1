export declare class User {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
    password_hash: string;
    rol_id: number;
    temporal: boolean;
    activo: boolean;
    is_custom: boolean;
    custom_role_id: number | null;
    created_at: Date;
    updated_at: Date;
}
