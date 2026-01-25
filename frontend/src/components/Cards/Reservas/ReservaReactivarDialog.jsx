// src/components/Cards/Reservas/ReservaReactivarDialog.jsx
import EliminarBase from "../Base/EliminarBase.jsx";

export default function ReservaReactivarDialog({
  open,
  reserva,
  loading = false,
  onCancel,
  onConfirm,
}) {
  if (!open || !reserva) return null;

  const r = reserva;
  const reservaNumero = r?.numero ?? r?.id ?? "—";
  const estadoActual = r?.estado ?? "—";
  
  const title = `Reactivar Reserva N° ${reservaNumero}`;

  const message = `¿Seguro que deseas reactivar la reserva N° ${reservaNumero}? Se reactivará la reserva (volverá a mostrarse como OPERATIVA) manteniendo su estado actual: ${estadoActual}.`;

  const details = [
    `Lote: ${r?.lote?.fraccion?.numero ?? '—'} - ${r?.lote?.numero ?? '—'}`,
    `Cliente: ${r?.cliente?.nombre ? `${r.cliente.nombre} ${r.cliente.apellido || ''}` : "—"}`,
  ];

  return (
    <EliminarBase
      open={open}
      title={title}
      message={message}
      details={details}
      confirmLabel="Reactivar Reserva"
      confirmVariant="success"
      loading={loading}
      loadingLabel="Reactivando…"
      onCancel={onCancel}
      onConfirm={onConfirm}
      isDelete={false} // Para que no salga rojo ni icono de basura si no queremos
    />
  );
}
