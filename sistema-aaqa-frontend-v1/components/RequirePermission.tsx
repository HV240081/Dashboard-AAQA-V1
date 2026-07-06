import React from 'react';
import { usePermissions } from '../hooks/usePermissions';

type ActionType = 'edit_category' | 'edit_formative' | 'admin_only';

interface RequirePermissionProps {
  action: ActionType;
  category?: string; // e.g. 'ong', 'community', 'dc', 'fis'
  children: React.ReactNode;
}

const RequirePermission: React.FC<RequirePermissionProps> = ({ action, category, children }) => {
  const { isReadOnly, isAdminOrManager, canEditCategory, canEditFormative } = usePermissions();

  if (isReadOnly) return null;

  let hasAccess = false;

  switch (action) {
    case 'admin_only':
      hasAccess = isAdminOrManager;
      break;
    case 'edit_category':
      if (category) {
        hasAccess = canEditCategory(category);
      } else {
        hasAccess = isAdminOrManager; // Si no dicen qué categoría, solo admins
      }
      break;
    case 'edit_formative':
      hasAccess = canEditFormative(category);
      break;
    default:
      hasAccess = false;
  }

  if (!hasAccess) return null;

  return <>{children}</>;
};

export default RequirePermission;
