// src/pages/Ventas.jsx
// Página de Ventas: lista, filtra y abre modales de Ver / Editar / Eliminar.

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";
import { can, PERMISSIONS } from "../lib/auth/rbac";

import {
  getAllVentas,
  getVentaById,          // <-- agregado
  getVentasByInmobiliaria,
  updateVenta,
  deleteVenta,
} from "../lib/api/ventas";
import { getAllPersonas } from "../lib/api/personas";
import { getAllInmobiliarias } from "../lib/api/inmobiliarias";
import { getAllLotes } from "../lib/api/lotes";

import TablaVentas from "../components/Table/TablaVentas/TablaVentas";
import FilterBarVentas from "../components/FilterBar/FilterBarVentas";
import { applyVentaFilters } from "../utils/applyVentaFilters";

import VentaVerCard from "../components/Cards/Ventas/VentaVerCard.jsx";
import VentaEditarCard from "../components/Cards/Ventas/VentaEditarCard.jsx";
import VentaEliminarDialog from "../components/Cards/Ventas/VentaEliminarDialog.jsx";
import VentaCrearCard from "../components/Cards/Ventas/VentaCrearCard.jsx";
import DocumentoDropdown from "../components/Cards/Documentos/DocumentoDropdown.jsx";
import DocumentoVerCard from "../components/Cards/Documentos/DocumentoVerCard.jsx";
import DocumentoFormCard from "../components/Cards/Documentos/DocumentoFormCard.jsx";

/* Util: toma el array “correcto” dentro de una respuesta heterogénea */
const pickArray = (resp, candidates = []) => {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (resp.data && Array.isArray(resp.data)) return resp.data;
  if (resp.items && Array.isArray(resp.items)) return resp.items;

  const buckets = [...(candidates || []), "results", "rows", "list"];
  for (const key of buckets) {
    if (resp[key] && Array.isArray(resp[key])) return resp[key];
    if (resp.data && resp.data[key] && Array.isArray(resp.data[key])) return resp.data[key];
  }
  return [];
};

/* Construye "Nombre Apellido" desde variantes comunes */
const buildFullName = (p) => {
  if (!p) return null;
  const nombre = p.nombre ?? p.firstName ?? p.name ?? p.nombrePersona ?? null;
  const apellido = p.apellido ?? p.lastName ?? p.surname ?? p.apellidoPersona ?? null;
  const full = [nombre, apellido].filter(Boolean).join(" ").trim();
  return full || p.fullName || p.nombreCompleto || null;
};

/* Normaliza y enriquece una venta con campos esperados por el card */
const enrichVenta = (v, personasById = {}, inmosById = {}) => {
  if (!v) return v;
  const buyerId = v?.buyerId ?? v?.compradorId ?? null;
  const comprador =
    v?.comprador ?? (buyerId != null ? personasById[String(buyerId)] || null : null);
  const compradorNombreCompleto = buildFullName(comprador);

  const inmoId = v?.inmobiliariaId ?? v?.inmobiliaria_id ?? null;
  let inmobiliaria = v?.inmobiliaria ?? (inmoId != null ? inmosById[String(inmoId)] || null : null);
  if (!inmobiliaria) inmobiliaria = { id: null, nombre: "La Federala" };

  const propietario = v?.propietario ?? v?.owner ?? null;
  const propietarioNombreCompleto = buildFullName(propietario);

  return {
    ...v,
    comprador,
    compradorNombreCompleto,
    propietario,
    propietarioNombreCompleto,
    inmobiliaria,
    loteId: v.loteId ?? v.lotId,
    fechaVenta: v.fechaVenta ?? v.date,
    monto: v.monto ?? v.amount,
    estado: v.estado ?? v.status,
    tipoPago: v.tipoPago ?? v.paymentType,
    // fechas (tolerantes a back distinto)
    createdAt: v.createdAt ?? v.fechaCreacion ?? v.created_at ?? null,
    updatedAt: v.updatedAt ?? v.updateAt ?? v.fechaActualizacion ?? v.updated_at ?? null,
    plazoEscritura: v.plazoEscritura ?? v.plazo_escritura ?? null,
  };
};

