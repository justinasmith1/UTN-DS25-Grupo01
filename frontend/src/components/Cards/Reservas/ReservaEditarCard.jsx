// src/components/Reservas/ReservaEditarCard.jsx
import { useEffect, useRef, useState, useMemo } from "react";
import EditarBase from "../Base/EditarBase.jsx";
import SuccessAnimation from "../Base/SuccessAnimation.jsx";
import NiceSelect from "../../Base/NiceSelect.jsx";
import { updateReserva, getReservaById } from "../../../lib/api/reservas.js";
import { getAllInmobiliarias } from "../../../lib/api/inmobiliarias.js";
import { getAllPersonas } from "../../../lib/api/personas.js";
import { useAuth } from "../../../app/providers/AuthProvider.jsx";
import PersonaCrearCard from "../Personas/PersonaCrearCard.jsx";
import { set } from "zod";
import { canEditByEstadoOperativo, isEliminado } from "../../../utils/estadoOperativo";

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
  // El backend espera un string ISO válido
  // Formato de entrada: YYYY-MM-DD (del input type="date")
  const date = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/* ========================================================================== */

export default function ReservaEditarCard({
  open,
  reserva,                   // opcional: si viene completa, se usa
  reservaId,                  // opcional: si viene id, se hace GET
  reservas,                   // opcional: lista cache para buscar por id
  onCancel,
  onSaved,
  inmobiliarias: propsInmob = [], // opcional
  entityType = "Reserva",     // tipo de entidad para el mensaje de éxito
}) {
  /* 1) HOOKS SIEMPRE ARRIBA (sin returns condicionales) */
  const { user } = useAuth();
  const isInmobiliaria = user?.role === 'INMOBILIARIA';
  const [detalle, setDetalle] = useState(reserva || null);
  const [inmobiliarias, setInmobiliarias] = useState(propsInmob || []);
  const [personas, setPersonas] = useState([]);
  const [saving, setSaving] = useState(false);
  const [openCrearPersona, setOpenCrearPersona] = useState(false);

  // evita múltiples llamados a inmobiliarias
  const fetchedInmobRef = useRef(false);

  // ancho de label como en VerCard
  const [labelW, setLabelW] = useState(180);
  const containerRef = useRef(null);

  /* 2) GET de reserva al abrir y cuando cambia la prop reserva */
  useEffect(() => {
    let abort = false;
    async function run() {
      if (!open) return;

      // Determinar el ID a usar
      const idToUse = reserva?.id ?? reservaId;

      // Siempre llamar a getReservaById para obtener datos completos con relaciones
      // Incluso si viene reserva por props, puede no tener todas las relaciones
      if (idToUse != null) {
        try {
          const response = await getReservaById(idToUse);
          const full = response?.data ?? response;
          if (!abort && full) {
            // Preservar mapId del lote si está disponible en la reserva original o en la lista
            const originalReserva = reserva || (Array.isArray(reservas) ? reservas.find(r => `${r.id}` === `${idToUse}`) : null);
            const preservedMapId = originalReserva?.lote?.mapId ?? originalReserva?.lotMapId ?? full?.lote?.mapId ?? full?.lotMapId ?? null;
            
            // Enriquecer el detalle con mapId si está disponible
            const enriched = preservedMapId && full?.lote
              ? {
                  ...full,
                  lotMapId: preservedMapId,
                  lote: {
                    ...full.lote,
                    mapId: preservedMapId,
                  },
                }
              : preservedMapId
              ? {
                  ...full,
                  lotMapId: preservedMapId,
                }
              : full;
            
            setDetalle(enriched);
          }
        } catch (e) {
          console.error("Error obteniendo reserva por id:", e);
          // Si falla el GET pero tenemos reserva por props, usarla como fallback
          if (reserva && !abort) {
            setDetalle(reserva);
          } else if (reservaId != null && Array.isArray(reservas) && !abort) {
            const found = reservas.find(r => `${r.id}` === `${reservaId}`);
            if (found) {
              setDetalle(found);
            }
          }
        }
      } else if (reserva) {
        // Si no hay ID pero viene reserva por props, usarla
        if (!abort) setDetalle(reserva);
      }
    }
    run();
    return () => { abort = true; };
  }, [open, reservaId, reservas, reserva?.id]);

  /* 3) Resetear estados cuando el modal se cierra o se abre con otra reserva */
  useEffect(() => {
    if (!open) {
      fetchedInmobRef.current = false;
      setSaving(false);
      setShowSuccess(false);
    } else {
      // Resetear estados al abrir con una nueva reserva
      setSaving(false);
      setShowSuccess(false);
    }
  }, [open, detalle?.id]);

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

      // Solo cargar inmobiliarias si NO es INMOBILIARIA (no las necesita)
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

  /* 4.1) GET de personas para selector de cliente (solo si es INMOBILIARIA o si se necesita editar cliente) */
  const fetchedPersonasRef = useRef(false);
  useEffect(() => {
    let abort = false;

    async function run() {
      if (!open || fetchedPersonasRef.current) return;

      try {
        const response = await getAllPersonas({});
        const personasData = response?.personas || response?.data || [];
        
        // Si hay un detalle con cliente, asegurarse de que esté en la lista
        let personasList = Array.isArray(personasData) ? personasData : [];
        if (detalle?.cliente && !abort) {
          const clienteIdStr = String(detalle.cliente.id ?? detalle.clienteId ?? "");
          const clienteYaExiste = personasList.some(p => String(p.id ?? p.idPersona ?? "") === clienteIdStr);
          
          if (!clienteYaExiste && clienteIdStr) {
            const clienteNombre = `${detalle.cliente.nombre || ""} ${detalle.cliente.apellido || ""}`.trim() || "Sin nombre";
            personasList = [
              { id: detalle.cliente.id, nombre: detalle.cliente.nombre, apellido: detalle.cliente.apellido, nombreCompleto: clienteNombre },
              ...personasList
            ];
          }
        }
        
        if (!abort) {
          setPersonas(personasList);
          fetchedPersonasRef.current = true;
        }
      } catch (e) {
        console.error("Error obteniendo personas:", e);
        if (!abort) {
          setPersonas([]);
          fetchedPersonasRef.current = true;
        }
      }
    }
    run();
    return () => { abort = true; };
  }, [open, detalle?.cliente?.id, detalle?.clienteId]);

  // Opciones de personas para el selector (igual que en ReservaCrearCard)
  const personaOpts = useMemo(
    () => personas.map((p) => ({
      value: String(p.id ?? p.idPersona ?? ""),
      label: `${p.nombreCompleto || `${p.nombre || ""} ${p.apellido || ""}`.trim() || `ID: ${p.id}`}`,
      persona: p
    })),
    [personas]
  );

  // Handler para cuando se crea una nueva persona
  const handlePersonaCreated = (nuevaPersona) => {
    // Agregar la nueva persona a la lista (como objeto, igual que en ReservaCrearCard)
    setPersonas(prev => [nuevaPersona, ...prev]);
    // Seleccionar automáticamente la nueva persona
    setClienteId(String(nuevaPersona.id));
    setOpenCrearPersona(false);
  };

  /* 5) STATES EDITABLES derivados de 'detalle' */
  const fechaReservaISO = detalle?.fechaReserva ?? null;
  const plazoReservaISO = detalle?.fechaFinReserva ?? null;
  const fechaActISO = detalle?.updatedAt ?? detalle?.updateAt ?? detalle?.fechaActualizacion ?? null;
  const fechaCreISO = detalle?.createdAt ?? detalle?.fechaCreacion ?? null;

  const initialInmobId = detalle?.inmobiliaria?.id ?? detalle?.inmobiliariaId ?? "";
  const initialClienteId = detalle?.cliente?.id ?? detalle?.clienteId ?? "";

  const initialNumero = detalle?.numero != null ? String(detalle.numero) : "";
  const base = {
    estado: String(detalle?.estado ?? "ACTIVA"),
    fechaReserva: toDateInputValue(fechaReservaISO),
    sena: detalle?.seña != null ? String(detalle.seña) : detalle?.sena != null ? String(detalle.sena) : "",
    inmobiliariaId: initialInmobId,
    clienteId: initialClienteId,
    numero: initialNumero,
    fechaFinReserva: toDateInputValue(plazoReservaISO),
  };

  const [estado, setEstado] = useState(base.estado);
  const [fechaReserva, setFechaReserva] = useState(base.fechaReserva);
  const [sena, setSena] = useState(base.sena);
  const [inmobiliariaId, setInmobiliariaId] = useState(base.inmobiliariaId);
  const [clienteId, setClienteId] = useState(base.clienteId);
  const [numero, setNumero] = useState(base.numero);
  const [fechaFinReserva, setFechaFinReserva] = useState(base.fechaFinReserva);
  const [numeroError, setNumeroError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // re-sync cuando cambia 'detalle' o se reabre
  useEffect(() => {
    if (!open || !detalle) return;
    setEstado(base.estado);
    setFechaReserva(base.fechaReserva);
    setSena(base.sena);
    setInmobiliariaId(base.inmobiliariaId);
    setClienteId(base.clienteId);
    setNumero(base.numero);
    setFechaFinReserva(base.fechaFinReserva);
    setNumeroError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, detalle?.id]);

  /* 6) ancho de label como en VerCard */
  useEffect(() => {
    const labels = [
      "NÚMERO DE RESERVA", "LOTE", "CLIENTE", "INMOBILIARIA", "ESTADO", "SEÑA",
      "FECHA RESERVA", "FECHA DE ACTUALIZACIÓN", "PLAZO DE RESERVA"
    ];
    const longest = Math.max(...labels.map(s => s.length));
    const computed = Math.min(240, Math.max(160, Math.round(longest * 8.6) + 20));
    setLabelW(computed);
  }, [open, detalle?.id]);

  /* 7) Guardado (PATCH minimal y validado) */
  function buildPatch() {
    const patch = {};

    // Para INMOBILIARIA: solo permitir cambiar estado a CANCELADA (y no desde CANCELADA)
    if (estado !== (detalle?.estado ?? "")) {
      if (isInmobiliaria) {
        const estadoActual = String(detalle?.estado ?? "").toUpperCase();
        const nuevoEstado = String(estado).toUpperCase();
        
        // Si ya está cancelada, no permitir cambiar
        if (estadoActual === "CANCELADA") {
          throw new Error("No se puede cambiar el estado de una reserva cancelada.");
        }
        
        // Solo permitir cambiar a CANCELADA
        if (nuevoEstado !== "CANCELADA") {
          throw new Error("Solo se puede cambiar el estado a 'Cancelada'.");
        }
      }
      patch.estado = estado;
    }

    const prevFR = toDateInputValue(fechaReservaISO);
    if (prevFR !== fechaReserva) {
      patch.fechaReserva = fechaReserva ? fromDateInputToISO(fechaReserva) : null;
    }

    const prevPlazo = toDateInputValue(plazoReservaISO);
    if (prevPlazo !== fechaFinReserva) {
      if (!fechaFinReserva) {
        throw new Error("El plazo de reserva no puede quedar vacío.");
      }
      // Convertimos el string del input (YYYY-MM-DD) a ISO para el backend
      patch.fechaFinReserva = fromDateInputToISO(fechaFinReserva);
    }

    const prevSena = detalle?.seña != null ? String(detalle.seña) : detalle?.sena != null ? String(detalle.sena) : "";
    if (prevSena !== sena) {
      if (sena === "" || sena.trim() === "") {
        patch.sena = null;
      } else {
        const n = Number(sena);
        if (!Number.isFinite(n) || n < 0) {
          throw new Error("La seña debe ser un número ≥ 0.");
        }
        patch.sena = n;
      }
    }

    // Para INMOBILIARIA: no permitir cambiar inmobiliariaId
    if (!isInmobiliaria) {
      const prevInmob = detalle?.inmobiliaria?.id ?? detalle?.inmobiliariaId ?? "";
      if (prevInmob !== (inmobiliariaId ?? "")) {
        patch.inmobiliariaId = inmobiliariaId || null;
      }
    }

    // Para INMOBILIARIA: no permitir cambiar número
    if (!isInmobiliaria) {
      const prevNumero = detalle?.numero != null ? String(detalle.numero) : "";
      if (numero !== prevNumero) {
        const trimmed = (numero || "").trim();
        if (!trimmed || trimmed.length < 3 || trimmed.length > 30) {
          throw new Error("Número de reserva inválido (3 a 30 caracteres).");
        }
        patch.numero = trimmed;
      }
    }

    // Cliente: permitir cambiar para todos (incluyendo INMOBILIARIA)
    const prevCliente = detalle?.cliente?.id ?? detalle?.clienteId ?? "";
    if (prevCliente !== (clienteId ?? "")) {
      if (!clienteId || !clienteId.trim()) {
        throw new Error("El cliente es obligatorio.");
      }
      patch.clienteId = Number(clienteId);
    }

    return patch;
  }

  async function handleSave() {
    // Bloquear guardado si está eliminada
    if (isEliminado(detalle)) {
      setNumeroError("No se puede editar una reserva eliminada. Reactívala para modificarla.");
      return;
    }
    
    try {
      setSaving(true);
      setNumeroError(null);
      const patch = buildPatch();
      
      if (Object.keys(patch).length === 0) { 
        setSaving(false);
        onCancel?.(); 
        return; 
      }
      
      const response = await updateReserva(detalle.id, patch);
      
      // updateReserva devuelve { success: true, data: {...}, message: '...' }
      const updated = response?.data ?? response;
      
      if (!response || !response.success) {
        throw new Error(response?.message || "No se pudo guardar la reserva.");
      }
      
      const mapId = updated?.lote?.mapId ?? detalle?.lote?.mapId ?? updated?.lotMapId ?? detalle?.lotMapId ?? null;
      const enrichedUpdated = {
        ...updated,
        numero: updated?.numero ?? detalle?.numero ?? null,
        lotMapId: mapId ?? updated?.lotMapId ?? null,
        lote: updated?.lote
          ? {
              ...updated.lote,
              mapId: mapId ?? updated.lote.mapId ?? null,
            }
          : updated?.lote ?? null,
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
      if (msg.toLowerCase().includes("número de reserva")) {
        setNumeroError(msg);
      } else if (/numero/i.test(msg) && /(unique|único|existe|existente)/i.test(msg)) {
        setNumeroError("Ya existe una reserva con este número");
      }
      setSaving(false);
      if (!msg.toLowerCase().includes("número de reserva")) {
        alert(msg || "No se pudo guardar la reserva.");
      }
    }
  }

  function handleReset() {
    setEstado(base.estado);
    setFechaReserva(base.fechaReserva);
    setSena(base.sena);
    setInmobiliariaId(base.inmobiliariaId);
    setClienteId(base.clienteId);
    setNumero(base.numero);
    setFechaFinReserva(base.fechaFinReserva);
    setNumeroError(null);
  }

  // Para INMOBILIARIA: opciones de estado limitadas (solo CANCELADA si no está cancelada)
  const estadosDisponibles = useMemo(() => {
    if (!isInmobiliaria) {
      return ESTADOS_RESERVA; // ADMIN y GESTOR ven todos los estados
    }
    
    const estadoActual = String(detalle?.estado ?? "").toUpperCase();
    if (estadoActual === "CANCELADA") {
      // Si ya está cancelada, solo mostrar CANCELADA (read-only)
      return ESTADOS_RESERVA.filter(e => e.value === "CANCELADA");
    }
    
    // Si no está cancelada, permitir cambiar solo a CANCELADA
    return ESTADOS_RESERVA.filter(e => 
      e.value === estadoActual || e.value === "CANCELADA"
    );
  }, [isInmobiliaria, detalle?.estado]);

  /* 8) Render */
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
      // Si el mapId ya contiene "Lote", mostrarlo directamente sin duplicar
      if (String(mapId).toLowerCase().startsWith('lote')) {
        return mapId;
      }
      return `Lote N° ${mapId}`;
    }
    if (detalle?.lote?.id) {
      const num = detalle?.lote?.numero || detalle?.lote?.id;
      return `Lote N° ${num}`;
    }
    return detalle?.loteId ? `Lote N° ${detalle.loteId}` : NA;
  })();

  const fechaAct = fechaActISO
    ? new Date(fechaActISO).toLocaleDateString("es-AR")
    : NA;
  const fechaCre = fechaCreISO
    ? new Date(fechaCreISO).toLocaleDateString("es-AR")
    : NA;

  if (!open || !detalle) return null;

  const estaEliminada = isEliminado(detalle);
  const puedeEditar = canEditByEstadoOperativo(detalle);

  return (
    <>
      {/* Animación de éxito */}
      <SuccessAnimation show={showSuccess} message={`¡${entityType} guardada exitosamente!`} />

      <EditarBase
        open={open}
        title={`Reserva N° ${detalle?.numero ?? detalle?.id ?? "—"}`}
        onCancel={() => {
          // Siempre resetear estados antes de cerrar
          setSaving(false);
          setShowSuccess(false);
          onCancel?.();
        }}
        onSave={handleSave}
        onReset={handleReset}
        saving={saving}
        saveButtonText={puedeEditar ? "Guardar cambios" : null}
      >
        <div style={{ "--sale-label-w": `${labelW}px` }}>
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

              <div className="field-row">
                <div className="field-label">FECHA</div>
                <div className="field-value p0">
                  <input
                    className={`field-input ${estaEliminada ? "is-readonly" : ""}`}
                    type="date"
                    value={fechaReserva}
                    onChange={(e) => !estaEliminada && setFechaReserva(e.target.value)}
                    disabled={estaEliminada}
                    readOnly={estaEliminada}
                    disabled={isInmobiliaria && String(detalle?.estado ?? "").toUpperCase() === "CANCELADA"}
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field-label">CLIENTE</div>
                <div className="field-value p0" style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  {isInmobiliaria ? (
                    <>
                      <div style={{ flex: 1 }}>
                        <NiceSelect
                          value={String(clienteId || "")}
                          options={personaOpts}
                          placeholder="Seleccionar cliente"
                          showPlaceholderOption={false}
                          onChange={(val) => !estaEliminada && setClienteId(val || "")}
                          disabled={estaEliminada || String(detalle?.estado ?? "").toUpperCase() === "CANCELADA"}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenCrearPersona(true);
                        }}
                        style={{
                          padding: "8px 12px",
                          background: "white",
                          color: "#111",
                          border: "1px solid rgba(0,0,0,.3)",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "16px",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          marginLeft: "8px",
                          flexShrink: 0,
                          height: "44px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                        title="Crear nuevo cliente"
                        disabled={String(detalle?.estado ?? "").toUpperCase() === "CANCELADA"}
                      >
                        +
                      </button>
                    </>
                  ) : (
                    <div className="is-readonly">{clienteNombre}</div>
                  )}
                </div>
              </div>

              <div className="field-row">
                <div className="field-label">INMOBILIARIA</div>
                {isInmobiliaria ? (
                  <div className="field-value is-readonly">
                    {detalle?.inmobiliaria?.nombre ?? "La Federala"}
                  </div>
                ) : (
                  <div className="field-value p0">
                    <NiceSelect
                      value={inmobiliariaId || ""}
                      options={inmobiliarias.map(i => ({ value: i.id, label: i.nombre }))}
                      placeholder="La Federala"
                      showPlaceholderOption={false}
                      onChange={(val) => !estaEliminada && setInmobiliariaId(val)}
                      disabled={estaEliminada}
                    />
                  </div>
                )}
              </div>

              <div className="field-row">
                <div className="field-label">ESTADO</div>
                <div className="field-value p0">
                  <NiceSelect
                    value={estado}
                    options={estadosDisponibles}
                    placeholder=""
                    showPlaceholderOption={false}
                    onChange={(val) => !estaEliminada && setEstado(val)}
                    disabled={estaEliminada || (isInmobiliaria && String(detalle?.estado ?? "").toUpperCase() === "CANCELADA")}
                  />
                </div>
              </div>
            </div>

            {/* Columna derecha */}
            <div className="venta-col">
              <div className="field-row">
                <div className="field-label">NÚMERO DE RESERVA</div>
                {isInmobiliaria ? (
                  <div className="field-value is-readonly">{detalle?.numero ?? "—"}</div>
                ) : (
                  <div className="field-value p0">
                    <input
                      className={`field-input ${estaEliminada ? "is-readonly" : ""}`}
                      type="text"
                      value={numero}
                      onChange={(e) => {
                        if (!estaEliminada) {
                          setNumero(e.target.value);
                          if (numeroError) setNumeroError(null);
                        }
                      }}
                      placeholder="Ej: RES-2025-01"
                      disabled={estaEliminada}
                      readOnly={estaEliminada}
                    />
                    {numeroError && (
                      <div style={{ marginTop: 4, fontSize: 12, color: "#b91c1c" }}>
                        {numeroError}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="field-row">
                <div className="field-label">PLAZO DE RESERVA</div>
                <div className="field-value p0">
                  <input
                    className={`field-input ${estaEliminada ? "is-readonly" : ""}`}
                    type="date"
                    value={fechaFinReserva}
                    onChange={(e) => !estaEliminada && setFechaFinReserva(e.target.value)}
                    disabled={estaEliminada || (isInmobiliaria && String(detalle?.estado ?? "").toUpperCase() === "CANCELADA")}
                    readOnly={estaEliminada}
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field-label">SEÑA</div>
                <div className="field-value p0" style={{ position: "relative" }}>
                  <input
                    className={`field-input ${estaEliminada ? "is-readonly" : ""}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="100"
                    value={sena}
                    onChange={(e) => !estaEliminada && setSena(e.target.value)}
                    style={{ paddingRight: "50px" }}
                    disabled={estaEliminada || (isInmobiliaria && String(detalle?.estado ?? "").toUpperCase() === "CANCELADA")}
                    readOnly={estaEliminada}
                  />
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
                    {sena && Number(sena) > 0 ? "USD" : ""}
                  </span>
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

      <PersonaCrearCard
        open={openCrearPersona}
        onCancel={() => setOpenCrearPersona(false)}
        onCreated={handlePersonaCreated}
      />
    </>
  );
}

