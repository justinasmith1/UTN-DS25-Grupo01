// src/pages/Personas.jsx
// Versión con FilterBar genérico usando FilterBarPersonas

import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
import { can, PERMISSIONS } from "../lib/auth/rbac";
import { getAllPersonas } from "../lib/api/personas";
import { applyPersonaFilters } from "../utils/applyPersonaFilters";
import { applySearch } from "../utils/personaSearch";
import TablaPersonas from "../components/Table/TablaPersonas/TablaPersonas";
import FilterBarPersonas from "../components/FilterBar/FilterBarPersonas";
import PersonaVerCard from "../components/Cards/Personas/PersonaVerCard";
import PersonaEditarCard from "../components/Cards/Personas/PersonaEditarCard";

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
      estado: 'ALL',
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
  const navigate = useNavigate();
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
  
  // Estado para modal "Editar Persona"
  const [editarPersonaOpen, setEditarPersonaOpen] = useState(false);
  const [personaAEditar, setPersonaAEditar] = useState(null);

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
        
        // Si hay filtro de estado, enviarlo al backend
        if (filters.estado && filters.estado !== 'ALL' && filters.estado !== 'TODAS') {
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

  const handleEliminarPersona = (persona) => {
    // Lógica de eliminación
    console.log('Eliminar persona:', persona.id);
  };

  const handleAgregarPersona = () => {
    // Navegar a formulario de nueva persona
    navigate('/personas/nueva');
  };

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
    </>
  );
}