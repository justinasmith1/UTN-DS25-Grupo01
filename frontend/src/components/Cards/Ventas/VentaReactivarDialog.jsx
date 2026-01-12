// Diálogo de confirmación para reactivar una venta.
import { useState, useEffect } from "react";
import EliminarBase from "../Base/EliminarBase.jsx";
import { getVentaById } from "../../../lib/api/ventas";

export default function VentaReactivarDialog({
  open,
  venta,
  loading = false,
  onCancel,
  onConfirm,
}) {
  const [detalleCompleto, setDetalleCompleto] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  useEffect(() => {
    if (open && venta?.id) {
      setLoadingDetalle(true);
      getVentaById(venta.id)
        .then((res) => setDetalleCompleto(res.data || res))
        .catch(() => setDetalleCompleto(venta))
        .finally(() => setLoadingDetalle(false));
    } else {
      setDetalleCompleto(null);
    }
  }, [open, venta?.id]);

  if (!open || !venta) return null;

  const v = detalleCompleto || venta;
  const ventaNumero = v?.numero ?? v?.id ?? "—";
  
  const title = `Reactivar Venta N° ${ventaNumero}`;

  const message = `¿Seguro que deseas reactivar la venta N° ${ventaNumero}? Pasarà a estado OPERATIVO y aparecerá nuevamente en el listado principal.`;

  const details = [
    `Lote N°: ${v?.lote?.mapId || v?.lotMapId || v?.loteId || "—"}`,
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
