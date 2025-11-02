// src/pages/Ventas.jsx
// Página de Ventas: lista, filtra y abre modales de Ver / Editar / Eliminar.

import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "../app/providers/AuthProvider";
import { can, PERMISSIONS } from "../lib/auth/rbac";

import {
  getAllVentas,
  getVentaById,          // <-- agregado
  updateVenta,
  deleteVenta,
} from "../lib/api/ventas";
import { getAllPersonas } from "../lib/api/personas";
import { getAllInmobiliarias } from "../lib/api/inmobiliarias";

import TablaVentas from "../components/Table/TablaVentas/TablaVentas";
import FilterBarVentas from "../components/FilterBar/FilterBarVentas";
import { applyVentaFilters } from "../utils/applyVentaFilters";

import VentaVerCard from "../components/Cards/Ventas/VentaVerCard.jsx";
import VentaEditarCard from "../components/Cards/Ventas/VentaEditarCard.jsx";
import VentaEliminarDialog from "../components/Cards/Ventas/VentaEliminarDialog.jsx";

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

  // Datos
  const [ventas, setVentas] = useState([]);
  const [inmobiliarias, setInmobiliarias] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  // Filtros
  const [filters, setFilters] = useState({
    texto: "",
    tipoPago: [],
    inmobiliarias: [],
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
        const [ventasResp, personasResp, inmosResp] = await Promise.all([
          getAllVentas({}),
          getAllPersonas({}),
          getAllInmobiliarias({}),
        ]);

        const ventasApi = pickArray(ventasResp, ["ventas"]);
        const personasApi = pickArray(personasResp, ["personas"]);
        const inmosApi = pickArray(inmosResp, ["inmobiliarias"]);

        const personasById = {};
        for (const p of personasApi) if (p && p.id != null) personasById[String(p.id)] = p;

        const inmosById = {};
        for (const i of inmosApi) if (i && i.id != null) inmosById[String(i.id)] = i;

        const enriched = ventasApi.map((v) => enrichVenta(v, personasById, inmosById));

        if (alive) {
          setVentas(enriched);
          setInmobiliarias(inmosApi); // Guardar inmobiliarias para pasarlas al componente
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
  }, []);

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

  const onVerDocumentos = useCallback((venta) => {
    console.debug("[DOCS] venta", venta?.id);
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
  const handleDelete = useCallback(async () => {
    if (!ventaSel?.id) return;
    try {
      setDeleting(true);
      await deleteVenta(ventaSel.id);
      setVentas((prev) => prev.filter((v) => v.id !== ventaSel.id));
      setOpenEliminar(false);
    } catch (e) {
      console.error("Error eliminando venta:", e);
    } finally {
      setDeleting(false);
    }
  }, [ventaSel]);

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
    </>
  );
}
