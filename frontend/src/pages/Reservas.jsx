// src/pages/Reservas.jsx
// Página de reservas usando la arquitectura genérica

import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "../app/providers/AuthProvider";
import { can, PERMISSIONS } from "../lib/auth/rbac";
import { useToast } from "../app/providers/ToastProvider";
import FilterBarReservas from "../components/FilterBar/FilterBarReservas";
import TablaReservas from "../components/Table/TablaReservas/TablaReservas";
import { getAllReservas } from "../lib/api/reservas";
import { applyReservaFilters } from "../utils/applyReservaFilters";

export default function Reservas() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [params, setParams] = useState({});
  const [allReservas, setAllReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

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

  // Cargar todas las reservas al montar el componente
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        console.log('🔍 Cargando reservas desde API...');
        const res = await getAllReservas({});
        
        if (alive) {
          if (res.success) {
            setAllReservas(res.data || []);
            console.log('✅ Reservas cargadas:', res.data?.length || 0);
          } else {
            error(res.message || 'Error al cargar reservas');
            setAllReservas([]);
          }
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

  // Acciones
  const onVer = (reserva) => {
    // Ver detalle de la reserva
    console.log('Ver reserva:', reserva.id);
  };

  const onEditar = (reserva) => {
    // Abrir modal de edición o navegar a formulario
    console.log('Editar reserva:', reserva.id);
  };

  const onEliminar = (reserva) => {
    // Confirmar y eliminar
    if (window.confirm(`¿Eliminar la reserva ${reserva.id}?`)) {
      // Lógica de eliminación
      console.log('Eliminar reserva:', reserva.id);
    }
  };

  const onVerDocumentos = (reserva) => {
    // Ver documentos asociados a la reserva
    console.log('Ver documentos de reserva:', reserva.id);
  };

  const onAgregarReserva = () => {
    // Navegar a formulario de nueva reserva
    console.log('Agregar nueva reserva');
  };

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
        onVer={canReservaView ? onVer : null}
        onEditar={canReservaEdit ? onEditar : null}
        onEliminar={canReservaDelete ? onEliminar : null}
        onVerDocumentos={canReservaView ? onVerDocumentos : null}
        onAgregarReserva={can(user, PERMISSIONS.RES_CREATE) ? onAgregarReserva : null}
        selectedIds={selectedIds}
        onSelectedChange={setSelectedIds}
      />
    </>
  );
}