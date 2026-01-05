// Diálogo de confirmación para eliminar definitivamente una persona (hard delete).
import { useState, useEffect } from "react";
import EliminarBase from "../Base/EliminarBase.jsx";
import { getPersona } from "../../../lib/api/personas";

export default function PersonaEliminarDefinitivoDialog({
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

  const title = `Eliminar Definitivamente: ${displayName}`;

  const message = `⚠️ ADVERTENCIA: Esta acción es IRREVERSIBLE. La persona "${displayName}" será eliminada permanentemente de la base de datos.`;

  const details = [
    `Identificador: ${pers?.identificadorTipo && pers?.identificadorValor ? `${pers.identificadorTipo} ${pers.identificadorValor}` : "—"}`,
    `Cliente de: ${pers?.inmobiliaria?.nombre || "La Federala"}`,
    pers?._count ? [
      `Propietario: ${pers._count.lotesPropios || 0} lote(s)`,
      `Inquilino: ${pers._count.lotesAlquilados || 0} lote(s)`,
      `Reservas: ${pers._count.Reserva || 0}`,
      `Ventas: ${pers._count.Venta || 0}`,
    ] : [],
  ].flat();

  const noteBold = "Esta acción no se puede deshacer. Asegúrate de que la persona no tenga asociaciones antes de continuar.";

  return (
    <EliminarBase
      open={open}
      title={title}
      message={message}
      details={details}
      noteBold={noteBold}
      confirmLabel="Eliminar Definitivamente"
      loading={loading}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

