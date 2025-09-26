import { useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
import { can, PERMISSIONS } from "../lib/auth/rbac";
import FilterBar from "../components/FilterBar/FilterBar";
import { applyLoteFilters } from "../utils/applyLoteFilters";
import TablaLotes from "../components/TablaLotes/TablaLotes";

/**
 * Dashboard
 * - Orquesta FilterBar (filtros globales) + TablaLotes (presentación/acciones locales).
 * - NO define estilos de la tabla (eso está co-localizado en components/TablaLotes/TablaLotes.css).
 * - Cuando implementemos los modales de "Aplicar promoción" y "Agregar lote",
 *   volveremos a pasar los callbacks a TablaLotes (onApplyPromotion / onAddLot).
 */

export default function Dashboard() {
  const ctx = useOutletContext() || {};

  const { user } = useAuth();
  const userRole = (user?.role ?? user?.rol ?? "ADMIN").toString().trim().toUpperCase();

  const authRaw = localStorage.getItem('auth:user');
  const authUser = authRaw ? JSON.parse(authRaw) : null;

  const userKey = [
    authUser?.id || authUser?.email || authUser?.username || 'anon',
    userRole
  ].join(':');

  const {
    handleViewDetail: _handleViewDetail,
    abrirModalEditar,
    abrirModalEliminar,
    handleDeleteLote,
  } = ctx;

  const navigate = useNavigate();

  // Permisos (booleans) calculados con tu helper RBAC
  const canSaleCreate = can(user, PERMISSIONS.SALE_CREATE);
  const canLotEdit = can(user, PERMISSIONS.LOT_EDIT);
  const canLotDelete = can(user, PERMISSIONS.LOT_DELETE);

  // Navegación / callbacks existentes
  const goRegistrarVenta = (lot) =>
    // Normalizamos id por si viene como idLote
    navigate(`/ventas?lotId=${encodeURIComponent(lot?.id ?? lot?.idLote)}`);

  const onEditar = (lot) => abrirModalEditar?.(lot?.id ?? lot?.idLote);
  const onVer = (lot) => _handleViewDetail?.(lot?.id ?? lot?.idLote);
  const onEliminar = (lot) => {
    const id = lot?.id ?? lot?.idLote;
    if (abrirModalEliminar) return abrirModalEliminar(id);
    if (handleDeleteLote) return handleDeleteLote(id);
    alert("Eliminar no disponible en esta vista.");
  };

  // Estado de filtros globales (FilterBar)
  const [params, setParams] = useState({});

  const handleParamsChange = (patch) => {
    if (!patch || Object.keys(patch).length === 0) {
      // Caso "Limpiar": vaciamos todo
      setParams({});
      return;
    }
    // Caso "parche" (e.g. { q }) o "aplicar filtros" (objeto completo):
    setParams((prev) => ({ ...prev, ...patch }));
  };
  // 🧠 Regla clara: si NO hay parámetros → mostramos TODO.
  //                 si HAY parámetros → aplicamos applyLoteFilters(base, params).
  const lots = useMemo(() => {
    // 🔧 Tomamos el dataset base con nombres alternativos por si cambian en el Layout/Outlet
    //    (esto evita que quede vacío si la prop se llama distinto).
    const rawLots =
      ctx?.allLots ??
      ctx?.lots ??
      ctx?.lotes ??
      ctx?.data?.lotes ??
      [];
    
    const base = Array.isArray(rawLots) ? rawLots : [];
    const hasParams = params && Object.keys(params).length > 0;

    console.log('[DEBUG] Dashboard - rawLots:', base);
    console.log('[DEBUG] Dashboard - params:', params);
    console.log('[DEBUG] Dashboard - hasParams:', hasParams);

    try {
      const result = hasParams ? applyLoteFilters(base, params) : base;
      console.log('[DEBUG] Dashboard - resultado final:', result);
      return result;
    } catch (e) {
      console.warn("[Dashboard] applyLoteFilters lanzó error; devuelvo base completa:", e);
      return base;
    }
  }, [ctx, params]);

  return (
    <>
      {/* Barra de filtros globales (controla qué data llega a la tabla) */}
      <FilterBar variant="dashboard" userRole={userRole} onParamsChange={handleParamsChange} />

      {/* Tablero de información (TablaLotes) */}
      <TablaLotes
        userRole={userRole}
        userKey={userKey}
        data={lots}
        // Permisos (acciones visibles en la tabla)
        canSaleCreate={canSaleCreate}
        canLotEdit={canLotEdit}
        canLotDelete={canLotDelete}
        // Callbacks actuales
        onView={onVer}
        onEdit={onEditar}
        onDelete={onEliminar}
        onRegisterSale={goRegistrarVenta}
        // onVerEnMapa={(ids) => ...} // 👉 lo agregamos cuando esté el modal
        // onAddLot={() => ...}            // 👉 lo agregamos cuando esté el modal
      />
    </>
  );
}
