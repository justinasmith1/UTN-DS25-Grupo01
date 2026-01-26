// src/components/Reservas/ReservaEditarCard.jsx
import { useEffect, useRef, useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import EditarBase from "../Base/EditarBase.jsx";
import SuccessAnimation from "../Base/SuccessAnimation.jsx";
import NiceSelect from "../../Base/NiceSelect.jsx";
import { updateReserva, getReservaById } from "../../../lib/api/reservas.js";
import { getAllInmobiliarias } from "../../../lib/api/inmobiliarias.js";
import { useAuth } from "../../../app/providers/AuthProvider.jsx";
import { canEditByEstadoOperativo, isEliminado } from "../../../utils/estadoOperativo";
import { reservaCreateSchema } from "../../../lib/validations/reservaCreate.schema.js"; // Reutilizamos el schema o creamos uno partial si hiciera falta. Para update completo sirve.

/** Estados de reserva: value técnico + label Title Case */
const ESTADOS_RESERVA = [
  { value: "ACTIVA", label: "Activa" },
  { value: "CANCELADA", label: "Cancelada" },
  { value: "ACEPTADA", label: "Aceptada" },
  { value: "RECHAZADA", label: "Rechazada" },
  { value: "EXPIRADA", label: "Expirada" },
  { value: "CONTRAOFERTA", label: "Contraoferta" },
];

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
  const date = new Date(`${s}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/* ========================================================================== */

export default function ReservaEditarCard({
  open,
  reserva,
  reservaId,
  reservas,
  onCancel,
  onSaved,
  inmobiliarias: propsInmob = [],
  entityType = "Reserva",
}) {
  const { user } = useAuth();
  const isInmobiliaria = user?.role === 'INMOBILIARIA';
  const [detalle, setDetalle] = useState(reserva || null);
  const [inmobiliarias, setInmobiliarias] = useState(propsInmob || []);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [numeroBackendError, setNumeroBackendError] = useState(null);

  // evita múltiples llamados a inmobiliarias
  const fetchedInmobRef = useRef(false);
  // ancho de label
  const [labelW, setLabelW] = useState(180);
  const containerRef = useRef(null);

  // Hook Form
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(reservaCreateSchema),
    defaultValues: {
      fecha: "",
      plazoReserva: "",
      loteId: undefined,
      clienteId: undefined,
      inmobiliariaId: undefined,
      montoSeña: undefined,
      numero: "",
      estado: "ACTIVA",
      userRole: user?.role,
      // observaciones: "", // Si se agrega al UI
    },
    mode: "onChange",
  });

  /* 2) GET de reserva al abrir y cuando cambia la prop reserva */
  useEffect(() => {
    let abort = false;
    async function run() {
      if (!open) return;

      const idToUse = reserva?.id ?? reservaId;

      if (idToUse != null) {
        try {
          const response = await getReservaById(idToUse);
          const full = response?.data ?? response;
          if (!abort && full) {
            const originalReserva = reserva || (Array.isArray(reservas) ? reservas.find(r => `${r.id}` === `${idToUse}`) : null);
            const preservedMapId = originalReserva?.lote?.mapId ?? originalReserva?.lotMapId ?? full?.lote?.mapId ?? full?.lotMapId ?? null;
            
            const enriched = preservedMapId && full?.lote
              ? { ...full, lotMapId: preservedMapId, lote: { ...full.lote, mapId: preservedMapId } }
              : preservedMapId
              ? { ...full, lotMapId: preservedMapId }
              : full;
            
            setDetalle(enriched);
          }
        } catch (e) {
          console.error("Error obteniendo reserva por id:", e);
          if (reserva && !abort) {
            setDetalle(reserva);
          } else if (reservaId != null && Array.isArray(reservas) && !abort) {
            const found = reservas.find(r => `${r.id}` === `${reservaId}`);
            if (found) setDetalle(found);
          }
        }
      } else if (reserva) {
        if (!abort) setDetalle(reserva);
      }
    }
    run();
    return () => { abort = true; };
  }, [open, reservaId, reservas, reserva, reserva?.id]);


  /* 3) Populate Form (Reset) cuando 'detalle' cambia */
  useEffect(() => {
    if (!open || !detalle) return;

    const fechaReservaISO = detalle.fechaReserva ?? null;
    const plazoReservaISO = detalle.fechaFinReserva ?? null;
    
    // Preparar valores para el formulario
    // Nota: aunque loteId e inmobiliariaId sean read-only en casos, los seteamos para validación
    const initialInmobId = detalle.inmobiliaria?.id ?? detalle.inmobiliariaId ?? undefined;
    const initialClienteId = detalle.cliente?.id ?? detalle.clienteId ?? undefined;
    const initialLoteId = detalle.lote?.id ?? detalle.loteId ?? undefined;

    reset({
      fecha: toDateInputValue(fechaReservaISO),
      plazoReserva: toDateInputValue(plazoReservaISO),
      loteId: initialLoteId ? Number(initialLoteId) : undefined,
      clienteId: initialClienteId ? Number(initialClienteId) : undefined,
      inmobiliariaId: initialInmobId ? Number(initialInmobId) : undefined,
      montoSeña: detalle.seña != null ? Number(detalle.seña) : detalle.sena != null ? Number(detalle.sena) : undefined,
      numero: detalle.numero != null ? String(detalle.numero) : "",
      estado: String(detalle.estado ?? "ACTIVA"),
      userRole: user?.role,
    });
    setNumeroBackendError(null);

  }, [open, detalle, reset, user]);


  /* 4) GET de inmobiliarias UNA sola vez por apertura */
  useEffect(() => {
    let abort = false;
    function normalizeList(raw) {
      let list = [];
      if (raw?.data && Array.isArray(raw.data)) list = raw.data;
      else if (Array.isArray(raw)) list = raw;
      else if (raw?.data?.data?.inmobiliarias) list = raw.data.data.inmobiliarias;
      else if (raw?.data?.inmobiliarias) list = raw.data.inmobiliarias;
      else if (raw?.inmobiliarias) list = raw.inmobiliarias;
      
      return (Array.isArray(list) ? list : [])
        .map(x => ({
          id: x.id ?? x.idInmobiliaria ?? x._id ?? "",
          nombre: x.nombre ?? x.razonSocial ?? "Sin información",
        }))
        .filter(i => i.id);
    }

    async function run() {
      if (!open || fetchedInmobRef.current) return;

      if (propsInmob && propsInmob.length) {
        setInmobiliarias(normalizeList(propsInmob));
        fetchedInmobRef.current = true;
        return;
      }

      if (!isInmobiliaria) {
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
      } else {
        fetchedInmobRef.current = true;
      }
    }
    run();
    return () => { abort = true; };
  }, [open, propsInmob, isInmobiliaria]);

  /* Calcular label width */
  useEffect(() => {
    const labels = [
      "NÚMERO DE RESERVA", "LOTE", "CLIENTE", "INMOBILIARIA", "ESTADO", "SEÑA",
      "FECHA RESERVA", "FECHA DE ACTUALIZACIÓN", "PLAZO DE RESERVA"
    ];
    const longest = Math.max(...labels.map(s => s.length));
    const computed = Math.min(240, Math.max(160, Math.round(longest * 8.6) + 20));
    setLabelW(computed);
  }, [open, detalle?.id]);

  /* 7) LOGICA PATCH */
  function buildPatch(data) {
    const patch = {};

    // Estado logic
    const estadoActual = String(detalle?.estado ?? "").toUpperCase();
    const nuevoEstado = String(data.estado ?? "").toUpperCase(); // data.estado puede venir del form (si agregamos campo estado al form state) -> agregarlo a defaultValues
    // Pero en el form data.userRole puede venir
    
    // Como estado no está en el schema de create (creo?), pero en EditarCard sí hay select de estado.
    // Necesitamos asegurarnos que 'estado' esté en el formValues de useForm. Lo agregué a defaultValues.

    if (nuevoEstado !== estadoActual) {
      if (isInmobiliaria) {
         if (estadoActual === "CANCELADA") throw new Error("No se puede cambiar el estado de una reserva cancelada.");
         if (nuevoEstado !== "CANCELADA") throw new Error("Solo se puede cambiar el estado a 'Cancelada'.");
      }
      patch.estado = data.estado; 
    }

    // Fechas
    const initialFR = toDateInputValue(detalle?.fechaReserva);
    if (data.fecha !== initialFR) {
      patch.fechaReserva = fromDateInputToISO(data.fecha);
    }

    const initialPlazo = toDateInputValue(detalle?.fechaFinReserva);
    if (data.plazoReserva !== initialPlazo) {
      patch.fechaFinReserva = fromDateInputToISO(data.plazoReserva);
    }

    // Seña
    const initialSena = detalle?.seña != null ? Number(detalle.seña) : detalle?.sena != null ? Number(detalle.sena) : undefined;
    const currentSena = data.montoSeña; // el form field se llama montoSeña en schema
    if (currentSena !== initialSena) {
       patch.seña = currentSena ?? null; // Si es undefined/null enviar null
    }

    // Inmobiliaria
    if (!isInmobiliaria) {
      const initialInmob = detalle?.inmobiliaria?.id ?? detalle?.inmobiliariaId;
      if (data.inmobiliariaId !== initialInmob) {
        patch.inmobiliariaId = data.inmobiliariaId || null;
      }
    }

    // Numero (Solo NO inmobiliaria)
    if (!isInmobiliaria) {
       const initialNum = detalle?.numero != null ? String(detalle.numero) : "";
       if (data.numero !== initialNum) {
         patch.numero = data.numero;
       }
    }

    // Cliente
    const initialCli = detalle?.cliente?.id ?? detalle?.clienteId;
    if (data.clienteId !== initialCli) {
      patch.clienteId = Number(data.clienteId);
    }

    return patch;
  }

  const onSubmit = async (data) => {
    // Bloquear guardado si está eliminada
    if (isEliminado(detalle)) {
      setNumeroBackendError("No se puede editar una reserva eliminada. Reactívala para modificarla.");
      return;
    }

    try {
      setSaving(true);
      setNumeroBackendError(null);

      const patch = buildPatch(data);

      if (Object.keys(patch).length === 0) {
        setSaving(false);
        onCancel?.();
        return;
      }

      const response = await updateReserva(detalle.id, patch);
      if (!response || !response.success) {
        throw new Error(response?.message || "No se pudo guardar la reserva.");
      }

      const updated = response?.data ?? response;
       // Merge rapido para actualizar UI sin reload completo
       const mapId = updated?.lote?.mapId ?? detalle?.lote?.mapId ?? updated?.lotMapId ?? detalle?.lotMapId ?? null;
      const enrichedUpdated = {
        ...updated,
        numero: updated?.numero ?? detalle?.numero ?? null,
        lotMapId: mapId ?? updated?.lotMapId ?? null,
        lote: updated?.lote ? { ...updated.lote, mapId: mapId ?? updated.lote.mapId ?? null } : updated?.lote ?? null,
      };

      setDetalle(enrichedUpdated);
      setShowSuccess(true);
      
      setTimeout(() => {
        setShowSuccess(false);
        setSaving(false);
        onSaved?.(enrichedUpdated);
        onCancel?.();
      }, 1500);

    } catch (e) {
      console.error("Error guardando reserva:", e);
      const msg = e?.message || "";
      if (msg.toLowerCase().includes("número de reserva") || (/numero/i.test(msg) && /(unique|único|existe|existente)/i.test(msg))) {
        setNumeroBackendError(msg.includes("unique") ? "Ya existe una reserva con este número" : msg);
      } else {
        alert(msg || "No se pudo guardar la reserva.");
      }
      setSaving(false);
    }
  };

  const handleResetForm = () => {
    // Simplemente forzar reset con detalle actual
    // (el useEffect ya lo hace, pero esto es para el botón reset manual)
    if(detalle) {
        const fechaReservaISO = detalle.fechaReserva ?? null;
        const plazoReservaISO = detalle.fechaFinReserva ?? null;
        const initialInmobId = detalle.inmobiliaria?.id ?? detalle.inmobiliariaId ?? undefined;
        const initialClienteId = detalle.cliente?.id ?? detalle.clienteId ?? undefined;
        const initialLoteId = detalle.lote?.id ?? detalle.loteId ?? undefined;

        reset({
            fecha: toDateInputValue(fechaReservaISO),
            plazoReserva: toDateInputValue(plazoReservaISO),
            loteId: initialLoteId ? Number(initialLoteId) : undefined,
            clienteId: initialClienteId ? Number(initialClienteId) : undefined,
            inmobiliariaId: initialInmobId ? Number(initialInmobId) : undefined,
            montoSeña: detalle.seña != null ? Number(detalle.seña) : detalle.sena != null ? Number(detalle.sena) : undefined,
            numero: detalle.numero != null ? String(detalle.numero) : "",
            estado: String(detalle.estado ?? "ACTIVA"),
            userRole: user?.role,
        });
        setNumeroBackendError(null);
    }
  };

  // Render Helpers
  const NA = "Sin información";
  const clienteNombre = (() => {
    const n = detalle?.cliente?.nombre || detalle?.clienteNombre;
    const a = detalle?.cliente?.apellido || detalle?.clienteApellido;
    const j = [n, a].filter(Boolean).join(" ");
    return j || NA;
  })();
  const loteInfo = (() => {
    const mapId = detalle?.lote?.mapId ?? detalle?.lotMapId ?? null;
    if (mapId) {
      if (String(mapId).toLowerCase().startsWith('lote')) return mapId;
      return `Lote N° ${mapId}`;
    }
    if (detalle?.lote?.id) {
       return `Lote N° ${detalle?.lote?.numero || detalle?.lote?.id}`;
    }
    return detalle?.loteId ? `Lote N° ${detalle.loteId}` : NA;
  })();

  const fechaAct = detalle?.updatedAt ? new Date(detalle.updatedAt).toLocaleDateString("es-AR") : NA;
  const fechaCre = detalle?.createdAt ? new Date(detalle.createdAt).toLocaleDateString("es-AR") : NA;
  
  // Disponibilidad de estados
  const estadosDisponibles = useMemo(() => {
    if (!isInmobiliaria) return ESTADOS_RESERVA;
    const estadoActual = String(detalle?.estado ?? "").toUpperCase();
    if (estadoActual === "CANCELADA") return ESTADOS_RESERVA.filter(e => e.value === "CANCELADA");
    return ESTADOS_RESERVA.filter(e => e.value === estadoActual || e.value === "CANCELADA");
  }, [isInmobiliaria, detalle?.estado]);

  if (!open || !detalle) return null;

  const estaEliminada = isEliminado(detalle);
  const puedeEditar = canEditByEstadoOperativo(detalle);

  return (
    <>
      <SuccessAnimation show={showSuccess} message={`¡${entityType} guardada exitosamente!`} />

      <EditarBase
        open={open}
        title={`Reserva N° ${detalle?.numero ?? detalle?.id ?? "—"}`}
        onCancel={() => {
          setSaving(false);
          setShowSuccess(false);
          onCancel?.();
        }}
        onSave={handleSubmit(onSubmit)}
        onReset={handleResetForm}
        saving={saving}
        saveButtonText={puedeEditar ? "Guardar cambios" : null}
      >
        <div style={{ "--sale-label-w": `${labelW}px` }}>
          {estaEliminada && (
            <div className="alert alert-warning" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', backgroundColor: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '0.375rem', color: '#92400e' }}>
              <strong>Reserva eliminada:</strong> No se puede editar una reserva eliminada. Reactívala para modificarla.
            </div>
          )}
          
          <h3 className="venta-section-title">Información de la reserva</h3>

          <div className="venta-grid" ref={containerRef}>
            {/* Columna izquierda */}
            <div className="venta-col">
              <div className="field-row">
                <div className="field-label">LOTE</div>
                <div className="field-value is-readonly">{loteInfo}</div>
              </div>

              <div className={`fieldRow ${errors.fecha ? "hasError" : ""}`}>
                  <div className="field-row">
                    <div className="field-label">FECHA</div>
                    <div className="field-value p0">
                      <input
                        className={`field-input ${estaEliminada ? "is-readonly" : ""} ${errors.fecha ? "is-invalid" : ""}`}
                        type="date"
                        {...register("fecha")}
                        disabled={estaEliminada || (isInmobiliaria && String(detalle?.estado ?? "").toUpperCase() === "CANCELADA")}
                        readOnly={estaEliminada}
                      />
                    </div>
                  </div>
                  {errors.fecha && <div className="fieldError">{errors.fecha.message}</div>}
              </div>

              <div className="field-row">
                <div className="field-label">CLIENTE</div>
                <div className="field-value is-readonly">{clienteNombre}</div>
                {/* Nota: Cliente era editable en el original, pero el UI mostraba read-only nombre. 
                    En el código original: 
                    <div className="field-value is-readonly">{clienteNombre}</div>
                    No había input para cambiar cliente en Editar?
                    Revisando el código original... 
                    Linea 599: <div className="field-value is-readonly">{clienteNombre}</div>
                    PERO el patch logic tenia: `if (data.clienteId !== initialCli)`.
                    Parece que NO habia selector de cliente habilitado en el render del original. 
                    Solo estaba preparado el logic. 
                    Voy a mantenerlo read-only como estaba visually en el original.
                */}
              </div>

              <div className={`fieldRow ${errors.inmobiliariaId ? "hasError" : ""}`}>
                  <div className="field-row">
                    <div className="field-label">INMOBILIARIA</div>
                    {isInmobiliaria ? (
                      <div className="field-value is-readonly">
                        {detalle?.inmobiliaria?.nombre ?? "La Federala"}
                      </div>
                    ) : (
                      <div className="field-value p0">
                         <Controller
                            name="inmobiliariaId"
                            control={control}
                            render={({ field: { onChange, value } }) => (
                                <NiceSelect
                                    value={value != null ? String(value) : ""}
                                    options={inmobiliarias.map(i => ({ value: i.id, label: i.nombre }))}
                                    placeholder="La Federala"
                                    showPlaceholderOption={false}
                                    onChange={(val) => !estaEliminada && onChange(val ? Number(val) : undefined)}
                                    disabled={estaEliminada}
                                />
                            )}
                         />
                      </div>
                    )}
                  </div>
                  {errors.inmobiliariaId && <div className="fieldError">{errors.inmobiliariaId.message}</div>}
              </div>

              <div className="field-row">
                <div className="field-label">ESTADO</div>
                <div className="field-value p0">
                   <Controller
                      name="estado"
                      control={control}
                      render={({ field: { onChange, value } }) => (
                          <NiceSelect
                            value={value}
                            options={estadosDisponibles}
                            placeholder=""
                            showPlaceholderOption={false}
                            onChange={(val) => !estaEliminada && onChange(val)}
                            disabled={estaEliminada || (isInmobiliaria && String(detalle?.estado ?? "").toUpperCase() === "CANCELADA")}
                          />
                      )}
                   />
                </div>
              </div>
            </div>

            {/* Columna derecha */}
            <div className="venta-col">
              <div className={`fieldRow ${errors.numero || numeroBackendError ? "hasError" : ""}`}>
                <div className="field-row">
                  <div className="field-label">NÚMERO DE RESERVA</div>
                  {isInmobiliaria ? (
                    <div className="field-value is-readonly">{detalle?.numero ?? "—"}</div>
                  ) : (
                    <div className="field-value p0">
                      <input
                        className={`field-input ${estaEliminada ? "is-readonly" : ""} ${errors.numero || numeroBackendError ? "is-invalid" : ""}`}
                        type="text"
                        placeholder="Ej: RES-2025-01"
                        {...register("numero")}
                        disabled={estaEliminada}
                        readOnly={estaEliminada}
                      />
                    </div>
                  )}
                </div>
                {(errors.numero || numeroBackendError) && (
                    <div className="fieldError">{numeroBackendError || errors.numero?.message}</div>
                )}
              </div>

              <div className={`fieldRow ${errors.plazoReserva ? "hasError" : ""}`}>
                  <div className="field-row">
                    <div className="field-label">PLAZO DE RESERVA</div>
                    <div className="field-value p0">
                      <input
                        className={`field-input ${estaEliminada ? "is-readonly" : ""} ${errors.plazoReserva ? "is-invalid" : ""}`}
                        type="date"
                        {...register("plazoReserva")}
                        disabled={estaEliminada || (isInmobiliaria && String(detalle?.estado ?? "").toUpperCase() === "CANCELADA")}
                        readOnly={estaEliminada}
                      />
                    </div>
                  </div>
                  {errors.plazoReserva && <div className="fieldError">{errors.plazoReserva.message}</div>}
              </div>

              <div className={`fieldRow ${errors.montoSeña ? "hasError" : ""}`}>
                <div className="field-row">
                    <div className="field-label">SEÑA</div>
                    <div className={`field-value p0 ${estaEliminada || isInmobiliaria ? "is-readonly" : ""}`} style={{ position: "relative" }}>
                      <input
                        className={`field-input ${estaEliminada || isInmobiliaria ? "is-readonly" : ""} ${errors.montoSeña ? "is-invalid" : ""}`}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="100"
                        {...register("montoSeña", { valueAsNumber: true })}
                        style={{ paddingRight: "50px" }}
                        disabled={estaEliminada || isInmobiliaria}
                        readOnly={estaEliminada || isInmobiliaria}
                      />
                      <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#6B7280", fontSize: "13px", pointerEvents: "none", fontWeight: 500 }}>
                         USD
                      </span>
                    </div>
                </div>
                {errors.montoSeña && <div className="fieldError">{errors.montoSeña.message}</div>}
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

