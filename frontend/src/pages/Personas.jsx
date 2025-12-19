// src/pages/Personas.jsx
// Versión con FilterBar genérico usando FilterBarPersonas

import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
import { can, PERMISSIONS } from "../lib/auth/rbac";
import { getAllPersonas } from "../lib/api/personas";
import TablaPersonas from "../components/Table/TablaPersonas/TablaPersonas";
import FilterBarPersonas from "../components/FilterBar/FilterBarPersonas";

/**
 * Personas
 * - Usa FilterBarPersonas genérico + TablaPersonas para mostrar personas con filtros avanzados
 * - Soporta vistas: ALL, PROPIETARIOS, INQUILINOS, CLIENTES, MIS_CLIENTES
 */

// Mapeo de vistas a labels
const VIEW_LABELS = {
  ALL: 'Todos',
  PROPIETARIOS: 'Propietarios',
  INQUILINOS: 'Inquilinos',
  CLIENTES: 'Clientes',
  MIS_CLIENTES: 'Mis Clientes',
};

export default function Personas() {
  const { user } = useAuth();
  const userRole = (user?.role ?? user?.rol ?? "ADMIN").toString().trim().toUpperCase();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Obtener view de URL (query param) - con default según rol
  const currentView = searchParams.get('view') || (userRole === 'INMOBILIARIA' ? 'MIS_CLIENTES' : 'ALL');
  const q = searchParams.get('q') || '';
  const includeInactive = searchParams.get('includeInactive') === 'true';

  // Dataset base: obtenemos personas desde la API con view param
  const [allPersonas, setAllPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  // Sincronizar view en URL si no está presente
  useEffect(() => {
    if (!searchParams.get('view')) {
      const defaultView = userRole === 'INMOBILIARIA' ? 'MIS_CLIENTES' : 'ALL';
      const newParams = new URLSearchParams(searchParams);
      newParams.set('view', defaultView);
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, userRole]);

  // Cargar personas según view y query params
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const params = {
          view: currentView,
          ...(q ? { q } : {}),
          ...(includeInactive && (userRole === 'ADMINISTRADOR' || userRole === 'GESTOR') ? { includeInactive: true } : {}),
        };
        const res = await getAllPersonas(params);
        if (alive) {
          setAllPersonas(res.personas || []);
        }
      } catch (err) {
        console.error('❌ Error al cargar personas:', err);
        if (alive) setAllPersonas([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [currentView, q, includeInactive, userRole]);

  // Estado de filtros (FilterBarPersonas) - mantener compatibilidad
  const [params, setParams] = useState({});
  const handleParamsChange = useCallback((patch) => {
    if (!patch || Object.keys(patch).length === 0) { 
      setParams({}); 
      return; 
    }
    setParams((prev) => ({ ...prev, ...patch }));
  }, []);

  // Verificar permisos
  const canPersonaView = can(user, PERMISSIONS.PEOPLE_VIEW);
  const canPersonaEdit = can(user, PERMISSIONS.PEOPLE_EDIT);
  const canPersonaDelete = can(user, PERMISSIONS.PEOPLE_DELETE);

  // Handlers de acciones
  const handleVerPersona = (persona) => {
    // Lógica de visualización
    console.log('Ver persona:', persona.id);
  };

  const handleEditarPersona = (persona) => {
    // Lógica de edición
    console.log('Editar persona:', persona.id);
  };

  const handleEliminarPersona = (persona) => {
    // Lógica de eliminación
    console.log('Eliminar persona:', persona.id);
  };

  const handleAgregarPersona = () => {
    // Navegar a formulario de nueva persona
    navigate('/personas/nueva');
  };

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
      />

      <TablaPersonas
        userRole={userRole}
        personas={allPersonas}
        data={allPersonas}
        onVerPersona={canPersonaView ? handleVerPersona : null}
        onEditarPersona={canPersonaEdit ? handleEditarPersona : null}
        onEliminarPersona={canPersonaDelete ? handleEliminarPersona : null}
        onAgregarPersona={can(user, PERMISSIONS.PEOPLE_CREATE) ? handleAgregarPersona : null}
        selectedIds={selectedIds}
        onSelectedChange={setSelectedIds}
      />
    </>
  );
}