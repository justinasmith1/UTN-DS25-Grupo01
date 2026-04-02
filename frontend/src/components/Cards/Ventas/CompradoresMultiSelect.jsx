// CompradoresMultiSelect.jsx
// Selector múltiple de compradores con patrón visual "Grupo Familiar".
// Props:
//   value          {Persona[]}   — compradores actualmente seleccionados
//   onAdd          (Persona) =>  — callback al agregar uno
//   onRemove       (id) =>       — callback al quitar uno
//   disabled       boolean       — true = solo lectura (sin buscador ni botón ×)
//   error          string|null   — mensaje de error inline (modo editable)
//   personas       {Persona[]}   — lista completa para el buscador (solo cuando disabled=false)
//   tooltipReadOnly string|null  — texto del tooltip cuando disabled=true

import { Info } from "lucide-react";
import PersonaSearchSelect from "../Lotes/PersonaSearchSelect.jsx";
import "../Base/cards.css";

function personaNombre(p) {
  if (!p) return "";
  const nombre = [p.nombre, p.apellido].filter(Boolean).join(" ");
  return nombre || p.razonSocial || `Persona ${p.id}`;
}

function personaIdentificador(p) {
  if (!p?.identificadorValor) return null;
  return `${p.identificadorTipo ?? "DNI"}: ${p.identificadorValor}`;
}

export default function CompradoresMultiSelect({
  value = [],
  onAdd,
  onRemove,
  disabled = false,
  error = null,
  personas = [],
  tooltipReadOnly = null,
}) {
  const personasDisponibles = personas.filter(
    (p) => !value.some((c) => String(c.id) === String(p.id))
  );

  return (
    <div className="buyersBlock">
      <div className="buyersBlock__header">
        <span className="buyersBlock__label">
          Compradores
          {disabled && tooltipReadOnly && (
            <span
              className="buyersBlock__tooltipIcon"
              data-tooltip={tooltipReadOnly}
            >
              <Info size={13} />
            </span>
          )}
        </span>
        {!disabled && error && (
          <span className="buyersBlock__error">{error}</span>
        )}
      </div>

      {value.length > 0 && (
        <div className="buyersList">
          {value.map((c, idx) => (
            <div key={c.id ?? idx} className="buyerItem">
              <div className="buyerItem__info">
                <span className="buyerItem__name">{personaNombre(c)}</span>
                {personaIdentificador(c) && (
                  <span className="buyerItem__meta">{personaIdentificador(c)}</span>
                )}
              </div>
              {!disabled && (
                <button
                  type="button"
                  className="buyerRemoveBtn"
                  onClick={() => onRemove?.(c.id)}
                  title="Quitar comprador"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {value.length === 0 && disabled && (
        <div className="buyersEmpty">Sin información</div>
      )}

      {!disabled && (
        <div className="buyersAddRow">
          <PersonaSearchSelect
            label=""
            noLabel
            value=""
            onSelect={(val) => {
              if (!val) return;
              const persona = personas.find((p) => String(p.id) === String(val));
              if (!persona) return;
              if (value.some((c) => String(c.id) === String(val))) return;
              onAdd?.(persona);
            }}
            personas={personasDisponibles}
            placeholder={
              value.length === 0
                ? "Buscar por nombre, apellido o DNI"
                : "Agregar otro comprador…"
            }
          />
        </div>
      )}
    </div>
  );
}
