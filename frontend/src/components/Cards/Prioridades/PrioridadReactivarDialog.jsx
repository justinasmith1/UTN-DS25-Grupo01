// src/components/Cards/Prioridades/PrioridadReactivarDialog.jsx
import EliminarBase from "../Base/EliminarBase.jsx";

export default function PrioridadReactivarDialog({
  open,
  prioridad,
  loading = false,
  onCancel,
  onConfirm,
}) {
  if (!open || !prioridad) return null;

  const numero = prioridad?.numero ?? prioridad?.id ?? "—";
  const title = `Reactivar Prioridad N° ${numero}`;
  const message = `¿Seguro que deseas reactivar la prioridad N° ${numero}? Pasará a estado OPERATIVO y volverá a aparecer en la lista activa.`;

  const details = [
    `Lote: ${prioridad?.lote?.mapId || prioridad?.lote?.numero || prioridad?.loteId || "—"}`,
    `Estado: ${prioridad?.estado || "—"}`,
    prioridad?.inmobiliaria?.nombre 
      ? `Inmobiliaria: ${prioridad.inmobiliaria.nombre}` 
      : prioridad?.ownerType === 'CCLF' 
        ? `Inmobiliaria: La Federala`
        : null,
  ].filter(Boolean);

  const noteBold = "La prioridad volverá a estar visible en el listado.";

  return (
    <EliminarBase
      open={open}
      title={title}
      message={message}
      details={details}
      noteBold={noteBold}
      confirmLabel="Reactivar Prioridad"
      confirmVariant="success"
      loading={loading}
      loadingLabel="Reactivando…"
      onCancel={onCancel}
      onConfirm={onConfirm}
      isDelete={false}
    />
  );
}