export default function VentasPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const crearParam = searchParams.get('crear') === 'true';
  const openIdParam = searchParams.get('openId');
  const searchParamsString = searchParams.toString();
  const selectedInmobiliariaParam = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    const raw = params.get("inmobiliariaId");
    if (raw == null) return null;
    const trimmed = raw.trim();
    return trimmed.length ? trimmed : null;
  }, [searchParamsString]);
  const selectedInmobiliariaRequest = useMemo(() => {
    if (selectedInmobiliariaParam == null) return null;
    const parsed = Number(selectedInmobiliariaParam);
    return Number.isFinite(parsed) ? parsed : selectedInmobiliariaParam;
  }, [selectedInmobiliariaParam]);
  const selectedInmobiliariaKey =
    selectedInmobiliariaParam != null ? selectedInmobiliariaParam : null;

  // Datos
  const [ventas, setVentas] = useState([]);
  const [inmobiliarias, setInmobiliarias] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  // Filtros - inicializar con inmobiliariaId de la URL si existe
  const [filters, setFilters] = useState(() => ({
    texto: "",
    tipoPago: [],
    inmobiliarias: selectedInmobiliariaKey ? [selectedInmobiliariaKey] : [],
    fechaVentaMin: null,
    fechaVentaMax: null,
    montoMin: null,
    montoMax: null,
    estados: [],
  }));

  // Aplicar filtro de inmobiliaria cuando cambia desde la URL
  const lastAppliedInmoRef = useRef(null);
  useEffect(() => {
    if (selectedInmobiliariaKey) {
      if (lastAppliedInmoRef.current === selectedInmobiliariaKey) {
        return;
      }
      setFilters(prev => {
        const currentIds = Array.isArray(prev.inmobiliarias) ? prev.inmobiliarias.map(String) : [];
        if (currentIds.includes(String(selectedInmobiliariaKey))) {
          return prev;
        }
        lastAppliedInmoRef.current = selectedInmobiliariaKey;
        return {
          ...prev,
          inmobiliarias: [String(selectedInmobiliariaKey)],
        };
      });
    } else {
      if (lastAppliedInmoRef.current != null) {
        lastAppliedInmoRef.current = null;
        setFilters(prev => {
          if (Array.isArray(prev.inmobiliarias) && prev.inmobiliarias.length > 0) {
            return {
              ...prev,
              inmobiliarias: [],
            };
          }
          return prev;
        });
      }
    }
  }, [selectedInmobiliariaKey]);

  // Permisos (en esta pantalla Editar abre siempre)
  const canSaleView = can(user, PERMISSIONS.SALE_VIEW);
  const canSaleDelete = can(user, PERMISSIONS.SALE_DELETE);

  // Función reutilizable para cargar datos
  const loadVentasData = useCallback(async () => {
    setIsLoading(true);
    try {
      const ventasRequest =
        selectedInmobiliariaRequest != null
          ? getVentasByInmobiliaria(selectedInmobiliariaRequest)
          : getAllVentas({});
      const [ventasResp, personasResp, inmosResp, lotesResp] = await Promise.all([
        ventasRequest,
        getAllPersonas({}),
        getAllInmobiliarias({}),
        getAllLotes({}),
      ]);

      const ventasApi = pickArray(ventasResp, ["ventas"]);
      const personasApi = pickArray(personasResp, ["personas"]);
      const inmosApi = pickArray(inmosResp, ["inmobiliarias"]);
      const lotesApi = pickArray(lotesResp, ["lotes"]);

      const lotesById = {};
      lotesApi.forEach((lote) => {
        if (lote && lote.id != null) {
          lotesById[String(lote.id)] = lote;
        }
      });

      const personasById = {};
      for (const p of personasApi) if (p && p.id != null) personasById[String(p.id)] = p;

      const inmosById = {};
      for (const i of inmosApi) if (i && i.id != null) inmosById[String(i.id)] = i;

      const enriched = ventasApi.map((v) => enrichVenta(v, personasById, inmosById));
      const enrichedWithMapId = enriched.map((venta) => {
        const lookupId = venta.loteId ?? venta.lotId ?? null;
        const loteRef =
          venta.lote?.mapId
            ? venta.lote
            : lookupId != null
            ? lotesById[String(lookupId)] || null
            : null;
        const displayMapId =
          loteRef?.mapId ?? venta.lotMapId ?? (lookupId != null ? lotesById[String(lookupId)]?.mapId : null) ?? null;

        return {
          ...venta,
          lotMapId: displayMapId ?? venta.lotMapId ?? null,
          lote: loteRef
            ? { ...loteRef, mapId: loteRef.mapId ?? displayMapId ?? null }
            : venta.lote ?? null,
        };
      });

      setVentas(enrichedWithMapId);
      setInmobiliarias(inmosApi);
      setLotes(lotesApi);
    } catch (err) {
      console.error("Error cargando ventas/personas/inmobiliarias:", err);
      setVentas([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedInmobiliariaRequest]);

  // Carga inicial + join con personas/inmobiliarias
  useEffect(() => {
    let alive = true;
    (async () => {
      await loadVentasData();
      if (!alive) return;
    })();
    return () => {
      alive = false;
    };
  }, [selectedInmobiliariaParam, selectedInmobiliariaRequest, loadVentasData]);

  // Aplicar filtros
  const ventasFiltradas = useMemo(
    () => applyVentaFilters(ventas, filters),
    [ventas, filters]
  );

  // Modales/cards
  const [ventaSel, setVentaSel] = useState(null);
  const [openVer, setOpenVer] = useState(false);
  const [openEditar, setOpenEditar] = useState(false);
  const [openEliminar, setOpenEliminar] = useState(false);
  const [openCrear, setOpenCrear] = useState(false);
  
  // Abrir modal de crear cuando el parámetro crear=true
  useEffect(() => {
    if (crearParam) {
      setOpenCrear(true);
      // Limpiar el parámetro de la URL
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.delete('crear');
        return newParams;
      });
    }
  }, [crearParam, setSearchParams]);

  // Abrir automáticamente el modal "Ver" cuando viene openId desde navegación (query param o state)
  useEffect(() => {
    // Prioridad: location.state > query param
    const stateId = location.state?.openId;
    const idToUse = stateId != null ? stateId : (openIdParam ? parseInt(openIdParam, 10) : null);
    
    if (idToUse && ventas.length > 0) {
      const ventaId = typeof idToUse === 'number' ? idToUse : parseInt(idToUse, 10);
      if (!isNaN(ventaId)) {
        const venta = ventas.find(v => v.id === ventaId);
        if (venta) {
          setVentaSel(venta);
          setOpenVer(true);
          // Limpiar query param si existe
          if (openIdParam) {
            setSearchParams((prev) => {
              const newParams = new URLSearchParams(prev);
              newParams.delete('openId');
              return newParams;
            }, { replace: true });
          }
          // Limpiar state
          if (stateId != null) {
            window.history.replaceState({}, document.title);
          }
        }
      }
    }
  }, [openIdParam, location.state, ventas, setSearchParams]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Ver: abre directamente con la venta (VentaVerCard carga los datos completos internamente)
  const onVer = useCallback((venta) => {
    if (!venta) return;
    setVentaSel(venta);
    setOpenVer(true);
  }, []);

  // Editar: abre siempre (VentaEditarCard carga los datos completos internamente)
  const onEditarAlways = useCallback((venta) => {
    if (!venta) return;
    setVentaSel(venta);
    setOpenEditar(true);
  }, []);

  const onEliminar = useCallback((venta) => {
    setVentaSel(venta);
    setOpenEliminar(true);
  }, []);

  // Estados para documentos
  const [openDocumentoDropdown, setOpenDocumentoDropdown] = useState(false);
  const [openDocumentoVer, setOpenDocumentoVer] = useState(false);
  const [openDocumentoForm, setOpenDocumentoForm] = useState(false);
  const [tipoDocumentoSeleccionado, setTipoDocumentoSeleccionado] = useState(null);
  const [labelDocumentoSeleccionado, setLabelDocumentoSeleccionado] = useState(null);
  const [docCustomSeleccionado, setDocCustomSeleccionado] = useState(null);

  const onVerDocumentos = useCallback((venta) => {
    if (!venta) return;
    setVentaSel(venta);
    setOpenDocumentoDropdown(true);
  }, []);

  const handleSelectTipoDocumento = useCallback((tipo, label, doc) => {
    setTipoDocumentoSeleccionado(tipo);
    setLabelDocumentoSeleccionado(label);
    setDocCustomSeleccionado(doc || null);
    setOpenDocumentoDropdown(false);
    setOpenDocumentoVer(true);
  }, []);

  const handleAbrirFormularioDoc = useCallback(() => {
    setOpenDocumentoDropdown(false);
    setOpenDocumentoForm(true);
  }, []);

  const handleDocumentoGuardado = useCallback((doc) => {
    setDocCustomSeleccionado(doc);
    setTipoDocumentoSeleccionado("CUSTOM");
    setLabelDocumentoSeleccionado(doc?.nombre || "Documento");
    setOpenDocumentoForm(false);
    setOpenDocumentoVer(true);
  }, []);

  const handleCerrarDocumentoVer = useCallback(() => {
    setOpenDocumentoVer(false);
    setTipoDocumentoSeleccionado(null);
    setLabelDocumentoSeleccionado(null);
  }, []);

  const onAgregarVenta = useCallback(() => {
    setOpenCrear(true);
  }, []);

  // PUT (Editar) - ahora recibe el objeto actualizado completo del componente
  const handleSave = useCallback(
    async (updatedVenta) => {
      if (!updatedVenta?.id) return;
      try {
        // La venta actualizada ya viene completa del backend con todas las relaciones
        // Solo necesitamos enriquecerla con el mismo formato que usamos en la lista
        const personasById = {};
        const personasApi = pickArray(await getAllPersonas({}), ["personas"]);
        for (const p of personasApi) if (p && p.id != null) personasById[String(p.id)] = p;
        
        const inmosById = {};
        const inmosApi = pickArray(await getAllInmobiliarias({}), ["inmobiliarias"]);
        for (const i of inmosApi) if (i && i.id != null) inmosById[String(i.id)] = i;
        
        const enriched = enrichVenta(updatedVenta, personasById, inmosById);
        
        // Actualizar la lista con la venta enriquecida
        setVentas((prev) => prev.map((v) => (v.id === enriched.id ? enriched : v)));
        setVentaSel(enriched);
      } catch (e) {
        console.error("Error actualizando venta:", e);
      }
    },
    []
  );

  // DELETE (Eliminar)
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const handleDelete = useCallback(async () => {
    if (!ventaSel?.id) return;
    try {
      setDeleting(true);
      const loteId = ventaSel.loteId ?? ventaSel.lotId ?? ventaSel.lote?.id;
      
      await deleteVenta(ventaSel.id);
      
      if (loteId) {
        try {
          const { getAllReservas } = await import("../lib/api/reservas");
          const reservasResp = await getAllReservas({});
          const reservas = reservasResp?.data ?? [];
          
          const loteIdNum = Number(loteId);
          const reservaActiva = reservas.find((r) => {
            const rLoteId = Number(r.loteId ?? r.lote?.id ?? 0);
            const estado = String(r.estado ?? "").toUpperCase();
            return rLoteId === loteIdNum && estado === "ACTIVA";
          });
          
          const { updateLote } = await import("../lib/api/lotes");
          await updateLote(loteIdNum, { estado: reservaActiva ? "Reservado" : "Disponible" });
        } catch (err) {
          console.error("Error restaurando estado del lote:", err);
        }
      }
      
      setVentas((prev) => prev.filter((v) => v.id !== ventaSel.id));
      setOpenEliminar(false);
      setShowDeleteSuccess(true);
      setTimeout(() => {
        setShowDeleteSuccess(false);
      }, 1500);
    } catch (e) {
      console.error("Error eliminando venta:", e);
    } finally {
      setDeleting(false);
    }
  }, [ventaSel]);

  // Mostrar loading mientras se cargan los datos
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "40vh" }}>
        <div className="spinner-border" role="status" />
        <span className="ms-2">Cargando ventas…</span>
      </div>
    );
  }

  return (
    <>
      {/* Filtros */}
      <FilterBarVentas
        value={filters}
        onChange={(newFilters) => {
          if (!newFilters || Object.keys(newFilters).length === 0) {
            return;
          }
          setFilters(prev => {
            const hasInmoInUrl = selectedInmobiliariaKey != null;
            const newHasInmo = newFilters.inmobiliarias && Array.isArray(newFilters.inmobiliarias) && newFilters.inmobiliarias.length > 0;
            
            // Si el nuevo filtro incluye inmobiliarias vacías explícitamente Y hay inmobiliariaId en la URL, NO permitir limpiarlo
            if (hasInmoInUrl && newFilters.inmobiliarias && Array.isArray(newFilters.inmobiliarias) && newFilters.inmobiliarias.length === 0) {
              return {
                ...prev,
                ...newFilters,
                inmobiliarias: prev.inmobiliarias && prev.inmobiliarias.length > 0 
                  ? prev.inmobiliarias 
                  : [String(selectedInmobiliariaKey)],
              };
            }
            
            // Si el nuevo filtro no incluye inmobiliarias o las tiene vacías, y hay inmobiliariaId en la URL, preservar
            if (hasInmoInUrl && !newHasInmo) {
              return {
                ...prev,
                ...newFilters,
                inmobiliarias: prev.inmobiliarias && prev.inmobiliarias.length > 0 
                  ? prev.inmobiliarias 
                  : [String(selectedInmobiliariaKey)],
              };
            }
            
            return {
              ...prev,
              ...newFilters,
            };
          });
          // Si se quitó el filtro de inmobiliaria, limpiar la URL
          const inmobIds = Array.isArray(newFilters.inmobiliarias) ? newFilters.inmobiliarias.map(String) : [];
          if (inmobIds.length === 0 && selectedInmobiliariaKey) {
            const next = new URLSearchParams(searchParams);
            if (next.has("inmobiliariaId")) {
              next.delete("inmobiliariaId");
              setSearchParams(next, { replace: true });
            }
          }
        }}
        isLoading={isLoading}
        total={ventas.length}
        filtrados={ventasFiltradas.length}
        inmobiliariasOpts={inmobiliarias.map(i => ({ value: i.id, label: i.nombre }))}
        onClear={() => {
          const next = new URLSearchParams(searchParams);
          if (next.has("inmobiliariaId")) {
            next.delete("inmobiliariaId");
            setSearchParams(next, { replace: true });
          }
          setFilters({
            texto: "",
            tipoPago: [],
            inmobiliarias: [],
            fechaVentaMin: null,
            fechaVentaMax: null,
            montoMin: null,
            montoMax: null,
            estados: [],
          });
        }}
      />

      {/* Tabla */}
      <TablaVentas
        rows={ventasFiltradas}
        isLoading={isLoading}
        data={ventas}
        lotes={lotes}
        onVer={canSaleView ? onVer : null}
        onEditar={onEditarAlways}
        onEliminar={canSaleDelete ? onEliminar : null}
        onVerDocumentos={canSaleView ? onVerDocumentos : null}
        onAgregarVenta={can(user, PERMISSIONS.SALE_CREATE) ? onAgregarVenta : null}
        selectedIds={selectedIds}
        onSelectedChange={setSelectedIds}
      />

      {/* Modales */}
      <VentaVerCard 
        open={openVer} 
        venta={ventaSel} 
        ventaId={ventaSel?.id}
        onClose={() => setOpenVer(false)}
        onEdit={(venta) => {
          setOpenVer(false);
          setVentaSel(venta);
          setOpenEditar(true);
        }}
      />

      <VentaEditarCard
        key={ventaSel?.id} // Forzar re-render cuando cambia la venta
        open={openEditar}
        venta={ventaSel}
        inmobiliarias={inmobiliarias}
        onCancel={() => setOpenEditar(false)}
        onSaved={handleSave}
      />

      <VentaEliminarDialog
        open={openEliminar}
        venta={ventaSel}
        loading={deleting}
        onCancel={() => setOpenEliminar(false)}
        onConfirm={handleDelete}
      />

      <VentaCrearCard
        open={openCrear}
        onCancel={() => setOpenCrear(false)}
        onCreated={async () => {
          setOpenCrear(false);
          await loadVentasData();
        }}
        loteIdPreSeleccionado={new URLSearchParams(searchParamsString).get("lotId")}
      />

      {/* Dropdown de documentos */}
      <DocumentoDropdown
        open={openDocumentoDropdown}
        onClose={() => setOpenDocumentoDropdown(false)}
        onSelectTipo={handleSelectTipoDocumento}
        onAddDocumento={handleAbrirFormularioDoc}
        loteId={ventaSel?.loteId || ventaSel?.lote?.id}
      />

      {/* Formulario de documento (modal) */}
      <DocumentoFormCard
        open={openDocumentoForm}
        onClose={() => setOpenDocumentoForm(false)}
        loteId={ventaSel?.loteId || ventaSel?.lote?.id}
        onSaved={handleDocumentoGuardado}
      />

      {/* Modal de visualización de documento */}
      <DocumentoVerCard
        open={openDocumentoVer}
        onClose={handleCerrarDocumentoVer}
        onVolverAtras={() => {
          setOpenDocumentoVer(false);
          setOpenDocumentoDropdown(true);
        }}
        tipoDocumento={tipoDocumentoSeleccionado}
        loteId={ventaSel?.loteId || ventaSel?.lote?.id}
        loteNumero={ventaSel?.lote?.mapId ?? ventaSel?.lotMapId ?? ventaSel?.loteId ?? ventaSel?.lote?.id}
        documentoUrl={null}
        selectedDoc={docCustomSeleccionado}
        onModificar={(url) => {
          console.log("Modificar documento:", url);
        }}
        onDescargar={(url) => {
          console.log("Descargar documento:", url);
        }}
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
              ¡Venta eliminada exitosamente!
            </h3>
          </div>
        </div>
      )}
    </>
  );
}
