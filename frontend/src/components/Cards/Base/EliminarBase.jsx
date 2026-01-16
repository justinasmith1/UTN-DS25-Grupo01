import "./cards.css";

/** * EliminarBase: diálogo de confirmación destructiva (reutilizable).  */
export default function EliminarBase({
  open,
  title = "Eliminar",
  // Mensaje de cabecera (pregunta)
  message = "¿Confirmás la eliminación?",
  // Detalles como bullets (ej.: ["Lote: 1", "Comprador: ..."])
  details = [],
  // Nota en negrita (ej.: "Esta acción es irreversible.")
  noteBold,
  // Mensaje de error a mostrar
  error = null,
  confirmLabel = "Eliminar",
  loading = false,
  loadingLabel = "Eliminando…",
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  const handleBackdropClick = (e) => {
    // Evita cerrar si se hace click dentro de la tarjeta
    e.stopPropagation();
  };

  return (
    <div className="c-backdrop" role="presentation" onClick={!loading ? onCancel : undefined}>
      <section
        className="c-card c-danger"
        role="dialog"
        aria-modal="true"
        aria-labelledby="del-title"
        onClick={handleBackdropClick}
      >
        {/* Header rojo claro + botón cerrar del verCard */}
        <header className="c-header c-header-danger">
          <h2 id="del-title" className="c-title">{title}</h2>

          <button
            type="button"
            className="cclf-btn-close"
            onClick={onCancel}
            aria-label="Cerrar"
            disabled={loading}
          >
            <span className="cclf-btn-close__x">×</span>
          </button>
        </header>

        {/* Contenido */}
        <div className="c-body">
          {(message || noteBold) && (
            <p className="c-message">
              {message}
              {noteBold ? <> <strong>{noteBold}</strong></> : null}
            </p>
          )}

          {/* Lista de detalles con bullets */}
          {details?.length > 0 && (
            <ul className="c-bullets">
              {details.map((line, idx) => (
                <li key={idx}>{line}</li>
              ))}
            </ul>
          )}

          {/* Mensaje de error si existe */}
          {error && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '6px',
              color: '#991b1b',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Separador visual */}
        <div className="c-divider" aria-hidden="true" />

        {/* Footer con acciones */}
        <footer className="c-footer">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? loadingLabel : confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}
