// src/pages/Inmobiliarias.jsx
// Página de inmobiliarias usando la arquitectura genérica

import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "../app/providers/AuthProvider";
import { can, PERMISSIONS } from "../lib/auth/rbac";
import { useToast } from "../app/providers/ToastProvider";
import FilterBarInmobiliarias from "../components/FilterBar/FilterBarInmobiliarias";
import TablaInmobiliarias from "../components/Table/TablaInmobiliarias/TablaInmobiliarias";
import { getAllInmobiliarias } from "../lib/api/inmobiliarias";
import { applyInmobiliariaFilters } from "../utils/applyInmobiliariaFilters";

export default function Inmobiliarias() {
  const { user } = useAuth();
  const { success, error } = useToast();
  
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
        console.log('🔍 Cargando inmobiliarias desde API...');
        const res = await getAllInmobiliarias({});
        console.log('📊 Respuesta completa de API:', res);
        console.log('📊 Tipo de respuesta:', typeof res);
        console.log('📊 Keys de respuesta:', Object.keys(res));
        if (alive) { 
          const data = res.data || [];
          console.log('📋 Datos de inmobiliarias:', data);
          console.log('📋 Cantidad de inmobiliarias:', data.length);
          console.log('📋 Primer elemento:', data[0]);
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
    console.log('🔄 Aplicando filtros. allInmobiliarias:', allInmobiliarias.length, 'params:', params);
    const hasParams = params && Object.keys(params).length > 0;
    try {
      const result = hasParams ? applyInmobiliariaFilters(allInmobiliarias, params) : allInmobiliarias;
      console.log('✅ Resultado filtrado:', result.length, 'inmobiliarias');
      return result;
    } catch (err) {
      console.error('❌ Error aplicando filtros:', err);
      return allInmobiliarias;
    }
  }, [allInmobiliarias, params]);

  // Estado de selección - TablaBase espera array de IDs (strings)
  const [selectedRows, setSelectedRows] = useState([]);
  const handleSelectionChange = useCallback((selection) => {
    console.log('🔄 Cambio de selección:', selection);
    setSelectedRows(selection);
  }, []);

  // Acciones de la tabla
  const handleAgregarInmobiliaria = useCallback(() => {
    // TODO: Implementar modal de creación
    console.log('Agregar inmobiliaria');
  }, []);

  const handleEditarInmobiliaria = useCallback((inmobiliaria) => {
    // TODO: Implementar modal de edición
    console.log('Editar inmobiliaria:', inmobiliaria);
  }, []);

  const handleEliminarInmobiliaria = useCallback((inmobiliaria) => {
    // TODO: Implementar confirmación y eliminación
    console.log('Eliminar inmobiliaria:', inmobiliaria);
  }, []);

  const handleVerInmobiliaria = useCallback((inmobiliaria) => {
    // TODO: Implementar modal de visualización
    console.log('Ver inmobiliaria:', inmobiliaria);
  }, []);

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

  // Debug logs
  console.log('🏢 Inmobiliarias render - loading:', loading, 'data length:', inmobiliarias.length, 'user:', user?.role);

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
        onVerInmobiliaria={handleVerInmobiliaria}
        selectedRows={selectedRows}
        onSelectionChange={handleSelectionChange}
      />
    </>
  );
}