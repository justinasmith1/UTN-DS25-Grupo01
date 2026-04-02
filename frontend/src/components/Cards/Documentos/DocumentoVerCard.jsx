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
  restoreArchivo,
  purgeArchivo,
  actualizarAprobacion,
} from "../../../lib/api/archivos";
import { useAuth } from "../../../app/providers/AuthProvider";
import NiceSelect from "../../Base/NiceSelect.jsx";

const APROBACION_ESTADOS = [
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "APROBADO", label: "Aprobado" },
  { value: "RECHAZADO", label: "Rechazado" },
];

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
const TIPOS_SUSTITUIBLES = ["BOLETO", "ESCRITURA", "OTRO", "PLANOS"];

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
  const { user } = useAuth();
  const role = (user?.role ?? "").toString().toUpperCase();
  const showDeletedToggle = ["ADMINISTRADOR", "GESTOR"].includes(role);
  const canRestore = showDeletedToggle;
  const canPurge = role === "ADMINISTRADOR";

  const [archivos, setArchivos] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [viewMode, setViewMode] = useState("ACTIVOS");
  const [loading, setLoading] = useState(false);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const previewBlobRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingDeleteType, setConfirmingDeleteType] = useState("soft"); // 'soft' | 'purge'
  const [sustituyendo, setSustituyendo] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [purging, setPurging] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const sustituirInputRef = useRef(null);

  // Etapa 5.5 — Aprobaciones PLANO
  const esPlano = tipoDocumento === "PLANOS";
  const canEditComision = ["ADMINISTRADOR", "GESTOR", "TECNICO"].includes(role);
  const canEditMunicipio = ["ADMINISTRADOR", "GESTOR"].includes(role);
  const [aprobComision, setAprobComision] = useState({ estado: "", observacion: "" });
  const [aprobMunicipio, setAprobMunicipio] = useState({ estado: "", observacion: "" });
  const [savingAprob, setSavingAprob] = useState(null);
  const [expandedApproval, setExpandedApproval] = useState(null); // 'COMISION' | 'MUNICIPIO' | null

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
  const canUploadEffective = canUpload && (esDocVenta || tipoDocumento === "PLANOS");

  const openConfirm = useCallback((type) => {
    setConfirmingDeleteType(type);
    setConfirmingDelete(true);
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmingDelete(false);
    setConfirmingDeleteType("soft");
  }, []);

  const includeDeleted = viewMode === "ELIMINADOS";

  const fetchArchivos = useCallback(async () => {
    if (esDocVenta && !ventaId) return [];
    if (!esDocVenta && !loteId) return [];
    setLoading(true);
    setError("");
    try {
      let raw;
      if (esDocVenta) {
        raw = await getArchivosByVenta(ventaId, tipoBackend, includeDeleted);
      } else {
        const all = await getArchivosByLote(loteId, includeDeleted);
        raw = all.filter((a) => a.tipo === tipoBackend);
      }
      const filtered = raw.filter((a) =>
        viewMode === "ACTIVOS"
          ? a.estadoOperativo === "OPERATIVO"
          : a.estadoOperativo === "ELIMINADO"
      );
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
  }, [esDocVenta, ventaId, loteId, tipoBackend, viewMode]);

  const handleViewModeChange = useCallback(
    (newMode) => {
      if (newMode === viewMode) return;
      if (previewBlobRef.current) {
        URL.revokeObjectURL(previewBlobRef.current);
        previewBlobRef.current = null;
      }
      setViewMode(newMode);
      setSelectedId(null);
      setPreviewUrl("");
      setError("");
      closeConfirm();
    },
    [viewMode, closeConfirm]
  );

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
    if (!open || !(esDocVenta ? ventaId : loteId)) return;
    (async () => {
      const list = await fetchArchivos();
      if (list && list.length > 0) {
        const first = list[0];
        setSelectedId(first.id);
        const canLoadPreview =
          viewMode === "ACTIVOS" &&
          first &&
          first.estadoOperativo === "OPERATIVO";
        if (canLoadPreview) {
          loadPreviewUrl(first.id, first.filename);
        } else {
          setPreviewUrl("");
        }
      } else {
        setSelectedId(null);
        setPreviewUrl("");
      }
    })();
  }, [open, loteId, ventaId, tipoDocumento, viewMode, fetchArchivos, loadPreviewUrl]);

  useEffect(() => {
    if (!open) {
      if (previewBlobRef.current) {
        URL.revokeObjectURL(previewBlobRef.current);
        previewBlobRef.current = null;
      }
      setArchivos([]);
      setSelectedId(null);
      setPreviewUrl("");
      setViewMode("ACTIVOS");
      setError("");
      setUploading(false);
      setDeleting(false);
      closeConfirm();
      setSustituyendo(false);
      setRestoring(false);
      setPurging(false);
      setSavingAprob(null);
      setExpandedApproval(null);
      setAprobComision({ estado: "", observacion: "" });
      setAprobMunicipio({ estado: "", observacion: "" });
    }
  }, [open, closeConfirm]);

  // Etapa 5.5: sync local state when selectedFile changes
  useEffect(() => {
    if (!esPlano || !selectedId) return;
    const sf = archivos.find((a) => a.id === selectedId);
    if (!sf) return;
    setAprobComision({
      estado: sf.estadoAprobacionComision || "PENDIENTE",
      observacion: sf.observacionAprobacionComision || "",
    });
    setAprobMunicipio({
      estado: sf.estadoAprobacionMunicipio || "PENDIENTE",
      observacion: sf.observacionAprobacionMunicipio || "",
    });
  }, [esPlano, selectedId, archivos]);

  const handleSaveAprobacion = useCallback(async (target) => {
    if (!selectedId) return;
    const local = target === "COMISION" ? aprobComision : aprobMunicipio;
    setSavingAprob(target);
    setError("");
    try {
      const updated = await actualizarAprobacion(selectedId, {
        target,
        estado: local.estado,
        observacion: local.observacion || undefined,
      });
      setArchivos((prev) =>
        prev.map((a) => (a.id === selectedId ? { ...a, ...updated } : a))
      );
      setExpandedApproval(null);
    } catch (err) {
      setError(err?.message || "Error al actualizar aprobación");
    } finally {
      setSavingAprob(null);
    }
  }, [selectedId, aprobComision, aprobMunicipio]);

  const handleRestore = useCallback(async () => {
    if (!selectedId) return;
    setRestoring(true);
    setError("");
    try {
      await restoreArchivo(selectedId);
      if (previewBlobRef.current) {
        URL.revokeObjectURL(previewBlobRef.current);
        previewBlobRef.current = null;
      }
      setViewMode("ACTIVOS");
      setSelectedId(null);
      setPreviewUrl("");
      setConfirmingDelete(false);
    } catch (err) {
      setError(err?.message || "Error al restaurar");
    } finally {
      setRestoring(false);
    }
  }, [selectedId]);

  const handlePurgeConfirm = async () => {
    if (!selectedId) return;
    setPurging(true);
    setError("");
    try {
      await purgeArchivo(selectedId);
      closeConfirm();
      const list = await fetchArchivos();
      if (list.length > 0) {
        setSelectedId(list[0].id);
        setPreviewUrl("");
      } else {
        setSelectedId(null);
        setPreviewUrl("");
      }
    } catch (err) {
      setError(err?.message || "Error al purgar");
    } finally {
      setPurging(false);
    }
  };

  const handleSelect = useCallback((fileId) => {
    if (fileId === selectedId) return;
    const arch = archivos.find((a) => a.id === fileId);
    setSelectedId(fileId);
    setPreviewUrl("");
    closeConfirm();
    setError("");
    if (esPlano) setExpandedApproval(null);
    const canLoadPreview =
      viewMode === "ACTIVOS" && arch?.estadoOperativo === "OPERATIVO";
    if (canLoadPreview) loadPreviewUrl(fileId, arch?.filename);
  }, [archivos, selectedId, viewMode, closeConfirm, loadPreviewUrl, esPlano]);

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
      closeConfirm();
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
  const selectedIsEliminado = selectedFile?.estadoOperativo === "ELIMINADO";
  const esTipoSustituible = TIPOS_SUSTITUIBLES.includes(tipoDocumento);
  const showSustituir =
    selectedId &&
    canUploadEffective &&
    esTipoSustituible &&
    selectedFile?.estadoOperativo === "OPERATIVO";

  return (
    <div className="c-backdrop" onClick={() => !confirmingDelete && onClose?.()}>
      <div
        className="c-card doc-card"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="c-header doc-header">
          <div className="doc-header__left">
            <h2 className="c-title">{titulo}</h2>
            {showDeletedToggle && (
              <div className="doc-view-mode-tabs" role="group" aria-label="Vista de documentos">
                <button
                  type="button"
                  className={`doc-pill-segment ${viewMode === "ACTIVOS" ? "doc-pill-segment--active" : ""}`}
                  onClick={() => handleViewModeChange("ACTIVOS")}
                  disabled={viewMode === "ACTIVOS"}
                >
                  Activos
                </button>
                <button
                  type="button"
                  className={`doc-pill-segment ${viewMode === "ELIMINADOS" ? "doc-pill-segment--active" : ""}`}
                  onClick={() => handleViewModeChange("ELIMINADOS")}
                  disabled={viewMode === "ELIMINADOS"}
                >
                  Eliminados
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            className="cclf-btn-close"
            onClick={() => !confirmingDelete && onClose?.()}
            aria-label="Cerrar"
            disabled={confirmingDelete}
          >
            <span className="cclf-btn-close__x">&times;</span>
          </button>
        </header>

        <div className="c-body">
          <div className="doc-modal-content">
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
                          {arch.estadoOperativo === "ELIMINADO" && (
                            <span className="doc-sidebar__badge doc-sidebar__badge--eliminado">ELIMINADO</span>
                          )}
                        </div>
                        <div className="doc-sidebar__item-meta">
                          {arch.estadoOperativo === "ELIMINADO" && arch.fechaBaja
                            ? `Eliminado: ${formatDate(arch.fechaBaja)}${arch.deletedBy ? ` \u2014 ${arch.deletedBy}` : ""}`
                            : `${formatDate(arch.uploadedAt)}${arch.uploadedBy ? ` \u2014 ${arch.uploadedBy}` : ""}`}
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
                  ) : selectedId && selectedIsEliminado ? (
                    <div className="doc-preview__placeholder">
                      <span className="doc-preview__placeholder-title">Archivo eliminado</span>
                      <span className="doc-preview__placeholder-sub">
                        Este archivo está en la papelera. Usá Restaurar para recuperarlo.
                      </span>
                    </div>
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

            {esPlano && selectedFile && (
              <div className="doc-aprobaciones">
                {[
                { key: "COMISION", label: "Comisión Directiva", canEdit: canEditComision, local: aprobComision, setLocal: setAprobComision,
                  estado: selectedFile.estadoAprobacionComision, fecha: selectedFile.fechaAprobacionComision, usuario: selectedFile.aprobadoComisionBy, obs: selectedFile.observacionAprobacionComision },
                { key: "MUNICIPIO", label: "Municipio", canEdit: canEditMunicipio, local: aprobMunicipio, setLocal: setAprobMunicipio,
                  estado: selectedFile.estadoAprobacionMunicipio, fecha: selectedFile.fechaAprobacionMunicipio, usuario: selectedFile.aprobadoMunicipioBy, obs: selectedFile.observacionAprobacionMunicipio },
                ].map((bloque) => (
                  <div key={bloque.key} className="approval-card doc-aprobacion-bloque">
                    {expandedApproval !== bloque.key ? (
                      <div className="approval-summary">
                        <div className="doc-aprobacion-header">
                          <h4 className="doc-aprobacion-title">{bloque.label}</h4>
                          <span className={`doc-aprobacion-badge doc-aprobacion-badge--${(bloque.estado || "PENDIENTE").toLowerCase()}`}>
                            {bloque.estado || "PENDIENTE"}
                          </span>
                        </div>
                        {(bloque.fecha || bloque.usuario) && (
                          <div className="doc-aprobacion-meta">
                            {bloque.fecha && <span>{formatDate(bloque.fecha)}</span>}
                            {bloque.usuario && <span> — {bloque.usuario}</span>}
                          </div>
                        )}
                        {bloque.obs && (
                          <div className="doc-aprobacion-obs">{bloque.obs}</div>
                        )}
                        {bloque.canEdit && !selectedIsEliminado && (
                          <button
                            type="button"
                            className="btn btn-outline doc-aprobacion-edit-btn"
                            onClick={() => setExpandedApproval(bloque.key)}
                          >
                            Editar
                          </button>
                        )}
                      </div>
                  ) : (
                    <div className="approval-edit">
                      <h4 className="doc-aprobacion-title">{bloque.label}</h4>
                      <div className="doc-aprobacion-form">
                        <label className="doc-aprobacion-form-label">Estado:</label>
                        <div className="doc-aprobacion-select-wrap">
                          <NiceSelect
                            value={bloque.local.estado}
                            options={APROBACION_ESTADOS}
                            placeholder="Seleccionar estado"
                            onChange={(value) => bloque.setLocal((p) => ({ ...p, estado: value }))}
                            usePortal={true}
                          />
                        </div>
                        <label className="doc-aprobacion-form-label">Observación:</label>
                        <textarea
                          value={bloque.local.observacion}
                          onChange={(e) => bloque.setLocal((p) => ({ ...p, observacion: e.target.value }))}
                          placeholder="Observación (opcional)"
                          className="doc-aprobacion-textarea"
                          rows={2}
                          maxLength={500}
                        />
                        <div className="doc-aprobacion-form-actions">
                          <button
                            type="button"
                            className="btn btn-primary doc-aprobacion-btn"
                            onClick={() => handleSaveAprobacion(bloque.key)}
                            disabled={savingAprob === bloque.key}
                          >
                            {savingAprob === bloque.key ? "Guardando..." : "Guardar"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => setExpandedApproval(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              </div>
            )}

            {error && <div className="doc-error-inline">{error}</div>}
          </div>

          {confirmingDelete && selectedFile && (
            <div className="doc-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="doc-confirm-title">
              <div className="doc-confirm-modal">
                <p id="doc-confirm-title" className="doc-confirm-modal__msg">
                  {confirmingDeleteType === "purge"
                    ? `¿Eliminar definitivamente "${selectedFile.filename}"? Esta acción no se puede deshacer.`
                    : `¿Eliminar "${selectedFile.filename}"?`}
                </p>
                <div className="doc-confirm-modal__actions">
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={confirmingDeleteType === "purge" ? handlePurgeConfirm : handleDeleteConfirm}
                    disabled={deleting || purging}
                  >
                    {deleting ? "Eliminando..." : purging ? "Purgando..." : "Confirmar"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={closeConfirm}
                    disabled={deleting || purging}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="doc-modal-footer">
            <div className="doc-actions">
              {!selectedIsEliminado && (
              <>
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
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleDescargar}
                  disabled={!selectedId || confirmingDelete}
                >
                  Descargar
                </button>
                {showSustituir && (
                  <>
                    <input
                      ref={sustituirInputRef}
                      type="file"
                      accept=".pdf,image/jpeg,image/png,image/webp"
                      onChange={handleSustituir}
                      hidden
                    />
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={() => sustituirInputRef.current?.click()}
                      disabled={sustituyendo || uploading || confirmingDelete}
                    >
                      {sustituyendo ? "Sustituyendo..." : "Sustituir"}
                    </button>
                  </>
                )}
                {canDelete && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => openConfirm("soft")}
                    disabled={!selectedId || confirmingDelete}
                  >
                    Eliminar
                  </button>
                )}
              </>
            )}
            {selectedIsEliminado && (
              <div className="doc-actions__pair">
                {canRestore && (
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={handleRestore}
                    disabled={restoring || purging}
                  >
                    {restoring ? "Restaurando..." : "Restaurar"}
                  </button>
                )}
                {canPurge && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => openConfirm("purge")}
                    disabled={restoring || purging}
                  >
                    {purging ? "Purgando..." : "Eliminar definitivamente"}
                  </button>
                )}
              </div>
            )}
            <div className="doc-actions__spacer" />
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                if (onVolverAtras) {
                  onVolverAtras();
                } else {
                  onClose?.();
                }
              }}
              disabled={confirmingDelete}
            >
              {"Volver Atrás"}
            </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
