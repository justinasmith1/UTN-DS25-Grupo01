// src/components/Cards/Documentos/DocumentoFormCard.jsx
// Card independiente para cargar un documento (solo frontend, persiste en sessionStorage).
import { useState, useEffect, useRef } from "react";
import "../Base/cards.css";
import { addLocalDoc } from "../../../lib/storage/docsLocal";

export default function DocumentoFormCard({ open, onClose, loteId, onSaved }) {
  const ref = useRef(null);
  const [formState, setFormState] = useState({
    nombre: "",
    link: "",
    tipo: "OTRO",
    fileDataUrl: "",
    fileName: "",
  });

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

  if (!open) return null;

  const handleFileChange = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setFormState((prev) => ({
        ...prev,
        fileDataUrl: e.target?.result || "",
        fileName: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!loteId) return;
    if (!formState.nombre.trim()) return;
    const nuevo = {
      id: `${Date.now()}`,
      nombre: formState.nombre.trim(),
      link: formState.link.trim() || formState.fileDataUrl,
      tipo: formState.tipo || "OTRO",
      fileName: formState.fileName || formState.nombre.trim(),
      createdAt: new Date().toISOString(),
      isLocal: true,
    };
    addLocalDoc(loteId, nuevo);
    onSaved?.(nuevo);
    onClose?.();
    setFormState({
      nombre: "",
      link: "",
      tipo: "OTRO",
      fileDataUrl: "",
      fileName: "",
    });
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
          <button type="button" className="cclf-btn-close" onClick={onClose} aria-label="Cerrar">
            <span className="cclf-btn-close__x">×</span>
          </button>
        </header>

        <div className="c-body" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={{ fontSize: "13px", color: "#374151" }}>Nombre</label>
            <input
              type="text"
              value={formState.nombre}
              onChange={(e) => setFormState((p) => ({ ...p, nombre: e.target.value }))}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
              placeholder="Ej: Certificado, Informe, etc."
            />
          </div>
          <div>
            <label style={{ fontSize: "13px", color: "#374151" }}>Tipo</label>
            <select
              value={formState.tipo}
              onChange={(e) => setFormState((p) => ({ ...p, tipo: e.target.value }))}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
            >
              <option value="OTRO">Otro</option>
              <option value="BOLETO">Boleto</option>
              <option value="ESCRITURA">Escritura</option>
              <option value="PLANO">Plano</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: "13px", color: "#374151" }}>Link (opcional)</label>
            <input
              type="text"
              value={formState.link}
              onChange={(e) => setFormState((p) => ({ ...p, link: e.target.value }))}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
              placeholder="https://..."
            />
          </div>
          <div>
            <label style={{ fontSize: "13px", color: "#374151" }}>Adjuntar archivo (PDF u otro)</label>
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
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileChange(file);
              }}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".pdf,image/*";
                input.onchange = (e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileChange(file);
                };
                input.click();
              }}
            >
              {formState.fileName ? (
                <div style={{ fontSize: "14px", color: "#111827" }}>{formState.fileName}</div>
              ) : (
                <div style={{ fontSize: "14px", color: "#6b7280" }}>
                  Arrastra un archivo o haz clic para seleccionar
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="c-footer" style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            className="tl-btn tl-btn--soft"
            onClick={handleSubmit}
            disabled={!formState.nombre.trim()}
            style={{ flex: 1 }}
          >
            Guardar
          </button>
          <button
            type="button"
            className="tl-btn tl-btn--ghost"
            onClick={onClose}
            style={{ flex: 1 }}
          >
            Cancelar
          </button>
        </footer>
      </div>
    </div>
  );
}
