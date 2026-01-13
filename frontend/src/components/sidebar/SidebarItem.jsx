import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import HoverCard from './HoverCard';

// Mapeo de vistas a labels (para Personas) - igual que ModulePills
const VIEW_LABELS = {
  ALL: 'Todos',
  PROPIETARIOS: 'Propietarios',
  INQUILINOS: 'Inquilinos',
  CLIENTES: 'Clientes',
  MIS_CLIENTES: 'Mis Clientes',
};

/**
 * Componente SidebarItem
 * Renderiza un ítem del sidebar con ícono y área clickeable generosa.
 * Muestra un hover card con opciones al hacer hover.
 * 
 * @param {Object} icon - Ícono de Hugeicons (importado desde @hugeicons/core-free-icons)
 * @param {string} path - Ruta a la que navega el ítem
 * @param {string} label - Label del módulo (para aria-label)
 * @param {boolean} disabled - Si está deshabilitado (ej: Prioridades no implementado)
 * @param {boolean} isActive - Si la ruta actual coincide con este ítem
 * @param {Array} menuItems - Opciones del menú para el hover card
 * @param {string} currentView - Vista actual (para Personas: 'ALL', 'PROPIETARIOS', etc.)
 */
export default function SidebarItem({ 
  icon, 
  path, 
  label, 
  disabled = false, 
  isActive = false,
  menuItems = [],
  currentView = null
}) {
  const location = useLocation();
  const itemRef = useRef(null);
  const hoverCardRef = useRef(null);
  const [showHoverCard, setShowHoverCard] = useState(false);
  const [hoverCardPosition, setHoverCardPosition] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef(null);

  const active = isActive || (path && location.pathname.startsWith(path));

  // Calcular posición del hover card
  useEffect(() => {
    const updatePosition = () => {
      if (showHoverCard && itemRef.current) {
        const rect = itemRef.current.getBoundingClientRect();
        // Posicionar a la derecha del sidebar, alineado con el ítem
        setHoverCardPosition({
          top: rect.top,
          left: rect.right + 8, // 8px de separación del sidebar
        });
      }
    };

    updatePosition();

    // Actualizar posición en scroll y resize
    if (showHoverCard) {
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [showHoverCard]);

  // Manejar hover
  const handleMouseEnter = () => {
    // Limpiar timeout si existe
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    // Mostrar hover card si no está deshabilitado O si es Prioridades (para mostrar "Módulo en desarrollo")
    if (!disabled || menuItems.length === 0) {
      setShowHoverCard(true);
    }
  };

  const handleMouseLeave = () => {
    // Pequeño delay para permitir mover el mouse al hover card
    timeoutRef.current = setTimeout(() => {
      setShowHoverCard(false);
    }, 100);
  };

  const handleHoverCardEnter = () => {
    // Cancelar el timeout si el mouse entra al hover card
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleHoverCardLeave = () => {
    setShowHoverCard(false);
  };

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Si está deshabilitado, renderizar como div sin navegación
  if (disabled) {
    return (
      <>
        <div
          ref={itemRef}
          className="sidebar-item-wrapper"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <div
            className="sidebar-item sidebar-item--disabled"
            aria-label={label}
            role="button"
            aria-disabled="true"
            style={{
              opacity: 0.5,
              cursor: 'not-allowed',
            }}
          >
            {icon && (
              <HugeiconsIcon
                icon={icon}
                size={22}
                color="currentColor"
                strokeWidth={1.5}
              />
            )}
          </div>
        </div>
        <div
          ref={hoverCardRef}
          onMouseEnter={handleHoverCardEnter}
          onMouseLeave={handleHoverCardLeave}
        >
          <HoverCard
            title={label}
            items={[]} // Sin opciones para módulos deshabilitados
            show={showHoverCard}
            position={hoverCardPosition}
          />
        </div>
      </>
    );
  }

  // Obtener label de vista para Personas
  const viewLabel = currentView ? VIEW_LABELS[currentView] || currentView : null;
  const showViewContext = isActive && currentView && viewLabel;

  return (
    <>
      <div
        ref={itemRef}
        className="sidebar-item-wrapper"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Link
          to={path}
          className={`sidebar-item ${active ? 'sidebar-item--active' : ''}`}
          aria-label={label}
          role="menuitem"
          aria-current={active ? 'page' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon && (
            <HugeiconsIcon
              icon={icon}
              size={22}
              color="currentColor"
              strokeWidth={1.5}
            />
          )}
        </Link>
        
        {/* Contexto actual para Personas (ej: "Viendo: Todos") */}
        {showViewContext && (
          <div className="sidebar-item-context" title={`Viendo: ${viewLabel}`}>
            {viewLabel}
          </div>
        )}
      </div>
      <div
        ref={hoverCardRef}
        onMouseEnter={handleHoverCardEnter}
        onMouseLeave={handleHoverCardLeave}
      >
        <HoverCard
          title={label}
          items={menuItems}
          show={showHoverCard}
          position={hoverCardPosition}
        />
      </div>
    </>
  );
}
