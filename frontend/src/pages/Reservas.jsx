// src/pages/Reservas.jsx
// Página de reservas usando la arquitectura genérica

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
import { can, PERMISSIONS } from "../lib/auth/rbac";
import { useToast } from "../app/providers/ToastProvider";
import FilterBarReservas from "../components/FilterBar/FilterBarReservas";
import TablaReservas from "../components/Table/TablaReservas/TablaReservas";
import { getAllReservas, getReservaById, updateReserva, deleteReserva } from "../lib/api/reservas";
import { getAllInmobiliarias } from "../lib/api/inmobiliarias";
import { getAllLotes } from "../lib/api/lotes";
import { applyReservaFilters } from "../utils/applyReservaFilters";

import ReservaVerCard from "../components/Cards/Reservas/ReservaVerCard.jsx";
import ReservaEditarCard from "../components/Cards/Reservas/ReservaEditarCard.jsx";
import ReservaCrearCard from "../components/Cards/Reservas/ReservaCrearCard.jsx";
import ReservaEliminarDialog from "../components/Cards/Reservas/ReservaEliminarDialog.jsx";
import DocumentoDropdown from "../components/Cards/Documentos/DocumentoDropdown.jsx";
import DocumentoVerCard from "../components/Cards/Documentos/DocumentoVerCard.jsx";

