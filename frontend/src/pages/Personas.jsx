// src/pages/Personas.jsx
// Versión con FilterBar genérico usando FilterBarPersonas

import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
import { can, PERMISSIONS } from "../lib/auth/rbac";
import { getAllPersonasWithMock } from "../lib/api/personas";
import { applyPersonaFilters } from "../utils/applyPersonaFilters";
import TablaPersonas from "../components/Table/TablaPersonas/TablaPersonas";
import FilterBarPersonas from "../components/FilterBar/FilterBarPersonas";

/**
 * Personas
 * - Usa FilterBarPersonas genérico + TablaPersonas para mostrar personas con filtros avanzados
 */

export default function Personas() {
  const { user } = useAuth();
  const userRole = (user?.role ?? user?.rol ?? "ADMIN").toString().trim().toUpperCase();
  const navigate = useNavigate();

  // Estado de filtros (FilterBarPersonas)
  const [params, setParams] = useState({});
  const handleParamsChange = useCallback((patch) => {
    if (!patch || Object.keys(patch).length === 0) { 
      setParams({}); 
      return; 
    }
    setParams((prev) => ({ ...prev, ...patch }));
  }, []);

  // Dataset base: obtenemos todas las personas desde la API una sola vez
  const [allPersonas, setAllPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  // Cargar todas las personas al montar el componente
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        console.log('🔍 Cargando personas desde API...');
        const res = await getAllPersonasWithMock({});
        console.log('📊 Respuesta de API:', res);
        if (alive) { 
          const data = res.personas || [];
          console.log('📋 Datos de personas:', data);
          setAllPersonas(data); 
        }
      } catch (err) {
        console.error('❌ Error al cargar personas:', err);
        if (alive) setAllPersonas([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Aplicar filtros a los datos base
  const personas = useMemo(() => {
    if (!allPersonas?.length) return [];
    return applyPersonaFilters(allPersonas, params);
  }, [allPersonas, params]);

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
        personas={personas}
        data={personas}
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