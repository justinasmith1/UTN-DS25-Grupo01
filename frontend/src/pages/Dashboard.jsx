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
import LoteCrearCard from "../components/Cards/Lotes/LoteCrearCard.jsx";
import ReservaCrearCard from "../components/Cards/Reservas/ReservaCrearCard.jsx";
import { getAllLotes, getLoteById, deleteLote } from "../lib/api/lotes";
import { getAllReservas, getReservaById } from "../lib/api/reservas";
import ReservaVerCard from "../components/Cards/Reservas/ReservaVerCard.jsx";

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
  const [openCrear, setOpenCrear] = useState(false);
  const [openReservaCrear, setOpenReservaCrear] = useState(false);
  const [openReservaVer, setOpenReservaVer] = useState(false);
  const [reservaSel, setReservaSel] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);

  // Callbacks normalizados
  const goRegistrarVenta = (lot) =>
    navigate(`/ventas?lotId=${encodeURIComponent(lot?.id ?? lot?.idLote)}`);

  const handleReservarLote = useCallback(async (lot) => {
    if (!lot) return;
    setLoteSel(lot);
    setOpenVer(false);
    
    // Verificar si el lote está RESERVADO
    const estadoUpper = String(lot?.estado || "").toUpperCase();
    if (estadoUpper === "RESERVADO") {
      // Buscar la reserva ACTIVA para este lote
      try {
        const reservasResp = await getAllReservas({});
        const allReservas = reservasResp?.data || [];
        const reservaActiva = allReservas.find(
          (r) => 
            (r.loteId || r.lote?.id) === lot.id &&
            String(r.estado || "").toUpperCase() === "ACTIVA"
        );
        
        if (reservaActiva) {
          // Abrir el modal de ver reserva
          setReservaSel(reservaActiva);
          setOpenReservaVer(true);
        } else {
          // Si no hay reserva activa, permitir crear (caso edge)
          setOpenReservaCrear(true);
        }
      } catch (err) {
        console.error("Error buscando reserva:", err);
        // En caso de error, abrir crear
        setOpenReservaCrear(true);
      }
    } else {
      // Si no está reservado, abrir crear
      setOpenReservaCrear(true);
    }
  }, []);

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

      const onAgregarLote = useCallback(() => {
        setOpenCrear(true);
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
          setShowDeleteSuccess(true);
          setTimeout(() => {
            setShowDeleteSuccess(false);
          }, 1500);
        } catch (err) {
          console.error("Error eliminando lote:", err);
          error("No pude eliminar el lote.");
        } finally {
          setDeleting(false);
        }
      }, [loteSel, error]);

      const handleCreated = useCallback(
        async (newLote) => {
          if (!newLote?.id) return;
          try {
            // Obtener el lote completo desde la API
            const resp = await getLoteById(newLote.id);
            const detail = resp?.data ?? resp ?? newLote;
            // Agregar al inicio de la lista
            setAllLotes((prev) => [detail, ...prev]);
          } catch (err) {
            console.error("Error obteniendo lote creado:", err);
            // Aún así agregar el lote que viene del create
            setAllLotes((prev) => [newLote, ...prev]);
          }
        },
        []
      );

  // Estado de filtros (FilterBarLotes)
  const [params, setParams] = useState({});
  const handleParamsChange = useCallback((patch) => {
    if (!patch || Object.keys(patch).length === 0) { 
      setParams({}); 
      return; 
    }
    
    // Convertir objetos de rango ({ min, max }) a parámetros planos (frenteMin, frenteMax, etc.)
    const convertedParams = { ...patch };
    
    // Convertir rangos a formato plano que espera applyLoteFilters
    if (patch.frente && (patch.frente.min !== null || patch.frente.max !== null)) {
      convertedParams.frenteMin = patch.frente.min !== null ? patch.frente.min : undefined;
      convertedParams.frenteMax = patch.frente.max !== null ? patch.frente.max : undefined;
      delete convertedParams.frente;
    }
    
    if (patch.fondo && (patch.fondo.min !== null || patch.fondo.max !== null)) {
      convertedParams.fondoMin = patch.fondo.min !== null ? patch.fondo.min : undefined;
      convertedParams.fondoMax = patch.fondo.max !== null ? patch.fondo.max : undefined;
      delete convertedParams.fondo;
    }
    
    if (patch.sup && (patch.sup.min !== null || patch.sup.max !== null)) {
      convertedParams.supMin = patch.sup.min !== null ? patch.sup.min : undefined;
      convertedParams.supMax = patch.sup.max !== null ? patch.sup.max : undefined;
      delete convertedParams.sup;
    }
    
    if (patch.precio && (patch.precio.min !== null || patch.precio.max !== null)) {
      convertedParams.priceMin = patch.precio.min !== null ? patch.precio.min : undefined;
      convertedParams.priceMax = patch.precio.max !== null ? patch.precio.max : undefined;
      delete convertedParams.precio;
    }
    
    setParams((prev) => {
      // Limpiar parámetros de rango antiguos si existen
      const cleaned = { ...prev };
      delete cleaned.frente;
      delete cleaned.fondo;
      delete cleaned.sup;
      delete cleaned.precio;
      delete cleaned.frenteMin;
      delete cleaned.frenteMax;
      delete cleaned.fondoMin;
      delete cleaned.fondoMax;
      delete cleaned.supMin;
      delete cleaned.supMax;
      delete cleaned.priceMin;
      delete cleaned.priceMax;
      
      return { ...cleaned, ...convertedParams };
    });
  }, []);

  // Dataset base: obtenemos todos los lotes desde la API una sola vez
  const [allLotes, setAllLotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar datos completos de la reserva cuando se abre el modal
  useEffect(() => {
    if (openReservaVer && reservaSel?.id) {
      (async () => {
        try {
          const resp = await getReservaById(reservaSel.id);
          const detail = resp?.data ?? resp ?? {};
          setReservaSel((prev) => ({ ...(prev || reservaSel), ...(detail || {}) }));
        } catch (e) {
          console.error("Error obteniendo reserva por id:", e);
        }
      })();
    }
  }, [openReservaVer, reservaSel?.id]);

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
        onAgregarLote={onAgregarLote}
        // onVerEnMapa={(ids) => ...}
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
        onReserve={handleReservarLote}
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

      <LoteCrearCard
        open={openCrear}
        onCancel={() => setOpenCrear(false)}
        onCreated={handleCreated}
      />

      <ReservaVerCard
        open={openReservaVer}
        reserva={reservaSel}
        reservas={[]}
        onClose={() => {
          setOpenReservaVer(false);
          setReservaSel(null);
        }}
        onEdit={(reserva) => {
          setOpenReservaVer(false);
          // Redirigir a la página de reservas para editar
          navigate(`/reservas`);
        }}
      />

      <ReservaCrearCard
        open={openReservaCrear}
        onCancel={() => {
          setOpenReservaCrear(false);
          setLoteSel(null);
        }}
        onCreated={(newReserva) => {
          setOpenReservaCrear(false);
          setLoteSel(null);
          // Opcional: mostrar mensaje de éxito o actualizar lista
        }}
        loteIdPreSeleccionado={loteSel?.id}
      />

      {/* Animación de éxito al eliminar */}
      {showDeleteSuccess && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "grid",
            placeItems: "center",
            zIndex: 10000,
            animation: "fadeIn 0.2s ease-in",
            pointerEvents: "auto",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "32px 48px",
              borderRadius: "12px",
              boxShadow: "0 12px 32px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
              animation: "scaleIn 0.3s ease-out",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "#10b981",
                display: "grid",
                placeItems: "center",
                animation: "checkmark 0.5s ease-in-out",
              }}
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h3
              style={{
                margin: 0,
                fontSize: "20px",
                fontWeight: 600,
                color: "#111",
              }}
            >
              ¡Lote eliminado exitosamente!
            </h3>
          </div>
        </div>
      )}

    </>
  );
}
