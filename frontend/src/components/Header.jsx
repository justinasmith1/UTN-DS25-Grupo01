// src/components/Header.jsx
"use client" // Lo mismo que en el resto de archivos
import { Navbar, Nav, Container, Button } from "react-bootstrap"
import { useNavigate, useLocation } from "react-router-dom"

const customStyles = `
  .navbar-brand-green { 
    background-color: #0b3d23 !important; 
    border: none !important;
  }
  .text-brand-dark-green { 
    color: #0b3d23 !important; 
  }
  .btn-nav-active {
    background-color: rgba(255, 255, 255, 0.3) !important;
    border-color: rgba(255, 255, 255, 0.3) !important;
  }
  .btn-nav-hover:hover {
    background-color: rgba(255, 255, 255, 0.2) !important;
    border-color: rgba(255, 255, 255, 0.2) !important;
  }
`

export default function Header({ onUserClick, user }) {
  const navigate = useNavigate() // Esto para cambiar de ruta
  const location = useLocation() // Esto para conocer la ruta actual

  return (
    <>
      <style>{customStyles}</style>
      <Navbar className="navbar-brand-green sticky-top" variant="dark" expand="lg">
        <Container>
          <Navbar.Brand className="d-flex align-items-center">
            <i className="bi bi-house-door me-2" style={{ fontSize: "1.5rem" }}></i>
            <span style={{ fontSize: "1.25rem", fontWeight: "600" }}>Club de Campo La Federala</span>
          </Navbar.Brand>
          <Navbar.Toggle />
          <Navbar.Collapse>
            <Nav className="me-auto">
              <Button
                variant="outline-light"
                className={`me-2 btn-nav-hover ${location.pathname === "/map" ? "btn-nav-active" : ""}`}
                onClick={() => navigate("/map")}
                style={{ borderRadius: "8px" }}
              >
                Mapa
              </Button>
              <Button
                variant="outline-light"
                className={`btn-nav-hover ${location.pathname === "/" ? "btn-nav-active" : ""}`}
                onClick={() => navigate("/")}
                style={{ borderRadius: "8px" }}
              >
                Dashboard
              </Button>
            </Nav>
            <Nav className="align-items-center">
              <span className="navbar-text me-3 d-none d-md-inline">
                Hola, {user?.name?.split(" ")[0] || "Usuario"}!
              </span>
              <Button
                variant="outline-light"
                className="rounded-circle btn-nav-hover"
                onClick={onUserClick}
                style={{ width: "40px", height: "40px", padding: "0" }}
              >
                {user?.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("") || "U"}
              </Button>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </>
  )
}
