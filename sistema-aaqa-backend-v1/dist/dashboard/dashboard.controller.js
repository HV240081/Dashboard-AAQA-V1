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
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const dashboard_service_1 = require("./dashboard.service");
const audit_interceptor_1 = require("../audit/audit.interceptor");
let DashboardController = class DashboardController {
    dashboardService;
    constructor(dashboardService) {
        this.dashboardService = dashboardService;
    }
    async getGlobalData(year) {
        return this.dashboardService.getGlobalData(year ? parseInt(year) : undefined);
    }
    async getCategoriesData(year) {
        return this.dashboardService.getCategoriesData(year ? parseInt(year) : undefined);
    }
    async getFormativeData(year) {
        return this.dashboardService.getFormativeData(year ? parseInt(year) : undefined);
    }
    async getProjects(year, category) {
        return this.dashboardService.getProjects({
            year: year ? parseInt(year) : undefined,
            category,
        });
    }
    async getEditions() {
        return this.dashboardService.getEditions();
    }
    async createEdition(req, body) {
        const rol = req.user.rolId;
        if (rol !== 1 && rol !== 3) {
            throw new common_1.UnauthorizedException('Solo Admin o Gerencia pueden agregar nuevas ediciones.');
        }
        return this.dashboardService.createEdition(body.year);
    }
    async deleteEdition(req, year) {
        const rol = req.user.rolId;
        if (rol !== 1 && rol !== 3) {
            throw new common_1.UnauthorizedException('Solo Admin o Gerencia pueden eliminar ediciones.');
        }
        return this.dashboardService.deleteEdition(parseInt(year));
    }
    async getCommunityCortes() {
        return this.dashboardService.getCommunityCortes();
    }
    async updateCommunityCortes(req, body) {
        const rol = req.user.rolId;
        if (rol !== 1 && rol !== 3 && rol !== 4) {
            throw new common_1.UnauthorizedException('No tiene permisos para editar cortes comunitarios.');
        }
        return this.dashboardService.updateCommunityCortes(body.cortes);
    }
    async deleteCommunityCorte(req, id) {
        const rol = req.user.rolId;
        if (rol !== 1 && rol !== 3 && rol !== 4) {
            throw new common_1.UnauthorizedException('No tiene permisos para eliminar cortes comunitarios.');
        }
        return this.dashboardService.deleteCommunityCorte(id);
    }
    async getFisParticipants(year) {
        return this.dashboardService.getFisParticipants(year ? parseInt(year) : undefined);
    }
    async replaceFisParticipants(req, body) {
        const rol = req.user.rolId;
        if (rol !== 1 && rol !== 3) {
            throw new common_1.UnauthorizedException('No tiene permisos para modificar participantes de Emprendimiento Social.');
        }
        return this.dashboardService.replaceFisParticipants(body.participants || [], req.user?.userId);
    }
    async deleteFisParticipant(req, id) {
        const rol = req.user.rolId;
        if (rol !== 1 && rol !== 3) {
            throw new common_1.UnauthorizedException('No tiene permisos para modificar participantes de Emprendimiento Social.');
        }
        return this.dashboardService.deleteFisParticipant(id, req.user?.userId);
    }
    async deleteFisParticipantLegacy(req, body) {
        const rol = req.user.rolId;
        if (rol !== 1 && rol !== 3) {
            throw new common_1.UnauthorizedException('No tiene permisos para modificar participantes de Emprendimiento Social.');
        }
        return this.dashboardService.deleteFisParticipant(body.id, req.user?.userId);
    }
    async getTextContent() {
        return this.dashboardService.getTextContent();
    }
    async getDepartamentos() {
        return this.dashboardService.getDepartamentos();
    }
    async getMunicipios(departamento) {
        return this.dashboardService.getMunicipios(departamento);
    }
    async getDistritos(departamento, municipio) {
        return this.dashboardService.getDistritos(departamento, municipio);
    }
    async getTextos(categoria) {
        return this.dashboardService.getTextos(categoria);
    }
    async getAvailableYears() {
        return this.dashboardService.getAvailableYears();
    }
    async getGeoData(year) {
        return this.dashboardService.getGeoData(year ? parseInt(year) : undefined);
    }
    async getStatsByDepartamento(year) {
        return this.dashboardService.getStatsByDepartamento(year ? parseInt(year) : undefined);
    }
    async compareYears(years) {
        const yearsArray = years.split(',').map(y => parseInt(y));
        return this.dashboardService.compareYears(yearsArray);
    }
    async getCommunityCounterpart(projectId) {
        return this.dashboardService.getCommunityCounterpart(projectId);
    }
    async updateFinancials(req, body) {
        const rol = req.user.rolId;
        if (rol !== 1 && rol !== 3 && rol !== 5) {
            throw new common_1.UnauthorizedException('No tienes permisos para editar datos financieros');
        }
        return this.dashboardService.updateFinancials(body);
    }
    async updateCategories(req, body) {
        const rol = req.user.rolId;
        if (rol !== 1 && rol !== 3)
            throw new common_1.UnauthorizedException('No autorizado para modificar metas operativas');
        return this.dashboardService.updateCategories(body);
    }
    async updateFormative(req, body) {
        const rol = req.user.rolId;
        if (rol !== 1 && rol !== 3)
            throw new common_1.UnauthorizedException('No autorizado para modificar impactos formativos');
        return this.dashboardService.updateFormative(body);
    }
    async updateCurrentEdition(req, body) {
        const rol = req.user.rolId;
        if (rol !== 1 && rol !== 3) {
            throw new common_1.UnauthorizedException('Solo Admin o Gerencia pueden alterar metas del año vigente');
        }
        return this.dashboardService.updateCurrentEdition(body);
    }
    async updateTextContent(req, body) {
        const rol = req.user.rolId;
        if (rol !== 1 && rol !== 3)
            throw new common_1.UnauthorizedException('Solo Geo y Violeta pueden editar textos');
        return this.dashboardService.updateTextContent(body.category, body.key, body.value);
    }
    async updateTexto(req, body) {
        const rol = req.user.rolId;
        if (rol !== 1 && rol !== 3)
            throw new common_1.UnauthorizedException('Solo Geo y Violeta pueden editar textos');
        return this.dashboardService.updateTexto(body.categoria, body.clave, body.valor, req.user.userId);
    }
    async updateCommunityCounterpart(projectId, body, req) {
        const rol = req.user.rolId;
        if (rol !== 1 && rol !== 3) {
            throw new common_1.UnauthorizedException('No tiene permisos para editar contrapartida comunal');
        }
        return this.dashboardService.updateCommunityCounterpart(projectId, body, req.user.userId);
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)('global'),
    __param(0, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getGlobalData", null);
__decorate([
    (0, common_1.Get)('categories'),
    __param(0, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getCategoriesData", null);
__decorate([
    (0, common_1.Get)('formative'),
    __param(0, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getFormativeData", null);
__decorate([
    (0, common_1.Get)('projects'),
    __param(0, (0, common_1.Query)('year')),
    __param(1, (0, common_1.Query)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getProjects", null);
__decorate([
    (0, common_1.Get)('editions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getEditions", null);
__decorate([
    (0, common_1.Post)('editions'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "createEdition", null);
__decorate([
    (0, common_1.Delete)('editions/:year'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "deleteEdition", null);
__decorate([
    (0, common_1.Get)('community/cortes'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getCommunityCortes", null);
__decorate([
    (0, common_1.Post)('community/cortes'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "updateCommunityCortes", null);
__decorate([
    (0, common_1.Delete)('community/cortes/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "deleteCommunityCorte", null);
__decorate([
    (0, common_1.Get)('fis/participants'),
    __param(0, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getFisParticipants", null);
__decorate([
    (0, common_1.Post)('fis/participants'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "replaceFisParticipants", null);
__decorate([
    (0, common_1.Delete)('fis/participants/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "deleteFisParticipant", null);
__decorate([
    (0, common_1.Post)('fis/participants/delete'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "deleteFisParticipantLegacy", null);
__decorate([
    (0, common_1.Get)('text-content'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getTextContent", null);
__decorate([
    (0, common_1.Get)('geografia/departamentos'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getDepartamentos", null);
__decorate([
    (0, common_1.Get)('geografia/municipios'),
    __param(0, (0, common_1.Query)('departamento')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getMunicipios", null);
__decorate([
    (0, common_1.Get)('geografia/distritos'),
    __param(0, (0, common_1.Query)('departamento')),
    __param(1, (0, common_1.Query)('municipio')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getDistritos", null);
__decorate([
    (0, common_1.Get)('textos'),
    __param(0, (0, common_1.Query)('categoria')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getTextos", null);
__decorate([
    (0, common_1.Get)('available-years'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getAvailableYears", null);
__decorate([
    (0, common_1.Get)('geodata'),
    __param(0, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getGeoData", null);
__decorate([
    (0, common_1.Get)('stats/departamentos'),
    __param(0, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getStatsByDepartamento", null);
__decorate([
    (0, common_1.Get)('compare'),
    __param(0, (0, common_1.Query)('years')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "compareYears", null);
__decorate([
    (0, common_1.Get)('community/counterpart/:projectId'),
    __param(0, (0, common_1.Param)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getCommunityCounterpart", null);
__decorate([
    (0, common_1.Put)('financials'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "updateFinancials", null);
__decorate([
    (0, common_1.Put)('categories'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "updateCategories", null);
__decorate([
    (0, common_1.Put)('formative'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "updateFormative", null);
__decorate([
    (0, common_1.Put)('current-edition'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "updateCurrentEdition", null);
__decorate([
    (0, common_1.Put)('text-content'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "updateTextContent", null);
__decorate([
    (0, common_1.Put)('textos'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "updateTexto", null);
__decorate([
    (0, common_1.Put)('community/counterpart/:projectId'),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "updateCommunityCounterpart", null);
exports.DashboardController = DashboardController = __decorate([
    (0, common_1.Controller)('dashboard'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [dashboard_service_1.DashboardService])
], DashboardController);
//# sourceMappingURL=dashboard.controller.js.map