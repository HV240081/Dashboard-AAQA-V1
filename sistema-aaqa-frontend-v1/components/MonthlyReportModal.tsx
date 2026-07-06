import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Save, X } from 'lucide-react';

type ReportStatus = 'pending' | 'active' | 'completed';

interface ManualTrackingDraft {
  metaFinancial: number;
  reportMonth: number;
  scheduleStatus: ReportStatus;
  observations: string;
  activities: string[];
}

interface MonthlyReportSnapshot {
  metaFinancial?: number;
  status?: ReportStatus | string;
  observations?: string;
  activities?: string[];
}

interface MonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (draft: ManualTrackingDraft) => Promise<void> | void;
  projectYear: number;
  investmentFgk: number;
  defaultMonth?: number;
  allowedMonths?: number[];
  initialMetaFinancial?: number;
  initialStatus?: ReportStatus | string;
  initialObservations?: string;
  initialActivities?: string[];
  monthData?: Record<number, MonthlyReportSnapshot>;
}

const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

const normalizeStatus = (status?: ReportStatus | string): ReportStatus => {
  const value = (status ?? '').toString().trim().toLowerCase();
  if (value === 'completed' || value.includes('finaliz') || value.includes('complet')) return 'completed';
  if (value === 'active' || value.includes('proceso') || value.includes('ejec') || value.includes('avance')) return 'active';
  return 'pending';
};

const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({
  isOpen,
  onClose,
  onSave,
  projectYear,
  investmentFgk,
  defaultMonth = new Date().getMonth() + 1,
  allowedMonths,
  initialMetaFinancial = 0,
  initialStatus = 'pending',
  initialObservations = '',
  initialActivities = [],
  monthData = {},
}) => {
  const allowedMonthSet = useMemo(
    () => (allowedMonths && allowedMonths.length > 0 ? new Set(allowedMonths) : null),
    [allowedMonths]
  );
  const availableMonths = useMemo(() => {
    if (!allowedMonths || allowedMonths.length === 0) return MONTHS;
    const seen = new Set<number>();
    return allowedMonths
      .filter((value) => {
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
      })
      .map((value) => MONTHS.find((item) => item.value === value))
      .filter(Boolean) as typeof MONTHS;
  }, [allowedMonths]);

  const firstAvailableMonth = availableMonths[0]?.value || defaultMonth;
  const normalizeAllowedMonth = (value: number) => {
    if (!allowedMonthSet) return value;
    return allowedMonthSet.has(value) ? value : firstAvailableMonth;
  };

  const [metaFinancial, setMetaFinancial] = useState('');
  const [reportMonth, setReportMonth] = useState(normalizeAllowedMonth(defaultMonth));
  const [scheduleStatus, setScheduleStatus] = useState<ReportStatus>('pending');
  const [observations, setObservations] = useState('');
  const [activityText, setActivityText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadMonthData = (month: number) => {
    const snapshot = monthData[month];
    const nextMeta = snapshot?.metaFinancial ?? initialMetaFinancial;
    const nextStatus = snapshot?.status ?? initialStatus;
    const nextObservations = snapshot?.observations ?? initialObservations;
    const nextActivities = snapshot?.activities ?? initialActivities;

    setMetaFinancial(nextMeta && nextMeta > 0 ? String(nextMeta).replace(/^0+(?=\d)/, '') : '');
    setScheduleStatus(normalizeStatus(nextStatus));
    setObservations(nextObservations || '');
    setActivityText((nextActivities || []).join('\n'));
  };

  useEffect(() => {
    if (!isOpen) return;
    const startMonth = normalizeAllowedMonth(defaultMonth);
    setReportMonth(startMonth);
    loadMonthData(startMonth);
  }, [isOpen, defaultMonth, monthData]);

  if (!isOpen) return null;

  const activities = activityText
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const metaFinancialValue = parseFloat(metaFinancial) || 0;
    if (investmentFgk > 0 && metaFinancialValue > investmentFgk) {
      alert(`La meta financiera no puede ser mayor que la Inversión FGK (${investmentFgk}).`);
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        metaFinancial: metaFinancialValue,
        reportMonth: normalizeAllowedMonth(reportMonth),
        scheduleStatus,
        observations: observations.trim(),
        activities: Array.from(new Set(activities)),
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const investmentLabel = investmentFgk > 0
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(investmentFgk)
    : '$0';
  const selectedMonthLabel = availableMonths.find((item) => item.value === reportMonth)?.label || 'Sin definir';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Seguimiento mensual</h3>
            <p className="text-xs text-slate-500">Proyecto edición {projectYear}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors" aria-label="Cerrar">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mes del seguimiento</label>
              <select
                value={reportMonth}
                onChange={(e) => {
                  const nextMonth = normalizeAllowedMonth(parseInt(e.target.value, 10) || firstAvailableMonth);
                  setReportMonth(nextMonth);
                  loadMonthData(nextMonth);
                }}
                className="w-full p-3 border border-slate-300 rounded-lg text-sm bg-white text-slate-900"
              >
                {availableMonths.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estado del mes</label>
              <select
                value={scheduleStatus}
                onChange={(e) => setScheduleStatus(e.target.value as ReportStatus)}
                className="w-full p-3 border border-slate-300 rounded-lg text-sm bg-white text-slate-900"
              >
                <option value="pending">Pendiente</option>
                <option value="active">En proceso</option>
                <option value="completed">Finalizado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Meta financiera del mes</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={metaFinancial}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/[^\d]/g, '');
                  setMetaFinancial(digitsOnly.replace(/^0+(?=\d)/, ''));
                }}
                onBlur={() => setMetaFinancial((current) => current.replace(/^0+(?=\d)/, ''))}
                className="w-full p-3 border border-slate-300 rounded-lg text-sm bg-white text-slate-900"
                placeholder="Monto ejecutado en el mes"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                No puede superar la Inversión FGK actual: {investmentLabel}.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-500 uppercase">Resumen del registro</p>
              <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-[11px] text-slate-500">Mes</p>
                  <p className="font-semibold text-slate-900">{selectedMonthLabel}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">Actividades</p>
                  <p className="font-semibold text-slate-900">{activities.length}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">Estado</p>
                  <p className="font-semibold text-slate-900">
                    {scheduleStatus === 'completed' ? 'Finalizado' : scheduleStatus === 'active' ? 'En proceso' : 'Pendiente'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Actividades del mes</label>
            <textarea
              value={activityText}
              onChange={(e) => setActivityText(e.target.value)}
              className="w-full min-h-[130px] p-3 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 resize-y"
              placeholder={'Escriba una actividad por línea.\nEjemplo:\nLevantamiento de información\nCompra de materiales'}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Todas las actividades de este mes tomarán el estado mensual seleccionado.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observación breve</label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              className="w-full min-h-[90px] p-3 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 resize-y"
              placeholder="Escriba un comentario corto del mes..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 font-semibold text-sm hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-blue-600 text-white font-semibold text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {isSaving ? <Save className="w-4 h-4 animate-pulse" /> : <Plus className="w-4 h-4" />}
              Guardar seguimiento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MonthlyReportModal;
