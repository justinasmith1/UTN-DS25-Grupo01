// Diálogo de confirmación para eliminar una reserva.
import EliminarBase from "../Base/EliminarBase.jsx";

export default function ReservaEliminarDialog({
  open,
  reserva,
  loading = false,
  onCancel,
  onConfirm,
}) {
  if (!open || !reserva) return null;

  const clienteNombre = (() => {
    const n = reserva?.cliente?.nombre || reserva?.clienteNombre;
    const a = reserva?.cliente?.apellido || reserva?.clienteApellido;
    const joined = [n, a].filter(Boolean).join(" ");
    return joined || null;
  })();

  const loteInfo = (() => {
    if (reserva?.lote?.id) {
      const num = reserva?.lote?.numero || reserva?.lote?.id;
      return `Lote N° ${num}`;
    }
    return reserva?.loteId ? `Lote N° ${reserva.loteId}` : null;
  })();

  const title = `Eliminar Reserva N° ${reserva?.id ?? "—"}`;

  // Mensaje tipo pregunta (línea 1)
  const message = `¿Seguro que deseas eliminar la reserva #${reserva?.id ?? "—"}?. Esta acción es irreversible.`;

  // Detalles listados con bullets
  const details = [
    loteInfo ? loteInfo : null,
    clienteNombre ? `Cliente: ${clienteNombre}` : null,
  ].filter(Boolean);

  // Nota final en negrita
  const noteBold = "Esta acción es irreversible.";

  return (
    <EliminarBase
      open={open}
      title={title}
      message={message}
      details={details}
      noteBold={noteBold}
      confirmLabel="Eliminar Reserva"
      loading={loading}
      onCancel={onCancel}
      onConfirm={onConfirm} 
    />
  );
}

