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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const audit_service_1 = require("./audit.service");
let AuditController = class AuditController {
    auditService;
    constructor(auditService) {
        this.auditService = auditService;
    }
    ensureAuditAdmin(user) {
        const role = user?.rolId ?? user?.rol_id;
        if (role !== 1 && role !== 3 && user?.canEditAll !== true) {
            throw new common_1.UnauthorizedException('Solo Geo y Violeta pueden administrar la bitacora.');
        }
    }
    async getLogs(tabla, registroId, usuarioId, limit, offset) {
        return this.auditService.getLogs({
            tabla,
            registroId,
            usuarioId: usuarioId ? parseInt(usuarioId) : undefined,
            limit: limit ? parseInt(limit) : 20,
            offset: offset ? parseInt(offset) : 0,
        });
    }
    async getStats() {
        return this.auditService.getStats();
    }
    async exportExcel(res, tabla, registroId, usuarioId) {
        const buffer = await this.auditService.exportExcel({
            tabla,
            registroId,
            usuarioId: usuarioId ? parseInt(usuarioId) : undefined,
        });
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename=auditoria_${new Date().toISOString().split('T')[0]}.xlsx`,
        });
        res.send(buffer);
    }
    async deleteLog(req, id) {
        this.ensureAuditAdmin(req.user);
        return this.auditService.deleteLog(id);
    }
    async deleteAllLogs(req) {
        this.ensureAuditAdmin(req.user);
        return this.auditService.deleteAllLogs();
    }
};
exports.AuditController = AuditController;
__decorate([
    (0, common_1.Get)('logs'),
    __param(0, (0, common_1.Query)('tabla')),
    __param(1, (0, common_1.Query)('registroId')),
    __param(2, (0, common_1.Query)('usuarioId')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "getLogs", null);
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('export/excel'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Query)('tabla')),
    __param(2, (0, common_1.Query)('registroId')),
    __param(3, (0, common_1.Query)('usuarioId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "exportExcel", null);
__decorate([
    (0, common_1.Delete)('logs/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "deleteLog", null);
__decorate([
    (0, common_1.Delete)('logs'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "deleteAllLogs", null);
exports.AuditController = AuditController = __decorate([
    (0, common_1.Controller)('audit'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [audit_service_1.AuditService])
], AuditController);
//# sourceMappingURL=audit.controller.js.map