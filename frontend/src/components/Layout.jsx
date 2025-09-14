"use client" // este componente es interactivo

// Estado, rutas y adapters
import { useEffect, useState } from "react";
import { Outlet, useSearchParams } from "react-router-dom";
import { useToast } from "../app/providers/ToastProvider";
import { mockUser } from "../lib/data"; // solo para el modal de usuario
import {
  getAllLotes,
  updateLote,
  deleteLote,
  createLote,
} from "../lib/api/lotes";

// Componentes comunes de la app
import Header from "./Header";
import Botones from "./Botones";
import FilterBar from "./FilterBar";
import User from "./User";
import LotInfo from "./LotInfo";
import ModalGestionLote from "./ModalGestionLote";
import SidePanel from "./SidePanel";

export default function Layout() {
  // ---------------------------------------------------------------------------
  // Estado global de lotes (la fuente de verdad en el front)
  // ---------------------------------------------------------------------------
  const [lotsData, setLotsData] = useState([]);
  const [loadingLots, setLoadingLots] = useState(true);
  const { success, error, info } = useToast();

  // Leo querystring (para abrir modal por ?editLotId=)
  const [searchParams, setSearchParams] = useSearchParams();
  const editLotId = searchParams.get("editLotId");

  // Cargo los lotes una sola vez
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingLots(true);
        const res = await getAllLotes();
        if (alive) setLotsData(res.data || []);
      } catch (err) {
        console.error(err);
        error("No pude cargar los lotes");
      } finally {
        if (alive) setLoadingLots(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Filtros del Dashboard
  // ---------------------------------------------------------------------------
  const [filters, setFilters] = useState({
    search: "",
    owner: [],
    location: [],
    status: [],
    subStatus: [],
  });

  // Aplico filtros sobre la lista en memoria
  const filteredLots = lotsData.filter((lot) => {
    if (filters.search && !lot.id.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.owner.length > 0 && !filters.owner.includes(lot.owner)) return false;
    if (filters.location.length > 0 && !filters.location.includes(lot.location || "")) return false;
    if (filters.status.length > 0 && !filters.status.includes(lot.status)) return false;
    if (filters.subStatus.length > 0 && !filters.subStatus.includes(lot.subStatus)) return false;
    return true;
  });

  const handleClearFilters = () => {
    setFilters({ search: "", owner: [], location: [], status: [], subStatus: [] });
  };

  const handleApplyPromotion = () => {
    info("Acción Aplicar Promoción");
  };

  // ---------------------------------------------------------------------------
  // Modales y paneles
  // ---------------------------------------------------------------------------
  const [showUserModal, setShowUserModal] = useState(false);

  const [selectedLotId, setSelectedLotId] = useState(null);
  const [showLotInfo, setShowLotInfo] = useState(false);

  const [showPanel, setShowPanel] = useState(false);
  const handleOpenPanel = (lotId) => {
    setSelectedLotId(lotId);
    setShowPanel(true);
  };
  const handleClosePanel = () => setShowPanel(false);

  // Ver detalle (cierra panel y abre ficha)
  const handleViewDetail = (lotId) => {
    setSelectedLotId(lotId);
    setShowPanel(false);
    setShowLotInfo(true);
  };

  // Modal único de gestionar lote
  const [modalLote, setModalLote] = useState({
    show: false,
    modo: "crear", // "crear" | "editar" | "borrar"
    datosIniciales: null,
  });

  const abrirModalCrear = () => {
    setModalLote({ show: true, modo: "crear", datosIniciales: null });
  };

  const abrirModalEditar = (lote) => {
    setModalLote({ show: true, modo: "editar", datosIniciales: lote });
  };

  const abrirModalEliminar = (lote) => {
    setModalLote({ show: true, modo: "borrar", datosIniciales: lote });
  };

  // Si viene ?editLotId=... → abro el modal en "editar"
  useEffect(() => {
    if (!editLotId) return;
    const lot = (lotsData || []).find((l) => String(l.id) === String(editLotId));
    if (lot) {
      setModalLote({ show: true, modo: "editar", datosIniciales: lot });
    }
    // Si quisieras, acá podrías hacer getLoteById(editLotId) si no está en memoria.
  }, [editLotId, lotsData]);

  // Cerrar modal: además limpio ?editLotId para no reabrirlo al volver
  const cerrarModalGestion = () => {
    setModalLote((prev) => ({ ...prev, show: false }));
    if (searchParams.has("editLotId")) {
      const next = new URLSearchParams(searchParams);
      next.delete("editLotId");
      setSearchParams(next);
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers que PERSISTEN y luego sincronizan el estado local
  // ---------------------------------------------------------------------------
  const handleStatusChange = async (lotId, newStatus) => {
    try {
      await updateLote(lotId, { status: newStatus });
      setLotsData((prev) => prev.map((l) => (l.id === lotId ? { ...l, status: newStatus } : l)));
      success("Estado actualizado");
    } catch (err) {
      console.error(err);
      error("No pude actualizar el estado del lote");
    }
  };

  const handleSubStatusChange = async (lotId, newSubStatus) => {
    try {
      await updateLote(lotId, { subStatus: newSubStatus });
      setLotsData((prev) => prev.map((l) => (l.id === lotId ? { ...l, subStatus: newSubStatus } : l)));
      success("Estado-plano actualizado");
    } catch (err) {
      console.error(err);
      error("No pude actualizar el estado-plano");
    }
  };

  // Guardar desde el modal (crear/editar)
  const guardarLote = async (lote) => {
    try {
      if (modalLote.modo === "editar" && lote?.id) {
        const res = await updateLote(lote.id, lote);
        const updated = res.data || lote;
        setLotsData((prev) => prev.map((l) => (l.id === lote.id ? updated : l)));
        success("Lote actualizado");
      } else {
        const res = await createLote(lote);
        const created = res.data || lote;
        setLotsData((prev) => [...prev, created]);
        success("Lote creado");
      }
      cerrarModalGestion();
    } catch (err) {
      console.error(err);
      error("No pude guardar el lote");
    }
  };

  // Eliminar desde el modal
  const eliminarLote = async (id) => {
    try {
      await deleteLote(id);
      setLotsData((prev) => prev.filter((l) => l.id !== id));
      cerrarModalGestion();
      success("Lote eliminado");
    } catch (err) {
      console.error(err);
      error("No pude eliminar el lote");
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-vh-100 d-flex flex-column bg-white">
      <Header onUserClick={() => setShowUserModal(true)} user={mockUser} />

      <Botones />

      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        onAddRecord={abrirModalCrear}
        onApplyPromotion={handleApplyPromotion}
        onClearFilters={handleClearFilters}
      />

      {/* Paso datos y handlers a las páginas hijas */}
      <Outlet
        context={{
          lots: filteredLots,
          loadingLots,
          handleStatusChange,
          handleSubStatusChange,
          handleViewDetail,
          abrirModalEditar,
          abrirModalEliminar,
          openSidePanel: handleOpenPanel,
        }}
      />

      {/* Panel lateral del lote */}
      <SidePanel
        show={showPanel}
        onHide={handleClosePanel}
        selectedLotId={selectedLotId}
        onViewDetail={handleViewDetail}
        lots={filteredLots}
        abrirModalEditar={abrirModalEditar}     // lo dejo para compatibilidad
        abrirModalEliminar={abrirModalEliminar} // idem
      />

      {/* Modal de usuario (placeholder) */}
      <User show={showUserModal} onHide={() => setShowUserModal(false)} user={mockUser} />

      {/* Detalle completo del lote */}
      <LotInfo
        show={showLotInfo}
        onHide={() => setShowLotInfo(false)}
        selectedLotId={selectedLotId}
        lots={filteredLots}
        abrirModalEditar={abrirModalEditar}
        abrirModalEliminar={abrirModalEliminar}
      />

      {/* Modal único de crear / editar / eliminar */}
      <ModalGestionLote
        show={modalLote.show}
        modo={modalLote.modo}
        datosIniciales={modalLote.datosIniciales}
        onHide={cerrarModalGestion}   // ← cierro y limpio ?editLotId
        onSave={guardarLote}
        onDelete={eliminarLote}
      />
    </div>
  );
}
