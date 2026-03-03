import { useState, useEffect, useRef, useCallback } from "react";
import "../../../styles/tokens.css";
import "../Base/cards.css";
import "./documentos.css";
import {
  getArchivosByLote,
  getFileSignedUrl,
  uploadArchivo,
  deleteArchivo,
} from "../../../lib/api/archivos";

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

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DocumentoVerCard({
  open,
  onClose,
  onVolverAtras,
  tipoDocumento,
  loteId,
  loteNumero,
  canUpload = false,
  canDelete = false,
}) {
  const [archivos, setArchivos] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [signedUrl, setSignedUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const tipoBackend = TIPO_MAP[tipoDocumento] || tipoDocumento;
  const info = DOC_INFO[tipoDocumento] || { title: "Documento" };

  const limpiarMapId = (mapId) => {
    if (!mapId) return mapId;
    const str = String(mapId);
    return str.replace(/^lote\s*/i, "").trim() || str;
  };
  const numeroLote = limpiarMapId(loteNumero) || loteId || "XXXX";

  const titulo =
    tipoDocumento === "BOLETO"
      ? `Boleto de CompraVenta de Lote N\u00B0 ${numeroLote}`
      : tipoDocumento === "ESCRITURA"
      ? `Escritura de Lote N\u00B0 ${numeroLote}`
      : `Planos de Lote N\u00B0 ${numeroLote}`;

  const fetchArchivos = useCallback(async () => {
    if (!loteId) return;
    setLoading(true);
    setError("");
    try {
      const all = await getArchivosByLote(loteId);
      const filtered = all
        .filter((a) => a.tipo === tipoBackend)
        .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      setArchivos(filtered);
      return filtered;
    } catch (err) {
      console.error("Error cargando archivos:", err);
      setError("Error al cargar los documentos");
      setArchivos([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [loteId, tipoBackend]);

  const loadSignedUrl = useCallback(async (fileId) => {
    if (!fileId) {
      setSignedUrl("");
      return;
    }
    setLoadingUrl(true);
    setError("");
    try {
      const url = await getFileSignedUrl(fileId);
      if (url) {
        setSignedUrl(url);
      } else {
        setSignedUrl("");
        setError("No se pudo obtener la URL del documento");
      }
    } catch {
      setSignedUrl("");
      setError("Error al obtener la URL del documento");
    } finally {
      setLoadingUrl(false);
    }
  }, []);

  useEffect(() => {
    if (open && loteId) {
      (async () => {
        const list = await fetchArchivos();
        if (list && list.length > 0) {
          setSelectedId(list[0].id);
          loadSignedUrl(list[0].id);
        } else {
          setSelectedId(null);
          setSignedUrl("");
        }
      })();
    }
  }, [open, loteId, tipoDocumento]);

  useEffect(() => {
    if (!open) {
      setArchivos([]);
      setSelectedId(null);
      setSignedUrl("");
      setError("");
      setUploading(false);
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }, [open]);

  const handleSelect = (fileId) => {
    if (fileId === selectedId) return;
    setSelectedId(fileId);
    setSignedUrl("");
    loadSignedUrl(fileId);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !loteId) return;
    if (fileInputRef.current) fileInputRef.current.value = "";

    setUploading(true);
    setError("");
    try {
      const saved = await uploadArchivo(file, loteId, tipoBackend);
      const list = await fetchArchivos();
      const newId = saved?.id || list?.[0]?.id;
      if (newId) {
        setSelectedId(newId);
        loadSignedUrl(newId);
      }
    } catch (err) {
      setError(err?.message || "Error al subir el archivo");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedId) return;
    setDeleting(true);
    setError("");
    try {
      await deleteArchivo(selectedId);
      setConfirmingDelete(false);
      const list = await fetchArchivos();
      if (list.length > 0) {
        setSelectedId(list[0].id);
        loadSignedUrl(list[0].id);
      } else {
        setSelectedId(null);
        setSignedUrl("");
      }
    } catch (err) {
      setError(err?.message || "Error al eliminar el documento");
    } finally {
      setDeleting(false);
    }
  };

  const handleDescargar = () => {
    if (!signedUrl) return;
    const selected = archivos.find((a) => a.id === selectedId);
    const link = document.createElement("a");
    link.href = signedUrl;
    link.target = "_blank";
    link.download = selected?.filename || "documento";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!open) return null;

  const selectedFile = archivos.find((a) => a.id === selectedId);
  const isPdf =
    selectedFile?.filename?.toLowerCase().endsWith(".pdf") ||
    signedUrl?.toLowerCase().includes(".pdf");

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
            <span className="cclf-btn-close__x">&times;</span>
          </button>
        </header>

        <div className="c-body">
          <div className="doc-panel">
            {/* Sidebar: lista de documentos */}
            <div className="doc-sidebar">
              <div className="doc-sidebar__header">
                {info.title} ({archivos.length})
              </div>
              <div className="doc-sidebar__list">
                {loading ? (
                  <div className="doc-sidebar__empty">Cargando...</div>
                ) : archivos.length === 0 ? (
                  <div className="doc-sidebar__empty">
                    <span className="doc-sidebar__empty-title">
                      Sin documentos
                    </span>
                    <span>
                      No hay {info.title.toLowerCase()} cargados para este lote
                    </span>
                  </div>
                ) : (
                  archivos.map((arch) => (
                    <div
                      key={arch.id}
                      className={`doc-sidebar__item${
                        arch.id === selectedId
                          ? " doc-sidebar__item--selected"
                          : ""
                      }`}
                      onClick={() => handleSelect(arch.id)}
                    >
                      <div className="doc-sidebar__item-name">
                        {arch.filename}
                      </div>
                      <div className="doc-sidebar__item-meta">
                        {formatDate(arch.uploadedAt)}
                        {arch.uploadedBy ? ` \u2014 ${arch.uploadedBy}` : ""}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Preview */}
            <div className="doc-preview">
              <div className="doc-preview__frame">
                {loadingUrl ? (
                  <div className="doc-preview__loading">
                    Cargando vista previa...
                  </div>
                ) : selectedId && signedUrl ? (
                  isPdf ? (
                    <embed
                      src={signedUrl}
                      type="application/pdf"
                      title={selectedFile?.filename}
                    />
                  ) : (
                    <img src={signedUrl} alt={selectedFile?.filename || ""} />
                  )
                ) : selectedId && !signedUrl && !loadingUrl ? (
                  <div className="doc-preview__error">
                    No se pudo cargar la vista previa
                  </div>
                ) : (
                  <div className="doc-preview__placeholder">
                    <span className="doc-preview__placeholder-title">
                      {archivos.length === 0
                        ? "No hay documentos asignados"
                        : "Seleccion\u00E1 un documento"}
                    </span>
                    <span className="doc-preview__placeholder-sub">
                      {archivos.length === 0
                        ? `Este lote no tiene ${info.title.toLowerCase()} cargado`
                        : "Hac\u00E9 click en un archivo de la lista para previsualizarlo"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && <div className="doc-error-inline">{error}</div>}

          {/* Confirmación inline de eliminación */}
          {confirmingDelete && selectedFile && (
            <div className="doc-confirm-delete">
              <span className="doc-confirm-delete__msg">
                {"¿Eliminar \""}{selectedFile.filename}{"\"?"}
              </span>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? "Eliminando..." : "Confirmar"}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Barra de acciones */}
          <div className="doc-actions">
            {canUpload && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  onChange={handleUpload}
                  hidden
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || confirmingDelete}
                >
                  {uploading ? "Subiendo..." : "Agregar"}
                </button>
              </>
            )}

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleDescargar}
              disabled={!selectedId || !signedUrl || confirmingDelete}
            >
              Descargar
            </button>

            {canDelete && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => setConfirmingDelete(true)}
                disabled={!selectedId || confirmingDelete}
              >
                Eliminar
              </button>
            )}

            <div className="doc-actions__spacer" />

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                if (confirmingDelete) {
                  setConfirmingDelete(false);
                  return;
                }
                if (onVolverAtras) {
                  onVolverAtras();
                } else {
                  onClose?.();
                }
              }}
            >
              {"Volver Atrás"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
