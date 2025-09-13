// Switch de rol SOLO visible en modo mock.
// Me permite probar permisos sin re-loguear.
// No afecta producción porque se oculta si VITE_AUTH_USE_MOCK !== "true".
// Dsp lo sacamos, es solo para desarrollo y probar algunas cositas.

import React from "react";
import { useAuth } from "../app/providers/AuthProvider";

const USE_MOCK = import.meta.env.VITE_AUTH_USE_MOCK === "true";

// Enum de Prisma (tal cual lo definiste)
const ROLES = ["ADMINISTRADOR", "TECNICO", "GESTOR", "INMOBILIARIA"];

export default function RoleSwitcher({ className = "" }) {
  const { user, setUser } = useAuth();

  if (!USE_MOCK || !user) return null; // en real o sin usuario, no muestro nada

  function handleChange(e) {
    const role = e.target.value;

    // Actualizo el usuario manteniendo sus datos, pero cambiando el rol.
    // Nota: guardo 'role' y 'roles' (array) para que todo el front quede consistente.
    setUser((prev) => ({
      ...prev,
      role,
      roles: [role],
      inmobiliariaId: role === "INMOBILIARIA" ? (prev?.inmobiliariaId ?? 101) : null,
    }));
  }

  return (
    <select
      aria-label="Cambiar rol (mock)"
      className={className}
      value={user?.role ?? ""}
      onChange={handleChange}
      title="Cambiar rol (modo mock)"
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </select>
  );
}
