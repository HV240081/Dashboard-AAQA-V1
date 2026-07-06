"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const users_service_1 = require("./users.service");
const bcrypt = __importStar(require("bcrypt"));
const audit_interceptor_1 = require("../audit/audit.interceptor");
let UsersController = class UsersController {
    usersService;
    constructor(usersService) {
        this.usersService = usersService;
    }
    async getPermissionManagement(req) {
        this.usersService.assertAdminUser(req.user);
        return this.usersService.getPermissionManagementData();
    }
    async createCustomRole(req, body) {
        this.usersService.assertAdminUser(req.user);
        return this.usersService.createCustomRole(body);
    }
    async updateCustomRole(req, id, body) {
        this.usersService.assertAdminUser(req.user);
        return this.usersService.updateCustomRole(parseInt(id), body);
    }
    async deleteCustomRole(req, id) {
        this.usersService.assertAdminUser(req.user);
        return this.usersService.deleteCustomRole(parseInt(id));
    }
    async createCustomUser(req, body) {
        this.usersService.assertAdminUser(req.user);
        const hash = await bcrypt.hash(body.password, 10);
        return this.usersService.createCustomUser({
            ...body,
            password_hash: hash,
        });
    }
    async updateManagedUser(req, id, body) {
        this.usersService.assertAdminUser(req.user);
        return this.usersService.updateManagedUser(parseInt(id), body);
    }
    async setManagedUserStatus(req, id, body) {
        this.usersService.assertAdminUser(req.user);
        return this.usersService.setUserActive(parseInt(id), Boolean(body.active));
    }
    async deleteManagedUser(req, id) {
        this.usersService.assertAdminUser(req.user);
        return this.usersService.deleteManagedUser(parseInt(id));
    }
    async findByEmail(email) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            return { success: false, message: 'Usuario no encontrado' };
        }
        return { success: true, user };
    }
    async findAll(req, page, limit) {
        this.usersService.assertAdminUser(req.user);
        return this.usersService.findAll({
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 10,
        });
    }
    async findById(id) {
        const user = await this.usersService.findById(parseInt(id));
        if (!user) {
            return { success: false, message: 'Usuario no encontrado' };
        }
        return { success: true, user };
    }
    async create(req, body) {
        this.usersService.assertAdminUser(req.user);
        const hash = await bcrypt.hash(body.password, 10);
        return this.usersService.create({
            nombre: body.nombre,
            apellido: body.apellido,
            email: body.email,
            password_hash: hash,
            rol_id: body.rol_id,
            temporal: body.temporal || false,
        });
    }
    async update(req, id, body) {
        this.usersService.assertAdminUser(req.user);
        return this.usersService.update(parseInt(id), body);
    }
    async delete(req, id) {
        this.usersService.assertAdminUser(req.user);
        return this.usersService.delete(parseInt(id));
    }
    async resetPassword(req, id, body) {
        this.usersService.assertAdminUser(req.user);
        const hash = await bcrypt.hash(body.password, 10);
        return this.usersService.updatePassword(parseInt(id), hash);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)('permissions/management'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getPermissionManagement", null);
__decorate([
    (0, common_1.Post)('custom-roles'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "createCustomRole", null);
__decorate([
    (0, common_1.Put)('custom-roles/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateCustomRole", null);
__decorate([
    (0, common_1.Delete)('custom-roles/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "deleteCustomRole", null);
__decorate([
    (0, common_1.Post)('custom-users'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "createCustomUser", null);
__decorate([
    (0, common_1.Put)('managed/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateManagedUser", null);
__decorate([
    (0, common_1.Put)('managed/:id/status'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "setManagedUserStatus", null);
__decorate([
    (0, common_1.Delete)('managed/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "deleteManagedUser", null);
__decorate([
    (0, common_1.Get)('email/:email'),
    __param(0, (0, common_1.Param)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findByEmail", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findById", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)(':id/reset-password'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "resetPassword", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map