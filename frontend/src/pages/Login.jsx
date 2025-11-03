// src/pages/Login.jsx
// MISMO flujo que tu archivo original. Solo estilos + fondo + logo.

import { useState } from "react";
import { useAuth } from "../app/providers/AuthProvider";
import { Form, Button, Card, InputGroup } from "react-bootstrap";
import { Eye, EyeOff } from 'lucide-react';
import BG_IMAGE from "../assets/La-Federala-Club-de-Campo-Lobos-Home-11.jpg";
import LOGO_IMAGE from "../assets/logoCompleto.png";

export default function Login() {
  const { login } = useAuth();

  // estado local del form (SIN cambios)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [showPassword, setShowPassword] = useState(false);


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
    <div className="lf-login" style={{ backgroundImage: `url(${BG_IMAGE})` }}>
      <div className="lf-scrim" />

      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
        <Card className="lf-card shadow-lg">
          <Card.Body className="p-4 p-md-4">
            <header className="text-center mb-2">
              {LOGO_IMAGE ? (
                <img src={LOGO_IMAGE} alt="La Federala" className="lf-logo" />
              ) : (
                <div className="lf-wordmark">
                  <div className="lf-brand">La Federala</div>
                  <div className="lf-sub">club de campo</div>
                </div>
              )}
            </header>

            <h2 className="lf-title mb-3">Iniciar sesión</h2>

            {err && <div className="alert alert-danger py-2">{err}</div>}

            <Form onSubmit={handleSubmit} className="d-grid gap-2">
              <Form.Group className="mb-2">
                <Form.Label className="lf-label">Email</Form.Label>
                <Form.Control
                  className="lf-input"
                  type="email"
                  placeholder="username@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
              </Form.Group>

              <Form.Group className="mb-2">
                <Form.Label className="lf-label">Contraseña</Form.Label>
                <InputGroup>
                  <Form.Control
                    className="lf-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Button variant="outline-secondary" onClick={() => setShowPassword(!showPassword)} className="lf-password-toggle">
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </InputGroup>
              </Form.Group>

              <div className="d-grid mt-1">
                <Button type="submit" className="lf-btn" disabled={submitting}>
                  {submitting ? "Ingresando..." : "Ingresar"}
                </Button>
              </div>
            </Form>

            <div className="text-center lf-footer mt-2">
              <a href="#forgot" className="lf-link">¿Olvidaste la contraseña?</a>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* estilos scoped */}
      <style>{css}</style>
    </div>
  );
}

const css = `
:root{
  --lf-card-bg: rgba(18,40,28,.55);   /* verde oscuro translúcido */
  --lf-card-border: rgba(255,255,255,.18);
  --lf-primary:#0ea37a;
  --lf-primary-strong:#0b8b67;
  --lf-text:#e9f5ef;
  --lf-text-dim:#cfe3da;
}

.lf-login{
  min-height:100vh;
  background-position:center;
  background-size:cover;
  background-repeat:no-repeat;
  position:relative;
}

.lf-scrim{
  position:absolute; inset:0;
  background: linear-gradient(180deg, rgba(0,0,0,.25) 0%, rgba(0,0,0,.45) 35%, rgba(0,0,0,.55) 100%);
}

.lf-card{
  position:relative; z-index:1;
  width:min(92vw, 520px);
  border:1px solid var(--lf-card-border);
  border-radius:18px;
  background:var(--lf-card-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color:var(--lf-text);
}

.lf-logo{ height:96px; object-fit:contain; }
.lf-wordmark{ line-height:1; text-align:center; }
.lf-brand{ font-family:Georgia, 'Times New Roman', serif; font-weight:600; font-size:28px; letter-spacing:.3px; }
.lf-sub{ font-size:12px; opacity:.9; margin-top:4px; }

.lf-title{ font-size:18px; font-weight:600; color:var(--lf-text); position:relative; }
.lf-title::after{ content:""; display:block; width:44px; height:2px; background:var(--lf-primary); border-radius:2px; margin-top:8px; }

.lf-label{ font-size:12px; color:var(--lf-text-dim); }
.lf-input{
  border-radius:10px;
  border:1px solid rgba(255,255,255,.22);
  background:rgba(255,255,255,.08);
  color:var(--lf-text);
  height:42px;
}
.lf-input::placeholder{ color:rgba(233,245,239,.7); }
.lf-input:focus{
  border-color: rgba(14,163,122,.75);
  box-shadow: 0 0 0 .25rem rgba(14,163,122,.15);
  background: rgba(255,255,255,.12);
}

.lf-password-toggle {
  border-radius: 0 10px 10px 0;
  border-color: rgba(255, 255, 255, 0.22);
  background-color: rgba(255, 255, 255, 0.08);
  color: var(--lf-text);
}

.lf-password-toggle:hover {
  background-color: rgba(255, 255, 255, 0.12);
}


.lf-btn{
  height:44px; border-radius:10px; border:0;
  background: linear-gradient(180deg, var(--lf-primary), var(--lf-primary-strong));
  color:#fff; font-weight:600; letter-spacing:.2px;
  box-shadow: 0 6px 18px rgba(14,163,122,.35);
}

.lf-link{ color:var(--lf-text); text-decoration:none; font-size:12px; opacity:.95; }
.lf-link:hover{ text-decoration:underline; }
.lf-footer{ color:var(--lf-text-dim); font-size:12px; }

@media (max-width:520px){
  .lf-brand{ font-size:24px; }
}
`;
