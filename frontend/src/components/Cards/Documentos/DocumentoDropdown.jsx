// src/components/Cards/Documentos/DocumentoDropdown.jsx
import { useState, useRef, useEffect } from "react";
import "../Base/cards.css";

const TIPOS_DOCUMENTO = [
  { value: "BOLETO", label: "Boleto de Compraventa" },
  { value: "ESCRITURA", label: "Escritura" },
  { value: "PLANOS", label: "Planos" },
];

export default function DocumentoDropdown({
  open,
  onClose,
  onSelectTipo,
  loteId,
  loteNumero,
  entityType = "Lote", // "Lote" para lotes directos, o puede ser "Venta"/"Reserva"
}) {
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose?.();
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="c-backdrop" onClick={onClose}>
      <div
        className="c-card"
        ref={dropdownRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(400px, 90vw)",
          maxHeight: "auto",
        }}
      >
        <header className="c-header">
          <h2 className="c-title">Ver Documentos</h2>
          <button
            type="button"
            className="cclf-btn-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <span className="cclf-btn-close__x">×</span>
          </button>
        </header>

        <div className="c-body">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {TIPOS_DOCUMENTO.map((tipo) => (
              <button
                key={tipo.value}
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  onSelectTipo?.(tipo.value, tipo.label);
                  onClose?.();
                }}
                style={{
                  width: "100%",
                  textAlign: "center",
                  padding: "12px 16px",
                  fontSize: "15px",
                  fontWeight: 500,
                  backgroundColor: "#f3f4f6",
                  border: "1px solid rgba(0,0,0,.1)",
                  borderRadius: "8px",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#e5e7eb";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#f3f4f6";
                }}
              >
                {tipo.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

