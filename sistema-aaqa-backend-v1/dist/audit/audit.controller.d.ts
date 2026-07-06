import type { Response } from 'express';
import { AuditService } from './audit.service';
export declare class AuditController {
    private readonly auditService;
    constructor(auditService: AuditService);
    private ensureAuditAdmin;
    getLogs(tabla?: string, registroId?: string, usuarioId?: string, limit?: string, offset?: string): Promise<{
        logs: any[];
        total: any;
        limit: number;
        offset: number;
    }>;
    getStats(): Promise<any>;
    exportExcel(res: Response, tabla?: string, registroId?: string, usuarioId?: string): Promise<void>;
    deleteLog(req: any, id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    deleteAllLogs(req: any): Promise<{
        success: boolean;
        deleted: number;
        message: string;
    }>;
}
