// src/components/Cards/Documentos/DocumentoVerCard.jsx
import { useState, useEffect } from "react";
import "../../../styles/tokens.css";
import "../Base/cards.css";
import { getArchivosByLote } from "../../../lib/api/archivos";
import { loadLocalDocs } from "../../../lib/storage/docsLocal";

// Placeholder URLs - estas se pueden reemplazar con URLs reales
const PLACEHOLDER_URLS = {
  BOLETO: "https://via.placeholder.com/800x1000?text=Boleto+de+Compraventa",
  ESCRITURA: "https://via.placeholder.com/800x1000?text=Escritura",
  PLANOS: "https://via.placeholder.com/800x1000?text=Planos",
};

// Textos informativos para cada tipo de documento
const DOC_INFO = {
  BOLETO: {
    title: "Boleto de Compraventa",
    description: "", // Sin texto descriptivo, solo el título
  },
  ESCRITURA: {
    title: "Escritura",
    description: "", // Sin texto descriptivo, solo el título
  },
  PLANOS: {
    title: "Planos",
    description: "", // Sin texto descriptivo, solo el título
  },
};

export default function DocumentoVerCard({
  open,
  onClose,
  onVolverAtras, // Nueva prop para volver al dropdown
  tipoDocumento,
  loteId,
  loteNumero,
  documentoUrl,
  documentoArchivo,
  selectedDoc, // para custom/local docs
  onModificar,
  onDescargar,
}) {
  const [currentImageUrl, setCurrentImageUrl] = useState("");
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState("");
  const [archivos, setArchivos] = useState([]);
  const [loadingArchivos, setLoadingArchivos] = useState(false);
  const [documentoActual, setDocumentoActual] = useState(null);

  // Mapeo de tipos del frontend al backend
  const TIPO_MAP = {
    BOLETO: "BOLETO",
    ESCRITURA: "ESCRITURA",
    PLANOS: "PLANO", // En el backend es PLANO, no PLANOS
  };

  // Cargar archivos del lote cuando se abre el modal
  useEffect(() => {
    if (open && loteId) {
      setLoadingArchivos(true);
      (async () => {
        try {
          const archivosDelLote = await getArchivosByLote(loteId);
          const locales = loadLocalDocs(loteId).map((d) => ({
            id: d.id,
            filename: d.nombre,
            url: d.link,
            tipo: d.tipo || "OTRO",
            uploadedAt: d.createdAt,
            uploadedBy: "Local",
            idLoteAsociado: loteId,
            isLocal: true,
          }));
          const merged = [...archivosDelLote, ...locales];
          setArchivos(merged);

          let docEncontrado = null;
          if (selectedDoc && selectedDoc.id) {
            docEncontrado = merged.find((a) => a.id === selectedDoc.id || a.filename === selectedDoc.nombre);
          } else if (tipoDocumento) {
            const tipoBackend = TIPO_MAP[tipoDocumento] || tipoDocumento;
            docEncontrado = merged.find((a) => a.tipo === tipoBackend);
          }

          if (docEncontrado) {
            setDocumentoActual(docEncontrado);
            setCurrentImageUrl(docEncontrado.url);
            setTempImageUrl(docEncontrado.url);
          } else {
            setDocumentoActual(null);
            setCurrentImageUrl("");
            setTempImageUrl("");
          }
        } catch (error) {
          console.error("Error cargando archivos:", error);
          setArchivos([]);
          setDocumentoActual(null);
          setCurrentImageUrl("");
          setTempImageUrl("");
        } finally {
          setLoadingArchivos(false);
        }
      })();
    }
  }, [open, tipoDocumento, loteId]);

  // Resetear cuando se cierra
  useEffect(() => {
    if (!open) {
      setCurrentImageUrl("");
      setTempImageUrl("");
      setIsEditingImage(false);
      setArchivos([]);
      setDocumentoActual(null);
    }
  }, [open]);

  if (!open) return null;

  const info = DOC_INFO[tipoDocumento] || { title: selectedDoc?.nombre || "Documento", description: "" };
  
  // Función para limpiar el mapId (eliminar "Lote" del inicio si está presente)
  const limpiarMapId = (mapId) => {
    if (!mapId) return mapId;
    const str = String(mapId);
    // Eliminar "Lote" o "lote" del inicio (case insensitive)
    return str.replace(/^lote\s*/i, "").trim() || str;
  };
  
  const numeroLote = limpiarMapId(loteNumero) || loteId || "XXXX";
  
  // Título dinámico según el tipo de documento
  const titulo = selectedDoc?.nombre
    ? `${selectedDoc.nombre} - Lote N° ${numeroLote}`
    : tipoDocumento === "BOLETO"
    ? `Boleto de CompraVenta de Lote N° ${numeroLote}`
    : tipoDocumento === "ESCRITURA"
    ? `Escritura de Lote N° ${numeroLote}`
    : `Planos de Lote N° ${numeroLote}`;

  const handleModificar = () => {
    if (isEditingImage) {
      // Guardar cambios
      setCurrentImageUrl(tempImageUrl);
      setIsEditingImage(false);
      onModificar?.(tempImageUrl);
    } else {
      // Activar modo edición
      setIsEditingImage(true);
    }
  };

  const handleCancelarEdicion = () => {
    setTempImageUrl(currentImageUrl);
    setIsEditingImage(false);
  };

  const handleDescargar = () => {
    if (currentImageUrl) {
      // Crear un enlace temporal para descargar
      const link = document.createElement("a");
      link.href = currentImageUrl;
      link.download = `${info.title.replace(/\s+/g, "_")}_Lote_${loteNumero || loteId || "N"}.${getFileExtension(currentImageUrl)}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onDescargar?.(currentImageUrl);
    }
  };

  const getFileExtension = (url) => {
    if (!url) return "jpg";
    const match = url.match(/\.([a-z]{3,4})(?:[\?#]|$)/i);
    return match ? match[1] : "jpg";
  };

  return (
    <div className="c-backdrop" onClick={onClose}>
      <div
        className="c-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(1200px, 95vw)",
          maxHeight: "90vh",
        }}
      >
        <header className="c-header">
          <h2 className="c-title">{titulo}</h2>
          <button
            type="button"
            className="cclf-btn-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <span className="cclf-btn-close__x">×</span>
          </button>
        </header>

        <div className="c-body" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px", overflow: "hidden", minHeight: 0 }}>
          {/* Contenedor principal: Preview + Info */}
          <div style={{ display: "flex", gap: "24px", flex: "1", minHeight: 0, overflow: "hidden" }}>
            {/* Columna izquierda: Preview del documento */}
            <div
              style={{
                flex: "2",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                overflow: "hidden",
                minWidth: 0,
              }}
            >
            <div
              style={{
                flex: "1",
                backgroundColor: "#f9fafb",
                border: "1px solid rgba(0,0,0,.1)",
                borderRadius: "8px",
                overflow: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "500px",
                maxHeight: "calc(90vh - 300px)",
              }}
            >
              {isEditingImage ? (
                <div
                  style={{
                    width: "100%",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <label style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>
                    URL de la imagen:
                  </label>
                  <input
                    type="text"
                    value={tempImageUrl}
                    onChange={(e) => setTempImageUrl(e.target.value)}
                    placeholder="Ingrese la URL de la imagen..."
                    style={{
                      padding: "10px 12px",
                      border: "1px solid rgba(0,0,0,.18)",
                      borderRadius: "6px",
                      fontSize: "14px",
                      width: "100%",
                    }}
                  />
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleModificar}
                      style={{ flex: 1 }}
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={handleCancelarEdicion}
                      style={{ flex: 1 }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : loadingArchivos ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                  <div style={{ marginBottom: "12px" }}>Cargando documento...</div>
                </div>
              ) : documentoActual && currentImageUrl ? (
                currentImageUrl.toLowerCase().includes("pdf") || currentImageUrl.toLowerCase().includes("application/pdf") ? (
                  <embed
                    src={currentImageUrl}
                    type="application/pdf"
                    style={{ width: "100%", height: "100%", borderRadius: "8px" }}
                  />
                ) : (
                  <img
                    src={currentImageUrl}
                    alt={info.title}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                    }}
                    onError={(e) => {
                      e.target.src = PLACEHOLDER_URLS[tipoDocumento] || PLACEHOLDER_URLS.BOLETO;
                    }}
                  />
                )
              ) : (
                <div style={{ 
                  padding: "40px", 
                  textAlign: "center", 
                  color: "#6b7280",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%"
                }}>
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>📄</div>
                  <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>
                    No hay documentos asignados
                  </div>
                  <div style={{ fontSize: "14px", color: "#9ca3af" }}>
                    Este lote no tiene {info.title.toLowerCase()} asignado
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Columna derecha: Información + Botones */}
          <div
            style={{
              flex: "1",
              display: "flex",
              flexDirection: "column",
              minWidth: "280px",
              gap: "20px",
            }}
          >
            {/* Caja informativa - siempre visible, arriba */}
            <div
              style={{
                backgroundColor: "#f3f4f6",
                border: "1px solid rgba(0,0,0,.1)",
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    backgroundColor: "#6b7280",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: "bold",
                    flexShrink: 0,
                  }}
                >
                  i
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
                    {info.title}
                  </h3>
                </div>
              </div>
            </div>

            {/* Botones de acción - Abajo a la derecha dentro de la columna */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "auto" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {}}
              disabled={!documentoActual && !isEditingImage}
              style={{
                minWidth: "120px",
                background: "#2849AF",
                border: "1px solid #000",
                color: "#fff",
                boxShadow: "0 4px 10px rgba(40,73,175,.22)"
              }}
            >
              Modificar
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {}}
              disabled={!documentoActual || !currentImageUrl}
              style={{
                minWidth: "120px",
                background: "#2849AF",
                border: "1px solid #000",
                color: "#fff",
                boxShadow: "0 4px 10px rgba(40,73,175,.22)"
              }}
            >
              Descargar
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => {
                if (onVolverAtras) {
                  onVolverAtras();
                } else {
                  onClose?.();
                }
              }}
              style={{
                backgroundColor: "#065f46",
                color: "white",
                borderColor: "#065f46",
                minWidth: "120px"
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#054d37";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#065f46";
              }}
            >
              Volver Atrás
            </button>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

