// src/pages/Ventas.jsx
// Página de Ventas: lista, filtra y abre modales de Ver / Editar / Eliminar.

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
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
  const crearParam = searchParams.get('crear') === 'true';
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
  const lastAppliedInmoRef = useRef(null);
  const hasSyncedInitialInmoRef = useRef(false);

  // Datos
  const [ventas, setVentas] = useState([]);
  const [inmobiliarias, setInmobiliarias] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  // Filtros
  const [filters, setFilters] = useState({
    texto: "",
    tipoPago: [],
    inmobiliarias: selectedInmobiliariaKey ? [selectedInmobiliariaKey] : [],
    fechaVentaMin: null,
    fechaVentaMax: null,
    montoMin: null,
    montoMax: null,
    estados: [],
  });

  // Permisos (en esta pantalla Editar abre siempre)
  const canSaleView = can(user, PERMISSIONS.SALE_VIEW);
  const canSaleDelete = can(user, PERMISSIONS.SALE_DELETE);

  // Carga inicial + join con personas/inmobiliarias
  useEffect(() => {
    let alive = true;
    (async () => {
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

        const personasById = {};
        for (const p of personasApi) if (p && p.id != null) personasById[String(p.id)] = p;

        const inmosById = {};
        for (const i of inmosApi) if (i && i.id != null) inmosById[String(i.id)] = i;

        const enriched = ventasApi.map((v) => enrichVenta(v, personasById, inmosById));

        if (alive) {
          setVentas(enriched);
          setInmobiliarias(inmosApi); // Guardar inmobiliarias para pasarlas al componente
          setLotes(lotesApi); // Guardar lotes para obtener mapIds
        }
      } catch (err) {
        console.error("Error cargando ventas/personas/inmobiliarias:", err);
        if (alive) setVentas([]);
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selectedInmobiliariaParam, selectedInmobiliariaRequest]);

  useEffect(() => {
    const target = selectedInmobiliariaKey;
    if (target) {
      if (lastAppliedInmoRef.current === target) return;
      setFilters((prev) => {
        const prevIds = Array.isArray(prev.inmobiliarias)
          ? prev.inmobiliarias.map(String)
          : [];
        if (prevIds.length === 1 && prevIds[0] === target) return prev;
        return { ...prev, inmobiliarias: [target] };
      });
      lastAppliedInmoRef.current = target;
      hasSyncedInitialInmoRef.current = true;
      return;
    }

    if (!lastAppliedInmoRef.current) return;
    const lastId = lastAppliedInmoRef.current;
    lastAppliedInmoRef.current = null;
    hasSyncedInitialInmoRef.current = true;
    setFilters((prev) => {
      const prevIds = Array.isArray(prev.inmobiliarias)
        ? prev.inmobiliarias.map(String)
        : [];
      if (prevIds.length === 1 && prevIds[0] === lastId) {
        return { ...prev, inmobiliarias: [] };
      }
      return prev;
    });
  }, [selectedInmobiliariaKey]);

  useEffect(() => {
    if (!hasSyncedInitialInmoRef.current) return;
    const currentIds = Array.isArray(filters.inmobiliarias)
      ? filters.inmobiliarias.map(String)
      : [];
    const currentMatchesParam =
      selectedInmobiliariaKey != null
        ? currentIds.includes(selectedInmobiliariaKey)
        : currentIds.length === 0;

    if (currentMatchesParam) return;

    const next = new URLSearchParams(searchParamsString);
    if (selectedInmobiliariaKey == null) {
      if (next.has("inmobiliariaId")) {
        next.delete("inmobiliariaId");
        setSearchParams(next, { replace: true });
      }
      return;
    }

    next.set("inmobiliariaId", selectedInmobiliariaKey);
    setSearchParams(next, { replace: true });
  }, [
    filters.inmobiliarias,
    selectedInmobiliariaKey,
    searchParamsString,
    setSearchParams,
  ]);

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
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Ver: abre con la fila y luego refina con getVentaById(id) para traer propietario/fechas/etc.
  const onVer = useCallback((venta) => {
    if (!venta) return;
    setVentaSel(venta);
    setOpenVer(true);

    (async () => {
      try {
        const resp = await getVentaById(venta.id);
        const detail = resp?.data ?? resp ?? {};
        setVentaSel((prev) => enrichVenta({ ...(prev || venta), ...(detail || {}) }));
      } catch (e) {
        console.error("Error obteniendo venta por id:", e);
      }
    })();
  }, []);

  // Editar: abre siempre y carga datos completos con relaciones
  const onEditarAlways = useCallback((venta) => {
    if (!venta) return;
    setVentaSel(venta);
    setOpenEditar(true);

    // Cargar datos completos con relaciones (comprador, lote.propietario, inmobiliaria, fechas)
    (async () => {
      try {
        const resp = await getVentaById(venta.id);
        const detail = resp?.data ?? resp ?? {};
        // Enriquecer con datos completos pero mantener lo que ya teníamos
        const enriched = enrichVenta({ ...(venta || {}), ...(detail || {}) }, {}, {});
        setVentaSel(enriched);
      } catch (e) {
        console.error("Error obteniendo venta por id para editar:", e);
      }
    })();
  }, []);

  const onEliminar = useCallback((venta) => {
    setVentaSel(venta);
    setOpenEliminar(true);
  }, []);

  // Estados para documentos
  const [openDocumentoDropdown, setOpenDocumentoDropdown] = useState(false);
  const [openDocumentoVer, setOpenDocumentoVer] = useState(false);
  const [tipoDocumentoSeleccionado, setTipoDocumentoSeleccionado] = useState(null);
  const [labelDocumentoSeleccionado, setLabelDocumentoSeleccionado] = useState(null);

  const onVerDocumentos = useCallback((venta) => {
    if (!venta) return;
    setVentaSel(venta);
    setOpenDocumentoDropdown(true);
  }, []);

  const handleSelectTipoDocumento = useCallback((tipo, label) => {
    setTipoDocumentoSeleccionado(tipo);
    setLabelDocumentoSeleccionado(label);
    setOpenDocumentoDropdown(false);
    setOpenDocumentoVer(true);
  }, []);

  const handleCerrarDocumentoVer = useCallback(() => {
    setOpenDocumentoVer(false);
    setTipoDocumentoSeleccionado(null);
    setLabelDocumentoSeleccionado(null);
  }, []);

  const onAgregarVenta = useCallback(() => {
    console.debug("[ALTA] venta");
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
      await deleteVenta(ventaSel.id);
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
        onChange={setFilters}
        isLoading={isLoading}
        total={ventas.length}
        filtrados={ventasFiltradas.length}
        onClear={() =>
          setFilters({
            texto: "",
            tipoPago: [],
            inmobiliarias: [],
            fechaVentaMin: null,
            fechaVentaMax: null,
            montoMin: null,
            montoMax: null,
            estados: [],
          })
        }
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
        onClose={() => setOpenVer(false)}
        onEdit={(venta) => {
          setOpenVer(false);
          // Abrir el modal de editar con la misma venta
          setVentaSel(venta);
          setOpenEditar(true);
          
          // Cargar datos completos con relaciones
          (async () => {
            try {
              const resp = await getVentaById(venta.id);
              const detail = resp?.data ?? resp ?? {};
              const enriched = enrichVenta({ ...(venta || {}), ...(detail || {}) }, {}, {});
              setVentaSel(enriched);
            } catch (e) {
              console.error("Error obteniendo venta por id para editar:", e);
            }
          })();
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
        onCreated={() => setOpenCrear(false)}
        loteIdPreSeleccionado={new URLSearchParams(searchParamsString).get("lotId")}
      />

      {/* Dropdown de documentos */}
      <DocumentoDropdown
        open={openDocumentoDropdown}
        onClose={() => setOpenDocumentoDropdown(false)}
        onSelectTipo={handleSelectTipoDocumento}
        loteId={ventaSel?.loteId || ventaSel?.lote?.id}
        loteNumero={ventaSel?.loteId || ventaSel?.lote?.id}
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
        loteNumero={ventaSel?.loteId || ventaSel?.lote?.id}
        documentoUrl={null}
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
