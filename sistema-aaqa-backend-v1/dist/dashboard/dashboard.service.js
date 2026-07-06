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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
let DashboardService = class DashboardService {
    entityManager;
    constructor(entityManager) {
        this.entityManager = entityManager;
    }
    normalizeText(value) {
        return (value ?? '')
            .toString()
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
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
    buildNextCommunityId(prefix, year, usedSequences) {
        let seq = 1;
        while (usedSequences.has(seq))
            seq++;
        usedSequences.add(seq);
        return this.getCommunityYearSequenceId(prefix, year, seq);
    }
    async ensureEditionExists(year) {
        const edition = await this.entityManager.query(`SELECT id FROM ediciones WHERE año = ? LIMIT 1`, [year]);
        if (!edition || edition.length === 0) {
            throw new Error(`La edición ${year} no está disponible en el sistema. Debe crearla antes de cargar o editar registros de ese año.`);
        }
        return edition[0];
    }
    async isEditionAvailable(year) {
        const edition = await this.entityManager.query(`SELECT id FROM ediciones WHERE año = ? LIMIT 1`, [year]);
        return Array.isArray(edition) && edition.length > 0;
    }
    normalizeActivityStatus(value) {
        const status = this.normalizeText(value);
        if (!status) {
            return 'pending';
        }
        if (status.includes('finaliz') || status.includes('complet')) {
            return 'completed';
        }
        if (status.includes('ejec') || status.includes('avance') || status.includes('activo')) {
            return 'active';
        }
        return 'pending';
    }
    getMonthNumber(value) {
        if (value === null || value === undefined || value === '')
            return null;
        const raw = value.toString().trim().toLowerCase();
        const numeric = parseInt(raw, 10);
        if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= 12)
            return numeric;
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
    buildTimelineMonthSequence(startMonth, durationMonths) {
        const start = Math.max(1, Math.min(12, startMonth || 1));
        const duration = Math.max(1, Math.min(12, durationMonths || 12));
        return Array.from({ length: duration }, (_, idx) => ((start - 1 + idx) % 12) + 1);
    }
    async getGlobalData(year) {
        let joinEdicion = '';
        let whereClause = '';
        const params = [];
        if (year) {
            joinEdicion = 'JOIN ediciones e ON p.edicion_id = e.id';
            whereClause = 'WHERE e.año = ?';
            params.push(year);
        }
        const query = `
      SELECT 
        SUM(p.monto_fgk) as total_fgk,
        SUM(p.monto_aliados) as total_aliados,
        SUM(p.contrapartida_org) as total_contrapartida,
        COUNT(DISTINCT p.id) as total_proyectos,
        COUNT(DISTINCT p.organizacion_id) as total_organizaciones,
        SUM(p.beneficiarios_directos) as total_beneficiarios
      FROM proyectos p
      ${joinEdicion}
      ${whereClause}
    `;
        const result = await this.entityManager.query(query, params);
        const data = result[0] || {};
        const fgk = parseFloat(data.total_fgk) || 0;
        const aliados = parseFloat(data.total_aliados) || 0;
        const contrapartida = parseFloat(data.total_contrapartida) || 0;
        return {
            financials: {
                fgk,
                aliados,
                contrapartida,
            },
            impact: {
                projects: parseInt(data.total_proyectos) || 0,
                orgs: parseInt(data.total_organizaciones) || 0,
                beneficiaries: parseInt(data.total_beneficiarios) || 0,
            },
        };
    }
    async getCategoriesData(year) {
        let joinEdicion = '';
        let whereClause = '';
        const params = [];
        if (year) {
            joinEdicion = 'JOIN ediciones e ON p.edicion_id = e.id';
            whereClause = 'WHERE e.año = ?';
            params.push(year);
        }
        const query = `
      SELECT 
        o.categoria,
        SUM(p.monto_fgk) as investment,
        COUNT(DISTINCT p.organizacion_id) as orgs,
        COUNT(p.id) as projects
      FROM proyectos p
      JOIN organizaciones o ON p.organizacion_id = o.id
      ${joinEdicion}
      ${whereClause}
      GROUP BY o.categoria
    `;
        const results = await this.entityManager.query(query, params);
        const categories = {
            ong: { investment: 0, orgs: 0, projects: 0 },
            community: { investment: 0, orgs: 0, projects: 0 },
            fis: { investment: 0, ventures: 0, projects: 0 },
        };
        for (const row of results) {
            const category = this.normalizeCategory(row.categoria);
            if (category === 'ONG') {
                categories.ong = {
                    investment: categories.ong.investment + (parseFloat(row.investment) || 0),
                    orgs: categories.ong.orgs + (parseInt(row.orgs) || 0),
                    projects: categories.ong.projects + (parseInt(row.projects) || 0),
                };
            }
            else if (category === 'Community') {
                categories.community = {
                    investment: categories.community.investment + (parseFloat(row.investment) || 0),
                    orgs: categories.community.orgs + (parseInt(row.orgs) || 0),
                    projects: categories.community.projects + (parseInt(row.projects) || 0),
                };
            }
            else if (category === 'FIS') {
                categories.fis = {
                    investment: categories.fis.investment + (parseFloat(row.investment) || 0),
                    ventures: categories.fis.ventures + (parseInt(row.orgs) || 0),
                    projects: categories.fis.projects + (parseInt(row.projects) || 0),
                };
            }
        }
        return categories;
    }
    async getFormativeData(year) {
        let joinEdicionTotal = '';
        let joinEdicionCategory = '';
        let whereClauseTotal = "WHERE pf.estado_formacion IN ('graduado', 'en_formacion', 'inscrito')";
        let whereClauseCategory = "WHERE pf.estado_formacion IN ('graduado', 'en_formacion', 'inscrito')";
        const params = [];
        if (year) {
            joinEdicionTotal = 'JOIN proyectos p ON pf.proyecto_id = p.id OR pf.proyecto_id = SUBSTRING_INDEX(p.id, \'-\', 1) JOIN ediciones e ON p.edicion_id = e.id';
            joinEdicionCategory = 'JOIN ediciones e ON p.edicion_id = e.id';
            whereClauseTotal += ' AND e.año = ?';
            whereClauseCategory += ' AND e.año = ?';
            params.push(year);
        }
        const totalQuery = `
      SELECT 
        COUNT(DISTINCT pf.id) as total_inscritos,
        SUM(CASE WHEN pf.estado_formacion = 'graduado' THEN 1 ELSE 0 END) as total_graduados,
        SUM(CASE WHEN pf.genero = 'F' THEN 1 ELSE 0 END) as total_mujeres,
        SUM(CASE WHEN pf.genero = 'M' THEN 1 ELSE 0 END) as total_hombres
      FROM participantes_formacion pf
      ${joinEdicionTotal}
      ${whereClauseTotal}
    `;
        const totalResult = await this.entityManager.query(totalQuery, params);
        let totalInscritos = parseInt(totalResult[0].total_inscritos) || 0;
        let totalGraduados = parseInt(totalResult[0].total_graduados) || 0;
        const categoryQuery = `
      SELECT 
        o.categoria,
        COUNT(DISTINCT pf.id) as inscritos,
        SUM(CASE WHEN pf.estado_formacion = 'graduado' THEN 1 ELSE 0 END) as graduados
      FROM participantes_formacion pf
      JOIN proyectos p ON pf.proyecto_id = p.id OR pf.proyecto_id = SUBSTRING_INDEX(p.id, '-', 1)
      JOIN organizaciones o ON p.organizacion_id = o.id
      ${joinEdicionCategory}
      ${whereClauseCategory}
      GROUP BY o.categoria
    `;
        const categoryResults = await this.entityManager.query(categoryQuery, params);
        const byCategory = {
            ong: { enrolled: 0, graduated: 0 },
            community: { enrolled: 0, graduated: 0 },
            fis: { enrolled: 0, graduated: 0 },
        };
        for (const row of categoryResults) {
            const category = this.normalizeCategory(row.categoria);
            if (category === 'ONG') {
                byCategory.ong = {
                    enrolled: byCategory.ong.enrolled + (parseInt(row.inscritos) || 0),
                    graduated: byCategory.ong.graduated + (parseInt(row.graduados) || 0),
                };
            }
            else if (category === 'Community') {
                byCategory.community = {
                    enrolled: byCategory.community.enrolled + (parseInt(row.inscritos) || 0),
                    graduated: byCategory.community.graduated + (parseInt(row.graduados) || 0),
                };
            }
            else if (category === 'FIS') {
                byCategory.fis = {
                    enrolled: byCategory.fis.enrolled + (parseInt(row.inscritos) || 0),
                    graduated: byCategory.fis.graduated + (parseInt(row.graduados) || 0),
                };
            }
        }
        const departmentQuery = `
      SELECT 
        pf.departamento,
        COUNT(*) as graduados
      FROM participantes_formacion pf
      WHERE pf.estado_formacion = 'graduado'
        AND pf.departamento IS NOT NULL
        AND pf.departamento != ''
      GROUP BY pf.departamento
      ORDER BY graduados DESC
      LIMIT 10
    `;
        const departmentResults = await this.entityManager.query(departmentQuery);
        const byDepartment = {};
        for (const row of departmentResults) {
            byDepartment[row.departamento] = parseInt(row.graduados) || 0;
        }
        return {
            totalEnrolled: totalInscritos,
            totalGraduated: totalGraduados,
            retentionRate: totalInscritos > 0 ? (totalGraduados / totalInscritos) * 100 : 0,
            byGender: {
                F: parseInt(totalResult[0].total_mujeres) || 0,
                M: parseInt(totalResult[0].total_hombres) || 0,
            },
            byCategory,
            byDepartment,
        };
    }
    async getProjects(filters) {
        let query = `
      SELECT 
        p.id,
        p.nombre_proyecto as name,
        o.nombre as organization,
        o.categoria as category,
        p.departamento as department,
        p.municipio as municipality,
        NULL as district,
        p.monto_fgk as amountFGK,
        p.contrapartida_org as counterpart,
        COALESCE(
          (SELECT al.nombre_aliado FROM aliados_contribuciones al WHERE al.proyecto_id = p.id ORDER BY al.created_at DESC LIMIT 1),
          p.nombre_aliado
        ) as allyName,
        p.monto_aliados as amountAllies,
        p.beneficiarios_directos as beneficiaries,
        p.beneficiarios_indirectos as indirectBeneficiaries,
        p.organization_logo as organizationLogo,
        p.logo_url as logoUrl,
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
        p.mes_inicio as timelineStartMonth,
        p.mes_final as timelineEndMonth,
        p.duracion_meses as timelineDurationMonths,
        p.progreso_tecnico as technicalProgressPercentage,
        p.progreso_financiero as financialProgressPercentage
      FROM proyectos p
      JOIN organizaciones o ON p.organizacion_id = o.id
      JOIN ediciones e ON p.edicion_id = e.id
      WHERE 1=1
    `;
        const params = [];
        if (filters.year) {
            query += ` AND e.año = ?`;
            params.push(filters.year);
        }
        if (filters.category) {
            const normalizedFilterCategory = this.normalizeCategory(filters.category);
            if (normalizedFilterCategory === 'Community') {
                query += ` AND (o.categoria = ? OR LOWER(o.categoria) LIKE ?)`;
                params.push('Community', '%comunitario%');
            }
            else {
                query += ` AND o.categoria = ?`;
                params.push(normalizedFilterCategory);
            }
        }
        query += ` ORDER BY p.created_at DESC`;
        const results = await this.entityManager.query(query, params);
        if (results.length === 0)
            return [];
        const projectIdCandidatesByCanonical = new Map();
        const candidateToCanonical = new Map();
        for (const row of results) {
            const canonical = row.id.toString();
            const base = canonical.split('-')[0];
            const categoryCode = this.normalizeCategory(row.category) === 'Community'
                ? 'COM'
                : this.normalizeCategory(row.category) === 'FIS'
                    ? 'FIS'
                    : 'ONG';
            const candidates = Array.from(new Set([canonical, base, `${base}-${categoryCode}`]));
            projectIdCandidatesByCanonical.set(canonical, candidates);
            for (const candidate of candidates) {
                candidateToCanonical.set(candidate, canonical);
            }
        }
        const allProjectIds = Array.from(new Set(Array.from(projectIdCandidatesByCanonical.values()).flat()));
        const placeholders = allProjectIds.map(() => '?').join(',');
        const participants = await this.entityManager.query(`SELECT DISTINCT
         pf.id,
         pf.proyecto_id,
         pf.proyecto_nombre,
         pf.categoria as participant_category,
         pf.ano as participant_year,
         pf.nombre as name,
         pf.edad as age,
         pf.genero as gender,
         pf.telefono as phone,
         pf.email,
         pf.rol_cargo as role,
         pf.estado_formacion as status,
         pf.departamento as department,
         pf.municipio as municipality,
         p.id as matchedProjectId,
         p.nombre_proyecto as matchedProjectName,
         o.categoria as matchedCategory
       FROM participantes_formacion pf
       LEFT JOIN proyectos p ON pf.proyecto_id = p.id OR pf.proyecto_id = SUBSTRING_INDEX(p.id, '-', 1)
       LEFT JOIN organizaciones o ON p.organizacion_id = o.id
       WHERE pf.proyecto_id IN (${placeholders})
          OR p.id IN (${placeholders})`, [...allProjectIds, ...allProjectIds]);
        const reports = await this.entityManager.query(`SELECT id, proyecto_id, mes, año as year, avance_tecnico_real as realTechnical,
              avance_financiero_real as realFinancial, meta_financiera as metaFinancial, estado_cronograma as scheduleStatus,
              observaciones as observations, fotos as photos, creado_por as createdBy, created_at as createdAt
       FROM reportes_mensuales
       WHERE proyecto_id IN (${placeholders})
       ORDER BY año DESC, mes DESC`, allProjectIds);
        const activities = await this.entityManager.query(`SELECT id, proyecto_id, nombre as name, mes as month, estado as status, nota as note, created_at as createdAt, updated_at as updatedAt
       FROM proyecto_actividades
       WHERE proyecto_id IN (${placeholders})
       ORDER BY mes ASC, created_at ASC`, allProjectIds);
        const projectPhotos = await this.entityManager.query(`SELECT proyecto_id, url, created_at
       FROM fotos_proyecto
       WHERE proyecto_id IN (${placeholders})
       ORDER BY created_at DESC`, allProjectIds);
        const projectDocuments = await this.entityManager.query(`SELECT proyecto_id, tipo, url, created_at
       FROM proyecto_documentos
       WHERE proyecto_id IN (${placeholders})
       ORDER BY created_at DESC`, allProjectIds);
        const reportsByProject = new Map();
        const progressByProject = new Map();
        const photosByProject = new Map();
        const completionDocsByProject = new Map();
        const changeDocsByProject = new Map();
        const activitiesByProject = new Map();
        const normalizeReportStatus = (value) => {
            const status = (value ?? '').toString().trim().toLowerCase();
            if (status.includes('finaliz'))
                return 'completed';
            if (status.includes('tiempo') || status.includes('ejec') || status.includes('adelant') || status.includes('retras'))
                return 'active';
            return 'pending';
        };
        for (const report of reports) {
            const reportKey = candidateToCanonical.get(report.proyecto_id.toString()) ||
                candidateToCanonical.get(report.proyecto_id.toString().split('-')[0]) ||
                report.proyecto_id.toString();
            const reportList = reportsByProject.get(reportKey) || [];
            const parsedPhotos = this.safeParseJsonArray(report.photos);
            reportList.push({
                id: report.id,
                month: report.mes,
                year: report.year,
                realTechnical: report.realTechnical,
                realFinancial: report.realFinancial,
                metaFinancial: report.metaFinancial,
                scheduleStatus: report.scheduleStatus,
                observations: report.observations,
                photos: parsedPhotos,
                createdBy: report.createdBy,
                createdAt: report.createdAt,
            });
            reportsByProject.set(reportKey, reportList);
            if (report.mes >= 1 && report.mes <= 12) {
                const progress = progressByProject.get(reportKey) || Array(12).fill('pending');
                progress[report.mes - 1] = normalizeReportStatus(report.scheduleStatus);
                progressByProject.set(reportKey, progress);
            }
        }
        for (const photo of projectPhotos) {
            const photoKey = candidateToCanonical.get(photo.proyecto_id.toString()) ||
                candidateToCanonical.get(photo.proyecto_id.toString().split('-')[0]) ||
                photo.proyecto_id.toString();
            const list = photosByProject.get(photoKey) || [];
            list.push(photo.url);
            photosByProject.set(photoKey, list);
        }
        for (const doc of projectDocuments) {
            const docKey = candidateToCanonical.get(doc.proyecto_id.toString()) ||
                candidateToCanonical.get(doc.proyecto_id.toString().split('-')[0]) ||
                doc.proyecto_id.toString();
            const targetMap = doc.tipo === 'completion_letter' ? completionDocsByProject : changeDocsByProject;
            const list = targetMap.get(docKey) || [];
            list.push(doc.url);
            targetMap.set(docKey, list);
        }
        for (const activity of activities) {
            const activityKey = candidateToCanonical.get(activity.proyecto_id.toString()) ||
                candidateToCanonical.get(activity.proyecto_id.toString().split('-')[0]) ||
                activity.proyecto_id.toString();
            const list = activitiesByProject.get(activityKey) || [];
            list.push({
                id: activity.id,
                name: activity.name,
                month: this.getMonthNumber(activity.month) || 1,
                status: activity.status,
                note: activity.note,
                createdAt: activity.createdAt,
                updatedAt: activity.updatedAt,
            });
            activitiesByProject.set(activityKey, list);
        }
        const participantsByProject = new Map();
        for (const p of participants) {
            const participantProjectId = (p.matchedProjectId || p.proyecto_id || '').toString();
            const participantProjectName = (p.proyecto_nombre || p.matchedProjectName || '').toString().trim().toLowerCase();
            const participantBaseId = participantProjectId.split('-')[0] || p.proyecto_id.toString().split('-')[0];
            const participantProjectKey = candidateToCanonical.get(participantProjectId) ||
                candidateToCanonical.get(p.proyecto_id.toString()) ||
                candidateToCanonical.get(participantBaseId) ||
                (participantProjectName
                    ? results.find((row) => row.name?.toString().trim().toLowerCase() === participantProjectName && this.normalizeCategory(row.category) === this.normalizeCategory(p.participant_category || row.category))?.id?.toString()
                    : null) ||
                participantProjectId ||
                p.proyecto_id.toString();
            const list = participantsByProject.get(participantProjectKey) || [];
            list.push({
                id: p.id,
                name: p.name,
                age: p.age,
                gender: p.gender,
                phone: p.phone,
                email: p.email,
                role: p.role,
                department: p.department,
                municipality: p.municipality,
                status: p.status === 'graduado' ? 'graduated' :
                    p.status === 'en_formacion' ? 'in_progress' : 'enrolled'
            });
            participantsByProject.set(participantProjectKey, list);
        }
        return Promise.all(results.map(async (row) => {
            const canonicalKey = row.id.toString();
            const baseKey = canonicalKey.split('-')[0];
            let projParts = participantsByProject.get(canonicalKey) || participantsByProject.get(baseKey) || [];
            const projActivities = activitiesByProject.get(canonicalKey) || activitiesByProject.get(baseKey) || [];
            if (projParts.length === 0) {
                const normalizedCategory = this.normalizeCategory(row.category);
                const categoryWhere = normalizedCategory === 'Community'
                    ? `(o2.categoria = ? OR LOWER(o2.categoria) LIKE ?)`
                    : `o2.categoria = ?`;
                const categoryParams = normalizedCategory === 'Community'
                    ? ['Community', '%comunitario%']
                    : [normalizedCategory];
                const fallbackParticipants = await this.entityManager.query(`SELECT 
             pf.id,
             pf.proyecto_id,
             pf.nombre as name,
             pf.edad as age,
             pf.genero as gender,
             pf.telefono as phone,
             pf.email,
             pf.rol_cargo as role,
             pf.estado_formacion as status,
             pf.departamento as department,
             pf.municipio as municipality
           FROM participantes_formacion pf
           JOIN proyectos p2 ON pf.proyecto_id = p2.id OR pf.proyecto_id = SUBSTRING_INDEX(p2.id, '-', 1)
           JOIN organizaciones o2 ON p2.organizacion_id = o2.id
           WHERE p2.nombre_proyecto = ?
             AND ${categoryWhere}`, [row.name, ...categoryParams]);
                projParts = fallbackParticipants.map((p) => ({
                    id: p.id,
                    name: p.name,
                    age: p.age,
                    gender: p.gender,
                    phone: p.phone,
                    email: p.email,
                    role: p.role,
                    department: p.department,
                    municipality: p.municipality,
                    status: p.status === 'graduado' ? 'graduated' :
                        p.status === 'en_formacion' ? 'in_progress' : 'enrolled'
                }));
            }
            return {
                id: row.id,
                name: row.name,
                organization: row.organization,
                category: this.normalizeCategory(row.category),
                department: row.department || projParts[0]?.department || '',
                municipality: row.municipality || projParts[0]?.municipality || '',
                district: row.district || '',
                amountFGK: parseFloat(row.amountFGK) || 0,
                counterpart: parseFloat(row.counterpart) || 0,
                allyName: row.allyName || '',
                amountAllies: parseFloat(row.amountAllies) || 0,
                beneficiaries: parseInt(row.beneficiaries) || 0,
                indirectBeneficiaries: parseInt(row.indirectBeneficiaries) || 0,
                status: row.status,
                year: row.year,
                timelineStartMonth: row.timelineStartMonth ? parseInt(row.timelineStartMonth) : null,
                timelineEndMonth: row.timelineEndMonth ? parseInt(row.timelineEndMonth) : null,
                timelineDurationMonths: row.timelineDurationMonths ? parseInt(row.timelineDurationMonths) : null,
                technicalProgressPercentage: row.technicalProgressPercentage || 0,
                financialProgressPercentage: row.financialProgressPercentage || 0,
                progress: projActivities.length > 0 ? (() => {
                    const progress = Array(12).fill('pending');
                    const grouped = new Map();
                    for (const activity of projActivities) {
                        const month = this.getMonthNumber(activity.month) || 1;
                        const list = grouped.get(month) || [];
                        list.push(activity);
                        grouped.set(month, list);
                    }
                    const monthSequence = this.buildTimelineMonthSequence(row.timelineStartMonth ? parseInt(row.timelineStartMonth) : null, row.timelineDurationMonths ? parseInt(row.timelineDurationMonths) : null);
                    for (const month of monthSequence) {
                        const list = grouped.get(month) || [];
                        if (list.length === 0)
                            continue;
                        const statuses = list.map((item) => this.normalizeActivityStatus(item.status));
                        if (statuses.every((status) => status === 'completed')) {
                            progress[month - 1] = 'completed';
                        }
                        else if (statuses.some((status) => status === 'completed' || status === 'active')) {
                            progress[month - 1] = 'active';
                        }
                    }
                    return progress;
                })() : (progressByProject.get(canonicalKey) || progressByProject.get(baseKey) || Array(12).fill('pending')),
                activities: projActivities,
                trainingDetails: {
                    hasTraining: projParts.length > 0,
                    participants: projParts
                },
                reports: reportsByProject.get(canonicalKey) || reportsByProject.get(baseKey) || [],
                photos: photosByProject.get(canonicalKey) || photosByProject.get(baseKey) || [],
                completionLetter: (completionDocsByProject.get(canonicalKey) || completionDocsByProject.get(baseKey) || []).join(',') || null,
                changeControlDocuments: changeDocsByProject.get(canonicalKey) || changeDocsByProject.get(baseKey) || [],
            };
        }));
    }
    async getCommunityCortes() {
        await this.ensureCommunitySchema();
        const cortes = await this.entityManager.query(`SELECT id, año as year, nombre as name, ubicacion as location, nombre_aliado as allyName, estado as status, fecha_inicio as startDate, fecha_fin as endDate FROM cortes_comunitarios`);
        const adescos = await this.entityManager.query(`SELECT id, corte_id, año as year, nombre as name, participantes_inscritos as participantsCount, participantes_graduados as graduatesCount, mujeres as femaleCount, hombres as maleCount FROM adescos`);
        const participants = await this.entityManager.query(`SELECT id, adesco_id, nombre as name, cargo as role, contacto as phone, distrito as district, departamento as department, genero as gender FROM adescos_participantes`);
        const partsByAdesco = new Map();
        for (const p of participants) {
            if (!partsByAdesco.has(p.adesco_id))
                partsByAdesco.set(p.adesco_id, []);
            partsByAdesco.get(p.adesco_id).push(p);
        }
        const adescosByCorte = new Map();
        for (const a of adescos) {
            a.participants = partsByAdesco.get(a.id) || [];
            if (!adescosByCorte.has(a.corte_id))
                adescosByCorte.set(a.corte_id, []);
            adescosByCorte.get(a.corte_id).push(a);
        }
        return cortes.map(c => ({
            ...c,
            startDate: this.normalizeMysqlDate(c.startDate),
            endDate: this.normalizeMysqlDate(c.endDate),
            adescos: adescosByCorte.get(c.id) || []
        }));
    }
    async updateCommunityCortes(cortes) {
        await this.ensureCommunitySchema();
        const usedCorteSequencesByYear = new Map();
        const usedAdescoSequencesByYear = new Map();
        const usedParticipantSequencesByAdesco = new Map();
        const warnings = [];
        const validCortes = [];
        for (const corte of Array.isArray(cortes) ? cortes : []) {
            const corteYear = Number(corte.year) || new Date().getFullYear();
            const corteName = corte?.name || 'Sin nombre';
            if (!(await this.isEditionAvailable(corteYear))) {
                warnings.push(`Se omitió el corte "${corteName}" porque la edición ${corteYear} no está disponible en el sistema. Debe crearla antes de cargar o editar registros de ese año.`);
                continue;
            }
            const filteredAdescos = [];
            for (const adesco of Array.isArray(corte.adescos) ? corte.adescos : []) {
                const adescoYear = Number(adesco.year) || corteYear;
                const adescoName = adesco?.name || 'Sin nombre';
                if (!(await this.isEditionAvailable(adescoYear))) {
                    warnings.push(`Se omitió la ADESCO "${adescoName}" del corte "${corteName}" porque la edición ${adescoYear} no está disponible en el sistema. Debe crearla antes de cargar o editar registros de ese año.`);
                    continue;
                }
                filteredAdescos.push(adesco);
            }
            validCortes.push({ ...corte, year: corteYear, adescos: filteredAdescos });
        }
        if (validCortes.length === 0) {
            return {
                success: false,
                message: warnings.length > 0
                    ? warnings.join(' ')
                    : 'No se encontraron cortes comunitarios válidos para cargar.',
                warnings,
                results: { cortes: 0, adescos: 0, participantes: 0 },
            };
        }
        return this.entityManager.transaction(async (transactionalEntityManager) => {
            await transactionalEntityManager.query(`DELETE FROM adescos_participantes`);
            await transactionalEntityManager.query(`DELETE FROM adescos`);
            await transactionalEntityManager.query(`DELETE FROM cortes_comunitarios`);
            let cortesCount = 0;
            let adescosCount = 0;
            let participantesCount = 0;
            for (const corte of validCortes) {
                const corteYear = Number(corte.year) || new Date().getFullYear();
                if (!usedCorteSequencesByYear.has(corteYear)) {
                    usedCorteSequencesByYear.set(corteYear, new Set());
                }
                const usedCorteSequences = usedCorteSequencesByYear.get(corteYear);
                let corteSequence = this.parseCommunitySequence(corte.id, 'CF', corteYear);
                if (!corteSequence || usedCorteSequences.has(corteSequence)) {
                    corteSequence = 1;
                    while (usedCorteSequences.has(corteSequence))
                        corteSequence++;
                }
                usedCorteSequences.add(corteSequence);
                const finalCorteId = this.getCommunityYearSequenceId('CF', corteYear, corteSequence);
                await transactionalEntityManager.query(`INSERT INTO cortes_comunitarios (id, año, nombre, ubicacion, nombre_aliado, estado, fecha_inicio, fecha_fin)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                    finalCorteId,
                    corteYear,
                    corte.name,
                    corte.location,
                    corte.allyName,
                    corte.status,
                    this.normalizeMysqlDate(corte.startDate),
                    this.normalizeMysqlDate(corte.endDate)
                ]);
                cortesCount++;
                if (corte.adescos && corte.adescos.length > 0) {
                    for (const adesco of corte.adescos) {
                        const adescoYear = Number(adesco.year) || corteYear;
                        if (!usedAdescoSequencesByYear.has(adescoYear)) {
                            usedAdescoSequencesByYear.set(adescoYear, new Set());
                        }
                        const usedAdescoSequences = usedAdescoSequencesByYear.get(adescoYear);
                        let adescoSequence = this.parseCommunitySequence(adesco.id, 'AD', adescoYear);
                        if (!adescoSequence || usedAdescoSequences.has(adescoSequence)) {
                            adescoSequence = 1;
                            while (usedAdescoSequences.has(adescoSequence))
                                adescoSequence++;
                        }
                        usedAdescoSequences.add(adescoSequence);
                        const finalAdescoId = this.getCommunityYearSequenceId('AD', adescoYear, adescoSequence);
                        await transactionalEntityManager.query(`INSERT INTO adescos (id, corte_id, año, nombre, participantes_inscritos, participantes_graduados, mujeres, hombres)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                            finalAdescoId,
                            finalCorteId,
                            adescoYear,
                            adesco.name || 'Sin nombre',
                            adesco.participantsCount || 0,
                            adesco.graduatesCount || 0,
                            adesco.femaleCount || 0,
                            adesco.maleCount || 0
                        ]);
                        adescosCount++;
                        if (adesco.participants && adesco.participants.length > 0) {
                            if (!usedParticipantSequencesByAdesco.has(finalAdescoId)) {
                                usedParticipantSequencesByAdesco.set(finalAdescoId, new Set());
                            }
                            const usedParticipantSequences = usedParticipantSequencesByAdesco.get(finalAdescoId);
                            for (const part of adesco.participants) {
                                let participantSequence = this.parseCommunityParticipantSequence(part.id, finalAdescoId);
                                if (!participantSequence || usedParticipantSequences.has(participantSequence)) {
                                    participantSequence = 1;
                                    while (usedParticipantSequences.has(participantSequence))
                                        participantSequence++;
                                }
                                usedParticipantSequences.add(participantSequence);
                                const finalParticipantId = `${finalAdescoId}-${String(participantSequence).padStart(2, '0')}`;
                                await transactionalEntityManager.query(`INSERT INTO adescos_participantes (id, adesco_id, nombre, cargo, contacto, distrito, departamento, genero)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                                    finalParticipantId,
                                    finalAdescoId,
                                    part.name || 'Sin nombre',
                                    part.role || null,
                                    part.phone || null,
                                    part.district || null,
                                    part.department || null,
                                    part.gender || 'M'
                                ]);
                                participantesCount++;
                            }
                        }
                    }
                }
            }
            return {
                success: true,
                message: warnings.length > 0
                    ? `Cortes comunitarios y ADESCOS importados correctamente. Se omitieron ${warnings.length} registro${warnings.length > 1 ? 's' : ''} por edición no disponible.`
                    : 'Cortes comunitarios y ADESCOS sincronizados con éxito',
                warnings,
                results: {
                    cortes: cortesCount,
                    adescos: adescosCount,
                    participantes: participantesCount,
                },
            };
        });
    }
    async deleteCommunityCorte(corteId) {
        const id = (corteId ?? '').toString().trim();
        if (!id) {
            throw new Error('ID de corte inválido.');
        }
        const corte = await this.entityManager.query(`SELECT id FROM cortes_comunitarios WHERE id = ? LIMIT 1`, [id]);
        if (!corte || corte.length === 0) {
            return { success: false, message: 'Corte no encontrado' };
        }
        await this.entityManager.transaction(async (transactionalEntityManager) => {
            await transactionalEntityManager.query(`DELETE ap
         FROM adescos_participantes ap
         INNER JOIN adescos a ON ap.adesco_id = a.id
         WHERE a.corte_id = ?`, [id]);
            await transactionalEntityManager.query(`DELETE FROM adescos WHERE corte_id = ?`, [id]);
            await transactionalEntityManager.query(`DELETE FROM cortes_comunitarios WHERE id = ?`, [id]);
        });
        return { success: true, message: 'Corte formativo eliminado correctamente' };
    }
    async getFisParticipants(year) {
        let incubadoraQuery = `
      SELECT 
        id,
        año as year,
        programa as program,
        sede as campus,
        nombre as name,
        genero as gender,
        edad as age,
        nombre_emprendimiento as ventureName,
        departamento as department,
        estado as status,
        observaciones as observations,
        'incubadora' as source,
        NULL as projectId
      FROM participantes_incubadora
      WHERE 1=1
    `;
        const incubadoraParams = [];
        if (year) {
            incubadoraQuery += ` AND año = ?`;
            incubadoraParams.push(year);
        }
        incubadoraQuery += ` ORDER BY año DESC, created_at DESC`;
        const incubadoraResults = await this.entityManager.query(incubadoraQuery, incubadoraParams);
        let trainingQuery = `
      SELECT 
        pf.id,
        e.año as year,
        'Incubadora FGK' as program,
        NULL as campus,
        pf.nombre as name,
        pf.genero as gender,
        pf.edad as age,
        p.nombre_proyecto as ventureName,
        pf.departamento as department,
        pf.estado_formacion as status,
        NULL as observations,
        'training' as source,
        p.id as projectId
      FROM participantes_formacion pf
      INNER JOIN proyectos p ON pf.proyecto_id = p.id OR pf.proyecto_id = SUBSTRING_INDEX(p.id, '-', 1)
      INNER JOIN ediciones e ON p.edicion_id = e.id
      INNER JOIN organizaciones o ON p.organizacion_id = o.id
      WHERE o.categoria = 'FIS'
    `;
        const trainingParams = [];
        if (year) {
            trainingQuery += ` AND e.año = ?`;
            trainingParams.push(year);
        }
        trainingQuery += ` ORDER BY e.año DESC, pf.fecha_inscripcion DESC`;
        const trainingResults = await this.entityManager.query(trainingQuery, trainingParams);
        return [...incubadoraResults, ...trainingResults]
            .map(row => ({
            id: row.id,
            year: row.year,
            program: row.program,
            campus: row.campus || undefined,
            name: row.name,
            gender: row.gender,
            age: row.age,
            ventureName: row.ventureName,
            department: row.department,
            status: row.status,
            observations: row.observations,
            source: row.source,
            projectId: row.projectId || undefined,
        }))
            .sort((a, b) => (b.year || 0) - (a.year || 0));
    }
    async replaceFisParticipants(participants, userId) {
        const list = Array.isArray(participants) ? participants : [];
        console.log(`ðŸ§© Actualizando ${list.length} participantes de Emprendimiento Social por usuario ${userId ?? 'sistema'}`);
        return this.entityManager.transaction(async (transactionalEntityManager) => {
            await transactionalEntityManager.query(`DELETE FROM participantes_incubadora`);
            const trainingProjectIds = Array.from(new Set(list
                .filter(participant => participant?.source === 'training' && participant?.projectId)
                .map(participant => participant.projectId.toString().trim())));
            if (trainingProjectIds.length > 0) {
                const placeholders = trainingProjectIds.map(() => '?').join(',');
                await transactionalEntityManager.query(`DELETE FROM participantes_formacion WHERE proyecto_id IN (${placeholders})`, trainingProjectIds);
            }
            let inserted = 0;
            for (const participant of list) {
                inserted++;
                const year = parseInt(participant.year, 10) || new Date().getFullYear();
                const id = (participant.id ?? '').toString().trim() || `fis-${year}-${String(inserted).padStart(2, '0')}`;
                const program = participant.program || 'Incubadora FGK';
                const name = participant.name || 'Sin nombre';
                const gender = participant.gender === 'F' ? 'F' : 'M';
                const age = participant.age !== undefined && participant.age !== null && participant.age !== ''
                    ? parseInt(participant.age, 10)
                    : null;
                const ventureName = participant.ventureName || 'Sin emprendimiento';
                const department = participant.department || 'San Salvador';
                const status = participant.status || 'inscrito';
                const observations = participant.observations || null;
                if (participant?.source === 'training' && participant?.projectId) {
                    await transactionalEntityManager.query(`INSERT INTO participantes_formacion (id, proyecto_id, nombre, edad, genero, telefono, email, rol_cargo, estado_formacion, departamento, municipio, fecha_inscripcion)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
               proyecto_id = VALUES(proyecto_id),
               nombre = VALUES(nombre),
               edad = VALUES(edad),
               genero = VALUES(genero),
               telefono = VALUES(telefono),
               email = VALUES(email),
               rol_cargo = VALUES(rol_cargo),
               estado_formacion = VALUES(estado_formacion),
               departamento = VALUES(departamento),
               municipio = VALUES(municipio)`, [
                        id,
                        participant.projectId.toString().trim(),
                        name,
                        age,
                        gender,
                        participant.phone || null,
                        participant.email || null,
                        participant.role || null,
                        status === 'graduado' ? 'graduado' : status === 'en formacion' || status === 'en_formacion' ? 'en_formacion' : 'inscrito',
                        department,
                        participant.municipality || null,
                    ]);
                }
                else {
                    await transactionalEntityManager.query(`INSERT INTO participantes_incubadora (id, año, programa, sede, nombre, genero, edad, nombre_emprendimiento, departamento, estado, observaciones, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
               año = VALUES(año),
               programa = VALUES(programa),
               sede = VALUES(sede),
               nombre = VALUES(nombre),
               genero = VALUES(genero),
               edad = VALUES(edad),
               nombre_emprendimiento = VALUES(nombre_emprendimiento),
               departamento = VALUES(departamento),
               estado = VALUES(estado),
               observaciones = VALUES(observaciones)`, [
                        id,
                        year,
                        program,
                        participant.campus || 'Central',
                        name,
                        gender,
                        age,
                        ventureName,
                        department,
                        status,
                        observations,
                    ]);
                }
            }
            return {
                success: true,
                message: 'Participantes de Emprendimiento Social actualizados correctamente',
                total: inserted,
            };
        });
    }
    async deleteFisParticipant(participantId, userId) {
        const id = (participantId ?? '').toString().trim();
        if (!id) {
            throw new Error('ID de participante inválido.');
        }
        console.log(`ðŸ—‘ï¸ Eliminando participante de Emprendimiento Social ${id} por usuario ${userId ?? 'sistema'}`);
        const incubadoraExisting = await this.entityManager.query(`SELECT id FROM participantes_incubadora WHERE id = ?`, [id]);
        const trainingExisting = await this.entityManager.query(`SELECT pf.id, pf.proyecto_id
       FROM participantes_formacion pf
       INNER JOIN proyectos p ON pf.proyecto_id = p.id OR pf.proyecto_id = SUBSTRING_INDEX(p.id, '-', 1)
       INNER JOIN organizaciones o ON p.organizacion_id = o.id
       WHERE pf.id = ? AND o.categoria = 'FIS'`, [id]);
        if (incubadoraExisting.length === 0 && trainingExisting.length === 0) {
            return { success: false, message: 'Participante no encontrado' };
        }
        if (incubadoraExisting.length > 0) {
            await this.entityManager.query(`DELETE FROM participantes_incubadora WHERE id = ?`, [id]);
        }
        if (trainingExisting.length > 0) {
            await this.entityManager.query(`DELETE FROM participantes_formacion WHERE id = ?`, [id]);
        }
        return { success: true, message: 'Participante eliminado correctamente' };
    }
    async getDepartamentos() {
        const result = await this.entityManager.query(`SELECT DISTINCT departamento FROM referencias_geograficas ORDER BY departamento`);
        return result.map(r => r.departamento);
    }
    async getMunicipios(departamento) {
        const result = await this.entityManager.query(`SELECT DISTINCT municipio FROM referencias_geograficas 
         WHERE departamento = ? ORDER BY municipio`, [departamento]);
        return result.map(r => r.municipio);
    }
    async getDistritos(departamento, municipio) {
        const result = await this.entityManager.query(`SELECT DISTINCT distrito FROM referencias_geograficas 
         WHERE departamento = ? AND municipio = ? ORDER BY distrito`, [departamento, municipio]);
        return result.map(r => r.distrito);
    }
    async getTextos(categoria) {
        let query = `SELECT categoria, clave, valor FROM textos_editables`;
        const params = [];
        if (categoria) {
            query += ` WHERE categoria = ?`;
            params.push(categoria);
        }
        const results = await this.entityManager.query(query, params);
        const textos = {};
        for (const row of results) {
            textos[`${row.categoria}.${row.clave}`] = row.valor;
        }
        return textos;
    }
    async updateTexto(categoria, clave, valor, usuarioId) {
        await this.entityManager.query(`INSERT INTO textos_editables (categoria, clave, valor, actualizado_por, actualizado_en)
         VALUES (?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE 
            valor = VALUES(valor),
            actualizado_por = VALUES(actualizado_por),
            actualizado_en = NOW()`, [categoria, clave, valor, usuarioId]);
        return { success: true, message: 'Texto actualizado correctamente' };
    }
    async getAvailableYears() {
        const editionYears = await this.entityManager.query(`SELECT DISTINCT año FROM ediciones WHERE año BETWEEN 2009 AND 2100`);
        const projectYears = await this.entityManager.query(`SELECT DISTINCT e.año
         FROM proyectos p
         JOIN ediciones e ON p.edicion_id = e.id
         WHERE e.año BETWEEN 2009 AND 2100`);
        const years = new Set();
        for (const row of editionYears)
            years.add(parseInt(row.año, 10));
        for (const row of projectYears)
            years.add(parseInt(row.año, 10));
        return Array.from(years)
            .filter(year => !Number.isNaN(year))
            .sort((a, b) => a - b);
    }
    async createEdition(year, status = 'ABIERTA') {
        const exists = await this.entityManager.query(`SELECT id FROM ediciones WHERE año = ?`, [year]);
        if (exists.length > 0) {
            throw new Error(`La edición ${year} ya existe en el sistema.`);
        }
        const maxYearResult = await this.entityManager.query(`SELECT MAX(año) AS maxYear FROM ediciones`);
        const maxYear = maxYearResult?.[0]?.maxYear ? parseInt(maxYearResult[0].maxYear, 10) : null;
        const shouldBeCurrent = maxYear === null || year >= maxYear;
        if (shouldBeCurrent) {
            await this.entityManager.query(`UPDATE ediciones SET es_actual = FALSE`);
        }
        await this.entityManager.query(`INSERT INTO ediciones (año, estado, es_actual)
         VALUES (?, ?, ?)`, [year, status, shouldBeCurrent]);
        return { success: true, message: `Edición ${year} creada correctamente.` };
    }
    async deleteEdition(year) {
        const exists = await this.entityManager.query(`SELECT id FROM ediciones WHERE año = ?`, [year]);
        if (exists.length === 0) {
            throw new Error(`La edición ${year} no existe en el sistema.`);
        }
        const edicionId = exists[0].id;
        await this.entityManager.query(`DELETE FROM proyectos WHERE edicion_id = ?`, [edicionId]);
        await this.entityManager.query(`DELETE FROM ediciones WHERE id = ?`, [edicionId]);
        const remainingLatestEdition = await this.entityManager.query(`SELECT id FROM ediciones ORDER BY año DESC LIMIT 1`);
        if (remainingLatestEdition.length > 0) {
            await this.entityManager.query(`UPDATE ediciones SET es_actual = FALSE`);
            await this.entityManager.query(`UPDATE ediciones SET es_actual = TRUE WHERE id = ?`, [remainingLatestEdition[0].id]);
        }
        return { success: true, message: `Edición ${year} y todos sus datos eliminados correctamente.` };
    }
    async getGeoData(year) {
        let joinEdicion = '';
        let whereClause = '';
        const params = [];
        if (year) {
            joinEdicion = 'JOIN ediciones e ON p.edicion_id = e.id';
            whereClause = 'WHERE e.año = ?';
            params.push(year);
        }
        const query = `
        SELECT 
            p.departamento,
            p.municipio,
            p.distrito,
            COUNT(p.id) as total_proyectos,
            SUM(p.monto_fgk) as total_inversion,
            SUM(p.beneficiarios_directos) as total_beneficiarios
        FROM proyectos p
        ${joinEdicion}
        ${whereClause}
        GROUP BY p.departamento, p.municipio, p.distrito
    `;
        const results = await this.entityManager.query(query, params);
        const geoData = [];
        for (const row of results) {
            const coords = await this.entityManager.query(`SELECT latitud, longitud FROM referencias_geograficas 
             WHERE departamento = ? AND municipio = ? AND distrito = ?
             LIMIT 1`, [row.departamento, row.municipio, row.distrito]);
            geoData.push({
                ...row,
                latitud: coords[0]?.latitud || null,
                longitud: coords[0]?.longitud || null
            });
        }
        return geoData;
    }
    async getStatsByDepartamento(year) {
        let joinEdicion = '';
        let whereClause = '';
        const params = [];
        if (year) {
            joinEdicion = 'JOIN ediciones e ON p.edicion_id = e.id';
            whereClause = 'WHERE e.año = ?';
            params.push(year);
        }
        const query = `
        SELECT 
            p.departamento,
            COUNT(p.id) as total_proyectos,
            SUM(p.monto_fgk) as inversion_fgk,
            SUM(p.monto_aliados) as inversion_aliados,
            SUM(p.contrapartida_org) as contrapartida,
            SUM(p.beneficiarios_directos) as beneficiarios
        FROM proyectos p
        JOIN organizaciones o ON p.organizacion_id = o.id
        ${joinEdicion}
        ${whereClause || 'WHERE 1=1'}
        AND (o.categoria = 'Community' OR LOWER(o.categoria) LIKE '%comunitario%')
        GROUP BY p.departamento
        ORDER BY inversion_fgk DESC
    `;
        return this.entityManager.query(query, params);
    }
    async compareYears(years) {
        const results = [];
        for (const year of years) {
            const data = await this.getGlobalData(year);
            const categories = await this.getCategoriesData(year);
            const formative = await this.getFormativeData(year);
            results.push({
                year,
                financials: data.financials,
                impact: data.impact,
                categories,
                formative
            });
        }
        return results;
    }
    async getCommunityCounterpart(projectId) {
        const result = await this.entityManager.query(`SELECT contrapartida_org as laborAmount, 0 as materialsAmount 
         FROM proyectos WHERE id = ?`, [projectId]);
        return result[0] || { laborAmount: 0, materialsAmount: 0 };
    }
    async updateCommunityCounterpart(projectId, data, usuarioId) {
        const totalCounterpart = data.laborAmount + data.materialsAmount;
        await this.entityManager.query(`UPDATE proyectos SET contrapartida_org = ?, updated_at = NOW() WHERE id = ?`, [totalCounterpart, projectId]);
        return {
            success: true,
            message: 'Contrapartida comunal actualizada correctamente',
            data: { laborAmount: data.laborAmount, materialsAmount: data.materialsAmount, total: totalCounterpart }
        };
    }
    async updateFinancials(data) {
        try {
            await this.entityManager.query(`
        INSERT INTO configuracion_manual (seccion, campo, valor, actualizado_en)
        VALUES ('financials', 'fgk', ?, NOW()),
               ('financials', 'aliados', ?, NOW()),
               ('financials', 'contrapartida', ?, NOW())
        ON DUPLICATE KEY UPDATE 
          valor = VALUES(valor),
          actualizado_en = NOW()
      `, [data.fgk.toString(), data.aliados.toString(), data.contrapartida.toString()]);
            return { success: true, message: 'Datos financieros actualizados correctamente', data };
        }
        catch (error) {
            console.log('Actualizando financials (simulado):', data);
            return { success: true, message: 'Datos financieros actualizados (simulado)', data };
        }
    }
    async updateCategories(data) {
        console.log('Actualizando categorías...');
        try {
            const queries = [];
            const params = [];
            for (const cat of ['ong', 'community', 'fis']) {
                if (data[cat]) {
                    queries.push(`('categories_${cat}', 'investment', ?, NOW())`);
                    params.push((data[cat].investment || 0).toString());
                    if (cat === 'fis') {
                        queries.push(`('categories_${cat}', 'ventures', ?, NOW())`);
                        params.push((data[cat].ventures || data[cat].orgs || 0).toString());
                    }
                    else {
                        queries.push(`('categories_${cat}', 'orgs', ?, NOW())`);
                        params.push((data[cat].orgs || 0).toString());
                    }
                    queries.push(`('categories_${cat}', 'projects', ?, NOW())`);
                    params.push((data[cat].projects || 0).toString());
                }
            }
            if (queries.length > 0) {
                await this.entityManager.query(`
          INSERT INTO configuracion_manual (seccion, campo, valor, actualizado_en)
          VALUES ${queries.join(', ')}
          ON DUPLICATE KEY UPDATE valor = VALUES(valor), actualizado_en = NOW()
        `, params);
            }
            return { success: true, message: 'Categorías actualizadas correctamente', data };
        }
        catch (e) {
            console.log('Tabla configuracion_manual simulada.');
            return { success: true, message: 'Categorías actualizadas (Simulado)', data };
        }
    }
    async updateFormative(data) {
        try {
            const queries = [];
            const params = [];
            if (data.byCategory) {
                for (const cat of ['ong', 'community', 'fis']) {
                    if (data.byCategory[cat]) {
                        queries.push(`('formative_category', '${cat}_enrolled', ?, NOW())`);
                        params.push((data.byCategory[cat].enrolled || 0).toString());
                        queries.push(`('formative_category', '${cat}_graduated', ?, NOW())`);
                        params.push((data.byCategory[cat].graduated || 0).toString());
                    }
                }
            }
            if (data.byGender) {
                queries.push(`('formative_gender', 'M', ?, NOW())`);
                params.push((data.byGender.M || 0).toString());
                queries.push(`('formative_gender', 'F', ?, NOW())`);
                params.push((data.byGender.F || 0).toString());
            }
            if (queries.length > 0) {
                await this.entityManager.query(`
          INSERT INTO configuracion_manual (seccion, campo, valor, actualizado_en)
          VALUES ${queries.join(', ')}
          ON DUPLICATE KEY UPDATE valor = VALUES(valor), actualizado_en = NOW()
        `, params);
            }
            return { success: true, message: 'Datos formativos actualizados correctamente', data };
        }
        catch (e) {
            return { success: true, message: 'Formato actualizado (Simulado)', data };
        }
    }
    async updateCurrentEdition(data) {
        console.log('Actualizando edición vigente 2025:', JSON.stringify(data, null, 2));
        try {
            await this.entityManager.query(`
        INSERT INTO configuracion_manual (seccion, campo, valor, actualizado_en)
        VALUES ('current_edition', 'ong_count', ?, NOW()),
               ('current_edition', 'ong_investment', ?, NOW()),
               ('current_edition', 'fis_count', ?, NOW()),
               ('current_edition', 'fis_investment', ?, NOW()),
               ('current_edition', 'community_count', ?, NOW()),
               ('current_edition', 'community_investment', ?, NOW())
        ON DUPLICATE KEY UPDATE 
          valor = VALUES(valor),
          actualizado_en = NOW()
      `, [
                data.ong.count.toString(),
                data.ong.investment.toString(),
                data.fis.count.toString(),
                data.fis.investment.toString(),
                data.community.count.toString(),
                data.community.investment.toString()
            ]);
        }
        catch (error) {
            console.log('Tabla configuracion_manual no existe, solo logueando');
        }
        return { success: true, message: 'Edición vigente actualizada correctamente', data };
    }
    async getTextContent() {
        try {
            const texts = await this.entityManager.query(`SELECT seccion, campo, valor FROM configuracion_manual WHERE seccion LIKE 'text_%' ORDER BY actualizado_en ASC`);
            const textContent = {};
            for (const row of texts) {
                const cat = row.seccion.replace('text_', '');
                textContent[`${cat}.${row.campo}`] = row.valor;
            }
            return textContent;
        }
        catch (e) {
            return {};
        }
    }
    async updateTextContent(category, key, value) {
        try {
            await this.entityManager.query(`
        INSERT INTO configuracion_manual (seccion, campo, valor, actualizado_en)
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE valor = VALUES(valor), actualizado_en = NOW()
      `, [`text_${category}`, key, value]);
            return { success: true, message: 'Texto actualizado' };
        }
        catch (e) {
            return { success: true, message: 'Texto simulado', simulated: true };
        }
    }
    async getEditions() {
        return this.entityManager.query(`SELECT id, año as year, estado as status, es_actual as isCurrent FROM ediciones ORDER BY año DESC`);
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectEntityManager)()),
    __metadata("design:paramtypes", [typeorm_2.EntityManager])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map