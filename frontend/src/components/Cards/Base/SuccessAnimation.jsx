import "./cards.css";

/**
 * Componente reutilizable para mostrar animaciones de éxito
 * Usado cuando se crea, guarda o elimina algo exitosamente
 * 
 * @param {boolean} show - Si debe mostrarse la animación
 * @param {string} message - Mensaje a mostrar (ej: "¡Venta registrada exitosamente!")
 */
export default function SuccessAnimation({ show, message }) {
  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "grid",
        placeItems: "center",
        zIndex: 10000,
        animation: "fadeIn 0.2s ease-in",
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "32px 48px",
          borderRadius: "12px",
          boxShadow: "0 12px 32px rgba(0,0,0,0.3)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
          animation: "scaleIn 0.3s ease-out",
        }}
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "#10b981",
            display: "grid",
            placeItems: "center",
            animation: "checkmark 0.5s ease-in-out",
          }}
        >
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
        <h3
          style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: 600,
            color: "#111",
          }}
        >
          {message}
        </h3>
      </div>
    </div>
  );
}

