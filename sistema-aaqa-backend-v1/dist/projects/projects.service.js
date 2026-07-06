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
exports.ProjectsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let ProjectsService = class ProjectsService {
    entityManager;
    constructor(entityManager) {
        this.entityManager = entityManager;
    }
    async onModuleInit() {
        await this.ensureTimelineSchema();
        await this.ensureProjectCoreSchema();
        await this.ensureProjectDocumentsSchema();
        await this.ensureProjectActivitiesSchema();
        await this.ensureProjectCommentsSchema();
        await this.ensureMonthlyReportsSchema();
    }
    normalizeCategory(category) {
        const value = (category ?? '').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (value.includes('comunitari') || value.includes('community') || value === 'dc') {
            return 'Community';
        }
        if (value.includes('fis') || value.includes('emprend') || value.includes('incub')) {
            return 'FIS';
        }
        return 'ONG';
    }
    getCategoryCode(category) {
        const normalized = this.normalizeCategory(category);
        if (normalized === 'Community')
            return 'DC';
        if (normalized === 'FIS')
            return 'FIS';
        return 'ONG';
    }
    getProjectIdCandidates(projectId, category) {
        const value = (projectId ?? '').toString().trim();
        const candidates = new Set([value]);
        const categoryCode = category ? this.getCategoryCode(category) : null;
        const modern = value.match(/^(ONG|DC|FIS)(\d{4})-(\d{2})$/);
        if (modern) {
            const [, code, year, seq] = modern;
            const legacyCode = code === 'DC' ? 'COM' : code;
            candidates.add(`${year}${seq}`);
            candidates.add(`${year}${seq}-${legacyCode}`);
            candidates.add(`${year}${seq}-${code}`);
            candidates.add(`${code}${year}-${seq}`);
            if (code === 'DC') {
                candidates.add(`COM${year}-${seq}`);
            }
        }
        const legacy = value.match(/^(\d{6})(?:-(ONG|COM|FIS))?$/);
        if (legacy) {
            const [, base, code] = legacy;
            const year = base.substring(0, 4);
            const seq = base.substring(4);
            const normalizedCode = code === 'COM' ? 'DC' : (code || categoryCode || 'ONG');
            candidates.add(`${normalizedCode}${year}-${seq}`);
            candidates.add(`${base}-${code || normalizedCode}`);
            if (normalizedCode === 'DC') {
                candidates.add(`${base}-COM`);
            }
        }
        if (categoryCode && /^\d{6}$/.test(value)) {
            const year = value.substring(0, 4);
            const seq = value.substring(4);
            candidates.add(`${categoryCode}${year}-${seq}`);
            candidates.add(`${value}-${categoryCode}`);
            if (categoryCode === 'DC') {
                candidates.add(`${value}-COM`);
            }
        }
        return Array.from(candidates).filter(Boolean);
    }
    normalizeScheduleStatus(value) {
        const status = (value ?? '').toString().trim().toLowerCase();
        if (status.includes('finaliz') || status === 'completed')
            return 'completed';
        if (status.includes('tiempo') || status.includes('ejec') || status.includes('adelant') || status.includes('retras') || status.includes('proceso') || status === 'active')
            return 'active';
        if (status.includes('pend') || status === 'pending')
            return 'pending';
        return 'pending';
    }
    normalizeActivityStatus(value) {
        const status = (value ?? '').toString().trim().toLowerCase();
        if (status.includes('finaliz') || status.includes('complet'))
            return 'completed';
        if (status.includes('ejec') || status.includes('avance') || status.includes('activo') || status === 'active' || status.includes('proces'))
            return 'active';
        return 'pending';
    }
    getMonthNumber(value) {
        if (value === null || value === undefined || value === '')
            return null;
        const raw = value.toString().trim().toLowerCase();
        const numeric = parseInt(raw, 10);
        if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= 12) {
            return numeric;
        }
        const normalized = raw
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
        const monthMap = {
            enero: 1,
            ene: 1,
            febrero: 2,
            feb: 2,
            marzo: 3,
            mar: 3,
            abril: 4,
            abr: 4,
            mayo: 5,
            may: 5,
            junio: 6,
            jun: 6,
            julio: 7,
            jul: 7,
            agosto: 8,
            ago: 8,
            septiembre: 9,
            setiembre: 9,
            sep: 9,
            sept: 9,
            octubre: 10,
            oct: 10,
            noviembre: 11,
            nov: 11,
            diciembre: 12,
            dic: 12,
        };
        return monthMap[normalized] || null;
    }
    buildTimelineMonthSequence(startMonth, durationMonths) {
        const start = Math.max(1, Math.min(12, startMonth || 1));
        const duration = Math.max(1, Math.min(12, durationMonths || 12));
        return Array.from({ length: duration }, (_, idx) => ((start - 1 + idx) % 12) + 1);
    }
    computeTimelineDurationMonths(startMonth, endMonth) {
        if (!startMonth || !endMonth)
            return null;
        const start = Math.max(1, Math.min(12, startMonth));
        const end = Math.max(1, Math.min(12, endMonth));
        return end >= start ? (end - start + 1) : ((12 - start + 1) + end);
    }
    deriveTimelineEndMonth(startMonth, durationMonths) {
        if (!startMonth || !durationMonths)
            return null;
        const start = Math.max(1, Math.min(12, startMonth));
        const duration = Math.max(1, Math.min(24, durationMonths));
        return ((start - 1 + duration - 1) % 12) + 1;
    }
    normalizeMetaFinancial(value) {
        if (value === null || value === undefined || value === '')
            return null;
        const text = String(value).trim().replace(/\$/g, '').replace(/\s+/g, '').replace(/%/g, '');
        if (!text)
            return null;
        let normalized = text;
        const hasComma = normalized.includes(',');
        const hasDot = normalized.includes('.');
        if (hasComma && hasDot) {
            if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
                normalized = normalized.replace(/\./g, '').replace(/,/g, '.');
            }
            else {
                normalized = normalized.replace(/,/g, '');
            }
        }
        else if (hasComma && !hasDot) {
            const commaCount = (normalized.match(/,/g) || []).length;
            const commaIndex = normalized.lastIndexOf(',');
            const decimals = normalized.length - commaIndex - 1;
            if (commaCount === 1 && decimals > 0 && decimals <= 2) {
                normalized = normalized.replace(/,/g, '.');
            }
            else {
                normalized = normalized.replace(/,/g, '');
            }
        }
        else {
            normalized = normalized.replace(/,/g, '');
        }
        const parsed = Number(normalized.replace(/[^0-9.-]/g, ''));
        return Number.isFinite(parsed) ? parsed : null;
    }
    validateMetaFinancialAgainstFgk(metaFinancial, fgkAmount, context = 'seguimiento') {
        const meta = this.normalizeMetaFinancial(metaFinancial);
        const fgk = Number(fgkAmount || 0);
        if (meta !== null && fgk > 0 && meta > fgk) {
            throw new Error(`La meta financiera del ${context} no puede ser mayor que la Inversión FGK (${fgk}).`);
        }
        return meta;
    }
    async ensureTimelineSchema() {
        const existingColumns = await this.entityManager.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proyectos'
        AND COLUMN_NAME IN ('mes_inicio', 'mes_final', 'duracion_meses')
    `);
        const found = new Set(existingColumns.map((row) => row.COLUMN_NAME));
        if (!found.has('mes_inicio')) {
            await this.entityManager.query(`ALTER TABLE proyectos ADD COLUMN mes_inicio TINYINT NULL AFTER edicion_id`);
        }
        if (!found.has('mes_final')) {
            await this.entityManager.query(`ALTER TABLE proyectos ADD COLUMN mes_final TINYINT NULL AFTER mes_inicio`);
        }
        if (!found.has('duracion_meses')) {
            await this.entityManager.query(`ALTER TABLE proyectos ADD COLUMN duracion_meses TINYINT NULL AFTER mes_final`);
        }
    }
    async ensureProjectCoreSchema() {
        const schemaColumns = [
            { name: 'municipio', definition: 'VARCHAR(150) NULL', after: 'departamento' },
            { name: 'distrito', definition: 'VARCHAR(150) NULL', after: 'municipio' },
            { name: 'beneficiarios_indirectos', definition: 'INT NULL', after: 'beneficiarios_directos' },
            { name: 'organization_logo', definition: 'TEXT NULL', after: 'beneficiarios_indirectos' },
            { name: 'logo_url', definition: 'TEXT NULL', after: 'organization_logo' },
            { name: 'meta_financiera', definition: 'DECIMAL(12,2) NULL', after: 'logo_url' },
            { name: 'nombre_aliado', definition: 'VARCHAR(255) NULL', after: 'contrapartida_org' },
            { name: 'estado', definition: 'VARCHAR(50) NULL', after: 'beneficiarios_indirectos' },
            { name: 'mes_inicio', definition: 'TINYINT NULL', after: 'edicion_id' },
            { name: 'mes_final', definition: 'TINYINT NULL', after: 'mes_inicio' },
            { name: 'duracion_meses', definition: 'TINYINT NULL', after: 'mes_final' },
            { name: 'contacto_1_nombre', definition: 'VARCHAR(255) NULL', after: 'meta_financiera' },
            { name: 'contacto_1_cargo', definition: 'VARCHAR(255) NULL', after: 'contacto_1_nombre' },
            { name: 'contacto_1_telefono_directo', definition: 'VARCHAR(80) NULL', after: 'contacto_1_cargo' },
            { name: 'contacto_1_telefono_organizacion', definition: 'VARCHAR(80) NULL', after: 'contacto_1_telefono_directo' },
            { name: 'contacto_1_correo', definition: 'VARCHAR(255) NULL', after: 'contacto_1_telefono_organizacion' },
            { name: 'contacto_2_nombre', definition: 'VARCHAR(255) NULL', after: 'contacto_1_correo' },
            { name: 'contacto_2_cargo', definition: 'VARCHAR(255) NULL', after: 'contacto_2_nombre' },
            { name: 'contacto_2_telefono_directo', definition: 'VARCHAR(80) NULL', after: 'contacto_2_cargo' },
            { name: 'contacto_2_telefono_organizacion', definition: 'VARCHAR(80) NULL', after: 'contacto_2_telefono_directo' },
            { name: 'contacto_2_correo', definition: 'VARCHAR(255) NULL', after: 'contacto_2_telefono_organizacion' },
        ];
        const existingColumns = await this.entityManager.query(`
      SELECT COLUMN_NAME, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proyectos'
        AND COLUMN_NAME IN (${schemaColumns.map((column) => `'${column.name}'`).join(', ')})
    `);
        const found = new Map(existingColumns.map((row) => [row.COLUMN_NAME, row.IS_NULLABLE]));
        for (const column of schemaColumns) {
            if (!found.has(column.name)) {
                await this.entityManager.query(`ALTER TABLE proyectos ADD COLUMN ${column.name} ${column.definition} AFTER ${column.after}`);
                continue;
            }
            if (found.get(column.name) !== 'YES') {
                await this.entityManager.query(`ALTER TABLE proyectos MODIFY COLUMN ${column.name} ${column.definition}`);
            }
        }
    }
    async ensureProjectDocumentsSchema() {
        await this.entityManager.query(`
      CREATE TABLE IF NOT EXISTS proyecto_documentos (
        id VARCHAR(80) PRIMARY KEY,
        proyecto_id VARCHAR(80) NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        url TEXT NOT NULL,
        subido_por INT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_proyecto_documentos_proyecto (proyecto_id),
        INDEX idx_proyecto_documentos_tipo (tipo)
      )
    `);
    }
    async ensureProjectActivitiesSchema() {
        await this.entityManager.query(`
      CREATE TABLE IF NOT EXISTS proyecto_actividades (
        id VARCHAR(80) PRIMARY KEY,
        proyecto_id VARCHAR(80) NOT NULL,
        nombre VARCHAR(255) NOT NULL,
        mes TINYINT NOT NULL DEFAULT 1,
        estado VARCHAR(30) NOT NULL DEFAULT 'pending',
        observaciones TEXT NULL,
        source VARCHAR(20) NOT NULL DEFAULT 'manual',
        manual_locked TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_proyecto_actividades_proyecto (proyecto_id),
        INDEX idx_proyecto_actividades_mes (mes),
        INDEX idx_proyecto_actividades_estado (estado)
      )
    `);
        const existingColumns = await this.entityManager.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proyecto_actividades'
        AND COLUMN_NAME = 'observaciones'
    `);
        if (!existingColumns.some((row) => row.COLUMN_NAME === 'observaciones')) {
            await this.entityManager.query(`ALTER TABLE proyecto_actividades ADD COLUMN observaciones TEXT NULL AFTER estado`);
        }
        const sourceColumns = await this.entityManager.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proyecto_actividades'
        AND COLUMN_NAME = 'source'
    `);
        if (!sourceColumns.some((row) => row.COLUMN_NAME === 'source')) {
            await this.entityManager.query(`ALTER TABLE proyecto_actividades ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'manual' AFTER observaciones`);
        }
        const manualLockedColumns = await this.entityManager.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proyecto_actividades'
        AND COLUMN_NAME = 'manual_locked'
    `);
        if (!manualLockedColumns.some((row) => row.COLUMN_NAME === 'manual_locked')) {
            await this.entityManager.query(`ALTER TABLE proyecto_actividades ADD COLUMN manual_locked TINYINT(1) NOT NULL DEFAULT 1 AFTER source`);
        }
        await this.entityManager.query(`CREATE UNIQUE INDEX uniq_proyecto_actividades_nombre_mes ON proyecto_actividades (proyecto_id, mes, nombre)`).catch(() => void 0);
        await this.entityManager.query(`
      CREATE TABLE IF NOT EXISTS proyecto_mes_observaciones (
        id VARCHAR(90) PRIMARY KEY,
        proyecto_id VARCHAR(80) NOT NULL,
        mes TINYINT NOT NULL,
        observaciones TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_proyecto_mes_observaciones (proyecto_id, mes),
        INDEX idx_proyecto_mes_observaciones_proyecto (proyecto_id),
        INDEX idx_proyecto_mes_observaciones_mes (mes)
      )
    `);
    }
    async ensureProjectCommentsSchema() {
        await this.entityManager.query(`
      CREATE TABLE IF NOT EXISTS proyecto_mes_comentarios (
        id VARCHAR(90) PRIMARY KEY,
        proyecto_id VARCHAR(80) NOT NULL,
        mes TINYINT NOT NULL,
        comentario TEXT NOT NULL,
        autor VARCHAR(150) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_proyecto_mes_comentarios_proyecto (proyecto_id),
        INDEX idx_proyecto_mes_comentarios_mes (mes)
      )
    `);
    }
    async ensureMonthlyReportsSchema() {
        const existingColumns = await this.entityManager.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'reportes_mensuales'
        AND COLUMN_NAME = 'meta_financiera'
    `);
        const yearColumns = await this.entityManager.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'reportes_mensuales'
        AND COLUMN_NAME = 'anio'
    `);
        if (!yearColumns.some((row) => row.COLUMN_NAME === 'anio')) {
            await this.entityManager.query(`ALTER TABLE reportes_mensuales ADD COLUMN anio INT NULL AFTER mes`);
            await this.entityManager.query(`UPDATE reportes_mensuales SET anio = año WHERE anio IS NULL`).catch(() => void 0);
        }
        if (!existingColumns.some((row) => row.COLUMN_NAME === 'meta_financiera')) {
            await this.entityManager.query(`ALTER TABLE reportes_mensuales ADD COLUMN meta_financiera DECIMAL(12,2) NULL AFTER avance_financiero_real`);
        }
        await this.entityManager.query(`ALTER TABLE reportes_mensuales MODIFY COLUMN estado_cronograma VARCHAR(40) NULL`);
    }
    splitUrls(value) {
        if (Array.isArray(value)) {
            return value.map(v => (v ?? '').toString().trim()).filter(Boolean);
        }
        if (!value)
            return [];
        return value
            .toString()
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    }
    safeParseJsonArray(value) {
        if (Array.isArray(value))
            return value;
        if (!value)
            return [];
        if (typeof value !== 'string')
            return [];
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        }
        catch {
            return [];
        }
    }
    safeParseJsonObject(value) {
        if (value === null || value === undefined)
            return null;
        if (typeof value !== 'string')
            return value;
        const trimmed = value.trim();
        if (!trimmed || trimmed === 'null' || trimmed === 'undefined')
            return null;
        try {
            return JSON.parse(trimmed);
        }
        catch {
            return null;
        }
    }
    async syncProjectPhotos(projectId, photos = [], userId) {
        await this.entityManager.query(`DELETE FROM fotos_proyecto WHERE proyecto_id = ?`, [projectId]);
        for (const url of photos.filter(Boolean)) {
            await this.entityManager.query(`INSERT INTO fotos_proyecto (id, proyecto_id, url, subido_por, created_at)
         VALUES (?, ?, ?, ?, NOW())`, [`foto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, projectId, url, userId || null]);
        }
    }
    async syncProjectDocuments(projectId, completionLetter, changeControlDocuments, monthlyTrackingDocuments, userId) {
        await this.entityManager.query(`DELETE FROM proyecto_documentos WHERE proyecto_id = ? AND tipo IN ('completion_letter', 'change_control', 'monthly_tracking')`, [projectId]);
        const completionUrls = this.splitUrls(completionLetter);
        for (const url of completionUrls) {
            await this.entityManager.query(`INSERT INTO proyecto_documentos (id, proyecto_id, tipo, url, subido_por, created_at)
         VALUES (?, ?, 'completion_letter', ?, ?, NOW())`, [`doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, projectId, url, userId || null]);
        }
        const changeUrls = this.splitUrls(changeControlDocuments);
        for (const url of changeUrls) {
            await this.entityManager.query(`INSERT INTO proyecto_documentos (id, proyecto_id, tipo, url, subido_por, created_at)
         VALUES (?, ?, 'change_control', ?, ?, NOW())`, [`doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, projectId, url, userId || null]);
        }
        const trackingUrls = this.splitUrls(monthlyTrackingDocuments);
        for (const url of trackingUrls) {
            await this.entityManager.query(`INSERT INTO proyecto_documentos (id, proyecto_id, tipo, url, subido_por, created_at)
         VALUES (?, ?, 'monthly_tracking', ?, ?, NOW())`, [`doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, projectId, url, userId || null]);
        }
    }
    async recalculateProjectProgress(projectId) {
        const projectMeta = await this.entityManager.query(`SELECT p.mes_inicio as startMonth, p.mes_final as endMonth, p.duracion_meses as durationMonths, e.año as projectYear
       FROM proyectos p
       JOIN ediciones e ON p.edicion_id = e.id
       WHERE p.id = ? LIMIT 1`, [projectId]);
        const timelineStartMonth = this.getMonthNumber(projectMeta[0]?.startMonth);
        const timelineEndMonth = this.getMonthNumber(projectMeta[0]?.endMonth);
        const timelineDurationMonths = projectMeta[0]?.durationMonths
            ? parseInt(projectMeta[0].durationMonths, 10)
            : (timelineStartMonth && timelineEndMonth
                ? this.computeTimelineDurationMonths(timelineStartMonth, timelineEndMonth)
                : 12);
        const projectYear = parseInt(projectMeta[0]?.projectYear, 10) || new Date().getFullYear();
        const activities = await this.entityManager.query(`SELECT id, nombre as name, mes as month, estado as status
       FROM proyecto_actividades
       WHERE proyecto_id = ?
       ORDER BY mes ASC, created_at ASC`, [projectId]);
        const reports = await this.entityManager.query(`SELECT mes, COALESCE(anio, año) as year, avance_tecnico_real as realTechnical, avance_financiero_real as realFinancial, meta_financiera as metaFinancial, estado_cronograma as scheduleStatus
       FROM reportes_mensuales
       WHERE proyecto_id = ? AND mes BETWEEN 1 AND 12
       ORDER BY COALESCE(anio, año) DESC, mes ASC`, [projectId]);
        const timeline = Array(12).fill('pending');
        const statusToNormalized = (value) => {
            const status = (value ?? '').toString().trim().toLowerCase();
            if (status.includes('finaliz') || status === 'completed')
                return 'completed';
            if (status.includes('proceso') || status.includes('ejec') || status.includes('avance') || status === 'active')
                return 'active';
            if (status.includes('pend') || status === 'pending')
                return 'pending';
            return 'pending';
        };
        const timelineSlots = Array.from({ length: timelineDurationMonths }, (_, idx) => {
            const date = new Date(projectYear, (timelineStartMonth || 1) - 1 + idx, 1);
            return { month: date.getMonth() + 1, year: date.getFullYear() };
        });
        const grouped = new Map();
        for (const activity of activities) {
            const month = this.getMonthNumber(activity.month) || 1;
            const list = grouped.get(month) || [];
            list.push(activity);
            grouped.set(month, list);
        }
        if (reports.length > 0) {
            for (const slot of timelineSlots) {
                const matchingReport = [...reports].reverse().find((report) => {
                    const reportMonth = parseInt(report.mes, 10) || 0;
                    const reportYear = parseInt(report.year, 10) || 0;
                    return reportMonth === slot.month && reportYear === slot.year;
                });
                if (matchingReport) {
                    timeline[slot.month - 1] = statusToNormalized(matchingReport.scheduleStatus);
                }
            }
        }
        else if (activities.length > 0) {
            for (const [month, list] of grouped.entries()) {
                const statuses = list.map((item) => this.normalizeActivityStatus(item.status));
                if (statuses.every((status) => status === 'completed')) {
                    timeline[month - 1] = 'completed';
                }
                else if (statuses.some((status) => status === 'completed' || status === 'active')) {
                    timeline[month - 1] = 'active';
                }
            }
        }
        else {
            for (const report of reports) {
                if (report.mes >= 1 && report.mes <= 12) {
                    timeline[report.mes - 1] = this.normalizeScheduleStatus(report.scheduleStatus);
                }
            }
        }
        let cumulativeTechnical = 0;
        if (reports.length > 0) {
            const monthScores = timelineSlots.map((slot) => {
                const report = [...reports].reverse().find((item) => {
                    const reportMonth = parseInt(item.mes, 10) || 0;
                    const reportYear = parseInt(item.year, 10) || 0;
                    return reportMonth === slot.month && reportYear === slot.year;
                });
                const status = statusToNormalized(report?.scheduleStatus);
                if (status === 'completed')
                    return 100;
                if (status === 'active')
                    return 50;
                return 0;
            });
            cumulativeTechnical = Math.min(100, Number((monthScores.reduce((sum, value) => sum + value, 0) / Math.max(1, timelineSlots.length)).toFixed(2)));
        }
        else if (activities.length > 0) {
            const groupedByMonth = new Map();
            for (const activity of activities) {
                const month = this.getMonthNumber(activity.month) || 1;
                const list = groupedByMonth.get(month) || [];
                list.push(activity);
                groupedByMonth.set(month, list);
            }
            const monthSequence = this.buildTimelineMonthSequence(timelineStartMonth, timelineDurationMonths);
            const monthScores = [];
            for (const month of monthSequence) {
                const list = groupedByMonth.get(month) || [];
                if (list.length === 0) {
                    monthScores.push(0);
                    continue;
                }
                const statuses = list.map((item) => this.normalizeActivityStatus(item.status));
                const completedCount = statuses.filter((status) => status === 'completed').length;
                const activeCount = statuses.filter((status) => status === 'active').length;
                const score = ((completedCount + (activeCount * 0.5)) / Math.max(1, list.length)) * 100;
                monthScores.push(score);
            }
            cumulativeTechnical = Math.min(100, Number((monthScores.reduce((sum, value) => sum + value, 0) / Math.max(1, timelineDurationMonths)).toFixed(2)));
        }
        let cumulativeFinancial = 0;
        if (reports.length > 0) {
            const totalExecutedAmount = reports.reduce((sum, report) => sum + (parseFloat(report.metaFinancial) || 0), 0);
            if (totalExecutedAmount > 0) {
                const amountRow = await this.entityManager.query(`SELECT monto_fgk as amountFGK FROM proyectos WHERE id = ? LIMIT 1`, [projectId]);
                const baseAmount = parseFloat(amountRow[0]?.amountFGK) || 0;
                cumulativeFinancial = baseAmount > 0
                    ? Math.min(100, Number(((totalExecutedAmount / baseAmount) * 100).toFixed(2)))
                    : 0;
            }
            else {
                const latestReport = [...reports].sort((a, b) => {
                    if (a.year !== b.year)
                        return a.year - b.year;
                    return a.month - b.month;
                }).at(-1);
                cumulativeFinancial = Math.min(100, Number((parseFloat(latestReport?.realFinancial) || 0).toFixed(2)));
            }
        }
        await this.entityManager.query(`UPDATE proyectos SET progreso_tecnico = ?, progreso_financiero = ?, updated_at = NOW() WHERE id = ?`, [cumulativeTechnical, cumulativeFinancial, projectId]);
        return { cumulativeTechnical, cumulativeFinancial, timeline, activities };
    }
    async findOrCreateOrganization(orgName, category) {
        const normalizedName = (orgName ?? '').toString().trim();
        const normalizedCategory = this.normalizeCategory(category);
        const existing = await this.entityManager.query(`SELECT id FROM organizaciones WHERE nombre = ? AND categoria = ?`, [normalizedName, normalizedCategory]);
        if (existing.length > 0) {
            const orgId = existing[0].id;
            await this.entityManager.query(`UPDATE organizaciones SET categoria = ?, tipo_organizacion = ? WHERE id = ?`, [normalizedCategory, normalizedCategory === 'Community' ? 'ADESCO' : 'ONG', orgId]);
            return orgId;
        }
        const newOrgId = `org-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        await this.entityManager.query(`INSERT INTO organizaciones (id, nombre, categoria, tipo_organizacion) VALUES (?, ?, ?, ?)`, [newOrgId, normalizedName, normalizedCategory, normalizedCategory === 'Community' ? 'ADESCO' : 'ONG']);
        return newOrgId;
    }
    async generateCustomProjectId(year, category, manager) {
        const em = manager || this.entityManager;
        const categoryCode = this.getCategoryCode(category);
        const query = `SELECT id FROM proyectos WHERE id LIKE ? OR id LIKE ? OR id LIKE ?`;
        const results = await em.query(query, [
            `${categoryCode}${year}-%`,
            `${year}%-${categoryCode}`,
            categoryCode === 'DC' ? `${year}%-COM` : `${year}%-${categoryCode}`,
        ]);
        const existingNumbers = results
            .map(row => {
            const idStr = row.id;
            const modernMatch = idStr.match(new RegExp(`^${categoryCode}${year}-(\\d{2})$`));
            if (modernMatch) {
                const num = parseInt(modernMatch[1], 10);
                return isNaN(num) ? null : num;
            }
            const legacyMatch = idStr.match(new RegExp(`^${year}(\\d{2})-${categoryCode}$`));
            if (legacyMatch) {
                const num = parseInt(legacyMatch[1], 10);
                return isNaN(num) ? null : num;
            }
            if (categoryCode === 'DC') {
                const legacyComMatch = idStr.match(new RegExp(`^${year}(\\d{2})-COM$`));
                if (legacyComMatch) {
                    const num = parseInt(legacyComMatch[1], 10);
                    return isNaN(num) ? null : num;
                }
            }
            return null;
        })
            .filter(n => n !== null)
            .sort((a, b) => a - b);
        let nextNum = 1;
        for (const num of existingNumbers) {
            if (num === nextNum) {
                nextNum++;
            }
            else if (num > nextNum) {
                break;
            }
        }
        const formattedNum = nextNum.toString().padStart(2, '0');
        return `${categoryCode}${year}-${formattedNum}`;
    }
    async updateProject(id, projectData, userId) {
        console.log(`?? Actualizando proyecto ${id} por usuario ${userId}`);
        const existing = await this.entityManager.query(`SELECT id, organizacion_id, edicion_id, meta_financiera FROM proyectos WHERE id = ?`, [id]);
        if (existing.length === 0) {
            return { success: false, message: 'Proyecto no encontrado' };
        }
        let organizacionId = existing[0].organizacion_id;
        const targetCategory = this.normalizeCategory(projectData.category || 'ONG');
        if (projectData.organization) {
            const orgName = projectData.organization.trim();
            const organizacion = await this.entityManager.query(`SELECT id FROM organizaciones WHERE nombre = ? AND categoria = ?`, [orgName, targetCategory]);
            if (organizacion.length === 0) {
                const newOrgId = `org-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                await this.entityManager.query(`INSERT INTO organizaciones (id, nombre, categoria, tipo_organizacion) VALUES (?, ?, ?, ?)`, [newOrgId, orgName, targetCategory, targetCategory === 'Community' ? 'ADESCO' : 'ONG']);
                organizacionId = newOrgId;
            }
            else {
                organizacionId = organizacion[0].id;
                await this.entityManager.query(`UPDATE organizaciones SET categoria = ?, tipo_organizacion = ? WHERE id = ?`, [targetCategory, targetCategory === 'Community' ? 'ADESCO' : 'ONG', organizacionId]);
            }
        }
        let edicionId = null;
        if (projectData.year !== undefined) {
            const targetYear = parseInt(projectData.year);
            const edicion = await this.entityManager.query(`SELECT id FROM ediciones WHERE año = ? LIMIT 1`, [targetYear]);
            if (edicion.length === 0) {
                throw new Error(`El proyecto ${projectData.projectName || projectData.nombre_proyecto || 'seleccionado'} no se pudo guardar debido a que la edición ${targetYear} no est� disponible.`);
            }
            edicionId = edicion[0].id;
        }
        const startMonth = this.getMonthNumber(projectData.timelineStartMonth ?? projectData.mes_inicio ?? projectData.monthStart);
        const explicitDuration = projectData.timelineDurationMonths ?? projectData.duracion_meses ?? null;
        const inputDuration = explicitDuration ? parseInt(explicitDuration, 10) : null;
        const endMonth = this.getMonthNumber(projectData.timelineEndMonth ?? projectData.mes_final ?? projectData.monthEnd)
            || (startMonth && inputDuration ? this.deriveTimelineEndMonth(startMonth, inputDuration) : null);
        const durationMonths = this.computeTimelineDurationMonths(startMonth, endMonth) || inputDuration;
        const currentMetaFinancial = existing[0]?.meta_financiera ?? null;
        const nextMetaFinancial = projectData.metaFinancial !== undefined
            ? this.validateMetaFinancialAgainstFgk(projectData.metaFinancial ?? projectData.expectedFinancial ?? null, projectData.amountFGK || 0, 'seguimiento')
            : currentMetaFinancial;
        await this.entityManager.query(`
      UPDATE proyectos 
      SET 
        nombre_proyecto = ?,
        organizacion_id = ?,
        edicion_id = COALESCE(?, edicion_id),
        departamento = ?,
        municipio = ?,
        distrito = ?,
        organization_logo = ?,
        logo_url = ?,
        meta_financiera = ?,
        mes_inicio = ?,
        mes_final = ?,
        duracion_meses = ?,
        monto_fgk = ?,
        contrapartida_org = ?,
        nombre_aliado = ?,
        monto_aliados = ?,
        beneficiarios_directos = ?,
        beneficiarios_indirectos = ?,
        estado = ?,
        progreso_tecnico = ?,
        progreso_financiero = ?,
        contacto_1_nombre = ?,
        contacto_1_cargo = ?,
        contacto_1_telefono_directo = ?,
        contacto_1_telefono_organizacion = ?,
        contacto_1_correo = ?,
        contacto_2_nombre = ?,
        contacto_2_cargo = ?,
        contacto_2_telefono_directo = ?,
        contacto_2_telefono_organizacion = ?,
        contacto_2_correo = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [
            projectData.name,
            organizacionId,
            edicionId,
            projectData.department || 'San Salvador',
            projectData.municipality || null,
            projectData.district || null,
            projectData.organizationLogo || projectData.logoUrl || null,
            projectData.logoUrl || projectData.organizationLogo || null,
            nextMetaFinancial,
            startMonth,
            endMonth,
            durationMonths,
            projectData.amountFGK || 0,
            projectData.counterpart || 0,
            (projectData.allyName ?? projectData.nombreAliado ?? projectData.nombre_aliado ?? '').toString().trim() || null,
            projectData.amountAllies || 0,
            projectData.beneficiaries || 0,
            projectData.indirectBeneficiaries || 0,
            projectData.status || 'Activo',
            projectData.technicalProgressPercentage || 0,
            projectData.financialProgressPercentage || 0,
            projectData.contact1Name ?? projectData.contacto1Nombre ?? null,
            projectData.contact1Role ?? projectData.contacto1Cargo ?? null,
            projectData.contact1DirectPhone ?? projectData.contacto1TelefonoDirecto ?? null,
            projectData.contact1OrganizationPhone ?? projectData.contacto1TelefonoOrganizacion ?? null,
            projectData.contact1Email ?? projectData.contacto1Correo ?? null,
            projectData.contact2Name ?? projectData.contacto2Nombre ?? null,
            projectData.contact2Role ?? projectData.contacto2Cargo ?? null,
            projectData.contact2DirectPhone ?? projectData.contacto2TelefonoDirecto ?? null,
            projectData.contact2OrganizationPhone ?? projectData.contacto2TelefonoOrganizacion ?? null,
            projectData.contact2Email ?? projectData.contacto2Correo ?? null,
            id
        ]);
        if (projectData.photos !== undefined) {
            await this.syncProjectPhotos(id, this.splitUrls(projectData.photos), userId);
        }
        if (projectData.completionLetter !== undefined || projectData.changeControlDocuments !== undefined || projectData.monthlyTrackingDocuments !== undefined) {
            await this.syncProjectDocuments(id, projectData.completionLetter, projectData.changeControlDocuments, projectData.monthlyTrackingDocuments, userId);
        }
        if (projectData.activities !== undefined) {
            await this.syncProjectActivities(id, Array.isArray(projectData.activities) ? projectData.activities : []);
        }
        if (projectData.monthObservations !== undefined) {
            await this.syncProjectMonthObservations(id, projectData.monthObservations || {});
        }
        if (projectData.monthComments !== undefined) {
            await this.syncProjectMonthComments(id, projectData.monthComments || {});
        }
        if (projectData.reports !== undefined) {
            await this.syncProjectReports(id, Array.isArray(projectData.reports) ? projectData.reports : [], userId);
        }
        if (projectData.trainingDetails && Array.isArray(projectData.trainingDetails.participants)) {
            const projectIdCandidates = this.getProjectIdCandidates(id, projectData.category || projectData.categoryName || null);
            const projectIdPlaceholders = projectIdCandidates.map(() => '?').join(', ');
            await this.entityManager.query(`DELETE FROM participantes_formacion WHERE proyecto_id IN (${projectIdPlaceholders})`, projectIdCandidates);
            let participantIndex = 0;
            for (const participant of projectData.trainingDetails.participants) {
                if (participant.name) {
                    participantIndex++;
                    let finalParticipantId = participant.id;
                    if (!finalParticipantId || finalParticipantId.startsWith('part-')) {
                        finalParticipantId = `${id}-${participantIndex.toString().padStart(2, '0')}`;
                    }
                    await this.entityManager.query(`
            INSERT INTO participantes_formacion (id, proyecto_id, nombre, edad, genero, telefono, email, rol_cargo, estado_formacion, departamento)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
                        finalParticipantId,
                        id,
                        participant.name,
                        participant.age || null,
                        participant.gender === 'F' ? 'F' : 'M',
                        participant.phone || null,
                        participant.email || null,
                        participant.role || null,
                        participant.status === 'graduated' ? 'graduado' :
                            participant.status === 'in_progress' ? 'en_formacion' : 'inscrito',
                        participant.department || projectData.department || 'San Salvador'
                    ]);
                }
            }
        }
        if (projectData.allies && projectData.allies.length > 0) {
            const projectIdCandidates = this.getProjectIdCandidates(id, projectData.category || projectData.categoryName || null);
            const projectIdPlaceholders = projectIdCandidates.map(() => '?').join(', ');
            await this.entityManager.query(`DELETE FROM aliados_contribuciones WHERE proyecto_id IN (${projectIdPlaceholders})`, projectIdCandidates);
            for (const ally of projectData.allies) {
                if (ally.name) {
                    await this.entityManager.query(`
            INSERT INTO aliados_contribuciones (id, proyecto_id, nombre_aliado, monto, \`a\u00f1o\`)
            VALUES (?, ?, ?, ?, ?)
          `, [
                        ally.id || `al-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        id,
                        ally.name,
                        ally.amount || 0,
                        ally.year || projectData.year || 2025
                    ]);
                }
            }
        }
        else {
            await this.syncPrimaryAllyContribution(id, projectData.allyName ?? projectData.nombreAliado ?? projectData.nombre_aliado, projectData.amountAllies, projectData.year);
        }
        if (projectData.progress && Array.isArray(projectData.progress) && projectData.activities === undefined) {
            await this.entityManager.query(`
      INSERT INTO reportes_mensuales (id, proyecto_id, mes, anio, año, estado_cronograma, avance_tecnico_real, avance_financiero_real, meta_financiera, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          año = VALUES(año),
          estado_cronograma = VALUES(estado_cronograma),
          avance_tecnico_real = VALUES(avance_tecnico_real),
          avance_financiero_real = VALUES(avance_financiero_real),
          meta_financiera = VALUES(meta_financiera)
      `, [
                `cron-${id}-${projectData.year}`,
                id,
                0,
                projectData.year || 2025,
                projectData.year || 2025,
                'En Tiempo',
                projectData.technicalProgressPercentage || 0,
                projectData.financialProgressPercentage || 0,
                projectData.metaFinancial ?? projectData.expectedFinancial ?? null
            ]);
        }
        await this.recalculateProjectProgress(id);
        console.log(`? Proyecto ${id} actualizado correctamente`);
        const updatedProject = await this.getProjectById(id);
        return { success: true, message: 'Proyecto actualizado correctamente', data: updatedProject };
    }
    async syncProjectActivities(projectId, activities = []) {
        await this.entityManager.query(`DELETE FROM proyecto_actividades WHERE proyecto_id = ?`, [projectId]);
        let position = 0;
        for (const rawActivity of activities) {
            const name = (rawActivity?.name ?? rawActivity?.title ?? rawActivity?.actividad ?? rawActivity?.actividadNombre ?? '').toString().trim();
            if (!name)
                continue;
            position++;
            const parsedMonth = this.getMonthNumber(rawActivity?.month ?? rawActivity?.mes ?? position) || position;
            const normalizedStatus = this.normalizeActivityStatus(rawActivity?.status ?? rawActivity?.estado ?? 'pending');
            const note = (rawActivity?.observations ?? rawActivity?.note ?? rawActivity?.observacion ?? rawActivity?.observaciones ?? '').toString().trim() || null;
            const activityId = rawActivity?.id && !`${rawActivity.id}`.startsWith('act-')
                ? `${rawActivity.id}`
                : `act-${projectId}-${String(position).padStart(2, '0')}`;
            await this.entityManager.query(`INSERT INTO proyecto_actividades (id, proyecto_id, nombre, mes, estado, observaciones, source, manual_locked, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           nombre = VALUES(nombre),
           mes = VALUES(mes),
           estado = VALUES(estado),
           observaciones = VALUES(observaciones),
           source = VALUES(source),
           manual_locked = VALUES(manual_locked),
           updated_at = NOW()`, [activityId, projectId, name, parsedMonth, normalizedStatus, note, 'manual', 1]);
        }
    }
    async syncPrimaryAllyContribution(projectId, allyName, allyAmount, year) {
        const cleanName = (allyName ?? '').toString().trim();
        const amount = Number(allyAmount || 0);
        if (!cleanName || amount <= 0)
            return;
        await this.entityManager.query(`INSERT INTO aliados_contribuciones (id, proyecto_id, nombre_aliado, monto, \`a\u00f1o\`)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         nombre_aliado = VALUES(nombre_aliado),
         monto = VALUES(monto),
         \`a\u00f1o\` = VALUES(\`a\u00f1o\`)`, [`ally-${projectId}`, projectId, cleanName, amount, year || new Date().getFullYear()]);
    }
    async deleteProjectFiles(urls = []) {
        const uploadRoot = path.resolve(process.cwd(), 'uploads');
        const deleted = new Set();
        for (const rawUrl of urls) {
            if (!rawUrl || typeof rawUrl !== 'string')
                continue;
            const trimmed = rawUrl.trim();
            if (!trimmed || deleted.has(trimmed))
                continue;
            deleted.add(trimmed);
            try {
                let relativePath = trimmed;
                if (/^https?:\/\//i.test(trimmed)) {
                    const parsed = new URL(trimmed);
                    relativePath = parsed.pathname;
                }
                const uploadsIndex = relativePath.indexOf('/uploads/');
                if (uploadsIndex >= 0) {
                    relativePath = relativePath.slice(uploadsIndex + '/uploads/'.length);
                }
                else {
                    relativePath = relativePath.replace(/^\/+/, '');
                }
                const filePath = path.resolve(uploadRoot, relativePath);
                if (filePath.startsWith(uploadRoot) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                    fs.unlinkSync(filePath);
                }
            }
            catch {
            }
        }
    }
    slugifySegment(value) {
        return (value ?? '')
            .toString()
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9._-]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .toLowerCase() || 'general';
    }
    deleteDirectoryIfExists(targetPath, rootPath) {
        try {
            const resolvedRoot = path.resolve(rootPath);
            const resolvedTarget = path.resolve(targetPath);
            if (!resolvedTarget.startsWith(resolvedRoot))
                return false;
            if (fs.existsSync(resolvedTarget)) {
                fs.rmSync(resolvedTarget, { recursive: true, force: true });
                return true;
            }
        }
        catch {
        }
        return false;
    }
    async deleteProjectResourceFolders(projectId, projectInfo) {
        const uploadRoot = path.resolve(process.cwd(), 'uploads');
        const categoryRaw = projectInfo[0]?.category ?? '';
        const projectNameRaw = projectInfo[0]?.projectName ?? '';
        const projectYearRaw = projectInfo[0]?.year ?? '';
        const projectSlug = this.slugifySegment(projectNameRaw);
        const yearSlug = this.slugifySegment(projectYearRaw);
        const categoryCandidates = new Set([
            this.slugifySegment(categoryRaw),
        ]);
        const normalizedCategory = this.normalizeCategory(categoryRaw);
        if (normalizedCategory === 'Community') {
            categoryCandidates.add('community');
            categoryCandidates.add('dc');
            categoryCandidates.add('desarrollo-comunitario');
        }
        else if (normalizedCategory === 'FIS') {
            categoryCandidates.add('fis');
            categoryCandidates.add('emprendimiento-social');
        }
        else {
            categoryCandidates.add('ong');
        }
        for (const category of categoryCandidates) {
            this.deleteDirectoryIfExists(path.join(uploadRoot, category, yearSlug, projectSlug), uploadRoot);
            this.deleteDirectoryIfExists(path.join(uploadRoot, category, String(projectYearRaw), projectSlug), uploadRoot);
        }
        this.deleteDirectoryIfExists(path.join(uploadRoot, 'projects', projectId), uploadRoot);
    }
    async deleteProjectCascade(projectId) {
        const projectInfo = await this.entityManager.query(`SELECT p.id, p.nombre_proyecto as projectName, e.año as year, o.categoria as category
       FROM proyectos p
       JOIN ediciones e ON p.edicion_id = e.id
       JOIN organizaciones o ON p.organizacion_id = o.id
       WHERE p.id = ?`, [projectId]);
        const categoryCode = projectInfo[0]?.category ? this.getCategoryCode(projectInfo[0].category) : null;
        const candidateIds = this.getProjectIdCandidates(projectId, projectInfo[0]?.category);
        const placeholders = candidateIds.map(() => '?').join(', ');
        const photosRows = await this.entityManager.query(`SELECT url FROM fotos_proyecto WHERE proyecto_id IN (${placeholders})`, candidateIds);
        const documentRows = await this.entityManager.query(`SELECT url FROM proyecto_documentos WHERE proyecto_id IN (${placeholders})`, candidateIds);
        const reportRows = await this.entityManager.query(`SELECT fotos FROM reportes_mensuales WHERE proyecto_id IN (${placeholders})`, candidateIds);
        const fileUrls = [
            ...photosRows.map((row) => row.url).filter(Boolean),
            ...documentRows.map((row) => row.url).filter(Boolean),
            ...reportRows.flatMap((row) => this.safeParseJsonArray(row.fotos)),
        ];
        await this.entityManager.transaction(async (transactionalEntityManager) => {
            await transactionalEntityManager.query(`DELETE FROM proyecto_mes_observaciones WHERE proyecto_id IN (${placeholders})`, candidateIds);
            await transactionalEntityManager.query(`DELETE FROM proyecto_actividades WHERE proyecto_id IN (${placeholders})`, candidateIds);
            await transactionalEntityManager.query(`DELETE FROM proyecto_mes_comentarios WHERE proyecto_id IN (${placeholders})`, candidateIds);
            await transactionalEntityManager.query(`DELETE FROM reportes_mensuales WHERE proyecto_id IN (${placeholders})`, candidateIds);
            await transactionalEntityManager.query(`DELETE FROM proyecto_documentos WHERE proyecto_id IN (${placeholders})`, candidateIds);
            await transactionalEntityManager.query(`DELETE FROM fotos_proyecto WHERE proyecto_id IN (${placeholders})`, candidateIds);
            await transactionalEntityManager.query(`DELETE FROM aliados_contribuciones WHERE proyecto_id IN (${placeholders})`, candidateIds);
            await transactionalEntityManager.query(`DELETE FROM participantes_formacion WHERE proyecto_id IN (${placeholders})`, candidateIds);
            await transactionalEntityManager.query(`DELETE FROM proyectos WHERE id = ?`, [projectId]);
        });
        await this.deleteProjectFiles(fileUrls);
        await this.deleteProjectResourceFolders(projectId, projectInfo);
        return candidateIds;
    }
    async syncProjectMonthObservations(projectId, monthObservations = {}) {
        await this.entityManager.query(`DELETE FROM proyecto_mes_observaciones WHERE proyecto_id = ?`, [projectId]);
        const entries = Array.isArray(monthObservations)
            ? monthObservations
                .map((item) => ({
                month: Math.max(1, Math.min(12, parseInt(item?.month ?? item?.mes, 10) || 0)),
                observations: (item?.observations ?? item?.nota ?? item?.note ?? item?.observaciones ?? '').toString().trim(),
            }))
                .filter((item) => item.month > 0)
            : Object.entries(monthObservations || {})
                .map(([month, observations]) => ({
                month: Math.max(1, Math.min(12, parseInt(month, 10) || 0)),
                observations: (observations ?? '').toString().trim(),
            }))
                .filter((item) => item.month > 0);
        for (const item of entries) {
            await this.entityManager.query(`INSERT INTO proyecto_mes_observaciones (id, proyecto_id, mes, observaciones, created_at)
         VALUES (?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           observaciones = VALUES(observaciones),
           updated_at = NOW()`, [`pom-${projectId}-${String(item.month).padStart(2, '0')}`, projectId, item.month, item.observations || null]);
        }
    }
    async syncProjectMonthComments(projectId, monthComments = {}) {
        await this.entityManager.query(`DELETE FROM proyecto_mes_comentarios WHERE proyecto_id = ?`, [projectId]);
        const entries = Array.isArray(monthComments)
            ? monthComments
                .map((item) => ({
                month: Math.max(1, Math.min(12, parseInt(item?.month ?? item?.mes, 10) || 0)),
                comentario: (item?.comentario ?? item?.comment ?? item?.text ?? item?.observacion ?? '').toString().trim(),
                autor: (item?.autor ?? item?.author ?? item?.user ?? '').toString().trim(),
                id: (item?.id ?? '').toString().trim(),
            }))
                .filter((item) => item.month > 0 && item.comentario)
            : Object.entries(monthComments || {})
                .flatMap(([month, comments]) => {
                const monthNumber = Math.max(1, Math.min(12, parseInt(month, 10) || 0));
                if (Array.isArray(comments)) {
                    return comments.map((item) => ({
                        month: monthNumber,
                        comentario: (item?.comentario ?? item?.comment ?? item?.text ?? item?.observacion ?? '').toString().trim(),
                        autor: (item?.autor ?? item?.author ?? item?.user ?? '').toString().trim(),
                        id: (item?.id ?? '').toString().trim(),
                    }));
                }
                return [{
                        month: monthNumber,
                        comentario: (comments ?? '').toString().trim(),
                        autor: '',
                        id: '',
                    }];
            })
                .filter((item) => item.month > 0 && item.comentario);
        let counter = 0;
        for (const item of entries) {
            counter++;
            await this.entityManager.query(`INSERT INTO proyecto_mes_comentarios (id, proyecto_id, mes, comentario, autor, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           comentario = VALUES(comentario),
           autor = VALUES(autor),
           updated_at = NOW()`, [
                item.id || `pmc-${projectId}-${String(item.month).padStart(2, '0')}-${String(counter).padStart(2, '0')}`,
                projectId,
                item.month,
                item.comentario,
                item.autor || null,
            ]);
        }
    }
    async syncProjectReports(projectId, reports = [], userId) {
        await this.entityManager.query(`DELETE FROM reportes_mensuales WHERE proyecto_id = ?`, [projectId]);
        const projectInvestmentRow = await this.entityManager.query(`SELECT monto_fgk as amountFGK FROM proyectos WHERE id = ? LIMIT 1`, [projectId]);
        const projectAmountFGK = projectInvestmentRow[0]?.amountFGK || 0;
        let position = 0;
        for (const rawReport of reports) {
            position++;
            const month = Math.max(1, Math.min(12, parseInt(rawReport?.month ?? rawReport?.mes ?? position, 10) || position));
            const year = parseInt(rawReport?.year ?? rawReport?.ano ?? rawReport?.ano ?? 2025, 10) || 2025;
            const technical = Number(rawReport?.realTechnical ?? rawReport?.avance_tecnico_real ?? rawReport?.avanceTecnicoReal ?? 0) || 0;
            const financial = Number(rawReport?.realFinancial ?? rawReport?.avance_financiero_real ?? rawReport?.avanceFinancieroReal ?? 0) || 0;
            const metaFinancial = this.validateMetaFinancialAgainstFgk(rawReport?.metaFinancial ?? rawReport?.meta_financiera ?? rawReport?.expectedFinancial ?? rawReport?.expectedFinancialAmount ?? 0, projectAmountFGK, 'seguimiento') || 0;
            const scheduleStatus = (rawReport?.scheduleStatus ?? rawReport?.estado_cronograma ?? 'En Tiempo').toString().trim();
            const observations = (rawReport?.observations ?? rawReport?.observacion ?? rawReport?.observaciones ?? '').toString().trim();
            const photos = Array.isArray(rawReport?.photos) ? JSON.stringify(rawReport.photos) : JSON.stringify(this.splitUrls(rawReport?.photos));
            const createdBy = (rawReport?.createdBy ?? rawReport?.creado_por ?? `Usuario ${userId || ''}`).toString().trim() || `Usuario ${userId || ''}`;
            const reportId = (rawReport?.id ?? '').toString().trim() || `rep-${projectId}-${year}-${String(month).padStart(2, '0')}`;
            await this.entityManager.query(`
        INSERT INTO reportes_mensuales (id, proyecto_id, mes, anio, año, avance_tecnico_real, avance_financiero_real, meta_financiera, estado_cronograma, observaciones, fotos, creado_por, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          mes = VALUES(mes),
          anio = VALUES(anio),
          año = VALUES(año),
          avance_tecnico_real = VALUES(avance_tecnico_real),
          avance_financiero_real = VALUES(avance_financiero_real),
          meta_financiera = VALUES(meta_financiera),
          estado_cronograma = VALUES(estado_cronograma),
          observaciones = VALUES(observaciones),
          fotos = VALUES(fotos),
          creado_por = VALUES(creado_por),
          updated_at = NOW()
      `, [
                reportId,
                projectId,
                month,
                year,
                year,
                technical,
                financial,
                metaFinancial,
                scheduleStatus,
                observations,
                photos,
                createdBy
            ]);
        }
    }
    async createProject(projectData, userId) {
        console.log(`✨ Creando nuevo proyecto por usuario ${userId}`);
        const targetCategory = this.normalizeCategory(projectData.category || 'ONG');
        const organizacionId = await this.findOrCreateOrganization(projectData.organization, targetCategory);
        const edicion = await this.entityManager.query(`SELECT id FROM ediciones WHERE año = ?`, [projectData.year || 2025]);
        const edicionId = edicion[0]?.id || 20;
        const year = projectData.year || 2025;
        const startMonth = this.getMonthNumber(projectData.timelineStartMonth ?? projectData.mes_inicio ?? projectData.monthStart);
        const explicitDuration = projectData.timelineDurationMonths ?? projectData.duracion_meses ?? null;
        const inputDuration = explicitDuration ? parseInt(explicitDuration, 10) : null;
        const endMonth = this.getMonthNumber(projectData.timelineEndMonth ?? projectData.mes_final ?? projectData.monthEnd)
            || (startMonth && inputDuration ? this.deriveTimelineEndMonth(startMonth, inputDuration) : null);
        const durationMonths = this.computeTimelineDurationMonths(startMonth, endMonth) || inputDuration;
        const newId = await this.generateCustomProjectId(year, targetCategory);
        await this.entityManager.query(`
      INSERT INTO proyectos (id, organizacion_id, edicion_id, nombre_proyecto, departamento, municipio, distrito, organization_logo, logo_url, meta_financiera, mes_inicio, mes_final, duracion_meses, monto_fgk, contrapartida_org, nombre_aliado, monto_aliados, beneficiarios_directos, beneficiarios_indirectos, estado, progreso_tecnico, progreso_financiero, contacto_1_nombre, contacto_1_cargo, contacto_1_telefono_directo, contacto_1_telefono_organizacion, contacto_1_correo, contacto_2_nombre, contacto_2_cargo, contacto_2_telefono_directo, contacto_2_telefono_organizacion, contacto_2_correo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            newId,
            organizacionId,
            edicionId,
            projectData.name,
            projectData.department || 'San Salvador',
            projectData.municipality || null,
            projectData.district || null,
            projectData.organizationLogo || projectData.logoUrl || null,
            projectData.logoUrl || projectData.organizationLogo || null,
            this.validateMetaFinancialAgainstFgk(projectData.metaFinancial ?? projectData.expectedFinancial ?? null, projectData.amountFGK || 0, 'seguimiento'),
            startMonth,
            endMonth,
            durationMonths,
            projectData.amountFGK || 0,
            projectData.counterpart || 0,
            (projectData.allyName ?? projectData.nombreAliado ?? projectData.nombre_aliado ?? '').toString().trim() || null,
            projectData.amountAllies || 0,
            projectData.beneficiaries || 0,
            projectData.indirectBeneficiaries || 0,
            projectData.status ?? null,
            projectData.technicalProgressPercentage || 0,
            projectData.financialProgressPercentage || 0,
            projectData.contact1Name ?? projectData.contacto1Nombre ?? null,
            projectData.contact1Role ?? projectData.contacto1Cargo ?? null,
            projectData.contact1DirectPhone ?? projectData.contacto1TelefonoDirecto ?? null,
            projectData.contact1OrganizationPhone ?? projectData.contacto1TelefonoOrganizacion ?? null,
            projectData.contact1Email ?? projectData.contacto1Correo ?? null,
            projectData.contact2Name ?? projectData.contacto2Nombre ?? null,
            projectData.contact2Role ?? projectData.contacto2Cargo ?? null,
            projectData.contact2DirectPhone ?? projectData.contacto2TelefonoDirecto ?? null,
            projectData.contact2OrganizationPhone ?? projectData.contacto2TelefonoOrganizacion ?? null,
            projectData.contact2Email ?? projectData.contacto2Correo ?? null,
        ]);
        if (projectData.activities !== undefined) {
            await this.syncProjectActivities(newId, Array.isArray(projectData.activities) ? projectData.activities : []);
        }
        if (projectData.monthObservations !== undefined) {
            await this.syncProjectMonthObservations(newId, projectData.monthObservations || {});
        }
        if (projectData.monthComments !== undefined) {
            await this.syncProjectMonthComments(newId, projectData.monthComments || {});
        }
        if (projectData.reports !== undefined) {
            await this.syncProjectReports(newId, Array.isArray(projectData.reports) ? projectData.reports : [], userId);
        }
        if (projectData.completionLetter !== undefined || projectData.changeControlDocuments !== undefined || projectData.monthlyTrackingDocuments !== undefined) {
            await this.syncProjectDocuments(newId, projectData.completionLetter, projectData.changeControlDocuments, projectData.monthlyTrackingDocuments, userId);
        }
        if (projectData.trainingDetails && Array.isArray(projectData.trainingDetails.participants)) {
            let participantIndex = 0;
            for (const participant of projectData.trainingDetails.participants) {
                if (participant?.name) {
                    participantIndex++;
                    const finalParticipantId = participant.id && !participant.id.startsWith('part-')
                        ? participant.id
                        : `${newId}-${participantIndex.toString().padStart(2, '0')}`;
                    await this.entityManager.query(`
            INSERT INTO participantes_formacion (id, proyecto_id, nombre, edad, genero, telefono, email, rol_cargo, estado_formacion, departamento)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
                        finalParticipantId,
                        newId,
                        participant.name,
                        participant.age || null,
                        participant.gender === 'F' ? 'F' : 'M',
                        participant.phone || null,
                        participant.email || null,
                        participant.role || null,
                        participant.status === 'graduated' ? 'graduado'
                            : participant.status === 'dropped' ? 'retiro'
                                : participant.status === 'enrolled' ? 'inscrito'
                                    : participant.status === 'in_progress' ? 'en_formacion'
                                        : 'inscrito',
                        participant.department || projectData.department || 'San Salvador'
                    ]);
                }
            }
        }
        if (!(projectData.allies && projectData.allies.length > 0)) {
            await this.syncPrimaryAllyContribution(newId, projectData.allyName ?? projectData.nombreAliado ?? projectData.nombre_aliado, projectData.amountAllies, projectData.year);
        }
        await this.recalculateProjectProgress(newId);
        console.log(`✅ Proyecto ${newId} creado correctamente`);
        const createdProject = await this.getProjectById(newId);
        return { success: true, message: 'Proyecto creado correctamente', id: newId, data: createdProject };
    }
    async deleteProject(id, userId) {
        console.log(`??? Eliminando proyecto ${id} por usuario ${userId}`);
        const existing = await this.entityManager.query(`SELECT p.id, o.categoria as category
       FROM proyectos p
       JOIN organizaciones o ON p.organizacion_id = o.id
       WHERE p.id = ?`, [id]);
        if (existing.length === 0) {
            return { success: false, message: 'Proyecto no encontrado' };
        }
        await this.deleteProjectCascade(id);
        console.log(`? Proyecto ${id} eliminado correctamente`);
        return { success: true, message: 'Proyecto eliminado correctamente' };
    }
    async getProjectById(id) {
        const query = `
      SELECT 
        p.id,
        p.nombre_proyecto as name,
        o.nombre as organization,
        o.categoria as category,
        p.departamento as department,
        p.municipio as municipality,
        p.distrito as district,
        p.mes_inicio as timelineStartMonth,
        p.mes_final as timelineEndMonth,
        p.duracion_meses as timelineDurationMonths,
        p.monto_fgk as amountFGK,
        p.contrapartida_org as counterpart,
        p.nombre_aliado as allyName,
        p.monto_aliados as amountAllies,
        p.beneficiarios_directos as beneficiaries,
        p.beneficiarios_indirectos as indirectBeneficiaries,
        p.organization_logo as organizationLogo,
        p.logo_url as logoUrl,
        p.meta_financiera as metaFinancial,
        p.estado as status,
        p.contacto_1_nombre as contact1Name,
        p.contacto_1_cargo as contact1Role,
        p.contacto_1_telefono_directo as contact1DirectPhone,
        p.contacto_1_telefono_organizacion as contact1OrganizationPhone,
        p.contacto_1_correo as contact1Email,
        p.contacto_2_nombre as contact2Name,
        p.contacto_2_cargo as contact2Role,
        p.contacto_2_telefono_directo as contact2DirectPhone,
        p.contacto_2_telefono_organizacion as contact2OrganizationPhone,
        p.contacto_2_correo as contact2Email,
        e.año as year,
        p.progreso_tecnico as technicalProgressPercentage,
        p.progreso_financiero as financialProgressPercentage,
        p.created_at as createdAt,
        p.updated_at as updatedAt
      FROM proyectos p
      JOIN organizaciones o ON p.organizacion_id = o.id
      JOIN ediciones e ON p.edicion_id = e.id
      WHERE p.id = ?
    `;
        const results = await this.entityManager.query(query, [id]);
        if (results.length === 0)
            return null;
        const project = results[0];
        const canonicalProjectId = project.id.toString();
        const projectIdCandidates = this.getProjectIdCandidates(canonicalProjectId, project.category);
        const projectPlaceholders = projectIdCandidates.map(() => '?').join(',');
        const allies = await this.entityManager.query(`SELECT id, nombre_aliado as name, monto as amount, a\u00f1o as year, nota as note
       FROM aliados_contribuciones WHERE proyecto_id IN (${projectPlaceholders})`, projectIdCandidates);
        const participants = await this.entityManager.query(`SELECT id, nombre as name, edad as age, genero as gender, telefono as phone, email, rol_cargo as role, estado_formacion as status, departamento as department
       FROM participantes_formacion WHERE proyecto_id IN (${projectPlaceholders})`, projectIdCandidates);
        const reports = await this.entityManager.query(`SELECT id, mes as month, COALESCE(anio, año) as year, avance_tecnico_real as realTechnical, 
       avance_financiero_real as realFinancial, meta_financiera as metaFinancial, estado_cronograma as scheduleStatus, 
       observaciones as observations, fotos as photos, creado_por as createdBy, created_at as createdAt
       FROM reportes_mensuales WHERE proyecto_id IN (${projectPlaceholders}) ORDER BY COALESCE(anio, año) DESC, mes DESC`, projectIdCandidates);
        const activities = await this.entityManager.query(`SELECT id, proyecto_id, nombre as name, mes as month, estado as status, observaciones as observations, created_at as createdAt, updated_at as updatedAt
       FROM proyecto_actividades
       WHERE proyecto_id IN (${projectPlaceholders})
       ORDER BY mes ASC, created_at ASC`, projectIdCandidates);
        const progress = Array(12).fill('pending');
        const normalizeScheduleStatus = (value) => {
            const status = (value ?? '').toString().trim().toLowerCase();
            if (status.includes('finaliz') || status === 'completed')
                return 'completed';
            if (status.includes('proceso') || status.includes('ejec') || status.includes('adelant') || status.includes('retras') || status.includes('tiempo') || status === 'active')
                return 'active';
            if (status.includes('pend') || status === 'pending')
                return 'pending';
            return 'pending';
        };
        if (reports.length > 0) {
            for (const r of reports) {
                if (r.month >= 1 && r.month <= 12) {
                    progress[r.month - 1] = normalizeScheduleStatus(r.scheduleStatus);
                }
            }
        }
        else if (activities.length > 0) {
            const grouped = new Map();
            for (const activity of activities) {
                const month = this.getMonthNumber(activity.month) || 1;
                const list = grouped.get(month) || [];
                list.push(activity);
                grouped.set(month, list);
            }
            for (const [month, list] of grouped.entries()) {
                const statuses = list.map((item) => this.normalizeActivityStatus(item.status));
                if (statuses.every((status) => status === 'completed')) {
                    progress[month - 1] = 'completed';
                }
                else if (statuses.some((status) => status === 'completed' || status === 'active')) {
                    progress[month - 1] = 'active';
                }
            }
        }
        const photos = await this.entityManager.query(`SELECT url FROM fotos_proyecto WHERE proyecto_id IN (${projectPlaceholders}) ORDER BY created_at DESC`, projectIdCandidates);
        const documents = await this.entityManager.query(`SELECT tipo, url
       FROM proyecto_documentos
       WHERE proyecto_id IN (${projectPlaceholders})
       ORDER BY created_at DESC`, projectIdCandidates);
        const monthObservationsRows = await this.entityManager.query(`SELECT mes, observaciones
       FROM proyecto_mes_observaciones
       WHERE proyecto_id IN (${projectPlaceholders})
       ORDER BY mes ASC`, projectIdCandidates);
        const monthCommentsRows = await this.entityManager.query(`SELECT id, mes, comentario, autor, created_at as createdAt, updated_at as updatedAt
       FROM proyecto_mes_comentarios
       WHERE proyecto_id IN (${projectPlaceholders})
       ORDER BY mes ASC, created_at ASC`, projectIdCandidates);
        const completionLetterDocs = documents.filter((doc) => doc.tipo === 'completion_letter').map((doc) => doc.url);
        const changeControlDocs = documents.filter((doc) => doc.tipo === 'change_control').map((doc) => doc.url);
        const monthlyTrackingDocs = documents.filter((doc) => doc.tipo === 'monthly_tracking').map((doc) => doc.url);
        const monthObservations = monthObservationsRows.reduce((acc, row) => {
            acc[Math.max(1, Math.min(12, parseInt(row.mes, 10) || 1))] = row.observaciones || '';
            return acc;
        }, {});
        const monthComments = monthCommentsRows.reduce((acc, row) => {
            const month = Math.max(1, Math.min(12, parseInt(row.mes, 10) || 1));
            if (!acc[month])
                acc[month] = [];
            acc[month].push({
                id: row.id,
                month,
                text: row.comentario || '',
                author: row.autor || '',
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
            });
            return acc;
        }, {});
        const timelineStartMonth = this.getMonthNumber(project.timelineStartMonth);
        const timelineEndMonth = project.timelineEndMonth
            ? this.getMonthNumber(project.timelineEndMonth)
            : (timelineStartMonth && project.timelineDurationMonths
                ? this.deriveTimelineEndMonth(timelineStartMonth, parseInt(project.timelineDurationMonths))
                : null);
        const timelineDurationMonths = project.timelineDurationMonths
            ? parseInt(project.timelineDurationMonths)
            : (timelineStartMonth && timelineEndMonth
                ? this.computeTimelineDurationMonths(timelineStartMonth, timelineEndMonth)
                : null);
        return {
            ...project,
            timelineStartMonth,
            timelineEndMonth,
            timelineDurationMonths,
            allies,
            trainingDetails: {
                hasTraining: participants.length > 0,
                year: project.year,
                participants: participants.map(p => ({
                    id: p.id,
                    name: p.name,
                    age: p.age,
                    gender: p.gender,
                    phone: p.phone,
                    email: p.email,
                    role: p.role,
                    department: p.department,
                    status: p.status === 'graduado' ? 'graduated' :
                        p.status === 'en_formacion' ? 'in_progress' : 'enrolled'
                })),
                totalEnrolled: participants.length,
                totalGraduated: participants.filter(p => p.status === 'graduado').length
            },
            activities: activities.map((activity) => ({
                id: activity.id,
                name: activity.name,
                month: activity.month,
                status: this.normalizeActivityStatus(activity.status),
                observations: activity.observaciones ?? activity.note ?? '',
                note: activity.observaciones ?? activity.note ?? '',
                createdAt: activity.createdAt,
                updatedAt: activity.updatedAt,
            })),
            monthObservations,
            monthComments,
            progress,
            reports: reports.map(r => ({
                id: r.id,
                month: r.month,
                year: r.year,
                realTechnical: r.realTechnical,
                realFinancial: r.realFinancial,
                metaFinancial: r.metaFinancial,
                scheduleStatus: r.scheduleStatus,
                observations: r.observations,
                photos: this.safeParseJsonArray(r.photos),
                createdBy: r.createdBy,
                createdAt: r.createdAt
            })),
            photos: photos.map(p => p.url),
            completionLetter: completionLetterDocs.join(',') || null,
            changeControlDocuments: changeControlDocs,
            monthlyTrackingDocuments: monthlyTrackingDocs
        };
    }
    async addReport(projectId, reportData, userId) {
        const reportId = `rep-${projectId}-${reportData.year}-${String(reportData.month).padStart(2, '0')}`;
        const projectAmountRow = await this.entityManager.query(`SELECT monto_fgk as amountFGK FROM proyectos WHERE id = ? LIMIT 1`, [projectId]);
        const projectAmountFGK = projectAmountRow[0]?.amountFGK || 0;
        const metaFinancial = this.validateMetaFinancialAgainstFgk(reportData.metaFinancial ?? reportData.expectedFinancial ?? null, projectAmountFGK, 'seguimiento');
        await this.entityManager.query(`
      INSERT INTO reportes_mensuales (id, proyecto_id, mes, anio, año, avance_tecnico_real, avance_financiero_real, meta_financiera, estado_cronograma, observaciones, fotos, creado_por, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        año = VALUES(año),
        avance_tecnico_real = VALUES(avance_tecnico_real),
        avance_financiero_real = VALUES(avance_financiero_real),
        meta_financiera = VALUES(meta_financiera),
        estado_cronograma = VALUES(estado_cronograma),
        observaciones = VALUES(observaciones),
        fotos = VALUES(fotos)
    `, [
            reportId,
            projectId,
            reportData.month,
            reportData.year,
            reportData.year,
            reportData.realTechnical,
            reportData.realFinancial,
            reportData.metaFinancial ?? reportData.expectedFinancial ?? null,
            reportData.scheduleStatus,
            reportData.observations,
            JSON.stringify(reportData.photos),
            reportData.createdBy || `Usuario ${userId}`
        ]);
        await this.recalculateProjectProgress(projectId);
        return { success: true, message: 'Reporte agregado correctamente', id: reportId };
    }
    async updateReport(projectId, reportId, reportData, userId) {
        const projectAmountRow = await this.entityManager.query(`SELECT monto_fgk as amountFGK FROM proyectos WHERE id = ? LIMIT 1`, [projectId]);
        const projectAmountFGK = projectAmountRow[0]?.amountFGK || 0;
        const metaFinancial = this.validateMetaFinancialAgainstFgk(reportData.metaFinancial ?? reportData.expectedFinancial ?? null, projectAmountFGK, 'seguimiento');
        await this.entityManager.query(`
      UPDATE reportes_mensuales
      SET mes = ?, anio = ?, avance_tecnico_real = ?, avance_financiero_real = ?, meta_financiera = ?, estado_cronograma = ?, observaciones = ?, fotos = ?, creado_por = ?, updated_at = NOW()
      WHERE id = ? AND proyecto_id = ?
    `, [
            reportData.month,
            reportData.year,
            reportData.realTechnical,
            reportData.realFinancial,
            metaFinancial,
            reportData.scheduleStatus,
            reportData.observations,
            JSON.stringify(reportData.photos),
            reportData.createdBy || `Usuario ${userId}`,
            reportId,
            projectId
        ]);
        await this.recalculateProjectProgress(projectId);
        return { success: true, message: 'Reporte actualizado correctamente', id: reportId };
    }
    async deleteReport(projectId, reportId, userId) {
        const existing = await this.entityManager.query(`SELECT id FROM reportes_mensuales WHERE id = ? AND proyecto_id = ?`, [reportId, projectId]);
        if (existing.length === 0) {
            return { success: false, message: 'Reporte no encontrado' };
        }
        await this.entityManager.query(`DELETE FROM reportes_mensuales WHERE id = ? AND proyecto_id = ?`, [reportId, projectId]);
        await this.recalculateProjectProgress(projectId);
        return { success: true, message: 'Reporte eliminado correctamente' };
    }
    async updateProgressMatrix(projectId, progress, userId) {
        const yearRow = await this.entityManager.query(`SELECT e.año as year FROM proyectos p JOIN ediciones e ON p.edicion_id = e.id WHERE p.id = ? LIMIT 1`, [projectId]);
        const projectYear = yearRow[0]?.year || 2025;
        for (let i = 0; i < progress.length; i++) {
            const statusMap = {
                'pending': 'No Iniciado',
                'active': 'En Ejecución',
                'completed': 'Finalizado'
            };
            await this.entityManager.query(`
        INSERT INTO reportes_mensuales (id, proyecto_id, mes, anio, año, estado_cronograma, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE año = VALUES(año), estado_cronograma = VALUES(estado_cronograma)
      `, [
                `cron-${projectId}-${projectYear}-${i + 1}`,
                projectId,
                i + 1,
                projectYear,
                projectYear,
                statusMap[progress[i]] || 'No Iniciado'
            ]);
        }
        return { success: true, message: 'Cronograma actualizado correctamente' };
    }
    async getAllProjects(filters) {
        let query = `
      SELECT 
        p.id,
        p.nombre_proyecto as name,
        o.nombre as organization,
        o.categoria as category,
        p.departamento as department,
        p.mes_inicio as timelineStartMonth,
        p.mes_final as timelineEndMonth,
        p.duracion_meses as timelineDurationMonths,
        p.monto_fgk as amountFGK,
        p.organization_logo as organizationLogo,
        p.logo_url as logoUrl,
        p.meta_financiera as metaFinancial,
        p.estado as status,
        e.año as year,
        p.progreso_tecnico as technicalProgress,
        p.progreso_financiero as financialProgress
      FROM proyectos p
      JOIN organizaciones o ON p.organizacion_id = o.id
      JOIN ediciones e ON p.edicion_id = e.id
      WHERE 1=1
    `;
        const params = [];
        if (filters?.year) {
            query += ` AND e.año = ?`;
            params.push(filters.year);
        }
        if (filters?.category) {
            query += ` AND o.categoria = ?`;
            params.push(filters.category);
        }
        if (filters?.status) {
            query += ` AND p.estado = ?`;
            params.push(filters.status);
        }
        query += ` ORDER BY p.created_at DESC`;
        const results = await this.entityManager.query(query, params);
        return results.map(row => ({
            id: row.id,
            name: row.name,
            organization: row.organization,
            category: row.category,
            department: row.department,
            amountFGK: parseFloat(row.amountFGK) || 0,
            status: row.status,
            year: row.year,
            timelineStartMonth: row.timelineStartMonth ? parseInt(row.timelineStartMonth) : null,
            timelineEndMonth: row.timelineEndMonth ? parseInt(row.timelineEndMonth) : null,
            timelineDurationMonths: row.timelineDurationMonths ? parseInt(row.timelineDurationMonths) : null,
            technicalProgress: row.technicalProgress || 0,
            financialProgress: row.financialProgress || 0,
        }));
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectEntityManager)()),
    __metadata("design:paramtypes", [typeorm_2.EntityManager])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map