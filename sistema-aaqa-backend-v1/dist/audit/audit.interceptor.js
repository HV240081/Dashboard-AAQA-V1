"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const audit_service_1 = require("./audit.service");
let AuditInterceptor = class AuditInterceptor {
    auditService;
    constructor(auditService) {
        this.auditService = auditService;
    }
    async intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const method = request.method;
        const user = request.user;
        const ip = request.ip || request.connection?.remoteAddress;
        if (!['PUT', 'POST', 'DELETE'].includes(method)) {
            return next.handle();
        }
        const target = this.resolveAuditTarget(request);
        if (!target) {
            return next.handle();
        }
        let oldData = null;
        if ((method === 'PUT' || method === 'DELETE' || target.action === 'DELETE') && target.oldQuery) {
            try {
                const results = await this.auditService['entityManager'].query(target.oldQuery, target.oldParams || []);
                oldData = results[0] || null;
            }
            catch (error) {
                console.error(`Error obteniendo datos antiguos de ${target.tableName}:`, error);
            }
        }
        return next.handle().pipe((0, operators_1.tap)(async (responseData) => {
            try {
                const action = target.action || this.actionFromMethod(method);
                const userId = user?.userId || user?.id;
                if (action === 'UPDATE' && oldData && target.oldQuery && !target.generic) {
                    const newData = await this.fetchCurrentData(target);
                    if (!newData) {
                        await this.auditService.registrarCambio({
                            usuarioId: userId,
                            tabla: target.tableName,
                            registroId: String(target.recordId),
                            campo: 'todo',
                            valorAnterior: oldData,
                            valorNuevo: this.publicPayload(request, responseData),
                            accion: 'UPDATE',
                            ip,
                        });
                        return;
                    }
                    const changes = this.diffObjects(oldData, newData);
                    for (const change of changes) {
                        await this.auditService.registrarCambio({
                            usuarioId: userId,
                            tabla: target.tableName,
                            registroId: String(target.recordId),
                            campo: change.campo,
                            valorAnterior: change.valorAnterior,
                            valorNuevo: change.valorNuevo,
                            accion: 'UPDATE',
                            ip,
                        });
                    }
                    return;
                }
                await this.auditService.registrarCambio({
                    usuarioId: userId,
                    tabla: target.tableName,
                    registroId: this.resolveFinalRecordId(target, responseData),
                    campo: 'todo',
                    valorAnterior: action === 'DELETE' ? oldData || this.publicPayload(request, null) : oldData,
                    valorNuevo: action === 'DELETE' ? null : this.publicPayload(request, responseData),
                    accion: action,
                    ip,
                });
            }
            catch (err) {
                console.error('Error registrando auditoria:', err);
            }
        }));
    }
    actionFromMethod(method) {
        if (method === 'DELETE')
            return 'DELETE';
        if (method === 'PUT')
            return 'UPDATE';
        return 'INSERT';
    }
    resolveAuditTarget(request) {
        const method = request.method;
        const url = (request.url || '').split('?')[0];
        const parts = url.split('/').filter(Boolean);
        const at = (segment) => parts.indexOf(segment);
        if (url.includes('/projects/')) {
            const projectIndex = at('projects');
            const projectId = parts[projectIndex + 1] || 'unknown';
            const reportIndex = at('reports');
            if (reportIndex >= 0) {
                const reportId = parts[reportIndex + 1] || request.body?.id || `rep-${projectId}`;
                return {
                    tableName: 'reportes_mensuales',
                    recordId: String(reportId),
                    action: method === 'POST' ? 'INSERT' : method === 'DELETE' ? 'DELETE' : 'UPDATE',
                    oldQuery: reportId ? `SELECT * FROM reportes_mensuales WHERE id = ? LIMIT 1` : undefined,
                    oldParams: reportId ? [reportId] : undefined,
                };
            }
            if (parts.includes('matrix')) {
                return {
                    tableName: 'reportes_mensuales',
                    recordId: `cronograma-${projectId}`,
                    action: 'UPDATE',
                    generic: true,
                };
            }
            return {
                tableName: 'proyectos',
                recordId: String(projectId),
                oldQuery: method !== 'POST' ? `SELECT * FROM proyectos WHERE id = ? LIMIT 1` : undefined,
                oldParams: method !== 'POST' ? [projectId] : undefined,
            };
        }
        if (url.includes('/users/custom-roles')) {
            const roleId = parts[parts.indexOf('custom-roles') + 1] || request.body?.id || 'rol-personalizado';
            return {
                tableName: 'roles_personalizados',
                recordId: String(roleId),
                oldQuery: method !== 'POST' && roleId ? `SELECT * FROM roles_personalizados WHERE id = ? LIMIT 1` : undefined,
                oldParams: method !== 'POST' && roleId ? [roleId] : undefined,
            };
        }
        if (url.includes('/users/custom-users')) {
            return {
                tableName: 'usuarios',
                recordId: String(request.body?.email || 'usuario-personalizado'),
            };
        }
        if (url.includes('/users/managed/')) {
            const managedIndex = at('managed');
            const userId = parts[managedIndex + 1] || 'usuario';
            return {
                tableName: 'usuarios',
                recordId: String(userId),
                action: method === 'DELETE' ? 'DELETE' : 'UPDATE',
                oldQuery: `SELECT * FROM usuarios WHERE id = ? LIMIT 1`,
                oldParams: [userId],
            };
        }
        if (url.includes('/users/') && !url.includes('/users/email/')) {
            const usersIndex = at('users');
            const userId = parts[usersIndex + 1] || request.body?.email || 'usuario';
            const isResetPassword = parts.includes('reset-password');
            return {
                tableName: 'usuarios',
                recordId: String(userId),
                action: isResetPassword ? 'UPDATE' : method === 'DELETE' ? 'DELETE' : method === 'PUT' ? 'UPDATE' : 'INSERT',
                oldQuery: method !== 'POST' || isResetPassword ? `SELECT * FROM usuarios WHERE id = ? LIMIT 1` : undefined,
                oldParams: method !== 'POST' || isResetPassword ? [userId] : undefined,
                generic: isResetPassword,
            };
        }
        if (url.includes('/dashboard/textos') || url.includes('/dashboard/text-content')) {
            const section = request.body?.categoria || request.body?.category || request.body?.seccion || request.body?.section || 'global';
            const field = request.body?.clave || request.body?.key || request.body?.campo || request.body?.field || 'config';
            return {
                tableName: 'configuracion_manual',
                recordId: `${section}:${field}`,
                oldQuery: `SELECT * FROM configuracion_manual WHERE seccion = ? AND campo = ? LIMIT 1`,
                oldParams: [section, field],
            };
        }
        if (url.includes('/dashboard/financials')) {
            return { tableName: 'dashboard_global', recordId: 'finanzas', action: 'UPDATE', generic: true };
        }
        if (url.includes('/dashboard/categories')) {
            return { tableName: 'dashboard_global', recordId: 'categorias', action: 'UPDATE', generic: true };
        }
        if (url.includes('/dashboard/formative')) {
            return { tableName: 'dashboard_global', recordId: 'formacion', action: 'UPDATE', generic: true };
        }
        if (url.includes('/dashboard/current-edition')) {
            return { tableName: 'dashboard_global', recordId: 'edicion-vigente', action: 'UPDATE', generic: true };
        }
        if (url.includes('/dashboard/editions')) {
            const year = parts[parts.indexOf('editions') + 1] || request.body?.year || 'edicion';
            return {
                tableName: 'ediciones',
                recordId: String(year),
                action: method === 'DELETE' ? 'DELETE' : 'INSERT',
                generic: true,
            };
        }
        if (url.includes('/dashboard/community/cortes')) {
            const id = parts[parts.indexOf('cortes') + 1] || 'cortes-formativos';
            return {
                tableName: 'cortes_comunitarios',
                recordId: String(id),
                action: method === 'DELETE' ? 'DELETE' : 'UPDATE',
                oldQuery: method === 'DELETE' && id ? `SELECT * FROM cortes_comunitarios WHERE id = ? LIMIT 1` : undefined,
                oldParams: method === 'DELETE' && id ? [id] : undefined,
                generic: method !== 'DELETE',
            };
        }
        if (url.includes('/dashboard/fis/participants')) {
            const id = parts[parts.indexOf('participants') + 1] || request.body?.id || 'participantes-fis';
            return {
                tableName: 'participantes_incubadora',
                recordId: String(id),
                action: method === 'DELETE' || url.includes('/delete') ? 'DELETE' : 'UPDATE',
                generic: true,
            };
        }
        if (url.includes('/upload/media/delete')) {
            return {
                tableName: 'recursos',
                recordId: String(request.body?.url || 'recurso'),
                action: 'DELETE',
                generic: true,
            };
        }
        if (url.includes('/upload/media')) {
            return {
                tableName: 'recursos',
                recordId: String(request.body?.projectName || request.body?.project || request.body?.resourceType || 'recurso'),
                action: 'INSERT',
                generic: true,
            };
        }
        if (url.includes('/upload/excel')) {
            return {
                tableName: 'cargas_masivas',
                recordId: String(request.body?.category || 'proyectos'),
                action: 'INSERT',
                generic: true,
            };
        }
        if (url.includes('/upload/community/cortes-excel')) {
            return {
                tableName: 'cargas_masivas',
                recordId: 'cortes-formativas',
                action: 'INSERT',
                generic: true,
            };
        }
        if (url.includes('/upload/fis/participants-excel')) {
            return {
                tableName: 'cargas_masivas',
                recordId: 'emprendimiento-social-participantes',
                action: 'INSERT',
                generic: true,
            };
        }
        return null;
    }
    async fetchCurrentData(target) {
        if (!target.oldQuery || !target.oldParams?.length)
            return null;
        if (target.tableName === 'configuracion_manual') {
            const rows = await this.auditService['entityManager'].query(target.oldQuery, target.oldParams);
            return rows[0] || null;
        }
        const rows = await this.auditService['entityManager'].query(target.oldQuery, target.oldParams);
        return rows[0] || null;
    }
    diffObjects(oldData, newData) {
        const ignoredFields = new Set([
            'password_hash',
            'password',
            'updated_at',
            'last_updated',
            'created_at',
            'temporal',
        ]);
        const changes = [];
        for (const key of Object.keys(newData || {})) {
            if (ignoredFields.has(key))
                continue;
            const previousValue = oldData?.[key];
            const nextValue = newData?.[key];
            if (previousValue != nextValue && !(previousValue === null && nextValue === '')) {
                changes.push({
                    campo: key,
                    valorAnterior: previousValue ?? null,
                    valorNuevo: nextValue ?? null,
                });
            }
        }
        return changes;
    }
    publicPayload(request, responseData) {
        const body = this.sanitizePayload(request.body || {});
        const response = this.sanitizePayload(responseData);
        const file = request.file
            ? {
                originalName: request.file.originalname,
                fileName: request.file.filename,
                mimeType: request.file.mimetype,
                size: request.file.size,
            }
            : null;
        return {
            ...body,
            ...(file ? { file } : {}),
            ...(response && typeof response === 'object' ? response : { response }),
        };
    }
    sanitizePayload(value) {
        if (value === null || value === undefined)
            return value;
        if (Array.isArray(value))
            return value.map((item) => this.sanitizePayload(item));
        if (typeof value !== 'object')
            return value;
        const safe = {};
        for (const [key, item] of Object.entries(value)) {
            if (/password|contrasena|token|hash/i.test(key)) {
                safe[key] = '[protegido]';
            }
            else {
                safe[key] = this.sanitizePayload(item);
            }
        }
        return safe;
    }
    resolveFinalRecordId(target, responseData) {
        return String(responseData?.id || responseData?.user?.id || responseData?.role?.id || target.recordId || 'unknown');
    }
};
exports.AuditInterceptor = AuditInterceptor;
exports.AuditInterceptor = AuditInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [audit_service_1.AuditService])
], AuditInterceptor);
//# sourceMappingURL=audit.interceptor.js.map