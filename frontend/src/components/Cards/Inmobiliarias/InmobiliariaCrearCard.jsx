import { useState } from "react";
import EditarBase from "../Base/EditarBase.jsx";
import { createInmobiliaria } from "../../../lib/api/inmobiliarias.js";

export default function InmobiliariaCrearCard({ open, onCancel, onCreated }) {
  const [nombre, setNombre] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [contacto, setContacto] = useState("");
  const [comxventa, setComxventa] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      // 1. VALIDACIÓN: Coincidir con Zod (Nombre y Razón Social requeridos)
      if (!nombre.trim()) throw new Error("El nombre es obligatorio");
      if (!razonSocial.trim()) throw new Error("La razón social es obligatoria");

      const body = {
        nombre: nombre.trim(),
        // 2. DATOS: Enviamos el string limpio. 
        // Ya no enviamos "|| null" en razonSocial porque es obligatoria.
        razonSocial: razonSocial.trim(), 
        contacto: contacto.trim() || null, // Este sí es opcional en Zod
        comxventa: comxventa === "" ? null : Number(comxventa),
        // userId: null // Opcional: Si tuvieras un select de usuarios, iría aquí.
      };

      const resp = await createInmobiliaria(body);
      const created = resp?.data ?? resp ?? null;
      
      setShowSuccess(true);
      onCreated?.(created); // Callback para actualizar la tabla padre
      
      setTimeout(() => {
        setShowSuccess(false);
        setSaving(false);
        onCancel?.();
      }, 1500);
      
    } catch (e) {
      // Manejo de error mejorado para capturar mensajes del backend
      const msg = e.response?.data?.message || e.message || "No se pudo crear la inmobiliaria";
      setError(msg);
      setSaving(false);
    }
  }

  if (!open && !showSuccess) return null;

  return (
    <>
      {showSuccess && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "grid", placeItems: "center", zIndex: 10000 }}>
          <div style={{ background: "#fff", padding: 32, borderRadius: 12 }}>¡Inmobiliaria creada!</div>
        </div>
      )}
      {open && (
        <EditarBase
          open={open}
          title="Agregar Inmobiliaria"
          onCancel={onCancel}
          onSave={handleSave}
          saving={saving}
          saveButtonText="Confirmar Inmobiliaria"
        >
          <div className="venta-grid" style={{ ["--sale-label-w"]: "200px" }}>
            <div className="venta-col">
              <div className="field-row">
                <div className="field-label">NOMBRE</div>
                <div className="field-value p0">
                  <input className="field-input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" />
                </div>
              </div>
              <div className="field-row">
                <div className="field-label">RAZÓN SOCIAL</div>
                <div className="field-value p0">
                  <input className="field-input" value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} placeholder="Razón Social" />
                </div>
              </div>
            </div>
            <div className="venta-col">
              <div className="field-row">
                <div className="field-label">CONTACTO</div>
                <div className="field-value p0">
                  <input className="field-input" value={contacto} onChange={(e) => setContacto(e.target.value)} placeholder="Contacto" />
                </div>
              </div>
              <div className="field-row">
                <div className="field-label">COMISIÓN X VENTA (%)</div>
                <div className="field-value p0">
                  <input className="field-input" type="number" min="0" max="100" step="0.5" value={comxventa} onChange={(e) => setComxventa(e.target.value)} placeholder="0 - 100" />
                </div>
              </div>
            </div>
          </div>
          {error && (
            <div style={{ marginTop: 12, padding: 10, background: "#fee2e2", color: "#991b1b", borderRadius: 8 }}>{error}</div>
          )}
        </EditarBase>
      )}
    </>
  );
}


