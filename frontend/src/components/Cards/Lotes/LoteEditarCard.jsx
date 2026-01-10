import { useEffect, useMemo, useState, useRef } from "react";
import EditarBase from "../Base/EditarBase.jsx";
import SuccessAnimation from "../Base/SuccessAnimation.jsx";
import { updateLote, getLoteById } from "../../../lib/api/lotes.js";
import { getAllFracciones } from "../../../lib/api/fracciones.js";
import { getAllReservas } from "../../../lib/api/reservas.js";
import { getAllVentas } from "../../../lib/api/ventas.js";
import { uploadArchivo, getArchivosByLote, deleteArchivo, getFileSignedUrl } from "../../../lib/api/archivos.js";
import { useToast } from "../../../app/providers/ToastProvider.jsx";
import { removeLotePrefix } from "../../../utils/mapaUtils.js";
import LoteImageUploader from "./LoteImageUploader.jsx";

/* ----------------------- Select custom sin librerías ----------------------- */
function NiceSelect({ value, options, placeholder = "Sin información", onChange }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (!btnRef.current?.contains(e.target) && !listRef.current?.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const label = options.find(o => `${o.value}` === `${value}`)?.label ?? placeholder;

  return (
    <div className="ns-wrap" style={{ position: "relative" }}>
      <button
        type="button"
        ref={btnRef}
        className="ns-trigger"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{label}</span>
        <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden>
          <polyline points="5,7 10,12 15,7" stroke="#222" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul ref={listRef} className="ns-list" role="listbox" tabIndex={-1}>
          {(placeholder ? [{ value: "", label: placeholder }, ...options] : options).map(opt => (
            <li
              key={`${opt.value}::${opt.label}`}
              role="option"
              aria-selected={`${opt.value}` === `${value}`}
              className={`ns-item ${`${opt.value}` === `${value}` ? "is-active" : ""}`}
              onClick={() => {
                onChange?.(opt.value || "");
                setOpen(false);
              }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const TIPOS = [
  { value: "Lote Venta", label: "Lote Venta" },
  { value: "Espacio Comun", label: "Espacio Común" },
];

// Estados editables: solo los que se pueden seleccionar manualmente
const ESTADOS_EDITABLES_LOTE = [
  { value: "Disponible", label: "Disponible" },
  { value: "No Disponible", label: "No Disponible" },
  { value: "Vendido", label: "Vendido" },
];

const SUBESTADOS = [
  { value: "No Construido", label: "No Construido" },
  { value: "En Construccion", label: "En Construcción" },
  { value: "Construido", label: "Construido" },
];



const LABELS = [
  "ID",
  "NÚMERO PARTIDA",
  "TIPO",
  "ESTADO",
  "SUB-ESTADO",
  "FRACCIÓN",
  "SUPERFICIE",
  "FRENTE",
  "FONDO",
  "PRECIO",
  "PROPIETARIO",
  "UBICACIÓN",
  "ALQUILER",
  "DEUDA",
  "DESCRIPCIÓN",
];

const FROM_PRISMA_MAP = {
  LOTE_VENTA: "Lote Venta",
  ESPACIO_COMUN: "Espacio Comun",
  DISPONIBLE: "Disponible",
  RESERVADO: "Reservado",
  VENDIDO: "Vendido",
  NO_DISPONIBLE: "No Disponible",
  ALQUILADO: "Alquilado",
  EN_PROMOCION: "En Promoción",
  CON_PRIORIDAD: "Con Prioridad",
  EN_CONSTRUCCION: "En Construccion",
  NO_CONSTRUIDO: "No Construido",
  CONSTRUIDO: "Construido",
};

const toFriendly = (value) => {
  if (value == null) return "";
  return FROM_PRISMA_MAP[value] || value;
};

const toNumberOrNull = (val) => {
  if (val === "" || val === null || val === undefined) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
};

const buildInitialForm = (lot) => {
  if (!lot) {
    return {
      id: "",
      mapId: "",
      tipo: "",
      estado: "",
      subestado: "",
      numPartido: "",
      fraccionId: "",
      fraccionNumero: "",
      propietarioId: "",
      propietarioNombre: "",
      superficie: "",
      frente: "",
      fondo: "",
      precio: "",
      alquiler: false,
      deuda: false,
      descripcion: "",
      ubicacionId: "",
      ubicacionCalle: "",
      ubicacionNumero: "",
      nombreEspacioComun: "",
      capacidad: "",
      images: [],
    };
  }

  const propietario = lot?.propietario || lot?.owner || lot?.Propietario || {};
  const propietarioNombre = [propietario.nombre || propietario.firstName, propietario.apellido || propietario.lastName]
    .filter(Boolean)
    .join(" ");

  const fraccionId = lot?.fraccionId ?? lot?.fraccion?.id ?? "";
  const fraccionNumero = lot?.fraccion?.numero ?? "";
  const ubicacion = lot?.ubicacion ?? {};

  const frente = lot?.frente ?? "";
  const fondo = lot?.fondo ?? "";
  let superficie = lot?.superficie ?? lot?.surface ?? "";

  if (frente && fondo && !superficie) {
    const f = Number(frente);
    const fo = Number(fondo);
    if (!isNaN(f) && !isNaN(fo) && f >= 0 && fo >= 0) {
      superficie = String(f * fo);
    }
  } else if (frente && fondo) {
    const f = Number(frente);
    const fo = Number(fondo);
    const sup = Number(superficie);
    if (!isNaN(f) && !isNaN(fo) && !isNaN(sup) && f >= 0 && fo >= 0 && sup >= 0) {
      const calculated = f * fo;
      if (Math.abs(sup - calculated) > 0.01) {
        superficie = String(calculated);
      }
    }
  }

  return {
    id: lot.id ?? "",
    mapId: lot.mapId ?? lot.codigo ?? "",
    tipo: toFriendly(lot?.tipo),
    estado: toFriendly(lot?.estado ?? lot?.status),
    subestado: toFriendly(lot?.subestado ?? lot?.subStatus),
    numPartido: lot?.numPartido ?? lot?.numeroPartida ?? "",
    fraccionId,
    fraccionNumero,
    propietarioId: lot?.propietarioId ?? propietario?.id ?? "",
    propietarioNombre: propietarioNombre || lot?.owner || "",
    superficie,
    frente: String(frente),
    fondo: String(fondo),
    precio: lot?.precio ?? lot?.price ?? "",
    alquiler: Boolean(lot?.alquiler),
    deuda: Boolean(lot?.deuda),
    descripcion: lot?.descripcion ?? lot?.description ?? "",
    ubicacionId: lot?.ubicacionId ?? ubicacion?.id ?? "",
    ubicacionCalle: ubicacion?.calle ?? ubicacion?.nombre ?? "",
    ubicacionNumero: ubicacion?.numero ?? "",
    nombreEspacioComun: lot?.nombreEspacioComun ?? "",
    capacidad: lot?.capacidad ?? "",
    images: [], // Siempre inicializar vacío, se cargan desde el backend
  };
};

export default function LoteEditarCard({
  open,
  onCancel,
  onSaved,
  lote,
  loteId,
  lotes,
}) {
  const { success, error: showError } = useToast();
  const [detalle, setDetalle] = useState(lote || null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [form, setForm] = useState(buildInitialForm(lote));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fracciones, setFracciones] = useState([]);
  const [loadingFracciones, setLoadingFracciones] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [reservasLote, setReservasLote] = useState([]);
  const [ventasLote, setVentasLote] = useState([]);
  const [archivosParaBorrar, setArchivosParaBorrar] = useState([]);

  useEffect(() => {
    if (!open) return;
    if (fracciones.length > 0) return;
    setLoadingFracciones(true);
    (async () => {
      try {
        const resp = await getAllFracciones();
        if (resp.success && resp.data?.fracciones) {
          setFracciones(resp.data.fracciones);
        }
      } catch (err) {
        console.error("Error cargando fracciones:", err);
      } finally {
        setLoadingFracciones(false);
      }
    })();
  }, [open, fracciones.length]);

  const computedLabelWidth = useMemo(() => {
    const longest = Math.max(...LABELS.map((l) => l.length));
    return Math.min(260, Math.max(160, Math.round(longest * 8.2) + 22));
  }, []);

  // Opciones de estado: incluir estado actual si es derivado (no editable) para mostrarlo
  const opcionesEstado = useMemo(() => {
    const estadoActual = form.estado;
    const esEditable = ESTADOS_EDITABLES_LOTE.some(e => e.value === estadoActual);
    
    // Si el estado actual no es editable, agregarlo temporalmente para mostrarlo
    if (estadoActual && !esEditable) {
      return [{ value: estadoActual, label: estadoActual }, ...ESTADOS_EDITABLES_LOTE];
    }
    
    return ESTADOS_EDITABLES_LOTE;
  }, [form.estado]);

  const fallbackDetalle = useMemo(() => {
    if (lote) return lote;
    if (loteId != null && Array.isArray(lotes)) {
      return lotes.find((l) => `${l.id}` === `${loteId}`) || null;
    }
    return null;
  }, [lote, loteId, lotes]);

  useEffect(() => {
    if (fallbackDetalle) setDetalle(fallbackDetalle);
  }, [fallbackDetalle]);

  useEffect(() => {
    if (!open) return;
    if (!detalle && loteId != null && !loadingDetalle) {
      setLoadingDetalle(true);
      (async () => {
        try {
          const resp = await getLoteById(loteId);
          const lot = resp?.data ?? resp ?? null;
          setDetalle(lot);
        } catch (err) {
          console.error("Error obteniendo lote por id:", err);
          setError("No se pudo cargar el lote seleccionado.");
        } finally {
          setLoadingDetalle(false);
        }
      })();
    }
  }, [open, detalle, loteId, loadingDetalle]);

  useEffect(() => {
    if (!open) return;
    if (!detalle) return;

    setForm(buildInitialForm(detalle));
    setArchivosParaBorrar([]);
    setError(null);
    setShowSuccess(false);
  }, [detalle?.id, open]);

  useEffect(() => {
    if (!open || !detalle?.id) return;

    let cancelled = false;

    (async () => {
      try {
        const resp = await getArchivosByLote(detalle.id);
        if (cancelled) return;
        
        const archivos = Array.isArray(resp) ? resp : (resp?.archivos ?? resp?.data?.archivos ?? []);
        const imagenes = archivos.filter(a => (a.tipo || "").toUpperCase() === "IMAGEN" && a.id);
        
        const imagenesConUrls = await Promise.all(
          imagenes.map(async (img) => {
            const signedUrl = await getFileSignedUrl(img.id);
            return signedUrl?.startsWith('http') ? { id: img.id, url: signedUrl } : null;
          })
        );
        
        if (cancelled) return;
        
        const imagenesValidas = imagenesConUrls.filter(i => i?.id && i?.url);
        setForm(prev => {
          const existingFiles = (prev.images || []).filter(img => img instanceof File && img.objectURL);
          return { ...prev, images: [...existingFiles, ...imagenesValidas] };
        });
      } catch (err) {
        if (!cancelled) console.error("Error cargando archivos del lote:", err);
      }
    })();

    return () => { cancelled = true; };
  }, [detalle?.id, open]);

  useEffect(() => {
    if (!open || !detalle?.id) return;
    (async () => {
      try {
        const reservasResp = await getAllReservas({});
        const allReservas = reservasResp?.data ?? [];
        const reservasDelLote = allReservas.filter(r => (r.loteId || r.lote?.id) === detalle.id);
        setReservasLote(reservasDelLote);

        const ventasResp = await getAllVentas({});
        const allVentas = ventasResp?.data ?? [];
        const ventasDelLote = allVentas.filter(v => (v.loteId || v.lote?.id) === detalle.id);
        setVentasLote(ventasDelLote);
      } catch (err) {
        console.error("Error cargando reservas/ventas del lote:", err);
      }
    })();
  }, [open, detalle?.id]);

  const updateForm = (patch) => {
    setForm(prev => {
      const updated = { ...prev, ...patch };
      if ('frente' in patch || 'fondo' in patch) {
        const frente = toNumberOrNull(updated.frente);
        const fondo = toNumberOrNull(updated.fondo);
        if (frente != null && fondo != null && frente >= 0 && fondo >= 0) {
          updated.superficie = String(frente * fondo);
        } else {
          updated.superficie = "";
        }
      }
      return updated;
    });
  };

  const handleReset = () => {
    setForm(buildInitialForm(detalle));
    setError(null);
    setArchivosParaBorrar([]);
  };

  // Callback para manejar cambios en las imágenes desde el componente reutilizable
  const handleImagesChange = (newImages) => {
    setForm(prev => ({ ...prev, images: newImages }));
  };

  // Callback para manejar IDs de imágenes eliminadas (para borrar del backend)
  const handleDeletedIdsChange = (deletedIds) => {
    setArchivosParaBorrar(deletedIds);
  };

  const buildPayload = () => {
    try {
      const payload = {};
      if (form.tipo) payload.tipo = form.tipo;
      if (form.estado) payload.estado = form.estado;
      if (form.subestado) payload.subestado = form.subestado;

      const numPartido = toNumberOrNull(form.numPartido);
      if (numPartido != null) payload.numPartido = numPartido;

      const frente = toNumberOrNull(form.frente);
      const fondo = toNumberOrNull(form.fondo);
      let superficie = toNumberOrNull(form.superficie);

      if (frente != null && fondo != null && frente >= 0 && fondo >= 0) {
        superficie = frente * fondo;
      }

      if (superficie != null && superficie >= 0) payload.superficie = superficie;
      if (frente != null) payload.frente = frente;
      if (fondo != null) payload.fondo = fondo;

      const precio = toNumberOrNull(form.precio);
      if (precio != null) payload.precio = precio;

      if (form.descripcion != null) payload.descripcion = form.descripcion;
      payload.alquiler = Boolean(form.alquiler);
      payload.deuda = Boolean(form.deuda);

      const fraccionId = toNumberOrNull(form.fraccionId);
      if (fraccionId) payload.fraccionId = fraccionId;

      const propietarioId = toNumberOrNull(form.propietarioId);
      if (propietarioId) payload.propietarioId = propietarioId;

      if (form.tipo === "Espacio Comun") {
        if (form.nombreEspacioComun != null && form.nombreEspacioComun.trim()) {
          payload.nombreEspacioComun = form.nombreEspacioComun.trim();
        }
        const capacidad = toNumberOrNull(form.capacidad);
        if (capacidad != null && capacidad >= 0) payload.capacidad = capacidad;
      }

      return payload;
    } catch (err) {
      console.error("Error en buildPayload:", err);
      return {};
    }
  };

  const handleSave = async () => {
    if (!detalle?.id) return;
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload();
      const nuevoEstado = payload.estado || form.estado;
      const estadoUpper = String(nuevoEstado || "").toUpperCase();

      // Validación de VENDIDO: solo permitir si hay venta registrada
      if (estadoUpper === "VENDIDO") {
        if (ventasLote.length === 0) {
          setError("No se puede establecer el estado VENDIDO sin una venta registrada para este lote.");
          setSaving(false);
          return;
        }
      }

      const resp = await updateLote(detalle.id, payload);
      const updated = resp?.data ?? resp ?? {};

      // Subir nuevos archivos
      const newFiles = (form.images || []).filter(img => img instanceof File);
      if (newFiles.length > 0) {
        try {
          await Promise.all(newFiles.map(file => uploadArchivo(file, detalle.id, "IMAGEN")));
        } catch (uploadErr) {
          console.error("Error subiendo imágenes:", uploadErr);
          showError("Se actualizaron datos del lote, pero hubo un error subiendo algunas imágenes");
        }
      }

      // Borrar archivos marcados
      if (archivosParaBorrar.length > 0) {
        try {
          await Promise.allSettled(
            archivosParaBorrar.map(id => 
              deleteArchivo(id).catch(err => {
                console.warn(`Error borrando archivo ${id}:`, err);
                return null;
              })
            )
          );
        } catch (delErr) {
          console.error("Error borrando archivos:", delErr);
        }
      }

      const ordenActual = (form.images || [])
        .filter(img => !(img instanceof File) && img?.id)
        .map(img => img.id);
      
      let imagenesActualizadas = [];
      try {
        const resp = await getArchivosByLote(detalle.id);
        const archivos = Array.isArray(resp) ? resp : (resp?.archivos ?? resp?.data?.archivos ?? []);
        const imagenes = archivos.filter(a => (a.tipo || "").toUpperCase() === "IMAGEN" && a.id);
        
        imagenesActualizadas = await Promise.all(
          imagenes.map(async (img) => {
            const signedUrl = await getFileSignedUrl(img.id);
            return signedUrl?.startsWith('http') ? { id: img.id, url: signedUrl } : null;
          })
        );
        imagenesActualizadas = imagenesActualizadas.filter(i => i?.id && i?.url);
        
        const imagenesMap = new Map(imagenesActualizadas.map(img => [img.id, img]));
        const imagenesOrdenadas = [];
        
        ordenActual.forEach(id => {
          const img = imagenesMap.get(id);
          if (img) {
            imagenesOrdenadas.push(img);
            imagenesMap.delete(id);
          }
        });
        
        imagenesMap.forEach(img => imagenesOrdenadas.push(img));
        imagenesActualizadas = imagenesOrdenadas;
        
        setForm(prev => ({ ...prev, images: imagenesActualizadas }));
      } catch (err) {
        console.error("Error recargando imágenes:", err);
        imagenesActualizadas = (form.images || []).filter(img => !(img instanceof File) && img?.id && img?.url);
        setForm(prev => ({ ...prev, images: imagenesActualizadas }));
      }

      const enriched = {
        ...(detalle || {}),
        ...(updated || {}),
        mapId: updated?.mapId ?? detalle?.mapId ?? form.mapId ?? null,
        images: imagenesActualizadas,
        descripcion: form.descripcion,
        alquiler: payload.alquiler,
        deuda: payload.deuda,
        estado: payload.estado ?? updated?.estado ?? detalle?.estado,
      };

      setDetalle(enriched);
      onSaved?.(enriched);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSaving(false);
        onCancel?.();
      }, 1500);
    } catch (err) {
      console.error("Error guardando lote:", err);
      setError(err?.message || "No se pudo guardar el lote. Intenta nuevamente.");
      setSaving(false);
    }
  };

  if (!open && !showSuccess) return null;

  return (
    <>
      <SuccessAnimation show={showSuccess} message="¡Lote guardado exitosamente!" />

      <EditarBase
        open={open}
        title={`Editar Lote Nº ${removeLotePrefix(form.mapId || detalle?.mapId || "")}`}
        onCancel={() => { if (showSuccess) return; setSaving(false); setShowSuccess(false); onCancel?.(); }}
        saveButtonText={saving ? "Guardando..." : "Guardar cambios"}
        onSave={handleSave}
        onReset={detalle ? handleReset : undefined}
        saving={saving}
        headerRight={loadingDetalle ? <span className="badge bg-warning text-dark">Cargando...</span> : null}
      >
        {!detalle && (
          <div style={{ padding: "30px 10px" }}>
            <p style={{ margin: 0, color: "#6B7280" }}>
              {loadingDetalle ? "Cargando información del lote..." : "No se encontró información del lote."}
            </p>
          </div>
        )}

        {detalle && (
          <div className="lote-grid" style={{ ["--sale-label-w"]: `${computedLabelWidth}px` }}>
            <div className="lote-data-col">
              <div className="field-row"><div className="field-label">ID</div><div className="field-value is-readonly">{form.mapId || detalle?.mapId || "—"}</div></div>
              <div className="field-row"><div className="field-label">Número Partida</div><div className="field-value p0"><input className="field-input" type="number" inputMode="numeric" value={form.numPartido ?? ""} onChange={(e) => updateForm({ numPartido: e.target.value })} placeholder="Número de partida" /></div></div>
              <div className="field-row"><div className="field-label">Tipo</div><div className="field-value p0"><NiceSelect value={form.tipo} options={TIPOS} placeholder="" onChange={(value) => updateForm({ tipo: value, nombreEspacioComun: value === "Espacio Comun" ? form.nombreEspacioComun : "", capacidad: value === "Espacio Comun" ? form.capacidad : "" })} /></div></div>

              {form.tipo === "Espacio Comun" && (
                <>
                  <div className="field-row"><div className="field-label">Nombre del Espacio Común</div><div className="field-value p0"><input className="field-input" type="text" value={form.nombreEspacioComun ?? ""} onChange={(e) => updateForm({ nombreEspacioComun: e.target.value })} placeholder="Ej. Piscina" /></div></div>
                  <div className="field-row"><div className="field-label">Capacidad</div><div className="field-value p0"><input className="field-input" type="number" inputMode="numeric" value={form.capacidad ?? ""} onChange={(e) => updateForm({ capacidad: e.target.value })} placeholder="Ej. 100" /></div></div>
                </>
              )}

              <div className="field-row"><div className="field-label">Estado</div><div className="field-value p0"><NiceSelect value={form.estado} options={opcionesEstado} placeholder="" onChange={(value) => updateForm({ estado: value })} /></div></div>
              <div className="field-row"><div className="field-label">Sub-Estado</div><div className="field-value p0"><NiceSelect value={form.subestado} options={SUBESTADOS} placeholder="" onChange={(value) => updateForm({ subestado: value })} /></div></div>
              <div className="field-row"><div className="field-label">Fracción</div><div className="field-value p0"><NiceSelect value={form.fraccionId ? String(form.fraccionId) : ""} options={fracciones.map(f => ({ value: String(f.idFraccion ?? f.id ?? ""), label: `Fracción ${f.numero ?? f.id}` }))} placeholder={loadingFracciones ? "Cargando..." : ""} onChange={(value) => { const fraccion = fracciones.find(f => `${f.idFraccion ?? f.id}` === value); updateForm({ fraccionId: value ? Number(value) : "", fraccionNumero: fraccion?.numero ?? "" }); }} /></div></div>
              <div className="field-row"><div className="field-label">Superficie</div><div className="field-value p0"><input className="field-input is-readonly" type="number" inputMode="decimal" value={form.superficie ?? ""} readOnly placeholder="Se calcula automáticamente" title="La superficie se calcula automáticamente como frente × fondo" /></div></div>
              <div className="field-row"><div className="field-label">Frente</div><div className="field-value p0"><input className="field-input" type="number" inputMode="decimal" value={form.frente ?? ""} onChange={(e) => updateForm({ frente: e.target.value })} placeholder="Metros" /></div></div>
              <div className="field-row"><div className="field-label">Fondo</div><div className="field-value p0"><input className="field-input" type="number" inputMode="decimal" value={form.fondo ?? ""} onChange={(e) => updateForm({ fondo: e.target.value })} placeholder="Metros" /></div></div>
              <div className="field-row"><div className="field-label">Precio</div><div className="field-value p0"><input className="field-input" type="number" inputMode="decimal" value={form.precio ?? ""} onChange={(e) => updateForm({ precio: e.target.value })} placeholder="USD" /></div></div>
              <div className="field-row"><div className="field-label">Propietario</div><div className="field-value is-readonly">{form.propietarioNombre || "—"}</div></div>
              <div className="field-row"><div className="field-label">Ubicación</div><div className="field-value is-readonly">{form.ubicacionCalle ? `Calle ${form.ubicacionCalle} ${form.ubicacionNumero ? `Nº ${form.ubicacionNumero}` : ""}` : "—"}</div></div>
              <div className="field-row"><div className="field-label">Alquiler</div><div className="field-value boolean-value"><input type="checkbox" checked={form.alquiler} onChange={(e) => updateForm({ alquiler: e.target.checked })} /><span>{form.alquiler ? "Sí" : "No"}</span></div></div>
              <div className="field-row"><div className="field-label">Deuda</div><div className="field-value boolean-value"><input type="checkbox" checked={form.deuda} onChange={(e) => updateForm({ deuda: e.target.checked })} /><span>{form.deuda ? "Sí" : "No"}</span></div></div>
            </div>

            <div className="lote-media-col">
              {/* Reutilizamos el mismo componente de subida de imágenes en Crear y Editar lote
                  para garantizar un comportamiento consistente. */}
              <LoteImageUploader
                images={form.images || []}
                onChange={handleImagesChange}
                onDeletedIdsChange={handleDeletedIdsChange}
                inputId="file-input-lote-editar"
              />

              <div className="lote-description">
                <span className="lote-description__icon">ℹ️</span>
                <div className="lote-description__body">
                  <strong>Descripción</strong>
                  <textarea style={{ margin: "8px 0 0", width: "100%", minHeight: "80px", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", fontFamily: "inherit", resize: "vertical" }} value={form.descripcion ?? ""} onChange={(e) => updateForm({ descripcion: e.target.value })} placeholder="Notas relevantes del lote…" />
                </div>
              </div>

              <div className="lote-doc-buttons" style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                <button type="button" className="lote-doc-button" disabled style={{ flex: "1 1 100%" }}>Escritura</button>
                <button type="button" className="lote-doc-button" disabled style={{ flex: "1 1 calc(50% - 4px)" }}>Boleto CompraVenta</button>
                <button type="button" className="lote-doc-button" disabled style={{ flex: "1 1 calc(50% - 4px)" }}>Planos</button>
              </div>
            </div>
          </div>
        )}

        {error && <div style={{ marginTop: 18, padding: "10px 14px", borderRadius: 10, background: "#fee2e2", color: "#991b1b", fontSize: 13.5 }}>{error}</div>}
      </EditarBase>
    </>
  );
}