export default function Reservas() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const crearParam = searchParams.get('crear') === 'true';
  const [params, setParams] = useState({});
  const [allReservas, setAllReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [inmobiliarias, setInmobiliarias] = useState([]);
  const [lotes, setLotes] = useState([]);

  // Permisos
  const canReservaView = can(user, PERMISSIONS.RES_VIEW);
  const canReservaEdit = can(user, PERMISSIONS.RES_EDIT);
  const canReservaDelete = can(user, PERMISSIONS.RES_DELETE);

  // Verificar permisos
  if (!canReservaView) {
    return (
      <>
        <div className="alert alert-warning">
          <h4>Acceso Restringido</h4>
          <p>No tienes permisos para ver las reservas.</p>
        </div>
      </>
    );
  }

  // Manejar cambios de parámetros
  const handleParamsChange = useCallback((patch) => {
    setParams((prev) => ({ ...prev, ...patch }));
  }, []);

  // Cargar todas las reservas e inmobiliarias al montar el componente
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const [reservasResp, inmosResp, lotesResp] = await Promise.all([
          getAllReservas({}),
          getAllInmobiliarias({}),
          getAllLotes({}),
        ]);
        
        if (alive) {
          if (reservasResp.success) {
            const reservasData = reservasResp.data?.reservas ?? reservasResp.data ?? [];
            const lotesData = lotesResp?.data ?? (Array.isArray(lotesResp) ? lotesResp : []);
            const lotesById = {};
            lotesData.forEach((lote) => {
              if (lote && lote.id != null) {
                lotesById[String(lote.id)] = lote;
              }
            });
            const reservasWithMapId = (Array.isArray(reservasData) ? reservasData : []).map((reserva) => {
              const lookupId = reserva?.loteId ?? reserva?.lotId ?? reserva?.lote?.id ?? null;
              const loteRef =
                reserva?.lote?.mapId
                  ? reserva.lote
                  : lookupId != null
                  ? lotesById[String(lookupId)] || null
                  : null;
              const displayMapId =
                loteRef?.mapId ??
                reserva?.lotMapId ??
                (lookupId != null ? lotesById[String(lookupId)]?.mapId : null) ??
                null;

              return {
                ...reserva,
                lotMapId: displayMapId ?? reserva?.lotMapId ?? null,
                lote: loteRef
                  ? { ...loteRef, mapId: loteRef.mapId ?? displayMapId ?? null }
                  : reserva.lote ?? null,
                loteInfo: reserva.loteInfo
                  ? {
                      ...reserva.loteInfo,
                      mapId: reserva.loteInfo.mapId ?? displayMapId ?? null,
                    }
                  : displayMapId
                  ? { mapId: displayMapId }
                  : reserva.loteInfo ?? null,
              };
            });
            setAllReservas(reservasWithMapId);
            setLotes(Array.isArray(lotesData) ? lotesData : []);
          } else {
            error(reservasResp.message || 'Error al cargar reservas');
            setAllReservas([]);
            const lotesData = lotesResp?.data ?? (Array.isArray(lotesResp) ? lotesResp : []);
            setLotes(Array.isArray(lotesData) ? lotesData : []);
          }
          
          // Guardar inmobiliarias para pasarlas a los componentes
          // getAllInmobiliarias devuelve { data: [...], meta: {...} }
          const inmosData = inmosResp?.data ?? (Array.isArray(inmosResp) ? inmosResp : []);
          setInmobiliarias(Array.isArray(inmosData) ? inmosData : []);
        }
      } catch (err) {
        if (alive) {
          console.error('❌ Error cargando reservas:', err);
          error('Error al cargar reservas');
          setAllReservas([]);
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    })();

    return () => { alive = false; };
  }, [error]);

  // Aplicar filtros localmente
  const reservas = useMemo(() => {
    return applyReservaFilters(allReservas, params);
  }, [allReservas, params]);

  // Modales/cards
  const [reservaSel, setReservaSel] = useState(null);
  const [openVer, setOpenVer] = useState(false);
  const [openEditar, setOpenEditar] = useState(false);
  const [openCrear, setOpenCrear] = useState(false);
  const [openEliminar, setOpenEliminar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Abrir el card de crear cuando viene desde el ModulePills (?crear=true)
  useEffect(() => {
    if (crearParam) {
      setOpenCrear(true);
      // limpiar el query param para no reabrir en navegaciones
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('crear');
        return next;
      }, { replace: true });
    }
  }, [crearParam, setSearchParams]);

  // Ver: abre con la fila y luego refina con getReservaById(id) para traer relaciones/fechas
  const onVer = useCallback((reserva) => {
    if (!reserva) return;
    setReservaSel(reserva);
    setOpenVer(true);

    (async () => {
      try {
        const resp = await getReservaById(reserva.id);
        const detail = resp?.data ?? resp ?? {};
        // Preservar mapId del lote si viene del backend o de la reserva original
        const mapId = detail?.lote?.mapId ?? reserva?.lote?.mapId ?? reserva?.lotMapId ?? detail?.lotMapId ?? null;
        const enrichedDetail = mapId && detail?.lote
          ? {
              ...detail,
              lotMapId: mapId,
              lote: {
                ...detail.lote,
                mapId: mapId,
              },
            }
          : mapId
          ? {
              ...detail,
              lotMapId: mapId,
            }
          : detail;
        setReservaSel((prev) => ({ ...(prev || reserva), ...(enrichedDetail || {}) }));
      } catch (e) {
        console.error("Error obteniendo reserva por id:", e);
      }
    })();
  }, []);

  // Editar: abre siempre y carga datos completos con relaciones
  const onEditar = useCallback((reserva) => {
    if (!reserva) return;
    setReservaSel(reserva);
    setOpenEditar(true);

    // Cargar datos completos con relaciones (cliente, lote, inmobiliaria, fechas)
    (async () => {
      try {
        const resp = await getReservaById(reserva.id);
        const detail = resp?.data ?? resp ?? {};
        // Preservar mapId del lote si viene del backend o de la reserva original
        const mapId = detail?.lote?.mapId ?? reserva?.lote?.mapId ?? reserva?.lotMapId ?? detail?.lotMapId ?? null;
        const enrichedDetail = mapId && detail?.lote
          ? {
              ...detail,
              lotMapId: mapId,
              lote: {
                ...detail.lote,
                mapId: mapId,
              },
            }
          : mapId
          ? {
              ...detail,
              lotMapId: mapId,
            }
          : detail;
        setReservaSel({ ...(reserva || {}), ...(enrichedDetail || {}) });
      } catch (e) {
        console.error("Error obteniendo reserva por id para editar:", e);
      }
    })();
  }, []);

  const onEliminar = useCallback((reserva) => {
    setReservaSel(reserva);
    setOpenEliminar(true);
  }, []);

  // Estados para documentos
  const [openDocumentoDropdown, setOpenDocumentoDropdown] = useState(false);
  const [openDocumentoVer, setOpenDocumentoVer] = useState(false);
  const [tipoDocumentoSeleccionado, setTipoDocumentoSeleccionado] = useState(null);
  const [labelDocumentoSeleccionado, setLabelDocumentoSeleccionado] = useState(null);

  const onVerDocumentos = useCallback((reserva) => {
    if (!reserva) return;
    setReservaSel(reserva);
    setOpenDocumentoDropdown(true);
  }, []);

  const handleSelectTipoDocumento = useCallback((tipo, label) => {
    setTipoDocumentoSeleccionado(tipo);
    setLabelDocumentoSeleccionado(label);
    setOpenDocumentoDropdown(false);
    setOpenDocumentoVer(true);
  }, []);

  const handleCerrarDocumentoVer = useCallback(() => {
    setOpenDocumentoVer(false);
    setTipoDocumentoSeleccionado(null);
    setLabelDocumentoSeleccionado(null);
  }, []);

  const onAgregarReserva = useCallback(() => {
    setOpenCrear(true);
  }, []);

  // PUT (Editar) - recibe el objeto actualizado completo del componente
  const handleSave = useCallback(
    async (updatedReserva) => {
      if (!updatedReserva?.id) return;
      try {
        // La reserva actualizada ya viene completa del backend con todas las relaciones
        // Actualizar la lista con la reserva actualizada
        setAllReservas((prev) => prev.map((r) => (r.id === updatedReserva.id ? updatedReserva : r)));
        setReservaSel(updatedReserva);
        success("Reserva actualizada correctamente");
      } catch (e) {
        console.error("Error actualizando reserva:", e);
        error(e?.message || "Error al actualizar reserva");
      }
    },
    [success, error]
  );

  // POST (Crear) - recibe la nueva reserva creada
  const handleCreated = useCallback(
    async (newReserva) => {
      if (!newReserva?.id) return;
      try {
        // Agregar la nueva reserva a la lista (obtener datos completos)
        const resp = await getReservaById(newReserva.id);
        const detail = resp?.data ?? resp ?? newReserva;
        setAllReservas((prev) => [detail, ...prev]);
        success("Reserva creada correctamente");
      } catch (e) {
        console.error("Error obteniendo reserva creada:", e);
        // Aún así agregar la reserva que viene del create
        setAllReservas((prev) => [newReserva, ...prev]);
        success("Reserva creada correctamente");
      }
    },
    [success]
  );

  // DELETE (Eliminar)
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const handleDelete = useCallback(async () => {
    if (!reservaSel?.id) return;
    try {
      setDeleting(true);
      await deleteReserva(reservaSel.id);
      setAllReservas((prev) => prev.filter((r) => r.id !== reservaSel.id));
      setOpenEliminar(false);
      setShowDeleteSuccess(true);
      setTimeout(() => {
        setShowDeleteSuccess(false);
      }, 1500);
    } catch (e) {
      console.error("Error eliminando reserva:", e);
      alert(e?.message || "No se pudo eliminar la reserva.");
    } finally {
      setDeleting(false);
    }
  }, [reservaSel]);

  if (loading) {
    return (
      <div className="container py-3">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
            <p className="text-muted">Cargando reservas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <FilterBarReservas
        variant="dashboard" 
        userRole={user?.role} 
        value={params} 
        onChange={handleParamsChange} 
        onClear={() => setParams({})} 
      />

      <TablaReservas
        userRole={user?.role}
        reservas={reservas}
        data={reservas}
        lotes={lotes}
        onVer={canReservaView ? onVer : null}
        onEditar={canReservaEdit ? onEditar : null}
        onEliminar={canReservaDelete ? onEliminar : null}
        onVerDocumentos={canReservaView ? onVerDocumentos : null}
        onAgregarReserva={can(user, PERMISSIONS.RES_CREATE) ? onAgregarReserva : null}
        selectedIds={selectedIds}
        onSelectedChange={setSelectedIds}
      />

      {/* Modales */}
      <ReservaVerCard 
        open={openVer} 
        reserva={reservaSel} 
        reservas={allReservas}
        onClose={() => setOpenVer(false)}
        onEdit={(reserva) => {
          setOpenVer(false);
          // Abrir el modal de editar con la misma reserva
          setReservaSel(reserva);
          setOpenEditar(true);
          
          // Cargar datos completos con relaciones
          (async () => {
            try {
              const resp = await getReservaById(reserva.id);
              const detail = resp?.data ?? resp ?? {};
              // Preservar mapId del lote si viene del backend o de la reserva original
              const mapId = detail?.lote?.mapId ?? reserva?.lote?.mapId ?? reserva?.lotMapId ?? detail?.lotMapId ?? null;
              const enrichedDetail = mapId && detail?.lote
                ? {
                    ...detail,
                    lotMapId: mapId,
                    lote: {
                      ...detail.lote,
                      mapId: mapId,
                    },
                  }
                : mapId
                ? {
                    ...detail,
                    lotMapId: mapId,
                  }
                : detail;
              setReservaSel({ ...(reserva || {}), ...(enrichedDetail || {}) });
            } catch (e) {
              console.error("Error obteniendo reserva por id para editar:", e);
            }
          })();
        }}
      />

      <ReservaEditarCard
        key={reservaSel?.id} // Forzar re-render cuando cambia la reserva
        open={openEditar}
        reserva={reservaSel}
        reservas={allReservas}
        inmobiliarias={inmobiliarias}
        onCancel={() => setOpenEditar(false)}
        onSaved={handleSave}
      />

      <ReservaCrearCard
        open={openCrear}
        onCancel={() => setOpenCrear(false)}
        onCreated={handleCreated}
      />

      <ReservaEliminarDialog
        open={openEliminar}
        reserva={reservaSel}
        loading={deleting}
        onCancel={() => setOpenEliminar(false)}
        onConfirm={handleDelete}
      />

      {/* Dropdown de documentos */}
      <DocumentoDropdown
        open={openDocumentoDropdown}
        onClose={() => setOpenDocumentoDropdown(false)}
        onSelectTipo={handleSelectTipoDocumento}
        loteId={reservaSel?.loteId || reservaSel?.lote?.id}
        loteNumero={reservaSel?.lote?.mapId ?? reservaSel?.lotMapId ?? reservaSel?.loteId ?? reservaSel?.lote?.id}
      />

      {/* Modal de visualización de documento */}
      <DocumentoVerCard
        open={openDocumentoVer}
        onClose={handleCerrarDocumentoVer}
        onVolverAtras={() => {
          setOpenDocumentoVer(false);
          setOpenDocumentoDropdown(true);
        }}
        tipoDocumento={tipoDocumentoSeleccionado}
        loteId={reservaSel?.loteId || reservaSel?.lote?.id}
        loteNumero={reservaSel?.lote?.mapId ?? reservaSel?.lotMapId ?? reservaSel?.loteId ?? reservaSel?.lote?.id}
        documentoUrl={null}
        onModificar={(url) => {
          console.log("Modificar documento:", url);
        }}
        onDescargar={(url) => {
          console.log("Descargar documento:", url);
        }}
      />

      {/* Animación de éxito al eliminar */}
      {showDeleteSuccess && (
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
              ¡Reserva eliminada exitosamente!
            </h3>
          </div>
        </div>
      )}
    </>
  );
}