// src/lib/auth/rbac.ui.js
// Helpers de UI que se apoyan en tu rbac.js existente (NO lo modifican)

import { PERMISSIONS, ROLE_PERMISSIONS, userPermissions, hasRole } from './rbac';

// Módulos del Dashboard visibles por permiso
export const MODULES = {
  ventas:        { label: 'Ventas',        path: '/ventas',        permission: PERMISSIONS.SALE_ACCESS },
  inmobiliarias: { label: 'Inmobiliarias', path: '/inmobiliarias', permission: PERMISSIONS.AGENCY_ACCESS },
  reservas:      { label: 'Reservas',      path: '/reservas',      permission: PERMISSIONS.RES_ACCESS },
  personas:      { label: 'Personas',      path: '/personas',      permission: PERMISSIONS.PEOPLE_ACCESS },
  reportes:      { label: 'Reportes',      path: '/reportes',      permission: PERMISSIONS.REPORTS_ACCESS },
};

export function visibleModulesForUser(user) {
  const perms = new Set(userPermissions(user));
  return Object.entries(MODULES).filter(([, m]) => perms.has(m.permission));
}

// Acciones del tablero (según tu overview)
export function canDashboardAction(user, action) {
  switch (action) {
    case 'registrarVenta':  return userPermissions(user).includes(PERMISSIONS.SALE_CREATE);
    case 'visualizarLote':  return userPermissions(user).includes(PERMISSIONS.LOT_DETAIL);
    case 'editarLote':      return userPermissions(user).includes(PERMISSIONS.LOT_EDIT);
    case 'eliminarLote':    return hasRole(user, 'ADMINISTRADOR'); // exclusivo Admin
    case 'aplicarPromocion':return hasRole(user, 'ADMINISTRADOR'); // exclusivo Admin
    default:                return false;
  }
}
