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

  const title = `Eliminar Venta N° ${venta?.numero ?? "—"}`;

  // Mensaje tipo pregunta
  const message = `¿Seguro que deseas eliminar la venta N° ${venta?.numero}?. La venta pasará a estado ELIMINADO.`;

  // Detalles listados con bullets
  const details = [
    `${venta?.lote?.mapId ?? "—"}`,
    comprador ? `Comprador: ${comprador}` : null,
  ].filter(Boolean);

  // Nota final en negrita
  const noteBold = "Podrás recuperarla luego desde los filtros de estado.";

  return (
    <EliminarBase
      open={open}
      title={title}
      message={message}
      details={details}
      noteBold={noteBold}
      confirmLabel="Eliminar Venta"
      loading={loading}
      loadingLabel="Eliminando…"
      onCancel={onCancel}
      onConfirm={onConfirm} 
    />
  );
}
