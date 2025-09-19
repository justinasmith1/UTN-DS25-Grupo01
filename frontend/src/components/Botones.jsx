// src/components/Botones.jsx
// Renderiza los módulos del Dashboard según el rol del usuario.
// Lee reglas desde rbac.js (una única fuente de verdad de los permisos).

import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../app/providers/AuthProvider';
import { visibleModulesForUser, MODULES } from '../lib/auth/rbac.ui';

export default function Botones() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const modules = visibleModulesForUser(user); // [['ventas', {label, path, ...}], ...]

  return (
    <nav style={{
      display: 'flex', flexWrap: 'wrap', gap: 12,
      padding: '12px 0',
    }}>
      {modules.map(([key, mod]) => {
        const active = pathname.startsWith(mod.path);

        const style = {
          background: active ? '#EBB648' : '#0D3730',       // dentro / fuera del módulo
          color: '#FFFFFF',
          borderRadius: 999,
          padding: '8px 16px',
          textDecoration: 'none',
          fontWeight: 600,
          boxShadow: '-2px 2px 4px 1px rgba(0,0,0,0.25)',   // sombra Figma
          border: '1px solid rgba(0,0,0,0.85)',             // borde interior simulado
        };

        return (
          <Link key={key} to={mod.path} style={style}>
            {MODULES[key].label}
          </Link>
        );
      })}
    </nav>
  );
}
