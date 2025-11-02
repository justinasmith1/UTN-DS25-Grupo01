import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
// import { can, PERMISSIONS } from "../lib/auth/rbac";
import { useToast } from "../app/providers/ToastProvider";
import FilterBarLotes from "../components/FilterBar/FilterBarLotes";
import { applyLoteFilters } from "../utils/applyLoteFilters";
import TablaLotes from "../components/Table/TablaLotes/TablaLotes";
import LoteVerCard from "../components/Cards/Lotes/LoteVerCard.jsx";
import LoteEditarCard from "../components/Cards/Lotes/LoteEditarCard.jsx";
import LoteEliminarDialog from "../components/Cards/Lotes/LoteEliminarDialog.jsx";
import { getAllLotes, getLoteById, deleteLote } from "../lib/api/lotes";

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

  const [loteSel, setLoteSel] = useState(null);
  const [openVer, setOpenVer] = useState(false);
  const [openEditar, setOpenEditar] = useState(false);
  const [openEliminar, setOpenEliminar] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Callbacks normalizados
  const goRegistrarVenta = (lot) =>
    navigate(`/ventas?lotId=${encodeURIComponent(lot?.id ?? lot?.idLote)}`);

  const mergeUpdatedLote = useCallback((updated) => {
    if (!updated || updated.id == null) return;
      const idStr = String(updated.id);
      setAllLotes((prev) =>
        prev.map((row) =>
        String(row?.id) === idStr ? { ...row, ...updated } : row
          )
        );
        setLoteSel((prev) =>
          prev && String(prev.id) === idStr ? { ...prev, ...updated } : prev
        );
      }, []);
    
  const fetchAndMergeLote = useCallback(
      async (candidate) => {
        const id =
          candidate?.id ?? candidate?.loteId ?? candidate?.idLote ?? null;
        if (!id) return;
        try {
            const resp = await getLoteById(id);
            const detail = resp?.data ?? resp ?? null;
            if (detail) mergeUpdatedLote(detail);
          } catch (err) {
            console.error("Error obteniendo lote por id:", err);
            error("No pude obtener el detalle del lote.");
          }
        },
        [mergeUpdatedLote, error]
      );
    
      const onVer = useCallback(
        (lot) => {
          if (!lot) return;
          setLoteSel(lot);
          setOpenVer(true);
          fetchAndMergeLote(lot);
        },
        [fetchAndMergeLote]
      );
    
      const onEditar = useCallback(
        (lot) => {
          if (!lot) return;
          setLoteSel(lot);
          setOpenEditar(true);
          fetchAndMergeLote(lot);
        },
        [fetchAndMergeLote]
      );
    
      const onEliminar = useCallback((lot) => {
        if (!lot) return;
        setLoteSel(lot);
        setOpenEliminar(true);
      }, []);
    
      const handleEditSaved = useCallback(
        (updated) => {
          if (updated?.id == null) {
            setOpenEditar(false);
            return;
          }
          mergeUpdatedLote(updated);
          setOpenEditar(false);
        },
        [mergeUpdatedLote]
      );
    
      const handleDelete = useCallback(async () => {
        if (!loteSel?.id) return;
        try {
          setDeleting(true);
          await deleteLote(loteSel.id);
          setAllLotes((prev) =>
            prev.filter((row) => String(row?.id) !== String(loteSel.id))
          );
          setOpenEliminar(false);
          setOpenVer(false);
          setOpenEditar(false);
          setLoteSel(null);
        } catch (err) {
          console.error("Error eliminando lote:", err);
          error("No pude eliminar el lote.");
        } finally {
          setDeleting(false);
        }
      }, [loteSel, error]);

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

      <LoteVerCard
        open={openVer}
        lote={loteSel}
        lotes={allLotes}
        onClose={() => setOpenVer(false)}
        onEdit={(lot) => {
          setOpenVer(false);
          onEditar(lot);
        }}
        onReserve={goRegistrarVenta}
        onUpdated={mergeUpdatedLote}
      />

      <LoteEditarCard
        key={loteSel?.id ?? "lote-editar"}
        open={openEditar}
        lote={loteSel}
        loteId={loteSel?.id}
        lotes={allLotes}
        onCancel={() => setOpenEditar(false)}
        onSaved={handleEditSaved}
      />

      <LoteEliminarDialog
        open={openEliminar}
        lote={loteSel}
        loading={deleting}
        onCancel={() => setOpenEliminar(false)}
        onConfirm={handleDelete}
      />

    </>
  );
}
