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
exports.UserSeedService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../users/user.entity");
const bcrypt = __importStar(require("bcrypt"));
let UserSeedService = class UserSeedService {
    userRepository;
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async onModuleInit() {
        await this.seedUsers();
    }
    async seedUsers() {
        const count = await this.userRepository.count();
        if (count === 0) {
            const hash = await bcrypt.hash('Kriete123', 10);
            const users = [
                { nombre: 'Geo', apellido: 'Albanés', email: 'geovanny.albanes@fundaciongloriakriete.org', password_hash: hash, rol_id: 1, temporal: false },
                { nombre: 'Juana', apellido: 'Jule', email: 'juana.jule@fundaciongloriakriete.org', password_hash: hash, rol_id: 2, temporal: false },
                { nombre: 'Violeta', apellido: 'Melendez', email: 'violeta.melendez@fundaciongloriakriete.org', password_hash: hash, rol_id: 3, temporal: false },
                { nombre: 'Jose Manuel', apellido: 'Garcia', email: 'jose.garcia@fundaciongloriakriete.org', password_hash: hash, rol_id: 4, temporal: false },
                { nombre: 'Irvin', apellido: 'Montalvo', email: 'irvin.bonilla@fundaciongloriakriete.org', password_hash: hash, rol_id: 5, temporal: false },
            ];
            await this.userRepository.save(users);
            console.log('Logueo Exitoso');
        }
    }
};
exports.UserSeedService = UserSeedService;
exports.UserSeedService = UserSeedService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], UserSeedService);
//# sourceMappingURL=user.seed.service.js.map