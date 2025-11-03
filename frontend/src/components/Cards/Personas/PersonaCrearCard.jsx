// src/components/Cards/Personas/PersonaCrearCard.jsx
import { useState, useEffect, useRef } from "react";
import EditarBase from "../Base/EditarBase.jsx";
import { createPersona } from "../../../lib/api/personas.js";

/* ----------------------- Select custom sin librerías ----------------------- */
function NiceSelect({ value, options, placeholder = "Seleccionar", onChange }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (!btnRef.current?.contains(e.target) && !listRef.current?.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const label = options.find(o => `${o.value}` === `${value}`)?.label ?? placeholder;

  return (
    <div className="ns-wrap" style={{ position: "relative" }}>
      <button
        type="button"
        ref={btnRef}
        className="ns-trigger"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{label}</span>
        <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden>
          <polyline points="5,7 10,12 15,7" stroke="#222" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul ref={listRef} className="ns-list" role="listbox" tabIndex={-1}>
          {options.map(opt => (
            <li
              key={`${opt.value}::${opt.label}`}
              role="option"
              aria-selected={`${opt.value}` === `${value}`}
              className={`ns-item ${`${opt.value}` === `${value}` ? "is-active" : ""}`}
              onClick={() => {
                onChange?.(opt.value || "");
                setOpen(false);
              }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PersonaCrearCard({
  open,
  onCancel,
  onCreated,
}) {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [tipoIdentificador, setTipoIdentificador] = useState("CUIL");
  const [valorIdentificador, setValorIdentificador] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Resetear cuando se cierra
  const handleCancel = () => {
    if (!saving) {
      setNombre("");
      setApellido("");
      setTipoIdentificador("CUIL");
      setValorIdentificador("");
      setTelefono("");
      setEmail("");
      setError(null);
      onCancel?.();
    }
  };

  async function handleSave() {
    setError(null);
    setSaving(true);

    // Validaciones básicas
    if (!nombre || !nombre.trim()) {
      setError("El nombre es obligatorio.");
      setSaving(false);
      return;
    }

    // Validar que nombre solo contenga letras, espacios y algunos caracteres especiales comunes
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/.test(nombre.trim())) {
      setError("El nombre solo puede contener letras.");
      setSaving(false);
      return;
    }

    if (!apellido || !apellido.trim()) {
      setError("El apellido es obligatorio.");
      setSaving(false);
      return;
    }

    // Validar que apellido solo contenga letras
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/.test(apellido.trim())) {
      setError("El apellido solo puede contener letras.");
      setSaving(false);
      return;
    }

    if (!valorIdentificador || !valorIdentificador.trim()) {
      setError("El identificador es obligatorio. Debe ingresar el valor del CUIL/CUIT/DNI/Pasaporte.");
      setSaving(false);
      return;
    }

    // Validar formato de identificador según tipo
    if (tipoIdentificador === "DNI" && !/^\d{8}$/.test(valorIdentificador)) {
      setError("El DNI debe tener 8 dígitos.");
      setSaving(false);
      return;
    }

    if ((tipoIdentificador === "CUIT" || tipoIdentificador === "CUIL") && 
        !/^\d{2}-?\d{8}-?\d{1}$/.test(valorIdentificador)) {
      setError("El CUIT/CUIL debe tener el formato XX-XXXXXXXX-X.");
      setSaving(false);
      return;
    }

    if (tipoIdentificador === "Pasaporte" && !/^[A-Z0-9]{6,9}$/.test(valorIdentificador)) {
      setError("El pasaporte debe tener entre 6 y 9 caracteres alfanuméricos.");
      setSaving(false);
      return;
    }

    // Validar email si se ingresó
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError("El email no es válido.");
        setSaving(false);
        return;
      }
    }

    // Validar teléfono si se ingresó - solo números
    let telefonoNum = null;
    if (telefono && telefono.trim()) {
      // Validar que solo contenga números
      if (!/^\d+$/.test(telefono.trim())) {
        setError("El teléfono solo puede contener números.");
        setSaving(false);
        return;
      }
      const n = Number(telefono);
      if (!Number.isFinite(n) || n <= 0) {
        setError("El teléfono debe ser un número positivo.");
        setSaving(false);
        return;
      }
      telefonoNum = n;
    }

    try {
      const payload = {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        identificador: {
          tipo: tipoIdentificador,
          valor: valorIdentificador.trim(),
        },
        ...(telefonoNum !== null ? { telefono: telefonoNum } : {}),
        ...(email && email.trim() ? { email: email.trim() } : {}),
      };

      const persona = await createPersona(payload);
      
      onCreated?.(persona);
      handleCancel();
    } catch (err) {
      console.error("Error creando persona:", err);
      setError(err?.message || "No se pudo crear la persona. Intenta nuevamente.");
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <EditarBase
      open={open}
      title="Registrar Cliente"
      onCancel={handleCancel}
      onSave={handleSave}
      saving={saving}
      saveButtonText="Crear Cliente"
    >
      <div
        className="venta-grid"
        style={{ ["--sale-label-w"]: "180px" }}
      >
        <div className="venta-col">
          <div className="field-row">
            <div className="field-label">NOMBRE</div>
            <div className="field-value p0">
              <input
                className="field-input"
                type="text"
                value={nombre}
                onChange={(e) => {
                  // Permitir solo letras, espacios y caracteres especiales comunes
                  const valor = e.target.value;
                  if (valor === "" || /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]*$/.test(valor)) {
                    setNombre(valor);
                  }
                }}
                placeholder="Nombre (solo letras)"
                required
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field-label">APELLIDO</div>
            <div className="field-value p0">
              <input
                className="field-input"
                type="text"
                value={apellido}
                onChange={(e) => {
                  // Permitir solo letras, espacios y caracteres especiales comunes
                  const valor = e.target.value;
                  if (valor === "" || /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]*$/.test(valor)) {
                    setApellido(valor);
                  }
                }}
                placeholder="Apellido (solo letras)"
                required
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field-label">TIPO IDENTIFICADOR</div>
            <div className="field-value p0">
              <NiceSelect
                value={tipoIdentificador}
                options={[
                  { value: "CUIL", label: "CUIL" },
                  { value: "CUIT", label: "CUIT" },
                  { value: "DNI", label: "DNI" },
                  { value: "Pasaporte", label: "Pasaporte" },
                ]}
                placeholder="Seleccionar tipo"
                onChange={(val) => setTipoIdentificador(val)}
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field-label">IDENTIFICADOR</div>
            <div className="field-value p0">
              <input
                className="field-input"
                type="text"
                value={valorIdentificador}
                onChange={(e) => setValorIdentificador(e.target.value)}
                placeholder={
                  tipoIdentificador === "DNI" ? "Ej: 12345678 (8 dígitos)" :
                  tipoIdentificador === "Pasaporte" ? "Ej: ABC123456 (6-9 caracteres)" :
                  "Ej: 12-34567890-1 (formato CUIT/CUIL)"
                }
                required
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field-label">TELÉFONO</div>
            <div className="field-value p0">
              <input
                className="field-input"
                type="text"
                inputMode="numeric"
                value={telefono}
                onChange={(e) => {
                  // Solo permitir números
                  const valor = e.target.value;
                  if (valor === "" || /^\d*$/.test(valor)) {
                    setTelefono(valor);
                  }
                }}
                placeholder="Opcional (solo números)"
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field-label">EMAIL</div>
            <div className="field-value p0">
              <input
                className="field-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginTop: "20px",
            padding: "12px 16px",
            background: "#fee2e2",
            border: "1px solid #fecaca",
            borderRadius: "6px",
            color: "#991b1b",
            fontSize: 13.5,
          }}
        >
          {error}
        </div>
      )}
    </EditarBase>
  );
}
