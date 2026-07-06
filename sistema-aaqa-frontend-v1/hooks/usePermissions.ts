// src/hooks/usePermissions.ts

import { useState, useEffect } from 'react';

// Decodifica el token JWT y extrae el rolId y otros datos
const getRoleFromToken = (): {
  rolId: number | null;
  userEmail: string | null;
  userId: number | null;
  editableCategories: string[];
  viewableCategories: string[];
  canEditAll: boolean;
  canOnlyView: boolean;
  isCustom: boolean;
  roleNameFromToken: string | null;
} => {
  try {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return {
        rolId: null,
        userEmail: null,
        userId: null,
        editableCategories: [],
        viewableCategories: [],
        canEditAll: false,
        canOnlyView: false,
        isCustom: false,
        roleNameFromToken: null,
      };
    }
    
    const payloadStr = atob(token.split('.')[1]);
    const payload = JSON.parse(payloadStr);
    
    return {
      rolId: payload.rolId || payload.rol_id || null,
      userEmail: payload.email || null,
      userId: payload.userId || payload.user_id || payload.sub || null,
      editableCategories: Array.isArray(payload.editableCategories) ? payload.editableCategories : [],
      viewableCategories: Array.isArray(payload.viewableCategories) ? payload.viewableCategories : [],
      canEditAll: payload.canEditAll === true,
      canOnlyView: payload.canOnlyView === true,
      isCustom: payload.isCustom === true,
      roleNameFromToken: Array.isArray(payload.roles) && payload.roles.length > 0 ? payload.roles[0] : null,
    };
  } catch (e) {
    return {
      rolId: null,
      userEmail: null,
      userId: null,
      editableCategories: [],
      viewableCategories: [],
      canEditAll: false,
      canOnlyView: false,
      isCustom: false,
      roleNameFromToken: null,
    };
  }
};

