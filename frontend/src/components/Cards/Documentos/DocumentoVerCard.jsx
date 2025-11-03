// src/components/Cards/Documentos/DocumentoVerCard.jsx
import { useState, useEffect } from "react";
import "../Base/cards.css";
import { getArchivosByLote } from "../../../lib/api/archivos";

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
    description: "Por aquí acá si es que necesitan algún tipo de info fiscal o lo que sea se podría poner, de quién es el abogado asociado, etc.",
  },
  ESCRITURA: {
    title: "Escritura",
    description: "Por aquí acá si es que necesitan algún tipo de info fiscal o lo que sea se podría poner, de quién es el abogado asociado, etc.",
  },
  PLANOS: {
    title: "Planos",
    description: "Por aquí acá si es que necesitan algún tipo de info fiscal o lo que sea se podría poner, de quién es el técnico asociado, etc.",
  },
};

export default function DocumentoVerCard({
  open,
  onClose,
  tipoDocumento,
  loteId,
  loteNumero,
  documentoUrl,
  documentoArchivo,
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
    if (open && tipoDocumento && loteId) {
      setLoadingArchivos(true);
      (async () => {
        try {
          const archivosDelLote = await getArchivosByLote(loteId);
          setArchivos(archivosDelLote);
          
          // Buscar el documento del tipo seleccionado
          const tipoBackend = TIPO_MAP[tipoDocumento];
          const docEncontrado = archivosDelLote.find(
            (a) => a.tipo === tipoBackend
          );
          
          if (docEncontrado) {
            setDocumentoActual(docEncontrado);
            setCurrentImageUrl(docEncontrado.url);
            setTempImageUrl(docEncontrado.url);
          } else {
            // No hay documento de este tipo, usar placeholder
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

  if (!open || !tipoDocumento) return null;

  const info = DOC_INFO[tipoDocumento] || DOC_INFO.BOLETO;
  // Título dinámico según el tipo de documento
  const titulo = tipoDocumento === "BOLETO"
    ? `Boleto de CompraVenta de Lote N° ${loteNumero || loteId || "XXXX"}`
    : tipoDocumento === "ESCRITURA"
    ? `Escritura de Lote N° ${loteNumero || loteId || "XXXX"}`
    : `Planos de Lote N° ${loteNumero || loteId || "XXXX"}`;

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

        <div className="c-body" style={{ padding: "24px", display: "flex", gap: "24px", overflow: "hidden", flexDirection: "row" }}>
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
                maxHeight: "calc(90vh - 200px)",
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

          {/* Columna derecha: Información y botones */}
          <div
            style={{
              flex: "1",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              minWidth: "280px",
            }}
          >
            {/* Caja informativa - solo se muestra si hay documento */}
            {documentoActual && (
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
                    <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: 600 }}>
                      {info.title}
                    </h3>
                    <p style={{ margin: 0, fontSize: "14px", color: "#4b5563", lineHeight: "1.5" }}>
                      {info.description}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleModificar}
                disabled={!documentoActual && !isEditingImage}
                style={{ width: "100%" }}
              >
                {isEditingImage ? "Guardar Cambios" : "Modificar"}
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDescargar}
                disabled={!documentoActual || !currentImageUrl}
                style={{ width: "100%" }}
              >
                Descargar
              </button>

              <button
                type="button"
                className="btn"
                onClick={onClose}
                style={{
                  width: "100%",
                  backgroundColor: "#065f46",
                  color: "white",
                  borderColor: "#065f46",
                  fontSize: "15px",
                  padding: "12px 16px",
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
  );
}

