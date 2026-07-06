import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuditService } from './audit.service';
export declare class AuditInterceptor implements NestInterceptor {
    private readonly auditService;
    constructor(auditService: AuditService);
    intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>>;
    private actionFromMethod;
    private resolveAuditTarget;
    private fetchCurrentData;
    private diffObjects;
    private publicPayload;
    private sanitizePayload;
    private resolveFinalRecordId;
}
