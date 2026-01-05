// Diálogo de confirmación para reactivar una persona.
import { useState, useEffect } from "react";
import EliminarBase from "../Base/EliminarBase.jsx";
import { getPersona } from "../../../lib/api/personas";

export default function PersonaReactivarDialog({
  open,
  persona,
  loading = false,
  onCancel,
  onConfirm,
}) {
  const [detalleCompleto, setDetalleCompleto] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  useEffect(() => {
    if (open && persona?.id) {
      setLoadingDetalle(true);
      getPersona(persona.id)
        .then(setDetalleCompleto)
        .catch(() => setDetalleCompleto(persona))
        .finally(() => setLoadingDetalle(false));
    } else {
      setDetalleCompleto(null);
    }
  }, [open, persona?.id]);

  if (!open || !persona) return null;

  const pers = detalleCompleto || persona;
  const displayName = pers?.razonSocial 
    ? pers.razonSocial 
    : `${pers?.nombre || ''} ${pers?.apellido || ''}`.trim() || "—";

  const title = `Reactivar Persona: ${displayName}`;

  const message = `¿Seguro que deseas reactivar la persona "${displayName}"? Volverá a estado ACTIVA y aparecerá nuevamente en la lista activa.`;

  const details = [
    `Identificador: ${pers?.identificadorTipo && pers?.identificadorValor ? `${pers.identificadorTipo} ${pers.identificadorValor}` : "—"}`,
    `Cliente de: ${pers?.inmobiliaria?.nombre || "La Federala"}`,
  ];

  return (
    <EliminarBase
      open={open}
      title={title}
      message={message}
      details={details}
      confirmLabel="Reactivar Persona"
      loading={loading}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

