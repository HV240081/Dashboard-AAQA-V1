/**
 * lib/validators.ts
 *
 * Centralised business-rule validators.
 *
 * BACKEND-READY PATTERN
 * ─────────────────────
 * These validators contain pure business logic with no dependency on React,
 * DataContext, or any UI layer. When a backend is integrated, the same
 * rules can be re-used verbatim server-side (or replaced by API error
 * responses that map to these same error keys).
 *
 * Each validator returns a ValidationResult so that callers can display
 * exactly the right error without parsing strings.
 */

// ---------------------------------------------------------------------------
// Result shape — identical to what an API would return
// ---------------------------------------------------------------------------

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

const ok = (): ValidationResult => ({ valid: true, errors: [] });
const fail = (errors: ValidationError[]): ValidationResult => ({ valid: false, errors });

// ---------------------------------------------------------------------------
// Progress validators
// ---------------------------------------------------------------------------

export const validateProgress = (
  technical: number,
  financial: number
): ValidationResult => {
  const errors: ValidationError[] = [];

  if (technical < 0 || technical > 100) {
    errors.push({
      field: 'technicalProgressPercentage',
      message: 'El avance técnico debe estar entre 0% y 100%.',
    });
  }
  if (financial < 0 || financial > 100) {
    errors.push({
      field: 'financialProgressPercentage',
      message: 'El avance financiero debe estar entre 0% y 100%.',
    });
  }

  return errors.length ? fail(errors) : ok();
};

// ---------------------------------------------------------------------------
// Monthly report validators
// ---------------------------------------------------------------------------

export const validateMonthlyReport = (report: {
  month: number;
  year: number;
  realTechnical: number;
  realFinancial: number;
  expectedTechnical?: number;
  expectedFinancial?: number;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  if (report.month < 1 || report.month > 12) {
    errors.push({ field: 'month', message: 'El mes debe estar entre 1 y 12.' });
  }
  if (report.year < 2020 || report.year > 2030) {
    errors.push({ field: 'year', message: 'El año no parece válido.' });
  }

  const progress = validateProgress(report.realTechnical, report.realFinancial);
  if (!progress.valid) errors.push(...progress.errors);

  if (
    report.expectedTechnical !== undefined &&
    (report.expectedTechnical < 0 || report.expectedTechnical > 100)
  ) {
    errors.push({
      field: 'expectedTechnical',
      message: 'La meta técnica debe estar entre 0% y 100%.',
    });
  }
  if (
    report.expectedFinancial !== undefined &&
    (report.expectedFinancial < 0 || report.expectedFinancial > 100)
  ) {
    errors.push({
      field: 'expectedFinancial',
      message: 'La meta financiera debe estar entre 0% y 100%.',
    });
  }

  return errors.length ? fail(errors) : ok();
};

// ---------------------------------------------------------------------------
// Project creation / update validators
// ---------------------------------------------------------------------------

export const validateProjectCore = (project: {
  name: string;
  organization: string;
  department: string;
  amountFGK: number;
  year: number;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!project.name || project.name.trim().length < 3) {
    errors.push({ field: 'name', message: 'El nombre del proyecto debe tener al menos 3 caracteres.' });
  }
  if (!project.organization || project.organization.trim().length < 2) {
    errors.push({ field: 'organization', message: 'La organización es requerida.' });
  }
  if (!project.department || project.department.trim().length < 2) {
    errors.push({ field: 'department', message: 'El departamento es requerido.' });
  }
  if (project.amountFGK < 0) {
    errors.push({ field: 'amountFGK', message: 'La inversión FGK no puede ser negativa.' });
  }
  if (project.year < 2020 || project.year > 2030) {
    errors.push({ field: 'year', message: 'El año de edición no parece válido.' });
  }

  return errors.length ? fail(errors) : ok();
};

// ---------------------------------------------------------------------------
// Project status transition validator
// ---------------------------------------------------------------------------

/**
 * Allowed status transitions.
 * This is a state machine definition that can be mirrored server-side.
 */
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  Activo:         ['En Ejecución', 'En Cierre', 'Suspendido'],
  'En Ejecución': ['En Cierre', 'Suspendido', 'Finalizado'],
  'En Cierre':    ['Finalizado', 'En Ejecución'],
  Suspendido:     ['Activo', 'En Ejecución'],
  Finalizado:     [], // terminal state
};

export const validateStatusTransition = (
  currentStatus: string,
  nextStatus: string
): ValidationResult => {
  const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(nextStatus)) {
    return fail([
      {
        field: 'status',
        message: `No se puede pasar de "${currentStatus}" a "${nextStatus}". Transiciones permitidas: ${allowed.join(', ') || 'ninguna'}.`,
      },
    ]);
  }
  return ok();
};

// ---------------------------------------------------------------------------
// Project closure validator
// ---------------------------------------------------------------------------

export const validateProjectClosure = (project: {
  status: string;
  completionLetter?: string;
  technicalProgressPercentage: number;
  financialProgressPercentage: number;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!project.completionLetter) {
    errors.push({
      field: 'completionLetter',
      message: 'La carta de finalización es obligatoria para cerrar un proyecto.',
    });
  }
  if (project.technicalProgressPercentage < 80) {
    errors.push({
      field: 'technicalProgressPercentage',
      message: `El avance técnico es ${project.technicalProgressPercentage}%. Se requiere al menos 80% para finalizar.`,
    });
  }

  return errors.length ? fail(errors) : ok();
};

// ---------------------------------------------------------------------------
// Utility: flatten errors into a human-readable string
// ---------------------------------------------------------------------------

export const formatValidationErrors = (result: ValidationResult): string =>
  result.errors.map((e) => e.message).join('\n');
