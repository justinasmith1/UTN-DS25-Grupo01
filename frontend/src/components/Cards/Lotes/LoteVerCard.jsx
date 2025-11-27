import { useEffect, useMemo, useRef, useState } from "react";
import "../Base/cards.css";
import LoteEditarCard from "./LoteEditarCard.jsx";

/* ----------------------- Select custom sin librerías ----------------------- */
function NiceSelect({ value, options, placeholder = "Sin información", onChange, disabled = false }) {
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

  if (disabled) {
    return (
      <div className="ns-wrap" style={{ position: "relative" }}>
        <div className="ns-trigger" style={{ opacity: 1, cursor: "default", pointerEvents: "none" }}>
          <span>{label}</span>
        </div>
      </div>
    );
  }

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
          {[{ value: "", label: placeholder }, ...options].map(opt => (
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

const ESTADOS_LOTE = [
  { value: "DISPONIBLE", label: "Disponible" },
  { value: "RESERVADO", label: "Reservado" },
  { value: "VENDIDO", label: "Vendido" },
  { value: "NO_DISPONIBLE", label: "No Disponible" },
  { value: "ALQUILADO", label: "Alquilado" },
  { value: "EN_PROMOCION", label: "En Promoción" },
];

const SUBESTADOS_LOTE = [
  { value: "NO_CONSTRUIDO", label: "No Construido" },
  { value: "EN_CONSTRUCCION", label: "En Construcción" },
  { value: "CONSTRUIDO", label: "Construido" },
];

const FALLBACK_IMAGE =
  "/placeholder.svg?width=720&height=360&text=Sin+imagen+disponible";

/**
 * LoteVerCard
 * - Overlay con tarjeta de dos columnas: detalle del lote + carrusel/documentos.
 * - Alinea las etiquetas calculando un ancho único según el label más largo.
 * - Expone botones de cabecera (Editar / Reservar) y tres botones inferiores para documentos.
 */
export default function LoteVerCard({
  open,
  onClose,
  onEdit,
  onReserve,
  onOpenDocument,
  onUpdated,
  lote,
  loteId,
  lotes,
}) {
  const resolvedLot = useMemo(() => {
    if (lote) return lote;
    if (loteId != null && Array.isArray(lotes)) {
      return lotes.find((l) => `${l.id}` === `${loteId}`) || null;
    }
    return null;
  }, [lote, loteId, lotes]);

  const [currentLot, setCurrentLot] = useState(resolvedLot);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    setCurrentLot(resolvedLot);
  }, [resolvedLot]);

  useEffect(() => {
    if (!open) setEditOpen(false);
  }, [open]);

  const lot = currentLot;

  const NA = "Sin información";
  const isBlank = (v) =>
    v === null ||
    v === undefined ||
    (typeof v === "string" && v.trim().length === 0);

  const safe = (v) => (isBlank(v) ? NA : v);

  const titleCase = (s) => {
    if (isBlank(s)) return NA;
    return String(s)
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const fmtMeters = (v) => {
    if (isBlank(v)) return NA;
    const n = Number(v);
    if (!isFinite(n)) return NA;
    return `${n.toLocaleString("es-AR", {
      maximumFractionDigits: 2,
    })} m`;
  };

  const fmtSurface = (v) => {
    if (isBlank(v)) return NA;
    const n = Number(v);
    if (!isFinite(n)) return NA;
    return `${n.toLocaleString("es-AR", {
      maximumFractionDigits: 2,
    })} m²`;
  };

  const fmtMoney = (v) => {
    if (isBlank(v)) return NA;
    const n =
      typeof v === "number"
        ? v
        : Number(String(v).replace(/[^\d.-]/g, ""));
    if (!isFinite(n)) return NA;
    return n.toLocaleString("es-AR", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  };

  const fmtBoolean = (v) => {
    if (v === null || v === undefined) return NA;
    return v ? "Si" : "No";
  };

  const fmtDate = (d) => {
    if (isBlank(d)) return NA;
    const date =
      typeof d === "string" || typeof d === "number" ? new Date(d) : d;
    return isNaN(date?.getTime?.()) ? NA : date.toLocaleDateString("es-AR");
  };

  const ownerName = useMemo(() => {
    const p =
      lot?.propietario ||
      lot?.owner ||
      lot?.Propietario ||
      null;
    if (!p) return safe(lot?.owner);
    const nombre =
      p.nombre || p.firstName || p.username || p.name;
    const apellido = p.apellido || p.lastName || p.surname;
    const full = [nombre, apellido].filter(Boolean).join(" ");
    return safe(full || nombre || apellido);
  }, [lot]);

  const ubicacion = useMemo(() => {
    if (isBlank(lot?.location)) return safe(
      lot?.ubicacion
        ? `Calle ${lot.ubicacion?.calle ?? lot.ubicacion?.nombre ?? "-"} ${
            lot.ubicacion?.numero != null ? `Nº ${lot.ubicacion.numero}` : ""
          }`.trim()
        : null
    );
    return safe(lot.location);
  }, [lot]);

  const fraccion = safe(
    lot?.fraccion?.numero ??
      lot?.fraccionNumero ??
      lot?.fraccionId ??
      lot?.fraccion
  );

    // Función helper para obtener el valor del estado/subestado en formato que coincida con las opciones
    const getEstadoValue = (estado) => {
      if (!estado) return "";
      const normalized = String(estado).toUpperCase().replace(/\s+/g, "_");
      return normalized;
    };

    const leftPairs = [
      ["ID", safe(lot?.mapId ?? lot?.id)],
      ["NUMERO PARTIDA", safe(lot?.numPartido ?? lot?.numeroPartida)],
      ["NUMERO FRACCION", fraccion],
      ["TIPO", titleCase(lot?.tipo)],
      ["ESTADO", getEstadoValue(lot?.estado ?? lot?.status)],
      ["SUB-ESTADO", getEstadoValue(lot?.subestado ?? lot?.subStatus)],
      ["PROPIETARIO", ownerName],
      ["UBICACION", ubicacion],
    ];

  const rightPairs = [
    ["SUPERFICIE", fmtSurface(lot?.superficie ?? lot?.surface)],
    ["FRENTE", fmtMeters(lot?.frente)],
    ["FONDO", fmtMeters(lot?.fondo)],
    ["PRECIO", fmtMoney(lot?.precio ?? lot?.price)],
    ["ALQUILER", fmtBoolean(lot?.alquiler)],
    ["DEUDA", fmtBoolean(lot?.deuda)],
    ["CREADO", fmtDate(lot?.createdAt ?? lot?.creadoEl)],
    ["ACTUALIZADO", fmtDate(lot?.updatedAt ?? lot?.updateAt)],
  ];

  const docs = useMemo(() => {
    if (!lot) return [];
    const pool = []
      .concat(lot.archivos ?? [])
      .concat(lot.files ?? [])
      .concat(lot.documentos ?? []);
    return pool;
  }, [lot]);

  const getDocByType = (type) => {
    const match = docs.find(
      (f) => (f.tipo || f.type || "").toUpperCase() === type
    );
    if (!match) return null;
    return {
      ...match,
      url: match.url || match.linkArchivo || match.signedUrl || null,
    };
  };

  const docButtons = [
    { label: "Escritura", type: "ESCRITURA" },
    { label: "Boleto CompraVenta", type: "BOLETO" },
    { label: "Planos", type: "PLANO" },
  ].map((btn) => ({
    ...btn,
    file: getDocByType(btn.type),
  }));

  const imageSources = useMemo(() => {
    const fromFiles = docs
      .filter(
        (f) => (f.tipo || f.type || "").toUpperCase() === "IMAGEN"
      )
      .map((f) => f.url || f.linkArchivo)
      .filter(Boolean);
    const fromLegacy = Array.isArray(lot?.images) ? lot.images : [];
    return [...fromFiles, ...fromLegacy].filter(Boolean);
  }, [docs, lot?.images]);

  const descriptionText = safe(lot?.descripcion ?? lot?.description);

  const [currentImage, setCurrentImage] = useState(0);
  useEffect(() => {
    setCurrentImage(0);
  }, [lot?.id, open]);

  const images = imageSources.length > 0 ? imageSources : [FALLBACK_IMAGE];
  const showCarouselControls = imageSources.length > 1;

  const handlePrev = () =>
    setCurrentImage((idx) =>
      idx === 0 ? images.length - 1 : idx - 1
    );
  const handleNext = () =>
    setCurrentImage((idx) =>
      idx === images.length - 1 ? 0 : idx + 1
    );

  const infoPairs = [...leftPairs, ...rightPairs];

  const containerRef = useRef(null);
  const [labelWidth, setLabelWidth] = useState(190);
  useEffect(() => {
    const labels = infoPairs.map(([label]) => label);
    const longest = Math.max(...labels.map((l) => l.length));
    const computed = Math.min(
      260,
      Math.max(160, Math.round(longest * 8.2) + 22)
    );
    setLabelWidth(computed);
  }, [leftPairs, rightPairs, open]);

  if (!open || !lot) return null;

  const valueStyle = (val) => ({
    color: val === NA ? "#6B7280" : "#111827",
  });

  const handleOpenDocument = (type, file) => {
    if (!onOpenDocument) return;
    onOpenDocument({ type, file, lote: lot });
  };

  return (
    <div className="cclf-overlay" onClick={onClose}>
      <div
        className="cclf-card"
        onClick={(e) => e.stopPropagation()}
        ref={containerRef}
        style={{ ["--sale-label-w"]: `${labelWidth}px` }}
      >
        <div className="cclf-card__header">
          <h2 className="cclf-card__title">{`Lote Nº ${safe(lot?.mapId ?? lot?.id)}`}</h2>

          <div className="cclf-card__actions lote-header-actions">
            <button
              type="button"
              className="cclf-tab thin"
              onClick={() => {
              if (!lot) return;
              if (onEdit) {
                onEdit(lot);
              } else {
                setEditOpen(true);
              }
            }}
            >
              Editar Lote
            </button>
            <button
              type="button"
              className="cclf-tab thin reserve"
              onClick={() => lot && onReserve?.(lot)}
            >
              {lot?.estado === "RESERVADO" || String(lot?.estado || "").toUpperCase() === "RESERVADO" ? "Ver Reserva" : "Reservar"}
            </button>
            <button
              type="button"
              className="cclf-btn-close"
              onClick={onClose}
              aria-label="Cerrar"
            >
              <span className="cclf-btn-close__x">×</span>
            </button>
          </div>
        </div>

        <div className="cclf-card__body">
          <h3 className="lote-info-title">Información del lote</h3>

          <div
            className="lote-grid"
            style={{ ["--sale-label-w"]: `${labelWidth}px` }}
          >
            <div className="lote-data-col">
              {infoPairs.map(([label, value]) => {
                // Si es ESTADO o SUB-ESTADO, usar NiceSelect disabled pero con estilo normal (sin gris)
                if (label === "ESTADO") {
                  return (
                    <div className="field-row" key={label}>
                      <div className="field-label">{label}</div>
                      <div className="field-value p0">
                        <NiceSelect
                          value={value}
                          options={ESTADOS_LOTE}
                          placeholder="Sin información"
                          disabled={true}
                        />
                      </div>
                    </div>
                  );
                }
                if (label === "SUB-ESTADO") {
                  return (
                    <div className="field-row" key={label}>
                      <div className="field-label">{label}</div>
                      <div className="field-value p0">
                        <NiceSelect
                          value={value}
                          options={SUBESTADOS_LOTE}
                          placeholder="Sin información"
                          disabled={true}
                        />
                      </div>
                    </div>
                  );
                }
                // Para otros campos, mostrar texto normal
                return (
                  <div className="field-row" key={label}>
                    <div className="field-label">{label}</div>
                    <div className="field-value" style={valueStyle(value)}>
                      {value}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="lote-media-col">
              <div className="lote-carousel">
                <img
                  src={images[currentImage]}
                  alt={`Imagen lote ${safe(lot?.id)} ${currentImage + 1}`}
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
                      {images.map((_, idx) => (
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

              <div className="lote-description">
                <span className="lote-description__icon">ℹ️</span>
                <div className="lote-description__body">
                  <strong>Descripción</strong>
                  <p style={{ margin: "8px 0 0" }}>
                    {descriptionText === NA
                      ? "Sin descripción disponible para este lote."
                      : descriptionText}
                  </p>
                </div>
              </div>

              <div className="lote-doc-buttons" style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {docButtons.map(({ label, type, file }, index) => {
                  // Escritura ocupa toda la primera fila, luego Boleto y Planos comparten la segunda fila
                  const flexStyle = index === 0 
                    ? { flex: "1 1 100%" } 
                    : { flex: "1 1 calc(50% - 4px)" };
                  
                  return (
                    <button
                      key={type}
                      type="button"
                      className="lote-doc-button"
                      disabled={!file}
                      onClick={() => file && handleOpenDocument(type, file)}
                      style={flexStyle}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      <LoteEditarCard
        open={editOpen}
        lote={lot}
        loteId={lot?.id}
        lotes={lotes}
        onCancel={() => setEditOpen(false)}
        onSaved={(updated) => {
          setEditOpen(false);
          if (updated) {
            setCurrentLot(updated);
            onUpdated?.(updated);
          }
        }}
      />
    </div>
  );
}










