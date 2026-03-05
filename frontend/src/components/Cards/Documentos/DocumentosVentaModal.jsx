/**
 * DocumentosVentaModal — Etapa 5.2
 * Modal de documentos de venta: Boleto, Escritura, Otros.
 * Usa GET /api/files/venta/:ventaId, no por lote.
 * Subir/Eliminar/Sustituir documentos NO modifica EstadoVenta.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import "../Base/cards.css";
import "./documentos.css";
import {
  getArchivosByVenta,
  getFileSignedUrl,
  uploadArchivo,
  sustituirArchivo,
  deleteArchivo,
} from "../../../lib/api/archivos";

const SECCIONES = [
  { tipo: "BOLETO", label: "Boleto de Compraventa" },
  { tipo: "ESCRITURA", label: "Escritura" },
  { tipo: "OTRO", label: "Otros" },
];

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

export default function DocumentosVentaModal({
  open,
  onClose,
  venta,
  canUpload = false,
  canDelete = false,
}) {
  const ventaId = venta?.id ?? null;
  const loteId = venta?.loteId ?? venta?.lote?.id ?? null;

  const [archivos, setArchivos] = useState({ BOLETO: [], ESCRITURA: [], OTRO: [] });
  const [loading, setLoading] = useState(false);
  const [selectedSeccion, setSelectedSeccion] = useState("BOLETO");
  const [selectedId, setSelectedId] = useState(null);
  const [signedUrl, setSignedUrl] = useState("");
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sustituyendo, setSustituyendo] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInputRef = useRef(null);

  const fetchArchivos = useCallback(async () => {
    if (!ventaId) return;
    setLoading(true);
    setError("");
    try {
      const [boletos, escrituras, otros] = await Promise.all([
        getArchivosByVenta(ventaId, "BOLETO"),
        getArchivosByVenta(ventaId, "ESCRITURA"),
        getArchivosByVenta(ventaId, "OTRO"),
      ]);
      setArchivos({
        BOLETO: boletos.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)),
        ESCRITURA: escrituras.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)),
        OTRO: otros.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)),
      });
    } catch (err) {
      console.error("Error cargando archivos:", err);
      setError("Error al cargar los documentos");
      setArchivos({ BOLETO: [], ESCRITURA: [], OTRO: [] });
    } finally {
      setLoading(false);
    }
  }, [ventaId]);

  const loadSignedUrl = useCallback(async (fileId) => {
    if (!fileId) {
      setSignedUrl("");
      return;
    }
    setLoadingUrl(true);
    setError("");
    try {
      const url = await getFileSignedUrl(fileId);
      setSignedUrl(url || "");
      if (!url) setError("No se pudo obtener la URL del documento");
    } catch {
      setSignedUrl("");
      setError("Error al obtener la URL del documento");
    } finally {
      setLoadingUrl(false);
    }
  }, []);

  useEffect(() => {
    if (open && ventaId) {
      fetchArchivos();
    }
  }, [open, ventaId, fetchArchivos]);

  useEffect(() => {
    if (!open) {
      setArchivos({ BOLETO: [], ESCRITURA: [], OTRO: [] });
      setSelectedId(null);
      setSignedUrl("");
      setError("");
      setConfirmDelete(false);
    }
  }, [open]);

  useEffect(() => {
    const list = archivos[selectedSeccion] || [];
    if (selectedId && list.some((a) => a.id === selectedId)) {
      loadSignedUrl(selectedId);
    } else if (list.length > 0) {
      setSelectedId(list[0].id);
      loadSignedUrl(list[0].id);
    } else {
      setSelectedId(null);
      setSignedUrl("");
    }
  }, [selectedSeccion, archivos, selectedId, loadSignedUrl]);

  const handleSelect = (fileId) => {
    setSelectedId(fileId);
    setSignedUrl("");
    setConfirmDelete(false);
    loadSignedUrl(fileId);
  };

  const handleAgregar = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !loteId || !ventaId) return;
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploading(true);
    setError("");
    try {
      const saved = await uploadArchivo(file, loteId, selectedSeccion, ventaId);
      await fetchArchivos();
      if (saved?.id) {
        setSelectedId(saved.id);
        loadSignedUrl(saved.id);
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
      loadSignedUrl(nuevo.id);
    } catch (err) {
      setError(err?.message || "Error al sustituir documento");
    } finally {
      setSustituyendo(false);
    }
  };

  const handleEliminar = async () => {
    if (!selectedId) return;
    setEliminando(true);
    setError("");
    try {
      await deleteArchivo(selectedId);
      setConfirmDelete(false);
      setSelectedId(null);
      setSignedUrl("");
      await fetchArchivos();
    } catch (err) {
      setError(err?.message || "Error al eliminar documento");
    } finally {
      setEliminando(false);
    }
  };

  const handleDescargar = () => {
    if (!signedUrl) return;
    const list = archivos[selectedSeccion] || [];
    const selected = list.find((a) => a.id === selectedId);
    const link = document.createElement("a");
    link.href = signedUrl;
    link.target = "_blank";
    link.download = selected?.filename || "documento";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!open) return null;

  const list = archivos[selectedSeccion] || [];
  const selectedFile = list.find((a) => a.id === selectedId);
  const sec = SECCIONES.find((s) => s.tipo === selectedSeccion);
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
          <h2 className="c-title">
            Documentos de venta {venta?.numero ? `N° ${venta.numero}` : ""}
          </h2>
          <button
            type="button"
            className="cclf-btn-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <span className="cclf-btn-close__x">×</span>
          </button>
        </header>

        <div className="c-body">
          {/* Tabs de sección */}
          <div className="doc-actions" style={{ paddingBottom: 12, borderBottom: "1px solid rgba(0,0,0,.08)" }}>
            {SECCIONES.map((s) => (
              <button
                key={s.tipo}
                type="button"
                className={`btn ${selectedSeccion === s.tipo ? "btn-primary" : "btn-outline"}`}
                onClick={() => {
                  setSelectedSeccion(s.tipo);
                  setConfirmDelete(false);
                }}
              >
                {s.label} ({archivos[s.tipo]?.length ?? 0})
              </button>
            ))}
          </div>

          <div className="doc-panel">
            <div className="doc-sidebar">
              <div className="doc-sidebar__header">{sec?.label ?? selectedSeccion}</div>
              <div className="doc-sidebar__list">
                {loading ? (
                  <div className="doc-sidebar__empty">Cargando...</div>
                ) : list.length === 0 ? (
                  <div className="doc-sidebar__empty">
                    <span className="doc-sidebar__empty-title">Sin documentos</span>
                    <span>No hay {sec?.label?.toLowerCase() ?? ""} cargados para esta venta</span>
                  </div>
                ) : (
                  list.map((arch) => (
                    <div
                      key={arch.id}
                      className={`doc-sidebar__item${arch.id === selectedId ? " doc-sidebar__item--selected" : ""}`}
                      onClick={() => handleSelect(arch.id)}
                    >
                      <div className="doc-sidebar__item-name">{arch.filename}</div>
                      <div className="doc-sidebar__item-meta">
                        {formatDate(arch.uploadedAt)}
                        {arch.uploadedBy ? ` — ${arch.uploadedBy}` : ""}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="doc-preview">
              <div className="doc-preview__frame">
                {loadingUrl ? (
                  <div className="doc-preview__loading">Cargando vista previa...</div>
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
                  <div className="doc-preview__error">No se pudo cargar la vista previa</div>
                ) : (
                  <div className="doc-preview__placeholder">
                    <span className="doc-preview__placeholder-title">
                      {list.length === 0
                        ? "No hay documentos asignados"
                        : "Seleccioná un documento"}
                    </span>
                    <span className="doc-preview__placeholder-sub">
                      {list.length === 0
                        ? `Esta venta no tiene ${sec?.label?.toLowerCase() ?? ""} cargado`
                        : "Hacé click en un archivo para previsualizarlo"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && <div className="doc-error-inline">{error}</div>}

          {/* Confirmación inline de eliminación */}
          {confirmDelete && selectedId && (
            <div className="doc-confirm-delete">
              <span>
                ¿Eliminar <strong>{selectedFile?.filename}</strong>?
              </span>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleEliminar}
                disabled={eliminando}
              >
                {eliminando ? "Eliminando..." : "Confirmar"}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setConfirmDelete(false)}
                disabled={eliminando}
              >
                Cancelar
              </button>
            </div>
          )}

          <div className="doc-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/jpeg,image/png,image/webp"
              onChange={handleAgregar}
              hidden
            />
            {canUpload && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || sustituyendo || eliminando}
              >
                {uploading ? "Subiendo..." : `Agregar ${sec?.label ?? ""}`}
              </button>
            )}
            {selectedId && canUpload && (
              <>
                <input
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  onChange={handleSustituir}
                  style={{ display: "none" }}
                  id="sustituir-input"
                />
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => document.getElementById("sustituir-input")?.click()}
                  disabled={sustituyendo || uploading || eliminando}
                >
                  {sustituyendo ? "Sustituyendo..." : "Sustituir"}
                </button>
              </>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleDescargar}
              disabled={!selectedId || !signedUrl}
            >
              Descargar
            </button>
            {selectedId && canDelete && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => setConfirmDelete(true)}
                disabled={eliminando || confirmDelete}
              >
                Eliminar
              </button>
            )}
            <div className="doc-actions__spacer" />
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
