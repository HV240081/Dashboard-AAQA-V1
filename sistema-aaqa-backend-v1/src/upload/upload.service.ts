// @ts-nocheck
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
exports.UploadService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const XLSX = __importStar(require("xlsx"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dashboard_service_1 = require("../dashboard/dashboard.service");
let UploadService = class UploadService {
    entityManager;
    dashboardService;
    constructor(entityManager, dashboardService) {
        this.entityManager = entityManager;
        this.dashboardService = dashboardService;
    }
    normalizeText(value) {
        return (value ?? '')
            .toString()
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }
    permissionKeyForCategory(category) {
        const normalized = this.normalizeText(category);
        if (normalized === 'community' || normalized === 'dc' || normalized.includes('desarrollo')) return 'DC';
        if (normalized === 'fis' || normalized === 'es' || normalized.includes('emprendimiento')) return 'ES';
        if (normalized.includes('corte') || normalized.includes('adesco') || normalized.includes('formacion')) return 'formacion_dc';
        if (normalized === 'ong') return 'ONG';
        return category;
    }
    canUserEditCategory(user, category) {
        if (!user) return false;
        if (user.rol_id === 1 || user.rolId === 1 || user.rol_id === 3 || user.rolId === 3 || user.canEditAll === true) return true;
        const key = this.permissionKeyForCategory(category);
        return Array.isArray(user.editableCategories) && user.editableCategories.includes(key);
    }
    parseLooseNumber(value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }
        const text = value.toString().trim();
        if (!text) {
            return null;
        }
        const cleaned = text
            .replace(/\$/g, '')
            .replace(/\s+/g, '')
            .replace(/%/g, '')
            .replace(/[^0-9.-]/g, '');
        let normalized = cleaned;
        const hasComma = normalized.includes(',');
        const hasDot = normalized.includes('.');
        if (hasComma && hasDot) {
            if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
                normalized = normalized.replace(/\./g, '').replace(/,/g, '.');
            } else {
                normalized = normalized.replace(/,/g, '');
            }
        } else if (hasComma && !hasDot) {
            const commaCount = (normalized.match(/,/g) || []).length;
            const commaIndex = normalized.lastIndexOf(',');
            const decimals = normalized.length - commaIndex - 1;
            if (commaCount === 1 && decimals > 0 && decimals <= 2) {
                normalized = normalized.replace(/,/g, '.');
            } else {
                normalized = normalized.replace(/,/g, '');
            }
        } else {
            normalized = normalized.replace(/,/g, '');
        }
        const parsed = parseFloat(normalized);
        return Number.isNaN(parsed) ? null : parsed;
    }
    normalizePercentValue(value) {
        const parsed = this.parseLooseNumber(value);
        if (parsed === null) {
            return null;
        }
        if (parsed > 0 && parsed <= 1) {
            return parsed * 100;
        }
        return parsed;
    }
    normalizeColumnKey(key) {
        return this.normalizeText(key).replace(/[^a-z0-9_]/g, '');
    }
    normalizeCategory(category) {
        const value = this.normalizeText(category);
        if (value.includes('comunitari') || value.includes('community') || value === 'dc') {
            return 'Community';
        }
        if (value.includes('fis') || value.includes('emprend') || value.includes('incub')) {
            return 'FIS';
        }
        return 'ONG';
    }
    normalizeMysqlDate(value) {
        if (!value)
            return null;
        if (value instanceof Date) {
            return value.toISOString().split('T')[0];
        }
        const text = value.toString().trim();
        if (!text)
            return null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(text))
            return text;
        if (text.includes('T'))
            return text.split('T')[0];
        const parsed = new Date(text);
        return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString().split('T')[0];
    }
    async ensureEditionExists(year) {
        const edition = await this.entityManager.query(`SELECT id FROM ediciones WHERE año = ? LIMIT 1`, [year]);
        if (!edition || edition.length === 0) {
            throw new Error(`La edición ${year} no est� disponible en el sistema. Debe crearla antes de cargar o editar registros de ese ano.`);
        }
        return edition[0];
    }
    async ensureCommunitySchema() {
        try {
            await this.entityManager.query(`ALTER TABLE adescos ADD COLUMN año INT NULL AFTER corte_id`);
        }
        catch { }
    }
    getCommunityYearSequenceId(prefix, year, sequence) {
        return `${prefix}${year}-${String(sequence).padStart(2, '0')}`;
    }
    parseCommunitySequence(id, prefix, year) {
        const value = (id ?? '').toString().trim();
        const regex = new RegExp(`^${prefix}${year}-(\\d{2})$`);
        const match = value.match(regex);
        if (!match)
            return null;
        const sequence = parseInt(match[1], 10);
        return Number.isNaN(sequence) ? null : sequence;
    }
    parseCommunityParticipantSequence(id, adescoId) {
        const value = (id ?? '').toString().trim();
        const regex = new RegExp(`^${adescoId}-(\\d{2})$`);
        const match = value.match(regex);
        if (!match)
            return null;
        const sequence = parseInt(match[1], 10);
        return Number.isNaN(sequence) ? null : sequence;
    }
    normalizeProjectStatus(value) {
        const status = this.normalizeText(value);
        if (!status) {
            return 'Activo';
        }
        if (status.includes('finaliz')) {
            return 'Finalizado';
        }
        if (status.includes('suspend')) {
            return 'Suspendido';
        }
        if (status.includes('cier')) {
            return 'En Cierre';
        }
        if (status.includes('ejec')) {
            return 'En Ejecución';
        }
        if (status.includes('activ')) {
            return 'Activo';
        }
        return 'Activo';
    }
    normalizeMonthlyStatus(value) {
        const status = this.normalizeText(value);
        if (!status) {
            return null;
        }
        if (status.includes('finaliz') || status.includes('complet')) {
            return 'Finalizado';
        }
        if (status.includes('ejec') || status.includes('proces') || status.includes('avance') || status.includes('activ')) {
            return 'En Proceso';
        }
        if (status.includes('pend')) {
            return 'Pendiente';
        }
        return null;
    }
    normalizeActivityStatus(value) {
        const status = this.normalizeText(value);
        if (!status) {
            return 'pending';
        }
        if (status.includes('finaliz') || status.includes('complet')) {
            return 'completed';
        }
        if (status === 'active' || status.includes('ejec') || status.includes('avance') || status.includes('activo') || status.includes('proces')) {
            return 'active';
        }
        if (status.includes('pend')) {
            return 'pending';
        }
        return null;
    }
    getMonthNumber(value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }
        const raw = value.toString().trim().toLowerCase();
        const numeric = parseInt(raw, 10);
        if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= 12) {
            return numeric;
        }
        const normalized = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const monthMap = {
            enero: 1, ene: 1,
            febrero: 2, feb: 2,
            marzo: 3, mar: 3,
            abril: 4, abr: 4,
            mayo: 5, may: 5,
            junio: 6, jun: 6,
            julio: 7, jul: 7,
            agosto: 8, ago: 8,
            septiembre: 9, setiembre: 9, sep: 9, sept: 9,
            octubre: 10, oct: 10,
            noviembre: 11, nov: 11,
            diciembre: 12, dic: 12,
        };
        return monthMap[normalized] || null;
    }
    resolveProjectMonthValue(rawMonth, projectStartMonth) {
        const raw = (rawMonth ?? '').toString().trim();
        const normalized = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const namedMonth = this.getMonthNumber(raw);
        const hasExplicitName = /enero|ene|febrero|feb|marzo|mar|abril|abr|mayo|may|junio|jun|julio|jul|agosto|ago|septiembre|setiembre|sep|sept|octubre|oct|noviembre|nov|diciembre|dic/.test(normalized);

        if (hasExplicitName && namedMonth) {
            return namedMonth;
        }

        const numeric = parseInt(raw, 10);
        if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= 12 && projectStartMonth) {
            return (((projectStartMonth - 1 + (numeric - 1)) % 12) + 1);
        }

        return namedMonth || projectStartMonth || null;
    }
    buildTimelineMonthSequence(startMonth, endMonth) {
        const start = this.getMonthNumber(startMonth);
        const end = this.getMonthNumber(endMonth);
        if (!start || !end) {
            return [];
        }
        const duration = start === end
            ? 13
            : (end > start ? (end - start + 1) : (12 - start + 1) + end);
        return Array.from({ length: Math.max(1, duration) }, (_, idx) => (((start - 1 + idx) % 12) + 1));
    }
    computeTimelineDurationMonths(startMonth, endMonth) {
        const sequence = this.buildTimelineMonthSequence(startMonth, endMonth);
        return sequence.length > 0 ? sequence.length : null;
    }
    buildTimelineMonthSlots(startMonth, endMonth, startYear = new Date().getFullYear()) {
        const start = this.getMonthNumber(startMonth);
        const end = this.getMonthNumber(endMonth);
        if (!start || !end) {
            return [];
        }
        const duration = start === end
            ? 13
            : (end > start ? (end - start + 1) : (12 - start + 1) + end);
        return Array.from({ length: Math.max(1, duration) }, (_, idx) => {
            const date = new Date(startYear, (start - 1) + idx, 1);
            return {
                month: date.getMonth() + 1,
                year: date.getFullYear(),
                index: idx,
            };
        });
    }
    resolveProjectTimelineError(projectName) {
        return `No se pudo registrar el seguimiento de ${projectName} porque el proyecto aún no tiene definido su período de ejecución. Debe configurar el mes de inicio y el mes final antes de subir el seguimiento.`;
    }
    validateProjectTimeline(projectMeta, projectName) {
        const startMonth = this.getMonthNumber(projectMeta?.[0]?.startMonth);
        const endMonth = this.getMonthNumber(projectMeta?.[0]?.endMonth);
        if (!startMonth || !endMonth) {
            throw new Error(this.resolveProjectTimelineError(projectName));
        }
        const startYear = parseInt(projectMeta?.[0]?.projectYear || projectMeta?.[0]?.year || new Date().getFullYear(), 10) || new Date().getFullYear();
        return {
            startMonth,
            endMonth,
            sequence: this.buildTimelineMonthSequence(startMonth, endMonth),
            durationMonths: this.computeTimelineDurationMonths(startMonth, endMonth),
            slots: this.buildTimelineMonthSlots(startMonth, endMonth, startYear),
        };
    }
    resolveTimelineSlot(rawMonth, timeline, lastIndex = -1) {
        const monthNumber = this.getMonthNumber(rawMonth);
        if (!monthNumber || !timeline || !Array.isArray(timeline.slots) || timeline.slots.length === 0) {
            return null;
        }
        const startIndex = Math.max(-1, Number(lastIndex) || -1);
        const afterLast = timeline.slots.find((slot) => slot.month === monthNumber && slot.index > startIndex);
        const match = afterLast || timeline.slots.find((slot) => slot.month === monthNumber) || null;
        return match;
    }
    resolveTrackingMonth(rawMonth, projectStartMonth) {
        const raw = (rawMonth ?? '').toString().trim();
        if (!raw) {
            return null;
        }
        const explicitMonth = this.getMonthNumber(raw);
        const normalized = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const hasExplicitName = /enero|ene|febrero|feb|marzo|mar|abril|abr|mayo|may|junio|jun|julio|jul|agosto|ago|septiembre|setiembre|sep|sept|octubre|oct|noviembre|nov|diciembre|dic/.test(normalized);
        if (hasExplicitName) {
            return explicitMonth;
        }
        const numeric = parseInt(raw, 10);
        if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= 12 && projectStartMonth) {
            return (((projectStartMonth - 1 + (numeric - 1)) % 12) + 1);
        }
        return explicitMonth;
    }
    async upsertProjectActivity(projectId, activity, options = {}) {
        const source = (options.source ?? 'excel').toString().toLowerCase() === 'manual' ? 'manual' : 'excel';
        const allowOverwriteManual = options.allowOverwriteManual === true ? 1 : 0;
        const activityId = options.activityId || `act-${projectId}-${String(activity.month).padStart(2, '0')}-${this.normalizeText(activity.name).replace(/[^a-z0-9]/g, '').slice(0, 12) || Date.now()}`;
        await this.entityManager.query(
            `INSERT INTO proyecto_actividades (id, proyecto_id, nombre, mes, estado, observaciones, source, manual_locked, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
               nombre = IF(manual_locked = 1 AND ? = 0, nombre, VALUES(nombre)),
               mes = IF(manual_locked = 1 AND ? = 0, mes, VALUES(mes)),
               estado = IF(manual_locked = 1 AND ? = 0, estado, VALUES(estado)),
               observaciones = IF(manual_locked = 1 AND ? = 0, observaciones, VALUES(observaciones)),
               source = IF(manual_locked = 1 AND ? = 0, source, VALUES(source)),
               manual_locked = IF(manual_locked = 1 AND ? = 0, manual_locked, VALUES(manual_locked)),
               updated_at = NOW()`,
            [
                activityId,
                projectId,
                activity.name,
                activity.month,
                activity.status,
                activity.note || null,
                source,
                source === 'manual' ? 1 : 0,
                allowOverwriteManual,
                allowOverwriteManual,
                allowOverwriteManual,
                allowOverwriteManual,
                allowOverwriteManual,
                allowOverwriteManual
            ]
        );
        return activityId;
    }
    async recalculateProjectProgress(projectId) {
        const projectMeta = await this.entityManager.query(
            `SELECT p.mes_inicio as startMonth, p.mes_final as endMonth, p.duracion_meses as durationMonths, e.año as projectYear
             FROM proyectos p
             LEFT JOIN ediciones e ON p.edicion_id = e.id
             WHERE p.id = ? LIMIT 1`,
            [projectId]
        );
        if (!projectMeta.length) {
            return { cumulativeTechnical: 0, cumulativeFinancial: 0 };
        }

        const timelineStartMonth = this.getMonthNumber(projectMeta[0]?.startMonth);
        const timelineEndMonth = this.getMonthNumber(projectMeta[0]?.endMonth);
        const timelineDurationMonths = projectMeta[0]?.durationMonths
            ? parseInt(projectMeta[0].durationMonths, 10)
            : (timelineStartMonth && timelineEndMonth
                ? this.computeTimelineDurationMonths(timelineStartMonth, timelineEndMonth)
                : 12);
        const projectYear = parseInt(projectMeta[0]?.projectYear, 10) || new Date().getFullYear();
        const timelineSlots = Array.from({ length: Math.max(1, timelineDurationMonths || 12) }, (_, idx) => {
            const date = new Date(projectYear, (timelineStartMonth || 1) - 1 + idx, 1);
            return { month: date.getMonth() + 1, year: date.getFullYear() };
        });

        const statusToScore = (value) => {
            const status = this.normalizeActivityStatus(value);
            if (status === 'completed') return 100;
            if (status === 'active') return 50;
            return 0;
        };

        const activities = await this.entityManager.query(
            `SELECT nombre as name, mes as month, estado as status
             FROM proyecto_actividades
             WHERE proyecto_id = ?
             ORDER BY mes ASC, created_at ASC`,
            [projectId]
        );
        const reports = await this.entityManager.query(
            `SELECT mes, COALESCE(anio, año) as year, meta_financiera as metaFinancial, estado_cronograma as scheduleStatus
             FROM reportes_mensuales
             WHERE proyecto_id = ? AND mes BETWEEN 1 AND 12
             ORDER BY COALESCE(anio, año) ASC, mes ASC`,
            [projectId]
        );

        let cumulativeTechnical = 0;
        if (reports.length > 0) {
            const monthScores = timelineSlots.map((slot) => {
                const report = [...reports].reverse().find((item) => {
                    const reportMonth = parseInt(item.mes, 10) || 0;
                    const reportYear = parseInt(item.year, 10) || 0;
                    return reportMonth === slot.month && reportYear === slot.year;
                });
                return statusToScore(report?.scheduleStatus);
            });
            cumulativeTechnical = Math.min(100, Number((monthScores.reduce((sum, value) => sum + value, 0) / Math.max(1, timelineSlots.length)).toFixed(2)));
        } else if (activities.length > 0) {
            const groupedByMonth = new Map();
            for (const activity of activities) {
                const month = this.getMonthNumber(activity.month) || 1;
                const list = groupedByMonth.get(month) || [];
                list.push(activity);
                groupedByMonth.set(month, list);
            }
            const monthSequence = this.buildTimelineMonthSequence(timelineStartMonth, timelineEndMonth);
            const monthScores = monthSequence.map((month) => {
                const list = groupedByMonth.get(month) || [];
                if (list.length === 0) return 0;
                const total = list.reduce((sum, activity) => sum + statusToScore(activity.status), 0);
                return total / Math.max(1, list.length);
            });
            cumulativeTechnical = Math.min(100, Number((monthScores.reduce((sum, value) => sum + value, 0) / Math.max(1, timelineDurationMonths || monthScores.length || 1)).toFixed(2)));
        }

        let cumulativeFinancial = 0;
        if (reports.length > 0) {
            const totalExecutedAmount = reports.reduce((sum, report) => sum + (parseFloat(report.metaFinancial) || 0), 0);
            const amountRow = await this.entityManager.query(`SELECT monto_fgk as amountFGK FROM proyectos WHERE id = ? LIMIT 1`, [projectId]);
            const baseAmount = parseFloat(amountRow[0]?.amountFGK) || 0;
            cumulativeFinancial = baseAmount > 0
                ? Math.min(100, Number(((totalExecutedAmount / baseAmount) * 100).toFixed(2)))
                : 0;
        }

        await this.entityManager.query(
            `UPDATE proyectos SET progreso_tecnico = ?, progreso_financiero = ?, updated_at = NOW() WHERE id = ?`,
            [cumulativeTechnical, cumulativeFinancial, projectId]
        );
        return { cumulativeTechnical, cumulativeFinancial };
    }
    formatMonthlyTrackingUploadError(error, projectName) {
        const message = error instanceof Error ? error.message : '';
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('data truncated') && lowerMessage.includes('estado_cronograma')) {
            return `No se pudo registrar el seguimiento de ${projectName} porque el campo Estado del cronograma tiene un valor inválido o demasiado largo. Revise el estado de la actividad o del mes.`;
        }
        return message || `No se pudo registrar el seguimiento de ${projectName}.`;
    }
    getCategoryCode(category) {
        const normalized = this.normalizeCategory(category);
        if (normalized === 'Community') {
            return 'DC';
        }
        if (normalized === 'FIS') {
            return 'FIS';
        }
        return 'ONG';
    }
    async findOrCreateOrganization(orgName, category) {
        const normalizedName = (orgName ?? '').toString().trim();
        const normalizedCategory = this.normalizeCategory(category);
        const existing = await this.entityManager.query(`SELECT id FROM organizaciones WHERE nombre = ? AND categoria = ?`, [normalizedName, normalizedCategory]);
        if (existing.length > 0) {
            const orgId = existing[0].id;
            await this.entityManager.query(`UPDATE organizaciones SET categoria = ?, tipo_organizacion = ? WHERE id = ?`, [
                normalizedCategory,
                normalizedCategory === 'Community' ? 'ADESCO' : 'ONG',
                orgId,
            ]);
            return orgId;
        }
        const newOrgId = `org-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        await this.entityManager.query(`INSERT INTO organizaciones (id, nombre, categoria, tipo_organizacion) VALUES (?, ?, ?, ?)`, [
            newOrgId,
            normalizedName,
            normalizedCategory,
            normalizedCategory === 'Community' ? 'ADESCO' : 'ONG',
        ]);
        return newOrgId;
    }
    async resolveProjectByTrackingInfo(projectName, options = {}) {
        const normalizedName = (projectName ?? '').toString().trim();
        if (!normalizedName) {
            return null;
        }
        const normalizedCategory = options.category ? this.normalizeCategory(options.category) : null;
        const normalizedYear = options.year ? parseInt(options.year, 10) : null;
        const normalizedOrganization = (options.organization || '').toString().trim();
        const params = [normalizedName];
        let query = `
            SELECT p.id,
                   p.nombre_proyecto,
                   o.nombre as organizacion_nombre,
                   o.categoria as categoria_nombre,
                   e.año as project_year
            FROM proyectos p
            INNER JOIN organizaciones o ON p.organizacion_id = o.id
            LEFT JOIN ediciones e ON p.edicion_id = e.id
            WHERE LOWER(p.nombre_proyecto) = LOWER(?)
        `;
        if (normalizedOrganization) {
            query += ` AND LOWER(o.nombre) = LOWER(?)`;
            params.push(normalizedOrganization);
        }
        if (normalizedCategory) {
            query += ` AND o.categoria = ?`;
            params.push(normalizedCategory);
        }
        if (normalizedYear) {
            query += ` AND e.año = ?`;
            params.push(normalizedYear);
        }
        const projects = await this.entityManager.query(query, params);
        if (projects.length === 0) {
            return null;
        }
        if (projects.length === 1) {
            return projects[0];
        }
        if (normalizedOrganization) {
            const orgMatches = projects.filter((p) => (p.organizacion_nombre || '').toString().trim().toLowerCase() === normalizedOrganization.toLowerCase());
            if (orgMatches.length === 1) {
                return orgMatches[0];
            }
            if (orgMatches.length > 1) {
                throw new Error(`El proyecto ${normalizedName} est� duplicado en la organizaci�n ${normalizedOrganization}. Debe identificarse con m�s datos antes de cargar seguimiento.`);
            }
        }
        if (normalizedYear) {
            const yearMatches = projects.filter((p) => parseInt(p.project_year, 10) === normalizedYear);
            if (yearMatches.length === 1) {
                return yearMatches[0];
            }
            if (yearMatches.length > 1) {
                throw new Error(`El proyecto ${normalizedName} aparece repetido en la edición ${normalizedYear}. Debe verificarse antes de cargar seguimiento.`);
            }
        }
        throw new Error(`El proyecto ${normalizedName} no es �nico para la carga de seguimiento. Agregue organizaci�n, categor�a o edición para identificarlo correctamente.`);
    }
    pickValue(row, keys, fallback = undefined) {
        for (const key of keys) {
            if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
                return row[key];
            }
        }
        return fallback;
    }
    extractWorkbookProjectContext(workbook) {
        const candidateSheets = [
            'Datos Proyecto',
            'Informacion General',
            'Informacion General',
            'Informacion del Proyecto',
            'Info Proyecto',
            'Proyecto',
            'Seguimiento Mensual',
            'Seguimiento',
            'Reporte Mensual',
        ];
        for (const sheetName of candidateSheets) {
            if (!workbook.SheetNames.includes(sheetName)) {
                continue;
            }
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });
            const looksLikeMonthlyTrackingSheet = Array.isArray(rows) && rows.some((row) => {
                if (!Array.isArray(row)) return false;
                const normalized = row.map((cell) => this.normalizeColumnKey(cell));
                return normalized.some((cell) => cell.includes('nombredelproyecto'))
                    && normalized.some((cell) => cell.includes('mesdelproyecto') || cell.includes('mesdelseguimiento'))
                    && normalized.some((cell) => cell.includes('actividad'));
            });
            if (looksLikeMonthlyTrackingSheet) {
                continue;
            }
            const context = {};
            for (const row of rows) {
                if (!Array.isArray(row) || row.length < 2) {
                    continue;
                }
                const key = this.normalizeColumnKey(row[0]);
                const value = row[1];
                if (!key || value === null || value === undefined || value === '') {
                    continue;
                }
                if (
                    ['nombredelproyecto', 'mesdelproyecto', 'estado', 'estadodelmes', 'actividad', 'metafinanciera', 'observacionbreve', 'observaciones'].includes(key)
                    && this.normalizeColumnKey(value).includes('mesdelproyecto')
                ) {
                    continue;
                }
                context[key] = value;
            }
            const get = (...keys) => {
                for (const key of keys) {
                    if (context[key] !== undefined && context[key] !== null && context[key] !== '') {
                        return context[key];
                    }
                }
                return null;
            };
            return {
                sheetName,
                name: get('nombredelproyecto', 'nombreproyecto', 'proyecto', 'nombre'),
                organization: get('organizacion', 'organizaciondelproyecto', 'aliado', 'coordinador', 'nombreorganizacion'),
                category: get('categoria', 'categora', 'category'),
                year: get('edicion', 'ano', 'ano', 'year'),
                department: get('departamento'),
                municipality: get('municipio'),
                startMonth: get('mesdeinicio', 'mes_inicio', 'mesinicio'),
                endMonth: get('mesdefinalizacion', 'mes_final', 'mesfinal'),
                durationMonths: get('duracionmeses', 'duracion_meses', 'duracion'),
                investmentFgk: get('inversionfgk', 'monto_fgk', 'inversion_fgk'),
                contrapartida: get('contrapartidorg', 'contrapartida_org', 'contrapartida'),
                alliedFunds: get('fondosaliados', 'fondos_aliados', 'aliados'),
                directBeneficiaries: get('beneficiariosdirectos', 'beneficiarios_directos'),
                indirectBeneficiaries: get('beneficiariosindirectos', 'beneficiarios_indirectos'),
                status: get('estado'),
            };
        }
        return {};
    }
    extractSheetRowsWithHeaders(sheet, headerMatchers = []) {
        const oa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });
        if (!Array.isArray(oa) || oa.length === 0) {
            return [];
        }
        const normalizedMatchers = headerMatchers.map((item) => this.normalizeColumnKey(item));
        let headerRowIndex = -1;
        for (let i = 0; i < oa.length; i++) {
            const row = Array.isArray(oa[i]) ? oa[i] : [];
            const normalizedRow = row.map((cell) => this.normalizeColumnKey(cell));
            const matches = normalizedMatchers.every((matcher) => normalizedRow.some((cell) => cell === matcher || cell.includes(matcher)));
            if (matches) {
                headerRowIndex = i;
                break;
            }
        }
        if (headerRowIndex === -1) {
            return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
        }
        const headerRow = Array.isArray(oa[headerRowIndex]) ? oa[headerRowIndex] : [];
        const headers = headerRow.map((header, idx) => {
            const text = (header ?? '').toString().trim();
            return text || `col_${idx + 1}`;
        });
        const rows = [];
        for (let i = headerRowIndex + 1; i < oa.length; i++) {
            const row = Array.isArray(oa[i]) ? oa[i] : [];
            if (row.every((cell) => cell === null || cell === undefined || cell === '')) {
                continue;
            }
            const obj = {};
            for (let j = 0; j < headers.length; j++) {
                obj[headers[j]] = row[j] ?? '';
            }
            rows.push(obj);
        }
        return rows;
    }
    validateProjectId(id, year) {
        const value = (id ?? '').toString().trim();
        const newFormat = /^(ONG|DC|FIS)\d{4}-\d{2}$/;
        const legacyFormat = /^\d{6}(?:-(ONG|COM|FIS))?$/;
        if (!newFormat.test(value) && !legacyFormat.test(value)) {
            throw new Error(`ID_Proyecto '${value}' no cumple el formato requerido. Ejemplo: ONG2025-01.`);
        }
        const yearText = year.toString();
        const yearFromValue = value.match(/(\d{4})/);
        if (yearFromValue && yearFromValue[1] !== yearText) {
            throw new Error(`ID_Proyecto '${value}' no coincide con el ano ${year}. El ID debe representar ${year}.`);
        }
        const sequence = parseInt(value.replace(/^[A-Z]+|\D+/g, '').slice(-2), 10);
        if (sequence < 1) {
            throw new Error(`ID_Proyecto '${value}' debe tener un correlativo mayor a 00.`);
        }
        return value;
    }
    validateParticipantId(id) {
        const value = (id ?? '').toString().trim();
        const newFormat = /^(ONG|DC|FIS)\d{4}-\d{2}-\d{2}$/;
        const legacyFormat = /^\d{6}(?:-(ONG|COM|FIS))?-\d{2}$/;
        if (!newFormat.test(value) && !legacyFormat.test(value)) {
            throw new Error(`ID_Participante '${value}' no cumple el formato requerido. Ejemplo: ONG2025-01-01.`);
        }
        const sequence = parseInt(value.split('-').pop(), 10);
        if (sequence < 1) {
            throw new Error(`ID_Participante '${value}' debe tener un correlativo mayor a 00.`);
        }
        return value;
    }
    inferProjectYearFromId(projectId) {
        const value = (projectId ?? '').toString().trim();
        const newFormat = value.match(/^[A-Z]+(\d{4})-\d{2}$/);
        const legacyFormat = value.match(/^(\d{6})(?:-(ONG|COM|FIS))?$/);
        const yearSource = newFormat ? newFormat[1] : legacyFormat ? legacyFormat[1] : value.substring(0, 4);
        const year = parseInt(yearSource, 10);
        if (Number.isNaN(year)) {
            throw new Error(`No se pudo inferir el ano desde el ID de proyecto '${projectId}'.`);
        }
        return year;
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
            .map((row) => {
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
            .filter((n) => n !== null)
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
    async ensureProjectCoreSchema() {
        const schemaColumns = [
            { name: 'municipio', definition: 'VARCHAR(150) NULL', after: 'departamento' },
            { name: 'distrito', definition: 'VARCHAR(150) NULL', after: 'municipio' },
            { name: 'beneficiarios_indirectos', definition: 'INT NULL', after: 'beneficiarios_directos' },
            { name: 'estado', definition: 'VARCHAR(50) NULL', after: 'beneficiarios_indirectos' },
            { name: 'mes_inicio', definition: 'TINYINT NULL', after: 'edicion_id' },
            { name: 'mes_final', definition: 'TINYINT NULL', after: 'mes_inicio' },
            { name: 'duracion_meses', definition: 'TINYINT NULL', after: 'mes_final' },
            { name: 'meta_financiera', definition: 'DECIMAL(12,2) NULL', after: 'duracion_meses' },
            { name: 'nombre_aliado', definition: 'VARCHAR(255) NULL', after: 'contrapartida_org' },
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
    async ensureProjectActivitiesSchema() {
        await this.entityManager.query(`
            CREATE TABLE IF NOT EXISTS proyecto_actividades (
                id VARCHAR(80) PRIMARY KEY,
                proyecto_id VARCHAR(80) NOT NULL,
                nombre VARCHAR(255) NOT NULL,
                mes TINYINT NOT NULL DEFAULT 1,
                estado VARCHAR(30) NOT NULL DEFAULT 'pending',
                observaciones TEXT NULL,
                source VARCHAR(20) NOT NULL DEFAULT 'excel',
                manual_locked TINYINT(1) NOT NULL DEFAULT 0,
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
        const sourceColumn = await this.entityManager.query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proyecto_actividades'
              AND COLUMN_NAME = 'source'
        `);
        if (!sourceColumn.some((row) => row.COLUMN_NAME === 'source')) {
            await this.entityManager.query(`ALTER TABLE proyecto_actividades ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'excel' AFTER observaciones`);
        }
        const manualLockedColumn = await this.entityManager.query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proyecto_actividades'
              AND COLUMN_NAME = 'manual_locked'
        `);
        if (!manualLockedColumn.some((row) => row.COLUMN_NAME === 'manual_locked')) {
            await this.entityManager.query(`ALTER TABLE proyecto_actividades ADD COLUMN manual_locked TINYINT(1) NOT NULL DEFAULT 0 AFTER source`);
        }
        await this.entityManager.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS uniq_proyecto_actividades_nombre_mes
            ON proyecto_actividades (proyecto_id, mes, nombre)
        `).catch(() => void 0);

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
    async ensureParticipantCoreSchema() {
        const existingColumns = await this.entityManager.query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'participantes_formacion'
              AND COLUMN_NAME IN ('proyecto_nombre', 'categoria', 'ano')
        `);
        const found = new Set(existingColumns.map((row) => row.COLUMN_NAME));
        if (!found.has('proyecto_nombre')) {
            await this.entityManager.query(`ALTER TABLE participantes_formacion ADD COLUMN proyecto_nombre VARCHAR(255) NULL AFTER proyecto_id`);
        }
        if (!found.has('categoria')) {
            await this.entityManager.query(`ALTER TABLE participantes_formacion ADD COLUMN categoria VARCHAR(50) NULL AFTER proyecto_nombre`);
        }
        if (!found.has('ano')) {
            await this.entityManager.query(`ALTER TABLE participantes_formacion ADD COLUMN ano INT NULL AFTER categoria`);
        }
    }
    async processExcel(file, user, context = {}) {
        if (!file) {
            throw new common_1.BadRequestException('No se recibi� ning�n archivo');
        }
        if (!user) {
            throw new common_1.UnauthorizedException('Usuario no autenticado');
        }
        const requestedCategory = this.normalizeCategory(context?.category || 'Community');
        const canUploadForCommunity = user.rol_id === 5 && requestedCategory === 'Community';
        if (!this.canUserEditCategory(user, requestedCategory) && !canUploadForCommunity) {
            throw new common_1.UnauthorizedException('Solo Geo y Violeta pueden realizar cargas masivas de proyectos.');
        }
        try {
            await this.ensureProjectCoreSchema();
            await this.ensureProjectActivitiesSchema();
            await this.ensureMonthlyReportsSchema();
            await this.ensureParticipantCoreSchema();
            const workbook = XLSX.read(file.buffer, { type: 'buffer' });
            const workbookProjectContext = this.extractWorkbookProjectContext(workbook);
            const uploadCategory = context?.category ? this.normalizeCategory(context.category) : null;
            const uploadYear = context?.year ? parseInt(context.year, 10) : null;
            const overwriteExisting = ['true', '1', 'yes', 'si', 's�'].includes((context?.overwriteExisting ?? '').toString().trim().toLowerCase());
            const results = {
                proyectos: { created: 0, updated: 0, errors: [] },
                participantes: { created: 0, updated: 0, errors: [] },
                aliados: { created: 0, updated: 0, errors: [] },
                actividades: { created: 0, updated: 0, errors: [] },
                reportes: { created: 0, updated: 0, errors: [] },
            };
            const projectLookup = new Map();
            const sheetsToProcess = [];
            for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];
                const sampleRows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false });
                if (!sampleRows.length) {
                    continue;
                }

                const firstRow = sampleRows[0] || {};
                const normalizedHeaders = Object.keys(firstRow).map((key) => this.normalizeColumnKey(key));
                const hasParticipantHeaders = normalizedHeaders.some((key) => [
                    'id_participante',
                    'id_proyectoreferencia',
                    'nombre_participante',
                    'estado_formacion',
                ].includes(key));
                const projectHeaderHits = normalizedHeaders.filter((key) => [
                    'id_proyecto',
                    'nombre_proyecto',
                    'organizacion',
                    'monto_fgk',
                    'contrapartida_org',
                    'fondos_aliados',
                    'beneficiarios_directos',
                    'beneficiarios_indirectos',
                ].includes(key)).length;
                const looksLikeProjectSheet = !hasParticipantHeaders && projectHeaderHits >= 2;

                if (sheetName === 'Proyectos'
                    || sheetName === 'ONG'
                    || sheetName === 'Desarrollo Comunitario'
                    || sheetName === 'Emprendimiento Social'
                    || looksLikeProjectSheet) {
                    sheetsToProcess.push(sheetName);
                }
            }

            if (sheetsToProcess.length > 0) {
                if (!this.canUserEditCategory(user, uploadCategory || requestedCategory) && !(user.rol_id === 5 && uploadCategory === 'Community')) {
                    results.proyectos.errors.push({ error: 'Solo Geo y Violeta pueden cargar proyectos.' });
                }
                else {
                    const data = [];
                    for (const sheetName of sheetsToProcess) {
                        const sheet = workbook.Sheets[sheetName];
                        const sheetData = XLSX.utils.sheet_to_json(sheet);
                        data.push(...sheetData);
                    }
                    const syncedProjectIdsByCategory = new Map();
                    for (const row of data) {
                        try {
                            const rowData = row;
                            const normalizedProjectRow = {};
                            for (const key in rowData) {
                                if (Object.prototype.hasOwnProperty.call(rowData, key)) {
                                    normalizedProjectRow[this.normalizeColumnKey(key)] = rowData[key];
                                }
                            }
                            const importCategoria = this.normalizeCategory(this.pickValue(normalizedProjectRow, ['categoria', 'categora', 'category'], uploadCategory || 'Community'));
                            const importYear = parseInt(this.pickValue(normalizedProjectRow, ['o', 'ano', 'year', 'oedicin', 'anoedicion', 'edicin', 'edicion'], uploadYear || 2025), 10);
                            const projectIdFromExcel = this.pickValue(normalizedProjectRow, ['id_proyecto', 'idproyecto'], null);
                            if (projectIdFromExcel) {
                                this.validateProjectId(projectIdFromExcel, importYear);
                            }
                            const categoria = rowData.Categoria || rowData.categoria || uploadCategory || 'Community';
                            const year = importYear;
                            if (importCategoria === 'ONG' && importYear < 2009) {
                                throw new Error(`El ano ${year} est� fuera del rango permitido para ONG (>= 2009).`);
                            }
                            if ((importCategoria === 'FIS' || importCategoria === 'Community') && importYear < 2018) {
                                throw new Error(`El ano ${year} est� fuera del rango permitido para ${categoria} (>= 2018).`);
                            }
                            const processed = await this.processProjectRow(row, { category: uploadCategory || importCategoria, year: uploadYear || importYear });
                            if (processed?.projectId && processed?.category) {
                                if (!syncedProjectIdsByCategory.has(processed.category)) {
                                    syncedProjectIdsByCategory.set(processed.category, new Set());
                                }
                                syncedProjectIdsByCategory.get(processed.category).add(processed.projectId);
                            }
                            if (processed?.projectName && processed?.projectId) {
                                projectLookup.set(processed.projectName.toString().trim().toLowerCase(), processed.projectId);
                            }
                            results.proyectos.created++;
                        }
                        catch (err) {
                            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
                            results.proyectos.errors.push({ row, error: errorMessage });
                        }
                    }
                    for (const [category, keepIdsSet] of syncedProjectIdsByCategory.entries()) {
                        const keepIds = Array.from(keepIdsSet);
                        if (keepIds.length === 0) {
                            continue;
                        }
                        const placeholders = keepIds.map(() => '?').join(',');
                        const params = [category, ...keepIds];
                        await this.entityManager.query(`DELETE pf
                             FROM participantes_formacion pf
                             INNER JOIN proyectos p ON pf.proyecto_id = p.id
                             INNER JOIN organizaciones o ON p.organizacion_id = o.id
                             WHERE o.categoria = ? AND p.id NOT IN (${placeholders})`, params);
                        await this.entityManager.query(`DELETE al
                             FROM aliados_contribuciones al
                             INNER JOIN proyectos p ON al.proyecto_id = p.id
                             INNER JOIN organizaciones o ON p.organizacion_id = o.id
                             WHERE o.categoria = ? AND p.id NOT IN (${placeholders})`, params);
                        await this.entityManager.query(`DELETE rm
                             FROM reportes_mensuales rm
                             INNER JOIN proyectos p ON rm.proyecto_id = p.id
                             INNER JOIN organizaciones o ON p.organizacion_id = o.id
                             WHERE o.categoria = ? AND p.id NOT IN (${placeholders})`, params);
                        await this.entityManager.query(`DELETE fp
                             FROM fotos_proyecto fp
                             INNER JOIN proyectos p ON fp.proyecto_id = p.id
                             INNER JOIN organizaciones o ON p.organizacion_id = o.id
                             WHERE o.categoria = ? AND p.id NOT IN (${placeholders})`, params);
                        await this.entityManager.query(`DELETE p
                             FROM proyectos p
                             INNER JOIN organizaciones o ON p.organizacion_id = o.id
                             WHERE o.categoria = ? AND p.id NOT IN (${placeholders})`, params);
                    }
                }
            }
            const participantSheetName = workbook.SheetNames.find(name => name === 'Participantes' || name === 'Formativo');
            if (participantSheetName) {
                if (!this.canUserEditCategory(user, uploadCategory || requestedCategory)) {
                    results.participantes.errors.push({ error: 'Solo Geo y Violeta pueden cargar participantes.' });
                }
                else {
                    const sheet = workbook.Sheets[participantSheetName];
                    const data = XLSX.utils.sheet_to_json(sheet);
                    const indexMap = new Map();
                    const syncedParticipantIdsByCategory = new Map();
                    for (const row of data) {
                        try {
                            const processed = await this.processParticipantRow(row, indexMap, { category: uploadCategory, year: uploadYear, projectLookup });
                            if (processed?.participantId && processed?.category) {
                                if (!syncedParticipantIdsByCategory.has(processed.category)) {
                                    syncedParticipantIdsByCategory.set(processed.category, new Set());
                                }
                                syncedParticipantIdsByCategory.get(processed.category).add(processed.participantId);
                            }
                            results.participantes.created++;
                        }
                        catch (err) {
                            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
                            results.participantes.errors.push({ row, error: errorMessage });
                        }
                    }
                    for (const [category, keepIdsSet] of syncedParticipantIdsByCategory.entries()) {
                        const keepIds = Array.from(keepIdsSet);
                        if (keepIds.length === 0) {
                            continue;
                        }
                        const placeholders = keepIds.map(() => '?').join(',');
                        const params = [category, ...keepIds];
                        await this.entityManager.query(`DELETE pf
                             FROM participantes_formacion pf
                             INNER JOIN proyectos p ON pf.proyecto_id = p.id
                             INNER JOIN organizaciones o ON p.organizacion_id = o.id
                             WHERE o.categoria = ? AND pf.id NOT IN (${placeholders})`, params);
                    }
                }
            }
            if (workbook.SheetNames.includes('Aliados')) {
                if (!this.canUserEditCategory(user, uploadCategory || requestedCategory)) {
                    results.aliados.errors.push({ error: 'Solo Geo y Violeta pueden cargar aliados.' });
                }
                else {
                    const sheet = workbook.Sheets['Aliados'];
                    const data = XLSX.utils.sheet_to_json(sheet);
                    for (const row of data) {
                        try {
                            await this.processAllyRow(row, user, { category: uploadCategory, year: uploadYear });
                            results.aliados.created++;
                        }
                        catch (err) {
                            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
                            results.aliados.errors.push({ row, error: errorMessage });
                        }
                    }
                }
            }
            const monthlySheetName = workbook.SheetNames.find(name => name === 'Reportes Mensuales' || name === 'Seguimiento Mensual del Proyecto' || name === 'Seguimiento Mensual');
            const activitySheetName = workbook.SheetNames.find(name => (name === 'Cronograma de Actividades' || name === 'Actividades' || name === 'Seguimiento') && name !== monthlySheetName);
            if (activitySheetName) {
                const sheet = workbook.Sheets[activitySheetName];
                const oa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });
                const hasSimplifiedBlockStructure = Array.isArray(oa) && oa.some((row) => Array.isArray(row) && row.some((cell) => {
                    const normalized = this.normalizeColumnKey(cell);
                    return normalized.includes('nombredelproyecto') || normalized.includes('metafinanciera');
                }));
                const hasFlatMonthlyStructure = Array.isArray(oa) && oa.some((row) => {
                    if (!Array.isArray(row)) return false;
                    const normalized = row.map((cell) => this.normalizeColumnKey(cell));
                    return normalized.some((cell) => cell.includes('nombredelproyecto'))
                        && normalized.some((cell) => cell.includes('mesdelproyecto') || cell.includes('mesdelseguimiento'))
                        && normalized.some((cell) => cell.includes('actividad'));
                });
                try {
                    const activityResult = hasFlatMonthlyStructure
                        ? { created: 0, updated: 0, errors: [] }
                        : (hasSimplifiedBlockStructure
                        ? await this.processSimplifiedMonthlyTrackingBlocks(sheet, user, {
                            category: uploadCategory,
                            year: uploadYear,
                            projectContext: workbookProjectContext,
                            projectLookup,
                            overwriteExisting,
                        })
                        : await this.processProjectActivitiesSheet(this.extractSheetRowsWithHeaders(sheet, ['Actividad', 'Mes del proyecto', 'Estado']), user, {
                            category: uploadCategory,
                            year: uploadYear,
                            projectContext: workbookProjectContext,
                            projectLookup,
                            overwriteExisting,
                        }));
                    results.actividades.created += activityResult.created;
                    results.actividades.updated += activityResult.updated;
                    results.actividades.errors.push(...activityResult.errors);
                }
                catch (err) {
                    const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
                    results.actividades.errors.push({ error: errorMessage });
                }
            }
            if (monthlySheetName) {
                const sheet = workbook.Sheets[monthlySheetName];
                const oa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });
                const hasLegacyMonthlyStructure = Array.isArray(oa) && oa.some((row) => {
                    if (!Array.isArray(row)) return false;
                    const normalized = row.map((cell) => this.normalizeColumnKey(cell));
                    return normalized.some((cell) => cell.includes('avance_tecnico_real') || cell.includes('avance_financiero_real') || cell.includes('estado_del_mes') || cell.includes('estado_cronograma'));
                });
                const hasFlatMonthlyStructure = Array.isArray(oa) && oa.some((row) => {
                    if (!Array.isArray(row)) return false;
                    const normalized = row.map((cell) => this.normalizeColumnKey(cell));
                    return normalized.some((cell) => cell.includes('nombredelproyecto'))
                        && normalized.some((cell) => cell.includes('mesdelproyecto') || cell.includes('mesdelseguimiento'))
                        && normalized.some((cell) => cell.includes('actividad'));
                });

                const processFlatMonthlyRows = async () => {
                    const allowOverwriteManual = overwriteExisting === true;
                    const headerRowIndex = oa.findIndex((rawRow) => {
                        const row = Array.isArray(rawRow) ? rawRow : [];
                        const normalized = row.map((cell) => this.normalizeColumnKey(cell));
                        return normalized.some((cell) => cell.includes('nombredelproyecto'))
                            && normalized.some((cell) => cell.includes('mesdelproyecto') || cell.includes('mesdelseguimiento'))
                            && normalized.some((cell) => cell.includes('actividad'));
                    });
                    if (headerRowIndex < 0) return;

                    const headerRow = Array.isArray(oa[headerRowIndex]) ? oa[headerRowIndex] : [];
                    const headerIndexByName = new Map();
                    headerRow.forEach((cell, index) => {
                        const normalizedCell = this.normalizeColumnKey(cell);
                        if (normalizedCell) headerIndexByName.set(normalizedCell, index);
                    });
                    const isBlank = (value) => value === null || value === undefined || value === '';
                    const cleanText = (value) => isBlank(value) ? '' : value.toString().trim();
                    const resolveRowValue = (rowValues, headerKeys, fallbackIndex = null) => {
                        for (const headerKey of headerKeys) {
                            const index = headerIndexByName.get(headerKey);
                            if (index !== undefined) return isBlank(rowValues[index]) ? null : rowValues[index];
                        }
                        if (fallbackIndex !== null && rowValues[fallbackIndex] !== undefined) {
                            return isBlank(rowValues[fallbackIndex]) ? null : rowValues[fallbackIndex];
                        }
                        return null;
                    };
                    const headerLikeValues = [
                        'nombre del proyecto', 'proyecto', 'plantilla de seguimiento mensual', 'seguimiento mensual',
                        'seguimiento mensual del proyecto', 'cronograma de actividades', 'mes del proyecto',
                        'mes del seguimiento', 'estado del mes', 'estado', 'estado cronograma', 'actividad',
                        'meta financiera', 'observacion breve', 'observaciones',
                    ];
                    const isHeaderLike = (value) => {
                        const normalized = this.normalizeText(value);
                        return !!normalized && headerLikeValues.includes(normalized);
                    };
                    const normalizeActivityStatusFromMonth = (scheduleStatus) => {
                        const normalized = this.normalizeMonthlyStatus(scheduleStatus);
                        if (normalized === 'Finalizado') return 'completed';
                        if (normalized === 'En Proceso') return 'active';
                        return 'pending';
                    };
                    const scoreFromMonthlyStatus = (scheduleStatus) => {
                        const normalized = this.normalizeMonthlyStatus(scheduleStatus);
                        if (normalized === 'Finalizado') return 100;
                        if (normalized === 'En Proceso') return 50;
                        return 0;
                    };

                    const groups = new Map();
                    let currentProjectName = '';
                    let currentMonthLabel = '';
                    for (let i = headerRowIndex + 1; i < oa.length; i++) {
                        const rawRow = Array.isArray(oa[i]) ? oa[i] : [];
                        if (rawRow.every((cell) => isBlank(cell))) continue;

                        const projectCell = cleanText(resolveRowValue(rawRow, ['nombredelproyecto', 'nombreproyecto', 'proyecto'], 0));
                        const monthCell = cleanText(resolveRowValue(rawRow, ['mesdelproyecto', 'mesdelseguimiento', 'mes'], 1));
                        const statusCell = cleanText(resolveRowValue(rawRow, ['estadodelmes', 'estadocronograma', 'estado'], 2));
                        const metaCell = resolveRowValue(rawRow, ['metafinanciera', 'metafinanciera$', 'meta'], 3);
                        const observationCell = cleanText(resolveRowValue(rawRow, ['observacionbreve', 'observaciones', 'comentario', 'comentarios'], 4));
                        const activityCell = cleanText(resolveRowValue(rawRow, ['actividad', 'nombreactividad', 'nombredeactividad', 'tarea'], 5));

                        if (isHeaderLike(projectCell) || isHeaderLike(monthCell) || isHeaderLike(activityCell)) continue;
                        if (projectCell) {
                            currentProjectName = projectCell;
                            if (!monthCell) currentMonthLabel = '';
                        }
                        if (monthCell) currentMonthLabel = monthCell;

                        if (!currentProjectName && !activityCell) continue;
                        if (!currentProjectName) {
                            results.reportes.errors.push({
                                row: { projectName: null, rowNumber: i + 1 },
                                error: `No se pudo registrar una fila de seguimiento porque falta el nombre del proyecto en la fila ${i + 1}.`,
                            });
                            continue;
                        }
                        if (!currentMonthLabel) {
                            results.reportes.errors.push({
                                row: { projectName: currentProjectName, rowNumber: i + 1 },
                                error: `No se pudo registrar el seguimiento de ${currentProjectName} porque falta el mes del proyecto en la fila ${i + 1}.`,
                            });
                            continue;
                        }

                        const groupKey = `${this.normalizeText(currentProjectName)}__${this.normalizeText(currentMonthLabel)}`;
                        if (!groups.has(groupKey)) {
                            groups.set(groupKey, {
                                projectName: currentProjectName,
                                monthLabel: currentMonthLabel,
                                rowNumber: i + 1,
                                status: null,
                                metaFinancial: null,
                                hasMetaFinancial: false,
                                observations: [],
                                activities: [],
                            });
                        }
                        const group = groups.get(groupKey);
                        if (statusCell && !isHeaderLike(statusCell)) group.status = statusCell;
                        if (!isBlank(metaCell)) {
                            group.metaFinancial = metaCell;
                            group.hasMetaFinancial = true;
                        }
                        if (observationCell && !isHeaderLike(observationCell) && !group.observations.includes(observationCell)) {
                            group.observations.push(observationCell);
                        }
                        if (activityCell && !isHeaderLike(activityCell)) {
                            group.activities.push({ name: activityCell, rowNumber: i + 1 });
                        }
                    }

                    for (const group of groups.values()) {
                        const rowForError = {
                            projectName: group.projectName,
                            'Nombre del Proyecto': group.projectName,
                            'Mes del proyecto': group.monthLabel,
                            rowNumber: group.rowNumber,
                        };
                        try {
                            const resolvedProject = await this.resolveProjectByTrackingInfo(group.projectName, {
                                organization: this.pickValue(workbookProjectContext, ['organization', 'organizacion', 'organización'], '').toString().trim() || undefined,
                                category: uploadCategory || undefined,
                                year: uploadYear || undefined,
                            });
                            if (!resolvedProject) {
                                throw new Error(`No se pudo registrar el seguimiento de ${group.projectName} porque el proyecto no se encontró en el sistema.`);
                            }

                            const projectMeta = await this.entityManager.query(
                                `SELECT p.nombre_proyecto as projectName, p.mes_inicio as startMonth, p.mes_final as endMonth, e.año as projectYear, p.monto_fgk as amountFGK, p.meta_financiera as metaFinancial
                                 FROM proyectos p
                                 LEFT JOIN ediciones e ON p.edicion_id = e.id
                                 WHERE p.id = ?
                                 LIMIT 1`,
                                [resolvedProject.id]
                            );
                            const projectTimeline = this.validateProjectTimeline(projectMeta, projectMeta[0]?.projectName || resolvedProject.id);
                            const resolvedSlot = this.resolveTimelineSlot(group.monthLabel, projectTimeline);
                            const reportMonth = resolvedSlot?.month || this.resolveTrackingMonth(group.monthLabel, projectTimeline.startMonth);
                            if (!reportMonth || !projectTimeline.sequence.includes(reportMonth)) {
                                throw new Error(`No se pudo registrar el seguimiento de ${group.projectName} porque el mes indicado (${group.monthLabel}) no pertenece al período definido del proyecto.`);
                            }

                            const reportYear = resolvedSlot?.year || parseInt(projectMeta[0]?.projectYear, 10) || uploadYear || new Date().getFullYear();
                            const reportId = `rep-${resolvedProject.id}-${reportYear}-${String(reportMonth).padStart(2, '0')}`;
                            const existingReport = await this.entityManager.query(
                                `SELECT meta_financiera as metaFinancial, estado_cronograma as scheduleStatus, observaciones as observations
                                 FROM reportes_mensuales
                                 WHERE id = ? OR (proyecto_id = ? AND mes = ? AND COALESCE(anio, año) = ?)
                                 ORDER BY created_at DESC
                                 LIMIT 1`,
                                [reportId, resolvedProject.id, reportMonth, reportYear]
                            );

                            const projectBaseInvestment = this.parseLooseNumber(projectMeta[0]?.amountFGK || 0) || 0;
                            let metaFinancialFromExcel = null;
                            if (group.hasMetaFinancial) {
                                metaFinancialFromExcel = this.parseLooseNumber(group.metaFinancial);
                                if (metaFinancialFromExcel === null) {
                                    throw new Error(`La meta financiera del proyecto ${group.projectName} no es un valor numérico válido.`);
                                }
                            }
                            const effectiveMetaFinancial = group.hasMetaFinancial
                                ? metaFinancialFromExcel
                                : (this.parseLooseNumber(existingReport[0]?.metaFinancial) || 0);
                            const existingAccumulated = await this.entityManager.query(
                                `SELECT COALESCE(SUM(meta_financiera), 0) as total
                                 FROM reportes_mensuales
                                 WHERE proyecto_id = ? AND id <> ?`,
                                [resolvedProject.id, reportId]
                            );
                            const accumulatedFgk = (this.parseLooseNumber(existingAccumulated[0]?.total) || 0) + (effectiveMetaFinancial || 0);
                            if (projectBaseInvestment > 0 && accumulatedFgk > projectBaseInvestment) {
                                throw new Error(`La meta financiera acumulada del proyecto ${group.projectName} supera la Inversión FGK permitida.`);
                            }
                            const cumulativeFinancial = projectBaseInvestment > 0
                                ? Math.min(100, Number(((accumulatedFgk / projectBaseInvestment) * 100).toFixed(2)))
                                : 0;
                            const monthlyFinancial = projectBaseInvestment > 0
                                ? Math.min(100, Number((((effectiveMetaFinancial || 0) / projectBaseInvestment) * 100).toFixed(2)))
                                : 0;

                            const normalizedScheduleStatus = group.status ? this.normalizeMonthlyStatus(group.status) : null;
                            if (group.status && !normalizedScheduleStatus) {
                                throw new Error(`El estado del mes para ${group.projectName} no es válido. Use Pendiente, En Proceso o Finalizado.`);
                            }
                            const scheduleStatus = normalizedScheduleStatus || existingReport[0]?.scheduleStatus || 'Pendiente';
                            const activityStatus = normalizeActivityStatusFromMonth(scheduleStatus);
                            const monthlyTechnical = scoreFromMonthlyStatus(scheduleStatus);
                            const observations = group.observations.length > 0
                                ? group.observations.join('\n')
                                : (existingReport[0]?.observations || '');

                            await this.entityManager.query(
                                `INSERT INTO reportes_mensuales (id, proyecto_id, mes, anio, año, avance_tecnico_real, avance_financiero_real, meta_financiera, estado_cronograma, observaciones, fotos, creado_por, created_at)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                                 ON DUPLICATE KEY UPDATE
                                   año = VALUES(año),
                                   avance_tecnico_real = VALUES(avance_tecnico_real),
                                   avance_financiero_real = VALUES(avance_financiero_real),
                                   meta_financiera = VALUES(meta_financiera),
                                   estado_cronograma = VALUES(estado_cronograma),
                                   observaciones = VALUES(observaciones),
                                   fotos = VALUES(fotos)`,
                                [
                                    reportId,
                                    resolvedProject.id,
                                    reportMonth,
                                    reportYear,
                                    reportYear,
                                    monthlyTechnical,
                                    monthlyFinancial,
                                    effectiveMetaFinancial || 0,
                                    scheduleStatus,
                                    observations,
                                    '[]',
                                    user?.email || 'Importador Excel'
                                ]
                            );

                            for (const activity of group.activities) {
                                await this.upsertProjectActivity(resolvedProject.id, {
                                    name: activity.name,
                                    month: reportMonth,
                                    status: activityStatus,
                                    note: null,
                                }, {
                                    source: 'excel',
                                    allowOverwriteManual,
                                    activityId: `act-${resolvedProject.id}-${reportYear}-${String(reportMonth).padStart(2, '0')}-${this.normalizeText(activity.name).replace(/[^a-z0-9]/g, '').slice(0, 16) || Date.now()}`
                                });
                                results.actividades.created++;
                            }

                            await this.entityManager.query(
                                `UPDATE proyecto_actividades
                                 SET estado = ?,
                                     observaciones = NULL,
                                     source = 'excel',
                                     manual_locked = 0,
                                     updated_at = NOW()
                                 WHERE proyecto_id = ? AND mes = ?`,
                                [
                                    activityStatus,
                                    resolvedProject.id,
                                    reportMonth
                                ]
                            );

                            await this.recalculateProjectProgress(resolvedProject.id);
                            results.reportes.created++;
                        }
                        catch (err) {
                            const errorMessage = this.formatMonthlyTrackingUploadError(err, group.projectName);
                            results.reportes.errors.push({
                                row: rowForError,
                                error: errorMessage,
                            });
                        }
                    }
                };
                if (hasFlatMonthlyStructure) {
                    await processFlatMonthlyRows();
                }
                else if (hasLegacyMonthlyStructure) {
                    const monthlyState = new Map();
                    const data = this.extractSheetRowsWithHeaders(sheet, ['Mes del proyecto', 'Mes calendario', 'Actividades planificadas']);
                    for (const [index, row] of data.entries()) {
                        try {
                            await this.processMonthlyReportRow(row, user, {
                                category: uploadCategory,
                                year: uploadYear,
                                projectContext: workbookProjectContext,
                                projectLookup,
                                monthlyState,
                                rowIndex: index + 5,
                            });
                            results.reportes.created++;
                        }
                        catch (err) {
                            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
                            results.reportes.errors.push({ row, error: errorMessage });
                        }
                    }
                }
            }
            if (workbook.SheetNames.includes('Configuracion Global')) {
                if (user.rol_id === 1 || user.rol_id === 3) {
                    const sheet = workbook.Sheets['Configuracion Global'];
                    const data = XLSX.utils.sheet_to_json(sheet);
                    for (const row of data) {
                        const rowData = row;
                        if (rowData.Campo && rowData.Valor !== undefined) {
                            const campoBD = rowData.Campo.toString().toLowerCase().trim();
                            if (['fgk', 'aliados', 'contrapartida'].includes(campoBD)) {
                                await this.entityManager.query(`INSERT INTO configuracion_manual (seccion, campo, valor, actualizado_por)
                   VALUES ('financials', ?, ?, ?)
                   ON DUPLICATE KEY UPDATE valor = VALUES(valor), actualizado_por = VALUES(actualizado_por)`, [campoBD, rowData.Valor.toString(), user.email || 'Importador Excel']);
                            }
                        }
                    }
                    results.configuracion = { success: true, message: 'Configuraci�n global sobreescrita correctamente.' };
                }
                else {
                    results.configuracion = { error: 'Rol no autorizado para modificar la configuraci�n global.' };
                }
            }
            const cleanupResult = await this.cleanupOrphanFollowUpData();
            if (cleanupResult.totalDeleted > 0) {
                results.limpieza = cleanupResult;
            }
            return {
                success: true,
                message: 'Archivo procesado correctamente',
                results,
            };
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido al procesar el archivo';
            throw new common_1.BadRequestException(errorMessage);
        }
    }
    async cleanupOrphanFollowUpData() {
        const deleteStatements = [
            {
                table: 'proyecto_actividades',
                alias: 'pa',
                join: 'LEFT JOIN proyectos p ON pa.proyecto_id = p.id OR pa.proyecto_id = SUBSTRING_INDEX(p.id, \'-\', 1)',
            },
            {
                table: 'reportes_mensuales',
                alias: 'rm',
                join: 'LEFT JOIN proyectos p ON rm.proyecto_id = p.id OR rm.proyecto_id = SUBSTRING_INDEX(p.id, \'-\', 1)',
            },
            {
                table: 'proyecto_mes_observaciones',
                alias: 'mo',
                join: 'LEFT JOIN proyectos p ON mo.proyecto_id = p.id OR mo.proyecto_id = SUBSTRING_INDEX(p.id, \'-\', 1)',
            },
            {
                table: 'fotos_proyecto',
                alias: 'fp',
                join: 'LEFT JOIN proyectos p ON fp.proyecto_id = p.id OR fp.proyecto_id = SUBSTRING_INDEX(p.id, \'-\', 1)',
            },
            {
                table: 'proyecto_documentos',
                alias: 'pd',
                join: 'LEFT JOIN proyectos p ON pd.proyecto_id = p.id OR pd.proyecto_id = SUBSTRING_INDEX(p.id, \'-\', 1)',
            },
            {
                table: 'aliados_contribuciones',
                alias: 'ac',
                join: 'LEFT JOIN proyectos p ON ac.proyecto_id = p.id OR ac.proyecto_id = SUBSTRING_INDEX(p.id, \'-\', 1)',
            },
            {
                table: 'participantes_formacion',
                alias: 'pf',
                join: 'LEFT JOIN proyectos p ON pf.proyecto_id = p.id OR pf.proyecto_id = SUBSTRING_INDEX(p.id, \'-\', 1)',
            },
        ];
        const summary = {};
        let totalDeleted = 0;
        for (const item of deleteStatements) {
            const result = await this.entityManager.query(
                `DELETE ${item.alias}
                 FROM ${item.table} ${item.alias}
                 ${item.join}
                 WHERE p.id IS NULL`
            );
            const affected = typeof result?.affectedRows === 'number' ? result.affectedRows : 0;
            summary[item.table] = affected || 0;
            totalDeleted += affected || 0;
        }
        return { totalDeleted, summary };
    }
    normalizeOptionalText(value) {
        const text = (value ?? '').toString().trim();
        return text ? text : null;
    }
    buildNormalizedRow(row) {
        const normalizedRow = {};
        for (const key in row) {
            if (Object.prototype.hasOwnProperty.call(row, key)) {
                normalizedRow[this.normalizeColumnKey(key)] = row[key];
            }
        }
        return normalizedRow;
    }
    isCommunityFlatTemplateRows(rows) {
        if (!Array.isArray(rows) || rows.length === 0) {
            return false;
        }
        const normalizedHeaders = Object.keys(rows[0] || {}).map((key) => this.normalizeColumnKey(key));
        return normalizedHeaders.includes('nombredelcorte')
            && (normalizedHeaders.includes('nombreadesco') || normalizedHeaders.includes('nombredeadesco'))
            && normalizedHeaders.includes('nombrecompleto');
    }
    buildCommunityCortesFromFlatRows(rows) {
        const cortesMap = new Map();
        const usedCorteSequencesByYear = new Map();
        const usedAdescoSequencesByYear = new Map();
        const usedParticipantSequencesByAdesco = new Map();
        const seenParticipantKeys = new Set();
        for (const row of rows) {
            const normalizedRow = this.buildNormalizedRow(row);
            const corteName = this.normalizeOptionalText(this.pickValue(normalizedRow, ['nombre_del_corte', 'nombredelcorte', 'nombre_corte', 'corte'], null));
            if (!corteName) {
                continue;
            }
            const corteYear = parseInt(this.pickValue(normalizedRow, ['edicion', 'ano', 'ano', 'year'], new Date().getFullYear()), 10) || new Date().getFullYear();
            const corteLocation = this.normalizeOptionalText(this.pickValue(normalizedRow, ['lugar_de_formacion', 'lugardeformacion', 'ubicacion', 'lugar'], null));
            const corteAlly = this.normalizeOptionalText(this.pickValue(normalizedRow, ['aliado_coordinador', 'aliadocoordinador', 'aliado', 'coordinador'], null));
            const corteStatus = this.normalizeOptionalText(this.pickValue(normalizedRow, ['estado'], null)) || 'Planificaci�n';
            const corteStartDate = this.pickValue(normalizedRow, ['fecha_inicio', 'fechainicio', 'inicio'], null);
            const corteEndDate = this.pickValue(normalizedRow, ['fecha_fin', 'fechafin', 'fin'], null);
            const corteKey = [
                corteYear,
                corteName.toLowerCase(),
                (corteLocation || '').toLowerCase(),
                (corteAlly || '').toLowerCase(),
                this.normalizeMysqlDate(corteStartDate) || '',
                this.normalizeMysqlDate(corteEndDate) || '',
                corteStatus.toLowerCase(),
            ].join('|');
            let corte = cortesMap.get(corteKey);
            if (!corte) {
                if (!usedCorteSequencesByYear.has(corteYear)) {
                    usedCorteSequencesByYear.set(corteYear, new Set());
                }
                const usedCorteSequences = usedCorteSequencesByYear.get(corteYear);
                const corteIdFromExcel = this.pickValue(normalizedRow, ['id_corte', 'idcorte', 'id'], null);
                let corteSequence = this.parseCommunitySequence(corteIdFromExcel, 'CF', corteYear);
                if (!corteSequence || usedCorteSequences.has(corteSequence)) {
                    corteSequence = 1;
                    while (usedCorteSequences.has(corteSequence)) corteSequence++;
                }
                usedCorteSequences.add(corteSequence);
                const finalCorteId = this.getCommunityYearSequenceId('CF', corteYear, corteSequence);
                corte = {
                    id: finalCorteId,
                    year: corteYear,
                    name: corteName,
                    location: corteLocation || null,
                    allyName: corteAlly || null,
                    status: corteStatus,
                    startDate: corteStartDate || null,
                    endDate: corteEndDate || null,
                    adescos: [],
                };
                cortesMap.set(corteKey, corte);
            }
            const adescoName = this.normalizeOptionalText(this.pickValue(normalizedRow, ['nombre_de_adesco', 'nombredeadesco', 'nombreadesco', 'adesco'], null));
            if (!adescoName) {
                continue;
            }
            const adescoYear = parseInt(this.pickValue(normalizedRow, ['edicion_adesco', 'edicionadesco', 'edicion', 'ano', 'ano', 'year'], corteYear), 10) || corteYear;
            const participantsCount = parseInt(this.pickValue(normalizedRow, ['inscritos', 'participantes_inscritos', 'participantesinscritos'], 0), 10) || 0;
            const graduatesCount = parseInt(this.pickValue(normalizedRow, ['graduados', 'participantes_graduados', 'participantesgraduados'], 0), 10) || 0;
            const femaleCount = parseInt(this.pickValue(normalizedRow, ['mujeres', 'femeninas', 'female'], 0), 10) || 0;
            const maleCount = parseInt(this.pickValue(normalizedRow, ['hombres', 'masculinos', 'male'], 0), 10) || 0;
            const adescoKey = `${corteKey}|${adescoYear}|${adescoName.toLowerCase()}`;
            let adesco = corte.adescos.find((item) => item._key === adescoKey);
            if (!adesco) {
                if (!usedAdescoSequencesByYear.has(adescoYear)) {
                    usedAdescoSequencesByYear.set(adescoYear, new Set());
                }
                const usedAdescoSequences = usedAdescoSequencesByYear.get(adescoYear);
                const adescoIdFromExcel = this.pickValue(normalizedRow, ['id_adesco', 'idadesco', 'id'], null);
                let adescoSequence = this.parseCommunitySequence(adescoIdFromExcel, 'AD', adescoYear);
                if (!adescoSequence || usedAdescoSequences.has(adescoSequence)) {
                    adescoSequence = 1;
                    while (usedAdescoSequences.has(adescoSequence)) adescoSequence++;
                }
                usedAdescoSequences.add(adescoSequence);
                const finalAdescoId = this.getCommunityYearSequenceId('AD', adescoYear, adescoSequence);
                adesco = {
                    _key: adescoKey,
                    id: finalAdescoId,
                    corteId: corte.id,
                    year: adescoYear,
                    name: adescoName,
                    participantsCount,
                    graduatesCount,
                    femaleCount,
                    maleCount,
                    participants: [],
                };
                corte.adescos.push(adesco);
            }
            const participantName = this.normalizeOptionalText(this.pickValue(normalizedRow, ['nombre_completo', 'nombrecompleto', 'nombre_participante', 'nombreparticipante', 'nombre'], null));
            const participantRole = this.normalizeOptionalText(this.pickValue(normalizedRow, ['cargo', 'rol'], null));
            const participantContact = this.normalizeOptionalText(this.pickValue(normalizedRow, ['contacto', 'telefono', 'telfono', 'phone'], null));
            const participantDistrict = this.normalizeOptionalText(this.pickValue(normalizedRow, ['distrito'], null));
            const participantDepartment = this.normalizeOptionalText(this.pickValue(normalizedRow, ['departamento'], null));
            const participantGender = this.normalizeOptionalText(this.pickValue(normalizedRow, ['genero', 'g�nero', 'gender'], null)) || 'M';
            if (!participantName && !participantRole && !participantContact && !participantDistrict && !participantDepartment) {
                continue;
            }
            const participantKey = [
                adescoKey,
                participantName || '',
                participantRole || '',
                participantContact || '',
                participantDistrict || '',
                participantDepartment || '',
                participantGender || '',
            ].join('|');
            if (seenParticipantKeys.has(participantKey)) {
                continue;
            }
            seenParticipantKeys.add(participantKey);
            if (!usedParticipantSequencesByAdesco.has(adesco.id)) {
                usedParticipantSequencesByAdesco.set(adesco.id, new Set());
            }
            const usedParticipantSequences = usedParticipantSequencesByAdesco.get(adesco.id);
            const participantIdFromExcel = this.pickValue(normalizedRow, ['id_participante', 'idparticipante', 'id'], null);
            let participantSequence = this.parseCommunityParticipantSequence(participantIdFromExcel, adesco.id);
            if (!participantSequence || usedParticipantSequences.has(participantSequence)) {
                participantSequence = 1;
                while (usedParticipantSequences.has(participantSequence)) participantSequence++;
            }
            usedParticipantSequences.add(participantSequence);
            const finalParticipantId = `${adesco.id}-${String(participantSequence).padStart(2, '0')}`;
            adesco.participants.push({
                id: finalParticipantId,
                name: participantName || 'Sin nombre',
                role: participantRole || null,
                phone: participantContact || null,
                district: participantDistrict || null,
                department: participantDepartment || null,
                gender: participantGender || 'M',
            });
            if ((!adesco.participantsCount || adesco.participantsCount === 0) && adesco.participants.length > 0) {
                adesco.participantsCount = adesco.participants.length;
            }
            if (adesco.femaleCount === 0 && adesco.maleCount === 0 && adesco.participants.length > 0) {
                adesco.femaleCount = adesco.participants.filter((p) => (p.gender ?? '').toString().toUpperCase() === 'F').length;
                adesco.maleCount = adesco.participants.filter((p) => (p.gender ?? '').toString().toUpperCase() !== 'F').length;
            }
        }
        return Array.from(cortesMap.values()).map((corte) => {
            delete corte._key;
            for (const adesco of corte.adescos) {
                delete adesco._key;
            }
            return corte;
        });
    }
    async processCommunityCortesExcel(file, user) {
        if (!file) {
            throw new common_1.BadRequestException('No se recibi� ning�n archivo');
        }
        if (!user) {
            throw new common_1.UnauthorizedException('Usuario no autenticado');
        }
        if (!this.canUserEditCategory(user, 'Cortes') && user.rol_id !== 4) {
            throw new common_1.UnauthorizedException('Su rol no tiene permisos para cargar Cortes Formativos.');
        }
        try {
            await this.ensureCommunitySchema();
            const workbook = XLSX.read(file.buffer, { type: 'buffer' });
            const sheetNames = workbook.SheetNames || [];
            for (const sheetName of workbook.SheetNames) {
                const flatRows = this.extractSheetRowsWithHeaders(
                    workbook.Sheets[sheetName],
                    ['Nombre del Corte', 'Nombre de ADESCO', 'Nombre Completo']
                );
                if (this.isCommunityFlatTemplateRows(flatRows)) {
                    const cortes = this.buildCommunityCortesFromFlatRows(flatRows);
                    if (!cortes.length) {
                        throw new Error('La plantilla de Cortes Formativos no contiene registros v�lidos.');
                    }
                    return await this.dashboardService.updateCommunityCortes(cortes);
                }
            }
            const findSheetByHeaders = (requiredHeaders, optionalMatchers = []) => {
                for (const name of sheetNames) {
                    const sheet = workbook.Sheets[name];
                    const rows = this.extractSheetRowsWithHeaders(sheet, requiredHeaders);
                    if (Array.isArray(rows) && rows.length > 0) {
                        const normalizedHeaders = Object.keys(rows[0] || {}).map((key) => this.normalizeColumnKey(key));
                        const requiredOk = requiredHeaders.every((header) => {
                            const normalizedHeader = this.normalizeColumnKey(header);
                            return normalizedHeaders.some((cell) => cell === normalizedHeader || cell.includes(normalizedHeader));
                        });
                        const optionalOk = optionalMatchers.length === 0 || optionalMatchers.some((matcher) => {
                            const normalizedMatcher = this.normalizeColumnKey(matcher);
                            return normalizedHeaders.some((cell) => cell === normalizedMatcher || cell.includes(normalizedMatcher));
                        });
                        if (requiredOk && optionalOk) {
                            return name;
                        }
                    }
                }
                return null;
            };
            const corteSheetName = findSheetByHeaders(['Nombre del Corte', 'Edici�n', 'Aliado / Coordinador', 'Lugar de Formaci�n'], ['Nombre de ADESCO', 'Nombre Completo'])
                || sheetNames[0];
            const adescoSheetName = findSheetByHeaders(['Nombre de ADESCO', 'Edici�n ADESCO'], ['Inscritos', 'Graduados']) || null;
            const participantSheetName = findSheetByHeaders(['Nombre Completo', 'Cargo', 'Contacto'], ['Distrito', 'Departamento']) || null;
            const corteRows = XLSX.utils.sheet_to_json(workbook.Sheets[corteSheetName], { defval: '' });
            const adescoRows = adescoSheetName ? XLSX.utils.sheet_to_json(workbook.Sheets[adescoSheetName], { defval: '' }) : [];
            const participantRows = participantSheetName ? XLSX.utils.sheet_to_json(workbook.Sheets[participantSheetName], { defval: '' }) : [];
            const cortesMap = new Map();
            const adescosMap = new Map();
            const corteLookup = new Map();
            const usedCorteSequencesByYear = new Map();
            const usedAdescoSequencesByYear = new Map();
            const usedParticipantSequencesByAdesco = new Map();
            const warnings = [];
            let adescosCount = 0;
            let participantsCount = 0;
            for (const row of corteRows) {
                const normalizedRow = {};
                for (const key in row) {
                    if (Object.prototype.hasOwnProperty.call(row, key)) {
                        normalizedRow[this.normalizeColumnKey(key)] = row[key];
                    }
                }
                const year = parseInt(this.pickValue(normalizedRow, ['edicion', 'ano', 'ano', 'year'], new Date().getFullYear()), 10) || new Date().getFullYear();
                const editionExists = await this.entityManager.query(`SELECT id FROM ediciones WHERE año = ? LIMIT 1`, [year]);
                if (!editionExists || editionExists.length === 0) {
                    warnings.push(`Se omiti� el corte "${this.pickValue(normalizedRow, ['nombre_corte', 'nombrecorte', 'nombre'], 'Sin nombre')}" porque la edición ${year} no est� disponible en el sistema. Debe crearla antes de cargar o editar registros de ese ano.`);
                    continue;
                }
                const reference = this.pickValue(normalizedRow, ['referencia_corte', 'ref_corte', 'corte_ref', 'clave_corte'], `corte-${cortesMap.size + 1}`).toString().trim();
                const id = this.pickValue(normalizedRow, ['id_corte', 'idcorte', 'id'], null);
                if (!usedCorteSequencesByYear.has(year)) {
                    usedCorteSequencesByYear.set(year, new Set());
                }
                const usedCorteSequences = usedCorteSequencesByYear.get(year);
                let corteSequence = this.parseCommunitySequence(id, 'CF', year);
                if (!corteSequence || usedCorteSequences.has(corteSequence)) {
                    corteSequence = 1;
                    while (usedCorteSequences.has(corteSequence)) corteSequence++;
                }
                usedCorteSequences.add(corteSequence);
                const corteId = this.getCommunityYearSequenceId('CF', year, corteSequence);
                corteLookup.set(reference, corteId);
                corteLookup.set(corteId, corteId);
                cortesMap.set(corteId, {
                    id: corteId,
                    reference,
                    name: this.pickValue(normalizedRow, ['nombre_corte', 'nombrecorte', 'nombre'], 'Sin nombre'),
                    year,
                    startDate: this.pickValue(normalizedRow, ['fecha_inicio', 'fechainicio', 'inicio'], ''),
                    endDate: this.pickValue(normalizedRow, ['fecha_fin', 'fechafin', 'fin'], ''),
                    location: this.pickValue(normalizedRow, ['ubicacion', 'lugar'], ''),
                    allyName: this.pickValue(normalizedRow, ['nombre_aliado', 'nombrealiado', 'aliado'], ''),
                    status: this.pickValue(normalizedRow, ['estado', 'status'], 'Planificaci�n'),
                    adescos: [],
                });
            }
            if (cortesMap.size === 0) {
                if (warnings.length > 0) {
                    return {
                        success: false,
                        message: warnings.join(' '),
                        warnings,
                    };
                }
                throw new Error('La hoja "Cortes Comunitarios" no contiene registros v�lidos.');
            }
            for (const row of adescoRows) {
                const normalizedRow = {};
                for (const key in row) {
                    if (Object.prototype.hasOwnProperty.call(row, key)) {
                        normalizedRow[this.normalizeColumnKey(key)] = row[key];
                    }
                }
                const corteRef = this.pickValue(normalizedRow, ['referencia_corte', 'ref_corte', 'corte_ref', 'id_corte_referencia', 'idcortereferencia', 'corte_id', 'id_corte'], null);
                if (!corteRef) {
                    throw new Error('Cada ADESCO debe indicar ID_Corte_Referencia.');
                }
                const corte = cortesMap.get(corteLookup.get(corteRef.toString().trim()) || corteRef.toString().trim());
                if (!corte) {
                    warnings.push(`Se omiti� la ADESCO '${this.pickValue(normalizedRow, ['nombre_adesco', 'nombreadesco', 'nombre'], 'Sin nombre')}' porque referencia un corte inexistente (${corteRef}).`);
                    continue;
                }
                const adescoYear = parseInt(this.pickValue(normalizedRow, ['edicion', 'ano', 'ano', 'year'], corte.year), 10) || corte.year;
                const adescoEditionExists = await this.entityManager.query(`SELECT id FROM ediciones WHERE año = ? LIMIT 1`, [adescoYear]);
                if (!adescoEditionExists || adescoEditionExists.length === 0) {
                    warnings.push(`Se omiti� la ADESCO '${this.pickValue(normalizedRow, ['nombre_adesco', 'nombreadesco', 'nombre'], 'Sin nombre')}' del corte '${corte.name}' porque la edición ${adescoYear} no est� disponible en el sistema. Debe crearla antes de cargar o editar registros de ese ano.`);
                    continue;
                }
                if (!usedAdescoSequencesByYear.has(adescoYear)) {
                    usedAdescoSequencesByYear.set(adescoYear, new Set());
                }
                const usedAdescoSequences = usedAdescoSequencesByYear.get(adescoYear);
                const adescoId = this.pickValue(normalizedRow, ['id_adesco', 'idadesco', 'id'], null);
                let finalAdescoId = (adescoId ?? '').toString().trim();
                let adescoSequence = this.parseCommunitySequence(finalAdescoId, 'AD', adescoYear);
                if (!adescoSequence || usedAdescoSequences.has(adescoSequence)) {
                    adescoSequence = 1;
                    while (usedAdescoSequences.has(adescoSequence)) adescoSequence++;
                    finalAdescoId = this.getCommunityYearSequenceId('AD', adescoYear, adescoSequence);
                }
                usedAdescoSequences.add(adescoSequence);
                const adesco = {
                    id: finalAdescoId,
                    corteId: corte.id,
                    year: adescoYear,
                    name: this.pickValue(normalizedRow, ['nombre_adesco', 'nombreadesco', 'nombre'], 'Sin nombre'),
                    participantsCount: parseInt(this.pickValue(normalizedRow, ['participantes_inscritos', 'participantesinscritos', 'inscritos'], 0), 10) || 0,
                    graduatesCount: parseInt(this.pickValue(normalizedRow, ['participantes_graduados', 'participantesgraduados', 'graduados'], 0), 10) || 0,
                    femaleCount: parseInt(this.pickValue(normalizedRow, ['mujeres', 'femenino'], 0), 10) || 0,
                    maleCount: parseInt(this.pickValue(normalizedRow, ['hombres', 'masculino'], 0), 10) || 0,
                    participants: [],
                };
                cortesMap.get(corte.id).adescos.push(adesco);
                adescosMap.set(finalAdescoId, adesco);
                adescosMap.set(this.pickValue(normalizedRow, ['referencia_adesco', 'ref_adesco', 'adesco_ref', 'clave_adesco'], finalAdescoId).toString().trim(), adesco);
                adescosCount++;
            }
            for (const row of participantRows) {
                const normalizedRow = {};
                for (const key in row) {
                    if (Object.prototype.hasOwnProperty.call(row, key)) {
                        normalizedRow[this.normalizeColumnKey(key)] = row[key];
                    }
                }
                const adescoRef = this.pickValue(normalizedRow, ['referencia_adesco', 'ref_adesco', 'adesco_ref', 'id_adesco_referencia', 'idadescoreferencia', 'adesco_id', 'id_adesco'], null);
                if (!adescoRef) {
                    throw new Error('Cada participante debe indicar ID_Adesco_Referencia.');
                }
                const adesco = adescosMap.get(adescoRef.toString().trim());
                if (!adesco) {
                    warnings.push(`Se omiti� el participante '${this.pickValue(normalizedRow, ['nombre', 'nombre_participante', 'nombreparticipante'], 'Sin nombre')}' porque referencia una ADESCO inexistente (${adescoRef}).`);
                    continue;
                }
                if (!usedParticipantSequencesByAdesco.has(adesco.id)) {
                    usedParticipantSequencesByAdesco.set(adesco.id, new Set());
                }
                const usedParticipantSequences = usedParticipantSequencesByAdesco.get(adesco.id);
                const participantId = this.pickValue(normalizedRow, ['id_participante', 'idparticipante', 'id'], null);
                let finalParticipantId = (participantId ?? '').toString().trim();
                let participantSequence = this.parseCommunityParticipantSequence(finalParticipantId, adesco.id);
                if (!participantSequence || usedParticipantSequences.has(participantSequence)) {
                    participantSequence = 1;
                    while (usedParticipantSequences.has(participantSequence)) participantSequence++;
                    finalParticipantId = `${adesco.id}-${String(participantSequence).padStart(2, '0')}`;
                }
                usedParticipantSequences.add(participantSequence);
                adesco.participants.push({
                    id: finalParticipantId,
                    name: this.pickValue(normalizedRow, ['nombre', 'nombre_participante', 'nombreparticipante'], 'Sin nombre'),
                    role: this.pickValue(normalizedRow, ['cargo', 'rol', 'role'], ''),
                    phone: this.pickValue(normalizedRow, ['contacto', 'telefono', 'phone'], ''),
                    district: this.pickValue(normalizedRow, ['distrito'], ''),
                    department: this.pickValue(normalizedRow, ['departamento'], ''),
                    gender: this.pickValue(normalizedRow, ['genero', 'g�nero', 'gender'], 'M'),
                });
                participantsCount++;
            }
            for (const corte of cortesMap.values()) {
                for (const adesco of corte.adescos) {
                    if ((!adesco.participantsCount || adesco.participantsCount === 0) && adesco.participants.length > 0) {
                        adesco.participantsCount = adesco.participants.length;
                    }
                    if (adesco.femaleCount === 0 && adesco.maleCount === 0 && adesco.participants.length > 0) {
                        adesco.femaleCount = adesco.participants.filter((p) => (p.gender ?? '').toString().toUpperCase() === 'F').length;
                        adesco.maleCount = adesco.participants.filter((p) => (p.gender ?? '').toString().toUpperCase() !== 'F').length;
                    }
                }
            }
            await this.entityManager.transaction(async (transactionalEntityManager) => {
                const corteIds = Array.from(cortesMap.keys());
                if (corteIds.length > 0) {
                    const placeholders = corteIds.map(() => '?').join(',');
                    await transactionalEntityManager.query(`DELETE ap FROM adescos_participantes ap INNER JOIN adescos a ON ap.adesco_id = a.id WHERE a.corte_id NOT IN (${placeholders})`, corteIds);
                    await transactionalEntityManager.query(`DELETE FROM adescos WHERE corte_id NOT IN (${placeholders})`, corteIds);
                    await transactionalEntityManager.query(`DELETE FROM cortes_comunitarios WHERE id NOT IN (${placeholders})`, corteIds);
                }
                else {
                    await transactionalEntityManager.query(`DELETE FROM adescos_participantes`);
                    await transactionalEntityManager.query(`DELETE FROM adescos`);
                    await transactionalEntityManager.query(`DELETE FROM cortes_comunitarios`);
                }
                for (const corte of cortesMap.values()) {
                    await transactionalEntityManager.query(`INSERT INTO cortes_comunitarios (id, nombre, año, fecha_inicio, fecha_fin, ubicacion, nombre_aliado, estado)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             nombre = VALUES(nombre),
             año = VALUES(año),
             fecha_inicio = VALUES(fecha_inicio),
             fecha_fin = VALUES(fecha_fin),
             ubicacion = VALUES(ubicacion),
             nombre_aliado = VALUES(nombre_aliado),
             estado = VALUES(estado)`, [
                        corte.id,
                        corte.name || 'Sin nombre',
                        corte.year || 2025,
                        this.normalizeMysqlDate(corte.startDate),
                        this.normalizeMysqlDate(corte.endDate),
                        corte.location || null,
                        corte.allyName || null,
                        corte.status || 'Planificaci�n',
                    ]);
                    await transactionalEntityManager.query(`DELETE ap FROM adescos_participantes ap INNER JOIN adescos a ON ap.adesco_id = a.id WHERE a.corte_id = ?`, [corte.id]);
                    await transactionalEntityManager.query(`DELETE FROM adescos WHERE corte_id = ?`, [corte.id]);
                    for (const adesco of corte.adescos) {
                        await transactionalEntityManager.query(`INSERT INTO adescos (id, corte_id, año, nombre, participantes_inscritos, participantes_graduados, mujeres, hombres)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
                 corte_id = VALUES(corte_id),
                 año = VALUES(año),
                 nombre = VALUES(nombre),
                 participantes_inscritos = VALUES(participantes_inscritos),
                 participantes_graduados = VALUES(participantes_graduados),
                 mujeres = VALUES(mujeres),
                 hombres = VALUES(hombres)`, [
                            adesco.id,
                            corte.id,
                            adesco.year || corte.year || 2025,
                            adesco.name || 'Sin nombre',
                            adesco.participantsCount || 0,
                            adesco.graduatesCount || 0,
                            adesco.femaleCount || 0,
                            adesco.maleCount || 0,
                        ]);
                        for (const part of adesco.participants || []) {
                            await transactionalEntityManager.query(`INSERT INTO adescos_participantes (id, adesco_id, nombre, cargo, contacto, distrito, departamento, genero)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                   ON DUPLICATE KEY UPDATE
                     adesco_id = VALUES(adesco_id),
                     nombre = VALUES(nombre),
                     cargo = VALUES(cargo),
                     contacto = VALUES(contacto),
                     distrito = VALUES(distrito),
                     departamento = VALUES(departamento),
                     genero = VALUES(genero)`, [
                                part.id || `part-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                                adesco.id,
                                part.name || 'Sin nombre',
                                part.role || null,
                                part.phone || null,
                                part.district || null,
                                part.department || null,
                                part.gender || 'M',
                            ]);
                        }
                    }
                }
            });
            return {
                success: true,
                message: warnings.length > 0
                    ? `Cortes comunitarios y ADESCOS importados correctamente. Se omitieron ${warnings.length} registro${warnings.length > 1 ? 's' : ''} por edición no disponible o referencias inv�lidas.`
                    : 'Cortes comunitarios y ADESCOS importados correctamente',
                warnings,
                results: {
                    cortes: cortesMap.size,
                    adescos: adescosCount,
                    participantes: participantsCount,
                },
            };
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido al procesar la carga de Cortes Formativos';
            throw new common_1.BadRequestException(errorMessage);
        }
    }
    async processFisParticipantsExcel(file, user) {
        if (!file) {
            throw new common_1.BadRequestException('No se recibi� ning�n archivo');
        }
        if (!user) {
            throw new common_1.UnauthorizedException('Usuario no autenticado');
        }
        if (!this.canUserEditCategory(user, 'FIS')) {
            throw new common_1.UnauthorizedException('Su rol no tiene permisos para cargar participantes de Emprendimiento Social.');
        }
        try {
            const workbook = XLSX.read(file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames.find(name => {
                const normalized = this.normalizeText(name);
                return normalized.includes('particip') || normalized.includes('emprend') || normalized.includes('incub');
            });
            if (!sheetName) {
                throw new Error('La plantilla debe incluir una hoja de participantes para Emprendimiento Social.');
            }
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
            if (!Array.isArray(rows) || rows.length === 0) {
                throw new Error('La hoja de participantes no contiene registros v�lidos.');
            }
            const participants = [];
            let counter = 0;
            for (const row of rows) {
                const normalizedRow = {};
                for (const key in row) {
                    if (Object.prototype.hasOwnProperty.call(row, key)) {
                        normalizedRow[this.normalizeColumnKey(key)] = row[key];
                    }
                }
                const name = this.pickValue(normalizedRow, ['nombre', 'nombre_participante', 'nombreparticipante', 'participante'], null);
                if (!name) {
                    throw new Error('Cada participante debe incluir un nombre.');
                }
                const year = parseInt(this.pickValue(normalizedRow, ['ano', 'ano', 'year'], new Date().getFullYear()), 10) || new Date().getFullYear();
                const campus = this.pickValue(normalizedRow, ['sede', 'campus', 'sede_campus'], 'Central');
                const program = this.pickValue(normalizedRow, ['programa', 'program'], 'Incubadora FGK');
                const genderRaw = this.normalizeText(this.pickValue(normalizedRow, ['genero', 'g�nero', 'gender'], 'M'));
                const gender = (genderRaw === 'f' || genderRaw === 'femenino' || genderRaw === 'mujer') ? 'F' : 'M';
                const ageRaw = this.pickValue(normalizedRow, ['edad', 'age'], null);
                const age = ageRaw !== null && ageRaw !== '' ? parseInt(ageRaw, 10) : null;
                const ventureName = this.pickValue(normalizedRow, ['nombre_emprendimiento', 'nombreemprendimiento', 'emprendimiento', 'empresa'], 'Sin emprendimiento');
                const department = this.pickValue(normalizedRow, ['departamento', 'depto'], 'San Salvador');
                const statusRaw = this.normalizeText(this.pickValue(normalizedRow, ['estado', 'status', 'estado_formacion'], 'inscrito'));
                const status = statusRaw.includes('gradu') ? 'graduado' : statusRaw.includes('reti') ? 'retiro' : statusRaw.includes('form') ? 'en formación' : 'inscrito';
                const observations = this.pickValue(normalizedRow, ['observaciones', 'observacion', 'notes'], null);
                const projectLikeId = this.pickValue(normalizedRow, ['id', 'id_participante', 'idparticipante'], null);
                let id = (projectLikeId ?? '').toString().trim();
                if (!id) {
                    counter++;
                    id = `inc-${String(counter).padStart(3, '0')}`;
                }
                participants.push({
                    id,
                    year,
                    program,
                    campus,
                    name,
                    gender,
                    age: Number.isNaN(age) ? null : age,
                    ventureName,
                    department,
                    status,
                    observations,
                });
            }
            await this.entityManager.transaction(async (transactionalEntityManager) => {
                await transactionalEntityManager.query(`DELETE FROM participantes_incubadora`);
                for (const participant of participants) {
                    await transactionalEntityManager.query(
                        `INSERT INTO participantes_incubadora (id, ano, programa, sede, nombre, genero, edad, nombre_emprendimiento, departamento, estado, observaciones, created_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                         ON DUPLICATE KEY UPDATE
                           ano = VALUES(ano),
                           programa = VALUES(programa),
                           sede = VALUES(sede),
                           nombre = VALUES(nombre),
                           genero = VALUES(genero),
                           edad = VALUES(edad),
                           nombre_emprendimiento = VALUES(nombre_emprendimiento),
                           departamento = VALUES(departamento),
                           estado = VALUES(estado),
                           observaciones = VALUES(observaciones)`,
                        [
                            participant.id,
                            participant.year,
                            participant.program,
                            participant.campus,
                            participant.name,
                            participant.gender,
                            participant.age,
                            participant.ventureName,
                            participant.department,
                            participant.status,
                            participant.observations,
                        ]
                    );
                }
            });
            return {
                success: true,
                message: 'Participantes de Emprendimiento Social importados correctamente',
                total: participants.length,
            };
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido al procesar la carga de Emprendimiento Social';
            throw new common_1.BadRequestException(errorMessage);
        }
    }
    async processProjectRow(row, context = {}) {
        const normalizedRow = {};
        for (const key in row) {
            if (Object.prototype.hasOwnProperty.call(row, key)) {
                const cleanKey = this.normalizeColumnKey(key);
                normalizedRow[cleanKey] = row[key];
            }
        }
        const contextCategory = context.category ? this.normalizeCategory(context.category) : null;
        const contextYear = context.year ? parseInt(context.year, 10) : null;
        const orgName = this.pickValue(normalizedRow, ['organizacion', 'organizacin', 'organization'], 'Desconocida');
        const category = contextCategory || this.normalizeCategory(this.pickValue(normalizedRow, ['categoria', 'categora', 'category'], 'Community'));
        const year = parseInt(this.pickValue(normalizedRow, ['o', 'ano', 'year', 'oedicin', 'anoedicion', 'edicin', 'edicion'], contextYear || 2025), 10);
        const projectName = this.pickValue(normalizedRow, ['nombreproyecto', 'nombre_proyecto', 'nombredelproyecto', 'proyecto'], 'Sin Nombre');
        const depto = normalizedRow.departamento || 'San Salvador';
        const parseMonthValue = (value) => {
            if (value === null || value === undefined || value === '') return null;
            const raw = value.toString().trim().toLowerCase();
            const numeric = parseInt(raw, 10);
            if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= 12) {
                return numeric;
            }
            const normalized = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const monthMap: Record<string, number> = {
                enero: 1, ene: 1,
                febrero: 2, feb: 2,
                marzo: 3, mar: 3,
                abril: 4, abr: 4,
                mayo: 5, may: 5,
                junio: 6, jun: 6,
                julio: 7, jul: 7,
                agosto: 8, ago: 8,
                septiembre: 9, setiembre: 9, sep: 9, sept: 9,
                octubre: 10, oct: 10,
                noviembre: 11, nov: 11,
                diciembre: 12, dic: 12,
            };
            return monthMap[normalized] || null;
        };
        const parseOptionalMonth = (value) => {
            return parseMonthValue(value);
        };
        const timelineStartMonthRaw = this.pickValue(normalizedRow, [
            'mes_inicio',
            'mesinicio',
            'inicio_mes',
            'mesiniciocronograma',
            'mes_de_inicio',
        ], null);
        const timelineEndMonthRaw = this.pickValue(normalizedRow, [
            'mes_final',
            'mesfinal',
            'fin_mes',
            'mes_de_final',
        ], null);
        const timelineDurationRaw = this.pickValue(normalizedRow, [
            'duracion_meses',
            'duracionmeses',
            'duracion',
            'duracion_del_proyecto',
        ], null);
        const timelineStartMonth = parseOptionalMonth(timelineStartMonthRaw);
        const timelineEndMonth = parseOptionalMonth(timelineEndMonthRaw);
        const timelineDurationFromExcel = (() => {
            if (timelineDurationRaw === null || timelineDurationRaw === undefined || timelineDurationRaw === '') return null;
            const parsed = parseInt(timelineDurationRaw, 10);
            return Number.isNaN(parsed) || parsed < 1 ? null : Math.min(24, parsed);
        })();
        const derivedTimelineEndMonth = (!timelineEndMonth && timelineStartMonth && timelineDurationFromExcel)
            ? (((timelineStartMonth - 1 + timelineDurationFromExcel - 1) % 12) + 1)
            : timelineEndMonth;
        const timelineDurationMonths = (timelineStartMonth && timelineEndMonth)
            ? (timelineEndMonth >= timelineStartMonth
                ? (timelineEndMonth - timelineStartMonth + 1)
                : ((12 - timelineStartMonth + 1) + timelineEndMonth))
            : (timelineStartMonth && timelineDurationFromExcel
                ? timelineDurationFromExcel
                : null);
        const projectIdFromExcel = this.pickValue(normalizedRow, ['id_proyecto', 'idproyecto'], null);
        if (projectIdFromExcel) {
            this.validateProjectId(projectIdFromExcel, year);
        }
        const organizacionId = await this.findOrCreateOrganization(orgName, category);
        const edicion = await this.entityManager.query(`SELECT id FROM ediciones WHERE año = ? LIMIT 1`, [year]);
        if (!edicion || edicion.length === 0) {
            throw new Error(`El proyecto ${projectName} no se pudo subir debido a que la edición ${year} no est� disponible.`);
        }
        const edicionId = edicion[0].id;
        const categoryCode = this.getCategoryCode(category);
        let projectId = normalizedRow.idproyecto || normalizedRow.id_proyecto;
        if (!projectId) {
            projectId = await this.generateCustomProjectId(year, category);
        }
        else {
            const rawId = projectId.toString().trim();
            if (/^(ONG|DC|FIS)\d{4}-\d{2}$/.test(rawId)) {
                projectId = rawId;
            }
            else if (/^\d{6}$/.test(rawId)) {
                projectId = `${categoryCode}${year}-${rawId.substring(4)}`;
            }
            else if (/^\d{6}-(ONG|COM|FIS)$/.test(rawId)) {
                projectId = `${categoryCode}${year}-${rawId.substring(4, 6)}`;
            }
            else {
                projectId = this.validateProjectId(rawId, year);
            }
        }

        const yearFromProjectId = this.inferProjectYearFromId(projectId);
        if (yearFromProjectId !== year) {
            throw new Error(`El ano ${year} no coincide con el ID del proyecto ${projectId}. Ambos deben representar el mismo ano.`);
        }
        await this.entityManager.query(`INSERT IGNORE INTO proyectos (id, organizacion_id, edicion_id) VALUES (?, ?, ?)`, [projectId, organizacionId, edicionId]);
        const inversionFgk = parseFloat(this.pickValue(normalizedRow, ['inversion_fgk', 'inversionfgk', 'inversionfg', 'inversin_fgk', 'inversinfgk', 'inversinfg', 'inversionfgkusd', 'inversinfgkusd', 'montofgk', 'monto_fgk'], 0));
        const contrapartida = parseFloat(this.pickValue(normalizedRow, ['contrapartida_org', 'contrapartida', 'contrapartidausd'], 0));
        const aliados = parseFloat(this.pickValue(normalizedRow, ['fondos_aliados', 'fondosaliados', 'fondosaliadosusd', 'montoaliados', 'monto_aliados'], 0));
        const beneficiarios = parseInt(this.pickValue(normalizedRow, ['beneficiarios_directos', 'beneficiariosdirectos', 'beneficiarios'], 0), 10);
        const beneficiariosIndirectos = parseInt(this.pickValue(normalizedRow, ['beneficiarios_indirectos', 'beneficiariosindirectos', 'beneficiarios_indirectos_'], 0), 10);
        const municipio = this.pickValue(normalizedRow, ['municipio'], null);
        const metaFinancial = this.parseLooseNumber(this.pickValue(normalizedRow, ['meta_financiera', 'meta financiera', 'meta_financiera_seguimiento', 'meta financiera seguimiento'], null));
        if (metaFinancial !== null && inversionFgk > 0 && metaFinancial > inversionFgk) {
            throw new Error(`La meta financiera (${metaFinancial}) no puede superar la Inversión FGK (${inversionFgk}) del proyecto ${projectName}.`);
        }
        const normalizeOptionalText = (value) => {
            const text = (value ?? '').toString().trim();
            return text ? text : null;
        };
        const allyName = normalizeOptionalText(this.pickValue(normalizedRow, ['nombre_aliado', 'nombrealiado', 'nombre_del_aliado', 'nombredelaliado', 'aliado', 'aliado_nombre'], null));
        if (!allyName) {
            throw new Error(`El proyecto ${projectName} no se pudo subir porque falta el campo obligatorio Nombre_Aliado.`);
        }
        const estadoInput = this.pickValue(normalizedRow, ['estado', 'status'], null);
        const estadoRaw = estadoInput ? this.normalizeProjectStatus(estadoInput) : null;
        const contact1Name = normalizeOptionalText(this.pickValue(normalizedRow, ['contacto_1_nombre', 'contacto1_nombre', 'contacto1nombre', 'contacto_1_persona', 'contacto1_persona', 'contacto1persona'], null));
        const contact1Role = normalizeOptionalText(this.pickValue(normalizedRow, ['contacto_1_cargo', 'contacto1_cargo', 'contacto1cargo', 'contacto_1_rol', 'contacto1rol'], null));
        const contact1DirectPhone = normalizeOptionalText(this.pickValue(normalizedRow, ['contacto_1_telefono_directo', 'contacto1_telefono_directo', 'contacto1telefonodirecto', 'contacto1_telefonodirecto', 'contacto1_telefono', 'contacto1telefono'], null));
        const contact1OrgPhone = normalizeOptionalText(this.pickValue(normalizedRow, ['contacto_1_telefono_organizacion', 'contacto1_telefono_organizacion', 'contacto1telefonoorganizacion', 'contacto1_telefonodeorganizacion', 'contacto1telefonodelorganizacion'], null));
        const contact1Email = normalizeOptionalText(this.pickValue(normalizedRow, ['contacto_1_correo', 'contacto1_correo', 'contacto1correo', 'contacto1_email', 'contacto1email'], null));
        const contact2Name = normalizeOptionalText(this.pickValue(normalizedRow, ['contacto_2_nombre', 'contacto2_nombre', 'contacto2nombre', 'contacto_2_persona', 'contacto2_persona', 'contacto2persona'], null));
        const contact2Role = normalizeOptionalText(this.pickValue(normalizedRow, ['contacto_2_cargo', 'contacto2_cargo', 'contacto2cargo', 'contacto_2_rol', 'contacto2rol'], null));
        const contact2DirectPhone = normalizeOptionalText(this.pickValue(normalizedRow, ['contacto_2_telefono_directo', 'contacto2_telefono_directo', 'contacto2telefonodirecto', 'contacto2_telefonodirecto', 'contacto2_telefono', 'contacto2telefono'], null));
        const contact2OrgPhone = normalizeOptionalText(this.pickValue(normalizedRow, ['contacto_2_telefono_organizacion', 'contacto2_telefono_organizacion', 'contacto2telefonoorganizacion', 'contacto2_telefonodeorganizacion', 'contacto2telefonodelorganizacion'], null));
        const contact2Email = normalizeOptionalText(this.pickValue(normalizedRow, ['contacto_2_correo', 'contacto2_correo', 'contacto2correo', 'contacto2_email', 'contacto2email'], null));
        await this.entityManager.query(`INSERT INTO proyectos (id, organizacion_id, edicion_id, nombre_proyecto, departamento, monto_fgk, contrapartida_org, nombre_aliado, monto_aliados, beneficiarios_directos, beneficiarios_indirectos, estado, progreso_tecnico, progreso_financiero, municipio, distrito, mes_inicio, mes_final, duracion_meses, meta_financiera, contacto_1_nombre, contacto_1_cargo, contacto_1_telefono_directo, contacto_1_telefono_organizacion, contacto_1_correo, contacto_2_nombre, contacto_2_cargo, contacto_2_telefono_directo, contacto_2_telefono_organizacion, contacto_2_correo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         organizacion_id = VALUES(organizacion_id),
         edicion_id = VALUES(edicion_id),
         nombre_proyecto = VALUES(nombre_proyecto),
         departamento = VALUES(departamento),
         monto_fgk = VALUES(monto_fgk),
         contrapartida_org = VALUES(contrapartida_org),
         nombre_aliado = VALUES(nombre_aliado),
         monto_aliados = VALUES(monto_aliados),
         beneficiarios_directos = VALUES(beneficiarios_directos),
         beneficiarios_indirectos = VALUES(beneficiarios_indirectos),
         estado = VALUES(estado),
         progreso_tecnico = VALUES(progreso_tecnico),
         progreso_financiero = VALUES(progreso_financiero),
         municipio = VALUES(municipio),
         distrito = VALUES(distrito),
         mes_inicio = VALUES(mes_inicio),
         mes_final = VALUES(mes_final),
         duracion_meses = VALUES(duracion_meses),
         meta_financiera = VALUES(meta_financiera),
         contacto_1_nombre = VALUES(contacto_1_nombre),
         contacto_1_cargo = VALUES(contacto_1_cargo),
         contacto_1_telefono_directo = VALUES(contacto_1_telefono_directo),
         contacto_1_telefono_organizacion = VALUES(contacto_1_telefono_organizacion),
         contacto_1_correo = VALUES(contacto_1_correo),
         contacto_2_nombre = VALUES(contacto_2_nombre),
         contacto_2_cargo = VALUES(contacto_2_cargo),
         contacto_2_telefono_directo = VALUES(contacto_2_telefono_directo),
         contacto_2_telefono_organizacion = VALUES(contacto_2_telefono_organizacion),
         contacto_2_correo = VALUES(contacto_2_correo)`, [
            projectId,
            organizacionId,
            edicionId,
            projectName,
            depto,
            inversionFgk,
            contrapartida,
            allyName,
            aliados,
            beneficiarios,
            beneficiariosIndirectos,
            estadoRaw,
            parseFloat(normalizedRow.progresotcnico || normalizedRow.progresotecnico || normalizedRow.progreso_tecnico || 0),
            parseFloat(normalizedRow.progresofinanciero || normalizedRow.progreso_financiero || 0),
            municipio,
            normalizedRow.distrito || null,
            timelineStartMonth,
            derivedTimelineEndMonth,
            timelineDurationMonths,
            metaFinancial,
            contact1Name,
            contact1Role,
            contact1DirectPhone,
            contact1OrgPhone,
            contact1Email,
            contact2Name,
            contact2Role,
            contact2DirectPhone,
            contact2OrgPhone,
            contact2Email,
        ]);

        if (aliados > 0) {
            await this.entityManager.query(`INSERT INTO aliados_contribuciones (id, proyecto_id, nombre_aliado, monto, \`a\u00f1o\`)
              VALUES (?, ?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE
                nombre_aliado = VALUES(nombre_aliado),
                monto = VALUES(monto),
                \`a\u00f1o\` = VALUES(\`a\u00f1o\`)`, [
                `ally-${projectId}`,
                projectId,
                allyName,
                aliados,
                year,
            ]);
        }
        return { projectId, category, projectName, year };
    }
    async processParticipantRow(row, indexMap, context = {}) {
        const normalizedRow = {};
        for (const key in row) {
            if (Object.prototype.hasOwnProperty.call(row, key)) {
                normalizedRow[this.normalizeColumnKey(key)] = row[key];
            }
        }
        const contextCategory = this.normalizeCategory(context.category || this.pickValue(normalizedRow, ['categoria', 'categora', 'category'], 'Community'));
        const contextYear = parseInt(this.pickValue(normalizedRow, ['o', 'ano', 'year', 'oedicin', 'anoedicion', 'edicin', 'edicion'], context.year || 2025), 10);
        const projectRef = this.pickValue(normalizedRow, ['id_proyecto_referencia', 'idproyectoreferencia', 'id_proyecto', 'idproyecto', 'proyecto_id', 'proyectoid']);
        const projectName = this.pickValue(normalizedRow, ['proyecto', 'organizacion', 'organizacin', 'nombre_proyecto', 'nombreproyecto', 'nombredelproyecto']);
        const projectLookup = context.projectLookup || new Map();
        const normalizedProjectName = (projectName ?? '').toString().trim().toLowerCase();
        let projectId = null;

        if (normalizedProjectName && projectLookup.has(normalizedProjectName)) {
            projectId = projectLookup.get(normalizedProjectName);
        }

        if (!projectId && projectRef) {
            const rawRef = projectRef.toString().trim();
            if (/^(ONG|DC|FIS)\d{4}-\d{2}$/.test(rawRef)) {
                projectId = rawRef;
            }
            else if (/^\d{6}$/.test(rawRef)) {
                projectId = `${this.getCategoryCode(contextCategory)}${rawRef.substring(0, 4)}-${rawRef.substring(4)}`;
            }
            else if (/^\d{6}-(ONG|COM|FIS)$/.test(rawRef)) {
                projectId = `${this.getCategoryCode(contextCategory)}${rawRef.substring(0, 4)}-${rawRef.substring(4, 6)}`;
            }
            else {
                projectId = rawRef;
            }
        }

        if (!projectId && projectName) {
            const proyectos = await this.entityManager.query(`SELECT p.id, o.categoria, p.nombre_proyecto
           FROM proyectos p
           JOIN organizaciones o ON p.organizacion_id = o.id
           WHERE LOWER(p.nombre_proyecto) = LOWER(?) AND o.categoria = ?`, [projectName.toString().trim(), contextCategory]);
            if (proyectos.length === 1) {
                projectId = proyectos[0].id;
            }
            else if (proyectos.length > 1) {
                const matchByYear = proyectos.find((p) => this.inferProjectYearFromId(p.id) === contextYear);
                projectId = (matchByYear || proyectos[0]).id;
            }
        }

        if (!projectId) {
            throw new Error(`No se pudo asociar el participante ${row.Nombre_Participante || row.nombre || row['Nombre Participante'] || 'desconocido'} a un proyecto.`);
        }

        const proyecto = await this.entityManager.query(`SELECT p.id, o.categoria 
       FROM proyectos p 
       JOIN organizaciones o ON p.organizacion_id = o.id 
       WHERE p.id = ?`, [projectId]);

        if (proyecto.length === 0) {
            throw new Error(`Proyecto no encontrado para el participante ${row.Nombre_Participante || row.nombre || row['Nombre Participante'] || 'desconocido'}`);
        }
        const dbCategory = proyecto[0].categoria;
        const normalizedDbCategory = this.normalizeCategory(dbCategory);
        const categoryCode = this.getCategoryCode(normalizedDbCategory);
        const allowedCategories = ['ONG', 'Community', 'FIS'];
        if (!allowedCategories.includes(normalizedDbCategory)) {
            throw new Error(`El proyecto de referencia '${projectId}' pertenece a una categor�a no reconocida: '${dbCategory}'.`);
        }
        let participantId = this.pickValue(normalizedRow, ['id_participante', 'idparticipante', 'id']);
        if (participantId) {
            const partStr = participantId.toString().trim();
            if (/^(ONG|DC|FIS)\d{4}-\d{2}-\d{2}$/.test(partStr) || /^\d{6}(?:-(ONG|COM|FIS))?-\d{2}$/.test(partStr)) {
                participantId = partStr;
            }
        }

        if (!participantId || participantId.toString().startsWith('part-')) {
            const existingIds = await this.entityManager.query(`SELECT id FROM participantes_formacion WHERE proyecto_id = ?`, [projectId]);
            let maxNum = 0;
            for (const existing of existingIds) {
                const idStr = existing.id;
                // Extraer el �ltimo número (ej. de 202501-ONG-01)
                const parts = idStr.split('-');
                const lastPart = parts[parts.length - 1];
                const num = parseInt(lastPart, 10);
                if (!isNaN(num) && num > maxNum) {
                    maxNum = num;
                }
            }
            let currentSessionCount = indexMap ? (indexMap.get(projectId) || 0) : 0;
            currentSessionCount++;
            if (indexMap) {
                indexMap.set(projectId, currentSessionCount);
            }
            const personNumber = maxNum + currentSessionCount;
            const formattedPersonNumber = personNumber.toString().padStart(2, '0');
            participantId = `${projectId}-${formattedPersonNumber}`;
        }
        else {
            participantId = this.validateParticipantId(participantId);
        }
        const storedParticipantId = participantId.toString().trim();
        const nombre = this.pickValue(normalizedRow, ['nombre_participante', 'nombreparticipante', 'nombre'], 'Sin Nombre');
        let edad = null;
        const edadRaw = this.pickValue(normalizedRow, ['edad', 'age']);
        if (edadRaw !== undefined && edadRaw !== null && edadRaw !== '' && edadRaw !== 'N/A') {
            const parsedEdad = parseInt(edadRaw, 10);
            if (!isNaN(parsedEdad))
                edad = parsedEdad;
        }
        const genderRaw = (row.Genero || row.genero || row.gender || 'M').toString().trim().toLowerCase();
        const genderRawNormalized = this.normalizeText(this.pickValue(normalizedRow, ['genero', 'gnero', 'gender'], genderRaw));
        const genero = (genderRawNormalized === 'mujer' || genderRawNormalized === 'f' || genderRawNormalized === 'femenino' || genderRawNormalized.startsWith('muj') || genderRawNormalized.startsWith('fem')) ? 'F' : 'M';
        const telefono = row.Telefono || row.telefono || row.Phone || row.phone || null;
        const email = this.pickValue(normalizedRow, ['email', 'correo'], null);
        const rol_cargo = this.pickValue(normalizedRow, ['rol_cargo', 'rolcargo', 'rol', 'role', 'cargo'], null);
        const statusRaw = (row.Estado_Formacion || row['Estado Formacion'] || row.estado_formacion || row.status || 'inscrito').toString().trim().toLowerCase();
        const statusRawNormalized = this.normalizeText(this.pickValue(normalizedRow, ['estado_formacion', 'estadoformacion', 'estadoformacin', 'status'], statusRaw));
        const estado_formacion = (statusRawNormalized.includes('graduad') || statusRawNormalized === 'graduado') ? 'graduado' :
            (statusRawNormalized.includes('formacion') || statusRawNormalized.includes('curso') || statusRawNormalized === 'en_formacion') ? 'en_formacion' : 'inscrito';
        const departamento = this.pickValue(normalizedRow, ['departamento', 'region'], 'San Salvador');
        const municipio = this.pickValue(normalizedRow, ['municipio'], null);
        await this.entityManager.query(`INSERT INTO participantes_formacion (id, proyecto_id, proyecto_nombre, categoria, ano, nombre, edad, genero, telefono, email, rol_cargo, estado_formacion, departamento, municipio, fecha_inscripcion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         proyecto_id = VALUES(proyecto_id),
         proyecto_nombre = VALUES(proyecto_nombre),
         categoria = VALUES(categoria),
         ano = VALUES(ano),
         nombre = VALUES(nombre),
         edad = VALUES(edad),
         genero = VALUES(genero),
         telefono = VALUES(telefono),
         email = VALUES(email),
         rol_cargo = VALUES(rol_cargo),
         estado_formacion = VALUES(estado_formacion),
         departamento = VALUES(departamento),
         municipio = VALUES(municipio)`, [
            storedParticipantId,
            projectId,
            projectName,
            normalizedDbCategory,
            contextYear,
            nombre,
            edad,
            genero,
            this.pickValue(normalizedRow, ['telefono', 'telfono', 'phone'], telefono),
            email,
            rol_cargo,
            estado_formacion,
            departamento,
            municipio,
        ]);
        return { participantId: storedParticipantId, category: normalizedDbCategory };
    }
    async processAllyRow(row, user = null, context = {}) {
        const rawId = row.ID_Proyecto_Referencia ? row.ID_Proyecto_Referencia.toString().trim() : null;
        let queryParams = [rawId, row.Proyecto];
        let queryStr = `SELECT id, nombre_proyecto FROM proyectos WHERE id = ? OR nombre_proyecto = ?`;
        const contextCategory = context.category ? this.normalizeCategory(context.category) : null;
        
        if (rawId && /^\d{6}$/.test(rawId)) {
             queryStr = `SELECT id, nombre_proyecto FROM proyectos WHERE id IN (?, ?, ?, ?) OR nombre_proyecto = ?`;
             queryParams = [rawId, `${rawId}-ONG`, `${rawId}-COM`, `${rawId}-FIS`, row.Proyecto];
        }
        if (contextCategory) {
            queryStr += ` AND EXISTS (SELECT 1 FROM organizaciones o WHERE o.id = proyectos.organizacion_id AND o.categoria = ?)`; // compatibilidad simple
            queryParams.push(contextCategory);
        }
        
        const proyectos = await this.entityManager.query(queryStr, queryParams);
        if (proyectos.length === 0) {
            throw new Error(`Proyecto no encontrado para aliado ${row.Nombre_Aliado || row.nombre_aliado}`);
        }
        
        // Si hay m�ltiples, priorizar el que coincida con el nombre exacto
        let selectedProject = proyectos[0];
        if (proyectos.length > 1 && row.Proyecto) {
            const match = proyectos.find(p => p.nombre_proyecto && p.nombre_proyecto.toLowerCase().trim() === row.Proyecto.toString().toLowerCase().trim());
            if (match) selectedProject = match;
        }
        await this.entityManager.query(`INSERT INTO aliados_contribuciones (id, proyecto_id, nombre_aliado, monto, \`a\u00f1o\`)
            VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         nombre_aliado = VALUES(nombre_aliado),
         monto = VALUES(monto),
          \`a\u00f1o\` = VALUES(\`a\u00f1o\`)`, [
            row.ID_Aliado || `al-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            selectedProject.id,
            row.Nombre_Aliado || row.nombre_aliado,
            row.Monto || row.monto || 0,
            row.Ano || row.year || 2025,
        ]);
    }
    async processProjectActivitiesSheet(rows, user = null, context = {}) {
        const groupedRows = new Map();
        const errors = [];
        let created = 0;
        let updated = 0;
        const projectContext = context.projectContext || {};
        const projectLookup = context.projectLookup instanceof Map ? context.projectLookup : new Map();
        const contextCategory = context.category ? this.normalizeCategory(context.category) : (projectContext.category ? this.normalizeCategory(projectContext.category) : null);
        const contextYear = parseInt(context.year || projectContext.year || 2025, 10) || 2025;
        const allowOverwriteManual = ['true', '1', 'yes', 'si', 's�'].includes((context?.overwriteExisting ?? '').toString().trim().toLowerCase());
        const contextProjectName = this.pickValue(projectContext, ['name', 'project', 'nombre', 'nombreproyecto'], '').toString().trim();
        const contextOrganization = this.pickValue(projectContext, ['organization', 'organizacion', 'organizaci�n'], '').toString().trim();
        const contextResolvedProject = await (async () => {
            if (!contextProjectName) {
                return null;
            }
            const params = [];
            let query = `SELECT p.id, p.nombre_proyecto
                         FROM proyectos p
                         INNER JOIN organizaciones o ON p.organizacion_id = o.id
                         WHERE LOWER(p.nombre_proyecto) = LOWER(?)`;
            params.push(contextProjectName);
            if (contextOrganization) {
                query += ` AND LOWER(o.nombre) = LOWER(?)`;
                params.push(contextOrganization);
            }
            if (contextCategory) {
                query += ` AND o.categoria = ?`;
                params.push(contextCategory);
            }
            if (contextYear) {
                query += ` AND EXISTS (SELECT 1 FROM ediciones e WHERE e.id = p.edicion_id AND e.año = ?)`;
                params.push(contextYear);
            }
            const projects = await this.entityManager.query(query, params);
            return projects.length > 0 ? projects[0] : null;
        })();
        const projectLookupFallback = (() => {
            if (projectLookup.size !== 1) {
                return null;
            }
            const [, projectId] = projectLookup.entries().next().value || [];
            return projectId ? { id: projectId, nombre_proyecto: null } : null;
        })();

        const resolveProject = async (row) => {
            const rawId = row.ID_Proyecto_Referencia || row.ID_Proyecto || row.Proyecto_ID || row.proyecto_id || row['ID Proyecto'];
            const rawProjectName = row.Proyecto || row['Proyecto'] || row.Nombre_Proyecto || row['Nombre del Proyecto'];
            let proyectos = [];

            if (rawId) {
                const normalizedId = rawId.toString().trim();
                const candidateIds = /^\d{6}$/.test(normalizedId)
                    ? [normalizedId, `${normalizedId}-ONG`, `${normalizedId}-DC`, `${normalizedId}-COM`, `${normalizedId}-FIS`]
                    : [normalizedId];
                const placeholders = candidateIds.map(() => '?').join(', ');
                const params = contextCategory
                    ? [contextCategory, ...candidateIds]
                    : [...candidateIds];
                const query = contextCategory
                    ? `SELECT p.id, p.nombre_proyecto FROM proyectos p INNER JOIN organizaciones o ON p.organizacion_id = o.id WHERE o.categoria = ? AND p.id IN (${placeholders})`
                    : `SELECT id, nombre_proyecto FROM proyectos WHERE id IN (${placeholders})`;
                proyectos = await this.entityManager.query(query, params);
            }

            if (proyectos.length === 0 && rawProjectName) {
                const params = contextCategory
                    ? [contextCategory, rawProjectName.toString().trim()]
                    : [rawProjectName.toString().trim()];
                const query = contextCategory
                    ? `SELECT p.id, p.nombre_proyecto FROM proyectos p INNER JOIN organizaciones o ON p.organizacion_id = o.id WHERE o.categoria = ? AND LOWER(p.nombre_proyecto) = LOWER(?)`
                    : `SELECT id, nombre_proyecto FROM proyectos WHERE LOWER(nombre_proyecto) = LOWER(?)`;
                proyectos = await this.entityManager.query(query, params);
            }

            if (proyectos.length === 0 && contextProjectName) {
                proyectos = contextResolvedProject ? [contextResolvedProject] : [];
            }

            if (proyectos.length === 0 && projectLookupFallback) {
                proyectos = [projectLookupFallback];
            }

            if (proyectos.length === 0) {
                return null;
            }
            if (proyectos.length === 1) {
                return proyectos[0];
            }
            if (rawProjectName) {
                const projectMatches = proyectos.filter((p) => p.nombre_proyecto && p.nombre_proyecto.toString().trim().toLowerCase() === rawProjectName.toString().trim().toLowerCase());
                if (projectMatches.length === 1) return projectMatches[0];
                if (projectMatches.length > 1) {
                    throw new Error(`El proyecto ${rawProjectName} est� duplicado para la carga de cronograma. Agregue categor�a, organizaci�n o edición para identificarlo correctamente.`);
                }
            }
            throw new Error(`El proyecto ${rawProjectName || rawId || 'seleccionado'} no es �nico para la carga de cronograma. Agregue categor�a, organizaci�n o edición para identificarlo correctamente.`);
        };

        for (const row of rows || []) {
            try {
                const project = await resolveProject(row);
                if (!project) {
                    errors.push({ row, error: 'Proyecto no encontrado para cronograma de actividades' });
                    continue;
                }

                const activityName = (row.Actividad || row['Actividad'] || row.Nombre_Actividad || row['Nombre Actividad'] || row.Tarea || row.Descripcion || row.Descripcion || '').toString().trim();
                if (!activityName) {
                    errors.push({ row, error: 'La actividad no puede estar vac�a' });
                    continue;
                }

                const rawStatusCell = row.Estado || row.estado || row['Estado Actividad'] || row.Status || null;
                const status = this.normalizeActivityStatus(rawStatusCell);
                if (rawStatusCell !== null && rawStatusCell !== undefined && rawStatusCell !== '' && !status) {
                    errors.push({ row, error: 'El estado de la actividad solo puede ser Pendiente, En Proceso o Finalizado' });
                    continue;
                }
                const note = (row.Nota || row.notas || row.Observaciones || row.observaciones || row.Comentario || '').toString().trim();

                if (!groupedRows.has(project.id)) {
                    groupedRows.set(project.id, []);
                }
                groupedRows.get(project.id).push({
                    name: activityName,
                    monthRaw: row['Mes del proyecto'] || row.Mes || row.mes || row.Mes_Proyecto || row['Mes Proyecto'],
                    status: status || null,
                    note,
                });
            }
            catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
                errors.push({ row, error: errorMessage });
            }
        }

        for (const [projectId, activities] of groupedRows.entries()) {
            const projectMeta = await this.entityManager.query(
                `SELECT nombre_proyecto as projectName, mes_inicio as startMonth, mes_final as endMonth FROM proyectos WHERE id = ?`,
                [projectId]
            );
            const timeline = this.validateProjectTimeline(projectMeta, projectMeta[0]?.projectName || projectId);
            let index = 0;
            for (const activity of activities) {
                index++;
                const activityMonth = this.resolveTrackingMonth(activity.monthRaw, timeline.startMonth);
                if (!activityMonth || !timeline.sequence.includes(activityMonth)) {
                    errors.push({
                        row: { proyecto_id: projectId, projectName: projectMeta[0]?.projectName || projectId, actividad: activity.name, mes: activity.monthRaw },
                        error: `El mes indicado para la actividad "${activity.name}" no pertenece al período definido del proyecto.`,
                    });
                    continue;
                }
                const existingActivity = await this.entityManager.query(
                    `SELECT id, estado as status, source, manual_locked FROM proyecto_actividades WHERE proyecto_id = ? AND mes = ? AND LOWER(nombre) = LOWER(?) LIMIT 1`,
                    [projectId, activityMonth, activity.name]
                );
                if (existingActivity.length > 0 && Number(existingActivity[0].manual_locked) === 1 && (existingActivity[0].source || '').toString().toLowerCase() === 'manual') {
                    errors.push({
                        row: { proyecto_id: projectId, projectName: projectMeta[0]?.projectName || projectId, actividad: activity.name, mes: activityMonth },
                        error: `La actividad "${activity.name}" ya fue editada manualmente y no se sobrescribi� desde Excel.`,
                    });
                    continue;
                }
                const finalStatus = activity.status
                    || this.normalizeActivityStatus(existingActivity[0]?.status)
                    || existingActivity[0]?.status
                    || 'pending';
                await this.upsertProjectActivity(projectId, { ...activity, month: activityMonth, status: finalStatus }, {
                    source: 'excel',
                    allowOverwriteManual,
                    activityId: existingActivity[0]?.id || `act-${projectId}-${String(activityMonth).padStart(2, '0')}-${String(index).padStart(2, '0')}`
                });
                if (existingActivity.length > 0) {
                    updated++;
                } else {
                    created++;
                }
            }
            await this.recalculateProjectProgress(projectId);
        }

        return { created, updated, errors };
    }
    async processSimplifiedMonthlyTrackingSheet(sheet, user = null, context = {}) {
        const oa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });
        const groupedRows = new Map();
        const errors = [];
        let created = 0;
        let updated = 0;
        const projectContext = context.projectContext || {};
        const contextCategory = context.category ? this.normalizeCategory(context.category) : (projectContext.category ? this.normalizeCategory(projectContext.category) : null);
        const contextYear = parseInt(context.year || projectContext.year || 2025, 10) || 2025;
        const allowOverwriteManual = ['true', '1', 'yes', 'si', 's�'].includes((context?.overwriteExisting ?? '').toString().trim().toLowerCase());
        const contextOrganization = this.pickValue(projectContext, ['organization', 'organizacion', 'organizaci�n'], '').toString().trim();
        const contextProjectName = this.pickValue(projectContext, ['name', 'project', 'nombre', 'nombreproyecto'], '').toString().trim();
        let currentProject = {
            name: contextProjectName || '',
            organization: contextOrganization || '',
            year: contextYear,
            metaFinancial: null,
            monthStatus: null as string | null,
        };
        let activityHeadersDetected = false;
        const addActivity = async (projectInfo, activityRow) => {
            const activityName = (activityRow[0] ?? '').toString().trim();
            const monthRaw = activityRow[1];
            if (!activityName || /^(actividad|mes del proyecto|estado)$/i.test(activityName)) {
                return;
            }
            const resolvedProject = await this.resolveProjectByTrackingInfo(projectInfo.name, {
                organization: projectInfo.organization || contextOrganization || undefined,
                category: contextCategory || undefined,
                year: projectInfo.year || contextYear,
            });
            if (!resolvedProject) {
                throw new Error(`Proyecto no encontrado para cronograma de actividades: ${projectInfo.name}`);
            }
            if (!groupedRows.has(resolvedProject.id)) {
                groupedRows.set(resolvedProject.id, []);
            }
            groupedRows.get(resolvedProject.id).push({
                name: activityName,
                monthRaw,
                status: this.normalizeActivityStatus(projectInfo.monthStatus) || this.normalizeActivityStatus(activityRow[2]) || 'pending',
                note: '',
            });
            if (projectInfo.metaFinancial !== null && projectInfo.metaFinancial !== undefined) {
                const parsedMeta = this.parseLooseNumber(projectInfo.metaFinancial) || 0;
                await this.entityManager.query(`UPDATE proyectos SET meta_financiera = ? WHERE id = ?`, [
                    parsedMeta,
                    resolvedProject.id,
                ]).catch(() => void 0);
            }
        };

        for (let i = 0; i < oa.length; i++) {
            const row = Array.isArray(oa[i]) ? oa[i] : [];
            if (row.every((cell) => cell === null || cell === undefined || cell === '')) {
                continue;
            }
            const normalized = row.map((cell) => this.normalizeColumnKey(cell));
            const firstCell = this.normalizeColumnKey(row[0]);

            const looksLikeProjectLabel = (
                firstCell.includes('nombredelproyecto') ||
                firstCell === 'nombreproyecto' ||
                firstCell === 'proyecto'
            ) && row[1] !== undefined && row[1] !== null && row[1] !== '';
            const looksLikeMetaLabel = firstCell.includes('metafinanciera');
            const looksLikeMonthStatusLabel = ['estado', 'estadodelmes', 'estadogeneral', 'estadocronograma'].includes(firstCell) && row[1] !== undefined && row[1] !== null && row[1] !== '';
            const looksLikeYearLabel = ['ano', 'ano', 'year', 'edicion', 'edicin'].includes(firstCell);
            const looksLikeOrgLabel = ['organizacion', 'organizaci�n', 'aliado', 'coordinador'].includes(firstCell);
            const looksLikeActivityHeader = normalized.some((cell) => cell.includes('actividad')) && normalized.some((cell) => cell.includes('mesdelproyecto'));

            if (looksLikeProjectLabel) {
                currentProject = {
                    ...currentProject,
                    name: row[1].toString().trim(),
                };
                activityHeadersDetected = false;
                continue;
            }
            if (looksLikeMetaLabel) {
                currentProject = {
                    ...currentProject,
                    metaFinancial: row[1],
                };
                continue;
            }
            if (looksLikeMonthStatusLabel) {
                currentProject = {
                    ...currentProject,
                    monthStatus: this.normalizeMonthlyStatus(row[1]) || currentProject.monthStatus,
                };
                continue;
            }
            if (looksLikeYearLabel && row[1] !== undefined && row[1] !== null && row[1] !== '') {
                const parsedYear = parseInt(row[1].toString(), 10);
                if (!Number.isNaN(parsedYear)) {
                    currentProject = {
                        ...currentProject,
                        year: parsedYear,
                    };
                }
                continue;
            }
            if (looksLikeOrgLabel && row[1] !== undefined && row[1] !== null && row[1] !== '') {
                currentProject = {
                    ...currentProject,
                    organization: row[1].toString().trim(),
                };
                continue;
            }
            if (looksLikeActivityHeader) {
                activityHeadersDetected = true;
                continue;
            }
            if (activityHeadersDetected) {
                try {
                    await addActivity(currentProject, row);
                }
                catch (err) {
                    const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
                    errors.push({ row, error: errorMessage });
                }
            }
        }

        for (const [projectId, activities] of groupedRows.entries()) {
            const projectMeta = await this.entityManager.query(
                `SELECT p.nombre_proyecto as projectName, p.mes_inicio as startMonth, p.mes_final as endMonth, e.año as projectYear, p.monto_fgk as amountFGK, p.meta_financiera as metaFinancial FROM proyectos p LEFT JOIN ediciones e ON p.edicion_id = e.id WHERE p.id = ?`,
                [projectId]
            );
            const timeline = this.validateProjectTimeline(projectMeta, projectMeta[0]?.projectName || projectId);
            let index = 0;
            const summaryStatuses: Array<'pending' | 'active' | 'completed'> = [];
            let lastResolvedSlot = null;
            for (const activity of activities) {
                index++;
                const resolvedSlot = this.resolveTimelineSlot(activity.monthRaw, timeline, lastResolvedSlot?.index ?? -1);
                const activityMonth = resolvedSlot?.month || this.resolveTrackingMonth(activity.monthRaw, timeline.startMonth);
                if (!activityMonth || !timeline.sequence.includes(activityMonth)) {
                    errors.push({
                        row: { proyecto_id: projectId, actividad: activity.name, mes: activity.monthRaw },
                        error: `El mes indicado para la actividad "${activity.name}" no pertenece al período definido del proyecto.`,
                    });
                    continue;
                }
                if (resolvedSlot) {
                    lastResolvedSlot = resolvedSlot;
                }
                const existingActivity = await this.entityManager.query(
                    `SELECT id, estado as status, source, manual_locked FROM proyecto_actividades WHERE proyecto_id = ? AND mes = ? AND LOWER(nombre) = LOWER(?) LIMIT 1`,
                    [projectId, activityMonth, activity.name]
                );
                if (existingActivity.length > 0 && Number(existingActivity[0].manual_locked) === 1 && (existingActivity[0].source || '').toString().toLowerCase() === 'manual') {
                    errors.push({
                        row: { proyecto_id: projectId, actividad: activity.name, mes: activityMonth },
                        error: `La actividad "${activity.name}" ya fue editada manualmente y no se sobrescribi� desde Excel.`,
                    });
                    continue;
                }
                const finalStatus = activity.status || this.normalizeActivityStatus(existingActivity[0]?.status) || existingActivity[0]?.status || currentProject.monthStatus || 'pending';
                summaryStatuses.push(finalStatus);
                await this.upsertProjectActivity(projectId, { ...activity, month: activityMonth, status: finalStatus, note: activity.note || null }, {
                    source: 'excel',
                    allowOverwriteManual,
                    activityId: existingActivity[0]?.id || `act-${projectId}-${String(activityMonth).padStart(2, '0')}-${String(index).padStart(2, '0')}`
                });
                if (existingActivity.length > 0) {
                    updated++;
                } else {
                    created++;
                }
            }
            const technicalPercent = (() => {
                const normalized = this.normalizeText(currentProject.monthStatus);
                if (normalized) {
                    if (normalized.includes('finaliz') || normalized.includes('complet')) return 100;
                    if (normalized.includes('ejec') || normalized.includes('proces') || normalized.includes('activ') || normalized.includes('avance')) return 50;
                    if (normalized.includes('pend')) return 0;
                }
                if (summaryStatuses.length > 0) {
                    const completedCount = summaryStatuses.filter((status) => status === 'completed').length;
                    const activeCount = summaryStatuses.filter((status) => status === 'active').length;
                    return Math.min(100, Number((((completedCount + (activeCount * 0.5)) / Math.max(1, summaryStatuses.length)) * 100).toFixed(2)));
                }
                return 0;
            })();
            const projectBaseInvestment = this.parseLooseNumber(projectMeta[0]?.amountFGK || 0) || 0;
            const metaFinancialRaw = this.parseLooseNumber(projectMeta[0]?.metaFinancial);
            const metaFinancial = metaFinancialRaw === null ? 0 : metaFinancialRaw;
            if (projectBaseInvestment > 0 && metaFinancial > projectBaseInvestment) {
                errors.push({
                    row: { proyecto_id: projectId },
                    error: `La meta financiera del proyecto supera la Inversión FGK permitida.`,
                });
                continue;
            }
            const financialPercent = projectBaseInvestment > 0
                ? Math.min(100, Number(((metaFinancial / projectBaseInvestment) * 100).toFixed(2)))
                : 0;
            const summaryMonth = lastResolvedSlot?.month || timeline.startMonth;
            const summaryYear = lastResolvedSlot?.year || (projectMeta[0]?.projectYear || contextYear);
            const summaryId = `rep-${projectId}-${summaryYear}-${String(summaryMonth).padStart(2, '0')}`;
            try {
                await this.entityManager.query(
                    `INSERT INTO reportes_mensuales (id, proyecto_id, mes, anio, año, avance_tecnico_real, avance_financiero_real, meta_financiera, estado_cronograma, observaciones, fotos, creado_por, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                     ON DUPLICATE KEY UPDATE
                       año = VALUES(año),
                       avance_tecnico_real = VALUES(avance_tecnico_real),
                       avance_financiero_real = VALUES(avance_financiero_real),
                       meta_financiera = VALUES(meta_financiera),
                       estado_cronograma = VALUES(estado_cronograma),
                       observaciones = VALUES(observaciones),
                       fotos = VALUES(fotos)`,
                    [
                        summaryId,
                         projectId,
                         summaryMonth,
                         summaryYear,
                         summaryYear,
                         technicalPercent,
                        financialPercent,
                        metaFinancial,
                        summaryStatuses.length === 0
                            ? 'Pendiente'
                            : (summaryStatuses.every((status) => status === 'completed') ? 'Finalizado' : (summaryStatuses.some((status) => status === 'active') ? 'En Ejecución' : 'Pendiente')),
                        `Seguimiento mensual cargado desde Excel (${activities.length} actividades)`,
                        '[]',
                        user?.email || 'Importador Excel'
                    ]
                );
            }
            catch (err) {
                throw new Error(this.formatMonthlyTrackingUploadError(err, projectMeta[0]?.projectName || projectId));
            }
            await this.recalculateProjectProgress(projectId);
        }

        return { created, updated, errors };
    }
    async processSimplifiedMonthlyTrackingBlocks(sheet, user = null, context = {}) {
        const oa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });
        const errors = [];
        let created = 0;
        let updated = 0;
        const projectContext = context.projectContext || {};
        const contextCategory = context.category ? this.normalizeCategory(context.category) : (projectContext.category ? this.normalizeCategory(projectContext.category) : null);
        const contextYear = parseInt(context.year || projectContext.year || 2025, 10) || 2025;
        const allowOverwriteManual = ['true', '1', 'yes', 'si', 's�'].includes((context?.overwriteExisting ?? '').toString().trim().toLowerCase());
        const contextOrganization = this.pickValue(projectContext, ['organization', 'organizacion', 'organizaci�n'], '').toString().trim();
        const candidateProjects = await this.entityManager.query(
            `SELECT p.id, p.nombre_proyecto, o.nombre as organizacion_nombre, o.categoria as categoria_nombre, e.año as project_year
             FROM proyectos p
             INNER JOIN organizaciones o ON p.organizacion_id = o.id
             LEFT JOIN ediciones e ON p.edicion_id = e.id
             WHERE (? IS NULL OR o.categoria = ?)
               AND (? IS NULL OR e.año = ?)` ,
            [contextCategory, contextCategory, contextYear, contextYear]
        ).catch(() => []);
        const candidateByName = new Map<string, any[]>();
        const normalizedName = (value: any) => (value ?? '').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        for (const project of candidateProjects || []) {
            const key = normalizedName(project.nombre_proyecto);
            const list = candidateByName.get(key) || [];
            list.push(project);
            candidateByName.set(key, list);
        }
        const blocks: Array<{
            name: string;
            organization: string;
            year: number;
            metaFinancial: any;
            monthStatus?: string | null;
            activities: Array<{ name: string; monthRaw: any; status?: 'pending' | 'active' | 'completed' | null }>;
        }> = [];

        let currentBlock: {
            name: string;
            organization: string;
            year: number;
            metaFinancial: any;
            monthStatus?: string | null;
            activities: Array<{ name: string; monthRaw: any; status?: 'pending' | 'active' | 'completed' | null }>;
        } | null = null;

        const flushBlock = () => {
            if (!currentBlock) return;
            if (currentBlock.name || currentBlock.activities.length > 0 || currentBlock.metaFinancial !== null) {
                blocks.push(currentBlock);
            }
            currentBlock = null;
        };

        for (const rawRow of oa) {
            const row = Array.isArray(rawRow) ? rawRow : [];
            if (row.every((cell) => cell === null || cell === undefined || cell === '')) {
                continue;
            }
            const normalized = row.map((cell) => this.normalizeColumnKey(cell));
            const firstCell = this.normalizeColumnKey(row[0]);
            const secondCell = (row[1] ?? '').toString().trim();
            const isTableHeaderRow = firstCell === 'nombredelproyecto'
                && normalized.some((cell) => cell.includes('mesdelproyecto'))
                && normalized.some((cell) => cell.includes('estadodelmes') || cell.includes('estadodelmes') || cell.includes('actividad'));
            const isFieldHeaderRow = ['nombredelproyecto', 'mesdelproyecto', 'estadodelmes', 'actividad', 'metafinanciera', 'observacionbreve']
                .includes(firstCell);

            if (isTableHeaderRow || isFieldHeaderRow) {
                continue;
            }

            const isProjectLabel = (firstCell.includes('nombredelproyecto') || firstCell === 'nombreproyecto' || firstCell === 'proyecto') && !!secondCell;
            const isMetaLabel = firstCell.includes('metafinanciera');
            const isMonthStatusLabel = ['estado', 'estadodelmes', 'estadogeneral', 'estadocronograma'].includes(firstCell) && !!secondCell;
            const isOrgLabel = ['organizacion', 'organizaci�n', 'aliado', 'coordinador'].includes(firstCell);
            const isActivityHeader = normalized.some((cell) => cell.includes('actividad')) && normalized.some((cell) => cell.includes('mesdelproyecto'));

            if (isProjectLabel) {
                flushBlock();
                currentBlock = {
                    name: secondCell,
                    organization: contextOrganization,
                    year: contextYear,
                    metaFinancial: null,
                    monthStatus: null,
                    activities: [],
                };
                continue;
            }

            if (!currentBlock) {
                continue;
            }

            if (isMetaLabel) {
                currentBlock.metaFinancial = row[1];
                continue;
            }
            if (isMonthStatusLabel) {
                currentBlock.monthStatus = this.normalizeMonthlyStatus(secondCell) || currentBlock.monthStatus;
                continue;
            }
            if (isOrgLabel && secondCell) {
                currentBlock.organization = secondCell;
                continue;
            }
            if (['ano', 'ano', 'year', 'edicion', 'edicin'].includes(firstCell) && secondCell) {
                const parsedYear = parseInt(secondCell, 10);
                if (!Number.isNaN(parsedYear)) {
                    currentBlock.year = parsedYear;
                }
                continue;
            }
            if (isActivityHeader) {
                continue;
            }

            const activityName = (row[0] ?? '').toString().trim();
            if (!activityName || /^(actividad|mes del proyecto|estado)$/i.test(activityName)) {
                continue;
            }
            const rawStatusCell = row[2] ?? null;
            const normalizedStatus = this.normalizeActivityStatus(rawStatusCell);
            if (rawStatusCell !== null && rawStatusCell !== undefined && rawStatusCell !== '' && !normalizedStatus) {
                errors.push({
                    row,
                    error: `El estado de la actividad "${activityName}" solo puede ser Pendiente, En Proceso o Finalizado.`,
                });
                continue;
            }
            currentBlock.activities.push({
                name: activityName,
                monthRaw: row[1],
                status: normalizedStatus || this.normalizeActivityStatus(currentBlock.monthStatus) || null,
            });
        }
        flushBlock();

        for (const block of blocks) {
            try {
                const blockNameKey = normalizedName(block.name);
                const projectCandidates = candidateByName.get(blockNameKey) || [];
                const resolvedProject = (() => {
                    if (projectCandidates.length === 0) return null;
                    if (projectCandidates.length === 1) return projectCandidates[0];
                    const orgMatch = block.organization
                        ? projectCandidates.find((project) => normalizedName(project.organizacion_nombre) === normalizedName(block.organization))
                        : null;
                    if (orgMatch) return orgMatch;
                    const yearMatches = projectCandidates.filter((project) => parseInt(project.project_year, 10) === (block.year || contextYear));
                    if (yearMatches.length === 1) return yearMatches[0];
                    if (yearMatches.length > 1) {
                        throw new Error(`El proyecto ${block.name} aparece repetido en la edición ${block.year || contextYear}. Debe identificarse con organizaci�n o categor�a para cargar seguimiento.`);
                    }
                    throw new Error(`El proyecto ${block.name} no es �nico para la carga de seguimiento. Agregue organizaci�n, categor�a o edición para identificarlo correctamente.`);
                })();
                if (!resolvedProject) {
                    errors.push({ row: { project: block.name }, error: `Proyecto no encontrado para cronograma de actividades: ${block.name}` });
                    continue;
                }

                const projectMeta = await this.entityManager.query(
                    `SELECT p.nombre_proyecto as projectName, p.mes_inicio as startMonth, p.mes_final as endMonth, e.año as projectYear, p.monto_fgk as amountFGK, p.meta_financiera as metaFinancial FROM proyectos p LEFT JOIN ediciones e ON p.edicion_id = e.id WHERE p.id = ?`,
                    [resolvedProject.id]
                );
                const timeline = this.validateProjectTimeline(projectMeta, projectMeta[0]?.projectName || resolvedProject.id);
                const summaryStatuses: Array<'pending' | 'active' | 'completed'> = [];
                let index = 0;
                let lastResolvedSlot = null;
                for (const activity of block.activities) {
                    index++;
                    const resolvedSlot = this.resolveTimelineSlot(activity.monthRaw, timeline, lastResolvedSlot?.index ?? -1);
                    const activityMonth = resolvedSlot?.month || this.resolveTrackingMonth(activity.monthRaw, timeline.startMonth);
                    if (!activityMonth || !timeline.sequence.includes(activityMonth)) {
                    errors.push({
                        row: { proyecto_id: resolvedProject.id, projectName: projectMeta[0]?.projectName || resolvedProject.id, actividad: activity.name, mes: activity.monthRaw },
                        error: `El mes indicado para la actividad "${activity.name}" no pertenece al período definido del proyecto.`,
                    });
                        continue;
                    }
                    if (resolvedSlot) {
                        lastResolvedSlot = resolvedSlot;
                    }
                const existingActivity = await this.entityManager.query(
                    `SELECT id, estado as status, source, manual_locked FROM proyecto_actividades WHERE proyecto_id = ? AND mes = ? AND LOWER(nombre) = LOWER(?) LIMIT 1`,
                    [resolvedProject.id, activityMonth, activity.name]
                );
                    if (existingActivity.length > 0 && Number(existingActivity[0].manual_locked) === 1 && (existingActivity[0].source || '').toString().toLowerCase() === 'manual') {
                    errors.push({
                        row: { proyecto_id: resolvedProject.id, projectName: projectMeta[0]?.projectName || resolvedProject.id, actividad: activity.name, mes: activityMonth },
                        error: `La actividad "${activity.name}" ya fue editada manualmente y no se sobrescribi� desde Excel.`,
                    });
                        continue;
                    }
                    const finalStatus = activity.status
                        || this.normalizeActivityStatus(existingActivity[0]?.status)
                        || existingActivity[0]?.status
                        || this.normalizeActivityStatus(block.monthStatus)
                        || 'pending';
                    summaryStatuses.push(finalStatus);
                    await this.upsertProjectActivity(resolvedProject.id, { ...activity, month: activityMonth, status: finalStatus, note: null }, {
                        source: 'excel',
                        allowOverwriteManual,
                        activityId: existingActivity[0]?.id || `act-${resolvedProject.id}-${String(activityMonth).padStart(2, '0')}-${String(index).padStart(2, '0')}`
                    });
                    if (existingActivity.length > 0) {
                        updated++;
                    } else {
                        created++;
                    }
                }

                const monthStatusPercent = (() => {
                    const normalized = this.normalizeText(block.monthStatus);
                    if (!normalized) return null;
                    if (normalized.includes('finaliz') || normalized.includes('complet')) return 100;
                    if (normalized.includes('ejec') || normalized.includes('proces') || normalized.includes('activ') || normalized.includes('avance')) return 50;
                    if (normalized.includes('pend')) return 0;
                    return null;
                })();
                const technicalPercent = summaryStatuses.length > 0
                    ? Math.min(100, Number((((summaryStatuses.filter((status) => status === 'completed').length + (summaryStatuses.filter((status) => status === 'active').length * 0.5)) / Math.max(1, summaryStatuses.length)) * 100).toFixed(2)))
                    : (monthStatusPercent ?? 0);
                const baseInvestment = this.parseLooseNumber(projectMeta[0]?.amountFGK || 0) || 0;
                const rawMetaFinancialCell = block.metaFinancial;
                const metaFinancialRaw = this.parseLooseNumber(block.metaFinancial);
                if (rawMetaFinancialCell !== null && rawMetaFinancialCell !== undefined && rawMetaFinancialCell !== '' && metaFinancialRaw === null) {
                    errors.push({
                        row: { proyecto_id: resolvedProject.id, proyecto: block.name },
                        error: `La meta financiera del proyecto ${block.name} no es un valor num�rico v�lido.`,
                    });
                    continue;
                }
                const metaFinancial = metaFinancialRaw === null ? 0 : metaFinancialRaw;
                if (baseInvestment > 0 && metaFinancial > baseInvestment) {
                    errors.push({
                        row: { proyecto_id: resolvedProject.id, proyecto: block.name },
                        error: `La meta financiera del proyecto ${block.name} supera la Inversión FGK permitida.`,
                    });
                    continue;
                }
                const financialPercent = baseInvestment > 0
                    ? Math.min(100, Number(((metaFinancial / baseInvestment) * 100).toFixed(2)))
                    : 0;
                const summaryMonth = lastResolvedSlot?.month || timeline.startMonth;
                const summaryYear = lastResolvedSlot?.year || (block.year || contextYear);
                const summaryId = `rep-${resolvedProject.id}-${summaryYear}-${String(summaryMonth).padStart(2, '0')}`;
                const scheduleStatus = block.monthStatus
                    ? block.monthStatus
                    : (summaryStatuses.length === 0
                        ? 'Pendiente'
                        : summaryStatuses.every((status) => status === 'completed')
                            ? 'Finalizado'
                            : summaryStatuses.some((status) => status === 'active')
                                ? 'En Ejecución'
                                : 'Pendiente');

                try {
                    await this.entityManager.query(
                `INSERT INTO reportes_mensuales (id, proyecto_id, mes, anio, año, avance_tecnico_real, avance_financiero_real, meta_financiera, estado_cronograma, observaciones, fotos, creado_por, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                 ON DUPLICATE KEY UPDATE
                   año = VALUES(año),
                   avance_tecnico_real = VALUES(avance_tecnico_real),
                   avance_financiero_real = VALUES(avance_financiero_real),
                           meta_financiera = VALUES(meta_financiera),
                           estado_cronograma = VALUES(estado_cronograma),
                           observaciones = VALUES(observaciones),
                           fotos = VALUES(fotos)`,
                        [
                            summaryId,
                             resolvedProject.id,
                             summaryMonth,
                             summaryYear,
                             summaryYear,
                             technicalPercent,
                            financialPercent,
                            metaFinancial,
                            scheduleStatus,
                            `Seguimiento mensual cargado desde Excel (${block.activities.length} actividades)`,
                            '[]',
                            user?.email || 'Importador Excel'
                        ]
                    );
                }
                catch (err) {
                    throw new Error(this.formatMonthlyTrackingUploadError(err, projectMeta[0]?.projectName || resolvedProject.id));
                }
                await this.entityManager.query(`UPDATE proyectos SET meta_financiera = ? WHERE id = ?`, [metaFinancial, resolvedProject.id]).catch(() => void 0);
                await this.recalculateProjectProgress(resolvedProject.id);
            }
            catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
                errors.push({ row: { project: block.name }, error: errorMessage });
                continue;
            }
        }

        return { created, updated, errors };
    }
    async processMonthlyReportRow(row, user = null, context = {}) {
        const projectContext = context.projectContext || {};
        const projectLookup = context.projectLookup instanceof Map ? context.projectLookup : new Map();
        const rowIndex = Number(context.rowIndex || 0) || null;
        const contextCategory = context.category ? this.normalizeCategory(context.category) : (projectContext.category ? this.normalizeCategory(projectContext.category) : null);
        const rawId = this.pickValue(row, ['ID_Proyecto_Referencia', 'ID_Proyecto', 'Proyecto_ID', 'proyecto_id', 'ID Proyecto'], null);
        const rawProjectName = this.pickValue(row, ['Proyecto', 'Nombre_Proyecto', 'Nombre del Proyecto', 'nombre_proyecto'], projectContext.name || '').toString().trim();
        const normalizedProjectName = this.normalizeText(rawProjectName);
        const headerLabels = new Set(['proyecto', 'nombre del proyecto', 'nombreproyecto', 'mes del proyecto', 'estado del mes', 'estado cronograma', 'meta financiera', 'observacion breve', 'observaciones', 'actividad']);
        const projectName = headerLabels.has(normalizedProjectName) ? '' : rawProjectName;
        const organizationName = this.pickValue(row, ['Organizacion', 'Organizaci�n', 'Organizaci�n del Proyecto', 'Nombre_Organizacion', 'Organizacion del Proyecto'], projectContext.organization || '').toString().trim();
        const reportYear = parseInt(this.pickValue(row, ['year', 'ano', 'ano', 'anio', 'Ano', 'A�o'], context.year || projectContext.year || 2025), 10) || parseInt(projectContext.year, 10) || 2025;
        const reportMonthRaw = this.pickValue(row, ['Mes del proyecto', 'Mes del seguimiento', 'Mes_Proyecto', 'Mes Proyecto', 'Mes', 'mes', 'month'], null);
        const reportMonthCalendar = this.pickValue(row, ['Mes calendario', 'Mes Calendario', 'Mes_calendario'], null);
        const projectContextName = this.pickValue(projectContext, ['name', 'project', 'nombre', 'nombreproyecto'], '').toString().trim();
        const projectContextOrganization = this.pickValue(projectContext, ['organization', 'organizacion', 'organizaci�n'], '').toString().trim();
        const projectContextResolved = await (async () => {
            if (!projectContextName) {
                return null;
            }
            const params = [];
            let query = `SELECT p.id, p.nombre_proyecto, o.nombre as organizacion_nombre, o.categoria as categoria_nombre
                         FROM proyectos p
                         INNER JOIN organizaciones o ON p.organizacion_id = o.id
                         WHERE LOWER(p.nombre_proyecto) = LOWER(?)`;
            params.push(projectContextName);
            if (projectContextOrganization) {
                query += ` AND LOWER(o.nombre) = LOWER(?)`;
                params.push(projectContextOrganization);
            }
            if (contextCategory) {
                query += ` AND o.categoria = ?`;
                params.push(contextCategory);
            }
            if (reportYear) {
                query += ` AND EXISTS (SELECT 1 FROM ediciones e WHERE e.id = p.edicion_id AND e.año = ?)`;
                params.push(reportYear);
            }
            const projects = await this.entityManager.query(query, params);
            return projects.length > 0 ? projects[0] : null;
        })();
        const projectLookupFallback = (() => {
            if (projectLookup.size !== 1) {
                return null;
            }
            const [, projectId] = projectLookup.entries().next().value || [];
            return projectId ? { id: projectId, nombre_proyecto: null } : null;
        })();
        let proyectos = [];

        if (rawId) {
            const normalizedId = rawId.toString().trim();
            const candidateIds = /^\d{6}$/.test(normalizedId)
                ? [normalizedId, `${normalizedId}-ONG`, `${normalizedId}-DC`, `${normalizedId}-COM`, `${normalizedId}-FIS`]
                : [normalizedId];
            const placeholders = candidateIds.map(() => '?').join(', ');
            const params = contextCategory
                ? [contextCategory, ...candidateIds]
                : [...candidateIds];
            const query = contextCategory
                ? `SELECT p.id, p.nombre_proyecto FROM proyectos p INNER JOIN organizaciones o ON p.organizacion_id = o.id WHERE o.categoria = ? AND p.id IN (${placeholders})`
                : `SELECT id, nombre_proyecto FROM proyectos WHERE id IN (${placeholders})`;
            proyectos = await this.entityManager.query(query, params);
        }

        if (proyectos.length === 0 && projectName) {
            const params = [];
            let query = `SELECT p.id, p.nombre_proyecto, o.nombre as organizacion_nombre, o.categoria as categoria_nombre
                         FROM proyectos p
                         INNER JOIN organizaciones o ON p.organizacion_id = o.id
                         WHERE LOWER(p.nombre_proyecto) = LOWER(?)`;
            params.push(projectName);
            if (organizationName) {
                query += ` AND LOWER(o.nombre) = LOWER(?)`;
                params.push(organizationName);
            }
            if (contextCategory) {
                query += ` AND o.categoria = ?`;
                params.push(contextCategory);
            }
            proyectos = await this.entityManager.query(query, params);
        }

        if (proyectos.length === 0 && projectContextResolved) {
            proyectos = [projectContextResolved];
        }

        if (proyectos.length === 0 && projectLookupFallback) {
            proyectos = [projectLookupFallback];
        }

        if (proyectos.length === 0 && organizationName && contextCategory) {
            proyectos = await this.entityManager.query(
                `SELECT p.id, p.nombre_proyecto, o.nombre as organizacion_nombre, o.categoria as categoria_nombre
                 FROM proyectos p
                 INNER JOIN organizaciones o ON p.organizacion_id = o.id
                 WHERE o.categoria = ? AND LOWER(o.nombre) = LOWER(?)`,
                [contextCategory, organizationName]
            );
        }

        if (proyectos.length === 0) {
            const projectLabel = projectName || rawId || this.pickValue(row, ['Nombre del Proyecto', 'Proyecto'], '').toString().trim() || (rowIndex ? `fila ${rowIndex}` : 'la fila');
            throw new Error(`No se pudo registrar el seguimiento de ${projectLabel} porque no se encontr� el proyecto en el sistema. Verifique el nombre, la categor�a y la edición antes de volver a subirlo.`);
        }

        let selectedProject = proyectos[0];
        if (proyectos.length > 1) {
            if (projectName) {
                const matches = proyectos.filter(p => p.nombre_proyecto && p.nombre_proyecto.toLowerCase().trim() === projectName.toLowerCase().trim());
                if (matches.length === 1) selectedProject = matches[0];
                else if (matches.length > 1) {
                    throw new Error(`El proyecto ${projectName} est� duplicado para la carga de seguimiento. Agregue categor�a, organizaci�n o edición para identificarlo correctamente.`);
                }
            }
            if (organizationName) {
                const orgMatches = proyectos.filter(p => (p.organizacion_nombre || '').toString().toLowerCase().trim() === organizationName.toLowerCase().trim());
                if (orgMatches.length === 1) selectedProject = orgMatches[0];
                else if (orgMatches.length > 1) {
                    throw new Error(`El proyecto ${projectName || rawId || 'seleccionado'} aparece repetido en la organizaci�n ${organizationName}. Debe identificarse mejor antes de cargar seguimiento.`);
                }
            }
            if (!selectedProject) {
                throw new Error(`El proyecto ${projectName || rawId || 'seleccionado'} no es �nico para la carga de seguimiento. Agregue categor�a, organizaci�n o edición para identificarlo correctamente.`);
            }
        }

        const projectMeta = await this.entityManager.query(`
            SELECT p.monto_fgk as amountFGK, p.mes_inicio as startMonth, p.mes_final as endMonth, p.duracion_meses as durationMonths
            FROM proyectos p
            WHERE p.id = ?
            LIMIT 1
        `, [selectedProject.id]);
        const projectTimeline = this.validateProjectTimeline(projectMeta, selectedProject.id);
        const reportMonth = this.resolveTrackingMonth(reportMonthRaw || reportMonthCalendar, projectTimeline.startMonth);
        if (!reportMonth || !projectTimeline.sequence.includes(reportMonth)) {
            throw new Error(`El mes indicado para el seguimiento del proyecto ${selectedProject.nombre_proyecto} no pertenece a su período definido.`);
        }
        const projectBaseInvestment = this.parseLooseNumber(projectMeta[0]?.amountFGK || projectContext.investmentFgk || 0) || 0;
        const metaFinancialFromRow = this.parseLooseNumber(this.pickValue(row, ['meta_financiera', 'metafinanciera', 'Meta Financiera', 'Meta financiera', 'Meta Financiera (%)', 'Meta financiera (%)'], null));
        const rawMetaFinancialCell = this.pickValue(row, ['meta_financiera', 'metafinanciera', 'Meta Financiera', 'Meta financiera', 'Meta Financiera (%)', 'Meta financiera (%)'], null);
        if (rawMetaFinancialCell !== null && rawMetaFinancialCell !== undefined && rawMetaFinancialCell !== '' && metaFinancialFromRow === null) {
            throw new Error(`La meta financiera del proyecto ${selectedProject.nombre_proyecto} no es un valor num�rico v�lido.`);
        }
        const reportState = context.monthlyState instanceof Map
            ? (context.monthlyState.get(selectedProject.id) || { technicalScores: [], accumulatedFgk: 0 })
            : { technicalScores: [], accumulatedFgk: 0 };
        if (context.monthlyState instanceof Map && !context.monthlyState.has(selectedProject.id)) {
            context.monthlyState.set(selectedProject.id, reportState);
        }

        const activitiesPlanned = this.parseLooseNumber(this.pickValue(row, ['Actividades planificadas', 'Actividades Planificadas', 'Total Actividades', 'actividades_planificadas', 'Actividades'], null));
        const finalizadas = this.parseLooseNumber(this.pickValue(row, ['Finalizadas', 'finalizadas', 'Completadas', 'actividades_finalizadas'], 0)) || 0;
        const enEjecucion = this.parseLooseNumber(this.pickValue(row, ['En ejecuci�n', 'En Ejecución', 'En ejecucion', 'En Proceso', 'En proceso', 'en_ejecucion'], 0)) || 0;
        const pendientes = this.parseLooseNumber(this.pickValue(row, ['Pendientes', 'pendientes'], 0)) || 0;
        let monthlyTechnical = this.normalizePercentValue(this.pickValue(row, ['Avance t�cnico mensual %', 'Avance Tecnico Mensual %', 'Avance t�cnico', 'Avance Tecnico', 'avance_tecnico'], null));
        if (monthlyTechnical === null && activitiesPlanned && activitiesPlanned > 0) {
            monthlyTechnical = ((finalizadas * 10) + (enEjecucion * 5)) / (activitiesPlanned * 10) * 100;
        }
        if (monthlyTechnical === null && (finalizadas > 0 || enEjecucion > 0 || pendientes > 0)) {
            const inferredTotal = finalizadas + enEjecucion + pendientes;
            monthlyTechnical = inferredTotal > 0 ? (((finalizadas * 10) + (enEjecucion * 5)) / (inferredTotal * 10)) * 100 : 0;
        }
        if (monthlyTechnical === null) {
            const normalizedSchedule = this.normalizeText(this.pickValue(row, ['Estado del mes', 'Estado Cronograma', 'estado_cronograma', 'Estado'], ''));
            if (normalizedSchedule.includes('finaliz') || normalizedSchedule.includes('complet')) {
                monthlyTechnical = 100;
            }
            else if (normalizedSchedule.includes('ejec') || normalizedSchedule.includes('proces') || normalizedSchedule.includes('activ') || normalizedSchedule.includes('avance') || normalizedSchedule.includes('tiempo')) {
                monthlyTechnical = 50;
            }
            else if (normalizedSchedule.includes('pend')) {
                monthlyTechnical = 0;
            }
        }
        if (monthlyTechnical === null) {
            monthlyTechnical = 0;
        }
        reportState.technicalScores.push(monthlyTechnical);
        const cumulativeTechnical = Math.min(100, Number((reportState.technicalScores.reduce((sum, value) => sum + value, 0) / Math.max(1, reportState.technicalScores.length)).toFixed(2)));

        const executedFgk = this.parseLooseNumber(this.pickValue(row, ['FGK ejecutado', 'FGK Ejecutado', 'fgk_ejecutado', 'Monto ejecutado', 'Monto Ejecutado'], null));
        const metaFinancial = metaFinancialFromRow;
        const monthlyExecutedAmount = executedFgk !== null && executedFgk !== undefined && executedFgk > 0
            ? executedFgk
            : (metaFinancial || 0);

        let accumulatedFgk = this.parseLooseNumber(this.pickValue(row, ['FGK acumulado', 'FGK Acumulado', 'fgk_acumulado', 'Monto acumulado', 'Monto Acumulado'], null));
        if (accumulatedFgk === null) {
            reportState.accumulatedFgk = (reportState.accumulatedFgk || 0) + monthlyExecutedAmount;
            accumulatedFgk = reportState.accumulatedFgk;
        }
        else {
            reportState.accumulatedFgk = accumulatedFgk;
        }
        if (projectBaseInvestment > 0 && accumulatedFgk > projectBaseInvestment) {
            throw new Error(`La meta financiera acumulada del proyecto ${selectedProject.nombre_proyecto} supera la Inversión FGK permitida.`);
        }
        const cumulativeFinancial = projectBaseInvestment > 0
            ? Math.min(100, Number(((accumulatedFgk / projectBaseInvestment) * 100).toFixed(2)))
            : Math.min(100, this.normalizePercentValue(this.pickValue(row, ['Ejecución financiera acumulada %', 'Ejecucion financiera acumulada %', 'avance_financiero'], 0)) || 0);

        const scheduleStatus = (context.forcedScheduleStatus ?? this.pickValue(row, ['Estado del mes', 'Estado Cronograma', 'estado_cronograma', 'Estado'], 'En Tiempo')).toString().trim();
        const observations = (context.forcedObservations ?? this.pickValue(row, ['Observaciones', 'observaciones', 'Observaci�n breve', 'Observacion breve', 'Comentario', 'comentario'], '')).toString().trim();
        const activityName = (context.forcedActivityName ?? this.pickValue(row, ['Actividad', 'actividad', 'Nombre_Actividad', 'Nombre Actividad', 'Tarea', 'tarea'], '')).toString().trim();
        const reportId = `rep-${selectedProject.id}-${reportYear}-${String(reportMonth).padStart(2, '0')}`;

        try {
            await this.entityManager.query(`INSERT INTO reportes_mensuales (id, proyecto_id, mes, anio, año, avance_tecnico_real, avance_financiero_real, meta_financiera, estado_cronograma, observaciones, fotos, creado_por, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE
             año = VALUES(año),
             avance_tecnico_real = VALUES(avance_tecnico_real),
             avance_financiero_real = VALUES(avance_financiero_real),
             meta_financiera = VALUES(meta_financiera),
             estado_cronograma = VALUES(estado_cronograma),
             observaciones = VALUES(observaciones),
             fotos = VALUES(fotos)`, [
                reportId,
                selectedProject.id,
                reportMonth,
                reportYear,
                reportYear,
                cumulativeTechnical,
                cumulativeFinancial,
                metaFinancial,
                scheduleStatus,
                observations,
                '[]',
                user?.email || 'Importador Excel'
            ]);
        }
        catch (err) {
            throw new Error(this.formatMonthlyTrackingUploadError(err, selectedProject.nombre_proyecto || projectName || selectedProject.id));
        }

        if (activityName) {
            const activityStatus = (() => {
                const normalizedSchedule = this.normalizeText(scheduleStatus);
                if (normalizedSchedule.includes('finaliz') || normalizedSchedule.includes('complet')) return 'completed';
                if (normalizedSchedule.includes('ejec') || normalizedSchedule.includes('proces') || normalizedSchedule.includes('activ') || normalizedSchedule.includes('avance') || normalizedSchedule.includes('tiempo')) return 'active';
                if (normalizedSchedule.includes('pend')) return 'pending';
                return 'pending';
            })();
            await this.upsertProjectActivity(selectedProject.id, {
                name: activityName,
                month: reportMonth,
                status: activityStatus,
                note: observations || null,
            }, {
                source: 'excel',
                allowOverwriteManual,
                activityId: `act-${selectedProject.id}-${reportYear}-${String(reportMonth).padStart(2, '0')}-${this.normalizeText(activityName).replace(/[^a-z0-9]/g, '').slice(0, 16) || Date.now()}`
            });
        }

        const activities = await this.entityManager.query(`
            SELECT id, nombre as name, mes as month, estado as status
            FROM proyecto_actividades
            WHERE proyecto_id = ?
        `, [selectedProject.id]);

        const durationMonths = projectTimeline.durationMonths || 12;

        let calculatedTechnical = 0;
        if (activities.length > 0) {
            const grouped = new Map<number, any[]>();
            for (const activity of activities) {
                const month = this.getMonthNumber(activity.month);
                if (!month) {
                    continue;
                }
                const list = grouped.get(month) || [];
                list.push(activity);
                grouped.set(month, list);
            }
            const monthSequence = this.buildTimelineMonthSequence(projectMeta[0]?.startMonth, projectMeta[0]?.endMonth);
            const monthScores: number[] = [];
            for (const month of monthSequence) {
                const list = grouped.get(month) || [];
                if (list.length === 0) {
                    monthScores.push(0);
                    continue;
                }
                const statuses = list.map((activity) => this.normalizeActivityStatus(activity.status));
                const completedCount = statuses.filter((status) => status === 'completed').length;
                const activeCount = statuses.filter((status) => status === 'active').length;
                const score = ((completedCount + (activeCount * 0.5)) / Math.max(1, list.length)) * 100;
                monthScores.push(score);
            }
            calculatedTechnical = Math.min(100, Number((monthScores.reduce((sum, value) => sum + value, 0) / Math.max(1, durationMonths)).toFixed(2)));
        }
        else {
            calculatedTechnical = cumulativeTechnical;
        }

        const orderedReports = await this.entityManager.query(`
            SELECT avance_financiero_real as realFinancial, COALESCE(anio, año) as year, mes as month
            FROM reportes_mensuales
            WHERE proyecto_id = ?
            ORDER BY COALESCE(anio, año) ASC, mes ASC
        `, [selectedProject.id]);
        const latestFinancial = orderedReports.length > 0 ? orderedReports[orderedReports.length - 1] : null;
        const calculatedFinancial = latestFinancial
            ? Math.min(100, Number((parseFloat(latestFinancial.realFinancial) || 0).toFixed(2)))
            : cumulativeFinancial;

        await this.entityManager.query(`UPDATE proyectos 
       SET progreso_tecnico = ?, progreso_financiero = ?, updated_at = NOW()
       WHERE id = ?`, [calculatedTechnical, calculatedFinancial, selectedProject.id]);
    }

    async uploadImage(file, projectId, userId) {
        if (!file) {
            throw new common_1.BadRequestException('No se recibi� ning�n archivo');
        }
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.mimetype)) {
            throw new common_1.BadRequestException('Tipo de archivo no permitido. Use im�genes (JPEG, PNG, WEBP, GIF)');
        }
        if (file.size > 5 * 1024 * 1024) {
            throw new common_1.BadRequestException('El archivo no puede superar los 5MB');
        }
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${path.extname(file.originalname)}`;
        const uploadDir = path.join(process.cwd(), 'uploads', 'projects', projectId);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filepath = path.join(uploadDir, filename);
        fs.writeFileSync(filepath, file.buffer);
        const url = `http://localhost:3000/uploads/projects/${projectId}/${filename}`;
        await this.entityManager.query(`INSERT INTO fotos_proyecto (id, proyecto_id, url, subido_por, created_at)
       VALUES (?, ?, ?, ?, NOW())`, [`foto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, projectId, url, userId]);
        return url;
    }
    async getCurrentEditionId() {
        const result = await this.entityManager.query(`SELECT id FROM ediciones WHERE es_actual = TRUE LIMIT 1`);
        return result[0]?.id || 20;
    }
};
exports.UploadService = UploadService;
exports.UploadService = UploadService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectEntityManager)()),
    __param(1, (0, common_1.Inject)(dashboard_service_1.DashboardService)),
    __metadata("design:paramtypes", [typeorm_2.EntityManager, dashboard_service_1.DashboardService])
], UploadService);
export { UploadService };
//# sourceMappingURL=upload.service.js.map





