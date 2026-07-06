import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
  FileText,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useData } from '../contexts/useData';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  proyectoId?: string;
  userData?: any;
}

type AuditLog = {
  id: number | string;
  accion: string;
  accionLabel?: string;
  tabla: string;
  tablaLabel?: string;
  registroId: string;
  registroNombre?: string;
  descripcion?: string;
  fecha: string;
  usuarioNombre?: string;
  usuarioApellido?: string;
  usuarioEmail?: string;
  ip?: string;
  campo?: string;
  campoLabel?: string;
  valorAnterior?: any;
  valorNuevo?: any;
  valorAnteriorParsed?: any;
  valorNuevoParsed?: any;
};

type AuditGroup = {
  key: string;
  ids: Array<number | string>;
  accion: string;
  accionLabel?: string;
  tabla: string;
  tablaLabel?: string;
  registroId: string;
  registroNombre?: string;
  descripcion?: string;
  fecha: string;
  usuarioNombre?: string;
  usuarioApellido?: string;
  usuarioEmail?: string;
  ip?: string;
  payload?: any;
  detalles: Array<{
    campo: string;
    campoLabel?: string;
    valorAnterior: any;
    valorNuevo: any;
  }>;
};

const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose, proyectoId, userData }) => {
  const { data } = useData();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const limit = 20;

  const canViewAudit =
    userData?.canEditAll ||
    userData?.roles?.includes('ADMIN_General') ||
    userData?.roles?.includes('GERENTE');

  const formatAuditDate = (value: string) => {
    if (!value) return 'Sin fecha';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat('es-SV', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(parsed);
  };

  useEffect(() => {
    if (isOpen && canViewAudit) {
      loadLogs();
      loadStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, proyectoId, page]);

  const requestJson = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || 'No se pudo completar la acción.');
    }
    return payload;
  };

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      let url = 'http://localhost:3000/audit/logs';
      const params = new URLSearchParams();
      if (proyectoId) params.append('registroId', proyectoId);
      params.append('limit', limit.toString());
      params.append('offset', ((page - 1) * limit).toString());
      url += `?${params.toString()}`;

      const response = await requestJson(url);
      setLogs(response.logs || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await requestJson('http://localhost:3000/audit/stats');
      setStats(response || []);
    } catch (error) {
      console.error('Error loading audit stats:', error);
    }
  };

  const refreshAudit = async () => {
    await loadLogs();
    await loadStats();
  };

  const handleExportExcel = async () => {
    try {
      const token = localStorage.getItem('access_token');
      let url = 'http://localhost:3000/audit/export/excel';
      const params = new URLSearchParams();
      if (proyectoId) params.append('registroId', proyectoId);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await response.blob();
      const urlBlob = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlBlob;
      a.download = `auditoria_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(urlBlob);
    } catch (error) {
      console.error('Error al exportar:', error);
    }
  };

  const handleDeleteGroup = async (log: AuditGroup) => {
    const label = log.registroNombre || log.registroId || 'este registro';
    const confirmed = window.confirm(`¿Deseas eliminar de la bitácora el movimiento de "${label}"?`);
    if (!confirmed) return;

    try {
      for (const id of log.ids) {
        await requestJson(`http://localhost:3000/audit/logs/${id}`, { method: 'DELETE' });
      }
      const newPage = page > 1 && logs.length <= log.ids.length ? page - 1 : page;
      if (newPage !== page) setPage(newPage);
      else await refreshAudit();
    } catch (error: any) {
      alert(error?.message || 'No se pudo eliminar el registro de bitácora.');
    }
  };

  const handleDeleteAll = async () => {
    const confirmed = window.confirm('¿Deseas eliminar todos los registros de la bitácora? Esta acción solo limpia el historial, no elimina proyectos ni usuarios.');
    if (!confirmed) return;

    try {
      await requestJson('http://localhost:3000/audit/logs', { method: 'DELETE' });
      setPage(1);
      setLogs([]);
      setTotal(0);
      setStats([]);
      await refreshAudit();
    } catch (error: any) {
      alert(error?.message || 'No se pudo limpiar la bitácora.');
    }
  };

  const getAccionColor = (accion: string) => {
    switch (accion) {
      case 'INSERT':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'DELETE':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getAccionLabel = (accion: string, label?: string) => {
    if (label) return label;
    switch (accion) {
      case 'INSERT':
        return 'Creación';
      case 'UPDATE':
        return 'Actualización';
      case 'DELETE':
        return 'Eliminación';
      default:
        return 'Cambio';
    }
  };

  const getTableLabel = (tabla: string, label?: string) => {
    if (label) return label;
    switch (tabla) {
      case 'proyectos':
        return 'Proyecto';
      case 'usuarios':
        return 'Usuario';
      case 'roles_personalizados':
        return 'Rol personalizado';
      case 'reportes_mensuales':
        return 'Seguimiento mensual';
      case 'recursos':
        return 'Recurso del proyecto';
      case 'cargas_masivas':
        return 'Carga masiva';
      case 'participantes_formacion':
        return 'Participante';
      case 'cortes_comunitarios':
        return 'Corte formativo';
      case 'adescos':
        return 'ADESCO';
      default:
        return tabla || 'Registro';
    }
  };

  const prettyFieldName = (field: string, label?: string) => {
    if (label) return label;
    const map: Record<string, string> = {
      todo: 'Movimiento completo',
      nombre: 'Nombre',
      apellido: 'Apellido',
      email: 'Correo',
      estado: 'Estado',
      activo: 'Estado de acceso',
      nombre_proyecto: 'Nombre del proyecto',
      mes_inicio: 'Mes de inicio',
      mes_final: 'Mes final',
      monto_fgk: 'Inversión FGK',
      contrapartida_org: 'Contrapartida',
      monto_aliados: 'Fondos aliados',
      meta_financiera: 'Meta financiera',
      estado_cronograma: 'Estado del mes',
      avance_tecnico_real: 'Avance técnico',
      avance_financiero_real: 'Avance financiero',
      observaciones: 'Observación',
    };
    return map[field] || field.replace(/_/g, ' ');
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined || value === '') return 'Vacío';
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (['null', 'undefined', '""'].includes(trimmed.toLowerCase())) return 'Vacío';
      if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      ) {
        try {
          return formatValue(JSON.parse(trimmed));
        } catch {
          // Si no es JSON válido, se muestra tal como viene.
        }
      }
      const maybeDate = new Date(value);
      if (!Number.isNaN(maybeDate.getTime()) && /GMT|T\d{2}:\d{2}:\d{2}/.test(value)) {
        return maybeDate.toLocaleString('es-SV');
      }
    }
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const getProjectNameById = (registroId: string) => {
    const project = (data?.projectsList || []).find((p: any) => String(p.id) === String(registroId));
    return project?.name || registroId;
  };

  const getPayloadHighlights = (payload: any) => {
    if (!payload || typeof payload !== 'object') return [];
    const nestedFile = payload.file && typeof payload.file === 'object' ? payload.file : {};
    const candidates: Array<[string, any]> = [
      ['Nombre', [payload.nombre, payload.apellido].filter(Boolean).join(' ') || payload.name || payload.nombre_proyecto],
      ['Correo', payload.email],
      ['Rol', payload.roleName || payload.custom_role_name || payload.customRoleId],
      ['Proyecto', payload.projectName || payload.project || payload.nombre_proyecto],
      ['Categoría', payload.category || payload.area],
      ['Archivo', nestedFile.originalName || payload.originalName || payload.fileName],
      ['Tipo de recurso', payload.resourceType || payload.type],
      ['URL', payload.url],
      ['Mensaje', payload.message],
    ];
    return candidates
      .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
      .slice(0, 6);
  };

  const getRegistryPrefix = (tabla: string) => {
    if (tabla === 'proyectos') return 'Proyecto';
    if (tabla === 'usuarios') return 'Usuario';
    if (tabla === 'roles_personalizados') return 'Rol';
    if (tabla === 'reportes_mensuales') return 'Seguimiento';
    if (tabla === 'recursos') return 'Recurso';
    return 'Registro';
  };

  const getParsedOrRawValue = (parsedValue: any, rawValue: any) => {
    if (parsedValue !== undefined) return parsedValue;
    return rawValue;
  };

  const groupedLogs = useMemo<AuditGroup[]>(() => {
    const ignoredFields = new Set([
      'created_at',
      'updated_at',
      'createdAt',
      'updatedAt',
      'password',
      'contrasena',
      'password_hash',
      'token',
      'temporal',
    ]);

    const groups = new Map<string, AuditGroup>();

    logs.forEach((log) => {
      const key = [
        log.accion,
        log.tabla,
        log.registroId,
        log.usuarioEmail || '',
        log.fecha,
        log.ip || '',
      ].join('|');

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          ids: [],
          accion: log.accion,
          accionLabel: log.accionLabel,
          tabla: log.tabla,
          tablaLabel: log.tablaLabel,
          registroId: log.registroId,
          registroNombre: log.registroNombre,
          descripcion: log.descripcion,
          fecha: log.fecha,
          usuarioNombre: log.usuarioNombre,
          usuarioApellido: log.usuarioApellido,
          usuarioEmail: log.usuarioEmail,
          ip: log.ip,
          payload: log.valorNuevoParsed || log.valorAnteriorParsed,
          detalles: [],
        });
      }

      const group = groups.get(key)!;
      group.ids.push(log.id);
      const field = (log.campo || '').toString();
      if (field && field !== 'todo' && !ignoredFields.has(field)) {
        group.detalles.push({
          campo: field,
          campoLabel: log.campoLabel,
          valorAnterior: getParsedOrRawValue(log.valorAnteriorParsed, log.valorAnterior),
          valorNuevo: getParsedOrRawValue(log.valorNuevoParsed, log.valorNuevo),
        });
      }
    });

    return Array.from(groups.values());
  }, [logs]);

  if (!isOpen) return null;
  if (!canViewAudit) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Bitácora de Cambios</h2>
            <p className="text-xs text-slate-500">Historial legible de lo que cambió en el sistema</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-800">Registros de auditoría</p>
            <p className="text-xs text-slate-500">Puedes exportar el historial o limpiar registros cuando ya no sean necesarios.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 border border-slate-300 text-slate-700 bg-white rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              <Database className="w-4 h-4 inline mr-1 text-emerald-600" />
              Exportar Excel
            </button>
            <button
              onClick={handleDeleteAll}
              disabled={total === 0}
              className="px-4 py-2 border border-red-200 text-red-700 bg-red-50 rounded-lg text-sm font-semibold hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="w-4 h-4 inline mr-1" />
              Eliminar todo
            </button>
          </div>
        </div>

        {stats.length > 0 && (
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Actividad reciente</h3>
            <div className="flex gap-4 overflow-x-auto">
              {stats.slice(0, 5).map((stat, idx) => (
                <div key={idx} className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm min-w-[130px]">
                  <p className="text-xs font-bold text-slate-700">{getTableLabel(stat.tabla)}</p>
                  <p className="text-lg font-black text-brand-blue">{stat.total}</p>
                  <p className="text-[9px] text-slate-400">{stat.fecha || 'Sin fecha'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
            </div>
          ) : groupedLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay registros de cambios</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groupedLogs.map((log) => {
                const hasDetails = log.detalles.length > 0;
                const payloadHighlights = getPayloadHighlights(log.payload);
                const hasPayload = payloadHighlights.length > 0;
                const isExpanded = !!expandedCards[log.key];
                const projectName = log.tabla === 'proyectos'
                  ? log.registroNombre || getProjectNameById(log.registroId)
                  : log.registroNombre || log.registroId;
                const description =
                  log.descripcion ||
                  `${getAccionLabel(log.accion, log.accionLabel)} en ${getTableLabel(log.tabla, log.tablaLabel)}: ${projectName}.`;

                return (
                  <div key={log.key} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2 gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getAccionColor(log.accion)}`}>
                          {getAccionLabel(log.accion, log.accionLabel).toUpperCase()}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">{getTableLabel(log.tabla, log.tablaLabel)}</span>
                        <span className="text-xs text-slate-400">
                          {`${getRegistryPrefix(log.tabla)}: ${projectName}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 text-xs text-slate-400 whitespace-nowrap">
                          <Clock className="w-3 h-3" />
                          {formatAuditDate(log.fecha)}
                        </div>
                        <button
                          onClick={() => handleDeleteGroup(log)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          title="Eliminar este registro de la bitácora"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-3 text-sm">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-700">
                        {[log.usuarioNombre, log.usuarioApellido].filter(Boolean).join(' ') || 'Usuario no identificado'}
                      </span>
                      {log.usuarioEmail && <span className="text-xs text-slate-400">({log.usuarioEmail})</span>}
                    </div>

                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-sm font-semibold text-slate-700">{description}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {hasDetails
                          ? `Se registraron ${log.detalles.length} cambio${log.detalles.length > 1 ? 's' : ''} relevante${log.detalles.length > 1 ? 's' : ''}.`
                          : hasPayload
                            ? 'Datos principales del movimiento registrados.'
                            : 'Movimiento registrado sin detalle adicional.'}
                      </p>

                      {(hasDetails || hasPayload) && (
                        <button
                          onClick={() =>
                            setExpandedCards((prev) => ({
                              ...prev,
                              [log.key]: !prev[log.key],
                            }))
                          }
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-blue hover:underline"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-3.5 h-3.5" />
                              Ocultar detalles
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3.5 h-3.5" />
                              Ver detalles
                            </>
                          )}
                        </button>
                      )}

                      {isExpanded && hasDetails && (
                        <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                          {log.detalles.map((detail, idx) => (
                            <div key={idx} className="text-xs rounded-md border border-slate-200 bg-white p-3">
                              <p className="font-semibold text-slate-700">{prettyFieldName(detail.campo, detail.campoLabel)}</p>
                              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                                <div>
                                  <span className="text-slate-400">Antes:</span>
                                  <p className="text-slate-700 break-words whitespace-pre-wrap">{formatValue(detail.valorAnterior)}</p>
                                </div>
                                <div>
                                  <span className="text-slate-400">Después:</span>
                                  <p className="text-slate-700 break-words whitespace-pre-wrap">{formatValue(detail.valorNuevo)}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {isExpanded && !hasDetails && hasPayload && (
                        <div className="mt-3 border-t border-slate-200 pt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                          {payloadHighlights.map(([label, value]) => (
                            <div key={label} className="text-xs rounded-md border border-slate-200 bg-white p-3">
                              <p className="font-semibold text-slate-500">{label}</p>
                              <p className="text-slate-800 break-words">{formatValue(value)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {total > limit && (
            <div className="flex justify-center items-center gap-4 mt-6 pb-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50 transition-colors"
              >
                Anterior
              </button>
              <span className="text-sm font-bold text-slate-700">
                Página {page} de {Math.ceil(total / limit)}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / limit)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50 transition-colors"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap justify-between gap-2 text-xs text-slate-400">
          <span>Mostrando {groupedLogs.length} movimientos de {total} registros</span>
          <span className="inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            La limpieza solo elimina historial de auditoría; no borra datos del sistema.
          </span>
        </div>
      </div>
    </div>
  );
};

export default AuditLogModal;
