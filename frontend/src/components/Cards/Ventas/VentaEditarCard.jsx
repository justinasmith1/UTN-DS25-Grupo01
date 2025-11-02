// Card de edición de Venta (solo Admin/Gestor).
// Reglas simples:
// - Campos inmutables siempre: id, loteId, compradorId, inmobiliariaId, createdAt, updateAt, reservaId
// - Si estado es FINALIZADA o CANCELADA => todo read-only
// - Si existe reservaId => monto y tipoPago quedan read-only
// - Transiciones de estado válidas: INICIADA → {CON_BOLETO, CANCELADA}, CON_BOLETO → {FINALIZADA, CANCELADA}
// - Validaciones mínimas: monto >= 0, fechas válidas, patch minimal

import { useEffect, useMemo, useState } from "react";
import EditarBase from "../Base/EditarBase.jsx";

const ESTADOS = ["INICIADA", "CON_BOLETO", "FINALIZADA", "CANCELADA"];
const TIPOS_PAGO = ["Contado", "Transferencia", "Cuotas", "Financiado", "Otro"];

// Helpers fecha para input[type="date"]
function toDateInputValue(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function fromDateInputToISO(dateStr) {
  if (!dateStr) return null;
  return new Date(`${dateStr}T00:00:00.000Z`).toISOString();
}

// Transiciones de estado sin rollback
function isValidTransition(from, to) {
  if (from === to) return true;
  if (from === "INICIADA") return to === "CON_BOLETO" || to === "CANCELADA";
  if (from === "CON_BOLETO") return to === "FINALIZADA" || to === "CANCELADA";
  return false;
}

// Reglas de edición por campo (sin roles)
function canEditField({ estadoActual, field, hasReserva }) {
  // Campos inmutables por diseño
  const roAlways = ["id", "loteId", "compradorId", "inmobiliariaId", "createdAt", "updateAt", "reservaId"];
  if (roAlways.includes(field)) return false;

  // Estado final/cancelado: bloqueo global
  if (estadoActual === "FINALIZADA" || estadoActual === "CANCELADA") return false;

  // Si hay reserva asociada, monto y tipoPago quedan fijos
  if (hasReserva && (field === "monto" || field === "tipoPago")) return false;

  // Resto editable en estados abiertos
  if (["estado", "monto", "tipoPago", "fechaVenta", "plazoEscritura"].includes(field)) return true;

  return false;
}

export default function VentaEditarCard({ open, venta, saving = false, onCancel, onSave }) {
  if (!open || !venta) return null;

  const estadoActual = String(venta?.estado ?? "INICIADA");
  const hasReserva = Boolean(venta?.reservaId);

  // Estado local del formulario
  const [estado, setEstado] = useState(estadoActual);
  const [monto, setMonto] = useState(venta?.monto != null ? String(venta.monto) : "");
  const [tipoPago, setTipoPago] = useState(venta?.tipoPago ?? "");
  const [fechaVenta, setFechaVenta] = useState(toDateInputValue(venta?.fechaVenta));
  const [plazoEscritura, setPlazoEscritura] = useState(toDateInputValue(venta?.plazoEscritura));

  // Re-sincronizar al abrir
  useEffect(() => {
    if (!open || !venta) return;
    const est = String(venta?.estado ?? "INICIADA");
    setEstado(est);
    setMonto(venta?.monto != null ? String(venta.monto) : "");
    setTipoPago(venta?.tipoPago ?? "");
    setFechaVenta(toDateInputValue(venta?.fechaVenta));
    setPlazoEscritura(toDateInputValue(venta?.plazoEscritura));
  }, [open, venta]);

  // Badge de estado
  const badges = useMemo(() => {
    const tone =
      estado === "CON_BOLETO" ? "warning" :
      estado === "INICIADA"   ? "info"    :
      estado === "CANCELADA"  ? "danger"  :
      "success";
    return [{ label: estado || "—", tone }];
  }, [estado]);

  // Validaciones mínimas
  function validateMonto(v) {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return "El monto debe ser un número mayor o igual a 0.";
    return null;
  }
  function validateFecha(str) {
    if (!str) return null;
    const d = new Date(str);
    if (Number.isNaN(d.getTime())) return "La fecha no es válida.";
    return null;
  }

  // Construcción de patch minimal respetando reglas
  function buildPatch() {
    const patch = {};

    // estado (con validación de transición)
    if (canEditField({ estadoActual, field: "estado", hasReserva })) {
      if (isValidTransition(estadoActual, estado) && String(estadoActual) !== String(estado)) {
        patch.estado = estado;
      }
    }

    // monto
    if (canEditField({ estadoActual, field: "monto", hasReserva })) {
      const err = validateMonto(monto);
      if (err) throw new Error(err);
      const prev = venta?.monto ?? null;
      const next = monto === "" ? null : Number(monto);
      if ((prev ?? null) !== (next ?? null)) patch.monto = next;
    }

    // tipoPago
    if (canEditField({ estadoActual, field: "tipoPago", hasReserva })) {
      const prev = venta?.tipoPago ?? "";
      const next = tipoPago ?? "";
      if (String(prev) !== String(next)) patch.tipoPago = next || null;
    }

    // fechaVenta
    if (canEditField({ estadoActual, field: "fechaVenta", hasReserva })) {
      if (fechaVenta) {
        const err = validateFecha(fechaVenta);
        if (err) throw new Error(err);
      }
      const prevISO = venta?.fechaVenta ? toDateInputValue(venta.fechaVenta) : "";
      if (prevISO !== fechaVenta) {
        patch.fechaVenta = fechaVenta ? fromDateInputToISO(fechaVenta) : null;
      }
    }

    // plazoEscritura
    if (canEditField({ estadoActual, field: "plazoEscritura", hasReserva })) {
      if (plazoEscritura) {
        const err = validateFecha(plazoEscritura);
        if (err) throw new Error(err);
      }
      const prevISO = venta?.plazoEscritura ? toDateInputValue(venta.plazoEscritura) : "";
      if (prevISO !== plazoEscritura) {
        patch.plazoEscritura = plazoEscritura ? fromDateInputToISO(plazoEscritura) : null;
      }
    }

    return patch;
  }

  function handleSave() {
    try {
      const patch = buildPatch();
      if (Object.keys(patch).length === 0) {
        onCancel?.(); // No hay cambios, cierro.
        return;
      }
      onSave?.(patch);
    } catch (e) {
      console.error("Validación de formulario:", e?.message || e);
      alert(e?.message || "Revisá los datos ingresados.");
    }
  }

  // Helpers de readonly para inputs
  const ro = {
    estado: !canEditField({ estadoActual, field: "estado", hasReserva }) || saving,
    monto: !canEditField({ estadoActual, field: "monto", hasReserva }) || saving,
    tipoPago: !canEditField({ estadoActual, field: "tipoPago", hasReserva }) || saving,
    fechaVenta: !canEditField({ estadoActual, field: "fechaVenta", hasReserva }) || saving,
    plazoEscritura: !canEditField({ estadoActual, field: "plazoEscritura", hasReserva }) || saving,
  };

  return (
    <EditarBase
      open={open}
      title={`Editar Venta #${venta?.id ?? "—"}`}
      badges={badges}
      tabs={[]}
      activeTab={undefined}
      onTabChange={undefined}
      onCancel={onCancel}
      onSave={handleSave}
      saving={saving}
    >
      <div className="grid grid-12">
        {/* Estado */}
        <div className="col-6">
          <div className="label">Estado</div>
          <select
            className="field"
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            disabled={ro.estado}
          >
            {ESTADOS.map(op => <option key={op} value={op}>{op}</option>)}
          </select>
        </div>

        {/* Monto */}
        <div className="col-6">
          <div className="label">Monto</div>
          <input
            className="field"
            type="number"
            inputMode="decimal"
            min="0"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            disabled={ro.monto}
          />
        </div>

        {/* Tipo de pago */}
        <div className="col-6">
          <div className="label">Tipo de pago</div>
          <select
            className="field"
            value={tipoPago}
            onChange={(e) => setTipoPago(e.target.value)}
            disabled={ro.tipoPago}
          >
            <option value="">—</option>
            {TIPOS_PAGO.map(op => <option key={op} value={op}>{op}</option>)}
          </select>
        </div>

        {/* Plazo de escritura */}
        <div className="col-6">
          <div className="label">Plazo escritura</div>
          <input
            className="field"
            type="date"
            value={plazoEscritura}
            onChange={(e) => setPlazoEscritura(e.target.value)}
            disabled={ro.plazoEscritura}
          />
        </div>

        {/* Fecha de venta */}
        <div className="col-6">
          <div className="label">Fecha de venta</div>
          <input
            className="field"
            type="date"
            value={fechaVenta}
            onChange={(e) => setFechaVenta(e.target.value)}
            disabled={ro.fechaVenta}
          />
        </div>

        {/* Contexto solo lectura */}
        <div className="col-6">
          <div className="label">Comprador</div>
          <div className="value">
            {venta?.comprador?.nombre
              ? `${venta.comprador.nombre} ${venta.comprador.apellido ?? ""}`.trim()
              : "—"}
          </div>
        </div>

        <div className="col-6">
          <div className="label">Inmobiliaria</div>
          <div className="value">
            {venta?.inmobiliaria?.nombre ?? "La Federala"}
          </div>
        </div>

        <div className="col-6">
          <div className="label">ID Lote</div>
          <div className="value">{venta?.loteId ?? "—"}</div>
        </div>
      </div>
    </EditarBase>
  );
}
