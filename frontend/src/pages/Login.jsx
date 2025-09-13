// Pantalla de login muy muy basica, el chino esta diseñando la posta con Figma, despues lo hacemos bien 
// Más adelante reemplazo por el login real contra el backend.

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../app/providers/AuthProvider';

export default function Login() {
  // Guardo el email/pass locales para el submit
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Accedo a login() del AuthProvider
  const { login } = useAuth();
  const navigate = useNavigate();

  // Si vengo de una ruta privada, vuelvo ahi después del login
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  async function handleSubmit(e) {
    e.preventDefault();

    // Por ahora simulo exito. Después llamo a /auth/login.
    await login({
      access: 'demo-access',
      refresh: 'demo-refresh',
      profile: { name: email },
    });

    // Vuelvo a donde estaba (o al home)
    navigate(from, { replace: true });
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: 24 }}>
      <h2>Login</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: 'block', marginBottom: 8 }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ display: 'block', marginBottom: 8 }}
      />
      <button type="submit">Ingresar</button>
    </form>
  );
}
