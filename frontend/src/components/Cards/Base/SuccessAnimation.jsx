import "./cards.css";

/**
 * Componente reutilizable para mostrar animaciones de éxito
 * Usado cuando se crea, guarda o elimina algo exitosamente
 * 
 * @param {boolean} show - Si debe mostrarse la animación
 * @param {string} message - Mensaje a mostrar (ej: "¡Venta registrada exitosamente!" la idea es que se aplique a todos los modulos pero que solo cambie el mensaje)
 */
export default function SuccessAnimation({ show, message }) {
  if (!show) return null;

  return (
    <div className="success-animation-overlay">
      <div className="success-animation-card">
        <div className="success-checkmark">
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h3 className="success-message">
          {message}
        </h3>
      </div>
    </div>
  );
}

