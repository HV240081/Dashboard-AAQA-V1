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
exports.ProjectsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const projects_service_1 = require("./projects.service");
const audit_interceptor_1 = require("../audit/audit.interceptor");
let ProjectsController = class ProjectsController {
    projectsService;
    constructor(projectsService) {
        this.projectsService = projectsService;
        console.log('🚀 ProjectsController cargado y listo');
    }
    ensureFullAccess(req) {
        const rol = req?.user?.rolId;
        if (rol !== 1 && rol !== 3) {
            throw new common_1.UnauthorizedException('No tiene permisos para modificar proyectos.');
        }
    }
    async addReport(id, reportData, req) {
        this.ensureFullAccess(req);
        return this.projectsService.addReport(id, reportData, req.user?.userId);
    }
    async getProjectById(id, req) {
        return this.projectsService.getProjectById(id);
    }
    async updateReport(id, reportId, reportData, req) {
        this.ensureFullAccess(req);
        return this.projectsService.updateReport(id, reportId, reportData, req.user?.userId);
    }
    async deleteReport(id, reportId, req) {
        this.ensureFullAccess(req);
        return this.projectsService.deleteReport(id, reportId, req.user?.userId);
    }
    async updateMatrix(id, progress, req) {
        this.ensureFullAccess(req);
        return this.projectsService.updateProgressMatrix(id, progress, req.user?.userId);
    }
    async updateProject(id, projectData, req) {
        this.ensureFullAccess(req);
        return this.projectsService.updateProject(id, projectData, req.user?.userId);
    }
    async createProject(projectData, req) {
        this.ensureFullAccess(req);
        return this.projectsService.createProject(projectData, req.user?.userId);
    }
    async deleteProject(id, req) {
        this.ensureFullAccess(req);
        return this.projectsService.deleteProject(id, req.user?.userId);
    }
};
exports.ProjectsController = ProjectsController;
__decorate([
    (0, common_1.Post)(':id/reports'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "addReport", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "getProjectById", null);
__decorate([
    (0, common_1.Put)(':id/reports/:reportId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('reportId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "updateReport", null);
__decorate([
    (0, common_1.Delete)(':id/reports/:reportId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('reportId')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "deleteReport", null);
__decorate([
    (0, common_1.Put)(':id/matrix'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('progress')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "updateMatrix", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "updateProject", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "createProject", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "deleteProject", null);
exports.ProjectsController = ProjectsController = __decorate([
    (0, common_1.Controller)('projects'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [projects_service_1.ProjectsService])
], ProjectsController);
//# sourceMappingURL=projects.controller.js.map