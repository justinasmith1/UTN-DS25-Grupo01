import { useEffect, useMemo, useState, useRef } from "react";
import EditarBase from "../Base/EditarBase.jsx";
import { updateLote, getLoteById } from "../../../lib/api/lotes.js";
import { getAllFracciones } from "../../../lib/api/fracciones.js";
import { getAllReservas } from "../../../lib/api/reservas.js";
import { getAllVentas } from "../../../lib/api/ventas.js";
import { uploadArchivo, getArchivosByLote, deleteArchivo } from "../../../lib/api/archivos.js";
import { useToast } from "../../../app/providers/ToastProvider.jsx";

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

const ESTADOS = [
  { value: "Disponible", label: "Disponible" },
  { value: "Reservado", label: "Reservado" },
  { value: "Vendido", label: "Vendido" },
  { value: "No Disponible", label: "No Disponible" },
  { value: "Alquilado", label: "Alquilado" },
  { value: "En Promoción", label: "En Promoción" },
];

const SUBESTADOS = [
  { value: "No Construido", label: "No Construido" },
  { value: "En Construccion", label: "En Construcción" },
  { value: "Construido", label: "Construido" },
];

const FALLBACK_IMAGE = "/placeholder.svg?width=720&height=360&text=Sin+imagen+disponible";

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
  const fraccionNumero = lot?.fraccion?.numero ?? lot?.fraccionNumero ?? lot?.fraccion ?? "";
  const ubicacion = lot?.ubicacion ?? {};
  const images = Array.isArray(lot?.images) ? lot.images : [];

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
    images,
  };
};

