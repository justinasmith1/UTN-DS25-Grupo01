// src/components/Cards/Reservas/ReservaReactivarDialog.jsx
import { useState, useEffect } from "react";
import EliminarBase from "../Base/EliminarBase.jsx";
import { getReservaById } from "../../../lib/api/reservas";

export default function ReservaReactivarDialog({
  open,
  reserva,
  loading = false,
  onCancel,
  onConfirm,
}) {
  const [detalleCompleto, setDetalleCompleto] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  useEffect(() => {
    if (open && reserva?.id) {
      setLoadingDetalle(true);
      getReservaById(reserva.id)
        .then((res) => setDetalleCompleto(res.data || res))
        .catch(() => setDetalleCompleto(reserva))
        .finally(() => setLoadingDetalle(false));
    } else {
      setDetalleCompleto(null);
    }
  }, [open, reserva?.id]);

  if (!open || !reserva) return null;

  const r = detalleCompleto || reserva;
  const reservaNumero = r?.numero ?? r?.id ?? "—";
  const estadoActual = r?.estado ?? "—";
  
  const title = `Reactivar Reserva N° ${reservaNumero}`;

  const message = `¿Seguro que deseas reactivar la reserva N° ${reservaNumero}? Se reactivará la reserva (volverá a mostrarse como OPERATIVA) manteniendo su estado actual: ${estadoActual}.`;

  const details = [
    `Lote N°: ${r?.lote?.mapId || r?.lotMapId || r?.loteId || "—"}`,
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
