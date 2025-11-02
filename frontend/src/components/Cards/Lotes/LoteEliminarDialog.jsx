import EliminarBase from "../Base/EliminarBase.jsx";

export default function LoteEliminarDialog({
  open,
  lote,
  loading = false,
  onCancel,
  onConfirm,
}) {
  if (!open || !lote) return null;

  const propietario =
    lote?.propietario?.nombre
      ? `${lote.propietario.nombre} ${lote.propietario.apellido ?? ""}`.trim()
      : null;

  const title = `Eliminar Lote N° ${lote?.id ?? "—"}`;

  // Mensaje tipo pregunta (línea 1)
  const message = `¿Seguro que deseas eliminar el lote #${lote?.id ?? "—"}?. Esta acción es irreversible.`;

  // Detalles listados con bullets
  const details = [
    propietario ? `Propietario: ${propietario}` : null,
    `Estado: ${lote?.estado ?? "—"}`
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
      confirmLabel="Eliminar Lote"
      loading={loading}
      onCancel={onCancel}
      onConfirm={onConfirm} 
    />
  );
}