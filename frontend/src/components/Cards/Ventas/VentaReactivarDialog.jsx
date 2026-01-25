// Diálogo de confirmación para reactivar una venta.
import EliminarBase from "../Base/EliminarBase.jsx";

export default function VentaReactivarDialog({
  open,
  venta,
  loading = false,
  onCancel,
  onConfirm,
}) {
  if (!open || !venta) return null;

  const v = venta;
  const ventaNumero = v?.numero ?? v?.id ?? "—";
  const estadoActual = v?.estado ?? "—";
  
  const title = `Reactivar Venta N° ${ventaNumero}`;

  const message = `¿Seguro que deseas reactivar la venta N° ${ventaNumero}? Se reactivará la venta (volverá a mostrarse como OPERATIVA) manteniendo su estado actual: ${estadoActual}.`;

  const details = [
    `Lote: ${v?.lote?.fraccion?.numero ?? '—'} - ${v?.lote?.numero ?? '—'}`,
    `Comprador: ${v?.comprador?.nombre ? `${v.comprador.nombre} ${v.comprador.apellido || ''}` : "—"}`,
  ];

  return (
    <EliminarBase
      open={open}
      title={title}
      message={message}
      details={details}
      confirmLabel="Reactivar Venta"
      loading={loading}
      loadingLabel="Reactivando…"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
