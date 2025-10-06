// src/pages/Ventas.jsx
// Versión con FilterBar genérico usando FilterBarVentas

import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
import { can, PERMISSIONS } from "../lib/auth/rbac";
import { getAllVentas } from "../lib/api/ventas";
import { applyVentaFilters } from "../utils/applyVentaFilters";
import TablaVentas from "../components/Table/TablaVentas/TablaVentas";
import FilterBarVentas from "../components/FilterBar/FilterBarVentas";

/**
 * Ventas
 * - Usa FilterBarVentas genérico + TablaVentas para mostrar ventas con filtros avanzados
 */

export default function Ventas() {
  const { user } = useAuth();
  const userRole = (user?.role ?? user?.rol ?? "ADMIN").toString().trim().toUpperCase();
  const navigate = useNavigate();

  // Estado de filtros (FilterBarVentas)
  const [params, setParams] = useState({});
  const handleParamsChange = useCallback((patch) => {
    if (!patch || Object.keys(patch).length === 0) { 
      setParams({}); 
      return; 
    }
    setParams((prev) => ({ ...prev, ...patch }));
  }, []);

  // Dataset base: obtenemos todas las ventas desde la API una sola vez
  const [allVentas, setAllVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  // Cargar todas las ventas al montar el componente
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        console.log('🔍 Cargando ventas desde API...');
        const res = await getAllVentas({});
        console.log('📊 Respuesta de API:', res);
        if (alive) { 
          const data = res.data || [];
          console.log('📋 Datos de ventas:', data);
          setAllVentas(data); 
        }
      } catch (error) {
        if (alive) {
          console.error('❌ Error al cargar ventas:', error);
          setAllVentas([]);
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    })();
    
    return () => { alive = false; };
  }, []);

  // Aplicar filtros localmente (similar a Dashboard)
  const ventas = useMemo(() => {
    console.log('🔄 Aplicando filtros. allVentas:', allVentas.length, 'params:', params);
    const hasParams = params && Object.keys(params).length > 0;
    try {
      const result = hasParams ? applyVentaFilters(allVentas, params) : allVentas;
      console.log('✅ Resultado filtrado:', result.length, 'ventas');
      return result;
    } catch (error) {
      console.error('❌ Error aplicando filtros:', error);
      return allVentas;
    }
  }, [allVentas, params]);

  // Permisos (booleans)
  const canSaleView = can(user, PERMISSIONS.SALE_VIEW);
  const canSaleEdit = can(user, PERMISSIONS.SALE_EDIT);
  const canSaleDelete = can(user, PERMISSIONS.SALE_DELETE);

  // Callbacks normalizados
  const onVer = (venta) => {
    // Navegar a vista de detalle de venta
    navigate(`/ventas/${venta.id}`);
  };

  const onEditar = (venta) => {
    // Abrir modal de edición o navegar a formulario
    navigate(`/ventas/${venta.id}/editar`);
  };

  const onEliminar = (venta) => {
    // Confirmar y eliminar
    if (window.confirm(`¿Eliminar la venta ${venta.id}?`)) {
      // Lógica de eliminación
      console.log('Eliminar venta:', venta.id);
    }
  };

  const onVerDocumentos = (venta) => {
    // Ver documentos asociados a la venta
    navigate(`/ventas/${venta.id}/documentos`);
  };

  const onAgregarVenta = () => {
    // Navegar a formulario de nueva venta
    navigate('/ventas/nueva');
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "40vh" }}>
        <div className="spinner-border" role="status" />
        <span className="ms-2">Cargando ventas…</span>
      </div>
    );
  }

  return (
    <>
      {/* Barra de filtros genérica para ventas */}
      <FilterBarVentas 
        variant="dashboard" 
        userRole={userRole} 
        onParamsChange={handleParamsChange} 
      />

      <TablaVentas
        userRole={userRole}
        ventas={ventas}
        data={ventas}
        onVer={canSaleView ? onVer : null}
        onEditar={canSaleEdit ? onEditar : null}
        onEliminar={canSaleDelete ? onEliminar : null}
        onVerDocumentos={canSaleView ? onVerDocumentos : null}
        onAgregarVenta={can(user, PERMISSIONS.SALE_CREATE) ? onAgregarVenta : null}
        selectedIds={selectedIds}
        onSelectedChange={setSelectedIds}
      />
    </>
  );
}
