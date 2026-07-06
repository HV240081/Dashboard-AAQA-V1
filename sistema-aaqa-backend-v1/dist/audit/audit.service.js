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
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const XLSX = __importStar(require("xlsx"));
let AuditService = class AuditService {
    entityManager;
    constructor(entityManager) {
        this.entityManager = entityManager;
    }
    async getLogs(filters) {
        let query = `
      SELECT
        bc.id,
        bc.usuario_id as usuarioId,
        u.nombre as usuarioNombre,
        u.apellido as usuarioApellido,
        u.email as usuarioEmail,
        bc.tabla_afectada as tabla,
        bc.registro_id as registroId,
        bc.campo_modificado as campo,
        bc.valor_anterior as valorAnterior,
        bc.valor_nuevo as valorNuevo,
        bc.accion,
        bc.ip_origen as ip,
        bc.created_at as fecha
      FROM bitacora_cambios bc
      LEFT JOIN usuarios u ON bc.usuario_id = u.id
      WHERE 1=1
    `;
        const params = [];
        if (filters.tabla) {
            query += ` AND bc.tabla_afectada = ?`;
            params.push(filters.tabla);
        }
        if (filters.registroId) {
            query += ` AND bc.registro_id = ?`;
            params.push(filters.registroId);
        }
        if (filters.usuarioId) {
            query += ` AND bc.usuario_id = ?`;
            params.push(filters.usuarioId);
        }
        query += ` ORDER BY bc.created_at DESC LIMIT ? OFFSET ?`;
        params.push(filters.limit || 20);
        params.push(filters.offset || 0);
        const logs = await this.entityManager.query(query, params);
        const countQuery = `
      SELECT COUNT(*) as total FROM bitacora_cambios bc
      WHERE 1=1
      ${filters.tabla ? ' AND bc.tabla_afectada = ?' : ''}
      ${filters.registroId ? ' AND bc.registro_id = ?' : ''}
      ${filters.usuarioId ? ' AND bc.usuario_id = ?' : ''}
    `;
        const countParams = [];
        if (filters.tabla)
            countParams.push(filters.tabla);
        if (filters.registroId)
            countParams.push(filters.registroId);
        if (filters.usuarioId)
            countParams.push(filters.usuarioId);
        const countResult = await this.entityManager.query(countQuery, countParams);
        const total = countResult[0]?.total || 0;
        return {
            logs: await this.enrichLogs(logs),
            total,
            limit: filters.limit || 20,
            offset: filters.offset || 0,
        };
    }
    async getStats() {
        const query = `
      SELECT
        tabla_afectada as tabla,
        COUNT(*) as total,
        COUNT(DISTINCT usuario_id) as usuarios,
        DATE_FORMAT(MAX(created_at), '%d/%m/%Y') as fecha
      FROM bitacora_cambios
      GROUP BY tabla_afectada, DATE(created_at)
      ORDER BY MAX(created_at) DESC
      LIMIT 30
    `;
        return this.entityManager.query(query);
    }
    async registrarCambio(data) {
        await this.entityManager.query(`INSERT INTO bitacora_cambios (id, usuario_id, tabla_afectada, registro_id, campo_modificado, valor_anterior, valor_nuevo, accion, ip_origen, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`, [
            `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            data.usuarioId || null,
            data.tabla,
            data.registroId,
            data.campo,
            data.valorAnterior !== undefined ? JSON.stringify(data.valorAnterior) : null,
            data.valorNuevo !== undefined ? JSON.stringify(data.valorNuevo) : null,
            data.accion,
            data.ip || null,
        ]);
    }
    async deleteLog(id) {
        const result = await this.entityManager.query(`DELETE FROM bitacora_cambios WHERE id = ?`, [id]);
        const affectedRows = Number(result?.affectedRows || 0);
        if (affectedRows === 0) {
            throw new common_1.NotFoundException('El registro de bitacora no existe o ya fue eliminado.');
        }
        return { success: true, message: 'Registro de bitacora eliminado correctamente.' };
    }
    async deleteAllLogs() {
        const result = await this.entityManager.query(`DELETE FROM bitacora_cambios`);
        return {
            success: true,
            deleted: Number(result?.affectedRows || 0),
            message: 'Bitacora limpiada correctamente.',
        };
    }
    async exportExcel(filters) {
        const data = await this.getLogs({
            ...filters,
            limit: 10000,
            offset: 0,
        });
        const generatedAt = new Intl.DateTimeFormat('es-SV', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date());
        const rows = data.logs.map((log) => ({
            Fecha: new Intl.DateTimeFormat('es-SV', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            }).format(new Date(log.fecha)),
            Accion: log.accionLabel || this.getActionLabel(log.accion),
            Area: log.tablaLabel || this.normalizeTable(log.tabla),
            Registro: log.registroNombre || log.registroId,
            Descripcion: log.descripcion || '',
            'Campo Modificado': this.prettyFieldName(log.campo || 'todo'),
            'Valor Anterior': this.formatAuditValue(log.valorAnteriorParsed ?? this.parseStoredValue(log.valorAnterior)),
            'Valor Nuevo': this.formatAuditValue(log.valorNuevoParsed ?? this.parseStoredValue(log.valorNuevo)),
            Usuario: `${log.usuarioNombre || ''} ${log.usuarioApellido || ''}`.trim(),
            Correo: log.usuarioEmail || '',
        }));
        const wb = XLSX.utils.book_new();
        const headers = [
            'Fecha',
            'Accion',
            'Area',
            'Registro',
            'Descripcion',
            'Campo Modificado',
            'Valor Anterior',
            'Valor Nuevo',
            'Usuario',
            'Correo',
        ];
        const auditSheetData = [
            ['Bitacora de Cambios'],
            ['Historial exportado del sistema AAQA'],
            [`Generado: ${generatedAt}`, `Total de movimientos: ${rows.length}`],
            [],
            headers,
            ...rows.map((row) => headers.map((header) => row[header] ?? '')),
        ];
        const auditSheet = XLSX.utils.aoa_to_sheet(auditSheetData);
        auditSheet['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
        ];
        auditSheet['!cols'] = [
            { wch: 22 },
            { wch: 16 },
            { wch: 24 },
            { wch: 32 },
            { wch: 58 },
            { wch: 26 },
            { wch: 34 },
            { wch: 34 },
            { wch: 28 },
            { wch: 42 },
        ];
        auditSheet['!autofilter'] = {
            ref: `A5:J${Math.max(5, auditSheetData.length)}`,
        };
        auditSheet['!rows'] = [
            { hpt: 28 },
            { hpt: 20 },
            { hpt: 18 },
            { hpt: 8 },
            { hpt: 24 },
        ];
        this.applyAuditSheetStyles(auditSheet, auditSheetData.length, headers.length);
        const summaryRows = this.buildAuditSummaryRows(rows, generatedAt);
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
        summarySheet['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
        ];
        summarySheet['!cols'] = [
            { wch: 30 },
            { wch: 18 },
            { wch: 30 },
            { wch: 18 },
        ];
        this.applyAuditSheetStyles(summarySheet, summaryRows.length, 4);
        XLSX.utils.book_append_sheet(wb, summarySheet, 'Resumen');
        XLSX.utils.book_append_sheet(wb, auditSheet, 'Bitacora');
        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }
    buildAuditSummaryRows(rows, generatedAt) {
        const countBy = (field) => rows.reduce((acc, row) => {
            const key = row[field] || 'Sin dato';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        const actionCounts = countBy('Accion');
        const areaCounts = countBy('Area');
        const maxRows = Math.max(Object.keys(actionCounts).length, Object.keys(areaCounts).length, 1);
        const summary = [
            ['Resumen de Bitacora'],
            ['Vista rapida de movimientos exportados'],
            ['Generado', generatedAt, 'Total de movimientos', rows.length],
            [],
            ['Movimientos por accion', 'Total', 'Movimientos por area', 'Total'],
        ];
        const actions = Object.entries(actionCounts);
        const areas = Object.entries(areaCounts);
        for (let i = 0; i < maxRows; i++) {
            summary.push([
                actions[i]?.[0] || '',
                actions[i]?.[1] || '',
                areas[i]?.[0] || '',
                areas[i]?.[1] || '',
            ]);
        }
        return summary;
    }
    applyAuditSheetStyles(sheet, rowCount, colCount) {
        const darkFill = { patternType: 'solid', fgColor: { rgb: '0F172A' } };
        const blueFill = { patternType: 'solid', fgColor: { rgb: '1D4ED8' } };
        const softFill = { patternType: 'solid', fgColor: { rgb: 'F8FAFC' } };
        const whiteFont = { color: { rgb: 'FFFFFF' }, bold: true };
        const titleFont = { color: { rgb: 'FFFFFF' }, bold: true, sz: 16 };
        const border = {
            top: { style: 'thin', color: { rgb: 'CBD5E1' } },
            bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
            left: { style: 'thin', color: { rgb: 'CBD5E1' } },
            right: { style: 'thin', color: { rgb: 'CBD5E1' } },
        };
        for (let row = 0; row < rowCount; row++) {
            for (let col = 0; col < colCount; col++) {
                const address = XLSX.utils.encode_cell({ r: row, c: col });
                const cell = sheet[address];
                if (!cell)
                    continue;
                cell.s = {
                    alignment: { vertical: 'center', wrapText: true },
                    border,
                };
                if (row === 0) {
                    cell.s = {
                        ...cell.s,
                        fill: darkFill,
                        font: titleFont,
                        alignment: { horizontal: 'center', vertical: 'center' },
                    };
                }
                else if (row === 1) {
                    cell.s = {
                        ...cell.s,
                        fill: darkFill,
                        font: { color: { rgb: 'E2E8F0' }, italic: true },
                        alignment: { horizontal: 'center', vertical: 'center' },
                    };
                }
                else if (row === 4) {
                    cell.s = {
                        ...cell.s,
                        fill: blueFill,
                        font: whiteFont,
                        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                    };
                }
                else if (row > 4 && row % 2 === 1) {
                    cell.s = {
                        ...cell.s,
                        fill: softFill,
                    };
                }
            }
        }
    }
    parseStoredValue(value) {
        if (value === null || value === undefined || value === '')
            return null;
        if (typeof value !== 'string')
            return value;
        try {
            return JSON.parse(value);
        }
        catch {
            return value;
        }
    }
    formatAuditValue(value) {
        if (value === null || value === undefined || value === '')
            return 'Vacío';
        if (typeof value === 'object')
            return JSON.stringify(value);
        return String(value);
    }
    firstText(...values) {
        for (const value of values) {
            const text = (value ?? '').toString().trim();
            if (text)
                return text;
        }
        return '';
    }
    normalizeTable(tabla) {
        const labels = {
            proyectos: 'Proyecto',
            usuarios: 'Usuario',
            roles_personalizados: 'Rol personalizado',
            reportes_mensuales: 'Seguimiento mensual',
            proyecto_actividades: 'Actividad de seguimiento',
            proyecto_mes_observaciones: 'Comentario mensual',
            recursos: 'Recurso del proyecto',
            cargas_masivas: 'Carga masiva',
            cortes_comunitarios: 'Corte formativo',
            adescos: 'ADESCO',
            participantes_formacion: 'Participante',
            participantes_incubadora: 'Participante',
            configuracion_manual: 'Texto editable',
            dashboard_global: 'Configuracion general',
        };
        return labels[tabla] || tabla || 'Registro';
    }
    prettyFieldName(field) {
        const map = {
            todo: 'Movimiento completo',
            nombre: 'Nombre',
            apellido: 'Apellido',
            email: 'Correo',
            rol_id: 'Rol',
            custom_role_id: 'Rol personalizado',
            activo: 'Estado de acceso',
            is_custom: 'Usuario personalizado',
            nombre_proyecto: 'Nombre del proyecto',
            organizacion_id: 'Organizacion',
            edicion_id: 'Edicion',
            estado: 'Estado',
            mes_inicio: 'Mes de inicio',
            mes_final: 'Mes final',
            monto_fgk: 'Inversion FGK',
            contrapartida_org: 'Contrapartida',
            monto_aliados: 'Fondos aliados',
            beneficiarios_directos: 'Beneficiarios directos',
            beneficiarios_indirectos: 'Beneficiarios indirectos',
            meta_financiera: 'Meta financiera',
            estado_cronograma: 'Estado del mes',
            avance_tecnico_real: 'Avance tecnico',
            avance_financiero_real: 'Avance financiero',
            observaciones: 'Observacion',
            fotos: 'Imagenes',
            contacto_1_nombre: 'Contacto 1: nombre',
            contacto_1_cargo: 'Contacto 1: cargo',
            contacto_1_telefono_directo: 'Contacto 1: telefono directo',
            contacto_1_telefono_organizacion: 'Contacto 1: telefono de la organizacion',
            contacto_1_correo: 'Contacto 1: correo',
            contacto_2_nombre: 'Contacto 2: nombre',
            contacto_2_cargo: 'Contacto 2: cargo',
            contacto_2_telefono_directo: 'Contacto 2: telefono directo',
            contacto_2_telefono_organizacion: 'Contacto 2: telefono de la organizacion',
            contacto_2_correo: 'Contacto 2: correo',
        };
        return map[field] || field.replace(/_/g, ' ');
    }
    getNameFromPayload(payload, tabla) {
        if (!payload || typeof payload !== 'object')
            return '';
        const nestedCandidates = [payload.user, payload.usuario, payload.data, payload.result, payload.role, payload.rol]
            .filter((item) => item && typeof item === 'object');
        for (const candidate of nestedCandidates) {
            const nestedName = this.getNameFromPayload(candidate, tabla);
            if (nestedName)
                return nestedName;
        }
        if (tabla === 'usuarios') {
            const fullName = `${payload.nombre || ''} ${payload.apellido || ''}`.trim();
            return this.firstText(fullName, payload.email, payload.correo);
        }
        if (tabla === 'proyectos') {
            return this.firstText(payload.nombre_proyecto, payload.name, payload.projectName, payload.proyecto);
        }
        if (tabla === 'roles_personalizados') {
            return this.firstText(payload.nombre, payload.name);
        }
        if (tabla === 'reportes_mensuales') {
            return this.firstText(payload.projectName, payload.nombre_proyecto, payload.proyecto_id);
        }
        if (tabla === 'recursos') {
            return this.firstText(payload.projectName, payload.project, payload.originalName, payload.url, payload.resourceType);
        }
        if (tabla === 'cargas_masivas') {
            return this.firstText(payload.category, payload.area, payload.fileName, payload.message);
        }
        if (tabla === 'cortes_comunitarios') {
            return this.firstText(payload.nombre, payload.name, payload.nombre_corte);
        }
        if (tabla === 'adescos') {
            return this.firstText(payload.nombre, payload.name, payload.nombre_adesco);
        }
        return this.firstText(payload.nombre, payload.name, payload.titulo, payload.label);
    }
    async resolveRegistryName(row, previousValue, newValue) {
        const payloadName = this.getNameFromPayload(newValue, row.tabla) || this.getNameFromPayload(previousValue, row.tabla);
        if (payloadName)
            return payloadName;
        try {
            if (row.tabla === 'proyectos') {
                const rows = await this.entityManager.query(`SELECT nombre_proyecto FROM proyectos WHERE id = ? LIMIT 1`, [row.registroId]);
                return rows[0]?.nombre_proyecto || row.registroId;
            }
            if (row.tabla === 'usuarios' && /^\d+$/.test(String(row.registroId))) {
                const rows = await this.entityManager.query(`SELECT nombre, apellido, email FROM usuarios WHERE id = ? LIMIT 1`, [row.registroId]);
                if (rows.length)
                    return `${rows[0].nombre || ''} ${rows[0].apellido || ''}`.trim() || rows[0].email || row.registroId;
                const auditRows = await this.entityManager.query(`SELECT valor_anterior as valorAnterior, valor_nuevo as valorNuevo
           FROM bitacora_cambios
           WHERE tabla_afectada = 'usuarios'
             AND registro_id = ?
             AND (valor_anterior IS NOT NULL OR valor_nuevo IS NOT NULL)
           ORDER BY created_at DESC
           LIMIT 20`, [row.registroId]);
                for (const auditRow of auditRows) {
                    const historicalName = this.getNameFromPayload(this.parseStoredValue(auditRow.valorNuevo), 'usuarios')
                        || this.getNameFromPayload(this.parseStoredValue(auditRow.valorAnterior), 'usuarios');
                    if (historicalName)
                        return historicalName;
                }
                return `Usuario no disponible (ID ${row.registroId})`;
            }
            if (row.tabla === 'roles_personalizados' && /^\d+$/.test(String(row.registroId))) {
                const rows = await this.entityManager.query(`SELECT nombre FROM roles_personalizados WHERE id = ? LIMIT 1`, [row.registroId]);
                return rows[0]?.nombre || row.registroId;
            }
            if (row.tabla === 'reportes_mensuales') {
                const rows = await this.entityManager.query(`SELECT p.nombre_proyecto, rm.mes, COALESCE(rm.anio, rm.año) as anio
           FROM reportes_mensuales rm
           LEFT JOIN proyectos p ON p.id = rm.proyecto_id
           WHERE rm.id = ? LIMIT 1`, [row.registroId]);
                if (rows.length) {
                    const project = rows[0].nombre_proyecto || row.registroId;
                    return `${project}${rows[0].mes ? ` - mes ${rows[0].mes}` : ''}${rows[0].anio ? `/${rows[0].anio}` : ''}`;
                }
            }
        }
        catch {
        }
        return row.registroId || this.normalizeTable(row.tabla);
    }
    getActionLabel(action) {
        if (action === 'INSERT')
            return 'Creación';
        if (action === 'UPDATE')
            return 'Actualización';
        if (action === 'DELETE')
            return 'Eliminación';
        return 'Cambio';
    }
    buildDescription(row, registryName, detailsCount) {
        const target = this.normalizeTable(row.tabla).toLowerCase();
        if (row.accion === 'INSERT') {
            if (row.tabla === 'reportes_mensuales')
                return `Se registró seguimiento mensual para ${registryName}.`;
            if (row.tabla === 'proyecto_actividades')
                return `Se agregó una actividad de seguimiento en ${registryName}.`;
            if (row.tabla === 'recursos')
                return `Se agregó un recurso al proyecto: ${registryName}.`;
            if (row.tabla === 'cargas_masivas')
                return `Se procesó una carga masiva: ${registryName}.`;
            return `Se creó ${target}: ${registryName}.`;
        }
        if (row.accion === 'DELETE') {
            if (row.tabla === 'recursos')
                return `Se eliminó un recurso del proyecto: ${registryName}.`;
            return `Se eliminó ${target}: ${registryName}.`;
        }
        if (row.tabla === 'reportes_mensuales')
            return `Se actualizó el seguimiento mensual de ${registryName}.`;
        if (row.tabla === 'configuracion_manual')
            return `Se actualizó un texto visible del sistema.`;
        if (detailsCount > 0)
            return `Se actualizó ${target}: ${registryName}.`;
        return `Se registró una actualización en ${target}: ${registryName}.`;
    }
    async enrichLogs(logs) {
        const enriched = [];
        for (const log of logs) {
            const parsedPrevious = this.parseStoredValue(log.valorAnterior);
            const parsedNew = this.parseStoredValue(log.valorNuevo);
            const registryName = await this.resolveRegistryName(log, parsedPrevious, parsedNew);
            const detailsCount = log.campo && log.campo !== 'todo' ? 1 : 0;
            enriched.push({
                ...log,
                valorAnteriorParsed: parsedPrevious,
                valorNuevoParsed: parsedNew,
                accionLabel: this.getActionLabel(log.accion),
                tablaLabel: this.normalizeTable(log.tabla),
                campoLabel: this.prettyFieldName(log.campo || 'todo'),
                registroNombre: registryName,
                descripcion: this.buildDescription(log, registryName, detailsCount),
            });
        }
        return enriched;
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectEntityManager)()),
    __metadata("design:paramtypes", [typeorm_2.EntityManager])
], AuditService);
//# sourceMappingURL=audit.service.js.map