// src/components/Cards/Prioridades/PrioridadEliminarDialog.jsx
import EliminarBase from "../Base/EliminarBase.jsx";

export default function PrioridadEliminarDialog({
  open,
  prioridad,
  loading = false,
  onCancel,
  onConfirm,
}) {
  if (!open || !prioridad) return null;

  const numero = prioridad?.numero ?? prioridad?.id ?? "—";
  const title = `Eliminar Prioridad N° ${numero}`;
  const message = `¿Eliminar prioridad N° ${numero}? Esta acción solo la oculta del listado.`;

  const details = [
    `Lote: ${prioridad?.lote?.fraccion?.numero} - ${prioridad?.lote?.numero}`,
    `Estado: ${prioridad?.estado || "—"}`,
    prioridad?.inmobiliaria?.nombre 
      ? `Inmobiliaria: ${prioridad.inmobiliaria.nombre}` 
      : prioridad?.ownerType === 'CCLF' 
        ? `Inmobiliaria: La Federala`
        : null,
  ].filter(Boolean);

  const noteBold = "La prioridad quedará oculta pero no se eliminará de la base de datos.";

  return (
    <EliminarBase
      open={open}
      title={title}
      message={message}
      details={details}
      noteBold={noteBold}
      confirmLabel="Eliminar Prioridad"
      loading={loading}
      loadingLabel="Eliminando…"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
