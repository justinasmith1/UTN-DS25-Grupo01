import { useState, useEffect, useRef } from "react";
import "../Base/cards.css";
import { uploadArchivo } from "../../../lib/api/archivos";

export default function DocumentoFormCard({ open, onClose, loteId, onSaved }) {
  const ref = useRef(null);
  const [tipo, setTipo] = useState("OTRO");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        onClose?.();
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setTipo("OTRO");
      setFile(null);
      setLoading(false);
      setError("");
    }
  }, [open]);

  if (!open) return null;

  const handleFileChange = (f) => {
    if (!f) return;
    setFile(f);
    setError("");
  };

  const handleSubmit = async () => {
    if (!loteId || !file) return;
    setLoading(true);
    setError("");
    try {
      const saved = await uploadArchivo(file, loteId, tipo);
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      setError(err?.message || "Error al subir el archivo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="c-backdrop" onClick={onClose}>
      <div
        className="c-card"
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(500px, 95vw)" }}
      >
        <header className="c-header">
          <h2 className="c-title">Agregar documento</h2>
          <button
            type="button"
            className="cclf-btn-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <span className="cclf-btn-close__x">×</span>
          </button>
        </header>

        <div
          className="c-body"
          style={{ display: "flex", flexDirection: "column", gap: "12px" }}
        >
          <div>
            <label style={{ fontSize: "13px", color: "#374151" }}>Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
              }}
            >
              <option value="OTRO">Otro</option>
              <option value="BOLETO">Boleto</option>
              <option value="ESCRITURA">Escritura</option>
              <option value="PLANO">Plano</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "13px", color: "#374151" }}>
              Archivo (PDF o imagen) *
            </label>
            <div
              style={{
                border: "1px dashed #9ca3af",
                borderRadius: "10px",
                padding: "14px",
                textAlign: "center",
                background: "#fff",
                cursor: "pointer",
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) handleFileChange(f);
              }}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".pdf,image/*";
                input.onchange = (e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileChange(f);
                };
                input.click();
              }}
            >
              {file ? (
                <div style={{ fontSize: "14px", color: "#111827" }}>
                  {file.name}
                </div>
              ) : (
                <div style={{ fontSize: "14px", color: "#6b7280" }}>
                  Arrastra un archivo o haz clic para seleccionar
                </div>
              )}
            </div>
          </div>

          {error && (
            <div
              style={{
                fontSize: "13px",
                color: "#dc2626",
                padding: "8px",
                backgroundColor: "#fef2f2",
                borderRadius: "6px",
              }}
            >
              {error}
            </div>
          )}
        </div>

        <footer className="c-footer" style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            className="tl-btn tl-btn--soft"
            onClick={handleSubmit}
            disabled={!file || loading}
            style={{ flex: 1 }}
          >
            {loading ? "Subiendo..." : "Subir"}
          </button>
          <button
            type="button"
            className="tl-btn tl-btn--ghost"
            onClick={onClose}
            disabled={loading}
            style={{ flex: 1 }}
          >
            Cancelar
          </button>
        </footer>
      </div>
    </div>
  );
}
