// Guardia por rol (uso cuando tenga roles reales en user.roles).
// Si el usuario no tiene alguno de los roles requeridos, no muestro nada.

import React from 'react';
import { useAuth } from '../providers/AuthProvider';

export default function RequireRole({ roles = [], children }) {
  const { user } = useAuth();
  const ok = Array.isArray(user?.roles) && user.roles.some((r) => roles.includes(r));
  if (!ok) return null;
  return children;
}