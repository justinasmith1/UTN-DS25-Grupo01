// src/components/Layout.jsx
"use client" //le indica a React que este componente es interactivo

// Importa estado, el placeholder de ruta y datos simulados de un js
import { useEffect, useState } from "react"
import { Outlet } from "react-router-dom"
import { mockUser } from "../lib/data"
import { getAllLotes, updateLote, deleteLote, createLote } from "../lib/api/lotes"

// Importa los componentes principales comunes a todas las páginas
import Header from "./Header"
import Botones from "./Botones"
import FilterBar from "./FilterBar"
import User from "./User"
import LotInfo from "./LotInfo"
import ModalGestionLote from "./ModalGestionLote"
import SidePanel from "./SidePanel"


export default function Layout() {
  // Estado global de lotes y filtros
  const [lotsData, setLotsData] = useState([]);
  // Cargo los lotes una sola vez
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await getAllLotes()
        if (alive) setLotsData(res.data || [])
      } catch (err) {
        // Manejo simple por ahora; después paso a toasts
        console.error(err)
        alert("No pude cargar los lotes")
      }
    })()
    return () => { alive = false }
  }, [])

  const [filters, setFilters] = useState({
    search: "",
    owner: [],
    location: [],
    status: [],
    subStatus: [],
  });
  // Control de visibilidad de los modales

  //Para mostrar el componente User
  const [showUserModal, setShowUserModal] = useState(false);

  //Guarda un lote seleccionado
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
  
  //Manejador para ver el detalle completo de un lote
  const handleViewDetail = (lotId) => {
    setSelectedLotId(lotId);
    setShowPanel(false)
    setShowLotInfo(true);
  };
  
  //Funcion para limpiar filtros 
  const handleClearFilters = () => {
    setFilters({ search: "", owner: [], location: [], status: [], subStatus: [] });
  };

  //Funcion para aplicar promocion -> Modularizar en otro componente
  const handleApplyPromotion = () => {
    alert("Acción Aplicar Promoción");
  };

  // — Handlers de SidePanel —
  const handleOpenPanel  = lotId => {
    setSelectedLotId(lotId)
    setShowPanel(true)
  }

  const handleClosePanel = () => setShowPanel(false)

  // Funciones para cambiar los estados de los lotes
  async function handleStatusChange(lotId, newStatus) {
    try {
      await updateLote(lotId, { status: newStatus })
      setLotsData(prev =>
        prev.map(l => (l.id === lotId ? { ...l, status: newStatus } : l))
      )
    } catch (err) {
      console.error(err)
      alert("No pude actualizar el estado del lote")
    }
  }

  async function handleSubStatusChange(lotId, newSubStatus) {
  try {
    await updateLote(lotId, { subStatus: newSubStatus })
    setLotsData(prev =>
      prev.map(l => (l.id === lotId ? { ...l, subStatus: newSubStatus } : l))
    )
  } catch (err) {
    console.error(err)
    alert("No pude actualizar el estado-plano del lote")
  }
}
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