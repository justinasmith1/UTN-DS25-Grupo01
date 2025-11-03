// src/pages/Inmobiliarias.jsx
// Página de inmobiliarias usando la arquitectura genérica

import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "../app/providers/AuthProvider";
import { can, PERMISSIONS } from "../lib/auth/rbac";
import { useToast } from "../app/providers/ToastProvider";
import FilterBarInmobiliarias from "../components/FilterBar/FilterBarInmobiliarias";
import TablaInmobiliarias from "../components/Table/TablaInmobiliarias/TablaInmobiliarias";
import { 
  getAllInmobiliarias,
  getInmobiliariaById,
  updateInmobiliaria,
  deleteInmobiliaria
} from "../lib/api/inmobiliarias";
import { applyInmobiliariaFilters } from "../utils/applyInmobiliariaFilters";

import InmobiliariaVerCard from "../components/Cards/Inmobiliarias/InmobiliariaVerCard.jsx";
import InmobiliariaEditarCard from "../components/Cards/Inmobiliarias/InmobiliariaEditarCard.jsx";
import InmobiliariaEliminarDialog from "../components/Cards/Inmobiliarias/InmobiliariaEliminarDialog.jsx";
import InmobiliariaCrearCard from "../components/Cards/Inmobiliarias/InmobiliariaCrearCard.jsx";

import { useSearchParams } from "react-router-dom";

