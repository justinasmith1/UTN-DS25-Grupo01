// Diálogo de confirmación para eliminar una inmobiliaria.
import EliminarBase from "../Base/EliminarBase.jsx";

export default function InmobiliariaEliminarDialog({
  open,
  inmobiliaria,
  loading = false,
  onCancel,
  onConfirm,
}) {
  if (!open || !inmobiliaria) return null;

  const title = `Eliminar Inmobiliaria N° ${inmobiliaria?.id ?? "—"}`;

  // Mensaje tipo pregunta (línea 1)
  const message = `¿Seguro que deseas eliminar la inmobiliaria #${inmobiliaria?.id ?? "—"}?. Esta acción es irreversible.`;

  // Detalles listados con bullets
  const details = [
    `Nombre: ${inmobiliaria?.nombre ?? "—"}`,
    inmobiliaria?.razonSocial ? `Razón Social: ${inmobiliaria.razonSocial}` : null,
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
      confirmLabel="Eliminar Inmobiliaria"
      loading={loading}
      onCancel={onCancel}
      onConfirm={onConfirm} 
    />
  );
}

