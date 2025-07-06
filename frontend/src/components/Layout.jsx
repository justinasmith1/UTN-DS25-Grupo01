// src/components/Layout.jsx
"use client"

// Importa estado, el placeholder de ruta y datos simulados
import { useState } from "react"
import { Outlet } from "react-router-dom"
import { mockLots, mockUser } from "../lib/data"

// Importa los componentes principales que se muestran en todas las páginas
import Header from "./Header"
import Botones from "./Botones"
import FilterBar from "./FilterBar"
import User from "./User"
import LotInfo from "./LotInfo"
import ModalGestionLote from "./ModalGestionLote"
import SidePanel from "./SidePanel"


export default function Layout() {
  // Estado global de lotes y filtros
  const [lotsData, setLotsData] = useState(mockLots);
  const [filters, setFilters] = useState({
    search: "",
    owner: [],
    location: [],
    status: [],
    subStatus: [],
  });
  // Control de visibilidad de los modales

  //Estados modales y seleccion
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedLotId, setSelectedLotId] = useState(null);

  //Para LotInfo
  const [showLotInfo, setShowLotInfo] = useState(false);

  //Para SidePanel
  const [showPanel, setShowPanel] = useState(false)

  //Modal para crear/editar
  const [modalLote, setModalLote] = useState({
    show: false,
    modo: "crear",      // "crear" o "editar"
    datosIniciales: null
   })

  // Logica de filtrado segun los criterios seleccionados
  const filteredLots = lotsData.filter((lot) => {
    if (filters.search && !lot.id.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.owner.length > 0 && !filters.owner.includes(lot.owner)) return false;
    if (filters.location.length > 0 && !filters.location.includes(lot.location || "")) return false;
    if (filters.status.length > 0 && !filters.status.includes(lot.status)) return false;
    if (filters.subStatus.length > 0 && !filters.subStatus.includes(lot.subStatus)) return false;
    return true;
  });

  // Funciones para manejar los datos y modificar, eliminar, etc
  const handleStatusChange = (lotId, newStatus) => {
    setLotsData((prev) => prev.map((lot) => (lot.id === lotId ? { ...lot, status: newStatus } : lot)));
  };

  const handleSubStatusChange = (lotId, newSubStatus) => {
      setLotsData((prev) => prev.map((lot) => (lot.id === lotId ? { ...lot, subStatus: newSubStatus } : lot)));
    };
  
  const handleViewDetail = (lotId) => {
    setSelectedLotId(lotId);
    setShowPanel(false)
    setShowLotInfo(true);
  };
  
  const handleClearFilters = () => {
    setFilters({ search: "", owner: [], location: [], status: [], subStatus: [] });
  };

  const handleApplyPromotion = () => {
    alert("Acción Aplicar Promoción");
  };

  // — Handlers de SidePanel —
  const handleOpenPanel  = lotId => {
    setSelectedLotId(lotId)
    setShowPanel(true)
  }
  const handleClosePanel = () => setShowPanel(false)


  // Abre el modal para crear un lote
  const abrirModalCrear = () => {
    setModalLote({ show: true, modo: "crear", datosIniciales: null })
  }

  // Abre el modal para editar un lote existente
  const abrirModalEditar = (lote) => {
    setModalLote({ show: true, modo: "editar", datosIniciales: lote })
   }

  // Guarda o actualiza un lote según el modo
  const guardarLote = (lote) => {
    if (modalLote.modo === "editar") {
      setLotsData(prev =>
        prev.map(l => (l.id === lote.id ? { ...l, ...lote } : l))
      )
    } else {
      setLotsData(prev => [...prev, lote])
    }
  }

  // Elimina lote desde el modal
  const eliminarLote = (id) => {
    setLotsData(prev => prev.filter(l => l.id !== id))
   }

  const abrirModalEliminar = (lote) => {
    setModalLote({ show: true, modo: "borrar", datosIniciales: lote })
   }

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
      
      <Outlet context={{ 
        lots: filteredLots, 
        handleStatusChange,
        handleSubStatusChange,
        handleViewDetail,
        abrirModalEditar,
        abrirModalEliminar,
        openSidePanel: handleOpenPanel
      }} />

      <SidePanel
        show={showPanel}
        onHide={handleClosePanel}
        selectedLotId={selectedLotId}
        onViewDetail={handleViewDetail}
        lots={filteredLots}                     
        abrirModalEditar={abrirModalEditar}
        abrirModalEliminar={abrirModalEliminar}     
      />

      <User 
        show={showUserModal} 
        onHide={() => setShowUserModal(false)} 
        user={mockUser} 
      />

      <LotInfo 
        show={showLotInfo} 
        onHide={() => setShowLotInfo(false)} 
        selectedLotId={selectedLotId} 
        lots={filteredLots} 
        abrirModalEditar={abrirModalEditar}
        abrirModalEliminar={abrirModalEliminar}
        />

      {/* Modal unico para crear, editar y eliminar */}
      <ModalGestionLote
        show={modalLote.show}
        modo={modalLote.modo}
        datosIniciales={modalLote.datosIniciales}
        onHide={() => setModalLote(prev => ({ ...prev, show: false }))}
        onSave={guardarLote}
        onDelete={eliminarLote}
       /> 
    </div>
  )
}