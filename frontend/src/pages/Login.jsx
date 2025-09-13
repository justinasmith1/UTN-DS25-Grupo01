// Pantalla de login muy muy basica, el chino esta diseñando la posta con Figma, despues lo hacemos bien 
// Más adelante reemplazo por el login real contra el backend.
// Form simple de login. Envío email y password al provider.
// Si sale bien, vuelvo a la ruta privada desde donde venía.

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../app/providers/AuthProvider';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { signIn } = useAuth();
  const navigate = useNavigate();

  // Si vengo redirigido desde una privada, vuelvo ahí
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await signIn({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      alert(err.message || 'No pude iniciar sesión');
    }
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

