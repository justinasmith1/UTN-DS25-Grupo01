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
import { desactivarPersona, reactivarPersona, deletePersonaDefinitivo, getPersona } from "../lib/api/personas";

/**
 * Personas
 * - Usa FilterBarPersonas genérico + TablaPersonas para mostrar personas con filtros avanzados
 * - Soporta vistas: ALL, PROPIETARIOS, INQUILINOS, CLIENTES, MIS_CLIENTES
 * - Filtros: estado, clienteDe, identificadorTipo, fechaCreacion (client-side)
 * - Búsqueda: 100% frontend (no se envía al backend)
 */

// Valores por defecto de filtros según rol (sin filtros aplicados)
const getDefaultFilters = (userRole) => {
  if (userRole === "ADMINISTRADOR" || userRole === "GESTOR") {
    return {
      estado: 'ACTIVA', // Por defecto mostrar solo activas
      clienteDe: [], // Array vacío para multiSelect
      identificadorTipo: [], // Array vacío para multiSelect
      fechaCreacion: { min: null, max: null }
    };
  } else {
    // INMOBILIARIA: sin estado ni clienteDe
    return {
      identificadorTipo: [], // Array vacío para multiSelect
      fechaCreacion: { min: null, max: null }
    };
  }
};

export default function Personas() {
  const { user } = useAuth();
  const userRole = (user?.role ?? user?.rol ?? "ADMIN").toString().trim().toUpperCase();
  const [searchParams, setSearchParams] = useSearchParams();

  // Obtener view de URL (query param) - con default según rol
  const currentView = searchParams.get('view') || (userRole === 'INMOBILIARIA' ? 'MIS_CLIENTES' : 'ALL');
  
  // Estado de búsqueda local (NO se sincroniza con URL, NO dispara fetch)
  const [searchText, setSearchText] = useState('');

  // Estado de filtros local (NO se sincroniza con URL)
  const [filters, setFilters] = useState(() => getDefaultFilters(userRole));

  // Dataset raw: obtenemos personas desde la API solo con view
  const [personasRaw, setPersonasRaw] = useState([]);
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
  
  // Estado para modales de desactivar/reactivar/eliminar definitivo
  const [desactivarPersonaOpen, setDesactivarPersonaOpen] = useState(false);
  const [reactivarPersonaOpen, setReactivarPersonaOpen] = useState(false);
  const [eliminarDefinitivoOpen, setEliminarDefinitivoOpen] = useState(false);
  const [personaADesactivar, setPersonaADesactivar] = useState(null);
  const [loadingDesactivar, setLoadingDesactivar] = useState(false);
  
  // Estado para animación de éxito
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [lastAction, setLastAction] = useState(null); // 'desactivate' o 'reactivate'

  // Sincronizar view en URL si no está presente
  useEffect(() => {
    if (!searchParams.get('view')) {
      const defaultView = userRole === 'INMOBILIARIA' ? 'MIS_CLIENTES' : 'ALL';
      const newParams = new URLSearchParams(searchParams);
      newParams.set('view', defaultView);
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, userRole]);

  // Cargar personas desde backend con view y estado (si hay filtro de estado)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        
        // Enviar view y estado al backend (igual que inmobiliarias)
        const params = {
          view: currentView
        };
        
        // Enviar estado al backend (siempre, ya no hay opción "todos")
        if (filters.estado) {
          params.estado = filters.estado;
        }
        
        const res = await getAllPersonas(params);
        if (alive) {
          setPersonasRaw(res.personas || []);
        }
      } catch (err) {
        console.error('❌ Error al cargar personas:', err);
        if (alive) setPersonasRaw([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [currentView, filters.estado]);

  // Pipeline de filtrado: solo búsqueda (estado se filtra en backend)
  const personasFiltered = useMemo(() => {
    // Aplicar búsqueda (100% frontend, sin tocar backend)
    // Estado ya viene filtrado del backend
    const personasFiltradasFinal = applySearch(personasRaw, searchText);
    
    // Aplicar otros filtros que no son estado (clienteDe, tipoIdent, fecha)
    const otrosFiltros = { ...filters };
    delete otrosFiltros.estado; // Estado ya se filtró en backend
    const personasFiltradasPorModal = applyPersonaFilters(personasFiltradasFinal, otrosFiltros);
    
    return personasFiltradasPorModal;
  }, [personasRaw, filters, searchText]);

  // Handler para cambios en filtros desde FilterBar (solo actualiza estado local)
  // NO maneja búsqueda (q) - eso se maneja por separado
  const handleParamsChange = useCallback((newFilters) => {
    if (!newFilters || Object.keys(newFilters).length === 0) {
      // Limpiar filtros: resetear a defaults
      setFilters(getDefaultFilters(userRole));
      return;
    }
    
    // Actualizar estado local de filtros (excluir q - búsqueda se maneja por separado)
    setFilters(prev => {
      const updated = { ...prev };
      
      // Actualizar solo los campos que vienen en newFilters (excluir q)
      Object.keys(newFilters).forEach(key => {
        if (newFilters[key] !== undefined && key !== 'q') {
          updated[key] = newFilters[key];
        }
      });
      
      return updated;
    });
  }, [userRole]);
  
  // Handler para cambios en búsqueda (solo actualiza estado local, NO dispara fetch)
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

  // Editar: abre el modal de edición
  const handleEditarPersona = useCallback((persona) => {
    if (!persona) return;
    setPersonaAEditar(persona);
    setEditarPersonaOpen(true);
  }, []);

  // Actualizar: cuando se guarda una persona editada, actualizar la lista
  const handlePersonaActualizada = useCallback((persona) => {
    if (persona && persona.id) {
      // Cerrar modal de editar
      setEditarPersonaOpen(false);
      setPersonaAEditar(null);
      
      // Actualizar la lista
      setPersonasRaw(prev => {
        const index = prev.findIndex(p => p.id === persona.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = persona;
          return updated;
        }
        return prev;
      });
      
      // Actualizar persona seleccionada si está abierta
      if (personaSeleccionada?.id === persona.id) {
        setPersonaSeleccionada(persona);
      }
    }
  }, [personaSeleccionada]);

  const handleEliminarPersona = useCallback((persona) => {
    if (!persona) return;
    
    // Si está activa, abrir modal de desactivar
    if (persona.estado === 'ACTIVA') {
      setPersonaADesactivar(persona);
      setDesactivarPersonaOpen(true);
    } 
    // Si está inactiva, abrir modal de reactivar
    else if (persona.estado === 'INACTIVA') {
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
    
    try {
      setLoadingDesactivar(true);
      await desactivarPersona(personaADesactivar.id);
      
      // Refrescar la lista manteniendo filtros
      const params = { view: currentView };
      if (filters.estado) {
        params.estado = filters.estado;
      }
      const res = await getAllPersonas(params);
      setPersonasRaw(res.personas || []);
      
      setDesactivarPersonaOpen(false);
      setPersonaADesactivar(null);
    } catch (error) {
      console.error('Error al desactivar persona:', error);
      alert(error.message || 'Error al desactivar la persona');
    } finally {
      setLoadingDesactivar(false);
    }
  }, [personaADesactivar, currentView, filters.estado]);

  const handleConfirmarReactivar = useCallback(async () => {
    if (!personaADesactivar) return;
    
    try {
      setLoadingDesactivar(true);
      await reactivarPersona(personaADesactivar.id);
      
      // Refrescar la lista manteniendo filtros
      const params = { view: currentView };
      if (filters.estado) {
        params.estado = filters.estado;
      }
      const res = await getAllPersonas(params);
      setPersonasRaw(res.personas || []);
      
      setReactivarPersonaOpen(false);
      setPersonaADesactivar(null);
      setLastAction('reactivate');
      // Mostrar animación de éxito
      setShowDeleteSuccess(true);
      setTimeout(() => {
        setShowDeleteSuccess(false);
      }, 1500);
    } catch (error) {
      console.error('Error al reactivar persona:', error);
      alert(error.message || 'Error al reactivar la persona');
    } finally {
      setLoadingDesactivar(false);
    }
  }, [personaADesactivar, currentView, filters.estado]);

  const handleConfirmarEliminarDefinitivo = useCallback(async () => {
    if (!personaADesactivar) return;
    
    try {
      setLoadingDesactivar(true);
      await deletePersonaDefinitivo(personaADesactivar.id);
      
      // Refrescar la lista manteniendo filtros
      const params = { view: currentView };
      if (filters.estado) {
        params.estado = filters.estado;
      }
      const res = await getAllPersonas(params);
      setPersonasRaw(res.personas || []);
      
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
  }, [personaADesactivar, currentView, filters.estado]);

  const handleAgregarPersona = () => {
    setCrearPersonaOpen(true);
  };

  const handlePersonaCreada = useCallback((createdPersona) => {
    // Refrescar la lista manteniendo filtros
    (async () => {
      try {
        const params = { view: currentView };
        if (filters.estado) {
          params.estado = filters.estado;
        }
        const res = await getAllPersonas(params);
        setPersonasRaw(res.personas || []);
      } catch (err) {
        console.error('Error al refrescar lista después de crear:', err);
      }
    })();
  }, [currentView, filters.estado]);

  // Construir initialValue para FilterBar desde estado local
  // IMPORTANTE: Este hook debe estar ANTES de cualquier early return
  const initialValue = useMemo(() => {
    return {
      ...filters,
      q: searchText // Pasar búsqueda local (no de URL)
    };
  }, [filters, searchText]);

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
      {/* Barra de filtros genérica para personas */}
      <FilterBarPersonas 
        variant="dashboard" 
        userRole={userRole} 
        onParamsChange={handleParamsChange}
        onSearchChange={handleSearchChange}
        initialValue={initialValue}
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
          // Cerrar modal de ver y abrir modal de editar
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
        onCancel={() => {
          setDesactivarPersonaOpen(false);
          setPersonaADesactivar(null);
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

      {/* Modal "Eliminar Definitivamente" (solo Admin, solo si no tiene asociaciones) */}
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