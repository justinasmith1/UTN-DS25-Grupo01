import { useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
import { can, PERMISSIONS } from "../lib/auth/rbac";
import FilterBar from "../components/FilterBar/FilterBar";
import { applyLoteFilters } from "../utils/applyLoteFilters";
import TablaLotes from "../components/TablaLotes/TablaLotes";
import { lotesFilterPreset } from "../components/FilterBar/presets/lotes.preset";

/**
 * Dashboard
 * - Orquesta FilterBar (filtros globales) + TablaLotes (presentación/acciones locales).
 */

export default function Dashboard() {
  const ctx = useOutletContext() || {};
  const { user } = useAuth();
  const userRole = (user?.role ?? user?.rol ?? "ADMIN").toString().trim().toUpperCase();

  const authRaw = localStorage.getItem("auth:user");
  const authUser = authRaw ? JSON.parse(authRaw) : null;

  const userKey = [
    authUser?.id || authUser?.email || authUser?.username || "anon",
    userRole,
  ].join(":");

  const {
    handleViewDetail: _handleViewDetail,
    abrirModalEditar,
    abrirModalEliminar,
    handleDeleteLote,
  } = ctx;

  const navigate = useNavigate();

  // Permisos (booleans)
  const canSaleCreate = can(user, PERMISSIONS.SALE_CREATE);
  const canLotEdit = can(user, PERMISSIONS.LOT_EDIT);
  const canLotDelete = can(user, PERMISSIONS.LOT_DELETE);

  // Callbacks normalizados
  const goRegistrarVenta = (lot) =>
    navigate(`/ventas?lotId=${encodeURIComponent(lot?.id ?? lot?.idLote)}`);

  const onEditar = (lot) => abrirModalEditar?.(lot?.id ?? lot?.idLote);
  const onVer = (lot) => _handleViewDetail?.(lot?.id ?? lot?.idLote);
  const onEliminar = (lot) => {
    const id = lot?.id ?? lot?.idLote;
    if (abrirModalEliminar) return abrirModalEliminar(id);
    if (handleDeleteLote) return handleDeleteLote(id);
    alert("Eliminar no disponible en esta vista.");
  };

  // Estado de filtros (FilterBar)
  const [params, setParams] = useState({});
  const handleParamsChange = (patch) => {
    if (!patch || Object.keys(patch).length === 0) { setParams({}); return; }
    setParams((prev) => ({ ...prev, ...patch }));
  };

  // Dataset base: tomamos el que expone Layout vía Outlet
  const lots = useMemo(() => {
    const rawLots =
      ctx?.allLots ??
      ctx?.lots ??
      ctx?.lotes ??
      ctx?.data?.lotes ??
      [];
    const base = Array.isArray(rawLots) ? rawLots : [];
    const hasParams = params && Object.keys(params).length > 0;

    try {
      return hasParams ? applyLoteFilters(base, params) : base;
    } catch {
      return base;
    }
  }, [ctx, params]);

  return (
    <>
      <FilterBar
        preset={lotesFilterPreset}
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
        canSaleCreate={canSaleCreate}
        canLotEdit={canLotEdit}
        canLotDelete={canLotDelete}
      />
    </>
  );
}
