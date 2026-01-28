import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import EditarBase from "../Base/EditarBase.jsx";
import SuccessAnimation from "../Base/SuccessAnimation.jsx";
import { createInmobiliaria } from "../../../lib/api/inmobiliarias.js";
import { inmobiliariaCreateSchema } from "../../../lib/validations/inmobiliariaCreate.schema.js";

export default function InmobiliariaCrearCard({ open, onCancel, onCreated }) {
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [generalError, setGeneralError] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(inmobiliariaCreateSchema),
    defaultValues: {
      nombre: "",
      razonSocial: "",
      contacto: "",
      comxventa: "",
    },
  });

  const onSubmit = async (data) => {
    setSaving(true);
    setGeneralError(null);
    try {
      const body = {
        nombre: data.nombre.trim(),
        razonSocial: data.razonSocial.trim(),
        contacto: data.contacto?.trim() || null,
        comxventa: data.comxventa !== "" && data.comxventa !== undefined ? Number(data.comxventa) : null,
      };

      const resp = await createInmobiliaria(body);
      const created = resp?.data ?? resp ?? null;
      
      setShowSuccess(true);
      onCreated?.(created);
      
      setTimeout(() => {
        setShowSuccess(false);
        setSaving(false);
        reset(); // Limpiar formulario
        onCancel?.();
      }, 1500);
      
    } catch (e) {
      const msg = e.response?.data?.message || e.message || "No se pudo crear la inmobiliaria";
      setGeneralError(msg);
      setSaving(false);
    }
  };

  if (!open && !showSuccess) return null;

  return (
    <>
      <SuccessAnimation show={showSuccess} message="¡Inmobiliaria creada exitosamente!" />
      {open && (
        <EditarBase
          open={open}
          title="Agregar Inmobiliaria"
          onCancel={() => {
            reset();
            onCancel?.();
          }}
          onSave={handleSubmit(onSubmit)}
          saving={saving}
          saveButtonText="Confirmar Inmobiliaria"
        >
          <div className="venta-grid" style={{ ["--sale-label-w"]: "200px" }}>
            <div className="venta-col">
              <div className={`fieldRow ${errors.nombre ? "hasError" : ""}`}>
                <div className="field-row">
                  <div className="field-label">NOMBRE</div>
                  <div className="field-value p0">
                    <input
                      className={`field-input ${errors.nombre ? "is-invalid" : ""}`}
                      placeholder="Nombre"
                      {...register("nombre")}
                    />
                  </div>
                </div>
                {errors.nombre && <div className="fieldError">{errors.nombre.message}</div>}
              </div>
              <div className={`fieldRow ${errors.razonSocial ? "hasError" : ""}`}>
                <div className="field-row">
                  <div className="field-label">RAZÓN SOCIAL</div>
                  <div className="field-value p0">
                    <input
                      className={`field-input ${errors.razonSocial ? "is-invalid" : ""}`}
                      placeholder="Razón Social"
                      {...register("razonSocial")}
                    />
                  </div>
                </div>
                {errors.razonSocial && <div className="fieldError">{errors.razonSocial.message}</div>}
              </div>
            </div>
            <div className="venta-col">
              <div className={`fieldRow ${errors.contacto ? "hasError" : ""}`}>
                <div className="field-row">
                  <div className="field-label">CONTACTO</div>
                  <div className="field-value p0">
                    <input
                      className={`field-input ${errors.contacto ? "is-invalid" : ""}`}
                      placeholder="Contacto"
                      {...register("contacto")}
                    />
                  </div>
                </div>
                {errors.contacto && <div className="fieldError">{errors.contacto.message}</div>}
              </div>
              <div className={`fieldRow ${errors.comxventa ? "hasError" : ""}`}>
                <div className="field-row">
                  <div className="field-label">COMISIÓN X VENTA (%)</div>
                  <div className="field-value p0">
                    <input
                      className={`field-input ${errors.comxventa ? "is-invalid" : ""}`}
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      placeholder="0 - 100"
                      {...register("comxventa")}
                    />
                  </div>
                </div>
                {errors.comxventa && <div className="fieldError">{errors.comxventa.message}</div>}
              </div>
            </div>
          </div>
          {generalError && (
            <div style={{ marginTop: 12, padding: 10, background: "#fee2e2", color: "#991b1b", borderRadius: 8 }}>{generalError}</div>
          )}
        </EditarBase>
      )}
    </>
  );
}


