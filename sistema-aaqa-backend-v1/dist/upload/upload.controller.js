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
exports.UploadController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const passport_1 = require("@nestjs/passport");
const upload_service_1 = require("./upload.service");
const audit_interceptor_1 = require("../audit/audit.interceptor");
const multer_1 = require("multer");
const path_1 = require("path");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const sanitizeSegment = (value) => (value ?? '')
    .toString()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'general';
const categoryPermissionKey = (category) => {
    const lower = (category || '').toString().toLowerCase();
    if (lower === 'community' || lower === 'dc' || lower.includes('desarrollo'))
        return 'DC';
    if (lower === 'fis' || lower === 'es' || lower.includes('emprendimiento'))
        return 'ES';
    if (lower.includes('corte') || lower.includes('adesco') || lower.includes('formacion'))
        return 'formacion_dc';
    if (lower === 'ong')
        return 'ONG';
    return category;
};
const userCanEditArea = (user, category) => {
    if (user?.rolId === 1 || user?.rolId === 3 || user?.canEditAll === true)
        return true;
    const key = categoryPermissionKey(category);
    return Array.isArray(user?.editableCategories) && user.editableCategories.includes(key);
};
let UploadController = class UploadController {
    uploadService;
    constructor(uploadService) {
        this.uploadService = uploadService;
    }
    async uploadExcel(file, req) {
        const category = (req.body?.category || '').toString().toLowerCase();
        const allowedForFundsManager = category === 'community' || category === 'dc';
        if (!userCanEditArea(req.user, category) && !(req.user?.rolId === 5 && allowedForFundsManager)) {
            throw new common_1.UnauthorizedException('Solo Geo y Violeta pueden cargar proyectos masivos, excepto Irvin en Desarrollo Comunitario.');
        }
        return this.uploadService.processExcel(file, req.user, req.body || {});
    }
    async uploadFisParticipantsExcel(file, req) {
        if (!userCanEditArea(req.user, 'FIS')) {
            throw new common_1.UnauthorizedException('Solo Geo y Violeta pueden cargar participantes de Emprendimiento Social.');
        }
        return this.uploadService.processFisParticipantsExcel(file, req.user);
    }
    async uploadCommunityCortesExcel(file, req) {
        if (!userCanEditArea(req.user, 'Cortes') && req.user?.rolId !== 4) {
            throw new common_1.UnauthorizedException('Solo Geo, Violeta y Jose Manuel pueden cargar Cortes Formativos.');
        }
        return this.uploadService.processCommunityCortesExcel(file, req.user);
    }
    async uploadMedia(file, req) {
        if (!file) {
            throw new common_1.BadRequestException('No se recibió ningún archivo');
        }
        if (req.user?.rolId !== 1 && req.user?.rolId !== 3) {
            throw new common_1.UnauthorizedException('Solo Geo y Violeta pueden subir recursos.');
        }
        const category = sanitizeSegment(req.body?.category || 'general');
        const year = sanitizeSegment(req.body?.year || 'sin-edicion');
        const projectName = sanitizeSegment(req.body?.projectName || req.body?.project || 'sin-proyecto');
        const resourceType = sanitizeSegment(req.body?.resourceType || req.body?.type || 'misc');
        return {
            success: true,
            url: `http://localhost:3000/uploads/${category}/${year}/${projectName}/${file.filename}`,
        };
    }
    async deleteMedia(req) {
        if (req.user?.rolId !== 1 && req.user?.rolId !== 3) {
            throw new common_1.UnauthorizedException('Solo Geo y Violeta pueden eliminar recursos.');
        }
        const url = (req.body?.url || '').toString().trim();
        if (!url) {
            throw new common_1.BadRequestException('Debe indicar la URL del archivo a eliminar');
        }
        const uploadsRoot = path.resolve(process.cwd(), 'uploads');
        const urlMarker = '/uploads/';
        const markerIndex = url.indexOf(urlMarker);
        if (markerIndex < 0) {
            return { success: true, message: 'Archivo fuera del directorio administrado' };
        }
        const relativePath = url.slice(markerIndex + urlMarker.length);
        const filePath = path.resolve(uploadsRoot, relativePath);
        if (filePath.startsWith(uploadsRoot) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
        }
        return { success: true, message: 'Archivo eliminado correctamente' };
    }
};
exports.UploadController = UploadController;
__decorate([
    (0, common_1.Post)('excel'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadExcel", null);
__decorate([
    (0, common_1.Post)('fis/participants-excel'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadFisParticipantsExcel", null);
__decorate([
    (0, common_1.Post)('community/cortes-excel'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadCommunityCortesExcel", null);
__decorate([
    (0, common_1.Post)('media'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: (req, file, cb) => {
                try {
                    const category = sanitizeSegment(req.body?.category || 'general');
                    const year = sanitizeSegment(req.body?.year || 'sin-edicion');
                    const projectName = sanitizeSegment(req.body?.projectName || req.body?.project || 'sin-proyecto');
                    const resourceType = sanitizeSegment(req.body?.resourceType || req.body?.type || 'misc');
                    const targetDir = path.join(process.cwd(), 'uploads', category, year, projectName);
                    fs.mkdirSync(targetDir, { recursive: true });
                    cb(null, targetDir);
                }
                catch (error) {
                    cb(error, path.join(process.cwd(), 'uploads'));
                }
            },
            filename: (req, file, cb) => {
                const resourceType = sanitizeSegment(req.body?.resourceType || req.body?.type || 'misc');
                const randomName = Array(32)
                    .fill(null)
                    .map(() => Math.round(Math.random() * 16).toString(16))
                    .join('');
                return cb(null, `${resourceType}-${randomName}${(0, path_1.extname)(file.originalname)}`);
            },
        }),
        limits: {
            fileSize: 25 * 1024 * 1024,
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadMedia", null);
__decorate([
    (0, common_1.Post)('media/delete'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "deleteMedia", null);
exports.UploadController = UploadController = __decorate([
    (0, common_1.Controller)('upload'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __param(0, (0, common_1.Inject)(upload_service_1.UploadService)),
    __metadata("design:paramtypes", [Object])
], UploadController);
//# sourceMappingURL=upload.controller.js.map