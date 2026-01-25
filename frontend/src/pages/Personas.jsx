// src/pages/Personas.jsx
// Versión con FilterBar genérico usando FilterBarPersonas

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
import { can, PERMISSIONS } from "../lib/auth/rbac";
import { getAllPersonas } from "../lib/api/personas";
import { applyPersonaFilters } from "../utils/applyPersonaFilters";
import { applySearch } from "../utils/personaSearch";
import TablaPersonas from "../components/Table/TablaPersonas/TablaPersonas";
import FilterBarPersonas from "../components/FilterBar/FilterBarPersonas";
import PersonaVerCard from "../components/Cards/Personas/PersonaVerCard";
import PersonaEditarCard from "../components/Cards/Personas/PersonaEditarCard";
import PersonaDesactivarDialog from "../components/Cards/Personas/PersonaDesactivarDialog";
import PersonaReactivarDialog from "../components/Cards/Personas/PersonaReactivarDialog";
import PersonaEliminarDefinitivoDialog from "../components/Cards/Personas/PersonaEliminarDefinitivoDialog";
import PersonaCrearCard from "../components/Cards/Personas/PersonaCrearCard";
import PersonaGrupoFamiliarCard from "../components/Cards/Personas/PersonaGrupoFamiliarCard";
import { desactivarPersona, reactivarPersona, deletePersonaDefinitivo, getPersona } from "../lib/api/personas";

