import "./cards.css";

/**
 * EliminarBase: diálogo de confirmación destructiva.
 */
export default function EliminarBase({
  open,
  title = "Eliminar",
  message = "¿Confirmás la eliminación?",
  confirmLabel = "Eliminar",
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="c-backdrop">
      <section className="c-card c-danger" role="dialog" aria-modal="true" aria-labelledby="del-title">
        <header className="c-header">
          <h2 id="del-title">{title}</h2>
          <button className="c-close" onClick={onCancel} aria-label="Cerrar" disabled={loading}>×</button>
        </header>

        <div className="c-body">
          <p>{message}</p>
        </div>

        <footer className="c-footer">
          <button className="btn btn-ghost" onClick={onCancel} disabled={loading}>Cancelar</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? "Eliminando…" : confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}
