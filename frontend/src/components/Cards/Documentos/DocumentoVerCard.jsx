import { useState, useEffect } from "react";
import "../../../styles/tokens.css";
import "../Base/cards.css";
import { getArchivosByLote, getFileSignedUrl } from "../../../lib/api/archivos";

const DOC_INFO = {
  BOLETO: { title: "Boleto de Compraventa" },
  ESCRITURA: { title: "Escritura" },
  PLANOS: { title: "Planos" },
};

const TIPO_MAP = {
  BOLETO: "BOLETO",
  ESCRITURA: "ESCRITURA",
  PLANOS: "PLANO",
};

export default function DocumentoVerCard({
  open,
  onClose,
  onVolverAtras,
  tipoDocumento,
  loteId,
  loteNumero,
  selectedDoc,
  onModificar,
  onDescargar,
}) {
  const [signedUrl, setSignedUrl] = useState("");
  const [loadingArchivos, setLoadingArchivos] = useState(false);
  const [documentoActual, setDocumentoActual] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && loteId) {
      setLoadingArchivos(true);
      setError("");
      (async () => {
        try {
          const archivosDelLote = await getArchivosByLote(loteId);

          let docEncontrado = null;
          if (selectedDoc && selectedDoc.id) {
            docEncontrado = archivosDelLote.find(
              (a) => a.id === selectedDoc.id || a.filename === selectedDoc.nombre
            );
          } else if (tipoDocumento) {
            const tipoBackend = TIPO_MAP[tipoDocumento] || tipoDocumento;
            docEncontrado = archivosDelLote.find((a) => a.tipo === tipoBackend);
          }

          if (docEncontrado) {
            setDocumentoActual(docEncontrado);
            // Signed URL obligatoria para visualizar
            const url = await getFileSignedUrl(docEncontrado.id);
            if (url) {
              setSignedUrl(url);
            } else {
              setError("No se pudo obtener la URL del documento");
            }
          } else {
            setDocumentoActual(null);
            setSignedUrl("");
          }
        } catch (err) {
          console.error("Error cargando archivos:", err);
          setDocumentoActual(null);
          setSignedUrl("");
          setError("Error al cargar el documento");
        } finally {
          setLoadingArchivos(false);
        }
      })();
    }
  }, [open, tipoDocumento, loteId, selectedDoc]);

  useEffect(() => {
    if (!open) {
      setSignedUrl("");
      setDocumentoActual(null);
      setError("");
    }
  }, [open]);

  if (!open) return null;

  const info = DOC_INFO[tipoDocumento] || {
    title: selectedDoc?.nombre || "Documento",
  };

  const limpiarMapId = (mapId) => {
    if (!mapId) return mapId;
    const str = String(mapId);
    return str.replace(/^lote\s*/i, "").trim() || str;
  };

  const numeroLote = limpiarMapId(loteNumero) || loteId || "XXXX";

  const titulo = selectedDoc?.nombre
    ? `${selectedDoc.nombre} - Lote N° ${numeroLote}`
    : tipoDocumento === "BOLETO"
    ? `Boleto de CompraVenta de Lote N° ${numeroLote}`
    : tipoDocumento === "ESCRITURA"
    ? `Escritura de Lote N° ${numeroLote}`
    : `Planos de Lote N° ${numeroLote}`;

  const getFileExtension = (url) => {
    if (!url) return "jpg";
    const match = url.match(/\.([a-z]{3,4})(?:[?#]|$)/i);
    return match ? match[1] : "jpg";
  };

  const isPdf =
    signedUrl &&
    (documentoActual?.filename?.toLowerCase().endsWith(".pdf") ||
      signedUrl.toLowerCase().includes(".pdf"));

  const handleDescargar = () => {
    if (!signedUrl) return;
    const link = document.createElement("a");
    link.href = signedUrl;
    link.target = "_blank";
    link.download = `${info.title.replace(/\s+/g, "_")}_Lote_${
      loteNumero || loteId || "N"
    }.${getFileExtension(documentoActual?.filename || signedUrl)}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onDescargar?.(signedUrl);
  };

  return (
    <div className="c-backdrop" onClick={onClose}>
      <div
        className="c-card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(1200px, 95vw)", maxHeight: "90vh" }}
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

        <div
          className="c-body"
          style={{
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            overflow: "hidden",
            minHeight: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "24px",
              flex: "1",
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            {/* Preview del documento */}
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
                  backgroundColor: "var(--color-surface, #f9fafb)",
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
                {loadingArchivos ? (
                  <div
                    style={{
                      padding: "40px",
                      textAlign: "center",
                      color: "#6b7280",
                    }}
                  >
                    Cargando documento...
                  </div>
                ) : error ? (
                  <div
                    style={{
                      padding: "40px",
                      textAlign: "center",
                      color: "#dc2626",
                    }}
                  >
                    <div style={{ fontSize: "16px", fontWeight: 600 }}>
                      {error}
                    </div>
                  </div>
                ) : documentoActual && signedUrl ? (
                  isPdf ? (
                    <embed
                      src={signedUrl}
                      type="application/pdf"
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "8px",
                      }}
                    />
                  ) : (
                    <img
                      src={signedUrl}
                      alt={info.title}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                      }}
                    />
                  )
                ) : (
                  <div
                    style={{
                      padding: "40px",
                      textAlign: "center",
                      color: "#6b7280",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                    }}
                  >
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

            {/* Columna derecha: Info + Botones */}
            <div
              style={{
                flex: "1",
                display: "flex",
                flexDirection: "column",
                minWidth: "280px",
                gap: "20px",
              }}
            >
              <div
                style={{
                  backgroundColor: "#f3f4f6",
                  border: "1px solid rgba(0,0,0,.1)",
                  borderRadius: "8px",
                  padding: "16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                  }}
                >
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
                    {documentoActual && (
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: "13px",
                          color: "#6b7280",
                        }}
                      >
                        {documentoActual.filename}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  marginTop: "auto",
                }}
              >
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleDescargar}
                  disabled={!documentoActual || !signedUrl}
                  style={{
                    minWidth: "120px",
                    background: "#2849AF",
                    border: "1px solid #000",
                    color: "#fff",
                    boxShadow: "0 4px 10px rgba(40,73,175,.22)",
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
                    minWidth: "120px",
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
