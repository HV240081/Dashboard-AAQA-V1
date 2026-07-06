import { EntityManager } from 'typeorm';
type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE';
export declare class AuditService {
    private readonly entityManager;
    constructor(entityManager: EntityManager);
    getLogs(filters: {
        tabla?: string;
        registroId?: string;
        usuarioId?: number;
        limit?: number;
        offset?: number;
    }): Promise<{
        logs: any[];
        total: any;
        limit: number;
        offset: number;
    }>;
    getStats(): Promise<any>;
    registrarCambio(data: {
        usuarioId: number;
        tabla: string;
        registroId: string;
        campo: string;
        valorAnterior: any;
        valorNuevo: any;
        accion: AuditAction;
        ip?: string;
    }): Promise<void>;
    deleteLog(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    deleteAllLogs(): Promise<{
        success: boolean;
        deleted: number;
        message: string;
    }>;
    exportExcel(filters: {
        tabla?: string;
        registroId?: string;
        usuarioId?: number;
    }): Promise<Buffer>;
    private buildAuditSummaryRows;
    private applyAuditSheetStyles;
    private parseStoredValue;
    private formatAuditValue;
    private firstText;
    private normalizeTable;
    private prettyFieldName;
    private getNameFromPayload;
    private resolveRegistryName;
    private getActionLabel;
    private buildDescription;
    private enrichLogs;
}
export {};
