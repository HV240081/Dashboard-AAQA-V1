import React from 'react';

// ==============================================
// TIPOS BASE Y ENUMS
// ==============================================

export type CategoryType = 'ONG' | 'Community' | 'FIS';
export type ProgressStatus = 'pending' | 'active' | 'completed';
export type ProjectStatus = 'Activo' | 'Finalizado' | 'En Cierre' | 'En Ejecución' | 'Suspendido';
export type EditionStatus = 'ABIERTA' | 'CERRADA';
export type ScheduleStatus = 'En Tiempo' | 'Retrasado' | 'Finalizado' | 'Adelantado';
export type ParticipantGender = 'M' | 'F';
export type ParticipantStatus = 'enrolled' | 'graduated' | 'dropped';
export type TrainingType = 'Talleres Formativos ONG' | 'Talleres comunitarios' | 'Incubadora FGK';
export type FisProgram = 'Incubadora FGK';
export type FisCampus = 'Central' | 'Oriente';
export type FisStatus = 'inscrito' | 'en formación' | 'graduado' | 'retiro';
export type CorteStatus = 'Planificación' | 'En Curso' | 'Finalizado';
export type DocumentType = 'carta_finalizacion' | 'control_cambio' | 'otro';

// ==============================================
// KPIs Y MÉTRICAS
// ==============================================

export interface FinancialKPI {
    id: string;
    label: string;
    value: number;
    prefix?: string;
    note?: string;
    colorClass: string;
}

export interface SocialKPI {
    id: string;
    label: string;
    value: string | number;
    icon: React.ElementType;
    note?: string;
}

// ==============================================
// SUB-ENTIDADES
// ==============================================

export interface AllyContribution {
    id: string;
    name: string;
    amount: number;
    year: number;
    note?: string;
}

export interface TrainingParticipant {
    id: string;
    name: string;
    dui?: string;
    phone?: string;        // ← AÑADIR
    email?: string;        // ← AÑADIR
    role?: string;
    age?: number;
    gender?: ParticipantGender;
    department?: string;
    status: ParticipantStatus;
}

export interface TrainingDetails {
    hasTraining: boolean;
    year: number;
    trainingType?: TrainingType;
    trainedOrganization?: string;
    totalEnrolled: number;
    totalGraduated: number;
    participants: TrainingParticipant[];
}

export interface CommunityCounterpart {
    laborAmount: number;
    materialsAmount: number;
}

export interface GoalChangeLog {
    id: string;
    date: string;
    user: string;
    field: 'Technical' | 'Financial';
    monthYear: string;
    oldValue: number;
    newValue: number;
    reason: string;
}

