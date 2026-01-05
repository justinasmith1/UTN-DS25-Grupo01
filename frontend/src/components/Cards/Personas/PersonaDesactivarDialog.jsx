// Diálogo de confirmación para desactivar una persona (baja lógica).
import { useState, useEffect } from "react";
import EliminarBase from "../Base/EliminarBase.jsx";
import { getPersona } from "../../../lib/api/personas";

export default function PersonaDesactivarDialog({
  open,
  persona,
  loading = false,
  onCancel,
  onConfirm,
}) {
  const [detalleCompleto, setDetalleCompleto] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // Cargar detalle completo con _count cuando se abre el modal
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

  const identificadorTexto = pers?.identificadorTipo && pers?.identificadorValor
    ? `${pers.identificadorTipo} ${pers.identificadorValor}`
    : "—";

  const clienteDe = pers?.inmobiliaria?.nombre || "La Federala";

  const title = `Desactivar Persona: ${displayName}`;

  const message = `¿Seguro que deseas desactivar la persona "${displayName}"? Pasará a estado INACTIVA y dejará de aparecer en la lista activa.`;

  const details = [
    `Identificador: ${identificadorTexto}`,
    `Cliente de: ${clienteDe}`,
    pers?._count ? [
      pers._count.lotesPropios > 0 ? `Propietario: ${pers._count.lotesPropios} lote(s)` : null,
      pers._count.lotesAlquilados > 0 ? `Inquilino: ${pers._count.lotesAlquilados} lote(s)` : null,
      pers._count.Reserva > 0 ? `Reservas: ${pers._count.Reserva}` : null,
      pers._count.Venta > 0 ? `Ventas: ${pers._count.Venta}` : null,
    ].filter(Boolean) : [],
  ].flat().filter(Boolean);

  const noteBold = "La persona se conservará en el historial y podrá consultarse posteriormente.";

  return (
    <EliminarBase
      open={open}
      title={title}
      message={message}
      details={details}
      noteBold={noteBold}
      confirmLabel="Desactivar Persona"
      loading={loading}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