export default function Inmobiliarias() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const crearParam = searchParams.get('crear') === 'true';
  
  // Estado de filtros
  const [params, setParams] = useState({});
  const handleParamsChange = useCallback((patch) => {
    if (!patch || Object.keys(patch).length === 0) { 
      setParams({}); 
      return; 
    }
    setParams((prev) => ({ ...prev, ...patch }));
  }, []);

  // Dataset base: obtenemos todas las inmobiliarias desde la API una sola vez
  const [allInmobiliarias, setAllInmobiliarias] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar todas las inmobiliarias al montar el componente
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await getAllInmobiliarias({});
        if (alive) { 
          const data = res.data || [];
          setAllInmobiliarias(data); 
        }
      } catch (err) {
        if (alive) {
          console.error('❌ Error al cargar inmobiliarias:', err);
          error("No pude cargar las inmobiliarias");
          setAllInmobiliarias([]);
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    })();
    
    return () => { alive = false; };
  }, []); // Dependencias vacías para ejecutar solo una vez

  // Aplicar filtros localmente
  const inmobiliarias = useMemo(() => {
    const hasParams = params && Object.keys(params).length > 0;
    try {
      return hasParams ? applyInmobiliariaFilters(allInmobiliarias, params) : allInmobiliarias;
    } catch (err) {
      console.error('Error aplicando filtros:', err);
      return allInmobiliarias;
    }
  }, [allInmobiliarias, params]);

  // Estado de selección - TablaBase espera array de IDs (strings)
  const [selectedRows, setSelectedRows] = useState([]);
  const handleSelectionChange = useCallback((selection) => {
    setSelectedRows(selection);
  }, []);

  // Modales/cards
  const [inmobiliariaSel, setInmobiliariaSel] = useState(null);
  const [openVer, setOpenVer] = useState(false);
  const [openEditar, setOpenEditar] = useState(false);
  const [openEliminar, setOpenEliminar] = useState(false);
  const [openCrear, setOpenCrear] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Ver: abre con la fila y luego refina con getInmobiliariaById(id) para traer fechas/etc.
  const handleVerInmobiliaria = useCallback((inmobiliaria) => {
    if (!inmobiliaria) return;
    setInmobiliariaSel(inmobiliaria);
    setOpenVer(true);

    (async () => {
      try {
        const resp = await getInmobiliariaById(inmobiliaria.id);
        const detail = resp?.data ?? resp ?? {};
        setInmobiliariaSel((prev) => ({ ...(prev || inmobiliaria), ...(detail || {}) }));
      } catch (e) {
        console.error("Error obteniendo inmobiliaria por id:", e);
      }
    })();
  }, []);

  // Editar: abre siempre y carga datos completos
  const handleEditarInmobiliaria = useCallback((inmobiliaria) => {
    if (!inmobiliaria) return;
    setInmobiliariaSel(inmobiliaria);
    setOpenEditar(true);

    // Cargar datos completos
    (async () => {
      try {
        const resp = await getInmobiliariaById(inmobiliaria.id);
        const detail = resp?.data ?? resp ?? {};
        setInmobiliariaSel({ ...(inmobiliaria || {}), ...(detail || {}) });
      } catch (e) {
        console.error("Error obteniendo inmobiliaria por id para editar:", e);
      }
    })();
  }, []);

  const handleEliminarInmobiliaria = useCallback((inmobiliaria) => {
    setInmobiliariaSel(inmobiliaria);
    setOpenEliminar(true);
  }, []);

  const handleAgregarInmobiliaria = useCallback(() => {
    setOpenCrear(true);
  }, []);

  // Abrir al ingresar con ?crear=true
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

  // PUT (Editar) - recibe el objeto actualizado completo del componente
  const handleSave = useCallback(
    async (updatedInmobiliaria) => {
      if (!updatedInmobiliaria?.id) return;
      try {
        // La inmobiliaria actualizada ya viene completa del backend
        // Actualizar la lista con la inmobiliaria actualizada
        setAllInmobiliarias((prev) => prev.map((i) => (i.id === updatedInmobiliaria.id ? updatedInmobiliaria : i)));
        setInmobiliariaSel(updatedInmobiliaria);
      } catch (e) {
        console.error("Error actualizando inmobiliaria:", e);
      }
    },
    []
  );

  // DELETE (Eliminar)
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const handleDelete = useCallback(async () => {
    if (!inmobiliariaSel?.id) return;
    try {
      setDeleting(true);
      await deleteInmobiliaria(inmobiliariaSel.id);
      setAllInmobiliarias((prev) => prev.filter((i) => i.id !== inmobiliariaSel.id));
      setOpenEliminar(false);
      setShowDeleteSuccess(true);
      setTimeout(() => {
        setShowDeleteSuccess(false);
      }, 1500);
    } catch (e) {
      console.error("Error eliminando inmobiliaria:", e);
      alert(e?.message || "No se pudo eliminar la inmobiliaria.");
    } finally {
      setDeleting(false);
    }
  }, [inmobiliariaSel]);

  // Verificar permisos
  const canView = can(user, PERMISSIONS.AGENCY_VIEW);
  const canCreate = can(user, PERMISSIONS.AGENCY_CREATE);
  const canEdit = can(user, PERMISSIONS.AGENCY_EDIT);
  const canDelete = can(user, PERMISSIONS.AGENCY_DELETE);

  if (!canView) {
    return (
      <>
        <div className="container py-4">
          <div className="alert alert-warning">
            No tienes permisos para ver las inmobiliarias.
          </div>
        </div>
      </>
    );
  }

  // Mostrar loading mientras se cargan los datos
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "40vh" }}>
        <div className="spinner-border" role="status" />
        <span className="ms-2">Cargando inmobiliarias…</span>
      </div>
    );
  }

  return (
    <>
      {/* Barra de filtros */}
      <FilterBarInmobiliarias
        variant="dashboard"
        userRole={user?.role}
        onParamsChange={handleParamsChange}
      />

      {/* Tabla de inmobiliarias */}
      <TablaInmobiliarias
        data={inmobiliarias}
        loading={loading}
        onAgregarInmobiliaria={canCreate ? handleAgregarInmobiliaria : undefined}
        onEditarInmobiliaria={canEdit ? handleEditarInmobiliaria : undefined}
        onEliminarInmobiliaria={canDelete ? handleEliminarInmobiliaria : undefined}
        onVerInmobiliaria={canView ? handleVerInmobiliaria : undefined}
        selectedRows={selectedRows}
        onSelectionChange={handleSelectionChange}
      />

      {/* Modales */}
      <InmobiliariaVerCard 
        open={openVer} 
        inmobiliaria={inmobiliariaSel} 
        inmobiliarias={allInmobiliarias}
        onClose={() => setOpenVer(false)}
        onEdit={(inmobiliaria) => {
          setOpenVer(false);
          // Abrir el modal de editar con la misma inmobiliaria
          setInmobiliariaSel(inmobiliaria);
          setOpenEditar(true);
          
          // Cargar datos completos
          (async () => {
            try {
              const resp = await getInmobiliariaById(inmobiliaria.id);
              const detail = resp?.data ?? resp ?? {};
              setInmobiliariaSel({ ...(inmobiliaria || {}), ...(detail || {}) });
            } catch (e) {
              console.error("Error obteniendo inmobiliaria por id para editar:", e);
            }
          })();
        }}
      />

      <InmobiliariaEditarCard
        key={inmobiliariaSel?.id} // Forzar re-render cuando cambia la inmobiliaria
        open={openEditar}
        inmobiliaria={inmobiliariaSel}
        inmobiliarias={allInmobiliarias}
        onCancel={() => setOpenEditar(false)}
        onSaved={handleSave}
      />

      <InmobiliariaEliminarDialog
        open={openEliminar}
        inmobiliaria={inmobiliariaSel}
        loading={deleting}
        onCancel={() => setOpenEliminar(false)}
        onConfirm={handleDelete}
      />

      <InmobiliariaCrearCard
        open={openCrear}
        onCancel={() => setOpenCrear(false)}
        onCreated={() => setOpenCrear(false)}
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
              ¡Inmobiliaria eliminada exitosamente!
            </h3>
          </div>
        </div>
      )}
    </>
  );
}