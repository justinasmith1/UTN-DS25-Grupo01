// Diálogo de confirmación para desactivar una inmobiliaria (baja lógica).
import EliminarBase from "../Base/EliminarBase.jsx";

export default function InmobiliariaEliminarDialog({
  open,
  inmobiliaria,
  loading = false,
  onCancel,
  onConfirm,
}) {
  if (!open || !inmobiliaria) return null;

  const title = `Desactivar Inmobiliaria: ${inmobiliaria?.nombre ?? "—"}`;

  // Mensaje tipo pregunta (línea 1)
  const message = `¿Seguro que deseas desactivar la inmobiliaria "${inmobiliaria?.nombre ?? "—"}"? Pasará a estado INACTIVA y dejará de aparecer en la lista activa.`;

  // Detalles listados con bullets
  const details = [
    `Nombre: ${inmobiliaria?.nombre ?? "—"}`,
    inmobiliaria?.razonSocial ? `Razón Social: ${inmobiliaria.razonSocial}` : null,
  ].filter(Boolean);

  // Nota final en negrita
  const noteBold = "La inmobiliaria se conservará en el historial y podrá consultarse posteriormente.";

  return (
    <EliminarBase
      open={open}
      title={title}
      message={message}
      details={details}
      noteBold={noteBold}
      confirmLabel="Desactivar Inmobiliaria"
      loading={loading}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}


