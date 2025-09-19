// Defino permisos y mapeo por rol usando los enums de Prisma que definimos.
// Roles: ADMINISTRADOR, TECNICO, GESTOR, INMOBILIARIA
// Esto nos sirve para hacer checks de permisos en frontend (y también en backend si queremos,
// pero no creo).

// Permisos atómicos (los uso luego en <Can ...>)
export const PERMISSIONS = {
  // mapa / panel
  MAP_ACCESS: 'map:access',
  MAP_FILTER: 'map:filter',
  MAP_OPEN_PANEL: 'map:open-lot-panel',
  LOT_VIEW: 'lot:view',
  LOT_DETAIL: 'lot:detail:view',
  LOT_EDIT: 'lot:edit',
  LOT_DELETE: 'lot:delete',
  LOT_CREATE: 'lot:create',
  LOT_RESERVE: 'lot:reserve',
  // ventas
  SALE_ACCESS: 'sale:access',
  SALE_VIEW: 'sale:view',
  SALE_CREATE: 'sale:create',
  SALE_EDIT: 'sale:edit',
  SALE_DELETE: 'sale:delete',
  // reservas
  RES_ACCESS: 'reservation:access',
  RES_VIEW: 'reservation:view',
  RES_CREATE: 'reservation:create',
  RES_EDIT: 'reservation:edit',
  RES_DELETE: 'reservation:delete',
  // inmobiliarias
  AGENCY_ACCESS: 'agency:access',
  AGENCY_VIEW: 'agency:view',
  AGENCY_CREATE: 'agency:create',
  AGENCY_EDIT: 'agency:edit',
  AGENCY_DELETE: 'agency:delete',
  // personas
  PEOPLE_ACCESS: 'people:access',
  OWNERS_VIEW: 'people:owners:view',
  OWNERS_CREATE: 'people:owners:create',
  OWNERS_EDIT: 'people:owners:edit',
  OWNERS_DELETE: 'people:owners:delete',
  TENANTS_VIEW: 'people:tenants:view',
  TENANTS_CREATE: 'people:tenants:create',
  TENANTS_EDIT: 'people:tenants:edit',
  TENANTS_DELETE: 'people:tenants:delete',
  // otros
  REPORTS_ACCESS: 'reports:access',
  ACCOUNT_ACCESS: 'account:access',
};

const MAP_BASE = [
  PERMISSIONS.MAP_ACCESS,
  PERMISSIONS.MAP_FILTER,
  PERMISSIONS.MAP_OPEN_PANEL,
  PERMISSIONS.LOT_VIEW,
  PERMISSIONS.LOT_DETAIL,
];

// Mapeo por rol (tal cual tu descripción)
export const ROLE_PERMISSIONS = {
  ADMINISTRADOR: [
    ...MAP_BASE,
    PERMISSIONS.LOT_EDIT,
    PERMISSIONS.LOT_RESERVE,
    PERMISSIONS.LOT_CREATE,
    PERMISSIONS.LOT_DELETE,
    PERMISSIONS.SALE_ACCESS,
    PERMISSIONS.SALE_VIEW,
    PERMISSIONS.SALE_CREATE,
    PERMISSIONS.SALE_EDIT,
    PERMISSIONS.SALE_DELETE,
    PERMISSIONS.RES_ACCESS,
    PERMISSIONS.RES_VIEW,
    PERMISSIONS.RES_CREATE,
    PERMISSIONS.RES_EDIT,
    PERMISSIONS.RES_DELETE,
    PERMISSIONS.AGENCY_ACCESS,
    PERMISSIONS.AGENCY_VIEW,
    PERMISSIONS.AGENCY_CREATE,
    PERMISSIONS.AGENCY_EDIT,
    PERMISSIONS.AGENCY_DELETE,
    PERMISSIONS.PEOPLE_ACCESS,
    PERMISSIONS.OWNERS_VIEW,
    PERMISSIONS.OWNERS_CREATE,
    PERMISSIONS.OWNERS_EDIT,
    PERMISSIONS.OWNERS_DELETE,
    PERMISSIONS.TENANTS_VIEW,
    PERMISSIONS.TENANTS_CREATE,
    PERMISSIONS.TENANTS_EDIT,
    PERMISSIONS.TENANTS_DELETE,
    PERMISSIONS.REPORTS_ACCESS,
    PERMISSIONS.ACCOUNT_ACCESS,
  ],
  TECNICO: [
    ...MAP_BASE,
    PERMISSIONS.LOT_EDIT,
    PERMISSIONS.REPORTS_ACCESS,
    PERMISSIONS.ACCOUNT_ACCESS,
    // (sin delete/ventas/reservas/personas/inmobiliarias)
  ],
  GESTOR: [
    ...MAP_BASE,
    PERMISSIONS.LOT_EDIT,
    PERMISSIONS.REPORTS_ACCESS,
    PERMISSIONS.ACCOUNT_ACCESS,
    // (igual que Técnico según lo que definiste para Legales)
  ],
  INMOBILIARIA: [
    ...MAP_BASE,
    PERMISSIONS.LOT_RESERVE, // no edita lote
    PERMISSIONS.RES_ACCESS,
    PERMISSIONS.RES_VIEW,
    PERMISSIONS.RES_CREATE,
    PERMISSIONS.RES_EDIT, // sin delete
    PERMISSIONS.ACCOUNT_ACCESS,
  ],
};

//-----------------
// Helpers simples
//-----------------

// Este es para cuando el user puede tener un role o roles (array). Gralmente va a ser uno solo
export function userRoles(user) {
  const role = user?.role;
  const roles = Array.isArray(user?.roles) ? user.roles : (role ? [role] : []);
  return roles;
}

// Este es para cuando el user puede tener un role o roles (array). Gralmente va a ser uno solo
export function userPermissions(user) {
  const roles = userRoles(user);
  const perms = new Set();
  roles.forEach((r) => (ROLE_PERMISSIONS[r] || []).forEach((p) => perms.add(p)));
  return [...perms];
}

// Checkea si el user tiene un rol (uno solo o varios)
export function hasRole(user, role) {
  return userRoles(user).includes(role);
}

// Checkea si el user tiene un permiso (uno solo o varios)
export function can(user, permission) {
  return userPermissions(user).includes(permission);
}
