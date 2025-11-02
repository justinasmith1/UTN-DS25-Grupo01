// src/components/Inmobiliarias/InmobiliariaEditarCard.jsx
import { useEffect, useRef, useState } from "react";
import EditarBase from "../Base/EditarBase.jsx";
import { updateInmobiliaria, getInmobiliariaById } from "../../../lib/api/inmobiliarias.js";

/* -------------------------- Helper dinero -------------------------- */
function fmtMoney(val) {
  const NA = "Sin información";
  const isBlank = (v) =>
    v === null ||
    v === undefined ||
    (typeof v === "string" && v.trim().length === 0);
  
  if (isBlank(val)) return NA;
  const n =
    typeof val === "number"
      ? val
      : Number(String(val).replace(/[^\d.-]/g, ""));
  if (!isFinite(n)) return NA;
  return n.toLocaleString("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

/* ========================================================================== */

export default function InmobiliariaEditarCard({
  open,
  inmobiliaria,              // opcional: si viene completa, se usa
  inmobiliariaId,            // opcional: si viene id, se hace GET
  inmobiliarias,             // opcional: lista cache para buscar por id
  onCancel,
  onSaved,
  entityType = "Inmobiliaria", // tipo de entidad para el mensaje de éxito
}) {
  /* 1) HOOKS SIEMPRE ARRIBA (sin returns condicionales) */
  const [detalle, setDetalle] = useState(inmobiliaria || null);
  const [saving, setSaving] = useState(false);

  // ancho de label como en VerCard
  const [labelW, setLabelW] = useState(180);
  const containerRef = useRef(null);

  /* 2) GET de inmobiliaria al abrir y cuando cambia la prop inmobiliaria */
  useEffect(() => {
    let abort = false;
    async function run() {
      if (!open) return;

      // Si viene inmobiliaria por props, usarla (esto se ejecuta también cuando inmobiliaria cambia)
      if (inmobiliaria) { 
        setDetalle(inmobiliaria); 
        return; 
      }

      if (inmobiliariaId != null && Array.isArray(inmobiliarias)) {
        const found = inmobiliarias.find(i => `${i.id}` === `${inmobiliariaId}`);
        if (found) { 
          setDetalle(found); 
          return; 
        }
      }

      if (inmobiliariaId != null) {
        try {
          const response = await getInmobiliariaById(inmobiliariaId);
          const full = response?.data ?? response;
          if (!abort && full) setDetalle(full);
        } catch (e) {
          console.error("Error obteniendo inmobiliaria por id:", e);
        }
      }
    }
    run();
    return () => { abort = true; };
  }, [open, inmobiliariaId, inmobiliarias, inmobiliaria?.id, inmobiliaria?.nombre]); // Agregar inmobiliaria?.id y inmobiliaria?.nombre para detectar cambios

  /* 3) Resetear estados cuando el modal se cierra o se abre con otra inmobiliaria */
  useEffect(() => {
    if (!open) {
      setSaving(false);
      setShowSuccess(false);
    } else {
      // Resetear estados al abrir con una nueva inmobiliaria
      setSaving(false);
      setShowSuccess(false);
    }
  }, [open, detalle?.id]); // Resetear también cuando cambia la inmobiliaria (detalle.id)

  /* 4) STATES EDITABLES derivados de 'detalle' */
  // Fechas con todos los posibles nombres que vi en tu back
  // Backend usa updateAt (sin 'd'), mapeamos a updatedAt para consistencia
  const fechaActISO =
    detalle?.updatedAt ?? detalle?.updateAt ?? detalle?.fechaActualizacion ?? null;
  const fechaCreISO =
    detalle?.createdAt ?? detalle?.fechaCreacion ?? null;

  const base = {
    nombre: detalle?.nombre ?? "",
    razonSocial: detalle?.razonSocial ?? "",
    contacto: detalle?.contacto ?? "",
    comxventa: detalle?.comxventa != null ? String(detalle.comxventa) : "",
  };

  const [nombre, setNombre] = useState(base.nombre);
  const [razonSocial, setRazonSocial] = useState(base.razonSocial);
  const [contacto, setContacto] = useState(base.contacto);
  const [comxventa, setComxventa] = useState(base.comxventa);
  const [showSuccess, setShowSuccess] = useState(false);

  // re-sync cuando cambia 'detalle' o se reabre
  useEffect(() => {
    if (!open || !detalle) return;
    setNombre(base.nombre);
    setRazonSocial(base.razonSocial);
    setContacto(base.contacto);
    setComxventa(base.comxventa);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, detalle?.id]);

  /* 5) ancho de label como en VerCard */
  useEffect(() => {
    const labels = [
      "NOMBRE", "RAZÓN SOCIAL", "CONTACTO", "COMISIÓN X VENTA",
      "FECHA DE ACTUALIZACIÓN", "FECHA DE CREACIÓN"
    ];
    const longest = Math.max(...labels.map(s => s.length));
    const computed = Math.min(240, Math.max(160, Math.round(longest * 8.6) + 20));
    setLabelW(computed);
  }, [open, detalle?.id]);

  /* 6) Guardado (PATCH minimal y validado) */
  function buildPatch() {
    const patch = {};

    // NOMBRE es readonly, no se puede modificar
    // if (nombre !== (detalle?.nombre ?? "")) {
    //   if (!nombre || !nombre.trim()) {
    //     throw new Error("El nombre es obligatorio.");
    //   }
    //   patch.nombre = nombre.trim();
    // }

    if (razonSocial !== (detalle?.razonSocial ?? "")) {
      if (!razonSocial || !razonSocial.trim()) {
        throw new Error("La razón social es obligatoria.");
      }
      patch.razonSocial = razonSocial.trim();
    }

    if ((detalle?.contacto ?? "") !== (contacto ?? "")) {
      // Si contacto está vacío, enviar null; si tiene valor, enviar el string trimmeado
      patch.contacto = contacto && contacto.trim() ? contacto.trim() : null;
    }

    const prevComxventa = detalle?.comxventa != null ? String(detalle.comxventa) : "";
    if (prevComxventa !== comxventa) {
      if (comxventa === "" || comxventa.trim() === "") {
        patch.comxventa = null;
      } else {
        const n = Number(comxventa);
        if (!Number.isFinite(n) || n < 0) {
          throw new Error("La comisión debe ser un número ≥ 0.");
        }
        patch.comxventa = n;
      }
    }

    return patch;
  }

  async function handleSave() {
    try {
      setSaving(true);
      const patch = buildPatch();
      
      if (Object.keys(patch).length === 0) { 
        setSaving(false);
        onCancel?.(); 
        return; 
      }
      
      const response = await updateInmobiliaria(detalle.id, patch);
      const updated = response?.data ?? response;
      
      // Actualizar detalle inmediatamente con los valores guardados para que la próxima vez que se abra tenga los valores correctos
      setDetalle(updated);
      
      // Mostrar animación de éxito
      setShowSuccess(true);
      
      // Esperar un momento para mostrar la animación antes de cerrar
      setTimeout(() => {
        setShowSuccess(false);
        setSaving(false);
        onSaved?.(updated);
        onCancel?.();
      }, 1500);
    } catch (e) {
      console.error("Error guardando inmobiliaria:", e);
      setSaving(false);
      alert(e?.message || "No se pudo guardar la inmobiliaria.");
    }
  }

  function handleReset() {
    setNombre(base.nombre);
    setRazonSocial(base.razonSocial);
    setContacto(base.contacto);
    setComxventa(base.comxventa);
  }

  /* 7) Render */
  const NA = "Sin información";

  const fechaAct = fechaActISO
    ? new Date(fechaActISO).toLocaleDateString("es-AR")
    : NA;
  const fechaCre = fechaCreISO
    ? new Date(fechaCreISO).toLocaleDateString("es-AR")
    : NA;

  if (!open || !detalle) return null;

  return (
    <>
      {/* Animación de éxito */}
      {showSuccess && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "grid",
            placeItems: "center",
            zIndex: 3000,
            animation: "fadeIn 0.2s ease-in",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "32px 48px",
              borderRadius: "12px",
              boxShadow: "0 12px 32px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
              animation: "scaleIn 0.3s ease-out",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "#10b981",
                display: "grid",
                placeItems: "center",
                animation: "checkmark 0.5s ease-in-out",
              }}
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "20px",
                  fontWeight: 600,
                  color: "#111",
                }}
              >
                ¡{entityType} guardada exitosamente!
              </h3>
          </div>
        </div>
      )}

      <EditarBase
        open={open}
        title={`Inmobiliaria N° ${detalle?.id ?? "—"}`}
        onCancel={() => {
          // Siempre resetear estados antes de cerrar
          setSaving(false);
          setShowSuccess(false);
          onCancel?.();
        }}
        onSave={handleSave}
        onReset={handleReset}
        saving={saving}
      >
        <div style={{ "--sale-label-w": `${labelW}px` }}>
          <h3 className="venta-section-title">Información de la inmobiliaria</h3>

          <div className="venta-grid" ref={containerRef}>
            {/* Columna izquierda */}
            <div className="venta-col">
              <div className="field-row">
                <div className="field-label">NOMBRE</div>
                <div className="field-value is-readonly">{nombre || "Sin información"}</div>
              </div>

              <div className="field-row">
                <div className="field-label">RAZÓN SOCIAL</div>
                <div className="field-value p0">
                  <input
                    className="field-input"
                    type="text"
                    value={razonSocial}
                    onChange={(e) => setRazonSocial(e.target.value)}
                    placeholder="Razón social"
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field-label">CONTACTO</div>
                <div className="field-value p0">
                  <input
                    className="field-input"
                    type="text"
                    value={contacto}
                    onChange={(e) => setContacto(e.target.value)}
                    placeholder="Teléfono o email"
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field-label">COMISIÓN X VENTA</div>
                <div className="field-value p0" style={{ position: "relative" }}>
                  <input
                    className="field-input"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={comxventa}
                    onChange={(e) => setComxventa(e.target.value)}
                    placeholder="0.00"
                    style={{ paddingRight: "50px" }}
                  />
                  {/* Mostrar % como símbolo al final */}
                  <span style={{ 
                    position: "absolute", 
                    right: "12px", 
                    top: "50%", 
                    transform: "translateY(-50%)",
                    color: "#6B7280",
                    fontSize: "13px",
                    pointerEvents: "none",
                    fontWeight: 500
                  }}>
                    {comxventa && Number(comxventa) > 0 ? "%" : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Columna derecha */}
            <div className="venta-col">
              <div className="field-row">
                <div className="field-label">FECHA DE ACTUALIZACIÓN</div>
                <div className="field-value is-readonly">{fechaAct}</div>
              </div>

              <div className="field-row">
                <div className="field-label">FECHA DE CREACIÓN</div>
                <div className="field-value is-readonly">{fechaCre}</div>
              </div>
            </div>
          </div>
        </div>
      </EditarBase>
    </>
  );
}