export const usePermissions = () => {
  const [tokenData, setTokenData] = useState(getRoleFromToken());
  const rolId = tokenData.rolId;
  const userEmail = tokenData.userEmail;
  const userId = tokenData.userId;
  const customEditableCategories = tokenData.editableCategories;
  const customViewableCategories = tokenData.viewableCategories;
  const isCustomUser = tokenData.isCustom;

  // Escuchar cambios en localStorage (útil si el token cambia sin recargar)
  useEffect(() => {
    const handleStorageChange = () => {
      setTokenData(getRoleFromToken());
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // ==============================================
  // PERMISOS BASE POR ROL
  // ==============================================

  // Geo (1) y Violeta (3) - acceso total
  const isAdminOrManager = rolId === 1 || rolId === 3 || tokenData.canEditAll;

  // Juana (2) - solo lectura
  const isReadOnly = rolId === 2 || tokenData.canOnlyView;

  // Jose Manuel (4) - solo Talleres Comunitarios / Cortes Formativas
  const isCommunityCortesManager = rolId === 4;

  // Irvin (5) - solo fondos / otorgamiento de fondos
  const isFundsManager = rolId === 5;

  const normalizeCategoryKey = (category?: string): string => {
    const lower = (category || '').toLowerCase();
    if (lower === 'community' || lower === 'dc' || lower === 'desarrollo comunitario') return 'DC';
    if (lower === 'fis' || lower === 'es' || lower === 'emprendimiento social') return 'ES';
    if (lower === 'cortes' || lower === 'formacion' || lower === 'formacion_dc') return 'formacion_dc';
    if (lower === 'ong') return 'ONG';
    return category || '';
  };

  const hasCustomEditableCategory = (category?: string): boolean => {
    const key = normalizeCategoryKey(category);
    return customEditableCategories.includes(key);
  };

  const hasCustomViewableCategory = (category?: string): boolean => {
    const key = normalizeCategoryKey(category);
    return customViewableCategories.includes(key) || customEditableCategories.includes(key);
  };

  const canViewCategory = (category: string): boolean => {
    const key = normalizeCategoryKey(category);
    if (['ONG', 'DC', 'ES'].includes(key)) return true;
    if (isAdminOrManager) return true;
    if (isCustomUser) {
      return key === 'formacion_dc' || hasCustomViewableCategory(category);
    }
    if (rolId === 2) return true;
    if (rolId === 5) return key === 'DC';
    if (rolId === 4) return key === 'DC' || key === 'formacion_dc';
    return tokenData.viewableCategories.includes(key);
  };

  // ==============================================
  // PERMISOS POR CATEGORÍA OPERATIVA
  // ==============================================

  /**
   * Permite editar metas operativas (inversión, proyectos, organizaciones)
   * @param category - Categoría: 'ONG', 'Community', 'FIS', 'dc', 'community'
   */
  const canEditCategory = (category: string): boolean => {
    if (isAdminOrManager) return true;
    if (isReadOnly) return false;
    if (isCustomUser) return hasCustomEditableCategory(category);
    if (isFundsManager) {
      const lowerCat = category.toLowerCase();
      return lowerCat === 'community' || lowerCat === 'dc';
    }
    return false;
  };

  // ==============================================
  // PERMISOS FORMATIVOS
  // ==============================================

  /**
   * Permite editar impactos formativos (participantes, graduados, etc.)
   * @param category - Categoría opcional: 'ONG', 'Community', 'FIS', 'dc'
   */
  const canEditFormative = (category?: string): boolean => {
    if (isAdminOrManager) return true;
    if (isReadOnly) return false;
    const key = normalizeCategoryKey(category);
    if (isCustomUser) {
      if (!category) return hasCustomEditableCategory('formacion_dc') || hasCustomEditableCategory('Cortes');
      if (key === 'formacion_dc') return hasCustomEditableCategory('formacion_dc') || hasCustomEditableCategory('Cortes');
      return hasCustomEditableCategory(category);
    }
    if (isCommunityCortesManager) {
      if (!category) return true;
      return key === 'formacion_dc';
    }
    return false;
  };

  // ==============================================
  // PERMISOS PARA TEXTOS (CMS)
  // ==============================================

  /**
   * Permite editar textos editables en el CMS
   * @param category - Categoría: 'global', 'ong', 'dc', 'es', 'formacion'
   */
  const canEditText = (category: string): boolean => {
    if (isAdminOrManager) return true;
    return false;
  };

  const canEditProjectDetailText = (): boolean => {
    return isAdminOrManager;
  };

  // ==============================================
  // PERMISOS PARA REPORTES
  // ==============================================

  /**
   * Permite ver/modificar reportes mensuales
   * @param category - Categoría del proyecto: 'ONG', 'Community', 'FIS'
   */
  const canEditReports = (category?: string): boolean => {
    if (isAdminOrManager) return true;
    if (isReadOnly) return false;
    if (isCustomUser) return hasCustomEditableCategory(category);
    const lowerCat = (category || '').toLowerCase();
    if (isFundsManager) {
      return lowerCat === 'community' || lowerCat === 'dc';
    }
    return false;
  };

  // ==============================================
  // PERMISOS PARA DATOS FINANCIEROS
  // ==============================================

  /**
   * Permite editar datos financieros globales (FGK, Aliados, Contrapartida)
   */
  const canEditFinancials = (): boolean => {
    if (isCustomUser) return customEditableCategories.length > 0;
    return isAdminOrManager || isFundsManager;
  };

  // ==============================================
  // PERMISOS PARA EDICIÓN VIGENTE
  // ==============================================

  /**
   * Permite editar metas del año vigente
   */
  const canEditCurrentEdition = (): boolean => {
    return isAdminOrManager;
  };

  // ==============================================
  // PERMISOS PARA CONTRAPARTIDA COMUNAL
  // ==============================================

  /**
   * Permite editar contrapartida comunal
   */
  const canEditCommunityCounterpart = (): boolean => {
    if (isCustomUser) return hasCustomEditableCategory('Community');
    return isAdminOrManager;
  };

  // ==============================================
  // PERMISOS PARA CARGAS MASIVAS (EXCEL)
  // ==============================================

  /**
   * Permite realizar cargas masivas de datos
   * @param dataType - Tipo de dato: 'proyectos', 'participantes', 'aliados', 'reportes'
   */
  const canUploadData = (dataType?: string): boolean => {
    if (isAdminOrManager) return true;
    if (isReadOnly) return false;
    if (isCustomUser) {
      if (!dataType) return customEditableCategories.length > 0;
      const lowerType = dataType.toLowerCase();
      if (lowerType.includes('community') || lowerType.includes('dc')) return hasCustomEditableCategory('Community');
      if (lowerType.includes('ong')) return hasCustomEditableCategory('ONG');
      if (lowerType.includes('fis') || lowerType.includes('emprendimiento')) return hasCustomEditableCategory('FIS');
      if (lowerType.includes('corte') || lowerType.includes('adesco')) return hasCustomEditableCategory('formacion_dc');
      return customEditableCategories.length > 0;
    }
    if (isFundsManager) return dataType === 'proyectos';
    return false;
  };

  // ==============================================
  // PERMISOS PARA SUBIR IMÁGENES
  // ==============================================

  /**
   * Permite subir imágenes a proyectos
   */
  const canUploadImages = (): boolean => {
    if (isAdminOrManager) return true;
    if (isReadOnly) return false;
    if (isCustomUser) return customEditableCategories.length > 0;
    if (isFundsManager) return true;
    return false;
  };

  // ==============================================
  // PERMISOS PARA ELIMINAR DATOS
  // ==============================================

  /**
   * Permite eliminar datos (proyectos, participantes, etc.)
   */
  const canDeleteData = (): boolean => {
    if (isCustomUser) return false;
    return isAdminOrManager;
  };

  // ==============================================
  // NOMBRES DE ROLES
  // ==============================================

  const getRoleName = (): string => {
    switch (rolId) {
      case 1: return 'Geo';
      case 2: return 'Juana';
      case 3: return 'Violeta';
      case 4: return 'Jose Manuel';
      case 5: return 'Irvin';
      default: return tokenData.roleNameFromToken || 'Usuario';
    }
  };

  // ==============================================
  // RETORNO DEL HOOK
  // ==============================================

  return {
    // Estado del usuario
    rolId,
    userEmail,
    userId,
    roleName: getRoleName(),
    
    // Permisos base
    isAdminOrManager,
    isReadOnly,
    isCommunityCortesManager,
    isFundsManager,
    isCustomUser,
    customEditableCategories,
    customViewableCategories,
    hasCustomViewableCategory,
    canViewCategory,
    
    // Permisos específicos
    canEditCategory,
    canEditFormative,
    canEditText,
    canEditProjectDetailText,
    canEditReports,
    canEditFinancials,
    canEditCurrentEdition,
    canEditCommunityCounterpart,
    canUploadData,
    canUploadImages,
    canDeleteData,
  };
};