export interface ProjectActivity {
    id: string;
    name: string;
    month: number; // 1-12 relativo al proyecto
    status: ProgressStatus;
    note?: string;
    observations?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface ProjectMonthComment {
    id: string;
    month: number;
    text: string;
    author?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface MonthlyReport {
    id: string;
    month: number; // 1-12
    year: number;

    // Core Metrics
    realTechnical: number; // %
    realFinancial: number; // %
    metaFinancial?: number;
    scheduleStatus: ScheduleStatus;

    // Optional Goals (Metas)
    expectedTechnical?: number; // %
    expectedFinancial?: number; // %

    observations?: string;
    photos?: string[]; // URLs

    createdAt: string;
    createdBy: string;
}

// ==============================================
// MÓDULO DE DESARROLLO COMUNITARIO (CORTES)
// ==============================================

export interface AdescoParticipant {
    id: string;
    name: string;
    role?: string;
    phone?: string;
    district?: string;
    department?: string;
    gender?: ParticipantGender;
}

export interface CommunityAdesco {
    id: string;
    year: number;
    name: string;
    participantsCount: number;
    graduatesCount: number;
    femaleCount: number;
    maleCount: number;
    participants?: AdescoParticipant[];
}

export interface CommunityCorte {
    id: string;
    name: string;
    year: number;
    startDate: string;
    endDate: string;
    location: string;
    allyName: string;
    status: CorteStatus;
    adescos: CommunityAdesco[];
}

// ==============================================
// MÓDULO DE INCUBADORA FIS
// ==============================================

export interface FisParticipant {
    id: string;
    year: number;
    program: FisProgram;
    campus?: FisCampus;
    name: string;
    gender: ParticipantGender;
    age: number;
    ventureName: string;
    department: string;
    status: FisStatus;
    observations?: string;
    source?: 'incubadora' | 'training';
    projectId?: string;
}

// ==============================================
// NUEVOS TIPOS GEOGRÁFICOS Y DOCUMENTOS
// ==============================================

export interface ReferenciaGeografica {
    departamento: string;
    municipio: string;
    distrito: string;
    latitud?: number;
    longitud?: number;
}

export interface FotoProyecto {
    id: string;
    url: string;
    subidoPor?: number;
    createdAt: string;
}

export interface DocumentoProyecto {
    id: string;
    nombre: string;
    url: string;
    tipo: DocumentType;
    subidoPor?: number;
    createdAt: string;
}

export interface TextoEditable {
    categoria: string;
    clave: string;
    valor: string;
}

// ==============================================
// MODELO RELACIONAL PRINCIPAL
// ==============================================

export interface SystemEdition {
    year: number;
    status: EditionStatus;
    isCurrent: boolean;
}

/**
 * 1. PERFIL MAESTRO (OrganizationProfile)
 */
export interface OrganizationProfile {
    id: string;                 // UUID único de la organización
    name: string;               // Nombre oficial (ej: FUSALMO)
    category: CategoryType;     // Categoría base
    logoUrl?: string;           // Logo institucional
    baseLocation?: {            // Ubicación de la sede (opcional)
        department: string;
        municipality?: string;
    };
    contactInfo?: {
        email?: string;
        representative?: string;
    };
}

/**
 * 2. EJECUCIÓN ANUAL (ProjectExecution)
 */
export interface ProjectExecution {
    id: string;                 // UUID de la ejecución (ej: exec-2025-org1)
    organizationId: string;     // FK -> OrganizationProfile.id
    year: number;               // EDICIÓN (Año Fiscal)

    // Detalles del Proyecto Específico de este año
    projectName: string;
    status: ProjectStatus | null;

    // Ubicación de Impacto (puede diferir de la sede)
    location: {
        department: string;
        municipality?: string;
        district?: string;
    };

    // Financiero
    financials: {
        amountFGK: number;
        counterpart: number;
        amountAllies: number;
        communityCounterpart?: CommunityCounterpart; // Solo Community
    };

    // Aliados específicos de esta edición
    allies: AllyContribution[];
    allyName?: string; // Nombre del aliado principal (Legacy/Display)

    // Impacto
    impact: {
        beneficiaries: number;
        indirectBeneficiaries?: number;
        realBeneficiaries?: number;
    };

    // Formación (Módulo Satélite vinculado por referencia)
    trainingDetails: TrainingDetails;

    // Matriz de Avance (Cronograma)
    progress: ProgressStatus[];

    // Indicadores de Avance (Independientes del Cronograma)
    technicalProgressPercentage: number;
    financialProgressPercentage: number;

    // Galería de Seguimiento
    photos?: string[];

    // Documentos Adicionales
    completionLetter?: string;
    changeControlDocuments?: string[];
    monthlyTrackingDocuments?: string[];

    // Módulo de Monitoreo
    reports: MonthlyReport[];
    goalHistory: GoalChangeLog[];
}

// ==============================================
// UI VIEW MODEL (PROYECTO HIDRATADO)
// ==============================================

/**
 * Project (Hydrated) - Versión completa con todas las propiedades
 */
export interface Project {
    // IDs
    id: string;                 // ID de la ejecución (para la UI)
    organizationId: string;     // ID del perfil maestro

    // De OrganizationProfile
    organization: string;       // Nombre Org
    organizationLogo?: string;
    category: CategoryType;

    // De ProjectExecution
    name: string;               // Nombre Proyecto
    year: number;
    status: ProjectStatus;
    timelineStartMonth?: number | null;
    timelineEndMonth?: number | null;
    timelineDurationMonths?: number | null;

    // Location
    department: string;
    municipality?: string;
    district?: string;
    contact1Name?: string;
    contact1Role?: string;
    contact1DirectPhone?: string;
    contact1OrganizationPhone?: string;
    contact1Email?: string;
    contact2Name?: string;
    contact2Role?: string;
    contact2DirectPhone?: string;
    contact2OrganizationPhone?: string;
    contact2Email?: string;

    // NUEVAS PROPIEDADES PARA DC
    logoUrl?: string;
    hasFormation?: boolean;

    // Financials Flattened
    amountFGK: number;
    counterpart: number;
    amountAllies: number;
    metaFinancial?: number;
    communityCounterpart?: CommunityCounterpart;

    // Arrays & Objects
    allies: AllyContribution[];
    allyName?: string;
    trainingDetails: TrainingDetails;
    progress: ProgressStatus[];
    activities?: ProjectActivity[];
    monthObservations?: Record<number, string>;
    monthComments?: Record<number, ProjectMonthComment[]>;

    // Impact Flattened
    beneficiaries: number;
    indirectBeneficiaries?: number;
    realBeneficiaries?: number;

    // Independent Progress Indicators
    technicalProgressPercentage: number;
    financialProgressPercentage: number;

    // Media & Docs
    photos: string[]; // URLs de fotos de evidencia
    documentos?: DocumentoProyecto[];
    completionLetter?: string;
    changeControlDocuments?: string[];
    monthlyTrackingDocuments?: string[];

    // Módulo de Monitoreo
    reports: MonthlyReport[];
    goalHistory: GoalChangeLog[];
}

// ==============================================
// COMPARACIÓN ANUAL
// ==============================================

export interface ComparacionAnual {
    year: number;
    financials: {
        fgk: number;
        aliados: number;
        contrapartida: number;
    };
    impact: {
        projects: number;
        orgs: number;
        beneficiaries: number;
    };
    categories: {
        ong: { investment: number; orgs: number; projects: number };
        community: { investment: number; orgs: number; projects: number };
        fis: { investment: number; ventures: number; projects: number };
    };
    formative: {
        totalEnrolled: number;
        totalGraduated: number;
        retentionRate: number;
        byGender: { M: number; F: number };
        byCategory: {
            ong: { enrolled: number; graduated: number };
            community: { enrolled: number; graduated: number };
            fis: { enrolled: number; graduated: number };
        };
        byDepartment: Record<string, number>;
    };
}

// ==============================================
// DASHBOARD DATA (ESTADO GLOBAL)
// ==============================================

export interface DashboardData {
    // Configuración del Sistema
    editions: SystemEdition[];

    // Almacenes Relacionales (Base de Datos Simulada)
    masterOrganizations: OrganizationProfile[];
    annualExecutions: ProjectExecution[];

    // Vista Computada (Para consumo de UI)
    projectsList: Project[];

    // KPIs Agregados
    financials: {
        fgk: number;
        aliados: number;
        contrapartida: number;
    };
    impact: {
        projects: number;
        orgs: number;
        beneficiaries: number;
    };
    formative: {
        totalEnrolled: number;
        totalGraduated: number;
        retentionRate: number; // percentage
        byGender: { M: number; F: number };
        byCategory: {
            ong: { enrolled: number; graduated: number };
            community: { enrolled: number; graduated: number };
            fis: { enrolled: number; graduated: number };
        };
        byDepartment: Record<string, number>; // DeptName -> GraduatedCount
    };
    categories: {
        ong: { investment: number; orgs: number; projects: number };
        community: { investment: number; orgs: number; projects: number };
        fis: { investment: number; ventures: number; projects: number };
    };
    currentEdition2025: {
        ong: number;
        fis: number;
        community: number;
    };

    lastUpdated?: string;
    updatedBy?: string;

    // Desarrollo Comunitario: Cortes Formativos (Módulo Satélite)
    communityCortes?: CommunityCorte[];

    // Emprendimiento Social: Incubadora FGK (Módulo Satélite)
    fisParticipants?: FisParticipant[];

    // ==============================================
    // NUEVAS PROPIEDADES
    // ==============================================
    
    // Textos editables por categoría
    textosEditables?: Record<string, string>;
    
    // Referencias geográficas para mapas
    referenciasGeograficas?: ReferenciaGeografica[];
    
    // Años disponibles para filtros
    availableYears?: number[];
}

// ==============================================
// PAYLOADS PARA ACTUALIZACIONES
// ==============================================

export interface UpdateFinancialsPayload {
    fgk: number;
    aliados: number;
    contrapartida: number;
}

export interface UpdateCategoriesPayload {
    ong?: { investment?: number; orgs?: number; projects?: number };
    community?: { investment?: number; orgs?: number; projects?: number };
    fis?: { investment?: number; ventures?: number; projects?: number };
}

export interface UpdateFormativePayload {
    byCategory?: {
        ong?: { enrolled?: number; graduated?: number };
        community?: { enrolled?: number; graduated?: number };
        fis?: { enrolled?: number; graduated?: number };
    };
    byGender?: { M?: number; F?: number };
}

export interface UpdateCurrentEditionPayload {
    ong: { count: number; investment: number };
    fis: { count: number; investment: number };
    community: { count: number; investment: number };
}

export interface UpdateTextContentPayload {
    category: string;
    key: string;
    value: string;
}

export interface UpdateCommunityCounterpartPayload {
    laborAmount: number;
    materialsAmount: number;
}

// ==============================================
// FILTROS Y QUERIES
// ==============================================

export interface ProjectFilters {
    year?: number;
    category?: CategoryType;
    status?: ProjectStatus | null;
    department?: string;
}

export interface GeoDataFilters {
    year?: number;
    department?: string;
    municipality?: string;
    district?: string;
}
