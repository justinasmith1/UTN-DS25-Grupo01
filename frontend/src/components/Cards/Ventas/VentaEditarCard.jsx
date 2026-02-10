// src/components/Ventas/VentaEditarCard.jsx
import { useEffect, useRef, useState, useMemo } from "react";
import EditarBase from "../Base/EditarBase.jsx";
import SuccessAnimation from "../Base/SuccessAnimation.jsx";
import NiceSelect from "../../Base/NiceSelect.jsx";
import { Info } from "lucide-react";
import { updateVenta, getVentaById } from "../../../lib/api/ventas.js";
import { getAllInmobiliarias } from "../../../lib/api/inmobiliarias.js";
import { canEditByEstadoOperativo, isEliminado } from "../../../utils/estadoOperativo";
import { 
  getEstadosDisponibles, 
  esEstadoTerminal, 
  getMensajeEstadoTerminal,
  OPCIONES_ESTADO_COBRO,
  puedeEditarEstadoCobro,
  esVentaEditable,
  isVentaFinalizada
} from "../../../utils/ventaState";

/* -------------------------- Helpers fechas -------------------------- */
function toDateInputValue(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function fromDateInputToISO(s) {
  if (!s || !s.trim()) return null;
  // El backend espera un string ISO válido
  // Formato de entrada: YYYY-MM-DD (del input type="date")
  const date = new Date(`${s}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/* -------------------------- Constantes -------------------------- */

// Objeto de errores inicial (reutilizable)
const INITIAL_ERRORS = {
  numero: null,
  estado: null,
  fechaVenta: null,
  fechaEscrituraReal: null,
  fechaCancelacion: null,
  motivoCancelacion: null,
  general: null,
};

// Mapa de keywords para detección inteligente de errores del backend
const ERROR_KEYWORDS = [
  { pattern: /fechaVenta|fecha.*venta/i, field: 'fechaVenta' },
  { pattern: /fechaEscrituraReal/i, field: 'fechaEscrituraReal' },
  { pattern: /fechaCancelaci[oó]n/i, field: 'fechaCancelacion' },
  { pattern: /motivoCancelaci[oó]n/i, field: 'motivoCancelacion' },
  { pattern: /estado/i, field: 'estado' },
  { pattern: /n[uú]mero/i, field: 'numero' },
];

/* ========================================================================== */

export default function VentaEditarCard({
  open,
  venta,                   // opcional: si viene completa, se usa
  ventaId,                 // opcional: si viene id, se hace GET
  ventas,                  // opcional: lista cache para buscar por id
  onCancel,
  onSaved,
  inmobiliarias: propsInmob = [], // opcional
  entityType = "Venta",    // tipo de entidad para el mensaje de éxito (Venta, Reserva, etc.)
}) {
  /* 1) HOOKS SIEMPRE ARRIBA (sin returns condicionales) */
  const [detalle, setDetalle] = useState(venta || null);
  const [inmobiliarias, setInmobiliarias] = useState(propsInmob || []);
  const [saving, setSaving] = useState(false);

  // evita múltiples llamados a inmobiliarias
  const fetchedInmobRef = useRef(false);

  // ancho de label como en VerCard
  const [labelW, setLabelW] = useState(180);
  const containerRef = useRef(null);

  /* 2) GET de venta al abrir y cuando cambia la prop venta (igual patrón que VerCard) */
  useEffect(() => {
    let abort = false;
    async function run() {
      if (!open) return;

      // Si viene venta por props, usarla (esto se ejecuta también cuando venta cambia)
      if (venta) {
        setDetalle(venta);
        return;
      }

      if (ventaId != null && Array.isArray(ventas)) {
        const found = ventas.find(v => `${v.id}` === `${ventaId}`);
        if (found) {
          setDetalle(found);
          return;
        }
      }

      if (ventaId != null) {
        try {
          const response = await getVentaById(ventaId);
          const full = response?.data ?? response;
          if (!abort && full) setDetalle(full);
        } catch (e) {
          console.error("Error obteniendo venta por id:", e);
        }
      }
    }
    run();
    return () => { abort = true; };
  }, [open, ventaId, ventas, venta?.id, venta?.monto]); // Agregar venta?.id y venta?.monto para detectar cambios

  /* 3) Resetear estados cuando el modal se cierra o se abre con otra venta */
  useEffect(() => {
    if (!open) {
      fetchedInmobRef.current = false;
      setSaving(false);
      setShowSuccess(false);
    } else {
      // Resetear estados al abrir con una nueva venta
      setSaving(false);
      setShowSuccess(false);
    }
  }, [open, detalle?.id]); // Resetear también cuando cambia la venta (detalle.id)

  /* 4) GET de inmobiliarias UNA sola vez por apertura */
  useEffect(() => {
    let abort = false;

    function normalizeList(raw) {
      // getAllInmobiliarias devuelve { data: [...], meta: {...} }
      let list = [];

      if (raw?.data && Array.isArray(raw.data)) {
        list = raw.data;
      } else if (Array.isArray(raw)) {
        list = raw;
      } else if (raw?.data?.data?.inmobiliarias && Array.isArray(raw.data.data.inmobiliarias)) {
        list = raw.data.data.inmobiliarias;
      } else if (raw?.data?.inmobiliarias && Array.isArray(raw.data.inmobiliarias)) {
        list = raw.data.inmobiliarias;
      } else if (raw?.inmobiliarias && Array.isArray(raw.inmobiliarias)) {
        list = raw.inmobiliarias;
      }

      const arr = Array.isArray(list) ? list : [];
      return arr
        .map(x => ({
          id: x.id ?? x.idInmobiliaria ?? x._id ?? "",
          nombre: x.nombre ?? x.razonSocial ?? "Sin información",
        }))
        .filter(i => i.id);
    }

    async function run() {
      if (!open || fetchedInmobRef.current) return;

      // si vienen por props y tienen longitud, no llamo API
      if (propsInmob && propsInmob.length) {
        const norm = normalizeList(propsInmob);
        setInmobiliarias(norm);
        fetchedInmobRef.current = true;
        return;
      }

      try {
        const response = await getAllInmobiliarias({});
        const norm = normalizeList(response);
        if (!abort) {
          setInmobiliarias(norm);
          fetchedInmobRef.current = true;
        }
      } catch (e) {
        console.error("Error obteniendo inmobiliarias:", e);
        if (!abort) {
          setInmobiliarias([]);
          fetchedInmobRef.current = true;
        }
      }
    }
    run();
    return () => { abort = true; };
    // importante: solo depende de "open" para no re-ejecutar en cada render
  }, [open, propsInmob]);

  /* 5) STATES EDITABLES derivados de 'detalle' */
  // Fechas con todos los posibles nombres que vi en tu back
  const fechaVentaISO =
    detalle?.fechaVenta ?? detalle?.fecha_venta ?? null;
  // Backend usa updateAt (sin 'd'), mapeamos a updatedAt para consistencia
  const fechaActISO =
    detalle?.updatedAt ?? detalle?.updateAt ?? detalle?.fechaActualizacion ?? null;
  const fechaCreISO =
    detalle?.createdAt ?? detalle?.fechaCreacion ?? null;

  const initialInmobId =
    detalle?.inmobiliaria?.id ?? detalle?.inmobiliariaId ?? "";
  const initialNumero = detalle?.numero != null ? String(detalle.numero) : "";

  // Objeto base memoizado (evita recreación en cada render)
  const base = useMemo(() => ({
    estado: String(detalle?.estado ?? "INICIADA"),
    monto: detalle?.monto != null ? String(detalle.monto) : "",
    tipoPago: detalle?.tipoPago ?? "",
    fechaVenta: toDateInputValue(fechaVentaISO),
    plazoEscritura: toDateInputValue(detalle?.plazoEscritura),
    inmobiliariaId: initialInmobId,
    numero: initialNumero,
  }), [detalle?.estado, detalle?.monto, detalle?.tipoPago, fechaVentaISO, detalle?.plazoEscritura, initialInmobId, initialNumero]);

  const [estado, setEstado] = useState(base.estado);
  const [estadoCobro, setEstadoCobro] = useState(detalle?.estadoCobro ?? 'PENDIENTE');
  const [monto, setMonto] = useState(base.monto);
  const [tipoPago, setTipoPago] = useState(base.tipoPago);
  const [fechaVenta, setFechaVenta] = useState(base.fechaVenta);
  const [plazoEscritura, setPlazoEscritura] = useState(base.plazoEscritura);
  const [inmobiliariaId, setInmobiliariaId] = useState(base.inmobiliariaId);
  const [numero, setNumero] = useState(base.numero);
  const [showSuccess, setShowSuccess] = useState(false);

  // Nuevos campos condicionales (Etapa 1)
  const [fechaEscrituraReal, setFechaEscrituraReal] = useState(
    toDateInputValue(detalle?.fechaEscrituraReal)
  );
  const [fechaCancelacion, setFechaCancelacion] = useState(
    toDateInputValue(detalle?.fechaCancelacion)
  );
  const [motivoCancelacion, setMotivoCancelacion] = useState(
    detalle?.motivoCancelacion ?? ""
  );

  // Sistema de errores estructurado (reemplaza alerts)
  const [errors, setErrors] = useState(INITIAL_ERRORS);

  // re-sync cuando cambia 'detalle' o se reabre
  useEffect(() => {
    if (!open || !detalle) return;
    setEstado(base.estado);
    setEstadoCobro(detalle?.estadoCobro ?? 'PENDIENTE');
    setMonto(base.monto);
    setTipoPago(base.tipoPago);
    setFechaVenta(base.fechaVenta);
    setPlazoEscritura(base.plazoEscritura);
    setInmobiliariaId(base.inmobiliariaId);
    setNumero(base.numero);
    setFechaEscrituraReal(toDateInputValue(detalle?.fechaEscrituraReal));
    setFechaCancelacion(toDateInputValue(detalle?.fechaCancelacion));
    setMotivoCancelacion(detalle?.motivoCancelacion ?? "");
    setErrors({ ...INITIAL_ERRORS });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, detalle?.id, detalle?.monto]);

  /* 6) ancho de label como en VerCard */
  useEffect(() => {
    const labels = [
      "LOTE N°", "MONTO", "ESTADO DE VENTA", "ESTADO DE COBRO", "INMOBILIARIA", "COMPRADOR", "PROPIETARIO",
      "NÚMERO DE VENTA", "FECHA VENTA", "TIPO DE PAGO", "PLAZO ESCRITURA", "FECHA DE ACTUALIZACIÓN", "FECHA DE CREACIÓN",
      "FECHA ESCRITURA REAL", "FECHA CANCELACIÓN", "MOTIVO CANCELACIÓN"
    ];
    const longest = Math.max(...labels.map(s => s.length));
    const computed = Math.min(240, Math.max(160, Math.round(longest * 8.6) + 20));
    setLabelW(computed);
  }, [open, detalle?.id]);

  /* 7) Guardado (PATCH minimal y validado) */
  function buildPatch() {
    const patch = {};

    if (estado !== (detalle?.estado ?? "")) patch.estado = estado;

    // EstadoCobro (Etapa 2)
    if (estadoCobro !== (detalle?.estadoCobro ?? "PENDIENTE")) {
      patch.estadoCobro = estadoCobro;
    }

    if (monto !== (detalle?.monto != null ? String(detalle.monto) : "")) {
      const n = Number(monto);
      if (!(monto === "" || (Number.isFinite(n) && n >= 0))) {
        throw new Error("El monto debe ser un número ≥ 0.");
      }
      patch.monto = monto === "" ? null : n;
    }

    if ((detalle?.tipoPago ?? "") !== (tipoPago ?? "")) {
      patch.tipoPago = tipoPago || null;
    }

    const prevNumero = detalle?.numero != null ? String(detalle.numero) : "";
    if (numero !== prevNumero) {
      const trimmed = (numero || "").trim();
      if (!trimmed || trimmed.length < 3 || trimmed.length > 30) {
        throw new Error("Número de venta inválido (3 a 30 caracteres).");
      }
      patch.numero = trimmed;
    }

    const prevFV = toDateInputValue(fechaVentaISO);
    if (prevFV !== fechaVenta) {
      patch.fechaVenta = fechaVenta ? fromDateInputToISO(fechaVenta) : null;
    }

    const prevPE = toDateInputValue(detalle?.plazoEscritura);
    if (prevPE !== plazoEscritura) {
      // Si el campo está vacío, enviamos null; si tiene valor, lo convertimos a ISO
      patch.plazoEscritura = plazoEscritura && plazoEscritura.trim() !== ""
        ? fromDateInputToISO(plazoEscritura)
        : null;
    }

    const prevInmob = detalle?.inmobiliaria?.id ?? detalle?.inmobiliariaId ?? "";
    if (prevInmob !== (inmobiliariaId ?? "")) {
      patch.inmobiliariaId = inmobiliariaId || null;
    }

    // Campos condicionales nuevos (Etapa 1)
    const prevFER = toDateInputValue(detalle?.fechaEscrituraReal);
    if (prevFER !== fechaEscrituraReal) {
      patch.fechaEscrituraReal = fechaEscrituraReal && fechaEscrituraReal.trim() !== ""
        ? fromDateInputToISO(fechaEscrituraReal)
        : null;
    }

    const prevFC = toDateInputValue(detalle?.fechaCancelacion);
    if (prevFC !== fechaCancelacion) {
      patch.fechaCancelacion = fechaCancelacion && fechaCancelacion.trim() !== ""
        ? fromDateInputToISO(fechaCancelacion)
        : null;
    }

    const prevMC = detalle?.motivoCancelacion ?? "";
    if (prevMC !== motivoCancelacion) {
      patch.motivoCancelacion = motivoCancelacion && motivoCancelacion.trim() !== ""
        ? motivoCancelacion.trim()
        : null;
    }

    return patch;
  }

  // Helper para limpiar todos los errores
  function clearAllErrors() {
    setErrors({ ...INITIAL_ERRORS });
  }

  // Helper para mapear errores del backend a campos
  function handleBackendError(error) {
    const newErrors = { ...errors };
    
    // Extraer mensaje del error
    const errorMsg = error?.message || error?.response?.data?.message || "Error al guardar la venta";
    
    // Caso 1: Error de transición de estado
    if (/transici[oó]n.*inválida|transición.*estado/i.test(errorMsg)) {
      newErrors.estado = errorMsg;
      setErrors(newErrors);
      return;
    }
    
    // Caso 2: Errores estructurados de Zod (array de errores)
    if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
      error.response.data.errors.forEach((err) => {
        const campo = err.path?.[0] || '';
        const mensaje = err.message || '';
        
        // Mapear por campo
        if (campo === 'numero' || /n[uú]mero/i.test(mensaje)) {
          newErrors.numero = mensaje || "Número de venta inválido";
        } else if (campo === 'estado' || /estado/i.test(mensaje)) {
          newErrors.estado = mensaje;
        } else if (campo === 'fechaVenta' || /fecha.*venta/i.test(mensaje)) {
          newErrors.fechaVenta = mensaje;
        } else if (campo === 'fechaEscrituraReal' || /fecha.*escritura.*real/i.test(mensaje)) {
          newErrors.fechaEscrituraReal = mensaje;
        } else if (campo === 'fechaCancelacion' || /fecha.*cancelaci[oó]n/i.test(mensaje)) {
          newErrors.fechaCancelacion = mensaje;
        } else if (campo === 'motivoCancelacion' || /motivo.*cancelaci[oó]n/i.test(mensaje)) {
          newErrors.motivoCancelacion = mensaje;
        } else {
          // Error genérico
          if (!newErrors.general) newErrors.general = mensaje;
        }
      });
      setErrors(newErrors);
      return;
    }
    
    // Caso 3: Error de unicidad de número (común)
    if (/n[uú]mero.*existe|unique.*numero/i.test(errorMsg)) {
      newErrors.numero = "Ya existe una venta con este número";
      setErrors(newErrors);
      return;
    }
    
    // Caso 4: Menciona un campo específico en el mensaje (detección por keywords)
    const matchedKeyword = ERROR_KEYWORDS.find(k => k.pattern.test(errorMsg));
    if (matchedKeyword) {
      newErrors[matchedKeyword.field] = errorMsg;
    } else {
      newErrors.general = errorMsg;
    }
    
    setErrors(newErrors);
  }

  async function handleSave() {
    // Bloquear guardado si está eliminada
    if (isEliminado(detalle)) {
      setErrors({ ...errors, general: "No se puede editar una venta eliminada. Reactívala para modificarla." });
      return;
    }
    
    try {
      setSaving(true);
      clearAllErrors();

      const newErrors = {};

      // Validaciones condicionales (Etapa 1)
      if (estado === "ESCRITURADO" && (!fechaEscrituraReal || !fechaEscrituraReal.trim())) {
        newErrors.fechaEscrituraReal = "El campo Fecha Escritura Real es obligatorio para el estado ESCRITURADO";
      }

      if (estado === "CANCELADA") {
        if (!fechaCancelacion || !fechaCancelacion.trim()) {
          newErrors.fechaCancelacion = "El campo Fecha Cancelación es obligatorio para el estado CANCELADA";
        }
        if (!motivoCancelacion || !motivoCancelacion.trim()) {
          newErrors.motivoCancelacion = "El campo Motivo Cancelación es obligatorio para el estado CANCELADA";
        }
      }

      // Validación de consistencia de fechas
      if (fechaVenta && fechaVenta.trim()) {
        const fechaVentaDate = new Date(fechaVenta);
        
        // fechaVenta NO puede ser posterior a fechaEscrituraReal
        if (fechaEscrituraReal && fechaEscrituraReal.trim()) {
          const fechaEscrituraDate = new Date(fechaEscrituraReal);
          if (fechaVentaDate > fechaEscrituraDate) {
            newErrors.fechaVenta = "La fecha de venta no puede ser posterior a la fecha de escritura real";
          }
        }
        
        // fechaVenta NO puede ser posterior a fechaCancelacion
        if (fechaCancelacion && fechaCancelacion.trim()) {
          const fechaCancelacionDate = new Date(fechaCancelacion);
          if (fechaVentaDate > fechaCancelacionDate) {
            newErrors.fechaVenta = "La fecha de venta no puede ser posterior a la fecha de cancelación";
          }
        }
      }

      // Si hay errores de validación frontend, mostrarlos y detener
      if (Object.keys(newErrors).length > 0) {
        setErrors({ ...errors, ...newErrors });
        setSaving(false);
        return;
      }

      const patch = buildPatch();

      if (Object.keys(patch).length === 0) {
        setSaving(false);
        onCancel?.();
        return;
      }

      const response = await updateVenta(detalle.id, patch);
      const updated = response?.data ?? response;

      // Actualizar estado local con la respuesta del backend (sincronización)
      setDetalle(updated);

      // Actualizar estado del padre inmediatamente
      onSaved?.(updated);

      // Mostrar animación de éxito
      setShowSuccess(true);

      // Esperar un momento para mostrar la animación antes de cerrar
      setTimeout(() => {
        setShowSuccess(false);
        setSaving(false);
        onCancel?.();
      }, 1500);
    } catch (e) {
      console.error("Error guardando venta:", e);
      handleBackendError(e);
      setSaving(false);
    }
  }

  function handleReset() {
    setEstado(base.estado);
    setEstadoCobro(detalle?.estadoCobro ?? 'PENDIENTE');
    setMonto(base.monto);
    setTipoPago(base.tipoPago);
    setFechaVenta(base.fechaVenta);
    setPlazoEscritura(base.plazoEscritura);
    setInmobiliariaId(base.inmobiliariaId);
    setNumero(base.numero);
    setFechaEscrituraReal(toDateInputValue(detalle?.fechaEscrituraReal));
    setFechaCancelacion(toDateInputValue(detalle?.fechaCancelacion));
    setMotivoCancelacion(detalle?.motivoCancelacion ?? "");
    clearAllErrors();
  }

  /* 8) Render */
  const NA = "Sin información";

  // Opciones de estados dinámicas según transiciones permitidas
  const estadosDisponibles = getEstadosDisponibles(detalle?.estado || 'INICIADA');
  const esTerminal = esEstadoTerminal(detalle?.estado);
  const mensajeTerminal = getMensajeEstadoTerminal(detalle?.estado);
  
  // Etapa 2: Validaciones de edición por estado
  const esEditable = esVentaEditable(detalle?.estado);
  const puedeEditarCobro = puedeEditarEstadoCobro(detalle?.estado);
  
  // FINALIZADA solo se muestra si está guardada en BD (no en cambios locales pendientes)
  const esFinalizada = isVentaFinalizada(detalle);

  const compradorNombre = (() => {
    const n = detalle?.comprador?.nombre, a = detalle?.comprador?.apellido;
    const j = [n, a].filter(Boolean).join(" ");
    return j || NA;
  })();

  const propietarioNombre = (() => {
    // 1) propietario directo
    const p1 = detalle?.propietario;
    // 2) propietario del lote (fallback)
    const p2 = detalle?.lote?.propietario;
    // 3) nombre plano opcional
    const nombrePlano = detalle?.propietarioNombre;
    const p = p1 || p2;

    if (p) {
      const n = p?.nombre, a = p?.apellido;
      const j = [n, a].filter(Boolean).join(" ");
      return j || NA;
    }
    return nombrePlano || NA;
  })();

  const fechaAct = fechaActISO
    ? new Date(fechaActISO).toLocaleDateString("es-AR")
    : NA;
  const fechaCre = fechaCreISO
    ? new Date(fechaCreISO).toLocaleDateString("es-AR")
    : NA;

  if (!open && !showSuccess) return null;

  const estaEliminada = isEliminado(detalle);
  const puedeEditar = canEditByEstadoOperativo(detalle);

  return (
    <>
      {/* Animación de éxito */}
      <SuccessAnimation show={showSuccess} message={`¡${entityType} guardada exitosamente!`} />

      <EditarBase
        open={open}
        title={`Venta N° ${detalle?.numero ?? detalle?.id ?? "—"}`}
        onCancel={() => {
          // Siempre resetear estados antes de cerrar
          setSaving(false);
          setShowSuccess(false);
          clearAllErrors();
          onCancel?.();
        }}
        onSave={handleSave}
        onReset={handleReset}
        saving={saving}
        saveButtonText={puedeEditar && esEditable ? "Guardar cambios" : null}
      >
        {/* Podés mover el chevron del select nativo con esta var si hiciera falta */}
        <div style={{ "--sale-label-w": `${labelW}px`, "--select-chevron-x": "26px" }}>
          {estaEliminada && (
            <div 
              className="alert alert-warning" 
              style={{ 
                marginBottom: '1rem', 
                padding: '0.75rem 1rem',
                backgroundColor: '#fef3c7',
                border: '1px solid #fbbf24',
                borderRadius: '0.375rem',
                color: '#92400e'
              }}
            >
              <strong>Venta eliminada:</strong> No se puede editar una venta eliminada. Reactívala para modificarla.
            </div>
          )}

          {!estaEliminada && !esEditable && estado === 'CANCELADA' && (
            <div 
              className="alert alert-info" 
              style={{ 
                marginBottom: '1rem', 
                padding: '0.75rem 1rem',
                backgroundColor: '#f0f9ff',
                border: '1px solid #0ea5e9',
                borderRadius: '0.375rem',
                color: '#0c4a6e'
              }}
            >
              <strong>Venta cancelada:</strong> Esta venta está en estado cancelado y solo permite lectura.
            </div>
          )}
          
          <h3 className="venta-section-title">Información de la venta</h3>

          <div className="venta-grid" ref={containerRef}>
            {/* Columna izquierda */}
            <div className="venta-col">
              <div className="field-row">
                <div className="field-label">LOTE N°</div>
                <div className="field-value is-readonly">{detalle?.lote?.mapId ?? detalle?.lotMapId ?? detalle?.loteId ?? NA}</div>
              </div>

              <div className="field-row">
                <div className="field-label">MONTO</div>
                <div className="field-value p0" style={{ position: "relative" }}>
                  <input
                    className={`field-input ${(estaEliminada || !esEditable) ? "is-readonly" : ""}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={monto}
                    onChange={(e) => !estaEliminada && esEditable && setMonto(e.target.value)}
                    style={{ paddingRight: "50px" }}
                    disabled={estaEliminada || !esEditable}
                    readOnly={estaEliminada || !esEditable}
                  />
                  {/* Mostrar USD como símbolo al final */}
                  <span style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#6B7280",
                    fontSize: "13px",
                    pointerEvents: "none",
                    fontWeight: 500
                  }}>
                    {monto && Number(monto) > 0 ? "USD" : ""}
                  </span>
                </div>
              </div>

              <div className={`fieldRow ${errors.estado ? "hasError" : ""}`}>
                <div className="field-row">
                  <div className="field-label">ESTADO DE VENTA</div>
                  <div className="field-value p0" style={{ position: 'relative' }}>
                    <NiceSelect
                      value={estado}
                      options={estadosDisponibles}
                      placeholder="Seleccionar estado"
                      onChange={(val) => {
                        if (!estaEliminada && !esTerminal && esEditable) {
                          setEstado(val);
                          // Limpiar error de estado al cambiar
                          if (errors.estado) {
                            setErrors({ ...errors, estado: null });
                          }
                        }
                      }}
                      showPlaceholderOption={false}
                      disabled={estaEliminada || esTerminal || !esEditable}
                    />
                    {/* Tooltip para estados terminales */}
                    {esTerminal && mensajeTerminal && (
                      <span
                        className="propietario-info-icon-inline estado-tooltip-icon"
                        data-tooltip={mensajeTerminal}
                      >
                        <Info size={14} />
                      </span>
                    )}
                  </div>
                </div>
                {/* Indicador FINALIZADA (derivada) - FUERA del field-row para que aparezca debajo */}
                {esFinalizada && estadoCobro === detalle?.estadoCobro && (
                  <div style={{ 
                    marginTop: 6, 
                    marginLeft: 'calc(var(--sale-label-w, 180px) + 12px)',
                    fontSize: 12, 
                    color: '#059669',
                    fontWeight: 600
                  }}>
                    ✓ FINALIZADA (Escriturado + Pago Completo)
                  </div>
                )}
                {/* Error inline */}
                {errors.estado && <div className="fieldError">{errors.estado}</div>}
              </div>

              {/* Etapa 2: Estado de Cobro visible/editable */}
              <div className="field-row">
                <div className="field-label">ESTADO DE COBRO</div>
                <div className="field-value p0">
                  <NiceSelect
                    value={estadoCobro}
                    options={OPCIONES_ESTADO_COBRO}
                    placeholder="Seleccionar estado de cobro"
                    onChange={(val) => {
                      if (!estaEliminada && esEditable && puedeEditarCobro) {
                        setEstadoCobro(val);
                      }
                    }}
                    showPlaceholderOption={false}
                    disabled={estaEliminada || !esEditable || !puedeEditarCobro}
                  />
                  {!puedeEditarCobro && estado === 'CANCELADA' && (
                    <div style={{ 
                      marginTop: 4, 
                      fontSize: 12, 
                      color: '#6b7280',
                      fontStyle: 'italic'
                    }}>
                      No se puede modificar el estado de cobro en ventas canceladas
                    </div>
                  )}
                </div>
              </div>

              {/* Campo condicional: Fecha Escritura Real (solo si ESCRITURADO) */}
              {estado === "ESCRITURADO" && (
                <div className={`fieldRow ${errors.fechaEscrituraReal ? "hasError" : ""}`}>
                  <div className="field-row">
                    <div className="field-label">FECHA ESCRITURA REAL</div>
                    <div className="field-value p0">
                      <input
                        className={`field-input ${estaEliminada ? "is-readonly" : ""} ${errors.fechaEscrituraReal ? "is-invalid" : ""}`}
                        type="date"
                        value={fechaEscrituraReal}
                        onChange={(e) => {
                          if (!estaEliminada) {
                            setFechaEscrituraReal(e.target.value);
                            if (errors.fechaEscrituraReal) {
                              setErrors({ ...errors, fechaEscrituraReal: null });
                            }
                          }
                        }}
                        disabled={estaEliminada}
                        readOnly={estaEliminada}
                      />
                    </div>
                  </div>
                  {errors.fechaEscrituraReal && (
                    <div className="fieldError">{errors.fechaEscrituraReal}</div>
                  )}
                </div>
              )}

              {/* Campos condicionales: Fecha y Motivo de Cancelación (solo si CANCELADA) */}
              {estado === "CANCELADA" && (
                <>
                  <div className={`fieldRow ${errors.fechaCancelacion ? "hasError" : ""}`}>
                    <div className="field-row">
                      <div className="field-label">FECHA CANCELACIÓN</div>
                      <div className="field-value p0">
                        <input
                          className={`field-input ${estaEliminada ? "is-readonly" : ""} ${errors.fechaCancelacion ? "is-invalid" : ""}`}
                          type="date"
                          value={fechaCancelacion}
                          onChange={(e) => {
                            if (!estaEliminada) {
                              setFechaCancelacion(e.target.value);
                              if (errors.fechaCancelacion) {
                                setErrors({ ...errors, fechaCancelacion: null });
                              }
                            }
                          }}
                          disabled={estaEliminada}
                          readOnly={estaEliminada}
                        />
                      </div>
                    </div>
                    {errors.fechaCancelacion && (
                      <div className="fieldError">{errors.fechaCancelacion}</div>
                    )}
                  </div>
                  <div className={`fieldRow ${errors.motivoCancelacion ? "hasError" : ""}`}>
                    <div className="field-row">
                      <div className="field-label">MOTIVO CANCELACIÓN</div>
                      <div className="field-value p0">
                        <textarea
                          className={`field-input ${estaEliminada ? "is-readonly" : ""} ${errors.motivoCancelacion ? "is-invalid" : ""}`}
                          value={motivoCancelacion}
                          onChange={(e) => {
                            if (!estaEliminada) {
                              setMotivoCancelacion(e.target.value);
                              if (errors.motivoCancelacion) {
                                setErrors({ ...errors, motivoCancelacion: null });
                              }
                            }
                          }}
                          placeholder="Motivo de la cancelación"
                          rows={3}
                          disabled={estaEliminada}
                          readOnly={estaEliminada}
                          style={{ resize: "vertical", minHeight: "60px" }}
                        />
                      </div>
                    </div>
                    {errors.motivoCancelacion && (
                      <div className="fieldError">{errors.motivoCancelacion}</div>
                    )}
                  </div>
                </>
              )}

              <div className="field-row">
                <div className="field-label">INMOBILIARIA</div>
                <div className="field-value p0">
                  <NiceSelect
                    value={inmobiliariaId || ""}
                    options={inmobiliarias.map(i => ({ value: i.id, label: i.nombre }))}
                    placeholder="La Federala"
                    onChange={(val) => esEditable && !estaEliminada && setInmobiliariaId(val)}
                    disabled={!esEditable || estaEliminada}
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field-label">COMPRADOR</div>
                <div className="field-value is-readonly">{compradorNombre}</div>
              </div>

              <div className="field-row">
                <div className="field-label">PROPIETARIO</div>
                <div className="field-value is-readonly">{propietarioNombre}</div>
              </div>
            </div>

            {/* Columna derecha */}
            <div className="venta-col">
              <div className={`fieldRow ${errors.numero ? "hasError" : ""}`}>
                <div className="field-row">
                  <div className="field-label">NÚMERO DE VENTA</div>
                  <div className="field-value p0">
                      <input
                        className={`field-input ${(estaEliminada || !esEditable) ? "is-readonly" : ""} ${errors.numero ? "is-invalid" : ""}`}
                        type="text"
                        value={numero}
                        onChange={(e) => {
                          if (!estaEliminada && esEditable) {
                            setNumero(e.target.value);
                            if (errors.numero) {
                              setErrors({ ...errors, numero: null });
                            }
                          }
                        }}
                        placeholder="Ej: CCLF-2025-01"
                        disabled={estaEliminada || !esEditable}
                        readOnly={estaEliminada || !esEditable}
                      />
                  </div>
                </div>
                {errors.numero && <div className="fieldError">{errors.numero}</div>}
              </div>

              {/* Error general (si no se pudo mapear a campo específico) */}
              {errors.general && (
                <div style={{ 
                  marginTop: 8, 
                  marginBottom: 8, 
                  padding: '8px 12px',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fca5a5',
                  borderRadius: '0.375rem',
                  color: '#991b1b',
                  fontSize: '13px'
                }}>
                  {errors.general}
                </div>
              )}

              <div className={`fieldRow ${errors.fechaVenta ? "hasError" : ""}`}>
                <div className="field-row">
                  <div className="field-label">FECHA VENTA</div>
                  <div className="field-value p0">
                      <input
                        className={`field-input ${(estaEliminada || !esEditable) ? "is-readonly" : ""} ${errors.fechaVenta ? "is-invalid" : ""}`}
                        type="date"
                        value={fechaVenta}
                        onChange={(e) => {
                          if (!estaEliminada && esEditable) {
                            setFechaVenta(e.target.value);
                            if (errors.fechaVenta) {
                              setErrors({ ...errors, fechaVenta: null });
                            }
                          }
                        }}
                        disabled={estaEliminada || !esEditable}
                        readOnly={estaEliminada || !esEditable}
                      />
                  </div>
                </div>
                {errors.fechaVenta && <div className="fieldError">{errors.fechaVenta}</div>}
              </div>

              <div className="field-row">
                <div className="field-label">TIPO DE PAGO</div>
                <div className="field-value p0">
                    <input
                      className={`field-input ${(estaEliminada || !esEditable) ? "is-readonly" : ""}`}
                      type="text"
                      value={tipoPago}
                      onChange={(e) => !estaEliminada && esEditable && setTipoPago(e.target.value)}
                      placeholder="Contado, Transferencia, Cuotas…"
                      disabled={estaEliminada || !esEditable}
                      readOnly={estaEliminada || !esEditable}
                    />
                </div>
              </div>

              <div className="field-row">
                <div className="field-label">PLAZO ESCRITURA</div>
                <div className="field-value p0">
                    <input
                      className={`field-input ${(estaEliminada || !esEditable) ? "is-readonly" : ""}`}
                      type="date"
                      value={plazoEscritura}
                      onChange={(e) => !estaEliminada && esEditable && setPlazoEscritura(e.target.value)}
                      disabled={estaEliminada || !esEditable}
                      readOnly={estaEliminada || !esEditable}
                    />
                </div>
              </div>

              <div className="field-row">
                <div className="field-label">FECHA DE ACTUALIZACIÓN</div>
                <div className="field-value is-readonly">{fechaAct}</div>
              </div>

              <div className="field-row">
                <div className="field-label">FECHA DE CREACIÓN</div>
                <div className="field-value is-readonly">{fechaCre}</div>
              </div>
            </div>
          </div>
        </div>
      </EditarBase>
    </>
  );
}
