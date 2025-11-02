// Diálogo de confirmación para eliminar una venta.

import EliminarBase from "../Base/EliminarBase.jsx";

export default function VentaEliminarDialog({ open, venta, loading = false, onCancel, onConfirm }) {
  if (!open || !venta) return null;

  const comprador =
    venta?.comprador?.nombre
      ? `${venta.comprador.nombre} ${venta.comprador.apellido ?? ""}`.trim()
      : null;

  const message = [
    `¿Seguro que deseas eliminar la venta #${venta?.id ?? "—"}?`,
    `Lote: ${venta?.loteId ?? "—"}.`,
    comprador ? `Comprador: ${comprador}.` : null,
    `Esta acción es irreversible.`
  ].filter(Boolean).join(" ");

  return (
    <EliminarBase
      open={open}
      title="Eliminar Venta"
      message={message}
      confirmLabel="Eliminar"
      loading={loading}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
