// src/pages/Prioridades.jsx
// Página de prioridades usando la arquitectura genérica

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
import { can, PERMISSIONS } from "../lib/auth/rbac";
import { useToast } from "../app/providers/ToastProvider";
import FilterBarPrioridades from "../components/FilterBar/FilterBarPrioridades";
import TablaPrioridades from "../components/Table/TablaPrioridades/TablaPrioridades";
import { getAllPrioridades, getPrioridadById } from "../lib/api/prioridades";
import { getAllInmobiliarias } from "../lib/api/inmobiliarias";
import { getAllLotes } from "../lib/api/lotes";
import { applyPrioridadFilters } from "../utils/applyPrioridadFilters";
import { applySearch } from "../utils/search/searchCore";
import { getPrioridadSearchFields } from "../utils/search/fields/prioridadSearchFields";

import PrioridadVerCard from "../components/Cards/Prioridades/PrioridadVerCard.jsx";
import PrioridadEditarCard from "../components/Cards/Prioridades/PrioridadEditarCard.jsx";
import PrioridadCrearCard from "../components/Cards/Prioridades/PrioridadCrearCard.jsx";
import PrioridadEliminarDialog from "../components/Cards/Prioridades/PrioridadEliminarDialog.jsx";
import PrioridadReactivarDialog from "../components/Cards/Prioridades/PrioridadReactivarDialog.jsx";
import SuccessAnimation from "../components/Cards/Base/SuccessAnimation.jsx";
import { softDeletePrioridad, reactivatePrioridad } from "../lib/api/prioridades.js";

