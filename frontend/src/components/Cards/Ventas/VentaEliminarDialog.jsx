// Diálogo de confirmación para eliminar una venta.
import EliminarBase from "../Base/EliminarBase.jsx";

export default function VentaEliminarDialog({
  open,
  venta,
  loading = false,
  onCancel,
  onConfirm,
}) {
  if (!open || !venta) return null;

  const comprador =
    venta?.comprador?.nombre
      ? `${venta.comprador.nombre} ${venta.comprador.apellido ?? ""}`.trim()
      : null;

  const title = `Eliminar Venta N° ${venta?.id ?? "—"}`;

  // Mensaje tipo pregunta (línea 1)
  const message = `¿Seguro que deseas eliminar la venta #${venta?.id ?? "—"}?`;

  // Detalles listados con bullets
  const details = [
    `Lote: ${venta?.loteId ?? "—"}`,
    comprador ? `Comprador: ${comprador}` : null,
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
      confirmLabel="Eliminar Venta"
      loading={loading}
      onCancel={onCancel}
      onConfirm={onConfirm} // aquí disparás el DELETE real del service
    />
  );
}
