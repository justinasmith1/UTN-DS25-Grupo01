import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../app/providers/AuthProvider';
import { visibleModulesForUser, MODULES } from '../lib/auth/rbac.ui';

export default function ModulePills() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  // modules = [['ventas', {...}], ...]
  let modules = visibleModulesForUser(user);

  // 🔁 Fallback: si RBAC no trae nada, mostramos todos para que no desaparezcan
  if (!modules || modules.length === 0) {
    modules = Object.entries(MODULES);
  }

  const pillStyle = (active) => ({
    background: active ? 'var(--color-module-active-bg)' : 'var(--color-module-inactive-bg)',
    color: 'var(--color-module-text)',
    borderRadius: 999,
    padding: '10px 18px',
    textDecoration: 'none',
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    boxShadow: 'var(--elev-1), var(--border-inside-1)',
    letterSpacing: '.2px',
    lineHeight: 1,
  });

  return (
    <div style={{ paddingTop: 8, paddingBottom: 8 }}>
      <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {modules.map(([key, mod]) => {
          const active = pathname.startsWith(mod.path);
          return (
            <Link key={key} to={mod.path} aria-current={active ? 'page' : undefined} style={pillStyle(active)}>
              {MODULES[key].label}
              <span aria-hidden>▾</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
