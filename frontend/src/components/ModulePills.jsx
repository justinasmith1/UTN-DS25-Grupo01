import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../app/providers/AuthProvider';
import { visibleModulesForUser, MODULES } from '../lib/auth/rbac.ui';

export default function ModulePills() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  // Visibles por RBAC (fallback a todos si no llega nada)
  let modules = visibleModulesForUser(user);
  if (!modules || modules.length === 0) modules = Object.entries(MODULES);

  /* ==== CONTROLES RÁPIDOS ==== */
  const BAR_HEIGHT   = 52;                   // alto de la barra
  const OVERLAP_PX   = 10;                   // solape para cubrir sombra/borde del header
  const SEP_ALPHA    = 0.18;                 // opacidad separadores
  const HOVER_TINT   = 'rgba(255,255,255,0.06)';
  const LINE_COLOR   = 'rgba(255,255,255,0.14)'; // única línea entre header y barra
  const PADDING_X    = 34;                   // padding horizontal del segmento (deja lugar al caret)
  /* ========================== */

  return (
    <>
      <style>{`
        /* Full width real y pegado al header */
        .mods-wrapper {
          width: 100vw;
          position: relative;
          left: 50%; right: 50%;
          margin-left: -50vw; margin-right: -50vw;
          margin-top: 1.5px;
          top: -${OVERLAP_PX}px;             /* ← cubre la sombra/borde del header */
          z-index: 10;                        /* por encima del header */
        }

        .mods-bar {
          position: relative;
          display: flex;
          align-items: stretch;
          justify-content: stretch;
          height: ${BAR_HEIGHT}px;
          background: var(--color-header-bg);
          border-radius: 0;                   /* sin bordes */
          overflow: hidden;
          box-shadow: var(--elev-1);          /* leve elevación */

          /* ÚNICA línea separadora (nosotros la dibujamos) */
        }
        .mods-bar::before {
          content: "";
          position: absolute;
          left: 0; right: 0; top: 0;
          height: 1px;
          background: ${LINE_COLOR};
        }

        .mods-item {
          flex: 1 1 0;
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;            /* texto centrado */
          color: var(--color-text-light);
          text-decoration: none;
          font-weight: 600;
          letter-spacing: .2px;
          padding: 0 ${PADDING_X}px;
          background: transparent;
          transition: background .12s ease, transform .06s ease;
          user-select: none;
        }

        /* Separador a TODO el alto */
        .mods-item:not(:last-child)::after {
          content: "";
          position: absolute;
          top: 0; bottom: 0; right: 0;        /* ← recorre todo el alto */
          width: 1px;
          background: rgba(255,255,255,${SEP_ALPHA});
        }

        .mods-item:hover {
          background: ${HOVER_TINT};
          transform: translateY(-1px);
        }

        /* Activo sutil */
        .mods-item[aria-current="page"] {
          background: rgba(255,255,255,0.09);
        }

        /* Caret a la derecha, el nombre centrado */
        .mods-caret {
          position: absolute;
          right: 12px;
          opacity: .9;
          font-size: 0.9em;
          transform: translateY(-1px);
        }
      `}</style>

      <div className="mods-wrapper">
        <nav className="mods-bar">
          {modules.map(([key, mod]) => {
            const active = pathname.startsWith(mod.path);
            return (
              <Link
                key={key}
                to={mod.path}
                aria-current={active ? 'page' : undefined}
                className="mods-item"
              >
                {MODULES[key].label}
                <span className="mods-caret" aria-hidden>▾</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
