// Componente de guardia para UI por permiso.
// Si tengo el permiso, muestro el children; si no, no muestro nada.
// Esto para q cada rol tenga su propia UI y vea lo que tenga que ver

import React from "react";
import { useAuth } from "../app/providers/AuthProvider";
import { can as canCheck } from "../lib/auth/rbac";

export default function Can({ permission, children, fallback = null }) {
  // Leo el usuario actual del contexto
  const { user } = useAuth();

  // Si tengo el permiso, muestro el contenido; si no, muestro el fallback (o nada)
  return canCheck(user, permission) ? <>{children}</> : <>{fallback}</>;
}
