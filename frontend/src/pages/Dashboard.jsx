import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
// import { can, PERMISSIONS } from "../lib/auth/rbac";
import { useToast } from "../app/providers/ToastProvider";
import FilterBarLotes from "../components/FilterBar/FilterBarLotes";
import { applyLoteFilters } from "../utils/applyLoteFilters";
import TablaLotes from "../components/Table/TablaLotes/TablaLotes";
import { getAllLotes } from "../lib/api/lotes";

/**
 * Dashboard
 * - Orquesta FilterBarLotes (filtros globales) + TablaLotes (presentación/acciones locales).
 */

export default function Dashboard() {
  const { user } = useAuth();
  const { error } = useToast();
  const userRole = (user?.role ?? user?.rol ?? "ADMIN").toString().trim().toUpperCase();
  const navigate = useNavigate();

  const authRaw = localStorage.getItem("auth:user");
  const authUser = authRaw ? JSON.parse(authRaw) : null;

  const userKey = [
    authUser?.id || authUser?.email || authUser?.username || "anon",
    userRole,
  ].join(":");

  // Callbacks normalizados
  const goRegistrarVenta = (lot) =>
    navigate(`/ventas?lotId=${encodeURIComponent(lot?.id ?? lot?.idLote)}`);

  const onEditar = (lot) => {
    // TODO: Implementar modal de edición
    console.log('Editar lote:', lot);
  };
  
  const onVer = (lot) => {
    // TODO: Implementar modal de visualización
    console.log('Ver lote:', lot);
  };
  
  const onEliminar = (lot) => {
    // TODO: Implementar confirmación y eliminación
    console.log('Eliminar lote:', lot);
  };

  // Estado de filtros (FilterBarLotes)
  const [params, setParams] = useState({});
  const handleParamsChange = useCallback((patch) => {
    if (!patch || Object.keys(patch).length === 0) { 
      setParams({}); 
      return; 
    }
    setParams((prev) => ({ ...prev, ...patch }));
  }, []);

  // Dataset base: obtenemos todos los lotes desde la API una sola vez
  const [allLotes, setAllLotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar todos los lotes al montar el componente
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        console.log('🔍 Cargando lotes desde API...');
        const res = await getAllLotes({});
        console.log('📊 Respuesta de API:', res);
        if (alive) { 
          const data = res.data || [];
          console.log('📋 Datos de lotes:', data);
          setAllLotes(data); 
        }
      } catch (err) {
        if (alive) {
          console.error('❌ Error al cargar lotes:', err);
          error("No pude cargar los lotes");
          setAllLotes([]);
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
  const lots = useMemo(() => {
    console.log('🔄 Aplicando filtros. allLotes:', allLotes.length, 'params:', params);
    const hasParams = params && Object.keys(params).length > 0;
    try {
      const result = hasParams ? applyLoteFilters(allLotes, params) : allLotes;
      console.log('✅ Resultado filtrado:', result.length, 'lotes');
      
      // Aplicar ordenamiento por ID ascendente siempre
      const sortedResult = [...result].sort((a, b) => {
        const idA = a?.id ?? a?.idLote ?? 0;
        const idB = b?.id ?? b?.idLote ?? 0;
        return idA - idB;
      });
      
      return sortedResult;
    } catch (err) {
      console.error('❌ Error aplicando filtros:', err);
      // Aplicar ordenamiento incluso en caso de error
      const sortedAllLotes = [...allLotes].sort((a, b) => {
        const idA = a?.id ?? a?.idLote ?? 0;
        const idB = b?.id ?? b?.idLote ?? 0;
        return idA - idB;
      });
      return sortedAllLotes;
    }
  }, [allLotes, params]);

  // Mostrar loading mientras se cargan los datos
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "40vh" }}>
        <div className="spinner-border" role="status" />
        <span className="ms-2">Cargando lotes…</span>
      </div>
    );
  }

  return (
    <>
      {/* Barra de filtros globales (controla qué data llega a la tabla) */}
      <FilterBarLotes 
        variant="dashboard" 
        userRole={userRole} 
        onParamsChange={handleParamsChange} 
      />

      <TablaLotes
        userRole={userRole}
        userKey={userKey}
        lotes={lots}
        data={lots}
        onVer={onVer}
        onView={onVer}
        onEditar={onEditar}
        onEdit={onEditar}
        onEliminar={onEliminar}
        onDelete={onEliminar}
        onRegistrarVenta={goRegistrarVenta}
        onRegisterSale={goRegistrarVenta}
        // onVerEnMapa={(ids) => ...} 
        // onAddLot={() => ...}
      />
    </>
  );
}
