"use client" // este componente es interactivo

// Estado, rutas y adapters
import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
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
  const [loadingLots, setLoadingLots] = useState(true); // estoy cargando los lotes
  const { success, error, info } = useToast();

  // Cargo los lotes una sola vez desde el adapter (mock o backend)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingLots(true);
        const res = await getAllLotes();
        if (alive) setLotsData(res.data || []);
      } catch (err) {
        console.error(err);
        error("No pude cargar los lotes");     // <-- antes era alert
      } finally {
        if (alive) setLoadingLots(false);
      }
    })();
    return () => { alive = false; };
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

  // Aplico los filtros sobre la lista en memoria
  const filteredLots = lotsData.filter((lot) => {
    if (
      filters.search &&
      !lot.id.toLowerCase().includes(filters.search.toLowerCase())
    )
      return false;
    if (filters.owner.length > 0 && !filters.owner.includes(lot.owner))
      return false;
    if (
      filters.location.length > 0 &&
      !filters.location.includes(lot.location || "")
    )
      return false;
    if (filters.status.length > 0 && !filters.status.includes(lot.status))
      return false;
    if (
      filters.subStatus.length > 0 &&
      !filters.subStatus.includes(lot.subStatus)
    )
      return false;
    return true;
  });

  // Limpio todos los filtros
  const handleClearFilters = () => {
    setFilters({ search: "", owner: [], location: [], status: [], subStatus: [] });
  };

  // Accion placeholder (queda para cuando definamos la promo)
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

  // Ver detalle completo del lote (cierra panel y abre vista detalle)
  const handleViewDetail = (lotId) => {
    setSelectedLotId(lotId);
    setShowPanel(false);
    setShowLotInfo(true);
  };

  // Modal único de crear/editar/eliminar
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

  // ---------------------------------------------------------------------------
  // Handlers que PERSISTEN y luego sincronizan el estado local
  // (Uso el adapter: mock o backend según .env)
  // ---------------------------------------------------------------------------

  // Cambio "status" del lote: persisto y después actualizo en memoria
  const handleStatusChange = async (lotId, newStatus) => {
    try {
      await updateLote(lotId, { status: newStatus });
      setLotsData(prev => prev.map(l => (l.id === lotId ? { ...l, status: newStatus } : l)));
      success("Estado actualizado");             // feedback positivo
    } catch (err) {
      console.error(err);
      error("No pude actualizar el estado del lote");
    }
  };

  const handleSubStatusChange = async (lotId, newSubStatus) => {
    try {
      await updateLote(lotId, { subStatus: newSubStatus });
      setLotsData(prev => prev.map(l => (l.id === lotId ? { ...l, subStatus: newSubStatus } : l)));
      success("Estado-plano actualizado");
    } catch (err) {
      console.error(err);
      error("No pude actualizar el estado-plano");
    }
  };

  // Guardar desde el modal:
  // - si estoy en "editar": update
  // - si estoy en "crear": create
  const guardarLote = async (lote) => {
    try {
      if (modalLote.modo === "editar" && lote?.id) {
        const res = await updateLote(lote.id, lote);
        const updated = res.data || lote;
        setLotsData(prev => prev.map(l => (l.id === lote.id ? updated : l)));
        success("Lote actualizado");
      } else {
        const res = await createLote(lote);
        const created = res.data || lote;
        setLotsData(prev => [...prev, created]);
        success("Lote creado");
      }
      setModalLote(prev => ({ ...prev, show: false }));
    } catch (err) {
      console.error(err);
      error("No pude guardar el lote");
    }
  };

  // Eliminar desde el modal: persisto y después saco de la lista

  const eliminarLote = async (id) => {
    try {
      await deleteLote(id);
      setLotsData(prev => prev.filter(l => l.id !== id));
      setModalLote(prev => ({ ...prev, show: false }));
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
        abrirModalEditar={abrirModalEditar}
        abrirModalEliminar={abrirModalEliminar}
      />

      {/* Modal de usuario (placeholder) */}
      <User
        show={showUserModal}
        onHide={() => setShowUserModal(false)}
        user={mockUser}
      />

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
        onHide={() => setModalLote((prev) => ({ ...prev, show: false }))}
        onSave={guardarLote}
        onDelete={eliminarLote}
      />
    </div>
  );
}