export default function LoteEditarCard({
  open,
  onCancel,
  onSaved,
  lote,
  loteId,
  lotes,
  entityType = "Lote",
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
  const fileInputRef = useRef(null);

  // Cargar fracciones
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

  // Inicializar formulario y cargar archivos asociados
  useEffect(() => {
    if (!open) return;
    if (!detalle) return;

    setForm(buildInitialForm(detalle));
    setArchivosParaBorrar([]);
    setError(null);
    setShowSuccess(false);

    // Cargar archivos (imágenes) del lote
    (async () => {
      try {
        if (!detalle?.id) return;
        const resp = await getArchivosByLote(detalle.id);
        const archivos = resp?.data?.archivos ?? resp?.archivos ?? resp ?? [];
        const archivosForm = (Array.isArray(archivos) ? archivos : []).map(a => {
          const url = a.url ?? a.publicUrl ?? a.link ?? a.path ?? a.path_public ?? "";
          return { id: a.id ?? a.idArchivo ?? null, url };
        }).filter(a => a.url);
        setForm(prev => ({ ...prev, images: archivosForm }));
      } catch (err) {
        console.error("Error cargando archivos del lote:", err);
      }
    })();
  }, [detalle, open]);

  // Cargar reservas/ventas
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Gestión de imágenes
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length !== files.length) {
      showError("Solo se pueden subir archivos de imagen");
      return;
    }

    const filesWithPreview = imageFiles.map((file) => {
      const fw = file;
      fw.objectURL = URL.createObjectURL(file);
      return fw;
    });

    setForm(prev => ({ ...prev, images: [...(prev.images || []), ...filesWithPreview] }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveImage = (index) => {
    setForm(prev => {
      if (!prev.images || !Array.isArray(prev.images)) return prev;
      const img = prev.images[index];
      if (img instanceof File && img.objectURL) {
        try {
          URL.revokeObjectURL(img.objectURL);
        } catch (e) {
          console.error("Error liberando objectURL:", e);
        }
      }
      if (img && img.id) {
        setArchivosParaBorrar(prevIds => [...prevIds, img.id]);
      }
      const next = prev.images.filter((_, i) => i !== index);
      return { ...prev, images: next };
    });
  };

  useEffect(() => {
    const current = form.images;
    return () => {
      (current || []).forEach(img => {
        if (img instanceof File && img.objectURL) URL.revokeObjectURL(img.objectURL);
      });
    };
  }, [form.images]);

  const displayImages = useMemo(() => {
    if (!form.images || form.images.length === 0) return [FALLBACK_IMAGE];
    return form.images.map(img => {
      if (img instanceof File && img.objectURL) return img.objectURL;
      if (typeof img === "string") return img;
      if (img && img.url) return img.url;
      return FALLBACK_IMAGE;
    });
  }, [form.images]);

  const [currentImage, setCurrentImage] = useState(0);
  useEffect(() => setCurrentImage(0), [form.images, open]);
  const showCarouselControls = (form.images || []).length > 1;
  const handlePrev = () => setCurrentImage(i => (i === 0 ? displayImages.length - 1 : i - 1));
  const handleNext = () => setCurrentImage(i => (i === displayImages.length - 1 ? 0 : i + 1));

  // Agregar try-catch en el buildPayload
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

      if (estadoUpper === "RESERVADO") {
        const tieneReservaActiva = reservasLote.some(r => String(r.estado || "").toUpperCase() === "ACTIVA");
        if (!tieneReservaActiva) {
          setError("No se puede establecer el estado RESERVADO sin una reserva ACTIVA para este lote.");
          setSaving(false);
          return;
        }
      }

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
          await Promise.all(archivosParaBorrar.map(id => deleteArchivo(id)));
        } catch (delErr) {
          console.error("Error borrando archivos:", delErr);
        }
      }

      const enriched = {
        ...(detalle || {}),
        ...(updated || {}),
        mapId: updated?.mapId ?? detalle?.mapId ?? form.mapId ?? null,
        images: [...(form.images || [])],
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

  // Renderizar animación incluso si el modal se está cerrando
  if (!open && !showSuccess) return null;

  return (
    <>
      {/* Animación de éxito - se muestra incluso si open es false */}
      {showSuccess && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "grid",
            placeItems: "center",
            zIndex: 10000,
            animation: "fadeIn 0.2s ease-in",
            pointerEvents: "auto",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "32px 48px",
              borderRadius: "12px",
              boxShadow: "0 12px 32px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
              animation: "scaleIn 0.3s ease-out",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "#10b981",
                display: "grid",
                placeItems: "center",
                animation: "checkmark 0.5s ease-in-out",
              }}
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h3
              style={{
                margin: 0,
                fontSize: "20px",
                fontWeight: 600,
                color: "#111",
              }}
            >
              ¡{entityType} guardado exitosamente!
            </h3>
          </div>
        </div>
      )}

      <EditarBase
        open={open}
        title={`Editar Lote Nº ${form.mapId || detalle?.mapId || ""}`}
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

              <div className="field-row"><div className="field-label">Estado</div><div className="field-value p0"><NiceSelect value={form.estado} options={ESTADOS} placeholder="" onChange={(value) => updateForm({ estado: value })} /></div></div>
              <div className="field-row"><div className="field-label">Sub-Estado</div><div className="field-value p0"><NiceSelect value={form.subestado} options={SUBESTADOS} placeholder="" onChange={(value) => updateForm({ subestado: value })} /></div></div>
              <div className="field-row"><div className="field-label">Fracción</div><div className="field-value p0"><NiceSelect value={form.fraccionId ? String(form.fraccionId) : ""} options={fracciones.map(f => ({ value: String(f.idFraccion ?? f.id ?? ""), label: `Fracción ${f.numero ?? f.id}` }))} placeholder={loadingFracciones ? "Cargando..." : "Seleccionar fracción"} onChange={(value) => { const fraccion = fracciones.find(f => `${f.idFraccion ?? f.id}` === value); updateForm({ fraccionId: value ? Number(value) : "", fraccionNumero: fraccion?.numero ?? "" }); }} /></div></div>
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
              <div className="lote-image-manager">
                <div className="lote-carousel">
                  <img src={displayImages[currentImage]} alt={`Imagen lote ${currentImage + 1}`} className="lote-carousel__image" />
                  {showCarouselControls && (
                    <>
                      <button type="button" className="lote-carousel__nav lote-carousel__nav--prev" onClick={handlePrev} aria-label="Imagen anterior">‹</button>
                      <button type="button" className="lote-carousel__nav lote-carousel__nav--next" onClick={handleNext} aria-label="Imagen siguiente">›</button>
                      <div className="lote-carousel__indicator">{displayImages.map((_, idx) => (<span key={idx} className={`lote-carousel__dot ${idx === currentImage ? "is-active" : ""}`} />))}</div>
                    </>
                  )}
                </div>

                <div className="lote-image-actions">
                  <label htmlFor="file-input-lote-editar" style={{ display: "inline-block", padding: "8px 16px", background: "#2563eb", color: "white", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "500", border: "none" }}>Seleccionar imágenes</label>
                  <input ref={fileInputRef} id="file-input-lote-editar" type="file" accept="image/*" multiple onChange={handleFileSelect} style={{ display: "none" }} />
                  {form.images.length > 0 && <button type="button" className="lote-add-btn" style={{ background: "#b91c1c", borderColor: "#b91c1c" }} onClick={() => handleRemoveImage(currentImage)}>Quitar imagen actual</button>}
                  {form.images.length > 0 && <div style={{ marginTop: "8px", fontSize: "13px", color: "#6b7280" }}>{form.images.length} imagen{form.images.length !== 1 ? "es" : ""} seleccionada{form.images.length !== 1 ? "s" : ""}</div>}
                </div>

                {form.images.length > 0 && (
                  <div className="lote-image-list">
                    {form.images.map((img, idx) => {
                      let fileName = `Imagen ${idx + 1}`;
                      if (img instanceof File) {
                        fileName = img.name;
                      } else if (img && img.url) {
                        try {
                          const url = new URL(img.url);
                          const pathName = url.pathname.split("/").pop();
                          if (pathName && pathName.trim()) {
                            fileName = pathName;
                          }
                        } catch (e) {
                          console.error("URL inválida:", img.url, e);
                          fileName = `Imagen ${idx + 1}`;
                        }
                      }
                      return (
                        <div key={idx} className="lote-image-chip">
                          <button type="button" onClick={() => setCurrentImage(idx)} style={{ border: "none", background: "transparent", color: "#1f2937", cursor: "pointer", fontSize: "13px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={fileName}>{fileName}</button>
                          <button type="button" onClick={() => handleRemoveImage(idx)} aria-label={`Eliminar ${fileName}`}>×</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

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
