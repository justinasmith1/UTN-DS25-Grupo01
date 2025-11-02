import { useEffect, useMemo, useState } from "react";
import EditarBase from "../Base/EditarBase.jsx";
import { updateLote, getLoteById } from "../../../lib/api/lotes.js";

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
    superficie: lot?.superficie ?? lot?.surface ?? "",
    frente: lot?.frente ?? "",
    fondo: lot?.fondo ?? "",
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
}) {
  const [detalle, setDetalle] = useState(lote || null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [form, setForm] = useState(buildInitialForm(lote));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [newImageUrl, setNewImageUrl] = useState("");
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
    if (!detalle) return;
    setForm(buildInitialForm(detalle));
    setNewImageUrl("");
    setError(null);
  }, [detalle, open]);

  const updateForm = (patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
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

    const superficie = toNumberOrNull(form.superficie);
    if (superficie != null) payload.superficie = superficie;

    const frente = toNumberOrNull(form.frente);
    if (frente != null) payload.frente = frente;

    const fondo = toNumberOrNull(form.fondo);
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
    } catch (err) {
      console.error("Error guardando lote:", err);
      setError(
        err?.message ||
          "No se pudo guardar el lote. Intenta nuevamente."
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <EditarBase
      open={open}
      title={`Editar Lote Nº ${form.id || ""}`}
      onCancel={onCancel}
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
                <select
                  className="field-input"
                  value={form.tipo}
                  onChange={(e) => updateForm({ tipo: e.target.value })}
                >
                  <option value="">Seleccionar tipo</option>
                  {TIPOS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">Estado</div>
              <div className="field-value p0">
                <select
                  className="field-input"
                  value={form.estado}
                  onChange={(e) => updateForm({ estado: e.target.value })}
                >
                  <option value="">Seleccionar estado</option>
                  {ESTADOS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">Sub-Estado</div>
              <div className="field-value p0">
                <select
                  className="field-input"
                  value={form.subestado}
                  onChange={(e) => updateForm({ subestado: e.target.value })}
                >
                  <option value="">Seleccionar sub-estado</option>
                  {SUBESTADOS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">Fracción</div>
              <div className="field-value p0">
                <input
                  className="field-input"
                  type="text"
                  value={form.fraccionNumero ?? ""}
                  onChange={(e) =>
                    updateForm({ fraccionNumero: e.target.value })
                  }
                  placeholder="Número fracción"
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">Superficie</div>
              <div className="field-value p0">
                <input
                  className="field-input"
                  type="number"
                  inputMode="decimal"
                  value={form.superficie ?? ""}
                  onChange={(e) => updateForm({ superficie: e.target.value })}
                  placeholder="Metros cuadrados"
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
          </div>

          <div className="lote-media-col">
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

            <div className="field-row">
              <div className="field-label">Descripción</div>
              <div className="field-value p0">
                <textarea
                  className="field-input"
                  rows={4}
                  value={form.descripcion ?? ""}
                  onChange={(e) =>
                    updateForm({ descripcion: e.target.value })
                  }
                  placeholder="Notas relevantes del lote…"
                />
              </div>
            </div>

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

            <div className="lote-doc-buttons">
              <button type="button" className="lote-doc-button" disabled>
                Escritura
              </button>
              <button type="button" className="lote-doc-button" disabled>
                Boleto CompraVenta
              </button>
              <button type="button" className="lote-doc-button" disabled>
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
  );
}
