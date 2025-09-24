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

  // 🔧 Tomamos el dataset base con nombres alternativos por si cambian en el Layout/Outlet
  //    (esto evita que quede vacío si la prop se llama distinto).
  const rawLots =
    ctx?.allLots ??
    ctx?.lots ??
    ctx?.lotes ??
    ctx?.data?.lotes ??
    [];

  const { user } = useAuth();
  const userRole = (user?.role ?? user?.rol ?? "ADMIN").toString().trim().toUpperCase();

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

  // 🧠 Regla clara: si NO hay parámetros → mostramos TODO.
  //                 si HAY parámetros → aplicamos applyLoteFilters(base, params).
  const lots = useMemo(() => {
    const base = Array.isArray(rawLots) ? rawLots : [];
    const hasParams = params && Object.keys(params).length > 0;

    try {
      return hasParams ? applyLoteFilters(base, params) : base;
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn("[Dashboard] applyLoteFilters lanzó error; devuelvo base completa:", e);
      }
      return base;
    }
  }, [rawLots, params]);

  return (
    <>
      {/* Barra de filtros globales (controla qué data llega a la tabla) */}
      <FilterBar variant="dashboard" userRole={userRole} onParamsChange={setParams} />

      {/* Tablero de información (TablaLotes) */}
      <TablaLotes
        userRole={userRole}
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
        // onApplyPromotion={(ids) => ...} // 👉 lo agregamos cuando esté el modal
        // onAddLot={() => ...}            // 👉 lo agregamos cuando esté el modal
      />
    </>
  );
}
