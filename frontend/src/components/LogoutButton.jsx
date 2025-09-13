// Botón de logout. Limpio tokens y mando a /login.
// Ahora se ve espantoso, dsp cuando mejoremos toda la UI lo mejoramos

import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider"; 

export default function LogoutButton({ className = "", children = "Salir" }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleClick() {
    // Cierro sesión y navego a /login
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  );
}
