import { Link } from 'react-router-dom';
import './HoverCard.css';

/**
 * Componente HoverCard
 * Muestra un card flotante con opciones del módulo al hacer hover sobre un SidebarItem.
 * 
 * @param {string} title - Título del módulo
 * @param {Array} items - Array de opciones { label, to, disabled }
 * @param {boolean} show - Si debe mostrarse el card
 * @param {Object} position - Posición { top, left } para posicionar el card
 */
export default function HoverCard({ title, items = [], show = false, position = { top: 0, left: 0 } }) {
  if (!show) return null;

  return (
    <div
      className="hover-card"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
        <div className="hover-card__title">{title}</div>
        <hr className="hover-card__separator" />
        {items.length > 0 ? (
          <ul className="hover-card__list">
            {items.map((item, idx) => {
              if (item.disabled) {
                return (
                  <li key={idx}>
                    <div className="hover-card__item hover-card__item--disabled" role="menuitem" aria-disabled="true">
                      {item.label}
                    </div>
                  </li>
                );
              }
              if (item.to) {
                return (
                  <li key={idx}>
                    <Link
                      to={item.to}
                      className="hover-card__item"
                      role="menuitem"
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              }
              return (
                <li key={idx}>
                  <div className="hover-card__item hover-card__item--disabled" role="menuitem" aria-disabled="true">
                    {item.label}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="hover-card__message">Módulo en desarrollo</div>
        )}
    </div>
  );
}