export default function Prioridades() {
  const { user } = useAuth();
  const { error } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const crearParam = searchParams.get('crear') === 'true';
  const openIdParam = searchParams.get('openId');
  
  // Estado de búsqueda local (NO se sincroniza con URL, NO dispara fetch)
  const [searchText, setSearchText] = useState('');
  
  // Handler para cambios en búsqueda (solo actualiza estado local, NO dispara fetch)
  const handleSearchChange = useCallback((newSearchText) => {
    setSearchText(newSearchText ?? '');
  }, []);

  const [params, setParams] = useState(() => ({}));

  const [allPrioridades, setAllPrioridades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [inmobiliarias, setInmobiliarias] = useState([]);
  const [lotes, setLotes] = useState([]);

  // Permisos
  const canPrioridadView = can(user, PERMISSIONS.PRIORITY_VIEW);
  const canPrioridadEdit = can(user, PERMISSIONS.PRIORITY_EDIT);
  const canPrioridadCreate = can(user, PERMISSIONS.PRIORITY_CREATE);

  // Manejar cambios de parámetros
  const handleParamsChange = useCallback((patch) => {
    if (!patch || Object.keys(patch).length === 0) {
      return;
    }
    setParams(prev => ({
      ...prev,
      ...patch,
    }));
  }, []);

  // Cargar prioridades y lotes
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        // Construir query con estadoOperativo desde params
        const queryParams = {
          ...(params.estadoOperativo ? { estadoOperativo: params.estadoOperativo } : {}),
        };
        const [prioridadesResp, lotesResp] = await Promise.all([
          getAllPrioridades(queryParams),
          getAllLotes({}),
        ]);
        
        if (alive) {
          const prioridadesData = prioridadesResp?.success 
            ? (prioridadesResp.data?.prioridades ?? prioridadesResp.data ?? [])
            : (prioridadesResp?.data?.prioridades ?? prioridadesResp?.data ?? []);
          
          const lotesData = lotesResp?.data ?? (Array.isArray(lotesResp) ? lotesResp : []);

          const prioridadesWithLotes = (Array.isArray(prioridadesData) ? prioridadesData : []).map((prioridad) => {
            const loteId = prioridad?.loteId ?? prioridad?.lote?.id ?? null;
            if (loteId && !prioridad.lote) {
              const lote = lotesData.find(l => String(l.id) === String(loteId));
              if (lote) {
                return { ...prioridad, lote };
              }
            }
            return prioridad;
          });
          
          setAllPrioridades(prioridadesWithLotes);
          setLotes(Array.isArray(lotesData) ? lotesData : []);
        }
      } catch (err) {
        if (alive) {
          error('Error al cargar datos');
          setAllPrioridades([]);
          setLotes([]);
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    })();

    return () => { alive = false; };
  }, [error, params.estadoOperativo]);

  // Cargar inmobiliarias solo para ADMIN/GESTOR
  useEffect(() => {
    if (user?.role === 'INMOBILIARIA') {
      setInmobiliarias([]);
      return;
    }

    let alive = true;
    (async () => {
      try {
        const res = await getAllInmobiliarias({});
        if (alive) {
          const data = res.data || [];
          setInmobiliarias(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (alive) {
          setInmobiliarias([]);
        }
      }
    })();

    return () => { alive = false; };
  }, [user?.role]);

  // Pipeline de filtrado: primero búsqueda, luego otros filtros
  const prioridades = useMemo(() => {
    // 1. Aplicar búsqueda de texto (100% frontend)
    const afterSearch = applySearch(allPrioridades, searchText, getPrioridadSearchFields);
    
    // 2. Aplicar otros filtros (estado, owner, fechaFin, etc.)
    return applyPrioridadFilters(afterSearch, params);
  }, [allPrioridades, params, searchText]);

  // Modales/cards
  const [prioridadSel, setPrioridadSel] = useState(null);
  const [openVer, setOpenVer] = useState(false);
  const [openEditar, setOpenEditar] = useState(false);
  const [openCrear, setOpenCrear] = useState(false);
  const [openEliminar, setOpenEliminar] = useState(false);
  const [openReactivar, setOpenReactivar] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [showReactivarSuccess, setShowReactivarSuccess] = useState(false);

  // Abrir el card de crear cuando viene desde el ModulePills (?crear=true)
  useEffect(() => {
    if (crearParam) {
      setOpenCrear(true);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('crear');
        return next;
      }, { replace: true });
    }
  }, [crearParam, setSearchParams]);

  // Abrir automáticamente el modal "Ver" cuando viene openId
  useEffect(() => {
    const stateId = location.state?.openId;
    const idToUse = stateId != null ? stateId : (openIdParam ? parseInt(openIdParam, 10) : null);
    
    if (idToUse && allPrioridades.length > 0) {
      const prioridadId = typeof idToUse === 'number' ? idToUse : parseInt(idToUse, 10);
      if (!isNaN(prioridadId)) {
        const prioridad = allPrioridades.find(p => p.id === prioridadId);
        if (prioridad) {
          setPrioridadSel(prioridad);
          setOpenVer(true);
          if (openIdParam) {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.delete('openId');
              return next;
            }, { replace: true });
          }
          if (stateId != null) {
            window.history.replaceState({}, document.title);
          }
        }
      }
    }
  }, [openIdParam, location.state, allPrioridades, setSearchParams]);

  // Ver: abre con la fila y luego refina con getPrioridadById(id)
  const onVer = useCallback((prioridad) => {
    if (!prioridad) return;
    setPrioridadSel(prioridad);
    setOpenVer(true);

    (async () => {
      try {
        const resp = await getPrioridadById(prioridad.id);
        const detail = resp?.data ?? resp ?? {};
        setPrioridadSel((prev) => ({ ...(prev || prioridad), ...(detail || {}) }));
      } catch (e) {
        // Error silencioso
      }
    })();
  }, []);

  // Editar: abre siempre y carga datos completos
  const onEditar = useCallback((prioridad) => {
    if (!prioridad) return;
    setPrioridadSel(prioridad);
    setOpenEditar(true);

    (async () => {
      try {
        const resp = await getPrioridadById(prioridad.id);
        const detail = resp?.data ?? resp ?? {};
        setPrioridadSel({ ...(prioridad || {}), ...(detail || {}) });
      } catch (e) {
      }
    })();
  }, []);

  const onAgregarPrioridad = useCallback(() => {
    setOpenCrear(true);
  }, []);

  // Eliminar (soft delete)
  const onEliminar = useCallback((prioridad) => {
    setPrioridadSel(prioridad);
    setOpenEliminar(true);
  }, []);

  const handleEliminar = useCallback(async () => {
    if (!prioridadSel?.id) return;
    try {
      setDeleting(true);
      const res = await softDeletePrioridad(prioridadSel.id);
      const updated = res.data || res;
      
      // Actualizar en lista
      setAllPrioridades((prev) => prev.map((p) => p.id === updated.id ? updated : p));
      
      setOpenEliminar(false);
      setShowDeleteSuccess(true);
      setTimeout(() => {
        setShowDeleteSuccess(false);
      }, 1500);
    } catch (e) {
      console.error("Error eliminando prioridad:", e);
      error(e?.message || "Error al eliminar prioridad");
    } finally {
      setDeleting(false);
    }
  }, [prioridadSel, error]);

  // Reactivar
  const onReactivar = useCallback((prioridad) => {
    setPrioridadSel(prioridad);
    setOpenReactivar(true);
  }, []);

  const handleReactivar = useCallback(async () => {
    if (!prioridadSel?.id) return;
    try {
      setReactivating(true);
      const res = await reactivatePrioridad(prioridadSel.id);
      const updated = res.data || res;
      
      // Actualizar en lista
      setAllPrioridades((prev) => prev.map((p) => p.id === updated.id ? updated : p));
      
      setOpenReactivar(false);
      setShowReactivarSuccess(true);
      setTimeout(() => {
        setShowReactivarSuccess(false);
      }, 1500);
    } catch (e) {
      console.error("Error reactivando prioridad:", e);
      error(e?.message || "Error al reactivar prioridad");
    } finally {
      setReactivating(false);
    }
  }, [prioridadSel, error]);

  // PUT (Editar)
  const handleSave = useCallback(
    async (updatedPrioridad) => {
      if (!updatedPrioridad?.id) return;
      try {
        setAllPrioridades((prev) => prev.map((p) => (p.id === updatedPrioridad.id ? updatedPrioridad : p)));
        setPrioridadSel(updatedPrioridad);
      } catch (e) {
        error(e?.message || "Error al actualizar prioridad");
      }
    },
    [error]
  );

  const handleCreated = useCallback(
    async (newPrioridad) => {
      if (!newPrioridad?.id) return;
      try {
        const resp = await getPrioridadById(newPrioridad.id);
        const detail = resp?.data ?? resp ?? newPrioridad;
        setAllPrioridades((prev) => [detail, ...prev]);
      } catch (e) {
        setAllPrioridades((prev) => [newPrioridad, ...prev]);
      } finally {
        window.dispatchEvent(new CustomEvent('reloadLotes'));
      }
    },
    []
  );

  // Verificar permisos
  if (!canPrioridadView) {
    return (
      <div className="container py-3">
        <div className="alert alert-warning">
          <h4>Acceso Restringido</h4>
          <p>No tienes permisos para ver las prioridades.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container py-3">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
            <p className="text-muted">Cargando prioridades...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <FilterBarPrioridades
        variant="dashboard" 
        userRole={user?.role} 
        value={params} 
        onSearchChange={handleSearchChange}
        onChange={handleParamsChange}
        inmobiliariasOpts={inmobiliarias.map(i => ({ value: i.id, label: i.nombre }))} 
        onClear={() => {
          setParams({});
        }} 
        total={allPrioridades.length}
        filtrados={prioridades.length}
      />

      <TablaPrioridades
        userRole={user?.role}
        prioridades={prioridades}
        data={prioridades}
        lotes={lotes}
        inmobiliarias={inmobiliarias}
        onVer={canPrioridadView ? onVer : null}
        onEditar={canPrioridadEdit ? onEditar : null}
        onEliminar={canPrioridadEdit ? onEliminar : null}
        onReactivar={canPrioridadEdit ? onReactivar : null}
        onAgregarPrioridad={canPrioridadCreate ? onAgregarPrioridad : null}
        selectedIds={selectedIds}
        onSelectedChange={setSelectedIds}
        estadoOperativoFilter={params.estadoOperativo}
      />

      {/* Modales */}
      <PrioridadVerCard 
        open={openVer} 
        prioridad={prioridadSel} 
        prioridades={allPrioridades}
        onClose={() => setOpenVer(false)}
        onEdit={(prioridad) => {
          setOpenVer(false);
          setPrioridadSel(prioridad);
          setOpenEditar(true);
          
          (async () => {
            try {
              const resp = await getPrioridadById(prioridad.id);
              const detail = resp?.data ?? resp ?? {};
              setPrioridadSel({ ...(prioridad || {}), ...(detail || {}) });
            } catch (e) {
            }
          })();
        }}
      />

      <PrioridadEditarCard
        key={prioridadSel?.id}
        open={openEditar}
        prioridad={prioridadSel}
        prioridades={allPrioridades}
        onCancel={() => setOpenEditar(false)}
        onSaved={handleSave}
      />

      <PrioridadCrearCard
        open={openCrear}
        onCancel={() => setOpenCrear(false)}
        onCreated={handleCreated}
      />

      <PrioridadEliminarDialog
        open={openEliminar}
        prioridad={prioridadSel}
        loading={deleting}
        onCancel={() => setOpenEliminar(false)}
        onConfirm={handleEliminar}
      />

      <PrioridadReactivarDialog
        open={openReactivar}
        prioridad={prioridadSel}
        loading={reactivating}
        onCancel={() => setOpenReactivar(false)}
        onConfirm={handleReactivar}
      />

      <SuccessAnimation show={showDeleteSuccess} message="¡Prioridad eliminada exitosamente!" />
      <SuccessAnimation show={showReactivarSuccess} message="¡Prioridad reactivada exitosamente!" />
    </>
  );
}
