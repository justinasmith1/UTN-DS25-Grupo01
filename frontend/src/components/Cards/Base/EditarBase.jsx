import "./cards.css";

/**
 * EditarBase: igual estructura que VerBase, pero “editable”.
 * El submit/validaciones los hace el wrapper según tu service.
 */
export default function EditarBase({
  open, title, badges = [],
  tabs = [], activeTab, onTabChange,
  onCancel, onSave, saving = false,
  children,
}) {
  if (!open) return null;

  return (
    <div className="c-backdrop">
      <section className="c-card" role="dialog" aria-modal="true" aria-labelledby="card-title">
        <header className="c-header">
          <h2 id="card-title">{title}</h2>
          <div className="c-badges">
            {badges.map((b,i)=>(
              <span key={i} className={`c-badge c-badge-${b.tone || "info"}`}>{b.label}</span>
            ))}
          </div>
          <button className="c-close" onClick={onCancel} aria-label="Cerrar" disabled={saving}>×</button>
        </header>

        {tabs.length > 0 && (
          <nav className="c-tabs" aria-label="Secciones">
            {tabs.map(t => (
              <button
                key={t.id}
                className={`c-tab ${activeTab === t.id ? "is-active" : ""}`}
                onClick={() => onTabChange?.(t.id)}
                type="button"
                disabled={saving}
              >{t.label}</button>
            ))}
          </nav>
        )}

        <div className="c-body">
          {children}
        </div>

        <footer className="c-footer">
          <button className="btn btn-ghost" onClick={onCancel} disabled={saving}>Cancelar</button>
          <button className="btn btn-primary" onClick={onSave} disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </footer>
      </section>
    </div>
  );
}
