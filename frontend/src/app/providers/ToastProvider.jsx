// src/app/providers/ToastProvider.jsx
// Manejador global de toasts. Lo uso para reemplazar "alert" por mensajes lindos.

import React, { createContext, useContext, useMemo, useState } from "react";
import { Toast, ToastContainer } from "react-bootstrap";

const ToastCtx = createContext(null);

export default function ToastProvider({ children }) {
  // Guardo los toasts activos
  const [toasts, setToasts] = useState([]);

  // Agrego un toast (tipo: 'success' | 'error' | 'info')
  const push = (type, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    return id;
  };

  // Atajos cómodos
  const success = (msg) => push("success", msg);
  const error = (msg) => push("error", msg);
  const info = (msg) => push("info", msg);

  // Cierro un toast
  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const value = useMemo(() => ({ success, error, info, push, remove }), []);

  return (
    <ToastCtx.Provider value={value}>
      {children}

      {/* Contenedor visual de toasts (arriba a la derecha) */}
      <ToastContainer position="top-end" className="p-3">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            bg={t.type === "success" ? "success" : t.type === "error" ? "danger" : "secondary"}
            onClose={() => remove(t.id)}
            autohide
            delay={4000}
          >
            <Toast.Header closeButton>
              <strong className="me-auto">
                {t.type === "success" ? "Listo" : t.type === "error" ? "Ups" : "Aviso"}
              </strong>
            </Toast.Header>
            <Toast.Body className="text-white">{t.message}</Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </ToastCtx.Provider>
  );
}

// Hook para usar en componentes
export function useToast() {
  return useContext(ToastCtx);
}
