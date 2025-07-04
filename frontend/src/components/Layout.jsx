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
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedLotId, setSelectedLotId] = useState(null);
  const [showLotInfo, setShowLotInfo] = useState(false);

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
  const handleDeleteLot = (lotId) => {
    if (window.confirm("¿Está seguro de eliminar este lote?")) {
      setLotsData((prev) => prev.filter((lot) => lot.id !== lotId));
      alert("Lote eliminado");
    }
  };
   const handleViewDetail = (lotId) => {
    setSelectedLotId(lotId);
    setShowLotInfo(true);
  };
  const handleClearFilters = () => {
    setFilters({ search: "", owner: [], location: [], status: [], subStatus: [] });
  };
  const handleAddRecord = () => {
    alert("Acción Añadir Nuevo Registro");
  };

  const handleApplyPromotion = () => {
    alert("Acción Aplicar Promoción");
  };


  return (
    <div className="min-vh-100 d-flex flex-column bg-white">
      <Header onUserClick={() => setShowUserModal(true)} user={mockUser} />
      <Botones />
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        onAddRecord={handleAddRecord}
        onApplyPromotion={handleApplyPromotion}
        onClearFilters={handleClearFilters}
      />
      
      <Outlet context={{ 
        lots: filteredLots, 
        handleStatusChange, 
        handleDeleteLot,
        handleViewDetail 
      }} />

      <User show={showUserModal} onHide={() => setShowUserModal(false)} user={mockUser} />
      <LotInfo show={showLotInfo} onHide={() => setShowLotInfo(false)} selectedLotId={selectedLotId} />
    </div>
  )
}