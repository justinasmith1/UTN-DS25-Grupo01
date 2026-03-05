import { useState, useEffect, useRef, useCallback } from "react";
import "../../../styles/tokens.css";
import "../Base/cards.css";
import "./documentos.css";
import {
  getArchivosByLote,
  getArchivosByVenta,
  getFileSignedUrl,
  uploadArchivo,
  deleteArchivo,
  sustituirArchivo,
} from "../../../lib/api/archivos";

const DOC_INFO = {
  BOLETO: { title: "Boleto de Compraventa" },
  ESCRITURA: { title: "Escritura" },
  PLANOS: { title: "Planos" },
  OTRO: { title: "Otros" },
};

const TIPO_MAP = {
  BOLETO: "BOLETO",
  ESCRITURA: "ESCRITURA",
  PLANOS: "PLANO",
  OTRO: "OTRO",
};

const TIPOS_VENTA = ["BOLETO", "ESCRITURA", "OTRO"];

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
  ventaId,
  ventaNumero,
  canUpload = false,
  canDelete = false,
}) {
  const [archivos, setArchivos] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const previewBlobRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [sustituyendo, setSustituyendo] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const tipoBackend = TIPO_MAP[tipoDocumento] || tipoDocumento;
  const info = DOC_INFO[tipoDocumento] || { title: "Documento" };
  const esDocVenta = TIPOS_VENTA.includes(tipoDocumento) && Boolean(ventaId);

  const limpiarMapId = (mapId) => {
    if (!mapId) return mapId;
    const str = String(mapId);
    return str.replace(/^lote\s*/i, "").trim() || str;
  };
  const numeroLote = limpiarMapId(loteNumero) || loteId || "XXXX";

  const titulo = esDocVenta
    ? tipoDocumento === "BOLETO"
      ? `Boleto de CompraVenta — Venta N\u00B0 ${ventaNumero || "?"}`
      : tipoDocumento === "ESCRITURA"
      ? `Escritura — Venta N\u00B0 ${ventaNumero || "?"}`
      : `Otros documentos — Venta N\u00B0 ${ventaNumero || "?"}`
    : tipoDocumento === "BOLETO"
    ? `Boletos del Lote N\u00B0 ${numeroLote}`
    : tipoDocumento === "ESCRITURA"
    ? `Escrituras del Lote N\u00B0 ${numeroLote}`
    : `Planos del Lote N\u00B0 ${numeroLote}`;

  const entityLabel = esDocVenta ? "esta venta" : "este lote";
  // En contexto lote, BOLETO/ESCRITURA/OTRO requieren ventaId para subir; solo PLANOS se puede agregar
  const canUploadEffective = canUpload && (esDocVenta || tipoDocumento === "PLANOS");

  const fetchArchivos = useCallback(async () => {
    if (esDocVenta && !ventaId) return [];
    if (!esDocVenta && !loteId) return [];
    setLoading(true);
    setError("");
    try {
      let filtered;
      if (esDocVenta) {
        filtered = await getArchivosByVenta(ventaId, tipoBackend);
      } else {
        const all = await getArchivosByLote(loteId);
        filtered = all.filter((a) => a.tipo === tipoBackend);
      }
      filtered.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
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
  }, [esDocVenta, ventaId, loteId, tipoBackend]);

  const loadingFileIdRef = useRef(null);
  const loadPreviewUrl = useCallback(async (fileId, filename) => {
    if (!fileId) {
      if (previewBlobRef.current) {
        URL.revokeObjectURL(previewBlobRef.current);
        previewBlobRef.current = null;
      }
      setPreviewUrl("");
      loadingFileIdRef.current = null;
      return;
    }
    loadingFileIdRef.current = fileId;
    setLoadingUrl(true);
    setError("");
    if (previewBlobRef.current) {
      URL.revokeObjectURL(previewBlobRef.current);
      previewBlobRef.current = null;
    }
    try {
      const signedUrl = await getFileSignedUrl(fileId);
      if (loadingFileIdRef.current !== fileId) return;
      if (!signedUrl) {
        setPreviewUrl("");
        setError("No se pudo obtener la URL del documento");
        return;
      }
      const res = await fetch(signedUrl);
      if (loadingFileIdRef.current !== fileId) return;
      if (!res.ok) throw new Error("Error al cargar vista previa");
      const blob = await res.blob();
      if (loadingFileIdRef.current !== fileId) return;
      const isPdf = (filename || "").toLowerCase().endsWith(".pdf");
      const mime = isPdf ? "application/pdf" : (blob.type || "image/jpeg");
      const blobWithType = blob.type !== mime ? new Blob([blob], { type: mime }) : blob;
      const objectUrl = URL.createObjectURL(blobWithType);
      previewBlobRef.current = objectUrl;
      setPreviewUrl(objectUrl);
    } catch {
      if (loadingFileIdRef.current !== fileId) return;
      setPreviewUrl("");
      setError("Error al obtener la URL del documento");
    } finally {
      if (loadingFileIdRef.current === fileId) {
        loadingFileIdRef.current = null;
        setLoadingUrl(false);
      }
    }
  }, []);

  useEffect(() => {
    if (open && (esDocVenta ? ventaId : loteId)) {
      (async () => {
        const list = await fetchArchivos();
        if (list && list.length > 0) {
          const first = list[0];
          setSelectedId(first.id);
          loadPreviewUrl(first.id, first.filename);
        } else {
          setSelectedId(null);
          setPreviewUrl("");
        }
      })();
    }
  }, [open, loteId, ventaId, tipoDocumento, fetchArchivos, loadPreviewUrl]);

  useEffect(() => {
    if (!open) {
      if (previewBlobRef.current) {
        URL.revokeObjectURL(previewBlobRef.current);
        previewBlobRef.current = null;
      }
      setArchivos([]);
      setSelectedId(null);
      setPreviewUrl("");
      setError("");
      setUploading(false);
      setDeleting(false);
      setConfirmingDelete(false);
      setSustituyendo(false);
    }
  }, [open]);

  const handleSelect = (fileId) => {
    if (fileId === selectedId) return;
    const arch = archivos.find((a) => a.id === fileId);
    setSelectedId(fileId);
    setPreviewUrl("");
    setConfirmingDelete(false);
    loadPreviewUrl(fileId, arch?.filename);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !loteId) return;
    if (fileInputRef.current) fileInputRef.current.value = "";

    setUploading(true);
    setError("");
    try {
      const saved = await uploadArchivo(
        file,
        loteId,
        tipoBackend,
        esDocVenta ? ventaId : undefined
      );
      const list = await fetchArchivos();
      const newFile = saved || list?.[0];
      const newId = newFile?.id;
      if (newId) {
        setSelectedId(newId);
        loadPreviewUrl(newId, newFile?.filename);
      }
    } catch (err) {
      setError(err?.message || "Error al subir el archivo");
    } finally {
      setUploading(false);
    }
  };

  const handleSustituir = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    setSustituyendo(true);
    setError("");
    try {
      const nuevo = await sustituirArchivo(selectedId, file);
      await fetchArchivos();
      setSelectedId(nuevo.id);
      loadPreviewUrl(nuevo.id, nuevo.filename);
    } catch (err) {
      setError(err?.message || "Error al sustituir documento");
    } finally {
      setSustituyendo(false);
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
        const first = list[0];
        setSelectedId(first.id);
        loadPreviewUrl(first.id, first.filename);
      } else {
        setSelectedId(null);
        setPreviewUrl("");
      }
    } catch (err) {
      setError(err?.message || "Error al eliminar el documento");
    } finally {
      setDeleting(false);
    }
  };

  const handleDescargar = async () => {
    if (!selectedId) return;
    const selected = archivos.find((a) => a.id === selectedId);
    try {
      const signedUrl = await getFileSignedUrl(selectedId);
      if (!signedUrl) {
        setError("No se pudo obtener la URL para descargar");
        return;
      }
      const link = document.createElement("a");
      link.href = signedUrl;
      link.download = selected?.filename || "documento";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      setError("Error al descargar el documento");
    }
  };

  if (!open) return null;

  const selectedFile = archivos.find((a) => a.id === selectedId);
  const isPdf = selectedFile?.filename?.toLowerCase().endsWith(".pdf");

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
                      No hay {info.title.toLowerCase()} cargados para {entityLabel}
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
                        {!esDocVenta && arch.ventaNumero && (
                          <span className="doc-sidebar__badge">Venta N° {arch.ventaNumero}</span>
                        )}
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

            <div className="doc-preview">
              <div className="doc-preview__frame">
                {loadingUrl ? (
                  <div className="doc-preview__loading">
                    Cargando vista previa...
                  </div>
                ) : selectedId && previewUrl ? (
                  isPdf ? (
                    <embed
                      src={previewUrl}
                      type="application/pdf"
                      title={selectedFile?.filename}
                    />
                  ) : (
                    <img src={previewUrl} alt={selectedFile?.filename || ""} />
                  )
                ) : selectedId && !previewUrl && !loadingUrl ? (
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
                        ? `No tiene ${info.title.toLowerCase()} cargado`
                        : "Hac\u00E9 click en un archivo de la lista para previsualizarlo"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && <div className="doc-error-inline">{error}</div>}

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

          <div className="doc-actions">
            {canUploadEffective && (
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
                  disabled={uploading || confirmingDelete || sustituyendo}
                >
                  {uploading ? "Subiendo..." : "Agregar"}
                </button>
              </>
            )}

            {selectedId && canUploadEffective && esDocVenta && (
              <>
                <input
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  onChange={handleSustituir}
                  style={{ display: "none" }}
                  id="sustituir-doc-input"
                />
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => document.getElementById("sustituir-doc-input")?.click()}
                  disabled={sustituyendo || uploading || confirmingDelete}
                >
                  {sustituyendo ? "Sustituyendo..." : "Sustituir"}
                </button>
              </>
            )}

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleDescargar}
              disabled={!selectedId || confirmingDelete}
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
