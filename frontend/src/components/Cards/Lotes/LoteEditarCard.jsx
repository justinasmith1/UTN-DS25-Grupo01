import { useEffect, useMemo, useState, useRef } from "react";
import EditarBase from "../Base/EditarBase.jsx";
import { updateLote, getLoteById } from "../../../lib/api/lotes.js";
import { getAllFracciones } from "../../../lib/api/fracciones.js";

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

const FALLBACK_IMAGE =
  "/placeholder.svg?width=720&height=360&text=Sin+imagen+disponible";

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
      tipo: "",
      estado: "",
      subestado: "",
      numPartido: "",
      fraccionId: "",
      fraccionNumero: "",
      propietarioId: lot?.propietarioId ?? "",
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
      images: [],
    };
  }

  const propietario =
    lot?.propietario ||
    lot?.owner ||
    lot?.Propietario ||
    {};
  const propietarioNombre = [propietario.nombre || propietario.firstName, propietario.apellido || propietario.lastName]
    .filter(Boolean)
    .join(" ");

  const fraccionId =
    lot?.fraccionId ??
    lot?.fraccion?.id ??
    "";

  const fraccionNumero =
    lot?.fraccion?.numero ??
    lot?.fraccionNumero ??
    lot?.fraccion ??
    "";

  const ubicacion = lot?.ubicacion ?? {};

  const images = Array.isArray(lot?.images) ? lot.images : [];

  // Calcular superficie si hay frente y fondo
  const frente = lot?.frente ?? "";
  const fondo = lot?.fondo ?? "";
  let superficie = lot?.superficie ?? lot?.surface ?? "";
  
  // Si tenemos frente y fondo pero no superficie, calcularla
  if (frente && fondo && !superficie) {
    const f = Number(frente);
    const fo = Number(fondo);
    if (!isNaN(f) && !isNaN(fo) && f >= 0 && fo >= 0) {
      superficie = String(f * fo);
    }
  } else if (frente && fondo) {
    // Validar que la superficie coincida con frente × fondo
    const f = Number(frente);
    const fo = Number(fondo);
    const sup = Number(superficie);
    if (!isNaN(f) && !isNaN(fo) && !isNaN(sup) && f >= 0 && fo >= 0 && sup >= 0) {
      const calculated = f * fo;
      // Si la superficie no coincide, recalcularla
      if (Math.abs(sup - calculated) > 0.01) {
        superficie = String(calculated);
      }
    }
  }

  return {
    id: lot.id ?? "",
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
    ubicacionId:
      lot?.ubicacionId ??
      ubicacion?.id ??
      "",
    ubicacionCalle: ubicacion?.calle ?? ubicacion?.nombre ?? "",
    ubicacionNumero: ubicacion?.numero ?? "",
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
  entityType = "Lote", // tipo de entidad para el mensaje de éxito
}) {
  const [detalle, setDetalle] = useState(lote || null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [form, setForm] = useState(buildInitialForm(lote));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [fracciones, setFracciones] = useState([]);
  const [loadingFracciones, setLoadingFracciones] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Cargar fracciones al montar o abrir
  useEffect(() => {
    if (!open) return;
    if (fracciones.length > 0) return; // Ya están cargadas
    
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
    if (fallbackDetalle) {
      setDetalle(fallbackDetalle);
    }
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
    if (!open) {
      setShowSuccess(false);
      setSaving(false);
      return;
    }
    if (!detalle) return;
    setForm(buildInitialForm(detalle));
    setNewImageUrl("");
    setError(null);
    setShowSuccess(false);
  }, [detalle, open]);

  // Resetear estados cuando el modal se cierra o se abre con otro lote
  useEffect(() => {
    if (!open) {
      setSaving(false);
      setShowSuccess(false);
    } else {
      // Resetear estados al abrir con un nuevo lote
      setSaving(false);
      setShowSuccess(false);
    }
  }, [open, detalle?.id]);

  const updateForm = (patch) => {
    setForm((prev) => {
      const updated = { ...prev, ...patch };
      
      // Calcular superficie automáticamente cuando cambian frente o fondo
      if ('frente' in patch || 'fondo' in patch) {
        const frente = toNumberOrNull(updated.frente);
        const fondo = toNumberOrNull(updated.fondo);
        if (frente != null && fondo != null && frente >= 0 && fondo >= 0) {
          updated.superficie = String(frente * fondo);
        } else {
          // Si falta alguno, limpiar superficie
          updated.superficie = "";
        }
      }
      
      return updated;
    });
  };

  const handleReset = () => {
    setForm(buildInitialForm(detalle));
    setNewImageUrl("");
    setError(null);
  };

  const handleRemoveImage = (index) => {
    setForm((prev) => {
      const nextImages = prev.images.filter((_, idx) => idx !== index);
      setCurrentImage((curr) => {
        if (nextImages.length === 0) return 0;
        if (curr >= nextImages.length) return nextImages.length - 1;
        return curr;
      });
      return { ...prev, images: nextImages };
    });
  };

  const handleAddImage = () => {
    const url = newImageUrl.trim();
    if (!url) return;
    setForm((prev) => ({
      ...prev,
      images: [...prev.images, url],
    }));
    setNewImageUrl("");
  };

  const [currentImage, setCurrentImage] = useState(0);
  useEffect(() => {
    setCurrentImage(0);
  }, [form.images, open]);

  const displayImages =
    form.images.length > 0 ? form.images : [FALLBACK_IMAGE];
  const showCarouselControls = form.images.length > 1;

  const handlePrev = () => {
    setCurrentImage((idx) =>
      idx === 0 ? displayImages.length - 1 : idx - 1
    );
  };

  const handleNext = () => {
    setCurrentImage((idx) =>
      idx === displayImages.length - 1 ? 0 : idx + 1
    );
  };

  const buildPayload = () => {
    const payload = {};

    if (form.tipo) payload.tipo = form.tipo;
    if (form.estado) payload.estado = form.estado;
    if (form.subestado) payload.subestado = form.subestado;

    const numPartido = toNumberOrNull(form.numPartido);
    if (numPartido != null) payload.numPartido = numPartido;

    // Calcular superficie automáticamente si hay frente y fondo
    const frente = toNumberOrNull(form.frente);
    const fondo = toNumberOrNull(form.fondo);
    let superficie = toNumberOrNull(form.superficie);
    
    // Si tenemos frente y fondo, calcular superficie automáticamente
    if (frente != null && fondo != null && frente >= 0 && fondo >= 0) {
      superficie = frente * fondo;
    }
    
    // Solo enviar superficie si tiene un valor válido
    if (superficie != null && superficie >= 0) {
      payload.superficie = superficie;
    }

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

    const ubicacionId = toNumberOrNull(form.ubicacionId);
    if (ubicacionId) payload.ubicacionId = ubicacionId;

    return payload;
  };

  const handleSave = async () => {
    if (!detalle?.id) return;
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload();
      const resp = await updateLote(detalle.id, payload);
      const updated = resp?.data ?? resp ?? {};
      const enriched = {
        ...(detalle || {}),
        ...(updated || {}),
        images: [...form.images],
        descripcion: form.descripcion,
        alquiler: payload.alquiler,
        deuda: payload.deuda,
        estado: payload.estado ?? updated?.estado ?? detalle?.estado,
        subestado: payload.subestado ?? updated?.subestado ?? detalle?.subestado,
        tipo: payload.tipo ?? updated?.tipo ?? detalle?.tipo,
        numPartido: payload.numPartido ?? updated?.numPartido ?? detalle?.numPartido,
        superficie: payload.superficie ?? updated?.superficie ?? detalle?.superficie,
        frente: payload.frente ?? updated?.frente ?? detalle?.frente,
        fondo: payload.fondo ?? updated?.fondo ?? detalle?.fondo,
        precio: payload.precio ?? updated?.precio ?? detalle?.precio,
      };

      setDetalle(enriched);
      onSaved?.(enriched);
      
      // Mostrar animación de éxito
      setShowSuccess(true);
      
      // Esperar un momento para mostrar la animación antes de cerrar
      setTimeout(() => {
        setShowSuccess(false);
        setSaving(false);
        onCancel?.();
      }, 1500);
    } catch (err) {
      console.error("Error guardando lote:", err);
      setError(
        err?.message ||
          "No se pudo guardar el lote. Intenta nuevamente."
      );
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
        title={`Editar Lote Nº ${form.id || ""}`}
        onCancel={() => {
          // Si está mostrando éxito, no cerrar hasta que termine
          if (showSuccess) return;
          setSaving(false);
          setShowSuccess(false);
          onCancel?.();
        }}
        onSave={handleSave}
        onReset={detalle ? handleReset : undefined}
        saving={saving}
        headerRight={
          loadingDetalle ? (
            <span className="badge bg-warning text-dark">Cargando...</span>
          ) : null
        }
      >
      {!detalle && (
        <div style={{ padding: "30px 10px" }}>
          <p style={{ margin: 0, color: "#6B7280" }}>
            {loadingDetalle
              ? "Cargando información del lote..."
              : "No se encontró información del lote."}
          </p>
        </div>
      )}

      {detalle && (
        <div
          className="lote-grid"
          style={{ ["--sale-label-w"]: `${computedLabelWidth}px` }}
        >
          <div className="lote-data-col">
            <div className="field-row">
              <div className="field-label">ID</div>
              <div className="field-value is-readonly">{form.id || "—"}</div>
            </div>

            <div className="field-row">
              <div className="field-label">Número Partida</div>
              <div className="field-value p0">
                <input
                  className="field-input"
                  type="number"
                  inputMode="numeric"
                  value={form.numPartido ?? ""}
                  onChange={(e) => updateForm({ numPartido: e.target.value })}
                  placeholder="Número de partida"
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">Tipo</div>
              <div className="field-value p0">
                <NiceSelect
                  value={form.tipo}
                  options={TIPOS}
                  placeholder=""
                  onChange={(value) => updateForm({ tipo: value })}
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">Estado</div>
              <div className="field-value p0">
                <NiceSelect
                  value={form.estado}
                  options={ESTADOS}
                  placeholder=""
                  onChange={(value) => updateForm({ estado: value })}
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">Sub-Estado</div>
              <div className="field-value p0">
                <NiceSelect
                  value={form.subestado}
                  options={SUBESTADOS}
                  placeholder=""
                  onChange={(value) => updateForm({ subestado: value })}
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">Fracción</div>
              <div className="field-value p0">
                <NiceSelect
                  value={form.fraccionId ? String(form.fraccionId) : ""}
                  options={fracciones.map(f => {
                    const id = f.idFraccion ?? f.id ?? "";
                    const numero = f.numero ?? id;
                    return { 
                      value: String(id), 
                      label: `Fracción ${numero}` 
                    };
                  })}
                  placeholder={loadingFracciones ? "Cargando..." : "Seleccionar fracción"}
                  onChange={(value) => {
                    const fraccion = fracciones.find(f => `${f.idFraccion ?? f.id}` === value);
                    updateForm({ 
                      fraccionId: value ? Number(value) : "",
                      fraccionNumero: fraccion?.numero ?? ""
                    });
                  }}
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">Superficie</div>
              <div className="field-value p0">
                <input
                  className="field-input is-readonly"
                  type="number"
                  inputMode="decimal"
                  value={form.superficie ?? ""}
                  readOnly
                  placeholder="Se calcula automáticamente"
                  title="La superficie se calcula automáticamente como frente × fondo"
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">Frente</div>
              <div className="field-value p0">
                <input
                  className="field-input"
                  type="number"
                  inputMode="decimal"
                  value={form.frente ?? ""}
                  onChange={(e) => updateForm({ frente: e.target.value })}
                  placeholder="Metros"
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">Fondo</div>
              <div className="field-value p0">
                <input
                  className="field-input"
                  type="number"
                  inputMode="decimal"
                  value={form.fondo ?? ""}
                  onChange={(e) => updateForm({ fondo: e.target.value })}
                  placeholder="Metros"
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">Precio</div>
              <div className="field-value p0">
                <input
                  className="field-input"
                  type="number"
                  inputMode="decimal"
                  value={form.precio ?? ""}
                  onChange={(e) => updateForm({ precio: e.target.value })}
                  placeholder="USD"
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">Propietario</div>
              <div className="field-value is-readonly">
                {form.propietarioNombre || "—"}
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">Ubicación</div>
              <div className="field-value is-readonly">
                {form.ubicacionCalle
                  ? `Calle ${form.ubicacionCalle} ${
                      form.ubicacionNumero
                        ? `Nº ${form.ubicacionNumero}`
                        : ""
                    }`
                  : "—"}
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">Alquiler</div>
              <div className="field-value boolean-value">
                <input
                  type="checkbox"
                  checked={form.alquiler}
                  onChange={(e) => updateForm({ alquiler: e.target.checked })}
                />
                <span>{form.alquiler ? "Sí" : "No"}</span>
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">Deuda</div>
              <div className="field-value boolean-value">
                <input
                  type="checkbox"
                  checked={form.deuda}
                  onChange={(e) => updateForm({ deuda: e.target.checked })}
                />
                <span>{form.deuda ? "Sí" : "No"}</span>
              </div>
            </div>
          </div>

          <div className="lote-media-col">

            <div className="lote-image-manager">
              <div className="lote-carousel">
                <img
                  src={displayImages[currentImage]}
                  alt={`Imagen lote ${form.id} ${currentImage + 1}`}
                  className="lote-carousel__image"
                />

                {showCarouselControls && (
                  <>
                    <button
                      type="button"
                      className="lote-carousel__nav lote-carousel__nav--prev"
                      onClick={handlePrev}
                      aria-label="Imagen anterior"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="lote-carousel__nav lote-carousel__nav--next"
                      onClick={handleNext}
                      aria-label="Imagen siguiente"
                    >
                      ›
                    </button>
                    <div className="lote-carousel__indicator">
                      {displayImages.map((_, idx) => (
                        <span
                          key={idx}
                          className={`lote-carousel__dot ${
                            idx === currentImage ? "is-active" : ""
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="lote-image-actions">
                <input
                  type="text"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  onPaste={(e) => {
                    // Permitir el comportamiento por defecto del paste
                    const pastedText = (e.clipboardData || window.clipboardData).getData('text');
                    e.preventDefault(); // Prevenir el paste por defecto para controlar el valor
                    setNewImageUrl(pastedText);
                  }}
                  placeholder="URL de nueva imagen"
                />
                <button
                  type="button"
                  className="lote-add-btn"
                  onClick={handleAddImage}
                >
                  Agregar imagen
                </button>
                {form.images.length > 0 && (
                  <button
                    type="button"
                    className="lote-add-btn"
                    style={{ background: "#b91c1c", borderColor: "#b91c1c" }}
                    onClick={() => handleRemoveImage(currentImage)}
                  >
                    Quitar imagen actual
                  </button>
                )}
              </div>

              {form.images.length > 0 && (
                <div className="lote-image-list">
                  {form.images.map((img, idx) => (
                    <div key={idx} className="lote-image-chip">
                      <button
                        type="button"
                        onClick={() => setCurrentImage(idx)}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#1f2937",
                          cursor: "pointer",
                          fontSize: "13px",
                        }}
                      >
                        Imagen {idx + 1}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        aria-label={`Eliminar imagen ${idx + 1}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lote-description">
              <span className="lote-description__icon">ℹ️</span>
              <div className="lote-description__body">
                <strong>Descripción</strong>
                <textarea
                  style={{ 
                    margin: "8px 0 0", 
                    width: "100%", 
                    minHeight: "80px",
                    padding: "8px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    resize: "vertical"
                  }}
                  value={form.descripcion ?? ""}
                  onChange={(e) =>
                    updateForm({ descripcion: e.target.value })
                  }
                  placeholder="Notas relevantes del lote…"
                />
              </div>
            </div>

            <div className="lote-doc-buttons" style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <button type="button" className="lote-doc-button" disabled style={{ flex: "1 1 100%" }}>
                Escritura
              </button>
              <button type="button" className="lote-doc-button" disabled style={{ flex: "1 1 calc(50% - 4px)" }}>
                Boleto CompraVenta
              </button>
              <button type="button" className="lote-doc-button" disabled style={{ flex: "1 1 calc(50% - 4px)" }}>
                Planos
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 18,
            padding: "10px 14px",
            borderRadius: 10,
            background: "#fee2e2",
            color: "#991b1b",
            fontSize: 13.5,
          }}
        >
          {error}
        </div>
      )}
    </EditarBase>
    </>
  );
}
