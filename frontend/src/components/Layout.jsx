"use client"

import { useEffect, useState } from "react";
import { Outlet, useSearchParams, useLocation } from "react-router-dom";
import { useToast } from "../app/providers/ToastProvider";
import { mockUser } from "../lib/data";
import { getAllLotes, updateLote, deleteLote, createLote } from "../lib/api/lotes";

import Header from "./Header";
// import Botones from "./Botones"; // ← evitamos duplicados
import ModulePills from "./ModulePills";     // ← NUEVO: las píldoras
import FilterBar from "./FilterBar/FilterBar";
import User from "./User";
import LotInfo from "./LotInfo";
import ModalGestionLote from "./ModalGestionLote";
import SidePanel from "./SidePanel";

export default function Layout() {
  const { success, error, info } = useToast();
  const [lotsData, setLotsData] = useState([]);
  const [loadingLots, setLoadingLots] = useState(true);

  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const onDashboard = location.pathname === "/" || location.pathname.startsWith("/dashboard");

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
    return () => { alive = false; };
  }, []);

  const [filters, setFilters] = useState({
    search: "", owner: [], location: [], status: [], subStatus: [],
  });

  const filteredLots = lotsData.filter((lot) => {
    if (filters.search && !String(lot.id).toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.owner.length > 0 && !filters.owner.includes(lot.owner)) return false;
    if (filters.location.length > 0 && !filters.location.includes(lot.location || "")) return false;
    if (filters.status.length > 0 && !filters.status.includes(lot.status)) return false;
    if (filters.subStatus.length > 0 && !filters.subStatus.includes(lot.subStatus)) return false;
    return true;
  });

  const handleClearFilters = () => setFilters({ search: "", owner: [], location: [], status: [], subStatus: [] });
  const handleApplyPromotion = () => info("Acción Aplicar Promoción");

  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedLotId, setSelectedLotId] = useState(null);
  const [showLotInfo, setShowLotInfo] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  const handleOpenPanel = (lotId) => { setSelectedLotId(lotId); setShowPanel(true); };
  const handleClosePanel = () => setShowPanel(false);
  const handleViewDetail = (lotId) => { setSelectedLotId(lotId); setShowPanel(false); setShowLotInfo(true); };

  const [modalLote, setModalLote] = useState({ show: false, modo: "crear", datosIniciales: null });
  const abrirModalCrear = () => setModalLote({ show: true, modo: "crear", datosIniciales: null });
  const abrirModalEditar = (lote) => setModalLote({ show: true, modo: "editar", datosIniciales: lote });
  const abrirModalEliminar = (lote) => setModalLote({ show: true, modo: "borrar", datosIniciales: lote });

  useEffect(() => {
    const editLotId = searchParams.get("editLotId");
    if (!editLotId) return;
    const lot = (lotsData || []).find((l) => String(l.id) === String(editLotId));
    if (lot) setModalLote({ show: true, modo: "editar", datosIniciales: lot });
  }, [searchParams, lotsData]);

  const cerrarModalGestion = () => {
    setModalLote((prev) => ({ ...prev, show: false }));
    if (searchParams.has("editLotId")) {
      const next = new URLSearchParams(searchParams);
      next.delete("editLotId");
      setSearchParams(next);
    }
  };

  const handleStatusChange = async (lotId, newStatus) => {
    try {
      await updateLote(lotId, { status: newStatus });
      setLotsData((prev) => prev.map((l) => (l.id === lotId ? { ...l, status: newStatus } : l)));
      success("Estado actualizado");
    } catch { error("No pude actualizar el estado del lote"); }
  };

  const handleSubStatusChange = async (lotId, newSubStatus) => {
    try {
      await updateLote(lotId, { subStatus: newSubStatus });
      setLotsData((prev) => prev.map((l) => (l.id === lotId ? { ...l, subStatus: newSubStatus } : l)));
      success("Estado-plano actualizado");
    } catch { error("No pude actualizar el estado-plano"); }
  };

  const guardarLote = async (lote) => {
    try {
      if (modalLote.modo === "editar" && lote?.id) {
        const res = await updateLote(lote.id, lote);
        const updated = res?.data || lote;
        setLotsData((prev) => prev.map((l) => (l.id === lote.id ? updated : l)));
        success("Lote actualizado");
      } else {
        const res = await createLote(lote);
        const created = res?.data || lote;
        setLotsData((prev) => [...prev, created]);
        success("Lote creado");
      }
      cerrarModalGestion();
    } catch { error("No pude guardar el lote"); }
  };

  const eliminarLote = async (id) => {
    try {
      await deleteLote(id);
      setLotsData((prev) => prev.filter((l) => l.id !== id));
      cerrarModalGestion();
      success("Lote eliminado");
    } catch { error("No pude eliminar el lote"); }
  };

  return (
    <div className="min-vh-100 d-flex flex-column bg-white">
      <Header onUserClick={() => setShowUserModal(true)} />

      {/* Píldoras de módulos: debajo del Header y ANTES de la FilterBar */}
      {onDashboard && (
        <div className="container py-2">
          <ModulePills />
        </div>
      )}

      <Outlet
        context={{
          lots: filteredLots,
          allLots: lotsData,
          loadingLots,
          handleStatusChange,
          handleSubStatusChange,
          handleViewDetail,
          abrirModalEditar,
          abrirModalEliminar,
          openSidePanel: handleOpenPanel,
        }}
      />

      <SidePanel
        show={showPanel}
        onHide={handleClosePanel}
        selectedLotId={selectedLotId}
        onViewDetail={handleViewDetail}
        lots={filteredLots}
        abrirModalEditar={abrirModalEditar}
        abrirModalEliminar={abrirModalEliminar}
      />

      <User show={showUserModal} onHide={() => setShowUserModal(false)} user={mockUser} />

      <LotInfo
        show={showLotInfo}
        onHide={() => setShowLotInfo(false)}
        selectedLotId={selectedLotId}
        lots={filteredLots}
        abrirModalEditar={abrirModalEditar}
        abrirModalEliminar={abrirModalEliminar}
      />

      <ModalGestionLote
        show={modalLote.show}
        modo={modalLote.modo}
        datosIniciales={modalLote.datosIniciales}
        onHide={cerrarModalGestion}
        onSave={guardarLote}
        onDelete={eliminarLote}
      />
    </div>
  );
}
