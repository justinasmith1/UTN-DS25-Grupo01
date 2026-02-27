// src/components/Ventas/VentaEditarCard.jsx
import { useEffect, useRef, useState, useMemo } from "react";
import EditarBase from "../Base/EditarBase.jsx";
import SuccessAnimation from "../Base/SuccessAnimation.jsx";
import NiceSelect from "../../Base/NiceSelect.jsx";
import { Info } from "lucide-react";
import { updateVenta, getVentaById } from "../../../lib/api/ventas.js";
import { getAllInmobiliarias } from "../../../lib/api/inmobiliarias.js";
import { getAllPersonas } from "../../../lib/api/personas.js";
import CompradoresMultiSelect from "./CompradoresMultiSelect.jsx";
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
import { toDateInputValue, fromDateInputToISO } from "../../../utils/ventaDateUtils";
import { mapVentaBackendError } from "../../../utils/ventaErrorMapper";

/* -------------------------- Constantes -------------------------- */

// Objeto de errores inicial (reutilizable)
const INITIAL_ERRORS = {
  numero: null,
  estado: null,
  fechaVenta: null,
  fechaEscrituraReal: null,
  fechaCancelacion: null,
  motivoCancelacion: null,
  compradores: null,
  general: null,
};

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

  // garantiza que compradoresEdit se inicialice exactamente UNA vez por detalle.id
  const compradoresInitializedForId = useRef(null);

  // ancho de label como en VerCard
  const [labelW, setLabelW] = useState(180);

  /* 2) GET de venta al abrir — siempre busca datos frescos para garantizar compradores[] completos.
   * El endpoint de listado NO incluye la relación compradores[], así que si usamos el prop del
   * padre directamente, compradoresEdit se inicializa vacío y el PATCH sobreescribe el array
   * existente en la BD con sólo los nuevos compradores.
   * Patrón: render optimista inmediato con prop → fetch fresco en paralelo → reemplazar detalle. */
  useEffect(() => {
    let abort = false;
    async function run() {
      if (!open) return;

      const id = venta?.id ?? ventaId;
      if (!id) return;

      // Render optimista inmediato: usar prop o caché local mientras llega el fetch
      const inmediato =
        venta ??
        (Array.isArray(ventas) ? ventas.find(v => `${v.id}` === `${id}`) : null);
      if (inmediato) setDetalle(inmediato);

      // Fetch fresco (siempre): garantiza relaciones completas (compradores, lote, etc.)
      try {
        const response = await getVentaById(id);
        const full = response?.data ?? response;
        if (!abort && full) {
          setDetalle(full);
          // Actualizamos compradoresEdit directamente desde los datos frescos.
          // No podemos depender del re-sync useEffect porque detalle?.id no cambia
          // (misma venta) y React no re-dispara el effect.
          const frescos = full.compradores?.length
            ? full.compradores
            : (full.comprador ? [full.comprador] : []);
          setCompradoresEdit(frescos);
          compradoresInitializedForId.current = full.id ?? null;
        }
      } catch (e) {
        console.error("Error obteniendo venta por id:", e);
        if (!abort && venta && !inmediato) setDetalle(venta);
      }
    }
    run();
    return () => { abort = true; };
    // ventas/venta?.monto fuera del dep-array de forma intencional:
    // ventas sólo se usa para un render optimista instantáneo (stale OK, el fetch fresco lo corrige).
    // venta?.monto causaba re-inicializaciones no deseadas al cambiar otros campos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, venta?.id, ventaId]);

  /* 3) Resetear estados cuando el modal se cierra o se abre con otra venta */
  useEffect(() => {
    if (!open) {
      fetchedInmobRef.current = false;
      compradoresInitializedForId.current = null;
      setSaving(false);
      setShowSuccess(false);
    } else {
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

  // Etapa 4: compradores múltiples
  const [personas, setPersonas] = useState([]);
  const [compradoresEdit, setCompradoresEdit] = useState([]);

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

    // Etapa 4: inicializar compradores UNA sola vez por (open, detalle.id).
    // El ref-guard evita que cambios en otros campos (monto, estado, etc.)
    // que disparen re-renders reseteen la lista que el usuario ya editó.
    if (compradoresInitializedForId.current !== detalle?.id) {
      const compradoresIniciales = detalle?.compradores?.length
        ? detalle.compradores
        : (detalle?.comprador ? [detalle.comprador] : []);
      setCompradoresEdit(compradoresIniciales);
      compradoresInitializedForId.current = detalle?.id ?? null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, detalle?.id]);

  // Etapa 4: cargar personas al abrir (solo si el estado permite editar compradores)
  useEffect(() => {
    if (!open) return;
    const estadoActual = detalle?.estado ?? 'INICIADA';
    const esEditable = estadoActual === 'INICIADA' || estadoActual === 'CON_BOLETO';
    if (!esEditable) return;
    getAllPersonas({}).then(res => {
      const arr = res?.personas ?? res?.data ?? (Array.isArray(res) ? res : []);
      setPersonas(Array.isArray(arr) ? arr : []);
    }).catch(e => console.error("Error cargando personas:", e));
  }, [open, detalle?.id]);

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

    // Etapa 4: compradores múltiples (solo si el estado permite editar)
    const estadoActual = detalle?.estado ?? 'INICIADA';
    const puedeEditarCompradores = (estadoActual === 'INICIADA' || estadoActual === 'CON_BOLETO') && !isEliminado(detalle);
    if (puedeEditarCompradores) {
      const prevCompradorIds = ((detalle?.compradores?.length
        ? detalle.compradores
        : (detalle?.comprador ? [detalle.comprador] : []))
      ).map(c => String(c.id)).sort().join(',');
      const currentCompradorIds = compradoresEdit.map(c => String(c.id)).sort().join(',');
      if (prevCompradorIds !== currentCompradorIds) {
        // Validación: no permitir 0 compradores (se maneja vía errors.compradores, no throw)
        patch.compradores = compradoresEdit.map(c => ({ personaId: c.id }));
      }
    }

    return patch;
  }

  // Helper para limpiar todos los errores
  function clearAllErrors() {
    setErrors({ ...INITIAL_ERRORS });
  }

  // Helper para mapear errores del backend a campos
  function handleBackendError(error) {
    const { fieldErrors, generalMessage } = mapVentaBackendError(error, {
      defaultMessage: "Error al guardar la venta",
    });

    setErrors(prev => ({
      ...prev,
      ...fieldErrors,
      general: generalMessage ?? prev.general,
    }));
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

      // Validación de compradores (Etapa 4): no permitir 0 compradores cuando es editable
      const estadoActualValidacion = detalle?.estado ?? 'INICIADA';
      const puedeEditarCompradoresValidacion = (estadoActualValidacion === 'INICIADA' || estadoActualValidacion === 'CON_BOLETO') && !isEliminado(detalle);
      if (puedeEditarCompradoresValidacion && compradoresEdit.length === 0) {
        newErrors.compradores = "Debe seleccionar al menos un comprador.";
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

      // Sincronizar detalle con la respuesta del backend
      setDetalle(updated);
      // Sincronizar compradores desde la respuesta (detalle?.id no cambia → re-sync effect no dispara)
      const savedCompradores = updated?.compradores?.length
        ? updated.compradores
        : (updated?.comprador ? [updated.comprador] : compradoresEdit);
      setCompradoresEdit(savedCompradores);
      compradoresInitializedForId.current = updated?.id ?? null;

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
    // Etapa 4: restaurar compradores al estado del servidor
    const compradoresIniciales = detalle?.compradores?.length
      ? detalle.compradores
      : (detalle?.comprador ? [detalle.comprador] : []);
    setCompradoresEdit(compradoresIniciales);
    // Resetear el guard para que una futura reapertura reinicialice correctamente
    compradoresInitializedForId.current = detalle?.id ?? null;
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
            <div className="venta-alert venta-alert--warning">
              <strong>Venta eliminada:</strong> No se puede editar una venta eliminada. Reactívala para modificarla.
            </div>
          )}

          {!estaEliminada && !esEditable && estado === 'CANCELADA' && (
            <div className="venta-alert venta-alert--info">
              <strong>Venta cancelada:</strong> Esta venta está en estado cancelado y solo permite lectura.
            </div>
          )}
          
          <h3 className="venta-section-title">Información de la venta</h3>

          <div className="venta-grid">
            {/* Columna izquierda */}
            <div className="venta-col">
              <div className="field-row">
                <div className="field-label">LOTE N°</div>
                <div className="field-value is-readonly">{detalle?.lote?.mapId ?? detalle?.lotMapId ?? detalle?.loteId ?? NA}</div>
              </div>

              <div className="field-row">
                <div className="field-label">MONTO</div>
                <div className="field-value p0 venta-monto-wrapper">
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
                  <span className="venta-monto-currency">
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
                  <div className="ventaFinalizada">✓ FINALIZADA (Escriturado + Pago Completo)</div>
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
                    <div className="ventaEstadoCobroNote">
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
                <div className="lote-error-global">{errors.general}</div>
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

          {/* Compradores — bloque full-width fuera de la grilla */}
          {(() => {
            const estadoActual = detalle?.estado ?? 'INICIADA';
            const eliminado = isEliminado(detalle);
            const puedeEditarCompradores = (estadoActual === 'INICIADA' || estadoActual === 'CON_BOLETO') && !eliminado;

            const tooltipReadOnly = !puedeEditarCompradores
              ? eliminado
                ? 'La venta está eliminada. Reactívala para modificar los compradores.'
                : estadoActual === 'ESCRITURADO'
                  ? 'No se pueden modificar los compradores de una venta escriturada.'
                  : estadoActual === 'CANCELADA'
                    ? 'No se pueden modificar los compradores de una venta cancelada.'
                    : 'Los compradores no son editables en el estado actual de la venta.'
              : null;

            // Fuente única de verdad: siempre compradoresEdit.
            // El fallback anterior (detalle.compradores cuando edit==[]) era la causa raíz
            // del bug de reemplazo visual: al agregar el primer comprador, la fuente
            // cambiaba y perdía los originales que estaban en detalle pero no en el estado.
            return (
              <CompradoresMultiSelect
                value={compradoresEdit}
                onAdd={(p) => {
                  setCompradoresEdit(prev => [...prev, p]);
                  if (errors.compradores) setErrors(prev => ({ ...prev, compradores: null }));
                }}
                onRemove={(id) => {
                  setCompradoresEdit(prev => prev.filter(c => String(c.id) !== String(id)));
                  if (errors.compradores) setErrors(prev => ({ ...prev, compradores: null }));
                }}
                disabled={!puedeEditarCompradores}
                error={errors.compradores}
                personas={personas}
                tooltipReadOnly={tooltipReadOnly}
              />
            );
          })()}
        </div>
      </EditarBase>
    </>
  );
}
