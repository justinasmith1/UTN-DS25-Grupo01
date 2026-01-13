import { useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { visibleModulesForUser } from '../../lib/auth/rbac.ui';
import SidebarItem from './SidebarItem';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  SaleTag01Icon,
  RealEstate02Icon,
  Appointment02Icon,
  ChartUpIcon,
  UserGroupIcon,
  Flag03Icon,
} from '@hugeicons/core-free-icons';

// Hook para obtener rol del usuario (helper) - igual que ModulePills
function useUserRole() {
  const { user } = useAuth();
  return (user?.role ?? user?.rol ?? "ADMIN").toString().trim().toUpperCase();
}

// Meta UI para módulos: componente de ícono, ruta y label
// Orden: Prioridades, Reservas, Ventas, Inmobiliarias, Personas, Reportes
const MODULES_META = {
  prioridades: {
    icon: Flag03Icon,
    path: null, // No navega a ninguna ruta
    label: 'Prioridades',
    disabled: true, // Marcado como deshabilitado
  },
  reservas: {
    icon: Appointment02Icon,
    path: '/reservas',
    label: 'Reservas',
  },
  ventas: {
    icon: SaleTag01Icon,
    path: '/ventas',
    label: 'Ventas',
  },
  inmobiliarias: {
    icon: RealEstate02Icon,
    path: '/inmobiliarias',
    label: 'Inmobiliarias',
  },
  personas: {
    icon: UserGroupIcon,
    path: '/personas',
    label: 'Personas',
  },
  reportes: {
    icon: ChartUpIcon,
    path: '/reportes',
    label: 'Reportes',
  },
};

// Orden correcto de módulos (de arriba hacia abajo en el sidebar)
const MODULES_ORDER = ['prioridades', 'reservas', 'ventas', 'inmobiliarias', 'personas', 'reportes'];

export default function Sidebar() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const userRole = useUserRole();

  // Obtener módulos visibles según permisos (misma lógica que ModulePills)
  const visibleModules = visibleModulesForUser(user);
  const visibleModuleKeys = new Set(visibleModules.map(([key]) => key));

  // Ordenar módulos según el orden definido, respetando permisos
  // Prioridades siempre se muestra (aunque esté deshabilitado)
  const orderedModuleKeys = MODULES_ORDER.filter(
    key => key === 'prioridades' || visibleModuleKeys.has(key)
  );

  // Generar menús exactamente igual que ModulePills
  // Personas: diferentes opciones según rol
  const personasMenu = userRole === 'INMOBILIARIA' 
    ? [
        { label: 'Ver Mis Clientes', to: '/personas?view=MIS_CLIENTES', disabled: false },
      ]
    : [
        { label: 'Ver Todos', to: '/personas?view=ALL', disabled: false },
        { label: 'Ver Propietarios', to: '/personas?view=PROPIETARIOS', disabled: false },
        { label: 'Ver Inquilinos', to: '/personas?view=INQUILINOS', disabled: false },
        { label: 'Ver Clientes', to: '/personas?view=CLIENTES', disabled: false },
      ];

  // Menús por módulo - EXACTAMENTE igual que ModulePills
  const MENU = useMemo(() => ({
    ventas: [
      { label: 'Ver Ventas', to: '/ventas', disabled: false },
      { label: 'Registrar Venta', to: '/ventas?crear=true', disabled: false },
    ],
    inmobiliarias: [
      { label: 'Ver Inmobiliarias', to: '/inmobiliarias', disabled: false },
      { label: 'Registrar Inmobiliaria', to: '/inmobiliarias?crear=true', disabled: false },
    ],
    reservas: [
      { label: 'Ver Reservas', to: '/reservas', disabled: false },
      { label: 'Registrar Reserva', to: '/reservas?crear=true', disabled: false },
    ],
    reportes: [
      { label: 'Ver Reportes', to: '/reportes', disabled: false },
      { label: 'Descargar Reporte', to: null, disabled: true },
    ],
    personas: personasMenu,
    lotes: [
      { label: 'Ver Lotes', to: '/dashboard', disabled: false },
    ],
  }), [personasMenu]);

  return (
    <>
      <style>{`
        .sidebar {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          width: 64px; /* Ancho colapsado: solo íconos */
          background: var(--color-header-bg); /* Mismo verde que el header #0D3730 */
          z-index: 1021; /* Por encima del header (sticky-top de Bootstrap usa z-index 1020) */
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 90px; /* Espacio para el header (logo 55px + padding vertical) */
          box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
          border: none; /* Eliminar cualquier borde */
        }
        
        /* Extender el sidebar sobre la altura del header para cubrir cualquier línea o sombra visible */
        .sidebar::after {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          width: 64px;
          height: 83px; /* Altura total del header: 55px logo + 14px padding-top + 14px padding-bottom */
          background: var(--color-header-bg);
          z-index: -1; /* Detrás del contenido del sidebar pero cubriendo la zona del header */
        }

        .sidebar-item-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 8px;
          width: 100%;
        }

        .sidebar-item {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-light);
          text-decoration: none;
          border-radius: 8px;
          transition: background-color 0.15s ease, transform 0.1s ease;
          cursor: pointer;
          position: relative;
        }

        .sidebar-item:hover:not(.sidebar-item--disabled) {
          background-color: rgba(255, 255, 255, 0.1);
          transform: translateY(-1px);
        }

        .sidebar-item--active {
          background-color: rgba(255, 255, 255, 0.08); /* Fondo ligeramente más claro */
          position: relative;
        }

        /* Barra lateral fina para estado activo */
        .sidebar-item--active::before {
          content: "";
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 60%;
          background-color: rgba(255, 255, 255, 0.6);
          border-radius: 0 2px 2px 0;
        }

        .sidebar-item--active:hover {
          background-color: rgba(255, 255, 255, 0.12);
        }

        .sidebar-item--disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .sidebar-item--disabled:hover {
          transform: none;
          background-color: transparent;
        }

        /* Contexto de vista para Personas (ej: "Viendo: Todos") */
        .sidebar-item-context {
          font-size: 9px;
          color: #EBB648;
          margin-top: 2px;
          text-align: center;
          font-weight: 500;
          line-height: 1;
          white-space: nowrap;
          max-width: 48px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Asegurar que el contenido principal no quede detrás del sidebar */
        .layout-with-sidebar {
          margin-left: 64px;
        }
      `}</style>

      <nav className="sidebar" role="navigation" aria-label="Navegación principal">
        {/* Renderizar módulos en el orden correcto, respetando permisos */}
        {orderedModuleKeys.map((key) => {
          const meta = MODULES_META[key];
          if (!meta) return null;

          // Obtener view actual para Personas (misma lógica que ModulePills)
          const isPersonasActive = key === 'personas' && pathname.startsWith(meta.path);
          const currentView = isPersonasActive
            ? (searchParams.get('view') || (userRole === 'INMOBILIARIA' ? 'MIS_CLIENTES' : 'ALL'))
            : null;

          return (
            <SidebarItem
              key={key}
              icon={meta.icon}
              path={meta.path}
              label={meta.label}
              disabled={meta.disabled}
              isActive={pathname.startsWith(meta.path)}
              menuItems={MENU[key] || []}
              currentView={currentView} // Para mostrar contexto en Personas
            />
          );
        })}
      </nav>
    </>
  );
}
