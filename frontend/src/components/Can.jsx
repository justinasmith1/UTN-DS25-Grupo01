// Componente de guardia para UI por permiso.
// Si tengo el permiso, muestro el children; si no, no muestro nada.
// Esto para q cada rol tenga su propia UI y vea lo que tenga que ver

import React from "react";
import { useAuth } from "../providers/AuthProvider";   // ajusto la ruta según mi proyecto
import { can as canCheck } from "../../lib/auth/rbac"; // ajusto la ruta según mi proyecto

// Si estoy maquetando, desactivo el gating visual
const DISABLE_UI_GATING = import.meta.env.VITE_RBAC_DISABLE_UI === "true";

export default function Can({ permission, children, fallback = null }) {
  // Si el flag está activo, dejo ver siempre
  if (DISABLE_UI_GATING) return <>{children}</>;

  // Si tengo el permiso, muestro; si no, muestro el fallback (o nada)
  const { user } = useAuth();
  return canCheck(user, permission) ? <>{children}</> : <>{fallback}</>;
}
