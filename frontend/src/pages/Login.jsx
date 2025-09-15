// src/pages/Login.jsx

// Pantalla de login muy muy basica, el chino esta diseñando la posta con Figma, despues lo hacemos bien 
// Más adelante reemplazo por el login real contra el backend.
// Form simple de login. Envío email y password al provider.
// Si sale bien, vuelvo a la ruta privada desde donde venía.
// Formulario simple que llama al Provider real

import { useState } from "react";
import { useAuth } from "../app/providers/AuthProvider";
import { Form, Button, Card } from "react-bootstrap";

export default function Login() {
  const { login } = useAuth();

  // estado local del form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setSubmitting(true);
    try {
      await login({ email, password });
      // el Provider ya redirige según "from" o "/"
    } catch (error) {
      console.error(error);
      setErr(error?.message || "Login fallido");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: "70vh" }}>
      <Card style={{ width: 360 }} className="shadow-sm">
        <Card.Body>
          <Card.Title className="mb-3">Iniciar sesión</Card.Title>

          {err && <div className="alert alert-danger py-2">{err}</div>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Contraseña</Form.Label>
              <Form.Control
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Form.Group>

            <div className="d-grid">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Ingresando..." : "Ingresar"}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
}

