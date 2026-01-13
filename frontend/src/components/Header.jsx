"use client"
import { Navbar, Container } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
import logo from "../assets/logoCompleto.png";

export default function Header({ onUserClick, user }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user: authUser, logout } = useAuth();
  const currentUser = authUser || user;

  const isMap = pathname.startsWith("/map");
  const isDashboard = pathname === "/" || pathname.startsWith("/dashboard");

  /* ====== CONTROLES RÁPIDOS ====== */
  const TABS_BORDER_RADIUS = 4;
  const GAP_BRAND_TABS = 60;
  const PADDING_L = 60;
  const PADDING_R = 12;
  const HEADER_PAD_V = 14;
  /* ========================================== */

  // nombre real del usuario (varios posibles campos)
  const firstName = (() => {
    const u = currentUser || {};
    const candidates = [
      u.name, u.nombre, u.fullName, u.given_name, u.username,
      (u.email && u.email.split("@")[0])
    ].filter(Boolean);
    return (candidates[0] || "Usuario").toString().split(" ")[0];
  })();

  return (
      <Navbar
      expand="lg"
      className="sticky-top"
      style={{
        background: 'var(--color-header-bg)',
        color: 'var(--color-text-light)',
        boxShadow: 'var(--elev-1)',
        paddingTop: HEADER_PAD_V,
        paddingBottom: HEADER_PAD_V,
        border: 'none', /* Eliminar cualquier borde del Navbar de Bootstrap */
        marginLeft: 0, /* Sin margen: el wrapper en Layout.jsx ya maneja el desplazamiento del sidebar */
      }}
    >
      {/* estilos de hover/active para tabs y logout */}
      <style>{`
        /* Asegurar que el header no tenga borde visible en la zona del sidebar */
        .navbar.sticky-top {
          border-left: none;
          position: relative;
        }
        
        /* Cubrir la zona del sidebar en el header para eliminar sombra visible */
        .navbar.sticky-top::before {
          content: '';
          position: absolute;
          left: -64px;
          top: 0;
          width: 64px;
          height: 100%;
          background: var(--color-header-bg);
          z-index: -1;
        }
        
        .cclf-tab, .cclf-logout {
          border: 1px solid rgba(0,0,0,0.85);
          border-radius: ${TABS_BORDER_RADIUS}px;
          font-weight: 700; line-height:1.1; cursor:pointer;
          box-shadow: var(--elev-1);
          transition: background .12s ease, transform .06s ease, box-shadow .12s ease;
        }
        .cclf-tab { color: var(--color-tab-text); }
        .cclf-tab--active { background: #926F25; }         /* mismo estilo que hover cuando está activo */
        .cclf-tab--idle   { background: #EBB648; }         /* var(--color-tab-inactive) */

        /* Hover: un pelín más oscuro + leve elevación */
        .cclf-tab--active:hover { background: #926F25; transform: translateY(-1px); }
        .cclf-tab--idle:hover   { background: #926F25; transform: translateY(-1px); }

        /* Cuando está deshabilitado (activo), no debe tener cursor pointer ni ser clickeable */
        .cclf-tab:disabled {
          cursor: not-allowed;
          opacity: 1;
        }

        /* Logout igual a las tabs inactivas */
        .cclf-logout { background: #EBB648; color: #000; }
        .cclf-logout:hover { background: #D1A43F; transform: translateY(-1px); }
      `}</style>

      <Container fluid style={{ paddingLeft: PADDING_L, paddingRight: PADDING_R }}>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          {/* IZQ: brand */}
          <div className="d-flex align-items-center">
            <img 
              src={logo} 
              alt="Club de Campo La Federala" 
              style={{ height: '55px', width: 'auto' }} 
            />
          </div>

          {/* CENTRO: tabs (acercadas al brand) */}
          <div style={{ display: 'flex', gap: 16, marginLeft: GAP_BRAND_TABS }}>
            <button
              type="button"
              className={`cclf-tab ${isMap ? "cclf-tab--active" : "cclf-tab--idle"}`}
              style={{ minWidth: 130, padding: "11px 30px" }}
              onClick={() => navigate("/map")}
              disabled={isMap}
            >
              Mapa
            </button>
            <button
              type="button"
              className={`cclf-tab ${isDashboard ? "cclf-tab--active" : "cclf-tab--idle"}`}
              style={{ minWidth: 130, padding: "11px 30px" }}
              onClick={() => navigate("/")}
              disabled={isDashboard}
            >
              Lotes
            </button>
          </div>

          {/* DER: saludo + mas boton de usuario + logout estilo tab */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 18 }}>
            <span className="d-none d-md-inline">Hola, {firstName}!</span>

            <button
              type="button"
              onClick={onUserClick}
              title="Perfil"
              aria-label="Abrir perfil"
              style={{
                width: 38, height: 38,
                borderRadius: "50%",
                background: 'transparent',
                color: 'var(--color-text-light)',
                border: '1px solid rgba(255,255,255,0.75)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className="bi bi-person" style={{ fontSize: "1.1rem" }} />
            </button>

            {/* Reemplazo LogoutButton por un botón controlado para asegurar estilo */}
            <button
              type="button"
              className="cclf-logout"
              style={{ padding: "10px 18px" }}
              onClick={logout}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </Container>
    </Navbar>
  );
}
