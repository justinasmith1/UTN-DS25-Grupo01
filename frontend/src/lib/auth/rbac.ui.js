// src/lib/auth/rbac.ui.js
import { PERMISSIONS, userPermissions, can } from './rbac';

// ================================
// 1) Módulos visibles en la barra
// ================================
// Clave = key del módulo en la UI; valor = permiso mínimo para verlo.
export const MODULES = {
  ventas:        PERMISSIONS.SALE_ACCESS,
  inmobiliarias: PERMISSIONS.AGENCY_ACCESS,
  reservas:      PERMISSIONS.RES_ACCESS,
  reportes:       PERMISSIONS.REPORTS_ACCESS,
  personas:      PERMISSIONS.PEOPLE_ACCESS,
};

export function visibleModulesForUser(user) {
  return Object.entries(MODULES).filter(([_, perm]) => can(user, perm));
}

// ======================================================
// 2) Acciones del tablero de Lotes (botones por fila)
// ======================================================
export function canDashboardAction(user, action) {
  switch (action) {
    // Lotes
    case 'visualizarLote':   return can(user, PERMISSIONS.LOT_VIEW);
    case 'editarLote':       return can(user, PERMISSIONS.LOT_EDIT);
    case 'registrarVenta':   return can(user, PERMISSIONS.SALE_CREATE);     // Admin + Gestor
    case 'eliminarLote':     return can(user, PERMISSIONS.LOT_DELETE);      // Admin + Gestor
    case 'aplicarPromocion': return can(user, PERMISSIONS.LOT_PROMO);       // Admin + Gestor
    
    // Ventas
    case 'visualizarVenta':  return can(user, PERMISSIONS.SALE_VIEW);
    case 'editarVenta':      return can(user, PERMISSIONS.SALE_EDIT);
    case 'eliminarVenta':    return can(user, PERMISSIONS.SALE_DELETE);
    case 'verDocumentos':    return can(user, PERMISSIONS.SALE_VIEW);
    
    // Reservas
    case 'visualizarReserva':  return can(user, PERMISSIONS.RES_VIEW);
    case 'editarReserva':      return can(user, PERMISSIONS.RES_EDIT);
    case 'eliminarReserva':    return can(user, PERMISSIONS.RES_DELETE);
    
    // Personas
    case 'visualizarPersona':  return can(user, PERMISSIONS.PEOPLE_VIEW);
    case 'editarPersona':      return can(user, PERMISSIONS.PEOPLE_EDIT);
    case 'eliminarPersona':    return can(user, PERMISSIONS.PEOPLE_DELETE);
    
    default:                 return false;
  }
}

// ==========================================
// 3) Helpers de visibilidad para FilterBar
// ==========================================

// Estado: ocultar "NO_DISPONIBLE" para Inmobiliaria (el resto ve todos)
export function filterEstadoOptionsFor(user, allEstados) {
  const perms = new Set(userPermissions(user));
  const isInmo = perms.has(PERMISSIONS.RES_ACCESS) && !perms.has(PERMISSIONS.SALE_ACCESS);
  return isInmo ? allEstados.filter((e) => e !== 'NO_DISPONIBLE') : allEstados;
}

// Filtro "Deudor": ocultar para Inmobiliaria
export function canUseDeudorFilter(user) {
  const perms = new Set(userPermissions(user));
  const isInmo = perms.has(PERMISSIONS.RES_ACCESS) && !perms.has(PERMISSIONS.SALE_ACCESS);
  return !isInmo;
}