export default function Personas() {
  const { user } = useAuth();
  const userRole = (user?.role ?? user?.rol ?? "ADMIN").toString().trim().toUpperCase();
  const [searchParams, setSearchParams] = useSearchParams();

  // Obtener view de URL (query param) - con default según rol
  const currentView = searchParams.get('view') || (userRole === 'INMOBILIARIA' ? 'MIS_CLIENTES' : 'ALL');
  
  // Estado de búsqueda local
  const [searchText, setSearchText] = useState('');

  // Estado de filtros local
  const [params, setParams] = useState({});
  const handleParamsChange = useCallback((patch) => {
    if (!patch || Object.keys(patch).length === 0) {
      setParams({});
      return;
    }
    setParams((prev) => ({ ...prev, ...patch }));
  }, []);

  // Dataset base: obtenemos TODAS las personas desde la API una sola vez (igual que Inmobiliarias)
  const [allPersonas, setAllPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  // Estado para modal "Ver Persona"
  const [verPersonaOpen, setVerPersonaOpen] = useState(false);
  const [personaSeleccionada, setPersonaSeleccionada] = useState(null);
  
  // Estado para modal "Crear Persona"
  const [crearPersonaOpen, setCrearPersonaOpen] = useState(false);
  
  // Estado para modal "Editar Persona"
  const [editarPersonaOpen, setEditarPersonaOpen] = useState(false);
  const [personaAEditar, setPersonaAEditar] = useState(null);
  
  // Estado para modal "Grupo Familiar"
  const [grupoFamiliarOpen, setGrupoFamiliarOpen] = useState(false);
  const [personaGrupoFamiliar, setPersonaGrupoFamiliar] = useState(null);
  
  // Estado para modales de desactivar/reactivar/eliminar definitivo
  const [desactivarPersonaOpen, setDesactivarPersonaOpen] = useState(false);
  const [reactivarPersonaOpen, setReactivarPersonaOpen] = useState(false);
  const [eliminarDefinitivoOpen, setEliminarDefinitivoOpen] = useState(false);
  const [personaADesactivar, setPersonaADesactivar] = useState(null);
  const [loadingDesactivar, setLoadingDesactivar] = useState(false);
  const [errorDesactivar, setErrorDesactivar] = useState(null);
  
  // Estado para animación de éxito
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [lastAction, setLastAction] = useState(null);

  // Sincronizar view en URL si no está presente
  useEffect(() => {
    if (!searchParams.get('view')) {
      const defaultView = userRole === 'INMOBILIARIA' ? 'MIS_CLIENTES' : 'ALL';
      const newParams = new URLSearchParams(searchParams);
      newParams.set('view', defaultView);
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, userRole]);

  // Función para cargar personas
  const loadPersonas = useCallback(async () => {
    try {
      setLoading(true);
      // Cargar TODAS las personas con includeInactive para poder filtrar en frontend
      const res = await getAllPersonas({ view: currentView, includeInactive: true });
      setAllPersonas(res.personas || []);
    } catch (err) {
      console.error('❌ Error al cargar personas:', err);
      setAllPersonas([]);
    } finally {
      setLoading(false);
    }
  }, [currentView]);

  // Cargar personas al montar o cuando cambia la view
  useEffect(() => {
    loadPersonas();
  }, [loadPersonas]);

  // Pipeline de filtrado: búsqueda + filtros (100% frontend, igual que Inmobiliarias)
  const personasFiltered = useMemo(() => {
    // 1. Aplicar búsqueda de texto
    const afterSearch = applySearch(allPersonas, searchText);
    
    // 2. Aplicar filtros (visibilidad, clienteDe, identificadorTipo, fecha)
    const hasParams = params && Object.keys(params).length > 0;
    try {
      return hasParams ? applyPersonaFilters(afterSearch, params) : afterSearch;
    } catch (err) {
      console.error('Error aplicando filtros:', err);
      return afterSearch;
    }
  }, [allPersonas, params, searchText]);

  // Handler para cambios en búsqueda
  const handleSearchChange = useCallback((newSearchText) => {
    setSearchText(newSearchText ?? '');
  }, []);

  // Verificar permisos
  const canPersonaView = can(user, PERMISSIONS.PEOPLE_VIEW);
  const canPersonaEdit = can(user, PERMISSIONS.PEOPLE_EDIT);
  const canPersonaDelete = can(user, PERMISSIONS.PEOPLE_DELETE);

  // Handlers de acciones
  const handleVerPersona = (persona) => {
    setPersonaSeleccionada(persona);
    setVerPersonaOpen(true);
  };

  const handleEditarPersona = useCallback((persona) => {
    if (!persona) return;
    setPersonaAEditar(persona);
    setEditarPersonaOpen(true);
  }, []);

  const handlePersonaActualizada = useCallback((persona) => {
    if (persona && persona.id) {
      setEditarPersonaOpen(false);
      setPersonaAEditar(null);
      
      setAllPersonas(prev => {
        const index = prev.findIndex(p => p.id === persona.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = persona;
          return updated;
        }
        return prev;
      });
      
      if (personaSeleccionada?.id === persona.id) {
        setPersonaSeleccionada(persona);
      }
    }
  }, [personaSeleccionada]);

  const handleEliminarPersona = useCallback((persona) => {
    if (!persona) return;
    
    if (persona.estado === 'OPERATIVO') {
      setPersonaADesactivar(persona);
      setErrorDesactivar(null);
      setDesactivarPersonaOpen(true);
    } else if (persona.estado === 'ELIMINADO') {
      setPersonaADesactivar(persona);
      setReactivarPersonaOpen(true);
    }
  }, []);

  const handleEliminarDefinitivo = useCallback(async (persona) => {
    if (!persona) return;
    
    // Cargar detalle completo para verificar asociaciones
    try {
      const detalle = await getPersona(persona.id);
      const counts = detalle._count || {};
      const tieneAsociaciones = 
        (counts.lotesPropios || 0) > 0 ||
        (counts.lotesAlquilados || 0) > 0 ||
        (counts.alquileres || 0) > 0 ||
        (counts.Reserva || 0) > 0 ||
        (counts.Venta || 0) > 0;
      
      if (tieneAsociaciones) {
        alert('No se puede eliminar definitivamente porque tiene asociaciones (lotes, reservas o ventas)');
        return;
      }
      
      setPersonaADesactivar(detalle);
      setEliminarDefinitivoOpen(true);
    } catch (error) {
      console.error('Error al cargar detalle:', error);
      alert('Error al verificar asociaciones de la persona');
    }
  }, []);

  const handleConfirmarDesactivar = useCallback(async () => {
    if (!personaADesactivar) return;
    
    // Limpiar error previo
    setErrorDesactivar(null);
    
    try {
      setLoadingDesactivar(true);
      await desactivarPersona(personaADesactivar.id);
      
      // Actualizar lista local (cambiar estado a ELIMINADO)
      setAllPersonas(prev => prev.map(p => 
        p.id === personaADesactivar.id 
          ? { ...p, estado: 'ELIMINADO', fechaBaja: new Date().toISOString() } 
          : p
      ));
      
      setDesactivarPersonaOpen(false);
      setPersonaADesactivar(null);
      
      // Mostrar animación de éxito
      setLastAction('deactivate');
      setShowDeleteSuccess(true);
      setTimeout(() => setShowDeleteSuccess(false), 1500);
    } catch (error) {
      console.error('Error al desactivar persona:', error);
      setErrorDesactivar(error.message || 'Error al desactivar la persona');
    } finally {
      setLoadingDesactivar(false);
    }
  }, [personaADesactivar]);

  const handleConfirmarReactivar = useCallback(async () => {
    if (!personaADesactivar) return;
    
    try {
      setLoadingDesactivar(true);
      await reactivarPersona(personaADesactivar.id);
      
      // Actualizar lista local (cambiar estado a OPERATIVO)
      setAllPersonas(prev => prev.map(p => 
        p.id === personaADesactivar.id 
          ? { ...p, estado: 'OPERATIVO', fechaBaja: null } 
          : p
      ));
      
      setReactivarPersonaOpen(false);
      setPersonaADesactivar(null);
      
      // Mostrar animación de éxito
      setLastAction('reactivate');
      setShowDeleteSuccess(true);
      setTimeout(() => setShowDeleteSuccess(false), 1500);
    } catch (error) {
      console.error('Error al reactivar persona:', error);
      alert(error.message || 'Error al reactivar la persona');
    } finally {
      setLoadingDesactivar(false);
    }
  }, [personaADesactivar]);

  const handleConfirmarEliminarDefinitivo = useCallback(async () => {
    if (!personaADesactivar) return;
    
    try {
      setLoadingDesactivar(true);
      await deletePersonaDefinitivo(personaADesactivar.id);
      
      // Eliminar de la lista local
      setAllPersonas(prev => prev.filter(p => p.id !== personaADesactivar.id));
      
      setEliminarDefinitivoOpen(false);
      setPersonaADesactivar(null);
    } catch (error) {
      console.error('Error al eliminar persona definitivamente:', error);
      if (error.status === 409) {
        alert(error.message || 'No se puede eliminar definitivamente porque tiene asociaciones');
      } else {
        alert(error.message || 'Error al eliminar la persona definitivamente');
      }
    } finally {
      setLoadingDesactivar(false);
    }
  }, [personaADesactivar]);

  const handleAgregarPersona = () => {
    setCrearPersonaOpen(true);
  };

  const handlePersonaCreada = useCallback(() => {
    loadPersonas(); // Recargar lista
  }, [loadPersonas]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "40vh" }}>
        <div className="spinner-border" role="status" />
        <span className="ms-2">Cargando personas…</span>
      </div>
    );
  }

  return (
    <>
      {/* Barra de filtros */}
      <FilterBarPersonas 
        variant="dashboard" 
        userRole={userRole} 
        onParamsChange={handleParamsChange}
        onSearchChange={handleSearchChange}
      />

      <TablaPersonas
        userRole={userRole}
        personas={personasFiltered}
        data={personasFiltered}
        onVerPersona={canPersonaView ? handleVerPersona : null}
        onEditarPersona={canPersonaEdit ? handleEditarPersona : null}
        onEliminarPersona={canPersonaDelete ? handleEliminarPersona : null}
        onEliminarDefinitivo={userRole === 'ADMINISTRADOR' && canPersonaDelete ? handleEliminarDefinitivo : null}
        onAgregarPersona={can(user, PERMISSIONS.PEOPLE_CREATE) ? handleAgregarPersona : null}
        onGrupoFamiliar={(userRole === 'ADMINISTRADOR' || userRole === 'GESTOR') ? (persona) => {
          setPersonaGrupoFamiliar(persona);
          setGrupoFamiliarOpen(true);
        } : null}
        selectedIds={selectedIds}
        onSelectedChange={setSelectedIds}
      />

      {/* Modal "Ver Persona" */}
      <PersonaVerCard
        open={verPersonaOpen}
        onClose={() => {
          setVerPersonaOpen(false);
          setPersonaSeleccionada(null);
        }}
        onEdit={canPersonaEdit ? (persona) => {
          setVerPersonaOpen(false);
          setPersonaAEditar(persona);
          setEditarPersonaOpen(true);
        } : null}
        persona={personaSeleccionada}
        personaId={personaSeleccionada?.id}
        personas={personasFiltered}
      />

      {/* Modal "Editar Persona" */}
      <PersonaEditarCard
        open={editarPersonaOpen}
        onCancel={() => {
          setEditarPersonaOpen(false);
          setPersonaAEditar(null);
        }}
        onUpdated={handlePersonaActualizada}
        persona={personaAEditar}
        personaId={personaAEditar?.id}
        personas={personasFiltered}
      />

      {/* Modal "Desactivar Persona" */}
      <PersonaDesactivarDialog
        open={desactivarPersonaOpen}
        persona={personaADesactivar}
        loading={loadingDesactivar}
        error={errorDesactivar}
        onCancel={() => {
          setDesactivarPersonaOpen(false);
          setPersonaADesactivar(null);
          setErrorDesactivar(null);
        }}
        onConfirm={handleConfirmarDesactivar}
      />

      {/* Modal "Reactivar Persona" */}
      <PersonaReactivarDialog
        open={reactivarPersonaOpen}
        persona={personaADesactivar}
        loading={loadingDesactivar}
        onCancel={() => {
          setReactivarPersonaOpen(false);
          setPersonaADesactivar(null);
        }}
        onConfirm={handleConfirmarReactivar}
      />

      {/* Modal "Eliminar Definitivamente" */}
      {userRole === 'ADMINISTRADOR' && (
        <PersonaEliminarDefinitivoDialog
          open={eliminarDefinitivoOpen}
          persona={personaADesactivar}
          loading={loadingDesactivar}
          onCancel={() => {
            setEliminarDefinitivoOpen(false);
            setPersonaADesactivar(null);
          }}
          onConfirm={handleConfirmarEliminarDefinitivo}
        />
      )}

      {/* Modal "Crear Persona" */}
      <PersonaCrearCard
        open={crearPersonaOpen}
        onCancel={() => setCrearPersonaOpen(false)}
        onCreated={handlePersonaCreada}
      />

      {/* Modal "Grupo Familiar" */}
      <PersonaGrupoFamiliarCard
        open={grupoFamiliarOpen}
        onCancel={() => {
          setGrupoFamiliarOpen(false);
          setPersonaGrupoFamiliar(null);
        }}
        persona={personaGrupoFamiliar}
      />

      {/* Animación de éxito al desactivar/reactivar */}
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
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes scaleIn {
              from { transform: scale(0.9); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
            @keyframes checkmark {
              0% { transform: scale(0); }
              50% { transform: scale(1.1); }
              100% { transform: scale(1); }
            }
          `}</style>
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
              {lastAction === 'reactivate'
                ? "¡Persona reactivada exitosamente!"
                : "¡Persona desactivada exitosamente!"}
            </h3>
          </div>
        </div>
      )}
    </>
  );
}
