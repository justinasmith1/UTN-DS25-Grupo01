import { Link } from 'react-router-dom';

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
    <>
      <style>{`
        .hover-card {
          position: fixed;
          background: #0F4A3F; /* Verde ligeramente más claro que el sidebar */
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
          min-width: 200px;
          z-index: 1001; /* Por encima del sidebar pero debajo del header */
          overflow: hidden;
          pointer-events: auto;
        }

        /* Solo mostrar hover cards en desktop */
        @media (max-width: 768px) {
          .hover-card {
            display: none;
          }
        }

        .hover-card__title {
          padding: 12px 16px;
          font-weight: 700;
          font-size: 14px;
          color: var(--color-text-light);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .hover-card__separator {
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin: 0;
        }

        .hover-card__list {
          list-style: none;
          margin: 0;
          padding: 4px 0;
        }

        .hover-card__item {
          display: block;
          padding: 10px 16px;
          color: var(--color-text-light);
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          transition: background-color 0.12s ease, color 0.12s ease;
          cursor: pointer;
        }

        .hover-card__item:hover {
          background-color: rgba(255, 255, 255, 0.1);
          color: #EBB648; /* Amarillo al hover */
        }

        .hover-card__item--disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .hover-card__item--disabled:hover {
          background-color: transparent;
          color: var(--color-text-light);
        }

        .hover-card__message {
          padding: 16px;
          color: var(--color-text-light);
          font-size: 13px;
          text-align: center;
          font-style: italic;
          opacity: 0.8;
        }
      `}</style>

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
    </>
  );
}
