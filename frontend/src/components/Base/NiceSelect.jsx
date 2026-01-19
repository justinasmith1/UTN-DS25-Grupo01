// src/components/Base/NiceSelect.jsx
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * NiceSelect - Componente de select personalizado reutilizable
 * 
 * @param {string} value - Valor seleccionado
 * @param {Array<{value: string|number, label: string}>} options - Opciones disponibles
 * @param {string} placeholder - Texto placeholder (default: "Seleccionar")
 * @param {Function} onChange - Callback cuando cambia el valor
 * @param {boolean} usePortal - Si true, renderiza el menú en un portal (útil para modales)
 * @param {boolean} showPlaceholderOption - Si true, incluye el placeholder como opción seleccionable
 * @param {boolean} disabled - Si true, deshabilita el select
 */
export default function NiceSelect({
  value,
  options = [],
  placeholder = "Seleccionar",
  onChange,
  usePortal = false,
  showPlaceholderOption = false,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const listRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  // Calcular posición cuando se usa portal
  useEffect(() => {
    if (open && usePortal && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom, left: rect.left });
    }
  }, [open, usePortal]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open || disabled) return;
    const handleClick = (e) => {
      if (!btnRef.current?.contains(e.target) && !listRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, disabled]);

  // Cerrar si se deshabilita
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const label = options.find(o => `${o.value}` === `${value}`)?.label ?? placeholder;

  // Opciones a mostrar (incluir placeholder si showPlaceholderOption es true)
  const optionsToShow = showPlaceholderOption && placeholder
    ? [{ value: "", label: placeholder }, ...options]
    : options;

  // Contenido del menú
  const menuContent = open ? (
    <ul
      ref={listRef}
      className="ns-list"
      role="listbox"
      tabIndex={-1}
      style={usePortal ? {
        position: 'fixed',
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        width: btnRef.current ? `${btnRef.current.offsetWidth}px` : '233px',
        zIndex: 10000,
        maxHeight: '300px',
        overflowY: 'auto',
        backgroundColor: '#fff',
        border: '1px solid rgba(0,0,0,.14)',
        borderRadius: '10px',
        boxShadow: '0 12px 28px rgba(0,0,0,.18)',
        padding: '6px',
        margin: 0,
        listStyle: 'none'
      } : {}}
    >
      {optionsToShow.map(opt => (
        <li
          key={`${opt.value}::${opt.label}`}
          role="option"
          aria-selected={`${opt.value}` === `${value}`}
          className={`ns-item ${`${opt.value}` === `${value}` ? "is-active" : ""}`}
          onClick={() => {
            onChange?.(opt.value || "");
            setOpen(false);
          }}
        >
          {opt.label}
        </li>
      ))}
    </ul>
  ) : null;

  // Si está deshabilitado, mostrar solo el label
  if (disabled) {
    return (
      <div className="ns-wrap" style={{ position: "relative" }}>
        <div className="ns-trigger" style={{ opacity: 1, cursor: "default", pointerEvents: "none" }}>
          <span>{label}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ns-wrap" style={{ position: "relative" }}>
      <button
        type="button"
        ref={btnRef}
        className="ns-trigger"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
      >
        <span>{label}</span>
        <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden>
          <polyline points="5,7 10,12 15,7" stroke="#222" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {usePortal && typeof document !== 'undefined'
        ? createPortal(menuContent, document.body)
        : menuContent}
    </div>
  );
}
